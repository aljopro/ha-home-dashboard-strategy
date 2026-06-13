/**
 * Unit tests for entityFilters.ts
 * Tests pure functions for entity filtering and organization.
 */

import { describe, it, expect } from 'vitest';
import {
    filterEntitiesByDomainAndExclusions,
    generateEntityFilter,
    sortEntitiesAlphabetically,
    filterValidAreas,
    sortAreasAlphabetically,
    getAreaDomainEntities,
    hasDomain,
    isEntityVisible,
} from './entityFilters.js';
import type { Entity, Area, EntityDomainInfo } from '../../../types/core.js';
import type { HomeAssistant } from '../../../types/cards.js';

function makeMinimalHass(entityDefs: Array<{ entityId: string; deviceId?: string; areaId?: string }>) {
    const h: any = { entities: {}, states: {}, devices: {}, areas: {} };
    for (const def of entityDefs) {
        const deviceId = def.deviceId ?? `dev_${def.entityId}`;
        h.entities[def.entityId] = { entity_id: def.entityId, device_id: deviceId, area_id: def.areaId ?? null };
        h.states[def.entityId] = { state: 'on', attributes: {} };
        h.devices[deviceId] = { id: deviceId, area_id: def.areaId ?? null };
        if (def.areaId) {
            h.areas[def.areaId] = { area_id: def.areaId, name: def.areaId };
        }
    }
    return h;
}

