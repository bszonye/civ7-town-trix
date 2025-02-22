/**
 * @file building-placement-manager.ts
 * @copyright 2023, Firaxis Games
 * @description Helper class to keep track of building being placed and other shared building placement data
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export const BuildingPlacementHoveredPlotChangedEventName = 'building-placement-hovered-plot-changed';
export class BuildingPlacementHoveredPlotChangedEvent extends CustomEvent {
    constructor() {
        super(BuildingPlacementHoveredPlotChangedEventName, { bubbles: false, cancelable: true });
    }
}
export const BuildingPlacementSelectedPlotChangedEventName = 'building-placement-selected-plot-changed';
export class BuildingPlacementSelectedPlotChangedEvent extends CustomEvent {
    constructor() {
        super(BuildingPlacementSelectedPlotChangedEventName, { bubbles: false, cancelable: true });
    }
}
export const BuildingPlacementConstructibleChangedEventName = 'building-placement-constructible-changed';
export class BuildingPlacementConstructibleChangedEvent extends CustomEvent {
    constructor() {
        super(BuildingPlacementConstructibleChangedEventName, { bubbles: false, cancelable: true });
    }
}
const directionNames = new Map([
    [DirectionTypes.DIRECTION_EAST, "LOC_WORLD_DIRECTION_EAST"],
    [DirectionTypes.DIRECTION_NORTHEAST, "LOC_WORLD_DIRECTION_NORTHEAST"],
    [DirectionTypes.DIRECTION_NORTHWEST, "LOC_WORLD_DIRECTION_NORTHWEST"],
    [DirectionTypes.DIRECTION_SOUTHEAST, "LOC_WORLD_DIRECTION_SOUTHEAST"],
    [DirectionTypes.DIRECTION_SOUTHWEST, "LOC_WORLD_DIRECTION_SOUTHWEST"],
    [DirectionTypes.DIRECTION_WEST, "LOC_WORLD_DIRECTION_WEST"]
]);
function buildingsTagged(tag) {
    return new Set(GameInfo.TypeTags.filter(e => e.Tag == tag).map(e => e.Type));
}
// building tag helpers
let agelessTypes = null;
function getAgelessTypes() {
    if (agelessTypes == null) {
        agelessTypes = buildingsTagged("AGELESS");
    }
    return agelessTypes;
}
let slotlessTypes = null;
function getSlotlessTypes() {
    if (slotlessTypes == null) {
        slotlessTypes = buildingsTagged("IGNORE_DISTRICT_PLACEMENT_CAP");
    }
    return slotlessTypes;
}
class BuildingPlacementManagerClass {
    get cityID() {
        return this._cityID;
    }
    get city() {
        if (this.cityID) {
            const city = Cities.get(this.cityID);
            if (city) {
                return city;
            }
        }
        console.error(`building-placement-manager: Failed to get city for ID ${this.cityID}`);
        return null;
    }
    get currentConstructible() {
        return this._currentConstructible;
    }
    get reservedPlots() {
        return this._reservedPlots;
    }
    get urbanPlots() {
        return this._urbanPlots;
    }
    get developedPlots() {
        return this._developedPlots;
    }
    get expandablePlots() {
        return this._expandablePlots;
    }
    get hoveredPlotIndex() {
        return this._hoveredPlotIndex;
    }
    set hoveredPlotIndex(plotIndex) {
        if (this._hoveredPlotIndex == plotIndex) {
            // This plot is already hovered or already null
            return;
        }
        if (plotIndex != null && this.isPlotIndexSelectable(plotIndex)) {
            this._hoveredPlotIndex = plotIndex;
        }
        else {
            this._hoveredPlotIndex = null;
        }
        window.dispatchEvent(new BuildingPlacementHoveredPlotChangedEvent());
    }
    get selectedPlotIndex() {
        return this._selectedPlotIndex;
    }
    set selectedPlotIndex(plotIndex) {
        if (this._selectedPlotIndex == plotIndex) {
            // This plot is already selected or already null
            return;
        }
        if (plotIndex != null && this.isPlotIndexSelectable(plotIndex)) {
            this._selectedPlotIndex = plotIndex;
        }
        else {
            this._selectedPlotIndex = null;
        }
        window.dispatchEvent(new BuildingPlacementSelectedPlotChangedEvent());
    }
    initializePlacementData(cityID) {
        this._cityID = cityID;
        this.isRepairing = false;
        this.allPlacementData = this.city?.Yields?.calculateAllBuildingsPlacements();
        if (!this.allPlacementData) {
            console.error(`building-placement-manager: calculateAllBuildingsPlacements failed for cityID ${cityID}`);
            return;
        }
    }
    selectPlacementData(cityID, operationResult, constructible) {
        if (!ComponentID.isMatch(cityID, this.cityID)) {
            console.error(`building-placement-manager: cityID ${cityID} passed into selectPlacementData does not match cityID used for initializePlacementData ${this.cityID}`);
            return;
        }
        if (!this.allPlacementData) {
            console.error(`building-placement-manager: invalid allPlacementData for cityID ${cityID}`);
            return;
        }
        this._currentConstructible = constructible;
        this.isRepairing = operationResult.RepairDamaged;
        // is the new building part of a unique quarter?
        const btype = GameInfo.Buildings.lookup(constructible.ConstructibleType);
        const newUB = btype?.TraitType;  // for example: TRAIT_ROME
        // get the civilization's unique quarter
        const city = Cities.get(cityID);
        const player = Players.get(city.owner);
        const civ = GameInfo.Civilizations.lookup(player.civilizationType);
        const civTraits = GameInfo.CivilizationTraits
            .filter(trait => trait.CivilizationType === civ.CivilizationType)
            .map(trait => trait.TraitType);
        const civUQ = GameInfo.UniqueQuarters.find(uq => civTraits.includes(uq.TraitType));
        // find a partial unique quarter, if any
        const partialUQ = this.findExistingUniqueBuilding(civUQ);  // -1 if not found
        // check whether a district can make a unique quarter
        // TODO: account for potential blockers in queue / in progress
        const hasUQBlocker = (p) => {
            const loc = GameplayMap.getLocationFromIndex(p);
            const ids = MapConstructibles.getConstructibles(loc.x, loc.y);
            // get building slots, ignoring walls
            const slots = ids.map(id => Constructibles.getByComponentID(id))
                .map(c => GameInfo.Constructibles.lookup(c.type))
                .filter(c => c.ConstructibleClass == "BUILDING")
                .filter(c => !getSlotlessTypes().has(c.ConstructibleType));
            // ageless buildings are blockers
            if (slots.find(c => getAgelessTypes().has(c.ConstructibleType))) return true;
            // current-age buildings are blockers
            const current = Game.age;
            if (slots.find(c => Database.makeHash(c.Age ?? "") == current)) return true;
            // otherwise, this district can still make a unique quarter
            return false;
        };
        // check whether placement is UQ-compatible
        const isUQCompatible = (p) => {
            // repairs and walls are always compatible with UQs
            if (this.isRepairing) return true;
            if (getSlotlessTypes().has(btype?.ConstructibleType)) return true;
            // unique district selected
            if (p == partialUQ) {
                // good: a unique building here finishes the UQ
                if (newUB) return true;
                // bad: non-unique building in a unique district
                return false;
            }
            // new unique building NOT on a partial UQ
            if (newUB) {
                // bad: there's a partial UQ somewhere else
                if (partialUQ != -1) return false;
                // bad: this would create a non-unique quarter
                if (hasUQBlocker(p)) return false;
            }
            return true;
        };
        // evaluate existing districts
        operationResult.Plots?.forEach(p => {
            if (isUQCompatible(p)) {
                this._urbanPlots.push(p);
            } else {
                this._reservedPlots.push(p);
            }
        });
        // evaluate rural and undeveloped tiles
        operationResult.ExpandUrbanPlots?.forEach(p => {
            const loc = GameplayMap.getLocationFromIndex(p);
            const city = MapCities.getCity(loc.x, loc.y);
            // still need to check UQ compatibility outside of districts
            if (!isUQCompatible(p)) {
                // placement clashes with a unique quarter in queue
                this._reservedPlots.push(p);
            } else if (city && MapCities.getDistrict(loc.x, loc.y) != null) {
                // rural tile: ok, will move citizen
                this._developedPlots.push(p);
            }
            else {
                // undeveloped tile: good
                this._expandablePlots.push(p);
            }
        });
        this.selectedPlacementData = this.allPlacementData.buildings.find((buildingData) => {
            return buildingData.constructibleType == constructible.$hash;
        });
        if (!this.selectedPlacementData) {
            console.error(`building-placement-manager: Failed to find type ${constructible.ConstructibleType} in allPlacementData`);
            return;
        }
        window.dispatchEvent(new BuildingPlacementConstructibleChangedEvent());
    }
    isPlotIndexSelectable(plotIndex) {
        return this.reservedPlots.find((index) => { return index == plotIndex; }) != undefined ||
            this.urbanPlots.find((index) => { return index == plotIndex; }) != undefined ||
            this.developedPlots.find((index) => { return index == plotIndex; }) != undefined ||
            this.expandablePlots.find((index) => { return index == plotIndex; }) != undefined;
    }
    constructor() {
        this._cityID = null;
        this._currentConstructible = null;
        // Plots that would block a unique quarter
        this._reservedPlots = [];
        // Plots that are already developed and have buildings placed on them
        this._urbanPlots = [];
        // Plots that have already been developed/improved (i.e. improved through city growth)
        this._developedPlots = [];
        // Plots that have not yet been developed
        this._expandablePlots = [];
        this._hoveredPlotIndex = null;
        this._selectedPlotIndex = null;
        this.isRepairing = false;
        if (BuildingPlacementManagerClass.instance) {
            console.error("Only one instance of the BuildingPlacementManagerClass can exist at a time, second attempt to create one.");
        }
        BuildingPlacementManagerClass.instance = this;
    }
    getTotalYieldChanges(plotIndex) {
        const placementPlotData = this.getPlacementPlotData(plotIndex);
        if (!placementPlotData) {
            console.error(`building-placement-manager: getTotalYieldChanges(): Failed to find PlacementPlotData for plotIndex ${plotIndex}`);
            return;
        }
        const yieldChangeInfo = [];
        GameInfo.Yields.forEach((yieldDefinition, index) => {
            if (placementPlotData.yieldChanges[index] != 0) {
                yieldChangeInfo.push({
                    text: Locale.compose(yieldDefinition.Name),
                    yieldType: yieldDefinition.YieldType,
                    yieldChange: placementPlotData.yieldChanges[index],
                    isMainYield: true,
                    iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
                });
            }
        });
        return yieldChangeInfo;
    }
    getPlotYieldChanges(plotIndex) {
        const placementPlotData = this.getPlacementPlotData(plotIndex);
        if (!placementPlotData) {
            console.error(`building-placement-manager: getPlotYieldChanges(): Failed to find PlacementPlotData for plotIndex ${plotIndex}`);
            return;
        }
        const yieldChangeInfo = [];
        // Base Yields
        placementPlotData.changeDetails.forEach((changeDetails) => {
            switch (changeDetails.sourceType) {
                case YieldSourceTypes.BASE: {
                    const yieldDefinition = GameInfo.Yields.lookup(changeDetails.yieldType);
                    if (!yieldDefinition) {
                        break;
                    }
                    yieldChangeInfo.push({
                        text: Locale.compose(yieldDefinition.Name),
                        yieldType: yieldDefinition.YieldType,
                        yieldChange: changeDetails.change,
                        isMainYield: true,
                        iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
                    });
                    break;
                }
            }
        });
        // Worker Yields
        placementPlotData.changeDetails.forEach((changeDetails) => {
            switch (changeDetails.sourceType) {
                case YieldSourceTypes.WORKERS: {
                    const yieldDefinition = GameInfo.Yields.lookup(changeDetails.yieldType);
                    if (!yieldDefinition) {
                        break;
                    }
                    yieldChangeInfo.push({
                        text: Locale.compose('LOC_BUILDING_PLACEMENT_YIELD_NAME_FROM_WORKERS', yieldDefinition.Name),
                        yieldType: yieldDefinition.YieldType,
                        yieldChange: changeDetails.change,
                        isMainYield: true,
                        iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
                    });
                    break;
                }
            }
        });
        // Warehouse Bonuses
        let warehouseBonuses = new Map();
        placementPlotData.changeDetails.forEach((changeDetails) => {
            switch (changeDetails.sourceType) {
                case YieldSourceTypes.WAREHOUSE: {
                    const warehouseBonus = warehouseBonuses.get(changeDetails.yieldType);
                    if (warehouseBonus) {
                        warehouseBonuses.set(changeDetails.yieldType, warehouseBonus + changeDetails.change);
                    }
                    else {
                        warehouseBonuses.set(changeDetails.yieldType, changeDetails.change);
                    }
                    break;
                }
            }
        });
        warehouseBonuses.forEach((change, yieldType) => {
            const yieldDefinition = GameInfo.Yields.lookup(yieldType);
            if (!yieldDefinition) {
                console.error(`building-placement-manager: Failed to find warehouse bonuses type for type ${yieldType}`);
                return;
            }
            yieldChangeInfo.push({
                text: Locale.compose('LOC_BUILDING_PLACEMENT_YIELD_NAME_TO_TILE_FROM_WAREHOUSE', yieldDefinition.Name),
                yieldType: yieldDefinition.YieldType,
                yieldChange: change,
                isMainYield: true,
                iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
            });
        });
        return yieldChangeInfo;
    }
    getAdjacencyYieldChanges(plotIndex) {
        const placementPlotData = this.getPlacementPlotData(plotIndex);
        if (!placementPlotData) {
            console.error(`building-placement-manager: getAdjacencyYieldChanges(): Failed to find PlacementPlotData for plotIndex ${plotIndex}`);
            return;
        }
        const yieldChangeInfo = [];
        placementPlotData.changeDetails.forEach((changeDetails) => {
            switch (changeDetails.sourceType) {
                case YieldSourceTypes.ADJACENCY: {
                    const yieldDefinition = GameInfo.Yields.lookup(changeDetails.yieldType);
                    if (!yieldDefinition) {
                        break;
                    }
                    if (changeDetails.sourcePlotIndex == plotIndex) {
                        // This adjacency is going to a different plot
                        yieldChangeInfo.push({
                            text: Locale.compose('LOC_BUILDING_PLACEMENT_YIELD_NAME_TO_OTHER_BUILDINGS', yieldDefinition.Name),
                            yieldType: yieldDefinition.YieldType,
                            yieldChange: changeDetails.change,
                            isMainYield: true,
                            iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
                        });
                        break;
                    }
                    else {
                        // This adjacency is coming from a different plot
                        yieldChangeInfo.push({
                            text: Locale.compose('LOC_BUILDING_PLACEMENT_YIELD_NAME_FROM_DIRECTION', yieldDefinition.Name, this.getDirectionString(changeDetails.sourcePlotIndex, plotIndex)),
                            yieldType: yieldDefinition.YieldType,
                            yieldChange: changeDetails.change,
                            isMainYield: true,
                            iconURL: UI.getIconURL(yieldDefinition.YieldType, 'YIELD')
                        });
                        break;
                    }
                }
            }
        });
        return yieldChangeInfo;
    }
    getDirectionString(fromPlot, toPlot) {
        const direction = GameplayMap.getDirectionToPlot(GameplayMap.getLocationFromIndex(toPlot), GameplayMap.getLocationFromIndex(fromPlot));
        switch (direction) {
            case DirectionTypes.DIRECTION_EAST:
                return 'LOC_WORLD_DIRECTION_EAST';
            case DirectionTypes.DIRECTION_NORTHEAST:
                return 'LOC_WORLD_DIRECTION_NORTHEAST';
            case DirectionTypes.DIRECTION_NORTHWEST:
                return 'LOC_WORLD_DIRECTION_NORTHWEST';
            case DirectionTypes.DIRECTION_SOUTHEAST:
                return 'LOC_WORLD_DIRECTION_SOUTHEAST';
            case DirectionTypes.DIRECTION_SOUTHWEST:
                return 'LOC_WORLD_DIRECTION_SOUTHWEST';
            case DirectionTypes.DIRECTION_WEST:
                return 'LOC_WORLD_DIRECTION_WEST';
        }
        console.error(`building-placement-manager: getDirectionString failed to find a direction string from ${fromPlot} to ${toPlot}`);
        return '';
    }
    getPlacementPlotData(plotIndex) {
        if (!this.selectedPlacementData) {
            console.error('building-placement-manager: getPlacementPlotData(): Invalid selectedPlacementData');
            return;
        }
        return this.selectedPlacementData.placements.find((plotData) => {
            return plotData.plotID == plotIndex;
        });
    }
    getOverbuildConstructibleID(plotID) {
        if (!this.selectedPlacementData) {
            console.error('building-placement-manager: Tried to call getOverbuildConstructibleID before selectedPlacementData was initialized!');
            return;
        }
        const selectedPlacementData = this.selectedPlacementData.placements.find((plotData) => {
            return plotData.plotID == plotID;
        });
        if (!selectedPlacementData) {
            console.error(`building-placement-manager: getOverbuildConstructibleID(): Unable to find plotID ${plotID} in selectedPlacementData`);
            return;
        }
        return selectedPlacementData.overbuiltConstructibleID;
    }
    getYieldPillIcon(yieldType, yieldNum, mainYield) {
        let yieldIconPath = "";
        if (yieldType == "YIELD_DIPLOMACY") {
            yieldIconPath = "yield_influence";
        }
        else {
            yieldIconPath = yieldType.toLowerCase();
        }
        if (yieldNum > 0) {
            yieldIconPath += "_pos";
        }
        else {
            yieldIconPath += "_neg";
        }
        //We want to emphasize the main yield for the building we are placing
        if (mainYield) {
            yieldIconPath += "-lrg";
        }
        return yieldIconPath;
    }
    reset() {
        this._cityID = null;
        this._currentConstructible = null;
        this._reservedPlots = [];
        this._urbanPlots = [];
        this._developedPlots = [];
        this._expandablePlots = [];
        this.hoveredPlotIndex = null;
        this.selectedPlotIndex = null;
        this.isRepairing = false;
    }
    isValidPlacementPlot(plotIndex) {
        if (BuildingPlacementManager.reservedPlots.find(p => p == plotIndex) || BuildingPlacementManager.urbanPlots.find(p => p == plotIndex) || BuildingPlacementManager.developedPlots.find(p => p == plotIndex) || BuildingPlacementManager.expandablePlots.find(p => p == plotIndex)) {
            return true;
        }
        return false;
    }
    getAdjacencyBonuses() {
        let adjacencyData = [];
        if (!this.currentConstructible) {
            console.error('building-placement-manager: Invalid currentConstructible within getAdjacencyBonuses');
            return adjacencyData;
        }
        if (!this.selectedPlotIndex) {
            console.error('building-placement-manager: Invalid selectedPlotIndex within getAdjacencyBonuses');
            return adjacencyData;
        }
        const yieldAdjacencies = this.city?.Yields?.calculateAllAdjacencyYieldsForConstructible(this.currentConstructible.ConstructibleType, this.selectedPlotIndex);
        if (!yieldAdjacencies) {
            console.error('building-placement-manager: Failed to get yieldAdjacencies within getAdjacencyBonuses');
            return adjacencyData;
        }
        yieldAdjacencies.forEach(adjacency => {
            const yieldDef = GameInfo.Yields.lookup(adjacency.yieldType);
            if (!yieldDef) {
                console.error("building-placement-manager: No valid yield definition for yield type: " + adjacency.yieldType.toString());
                return;
            }
            if (!this.selectedPlotIndex) {
                console.error("building-placement-manager: Invalid selectedPlotIndex for yield type: " + adjacency.yieldType.toString());
                return;
            }
            const adjacencyLocation = GameplayMap.getLocationFromIndex(adjacency.sourcePlotIndex);
            const buildingLocation = GameplayMap.getLocationFromIndex(this.selectedPlotIndex);
            const adjacencyDirection = GameplayMap.getDirectionToPlot(buildingLocation, adjacencyLocation);
            const directionName = directionNames.get(adjacencyDirection);
            if (directionName == undefined) {
                console.error("building-placement-manager: No valid direction name for direction: " + adjacencyDirection.toString());
                return;
            }
            adjacencyData.push({
                value: adjacency.change,
                name: Locale.compose(yieldDef.Name),
                type: yieldDef.YieldType,
                directionType: adjacencyDirection,
                directionName: Locale.compose(directionName)
            });
        });
        return adjacencyData;
    }
    getCumulativeAdjacencyBonuses() {
        let cumulativeData = [];
        const adjacencyData = this.getAdjacencyBonuses();
        adjacencyData.forEach((uniqueData) => {
            // Look for a matching data entry
            const existingData = cumulativeData.find((data) => {
                return uniqueData.type == data.type;
            });
            // If found, add new value to that entry
            if (existingData) {
                existingData.value += uniqueData.value;
                return;
            }
            // If not found, create new entry
            // No direction value since it's assumed to be coming from multiple directions
            cumulativeData.push({
                value: uniqueData.value,
                name: uniqueData.name,
                type: uniqueData.type,
                directionType: DirectionTypes.NO_DIRECTION,
                directionName: ""
            });
        });
        return cumulativeData;
    }
    getWarehouseBonuses() {
        let warehouseData = [];
        if (!this.currentConstructible) {
            console.error('building-placement-manager: Invalid currentConstructible within getWarehouseBonuses');
            return warehouseData;
        }
        const allWarehouseBonuses = this.city?.Yields?.getAllWarehouseYieldsForConstructible(this.currentConstructible.ConstructibleType);
        if (allWarehouseBonuses) {
            allWarehouseBonuses.forEach((warehouseBonuse) => {
                const yieldDef = GameInfo.Yields.lookup(warehouseBonuse.yieldType);
                if (!yieldDef) {
                    console.error("building-placement-manager: No valid yield definition for yield type: " + warehouseBonuse.yieldType.toString());
                    return;
                }
                warehouseData.push({
                    value: warehouseBonuse.change,
                    type: yieldDef.YieldType,
                    name: Locale.compose(yieldDef.Name)
                });
            });
        }
        return warehouseData;
    }
    getCumulativeWarehouseBonuses() {
        let cumulativeData = [];
        const warehouseData = this.getWarehouseBonuses();
        warehouseData.forEach((uniqueData) => {
            // Look for a matching data entry
            const existingData = cumulativeData.find((data) => {
                return uniqueData.type == data.type;
            });
            // If found, add new value to that entry
            if (existingData) {
                existingData.value += uniqueData.value;
                return;
            }
            // If not found, create new entry
            // No direction value since it's assumed to be coming from multiple directions
            cumulativeData.push({
                value: uniqueData.value,
                name: uniqueData.name,
                type: uniqueData.type
            });
        });
        return cumulativeData;
    }
    findExistingUniqueBuilding(uniqueQuarterDef) {
        // a building can appear in three places:
        // - Game.CityCommands.canStart (in-progress buildings)
        // - city.BuildQueue (production queue)
        // - city.Constructibles (finished buildings)
        const uniqueBuildings = new Set([
            uniqueQuarterDef?.BuildingType1,
            uniqueQuarterDef?.BuildingType2,
        ].filter(e => e));  // eliminate empty/null/undefined buildings
        if (!uniqueBuildings.size) return -1;  // no unique quarter
        // get city info
        const cityID = this.cityID;
        const city = cityID && ComponentID.isValid(cityID) && Cities.get(cityID);
        if (!city) {
            console.error(`bpm: invalid cityID=${this.cityID}`);
            return -1;
        }
        // check for a unique building in progress
        for (const ub of uniqueBuildings) {
            const typeInfo = GameInfo.Types.lookup(ub);
            const args = { ConstructibleType: typeInfo.Hash };
            const result = Game.CityCommands.canStart(
                city.id, CityCommandTypes.PURCHASE, args, false);
            if (result.InProgress && result.Plots) {
                return result.Plots[0];
            }
        }
        // check the production queue
        const queue = city.BuildQueue?.getQueue();
        for (const q of queue) {
            if (q.constructibleType == -1) continue;
            const ctype = GameInfo.Constructibles.lookup(q.constructibleType);
            if (uniqueBuildings.has(ctype?.ConstructibleType)) {
                return GameplayMap.getIndexFromLocation(q.location);
            }
        }
        // check the finished buildings
        const constructibles = city.Constructibles ?? [];
        for (const id of constructibles.getIds()) {
            const constructible = Constructibles.getByComponentID(id);  // instance
            if (!constructible) {
                console.error(`bpm: invalid construcible id=${id.toString()}`);
                return -1;
            }
            const ctype = GameInfo.Constructibles.lookup(constructible.type);  // type
            if (!ctype) {
                console.error(`bpm: invalid constructible type=${constructible.type}`);
                return -1;
            }
            if (uniqueBuildings.has(ctype.ConstructibleType)) {
                return GameplayMap.getIndexFromLocation(constructible.location);
            }
        }
        // not found
        return -1;
    }
    getBestYieldForConstructible(cityID, constructibleDef) {
        if (!ComponentID.isMatch(cityID, this.cityID)) {
            console.error(`building-placement-manager: getBestYieldForConstructible() - cityID ${cityID} passed into selectPlacementData does not match cityID used for initializePlacementData ${this.cityID}`);
            return [];
        }
        if (!this.allPlacementData) {
            console.error(`building-placement-manager: getBestYieldForConstructible() - invalid allPlacementData for cityID ${cityID}`);
            return [];
        }
        const constructiblePlacementData = this.allPlacementData.buildings.find((data) => {
            return data.constructibleType == constructibleDef.$hash;
        });
        if (!constructiblePlacementData) {
            console.error(`building-placement-manager: getBestYieldForConstructible() - failed to find placement data for type ${constructibleDef.ConstructibleType}`);
            return [];
        }
        let bestYieldChanges = [];
        let bestYieldChangesTotal = 0;
        for (const placement of constructiblePlacementData?.placements ?? []) {
            let yieldChangesTotal = 0;
            for (const change of placement.yieldChanges) {
                yieldChangesTotal += change;
            }
            if (yieldChangesTotal > bestYieldChangesTotal) {
                bestYieldChangesTotal = yieldChangesTotal;
                bestYieldChanges = placement.yieldChanges;
            }
        }
        return bestYieldChanges;
    }
}
BuildingPlacementManagerClass.instance = null;
const BuildingPlacementManager = new BuildingPlacementManagerClass();
export { BuildingPlacementManager as default };

//# sourceMappingURL=file:///base-standard/ui/building-placement/building-placement-manager.js.map
