/**
 * @file interface-mode-place-buildings.ts
 * @copyright 2021-2023, Firaxis Games
 * @description Interface mode when the player wants to place a building in a city
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import BuildingPlacementManager from '/base-standard/ui/building-placement/building-placement-manager.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js';
import { City } from '/base-standard/ui/city-selection/city-selection.js';
import { CityZoomer } from '/base-standard/ui/city-zoomer/city-zoomer.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { CursorUpdatedEventName } from '/core/ui/input/cursor.js';
import { PlotCursorUpdatedEventName } from '/core/ui/input/plot-cursor.js';
import DialogManager from '/core/ui/dialog-box/manager-dialog-box.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ProductionChooserScreen } from '/base-standard/ui/production-chooser/panel-production-chooser.js';
var HighlightColors;
(function (HighlightColors) {
    HighlightColors[HighlightColors["okay"] = 3355505406] = "okay";
    HighlightColors[HighlightColors["good"] = 3357402549] = "good";
    HighlightColors[HighlightColors["best"] = 3360534819] = "best";
})(HighlightColors || (HighlightColors = {}));
/**
 * Handler for INTERFACEMODE_PLACE_BUILDING.
 */
class PlaceBuildingInterfaceMode extends ChoosePlotInterfaceMode {
    constructor() {
        super(...arguments);
        this.isPurchasing = false;
        this.plotOverlay = null;
        this.lastHoveredPlot = -1;
        this.mapFocused = true;
        this.OUTER_REGION_OVERLAY_FILTER = { saturation: 0.1, brightness: 0.3 }; //Semi-opaque dark grey to darken plots outside of the city
        this.cursorUpdateListener = this.onCursorUpdated.bind(this);
        this.plotCursorUpdatedListener = this.onPlotCursorUpdated.bind(this);
    }
    initialize() {
        const context = this.Context;
        this.isPurchasing = context.IsPurchasing;
        const city = Cities.get(context.CityID);
        if (!city) {
            console.error("interface-mode-place-building: Unable to find city with CityID: " + ComponentID.toLogString(context.CityID));
            return false;
        }
        PlotCursor.plotCursorCoords = city.location;
        let result;
        if (this.isPurchasing) {
            result = Game.CityCommands.canStart(context.CityID, CityCommandTypes.PURCHASE, context.OperationArguments, false);
        }
        else {
            result = Game.CityOperations.canStart(context.CityID, CityOperationTypes.BUILD, context.OperationArguments, false);
        }
        const constructible = GameInfo.Constructibles.lookup(context.OperationArguments.ConstructibleType);
        if (!constructible) {
            console.error("interface-mode-place-building: No valid ConstructibleDefinition from ConstructibleType: " + context.OperationArguments.ConstructibleType);
            InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: context.CityID });
            return false;
        }
        BuildingPlacementManager.selectPlacementData(context.CityID, result, constructible);
        LensManager.setActiveLens("fxs-building-placement-lens");
        return true;
    }
    transitionTo(oldMode, newMode, context) {
        super.transitionTo(oldMode, newMode, context);
        ProductionChooserScreen.shouldReturnToPurchase = this.isPurchasing;
        // Lock out automatic cursor changes
        UI.lockCursor(true);
        // Set the building placement cursor
        UI.setCursorByURL("fs://game/core/ui/cursors/place.ani");
        this.lastHoveredPlot = -1;
        window.addEventListener(CursorUpdatedEventName, this.cursorUpdateListener);
        window.addEventListener(PlotCursorUpdatedEventName, this.plotCursorUpdatedListener);
        WorldUI.setUnitVisibility(false);
        waitForLayout(() => this.setMapFocused(true));
    }
    transitionFrom(oldMode, newMode) {
        //Remove the city hex filter and return to previous zoom level
        WorldUI.popFilter();
        CityZoomer.resetZoom();
        if (this.plotOverlay) {
            this.plotOverlay.clear();
        }
        window.removeEventListener(CursorUpdatedEventName, this.cursorUpdateListener);
        window.removeEventListener(PlotCursorUpdatedEventName, this.plotCursorUpdatedListener);
        WorldUI.setUnitVisibility(true);
        UI.lockCursor(false);
        LensManager.setActiveLens('fxs-default-lens');
        super.transitionFrom(oldMode, newMode);
    }
    /** @interface Handler  */
    canEnterMode(parameters) {
        const context = parameters;
        return (context && context.IsPurchasing != undefined && ComponentID.isValid(context.CityID));
    }
    reset() {
        BuildingPlacementManager.reset();
    }
    selectPlot(plot, _previousPlot) {
        if (BuildingPlacementManager.selectedPlotIndex == null || BuildingPlacementManager.selectedPlotIndex != GameplayMap.getIndexFromLocation(plot)) {
            BuildingPlacementManager.selectedPlotIndex = GameplayMap.getIndexFromLocation(plot);
        }
        else {
            if (this.isPlotProposed) {
                throw new Error("A plot is already being proposed.");
            }
            this.isPlotProposed = true;
            this.proposePlot(plot, () => { this.acceptProposePlotCallback(plot); }, () => this.isPlotProposed = false);
        }
        return false;
    }
    decorate(overlay) {
        const context = this.Context;
        const selectedCity = Cities.get(context.CityID);
        if (!selectedCity) {
            console.error("interface-mode-place-building: Unable to retrieve city with CityID: " + ComponentID.toLogString(context.CityID));
            return;
        }
        CityZoomer.zoomToCity(selectedCity);
        //Darken all plots not in the city
        WorldUI.pushRegionColorFilter(selectedCity.getPurchasedPlots(), {}, this.OUTER_REGION_OVERLAY_FILTER);
        this.plotOverlay = overlay.addPlotOverlay();
        this.plotOverlay.addPlots(BuildingPlacementManager.urbanPlots, { fillColor: HighlightColors.best });
        this.plotOverlay.addPlots(BuildingPlacementManager.developedPlots, { fillColor: HighlightColors.okay });
        this.plotOverlay.addPlots(BuildingPlacementManager.expandablePlots, { fillColor: HighlightColors.good });
    }
    onPlotCursorUpdated(event) {
        this.onPlotUpdated(event.detail.plotCoords);
    }
    onCursorUpdated(event) {
        this.onPlotUpdated(event.detail.plot);
    }
    /**
     * @override
     */
    decorateHover(plotCoord, cursorOverlay, cursorModelGroup) {
        cursorOverlay.clearAll();
        cursorModelGroup.clear();
        cursorModelGroup.addVFXAtPlot("VFX_3dUI_PlotCursor_City_Picker", plotCoord, { x: 0, y: 0, z: 0 });
    }
    onPlotUpdated(plot) {
        if (plot) {
            const plotIndex = GameplayMap.getIndexFromLocation(plot);
            if (plotIndex != this.lastHoveredPlot) {
                this.lastHoveredPlot = plotIndex;
                // Valid plots are already ready to accept a building
                if (BuildingPlacementManager.isValidPlacementPlot(plotIndex)) {
                    UI.setCursorByURL("fs://game/core/ui/cursors/place.ani");
                }
                else {
                    UI.setCursorByURL("fs://game/core/ui/cursors/cantplace.ani");
                }
                if (plotIndex != BuildingPlacementManager.hoveredPlotIndex) {
                    // We also want to select the hovered plot so BuildingPlacementManager
                    // knows we're wanting to place the building with the next click
                    BuildingPlacementManager.hoveredPlotIndex = plotIndex;
                    BuildingPlacementManager.selectedPlotIndex = plotIndex;
                }
                Audio.playSound('data-audio-city-production-placement-focus', 'city-actions');
            }
        }
    }
    acceptProposePlotCallback(plot) {
        this.commitPlot(plot);
        const selectedCityID = UI.Player.getHeadSelectedCity(); // May be null if placing results in deselecting city
        if (selectedCityID && ComponentID.isValid(selectedCityID)) {
            if (!(this.isPurchasing) && City.isQueueEmpty(selectedCityID)) {
                UI.Player.deselectAllCities();
                InterfaceMode.switchToDefault();
            }
            else {
                InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: selectedCityID });
            }
        }
        else {
            console.warn("Attempt to jump back to the city product (hopefully that was the previous UI mode) but no city is selected!");
            InterfaceMode.switchToDefault();
        }
    }
    proposePlot(plot, accept, reject) {
        const plotIndex = GameplayMap.getIndexFromLocation(plot);
        //Urban plots and undeveloped plots are ready to accept the building placement
        if (BuildingPlacementManager.urbanPlots.find(p => p == plotIndex) || BuildingPlacementManager.expandablePlots.find(p => p == plotIndex)) {
            accept();
            Audio.playSound('data-audio-city-production-placement-activate', 'city-actions');
        }
        //Building over a developed plot requires confirmation to replace the improvement on that plot
        else if (BuildingPlacementManager.developedPlots.find(p => p == plotIndex)) {
            const acceptCallback = () => {
                accept();
                Audio.playSound('data-audio-city-production-placement-activate', 'city-actions');
            };
            const cancelCallback = () => {
                this.setMapFocused(true);
                reject();
            };
            if (!BuildingPlacementManager.currentConstructible) {
                console.error("interface-mode-place-building: No valid currentConstructible variable in BuildingPlacementManager!");
                reject();
                return;
            }
            const oldImprovementName = this.getImprovementName(plot);
            const okOption = {
                actions: ["accept"],
                label: "LOC_GENERIC_OK",
                callback: acceptCallback,
            };
            const cancelOption = {
                actions: ["cancel", "keyboard-escape", "mousebutton-right"],
                label: "LOC_GENERIC_CANCEL",
                callback: cancelCallback,
            };
            const options = [okOption, cancelOption];
            if (BuildingPlacementManager.currentConstructible.ConstructibleClass == 'WONDER') {
                const body = oldImprovementName != "" ?
                    Locale.compose('LOC_BUILDING_PLACEMENT_REMOVE_IMPOVEMENT_BODY', oldImprovementName, BuildingPlacementManager.currentConstructible.Name)
                    : Locale.compose('LOC_BUILDING_PLACEMENT_REMOVE_GENERIC_IMPOVEMENT_BODY', BuildingPlacementManager.currentConstructible.Name);
                NavTray.clear();
                DialogManager.createDialog_MultiOption({
                    body: body,
                    title: "LOC_BUILDING_PLACEMENT_REMOVE_IMPOVEMENT",
                    options: options,
                    canClose: false,
                });
            }
            else {
                const replacedConstructibleType = MapConstructibles.getReplaceableConstructible(plot.x, plot.y);
                if (replacedConstructibleType == -1) {
                    const body = oldImprovementName != "" ?
                        Locale.compose('LOC_BUILDING_PLACEMENT_CREATE_URBAN_TILE_REMOVE_IMPROVEMENT', oldImprovementName, BuildingPlacementManager.currentConstructible.Name)
                        : Locale.compose('LOC_BUILDING_PLACEMENT_CREATE_URBAN_TILE_BODY', BuildingPlacementManager.currentConstructible.Name);
                    NavTray.clear();
                    DialogManager.createDialog_MultiOption({
                        body: body,
                        title: "LOC_BUILDING_PLACEMENT_CREATE_URBAN_TILE",
                        options: options,
                        canClose: false,
                    });
                }
                else {
                    const body = Locale.compose('LOC_BUILDING_PLACEMENT_REPLACE_BUILDING_BODY', BuildingPlacementManager.currentConstructible.Name);
                    NavTray.clear();
                    DialogManager.createDialog_MultiOption({
                        body: body,
                        title: "LOC_BUILDING_PLACEMENT_REPLACE_BUILDING",
                        options: options,
                        canClose: false,
                    });
                }
            }
        }
        else {
            // Allow player to propose another plot
            this.isPlotProposed = false;
        }
    }
    getImprovementName(plotCoord) {
        const constructibles = MapConstructibles.getConstructibles(plotCoord.x, plotCoord.y);
        // only one improvement is possible per tile, so find it if there is one
        for (const constructible of constructibles) {
            const instance = Constructibles.getByComponentID(constructible);
            if (instance) {
                const info = GameInfo.Constructibles.lookup(instance.type);
                if ((info) && (info.ConstructibleClass == "IMPROVEMENT")) {
                    return Locale.compose(info.Name);
                }
            }
        }
        console.error(`interface-mode-place-building: Failed to find improvement where one should exist at ${plotCoord}`);
        return "";
    }
    commitPlot(plot) {
        const context = this.Context;
        const cityID = context.CityID;
        const operationArgs = context.OperationArguments;
        operationArgs.X = plot.x;
        operationArgs.Y = plot.y;
        let result = null;
        if (this.isPurchasing) {
            result = Game.CityCommands.canStart(cityID, CityCommandTypes.PURCHASE, operationArgs, false);
            if (result.Success) {
                Game.CityCommands.sendRequest(cityID, CityCommandTypes.PURCHASE, operationArgs);
            }
            else {
                // Allow the player to propose another plot
                this.isPlotProposed = false;
            }
        }
        else {
            result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, operationArgs, false);
            if (result.Success) {
                Game.CityOperations.sendRequest(cityID, CityOperationTypes.BUILD, operationArgs);
            }
            else {
                // Allow the player to propose another plot
                this.isPlotProposed = false;
            }
        }
        if (result.Success) {
            engine.trigger("CommitPlotBuildingPlacement");
        }
    }
    updateNavTray() {
        NavTray.clear();
        if (this.mapFocused) {
            NavTray.addOrUpdateNextAction("LOC_UI_FOCUS_PLACEMENT_INFO");
        }
        else {
            NavTray.addOrUpdateShellAction2("LOC_UI_FOCUS_WORLD");
        }
        NavTray.addOrUpdateGenericCancel();
    }
    setMapFocused(isMapFocused) {
        if (!this.placeBuildingPanel) {
            this.placeBuildingPanel = MustGetElement(".panel-place-building");
        }
        this.mapFocused = isMapFocused;
        this.updateNavTray();
        if (this.mapFocused) {
            Input.setActiveContext(InputContext.World);
        }
        else {
            Input.setActiveContext(InputContext.Shell);
            if (this.placeBuildingPanel) {
                FocusManager.setFocus(this.placeBuildingPanel);
            }
        }
    }
    handleInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return true;
        }
        if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
            const selectedCityID = UI.Player.getHeadSelectedCity(); // May be null if placing results in deselecting city
            if (selectedCityID && ComponentID.isValid(selectedCityID)) {
                InterfaceMode.switchTo("INTERFACEMODE_CITY_PRODUCTION", { CityID: selectedCityID });
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
                return false;
            }
        }
        const eventToLookFor = this.mapFocused ? "next-action" : "shell-action-2";
        if (inputEvent.detail.name == eventToLookFor) {
            this.setMapFocused(!this.mapFocused);
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
            return false;
        }
        return true;
    }
}
InterfaceMode.addHandler('INTERFACEMODE_PLACE_BUILDING', new PlaceBuildingInterfaceMode());

//# sourceMappingURL=file:///base-standard/ui/interface-modes/interface-mode-place-building.js.map
