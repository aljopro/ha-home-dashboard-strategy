/**
 * Helper for registering view-scope Lovelace strategies as custom elements.
 *
 * HA resolves a view's `strategy.type: 'custom:<name>'` to the element
 * `ll-strategy-view-<name>` and calls its static `generate(config, hass)`,
 * expecting a view config object back (see docs/Strategy_API_Guidelines.md §2
 * and HA's get-strategy.ts — the `custom:` prefix is required; a bare type does
 * not resolve). Registration is guarded and decorator-free per
 * docs/UI_and_Lit_Standards.md §2.
 */

import type { HomeAssistant, LovelaceStrategyConfig } from '../../types/cards.js';

/**
 * A view strategy's generate function. Returns a Lovelace view config object
 * (e.g. a SectionsView). Typed as `object` because the strategy interfaces are
 * not assignable to `Record<string, unknown>`, and the result is opaque config
 * handed straight back to HA.
 */
export type ViewStrategyGenerate<C extends LovelaceStrategyConfig = LovelaceStrategyConfig> = (
    config: C,
    hass: HomeAssistant
) => Promise<object>;

/**
 * Register a view strategy under `ll-strategy-view-<name>`. The same `generate`
 * is exposed as both a static and instance method (HA calls the static form on
 * the constructor returned by `customElements.get`).
 */
export function registerViewStrategy(name: string, generate: ViewStrategyGenerate): void {
    const tag = `ll-strategy-view-${name}`;
    if (customElements.get(tag)) return;

    const cls = class extends HTMLElement {
        static generate = generate;
        generate = generate;
    };

    customElements.define(tag, cls as unknown as CustomElementConstructor);
}
