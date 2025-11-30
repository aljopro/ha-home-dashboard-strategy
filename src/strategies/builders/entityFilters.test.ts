/**
 * Unit tests for entityFilters.ts
 * Tests pure functions for entity filtering and organization.
 */

import { describe, it, expect } from 'vitest';
import {
    filterEntitiesByDomainAndExclusions,
    sortEntitiesAlphabetically,
    filterValidAreas,
    sortAreasAlphabetically,
    getAreaDomainEntities,
    hasDomain,
} from './entityFilters.js';
import type { Entity, Area } from '../../types/cards.js';

describe('entityFilters', () => {
    const mockDomains = [
        { id: 'light', name: 'Lights', icon: 'mdi:lightbulb' },
        { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch' },
    ];

    describe('filterEntitiesByDomainAndExclusions', () => {
        it('filters entities by included domains', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.living_room',
                    name: 'Living Room Light',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'switch.fan',
                    name: 'Fan Switch',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'climate.thermostat',
                    name: 'Thermostat',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = filterEntitiesByDomainAndExclusions(entities, mockDomains, []);

            expect(result).toHaveLength(2);
            expect(result.map((e) => e.entity_id)).toEqual(['light.living_room', 'switch.fan']);
        });

        it('excludes entities in exclusion list', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.living_room',
                    name: 'Living Room Light',
                    device_id: undefined,
                    area_id: undefined,
                },
                {
                    entity_id: 'light.bedroom',
                    name: 'Bedroom Light',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = filterEntitiesByDomainAndExclusions(entities, mockDomains, ['light.living_room']);

            expect(result).toHaveLength(1);
            expect(result[0].entity_id).toBe('light.bedroom');
        });

        it('returns empty array if no entities match', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'climate.thermostat',
                    name: 'Thermostat',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = filterEntitiesByDomainAndExclusions(entities, mockDomains, []);

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
});
