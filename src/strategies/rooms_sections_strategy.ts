/**
 * Merged Rooms Sections + Home Overview strategy (REFACTORED)
 *
 * This strategy builds area (room) cards and per-area views (like the original
 * rooms_sections_strategy), and also includes a "favorites / most used"
 * section and the "summaries" cards that the Home Overview strategy provides.
 *
 * REFACTORED FOR:
 * - Functional composition: pure functions with one input, one output, no side effects
 * - Testability: each builder function is independently testable
 * - Maintainability: concerns are separated into focused modules
 */

import type {
    DashboardStrategyConfig,
    HomeAssistant,
    LovelaceConfig,
    LoveLaceDashboardStrategy,
} from '../types/cards.js';

import {
    filterEntitiesByDomainAndExclusions,
    normalizeFilterArray,
    sortEntitiesAlphabetically,
} from './builders/entityFilters.js';
import { getEntityContext } from './builders/getEntityContext.js';
import { buildSummaryCards } from './builders/summaryCards.js';
import {
    buildHomeView,
    buildFavoritesSection,
    buildSummarySection,
    buildAreaCardsGridSection,
} from './builders/viewAssembly.js';
import { EntityDomainInfo, EntityFilter, Area, Entity, EntityContext } from '../types/core.js';
import { buildAreaCardsSection } from './builders/areaCards.js';

/**
 * Default entity domains to include in the strategy.
 */

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
    { domain: 'water_heater' },
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

const DEFAULT_ENTITY_DOMAINS: EntityDomainInfo[] = [
    { id: 'light', name: 'Lights', icon: 'mdi:lamps', filter: lightEntityFilters },
    { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch', filter: switchEntityFilters },
    { id: 'cover', name: 'Shades', icon: 'mdi:window-shutter', filter: coverEntityFilters },
    { id: 'climate', name: 'Climate', icon: 'mdi:thermostat', filter: climateEntityFilters },
    { id: 'camera', name: 'Security', icon: 'mdi:security', filter: securityEntityFilters },
    { id: 'media_player', name: 'Media Players', icon: 'mdi:multimedia', filter: mediaPlayerEntityFilters },
];

export function generateViews(config: DashboardStrategyConfig, hass: HomeAssistant): LovelaceConfig {
    // Extract configuration
    const excludedEntities = config.excluded_entities || [];
    const basePath = hass?.panelUrl || '';
    const favoriteEntityIds = (config.favorite_entities || []).filter((id: string) => hass?.states?.[id] !== undefined);

    // Extract data from Home Assistant
    const allEntityIds = Object.keys(hass?.states || {});

    // Step 1: Filter and sort entities
    const entityContexts: EntityContext[] = allEntityIds
        .map((entityId) => getEntityContext(hass, entityId))
        .filter((context) => context !== null)
        .sort((a, b) => {
            return (a.entity.name || a.entity.entity_id).localeCompare(b.entity.name || b.entity.entity_id);
        }) as EntityContext[];

    const domainFiltersFn = DEFAULT_ENTITY_DOMAINS.map((domainInfo) => {
        return (context: EntityContext | null) => {
            if (context === null) {
                return false;
            }

            return domainInfo.filter.some((filter) => {
                const domains = normalizeFilterArray(filter.domain || []);
                const deviceClasses = normalizeFilterArray(filter.device_class || []);
                const entityCategories = normalizeFilterArray(filter.entity_category || []);

                if (domains && domains.size > 0) {
                    if (!domains.has(context.device_class)) {
                        return false;
                    }
                }
                if (deviceClasses && deviceClasses.size > 0) {
                    const deviceClass = context.device_class || 'none';

                    if (!deviceClasses.has(deviceClass)) {
                        return false;
                    }
                }
                if (entityCategories && entityCategories.size > 0) {
                    const category = context.entity?.entity_category || 'none';

                    if (!entityCategories.has(category)) {
                        return false;
                    }
                }

                return true;
            });
        };
    });

    const filteredEntityContexts = entityContexts.filter((context) => {
        if (excludedEntities.includes(context.entity.entity_id)) {
            return false;
        }

        return domainFiltersFn.some((filterFn) => {
            const value = filterFn(context);
            return value;
        });
    });

    // Step 2: Build area cards for home view
    const filteredAreas = [
        ...new Set(
            filteredEntityContexts
                .map((entityContexts) => entityContexts.area)
                .filter((area) => area !== null) as Area[]
        ),
    ];

    const areaCards = buildAreaCardsSection(filteredAreas, basePath);

    // Step 3: Build per-area views

    const areaViews = filteredAreas.map((area) => {
        return {
            title: area.name,
            path: area.area_id,
            subview: true,
            strategy: {
                type: 'home-area',
                area: area.area_id,
            },
        };
    });

    // Step 4: Build media players view

    const mediaPlayersView = {
        title: 'Media Players',
        path: 'media-players',
        subview: true,
        strategy: {
            type: 'home-media-players',
        },
    };

    // Step 5: Build summary cards
    const summaryCards = buildSummaryCards(allEntityIds);

    // Step 6: Build home view sections
    const favoritesSection = buildFavoritesSection(favoriteEntityIds);
    const summarySection = buildSummarySection(summaryCards);
    const areaCardsSection = buildAreaCardsGridSection(areaCards);
    const homeViewSections = [favoritesSection, summarySection, areaCardsSection].filter((s) => s !== null);

    // Step 7: Build and return complete view config
    const homeView = buildHomeView(homeViewSections as Parameters<typeof buildHomeView>[0], config);

    return {
        views: [homeView, ...areaViews, mediaPlayersView],
    };
}

/**
 * Home Assistant Lovelace Strategy Web Component
 * This class must extend ReactiveElement and implement the LovelaceStrategy interface
 * for Home Assistant to recognize it as a dashboard strategy.
 */
export default class RoomsSectionsStrategy extends HTMLElement implements LoveLaceDashboardStrategy {
    async generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
        return generateViews(config, hass);
    }

    static async generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
        return generateViews(config, hass);
    }
}

// Register the custom element without relying on TypeScript decorators
if (!customElements.get('ll-strategy-dashboard-rooms-sections')) {
    customElements.define(
        'll-strategy-dashboard-rooms-sections',
        RoomsSectionsStrategy as unknown as CustomElementConstructor
    );
}
