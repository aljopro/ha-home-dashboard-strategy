/**
 * Unit tests for the pure domain-summary helpers.
 */

import { describe, it, expect } from 'vitest';
import { computeDomainSummary, domainActivityCount, domainHasActivity, summaryDomains } from './domainSummary.js';
import type { HomeAssistant } from '../../types/cards.js';

interface Entry {
    state: string;
    attributes?: Record<string, unknown>;
    /** registry visibility: `hidden` is the real hass.entities display field. */
    hidden?: boolean;
    hidden_by?: string;
    disabled_by?: string;
}

/** Build a minimal hass with states + a matching entity registry. */
function hassWith(entries: Record<string, Entry>): HomeAssistant {
    const states: Record<string, { state: string; attributes: Record<string, unknown> }> = {};
    const entities: Record<string, Record<string, unknown>> = {};
    for (const [id, { state, attributes, hidden, hidden_by, disabled_by }] of Object.entries(entries)) {
        states[id] = { state, attributes: attributes ?? {} };
        entities[id] = { entity_id: id, hidden: hidden ?? false, hidden_by: hidden_by ?? null, disabled_by: disabled_by ?? null };
    }
    return { states, entities } as unknown as HomeAssistant;
}

describe('summaryDomains', () => {
    it('maps a plain real domain to itself', () => {
        expect(summaryDomains('climate')).toEqual(['climate']);
    });

    it('expands lights to also watch switches (light-like switches)', () => {
        expect(summaryDomains('light')).toEqual(['light', 'switch']);
    });

    it('expands the security pseudo-domain', () => {
        expect(summaryDomains('security')).toEqual(['lock', 'alarm_control_panel', 'cover', 'binary_sensor']);
    });

    it('expands the maintenance pseudo-domain', () => {
        expect(summaryDomains('maintenance')).toEqual(['update', 'sensor', 'binary_sensor']);
    });
});

/**
 * Maintenance reads battery entities through the shared filter machinery, which
 * requires a device — so these fixtures carry device_id + devices, and
 * device_class lives in state attributes.
 */
function maintenanceHass(opts: { update?: boolean; lowBattery?: boolean; unavailable?: boolean }): HomeAssistant {
    const entities: Record<string, Record<string, unknown>> = {};
    const states: Record<string, { state: string; attributes: Record<string, unknown> }> = {};
    const devices: Record<string, unknown> = {};
    let n = 0;
    const add = (id: string, state: string, attrs: Record<string, unknown>) => {
        const dev = `d${n++}`;
        entities[id] = { entity_id: id, device_id: dev, hidden: false };
        devices[dev] = { id: dev };
        states[id] = { state, attributes: attrs };
    };
    if (opts.update) add('update.router', 'on', { friendly_name: 'Router' });
    if (opts.lowBattery) add('sensor.phone_battery', '10', { device_class: 'battery', friendly_name: 'Phone' });
    // unavailable is restricted to controllable domains, so use a light
    if (opts.unavailable) add('light.broken', 'unavailable', { friendly_name: 'Broken' });
    return { states, entities, devices, areas: {} } as unknown as HomeAssistant;
}

describe('maintenance summary', () => {
    it('lists each non-empty category', () => {
        const s = maintenanceHass({ update: true, lowBattery: true, unavailable: true });
        expect(computeDomainSummary('maintenance', s)).toBe('1 update, 1 low battery, 1 unavailable');
        expect(domainActivityCount('maintenance', s)).toBe(3);
    });

    it('pluralizes updates', () => {
        const s = maintenanceHass({ update: true });
        // single update reads "1 update"
        expect(computeDomainSummary('maintenance', s)).toBe('1 update');
    });

    it('reads "All good" when nothing needs attention', () => {
        const s = maintenanceHass({});
        expect(computeDomainSummary('maintenance', s)).toBe('All good');
        expect(domainHasActivity('maintenance', s)).toBe(false);
    });
});

