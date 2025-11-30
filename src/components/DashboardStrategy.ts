export class DashboardStrategy {
    private name: string;

    constructor(name = 'default') {
        this.name = name;
    }

    start() {
        console.log(`DashboardStrategy(${this.name}): start`);
    }

    stop() {
        console.log(`DashboardStrategy(${this.name}): stop`);
    }
}
