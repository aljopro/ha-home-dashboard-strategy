/**
 * Unit tests for the Climate view builder.
 */

import { describe, it, expect } from 'vitest';
import { buildClimateView, collectClimateEntityIds, groupClimateByArea } from './climateView.js';
import type { HomeAssistant, HeadingCard } from '../../../types/cards.js';

/**
 * Minimal hass exercising the climate membership rules: a thermostat, a fan, a
 * humidifier, a water heater (all in climateEntityFilters), plus a light that
 * must be excluded. Entities carry device_id + device so entity-context
 * resolution (which requires a device) keeps them; some get their area via the
 * device.
 */
function makeHass(): HomeAssistant {
    return {
        areas: {
            kitchen: { area_id: 'kitchen', name: 'Kitchen' },
            bedroom: { area_id: 'bedroom', name: 'Bedroom' },
        },
        devices: {
            d_kitchen: { id: 'd_kitchen', area_id: 'kitchen' },
            d_bedroom: { id: 'd_bedroom', area_id: 'bedroom' },
        },
        entities: {
            'climate.kitchen': { entity_id: 'climate.kitchen', device_id: 'd_kitchen', area_id: 'kitchen' },
            'fan.bedroom': { entity_id: 'fan.bedroom', device_id: 'd_bedroom' },
            'humidifier.bedroom': { entity_id: 'humidifier.bedroom', device_id: 'd_bedroom' },
            'water_heater.tank': { entity_id: 'water_heater.tank', device_id: 'd_kitchen', area_id: 'kitchen' },
            'light.kitchen': { entity_id: 'light.kitchen', device_id: 'd_kitchen', area_id: 'kitchen' },
        },
        states: {
            'climate.kitchen': { state: 'heat', attributes: { friendly_name: 'Kitchen Thermostat' } },
            'fan.bedroom': { state: 'on', attributes: { friendly_name: 'Bedroom Fan' } },
            'humidifier.bedroom': { state: 'on', attributes: { friendly_name: 'Bedroom Humidifier' } },
            'water_heater.tank': { state: 'eco', attributes: { friendly_name: 'Water Heater' } },
            'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen Light' } },
        },
    } as unknown as HomeAssistant;
}

describe('collectClimateEntityIds', () => {
    it('includes climate, fan, humidifier and water_heater entities', () => {
        const ids = collectClimateEntityIds(makeHass());
        expect(ids).toContain('climate.kitchen');
        expect(ids).toContain('fan.bedroom');
        expect(ids).toContain('humidifier.bedroom');
        expect(ids).toContain('water_heater.tank');
    });

    it('excludes non-climate entities (light)', () => {
        expect(collectClimateEntityIds(makeHass())).not.toContain('light.kitchen');
    });

    it('sorts by display name', () => {
        const ids = collectClimateEntityIds(makeHass());
        // Bedroom Fan, Bedroom Humidifier, Kitchen Thermostat, Water Heater
        expect(ids).toEqual(['fan.bedroom', 'humidifier.bedroom', 'climate.kitchen', 'water_heater.tank']);
    });

    it('excludes hidden / disabled entities', () => {
        const hass = makeHass();
        (hass.entities!['fan.bedroom'] as any).hidden = true;
        expect(collectClimateEntityIds(hass)).not.toContain('fan.bedroom');
    });
});

describe('groupClimateByArea', () => {
    it('groups by area with real areas first (sorted)', () => {
        const groups = groupClimateByArea(makeHass());
        expect(groups.map((g) => g.area?.name ?? null)).toEqual(['Bedroom', 'Kitchen']);
    });

    it('resolves area via device when entity has no direct area', () => {
        const groups = groupClimateByArea(makeHass());
        const bedroom = groups.find((g) => g.area?.area_id === 'bedroom');
        expect(bedroom?.entityIds).toEqual(['fan.bedroom', 'humidifier.bedroom']);
    });
});

describe('buildClimateView', () => {
    it('builds a subview with the expected shell', () => {
        const view = buildClimateView(makeHass());
        expect(view).toMatchObject({ title: 'Climate', path: 'climate', subview: true, type: 'sections' });
        expect(view.sections?.[0].type).toBe('grid');
    });

    it('renders climate entities as thermostat cards and the rest as tiles', () => {
        const view = buildClimateView(makeHass());
        const cards = view.sections![0].cards;
        const thermostats = cards.filter((c) => c.type === 'thermostat');
        const tiles = cards.filter((c) => c.type === 'tile');
        expect(thermostats).toHaveLength(1);
        expect((thermostats[0] as any).entity).toBe('climate.kitchen');
        // fan, humidifier, water_heater
        expect(tiles).toHaveLength(3);
    });

    it('gives fan tiles the fan control features, leaving other tiles plain', () => {
        const cards = buildClimateView(makeHass()).sections![0].cards;
        const byEntity = (id: string) => cards.find((c) => (c as any).entity === id) as any;

        const fanFeatures = byEntity('fan.bedroom').features.map((f: any) => f.type);
        expect(fanFeatures).toEqual(['fan-speed', 'fan-preset-modes', 'fan-oscillate', 'fan-direction']);

        // humidifier / water_heater tiles carry no features
        expect(byEntity('humidifier.bedroom').features).toBeUndefined();
        expect(byEntity('water_heater.tank').features).toBeUndefined();
    });

    it('emits a subtitle heading per area group', () => {
        const view = buildClimateView(makeHass());
        const headings = (view.sections![0].cards.filter((c) => c.type === 'heading') as HeadingCard[]).map(
            (h) => h.heading
        );
        expect(headings).toEqual(['Bedroom', 'Kitchen']);
    });

    it('produces an empty grid when there are no climate entities', () => {
        const view = buildClimateView({ states: {}, entities: {}, areas: {}, devices: {} } as unknown as HomeAssistant);
        expect(view.sections![0].cards).toEqual([]);
    });
});
