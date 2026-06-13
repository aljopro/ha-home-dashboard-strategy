# Testing Standards

> **Source of truth for:** our Vitest setup. Scope is **strictly** isolating
> underlying logic — entity filtering, config validation, and data processing —
> *without* spinning up a browser or a real Home Assistant instance.
>
> **Status:** architectural reference. This governs `src/**/*.test.ts`.
>
> **Out of scope (deliberately):** live/manual testing in a real or Docker HA,
> SMB deploy, HACS flow. Those live in [TESTING.md](../TESTING.md). This document
> is the unit/logic layer that doc's "Next Steps" calls for.

---

## 1. Philosophy: test pure logic, not the framework

The architecture (see [Strategy_API_Guidelines.md](./Strategy_API_Guidelines.md))
exists precisely so we can test without HA. All decision-making lives in **pure
functions** under `src/strategies/builders/` and in the free function
`generateViews`. None of them require a DOM, a network connection, a `customElements`
registry, or a real `hass`.

So our testing rule is blunt:

> **Test the pure functions directly. Do not boot a browser. Do not boot Home
> Assistant. Mock only the narrow `hass` slice the function reads.**

A unit test should be: construct a plain-object input → call the function →
assert on the returned config object. No rendering, no async waiting on a UI, no
real entity feed.

### What we test

| Layer                          | Example assertions                                              |
| ------------------------------ | --------------------------------------------------------------- |
| **Entity filtering / sorting** | domain inclusion, device_class match, exclusions, alpha sort    |
| **Config validation**          | empty config still works; stale `favorite_entities` dropped     |
| **Data processing**            | `getEntityContext` joins states/entities/devices/areas correctly|
| **Card builders**              | correct card `type`, required fields, navigation paths          |
| **View assembly**              | correct view/section count, ordering, empty sections omitted    |
| **`generateViews` (integration of pure parts)** | full `LovelaceConfig` shape from a mock `hass` |

### What we do **not** test here

- Visual rendering / theming (that's the browser; see TESTING.md).
- Real entity state streaming.
- Custom-element registration side effects (the `customElements.define` call) —
  it's a one-liner adapter with no logic; testing it would require a registry and
  buys nothing.

---

## 2. The Vitest setup

[vitest.config.ts](../vitest.config.ts):

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,                       // describe/it/expect without imports
    environment: 'jsdom',                // lightweight DOM shim, NOT a real browser
    setupFiles: ['./src/test-setup.ts'],
    pool: 'forks',                       // process isolation between test files
    include: ['src/**/*.test.ts'],
  },
});
```

Rationale per setting:

| Setting                 | Why                                                                 |
| ----------------------- | ------------------------------------------------------------------- |
| `environment: 'jsdom'`  | Gives us `customElements`/`HTMLElement` so importing the strategy module doesn't crash on its registration line. It is **not** a browser — do not write tests that depend on layout, paint, or real rendering. |
| `globals: true`         | `describe/it/expect/vi` are global; you may still import them explicitly (existing tests do — that's fine and preferred for clarity). |
| `pool: 'forks'`         | Each test file runs in its own process → no leaked module state, no shared `customElements` registry collisions across files. |
| `setupFiles`            | Loads [src/test-setup.ts](../src/test-setup.ts) before each file.   |
| `include`               | Co-located `*.test.ts` next to the source they cover.               |

**Setup file** ([src/test-setup.ts](../src/test-setup.ts)) imports
`@testing-library/jest-dom` matchers and is the single place to register global
mocks (e.g. a `fetch` stub) if ever needed. Keep it minimal — we are avoiding
heavy globals on purpose.

**Commands:** `npm test` (one-shot, CI) / `npm run test:watch` (TDD). Type safety
is a *separate* gate — `npm run typecheck` — because Vitest/esbuild does not
type-check (see [Tooling_and_Build.md](./Tooling_and_Build.md)).

---

## 3. File conventions

- **Co-locate:** `entityFilters.ts` ↔ `entityFilters.test.ts` in the same dir.
- **One test file per source module.** Mirror the module boundary.
- **`.js` import specifiers**, matching source (`import { ... } from './entityFilters.js'`).
- Import test primitives explicitly for readability:
  `import { describe, it, expect } from 'vitest';`
- Use `vi` for spies/mocks/timers when needed (rarely — pure functions seldom need them).

---

## 4. Mocking `hass` — the core technique

The whole strategy reads only the narrow `HomeAssistant` slice (§4 of
Strategy_API_Guidelines). So a test "mock" is just a **plain object literal** with
the registries the function under test reads. No library, no class.

Use a small **factory** so tests stay declarative and intent is obvious. The repo
already establishes this pattern in
[entityFilters.test.ts](../src/strategies/builders/entityFilters.test.ts):

```ts
function makeMinimalHass(
  entityDefs: Array<{ entityId: string; deviceId?: string; areaId?: string }>
) {
  const h: any = { entities: {}, states: {}, devices: {}, areas: {} };
  for (const def of entityDefs) {
    const deviceId = def.deviceId ?? `dev_${def.entityId}`;
    h.entities[def.entityId] = {
      entity_id: def.entityId, device_id: deviceId, area_id: def.areaId ?? null,
    };
    h.states[def.entityId] = { state: 'on', attributes: {} };
    h.devices[deviceId] = { id: deviceId, area_id: def.areaId ?? null };
    if (def.areaId) h.areas[def.areaId] = { area_id: def.areaId, name: def.areaId };
  }
  return h;
}
```

Guidelines for fixtures:

1. **Build only the fields the function reads.** A test for domain filtering
   needs `entity_id` + maybe `device_class`; it does not need full device
   metadata. Minimal fixtures make the test's intent legible and the assertion
   robust to unrelated schema growth.
2. **Prefer a shared factory over inline literals** when more than one test needs
   the same shape. Keep one factory per concern (entities, areas), composed as
   needed.
3. **Keep fixtures deterministic.** No `Date.now()`, no randomness, no real
   timestamps unless the function under test consumes them (then inject a fixed
   value). Determinism is what lets us assert exact output.
4. **`any`-typing the fixture is acceptable** to avoid over-specifying optional
   registry fields — but the function's *parameters* and *return type* stay
   strictly typed. The boundary stays honest even when the fixture is loose.

---

## 5. What good tests look like

### 5.1 Pure-function logic (the bulk of the suite)

```ts
describe('filterEntitiesByDomainAndExclusions', () => {
  it('drops excluded entities even when their domain is included', () => {
    const hass = makeMinimalHass([
      { entityId: 'light.kitchen' },
      { entityId: 'light.debug' },
    ]);
    const result = filterEntitiesByDomainAndExclusions(hass, mockDomains, ['light.debug']);
    expect(result.map((e) => e.entity_id)).toEqual(['light.kitchen']);
  });
});
```

### 5.2 Config validation (must survive sparse/garbage input)

Every config field is optional (Strategy_API_Guidelines §6), so prove it:

```ts
it('generates a valid dashboard from an empty config', () => {
  const config = { type: 'rooms-sections' };
  const out = generateViews(config, makeMinimalHass([{ entityId: 'light.kitchen', areaId: 'kitchen' }]));
  expect(out.views.length).toBeGreaterThan(0);
});

