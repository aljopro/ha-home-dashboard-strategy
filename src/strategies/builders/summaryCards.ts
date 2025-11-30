/**
 * Pure functions for building summary cards (Home Overview style).
 * Takes entity IDs, returns summary cards based on what domains exist.
 */

import type { StrategyCard } from '../../types/cards.js';
import { hasDomain } from './entityFilters.js';

/**
 * Build summary card for a single domain (e.g., light, climate, media_players).
 */
export function buildSummaryCard(summary: string, navigationPath: string): StrategyCard {
    return {
        type: 'home-summary',
        summary,
        tap_action: {
            action: 'navigate',
            navigation_path: navigationPath,
        },
        grid_options: { columns: 12 },
    };
}

/**
 * Build all summary cards based on available domains.
 */
export function buildSummaryCards(allEntityIds: string[]): StrategyCard[] {
    const cards: StrategyCard[] = [
        {
            type: 'heading',
            heading: 'Summaries',
            heading_style: 'title',
        },
    ];

    // Lights
    if (hasDomain(allEntityIds, 'light')) {
        cards.push(buildSummaryCard('light', '/light?historyBack=1'));
    }

    // Climate
    if (hasDomain(allEntityIds, 'climate')) {
        cards.push(buildSummaryCard('climate', '/climate?historyBack=1'));
    }

    // Security (alarm_control_panel or binary_sensor)
    if (hasDomain(allEntityIds, 'alarm_control_panel') || hasDomain(allEntityIds, 'binary_sensor')) {
        cards.push(buildSummaryCard('security', '/security?historyBack=1'));
    }

    // Media players
    if (hasDomain(allEntityIds, 'media_player')) {
        cards.push(buildSummaryCard('media_players', '/media-players'));
    }

    return cards;
}
