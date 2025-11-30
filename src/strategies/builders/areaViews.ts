/**
 * Pure functions for building per-area views (entities grouped by domain).
 * Takes area + entities + domain info, returns a LovelaceView.
 */

import type { LovelaceView, StrategyCard, Entity, EntityDomainInfo } from '../../types/cards.js';
import { getEntityAreaId } from './entityFilters.js';

interface LovelaceCard {
    type: string;
    title?: string;
    entities?: string[];
    show_header_toggle?: boolean;
    state_color?: boolean;
    [key: string]: any;
}

/**
 * Build entities card for a single domain within an area.
 */
export function buildEntitiesDomainCard(domainInfo: EntityDomainInfo, areaEntities: Entity[]): LovelaceCard | null {
    if (areaEntities.length === 0) return null;

    return {
        type: 'entities',
        title: domainInfo.name,
        entities: areaEntities.map((e) => e.entity_id),
        show_header_toggle: true,
        state_color: true,
    };
}

/**
 * Build all domain cards for an area (one card per domain with entities).
 */
export function buildAreaDomainCards(
    entities: Entity[],
    areaId: string,
    domains: EntityDomainInfo[],
    devices: Record<string, any> | undefined
): LovelaceCard[] {
    return domains
        .map((domainInfo) => {
            const areaEntities = entities.filter((entity) => {
                const entityAreaId = getEntityAreaId(entity, devices);
                return entityAreaId === areaId && entity.entity_id.startsWith(`${domainInfo.id}.`);
            });

            return buildEntitiesDomainCard(domainInfo, areaEntities);
        })
        .filter((card): card is LovelaceCard => card !== null);
}

/**
 * Build a single per-area view (sections layout with domain cards).
 */
export function buildAreaView(
    areaTitle: string,
    areaId: string,
    entities: Entity[],
    domains: EntityDomainInfo[],
    devices: Record<string, any> | undefined
): LovelaceView {
    const domainCards = buildAreaDomainCards(entities, areaId, domains, devices);

    return {
        title: areaTitle,
        path: areaId,
        type: 'sections',
        max_columns: 2,
        subview: true,
        sections: [
            {
                type: 'grid',
                column_span: 2,
                columns: 2,
                cards: domainCards as StrategyCard[],
            },
        ],
    };
}

/**
 * Build all per-area views.
 */
export function buildAreaViews(
    areas: string[], // array of area IDs to build views for
    areaNames: Record<string, string>, // map of area_id -> area name
    entities: Entity[],
    domains: EntityDomainInfo[],
    devices: Record<string, any> | undefined
): LovelaceView[] {
    return areas.map((areaId) => buildAreaView(areaNames[areaId], areaId, entities, domains, devices));
}
