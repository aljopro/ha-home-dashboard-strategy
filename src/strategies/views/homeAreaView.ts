/**
 * `custom:home-area` view strategy → element `ll-strategy-view-home-area`.
 *
 * Generates a single per-area subview (entities grouped by domain). The target
 * area is supplied in the strategy config as `area` (the area_id). Delegates to
 * the pure buildAreaView builder.
 */

import { buildAreaView } from '../builders/subviews/areaViews.js';
import { getEntityContext } from '../builders/entities/getEntityContext.js';
import { DEFAULT_ENTITY_DOMAINS } from '../entityDomains.js';
import type { EntityContext } from '../../types/core.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-area', async (config, hass) => {
    const areaId = (config as { area?: string }).area;
    const area = areaId ? hass.areas?.[areaId] : undefined;
    if (!area) {
        return { type: 'sections', sections: [] };
    }

    const entityContexts = Object.keys(hass.states ?? {})
        .map((entityId) => getEntityContext(hass, entityId))
        .filter((ctx): ctx is EntityContext => ctx !== null)
        .filter((ctx) => ctx.area?.area_id === areaId);

    return buildAreaView(hass, area, entityContexts, DEFAULT_ENTITY_DOMAINS);
});
