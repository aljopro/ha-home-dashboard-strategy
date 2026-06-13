# UI and Lit Standards

> **Source of truth for:** writing web components inside the Home Assistant
> frontend ecosystem — styling, core CSS variables, and efficient DOM updates
> with Lit.
>
> **Status:** architectural reference. Read this before authoring any element
> that renders UI (config editors, custom cards, badges). Note: our dashboard
> strategy itself renders *no* UI — see
> [Strategy_API_Guidelines.md](./Strategy_API_Guidelines.md). This document
> governs the components we emit/author *around* the strategy.

---

## 1. Bundling Lit — bundle it, but never use experimental decorators

A standalone dashboard resource (HACS / `/local/`) cannot rely on Home Assistant
exposing its internal Lit as a global. The boilerplate-card lineage we follow
**bundles Lit into the single IIFE**, and so do we. Multiple Lit versions can
coexist on a page — Lit is built to tolerate this (it only warns in dev). The
real collision risk is **custom element tag names**, not Lit internals, and that
is handled by guarded registration (§2), *not* by avoiding a bundled Lit.

So our two patterns are:

1. **No-Lit elements (the strategy + tiny helpers).** Extend `HTMLElement`
   directly, register manually with a `customElements.get()` guard. This is what
   the strategy element does today and it keeps zero rendering deps.
2. **Lit elements (config editors / rich custom cards).** Import and bundle Lit.
   Use it only when you genuinely need templating + reactive re-render — e.g. the
   strategy config editor.

If a component only assembles config or does light DOM work, prefer pattern 1.

### 1.1 No experimental decorators — use the static `properties` getter

**Hard rule:** we do not enable TypeScript experimental decorators anywhere in
this project (see [Tooling_and_Build.md](./Tooling_and_Build.md) §3). That means
**no** `@customElement`, `@property`, `@state`, `@query`. Lit's decorators are
pure sugar; the static form is fully equivalent:

```ts
import { LitElement, html, css } from 'lit';

class RoomsSectionsEditor extends LitElement {
  // Replaces @property / @state:
  static properties = {
    hass: { attribute: false },     // object input, passed as a JS property
    _config: { state: true },       // internal reactive state
  };

  // `declare` so TS emits NO class field — a real field would shadow the
  // reactive accessor Lit installs from `static properties`.
  declare hass: HomeAssistant;
  declare private _config: DashboardStrategyConfig;

  // Replaces @customElement — register manually, guarded (see §2).
}
if (!customElements.get('ll-strategy-editor-rooms-sections')) {
  customElements.define('ll-strategy-editor-rooms-sections', RoomsSectionsEditor);
}
```

The `declare` keyword is the load-bearing detail: with `useDefineForClassFields`
semantics, a plain `hass!: ...` field initializer would clobber Lit's accessor
and break reactivity. `declare` makes the field type-only.

---

## 2. Custom element registration rules

- **Always guard registration:** `if (!customElements.get(tag)) customElements.define(tag, cls)`.
- **Namespace tags** to avoid collisions with core: our strategy uses the
  HA-mandated `ll-strategy-*` prefix; any auxiliary cards/editors we author use a
  project prefix (e.g. `home-...`) — never a bare or core-sounding name.
- **Register at module load** (side-effect import), as `index.ts` does. The
  entry module imports the strategy purely for its registration side effect.
- **One element, one tag, one definition.** Re-evaluation of the bundle must be a
  no-op thanks to the guard.

---

## 3. Styling — inherit, don't impose

The single most important UI rule: **a component must look native inside the
user's active HA theme** (light, dark, and community themes). That means we
*consume* the theme's design tokens; we never hard-code colors, fonts, or
spacing that would fight the theme.

### 3.1 Always style via core CSS variables

HA exposes a documented set of CSS custom properties. Use them for every visual
value. The ones we rely on:

| Variable                              | Use for                                      |
| ------------------------------------- | -------------------------------------------- |
| `--primary-text-color`                | Default text                                 |
| `--secondary-text-color`              | Subtitles, captions, less-important text     |
| `--disabled-text-color`               | Disabled / unavailable                       |
| `--primary-color`                     | Accent, active state, links                  |
| `--accent-color`                      | Secondary accent / highlights                |
| `--card-background-color`             | Card surface                                 |
| `--primary-background-color`          | Page background                              |
| `--secondary-background-color`        | Subtle panels, hover surfaces                |
| `--divider-color`                     | Borders, separators                          |
| `--ha-card-border-radius`             | Card corner radius (default ~12px)           |
| `--ha-card-box-shadow`                | Card elevation                               |
| `--state-icon-color`                  | Default icon color                           |
| `--state-active-color` / domain vars  | Active entity coloring (e.g. lights on)      |
| `--error-color` / `--warning-color` / `--success-color` / `--info-color` | Status semantics |
| `--mdc-theme-*`                       | Material component theming where applicable  |

```css
:host {
  color: var(--primary-text-color);
  background: var(--card-background-color);
  border-radius: var(--ha-card-border-radius, 12px);
}
```

### 3.2 Always provide a fallback

`var(--token, <fallback>)` everywhere. Themes don't all define every variable, and
our component must still render legibly when one is missing.

### 3.3 Never hard-code theme-sensitive values

