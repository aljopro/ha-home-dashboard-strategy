import { install } from './index';

// Development entry that attaches to window for quick testing
(async () => {
    // @ts-ignore - easy dev harness
    const hass = (window as any).hass || null;
    console.log('ha-dashboard-strategy: dev harness installing');
    install(hass);
})();
