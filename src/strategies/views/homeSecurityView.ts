/**
 * `custom:home-security` view strategy →
 * element `ll-strategy-view-home-security`.
 *
 * Generates the Security subview (alarm panels, locks, security covers, security
 * binary_sensors, and cameras grouped by area). Delegates to the pure
 * buildSecurityView builder.
 */

import { buildSecurityView } from '../builders/subviews/securityView.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-security', async (_config, hass) => buildSecurityView(hass));
