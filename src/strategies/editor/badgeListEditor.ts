/**
 * Visual badge list editor for the rooms-sections dashboard strategy.
 *
 * Renders a list of configured badges with inline per-badge editing and an
 * "Add badge" entry point. Each badge is edited with an ha-form using the
 * entity-badge schema. Emits `badges-changed` (bubbles, composed) whenever the
 * badge list changes so the parent strategy editor can forward the update.
 *
 * No TypeScript experimental decorators — reactive members via `static properties`
 * + `declare` (see docs/UI_and_Lit_Standards.md §1.1).
 */

import { LitElement, html, nothing, css } from 'lit';
import type { TemplateResult, CSSResultGroup } from 'lit';
import type { HomeAssistant } from '../../types/cards.js';

// MDI path constants — avoids a runtime import of the full icon set.
const MDI_PENCIL =
    'M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z';
const MDI_DELETE =
    'M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z';

/**
 * Runtime shape of a single badge in the editor. Matches the HA entity-badge
 * config; extra keys are preserved via the index signature so hand-authored
 * tap_action / icon_tap_action configs survive an editor round-trip.
 */
export interface BadgeConfig {
    type: string;
    entity: string;
    name?: string;
    icon?: string;
    color?: string;
    show_name?: boolean;
    show_state?: boolean;
    show_icon?: boolean;
    [key: string]: unknown;
}

/**
 * ha-form schema for a single entity badge (mirrors hui-entity-badge-editor).
 * The appearance group is collapsible so the form stays compact.
 */
// `flatten: true` is required so ha-form does not wrap the expandable's
// value-changed payload as `{ appearance: { ... } }`. Without it, changes to
// inner fields are nested under the group name instead of merged flat into the
// badge config, which breaks initial display on the next open.
const BADGE_SCHEMA = [
    { name: 'entity', selector: { entity: {} } },
    {
        name: 'appearance',
        type: 'expandable',
        flatten: true,
        expanded: true,
        schema: [
            { name: 'name', selector: { text: {} } },
            { name: 'icon', selector: { icon: {} } },
            {
                name: 'color',
                selector: { ui_color: { default_color: 'state', include_state: true } },
            },
            { name: 'show_name', selector: { boolean: {} } },
            { name: 'show_state', selector: { boolean: {} } },
            { name: 'show_icon', selector: { boolean: {} } },
        ],
    },
] as const;

const BADGE_LABELS: Record<string, string> = {
    entity: 'Entity',
    appearance: 'Appearance',
    name: 'Name',
    icon: 'Icon',
    color: 'Color',
    show_name: 'Show name',
    show_state: 'Show state',
    show_icon: 'Show icon',
};

/**
 * Normalise mixed badge input (strings or objects) into BadgeConfig objects.
 * Plain entity_id strings become `{ type: 'entity', entity }`. Objects are
 * cast as-is, with `type` defaulting to `'entity'` if absent.
 */
export function normalizeBadges(badges: (string | Record<string, unknown>)[]): BadgeConfig[] {
    return badges.map((b) =>
        typeof b === 'string'
            ? { type: 'entity', entity: b }
            : ({ type: 'entity', ...b } as BadgeConfig)
    );
}

export class BadgeListEditor extends LitElement {
    static styles: CSSResultGroup = css`
        :host {
            display: block;
        }
        .section-header {
            display: flex;
            align-items: center;
            padding: 16px 16px 4px;
            font-weight: 500;
            font-size: 14px;
            color: var(--primary-text-color);
        }
        .badge-row {
            display: flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 4px;
        }
        .badge-row:hover {
            background: var(--secondary-background-color);
        }
        .badge-label {
            flex: 1;
            font-size: 14px;
            padding: 8px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: var(--primary-text-color);
        }
        .badge-label.empty {
            color: var(--secondary-text-color);
            font-style: italic;
        }
        .badge-form {
            padding: 0 16px 8px;
        }
        .add-row {
            padding: 4px 8px 8px;
        }
        .divider {
            height: 1px;
            background: var(--divider-color);
            margin: 4px 0 8px;
        }
    `;

    static properties = {
        hass: { attribute: false },
        badges: { attribute: false },
        _editingIndex: { state: true },
    };

    declare hass?: HomeAssistant;
    declare badges: BadgeConfig[];
    declare private _editingIndex: number | null;

    constructor() {
        super();
        this.badges = [];
        this._editingIndex = null;
    }

    render(): TemplateResult {
        const badges = this.badges ?? [];
        return html`
            <div class="section-header">Badges</div>
            ${badges.map((badge, index) => this._renderBadgeRow(badge, index))}
            <div class="divider"></div>
            <div class="add-row">
                <ha-button @click=${this._addBadge}>Add badge</ha-button>
            </div>
        `;
    }

    private _renderBadgeRow(badge: BadgeConfig, index: number): TemplateResult {
        const editing = this._editingIndex === index;
        return html`
            <div class="badge-row">
                <span class="badge-label ${badge.entity ? '' : 'empty'}">
                    ${badge.entity || 'New badge'}
                </span>
                <ha-icon-button
                    .label=${'Edit'}
                    @click=${() => this._toggleEdit(index)}
                >
                    <ha-svg-icon .path=${MDI_PENCIL}></ha-svg-icon>
                </ha-icon-button>
                <ha-icon-button
                    .label=${'Remove'}
                    @click=${() => this._removeBadge(index)}
                >
                    <ha-svg-icon .path=${MDI_DELETE}></ha-svg-icon>
                </ha-icon-button>
            </div>
            ${editing
                ? html`
                      <div class="badge-form">
                          <ha-form
                              .hass=${this.hass}
                              .data=${badge}
                              .schema=${BADGE_SCHEMA}
                              .computeLabel=${this._computeLabel}
                              @value-changed=${(ev: CustomEvent) =>
                                  this._badgeValueChanged(ev, index)}
                          ></ha-form>
                      </div>
                  `
                : nothing}
        `;
    }

    private _computeLabel = (schema: { name: string }): string =>
        BADGE_LABELS[schema.name] ?? schema.name;

    private _toggleEdit(index: number): void {
        this._editingIndex = this._editingIndex === index ? null : index;
    }

    private _removeBadge(index: number): void {
        if (this._editingIndex === index) {
            this._editingIndex = null;
        } else if (this._editingIndex !== null && this._editingIndex > index) {
            this._editingIndex--;
        }
        const updated = [...this.badges];
        updated.splice(index, 1);
        this._emitBadgesChanged(updated);
    }

    private _addBadge(): void {
        const stub: BadgeConfig = { type: 'entity', entity: '' };
        const updated = [...(this.badges ?? []), stub];
        this._editingIndex = updated.length - 1;
        this._emitBadgesChanged(updated);
    }

    private _badgeValueChanged(ev: CustomEvent, index: number): void {
        ev.stopPropagation();
        const updated = [...this.badges];
        updated[index] = { ...this.badges[index], ...ev.detail.value };
        this._emitBadgesChanged(updated);
    }

    private _emitBadgesChanged(badges: BadgeConfig[]): void {
        this.dispatchEvent(
            new CustomEvent('badges-changed', {
                bubbles: true,
                composed: true,
                detail: { badges },
            })
        );
    }
}

if (!customElements.get('ll-strategy-badge-list-editor')) {
    customElements.define('ll-strategy-badge-list-editor', BadgeListEditor);
}
