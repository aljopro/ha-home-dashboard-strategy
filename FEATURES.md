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

- [x] `home-climate` subview strategy
- [x] Lists `climate.*`, `humidifier.*`, `fan.*` grouped by area (thermostat cards
      for `climate.*`, tiles otherwise; `fan.*` tiles carry fan-speed / preset /
      oscillate / direction features). `water_heater.*` intentionally excluded —
      integrations like GE/SmartHQ map ovens onto it (see entityDomains.ts).
- [x] Summary card aggregate: count of active entities
- [x] Navigation path: `climate`

---

## Security View + Summary

- [x] `home-security` subview strategy
- [x] Lists `lock.*`, `alarm_control_panel.*`, `cover.*` (door/garage/gate),
      security `binary_sensor.*`, and `camera.*` grouped by area (cameras as
      picture-entity cards, everything else as tiles). Membership reuses the
      shared `securityEntityFilters`.
- [x] Summary card aggregate: count of unlocked/open → "All secured" / "1 unlocked"
- [x] Navigation path: `security`

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

- [x] `home-maintenance` subview strategy
- [x] Lists `update.*` entities with an update available (tiles carry the
      `update-actions` feature for install/skip)
- [x] Lists `binary_sensor.*` device-class `battery` in the `on` (low) state
- [x] Lists `sensor.*` device-class `battery` at or below threshold (≤ 20%)
- [x] Lists unavailable battery entities (device-offline proxy, matching HA)
- [x] Summary card aggregate: detailed breakdown, e.g. "1 low battery,
      1 unavailable" / "All good"; gated on having any items
- [x] Navigation path: `maintenance`
- [ ] Follow-on: exclude battery sensors whose device is currently charging
      (HA does this via a battery_charging binary_sensor); not yet implemented
- [ ] Follow-on: group each category by area within the subview

---

## Weather Summary (card only — configurable tap action)

- [x] `tile` card pointing to configured `weather.*` entity (shows current temperature/condition)
- [x] Configurable `tap_action` (more-info / navigate / url); default (unset) is
      the tile's own more-info — opening the weather entity view
- [x] Gate: only shown when the resolved weather entity exists in `hass.states`
- [x] Config field on `DashboardStrategyConfig`:
      ```ts
      weather?: {
        /** entity_id of the weather entity to read temp/condition from. Defaults to first `weather.*` in hass.states. */
        entity?: string;
        /** Tap behaviour (more-info / navigate / url). Default more-info via the tile. */
        tap_action?: ActionConfig;
      };
      ```
- [x] Graphical editor: entity picker (filtered to `weather` domain) + `ui_action`
      selector restricted to more-info / navigate / url (navigate shows the
      ha-navigation-picker dashboard/view list)
- [x] No subview strategy needed — tap behaviour is user-configurable

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
