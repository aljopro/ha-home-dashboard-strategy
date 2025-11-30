/**
 * Entry point for the Home Assistant dashboard strategy package.
 * This module exposes a single `install` function which HASS or other
 * integration code can call to register the dashboard strategy.
 */

import './strategies/rooms_sections_strategy';

export function install(hass: any): void {
    // For now we register a simple global helper and log installation.
    // Replace this with the actual strategy implementation.
    // If you target Home Assistant frontend, you may want to integrate
    // with Lovelace events or register custom elements.
    // Example placeholder: attach to window for dev/demo.
    (window as any).haDashboardStrategy = {
        version: '0.1.0',
        installedAt: Date.now(),
    };

    // If hass object provided, optionally hook into it.
    if (hass && typeof hass.callService === 'function') {
        console.log('ha-dashboard-strategy: installed and hass API is available');
    } else {
        console.log('ha-dashboard-strategy: installed (no hass API detected)');
    }
}

// Exported object for IIFE builds or consumers that want a single entry
export const exported = { install };

// If loaded in the browser as a resource, auto-run install so the helper
// and any bootstrap logic are available without an extra entry file.
try {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        // Avoid double-install when HASS or other code already called install
        const already = (window as any).haDashboardStrategy;
        if (!already) {
            // Some environments expose `window.hass`; try to pass it.
            // We don't want to throw on missing `hass` so wrap in try/catch.
            try {
                // @ts-ignore
                exported.install((window as any).hass ?? null);
            } catch (e) {
                // swallow errors from install to avoid breaking the host page
                // but log for diagnostics.
                // eslint-disable-next-line no-console
                console.warn('ha-dashboard-strategy: auto-install failed', e);
            }
        }
    }
} catch (e) {
    // defensive no-op
}

// (no default export) - consumers should import named `install` or `exported`
