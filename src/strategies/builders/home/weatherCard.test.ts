/**
 * Unit tests for the Weather summary card builder.
 */

import { describe, it, expect } from 'vitest';
import { buildWeatherCard, resolveWeatherEntity, weatherSummaryText } from './weatherCard.js';
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

describe('weatherSummaryText', () => {
    function hass(attrs: Record<string, unknown>, state = 'partlycloudy', format?: (s: any) => string): HomeAssistant {
        return {
            states: { 'weather.home': { state, attributes: attrs } },
            formatEntityState: format,
        } as unknown as HomeAssistant;
    }

    it('joins temperature (with unit) and condition with a dot', () => {
        const h = hass({ temperature: 90, temperature_unit: '°F' }, 'partlycloudy', () => 'Partly cloudy');
        expect(weatherSummaryText(h, 'weather.home')).toBe('90 °F · Partly cloudy');
    });

    it('falls back to the raw state when formatEntityState is unavailable', () => {
        const h = hass({ temperature: 12, temperature_unit: '°C' }, 'sunny');
        expect(weatherSummaryText(h, 'weather.home')).toBe('12 °C · sunny');
    });

    it('omits temperature when absent', () => {
        const h = hass({}, 'cloudy', () => 'Cloudy');
        expect(weatherSummaryText(h, 'weather.home')).toBe('Cloudy');
    });

    it('returns empty string for a missing entity', () => {
        expect(weatherSummaryText(hass({}), 'weather.gone')).toBe('');
    });
});

describe('buildWeatherCard', () => {
    it('builds an ll-domain-summary-card (entity mode) by default, no tap_action', () => {
        const card = buildWeatherCard(hassWith(['weather.home']));
        expect(card).toEqual({
            type: 'custom:ll-domain-summary-card',
            domain: 'weather',
            entity: 'weather.home',
            label: 'Weather',
            icon: 'mdi:weather-partly-cloudy',
            grid_options: { columns: 12 },
        });
        // default (no tap_action) → card falls back to the entity's more-info
        expect(card?.tap_action).toBeUndefined();
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
