/**
 * Unit tests for the Lights view builder.
 */

import { describe, it, expect } from 'vitest';
import { buildLightsView, collectLightEntityIds, groupLightsByArea } from './lightsView.js';
import type { HomeAssistant } from '../../../types/cards.js';
import type { HeadingCard } from '../../../types/cards.js';

/**
 * Minimal hass with three areas and a mix of lights / light-like switches /
 * plain switches, some area-assigned (via entity or device), some not.
 */
function makeHass(): HomeAssistant {
    return {
        areas: {
            kitchen: { area_id: 'kitchen', name: 'Kitchen' },
            bedroom: { area_id: 'bedroom', name: 'Bedroom' },
        },
        devices: {
            dev_lamp: { id: 'dev_lamp', area_id: 'bedroom' },
        },
        entities: {
            'light.kitchen': { entity_id: 'light.kitchen', area_id: 'kitchen' },
            'light.bedroom_lamp': { entity_id: 'light.bedroom_lamp', device_id: 'dev_lamp' },
            'light.no_area': { entity_id: 'light.no_area' },
            'switch.kitchen_lights': { entity_id: 'switch.kitchen_lights', area_id: 'kitchen' },
            'switch.fan': { entity_id: 'switch.fan', area_id: 'kitchen' },
        },
        states: {
            'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen' } },
            'light.bedroom_lamp': { state: 'off', attributes: { friendly_name: 'Bedroom Lamp' } },
            'light.no_area': { state: 'off', attributes: { friendly_name: 'Garage' } },
            'switch.kitchen_lights': { state: 'on', attributes: { friendly_name: 'Kitchen Lights' } },
            'switch.fan': { state: 'on', attributes: { friendly_name: 'Exhaust Fan' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectLightEntityIds', () => {
    it('includes all lights and light-like switches, excludes plain switches', () => {
        const ids = collectLightEntityIds(makeHass());
        expect(ids).toContain('light.kitchen');
        expect(ids).toContain('light.bedroom_lamp');
        expect(ids).toContain('light.no_area');
        expect(ids).toContain('switch.kitchen_lights');
        expect(ids).not.toContain('switch.fan');
    });

    it('sorts by display name', () => {
        const ids = collectLightEntityIds(makeHass());
        // Bedroom Lamp, Garage, Kitchen, Kitchen Lights
        expect(ids).toEqual(['light.bedroom_lamp', 'light.no_area', 'light.kitchen', 'switch.kitchen_lights']);
    });

    it('excludes entities hidden or disabled in the registry', () => {
        const hass = {
            areas: { office: { area_id: 'office', name: 'Office' } },
            devices: {},
            entities: {
                'light.visible': { entity_id: 'light.visible', area_id: 'office' },
                // `hidden: true` is the real hass.entities field (is_hidden_entity)
                'light.hidden': { entity_id: 'light.hidden', area_id: 'office', hidden: true },
                'switch.stairs_light': {
                    entity_id: 'switch.stairs_light',
                    area_id: 'office',
                    hidden: true,
                },
                'light.disabled': { entity_id: 'light.disabled', area_id: 'office', disabled_by: 'user' },
            },
            states: {
                'light.visible': { state: 'on', attributes: { friendly_name: 'Visible' } },
                'light.hidden': { state: 'on', attributes: { friendly_name: 'Hidden' } },
                'switch.stairs_light': { state: 'on', attributes: { friendly_name: 'Stairs Light' } },
                'light.disabled': { state: 'on', attributes: { friendly_name: 'Disabled' } },
            },
        } as unknown as HomeAssistant;

        expect(collectLightEntityIds(hass)).toEqual(['light.visible']);
    });
});

describe('groupLightsByArea', () => {
    it('groups by area with real areas first (sorted) and unassigned last', () => {
        const groups = groupLightsByArea(makeHass());
        expect(groups.map((g) => g.area?.name ?? null)).toEqual(['Bedroom', 'Kitchen', null]);
    });

    it('resolves area via device when entity has no direct area', () => {
        const groups = groupLightsByArea(makeHass());
        const bedroom = groups.find((g) => g.area?.area_id === 'bedroom');
        expect(bedroom?.entityIds).toEqual(['light.bedroom_lamp']);
    });

    it('puts light-like switches in their area group', () => {
        const groups = groupLightsByArea(makeHass());
        const kitchen = groups.find((g) => g.area?.area_id === 'kitchen');
        expect(kitchen?.entityIds).toContain('switch.kitchen_lights');
    });

    it('collects area-less lights into the unassigned group', () => {
        const groups = groupLightsByArea(makeHass());
        const other = groups.find((g) => g.area === null);
        expect(other?.entityIds).toEqual(['light.no_area']);
    });
});

describe('buildLightsView', () => {
    it('builds a subview with the expected shell', () => {
        const view = buildLightsView(makeHass());
        expect(view).toMatchObject({ title: 'Lights', path: 'lights', subview: true, type: 'sections' });
        expect(view.sections?.[0].type).toBe('grid');
    });

    it('emits a subtitle heading per group and tile cards for entities', () => {
        const view = buildLightsView(makeHass());
        const cards = view.sections![0].cards;
        const headings = cards.filter((c) => c.type === 'heading') as HeadingCard[];
        expect(headings.map((h) => h.heading)).toEqual(['Bedroom', 'Kitchen', 'Other lights']);
        const tiles = cards.filter((c) => c.type === 'tile');
        expect(tiles).toHaveLength(4);
    });

    it('renders the unassigned group under "Other lights"', () => {
        const view = buildLightsView(makeHass());
        const headings = (view.sections![0].cards.filter((c) => c.type === 'heading') as HeadingCard[]).map(
            (h) => h.heading
        );
        expect(headings).toContain('Other lights');
    });

    it('produces an empty grid when there are no lights', () => {
        const view = buildLightsView({ states: {}, entities: {}, areas: {}, devices: {} } as unknown as HomeAssistant);
        expect(view.sections![0].cards).toEqual([]);
    });
});
