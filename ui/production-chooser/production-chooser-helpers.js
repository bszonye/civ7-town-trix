/**
 * @copyright 2024 Firaxis Games
 * @description Helper functions for the production chooser
 * @file production-chooser-helpers.ts
 */
import BuildingPlacementManager from '/base-standard/ui/building-placement/building-placement-manager.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
// #region Types
export var ProductionPanelCategory;
(function (ProductionPanelCategory) {
    ProductionPanelCategory["BUILDINGS"] = "buildings";
    ProductionPanelCategory["UNITS"] = "units";
    ProductionPanelCategory["PROJECTS"] = "projects";
    ProductionPanelCategory["WONDERS"] = "wonders";
})(ProductionPanelCategory || (ProductionPanelCategory = {}));
// #endregion
let agelessItemTypes = null;
function getAgelessItemTypes() {
    if (agelessItemTypes != null) {
        return agelessItemTypes;
    }
    else {
        agelessItemTypes = new Set();
        for (const e of GameInfo.TypeTags) {
            if (e.Tag == "AGELESS") {
                agelessItemTypes.add(e.Type);
            }
        }
        return agelessItemTypes;
    }
}
export const GetNextCityID = (cityID) => getAdjacentCityID(cityID, true);
export const GetPrevCityID = (cityID) => getAdjacentCityID(cityID, false);
/**
 * returns the ID of the next or previous city in the player's list of cities
 */
const getAdjacentCityID = (cityID, isNext) => {
    let targetCityID = null;
    const player = Players.get(cityID.owner);
    if (player) {
        let playerCities = player.Cities?.getCities();
        if (playerCities?.length) {
            const currentCityIndex = playerCities.findIndex((city) => ComponentID.isMatch(cityID, city.id));
            let targetCityIndex;
            if (isNext) {
                targetCityIndex = currentCityIndex != -1 && currentCityIndex < (playerCities.length - 1) ? currentCityIndex + 1 : 0;
            }
            else {
                targetCityIndex = currentCityIndex > 0 ? currentCityIndex - 1 : playerCities.length - 1;
            }
            const targetCity = playerCities[targetCityIndex];
            targetCityID = targetCity.id;
        }
    }
    return targetCityID;
};
export const GetUnitStatsFromDefinition = (definition) => {
    let stats = [];
    // Movement Range
    if (definition.BaseMoves > 0) {
        stats.push({
            name: "LOC_UNIT_INFO_MOVES_REMAINING",
            icon: "Action_Move",
            value: definition.BaseMoves.toString()
        });
    }
    // Build Charges
    if (definition.BuildCharges > 0) {
        stats.push({
            name: "LOC_UNIT_INFO_BUILD_CHARGES",
            icon: "Action_Construct",
            value: definition.BuildCharges.toString()
        });
    }
    const statsDefinition = GameInfo.Unit_Stats.lookup(definition.UnitType);
    if (statsDefinition) {
        if (statsDefinition.RangedCombat > 0) {
            // Show RangedCombat stats if a ranged unit
            stats.push({
                name: "LOC_UNIT_INFO_RANGED_STRENGTH",
                icon: "Action_Ranged",
                value: statsDefinition.RangedCombat.toString()
            });
            stats.push({
                name: "LOC_UNIT_INFO_RANGE",
                icon: "action_rangedattack",
                value: statsDefinition.Range.toString()
            });
        }
        else if (statsDefinition.Combat > 0) {
            // If not ranged show our combat stat if not 0
            stats.push({
                name: "LOC_UNIT_INFO_MELEE_STRENGTH",
                icon: "Action_Attack",
                value: statsDefinition.Combat.toString()
            });
        }
    }
    return stats;
};
export const GetCurrentBestTotalYieldForConstructible = (city, constructibleType) => {
    const yields = [];
    const constructibleDef = GameInfo.Constructibles.lookup(constructibleType);
    if (!constructibleDef) {
        console.error(`production-chooser-helper: GetCurrentBestTotalYieldForConstructible() failed to find constructible definition for type ${constructibleType}`);
        return [];
    }
    const bestYieldChanges = BuildingPlacementManager.getBestYieldForConstructible(city.id, constructibleDef);
    for (let iYield = 0; iYield < GameInfo.Yields.length; iYield++) {
        if (bestYieldChanges.length <= iYield) {
            continue;
        }
        const change = bestYieldChanges[iYield];
        if (change <= 0) {
            continue;
        }
        const yieldDef = GameInfo.Yields.lookup(iYield);
        if (!yieldDef) {
            console.error(`production-chooser-helper: GetCurrentBestTotalYieldForConstructible() failed to find yield definition for yield index ${iYield}`);
            continue;
        }
        yields.push({
            iconId: iYield.toString(),
            icon: Icon.getYieldIcon(yieldDef.YieldType),
            value: `+${change}`,
            name: yieldDef.Name,
            yieldType: yieldDef.YieldType,
            isMainYield: true
        });
    }
    return yields;
};
export const GetSecondaryDetailsHTML = (items) => {
    return items.reduce((acc, { icon, value, name }) => {
        return acc + `<div class="flex items-center"><img aria-label="${Locale.compose(name)}" src="${icon}" class="size-8 mr-1" />${value}</div>`;
    }, "");
};
/**
 * returns the data needed to display a constructible item in the production chooser
 */
