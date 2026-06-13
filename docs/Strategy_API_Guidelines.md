# Strategy API Guidelines

> **Source of truth for:** how we hook into the `hass` object, manage state, and
> structure the root strategy element.
>
> **Upstream reference:** <https://developers.home-assistant.io/docs/frontend/custom-ui/custom-strategy>
>
> **Status:** architectural reference. Read this before touching anything in
> `src/strategies/` or `src/index.ts`.

---

## 1. What a strategy is

A Lovelace **strategy** is a custom element that *generates* dashboard
configuration at runtime instead of the user hand-writing YAML. Home Assistant
calls a static-ish `generate()` method, passes it the current `hass` object and
the strategy's own config, and expects a config object back.

There are three strategy scopes. We use all three:

| Scope        | Element tag prefix                       | Returns                          |
| ------------ | ---------------------------------------- | -------------------------------- |
| **Dashboard** | `ll-strategy-dashboard-<name>`          | `{ views: [...] }`               |
| **View**      | `ll-strategy-view-<name>`               | `{ cards: [...] }` / sections    |
| **Section**   | `ll-strategy-section-<name>`            | `{ type: 'grid', cards: [...] }` |

The key contract: **strategies produce plain config objects.** They do not
render UI. HA takes the returned config and feeds it into the normal Lovelace
rendering pipeline, so everything a strategy emits must be valid card/view/section
config that the core frontend already knows how to draw.

Our root dashboard strategy lives in
[rooms_sections_strategy.ts](../src/strategies/rooms_sections_strategy.ts) and is
registered as `ll-strategy-dashboard-rooms-sections`.

---

## 2. The element naming + registration contract

HA discovers a strategy by **custom element tag name**. The name is derived from
the `strategy.type` in the dashboard config:

```yaml
strategy:
  type: custom:rooms-sections   # → element `ll-strategy-dashboard-rooms-sections`
```

- `custom:` prefix → HA looks for a custom element.
- Dashboard scope → HA prepends `ll-strategy-dashboard-`.
- Sub-strategies referenced from generated views (e.g. `type: home-area`) resolve
  to `ll-strategy-view-home-area` and must be registered the same way.

**Registration rule — register idempotently, at module load, without decorators:**

```ts
if (!customElements.get('ll-strategy-dashboard-rooms-sections')) {
  customElements.define(
    'll-strategy-dashboard-rooms-sections',
    RoomsSectionsStrategy as unknown as CustomElementConstructor
  );
}
```

The `customElements.get(...)` guard is mandatory: the bundle can be evaluated
more than once (dev hot reload, double resource include), and a duplicate
`define()` throws and breaks the whole dashboard. We avoid TypeScript
`@customElement` decorators here so the build has zero decorator/runtime-helper
dependencies (see [Tooling_and_Build.md](./Tooling_and_Build.md)).

---

## 3. The `generate()` contract

This is the only method HA actually calls. Define it as a method **and** a static
method so HA resolves it regardless of how it instantiates the strategy:

```ts
export default class RoomsSectionsStrategy
  extends HTMLElement
  implements LoveLaceDashboardStrategy
{
  async generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
    return generateViews(config, hass);
  }

  static async generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
    return generateViews(config, hass);
  }
}
```

Rules:

1. **`generate()` is `async` and returns a `Promise<LovelaceConfig>`.** Even when
   our logic is synchronous, keep the signature async — HA awaits it and future
   data fetches (history, templates) will need it.
2. **All real work lives in a free function** (`generateViews`), not in the class.
   The class is a thin adapter. This is the single most important rule in this
   document: it is what makes the strategy testable without a DOM or an HA
   instance. See [Testing_Standards.md](./Testing_Standards.md).
3. **`generate()` must be pure with respect to `hass`.** Treat `config` and
   `hass` as read-only inputs. Never mutate them, never stash them on `this`,
   never write to globals from inside generation.

---

## 4. The `hass` object — what we may read

`hass` is large and untyped upstream. We deliberately consume a **narrow,
explicit slice** of it, typed in [types/cards.ts](../src/types/cards.ts) as
`HomeAssistant`:

```ts
export interface HomeAssistant {
  entities?: EntityRegistry;   // entity registry (entity_id → Entity metadata)
  devices?: DeviceRegistry;    // device registry
  areas?: AreaRegistry;        // area registry
  states?: HassStates;         // live state objects (entity_id → EntityState)
  panelUrl?: string;           // current dashboard base path, used for navigation
  localize?: (key: string, options?: Record<string, unknown>) => string;
  [key: string]: unknown;      // escape hatch — avoid relying on it
}
```

**The four registries we read, and what they mean:**

| Source          | Purpose                                                            |
| --------------- | ----------------------------------------------------------------- |
| `hass.states`   | Live state + attributes. Source of `state`, `device_class`, etc.  |
| `hass.entities` | Entity registry: `area_id`, `device_id`, `entity_category`, hidden/disabled flags. |
| `hass.devices`  | Device registry: used to resolve an entity's area via its device. |
| `hass.areas`    | Area registry: `area_id` → human name + icon.                     |

**Entity → area resolution is two-hop.** An entity may carry its own `area_id`,
or inherit it from its device. The canonical resolution + the joining of all four
sources into one object happens in
[getEntityContext.ts](../src/strategies/builders/getEntityContext.ts), which
produces an `EntityContext`:

```ts
export interface EntityContext {
  entity: Entity;
  device: Device;
  area: Area | null;
  state: EntityState;
  device_class: string;
}
```

**Rule: builders consume `EntityContext`, not raw `hass`.** Only the top-level
`generateViews` and `getEntityContext` should touch `hass.*` directly. Everything
downstream operates on already-joined `EntityContext` objects. This keeps the
`hass`-shaped surface area tiny and mockable.

