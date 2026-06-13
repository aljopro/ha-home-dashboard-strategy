/**
 * Pure functions for building the media players view.
 * Groups media players by area, returns a LovelaceView.
 */

import type { SectionsView, StrategyCard, MediaControlCard, HeadingCard } from '../../../types/cards.js';
import { Area, Entity } from '../../../types/core.js';
import { getEntityAreaId } from '../entities/entityFilters.js';

interface MediaGrouping {
    mediaByArea: Map<string, string[]>;
    unassignedMedia: string[];
}

/**
 * Group media player entities by area.
 */
export function groupMediaPlayersByArea(
    mediaEntities: Entity[],
    devices: Record<string, any> | undefined
): MediaGrouping {
    const acc: MediaGrouping = {
        mediaByArea: new Map(),
        unassignedMedia: [],
    };

    mediaEntities.forEach((mp) => {
        const areaId = getEntityAreaId(mp, devices);
        if (areaId) {
            acc.mediaByArea.set(areaId, (acc.mediaByArea.get(areaId) || []).concat(mp.entity_id));
        } else {
            acc.unassignedMedia.push(mp.entity_id);
        }
    });

    return acc;
}

/**
 * Build cards for area media players.
 */
export function buildAreaMediaCards(
    areas: Area[],
    mediaByArea: Map<string, string[]>
): StrategyCard[] {
    const cards: StrategyCard[] = [
        {
            type: 'heading',
            heading: 'Areas',
            heading_style: 'title',
        } as HeadingCard,
    ];

    areas.forEach((area) => {
        const players = mediaByArea.get(area.area_id);
        if (!players || players.length === 0) return;

        cards.push({
            type: 'heading',
            heading_style: 'subtitle',
            heading: area.name,
        } as HeadingCard);

        players.forEach((entityId) => {
            cards.push({
                type: 'media-control',
                entity: entityId,
            } as MediaControlCard);
        });
    });

    return cards;
}

/**
 * Build cards for unassigned media players.
 */
export function buildUnassignedMediaCards(entityIds: string[]): StrategyCard[] {
    if (entityIds.length === 0) return [];

    return [
        {
            type: 'heading',
            heading_style: 'subtitle',
            heading: 'Other media players',
        } as HeadingCard,
        ...entityIds.map(
            (entityId) =>
                ({
                    type: 'media-control',
                    entity: entityId,
                } as MediaControlCard)
        ),
    ];
}

/**
 * Build the complete media players view.
 */
export function buildMediaPlayersView(
    mediaByArea: Map<string, string[]>,
    unassignedMedia: string[],
    areas: Area[]
): SectionsView {
    const areaCards = buildAreaMediaCards(areas, mediaByArea);
    const otherCards = buildUnassignedMediaCards(unassignedMedia);

    return {
        title: 'Media players',
        path: 'media-players',
        subview: true,
        icon: 'mdi:multimedia',
        type: 'sections',
        max_columns: 2,
        sections: [
            {
                type: 'grid',
                column_span: 2,
                cards: [...areaCards, ...otherCards],
            },
        ],
    };
}
