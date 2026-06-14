/**
 * Pure builder for the Maintenance subview (`custom:home-maintenance`).
 *
 * Maintenance is a pseudo-domain spanning three problem categories, each its own
 * section: pending **Updates** (`update.*` with an update available), **Low
 * battery** (battery `binary_sensor` on, or battery `sensor` ≤ threshold), and
 * **Unavailable** (a controllable entity that has gone offline — a light, lock,
 * media player, etc. that stopped responding). The unavailable list is limited
 * to controllable domains (see CONTROLLABLE_DOMAINS) and excludes
 * diagnostic/config and hidden entities, so an offline device surfaces as the
 * one thing you operate rather than its dozens of sensor/number entities.
 * Battery membership reuses the shared `maintenanceBatteryFilters`.
 * `collectMaintenanceItems` is also consumed by the domain summary card so the
 * count and the view never disagree.
 */

import type { HeadingCard, HomeAssistant, SectionsView, StrategyCard, TileCard } from '../../../types/cards.js';
import { maintenanceBatteryFilters } from '../../entityDomains.js';
import { generateEntityFilter, isEntityVisible } from '../entities/entityFilters.js';

/** Battery percentage at or below which a battery sensor counts as low. */
export const LOW_BATTERY_THRESHOLD = 20;

/** Display name for an entity: friendly_name → registry name → entity_id. */
function displayName(hass: HomeAssistant, entityId: string): string {
    const friendly = hass.states?.[entityId]?.attributes?.friendly_name;
    if (typeof friendly === 'string' && friendly) return friendly;
    return hass.entities?.[entityId]?.name || entityId;
}

function sortByName(hass: HomeAssistant, ids: string[]): string[] {
    return [...ids].sort((a, b) => displayName(hass, a).localeCompare(displayName(hass, b)));
}

/** All battery entity_ids (battery sensors + user-facing battery binary_sensors). */
function collectBatteryEntityIds(hass: HomeAssistant): string[] {
    const matchers = maintenanceBatteryFilters.map((filter) => generateEntityFilter(hass, filter));
    return Object.keys(hass.entities ?? {}).filter((id) => matchers.some((matches) => matches(id)));
}

/** Whether a battery entity reads as low: binary on, or numeric ≤ threshold. */
function isLowBattery(hass: HomeAssistant, entityId: string): boolean {
    const state = hass.states?.[entityId]?.state ?? '';
    if (entityId.startsWith('binary_sensor.')) {
        return state === 'on';
    }
    const value = parseFloat(state);
    return !isNaN(value) && value <= LOW_BATTERY_THRESHOLD;
}

/**
 * Effective battery level for sorting (lower = worse). Numeric battery sensors
 * use their percentage; a binary battery maps `on` (low) → 0 and `off` (ok) →
 * 100; anything unreadable (unavailable/unknown) sorts last.
 */
function batteryLevel(hass: HomeAssistant, entityId: string): number {
    const state = hass.states?.[entityId]?.state ?? '';
    if (entityId.startsWith('binary_sensor.')) {
        if (state === 'on') return 0;
        if (state === 'off') return 100;
        return Infinity;
    }
    const value = parseFloat(state);
    return isNaN(value) ? Infinity : value;
}

/**
 * Every battery entity, sorted lowest level first (worst batteries at the top),
 * ties broken by display name. Used for the subview's full Batteries list — the
 * summary still highlights only the low ones (see lowBatteryIds).
 */
export function collectBatteriesSorted(hass: HomeAssistant): string[] {
    return [...collectBatteryEntityIds(hass)].sort((a, b) => {
        const la = batteryLevel(hass, a);
        const lb = batteryLevel(hass, b);
        if (la !== lb) return la - lb;
        return displayName(hass, a).localeCompare(displayName(hass, b));
    });
}

/** Visible `update.*` entity_ids with an update available (state `on`). */
function collectUpdateEntityIds(hass: HomeAssistant): string[] {
    return Object.keys(hass.states ?? {}).filter(
        (id) =>
            id.startsWith('update.') &&
            hass.states![id].state === 'on' &&
            isEntityVisible(hass.entities?.[id])
    );
}

/** diagnostic/config entities are integration plumbing — too noisy to surface. */
function isUserFacing(hass: HomeAssistant, entityId: string): boolean {
    const category = hass.entities?.[entityId]?.entity_category;
    return category !== 'diagnostic' && category !== 'config';
}