**Defensive reads.** `hass` and its registries can be partially populated during
startup. Always guard:

```ts
const allEntityIds = Object.keys(hass?.states || {});
const basePath = hass?.panelUrl || '';
const favorites = (config.favorite_entities || [])
  .filter((id) => hass?.states?.[id] !== undefined);
```

Never assume a key exists. A strategy that throws produces a blank dashboard with
no useful error for the user.

---

## 5. State management — there is none (by design)

Strategies are **stateless generators**, not stateful components.

- **Do not** subscribe to state, hold timers, cache between `generate()` calls,
  or use Lit reactive properties on the strategy element.
- **Do not** mutate `window`/globals from generation logic. (The legacy
  `install()`/`window.haDashboardStrategy` shim in
  [index.ts](../src/index.ts) is a dev-harness bootstrap only and is **not** part
  of the strategy contract — do not build on it.)
- Re-running `generate()` with the same `(config, hass)` must always yield the
  same output. This determinism is what `Testing_Standards` asserts against.

Live reactivity is the *card's* job, not the strategy's. We emit, e.g., an `area`
card or `media-control` card and the core frontend keeps it live. The strategy
only decides **which** cards exist and how they're arranged.

---

## 6. Config — the strategy's own options

The dashboard config block (minus `type`) is handed to `generate()` as `config`.
Ours is typed as `DashboardStrategyConfig`:

```ts
export interface DashboardStrategyConfig extends LovelaceStrategyConfig {
  type: string;
  excluded_entities?: string[];   // entity_ids to omit entirely
  favorite_entities?: string[];   // entity_ids pinned to the top "Favorites" section
  suggested?: boolean;            // show frequently-used entities (plumbed; see note)
  header?: StrategyHeaderConfig;  // { show?, title? } — graphical editor: toggle + title
  badges?: string[];              // entity_ids → entity badges on the home view
}
```

These fields are exposed in the graphical editor returned by
`RoomsSectionsStrategy.getConfigElement()` (see
[UI_and_Lit_Standards.md](./UI_and_Lit_Standards.md) for the editor element).
`header` and `badges` are **input** shapes — `generateViews` transforms them into
the view's output header object / badge configs via `buildViewHeader` /
`buildViewBadges`. `suggested` is plumbed end-to-end but currently inert
(`buildSuggestedSection` returns null until usage data is available).

Rules:

- **Every config field is optional and defaulted.** A strategy invoked with bare
  `{ type: ... }` must generate a sensible dashboard. Do not set `configRequired`.
- **Validate/normalize at the boundary**, inside `generateViews`, before passing
  values into builders. Filter `favorite_entities` against `hass.states` so a
  stale entity_id can't produce a broken card.
- Config validation logic is pure and therefore unit-tested directly — see
  [Testing_Standards.md](./Testing_Standards.md).

---

## 7. Output shape — what `generate()` returns

A dashboard strategy returns `LovelaceConfig`:

```ts
{ views: LovelaceView[] }
```

A `LovelaceView` is either a fully-materialized `SectionsView` (our home view) or
a thin `StragegyView` that defers to a **sub-strategy**:

```ts
// Materialized view (we built the sections ourselves):
{ type: 'sections', title: 'Home', path: 'home', sections: [...] }

// Deferred view (HA will invoke a view-scope sub-strategy on demand):
{ title: area.name, path: area.area_id, subview: true,
  strategy: { type: 'home-area', area: area.area_id } }
```

**Prefer deferred sub-strategies for per-area / per-domain views.** They are
generated lazily when the user navigates, which keeps the initial `generate()`
cheap and keeps each builder focused. The home/landing view is the only one we
fully materialize up front.

All emitted card objects must conform to the union in
[types/cards.ts](../src/types/cards.ts) (`StrategyCard`). If you need a card type
we don't model yet, add it to that union first — do not emit untyped config.

---

## 8. Module boundaries (the layering we enforce)

```
index.ts                         ← package entry; imports strategy for side-effect registration
└─ strategies/
   ├─ rooms_sections_strategy.ts ← element + generateViews() orchestrator (the ONLY hass consumer besides getEntityContext)
   └─ builders/                  ← pure functions: (typed inputs) → (config objects)
      ├─ getEntityContext.ts     ← the one place that joins hass.states/entities/devices/areas
      ├─ entityFilters.ts        ← EntityContext filtering / sorting
      ├─ areaCards.ts            ← Area[] → AreaCard config
      ├─ summaryCards.ts         ← entity ids → HomeSummaryCard config
      ├─ areaViews.ts            ← per-area view assembly
      ├─ mediaPlayersView.ts     ← media-players view assembly
      └─ viewAssembly.ts         ← sections → SectionsView
```

**The dependency rule:** arrows point downward only. Builders never import the
strategy element; the strategy element never reaches past `getEntityContext` into
raw `hass`. This is what lets every builder be tested in isolation.

---

## 9. Checklist before merging strategy changes

- [ ] All logic is in a free function; the element only delegates.
- [ ] `generate()` exists as both instance and static, `async`, returns `Promise<LovelaceConfig>`.
- [ ] Custom element registered behind a `customElements.get()` guard.
- [ ] Every `hass.*` access is null-guarded; raw `hass` is touched only in `generateViews`/`getEntityContext`.
- [ ] No mutation of `config`, `hass`, or globals; no retained state.
- [ ] Empty/partial config still generates a valid dashboard.
- [ ] New card shapes added to the `StrategyCard` union in `types/cards.ts`.
- [ ] Output validated by unit tests per [Testing_Standards.md](./Testing_Standards.md).
