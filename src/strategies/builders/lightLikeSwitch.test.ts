/**
 * Unit tests for the light-like switch discernment utility.
 */

import { describe, it, expect } from 'vitest';
import { isLightLikeSwitch } from './lightLikeSwitch.js';
import type { EntityState } from '../../types/core.js';

function state(attributes: Record<string, unknown>, s = 'off'): EntityState {
    return { state: s, attributes };
}

describe('isLightLikeSwitch', () => {
    it('matches a switch whose friendly_name contains "light"', () => {
        expect(isLightLikeSwitch('switch.kitchen', state({ friendly_name: 'Kitchen Light' }))).toBe(true);
    });

    it('is case-insensitive on the friendly_name', () => {
        expect(isLightLikeSwitch('switch.x', state({ friendly_name: 'PORCH LIGHTS' }))).toBe(true);
    });

    it('matches a switch with a known light icon', () => {
        expect(isLightLikeSwitch('switch.lamp', state({ icon: 'mdi:floor-lamp' }))).toBe(true);
    });

    it('does not match a plain switch', () => {
        expect(isLightLikeSwitch('switch.fan', state({ friendly_name: 'Bathroom Fan' }))).toBe(false);
    });

    it('does not match an unknown icon', () => {
        expect(isLightLikeSwitch('switch.x', state({ icon: 'mdi:power-socket' }))).toBe(false);
    });

    it('only considers the switch domain', () => {
        expect(isLightLikeSwitch('light.lr', state({ friendly_name: 'Living Room Light' }))).toBe(false);
        expect(isLightLikeSwitch('fan.attic', state({ icon: 'mdi:lamp' }))).toBe(false);
    });

    it('returns false when state is missing', () => {
        expect(isLightLikeSwitch('switch.x', undefined)).toBe(false);
    });

    it('returns false when attributes carry no signal', () => {
        expect(isLightLikeSwitch('switch.x', state({ friendly_name: 'Garage Outlet' }))).toBe(false);
    });
});
