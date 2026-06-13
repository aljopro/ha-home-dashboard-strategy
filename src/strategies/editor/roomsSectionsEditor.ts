/**
 * Graphical configuration editor for the rooms-sections dashboard strategy.
 *
 * Returned by `RoomsSectionsStrategy.getConfigElement()` and shown by Home
 * Assistant in the dashboard settings dialog. It is a schema-driven `<ha-form>`
 * (v1): the reorderable Summaries editor is deferred (see
 * docs/UI_and_Lit_Standards.md and memory: visual-config-editor-spec).
 *
 * No TypeScript experimental decorators are used — reactive members are declared
 * via the static `properties` getter and `declare`d fields (see
 * docs/UI_and_Lit_Standards.md §1.1).
 */

import { LitElement, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import type { DashboardStrategyConfig, HomeAssistant } from '../../types/cards.js';
import { normalizeBadges } from './badgeListEditor.js';
import type { BadgeConfig } from './badgeListEditor.js';

// Side-effect import: registers ll-strategy-badge-list-editor.
import './badgeListEditor.js';

/**
 * `<ha-form>` schema. `ha-form` and its selectors are core HA elements that only
 * exist at runtime inside Home Assistant — they are intentionally not imported
 * (and do not upgrade under jsdom). The editor's *logic* is tested separately.
 */
// Badges are managed by the BadgeListEditor above the form; they are not
// included here so ha-form does not clobber them on value-changed.
const SCHEMA = [
    {
        name: 'header',
        type: 'expandable',
        schema: [
            { name: 'show', selector: { boolean: {} } },
            { name: 'title', selector: { text: {} } },
        ],
    },
    { name: 'favorite_entities', selector: { entity: { multiple: true } } },
    { name: 'suggested', selector: { boolean: {} } },
    { name: 'excluded_entities', selector: { entity: { multiple: true } } },
    {
        name: 'weather',
        type: 'expandable',
        schema: [
            { name: 'entity', selector: { entity: { filter: { domain: 'weather' } } } },
            // `ui_action` selector renders HA's action editor: a dropdown to pick
            // the tap behaviour, with the matching field shown per mode —
            // more-info (open the weather entity view), navigate (dashboard/view
            // picker), or url (external link). Stored as a full tap_action object.
            { name: 'tap_action', selector: { ui_action: { actions: ['more-info', 'navigate', 'url'] } } },
        ],
    },
] as const;

const LABELS: Record<string, string> = {
    header: 'Header',
    show: 'Show header',
    title: 'Header title',
    favorite_entities: 'Favorite entities',
    suggested: 'Suggested entities',
    excluded_entities: 'Excluded entities',
    weather: 'Weather',
    entity: 'Weather entity',
    tap_action: 'On tap',
};

export class RoomsSectionsEditor extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
    };

    // `declare` so TypeScript emits no class field that would shadow the reactive
    // accessor Lit installs from `static properties`.
    declare hass?: HomeAssistant;
    declare private _config?: DashboardStrategyConfig;

    /** Home Assistant calls this on setup with the current strategy config. */
    setConfig(config: DashboardStrategyConfig): void {
        // ha-form's entity multi-picker renders as a list only when the field
        // value is an array (even an empty one). undefined causes it to fall back
        // to a single-picker appearance, so we always initialise these to [].
        //
        // Badges are normalised to BadgeConfig objects so the BadgeListEditor can
        // display and edit each badge's full set of properties. Plain entity_id
        // strings become { type: 'entity', entity }; rich objects pass through
        // with `type` defaulted to 'entity'. This preserves tap_action and other
        // hand-authored properties across editor round-trips.
        const badges: BadgeConfig[] = normalizeBadges(config.badges ?? []);

        this._config = {
            ...config,
            favorite_entities: config.favorite_entities ?? [],
            excluded_entities: config.excluded_entities ?? [],
            badges,
        };
    }

    render(): TemplateResult | typeof nothing {
        if (!this._config) return nothing;

        return html`
            <ll-strategy-badge-list-editor
                .hass=${this.hass}
                .badges=${(this._config.badges ?? []) as BadgeConfig[]}
                @badges-changed=${this._badgesChanged}
            ></ll-strategy-badge-list-editor>
            <ha-form
                .hass=${this.hass}
                .data=${this._config}
                .schema=${SCHEMA}
                .computeLabel=${this._computeLabel}
                @value-changed=${this._valueChanged}
            ></ha-form>
        `;
    }

    private _badgesChanged = (ev: CustomEvent): void => {
        ev.stopPropagation();
        const config: DashboardStrategyConfig = {
            ...(this._config ?? ({ type: '' } as DashboardStrategyConfig)),
            badges: ev.detail.badges as BadgeConfig[],
        };
        this._config = config;
        this.dispatchEvent(
            new CustomEvent('config-changed', {
                bubbles: true,
                composed: true,
                detail: { config },
            })
        );
    };

    private _computeLabel = (schema: { name: string }): string => LABELS[schema.name] ?? schema.name;

    private _valueChanged = (ev: CustomEvent): void => {
        ev.stopPropagation();
        // ha-form emits the full edited data object. Badges are excluded from the
        // schema and managed by BadgeListEditor; preserve the current badge array
        // so ha-form cannot inadvertently clobber it.
        const { badges: _ignored, ...formValue } = ev.detail.value as Record<string, unknown>;
        const config: DashboardStrategyConfig = {
            ...(this._config ?? ({ type: '' } as DashboardStrategyConfig)),
            ...formValue,
            badges: this._config?.badges,
        };
        this._config = config;

        this.dispatchEvent(
            new CustomEvent('config-changed', {
                bubbles: true,
                composed: true,
                detail: { config },
            })
        );
    };
}

if (!customElements.get('ll-strategy-editor-rooms-sections')) {
    customElements.define('ll-strategy-editor-rooms-sections', RoomsSectionsEditor);
}
