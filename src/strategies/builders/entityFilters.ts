/**
 * Pure functions for filtering and organizing entities.
 * One thing in, one thing out. No side effects.
 */

import type { Entity, Area, EntityDomainInfo } from '../../types/cards.js';

/**
 * Get the area ID for an entity, checking entity.area_id first, then device.area_id fallback.
 */
export function getEntityAreaId(entity: Entity, devices: Record<string, any> | undefined): string | null {
    if (entity.area_id) return entity.area_id;
    if (entity.device_id && devices?.[entity.device_id]) {
        return devices[entity.device_id].area_id || null;
    }
    return null;
}

/**
 * Filter entities by included domains and excluded entity list.
 */
export function filterEntitiesByDomainAndExclusions(
    entities: Entity[],
    domainInfo: EntityDomainInfo[],
    excludedEntities: string[]
): Entity[] {
    return entities.filter((entity) => {
        const hasIncludedDomain = domainInfo.some((info) => entity.entity_id.startsWith(`${info.id}.`));
        const isNotExcluded = !excludedEntities.includes(entity.entity_id);
        return hasIncludedDomain && isNotExcluded;
    });
}

/**
 * Sort entities alphabetically by name or entity_id.
 */
export function sortEntitiesAlphabetically(entities: Entity[]): Entity[] {
    return [...entities].sort((a, b) => (a.name || a.entity_id).localeCompare(b.name || b.entity_id));
}

/**
 * Get entities in a specific domain.
 */
export function getEntitiesByDomain(entities: Entity[], domain: string): Entity[] {
    return entities.filter((e) => e.entity_id.startsWith(`${domain}.`));
}

/**
 * Filter areas to only those with valid names and at least one entity.
 */
export function filterValidAreas(areas: Area[], entities: Entity[], devices: Record<string, any> | undefined): Area[] {
    return areas.filter((area) => {
        // Skip default area
        if (area.area_id === 'default') return false;

        // Must have a non-empty name
        if (!area.name || area.name.trim() === '') return false;

        // Must have at least one entity
        const hasEntity = entities.some((entity) => {
            const areaId = getEntityAreaId(entity, devices);
            return areaId === area.area_id;
        });

        return hasEntity;
    });
}

/**
 * Sort areas alphabetically by name.
 */
export function sortAreasAlphabetically(areas: Area[]): Area[] {
    return [...areas].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/**
 * Get entities for a specific area and domain.
 */
export function getAreaDomainEntities(
    entities: Entity[],
    areaId: string,
    domain: string,
    devices: Record<string, any> | undefined
): Entity[] {
    return entities.filter((entity) => {
        const entityAreaId = getEntityAreaId(entity, devices);
        const inArea = entityAreaId === areaId;
        const inDomain = entity.entity_id.startsWith(`${domain}.`);
        return inArea && inDomain;
    });
}

/**
 * Check if any entity exists in a domain (case-insensitive).
 */
export function hasDomain(entityIds: string[], domain: string): boolean {
    return entityIds.some((id) => id.startsWith(`${domain}.`));
}