describe('computeDomainSummary', () => {
    describe('light', () => {
        it('counts entities that are on', () => {
            const s = hassWith({ 'light.a': { state: 'on' }, 'light.b': { state: 'on' }, 'light.c': { state: 'off' } });
            expect(computeDomainSummary('light', s)).toBe('2 on');
        });

        it('reports "All off" when none are on', () => {
            const s = hassWith({ 'light.a': { state: 'off' }, 'light.b': { state: 'unavailable' } });
            expect(computeDomainSummary('light', s)).toBe('All off');
        });

        it('also counts light-like switches that are on', () => {
            const s = hassWith({
                'light.a': { state: 'on' },
                'switch.kitchen_lights': { state: 'on', attributes: { friendly_name: 'Kitchen Lights' } },
                'switch.fan': { state: 'on', attributes: { friendly_name: 'Exhaust Fan' } },
            });
            // light.a + the light-like switch, but not the plain fan switch
            expect(computeDomainSummary('light', s)).toBe('2 on');
        });

        it('excludes hidden / disabled entities from the count', () => {
            const s = hassWith({
                'light.visible': { state: 'on' },
                // `hidden: true` is the real hass.entities field (is_hidden_entity)
                'light.hidden': { state: 'on', hidden: true },
                'switch.hidden_light': {
                    state: 'on',
                    attributes: { friendly_name: 'Stairs Light' },
                    hidden: true,
                },
                'light.disabled': { state: 'on', disabled_by: 'user' },
            });
            // only light.visible counts
            expect(computeDomainSummary('light', s)).toBe('1 on');
        });
    });

    describe('media_player', () => {
        it('counts playing players', () => {
            const s = hassWith({ 'media_player.a': { state: 'playing' }, 'media_player.b': { state: 'paused' } });
            expect(computeDomainSummary('media_player', s)).toBe('1 playing');
        });

        it('reports "No media playing" when none playing', () => {
            const s = hassWith({ 'media_player.a': { state: 'idle' }, 'media_player.b': { state: 'off' } });
            expect(computeDomainSummary('media_player', s)).toBe('No media playing');
        });
    });

    describe('climate', () => {
        it('counts active (non-off) climate entities', () => {
            const s = hassWith({ 'climate.a': { state: 'heat' }, 'climate.b': { state: 'off' } });
            expect(computeDomainSummary('climate', s)).toBe('1 active');
        });

        it('reports "Off" when none active', () => {
            const s = hassWith({ 'climate.a': { state: 'off' }, 'climate.b': { state: 'unavailable' } });
            expect(computeDomainSummary('climate', s)).toBe('Off');
        });
    });

    describe('security', () => {
        it('reports "All secured" when everything is locked and closed', () => {
            const s = hassWith({
                'lock.front': { state: 'locked' },
                'binary_sensor.door': { state: 'off', attributes: { device_class: 'door' } },
                'cover.garage': { state: 'closed', attributes: { device_class: 'garage' } },
            });
            expect(computeDomainSummary('security', s)).toBe('All secured');
        });

        it('counts unlocked locks, open security covers, and open openings', () => {
            const s = hassWith({
                'lock.front': { state: 'unlocked' },
                'cover.garage': { state: 'open', attributes: { device_class: 'garage' } },
                'binary_sensor.window': { state: 'on', attributes: { device_class: 'window' } },
                // ignored: motion is not an opening device_class
                'binary_sensor.motion': { state: 'on', attributes: { device_class: 'motion' } },
                // ignored: shades are not a security cover device_class
                'cover.shade': { state: 'open', attributes: { device_class: 'shade' } },
            });
            expect(computeDomainSummary('security', s)).toBe('3 unsecured');
        });
    });

    describe('unknown domain fallback', () => {
        it('counts non-inactive entities as on', () => {
            const s = hassWith({ 'switch.a': { state: 'on' }, 'switch.b': { state: 'off' } });
            expect(computeDomainSummary('switch', s)).toBe('1 on');
        });

        it('reports "All off" when none active', () => {
            const s = hassWith({ 'switch.a': { state: 'off' } });
            expect(computeDomainSummary('switch', s)).toBe('All off');
        });
    });

    it('ignores entities outside the target domain', () => {
        const s = hassWith({ 'light.a': { state: 'on' }, 'switch.b': { state: 'on' } });
        expect(computeDomainSummary('light', s)).toBe('1 on');
    });
});

describe('domainActivityCount / domainHasActivity', () => {
    it('counts active lights and reports activity', () => {
        const s = hassWith({ 'light.a': { state: 'on' }, 'light.b': { state: 'off' } });
        expect(domainActivityCount('light', s)).toBe(1);
        expect(domainHasActivity('light', s)).toBe(true);
    });

    it('reports no activity when all lights are off', () => {
        const s = hassWith({ 'light.a': { state: 'off' }, 'light.b': { state: 'unavailable' } });
        expect(domainActivityCount('light', s)).toBe(0);
        expect(domainHasActivity('light', s)).toBe(false);
    });

    it('treats an unsecured security state as activity', () => {
        const secure = hassWith({ 'lock.front': { state: 'locked' } });
        const unsecure = hassWith({ 'lock.front': { state: 'unlocked' } });
        expect(domainHasActivity('security', secure)).toBe(false);
        expect(domainHasActivity('security', unsecure)).toBe(true);
    });
});
