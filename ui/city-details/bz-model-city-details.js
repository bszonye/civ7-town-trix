import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export const bzUpdateCityDetailsEventName = 'bz-update-city-details';
class bzUpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(bzUpdateCityDetailsEventName, { bubbles: false });
    }
}
class bzCityDetailsModel {
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        // overview
        this.pendingCitizens = 0;
        this.ruralCitizens = 0;
        this.urbanCitizens = 0;
        this.specialistCitizens = 0;
        this.totalCitizens = 0;
        this.connectedCities = [];
        this.connectedTowns = [];
        // update callback
        this.updateGate = new UpdateGate(() => {
            const cityID = UI.Player.getHeadSelectedCity();
            if (!cityID || ComponentID.isInvalid(cityID)) {
                this.reset();
                return;
            }
            const city = Cities.get(cityID);
            if (!city) {
                console.error(`bz-city-details-model: Failed to get city=${cityID}`);
                return;
            }
            this.updateOverview(city);
            // notifications
            this.onUpdate?.(this);
            window.dispatchEvent(new bzUpdateCityDetailsEvent());
        });
        this.updateGate.call('constructor');
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
        engine.on('CityPopulationChanged', this.onCityPopulationchanged, this);
    }
    onCityPopulationchanged() {
        this.updateGate.call('onCityPopulationChanged');
    }
    onCitySelectionChanged() {
        this.updateGate.call('onCitySelectionChanged');
    }
    reset() {
        // overview
        this.pendingCitizens = 0;
        this.ruralCitizens = 0;
        this.urbanCitizens = 0;
        this.specialistCitizens = 0;
        this.totalCitizens = 0;
        this.connectedCities = [];
        this.connectedTowns = [];
        // notifications
        this.onUpdate?.(this);
        window.dispatchEvent(new bzUpdateCityDetailsEvent());
    }
    setConnections(city) {
        this.connectedCities = [];
        this.connectedTowns = [];
        const ids = city?.getConnectedCities();
        if (!ids) return;
        for (const id of ids) {
            const conn = Cities.get(id);
            if (!conn) {
                console.warn(`bz-model-city-details: stale connection=${JSON.stringify(id)}`);
            } else if (conn.isTown) {
                this.connectedTowns.push(conn);
            } else {
                this.connectedCities.push(conn);
            }
        }
    }
    updateOverview(city) {
        // population
        this.pendingCitizens = city.pendingPopulation;
        this.ruralCitizens = city.ruralPopulation - city.pendingPopulation;
        this.urbanCitizens = city.urbanPopulation;
        this.specialistCitizens = city.population - city.urbanPopulation - city.ruralPopulation;
        this.totalCitizens = city.population;
        // connected settlements
        this.setConnections(city);
    }
    sortConstructibles(buildings, improvements, wonders) {
        // sort buildings by population (walls last)
        for (const district of buildings) {
            // add the population data
            const data = district.constructibleData;
            for (const item of data) {
                if ('population' in item) continue;
                const ctype = GameInfo.Constructibles.lookup(item.type);
                item.population = ctype?.Population ?? 0;
            }
            data.sort((a, b) => b.population - a.population);
        }
        // sort improvements and wonders by name
        improvements.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
        wonders.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
    }
}
const bzCityDetails = new bzCityDetailsModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(bzCityDetails);
    };
    engine.createJSModel('g_bzCityDetails', bzCityDetails);
    bzCityDetails.updateCallback = updateModel;
});
export { bzCityDetails as default };
