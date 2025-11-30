/**
 * Unit tests for summaryCards.ts
 * Tests pure functions for building summary cards.
 */

import { describe, it, expect } from 'vitest';
import { buildSummaryCard, buildSummaryCards } from './summaryCards.js';
import type { HomeSummaryCard } from '../../types/cards.js';

describe('summaryCards', () => {
    describe('buildSummaryCard', () => {
        it('builds summary card with correct structure', () => {
            const result = buildSummaryCard('light', '/light?historyBack=1');

            expect(result).toMatchObject({
                type: 'home-summary',
                summary: 'light',
                tap_action: {
                    action: 'navigate',
                    navigation_path: '/light?historyBack=1',
                },
                grid_options: { columns: 12 },
            });
        });

        it('builds media_players card with correct path', () => {
            const result = buildSummaryCard('media_players', '/media-players');

            expect((result as HomeSummaryCard)?.tap_action?.navigation_path).toBe('/media-players');
        });
    });

    describe('buildSummaryCards', () => {
        it('includes heading as first card', () => {
            const result = buildSummaryCards(['light.lr']);

            expect(result[0]).toMatchObject({
                type: 'heading',
                heading: 'Summaries',
                heading_style: 'title',
            });
        });

        it('adds light card if lights exist', () => {
            const result = buildSummaryCards(['light.lr_1', 'light.lr_2']);

            const lightCards = result.filter((c) => (c as HomeSummaryCard).summary === 'light');
            expect(lightCards).toHaveLength(1);
        });

        it('adds climate card if climate entities exist', () => {
            const result = buildSummaryCards(['climate.thermostat']);

            const climateCards = result.filter((c) => (c as HomeSummaryCard).summary === 'climate');
            expect(climateCards).toHaveLength(1);
        });

        it('adds security card if alarm_control_panel exists', () => {
            const result = buildSummaryCards(['alarm_control_panel.home']);

            const securityCards = result.filter((c) => (c as HomeSummaryCard).summary === 'security');
            expect(securityCards).toHaveLength(1);
        });

        it('adds security card if binary_sensor exists', () => {
            const result = buildSummaryCards(['binary_sensor.motion']);

            const securityCards = result.filter((c) => (c as HomeSummaryCard).summary === 'security');
            expect(securityCards).toHaveLength(1);
        });

        it('adds media_players card if media_player entities exist', () => {
            const result = buildSummaryCards(['media_player.speaker']);

            const mediaCards = result.filter((c) => (c as HomeSummaryCard).summary === 'media_players');
            expect(mediaCards).toHaveLength(1);
        });

        it('builds all summary cards when all domains exist', () => {
            const entityIds = ['light.lr', 'climate.thermostat', 'alarm_control_panel.home', 'media_player.speaker'];

            const result = buildSummaryCards(entityIds);

            expect(result.length).toBe(5); // heading + 4 summary cards
            expect(result.filter((c) => c.type === 'home-summary')).toHaveLength(4);
        });

        it('returns only heading if no matching domains', () => {
            const result = buildSummaryCards(['switch.fan']);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('heading');
        });

        it('returns only heading for empty array', () => {
            const result = buildSummaryCards([]);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('heading');
        });

        it('handles duplicate domain entities', () => {
            const result = buildSummaryCards(['light.lr_1', 'light.lr_2', 'light.br_1']);

            const lightCards = result.filter((c) => (c as HomeSummaryCard).summary === 'light');
            expect(lightCards).toHaveLength(1); // only one light card despite multiple lights
        });
    });
});
