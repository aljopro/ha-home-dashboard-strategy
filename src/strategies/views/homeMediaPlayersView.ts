/**
 * `custom:home-media-players` view strategy →
 * element `ll-strategy-view-home-media-players`.
 *
 * Generates the Media Players subview (media players grouped by area).
 * Delegates to the pure mediaPlayersView builders.
 */

import { buildMediaPlayersView, groupMediaPlayersByArea } from '../builders/subviews/mediaPlayersView.js';
import { isEntityVisible } from '../builders/entities/entityFilters.js';
import type { Area, Entity } from '../../types/core.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-media-players', async (_config, hass) => {
    const mediaEntities = (Object.values(hass.entities ?? {}) as Entity[])
        .filter((e) => e.entity_id.startsWith('media_player.'))
        .filter((e) => isEntityVisible(e));
    const { mediaByArea, unassignedMedia } = groupMediaPlayersByArea(mediaEntities, hass.devices);

    const areas = [...mediaByArea.keys()]
        .map((areaId) => hass.areas?.[areaId])
        .filter((area): area is Area => Boolean(area))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return buildMediaPlayersView(mediaByArea, unassignedMedia, areas);
});
