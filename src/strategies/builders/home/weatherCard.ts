/**
 * Pure builder for the Weather summary card.
 *
 * Unlike the other summary entries, Weather has no subview of its own: it is a
 * `tile` card pointing at a `weather.*` entity. The tap behaviour is whatever
 * the editor's action picker stored (more-info / navigate / url); with nothing
 * configured the tile's default action applies — opening the weather entity's
 * own more-info view. The card is shown only when the resolved weather entity
 * actually exists in `hass.states` (see buildWeatherCard returning null).
 */

import type { DashboardStrategyConfig, HomeAssistant, TileCard } from '../../../types/cards.js';

type WeatherConfig = NonNullable<DashboardStrategyConfig['weather']>;

/**
 * Resolve which weather entity the card should read. A configured entity is
 * used as-is (even if missing — the caller's existence gate handles that); with
 * no configured entity, the first `weather.*` in hass.states (sorted) is used.
 * Returns null when there is no weather entity at all.
 */
export function resolveWeatherEntity(hass: HomeAssistant, configured?: string): string | null {
    if (configured) return configured;
    const first = Object.keys(hass.states ?? {})
        .filter((id) => id.startsWith('weather.'))
        .sort()[0];
    return first ?? null;
}

/**
 * Build the Weather summary tile, or null when no resolved weather entity exists
 * in hass.states (component not loaded, configured entity missing, etc.). A
 * configured `tap_action` is applied verbatim; when omitted, no tap_action is
 * set so the tile falls back to its default more-info behaviour.
 */
export function buildWeatherCard(hass: HomeAssistant, weather?: WeatherConfig): TileCard | null {
    const resolved = resolveWeatherEntity(hass, weather?.entity);
    if (!resolved || !hass.states?.[resolved]) return null;

    const card: TileCard = {
        type: 'tile',
        entity: resolved,
        grid_options: { columns: 12 },
        // Show temperature (with unit) alongside the condition, e.g.
        // "90 °F · Partly cloudy", rather than just the condition state.
        state_content: ['temperature', 'state'],
    };
    if (weather?.tap_action) {
        card.tap_action = weather.tap_action;
    }
    return card;
}
