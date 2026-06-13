/**
 * Pure functions for filtering and organizing entities.
 * One thing in, one thing out. No side effects.
 */

import { HomeAssistant } from '../../types/cards.js';
import type { Area, Entity, EntityDomainInfo, EntityFilter, EntityState } from '../../types/core.js';
import { ensureArray } from '../../utils/ensure-array.js';
import { getEntityContext } from './getEntityContext.js';

/**
 * Whether an entity registry entry should be shown on the dashboard.
 *
 * The frontend's `hass.entities` are EntityRegistryDisplayEntry objects whose
 * visibility is the boolean `hidden` field (equivalent to the `is_hidden_entity`
 * template) — set when an entity is hidden by its integration or by the user.
 * The full registry's `hidden_by`/`disabled_by` are NOT present on these display
 * entries, but we also honor them so full registry entries (e.g. in tests) work.
 *
 * A state-only entity with no registry entry (`undefined`) is treated as
 * visible — it cannot carry a hidden flag.
 */
export function isEntityVisible(entity: Entity | undefined): boolean {
    if (!entity) return true;
    return !entity.hidden && !entity.hidden_by && !entity.disabled_by;
}

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

export function filterEntities(entities: Entity[], hass: HomeAssistant, domainInfo: EntityDomainInfo): Entity[] {
    return entities.filter((entity: Entity) => {
        const result = ensureArray(domainInfo.filter)
            .map((filter) => generateEntityFilter(hass, filter))
            .some((filterFunc) => filterFunc(entity.entity_id));
        return result;
    });
}

export function generateEntityFilter(hass: HomeAssistant, filter: EntityFilter): (entityId: string) => boolean {
    const domains = normalizeFilterArray(filter.domain || []);
    const deviceClasses = normalizeFilterArray(filter.device_class || []);
    const entityCategories = normalizeFilterArray(filter.entity_category || []);

    return (entityId: string) => {
        const context = getEntityContext(hass, entityId);

        if (!context) {
            return false;
        }
        if (domains && domains.size > 0) {
            if (!domains.has(context.device_class)) {
                return false;
            }
        }
        if (deviceClasses && deviceClasses.size > 0) {
            const deviceClass = context.entity?.device_class || 'none';

            if (!deviceClasses.has(deviceClass)) {
                return false;
            }
        }
        if (entityCategories && entityCategories.size > 0) {
            const category = context.entity?.entity_category || 'none';

            if (!entityCategories.has(category)) {
                return false;
            }
        }

        return true;
    };
}

export function normalizeFilterArray<T>(value: T | null | T[] | (T | null)[] | undefined): Set<T | null> | undefined {
    if (value === undefined) {
        return undefined;
    }
    if (value === null) {
        return new Set([null]);
    }
    return new Set(ensureArray(value));
}

export function filterEntitiesByDomainAndExclusions(
    hass: HomeAssistant,
    domainInfo: EntityDomainInfo[],
    excludedEntities: string[]
): Entity[] {
    const entities = Object.values(hass?.entities || {}) as Entity[];

    return domainInfo
        .flatMap((info) => {
            return filterEntities(entities, hass, info);
        })
        .filter((entity) => !excludedEntities.includes(entity.entity_id));
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
