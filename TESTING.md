# Testing in Home Assistant Ecosystem

This guide covers multiple approaches to test your dashboard strategy in a real or development Home Assistant environment.

## Option 1: Local Development with Vite Dev Server (Fastest)

Best for: Quick iteration and debugging before integration testing

### Setup

```bash
npm run dev
```

This starts a Vite dev server at `http://localhost:5173`. The dev entry point (`src/main.ts`) loads the strategy and logs to the browser console.

### Testing

-   Open `http://localhost:5173` in your browser.
-   Check the browser console for logs (should show "ha-dashboard-strategy: installed").
-   Edit source files; Vite will hot-reload automatically.

### Limitations

-   No real Home Assistant instance or entity data
-   Useful only for unit testing and UI component debugging

---

## Option 2: Manual Installation in Home Assistant (Most Realistic)

Best for: Testing the actual strategy behavior with real entities and areas

### Prerequisites

-   A running Home Assistant instance with SMB (Samba) share configured
-   SMB share mounted on your local machine
-   At least one area and some entities configured in Home Assistant

### Setup

#### 1. Build the strategy bundle

```bash
npm run build
```

This creates `dist/rooms_sections_strategy.js`.

#### 2. Mount SMB Share (if not already mounted)

**On macOS:**

```bash
# Create mount point
mkdir -p /Volumes/homeassistant

# Mount the SMB share (adjust IP/hostname and share name)
mount_smbfs //username:password@homeassistant.local/config /Volumes/homeassistant

# Or use Finder: Go → Connect to Server → smb://homeassistant.local/config
```

**On Linux:**

```bash
# Install SMB client if needed
sudo apt-get install cifs-utils

# Create mount point
sudo mkdir -p /mnt/homeassistant

# Mount the SMB share
sudo mount -t cifs //homeassistant.local/config -o username=user,password=pass /mnt/homeassistant
```

**On Windows:**

```powershell
# Map network drive via File Explorer
# Right-click This PC → Map network drive
# Enter: \\homeassistant.local\config

# Or via PowerShell
net use Z: \\homeassistant.local\config /user:username password
```

#### 3. Copy to Home Assistant

Once the SMB share is mounted, copy the built file:

**On macOS/Linux:**

```bash
# Create strategies folder if it doesn't exist
mkdir -p /Volumes/homeassistant/www/strategies

# Copy the bundle
cp dist/rooms_sections_strategy.js /Volumes/homeassistant/www/strategies/
```

**On Windows:**

```powershell
# Create strategies folder if it doesn't exist
New-Item -ItemType Directory -Path "Z:\www\strategies" -Force

# Copy the bundle
Copy-Item -Path "dist/rooms_sections_strategy.js" -Destination "Z:\www\strategies\"
```

Or simply drag and drop the file in File Explorer once the share is mounted.

#### 4. Add to Lovelace Dashboard Configuration

In your Home Assistant dashboard YAML (or via UI):

```yaml
views:
    - title: Home
      path: home
      type: sections
      strategy:
          type: rooms-sections # custom strategy name
          favorite_entities:
              - light.living_room
              - climate.bedroom
          excluded_entities:
              - light.debug_light
      sections:
          # ... additional sections
```

Or via Home Assistant UI:

1. Go to **Settings → Dashboards → Create Dashboard**
2. Click the three-dot menu → **Edit Dashboard** (raw config mode)
3. Paste the above YAML
4. Restart the dashboard or reload the browser

#### 5. Verify Installation

-   Open the dashboard in Home Assistant
-   Check the browser console (F12) for any errors
-   Verify that area cards and entities appear as expected
-   Test that the strategy correctly identifies areas and their entities

### Debugging

-   **Console errors**: Check Home Assistant logs and browser console
-   **Strategy not loading**: Ensure the file path in `hacs.json` matches the built output
-   **Entities not showing**: Verify your `favorite_entities` and `excluded_entities` match actual Home Assistant entity IDs

---

## Option 3: HACS Installation (Production-like)

Best for: Testing the full HACS installation flow

### Prerequisites

-   HACS installed in Home Assistant
-   Your repository pushed to GitHub (public or private)
-   Home Assistant has network access to your GitHub repo

### Setup

#### 1. Ensure your repo is HACS-ready

Your `hacs.json` already exists with:

```json
{
    "name": "HA Home Dashboard Strategy",
    "content_in_root": false,
    "domains": ["frontend"],
    "filename": "dist/rooms_sections_strategy.js"
}
```

