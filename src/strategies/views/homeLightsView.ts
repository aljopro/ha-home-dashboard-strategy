/**
 * `custom:home-lights` view strategy → element `ll-strategy-view-home-lights`.
 *
 * Generates the Lights subview (all lights + light-like switches grouped by
 * area). Delegates to the pure buildLightsView builder.
 */

import { buildLightsView } from '../builders/lightsView.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-lights', async (_config, hass) => buildLightsView(hass));
