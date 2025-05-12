import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export const bzUpdateCityDetailsEventName = 'bz-update-city-details';
class bzUpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(bzUpdateCityDetailsEventName, { bubbles: false });
    }
}
const bzNameSort = (a, b) => {
    const aname = Locale.compose(a).toUpperCase();
    const bname = Locale.compose(b).toUpperCase();
    return aname.localeCompare(bname);
}
function getReligionInfo(id) {
    // find a matching player religion, to get custom names
    const info = GameInfo.Religions.lookup(id);
    if (!info) return null;
    // find custom religion name, if any
    const customName = (info) => {
        for (const founder of Players.getEverAlive()) {
            if (founder.Religion?.getReligionType() != id) continue;
            return founder.Religion.getReligionName();
        }
        return info.Name;
    }
    const name = customName(info);
    const icon = info.ReligionType;
    return { name, icon, info, };
}
class bzCityDetailsModel {
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        // overview
        this.growth = null;
        this.connections = null;
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
        this.growth = null;
        this.connections = null;
        // notifications
        this.onUpdate?.(this);
        window.dispatchEvent(new bzUpdateCityDetailsEvent());
    }
    updateOverview(city) {
        this.growth = this.modelGrowth(city);
        this.connections = this.modelConnections(city);
    }
    modelGrowth(city) {
        // TODO: total population
        // food
        const isGrowing = city.Growth?.growthType == GrowthTypes.EXPAND;
        const current = city.Growth?.currentFood ?? -1;
        const threshold = city.Growth?.getNextGrowthFoodThreshold().value ?? -1;
        const net = city.Yields.getNetYield(YieldTypes.YIELD_FOOD);
        const turns = city.Growth?.turnsUntilGrowth ?? -1;
        const food = { isGrowing, current, threshold, net, turns, };
        // population
        const isTown = city.isTown;
        const total = city.population ?? 0;
        const urban = city.urbanPopulation ?? 0;
        const rural = city.ruralPopulation ?? 0;
        const specialists = city.Workers.getNumWorkers(false) ?? 0;
        const pop = { isTown, total, urban, rural, specialists, };
        // religion
        const religion = { majority: null, urban: null, rural: null, };
        if (city.Religion) {
            const info = city.Religion;
            religion.majority = getReligionInfo(info.majorityReligion);
            religion.urban = getReligionInfo(info.urbanReligion);
            religion.rural = getReligionInfo(info.ruralReligion);
        }
        return { food, pop, religion, };
    }
    modelConnections(city) {
        const ids = city.getConnectedCities() ?? [];
        let settlements = [];
        for (const id of ids) {
            const conn = Cities.get(id);
            // ignore stale connections
            if (conn) settlements.push(conn);
        }
        settlements.sort((a, b) => bzNameSort(a.name, b.name));
        let cities = [];
        let towns = [];
        let focused = [];
        let growing = [];
        for (const conn of settlements) {
            if (conn.isTown) {
                towns.push(conn);
                if (conn.Growth?.growthType == GrowthTypes.EXPAND) {
                    growing.push(conn);
                } else {
                    focused.push(conn);
                }
            } else {
                cities.push(conn);
            }
        }
        return { settlements, cities, towns, focused, growing, };
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
