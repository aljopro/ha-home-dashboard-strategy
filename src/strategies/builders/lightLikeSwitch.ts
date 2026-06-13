/**
 * Light-like switch discernment.
 *
 * Some `switch.*` entities really control lighting (smart light switches,
 * lamp plugs) but live in the `switch` domain. `isLightLikeSwitch` decides
 * whether such a switch should be treated as a light — so it can be listed in
 * the Lights view and counted in the lights summary.
 *
 * Pure and DOM-free for independent unit testing (see lightLikeSwitch.test.ts).
 */

import type { EntityState } from '../../types/core.js';

/** mdi icons that signal a switch is really a light. */
const LIGHT_ICONS = new Set([
    'mdi:lightbulb',
    'mdi:lightbulb-outline',
    'mdi:lightbulb-on',
    'mdi:light-switch',
    'mdi:ceiling-light',
    'mdi:floor-lamp',
    'mdi:lamp',
]);

/**
 * Whether a `switch.*` entity is light-like.
 *
 * Only `switch` entities qualify; entities already in the `light` domain are not
 * "light-like switches" (they are lights). Signals (any one is sufficient):
 *  - friendly_name contains "light"
 *  - the entity's icon is in the known light-icon set
 */
export function isLightLikeSwitch(entityId: string, state: EntityState | undefined): boolean {
    if (!entityId.startsWith('switch.')) return false;
    if (!state) return false;

    const friendlyName = String(state.attributes?.friendly_name ?? '').toLowerCase();
    if (friendlyName.includes('light')) return true;

    const icon = state.attributes?.icon;
    if (typeof icon === 'string' && LIGHT_ICONS.has(icon)) return true;

    return false;
}
