/**
 * Pure builder for the Security subview (`custom:home-security`).
 *
 * Lists every security entity — alarm panels, locks, security covers, security
 * binary_sensors, and cameras — grouped by area. The membership definition is
 * reused from `securityEntityFilters` (see entityDomains.ts) so the subview, the
 * home-view area cards, and the per-area views all agree on what "security"
 * means. Cameras render as `picture-entity` cards (auto-updating stills);
 * everything else renders as `tile` cards. Entities with no resolvable area are
 * collected under a trailing "Other security" group.
 *
 * Mirrors the Lights view builder (see lightsView.ts).
 */

import type {
    HeadingCard,
    HomeAssistant,
    PictureEntityCard,
    SectionsView,
    StrategyCard,
    TileCard,
} from '../../../types/cards.js';
import type { Area } from '../../../types/core.js';
import { securityEntityFilters } from '../../entityDomains.js';
import { generateEntityFilter, getEntityAreaId } from '../entities/entityFilters.js';

/** Display name for an entity: friendly_name → registry name → entity_id. */
function displayName(hass: HomeAssistant, entityId: string): string {
    const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
    if (typeof friendly === 'string' && friendly) return friendly;
    return hass.entities?.[entityId]?.name || entityId;
}

/**
 * All security entity_ids: every registry entity matching any of the shared
 * `securityEntityFilters` (domain + device_class). Visibility, and the
 * dashboard's device requirement, are enforced by the underlying entity-context
 * resolution. Sorted alphabetically by display name.
 */
export function collectSecurityEntityIds(hass: HomeAssistant): string[] {
    const matchers = securityEntityFilters.map((filter) => generateEntityFilter(hass, filter));
    return Object.keys(hass.entities ?? {})
        .filter((id) => matchers.some((matches) => matches(id)))
        .sort((a, b) => displayName(hass, a).localeCompare(displayName(hass, b)));
}

interface SecurityGroup {
    /** null for entities with no resolvable area. */
    area: Area | null;
    entityIds: string[];
}

/**
 * Group security entity_ids by area. Real areas come first (sorted by name); the
 * unassigned group (area === null) is appended last when non-empty.
 */
export function groupSecurityByArea(hass: HomeAssistant): SecurityGroup[] {
    const byArea = new Map<string, string[]>();
    const unassigned: string[] = [];

    for (const entityId of collectSecurityEntityIds(hass)) {
        const entity = hass.entities?.[entityId];
        const areaId = entity ? getEntityAreaId(entity, hass.devices) : null;
        if (areaId && hass.areas?.[areaId]) {
            byArea.set(areaId, (byArea.get(areaId) ?? []).concat(entityId));
        } else {
            unassigned.push(entityId);
        }
    }

    const groups: SecurityGroup[] = [...byArea.entries()]
        .map(([areaId, entityIds]) => ({ area: hass.areas![areaId], entityIds }))
        .sort((a, b) => (a.area!.name || '').localeCompare(b.area!.name || ''));

    if (unassigned.length > 0) {
        groups.push({ area: null, entityIds: unassigned });
    }

    return groups;
}

/** Card for one security entity: cameras as picture-entity, others as tile. */
function buildSecurityCard(entityId: string): PictureEntityCard | TileCard {
    if (entityId.startsWith('camera.')) {
        return { type: 'picture-entity', entity: entityId, camera_view: 'auto' };
    }
    return { type: 'tile', entity: entityId };
}

/** Build the subtitle heading + entity cards for one security group. */
function buildGroupCards(group: SecurityGroup): StrategyCard[] {
    const heading: HeadingCard = {
        type: 'heading',
        heading_style: 'subtitle',
        heading: group.area?.name ?? 'Other security',
    };
    return [heading, ...group.entityIds.map(buildSecurityCard)];
}

/**
 * Build the complete Security view body.
 */
export function buildSecurityView(hass: HomeAssistant): SectionsView {
    const groups = groupSecurityByArea(hass);
    const cards = groups.flatMap(buildGroupCards);

    return {
        title: 'Security',
        path: 'security',
        subview: true,
        icon: 'mdi:shield-home',
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
