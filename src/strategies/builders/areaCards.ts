/**
 * Pure functions for building area cards.
 * Takes config + entities + areas, returns array of area cards (no side effects).
 */

import type { StrategyCard, Area, Entity } from '../../types/cards.js';
import { getEntityAreaId } from './entityFilters.js';

/**
 * Build a single area card with heading, area controls, and navigation.
 */
export function buildAreaCard(area: Area, basePath: string): StrategyCard {
    const pathPrefix = basePath ? `/${basePath}` : '';
    return {
        title: area.name,
        type: 'area',
        area: area.area_id,
        features_position: 'bottom',
        display_type: 'picture',
        grid_options: { columns: 12, rows: 3 },
        features: [
            {
                type: 'area-controls',
                controls: ['light', 'switch', 'fan', 'cover-shade', 'cover-blind', 'cover-garage', 'cover-door'],
            },
        ],
        navigation_path: `${pathPrefix}/${area.area_id}`,
    };
}

/**
 * Build the full area cards section for the home view.
 * Returns: [heading card, ...area cards]
 */
export function buildAreaCardsSection(
    areas: Area[],
    entities: Entity[],
    devices: Record<string, any> | undefined,
    basePath: string
): StrategyCard[] {
    const validAreas = areas
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .filter((area) => area.area_id !== 'default')
        .filter((area) => area.name && area.name.trim() !== '')
        .filter((area) =>
            entities.some((entity) => {
                const areaId = getEntityAreaId(entity, devices);
                return areaId === area.area_id;
            })
        );

    const areaCards = validAreas.map((area) => buildAreaCard(area, basePath));

    return [{ type: 'heading', heading: 'Areas', heading_style: 'title' }, ...areaCards];
}

/**
 * Extract area IDs from area cards (for filtering).
 */
export function getAreaIdsFromCards(cards: StrategyCard[]): string[] {
    return cards
        .filter((card): card is any & { area?: string } => 'area' in card)
        .map((card) => card.area!)
        .filter(Boolean);
}
