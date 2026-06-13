import { HomeAssistant } from '../../../types/cards';
import type { EntityContext } from '../../../types/core';

export function getEntityContext(hass: HomeAssistant, entityId: string): EntityContext | null {
    const entity = hass.entities?.[entityId];
    if (!entity) {
        return null;
    }

    // Respect registry visibility: hidden (e.g. "Hidden by Integration") or
    // disabled entities are excluded from the dashboard. `hass.entities` carries
    // the boolean `hidden` field; `hidden_by`/`disabled_by` are honored too for
    // full registry entries. See isEntityVisible.
    if (entity.hidden || entity.hidden_by || entity.disabled_by) {
        return null;
    }

    const state = hass.states?.[entityId];
    if (!state) {
        return null;
    }

    let device = null;
    if (entity.device_id && hass.devices?.[entity.device_id]) {
        device = hass.devices[entity.device_id];
    } else {
        return null;
    }

    const device_class = entity.entity_id.split('.')[0];
    const area_id = entity.area_id || device.area_id || null;
    let area = null;
    if (area_id && hass.areas?.[area_id]) {
        area = hass.areas[area_id];
    }

    return {
        entity,
        state,
        area,
        device,
        device_class,
    };
}
