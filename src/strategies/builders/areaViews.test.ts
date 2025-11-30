/**
 * Unit tests for areaViews.ts
 * Tests pure functions for building per-area views.
 */

import { describe, it, expect } from 'vitest';
import { buildEntitiesDomainCard, buildAreaDomainCards, buildAreaView, buildAreaViews } from './areaViews.js';
import type { Entity, EntityDomainInfo } from '../../types/cards.js';

describe('areaViews', () => {
    const mockDomains: EntityDomainInfo[] = [
        { id: 'light', name: 'Lights', icon: 'mdi:lightbulb' },
        { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch' },
    ];

    describe('buildEntitiesDomainCard', () => {
        it('builds entities card for a domain', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'light.lr_2',
                    name: 'LR Light 2',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildEntitiesDomainCard(mockDomains[0], entities);

            expect(result).toMatchObject({
                type: 'entities',
                title: 'Lights',
                entities: ['light.lr_1', 'light.lr_2'],
                show_header_toggle: true,
                state_color: true,
            });
        });

        it('returns null if no entities', () => {
            const result = buildEntitiesDomainCard(mockDomains[0], []);

            expect(result).toBeNull();
        });
    });

    describe('buildAreaDomainCards', () => {
        it('builds multiple domain cards for area', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'switch.lr_fan',
                    name: 'Fan Switch',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildAreaDomainCards(entities, 'living_room', mockDomains, {});

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Lights');
            expect(result[1].title).toBe('Switches');
        });

        it('filters out domains with no entities in area', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildAreaDomainCards(entities, 'living_room', mockDomains, {});

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Lights');
        });

        it('returns empty array for area with no matching entities', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildAreaDomainCards(entities, 'bedroom', mockDomains, {});

            expect(result).toHaveLength(0);
        });
    });

    describe('buildAreaView', () => {
        it('builds area view with domain cards section', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'light.lr_1',
                    name: 'LR Light',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'switch.lr_fan',
                    name: 'Fan Switch',
                    device_id: undefined,
                    area_id: 'living_room',
                },
            ];

            const result = buildAreaView('Living Room', 'living_room', entities, mockDomains, {});

            expect(result).toMatchObject({
                title: 'Living Room',
                path: 'living_room',
                type: 'sections',
                max_columns: 2,
                subview: true,
            });
            expect(result.sections).toBeDefined();
            expect(result.sections?.length).toBeGreaterThan(0);
            expect(result.sections?.[0]).toMatchObject({
                type: 'grid',
                column_span: 2,
                columns: 2,
            });
            expect(result.sections?.[0].cards).toHaveLength(2); // light and switch cards
        });

        it('builds area view even if no entities', () => {
            const result = buildAreaView('Empty Room', 'empty_room', [], mockDomains, {});

            expect(result).toMatchObject({
                title: 'Empty Room',
                path: 'empty_room',
                type: 'sections',
            });
            expect(result.sections).toBeDefined();
            expect(result.sections?.[0].cards).toHaveLength(0);
        });
    });

    describe('buildAreaViews', () => {
        it('builds multiple area views', () => {
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
            const areaNames = {
                living_room: 'Living Room',
                bedroom: 'Bedroom',
            };

            const result = buildAreaViews(['living_room', 'bedroom'], areaNames, entities, mockDomains, {});

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Living Room');
            expect(result[1].title).toBe('Bedroom');
        });

        it('returns empty array for empty area list', () => {
            const result = buildAreaViews([], {}, [], mockDomains, {});

            expect(result).toHaveLength(0);
        });
    });
});