export const GetConstructibleItemData = (constructible, city, operationResult, hideIfUnavailable = false) => {
    const cityGold = city.Gold;
    if (!cityGold) {
        console.error("GetConstructibleItemData: getConstructibleItem: Failed to get cityGold!");
        return null;
    }
    const agelessTypes = getAgelessItemTypes();
    const ageless = agelessTypes.has(constructible.ConstructibleType);
    const insufficientFunds = operationResult.InsufficientFunds ?? false;
    // TODO: This logic needs to be refactored
    if (operationResult.Success || insufficientFunds || !hideIfUnavailable || (operationResult.NeededUnlock != -1 && !hideIfUnavailable)) {
        // 'Success' is a tad misleading here as a success can still fail due to requirements not being met.
        // Verify requirements either doesn't exist OR are met.
        const bestYields = GetCurrentBestTotalYieldForConstructible(city, constructible.ConstructibleType);
        const secondaryDetails = GetSecondaryDetailsHTML(bestYields);
        if (operationResult.Success || insufficientFunds || !hideIfUnavailable) {
            const possibleLocations = [];
            const pushPlots = (p) => {
                possibleLocations.push(p);
            };
            operationResult.Plots?.forEach(pushPlots);
            operationResult.ExpandUrbanPlots?.forEach(pushPlots);
            const turns = city.BuildQueue.getTurnsLeft(constructible.ConstructibleType);
            const isBuildingAlreadyQueued = constructible.ConstructibleClass === 'BUILDING' && operationResult.InQueue;
            const category = getConstructibleClassPanelCategory(constructible.ConstructibleClass);
            if (possibleLocations.length > 0 && !isBuildingAlreadyQueued && !operationResult.InsufficientFunds) {
                let name = constructible.Name;
                if (operationResult.RepairDamaged && constructible.Repairable) {
                    name = Locale.compose('LOC_UI_PRODUCTION_REPAIR_NAME', constructible.Name);
                }
                else if (operationResult.MoveToNewLocation) {
                    name = Locale.compose('LOC_UI_PRODUCTION_MOVE_NAME', constructible.Name);
                }
                const locations = Locale.compose('LOC_UI_PRODUCTION_LOCATIONS', constructible.Cost, possibleLocations.length);
                const cost = operationResult.Cost ?? cityGold.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, constructible.ConstructibleType);
                const item = {
                    name,
                    type: constructible.ConstructibleType,
                    cost,
                    category,
                    ageless,
                    turns,
                    showTurns: turns > -1,
                    showCost: cost > 0,
                    insufficientFunds,
                    disabled: constructible.Cost < 0,
                    locations: locations,
                    interfaceMode: 'INTERFACEMODE_PLACE_BUILDING',
                    secondaryDetails
                };
                return item;
            }
            else {
                // Most items are shown anyway even if not available, but some aren't
                if (!hideIfUnavailable || insufficientFunds) {
                    let name = constructible.Name;
                    let error = '';
                    let nodeNeededError = "";
                    if (operationResult.NeededUnlock != -1) {
                        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(operationResult.NeededUnlock);
                        if (nodeInfo) {
                            nodeNeededError = Locale.compose('LOC_UI_PRODUCTION_REQUIRES', nodeInfo.Name);
                        }
                    }
                    if (operationResult.RepairDamaged && constructible.Repairable) {
                        name = Locale.compose('LOC_UI_PRODUCTION_REPAIR_NAME', constructible.Name);
                        error = operationResult.InsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" : "";
                    }
                    else {
                        error = operationResult.AlreadyExists ? "LOC_UI_PRODUCTION_ALREADY_EXISTS" :
                            operationResult.NeededUnlock != -1 ? nodeNeededError :
                                possibleLocations.length === 0 ? "LOC_UI_PRODUCTION_NO_SUITABLE_LOCATIONS" :
                                    operationResult.InsufficientFunds ? "LOC_CITY_PURCHASE_INSUFFICIENT_FUNDS" :
                                        operationResult.InQueue ? "LOC_UI_PRODUCTION_ALREADY_IN_QUEUE" : '';
                    }
                    const cost = operationResult.Cost ?? cityGold.getBuildingPurchaseCost(YieldTypes.YIELD_GOLD, constructible.ConstructibleType);
                    return {
                        name,
                        type: constructible.ConstructibleType,
                        cost,
                        turns,
                        category,
                        ageless,
                        showTurns: turns > -1,
                        showCost: cost > 0,
                        insufficientFunds,
                        disabled: true,
                        error,
                        secondaryDetails
                    };
                }
            }
        }
        else {
            // Only show items that fail a prereq check if the node  is open (aka available to be researched)
            const prereq = operationResult.NeededUnlock;
            const canUnlockNode = CanPlayerUnlockNode(prereq, city.owner);
            if (canUnlockNode) {
                let item = {
                    turns: -1,
                    name: constructible.Name,
                    type: constructible.ConstructibleType,
                    showTurns: false,
                    showCost: false,
                    insufficientFunds: false,
                    disabled: true,
                    ageless,
                    category: getConstructibleClassPanelCategory(constructible.ConstructibleClass),
                    cost: -1,
                    secondaryDetails
                };
                const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(prereq);
                if (nodeInfo) {
                    item.error = Locale.compose('LOC_UI_PRODUCTION_REQUIRES', nodeInfo.Name);
                }
                return item;
            }
        }
    }
    return null;
};
/**
 * returns the node required to unlocked the given nodeType
 */
