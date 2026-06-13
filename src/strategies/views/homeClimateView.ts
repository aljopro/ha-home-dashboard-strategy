/**
 * `custom:home-climate` view strategy → element `ll-strategy-view-home-climate`.
 *
 * Generates the Climate subview (all climate entities grouped by area).
 * Delegates to the pure buildClimateView builder.
 */

import { buildClimateView } from '../builders/subviews/climateView.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-climate', async (_config, hass) => buildClimateView(hass));
