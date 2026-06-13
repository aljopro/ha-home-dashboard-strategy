/**
 * Pure functions for building sections and the main home view.
 * Takes cards and sections, assembles them into views.
 */

import type {
    DashboardStrategyConfig,
    LovelaceSection,
    SectionsView,
    StrategyCard,
    StrategyHeaderConfig,
} from '../../types/cards.js';

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
 * Transform the strategy's header config into a Lovelace view header object.
 * Returns an empty header when hidden or unconfigured. A `title` is rendered as
 * a centered heading card in the view header.
 */
export function buildViewHeader(header?: StrategyHeaderConfig): Record<string, unknown> {
    if (!header || header.show === false) return {};

    const out: Record<string, unknown> = {};
    if (header.title) {
        out.card = { type: 'heading', heading: header.title };
        out.layout = 'center';
    }
    return out;
}

/**
 * Transform configured badge entity_ids into Lovelace entity-badge configs.
 */
/**
 * Normalise badge entries: plain strings (from the graphical editor's entity
 * picker) become `{ type: 'entity', entity }`; full badge objects (hand-authored
 * YAML) pass through unchanged so existing configs keep working.
 */
export function buildViewBadges(badges?: (string | Record<string, unknown>)[]): unknown[] {
    if (!badges || badges.length === 0) return [];
    return badges.map((badge) =>
        typeof badge === 'string' ? { type: 'entity', entity: badge } : badge
    );
}

/**
 * Build the home view from sections.
 */
export function buildHomeView(
    sections: LovelaceSection[],
    config: Pick<DashboardStrategyConfig, 'header' | 'badges'>
): SectionsView {
    return {
        title: 'Home',
        path: 'home',
        type: 'sections',
        max_columns: 4,
        sections: sections.filter(Boolean) as LovelaceSection[],
        header: buildViewHeader(config.header),
        badges: buildViewBadges(config.badges),
    };
}

/**
 * Build favorites section from favorite entity IDs using tile cards.
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
            ...favoriteEntityIds.map((entityId) => ({
                type: 'tile' as const,
                entity: entityId,
                show_entity_picture: true,
            })),
        ],
        4
    );
}

/**
 * Build the "suggested" section from usage-prediction entity IDs.
 *
 * `predictedEntityIds` should be pre-fetched by the caller via
 * `hass.callWS({ type: 'usage_prediction/common_control' })`, already filtered
 * to entities that exist in hass.states, deduped against favorites, and
 * limited to the desired count. Returns null when the toggle is off or when no
 * predicted entities are available (component not loaded, insufficient data, etc.)
 */
export function buildSuggestedSection(showSuggested: boolean, predictedEntityIds: string[] = []): LovelaceSection | null {
    if (!showSuggested || predictedEntityIds.length === 0) return null;

    return buildGridSection(
        [
            {
                type: 'heading',
                heading: 'Suggested',
                heading_style: 'title',
            },
            ...predictedEntityIds.map((entityId) => ({
                type: 'tile' as const,
                entity: entityId,
                show_entity_picture: true,
            })),
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
