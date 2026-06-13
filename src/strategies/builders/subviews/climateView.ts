/**
 * Pure builder for the Climate subview (`custom:home-climate`).
 *
 * Lists every `climate.*` entity, grouped by area, as thermostat cards.
 * Entities with no area are collected under a trailing "Other climate" group.
 * Returned as a sections view body; the dashboard supplies the
 * title/path/subview base. Mirrors the Lights view builder (see lightsView.ts).
 */

import type { HeadingCard, HomeAssistant, SectionsView, StrategyCard, ThermostatCard } from '../../../types/cards.js';
import type { Area, HassStates } from '../../../types/core.js';
import { getEntityAreaId, isEntityVisible } from '../entities/entityFilters.js';

/** Display name for an entity: friendly_name → registry name → entity_id. */
function displayName(hass: HomeAssistant, entityId: string): string {
    const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
    if (typeof friendly === 'string' && friendly) return friendly;
    return hass.entities?.[entityId]?.name || entityId;
}

/**
 * All climate entity_ids: every visible `climate.*`. Sorted alphabetically by
 * display name.
 */
export function collectClimateEntityIds(hass: HomeAssistant): string[] {
    const states: HassStates = hass.states ?? {};
    return Object.keys(states)
        .filter((id) => id.startsWith('climate.'))
        .filter((id) => isEntityVisible(hass.entities?.[id]))
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

/** Build the subtitle heading + thermostat cards for one climate group. */
function buildGroupCards(group: ClimateGroup): StrategyCard[] {
    const heading: HeadingCard = {
        type: 'heading',
        heading_style: 'subtitle',
        heading: group.area?.name ?? 'Other climate',
    };
    const thermostats: ThermostatCard[] = group.entityIds.map((entity) => ({ type: 'thermostat', entity }));
    return [heading, ...thermostats];
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