it('drops favorite_entities that do not exist in hass.states', () => {
  const config = { type: 'rooms-sections', favorite_entities: ['light.ghost'] };
  const out = generateViews(config, makeMinimalHass([{ entityId: 'light.kitchen' }]));
  // ghost must not appear anywhere in the emitted config
  expect(JSON.stringify(out)).not.toContain('light.ghost');
});
```

### 5.3 Defensive / degenerate inputs (non-negotiable coverage)

Because `hass` is partial during HA startup, every entry-point test must include
the empty/missing cases — these are the real-world failure modes:

```ts
it('does not throw on empty hass', () => {
  expect(() => generateViews({ type: 'rooms-sections' }, {} as any)).not.toThrow();
});

it('handles missing states/areas registries', () => {
  const out = generateViews({ type: 'rooms-sections' }, { states: undefined } as any);
  expect(out).toHaveProperty('views');
});
```

### 5.4 Output-shape assertions (card/view contracts)

Assert the *contract* HA depends on, not incidental detail:

```ts
it('emits area cards with a navigation_path and area id', () => {
  const cards = buildAreaCardsSection([{ area_id: 'kitchen', name: 'Kitchen' }], '/home');
  expect(cards[0]).toMatchObject({ type: 'area', area: 'kitchen' });
  expect(cards[0]).toHaveProperty('navigation_path');
});
```

---

## 6. Assertion discipline

- **Assert behavior and contracts, not implementation.** Check the emitted card
  `type`, required fields, ordering, counts — the things HA and users depend on.
- **Avoid giant `toEqual` snapshots of whole configs** as the *primary* assertion;
  they break on every harmless change and obscure intent. Use `toMatchObject` /
  targeted field assertions. A focused snapshot of one small card is fine.
- **Test ordering explicitly** where it matters (alpha sort of entities/areas,
  view order home → areas → media-players) — ordering is part of our contract.
- **One behavior per `it`.** Name it as the behavior, not the function.
- **Cover the empty/partial branch** for anything that touches `hass` or `config`.

---

## 7. Coverage expectations

| Module type                         | Expectation                                   |
| ----------------------------------- | --------------------------------------------- |
| `builders/*` pure functions         | Full branch coverage — these are the logic.   |
| `getEntityContext`                  | Two-hop area resolution + null/missing cases. |
| `generateViews`                     | Happy path + empty hass + empty config + exclusions/favorites. |
| Strategy class / element registration | Not unit-tested (no logic); verified live per TESTING.md. |
| `index.ts` auto-install shim        | Not the strategy contract; minimal/no coverage. |

If a bug reaches a real HA instance, the first fix is a **failing unit test that
reproduces it** against a mock `hass`, then the code change — never a code change
alone.

---

## 8. Checklist before merging test changes

- [ ] New/changed logic lives in a pure function and is tested directly (no browser, no real HA).
- [ ] `hass` is mocked as a minimal plain object via a factory; only read fields are populated.
- [ ] Empty-config and empty/partial-`hass` cases are covered for any boundary function.
- [ ] Assertions target contracts (card `type`, required fields, order, counts), not internals.
- [ ] No nondeterminism (time/random) leaks into fixtures or assertions.
- [ ] `npm test` and `npm run typecheck` both green.
