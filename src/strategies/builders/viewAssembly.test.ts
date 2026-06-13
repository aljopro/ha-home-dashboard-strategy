/**
 * Unit tests for viewAssembly.ts
 * Tests pure functions for building view sections and the home view.
 */

import { describe, it, expect } from 'vitest';
import {
    buildGridSection,
    buildHomeView,
    buildViewHeader,
    buildViewBadges,
    buildSuggestedSection,
    buildFavoritesSection,
    buildSummarySection,
    buildAreaCardsGridSection,
} from './viewAssembly.js';
import type { StrategyCard, GridSection } from '../../types/cards.js';

describe('viewAssembly', () => {
    describe('buildGridSection', () => {
        it('builds grid section with default columnSpan', () => {
            const cards: StrategyCard[] = [{ type: 'heading', heading: 'Test', heading_style: 'title' }];

            const result = buildGridSection(cards);

            expect(result).toMatchObject({
                type: 'grid',
                column_span: 4,
                cards,
            });
        });

        it('builds grid section with custom columnSpan', () => {
            const cards: StrategyCard[] = [];

            const result = buildGridSection(cards, 2);

            expect(result.column_span).toBe(2);
        });
    });

    describe('buildHomeView', () => {
        it('builds home view with sections', () => {
            const config = { header: { title: 'My Home' }, badges: [] };
            const sections: GridSection[] = [{ type: 'grid', column_span: 4, cards: [] }];

            const result = buildHomeView(sections, config);

            expect(result).toMatchObject({
                title: 'Home',
                path: 'home',
                type: 'sections',
                max_columns: 4,
                sections,
            });
        });

        it('transforms config header and badges into view config', () => {
            const config = {
                header: { title: 'My Dashboard' },
                badges: ['sun.sun'],
            };
            const sections: GridSection[] = [];

            const result = buildHomeView(sections, config);

            expect(result.header).toEqual({
                card: { type: 'heading', heading: 'My Dashboard' },
                layout: 'center',
            });
            expect(result.badges).toEqual([{ type: 'entity', entity: 'sun.sun' }]);
        });

        it('uses default header and badges if not provided', () => {
            const config = {};
            const sections: GridSection[] = [];

            const result = buildHomeView(sections, config);

            expect(result.header).toEqual({});
            expect(result.badges).toEqual([]);
        });

        it('filters out null sections', () => {
            const config = {};
            const sections = [null, { type: 'grid', column_span: 4, cards: [] }, undefined] as any;

            const result = buildHomeView(sections, config);

            expect(result.sections).toHaveLength(1);
        });
    });

    describe('buildViewHeader', () => {
        it('returns empty object when header is undefined', () => {
            expect(buildViewHeader(undefined)).toEqual({});
        });

        it('returns empty object when explicitly hidden', () => {
            expect(buildViewHeader({ show: false, title: 'Ignored' })).toEqual({});
        });

        it('renders a centered heading card from the title', () => {
            expect(buildViewHeader({ show: true, title: 'My Home' })).toEqual({
                card: { type: 'heading', heading: 'My Home' },
                layout: 'center',
            });
        });

        it('treats omitted show as visible', () => {
            expect(buildViewHeader({ title: 'My Home' })).toEqual({
                card: { type: 'heading', heading: 'My Home' },
                layout: 'center',
            });
        });

        it('returns empty object when shown without a title', () => {
            expect(buildViewHeader({ show: true })).toEqual({});
        });
    });

    describe('buildViewBadges', () => {
        it('returns empty array when undefined', () => {
            expect(buildViewBadges(undefined)).toEqual([]);
        });

        it('returns empty array when empty', () => {
            expect(buildViewBadges([])).toEqual([]);
        });

        it('maps entity_id strings to entity badge configs', () => {
            expect(buildViewBadges(['sun.sun', 'light.kitchen'])).toEqual([
                { type: 'entity', entity: 'sun.sun' },
                { type: 'entity', entity: 'light.kitchen' },
            ]);
        });

        it('passes full badge objects through unchanged (hand-authored YAML)', () => {
            const richBadge = {
                type: 'entity',
                entity: 'lock.front_door_lock',
                show_name: true,
                tap_action: { action: 'toggle' },
            };
            expect(buildViewBadges([richBadge])).toEqual([richBadge]);
        });

        it('handles a mix of strings and objects', () => {
            const richBadge = { type: 'entity', entity: 'cover.garage_door_door', show_name: true };
            const result = buildViewBadges(['sun.sun', richBadge]);
            expect(result[0]).toEqual({ type: 'entity', entity: 'sun.sun' });
            expect(result[1]).toBe(richBadge);
        });
    });

    describe('buildSuggestedSection', () => {
        it('returns null when disabled', () => {
            expect(buildSuggestedSection(false)).toBeNull();
        });

        it('returns null when enabled (no usage data yet)', () => {
            // Plumbed end-to-end but intentionally inert until usage data exists.
            expect(buildSuggestedSection(true)).toBeNull();
        });
    });

    describe('buildFavoritesSection', () => {
        it('builds favorites section with entities', () => {
            const result = buildFavoritesSection(['light.lr', 'switch.fan']);

            expect(result).toBeDefined();
            expect(result?.type).toBe('grid');
            expect(result?.column_span).toBe(4);
            expect(result?.cards).toHaveLength(2); // heading + entities card
        });

        it('includes heading card', () => {
            const result = buildFavoritesSection(['light.lr']);

            const heading = result?.cards?.[0];
            expect(heading).toMatchObject({
                type: 'heading',
                heading: 'Favorites',
                heading_style: 'title',
            });
        });

        it('includes entities card with favorites', () => {
            const favoriteIds = ['light.lr', 'switch.fan'];
            const result = buildFavoritesSection(favoriteIds);

            const entitiesCard = result?.cards?.[1];
            expect(entitiesCard).toMatchObject({
                type: 'entities',
                title: 'Favorites',
                entities: favoriteIds,
                show_header_toggle: false,
            });
        });

        it('returns null if no favorites', () => {
            const result = buildFavoritesSection([]);

            expect(result).toBeNull();
        });
    });

    describe('buildSummarySection', () => {
        it('builds summary section if multiple cards', () => {
            const summaryCards: StrategyCard[] = [
                {
                    type: 'heading',
                    heading: 'Summaries',
                    heading_style: 'title',
                },
                { type: 'home-summary', summary: 'light' },
                { type: 'home-summary', summary: 'climate' },
            ];

            const result = buildSummarySection(summaryCards);

            expect(result).toBeDefined();
            expect(result?.type).toBe('grid');
            expect(result?.column_span).toBe(4);
            expect(result?.cards).toEqual(summaryCards);
        });

        it('returns null if only heading', () => {
            const summaryCards: StrategyCard[] = [
                {
                    type: 'heading',
                    heading: 'Summaries',
                    heading_style: 'title',
                },
            ];

            const result = buildSummarySection(summaryCards);

            expect(result).toBeNull();
        });

        it('returns null if empty', () => {
            const result = buildSummarySection([]);

            expect(result).toBeNull();
        });
    });

    describe('buildAreaCardsGridSection', () => {
        it('builds area cards section with heading and cards', () => {
            const areaCards: StrategyCard[] = [
                { type: 'heading', heading: 'Areas', heading_style: 'title' },
                {
                    type: 'area',
                    area: 'living_room',
                    title: 'Living Room',
                    navigation_path: '/living_room',
                },
            ];

            const result = buildAreaCardsGridSection(areaCards);

            expect(result).toMatchObject({
                type: 'grid',
                column_span: 4,
                cards: areaCards,
            });
        });

        it('always returns a grid section', () => {
            const result = buildAreaCardsGridSection([]);

            expect(result.type).toBe('grid');
            expect(result.column_span).toBe(4);
        });
    });
});