describe('entityFilters', () => {
    const mockDomains: EntityDomainInfo[] = [
        { id: 'light', name: 'Lights', icon: 'mdi:lightbulb', filter: [{ domain: 'light' }] },
        { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch', filter: [{ domain: 'switch' }] },
    ];

    describe('generateEntityFilter device_class', () => {
        // device_class is read from the entity STATE attributes (matching HA),
        // not the registry display entry — which carries no device_class.
        function hass(deviceClassInState?: string): HomeAssistant {
            return {
                entities: { 'binary_sensor.x': { entity_id: 'binary_sensor.x', device_id: 'd1' } },
                devices: { d1: { id: 'd1', area_id: null } },
                areas: {},
                states: {
                    'binary_sensor.x': {
                        state: 'off',
                        attributes: deviceClassInState ? { device_class: deviceClassInState } : {},
                    },
                },
            } as unknown as HomeAssistant;
        }

        it('matches when the state attribute device_class is in the filter set', () => {
            const filter = generateEntityFilter(hass('door'), { domain: 'binary_sensor', device_class: ['door', 'window'] });
            expect(filter('binary_sensor.x')).toBe(true);
        });

        it('rejects when the state attribute device_class is not in the filter set', () => {
            const filter = generateEntityFilter(hass('motion'), { domain: 'binary_sensor', device_class: ['door'] });
            expect(filter('binary_sensor.x')).toBe(false);
        });

        it('rejects when the entity has no device_class attribute at all', () => {
            const filter = generateEntityFilter(hass(undefined), { domain: 'binary_sensor', device_class: ['door'] });
            expect(filter('binary_sensor.x')).toBe(false);
        });
    });

    describe('filterEntitiesByDomainAndExclusions', () => {
        it('filters entities by included domains', () => {
            const hass = makeMinimalHass([
                { entityId: 'light.living_room' },
                { entityId: 'switch.fan' },
                { entityId: 'climate.thermostat' },
            ]);

            const result = filterEntitiesByDomainAndExclusions(hass, mockDomains, []);

            expect(result).toHaveLength(2);
            expect(result.map((e) => e.entity_id)).toContain('light.living_room');
            expect(result.map((e) => e.entity_id)).toContain('switch.fan');
        });

        it('excludes entities in exclusion list', () => {
            const hass = makeMinimalHass([
                { entityId: 'light.living_room' },
                { entityId: 'light.bedroom' },
            ]);

            const result = filterEntitiesByDomainAndExclusions(hass, mockDomains, ['light.living_room']);

            expect(result).toHaveLength(1);
            expect(result[0].entity_id).toBe('light.bedroom');
        });

        it('returns empty array if no entities match', () => {
            const hass = makeMinimalHass([{ entityId: 'climate.thermostat' }]);

            const result = filterEntitiesByDomainAndExclusions(hass, mockDomains, []);

            expect(result).toHaveLength(0);
        });
    });

    describe('sortEntitiesAlphabetically', () => {
        it('sorts entities by name', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.c',
                    name: 'Zebra',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'light.a',
                    name: 'Apple',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'light.b',
                    name: 'Banana',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = sortEntitiesAlphabetically(entities);

            expect(result.map((e) => e.name)).toEqual(['Apple', 'Banana', 'Zebra']);
        });

        it('sorts by entity_id if name is missing', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.zebra',
                    name: '',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'light.apple',
                    name: '',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = sortEntitiesAlphabetically(entities);

            expect(result.map((e) => e.entity_id)).toEqual(['light.apple', 'light.zebra']);
        });

        it('does not mutate original array', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.b',
                    name: 'B',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'light.a',
                    name: 'A',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];
            const original = [...entities];

            sortEntitiesAlphabetically(entities);

            expect(entities).toEqual(original);
        });
    });

    describe('filterValidAreas', () => {
        it('filters out default area', () => {
            const areas: Area[] = [
                { area_id: 'default', name: 'Default' },
                { area_id: 'living_room', name: 'Living Room' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.living_room',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = filterValidAreas(areas, entities, {});

            expect(result).toHaveLength(1);
            expect(result[0].area_id).toBe('living_room');
        });

        it('filters out areas with empty names', () => {
            const areas: Area[] = [
                { area_id: 'empty', name: '   ' },
                { area_id: 'valid', name: 'Valid Area' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.valid',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'valid',
                },
            ];

            const result = filterValidAreas(areas, entities, {});

            expect(result).toHaveLength(1);
            expect(result[0].area_id).toBe('valid');
        });

        it('filters out areas with no entities', () => {
            const areas: Area[] = [
                { area_id: 'empty_area', name: 'Empty Area' },
                { area_id: 'filled_area', name: 'Filled Area' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.filled',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'filled_area',
                },
            ];

            const result = filterValidAreas(areas, entities, {});

            expect(result).toHaveLength(1);
            expect(result[0].area_id).toBe('filled_area');
        });
    });

    describe('sortAreasAlphabetically', () => {
        it('sorts areas by name', () => {
            const areas: Area[] = [
                { area_id: 'c', name: 'Zebra' },
                { area_id: 'a', name: 'Apple' },
                { area_id: 'b', name: 'Banana' },
            ];

            const result = sortAreasAlphabetically(areas);

            expect(result.map((a) => a.name)).toEqual(['Apple', 'Banana', 'Zebra']);
        });

        it('does not mutate original array', () => {
            const areas: Area[] = [
                { area_id: 'b', name: 'B' },
                { area_id: 'a', name: 'A' },
            ];
            const original = [...areas];

            sortAreasAlphabetically(areas);

            expect(areas).toEqual(original);
        });
    });

    describe('getAreaDomainEntities', () => {
        it('gets entities for specific area and domain', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'Light 1',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'light.lr_2',
                    name: 'Light 2',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'switch.lr_1',
                    name: 'Switch 1',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'light.br_1',
                    name: 'Light 3',
                    device_id: undefined,
                    area_id: 'bedroom',
                },
            ];

            const result = getAreaDomainEntities(entities, 'living_room', 'light', {});

            expect(result).toHaveLength(2);
            expect(result.map((e) => e.entity_id)).toEqual(['light.lr_1', 'light.lr_2']);
        });

        it('returns empty array if no matches', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'switch.lr_1',
                    name: 'Switch',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = getAreaDomainEntities(entities, 'living_room', 'light', {});

            expect(result).toHaveLength(0);
        });
    });

    describe('hasDomain', () => {
        it('returns true if domain exists', () => {
            const entityIds = ['light.lr_1', 'switch.fan', 'climate.thermostat'];

            expect(hasDomain(entityIds, 'light')).toBe(true);
            expect(hasDomain(entityIds, 'switch')).toBe(true);
            expect(hasDomain(entityIds, 'climate')).toBe(true);
        });

        it('returns false if domain does not exist', () => {
            const entityIds = ['light.lr_1', 'switch.fan'];

            expect(hasDomain(entityIds, 'media_player')).toBe(false);
        });

        it('returns false for empty array', () => {
            expect(hasDomain([], 'light')).toBe(false);
        });
    });

    describe('isEntityVisible', () => {
        it('treats a plain registry entry as visible', () => {
            expect(isEntityVisible({ entity_id: 'light.a' } as Entity)).toBe(true);
        });

        it('treats a state-only entity (no registry entry) as visible', () => {
            expect(isEntityVisible(undefined)).toBe(true);
        });

        it('hides entities whose display registry hidden flag is set', () => {
            // `hidden: true` is the real field on hass.entities (is_hidden_entity)
            expect(isEntityVisible({ entity_id: 'switch.x', hidden: true } as Entity)).toBe(false);
        });

        it('also honors hidden_by on full registry entries', () => {
            expect(isEntityVisible({ entity_id: 'switch.x', hidden_by: 'integration' } as Entity)).toBe(false);
            expect(isEntityVisible({ entity_id: 'switch.x', hidden_by: 'user' } as Entity)).toBe(false);
        });

        it('hides disabled entities', () => {
            expect(isEntityVisible({ entity_id: 'switch.x', disabled_by: 'user' } as Entity)).toBe(false);
        });
    });
});
