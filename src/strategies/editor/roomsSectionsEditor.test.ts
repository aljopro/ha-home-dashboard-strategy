/**
 * Unit tests for the rooms-sections config editor.
 *
 * Scope: the editor's pure logic — `setConfig` in, `config-changed` payload out.
 * The `<ha-form>` render path is NOT exercised: `ha-form` is a core Home
 * Assistant element that does not upgrade under jsdom (verified live instead,
 * per docs/Testing_Standards.md). We therefore drive the internal
 * `value-changed` handler directly and capture the emitted event.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import type { DashboardStrategyConfig } from '../../types/cards.js';
import { RoomsSectionsEditor } from './roomsSectionsEditor.js';

beforeAll(() => {
    // Importing the module registers the element; the constructor is what we use.
    expect(customElements.get('ll-strategy-editor-rooms-sections')).toBeDefined();
});

/**
 * Invoke the editor's `value-changed` handler with the data `ha-form` would emit,
 * and capture the resulting `config-changed` event.
 *
 * We call the handler directly rather than dispatching on the element: the
 * listener is wired to the inner `<ha-form>` in the (un-rendered) template, so
 * there is nothing on the editor itself to receive a dispatched `value-changed`.
 */
function emitValueChanged(
    editor: RoomsSectionsEditor,
    value: Partial<DashboardStrategyConfig>
): DashboardStrategyConfig | undefined {
    let captured: DashboardStrategyConfig | undefined;
    editor.addEventListener('config-changed', (ev) => {
        captured = (ev as CustomEvent).detail.config;
    });

    const handler = (editor as unknown as { _valueChanged: (ev: CustomEvent) => void })._valueChanged;
    handler(new CustomEvent('value-changed', { detail: { value } }));
    return captured;
}

describe('RoomsSectionsEditor', () => {
    it('registers the custom element', () => {
        expect(customElements.get('ll-strategy-editor-rooms-sections')).toBe(RoomsSectionsEditor);
    });

    it('emits the full merged config on value-changed', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections', favorite_entities: ['light.kitchen'] });

        const result = emitValueChanged(editor, {
            favorite_entities: ['light.kitchen', 'light.office'],
            suggested: true,
        });

        // type is preserved; edited fields merged over the prior config.
        // badges is always normalised into the config (empty array when absent).
        expect(result).toMatchObject({
            type: 'rooms-sections',
            favorite_entities: ['light.kitchen', 'light.office'],
            suggested: true,
        });
    });

    it('preserves the strategy type even when the form omits it', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections' });

        const result = emitValueChanged(editor, { excluded_entities: ['light.debug'] });

        expect(result?.type).toBe('rooms-sections');
        expect(result?.excluded_entities).toEqual(['light.debug']);
    });

    it('normalises plain entity_id badges to BadgeConfig objects in setConfig', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections', badges: ['sun.sun'] as any });

        // Badges are now managed by BadgeListEditor; setConfig normalises strings
        // to full BadgeConfig objects so the editor can display all properties.
        const result = emitValueChanged(editor, { header: { show: true, title: 'My Home' } });

        expect(result?.header).toEqual({ show: true, title: 'My Home' });
        expect(result?.badges).toEqual([{ type: 'entity', entity: 'sun.sun' }]);
    });

    it('preserves rich badge objects (including tap_action) across setConfig', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({
            type: 'rooms-sections',
            badges: [
                { type: 'entity', entity: 'lock.front_door_lock', show_name: true, tap_action: { action: 'toggle' } },
                { type: 'entity', entity: 'cover.garage_door_door', show_name: true },
                'automation.going_to_bed',
            ] as any,
        });

        // Rich objects pass through intact; plain strings become { type, entity }.
        const result = emitValueChanged(editor, {});
        expect(result?.badges).toEqual([
            { type: 'entity', entity: 'lock.front_door_lock', show_name: true, tap_action: { action: 'toggle' } },
            { type: 'entity', entity: 'cover.garage_door_door', show_name: true },
            { type: 'entity', entity: 'automation.going_to_bed' },
        ]);
    });

    it('forwards badges-changed from BadgeListEditor as config-changed', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections' });

        let result: DashboardStrategyConfig | undefined;
        editor.addEventListener('config-changed', (ev) => {
            result = (ev as CustomEvent).detail.config;
        });

        const handler = (editor as unknown as { _badgesChanged: (ev: CustomEvent) => void })._badgesChanged;
        const newBadges = [{ type: 'entity', entity: 'sun.sun', show_name: true }];
        handler(new CustomEvent('badges-changed', { detail: { badges: newBadges } }));

        expect(result?.badges).toEqual(newBadges);
        expect(result?.type).toBe('rooms-sections');
    });

    it('ha-form value-changed does not clobber badges set by BadgeListEditor', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections', badges: ['sun.sun'] as any });

        // First, simulate BadgeListEditor pushing an updated badge list.
        const badgesHandler = (editor as unknown as { _badgesChanged: (ev: CustomEvent) => void })._badgesChanged;
        const badgeCfg = [{ type: 'entity', entity: 'sun.sun', show_name: true }];
        badgesHandler(new CustomEvent('badges-changed', { detail: { badges: badgeCfg } }));

        // Then ha-form fires value-changed without a badges field.
        const result = emitValueChanged(editor, { suggested: true });

        expect(result?.suggested).toBe(true);
        expect(result?.badges).toEqual(badgeCfg); // badges not clobbered
    });

    it('config-changed bubbles and is composed', () => {
        const editor = new RoomsSectionsEditor();
        editor.setConfig({ type: 'rooms-sections' });

        let event: CustomEvent | undefined;
        editor.addEventListener('config-changed', (ev) => {
            event = ev as CustomEvent;
        });
        const handler = (editor as unknown as { _valueChanged: (ev: CustomEvent) => void })._valueChanged;
        handler(new CustomEvent('value-changed', { detail: { value: {} } }));

        expect(event?.bubbles).toBe(true);
        expect(event?.composed).toBe(true);
    });
});
