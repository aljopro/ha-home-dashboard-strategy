/**
 * Pure builder for the Lights subview (`custom:home-lights`).
 *
 * Lists every `light.*` entity plus light-like `switch.*` entities (see
 * isLightLikeSwitch), grouped by area, as tile cards. Entities with no area are
 * collected under a trailing "Other lights" group. Returned as a sections view
 * body; the dashboard supplies the title/path/subview base.
 */

import type { HeadingCard, HomeAssistant, SectionsView, StrategyCard, TileCard } from '../../../types/cards.js';
import type { Area, HassStates } from '../../../types/core.js';
import { getEntityAreaId, isEntityVisible } from '../entities/entityFilters.js';
import { isLightLikeSwitch } from '../entities/lightLikeSwitch.js';

/** Display name for an entity: friendly_name → registry name → entity_id. */
function displayName(hass: HomeAssistant, entityId: string): string {
    const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
    if (typeof friendly === 'string' && friendly) return friendly;
    return hass.entities?.[entityId]?.name || entityId;
}

/**
 * All light entity_ids: every `light.*`, plus `switch.*` entities that are
 * light-like. Sorted alphabetically by display name.
 */
export function collectLightEntityIds(hass: HomeAssistant): string[] {
    const states: HassStates = hass.states ?? {};
    return Object.keys(states)
        .filter((id) => id.startsWith('light.') || isLightLikeSwitch(id, states[id]))
        .filter((id) => isEntityVisible(hass.entities?.[id]))
        .sort((a, b) => displayName(hass, a).localeCompare(displayName(hass, b)));
}

interface LightGroup {
    /** null for entities with no resolvable area. */
    area: Area | null;
    entityIds: string[];
}

/**
 * Group light entity_ids by area. Real areas come first (sorted by name); the
 * unassigned group (area === null) is appended last when non-empty.
 */
export function groupLightsByArea(hass: HomeAssistant): LightGroup[] {
    const byArea = new Map<string, string[]>();
    const unassigned: string[] = [];

    for (const entityId of collectLightEntityIds(hass)) {
        const entity = hass.entities?.[entityId];
        const areaId = entity ? getEntityAreaId(entity, hass.devices) : null;
        if (areaId && hass.areas?.[areaId]) {
            byArea.set(areaId, (byArea.get(areaId) ?? []).concat(entityId));
        } else {
            unassigned.push(entityId);
        }
    }

    const groups: LightGroup[] = [...byArea.entries()]
        .map(([areaId, entityIds]) => ({ area: hass.areas![areaId], entityIds }))
        .sort((a, b) => (a.area!.name || '').localeCompare(b.area!.name || ''));

    if (unassigned.length > 0) {
        groups.push({ area: null, entityIds: unassigned });
    }

    return groups;
}

/** Build the subtitle heading + tile cards for one light group. */
function buildGroupCards(group: LightGroup): StrategyCard[] {
    const heading: HeadingCard = {
        type: 'heading',
        heading_style: 'subtitle',
        heading: group.area?.name ?? 'Other lights',
    };
    const tiles: TileCard[] = group.entityIds.map((entity) => ({ type: 'tile', entity }));
    return [heading, ...tiles];
}

/**
 * Build the complete Lights view body.
 */
export function buildLightsView(hass: HomeAssistant): SectionsView {
    const groups = groupLightsByArea(hass);
    const cards = groups.flatMap(buildGroupCards);

    return {
        title: 'Lights',
        path: 'lights',
        subview: true,
        icon: 'mdi:lightbulb-group',
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
