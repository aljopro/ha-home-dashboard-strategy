/**
 * Pure functions for building sections and the main home view.
 * Takes cards and sections, assembles them into views.
 */

import type { LovelaceSection, LovelaceView, StrategyCard } from '../../types/cards.js';

/**
 * Build a grid section from cards.
 */
export function buildGridSection(cards: StrategyCard[], columnSpan: number = 4): LovelaceSection {
    return {
        type: 'grid',
        column_span: columnSpan,
        cards,
    };
}

/**
 * Build the home view from sections.
 */
export function buildHomeView(
    sections: LovelaceSection[],
    config: any // DashboardStrategyConfig
): LovelaceView {
    return {
        title: 'Home',
        path: 'home',
        type: 'sections',
        max_columns: 4,
        sections: sections.filter(Boolean) as LovelaceSection[],
        header: config.header || {},
        badges: config.badges || [],
    };
}

/**
 * Build favorites section from favorite entity IDs.
 */
export function buildFavoritesSection(favoriteEntityIds: string[]): LovelaceSection | null {
    if (favoriteEntityIds.length === 0) return null;

    return buildGridSection(
        [
            {
                type: 'heading',
                heading: 'Favorites',
                heading_style: 'title',
            },
            {
                type: 'entities',
                title: 'Favorites',
                entities: favoriteEntityIds,
                show_header_toggle: false,
            },
        ],
        4
    );
}

/**
 * Build summary section from summary cards.
 */
export function buildSummarySection(summaryCards: StrategyCard[]): LovelaceSection | null {
    // Filter out heading-only summaries
    if (summaryCards.length <= 1) return null;

    return buildGridSection(summaryCards, 4);
}

/**
 * Build area cards section.
 */
export function buildAreaCardsGridSection(areaCards: StrategyCard[]): LovelaceSection {
    return buildGridSection(areaCards, 4);
}
