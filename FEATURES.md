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

## Remote View (picker + remembered device)

Unlike the other domain subviews (which *list* every entity), the Remote view is
a single interactive card: the user picks a room, then a media player in that
room, and the remote pad targets that device. The selection is remembered per
browser via `localStorage`, so returning to the view restores the last device.
Inspired by `Nerwyn/universal-remote-card`, but built as our own LitElement (no
HA-frontend imports — see memory `feedback-ha-frontend-imports`).

- [ ] `home-remote` subview strategy (`custom:home-remote` →
      `ll-strategy-view-home-remote`); registered via `registerViewStrategy` and
      side-effect imported in `rooms_sections_strategy.ts` alongside the other
      `home-*` views. Navigation path: `remote`.
- [ ] The subview generates a single `custom:ll-remote-card` (no entity list).
      Pure builder `buildRemoteView()` in `builders/subviews/remoteView.ts`,
      mirroring `mediaPlayersView.ts` (returns a `SectionsView`).
- [ ] `ll-remote-card` — own LitElement registered exactly like
      `ll-domain-summary-card` (guarded `customElements.define`, decorator-free
      `static properties`, theme-token styling only; see
      `docs/UI_and_Lit_Standards.md` and `domainSummaryCard.ts`).
- [ ] **Picker:** Room `<ha-select>` (areas that contain a `media_player.*`) →
      Player `<ha-select>` (players in that room; an "Other" group for
      area-less players). Reuses `groupMediaPlayersByArea` / `getEntityAreaId`
      from `mediaPlayersView.ts` + `entityFilters.ts`.
- [ ] **Remember selection:** persist the chosen `entity_id` to `localStorage`
      under key `ll-remote-card:last-player`. On first render, restore it and
      pre-select its room; **validate** the stored id still exists in
      `hass.states` (else fall back to the empty picker). All `localStorage`
      access wrapped in try/catch (private mode / disabled storage must not throw).
- [ ] **Remote pad (media_player services — works for every player):**
      power `media_player.toggle`; volume `volume_up` / `volume_down` /
      `volume_mute`; transport `media_previous_track` / `media_play_pause` /
      `media_next_track` / `media_stop`; source `media_player.select_source`
      from `attributes.source_list`. Buttons reflect live state (playing/paused
      glyph, mute state, current source, power on/off) read from `hass.states`.
- [ ] **D-pad / navigation (conditional):** up/down/left/right/ok + back/home/menu
      only render when a companion `remote.*` entity resolves for the selected
      player's `device_id` (media_player has no native d-pad). Dispatched via
      `remote.send_command`. Hidden entirely when no remote entity is found.
- [ ] `shouldUpdate` gates re-render to ticks where the selected player (or its
      companion remote) changed reference, matching the `domainSummaryCard`
      pattern.
- [ ] **Entry point:** a "Remote" summary card in the home Summaries section,
      gated on the `media_player` domain, `navigation_path: remote`. Subtitle =
      remembered player's friendly name (read from the same `localStorage` key)
      or "Tap to pick a device". (Simpler fallback: static "Remote" label if we
      want to avoid coupling the summary card to `localStorage`.)
- [ ] Tests: pure `buildRemoteView` shape test; card unit tests for
      localStorage restore + stale-id validation, room→player filtering, the
      service-call mapping for each button, and d-pad gating on a present/absent
      companion remote (follow `docs/Testing_Standards.md`).
- [ ] Follow-on: per-integration key maps (webOS / Android TV) so the d-pad and
      extra keys work without a generic `remote.*` entity.
- [ ] Follow-on: optional `default_player` config field as the fallback when
      `localStorage` is empty (first-run experience).
- [ ] Follow-on: touchpad gesture surface (swipe → directional `send_command`),
      the headline feature of universal-remote-card; deferred until the button
      remote is solid.

Complexity: medium-high (first stateful/interactive card; localStorage; companion
remote resolution). The picker + persistence is the novel part — the button grid
is mechanical.

---

## Maintenance View + Summary

- [x] `home-maintenance` subview strategy
- [x] Lists `update.*` entities with an update available (tiles carry the
      `update-actions` feature for install/skip)
- [x] Batteries section lists ALL battery entities (sensor + binary_sensor),
      sorted lowest level first (binary `on`→0, `off`→100, unreadable last);
      the summary card still counts only low ones (≤ 20% / binary `on`)
- [x] Lists `unavailable` entities in controllable domains only (light, switch,
      cover, climate, fan, lock, media_player, vacuum, …) so an offline device
      surfaces as the thing you operate, not its dozens of sensor/number
      entities; diagnostic/config and hidden entities excluded
- [ ] Follow-on: per-device collapse (one "X is offline" row) if controllable
      filtering still proves too noisy
- [x] Summary card aggregate: detailed breakdown, e.g. "1 low battery,
      1 unavailable" / "All good"; gated on having any items
- [x] Navigation path: `maintenance`
- [ ] Follow-on: exclude battery sensors whose device is currently charging
      (HA does this via a battery_charging binary_sensor); not yet implemented
- [ ] Follow-on: group each category by area within the subview

---

## Weather Summary (card only — configurable tap action)

- [x] Renders through our own `ll-domain-summary-card` (entity mode) so it sits
      flush with the other Summaries cards (same height/chrome). Subtitle is
      temperature + condition, e.g. "90 °F · Partly cloudy" (weatherSummaryText)
- [x] Configurable `tap_action` (more-info / navigate / url); default (unset)
      opens the weather entity's more-info. The card ports tap_action support
      (the summary card previously navigated only)
- [x] Gate: only shown when the resolved weather entity exists in `hass.states`
- [x] Config field on `DashboardStrategyConfig`:
      ```ts
      weather?: {
        /** entity_id of the weather entity to read temp/condition from. Defaults to first `weather.*` in hass.states. */
        entity?: string;
        /** Tap behaviour (more-info / navigate / url). Default more-info. */
        tap_action?: ActionConfig;
      };
      ```
- [ ] Follow-on: condition-reactive icon (currently a static weather glyph)
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
