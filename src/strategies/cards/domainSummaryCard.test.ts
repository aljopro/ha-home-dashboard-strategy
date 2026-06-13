/**
 * Unit tests for the DomainSummaryCard element.
 *
 * Scope: setConfig validation, getStubConfig, the shouldUpdate change-detection
 * gate, the navigation event, and the state-driven icon coloring. ha-card /
 * ha-icon are core HA elements that do not upgrade under jsdom, but Lit still
 * renders them as plain nodes, so we can assert the icon's inline style. The
 * subtitle wording is covered by domainSummary.test.ts.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { DomainSummaryCard } from './domainSummaryCard.js';
import type { DomainSummaryCard as DomainSummaryCardConfig, HomeAssistant } from '../../types/cards.js';

beforeAll(() => {
    expect(customElements.get('ll-domain-summary-card')).toBeDefined();
});

function makeCard(config: Partial<DomainSummaryCardConfig>): DomainSummaryCard {
    const card = new DomainSummaryCard();
    card.setConfig(config as DomainSummaryCardConfig);
    return card;
}

describe('setConfig', () => {
    it('accepts a config with a domain', () => {
        expect(() => makeCard({ domain: 'light', label: 'Lights' })).not.toThrow();
    });

    it('throws when domain is missing', () => {
        expect(() => new DomainSummaryCard().setConfig({} as DomainSummaryCardConfig)).toThrow(/domain/);
    });
});

describe('getStubConfig', () => {
    it('returns a usable default config', () => {
        expect(DomainSummaryCard.getStubConfig()).toMatchObject({ domain: 'light' });
    });
});

describe('shouldUpdate', () => {
    function shouldUpdate(card: DomainSummaryCard, changed: Map<string, unknown>): boolean {
        return (card as unknown as { shouldUpdate: (c: unknown) => boolean }).shouldUpdate(changed);
    }

    it('re-renders when config changes', () => {
        const card = makeCard({ domain: 'light' });
        expect(shouldUpdate(card, new Map([['_config', undefined]]))).toBe(true);
    });

    it('re-renders when a watched entity state reference changes', () => {
        const card = makeCard({ domain: 'light' });
        const onState = { state: 'on', attributes: {} };
        const oldHass = { states: { 'light.a': onState } } as unknown as HomeAssistant;
        card.hass = { states: { 'light.a': { state: 'off', attributes: {} } } } as unknown as HomeAssistant;
        expect(shouldUpdate(card, new Map([['hass', oldHass]]))).toBe(true);
    });

    it('skips re-render when no watched entity changed', () => {
        const card = makeCard({ domain: 'light' });
        const lightState = { state: 'on', attributes: {} };
        // a climate entity changes, but the lights card does not watch climate
        const oldHass = {
            states: { 'light.a': lightState, 'climate.b': { state: 'off', attributes: {} } },
        } as unknown as HomeAssistant;
        card.hass = {
            states: { 'light.a': lightState, 'climate.b': { state: 'heat', attributes: {} } },
        } as unknown as HomeAssistant;
        expect(shouldUpdate(card, new Map([['hass', oldHass]]))).toBe(false);
    });

    it('watches switches for the lights domain (light-like switches)', () => {
        const card = makeCard({ domain: 'light' });
        const lightState = { state: 'on', attributes: {} };
        const oldHass = {
            states: { 'light.a': lightState, 'switch.b': { state: 'off', attributes: {} } },
        } as unknown as HomeAssistant;
        card.hass = {
            states: { 'light.a': lightState, 'switch.b': { state: 'on', attributes: {} } },
        } as unknown as HomeAssistant;
        expect(shouldUpdate(card, new Map([['hass', oldHass]]))).toBe(true);
    });

    it('watches all contributing domains for the security pseudo-domain', () => {
        const card = makeCard({ domain: 'security' });
        const lockState = { state: 'locked', attributes: {} };
        const oldHass = { states: { 'lock.front': lockState } } as unknown as HomeAssistant;
        card.hass = { states: { 'lock.front': { state: 'unlocked', attributes: {} } } } as unknown as HomeAssistant;
        expect(shouldUpdate(card, new Map([['hass', oldHass]]))).toBe(true);
    });
});

describe('navigation', () => {
    function navigate(card: DomainSummaryCard): void {
        (card as unknown as { _navigate: () => void })._navigate();
    }

    it('pushes history and fires location-changed on tap', () => {
        const card = makeCard({ domain: 'light', navigation_path: '/lovelace/lights' });
        const pushSpy = vi.spyOn(history, 'pushState');
        let fired: CustomEvent | undefined;
        card.addEventListener('location-changed', (ev) => {
            fired = ev as CustomEvent;
        });

        navigate(card);

        expect(pushSpy).toHaveBeenCalledWith(null, '', '/lovelace/lights');
        expect(fired).toBeDefined();
        expect(fired?.bubbles).toBe(true);
        expect(fired?.composed).toBe(true);
        pushSpy.mockRestore();
    });

    it('does nothing when no navigation_path is configured', () => {
        const card = makeCard({ domain: 'light' });
        const pushSpy = vi.spyOn(history, 'pushState');
        let fired = false;
        card.addEventListener('location-changed', () => {
            fired = true;
        });

        navigate(card);

        expect(pushSpy).not.toHaveBeenCalled();
        expect(fired).toBe(false);
        pushSpy.mockRestore();
    });
});

describe('state-driven icon color', () => {
    async function renderCard(config: Partial<DomainSummaryCardConfig>, states: Record<string, { state: string }>) {
        const card = makeCard(config);
        card.hass = {
            states: Object.fromEntries(
                Object.entries(states).map(([id, { state }]) => [id, { state, attributes: {} }])
            ),
        } as unknown as HomeAssistant;
        document.body.appendChild(card);
        await (card as unknown as { updateComplete: Promise<unknown> }).updateComplete;
        const style = card.shadowRoot?.querySelector('ha-icon')?.getAttribute('style') ?? '';
        card.remove();
        return style;
    }

    it('applies the accent color when the domain is active', async () => {
        const style = await renderCard(
            { domain: 'light', icon: 'mdi:lightbulb-group', color: 'var(--amber-color, #ffc107)' },
            { 'light.a': { state: 'on' } }
        );
        expect(style).toContain('var(--amber-color, #ffc107)');
    });

    it('omits the accent color when the domain is inactive', async () => {
        const style = await renderCard(
            { domain: 'light', icon: 'mdi:lightbulb-group', color: 'var(--amber-color, #ffc107)' },
            { 'light.a': { state: 'off' } }
        );
        expect(style).not.toContain('amber');
    });
});
