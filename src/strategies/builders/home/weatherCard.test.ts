/**
 * Unit tests for the Weather summary card builder.
 */

import { describe, it, expect } from 'vitest';
import { buildWeatherCard, resolveWeatherEntity } from './weatherCard.js';
import type { HomeAssistant } from '../../../types/cards.js';

function hassWith(stateIds: string[]): HomeAssistant {
    const states: Record<string, unknown> = {};
    for (const id of stateIds) states[id] = { state: 'sunny', attributes: {} };
    return { states } as unknown as HomeAssistant;
}

describe('resolveWeatherEntity', () => {
    it('returns the configured entity as-is', () => {
        const hass = hassWith(['weather.home', 'weather.office']);
        expect(resolveWeatherEntity(hass, 'weather.office')).toBe('weather.office');
    });

    it('falls back to the first weather.* (sorted) when none configured', () => {
        const hass = hassWith(['weather.office', 'weather.home']);
        expect(resolveWeatherEntity(hass)).toBe('weather.home');
    });

    it('returns null when there is no weather entity', () => {
        expect(resolveWeatherEntity(hassWith(['light.kitchen']))).toBeNull();
    });
});

describe('buildWeatherCard', () => {
    it('builds a tile for the resolved weather entity with no tap_action by default', () => {
        const card = buildWeatherCard(hassWith(['weather.home']));
        expect(card).toEqual({
            type: 'tile',
            entity: 'weather.home',
            grid_options: { columns: 12 },
            state_content: ['temperature', 'state'],
        });
        // default (no tap_action) → tile falls back to more-info
        expect(card?.tap_action).toBeUndefined();
    });

    it('shows temperature then condition on the state line', () => {
        const card = buildWeatherCard(hassWith(['weather.home']));
        expect(card?.state_content).toEqual(['temperature', 'state']);
    });

    it('applies a configured entity and tap_action verbatim', () => {
        const card = buildWeatherCard(hassWith(['weather.home', 'weather.cabin']), {
            entity: 'weather.cabin',
            tap_action: { action: 'navigate', navigation_path: '/lovelace-weather/2' },
        });
        expect(card?.entity).toBe('weather.cabin');
        expect(card?.tap_action).toEqual({ action: 'navigate', navigation_path: '/lovelace-weather/2' });
    });

    it('supports a url tap_action', () => {
        const card = buildWeatherCard(hassWith(['weather.home']), {
            tap_action: { action: 'url', url: 'https://weather.example' },
        });
        expect(card?.tap_action).toEqual({ action: 'url', url: 'https://weather.example' });
    });

    it('returns null when no weather entity exists', () => {
        expect(buildWeatherCard(hassWith(['light.kitchen']))).toBeNull();
    });

    it('returns null when the configured entity is missing from hass.states', () => {
        expect(buildWeatherCard(hassWith(['weather.home']), { entity: 'weather.gone' })).toBeNull();
    });
});
