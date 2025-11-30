/**
 * Unit tests for mediaPlayersView.ts
 * Tests pure functions for building media players views and grouping.
 */

import { describe, it, expect } from 'vitest';
import {
    groupMediaPlayersByArea,
    buildAreaMediaCards,
    buildUnassignedMediaCards,
    buildMediaPlayersView,
} from './mediaPlayersView.js';
import type { Entity, HeadingCard } from '../../types/cards.js';

describe('mediaPlayersView', () => {
    describe('groupMediaPlayersByArea', () => {
        it('groups media players by area', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'media_player.lr',
                    name: 'LR',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'media_player.br',
                    name: 'BR',
                    device_id: undefined,
                    area_id: 'bedroom',
                },
            ];

            const result = groupMediaPlayersByArea(entities, {});

            expect(result.mediaByArea.get('living_room')).toEqual(['media_player.lr']);
            expect(result.mediaByArea.get('bedroom')).toEqual(['media_player.br']);
            expect(result.unassignedMedia).toHaveLength(0);
        });

        it('collects unassigned media players', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'media_player.lr',
                    name: 'LR',
                    device_id: undefined,
                    area_id: 'living_room',
                },
                {
                    entity_id: 'media_player.unassigned',
                    name: 'Unassigned',
                    device_id: undefined,
                    area_id: undefined,
                },
            ];

            const result = groupMediaPlayersByArea(entities, {});

            expect(result.mediaByArea.get('living_room')).toEqual(['media_player.lr']);
            expect(result.unassignedMedia).toEqual(['media_player.unassigned']);
        });

        it('uses device area if entity area is missing', () => {
            const entities: Entity[] = [
                {
                    entity_id: 'media_player.speaker',
                    name: 'Speaker',
                    device_id: 'device123',
                    area_id: undefined,
                },
            ];
            const devices = {
                device123: { area_id: 'kitchen' },
            };

            const result = groupMediaPlayersByArea(entities, devices);

            expect(result.mediaByArea.get('kitchen')).toEqual(['media_player.speaker']);
        });

        it('returns empty grouping for empty input', () => {
            const result = groupMediaPlayersByArea([], {});

            expect(result.mediaByArea.size).toBe(0);
            expect(result.unassignedMedia).toHaveLength(0);
        });
    });

    describe('buildAreaMediaCards', () => {
        it('builds heading and area media cards', () => {
            const mediaByArea = new Map([['living_room', ['media_player.lr']]]);
            const areaNames = { living_room: 'Living Room' };

            const result = buildAreaMediaCards(['living_room'], areaNames, mediaByArea);

            expect(result[0]).toMatchObject({
                type: 'heading',
                heading: 'Areas',
                heading_style: 'title',
            });
            expect(result[1]).toMatchObject({
                type: 'heading',
                heading: 'Living Room',
                heading_style: 'subtitle',
            });
            expect(result[2]).toMatchObject({
                type: 'media-control',
                entity: 'media_player.lr',
            });
        });

        it('skips areas with no media players', () => {
            const mediaByArea = new Map();
            const areaNames = { living_room: 'Living Room' };

            const result = buildAreaMediaCards(['living_room'], areaNames, mediaByArea);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('heading');
            expect((result[0] as HeadingCard).heading).toBe('Areas');
        });

        it('handles multiple media players in one area', () => {
            const mediaByArea = new Map([['living_room', ['media_player.lr1', 'media_player.lr2']]]);
            const areaNames = { living_room: 'Living Room' };

            const result = buildAreaMediaCards(['living_room'], areaNames, mediaByArea);

            const mediaCards = result.filter((c) => c.type === 'media-control');
            expect(mediaCards).toHaveLength(2);
        });
    });

    describe('buildUnassignedMediaCards', () => {
        it('builds heading and unassigned media cards', () => {
            const result = buildUnassignedMediaCards(['media_player.unassigned']);

            expect(result[0]).toMatchObject({
                type: 'heading',
                heading: 'Other media players',
                heading_style: 'subtitle',
            });
            expect(result[1]).toMatchObject({
                type: 'media-control',
                entity: 'media_player.unassigned',
            });
        });

        it('returns empty array if no unassigned media', () => {
            const result = buildUnassignedMediaCards([]);

            expect(result).toHaveLength(0);
        });

        it('handles multiple unassigned media', () => {
            const result = buildUnassignedMediaCards(['media_player.unassigned1', 'media_player.unassigned2']);

            const mediaCards = result.filter((c) => c.type === 'media-control');
            expect(mediaCards).toHaveLength(2);
        });
    });

    describe('buildMediaPlayersView', () => {
        it('builds complete media players view', () => {
            const mediaByArea = new Map([['living_room', ['media_player.lr']]]);
            const areaNames = { living_room: 'Living Room' };

            const result = buildMediaPlayersView(mediaByArea, [], ['living_room'], areaNames);

            expect(result).toMatchObject({
                title: 'Media players',
                path: 'media-players',
                subview: true,
                icon: 'mdi:multimedia',
                type: 'sections',
                max_columns: 2,
            });
            expect(result.sections).toBeDefined();
            expect(result.sections?.length).toBeGreaterThan(0);
        });

        it('includes both area and unassigned media in single section', () => {
            const mediaByArea = new Map([['living_room', ['media_player.lr']]]);
            const areaNames = { living_room: 'Living Room' };

            const result = buildMediaPlayersView(mediaByArea, ['media_player.unassigned'], ['living_room'], areaNames);

            expect(result.sections).toBeDefined();
            const cards = result.sections![0].cards;
            expect(cards.length).toBeGreaterThan(0);
            const mediaCards = cards.filter((c) => c.type === 'media-control');
            expect(mediaCards).toHaveLength(2);
        });
    });
});
