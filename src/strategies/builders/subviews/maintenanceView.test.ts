/**
 * Unit tests for the Maintenance view builder.
 */

import { describe, it, expect } from 'vitest';
import {
    buildMaintenanceView,
    collectBatteriesSorted,
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
        devices: Object.fromEntries(
            ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'].map((id) => [id, { id }])
        ),
        entities: {
            'sensor.phone_battery': { entity_id: 'sensor.phone_battery', device_id: 'd1' },
            'sensor.tablet_battery': { entity_id: 'sensor.tablet_battery', device_id: 'd2' },
            'sensor.garage_battery': { entity_id: 'sensor.garage_battery', device_id: 'd3' },
            'binary_sensor.door_battery': { entity_id: 'binary_sensor.door_battery', device_id: 'd4' },
            'binary_sensor.window_battery': { entity_id: 'binary_sensor.window_battery', device_id: 'd5' },
            'update.router_fw': { entity_id: 'update.router_fw', device_id: 'd6' },
            'update.tv_fw': { entity_id: 'update.tv_fw', device_id: 'd7' },
            'sensor.kitchen_temp': { entity_id: 'sensor.kitchen_temp', device_id: 'd8' },
            // a broken light (user-facing) → unavailable
            'light.broken': { entity_id: 'light.broken', device_id: 'd9' },
            // a diagnostic signal sensor that's offline → excluded (too noisy)
            'sensor.wifi_signal': { entity_id: 'sensor.wifi_signal', device_id: 'd10', entity_category: 'diagnostic' },
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
            // not a battery, online → excluded
            'sensor.kitchen_temp': { state: '21', attributes: { device_class: 'temperature', friendly_name: 'Kitchen Temp' } },
            // broken light → unavailable (user-facing)
            'light.broken': { state: 'unavailable', attributes: { friendly_name: 'Broken Light' } },
            // diagnostic, offline → excluded
            'sensor.wifi_signal': { state: 'unavailable', attributes: { friendly_name: 'Wifi Signal' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectMaintenanceItems', () => {
    it('partitions into updates, low battery and unavailable (sorted by name)', () => {
        const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(makeHass());
        expect(updateIds).toEqual(['update.router_fw']);
        // Door Battery < Phone Battery
        expect(lowBatteryIds).toEqual(['binary_sensor.door_battery', 'sensor.phone_battery']);
        // only controllable domains: the broken light, not the offline sensor
        expect(unavailableIds).toEqual(['light.broken']);
    });

    it('includes a broken controllable entity under unavailable', () => {
        expect(collectMaintenanceItems(makeHass()).unavailableIds).toContain('light.broken');
    });

    it('excludes non-controllable domains (offline sensors) and diagnostics from unavailable', () => {
        const { unavailableIds } = collectMaintenanceItems(makeHass());
        // sensor.garage_battery is unavailable but a sensor → excluded
        expect(unavailableIds).not.toContain('sensor.garage_battery');
        // diagnostic sensor → excluded
        expect(unavailableIds).not.toContain('sensor.wifi_signal');
    });

    it('excludes healthy batteries, up-to-date updates, and online non-battery sensors', () => {
        const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(makeHass());
        const all = [...updateIds, ...lowBatteryIds, ...unavailableIds];
        expect(all).not.toContain('sensor.tablet_battery');
        expect(all).not.toContain('binary_sensor.window_battery');
        expect(all).not.toContain('update.tv_fw');
        expect(all).not.toContain('sensor.kitchen_temp');
    });
});

describe('collectBatteriesSorted', () => {
    it('lists every battery sorted lowest level first (binary on=0, off=100, unreadable last)', () => {
        expect(collectBatteriesSorted(makeHass())).toEqual([
            'binary_sensor.door_battery', // on → 0
            'sensor.phone_battery', // 15
            'sensor.tablet_battery', // 90
            'binary_sensor.window_battery', // off → 100
            'sensor.garage_battery', // unavailable → last
        ]);
    });

    it('includes healthy batteries the low-battery summary omits', () => {
        const all = collectBatteriesSorted(makeHass());
        expect(all).toContain('sensor.tablet_battery'); // 90% — not low
        expect(collectMaintenanceItems(makeHass()).lowBatteryIds).not.toContain('sensor.tablet_battery');
    });
});

describe('maintenanceItemCount / hasMaintenanceItems', () => {
    it('counts every category', () => {
        // 1 update + 2 low battery + 1 unavailable (the broken light only)
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
        expect(headings).toEqual(['Updates', 'Batteries', 'Unavailable']);
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
