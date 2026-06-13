/**
 * Unit tests for areaViews.ts
 * Tests pure functions for building per-area views.
 */

import { describe, it, expect } from 'vitest';
import { buildEntitiesDomainCard, buildAreaDomainCards, buildAreaView, buildAreaViews } from './areaViews.js';
import { EntityDomainInfo, EntityContext, Area, Entity } from '../../types/core.js';

const mockDomains: EntityDomainInfo[] = [
    { id: 'light', name: 'Lights', icon: 'mdi:lightbulb', filter: [{ domain: 'light' }] },
    { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch', filter: [{ domain: 'switch' }] },
];

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

function makeEntityContext(entityId: string, area: Area): EntityContext {
    const deviceId = `dev_${entityId}`;
    return {
        entity: { entity_id: entityId, device_id: deviceId, area_id: area.area_id },
        device: { id: deviceId, area_id: area.area_id },
        area,
        state: { state: 'on', attributes: {} },
        device_class: entityId.split('.')[0],
    };
}

describe('areaViews', () => {
    describe('buildEntitiesDomainCard', () => {
        it('builds entities card for a domain', () => {
            const hass = makeMinimalHass([
                { entityId: 'light.lr_1', areaId: 'living_room' },
                { entityId: 'light.lr_2', areaId: 'living_room' },
            ]);
            const entities: Entity[] = [
                { entity_id: 'light.lr_1', name: 'LR Light', device_id: 'dev_light.lr_1', area_id: 'living_room' },
                { entity_id: 'light.lr_2', name: 'LR Light 2', device_id: 'dev_light.lr_2', area_id: 'living_room' },
            ];

            const result = buildEntitiesDomainCard(mockDomains[0], hass, entities);

            expect(result).toMatchObject({
                type: 'entities',
                title: 'Lights',
                entities: ['light.lr_1', 'light.lr_2'],
                show_header_toggle: true,
                state_color: true,
            });
        });

        it('returns null if no entities', () => {
            const hass = makeMinimalHass([]);

            const result = buildEntitiesDomainCard(mockDomains[0], hass, []);

            expect(result).toBeNull();
        });
    });

    describe('buildAreaDomainCards', () => {
        it('builds multiple domain cards for area', () => {
            const area: Area = { area_id: 'living_room', name: 'Living Room' };
            const hass = makeMinimalHass([
                { entityId: 'light.lr_1', areaId: 'living_room' },
                { entityId: 'switch.lr_fan', areaId: 'living_room' },
            ]);
            const entityContexts: EntityContext[] = [
                makeEntityContext('light.lr_1', area),
                makeEntityContext('switch.lr_fan', area),
            ];

            const result = buildAreaDomainCards(entityContexts, hass, area, mockDomains);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Lights');
            expect(result[1].title).toBe('Switches');
        });

        it('filters out domains with no entities in area', () => {
            const area: Area = { area_id: 'living_room', name: 'Living Room' };
            const hass = makeMinimalHass([{ entityId: 'light.lr_1', areaId: 'living_room' }]);
            const entityContexts: EntityContext[] = [makeEntityContext('light.lr_1', area)];

            const result = buildAreaDomainCards(entityContexts, hass, area, mockDomains);

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Lights');
        });

        it('returns empty array for area with no matching entities', () => {
            const livingRoom: Area = { area_id: 'living_room', name: 'Living Room' };
            const bedroom: Area = { area_id: 'bedroom', name: 'Bedroom' };
            const hass = makeMinimalHass([{ entityId: 'light.lr_1', areaId: 'living_room' }]);
            const entityContexts: EntityContext[] = [makeEntityContext('light.lr_1', livingRoom)];

            const result = buildAreaDomainCards(entityContexts, hass, bedroom, mockDomains);

            expect(result).toHaveLength(0);
        });
    });

    describe('buildAreaView', () => {
        it('builds area view with domain cards section', () => {
            const area: Area = { area_id: 'living_room', name: 'Living Room' };
            const hass = makeMinimalHass([
                { entityId: 'light.lr_1', areaId: 'living_room' },
                { entityId: 'switch.lr_fan', areaId: 'living_room' },
            ]);
            const entityContexts: EntityContext[] = [
                makeEntityContext('light.lr_1', area),
                makeEntityContext('switch.lr_fan', area),
            ];

            const result = buildAreaView(hass, area, entityContexts, mockDomains);

            expect(result).toMatchObject({
                title: 'Living Room',
                path: 'living_room',
                type: 'sections',
                max_columns: 2,
                subview: true,
            });
            expect(result.sections).toBeDefined();
            expect(result.sections?.length).toBeGreaterThan(0);
            expect(result.sections?.[0]).toMatchObject({ type: 'grid', column_span: 2, columns: 2 });
        });

        it('builds area view even if no entities', () => {
            const area: Area = { area_id: 'empty_room', name: 'Empty Room' };
            const hass = makeMinimalHass([]);

            const result = buildAreaView(hass, area, [], mockDomains);

            expect(result).toMatchObject({
                title: 'Empty Room',
                path: 'empty_room',
                type: 'sections',
            });
            expect(result.sections?.[0].cards).toHaveLength(0);
        });
    });

    describe('buildAreaViews', () => {
        it('builds multiple area views', () => {
            const livingRoom: Area = { area_id: 'living_room', name: 'Living Room' };
            const bedroom: Area = { area_id: 'bedroom', name: 'Bedroom' };
            const hass = makeMinimalHass([
                { entityId: 'light.lr_1', areaId: 'living_room' },
                { entityId: 'light.br_1', areaId: 'bedroom' },
            ]);
            const entityContexts: EntityContext[] = [
                makeEntityContext('light.lr_1', livingRoom),
                makeEntityContext('light.br_1', bedroom),
            ];

            const result = buildAreaViews(entityContexts, hass, [livingRoom, bedroom], mockDomains);

            expect(result).toHaveLength(2);
            expect(result[0].title).toBe('Living Room');
            expect(result[1].title).toBe('Bedroom');
        });

        it('returns empty array for empty area list', () => {
            const result = buildAreaViews([], makeMinimalHass([]), [], mockDomains);

            expect(result).toHaveLength(0);
        });
    });
});