export const CanPlayerUnlockNode = (nodeType, playerId) => {
    if (!nodeType)
        return false;
    const nodeState = Game.ProgressionTrees.getNodeState(playerId, nodeType);
    return nodeState >= ProgressionTreeNodeState.NODE_STATE_OPEN;
};
export const CreateProductionChooserItem = () => {
    const item = document.createElement('production-chooser-item');
    item.setAttribute("data-audio-group-ref", "city-actions");
    item.setAttribute("data-audio-focus-ref", "data-audio-city-production-focus");
    return item;
};
const getProjectItems = (city, isPurchase) => {
    const projects = [];
    if (!city) {
        console.error(`getProjectItems: received a null/undefined city!`);
        return projects;
    }
    GameInfo.Projects.forEach(project => {
        if (project.CityOnly && city.isTown || !project.CanPurchase && isPurchase) {
            return;
        }
        const result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { ProjectType: project.$index }, false);
        if (result.Requirements && result.Requirements?.FullFailure != true) {
            if (result.Requirements.MeetsRequirements) {
                const turns = city.BuildQueue.getTurnsLeft(project.ProjectType);
                const cost = city.Production.getProjectProductionCost(project.ProjectType);
                const projectItem = {
                    name: project.Name,
                    description: project.Description,
                    type: project.ProjectType,
                    cost,
                    turns,
                    category: ProductionPanelCategory.PROJECTS,
                    showTurns: project.UpgradeToCity && project.TownOnly,
                    showCost: false,
                    insufficientFunds: false,
                    disabled: !result.Success
                };
                if (project.UpgradeToCity && project.TownOnly) {
                    projects.unshift(projectItem);
                }
                else {
                    projects.push(projectItem);
                }
            }
        }
    });
    return projects;
};
export const GetUniqueQuarterForPlayer = (playerId) => {
    const player = Players.get(playerId);
    if (!player) {
        console.error(`GetUniqueQuarterForPlayer: Failed to get player with id ${playerId}`);
        return null;
    }
    const civilizationDefinition = GameInfo.Civilizations.lookup(player.civilizationType);
    if (!civilizationDefinition) {
        console.error(`GetUniqueQuarterForPlayer: Failed to get civilization definition for player: ${playerId}`);
        return null;
    }
    const traitTypes = GameInfo.CivilizationTraits
        .filter(trait => trait.CivilizationType === civilizationDefinition.CivilizationType)
        .map(trait => trait.TraitType);
    const uniqueQuarterDef = GameInfo.UniqueQuarters.find(uq => traitTypes.includes(uq.TraitType));
    if (!uniqueQuarterDef) {
        // civ has no unique quarter
        return null;
    }
    const buildingOneDef = GameInfo.Constructibles.lookup(uniqueQuarterDef.BuildingType1);
    const buildingTwoDef = GameInfo.Constructibles.lookup(uniqueQuarterDef.BuildingType2);
    if (!buildingOneDef || !buildingTwoDef) {
        console.error(`GetUniqueQuarterForPlayer: Failed to get building definitions for UniqueQuarterDefinition: ${uniqueQuarterDef.Name}`);
        return null;
    }
    return {
        uniqueQuarterDef,
        buildingOneDef,
        buildingTwoDef
    };
};
export const GetNumUniqueQuarterBuildingsCompleted = (city, uq) => {
    const buildingOneCompleted = !!city.Constructibles?.hasConstructible(uq.BuildingType1, false);
    const buildingTwoCompleted = !!city.Constructibles?.hasConstructible(uq.BuildingType2, false);
    return buildingOneCompleted && buildingTwoCompleted ? 2 : buildingOneCompleted || buildingTwoCompleted ? 1 : 0;
};
export const ShouldShowUniqueQuarter = (...results) => {
    return results.some(result => {
        return result.Success || result.InQueue || result.InProgress || result.InsufficientFunds || result.AlreadyExists;
    });
};
export const GetProductionItems = (city, recommendations, playerGoldBalance, isPurchase, viewHidden, uqInfo) => {
    const items = {
        [ProductionPanelCategory.BUILDINGS]: [],
        [ProductionPanelCategory.WONDERS]: [],
        [ProductionPanelCategory.UNITS]: getUnits(city, playerGoldBalance, isPurchase, recommendations, viewHidden),
        [ProductionPanelCategory.PROJECTS]: getProjectItems(city, isPurchase)
    };
    if (!city) {
        console.error(`GetProductionItems: received a null/undefined city!`);
        return items;
    }
    let results;
    if (isPurchase) {
        results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Constructible);
    }
    else {
        results = Game.CityOperations.canStartQuery(city.id, CityOperationTypes.BUILD, CityQueryType.Constructible);
    }
    let uqBuildingOneResult = results.find(({ index }) => index === uqInfo?.buildingOneDef.$index)?.result;
    let uqBuildingTwoResult = results.find(({ index }) => index === uqInfo?.buildingTwoDef.$index)?.result;
    let shouldShowUniqueQuarter = false;
    // Once a unique quarter building is completed, gamecore does not include it in the results, 
    // so we must ensure that the unique quarter buildings are part of the results
    if (uqInfo) {
        let uqBuildingOneCompleted = false;
        let uqBuildingTwoCompleted = false;
        if (!uqBuildingOneResult) {
            uqBuildingOneResult = isPurchase ? Game.CityCommands.canStart(city.id, CityCommandTypes.PURCHASE, { ConstructibleType: uqInfo.buildingOneDef.$index }, false)
                : Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { ConstructibleType: uqInfo.buildingOneDef.$index }, false);
            uqBuildingOneCompleted = uqBuildingOneResult.AlreadyExists;
        }
        if (!uqBuildingTwoResult) {
            uqBuildingTwoResult = isPurchase ? Game.CityCommands.canStart(city.id, CityCommandTypes.PURCHASE, { ConstructibleType: uqInfo.buildingTwoDef.$index }, false)
                : Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { ConstructibleType: uqInfo.buildingTwoDef.$index }, false);
            uqBuildingTwoCompleted = uqBuildingTwoResult.AlreadyExists;
        }
        if (!uqBuildingOneCompleted || !uqBuildingTwoCompleted) {
            results.push({ index: uqInfo.buildingOneDef.$index, result: uqBuildingOneResult });
            results.push({ index: uqInfo.buildingTwoDef.$index, result: uqBuildingTwoResult });
            results.sort((a, b) => { return a.index - b.index; });
        }
        shouldShowUniqueQuarter = ShouldShowUniqueQuarter(uqBuildingOneResult, uqBuildingTwoResult);
    }
    for (const { index, result } of results) {
        const definition = index === uqInfo?.buildingOneDef.$index ? uqInfo?.buildingOneDef :
            index === uqInfo?.buildingTwoDef.$index ? uqInfo?.buildingTwoDef :
                GameInfo.Constructibles.lookup(index);
        if (!definition) {
            console.error(`GetProductionItems: Failed to find ConstructibleDefinition for ConstructibleType: ${index}`);
            continue;
        }
        const isUniqueQuarterBuilding = uqInfo?.buildingOneDef.ConstructibleType === definition.ConstructibleType || uqInfo?.buildingTwoDef.ConstructibleType === definition.ConstructibleType;
        // don't hide the unique quarter buildings if you've already built one or can start one
        const hideIfUnavailable = isUniqueQuarterBuilding ? !shouldShowUniqueQuarter : !viewHidden;
        const data = GetConstructibleItemData(definition, city, result, hideIfUnavailable);
        if (!data) {
            continue;
        }
        data.recommendations = AdvisorUtilities.getBuildRecommendationIcons(recommendations, data.type);
        items[data.category].push(data);
    }
    return items;
};
const getConstructibleClassPanelCategory = (constructibleClass) => {
    switch (constructibleClass) {
        case 'IMPROVEMENT':
            return ProductionPanelCategory.BUILDINGS;
        case 'WONDER':
            return ProductionPanelCategory.WONDERS;
        default:
            return ProductionPanelCategory.BUILDINGS;
    }
};
const getUnits = (city, playerGoldBalance, isPurchase, recommendations, viewHidden) => {
    const units = [];
    if (!city?.Gold) {
        console.error(`getUnits: received a null/undefined city`);
        return units;
    }
    const cityGoldLibrary = city.Gold;
    let results;
    if (isPurchase) {
        results = Game.CityCommands.canStartQuery(city.id, CityCommandTypes.PURCHASE, CityQueryType.Unit);
    }
    else {
        results = Game.CityOperations.canStartQuery(city.id, CityOperationTypes.BUILD, CityQueryType.Unit);
    }
    for (const { index, result } of results) {
        if (!viewHidden && !result.Success) {
            continue;
        }
        if (result.Requirements?.FullFailure || result.Requirements?.Obsolete) {
            continue;
        }
        const definition = GameInfo.Units.lookup(index);
        if (!definition) {
            console.error(`getUnits: Failed to find UnitDefinition for UnitType: ${index}`);
            continue;
        }
        const cost = cityGoldLibrary.getUnitPurchaseCost(YieldTypes.YIELD_GOLD, definition.UnitType);
        const secondaryDetails = GetSecondaryDetailsHTML(GetUnitStatsFromDefinition(definition));
        const turns = isPurchase ? -1 : city.BuildQueue.getTurnsLeft(definition.UnitType) ?? -1;
        const data = {
            name: definition.Name,
            type: definition.UnitType,
            ageless: false,
            cost,
            turns,
            showTurns: false,
            showCost: cost > 0,
            insufficientFunds: cost > playerGoldBalance,
            disabled: !result.Success,
            category: ProductionPanelCategory.UNITS,
            secondaryDetails
        };
        if (result.Requirements?.MeetsRequirements) {
            data.recommendations = AdvisorUtilities.getBuildRecommendationIcons(recommendations, data.type);
        }
        if (result.Requirements?.NeededProgressionTreeNode) {
            const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(result.Requirements.NeededProgressionTreeNode);
            if (nodeInfo) {
                data.error = Locale.compose('LOC_UI_PRODUCTION_REQUIRES', nodeInfo.Name);
            }
        }
        if (result.Requirements?.NeededPopulation) {
            data.error = Locale.compose('LOC_UI_PRODUCTION_REQUIRES_POPULATION', result.Requirements.NeededPopulation);
        }
        if (result.FailureReasons) {
            data.error = result.FailureReasons.join("\n");
        }
        units.push(data);
    }
    return units;
};
/**
 * performs the engine calls to actually produce/purchase a unit, building, etc
 */
