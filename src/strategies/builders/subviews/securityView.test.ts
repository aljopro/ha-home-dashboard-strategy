/**
 * Unit tests for the Security view builder.
 */

import { describe, it, expect } from 'vitest';
import { buildSecurityView, collectSecurityEntityIds, groupSecurityByArea } from './securityView.js';
import type { HomeAssistant, HeadingCard } from '../../../types/cards.js';

/**
 * Minimal hass exercising the security membership rules: alarm panel, lock,
 * camera, a security binary_sensor (door) and a non-security one (motion → not
 * in securityEntityFilters), a non-security cover (blind), plus an unrelated
 * light. Entities carry device_id + device so entity-context resolution (which
 * requires a device) keeps them.
 */
function makeHass(): HomeAssistant {
    return {
        areas: {
            hall: { area_id: 'hall', name: 'Hall' },
            garage: { area_id: 'garage', name: 'Garage' },
        },
        devices: {
            d1: { id: 'd1', area_id: 'hall' },
            d2: { id: 'd2', area_id: 'garage' },
        },
        entities: {
            'alarm_control_panel.house': { entity_id: 'alarm_control_panel.house', device_id: 'd1' },
            'lock.front_door': { entity_id: 'lock.front_door', device_id: 'd1' },
            'camera.porch': { entity_id: 'camera.porch', device_id: 'd1' },
            'binary_sensor.front_door': {
                entity_id: 'binary_sensor.front_door',
                device_id: 'd1',
                device_class: 'door',
            },
            // motion is not part of securityEntityFilters → excluded
            'binary_sensor.hall_motion': {
                entity_id: 'binary_sensor.hall_motion',
                device_id: 'd1',
                device_class: 'motion',
            },
            // a blind cover is not a security cover → excluded
            'cover.living_blind': { entity_id: 'cover.living_blind', device_id: 'd2', device_class: 'blind' },
            // a garage-door cover IS a security cover → included
            'cover.garage_door': { entity_id: 'cover.garage_door', device_id: 'd2', device_class: 'garage' },
            'light.hall': { entity_id: 'light.hall', device_id: 'd1' },
        },
        states: {
            'alarm_control_panel.house': { state: 'armed_home', attributes: { friendly_name: 'House Alarm' } },
            'lock.front_door': { state: 'locked', attributes: { friendly_name: 'Front Door Lock' } },
            'camera.porch': { state: 'idle', attributes: { friendly_name: 'Porch Camera' } },
            'binary_sensor.front_door': { state: 'off', attributes: { friendly_name: 'Front Door', device_class: 'door' } },
            'binary_sensor.hall_motion': { state: 'off', attributes: { friendly_name: 'Hall Motion', device_class: 'motion' } },
            'cover.living_blind': { state: 'closed', attributes: { friendly_name: 'Living Blind', device_class: 'blind' } },
            'cover.garage_door': { state: 'closed', attributes: { friendly_name: 'Garage Door', device_class: 'garage' } },
            'light.hall': { state: 'on', attributes: { friendly_name: 'Hall Light' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectSecurityEntityIds', () => {
    it('includes alarm panels, locks, cameras, security sensors and security covers', () => {
        const ids = collectSecurityEntityIds(makeHass());
        expect(ids).toContain('alarm_control_panel.house');
        expect(ids).toContain('lock.front_door');
        expect(ids).toContain('camera.porch');
        expect(ids).toContain('binary_sensor.front_door');
        expect(ids).toContain('cover.garage_door');
    });

    it('excludes non-security entities (motion sensor, blind cover, light)', () => {
        const ids = collectSecurityEntityIds(makeHass());
        expect(ids).not.toContain('binary_sensor.hall_motion');
        expect(ids).not.toContain('cover.living_blind');
        expect(ids).not.toContain('light.hall');
    });

    it('sorts by display name', () => {
        const ids = collectSecurityEntityIds(makeHass());
        // Front Door, Front Door Lock, Garage Door, House Alarm, Porch Camera
        expect(ids).toEqual([
            'binary_sensor.front_door',
            'lock.front_door',
            'cover.garage_door',
            'alarm_control_panel.house',
            'camera.porch',
        ]);
    });

    it('excludes hidden / disabled entities', () => {
        const hass = makeHass();
        (hass.entities!['lock.front_door'] as any).hidden = true;
        expect(collectSecurityEntityIds(hass)).not.toContain('lock.front_door');
    });
});

describe('groupSecurityByArea', () => {
    it('groups by area with real areas first (sorted) and unassigned last', () => {
        const groups = groupSecurityByArea(makeHass());
        expect(groups.map((g) => g.area?.name ?? null)).toEqual(['Garage', 'Hall']);
    });

    it('resolves area via device', () => {
        const groups = groupSecurityByArea(makeHass());
        const garage = groups.find((g) => g.area?.area_id === 'garage');
        expect(garage?.entityIds).toEqual(['cover.garage_door']);
    });
});

describe('buildSecurityView', () => {
    it('builds a subview with the expected shell', () => {
        const view = buildSecurityView(makeHass());
        expect(view).toMatchObject({ title: 'Security', path: 'security', subview: true, type: 'sections' });
        expect(view.sections?.[0].type).toBe('grid');
    });

    it('renders cameras as picture-entity cards and everything else as tiles', () => {
        const view = buildSecurityView(makeHass());
        const cards = view.sections![0].cards;
        const pictures = cards.filter((c) => c.type === 'picture-entity');
        const tiles = cards.filter((c) => c.type === 'tile');
        expect(pictures).toHaveLength(1);
        expect((pictures[0] as any).entity).toBe('camera.porch');
        expect((pictures[0] as any).camera_view).toBe('auto');
        // alarm panel, lock, door sensor, garage cover
        expect(tiles).toHaveLength(4);
    });

    it('emits a subtitle heading per area group', () => {
        const view = buildSecurityView(makeHass());
        const headings = (view.sections![0].cards.filter((c) => c.type === 'heading') as HeadingCard[]).map(
            (h) => h.heading
        );
        expect(headings).toEqual(['Garage', 'Hall']);
    });

    it('produces an empty grid when there are no security entities', () => {
        const view = buildSecurityView({ states: {}, entities: {}, areas: {}, devices: {} } as unknown as HomeAssistant);
        expect(view.sections![0].cards).toEqual([]);
    });
});
