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
        // constructibles
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
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
            this.updateConstructibles(city);
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
        // constructibles
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
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
    updateConstructibles(city) {
        // Building Breakdown
        const constructibles = city.Constructibles;
        if (!constructibles) {
            console.error(`model-city-details: Failed to get city.Constructibles for ID ${city.id}`);
            return;
        }
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
        for (const constructibleID of constructibles.getIds()) {
            const constructible = Constructibles.getByComponentID(constructibleID);
            if (!constructible) {
                return;
            }
            const constructibleDefinition = GameInfo.Constructibles.lookup(constructible.type);
            if (!constructibleDefinition) {
                return;
            }
            const constructibleData = {
                id: constructibleID,
                location: constructible.location,
                type: constructibleDefinition.ConstructibleType,
                name: constructibleDefinition.Name,
                population: constructibleDefinition.Population,
                damaged: constructible.damaged,
                icon: constructibleDefinition.ConstructibleType,
                iconContext: constructibleDefinition.ConstructibleClass
            };
            const maintenances = constructibles.getMaintenance(constructibleDefinition.ConstructibleType);
            for (const index in maintenances) {
                const maintenanceValue = maintenances[index];
                if (maintenanceValue > 0) {
                    if (!constructibleData.maintenanceMap) {
                        constructibleData.maintenanceMap = new Map();
                    }
                    const yieldDefinition = GameInfo.Yields[index];
                    const maintenanceYieldData = {
                        name: yieldDefinition.Name,
                        value: -maintenanceValue,
                        icon: yieldDefinition.YieldType,
                        iconContext: "YIELD",
                    };
                    constructibleData.maintenanceMap.set(yieldDefinition.YieldType, maintenanceYieldData);
                }
            }
            switch (constructibleDefinition.ConstructibleClass) {
                case "BUILDING": {
                    // Look for existing district data at this constructibles location
                    let districtData = this.buildings.find((data) => {
                        return data.location.x == constructible.location.x && data.location.y == constructible.location.y;
                    });
                    if (districtData) {
                        // Add to existing data if found
                        districtData.constructibleData.push(constructibleData);
                        this.updateUniqueQuarterData(districtData);
                    }
                    else {
                        // Create new entry if none found
                        districtData = {
                            location: constructible.location,
                            constructibleData: [constructibleData]
                        };
                        this.updateUniqueQuarterData(districtData);
                        this.buildings.push(districtData);
                    }
                    break;
                }
                case "IMPROVEMENT":
                    this.improvements.push(constructibleData);
                    break;
                case "WONDER":
                    this.wonders.push(constructibleData);
                    break;
                default:
                    console.error(`model-city-details: Failed to add ${constructibleDefinition.Name} of class ${constructibleDefinition.ConstructibleClass} to constructible lists!`);
            }
        }
        // sort buildings by population (walls last)
        // TODO: move this to the the bz-model
        for (const district of this.buildings) {
            district.constructibleData.sort((a, b) =>
                b.population - a.population);
        }
        // sort improvements and wonders by name
        this.improvements.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
        this.wonders.sort((a, b) =>
            Locale.compose(a.name ?? '').localeCompare(Locale.compose(b.name ?? '')));
        // Yields Breakdown
        this.yields = [];
        const yields = city.Yields.getYields();
        if (yields != null) {
            yields.forEach((y, i) => {
                const yieldInfo = GameInfo.Yields[i];
                if (yieldInfo) {
                    // Locale.plainText(string) is used here to remove the embedded font icon from the yield text
                    const topYieldData = {
                        name: Locale.plainText(yieldInfo.Name),
                        value: y.value,
                        icon: yieldInfo.YieldType,
                        iconContext: "YIELD",
                        children: []
                    };
                    if (y.base.steps?.length) {
                        this.addYieldSteps(topYieldData, y.base.steps, yieldInfo);
                    }
                    this.yields.push(topYieldData);
                }
            });
        }
    }
    updateUniqueQuarterData(districtData) {
        const uniqueQuarterDefinition = this.getUniqueQuarterDefinition();
        if (!uniqueQuarterDefinition) {
            // No unique quarter for this Civilization
            return;
        }
        let isBuildingType1Complete = false;
        for (const constructibleData of districtData.constructibleData) {
            if (constructibleData.type == uniqueQuarterDefinition.BuildingType1) {
                isBuildingType1Complete = true;
            }
        }
        let isBuildingType2Complete = false;
        for (const constructibleData of districtData.constructibleData) {
            if (constructibleData.type == uniqueQuarterDefinition.BuildingType2) {
                isBuildingType2Complete = true;
            }
        }
        if (isBuildingType1Complete && isBuildingType2Complete) {
            // Has both buildings. Show bonus!
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.stylize(uniqueQuarterDefinition.Description);
            return;
        }
        else if (isBuildingType1Complete) {
            // Has building 1. Recommend building 2.
            const buildingDefinition = GameInfo.Constructibles.lookup(uniqueQuarterDefinition.BuildingType2);
            if (!buildingDefinition) {
                console.error(`model-city-details: Failed to find definition for unique building 2 ${uniqueQuarterDefinition.BuildingType2}`);
                return;
            }
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.compose("LOC_UI_CITY_DETAILS_UNIQUE_QUARTER_NEEDS", buildingDefinition.Name);
            return;
        }
        else if (isBuildingType2Complete) {
            // Has building 2. Recommend building 1.
            const buildingDefinition = GameInfo.Constructibles.lookup(uniqueQuarterDefinition.BuildingType1);
            if (!buildingDefinition) {
                console.error(`model-city-details: Failed to find definition for unique building 1 ${uniqueQuarterDefinition.BuildingType1}`);
                return;
            }
            districtData.name = Locale.compose(uniqueQuarterDefinition.Name);
            districtData.description = Locale.compose("LOC_UI_CITY_DETAILS_UNIQUE_QUARTER_NEEDS", buildingDefinition.Name);
            return;
        }
        // Has no buildling that could potentially make this a unique quarter
        districtData.name = undefined;
        districtData.description = undefined;
        return;
    }
    getUniqueQuarterDefinition() {
        // TODO: find unique quarters from previous ages?
        const localPlayer = Players.get(GameContext.localPlayerID);
        if (!localPlayer) {
            console.error(`model-city-details: getUniqueQuarterDefinition() failed to find localPlayerID ${GameContext.localPlayerID}`);
            return;
        }
        const civilizationDefinition = GameInfo.Civilizations.lookup(localPlayer.civilizationType);
        if (!civilizationDefinition) {
            console.error(`model-city-details: getUniqueQuarterDefinition() failed to find Civilization ${localPlayer.civilizationType}`);
            return;
        }
        const civTraitDefinitions = GameInfo.CivilizationTraits.filter(definition => definition.CivilizationType == civilizationDefinition.CivilizationType);
        const uniqueQuarterDefinition = GameInfo.UniqueQuarters.find((quarterDefinition) => {
            if (civTraitDefinitions.find((traitDefinition) => {
                return quarterDefinition.TraitType == traitDefinition.TraitType;
            })) {
                return true;
            }
            return false;
        });
        return uniqueQuarterDefinition;
    }
    addYieldSteps(baseYield, steps, yieldDefinition) {
        for (const step of steps) {
            if (step.description) {
                const yieldData = {
                    name: step.description,
                    value: step.value,
                    children: []
                };
                this.setYieldAndGetIcon(yieldData, step, yieldDefinition);
                if (step.base && step.base.steps && step.base.steps.length > 0) {
                    this.addYieldSteps(yieldData, step.base.steps, yieldDefinition);
                }
                baseYield.children.push(yieldData);
            }
            else if (step.steps && step.steps.length > 0) {
                this.addYieldSteps(baseYield, step.steps, yieldDefinition);
            }
        }
    }
    setYieldAndGetIcon(yieldData, step, yieldDefinition) {
        // Check if we match any existing buildings, improvement, or wonders
        let buildingData = null;
        for (const data of this.buildings) {
            for (const constructibleData of data.constructibleData) {
                if (constructibleData.id.id == step.id) {
                    buildingData = constructibleData;
                }
            }
        }
        if (buildingData) {
            this.addYieldAndGetIconForConstructible(yieldData, buildingData, step, yieldDefinition);
            return;
        }
        const improvementData = this.improvements.find((data) => {
            return data.id.id == step.id;
        });
        if (improvementData) {
            this.addYieldAndGetIconForConstructible(yieldData, improvementData, step, yieldDefinition);
            return;
        }
        const wonderData = this.wonders.find((data) => {
            return data.id.id == step.id;
        });
        if (wonderData) {
            this.addYieldAndGetIconForConstructible(yieldData, wonderData, step, yieldDefinition);
            return;
        }
    }
    addYieldAndGetIconForConstructible(yieldData, constructibleData, step, yieldDefinition) {
        // Add to yield map
        if (!constructibleData.yieldMap) {
            constructibleData.yieldMap = new Map();
        }
        const currentValue = constructibleData.yieldMap.get(yieldDefinition.YieldType);
        if (currentValue == undefined) {
            // Adding this yield type for the first time
            const constructibleYieldData = {
                name: yieldData.name,
                value: step.value,
                icon: yieldDefinition.YieldType,
                iconContext: "YIELD",
            };
            constructibleData.yieldMap.set(yieldDefinition.YieldType, constructibleYieldData);
        }
        else {
            // Combine existing and previous yield value
            currentValue.value += step.value;
            constructibleData.yieldMap.set(yieldDefinition.YieldType, currentValue);
        }
        // Set icon
        yieldData.icon = constructibleData.icon;
        yieldData.iconContext = constructibleData.iconContext;
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
