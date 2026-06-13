/**
 * Pure builder for the Climate subview (`custom:home-climate`).
 *
 * Lists every climate entity — thermostats, fans, and humidifiers — grouped by
 * area. The membership definition is reused from `climateEntityFilters` (see
 * entityDomains.ts) so the subview, the home-view area cards, and the per-area
 * views all agree on what "climate" means. `climate.*` entities render as
 * `thermostat` cards; the rest (fan / humidifier) render as `tile` cards.
 * Entities with no resolvable area are collected under a trailing "Other
 * climate" group.
 *
 * Mirrors the Lights view builder (see lightsView.ts).
 */

import type {
    HeadingCard,
    HomeAssistant,
    SectionsView,
    StrategyCard,
    ThermostatCard,
    TileCard,
    TileCardFeature,
} from '../../../types/cards.js';
import type { Area } from '../../../types/core.js';
import { climateEntityFilters } from '../../entityDomains.js';
import { generateEntityFilter, getEntityAreaId } from '../entities/entityFilters.js';

/**
 * Tile features for `fan.*` entities. Each renders only when the fan supports
 * it (HA hides unsupported features), so every relevant control is offered:
 * speed slider, preset modes, oscillation, and direction (e.g. ceiling-fan
 * summer/winter reverse). On/off is the tile's built-in icon tap.
 */
const FAN_TILE_FEATURES: TileCardFeature[] = [
    { type: 'fan-speed' },
    { type: 'fan-preset-modes' },
    { type: 'fan-oscillate' },
    { type: 'fan-direction' },
];

/** Display name for an entity: friendly_name → registry name → entity_id. */
function displayName(hass: HomeAssistant, entityId: string): string {
    const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
    if (typeof friendly === 'string' && friendly) return friendly;
    return hass.entities?.[entityId]?.name || entityId;
}

/**
 * All climate entity_ids: every registry entity matching any of the shared
 * `climateEntityFilters` (climate / fan / humidifier).
 * Visibility, and the dashboard's device requirement, are enforced by the
 * underlying entity-context resolution. Sorted alphabetically by display name.
 */
export function collectClimateEntityIds(hass: HomeAssistant): string[] {
    const matchers = climateEntityFilters.map((filter) => generateEntityFilter(hass, filter));
    return Object.keys(hass.entities ?? {})
        .filter((id) => matchers.some((matches) => matches(id)))
        .sort((a, b) => displayName(hass, a).localeCompare(displayName(hass, b)));
}

interface ClimateGroup {
    /** null for entities with no resolvable area. */
    area: Area | null;
    entityIds: string[];
}

/**
 * Group climate entity_ids by area. Real areas come first (sorted by name); the
 * unassigned group (area === null) is appended last when non-empty.
 */
export function groupClimateByArea(hass: HomeAssistant): ClimateGroup[] {
    const byArea = new Map<string, string[]>();
    const unassigned: string[] = [];

    for (const entityId of collectClimateEntityIds(hass)) {
        const entity = hass.entities?.[entityId];
        const areaId = entity ? getEntityAreaId(entity, hass.devices) : null;
        if (areaId && hass.areas?.[areaId]) {
            byArea.set(areaId, (byArea.get(areaId) ?? []).concat(entityId));
        } else {
            unassigned.push(entityId);
        }
    }

    const groups: ClimateGroup[] = [...byArea.entries()]
        .map(([areaId, entityIds]) => ({ area: hass.areas![areaId], entityIds }))
        .sort((a, b) => (a.area!.name || '').localeCompare(b.area!.name || ''));

    if (unassigned.length > 0) {
        groups.push({ area: null, entityIds: unassigned });
    }

    return groups;
}

/** Card for one climate entity: thermostats as thermostat cards, others as tiles. */
function buildClimateCard(entityId: string): ThermostatCard | TileCard {
    if (entityId.startsWith('climate.')) {
        return { type: 'thermostat', entity: entityId };
    }
    if (entityId.startsWith('fan.')) {
        return { type: 'tile', entity: entityId, features: FAN_TILE_FEATURES };
    }
    return { type: 'tile', entity: entityId };
}

/** Build the subtitle heading + entity cards for one climate group. */
function buildGroupCards(group: ClimateGroup): StrategyCard[] {
    const heading: HeadingCard = {
        type: 'heading',
        heading_style: 'subtitle',
        heading: group.area?.name ?? 'Other climate',
    };
    return [heading, ...group.entityIds.map(buildClimateCard)];
}

/**
 * Build the complete Climate view body.
 */
export function buildClimateView(hass: HomeAssistant): SectionsView {
    const groups = groupClimateByArea(hass);
    const cards = groups.flatMap(buildGroupCards);

    return {
        title: 'Climate',
        path: 'climate',
        subview: true,
        icon: 'mdi:thermostat',
        type: 'sections',
        max_columns: 2,
        sections: [
            {
                type: 'grid',
                column_span: 2,
                cards,
            },
        ],
    };
}
