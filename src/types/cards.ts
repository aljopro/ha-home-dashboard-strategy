/**
 * Lovelace card and view type definitions for better type safety
 * Based on Home Assistant Lovelace card structure
 * Reference: https://github.com/home-assistant/frontend/blob/dev/src/panels/lovelace/types.ts
 */

import { EntityRegistry, DeviceRegistry, AreaRegistry, HassStates } from "./core";

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
 * Domain summary card showing aggregate status for a domain (or pseudo-domain
 * like `security`). Rendered by our own `ll-domain-summary-card` LitElement
 * (see src/strategies/cards/domainSummaryCard.ts) — never HA's internal
 * `home-summary` card type. Tapping navigates to our own subview.
 */
export interface DomainSummaryCard extends LovelaceCardConfig {
    type: 'custom:ll-domain-summary-card';
    /** HA domain (e.g. `light`) or pseudo-domain (e.g. `security`) to summarize. */
    domain: string;
    /** Display label, e.g. "Lights". Falls back to `domain` when omitted. */
    label?: string;
    /** mdi icon name, e.g. "mdi:lightbulb-group". */
    icon?: string;
    /** Optional accent color for the icon (CSS color or theme var). */
    color?: string;
    /** Dashboard path navigated to on tap, e.g. "/lovelace/lights". */
    navigation_path?: string;
    grid_options?: { columns?: number };
}

/**
 * Tile card for displaying a single entity with optional picture.
 * Aligns with HA frontend TileCardConfig.
 */
export interface TileCard extends LovelaceCardConfig {
    type: 'tile';
    entity: string;
    show_entity_picture?: boolean;
    name?: string;
    icon?: string;
    color?: string;
}

/**
 * Union type of all supported card types in this strategy.
 */
export type StrategyCard = HeadingCard | AreaCard | EntitiesCard | MediaControlCard | DomainSummaryCard | TileCard;

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

export interface StragegyView {
    title: string;
    path: string;
    subview: boolean;
    strategy: {
        type: string
    },
}

export type LovelaceView = SectionsView | StragegyView;

/**
 * Complete Lovelace configuration output.
 * Aligns with HA frontend LovelaceConfig pattern.
 */
export interface LovelaceConfig {
    views: LovelaceView[];
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
    /** Send a WebSocket command and await the response. Used for usage_prediction etc. */
    callWS?: <T>(message: Record<string, unknown>) => Promise<T>;
    /** HA core config, including the list of loaded integration components. */
    config?: {
        components?: string[];
        [key: string]: unknown;
    };
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
 * Header configuration for the home view.
 * Editable via the graphical config editor (toggle + custom title text).
 */
export interface StrategyHeaderConfig {
    /** Whether to show the header at all. Defaults to shown when omitted. */
    show?: boolean;
    /** Custom heading text rendered at the top of the home view. */
    title?: string;
}

/**
 * Dashboard strategy configuration.
 * Extended with custom strategy-specific options.
 * All fields are optional and defaulted — a bare `{ type }` config must still
 * generate a valid dashboard. See docs/Strategy_API_Guidelines.md §6.
 */
export interface DashboardStrategyConfig extends LovelaceStrategyConfig {
    type: string;
    /** entity_ids omitted from the dashboard entirely. */
    excluded_entities?: string[];
    /** entity_ids pinned to the top "Favorites" section. */
    favorite_entities?: string[];
    /** Show frequently-used ("suggested") entities alongside favorites. */
    suggested?: boolean;
    /** Home-view header config (graphical editor: toggle + title). */
    header?: StrategyHeaderConfig;
    /**
     * Badges rendered at the top of the home view.
     * Accepts either full badge config objects (hand-authored YAML) or plain
     * entity_id strings (written by the graphical editor's entity picker).
     * `buildViewBadges` normalises strings to `{ type: 'entity', entity }`;
     * objects are passed through unchanged.
     */
    badges?: (string | Record<string, unknown>)[];
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