Forbidden in component styles: literal hex/rgb colors for text/surfaces, fixed
`box-shadow` colors, absolute font sizes that ignore HA's scale. Spacing may use
fixed `px` for layout rhythm, but prefer multiples that match HA's 8px-ish grid.

### 3.4 Match `ha-card` conventions

When authoring a card, wrap content in an `ha-card` (or replicate its surface
tokens above) so it visually matches every built-in card: same radius, same
shadow, same background, same internal padding (~16px).

---

## 4. Lit rendering — keep it declarative and cheap

When we do use Lit, the goal is **minimal, surgical DOM updates**. Lit already
diffs efficiently; our job is to not defeat it.

### 4.1 Declare reactive state via `static properties` (no decorators)

Per §1.1 we never use decorators. Declare reactive members with the static
`properties` getter, and `declare` the fields so TS emits no shadowing initializer:

```ts
class HomeSummaryEditor extends LitElement {
  static properties = {
    hass: { attribute: false },     // object input, passed as JS property
    config: { attribute: false },   // object input
    _expanded: { state: true },     // internal UI state
  };
  declare hass: HomeAssistant;
  declare config: HomeSummaryCard;
  declare private _expanded: boolean;

  constructor() {
    super();
    this._expanded = false;         // initialize in the constructor, not as a field
  }
}
```

- `{ attribute: false }` for object inputs like `hass`/`config` — they are passed
  as JS properties, never serialized to attributes.
- `{ state: true }` for purely-internal UI state (the old `@state()`).
- Initialize defaults in the **constructor**, never as a class-field initializer
  (a field initializer would clobber Lit's accessor — same reason we use `declare`).
- Mutating these (or reassigning them) is what triggers a re-render. Reassign;
  don't deep-mutate.

### 4.2 Reassign objects/arrays — Lit compares by reference

Lit's change detection on reactive properties is **identity-based** for
objects/arrays. In-place mutation will not re-render:

```ts
// ❌ no re-render
this.items.push(x);

// ✅ new reference → re-render
this.items = [...this.items, x];
```

### 4.3 Implement `shouldUpdate` for the hot path

HA pushes a fresh `hass` object on *every* state change in the whole system —
that's many times per second. A card that re-renders on every `hass` tick is the
classic HA performance bug. Gate it:

```ts
protected shouldUpdate(changed: PropertyValues): boolean {
  if (changed.has('config')) return true;
  if (changed.has('hass')) {
    const old = changed.get('hass') as HomeAssistant | undefined;
    // Only re-render if an entity THIS card cares about actually changed.
    return this._watchedEntities.some(
      (id) => old?.states?.[id] !== this.hass.states?.[id]
    );
  }
  return true;
}
```

Compare the specific `states[entity_id]` references the component depends on. HA
swaps the state object reference only when that entity changes, so reference
equality is a correct and cheap test.

### 4.4 Use directives instead of manual DOM

Prefer Lit's built-ins over imperative DOM:

- `repeat(items, keyFn, template)` for keyed lists (stable identity → minimal
  DOM churn). Use a stable key (entity_id), never the array index.
- `classMap` / `styleMap` for conditional classes/styles.
- `nothing` for "render nothing" branches.
- `cache` when toggling between two heavy templates.

```ts
render() {
  return html`
    ${repeat(this._entities, (e) => e.entity_id, (e) => html`
      <div class=${classMap({ row: true, active: this._isActive(e) })}>
        ${e.name}
      </div>
    `)}
  `;
}
```

### 4.5 No work in `render()`

`render()` must be pure and cheap: read state, return a template. Filtering,
sorting, joining registries, formatting — do it in `willUpdate()` (or memoize on
input change) and cache the result, so it doesn't run on every paint.

### 4.6 `static styles`, not inline `<style>`

Define styles once via `static styles = css\`...\`` so they're parsed once and
shared (constructable stylesheets) across all instances, rather than re-parsed
per render.

---

## 5. Interaction & accessibility

- Use HA's action model for clicks where possible (`hass-action` / `ActionConfig`
  with `more-info`, `toggle`, `navigate`, `call-service`) instead of bespoke
  handlers, so behavior matches the rest of the dashboard.
- Fire events using HA's conventions (`CustomEvent` with `bubbles: true,
  composed: true`) so they cross shadow boundaries — e.g. `config-changed` from
  editors, `hass-more-info` to open the entity dialog.
- Respect keyboard/focus: interactive elements must be focusable and operable via
  Enter/Space.
- Localize user-facing strings via `hass.localize(...)` when a key exists; never
  hard-code English in shipped UI.

---

## 6. Performance checklist

- [ ] No experimental decorators — reactive members declared via `static properties` + `declare`.
- [ ] Lit (when used) is bundled; element registration is guarded by `customElements.get()`.
- [ ] `shouldUpdate`/identity checks gate re-renders against `hass` ticks.
- [ ] All theme-sensitive values use core CSS variables **with fallbacks**.
- [ ] No hard-coded colors/shadows; surfaces match `ha-card` tokens.
- [ ] Lists use `repeat` with a stable key (entity_id), not index.
- [ ] `render()` is pure; derivation/formatting is memoized in `willUpdate`.
- [ ] Objects/arrays are reassigned (new reference), never mutated in place.
- [ ] `static styles` used; no per-render `<style>` injection.
- [ ] Events bubble + composed; actions use HA's `ActionConfig` model.
