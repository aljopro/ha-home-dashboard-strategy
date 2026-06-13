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
import { Area, EntityContext } from '../types/core.js';
import { buildAreaCardsSection } from './builders/areaCards.js';
import { DEFAULT_ENTITY_DOMAINS } from './entityDomains.js';

// Side-effect import: registers the graphical config editor element.
import './editor/roomsSectionsEditor.js';

// Side-effect import: registers the ll-domain-summary-card custom element.
import './cards/domainSummaryCard.js';

// Side-effect imports: register the deferred view strategies referenced by the
// views this dashboard generates (custom:home-lights / home-media-players /
// home-area → ll-strategy-view-home-*).
import './views/homeLightsView.js';
import './views/homeMediaPlayersView.js';
import './views/homeAreaView.js';

const SUGGESTED_LIMIT = 8;

export async function generateViews(config: DashboardStrategyConfig, hass: HomeAssistant): Promise<LovelaceConfig> {
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
                type: 'custom:home-area',
                area: area.area_id,
            },
        };
    });

    // Step 4: Build deferred domain subviews (resolved lazily on navigation).

    const lightsView = {
        title: 'Lights',
        path: 'lights',
        subview: true,
        strategy: {
            type: 'custom:home-lights',
        },
    };

    const mediaPlayersView = {
        title: 'Media Players',
        path: 'media-players',
        subview: true,
        strategy: {
            type: 'custom:home-media-players',
        },
    };

    // Step 5: Build summary cards
    const summaryCards = buildSummaryCards(allEntityIds, basePath);

    // Step 6: Fetch usage-prediction data for suggested section
    let suggestedEntityIds: string[] = [];
    if (config.suggested && hass?.config?.components?.includes('usage_prediction') && hass.callWS) {
        try {
            const result = await hass.callWS<{ entities: string[] }>({ type: 'usage_prediction/common_control' });
            suggestedEntityIds = result.entities
                .filter((id) => hass.states?.[id] !== undefined)
                .filter((id) => !favoriteEntityIds.includes(id))
                .slice(0, SUGGESTED_LIMIT);
        } catch {
            // usage_prediction unavailable — section stays empty
        }
    }

    // Step 7: Build home view sections
    // Favorites and suggestions are combined into one section: favorites pinned
    // first, then predicted entities fill in after them.
    const combinedEntityIds = [...favoriteEntityIds, ...suggestedEntityIds];
    const favoritesSection = buildFavoritesSection(combinedEntityIds);
    const summarySection = buildSummarySection(summaryCards);
    const areaCardsSection = buildAreaCardsGridSection(areaCards);
    const homeViewSections = [favoritesSection, summarySection, areaCardsSection].filter(
        (s) => s !== null
    );

    // Step 8: Build and return complete view config
    const homeView = buildHomeView(homeViewSections as Parameters<typeof buildHomeView>[0], config);

    return {
        views: [homeView, ...areaViews, lightsView, mediaPlayersView],
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

    /**
     * Returns the graphical configuration editor element. Home Assistant shows
     * this in the dashboard settings dialog.
     */
    static getConfigElement(): HTMLElement {
        return document.createElement('ll-strategy-editor-rooms-sections');
    }
}

// Register the custom element without relying on TypeScript decorators
if (!customElements.get('ll-strategy-dashboard-rooms-sections')) {
    customElements.define(
        'll-strategy-dashboard-rooms-sections',
        RoomsSectionsStrategy as unknown as CustomElementConstructor
    );
}
