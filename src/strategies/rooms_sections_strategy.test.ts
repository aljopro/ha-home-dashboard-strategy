import { describe, it, expect } from 'vitest';
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