Commit and push to GitHub.

#### 2. Add a GitHub Release (Optional but recommended)

Create a release in GitHub with the built `dist/rooms_sections_strategy.js` file attached. HACS can pull releases, making installation faster.

```bash
git tag v0.1.0
git push origin v0.1.0
# Then create release via GitHub UI or gh CLI
```

#### 3. Add Custom Repository to HACS

In Home Assistant:

1. Go to **HACS → Integrations → ⋯ → Custom repositories**
2. Add your repository URL: `https://github.com/yourusername/ha-home-dashboard-strategy`
3. Select category: **Frontend**
4. Click **Create**

#### 4. Install via HACS

1. Go to **HACS → Frontend**
2. Search for your strategy name
3. Click **Install**
4. Restart Home Assistant (or just refresh the browser)

---

## Option 4: Development Mode with SMB Symlink (Fast Iteration)

Best for: Rapid development without rebuilding and copying each time

### Setup

**On macOS/Linux:**

```bash
# Build once
npm run build

# Mount SMB if not already mounted
mkdir -p /Volumes/homeassistant
mount_smbfs //username:password@homeassistant.local/config /Volumes/homeassistant

# Create symlink from HA's www/strategies to your local dist
mkdir -p /Volumes/homeassistant/www/strategies
ln -s /Users/jensen/projects/ha-home-dashboard-strategy/dist/rooms_sections_strategy.js \
  /Volumes/homeassistant/www/strategies/rooms_sections_strategy.js
```

**On Windows:**

```powershell
# Build once
npm run build

# Mount SMB (if not already mapped)
net use Z: \\homeassistant.local\config /user:username password

# Create symlink (run PowerShell as Administrator)
New-Item -ItemType SymbolicLink `
  -Path "Z:\www\strategies\rooms_sections_strategy.js" `
  -Target "C:\Users\jensen\projects\ha-home-dashboard-strategy\dist\rooms_sections_strategy.js"
```

### Workflow

1. Edit `src/strategies/rooms_sections_strategy.ts`
2. Run `npm run build` (fast with Vite)
3. Hard-refresh Home Assistant dashboard (Ctrl+Shift+R or Cmd+Shift+R)
4. Changes appear instantly

---

## Option 5: Docker Home Assistant (Isolated Testing)

Best for: Clean, reproducible testing environment

### Setup

Run Home Assistant in Docker:

```bash
docker run --rm -it \
  -v $(pwd)/config:/config \
  -p 8123:8123 \
  homeassistant/home-assistant:latest
```

Then copy your built strategy into `config/www/strategies/` and follow **Option 2** steps.

### Benefits

-   Isolated environment (doesn't affect your main HA instance)
-   Easy to reset or test multiple versions
-   Can quickly test against different HA versions

---

## Testing Checklist

After deploying your strategy, verify:

-   [ ] Strategy loads without console errors
-   [ ] Area cards render correctly
-   [ ] Area card titles match configured areas
-   [ ] Per-area views (subviews) display entities by domain
-   [ ] Favorite entities section appears if configured
-   [ ] Summary cards (lights, climate, security, media) appear if entities exist
-   [ ] Excluded entities don't appear
-   [ ] Entity state changes update in real-time
-   [ ] Navigation paths work correctly
-   [ ] Responsive design works on mobile

---

## Troubleshooting

### Strategy not loading

1. Check browser console for JavaScript errors
2. Verify file path in `hacs.json` matches actual file location
3. Confirm the file is an IIFE bundle (check first line: `var HaHomeDashboardStrategy = ...`)
4. Check Home Assistant logs: `Settings → System → Logs`

### Entities not showing

1. Verify entity IDs are correct: `Developer Tools → States`
2. Check `favorite_entities` and `excluded_entities` lists
3. Ensure areas have devices assigned in **Settings → Areas**

### Changes not appearing

1. Hard-refresh the browser (Ctrl+Shift+R)
2. Restart Home Assistant: `Settings → System → System` (⋮ menu) → **Restart**
3. Rebuild the bundle: `npm run build`

### Build errors

1. Check TypeScript errors: `npm run typecheck`
2. Ensure all dependencies are installed: `npm install`
3. Clear cache: `rm -rf dist node_modules` then reinstall

---

## Next Steps

-   Add integration tests that mock the `hass` object and verify strategy output
-   Set up CI/CD to build and test on every push
-   Create example dashboard configurations for users
