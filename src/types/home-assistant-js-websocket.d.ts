/** Minimal ambient types for `home-assistant-js-websocket` used by the frontend types.
 *
 * If you prefer upstream types, you can instead install the package:
 *
 *   npm install --save-dev home-assistant-js-websocket
 *
 * and remove this file.
 */

export interface HassEntity {
    entity_id: string;
    state: string;
    attributes: Record<string, unknown>;
}

export interface HassServiceTarget {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
    /** Generic target for compatibility */
    [key: string]: any;
}

// Additional commonly-used types (extend if needed)
export interface HassDevice {
    id: string;
    area_id?: string;
    name?: string;
}

export interface HassArea {
    area_id: string;
    name: string;
}
