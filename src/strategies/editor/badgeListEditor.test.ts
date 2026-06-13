/**
 * Unit tests for the BadgeListEditor.
 *
 * Scope: pure logic — normalizeBadges utility, add/remove/edit badge handlers,
 * and `badges-changed` event payload. The ha-form render path is NOT exercised
 * (ha-form is a core HA element that does not upgrade under jsdom).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { BadgeListEditor, normalizeBadges } from './badgeListEditor.js';
import type { BadgeConfig } from './badgeListEditor.js';

beforeAll(() => {
    expect(customElements.get('ll-strategy-badge-list-editor')).toBeDefined();
});

// --- normalizeBadges ---

describe('normalizeBadges', () => {
    it('converts plain entity_id strings to BadgeConfig objects', () => {
        expect(normalizeBadges(['sun.sun', 'sensor.temp'])).toEqual([
            { type: 'entity', entity: 'sun.sun' },
            { type: 'entity', entity: 'sensor.temp' },
        ]);
    });

    it('passes rich badge objects through, defaulting type to entity', () => {
        const input = [{ entity: 'lock.front_door', show_name: true, tap_action: { action: 'toggle' } }];
        const result = normalizeBadges(input);
        expect(result[0]).toMatchObject({
            type: 'entity',
            entity: 'lock.front_door',
            show_name: true,
            tap_action: { action: 'toggle' },
        });
    });

    it('does not overwrite an explicit type from an object', () => {
        const input = [{ type: 'custom:my-badge', entity: 'sensor.temp' }];
        // normalizeBadges spreads `type: 'entity'` first, then the object — the
        // object's own `type` wins because of spread order.
        const result = normalizeBadges(input);
        expect(result[0].type).toBe('custom:my-badge');
    });

    it('returns empty array for empty input', () => {
        expect(normalizeBadges([])).toEqual([]);
    });
});

// --- BadgeListEditor handlers ---

function captureEvent(editor: BadgeListEditor): BadgeConfig[] | undefined {
    let captured: BadgeConfig[] | undefined;
    editor.addEventListener('badges-changed', (ev) => {
        captured = (ev as CustomEvent).detail.badges;
    });
    return captured;
}

function addBadge(editor: BadgeListEditor): void {
    (editor as unknown as { _addBadge: () => void })._addBadge();
}

function removeBadge(editor: BadgeListEditor, index: number): void {
    (editor as unknown as { _removeBadge: (i: number) => void })._removeBadge(index);
}

function badgeValueChanged(editor: BadgeListEditor, index: number, value: Partial<BadgeConfig>): void {
    const handler = (
        editor as unknown as { _badgeValueChanged: (ev: CustomEvent, i: number) => void }
    )._badgeValueChanged.bind(editor);
    handler(new CustomEvent('value-changed', { detail: { value } }), index);
}

function toggleEdit(editor: BadgeListEditor, index: number): void {
    (editor as unknown as { _toggleEdit: (i: number) => void })._toggleEdit(index);
}

describe('BadgeListEditor', () => {
    it('registers the custom element', () => {
        expect(customElements.get('ll-strategy-badge-list-editor')).toBe(BadgeListEditor);
    });

    describe('_addBadge', () => {
        it('appends a stub badge and emits badges-changed', () => {
            const editor = new BadgeListEditor();
            editor.badges = [{ type: 'entity', entity: 'sun.sun' }];

            let result: BadgeConfig[] | undefined;
            editor.addEventListener('badges-changed', (ev) => {
                result = (ev as CustomEvent).detail.badges;
            });

            addBadge(editor);

            expect(result).toHaveLength(2);
            expect(result![1]).toEqual({ type: 'entity', entity: '' });
        });

        it('opens the inline editor for the new badge', () => {
            const editor = new BadgeListEditor();
            editor.badges = [];
            addBadge(editor);

            const editingIndex = (editor as unknown as { _editingIndex: number | null })._editingIndex;
            expect(editingIndex).toBe(0);
        });

        it('emits an event that bubbles and is composed', () => {
            const editor = new BadgeListEditor();
            editor.badges = [];

            let event: CustomEvent | undefined;
            editor.addEventListener('badges-changed', (ev) => { event = ev as CustomEvent; });
            addBadge(editor);

            expect(event?.bubbles).toBe(true);
            expect(event?.composed).toBe(true);
        });
    });

    describe('_removeBadge', () => {
        it('removes the badge at the given index and emits badges-changed', () => {
            const editor = new BadgeListEditor();
            editor.badges = [
                { type: 'entity', entity: 'sun.sun' },
                { type: 'entity', entity: 'sensor.temp' },
            ];

            let result: BadgeConfig[] | undefined;
            editor.addEventListener('badges-changed', (ev) => {
                result = (ev as CustomEvent).detail.badges;
            });

            removeBadge(editor, 0);

            expect(result).toEqual([{ type: 'entity', entity: 'sensor.temp' }]);
        });

        it('clears the editing index when removing the badge being edited', () => {
            const editor = new BadgeListEditor();
            editor.badges = [{ type: 'entity', entity: 'sun.sun' }];
            toggleEdit(editor, 0);

            removeBadge(editor, 0);

            const editingIndex = (editor as unknown as { _editingIndex: number | null })._editingIndex;
            expect(editingIndex).toBeNull();
        });

        it('adjusts the editing index when removing a badge before it', () => {
            const editor = new BadgeListEditor();
            editor.badges = [
                { type: 'entity', entity: 'sun.sun' },
                { type: 'entity', entity: 'sensor.temp' },
            ];
            toggleEdit(editor, 1); // editing the second badge

            removeBadge(editor, 0); // remove the first

            const editingIndex = (editor as unknown as { _editingIndex: number | null })._editingIndex;
            expect(editingIndex).toBe(0); // still pointing at sensor.temp
        });
    });

    describe('_badgeValueChanged', () => {
        it('merges form value into the badge at index and emits badges-changed', () => {
            const editor = new BadgeListEditor();
            editor.badges = [
                { type: 'entity', entity: 'sun.sun' },
                { type: 'entity', entity: 'sensor.temp' },
            ];

            let result: BadgeConfig[] | undefined;
            editor.addEventListener('badges-changed', (ev) => {
                result = (ev as CustomEvent).detail.badges;
            });

            badgeValueChanged(editor, 0, { entity: 'sun.sun', show_name: true, color: 'blue' });

            expect(result![0]).toMatchObject({ entity: 'sun.sun', show_name: true, color: 'blue' });
            expect(result![1]).toEqual({ type: 'entity', entity: 'sensor.temp' });
        });
    });

    describe('_toggleEdit', () => {
        it('sets editingIndex to the given index', () => {
            const editor = new BadgeListEditor();
            editor.badges = [{ type: 'entity', entity: 'sun.sun' }];
            toggleEdit(editor, 0);

            const editingIndex = (editor as unknown as { _editingIndex: number | null })._editingIndex;
            expect(editingIndex).toBe(0);
        });

        it('closes the editor when toggling the same index again', () => {
            const editor = new BadgeListEditor();
            editor.badges = [{ type: 'entity', entity: 'sun.sun' }];
            toggleEdit(editor, 0);
            toggleEdit(editor, 0);

            const editingIndex = (editor as unknown as { _editingIndex: number | null })._editingIndex;
            expect(editingIndex).toBeNull();
        });
    });
});
