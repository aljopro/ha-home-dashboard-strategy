/**
 * Pure functions for building summary cards.
 *
 * Emits our own `custom:ll-domain-summary-card` (rendered by the LitElement in
 * src/strategies/cards/domainSummaryCard.ts) — never HA's internal
 * `home-summary` type. Navigation paths point at our own dashboard subviews,
 * not HA's built-in panels. See memory: project-summary-card-architecture.
 */

import type { DomainSummaryCard, StrategyCard } from '../../../types/cards.js';
import { hasDomain } from '../entities/entityFilters.js';

/**
 * Per-domain accent color for the summary icon, shown only while the domain is
 * active (state-driven coloring — see domainSummaryCard / domainHasActivity).
 * Values mirror HA's home-summary palette via theme variables, each with a hex
 * fallback so the icon still colors under themes that omit the variable
 * (UI_and_Lit_Standards §3.2).
 */
const SUMMARY_COLORS: Record<string, string> = {
    light: 'var(--amber-color, #ffc107)',
    climate: 'var(--deep-orange-color, #ff5722)',
    security: 'var(--blue-grey-color, #607d8b)',
    media_player: 'var(--blue-color, #2196f3)',
    maintenance: 'var(--grey-color, #9e9e9e)',
};

/**
 * Build a summary card for a single domain (or pseudo-domain like `security`).
 */
export function buildSummaryCard(
    domain: string,
    label: string,
    icon: string,
    navigationPath: string
): DomainSummaryCard {
    const card: DomainSummaryCard = {
        type: 'custom:ll-domain-summary-card',
        domain,
        label,
        icon,
        navigation_path: navigationPath,
        grid_options: { columns: 12 },
    };
    if (SUMMARY_COLORS[domain]) {
        card.color = SUMMARY_COLORS[domain];
    }
    return card;
}

/**
 * Build all summary cards based on available domains.
 *
 * `basePath` is the dashboard's panel URL; navigation paths are built as
 * `/${basePath}/${subview}` to match area-card navigation (see areaCards.ts).
 */
export function buildSummaryCards(allEntityIds: string[], basePath: string = ''): StrategyCard[] {
    const pathPrefix = basePath ? `/${basePath}` : '';
    const cards: StrategyCard[] = [
        {
            type: 'heading',
            heading: 'Summaries',
            heading_style: 'title',
        },
    ];

    // Lights
    if (hasDomain(allEntityIds, 'light')) {
        cards.push(buildSummaryCard('light', 'Lights', 'mdi:lightbulb-group', `${pathPrefix}/lights`));
    }

    // Climate
    if (hasDomain(allEntityIds, 'climate')) {
        cards.push(buildSummaryCard('climate', 'Climate', 'mdi:thermostat', `${pathPrefix}/climate`));
    }

    // Security (alarm_control_panel or binary_sensor)
    if (hasDomain(allEntityIds, 'alarm_control_panel') || hasDomain(allEntityIds, 'binary_sensor')) {
        cards.push(buildSummaryCard('security', 'Security', 'mdi:shield-home', `${pathPrefix}/security`));
    }

    // Media players
    if (hasDomain(allEntityIds, 'media_player')) {
        cards.push(buildSummaryCard('media_player', 'Media', 'mdi:multimedia', `${pathPrefix}/media-players`));
    }

    return cards;
}
