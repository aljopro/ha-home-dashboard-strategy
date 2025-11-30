/**
 * Lovelace card and view type definitions for better type safety
 * Based on Home Assistant Lovelace card structure
 * Reference: https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/types.ts
 */

// ============================================================================
// Action & Navigation Types
// ============================================================================

/**
 * Action configuration for tap, hold, and double-tap interactions.
 * Aligns with HA frontend ActionConfig pattern.
 */
export interface ActionConfig {
    action: 'navigate' | 'call-service' | 'toggle' | 'more-info' | 'url';
    navigation_path?: string;
    service?: string;
    service_data?: Record<string, unknown>;
    target?: HassServiceTarget;
    url?: string;
}

/**
 * Service target for service calls (entities, devices, areas, etc.)
 * Follows home-assistant-js-websocket HassServiceTarget pattern.
 */
export interface HassServiceTarget {
    entity_id?: string | string[];
    device_id?: string | string[];
    area_id?: string | string[];
    label_id?: string | string[];
}

// Base types for common properties
export interface GridOptions {
    columns?: number;
    rows?: number;
}

/**
 * @deprecated Use ActionConfig instead for consistency with HA frontend
 */
export type TapAction = ActionConfig;

/**
 * Heading card for section titles and subtitles.
 */
export interface HeadingCard extends LovelaceCardConfig {
    type: 'heading';
    heading: string;
    heading_style?: 'title' | 'subtitle';
}

// ============================================================================
// Card Type Definitions
// ============================================================================

/**
 * Base card configuration interface.
 * All cards must extend this interface.
 * Aligns with HA frontend LovelaceCardConfig.
 */
export interface LovelaceCardConfig {
    type: string;
    view_layout?: Record<string, unknown>;
    layout_options?: Record<string, unknown>;
}

/**
 * Area card displaying a room/zone with entity controls.
 * References HA frontend AreaCardConfig.
 */
export interface AreaCard extends LovelaceCardConfig {
    type: 'area';
    title: string;
    area: string;
    features_position?: 'bottom' | 'top';
    display_type?: 'picture' | 'compact' | 'icon' | 'camera';
    grid_options?: GridOptions;
    features?: LovelaceCardFeatureConfig[];
    navigation_path: string;
    exclude_entities?: string[];
}

export interface LovelaceCardFeatureConfig {
    type: string;
    [key: string]: unknown;
}

/**
 * Entities card for displaying multiple entity controls.
 * References HA frontend EntitiesCardConfig.
 */
export interface EntitiesCard extends LovelaceCardConfig {
    type: 'entities';
    title?: string;
    entities: (string | EntitiesCardEntityConfig)[];
    show_header_toggle?: boolean;
    state_color?: boolean;
    theme?: string;
    icon?: string;
    show_empty?: boolean;
}

export interface EntitiesCardEntityConfig {
    entity: string;
    name?: string;
    icon?: string;
    show_name?: boolean;
    show_icon?: boolean;
    show_state?: boolean;
    state_color?: boolean;
}

/**
 * Media control card for media player entities.
 * References HA frontend MediaControlCardConfig.
 */
export interface MediaControlCard extends LovelaceCardConfig {
    type: 'media-control';
    entity: string;
    name?: string;
    theme?: string;
}

/**
 * Home summary card showing domain-wide status.
 * Custom card type for dashboard strategies.
 */
export interface HomeSummaryCard extends LovelaceCardConfig {
    type: 'home-summary';
    summary: 'light' | 'climate' | 'security' | 'media_players' | string;
    tap_action?: ActionConfig;
    grid_options?: { columns?: number };
}

/**
 * Union type of all supported card types in this strategy.
 */
export type StrategyCard = HeadingCard | AreaCard | EntitiesCard | MediaControlCard | HomeSummaryCard;

// ============================================================================
// Section & View Types
// ============================================================================

/**
 * Grid section for organizing cards.
 * Aligns with HA frontend grid layout patterns.
 */
export interface GridSection {
    type: 'grid';
    column_span?: number;
    columns?: number;
    cards: StrategyCard[];
    title?: string;
}

export type LovelaceSection = GridSection;

/**
 * Sections view with multiple card grids.
 * Aligns with HA frontend SectionsViewConfig pattern.
 */
export interface SectionsView {
    type: 'sections';
    title: string;
    path: string;
    subview?: boolean;
    icon?: string;
    max_columns?: number;
    sections?: LovelaceSection[];
    header?: Record<string, unknown>;
    badges?: unknown[];
    theme?: string;
}

export type LovelaceView = SectionsView;

/**
 * Complete Lovelace configuration output.
 * Aligns with HA frontend LovelaceConfig pattern.
 */
export interface LovelaceConfig {
    views: LovelaceView[];
}

// ============================================================================
// Home Assistant Core Types
// ============================================================================

/**
 * Entity domain information for grouping.
 */
export interface EntityDomainInfo {
    id: string;
    name: string;
    icon: string;
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

/**
 * Minimal Home Assistant object type for strategy generation.
 * This is the interface passed to strategy generate() methods.
 * Aligns with partial HomeAssistant interface from HA frontend.
 */
export interface HomeAssistant {
    entities?: EntityRegistry;
    devices?: DeviceRegistry;
    areas?: AreaRegistry;
    states?: HassStates;
    panelUrl?: string;
    localize?: (key: string, options?: Record<string, unknown>) => string;
    [key: string]: unknown;
}

// ============================================================================
// Strategy Configuration & Pattern
// ============================================================================

/**
 * Strategy configuration passed to generate() method.
 * Base interface for all strategy configs.
 */
export interface LovelaceStrategyConfig {
    type: string;
    [key: string]: unknown;
}

/**
 * Dashboard strategy configuration.
 * Extended with custom strategy-specific options.
 */
export interface DashboardStrategyConfig extends LovelaceStrategyConfig {
    type: string;
    excluded_entities?: string[];
    favorite_entities?: string[];
    header?: Record<string, unknown>;
    badges?: unknown[];
}

/**
 * Lovelace strategy interface.
 * Aligns with HA frontend LovelaceStrategy pattern.
 * Used for dashboard, view, and section strategies.
 */
export interface LovelaceStrategy {
    /**
     * Generate configuration based on strategy config and Home Assistant state.
     * Must return the generated configuration (typically LovelaceConfig for dashboard strategies).
     */
    generate(config: LovelaceStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig>;

    /**
     * Optional editor element for configuring the strategy.
     */
    getConfigElement?: () => HTMLElement;

    /**
     * Disable editor UI if true.
     */
    noEditor?: boolean;

    /**
     * Require configuration (don't auto-generate with empty config).
     */
    configRequired?: boolean;
}

/**
 * Dashboard strategy - generates complete LovelaceConfig.
 */
export interface LoveLaceDashboardStrategy extends LovelaceStrategy {
    generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig>;
}
