/**
 * @file model-city-details.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Data model for Detailed break down of a cities status
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
export const UpdateCityDetailsEventName = 'update-city-details';
class UpdateCityDetailsEvent extends CustomEvent {
    constructor() {
        super(UpdateCityDetailsEventName, { bubbles: false });
    }
}
class CityDetailsModel {
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    constructor() {
        this.isTown = false;
        this.specialistPerTile = 0;
        this.currentCitizens = 0;
        this.turnsToNextCitizen = 0;
        this.hasTownFocus = false;
        this.happinessPerTurn = 0;
        this.hasUnrest = false;
        this.foodPerTurn = 0;
        this.foodToGrow = 0;
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
        this.yields = [];
        this.baseYieldValue = 0;
        this.isBeingRazed = false;
        this.getTurnsUntilRazed = -1;
        this.treasureFleetText = "";
        this.connectedSettlementFood = [];
        this.updateGate = new UpdateGate(() => {
            const selectedCityID = UI.Player.getHeadSelectedCity();
            if (!selectedCityID || ComponentID.isInvalid(selectedCityID)) {
                this.reset();
                return;
            }
            const city = Cities.get(selectedCityID);
            if (!city) {
                console.error(`model-city-details: Failed to get city for ID ${selectedCityID}`);
                return;
            }
            const cityResources = city.Resources;
            if (!cityResources) {
                console.error(`model-city-details: Failed to get city.Resources for ID ${selectedCityID}`);
                return;
            }
            this.isTown = city.isTown;
            // Citizen Growth
            this.currentCitizens = city.population;
            const cityYields = city.Yields;
            if (!cityYields) {
                console.error(`model-city-details: Failed to get city.Yields for ID ${selectedCityID}`);
                return;
            }
            this.foodPerTurn = cityYields.getNetYield(YieldTypes.YIELD_FOOD);
            const cityGrowth = city.Growth;
            if (cityGrowth) {
                this.turnsToNextCitizen = cityGrowth.turnsUntilGrowth;
                this.foodToGrow = cityGrowth.getNextGrowthFoodThreshold().value;
                if (this.isTown && cityGrowth.growthType != GrowthTypes.EXPAND) {
                    this.hasTownFocus = true;
                }
                else {
                    this.hasTownFocus = false;
                }
            }
            const cityHappiness = city.Happiness;
            if (cityHappiness) {
                this.happinessPerTurn = cityHappiness.netHappinessPerTurn;
                this.hasUnrest = cityHappiness.hasUnrest;
            }
            // Building Breakdown
            const cityWorkers = city.Workers;
            if (cityWorkers) {
                this.specialistPerTile = cityWorkers.getCityWorkerCap();
            }
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
                    case "BUILDING":
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
            // Yields Breakdown
            this.yields = [];
            const yields = cityYields.getYields();
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
                            this.addYieldSteps(topYieldData, y.base.steps, yieldInfo, false);
                            //Reset base yield value reference
                            this.baseYieldValue = 0;
                        }
                        this.yields.push(topYieldData);
                    }
                });
            }
            this.isBeingRazed = city.isBeingRazed;
            this.getTurnsUntilRazed = city.getTurnsUntilRazed;
            // Treasure Fleet Victory Information unique to Exploration Age and Distant Land settlements
            this.treasureFleetText = "";
            if (Game.age == Game.getHash("AGE_EXPLORATION") && city.isDistantLands) {
                const techPrereqMet = cityResources.isTreasureTechPrereqMet();
                const constructiblePrereqMet = cityResources.isTreasureConstructiblePrereqMet();
                const turnsTillNextTreasureFleet = cityResources.getTurnsUntilTreasureGenerated();
                if (!techPrereqMet) {
                    const techDefinition = GameInfo.ProgressionTreeNodes.lookup("NODE_TECH_EX_SHIPBUILDING");
                    if (techDefinition) {
                        this.treasureFleetText = Locale.compose("LOC_UI_CITY_DETAILS_TREASURE_FLEET_TECH_PREREQ_NEEDED", techDefinition?.Name);
                    }
                    else {
                        console.error("model-city-details: Failed to find Shipbuilding tech required for Treasure Fleets!");
                    }
                }
                else if (!constructiblePrereqMet) {
                    const constructibleDefinition = GameInfo.Constructibles.lookup("BUILDING_FISHING_QUAY");
                    if (constructibleDefinition) {
                        this.treasureFleetText = Locale.compose("LOC_UI_CITY_DETAILS_TREASURE_FLEET_CONSTRUCT_PREREQ_NEEDED", constructibleDefinition?.Name);
                    }
                    else {
                        console.error("model-city-details: Failed to find Fishing Quay constructible required for Treasure Fleets!");
                    }
                }
                else {
                    this.treasureFleetText = Locale.compose("LOC_UI_CITY_DETAILS_NEXT_TREASURE_FLEET_TURNS", turnsTillNextTreasureFleet);
                }
            }
            this.connectedSettlementFood = [];
            const sendingFoodData = this.buildSendingFoodData(city);
            if (sendingFoodData) {
                if (city.isTown) {
                    this.connectedSettlementFood.push({ name: city.name, amount: this.foodPerTurn });
                    for (const cityData of sendingFoodData) {
                        for (const townData of cityData.data) {
                            if (ComponentID.isMatch(townData.town.id, city.id)) {
                                this.connectedSettlementFood.push({ name: cityData.city.name, amount: -townData.amount });
                                this.foodPerTurn = 0;
                            }
                        }
                    }
                }
                else {
                    let foodFromSelectedCity = this.foodPerTurn;
                    const dataForCity = sendingFoodData.find(value => {
                        return ComponentID.isMatch(value.city.id, city.id);
                    });
                    if (dataForCity) {
                        for (const townData of dataForCity.data) {
                            this.connectedSettlementFood.push({ name: townData.town.name, amount: townData.amount });
                            foodFromSelectedCity -= townData.amount;
                        }
                    }
                    if (foodFromSelectedCity > 0) {
                        this.connectedSettlementFood.unshift({ name: city.name, amount: foodFromSelectedCity });
                    }
                }
            }
            this.onUpdate?.(this);
            window.dispatchEvent(new UpdateCityDetailsEvent());
        });
        this.updateGate.call('constructor');
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
        engine.on('CityGrowthModeChanged', this.onCityGrowthModeChanged, this);
    }
    onCitySelectionChanged() {
        this.updateGate.call('onCitySelectionChanged');
    }
    onCityGrowthModeChanged() {
        this.updateGate.call('onCityGrowthModeChanged');
    }
    reset() {
        this.specialistPerTile = 0;
        this.currentCitizens = 0;
        this.turnsToNextCitizen = 0;
        this.happinessPerTurn = 0;
        this.foodPerTurn = 0;
        this.foodToGrow = 0;
        this.buildings = [];
        this.improvements = [];
        this.wonders = [];
        this.connectedSettlementFood = [];
        if (this.onUpdate) {
            this.onUpdate(this);
        }
        window.dispatchEvent(new UpdateCityDetailsEvent());
    }
    buildSendingFoodData(selectedSettlement) {
        const sendingFoodData = [];
        const ownerSettlements = Players.get(selectedSettlement.owner)?.Cities?.getCities();
        if (!ownerSettlements) {
            console.error('model-city-details: buildSendingFoodData() - Failed to get ownerSettlements');
            return;
        }
        for (const town of ownerSettlements) {
            if (town.isTown && town.Growth?.growthType == GrowthTypes.PROJECT) {
                const connectedToTown = town.getConnectedCities();
                const foodForEachCity = town.getSentFoodPerCity();
                for (const connectedSettlement of connectedToTown) {
                    const city = Cities.get(connectedSettlement);
                    if (city && !city.isTown) {
                        // We've found a valid town sending food to a valid city
                        const existingData = sendingFoodData.find(value => {
                            return ComponentID.isMatch(value.city.id, city.id);
                        });
                        if (existingData) {
                            // Existing entry. Split town food between cities.
                            existingData.data.push({ town: town, amount: foodForEachCity });
                        }
                        else {
                            // New entry
                            sendingFoodData.push({ city: city, data: [{ town: town, amount: foodForEachCity }] });
                        }
                    }
                }
            }
        }
        return sendingFoodData;
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
    addYieldSteps(baseYield, steps, yieldDefinition, isModifier) {
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
                //Are there any percentage based yield incomes (modifiers) applied to the base income that we need to show?
                if (step.modifier && step.modifier.steps && step.modifier.steps.length > 0 && step.description == "Income") {
                    this.addYieldSteps(yieldData, step.modifier.steps, yieldDefinition, true);
                }
            }
            else if (step.steps && step.steps.length > 0) {
                this.addYieldSteps(baseYield, step.steps, yieldDefinition, false);
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
const CityDetails = new CityDetailsModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CityDetails);
    };
    engine.createJSModel('g_CityDetails', CityDetails);
    CityDetails.updateCallback = updateModel;
});
export { CityDetails as default };

//# sourceMappingURL=file:///base-standard/ui/city-details/model-city-details.js.map
