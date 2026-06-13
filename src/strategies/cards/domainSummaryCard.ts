/**
 * `ll-domain-summary-card` — our own LitElement summary card.
 *
 * Replaces HA's internal `home-summary` card type (which is not public API).
 * Renders a domain's aggregate state (icon + bold label + subtitle) and
 * navigates to one of our own subviews on tap. The aggregate string is computed
 * from `hass.states` at render time by the pure `computeDomainSummary` helper.
 *
 * No experimental decorators (see docs/UI_and_Lit_Standards.md §1.1): reactive
 * members are declared via the static `properties` getter and `declare`d fields.
 * Registration is guarded (§2). Styling consumes HA theme tokens only (§3).
 */

import { LitElement, html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import type { DomainSummaryCard as DomainSummaryCardConfig, HomeAssistant } from '../../types/cards.js';
import { computeDomainSummary, domainHasActivity, summaryDomains } from './domainSummary.js';
import { weatherSummaryText } from '../builders/home/weatherCard.js';

export class DomainSummaryCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        _config: { state: true },
    };

    // `declare` so TS emits no class field that would shadow Lit's reactive
    // accessor (see UI_and_Lit_Standards §1.1 / §4.1).
    declare hass: HomeAssistant;
    declare private _config: DomainSummaryCardConfig;

    /** Lovelace calls this with the card config; validate and store it. */
    setConfig(config: DomainSummaryCardConfig): void {
        if (!config || !config.domain) {
            throw new Error('ll-domain-summary-card: "domain" is required');
        }
        this._config = config;
    }

    /** Stub config used by the card picker / preview. */
    static getStubConfig(): Partial<DomainSummaryCardConfig> {
        return { domain: 'light', label: 'Lights', icon: 'mdi:lightbulb-group' };
    }

    /**
     * Gate re-renders to ticks where an entity this card actually summarizes
     * changed. HA swaps a state's object reference only when that entity changes,
     * so reference inequality is a correct and cheap test (§4.3).
     */
    protected shouldUpdate(changed: PropertyValues): boolean {
        if (changed.has('_config')) return true;
        if (changed.has('hass')) {
            const old = changed.get('hass') as HomeAssistant | undefined;
            if (!old || !this._config) return true;
            const domains = new Set(summaryDomains(this._config.domain));
            const oldStates = old.states ?? {};
            const newStates = this.hass.states ?? {};
            const ids = new Set([...Object.keys(oldStates), ...Object.keys(newStates)]);
            for (const id of ids) {
                if (!domains.has(id.split('.')[0])) continue;
                if (oldStates[id] !== newStates[id]) return true;
            }
            return false;
        }
        return true;
    }

    protected render() {
        if (!this._config || !this.hass) return nothing;

        const { domain, entity, label, icon, color } = this._config;

        // Entity mode (Weather): subtitle comes from the single entity and there
        // is no domain "activity" coloring. Domain mode: aggregate + accent color
        // while active (e.g. a light is on); otherwise the default state color.
        const subtitle = entity
            ? weatherSummaryText(this.hass, entity)
            : computeDomainSummary(domain, this.hass);
        const active = entity ? false : domainHasActivity(domain, this.hass);
        const iconStyle = active && color ? `color: ${color}` : nothing;

        return html`
            <ha-card
                role="button"
                tabindex="0"
                @click=${this._handleTap}
                @keydown=${this._handleKeydown}
            >
                <div class="row">
                    ${icon
                        ? html`<ha-icon class="icon" .icon=${icon} style=${iconStyle}></ha-icon>`
                        : nothing}
                    <div class="text">
                        <span class="title">${label ?? domain}</span>
                        <span class="subtitle">${subtitle}</span>
                    </div>
                </div>
            </ha-card>
        `;
    }

    /**
     * Resolve the tap behaviour. `tap_action` (more-info / navigate / url) wins;
     * otherwise a `navigation_path` navigates (domain summary cards); otherwise,
     * for an entity card (Weather), the default is the entity's more-info.
     */
    private _handleTap = (): void => {
        const action = this._config?.tap_action;
        if (action) {
            switch (action.action) {
                case 'none':
                    return;
                case 'url':
                    if (action.url) window.open(action.url);
                    return;
                case 'navigate':
                    if (action.navigation_path) this._navigateTo(action.navigation_path);
                    return;
                case 'more-info':
                    if (this._config?.entity) this._fireMoreInfo(this._config.entity);
                    return;
            }
        }
        if (this._config?.navigation_path) {
            this._navigateTo(this._config.navigation_path);
        } else if (this._config?.entity) {
            this._fireMoreInfo(this._config.entity);
        }
    };

    /** HA navigation convention: push history then fire `location-changed`. */
    private _navigateTo(path: string): void {
        history.pushState(null, '', path);
        this.dispatchEvent(
            new CustomEvent('location-changed', {
                bubbles: true,
                composed: true,
                detail: { replace: false },
            })
        );
    }

    /** HA convention: open the entity's more-info dialog. */
    private _fireMoreInfo(entityId: string): void {
        this.dispatchEvent(
            new CustomEvent('hass-more-info', {
                bubbles: true,
                composed: true,
                detail: { entityId },
            })
        );
    }

    private _handleKeydown = (ev: KeyboardEvent): void => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            this._handleTap();
        }
    };

    static styles = css`
        ha-card {
            cursor: pointer;
            padding: 12px 16px;
            outline: none;
        }
        ha-card:focus-visible {
            box-shadow: 0 0 0 2px var(--primary-color, #03a9f4);
        }
        .row {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .icon {
            color: var(--state-icon-color, var(--primary-text-color, #212121));
            --mdc-icon-size: 24px;
            flex: 0 0 auto;
        }
        .text {
            display: flex;
            flex-direction: column;
            min-width: 0;
        }
        .title {
            font-weight: 600;
            color: var(--primary-text-color, #212121);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .subtitle {
            font-size: 0.875rem;
            color: var(--secondary-text-color, #727272);
        }
    `;
}

if (!customElements.get('ll-domain-summary-card')) {
    customElements.define('ll-domain-summary-card', DomainSummaryCard as unknown as CustomElementConstructor);
}
