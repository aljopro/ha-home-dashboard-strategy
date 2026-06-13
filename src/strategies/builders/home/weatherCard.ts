/**
 * Pure builder for the Weather summary card.
 *
 * Weather has no subview of its own, but renders through our own
 * `ll-domain-summary-card` (entity mode) so it sits flush with the other
 * Summaries cards. The card's subtitle is the temperature + condition
 * ("90 °F · Partly cloudy", see weatherSummaryText); tap behaviour is whatever
 * the editor's action picker stored (more-info / navigate / url), defaulting to
 * the entity's more-info. Shown only when the resolved weather entity exists in
 * `hass.states` (see buildWeatherCard returning null).
 */

import type { DashboardStrategyConfig, DomainSummaryCard, HomeAssistant } from '../../../types/cards.js';

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
 * Subtitle for the weather card: temperature (with unit) then the condition,
 * joined by `·`, e.g. "90 °F · Partly cloudy". The condition is run through
 * `hass.formatEntityState` when available so the slug (`partlycloudy`) becomes a
 * localized label; tests without that helper fall back to the raw state.
 */
export function weatherSummaryText(hass: HomeAssistant, entityId: string): string {
    const stateObj = hass.states?.[entityId];
    if (!stateObj) return '';

    const attrs = (stateObj.attributes ?? {}) as Record<string, unknown>;
    const temp = attrs.temperature;
    const unit = attrs.temperature_unit;
    const tempStr = temp != null ? `${temp}${unit ? ` ${unit}` : ''}` : '';

    const format = (hass as unknown as { formatEntityState?: (s: unknown) => string }).formatEntityState;
    const condition = format ? format(stateObj) : stateObj.state;

    return [tempStr, condition].filter(Boolean).join(' · ');
}

/**
 * Build the Weather summary card, or null when no resolved weather entity exists
 * in hass.states (component not loaded, configured entity missing, etc.). A
 * configured `tap_action` is applied verbatim; when omitted the card falls back
 * to the entity's more-info.
 */
export function buildWeatherCard(hass: HomeAssistant, weather?: WeatherConfig): DomainSummaryCard | null {
    const resolved = resolveWeatherEntity(hass, weather?.entity);
    if (!resolved || !hass.states?.[resolved]) return null;

    const card: DomainSummaryCard = {
        type: 'custom:ll-domain-summary-card',
        domain: 'weather',
        entity: resolved,
        label: 'Weather',
        // Static glyph for now; a condition-reactive icon is a follow-up.
        icon: 'mdi:weather-partly-cloudy',
        grid_options: { columns: 12 },
    };
    if (weather?.tap_action) {
        card.tap_action = weather.tap_action;
    }
    return card;
}
