/**
 * Pure functions for building the media players view.
 * Groups media players by area, returns a LovelaceView.
 */

import type { LovelaceView, StrategyCard, Entity, MediaControlCard, HeadingCard } from '../../types/cards.js';
import { getEntityAreaId } from './entityFilters.js';

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
    areas: string[], // array of area IDs
    areaNames: Record<string, string>, // map of area_id -> area name
    mediaByArea: Map<string, string[]>
): StrategyCard[] {
    const cards: StrategyCard[] = [
        {
            type: 'heading',
            heading: 'Areas',
            heading_style: 'title',
        } as HeadingCard,
    ];

    areas.forEach((areaId) => {
        const players = mediaByArea.get(areaId);
        if (!players || players.length === 0) return;

        cards.push({
            type: 'heading',
            heading_style: 'subtitle',
            heading: areaNames[areaId] || areaId,
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
    areaIds: string[],
    areaNames: Record<string, string>
): LovelaceView {
    const areaCards = buildAreaMediaCards(areaIds, areaNames, mediaByArea);
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
