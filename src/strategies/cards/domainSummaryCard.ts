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

        const { domain, label, icon, color } = this._config;
        const subtitle = computeDomainSummary(domain, this.hass);

        // State-driven coloring: the accent color shows only while the domain is
        // active (e.g. a light is on); otherwise the icon uses the default
        // (greyed) state color. See domainHasActivity.
        const active = domainHasActivity(domain, this.hass);
        const iconStyle = active && color ? `color: ${color}` : nothing;

        return html`
            <ha-card
                role="button"
                tabindex="0"
                @click=${this._navigate}
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

    /** HA navigation convention: push history then fire `location-changed`. */
    private _navigate = (): void => {
        const path = this._config?.navigation_path;
        if (!path) return;
        history.pushState(null, '', path);
        this.dispatchEvent(
            new CustomEvent('location-changed', {
                bubbles: true,
                composed: true,
                detail: { replace: false },
            })
        );
    };

    private _handleKeydown = (ev: KeyboardEvent): void => {
        if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            this._navigate();
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
