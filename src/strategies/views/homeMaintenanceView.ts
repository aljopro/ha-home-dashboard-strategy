/**
 * `custom:home-maintenance` view strategy →
 * element `ll-strategy-view-home-maintenance`.
 *
 * Generates the Maintenance subview (pending updates, low battery, and
 * unavailable battery entities). Delegates to the pure buildMaintenanceView
 * builder.
 */

import { buildMaintenanceView } from '../builders/subviews/maintenanceView.js';
import { registerViewStrategy } from './registerViewStrategy.js';

registerViewStrategy('home-maintenance', async (_config, hass) => buildMaintenanceView(hass));
