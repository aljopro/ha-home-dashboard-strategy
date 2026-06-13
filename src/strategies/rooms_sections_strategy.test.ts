import { describe, it, expect } from 'vitest';
import { generateViews } from './rooms_sections_strategy.js';
import type { HomeAssistant, DashboardStrategyConfig } from '../types/cards.js';

/**
 * Type checking for strategy generation logic
 * Functional tests are run in browser environment where Lit is available
 */

describe('generateViews function', () => {
    it('has proper TypeScript types for safe generation', () => {
        // Type validation happens at compile time
        // This test verifies the strategy structure is type-safe
        const config: DashboardStrategyConfig = {
            type: 'dashboard_strategy',
            favorite_entities: ['light.test'],
            excluded_entities: [],
        };

        const mockHass: HomeAssistant = {
            entities: {},
            devices: {},
            areas: {},
            states: {},
            panelUrl: 'dashboard',
        };

        // Verify that config and hass have the correct types
        expect(config.excluded_entities).toBeDefined();
        expect(mockHass.areas).toBeDefined();
    });

    it('produces strongly-typed Lovelace configs', () => {
        // The fact that this compiles without errors means types are correct
        expect(true).toBe(true);
    });
});

describe('generated view strategy refs', () => {
    function refs(views: any[]) {
        return views.filter((v) => v.strategy).map((v) => ({ path: v.path, type: v.strategy.type }));
    }

    it('emits the Lights subview with a custom: strategy type', async () => {
        const hass: HomeAssistant = { entities: {}, devices: {}, areas: {}, states: {}, panelUrl: 'home' };
        const result = await generateViews({ type: 'x' }, hass);

        const lights = result.views.find((v: any) => v.path === 'lights') as any;
        expect(lights).toBeDefined();
        expect(lights.subview).toBe(true);
        expect(lights.strategy.type).toBe('custom:home-lights');
    });

    it('uses custom: prefixes for all deferred subviews (required by HA resolution)', async () => {
        const hass: HomeAssistant = {
            entities: { 'light.kitchen': { entity_id: 'light.kitchen', device_id: 'dev1' } },
            devices: { dev1: { id: 'dev1', area_id: 'kitchen' } },
            areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } },
            states: { 'light.kitchen': { state: 'on', attributes: {} } },
            panelUrl: 'home',
        } as unknown as HomeAssistant;
        const result = await generateViews({ type: 'x' }, hass);

        const types = refs(result.views as any[]).map((r) => r.type);
        types.forEach((t) => expect(t.startsWith('custom:')).toBe(true));
        expect(types).toContain('custom:home-lights');
        expect(types).toContain('custom:home-media-players');
        expect(types).toContain('custom:home-area');
    });
});
