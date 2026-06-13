/**
 * Unit tests for the Climate view builder.
 */

import { describe, it, expect } from 'vitest';
import { buildClimateView, collectClimateEntityIds, groupClimateByArea } from './climateView.js';
import type { HomeAssistant } from '../../../types/cards.js';
import type { HeadingCard } from '../../../types/cards.js';

/**
 * Minimal hass with two areas and a mix of climate entities, some
 * area-assigned (via entity or device), some not, plus a non-climate entity.
 */
function makeHass(): HomeAssistant {
    return {
        areas: {
            kitchen: { area_id: 'kitchen', name: 'Kitchen' },
            bedroom: { area_id: 'bedroom', name: 'Bedroom' },
        },
        devices: {
            dev_stat: { id: 'dev_stat', area_id: 'bedroom' },
        },
        entities: {
            'climate.kitchen': { entity_id: 'climate.kitchen', area_id: 'kitchen' },
            'climate.bedroom_stat': { entity_id: 'climate.bedroom_stat', device_id: 'dev_stat' },
            'climate.no_area': { entity_id: 'climate.no_area' },
            'light.kitchen': { entity_id: 'light.kitchen', area_id: 'kitchen' },
        },
        states: {
            'climate.kitchen': { state: 'heat', attributes: { friendly_name: 'Kitchen' } },
            'climate.bedroom_stat': { state: 'cool', attributes: { friendly_name: 'Bedroom Thermostat' } },
            'climate.no_area': { state: 'off', attributes: { friendly_name: 'Garage' } },
            'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen Light' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectClimateEntityIds', () => {
    it('includes all climate entities, excludes other domains', () => {
        const ids = collectClimateEntityIds(makeHass());
        expect(ids).toContain('climate.kitchen');
        expect(ids).toContain('climate.bedroom_stat');
        expect(ids).toContain('climate.no_area');
        expect(ids).not.toContain('light.kitchen');
    });

    it('sorts by display name', () => {
        const ids = collectClimateEntityIds(makeHass());
        // Bedroom Thermostat, Garage, Kitchen
        expect(ids).toEqual(['climate.bedroom_stat', 'climate.no_area', 'climate.kitchen']);
    });

    it('excludes entities hidden or disabled in the registry', () => {
        const hass = {
            areas: { office: { area_id: 'office', name: 'Office' } },
            devices: {},
            entities: {
                'climate.visible': { entity_id: 'climate.visible', area_id: 'office' },
                'climate.hidden': { entity_id: 'climate.hidden', area_id: 'office', hidden: true },
                'climate.disabled': { entity_id: 'climate.disabled', area_id: 'office', disabled_by: 'user' },
            },
            states: {
                'climate.visible': { state: 'heat', attributes: { friendly_name: 'Visible' } },
                'climate.hidden': { state: 'heat', attributes: { friendly_name: 'Hidden' } },
                'climate.disabled': { state: 'heat', attributes: { friendly_name: 'Disabled' } },
            },
        } as unknown as HomeAssistant;

        expect(collectClimateEntityIds(hass)).toEqual(['climate.visible']);
    });
});

describe('groupClimateByArea', () => {
    it('groups by area with real areas first (sorted) and unassigned last', () => {
        const groups = groupClimateByArea(makeHass());
        expect(groups.map((g) => g.area?.name ?? null)).toEqual(['Bedroom', 'Kitchen', null]);
    });

    it('resolves area via device when entity has no direct area', () => {
        const groups = groupClimateByArea(makeHass());
        const bedroom = groups.find((g) => g.area?.area_id === 'bedroom');
        expect(bedroom?.entityIds).toEqual(['climate.bedroom_stat']);
    });

    it('collects area-less climate entities into the unassigned group', () => {
        const groups = groupClimateByArea(makeHass());
        const other = groups.find((g) => g.area === null);
        expect(other?.entityIds).toEqual(['climate.no_area']);
    });
});

describe('buildClimateView', () => {
    it('builds a subview with the expected shell', () => {
        const view = buildClimateView(makeHass());
        expect(view).toMatchObject({ title: 'Climate', path: 'climate', subview: true, type: 'sections' });
        expect(view.sections?.[0].type).toBe('grid');
    });

    it('emits a subtitle heading per group and thermostat cards for entities', () => {
        const view = buildClimateView(makeHass());
        const cards = view.sections![0].cards;
        const headings = cards.filter((c) => c.type === 'heading') as HeadingCard[];
        expect(headings.map((h) => h.heading)).toEqual(['Bedroom', 'Kitchen', 'Other climate']);
        const thermostats = cards.filter((c) => c.type === 'thermostat');
        expect(thermostats).toHaveLength(3);
    });

    it('renders the unassigned group under "Other climate"', () => {
        const view = buildClimateView(makeHass());
        const headings = (view.sections![0].cards.filter((c) => c.type === 'heading') as HeadingCard[]).map(
            (h) => h.heading
        );
        expect(headings).toContain('Other climate');
    });

    it('produces an empty grid when there are no climate entities', () => {
        const view = buildClimateView({ states: {}, entities: {}, areas: {}, devices: {} } as unknown as HomeAssistant);
        expect(view.sections![0].cards).toEqual([]);
    });
});
