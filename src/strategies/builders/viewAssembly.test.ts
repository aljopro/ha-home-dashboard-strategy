/**
 * Unit tests for viewAssembly.ts
 * Tests pure functions for building view sections and the home view.
 */

import { describe, it, expect } from 'vitest';
import {
    buildGridSection,
    buildHomeView,
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

        it('includes config header and badges', () => {
            const config = {
                header: { title: 'My Dashboard' },
                badges: [{ entity: 'sun.sun' }],
            };
            const sections: GridSection[] = [];

            const result = buildHomeView(sections, config);

            expect(result.header).toEqual({ title: 'My Dashboard' });
            expect(result.badges).toEqual([{ entity: 'sun.sun' }]);
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
