/**
 * Unit tests for getEntityContext — focused on registry visibility.
 */

import { describe, it, expect } from 'vitest';
import { getEntityContext } from './getEntityContext.js';
import type { HomeAssistant } from '../../../types/cards.js';

function hass(entity: Record<string, unknown>): HomeAssistant {
    const id = entity.entity_id as string;
    return {
        entities: { [id]: entity },
        devices: { dev1: { id: 'dev1', area_id: 'kitchen' } },
        areas: { kitchen: { area_id: 'kitchen', name: 'Kitchen' } },
        states: { [id]: { state: 'on', attributes: {} } },
    } as unknown as HomeAssistant;
}

describe('getEntityContext visibility', () => {
    it('returns a context for a visible entity', () => {
        const ctx = getEntityContext(hass({ entity_id: 'light.kitchen', device_id: 'dev1' }), 'light.kitchen');
        expect(ctx).not.toBeNull();
        expect(ctx?.area?.area_id).toBe('kitchen');
    });

    it('returns null for an entity hidden in the display registry', () => {
        // `hidden: true` is the real hass.entities field (is_hidden_entity)
        const ctx = getEntityContext(
            hass({ entity_id: 'switch.stairs_light', device_id: 'dev1', hidden: true }),
            'switch.stairs_light'
        );
        expect(ctx).toBeNull();
    });

    it('returns null for a disabled entity', () => {
        const ctx = getEntityContext(
            hass({ entity_id: 'light.kitchen', device_id: 'dev1', disabled_by: 'user' }),
            'light.kitchen'
        );
        expect(ctx).toBeNull();
    });
});
