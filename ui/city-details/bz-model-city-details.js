import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export const bzUpdateCityDetailsEventName = 'bz-update-city-details';
class bzUpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(bzUpdateCityDetailsEventName, { bubbles: false });
    }
}

// TODO: clean up all console debug junk
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
            const selectedCityID = UI.Player.getHeadSelectedCity();
            if (!selectedCityID || ComponentID.isInvalid(selectedCityID)) {
                this.reset();
                return;
            }
            const city = Cities.get(selectedCityID);
            if (!city) {
                console.error(`TRIX: Failed to get city=${selectedCityID}`);
                return;
            }
            this.updateOverview(city);
            // notifications
            this.onUpdate?.(this);
            window.dispatchEvent(new bzUpdateCityDetailsEvent());
        });
        this.updateGate.call('constructor');
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
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
        const ids = city?.getConnectedCities();
        const total = ids?.length;
        if (!total) return null;
        const connections = ids.map(id => Cities.get(id));
        const cities = [];
        const towns = [];
        for (const connection of connections) {
            if (connection.isTown) towns.push(connection);
            else cities.push(connection);
        }
        this.connectedCities = cities;
        this.connectedTowns = towns;
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
                item.population = ctype.Population;
                console.warn(`TRIX item=${JSON.stringify(item)}`);
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
