/**
 * Pure functions for building per-area views (entities grouped by domain).
 * Takes area + entities + domain info, returns a LovelaceView.
 */

import type { HomeAssistant, LovelaceView, StrategyCard } from '../../types/cards.js';
import { EntityDomainInfo, Entity, Area, EntityContext } from '../../types/core.js';
import { filterEntities, getEntityAreaId } from './entityFilters.js';

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
export function buildEntitiesDomainCard(domainInfo: EntityDomainInfo, hass: HomeAssistant, areaEntities: Entity[]): LovelaceCard | null {

    const domainEntities = filterEntities(areaEntities, hass, domainInfo);
    if (domainEntities.length === 0) {
        return null;
    }

    return {
        type: 'entities',
        title: domainInfo.name,
        entities: domainEntities.map((e) => e.entity_id),
        show_header_toggle: true,
        state_color: true,
    };
}

/**
 * Build all domain cards for an area (one card per domain with entities).
 */
export function buildAreaDomainCards(
    entityContexts: EntityContext[],
    hass: HomeAssistant,
    area: Area,
    domains: EntityDomainInfo[],
): LovelaceCard[] {
    return domains
        .map((domainInfo) => {
            const areaEntities = entityContexts
                .filter((ctx) => ctx.area?.area_id === area.area_id)
                .map((ctx) => ctx.entity);

            if (areaEntities.length === 0) {
                return null;
            }

            return buildEntitiesDomainCard(domainInfo, hass, areaEntities);
        })
        .filter((card): card is LovelaceCard => card !== null);
}

/**
 * Build a single per-area view (sections layout with domain cards).
 */
export function buildAreaView(
    hass: HomeAssistant,
    area: Area,
    entityContexts: EntityContext[],
    domains: EntityDomainInfo[]
): LovelaceView {
    const areaId = area.area_id;
    const areaTitle = area.name;
    const domainCards = buildAreaDomainCards(entityContexts, hass, area, domains);

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

export function buildAreaViews(
    entityContexts: EntityContext[],
    hass: HomeAssistant,
    areas: Area[],
    domains: EntityDomainInfo[]
): LovelaceView[] {
    return areas.map((area) => {
        const areaEntityContexts = entityContexts.filter((entityContext) => entityContext.area?.area_id === area.area_id);
        if (areaEntityContexts.length === 0) {
            return null;
        }

        return buildAreaView(hass, area, areaEntityContexts, domains);
    }).filter((view): view is LovelaceView => view !== null);
}