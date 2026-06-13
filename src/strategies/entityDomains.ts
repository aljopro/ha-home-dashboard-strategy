/**
 * Shared entity-domain configuration: the per-domain entity filters and the
 * ordered `DEFAULT_ENTITY_DOMAINS` list used to group entities into the
 * dashboard's domains (Lights, Switches, Shades, Climate, Security, Media).
 *
 * Extracted from rooms_sections_strategy.ts so that deferred view strategies
 * (e.g. the per-area view) can reuse it without importing the dashboard
 * strategy module (which would create a circular import).
 */

import type { EntityDomainInfo, EntityFilter } from '../types/core.js';

export const mediaPlayerEntityFilters: EntityFilter[] = [{ domain: 'media_player', entity_category: 'none' }];
export const lightEntityFilters: EntityFilter[] = [{ domain: 'light', entity_category: 'none' }];
export const switchEntityFilters: EntityFilter[] = [
    {
        domain: 'switch',
        device_class: ['outlet', 'switch'],
    },
];
export const coverEntityFilters: EntityFilter[] = [
    {
        domain: 'cover',
        device_class: ['awning', 'blind', 'curtain', 'shade', 'shutter', 'window', 'none'],
    },
    {
        domain: 'binary_sensor',
        device_class: ['window'],
    },
];
export const climateEntityFilters: EntityFilter[] = [
    { domain: 'climate' },
    { domain: 'humidifier' },
    { domain: 'fan' },
    // water_heater intentionally excluded: some integrations (e.g. GE/SmartHQ)
    // map ovens onto the water_heater domain, so it does not reliably represent
    // home climate. Re-add if real water heaters need a home here.
];
export const securityEntityFilters: EntityFilter[] = [
    {
        domain: 'camera',
    },
    {
        domain: 'alarm_control_panel',
    },
    {
        domain: 'lock',
    },
    {
        domain: 'cover',
        device_class: ['door', 'garage', 'gate'],
    },
    {
        domain: 'binary_sensor',
        device_class: [
            // Locks
            'lock',
            // Openings
            'door',
            'window',
            'garage_door',
            'opening',
            // Safety
            'carbon_monoxide',
            'gas',
            'moisture',
            'safety',
            'smoke',
            'tamper',
        ],
    },
    // We also want the tamper sensors when they are diagnostic
    {
        domain: 'binary_sensor',
        device_class: ['tamper'],
        entity_category: 'diagnostic',
    },
];

export const DEFAULT_ENTITY_DOMAINS: EntityDomainInfo[] = [
    { id: 'light', name: 'Lights', icon: 'mdi:lamps', filter: lightEntityFilters },
    { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch', filter: switchEntityFilters },
    { id: 'cover', name: 'Shades', icon: 'mdi:window-shutter', filter: coverEntityFilters },
    { id: 'climate', name: 'Climate', icon: 'mdi:thermostat', filter: climateEntityFilters },
    { id: 'camera', name: 'Security', icon: 'mdi:security', filter: securityEntityFilters },
    { id: 'media_player', name: 'Media Players', icon: 'mdi:multimedia', filter: mediaPlayerEntityFilters },
];
