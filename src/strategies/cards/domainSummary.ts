/**
 * Pure helpers for the domain summary card.
 *
 * `domainActivityCount` is the single source of truth for "how many entities in
 * this domain are doing something noteworthy" (lights on, media playing, climate
 * active, security unsecured, …). `computeDomainSummary` formats that count into
 * the card subtitle, and `domainHasActivity` derives the boolean used to drive
 * state-based icon coloring (icon shows its accent color only when active).
 * `summaryDomains` returns the real HA domains that contribute to a (possibly
 * pseudo-) summary domain, so the card can scope its `shouldUpdate`.
 *
 * Kept free of any DOM/Lit dependency so they are independently unit testable
 * (see domainSummary.test.ts). Per-domain wording is refined as each domain
 * feature lands; the defaults here keep every domain rendering sensibly.
 */

import type { HomeAssistant } from '../../types/cards.js';
import { isEntityVisible } from '../builders/entities/entityFilters.js';
import { isLightLikeSwitch } from '../builders/entities/lightLikeSwitch.js';
import { collectMaintenanceItems, maintenanceItemCount } from '../builders/subviews/maintenanceView.js';

/** States that read as "inactive / nothing happening" for a generic domain. */
const INACTIVE_STATES = new Set(['off', 'unavailable', 'unknown', 'idle', 'standby', 'none', '']);

/**
 * Visible entities belonging to a single HA domain (by `domain.` prefix).
 * Hidden / disabled entities are excluded so counts match the dashboard's
 * visible entities (see isEntityVisible).
 */
function entitiesInDomain(hass: HomeAssistant, domain: string): Array<{ id: string; state: string }> {
    const states = hass.states ?? {};
    const prefix = `${domain}.`;
    return Object.entries(states)
        .filter(([id]) => id.startsWith(prefix) && isEntityVisible(hass.entities?.[id]))
        .map(([id, entity]) => ({ id, state: entity.state }));
}

/** `binary_sensor`/`cover` device_class as exposed in state attributes. */
function deviceClass(hass: HomeAssistant, id: string): string | undefined {
    return hass.states?.[id]?.attributes?.device_class as string | undefined;
}

const OPEN_BINARY_CLASSES = new Set(['door', 'window', 'garage_door', 'opening']);
const OPEN_COVER_CLASSES = new Set(['door', 'garage', 'gate']);

/**
 * The real HA domains scanned for a given summary `domain`. Single real domains
 * map to themselves; the `security` pseudo-domain spans several.
 */
export function summaryDomains(domain: string): string[] {
    if (domain === 'security') {
        return ['lock', 'alarm_control_panel', 'cover', 'binary_sensor'];
    }
    if (domain === 'maintenance') {
        return ['update', 'sensor', 'binary_sensor'];
    }
    // Lights also reflect light-like switches, so the card watches `switch` too.
    if (domain === 'light') {
        return ['light', 'switch'];
    }
    return [domain];
}

/**
 * Count the entities in a summary `domain` that are in their "noteworthy" state:
 * lights on, media playing, climate active, security unsecured, or — for any
 * other domain — simply not inactive. This count drives both the subtitle and
 * the active/inactive icon coloring, so the two never disagree.
 */
export function domainActivityCount(domain: string, hass: HomeAssistant): number {
    switch (domain) {
        case 'light': {
            const lightsOn = entitiesInDomain(hass, 'light').filter((e) => e.state === 'on').length;
            const lightLikeSwitchesOn = entitiesInDomain(hass, 'switch').filter(
                (e) => e.state === 'on' && isLightLikeSwitch(e.id, hass.states?.[e.id])
            ).length;
            return lightsOn + lightLikeSwitchesOn;
        }

        case 'media_player':
            return entitiesInDomain(hass, 'media_player').filter((e) => e.state === 'playing').length;

        case 'climate':
            return entitiesInDomain(hass, 'climate').filter((e) => !INACTIVE_STATES.has(e.state)).length;

        case 'security': {
            const unlocked = entitiesInDomain(hass, 'lock').filter((e) => e.state === 'unlocked').length;
            const openCovers = entitiesInDomain(hass, 'cover').filter(
                (e) => e.state === 'open' && OPEN_COVER_CLASSES.has(deviceClass(hass, e.id) ?? '')
            ).length;
            const openSensors = entitiesInDomain(hass, 'binary_sensor').filter(
                (e) => e.state === 'on' && OPEN_BINARY_CLASSES.has(deviceClass(hass, e.id) ?? '')
            ).length;
            return unlocked + openCovers + openSensors;
        }

        case 'maintenance':
            return maintenanceItemCount(hass);

        default:
            return entitiesInDomain(hass, domain).filter((e) => !INACTIVE_STATES.has(e.state)).length;
    }
}

/**
 * Whether the domain currently has any noteworthy activity. Drives state-based
 * icon coloring: the accent color shows only when this is true.
 */
export function domainHasActivity(domain: string, hass: HomeAssistant): boolean {
    return domainActivityCount(domain, hass) > 0;
}

/**
 * Compute the aggregate subtitle string for a summary `domain`.
 */
export function computeDomainSummary(domain: string, hass: HomeAssistant): string {
    const count = domainActivityCount(domain, hass);

    switch (domain) {
        case 'light':
            return count === 0 ? 'All off' : `${count} on`;

        case 'media_player':
            return count === 0 ? 'No media playing' : `${count} playing`;

        case 'climate':
            return count === 0 ? 'Off' : `${count} active`;

        case 'security':
            return count === 0 ? 'All secured' : `${count} unsecured`;

        case 'maintenance': {
            const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(hass);
            const parts: string[] = [];
            if (updateIds.length) parts.push(`${updateIds.length} update${updateIds.length === 1 ? '' : 's'}`);
            if (lowBatteryIds.length) parts.push(`${lowBatteryIds.length} low battery`);
            if (unavailableIds.length) parts.push(`${unavailableIds.length} unavailable`);
            return parts.length ? parts.join(', ') : 'All good';
        }

        default:
            return count === 0 ? 'All off' : `${count} on`;
    }
}
