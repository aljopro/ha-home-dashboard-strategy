/**
 * Unit tests for areaCards.ts
 * Tests pure functions for building area card sections.
 */

import { describe, it, expect } from 'vitest';
import { buildAreaCard, buildAreaCardsSection, getAreaIdsFromCards } from './areaCards.js';
import type { Area, Entity, AreaCard, StrategyCard } from '../../types/cards.js';

describe('areaCards', () => {
    describe('buildAreaCard', () => {
        it('creates area card with correct properties', () => {
            const area: Area = {
                area_id: 'living_room',
                name: 'Living Room',
            };

            const result = buildAreaCard(area, '') as AreaCard;

            expect(result.type).toBe('area');
            expect(result.area).toBe('living_room');
            expect(result.title).toBe('Living Room');
            expect(result.display_type).toBe('picture');
            expect(result.features_position).toBe('bottom');
            expect(result.navigation_path).toBe('/living_room');
        });

        it('includes area-controls feature', () => {
            const area: Area = {
                area_id: 'kitchen',
                name: 'Kitchen',
            };

            const result = buildAreaCard(area, '') as AreaCard;

            expect(result.features).toBeDefined();
            expect(result.features?.[0]).toMatchObject({
                type: 'area-controls',
                controls: expect.arrayContaining(['light', 'switch', 'fan']),
            });
        });

        it('prepends basePath to navigation_path', () => {
            const area: Area = {
                area_id: 'bedroom',
                name: 'Bedroom',
            };

            const result = buildAreaCard(area, 'my-dashboard') as AreaCard;

            expect(result.navigation_path).toBe('/my-dashboard/bedroom');
        });
    });

    describe('buildAreaCardsSection', () => {
        it('returns heading followed by area cards', () => {
            const areas: Area[] = [
                { area_id: 'living_room', name: 'Living Room' },
                { area_id: 'bedroom', name: 'Bedroom' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'light.br_1',
                    name: 'BR Light',
                    device_id: undefined,
                    area_id: 'bedroom',
                },
            ];

            const result = buildAreaCardsSection(areas, entities, {}, '');

            expect(result[0]).toMatchObject({
                type: 'heading',
                heading: 'Areas',
                heading_style: 'title',
            });
            expect(result.length).toBe(3); // heading + 2 area cards
            // Note: areas are sorted alphabetically, so Bedroom comes before Living Room
            expect(result[1]).toMatchObject({
                type: 'area',
                area: 'bedroom',
            });
            expect(result[2]).toMatchObject({
                type: 'area',
                area: 'living_room',
            });
        });

        it('filters out default area', () => {
            const areas: Area[] = [
                { area_id: 'default', name: 'Default' },
                { area_id: 'living_room', name: 'Living Room' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildAreaCardsSection(areas, entities, {}, '');

            const areaCards = result.filter((c) => 'area' in c);
            expect(areaCards).toHaveLength(1);
            expect(areaCards[0]).toMatchObject({ area: 'living_room' });
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

            const result = buildAreaCardsSection(areas, entities, {}, '');

            const areaCards = result.filter((c) => 'area' in c);
            expect(areaCards).toHaveLength(1);
            expect(areaCards[0]).toMatchObject({ area: 'valid' });
        });

        it('filters out areas with no entities', () => {
            const areas: Area[] = [
                { area_id: 'empty', name: 'Empty Area' },
                { area_id: 'filled', name: 'Filled Area' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.filled',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'filled',
                },
            ];

            const result = buildAreaCardsSection(areas, entities, {}, '');

            const areaCards = result.filter((c) => 'area' in c);
            expect(areaCards).toHaveLength(1);
            expect(areaCards[0]).toMatchObject({ area: 'filled' });
        });

        it('sorts areas alphabetically', () => {
            const areas: Area[] = [
                { area_id: 'c', name: 'Zebra' },
                { area_id: 'a', name: 'Apple' },
                { area_id: 'b', name: 'Banana' },
            ];
            const entities: Entity[] = [
                {
                    entity_id: 'light.a',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'a',
                },
                {
                    entity_id: 'light.b',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'b',
                },
                {
                    entity_id: 'light.c',
                    name: 'Light',
                    device_id: undefined,
                    area_id: 'c',
                },
            ];

            const result = buildAreaCardsSection(areas, entities, {}, '');

            const areaCards = result.filter((c) => 'area' in c) as any[];
            expect(areaCards.map((c) => c.area)).toEqual(['a', 'b', 'c']);
        });
    });

    describe('getAreaIdsFromCards', () => {
        it('extracts area IDs from area cards', () => {
            const cards: StrategyCard[] = [
                {
                    type: 'heading',
                    heading: 'Areas',
                    heading_style: 'title',
                } as const,
                {
                    type: 'area' as const,
                    area: 'living_room',
                    title: 'Living Room',
                    navigation_path: '/living_room',
                },
                {
                    type: 'area' as const,
                    area: 'bedroom',
                    title: 'Bedroom',
                    navigation_path: '/bedroom',
                },
            ];

            const result = getAreaIdsFromCards(cards);

            expect(result).toEqual(['living_room', 'bedroom']);
        });

        it('filters out non-area cards', () => {
            const cards: StrategyCard[] = [
                {
                    type: 'heading',
                    heading: 'Areas',
                    heading_style: 'title',
                } as const,
                { type: 'entities', title: 'Entities', entities: [] } as const,
            ];

            const result = getAreaIdsFromCards(cards);

            expect(result).toHaveLength(0);
        });

        it('returns empty array for empty input', () => {
            const result = getAreaIdsFromCards([]);

            expect(result).toHaveLength(0);
        });
    });
});