/**
 * Domains a person actually operates. The Unavailable list is restricted to
 * these so an offline device's dozens of `sensor`/`number`/`text`/`select`
 * entities don't flood the view — only the controllable thing that's broken
 * (a light, a lock, a media player) surfaces. Sensors/binary_sensors are
 * intentionally excluded.
 */
const CONTROLLABLE_DOMAINS = new Set([
    'light',
    'switch',
    'fan',
    'cover',
    'climate',
    'lock',
    'media_player',
    'vacuum',
    'humidifier',
    'valve',
    'lawn_mower',
    'siren',
    'camera',
    'water_heater',
]);

/**
 * Every visible, user-facing, controllable entity that is currently
 * `unavailable` — a broken/offline thing worth fixing (a light that stopped
 * responding, a media player that dropped off). Restricted to controllable
 * domains so offline devices don't spray their sensor/number/text entities.
 */
function collectUnavailableEntityIds(hass: HomeAssistant): string[] {
    return Object.keys(hass.states ?? {}).filter(
        (id) =>
            hass.states![id].state === 'unavailable' &&
            CONTROLLABLE_DOMAINS.has(id.split('.')[0]) &&
            isEntityVisible(hass.entities?.[id]) &&
            isUserFacing(hass, id)
    );
}

export interface MaintenanceItems {
    /** `update.*` entities with an update available. */
    updateIds: string[];
    /** Battery entities reading low. */
    lowBatteryIds: string[];
    /** Visible, user-facing entities that are unavailable (offline / broken). */
    unavailableIds: string[];
}

/**
 * Collect every maintenance item, partitioned by category and sorted by name.
 * Single source of truth for both the subview and the summary card aggregate.
 */
export function collectMaintenanceItems(hass: HomeAssistant): MaintenanceItems {
    const batteryIds = collectBatteryEntityIds(hass);
    return {
        updateIds: sortByName(hass, collectUpdateEntityIds(hass)),
        lowBatteryIds: sortByName(
            hass,
            batteryIds.filter((id) => hass.states?.[id]?.state !== 'unavailable' && isLowBattery(hass, id))
        ),
        unavailableIds: sortByName(hass, collectUnavailableEntityIds(hass)),
    };
}

/** Total number of maintenance items across all categories. */
export function maintenanceItemCount(hass: HomeAssistant): number {
    const { updateIds, lowBatteryIds, unavailableIds } = collectMaintenanceItems(hass);
    return updateIds.length + lowBatteryIds.length + unavailableIds.length;
}

/** Whether there is any maintenance item at all (gates the summary card). */
export function hasMaintenanceItems(hass: HomeAssistant): boolean {
    return maintenanceItemCount(hass) > 0;
}

function heading(text: string): HeadingCard {
    return { type: 'heading', heading_style: 'subtitle', heading: text };
}

/** Build the Updates section: tiles carry update-actions (install/skip). */
function buildUpdateCards(updateIds: string[]): StrategyCard[] {
    if (updateIds.length === 0) return [];
    const tiles: TileCard[] = updateIds.map((entity) => ({
        type: 'tile',
        entity,
        features: [{ type: 'update-actions' }],
    }));
    return [heading('Updates'), ...tiles];
}

function buildTileSection(title: string, entityIds: string[]): StrategyCard[] {
    if (entityIds.length === 0) return [];
    const tiles: TileCard[] = entityIds.map((entity) => ({ type: 'tile', entity }));
    return [heading(title), ...tiles];
}

/**
 * Build the complete Maintenance view body. Empty categories are omitted.
 */
export function buildMaintenanceView(hass: HomeAssistant): SectionsView {
    const { updateIds, unavailableIds } = collectMaintenanceItems(hass);
    const cards = [
        ...buildUpdateCards(updateIds),
        // All batteries, worst first — not just the low ones the summary counts.
        ...buildTileSection('Batteries', collectBatteriesSorted(hass)),
        ...buildTileSection('Unavailable', unavailableIds),
    ];

    return {
        title: 'Maintenance',
        path: 'maintenance',
        subview: true,
        icon: 'mdi:wrench',
        type: 'sections',
        max_columns: 2,
        sections: [
            {
                type: 'grid',
                column_span: 2,
                cards,
            },
        ],
    };
}
