/**
 * Unit tests for the Maintenance view builder.
 */

import { describe, it, expect } from 'vitest';
import {
    buildMaintenanceView,
    collectMaintenanceItems,
    hasMaintenanceItems,
    maintenanceItemCount,
} from './maintenanceView.js';
import type { HomeAssistant, HeadingCard, TileCard } from '../../../types/cards.js';

/**
 * Battery entities (sensors + binary_sensors), update entities, and decoys.
 * device_class lives in STATE attributes (matching real HA). Every entity has a
 * device so entity-context resolution keeps it.
 */
function makeHass(): HomeAssistant {
    const battery = (dc = 'battery') => ({ device_class: dc });
    return {
        areas: {},
        devices: Object.fromEntries(['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'].map((id) => [id, { id }])),
        entities: {
            'sensor.phone_battery': { entity_id: 'sensor.phone_battery', device_id: 'd1' },
            'sensor.tablet_battery': { entity_id: 'sensor.tablet_battery', device_id: 'd2' },
            'sensor.garage_battery': { entity_id: 'sensor.garage_battery', device_id: 'd3' },
            'binary_sensor.door_battery': { entity_id: 'binary_sensor.door_battery', device_id: 'd4' },
            'binary_sensor.window_battery': { entity_id: 'binary_sensor.window_battery', device_id: 'd5' },
            'update.router_fw': { entity_id: 'update.router_fw', device_id: 'd6' },
            'update.tv_fw': { entity_id: 'update.tv_fw', device_id: 'd7' },
            'sensor.kitchen_temp': { entity_id: 'sensor.kitchen_temp', device_id: 'd8' },
        },
        states: {
            // 15% → low
            'sensor.phone_battery': { state: '15', attributes: { ...battery(), friendly_name: 'Phone Battery' } },
            // 90% → fine
            'sensor.tablet_battery': { state: '90', attributes: { ...battery(), friendly_name: 'Tablet Battery' } },
            // offline → unavailable
            'sensor.garage_battery': { state: 'unavailable', attributes: { ...battery(), friendly_name: 'Garage Battery' } },
            // binary on → low
            'binary_sensor.door_battery': { state: 'on', attributes: { ...battery(), friendly_name: 'Door Battery' } },
            // binary off → fine
            'binary_sensor.window_battery': { state: 'off', attributes: { ...battery(), friendly_name: 'Window Battery' } },
            // update available
            'update.router_fw': { state: 'on', attributes: { friendly_name: 'Router Firmware' } },
            // up to date
            'update.tv_fw': { state: 'off', attributes: { friendly_name: 'TV Firmware' } },
            // not a battery → excluded
            'sensor.kitchen_temp': { state: '21', attributes: { device_class: 'temperature', friendly_name: 'Kitchen Temp' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectMaintenanceItems', () => {
    it('partitions into updates, low battery and unavailable (sorted by name)', () => {
        const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(makeHass());
        expect(updateIds).toEqual(['update.router_fw']);
        // Door Battery < Phone Battery
        expect(lowBatteryIds).toEqual(['binary_sensor.door_battery', 'sensor.phone_battery']);
        expect(unavailableIds).toEqual(['sensor.garage_battery']);
    });

    it('excludes healthy batteries, up-to-date updates, and non-battery sensors', () => {
        const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(makeHass());
        const all = [...updateIds, ...lowBatteryIds, ...unavailableIds];
        expect(all).not.toContain('sensor.tablet_battery');
        expect(all).not.toContain('binary_sensor.window_battery');
        expect(all).not.toContain('update.tv_fw');
        expect(all).not.toContain('sensor.kitchen_temp');
    });
});

describe('maintenanceItemCount / hasMaintenanceItems', () => {
    it('counts every category', () => {
        expect(maintenanceItemCount(makeHass())).toBe(4);
        expect(hasMaintenanceItems(makeHass())).toBe(true);
    });

    it('is zero/false with no maintenance items', () => {
        const empty = { entities: {}, devices: {}, areas: {}, states: {} } as unknown as HomeAssistant;
        expect(maintenanceItemCount(empty)).toBe(0);
        expect(hasMaintenanceItems(empty)).toBe(false);
    });
});

describe('buildMaintenanceView', () => {
    it('builds a subview with the expected shell', () => {
        const view = buildMaintenanceView(makeHass());
        expect(view).toMatchObject({ title: 'Maintenance', path: 'maintenance', subview: true, type: 'sections' });
    });

    it('emits a heading per non-empty category', () => {
        const headings = (buildMaintenanceView(makeHass()).sections![0].cards.filter(
            (c) => c.type === 'heading'
        ) as HeadingCard[]).map((h) => h.heading);
        expect(headings).toEqual(['Updates', 'Low battery', 'Unavailable']);
    });

    it('gives update tiles the update-actions feature', () => {
        const cards = buildMaintenanceView(makeHass()).sections![0].cards;
        const updateTile = cards.find((c) => (c as TileCard).entity === 'update.router_fw') as TileCard;
        expect(updateTile.features).toEqual([{ type: 'update-actions' }]);
    });

    it('omits empty categories', () => {
        // only an update, no battery problems
        const hass = {
            areas: {},
            devices: { d1: { id: 'd1' } },
            entities: { 'update.router_fw': { entity_id: 'update.router_fw', device_id: 'd1' } },
            states: { 'update.router_fw': { state: 'on', attributes: { friendly_name: 'Router' } } },
        } as unknown as HomeAssistant;
        const headings = (buildMaintenanceView(hass).sections![0].cards.filter(
            (c) => c.type === 'heading'
        ) as HeadingCard[]).map((h) => h.heading);
        expect(headings).toEqual(['Updates']);
    });

    it('produces an empty grid when there is nothing to maintain', () => {
        const empty = { entities: {}, devices: {}, areas: {}, states: {} } as unknown as HomeAssistant;
        expect(buildMaintenanceView(empty).sections![0].cards).toEqual([]);
    });
});