export const Construct = (city, item, isPurchase) => {
    const typeInfo = GameInfo.Types.lookup(item.type);
    if (typeInfo) {
        let args;
        switch (typeInfo.Kind) {
            case 'KIND_CONSTRUCTIBLE':
                args = {
                    ConstructibleType: typeInfo.Hash
                };
                break;
            case 'KIND_UNIT':
                args = {
                    UnitType: typeInfo.Hash
                };
                break;
            case 'KIND_PROJECT':
                args = {
                    ProjectType: typeInfo.Hash
                };
                break;
            default:
                console.error(`Construct: Constructing unsupported kind ${typeInfo.Kind}.`);
                return false;
        }
        let result;
        // Project check on next line temporary addition so can share panel with purchases (EFB 5/5/21)
        if (isPurchase && typeInfo.Kind != 'KIND_PROJECT') {
            result = Game.CityCommands.canStart(city.id, CityCommandTypes.PURCHASE, args, false);
        }
        else {
            result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, args, false);
        }
        if (result.Success) {
            // Do we have an interface mode AND the build is not in progress?
            if (item.interfaceMode && !result.InProgress) {
                InterfaceMode.switchTo(item.interfaceMode, { CityID: city.id, OperationArguments: args, IsPurchasing: isPurchase });
                return false;
            }
            else {
                // In progress already and we have a location for it?
                if (result.InProgress && result.Plots) {
                    // Add the location to the request, this will resume the build at the location
                    const loc = GameplayMap.getLocationFromIndex(result.Plots[0]);
                    args.X = loc.x;
                    args.Y = loc.y;
                }
                // Project check on next line temporary addition so can share panel with purchases (EFB 5/5/21)
                if (isPurchase && typeInfo.Kind != 'KIND_PROJECT') {
                    Game.CityCommands.sendRequest(city.id, CityCommandTypes.PURCHASE, args);
                }
                else {
                    // Projects in town need to be exclusive (only one item in queue at a time)
                    if (typeInfo.Kind == 'KIND_PROJECT' && city.isTown) {
                        args.InsertMode = CityOperationsParametersValues.Exclusive;
                    }
                    Game.CityOperations.sendRequest(city.id, CityOperationTypes.BUILD, args);
                }
                //    this.proposedConstructible = typeInfo.Hash;
                return true;
            }
        }
    }
    else {
        // Since we selected something we can't actually construct
        if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            InterfaceMode.switchToDefault();
        }
        return false;
    }
    return false;
};
export const GetCityBuildReccomendations = (city) => {
    if (!city)
        return [];
    const recommendationParams = {
        cityId: city.id,
        subject: AdvisorySubjectTypes.PRODUCTION,
        maxReturnedEntries: 0,
    };
    return Players.Advisory.get(city.owner)?.getBuildRecommendations(recommendationParams) ?? [];
};
export const GetTownFocusItems = (cityID) => {
    const projects = [];
    projects.push({
        name: "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH",
        description: "LOC_PROJECT_TOWN_FOOD_INCREASE_DESCRIPTION",
        growthType: GrowthTypes.EXPAND,
        projectType: ProjectTypes.NO_PROJECT,
        tooltipDescription: "LOC_PROJECT_TOWN_FOOD_INCREASE_TOOLTIP_DESCRIPTION",
    });
    // Taxes
    const resultsTax = Game.CityCommands.canStart(cityID, CityCommandTypes.CHANGE_GROWTH_MODE, { Type: GrowthTypes.PROJECT }, false);
    resultsTax.Projects?.forEach(ID => {
        const projectInfo = GameInfo.Projects.lookup(ID);
        if (projectInfo) {
            projects.push({
                name: projectInfo.Name,
                description: projectInfo.Description,
                growthType: GrowthTypes.PROJECT,
                projectType: projectInfo.$hash,
                tooltipDescription: 'LOC_PROJECT_DEFAULT_TOOLTIP_DESCRIPTION',
            });
        }
    });
    return projects;
};
const isSelectedFocusItem = (currentGrowthType, currentProjectType, item) => {
    return currentGrowthType === GrowthTypes.PROJECT ?
        currentProjectType === item.projectType :
        currentGrowthType === item.growthType;
};
export const GetCurrentTownFocus = (cityID, currentGrowthType, currentProjectType) => {
    const focusProjects = GetTownFocusItems(cityID);
    const currentFocus = focusProjects.find(item => isSelectedFocusItem(currentGrowthType, currentProjectType, item)) ?? null;
    return currentFocus;
};
/**
* Send request to change the city's growth type.
* @param growthType
* @returns if request is completed and menu can close
*/
export const SetTownFocus = (cityID, sType, projectType) => {
    const args = {
        Type: parseInt(sType),
        ProjectType: parseInt(projectType),
        City: cityID.id,
    };
    const result = Game.CityCommands.canStart(cityID, CityCommandTypes.CHANGE_GROWTH_MODE, args, false);
    if (result.Success) {
        Game.CityCommands.sendRequest(cityID, CityCommandTypes.CHANGE_GROWTH_MODE, args);
        return null;
    }
    else {
        return result;
    }
};
export const GetTownFocusBlp = (growthType, projectType) => {
    growthType = typeof growthType === 'string' ? parseInt(growthType) : growthType;
    projectType = typeof projectType === 'string' ? parseInt(projectType) : projectType;
    let iconBlp = UI.getIconBLP('DEFAULT_PROJECT');
    if (growthType != null && growthType === GrowthTypes.EXPAND) {
        iconBlp = UI.getIconBLP('PROJECT_GROWTH');
    }
    if (projectType != null && projectType !== ProjectTypes.NO_PROJECT) {
        const projectTypeName = GameInfo.Projects.lookup(projectType)?.ProjectType;
        if (projectTypeName) {
            iconBlp = UI.getIconBLP(projectTypeName);
        }
    }
    return iconBlp;
};

//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-helpers.js.map
