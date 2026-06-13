// ============================================================================
// Home Assistant Core Types
// ============================================================================

/**
 * Area metadata from area registry.
 * Aligns with HA AreaRegistry entries.
 */
export interface Area {
    area_id: string;
    name: string;
    icon?: string;
}

/**
 * State object for an entity.
 * Aligns with HA HassEntity pattern (from home-assistant-js-websocket).
 */
export interface EntityState {
    state: string;
    attributes: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
}

export interface EntityRegistry {
    [key: string]: Entity;
}

export interface DeviceRegistry {
    [key: string]: Device;
}

export interface AreaRegistry {
    [key: string]: Area;
}

export interface HassStates {
    [key: string]: EntityState;
}

export type EntityCategory = 'none' | 'config' | 'diagnostic';

export interface EntityFilter {
    domain?: string | string[];
    device_class?: string | string[];
    device?: string | null | (string | null)[];
    area?: string | null | (string | null)[];
    floor?: string | null | (string | null)[];
    label?: string | string[];
    entity_category?: EntityCategory | EntityCategory[];
    hidden_platform?: string | string[];
}

/**
 * Entity domain information for grouping.
 */
export interface EntityDomainInfo {
    id: string;
    name: string;
    icon: string;
    filter: EntityFilter[];
}

export interface EntityContext {
    entity: Entity;
    device: Device;
    area: Area | null;
    state: EntityState;
    device_class: string;
}

/**
 * Entity metadata from entity registry.
 * Aligns with HA EntityRegistry entries.
 */
export interface Entity {
    entity_id: string;
    name?: string;
    area_id?: string | null;
    device_id?: string | null;
    platform?: string;
    icon?: string;
    disabled_by?: string | null;
    hidden_by?: string | null;
    device_class?: string | null;
    entity_category?: EntityCategory | null;
}

/**
 * Device metadata from device registry.
 * Aligns with HA DeviceRegistry entries.
 */
export interface Device {
    id: string;
    area_id?: string;
    name?: string;
    model?: string;
    manufacturer?: string;
    disabled_by?: string | null;
}
