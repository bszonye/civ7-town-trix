import CityDetails from '/base-standard/ui/city-details/model-city-details.js';
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
        this.improvements = null;
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
        this.improvements = null;
        // notifications
        this.onUpdate?.(this);
        window.dispatchEvent(new bzUpdateCityDetailsEvent());
    }
    updateOverview(city) {
        this.growth = this.modelGrowth(city);
        this.connections = this.modelConnections(city);
        this.improvements = this.modelImprovements(city);
    }
    modelGrowth(city) {
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
        // convert to city objects and weed out broken connections
        const settlements = ids.map(id => Cities.get(id)).filter(e => e);
        settlements.sort((a, b) => bzNameSort(a.name, b.name));
        const cities = [];
        const towns = [];
        const focused = [];
        const growing = [];
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
    modelImprovements(city) {
        const imps = {};
        const ids = city.Constructibles?.getIds() ?? [];
        for (const id of ids) {
            const item = Constructibles.getByComponentID(id);
            const cinfo = item && GameInfo.Constructibles.lookup(item.type);
            if (cinfo?.ConstructibleClass != "IMPROVEMENT") continue;
            const loc = item.location;
            const fcid = Districts.getFreeConstructible(loc, GameContext.localPlayerID);
            const fcinfo = GameInfo.Constructibles.lookup(fcid);
            const name = fcinfo.Name;
            const icon = fcinfo.ConstructibleType;
            // group all improvements with the same localized name
            // (like IMPROVEMENT_EXPEDITION_BASE & IMPROVEMENT_MOUNTAIN)
            const key = Locale.compose(fcinfo.Name);
            imps[key] ??= { name, icon, count: 0, };
            imps[key].count += 1;
        }
        const sorted = Object.values(imps);
        sorted.sort((a, b) => bzNameSort(a.name, b.name));
        return sorted;
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

// patch CityDetailsModel.addYieldSteps
const CDproto = Object.getPrototypeOf(CityDetails);
CDproto.addYieldSteps = function(baseYield, steps, yieldDefinition, isModifier) {
    for (const step of steps) {
        if (step.description) {
            const yieldData = {
                name: step.description,
                value: isModifier ? (0.01 * step.value * this.baseYieldValue) : step.value,
                children: []
            };
            if (this.baseYieldValue == 0 && step.base) {
                this.baseYieldValue = step.base.value;
            }
            this.setYieldAndGetIcon(yieldData, step, yieldDefinition);
            if (step.base && step.base.steps && step.base.steps.length > 0) {
                this.addYieldSteps(yieldData, step.base.steps, yieldDefinition, false);
            }
            baseYield.children.push(yieldData);
            // Are there any percentage based yield incomes (modifiers)
            // applied to the base income that we need to show?
            if (step.modifier && step.modifier.steps && step.modifier.steps.length > 0) {
                this.addYieldSteps(yieldData, step.modifier.steps, yieldDefinition, true);
            }
        }
        else if (step.steps && step.steps.length > 0) {
            if (step.steps[0].description && step.steps[0].id == step.id) {
                // Leader abilities are nested, where the actual yield value
                // is in the base step, and its correct description is in
                // the first step of the step
                const yieldData = {
                    name: step.steps[0].description,
                    value: step.value,
                    children: []
                };
                baseYield.children.push(yieldData);
            } else {
                this.addYieldSteps(baseYield, step.steps, yieldDefinition, false);
            }
        }
    }
}
