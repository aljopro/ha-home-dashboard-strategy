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
    Entity,
    Area,
    LoveLaceDashboardStrategy,
    EntityDomainInfo,
} from '../types/cards.js';

import {
    filterEntitiesByDomainAndExclusions,
    sortEntitiesAlphabetically,
    sortAreasAlphabetically,
} from './builders/entityFilters.js';
import { buildAreaCardsSection, getAreaIdsFromCards } from './builders/areaCards.js';
import { buildAreaViews } from './builders/areaViews.js';
import { groupMediaPlayersByArea, buildMediaPlayersView } from './builders/mediaPlayersView.js';
import { buildSummaryCards } from './builders/summaryCards.js';
import {
    buildHomeView,
    buildFavoritesSection,
    buildSummarySection,
    buildAreaCardsGridSection,
} from './builders/viewAssembly.js';

/**
 * Default entity domains to include in the strategy.
 */
const DEFAULT_ENTITY_DOMAINS: EntityDomainInfo[] = [
    { id: 'light', name: 'Lights', icon: 'mdi:lightbulb' },
    { id: 'switch', name: 'Switches', icon: 'mdi:toggle-switch' },
    { id: 'fan', name: 'Fans', icon: 'mdi:fan' },
    { id: 'cover', name: 'Covers', icon: 'mdi:window-shutter' },
    { id: 'camera', name: 'Security', icon: 'mdi:camera' },
];

/**
 * Main strategy logic: generates views from config and Home Assistant state.
 *
 * Composition flow:
 * 1. Prepare data (extract areas, entities, media players)
 * 2. Filter entities by domain and exclusion list
 * 3. Build area cards and per-area views
 * 4. Build media players view
 * 5. Build summary cards
 * 6. Build favorites section
 * 7. Assemble home view from sections
 * 8. Return complete view config
 */
export function generateViews(config: DashboardStrategyConfig, hass: HomeAssistant): LovelaceConfig {
    // Extract configuration
    const excludedEntities = config.excluded_entities || [];
    const basePath = hass?.panelUrl || '';
    const favoriteEntityIds = (config.favorite_entities || []).filter((id: string) => hass?.states?.[id] !== undefined);

    // Extract data from Home Assistant
    const areas = sortAreasAlphabetically(Object.values(hass?.areas || {}) as Area[]);
    const allEntities = Object.values(hass?.entities || {}) as Entity[];
    const allEntityIds = Object.keys(hass?.states || {});
    const devices = hass?.devices || {};

    // Step 1: Filter and sort entities
    const filteredEntities = filterEntitiesByDomainAndExclusions(allEntities, DEFAULT_ENTITY_DOMAINS, excludedEntities);
    const sortedEntities = sortEntitiesAlphabetically(filteredEntities);

    // Step 2: Build area cards for home view
    const areaCards = buildAreaCardsSection(areas, sortedEntities, devices, basePath);
    const areaIds = getAreaIdsFromCards(areaCards);

    // Build area name lookup for later use
    const areaNameMap: Record<string, string> = {};
    areas.forEach((area) => {
        areaNameMap[area.area_id] = area.name || area.area_id;
    });

    // Step 3: Build per-area views
    const areaViews = buildAreaViews(areaIds, areaNameMap, sortedEntities, DEFAULT_ENTITY_DOMAINS, devices);

    // Step 4: Build media players view
    const mediaEntities = allEntities.filter(
        (e) => e.entity_id && e.entity_id.startsWith('media_player.') && !excludedEntities.includes(e.entity_id)
    );
    const mediaGrouping = groupMediaPlayersByArea(mediaEntities, devices);
    const mediaPlayersView = buildMediaPlayersView(
        mediaGrouping.mediaByArea,
        mediaGrouping.unassignedMedia,
        areaIds,
        areaNameMap
    );

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
        console.log('RoomsSectionsStrategy: generating views with config', config);
        return generateViews(config, hass);
    }

    static async generate(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
        console.log('RoomsSectionsStrategy: generating views with config', config);
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
