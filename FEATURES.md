# Feature Backlog

Features are implemented incrementally. Each summary domain follows the same
pattern: a custom subview strategy registered under the dashboard + a summary
card in `ll-domain-summary` that navigates to it.

---

## Custom Domain Summary Card (`ll-domain-summary`)

Replace `home-summary` (internal HA card type) with our own registered
LitElement card.

- [x] LitElement card registered as `ll-domain-summary-card`
- [x] Config: `type: 'custom:ll-domain-summary-card'`, `domain`, `label`, `icon`, `color`, `navigation_path`
      (HA requires the `custom:` suffix to match the element tag, so the type is
      `custom:ll-domain-summary-card`, not `custom:ll-domain-summary`)
- [x] Reads `hass.states` at render time to compute aggregate state string
- [x] Owns its own styling (icon left, bold title, subtitle)
- [x] Replace `home-summary` usage in `buildSummaryCards`

Depends on: nothing. This is the foundation for all domain summary cards.

---

## Lights View + Summary

- [x] `home-lights` subview strategy (`custom:home-lights` → `ll-strategy-view-home-lights`)
- [x] Lists all `light.*` entities grouped by area (tile cards; area-less under "Other lights")
- [x] Light-like switch discernment (see shared utility below)
- [x] Summary card aggregate: count of on entities → "17 on" / "All off"
- [x] Navigation path: `lights` (our subview, not HA's `/light` panel)

---

## Climate View + Summary

- [ ] `home-climate` subview strategy
- [ ] Lists `climate.*`, `humidifier.*`, `fan.*`, `water_heater.*` grouped by area
- [ ] Summary card aggregate: primary thermostat temperature or count of active entities
- [ ] Navigation path: `climate`

---

## Security View + Summary

- [ ] `home-security` subview strategy
- [ ] Lists `lock.*`, `alarm_control_panel.*`, `cover.*` (door/garage/gate),
      `binary_sensor.*` (door/window/motion), `camera.*` grouped by area
- [ ] Summary card aggregate: count of unlocked/open → "All secured" / "1 unlocked"
- [ ] Navigation path: `security`

---

## Media Players View + Summary

- [x] `home-media-players` subview strategy registered
      (fixed: now `custom:home-media-players` → `ll-strategy-view-home-media-players`;
      the previous bare `home-media-players` type did not resolve in HA)
- [x] Media players subview wired into generated views
- [x] Replace `home-summary` media_players card with `ll-domain-summary`
- [x] Summary card aggregate: count playing → "No media playing" / "2 playing"
- [x] Navigation path: `media-players` (existing subview)

---

## Maintenance View + Summary

- [ ] `home-maintenance` subview strategy
- [ ] Lists `update.*` entities (pending firmware/software updates)
- [ ] Lists `binary_sensor.*` with device class `battery` in problem state
- [ ] Lists `sensor.*` with device class `battery` below threshold (< 20%)
- [ ] Summary card aggregate: total pending items → "All good" / "3 items"
- [ ] Navigation path: `maintenance`

---

## Weather Summary (card only — navigates to weather dashboard)

- [ ] `tile` card pointing to configured `weather.*` entity (shows current temperature/condition)
- [ ] `tap_action: navigate` to `weather.dashboard_path` (default: `/dashboard-weather/0`)
- [ ] Gate: only shown when the resolved weather entity exists in `hass.states`
- [ ] Config field on `DashboardStrategyConfig`:
      ```ts
      weather?: {
        /** entity_id of the weather entity to read temp/condition from. Defaults to first `weather.*` in hass.states. */
        entity?: string;
        /** Dashboard path to navigate to on tap. Defaults to `/dashboard-weather/0`. */
        dashboard_path?: string;
      };
      ```
- [ ] Graphical editor: entity picker (filtered to `weather` domain) + text field for `dashboard_path`
- [ ] No subview strategy needed — tapping leaves to the existing weather dashboard

---

## Energy View + Summary

- [ ] Gate: `hass.config.components.includes('energy')`
- [ ] Fetch energy prefs via `hass.callWS({ type: 'energy/get_prefs' })`
- [ ] `home-energy` subview strategy showing configured energy source sensors
- [ ] Summary card aggregate: today's grid consumption if data available
- [ ] Navigation path: `energy`

Complexity: high (needs energy prefs WS call). Implement last.

---

## Light-like Switch Discernment (shared utility)

- [x] `isLightLikeSwitch(entityId, state)` utility function
- [x] Signal: `friendly_name.toLowerCase().includes('light')`
- [x] Signal: `attributes.icon` in known light icon set
      (`mdi:lightbulb`, `mdi:lightbulb-outline`, `mdi:lightbulb-on`,
      `mdi:light-switch`, `mdi:ceiling-light`, `mdi:floor-lamp`, `mdi:lamp`)
- [x] Used in Lights view and summary count
- [ ] Follow-on: wire into area views so light-like switches group under Lights per room

---

## Favorites + Suggested Section

- [x] `favorite_entities` config field wired end-to-end
- [x] `suggested` toggle config field wired end-to-end
- [x] Favorites rendered as tile cards in home view
- [x] `usage_prediction/common_control` WS call for suggested entities
- [x] Favorites and suggested combined into single section (favorites pinned first)
