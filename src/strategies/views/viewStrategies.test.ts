/**
 * Tests that the deferred view strategies register under the expected
 * `ll-strategy-view-<name>` tags and that their static `generate` produces a
 * view config from hass.
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Side-effect imports register the elements.
import './homeLightsView.js';
import './homeClimateView.js';
import './homeSecurityView.js';
import './homeMediaPlayersView.js';
import './homeAreaView.js';
import type { HomeAssistant } from '../../types/cards.js';

const TAGS = [
    'll-strategy-view-home-lights',
    'll-strategy-view-home-climate',
    'll-strategy-view-home-security',
    'll-strategy-view-home-media-players',
    'll-strategy-view-home-area',
];

function generatorFor(tag: string) {
    const ctor = customElements.get(tag) as unknown as {
        generate: (config: any, hass: HomeAssistant) => Promise<any>;
    };
    return ctor.generate;
}

describe('view strategy registration', () => {
    beforeAll(() => {
        TAGS.forEach((tag) => expect(customElements.get(tag)).toBeDefined());
    });

    it('home-lights generate returns a lights sections view', async () => {
        const hass = {
            entities: { 'light.kitchen': { entity_id: 'light.kitchen', area_id: 'kitchen' } },
            devices: {},
            areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } },
            states: { 'light.kitchen': { state: 'on', attributes: { friendly_name: 'Kitchen' } } },
        } as unknown as HomeAssistant;

        const view = await generatorFor('ll-strategy-view-home-lights')({ type: 'custom:home-lights' }, hass);
        expect(view).toMatchObject({ path: 'lights', type: 'sections' });
        const tiles = view.sections[0].cards.filter((c: any) => c.type === 'tile');
        expect(tiles).toHaveLength(1);
    });

    it('home-climate generate returns a climate sections view', async () => {
        const hass = {
            entities: { 'climate.kitchen': { entity_id: 'climate.kitchen', device_id: 'd1', area_id: 'kitchen' } },
            devices: { d1: { id: 'd1', area_id: 'kitchen' } },
            areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } },
            states: { 'climate.kitchen': { state: 'heat', attributes: { friendly_name: 'Kitchen' } } },
        } as unknown as HomeAssistant;

        const view = await generatorFor('ll-strategy-view-home-climate')({ type: 'custom:home-climate' }, hass);
        expect(view).toMatchObject({ path: 'climate', type: 'sections' });
        const thermostats = view.sections[0].cards.filter((c: any) => c.type === 'thermostat');
        expect(thermostats).toHaveLength(1);
    });

    it('home-security generate returns a security sections view', async () => {
        const hass = {
            entities: { 'lock.front': { entity_id: 'lock.front', device_id: 'd1' } },
            devices: { d1: { id: 'd1', area_id: 'hall' } },
            areas: { hall: { area_id: 'hall', name: 'Hall' } },
            states: { 'lock.front': { state: 'locked', attributes: { friendly_name: 'Front' } } },
        } as unknown as HomeAssistant;

        const view = await generatorFor('ll-strategy-view-home-security')({ type: 'custom:home-security' }, hass);
        expect(view).toMatchObject({ path: 'security', type: 'sections' });
        const tiles = view.sections[0].cards.filter((c: any) => c.type === 'tile');
        expect(tiles).toHaveLength(1);
    });

    it('home-area generate returns an empty sections view for an unknown area', async () => {
        const hass = { entities: {}, devices: {}, areas: {}, states: {} } as unknown as HomeAssistant;
        const view = await generatorFor('ll-strategy-view-home-area')({ type: 'custom:home-area', area: 'nope' }, hass);
        expect(view).toMatchObject({ type: 'sections', sections: [] });
    });

    it('home-media-players generate returns a media-players sections view', async () => {
        const hass = {
            entities: { 'media_player.tv': { entity_id: 'media_player.tv', area_id: 'lr' } },
            devices: {},
            areas: { lr: { area_id: 'lr', name: 'Living Room' } },
            states: { 'media_player.tv': { state: 'playing', attributes: {} } },
        } as unknown as HomeAssistant;

        const view = await generatorFor('ll-strategy-view-home-media-players')(
            { type: 'custom:home-media-players' },
            hass
        );
        expect(view).toMatchObject({ path: 'media-players', type: 'sections' });
    });
});
