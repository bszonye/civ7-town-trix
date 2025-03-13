/**
 * @file panel-production-chooser.ts
 * @copyright 2021-2024, Firaxis Games
 * @description The 'view' of a city's production queue
 */
import DialogManager, { DialogBoxAction } from '/core/ui/dialog-box/manager-dialog-box.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { CityDetailsClosedEventName } from '/base-standard/ui/city-details/panel-city-details.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { FocusCityViewEventName } from '/base-standard/ui/views/view-city.js';
import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import ViewManager from '/core/ui/views/view-manager.js';
import { IsElement, MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { ProductionPanelCategory, GetPrevCityID, GetNextCityID, CreateProductionChooserItem, GetProductionItems, Construct, GetCityBuildReccomendations, GetCurrentTownFocus, SetTownFocus, GetUniqueQuarterForPlayer, GetNumUniqueQuarterBuildingsCompleted } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { CanConvertToCity, ConvertToCity } from '/base-standard/ui/production-chooser/production-chooser-operations.js';
import './production-chooser-item.js';
import './panel-town-focus.js';
import './town-focus-section.js';
import './town-unrest-display.js';
import './city-yields.js';
import { ProductionChooserAccordionSection } from './production-chooser-accordion.js';
import { UpdateProductionChooserItem } from './production-chooser-item.js';
import BuildingPlacementManager from '/base-standard/ui/building-placement/building-placement-manager.js';
import { BuildQueue } from '/base-standard/ui/build-queue/model-build-queue.js';
import { UniqueQuarter } from '/base-standard/ui/production-chooser/production-chooser-unique-quarter.js';
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
const categoryLocalizationMap = {
    [ProductionPanelCategory.BUILDINGS]: 'LOC_UI_PRODUCTION_BUILDINGS',
    [ProductionPanelCategory.UNITS]: 'LOC_UI_PRODUCTION_UNITS',
    [ProductionPanelCategory.WONDERS]: 'LOC_UI_PRODUCTION_WONDERS',
    [ProductionPanelCategory.PROJECTS]: 'LOC_UI_PRODUCTION_PROJECTS'
};
export class ProductionChooserScreen extends Panel {
    set isPurchase(value) {
        if (value === this._isPurchase || (!value && this.city.isTown)) {
            return;
        }
        this._isPurchase = value;
        this.productionPurchaseTabBar.setAttribute('selected-tab-index', value ? '1' : '0');
        this.updateItems.call('isPurchase');
    }
    get isPurchase() {
        return this._isPurchase;
    }
    set cityID(value) {
        if (value === null || ComponentID.isMatch(value, this._cityID)) {
            return;
        }
        const city = Cities.get(value);
        if (!city) {
            console.error(`panel-production-chooser: Failed to get city with ID: ${ComponentID.toLogString(value)}`);
            return;
        }
        const hasUnrest = city.Happiness?.hasUnrest ?? false;
        const turnsOfUnrest = city.Happiness?.turnsOfUnrest ?? -1;
        const isTown = city.isTown;
        const growthType = city.Growth?.growthType;
        const projectType = city.Growth?.projectType;
        const canPurchase = Game.CityCommands.canStart(value, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_CONSTRUCT }, false).Success;
        this._cityID = value;
        this._recommendations = GetCityBuildReccomendations(city);
        this.uqInfo = GetUniqueQuarterForPlayer(city.owner);
        this._isPurchase = city.isTown;
        this.productionPurchaseTabBar.setAttribute('selected-tab-index', this._isPurchase ? '1' : '0');
        BuildingPlacementManager.initializePlacementData(this._cityID);
        BuildQueue.cityID = this._cityID;
        this.updateCityName(city);
        this.updateItems.call('cityID');
        const upgradeCost = city.Gold?.getTownUpgradeCost() ?? -1;
        this.updateUpgradeToCityButton(upgradeCost, city.isTown, city.id);
        this.updateCityStatus(city.isBeingRazed, hasUnrest);
        this.updateProductionPurchaseBar(isTown);
        this.updateTownFocusSection(city.id, isTown, hasUnrest, growthType, projectType);
        this.updateUnrestUi({ canPurchase, hasUnrest, turnsOfUnrest });
        const playerCities = Players.get(city.owner)?.Cities?.getCities();
        const hasMultipleCities = playerCities && playerCities?.length > 1;
        this.nextCityButton.classList.toggle('hidden', !hasMultipleCities);
        this.prevCityButton.classList.toggle('hidden', !hasMultipleCities);
        Camera.lookAtPlot(city.location);
    }
    get cityID() {
        if (!this._cityID) {
            this.cityID = UI.Player.getHeadSelectedCity();
        }
        if (!this._cityID || ComponentID.isInvalid(this._cityID)) {
            throw new Error('panel-production-chooser: City ID is invalid or not set');
        }
        return this._cityID;
    }
    get city() {
        return Cities.get(this.cityID); // Will never fail because city id must be valid
    }
    get recommendations() {
        this._recommendations ?? (this._recommendations = GetCityBuildReccomendations(this.city));
        return this._recommendations;
    }
    set playerGoldBalance(value) {
        this._playerGoldBalance = value;
        this.updateItems.call('playerGoldBalance');
    }
    get playerGoldBalance() {
        if (this._playerGoldBalance === -1) {
            const value = Players.Treasury.get(GameContext.localPlayerID)?.goldBalance;
            if (value === undefined) {
                console.error(`panel-production-chooser: Failed to get player gold balance`);
                this._playerGoldBalance = -1;
            }
            else {
                this._playerGoldBalance = value;
            }
        }
        return this._playerGoldBalance;
    }
    set items(value) {
        this._items = value;
        this.updateCategories(value);
    }
    get items() {
        this._items ?? (this._items = GetProductionItems(this.city, this.recommendations, this.playerGoldBalance, this.isPurchase, this.viewHidden, this.uqInfo));
        return this._items;
    }
    get viewHiddenActionText() {
        return this.viewHidden ? 'LOC_UI_PRODUCTION_HIDE_HIDDEN' : 'LOC_UI_PRODUCTION_VIEW_HIDDEN';
    }
    get viewHidden() { return this._viewHidden; }
    set viewHidden(value) {
        this.viewHiddenCheckbox.setAttribute('selected', value.toString());
        if (value === this._viewHidden) {
            return;
        }
        this._viewHidden = value;
        this.updateItems.call('viewHidden');
    }
    // #endregion
    // #region Component Lifecycle
    constructor(root) {
        super(root);
        this.SMALL_SCREEN_MODE_MAX_HEIGHT = 900;
        this.SMALL_SCREEN_MODE_MAX_WIDTH = 1700;
        // #region Bindings
        this.focusInListener = this.onFocusIn.bind(this);
        this.focusOutListener = this.onFocusOut.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.frameEngineInputListener = this.onFrameEngineInput.bind(this);
        this.onUpgradeToCityButtonListener = this.onUpgradeToCityButton.bind(this);
        this.viewFocusListener = this.onViewReceiveFocus.bind(this);
        this.onNextCityButtonListener = this.onNextCityButton.bind(this);
        this.onPrevCityButtonListener = this.onPrevCityButton.bind(this);
        this.onCityDetailsClosedListener = this.onCityDetailsClosed.bind(this);
        // #endregion
        // #region Component State
        this.isInitialLoadComplete = false;
        this.wasQueueInitiallyEmpty = false;
        this.lastFocusedPanel = null;
        this._isPurchase = false;
        this._cityID = null;
        this._playerGoldBalance = -1;
        this.itemElementMap = new Map();
        this._viewHidden = false;
        this.uqInfo = null;
        // #endregion
        // #region Element References
        this.frame = document.createElement("fxs-subsystem-frame");
        this.cityNameElement = document.createElement("fxs-header");
        this.cityStatusContainerElement = document.createElement("div");
        this.cityStatusIconElement = document.createElement("img");
        this.cityStatusTextElement = document.createElement("div");
        this.subPanelContainer = document.createElement("div");
        this.townFocusPanel = document.createElement("panel-town-focus");
        this.townFocusPanelCloseButton = document.createElement("fxs-close-button");
        this.buildQueue = document.createElement("panel-build-queue");
        this.prevCityButton = document.createElement("fxs-activatable");
        this.nextCityButton = document.createElement("fxs-activatable");
        this.productionPurchaseContainer = document.createElement("div");
        this.productionPurchaseTabBar = document.createElement("fxs-tab-bar");
        this.showCityDetailsButton = document.createElement("fxs-activatable");
        this.townFocusSection = document.createElement("town-focus-section");
        this.townUnrestDisplay = document.createElement("town-unrest-display");
        /* townPurchaseLabel replaces the production/purchase tab bar when the settlement is a town */
        this.townPurchaseLabel = document.createElement("div");
        this.viewHiddenCheckbox = document.createElement('fxs-checkbox');
        this.productionAccordion = document.createElement("fxs-vslot");
        this.productionCategorySlots = Object.values(ProductionPanelCategory).reduce((acc, category) => {
            const id = `production-category-${category}`;
            acc[category] = new ProductionChooserAccordionSection(id, categoryLocalizationMap[category], true);
            return acc;
        }, {});
        this.uniqueQuarter = null;
        // #endregion
        // #region DOM Events
        this.onChooserItemSelected = (event) => {
            if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING") && IsElement(event.target, 'production-chooser-item')) {
                const category = event.target.dataset.category;
                const type = event.target.dataset.type;
                if (category && type) {
                    this.playSound('data-audio-activate', 'data-audio-activate-ref');
                    this.doOrConfirmConstruction(category, type);
                }
            }
        };
        this.onTownFocusItemSelected = (event) => {
            if (IsElement(event.target, 'town-focus-chooser-item')) {
                const { growthType, projectType } = event.target.dataset;
                if (growthType && projectType) {
                    // TODO: we should also only show the confirmation dialog if the specialization hasn't already been selected
                    const showConfirmationDialog = parseInt(growthType) !== GrowthTypes.EXPAND;
                    if (showConfirmationDialog) {
                        DialogManager.createDialog_ConfirmCancel({
                            body: "LOC_TOWN_SET_FOCUS_DIALOG_BODY",
                            title: "LOC_TOWN_SET_FOCUS_DIALOG_TITLE",
                            callback: (eAction) => {
                                if (eAction == DialogBoxAction.Confirm) {
                                    SetTownFocus(this.cityID, growthType, projectType);
                                }
                            }
                        });
                    }
                    else {
                        SetTownFocus(this.cityID, growthType, projectType);
                    }
                }
                else {
                    console.error(`panel-production-chooser: onTownFocusItemSelected: Failed to get valid growthType or projectType`);
                }
                event.stopPropagation();
                event.preventDefault(); // Prevent setting the "selected" attribute
            }
        };
        this.onCloseTownFocusPanel = () => {
            this.Root.dataset.showTownFocus = 'false';
        };
        this.onCurrentFocusItemSelected = (event) => {
            this.Root.dataset.showTownFocus = 'true';
            event.stopPropagation();
            event.preventDefault(); // Prevent setting the "selected" attribute
        };
        this.onViewHiddenChanged = (e) => {
            this.viewHidden = e.detail.value;
        };
        this.onCityDetailsActivated = () => {
            this.panelProductionSlot.classList.toggle("hidden", this.isSmallScreen());
            this.frame.classList.remove("trigger-nav-help");
            this.showCityDetails();
        };
        this.onFocusCityViewEvent = (event) => {
            if (event.detail.destination != 'left') {
                // Ignore since we're not trying to focus this area of the city view
                return;
            }
            FocusManager.setFocus(this.productionAccordion);
        };
        this.onProductionPurchaseTabSelected = (e) => {
            const isPurchase = e.detail.selectedItem.id === 'production-chooser-tab-purchase';
            if (isPurchase === this.isPurchase) {
                return;
            }
            this.isPurchase = isPurchase;
            if (this.isPurchase) {
                Audio.playSound('data-audio-city-production-purchase-mode', 'city-actions');
            }
        };
        this.requestClose = () => {
            // This is a fix for an edge case issue where
            // interface-modes/views get mixed up when quickly switching between them
            const selectedCityID = UI.Player.getHeadSelectedCity();
            if (!selectedCityID && InterfaceMode.isInInterfaceMode('INTERFACEMODE_DEFAULT')) {
                ViewManager.setCurrentByName('World');
            }
            UI.Player.deselectAllCities(); // If this is not called, no signaling picked up by production panel (and build queue?) and stays partially open.
            super.close();
        };
        this.updateItems = new UpdateGate(() => {
            if (!this.isInitialLoadComplete) {
                return;
            }
            const city = this.city;
            const items = GetProductionItems(city, this.recommendations, this.playerGoldBalance, this.isPurchase, this.viewHidden, this.uqInfo);
            const newItems = Object.values(ProductionPanelCategory)
                .flatMap(category => items[category].map(item => item.type));
            const newItemsSet = new Set(newItems);
            let resetFocus = false; // flag to reset the focus if we remove a production item that is currently focused
            const currentFocus = FocusManager.getFocus();
            // remove extra production chooser items from the itemElementMap that don't exist in the incoming item categories
            for (const [type, item] of this.itemElementMap) {
                if (!newItemsSet.has(type)) {
                    resetFocus || (resetFocus = currentFocus === item);
                    item.remove();
                    this.itemElementMap.delete(type);
                }
            }
            this.items = items;
            // TODO: fix slot children mutation to be looking to the subtree, until then, we need to explicitly reset the focus
            if (resetFocus || this.Root.contains(currentFocus) && !this.buildQueue.contains(currentFocus)) {
                FocusManager.setFocus(this.productionAccordion);
            }
        });
        this.onInterfaceModeChanged = () => {
            switch (InterfaceMode.getCurrent()) {
                case "INTERFACEMODE_CITY_PRODUCTION":
                    if (!this.city.isJustConqueredFrom) {
                        FocusManager.setFocus(this.productionAccordion);
                        this.updateNavTray();
                        this.setHidden(false);
                    }
                    else {
                        this.setHidden(true);
                    }
                    break;
                default:
                    this.setHidden(true);
                    break;
            }
        };
        this.animateInType = this.animateOutType = 5 /* AnchorType.RelativeToLeft */;
        const [upgradeToCityButton, costElement] = this.renderUpgradeToCityButton();
        this.upgradeToCityButton = upgradeToCityButton;
        this.upgradeToCityButtonCostElement = costElement;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
    }
    onInitialize() {
        super.onInitialize();
        this.render();
        // const scrollable = this.frame.querySelector('fxs-scrollable');
        // scrollable?.whenComponentCreated(component => component.setEngineInputProxy(this.Root));
        if (!this.Root.hasAttribute('data-show-town-focus')) {
            this.Root.setAttribute('data-show-town-focus', 'false');
        }
        this.cityID = UI.Player.getHeadSelectedCity();
        this.townUnrestDisplay.setAttribute("data-slot", "header");
        this.wasQueueInitiallyEmpty = this.city.BuildQueue?.getQueue().length === 0;
    }
    onAttach() {
        super.onAttach();
        this.cityDetailsSlot = MustGetElement('.panel-city-details-slot');
        this.panelProductionSlot = MustGetElement('.panel-production-slot');
        // Load items and trigger events in the chooser after initial render
        delayByFrame(() => {
            this.isInitialLoadComplete = true;
            engine.on('CityGovernmentLevelChanged', this.onCityGovernmentLevelChanged, this);
            engine.on('CityGrowthModeChanged', this.onCityGrowthModeChanged, this);
            engine.on('CityProductionQueueChanged', this.onCityProductionQueueChanged, this);
            engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
            engine.on('ConstructibleAddedToMap', this.onConstructibleAddedToMap, this);
            engine.on('TreasuryChanged', this.onPlayerTreasuryChanged, this);
            window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
            window.addEventListener(CityDetailsClosedEventName, this.onCityDetailsClosedListener);
            window.addEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);
            this.Root.addEventListener('focusin', this.focusInListener);
            this.Root.addEventListener('focusout', this.focusOutListener);
            this.Root.addEventListener('engine-input', this.engineInputListener);
            this.Root.addEventListener('view-receive-focus', this.viewFocusListener);
            this.frame.addEventListener('subsystem-frame-close', this.requestClose);
            this.frame.addEventListener('engine-input', this.frameEngineInputListener);
            this.townFocusPanel.addEventListener('chooser-item-selected', this.onTownFocusItemSelected);
            this.viewHiddenCheckbox.addEventListener('component-value-changed', this.onViewHiddenChanged);
            this.productionPurchaseTabBar.addEventListener('tab-selected', this.onProductionPurchaseTabSelected);
            this.nextCityButton.addEventListener('action-activate', this.onNextCityButtonListener);
            this.prevCityButton.addEventListener('action-activate', this.onPrevCityButtonListener);
            this.upgradeToCityButton.addEventListener('action-activate', this.onUpgradeToCityButtonListener);
            this.showCityDetailsButton.addEventListener('action-activate', this.onCityDetailsActivated);
            this.townFocusSection.addEventListener('chooser-item-selected', this.onCurrentFocusItemSelected);
            this.townFocusPanelCloseButton.addEventListener('action-activate', this.onCloseTownFocusPanel);
            this.productionAccordion.addEventListener('chooser-item-selected', this.onChooserItemSelected);
            this.onInterfaceModeChanged();
            this.updateItems.call('onAttach');
            if (this.city?.isTown) {
                Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
            }
        }, 3);
    }
    onDetach() {
        engine.off('CityGovernmentLevelChanged', this.onCityGovernmentLevelChanged, this);
        engine.off('CityGrowthModeChanged', this.onCityGrowthModeChanged, this);
        engine.off('CityProductionQueueChanged', this.onCityProductionQueueChanged, this);
        engine.off('CitySelectionChanged', this.onCitySelectionChanged, this);
        engine.off('ConstructibleAddedToMap', this.onConstructibleAddedToMap, this);
        engine.off('TreasuryChanged', this.onPlayerTreasuryChanged, this);
        window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
        window.removeEventListener(CityDetailsClosedEventName, this.onCityDetailsClosedListener);
        window.removeEventListener(FocusCityViewEventName, this.onFocusCityViewEvent);
        this.frame.removeEventListener('subsystem-frame-close', this.requestClose);
        this.Root.removeEventListener('focusin', this.focusInListener);
        this.Root.removeEventListener('focusout', this.focusOutListener);
        this.Root.removeEventListener('view-receive-focus', this.viewFocusListener);
        this.townFocusPanel.removeEventListener('chooser-item-selected', this.onTownFocusItemSelected);
        this.townFocusPanelCloseButton.removeEventListener('action-activate', this.onCloseTownFocusPanel);
        this.viewHiddenCheckbox.removeEventListener('component-value-changed', this.onViewHiddenChanged);
        this.productionPurchaseTabBar.removeEventListener('tab-selected', this.onProductionPurchaseTabSelected);
        this.nextCityButton.removeEventListener('action-activate', this.onNextCityButtonListener);
        this.prevCityButton.removeEventListener('action-activate', this.onPrevCityButtonListener);
        this.upgradeToCityButton.removeEventListener('action-activate', this.onUpgradeToCityButtonListener);
        this.showCityDetailsButton.removeEventListener('action-activate', this.onCityDetailsActivated);
        this.townFocusSection.removeEventListener('chooser-item-selected', this.onCurrentFocusItemSelected);
        this.productionAccordion.removeEventListener('chooser-item-selected', this.onChooserItemSelected);
        Object.values(this.productionCategorySlots).forEach(slot => slot.disconnect());
        super.onDetach();
    }
    // #endregion
    // #region Engine Events
    onCitySelectionChanged(data) {
        if (!data.selected) {
            return;
        }
        const c = Cities.get(data.cityID);
        if (!c || c.owner != GameContext.localPlayerID) {
            return;
        }
        else if (c.isJustConqueredFrom) {
            this.setHidden(true);
            this.cityID = data.cityID;
        }
        else {
            NavTray.clear();
            NavTray.addOrUpdateGenericBack();
            this.playAnimateInSound();
            this.cityID = data.cityID;
            this.playAnimateOutSound();
            this.setHidden(false);
        }
        this.updateNavTray();
    }
    onPlayerTreasuryChanged(data) {
        if (data.player != GameContext.localPlayerID) {
            return;
        }
        this._playerGoldBalance = data.goldBalance;
        const upgradeCost = this.city.Gold?.getTownUpgradeCost() ?? -1;
        const isTown = this.city.isTown;
        this.updateUpgradeToCityButton(upgradeCost, isTown, this.cityID);
    }
    onConstructibleAddedToMap(data) {
        const owningCityID = GameplayMap.getOwningCityFromXY(data.location.x, data.location.y);
        if (ComponentID.isMatch(this.cityID, owningCityID)) {
            this.updateItems.call('onConstructibleAddedToMap');
        }
    }
    onCityProductionQueueChanged({ cityID }) {
        if (ComponentID.isMatch(this.cityID, cityID)) {
            this.updateItems.call('onCityProductionQueueChanged');
        }
    }
    onCityGrowthModeChanged({ cityID }) {
        const city = this.city;
        if (city && ComponentID.isMatch(this.cityID, cityID)) {
            this.updateTownFocusSection(city.id, city.isTown, city.Happiness?.hasUnrest, city.Growth?.growthType, city.Growth?.projectType);
            this.Root.dataset.showTownFocus = 'false';
            FocusManager.setFocus(this.townFocusSection);
        }
    }
    onCityGovernmentLevelChanged({ cityID, governmentlevel }) {
        const city = Cities.get(cityID);
        if (city && ComponentID.isMatch(this.cityID, cityID)) {
            const isTown = governmentlevel === CityGovernmentLevels.TOWN;
            BuildingPlacementManager.initializePlacementData(cityID);
            this.updateProductionPurchaseBar(isTown);
            this.updateTownFocusSection(this.cityID, isTown, city.Happiness?.hasUnrest, city.Growth?.growthType, city.Growth?.projectType);
            this.updateUpgradeToCityButton(city.Gold?.getTownUpgradeCost() ?? -1, isTown, this.cityID);
            // Unsure of how changing to a town may or may not affect production items, so update them just in case
            this.updateItems.call('onCityGovernmentLevelChanged');
        }
    }
    onPrevCityButton() {
        const prevCityId = GetPrevCityID(this.cityID);
        if (ComponentID.isValid(prevCityId)) {
            UI.Player.selectCity(prevCityId);
        }
    }
    onCityDetailsClosed() {
        this.panelProductionSlot.classList.remove("hidden");
        this.frame.classList.add("trigger-nav-help");
        FocusManager.setFocus(this.productionAccordion);
    }
    onNextCityButton() {
        const nextCityId = GetNextCityID(this.cityID);
        if (ComponentID.isValid(nextCityId)) {
            UI.Player.selectCity(nextCityId);
        }
    }
    isSmallScreen() {
        return window.innerHeight <= this.SMALL_SCREEN_MODE_MAX_HEIGHT || window.innerWidth <= this.SMALL_SCREEN_MODE_MAX_WIDTH;
    }
    onFocusIn(event) {
        const focusedPanel = event.target instanceof HTMLElement ? this.getElementParentPanel(event.target) : null;
        if (focusedPanel !== this.lastFocusedPanel) {
            this.lastFocusedPanel?.classList.remove('trigger-nav-help');
            focusedPanel?.classList.add('trigger-nav-help');
            this.lastFocusedPanel = focusedPanel;
            if (focusedPanel === this.frame) {
                this.updateNavTray();
            }
        }
    }
    onFocusOut(event) {
        const relatedTarget = event.relatedTarget;
        if (!(relatedTarget instanceof HTMLElement))
            return;
        if (!this.Root.contains(relatedTarget)) {
            this.lastFocusedPanel?.classList.remove('trigger-nav-help');
            this.lastFocusedPanel = null;
        }
    }
    onUpgradeToCityButton() {
        DialogManager.createDialog_ConfirmCancel({
            body: "LOC_PROJECT_TOWN_UPGRADE_DIALOG_BODY",
            title: "LOC_PROJECT_TOWN_UPGRADE_DIALOG_TITLE",
            callback: (eAction) => {
                if (eAction == DialogBoxAction.Confirm) {
                    const success = ConvertToCity(this.cityID);
                    if (!success) {
                        // TODO: Show error message
                    }
                }
            }
        });
    }
    // #endregion
    showCityDetails() {
        const cityDetailsPanel = this.cityDetailsSlot.querySelector(".panel-city-details");
        if (cityDetailsPanel) {
            cityDetailsPanel.classList.toggle("hidden");
            if (!cityDetailsPanel.classList.contains("hidden")) {
                FocusManager.setFocus(cityDetailsPanel);
                Audio.playSound("data-audio-city-details-enter", 'city-actions');
            }
            else {
                Audio.playSound("data-audio-city-details-exit", 'city-actions');
            }
        }
        else {
            const newCityDetailsPanel = document.createElement('panel-city-details');
            this.cityDetailsSlot.appendChild(newCityDetailsPanel);
            FocusManager.setFocus(newCityDetailsPanel);
            Audio.playSound("data-audio-city-details-enter", 'city-actions');
        }
        // TODO - This is required because fxs-slot was consuming 'focusout' which would normally handle this. Can be removed if 'focusout' on the Root is fixed
        this.lastFocusedPanel?.classList.remove('trigger-nav-help');
        this.lastFocusedPanel = null;
    }
    getElementParentPanel(element) {
        if (this.frame.contains(element)) {
            return this.frame;
        }
        else if (this.townFocusPanel.contains(element)) {
            return this.townFocusPanel;
        }
        else if (this.buildQueue.contains(element)) {
            return this.buildQueue;
        }
        else {
            return null;
        }
    }
    requestPlaceBuildingClose(inputEvent) {
        if (!InterfaceMode.isInInterfaceMode("INTERFACEMODE_PLACE_BUILDING")) {
            // Ignored.
            // This can not happen while clicking on the closeButton 
            // but it can while pressing the matching input (cf. onEngineInput())
            // or confirming a selection (cf. confirmSelection())
            return;
        }
        inputEvent?.stopPropagation();
        inputEvent?.preventDefault();
        this.playSound('data-audio-activate');
        // BuildingPlacementManager.initializePlacementData(this.cityID);
    }
    doOrConfirmConstruction(category, type, animationConfirmCallback) {
        const city = this.city;
        if (!city) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid city!`);
            return;
        }
        const item = this.items[category].find(item => item.type === type);
        if (!item) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid item!`);
            return;
        }
        const bSuccess = Construct(city, item, this.isPurchase);
        /**  This is intentionally divergent behavior:
            -- 	If we had an empty queue, and successfully added something to it (which bSuccess already checked above)
                then we want to slap this screen shut and deselect cities, so it behaves as quick-select-auto-close.
            -- 	If instead, if the queue was *not* empty, that means player intentionally entered this screen selecting a city,
                AND the player had already made recent / still in progress queue choices.
                In this case, we will *not* auto close the screen, because we assume player is looking at the queue, or that
                we should reinforce that choices are being queued up in the list. (Screen stays open and queue additions animate).
        */
        if (bSuccess) {
            animationConfirmCallback?.();
            if (this.wasQueueInitiallyEmpty && !this.isPurchase) {
                UI.Player.deselectAllCities();
                InterfaceMode.switchToDefault();
                this.requestPlaceBuildingClose();
            }
        }
    }
    updateItemElementMap(items) {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let chooserItem = this.itemElementMap.get(item.type);
            if (!chooserItem) {
                chooserItem = CreateProductionChooserItem();
                this.itemElementMap.set(item.type, chooserItem);
            }
            if (this.isPurchase) {
                chooserItem.setAttribute("data-audio-activate-ref", "data-audio-city-purchase-activate");
            }
            else {
                chooserItem.setAttribute("data-audio-activate-ref", "data-audio-city-production-activate");
            }
            UpdateProductionChooserItem(chooserItem, item, this.isPurchase);
        }
    }
    realizeCategory(category) {
        const { slot } = this.productionCategorySlots[category];
        for (const [, item] of this.itemElementMap) {
            const itemCategory = item.dataset.category;
            if (category == itemCategory) {
                // Ignore this building if it is already in the unique quarter element
                if (!this.uniqueQuarter?.containsBuilding(item)) {
                    slot.appendChild(item);
                }
            }
        }
    }
    updateCategories(items) {
        for (const category of Object.values(ProductionPanelCategory)) {
            this.updateItemElementMap(items[category]);
        }
        const city = this.city;
        const uq = GetUniqueQuarterForPlayer(city.owner);
        const buildingSlot = this.productionCategorySlots[ProductionPanelCategory.BUILDINGS].slot;
        if (uq) {
            const buildingOneChooserItem = this.itemElementMap.get(uq.uniqueQuarterDef.BuildingType1);
            const buildingTwoChooserItem = this.itemElementMap.get(uq.uniqueQuarterDef.BuildingType2);
            if (buildingOneChooserItem && buildingTwoChooserItem) {
                this.uniqueQuarter ?? (this.uniqueQuarter = new UniqueQuarter());
                this.uniqueQuarter.definition = uq.uniqueQuarterDef;
                this.uniqueQuarter.numCompleted = GetNumUniqueQuarterBuildingsCompleted(city, uq.uniqueQuarterDef);
                this.uniqueQuarter.setBuildings(buildingOneChooserItem, buildingTwoChooserItem);
                buildingSlot.insertAdjacentElement('afterbegin', this.uniqueQuarter.root);
            }
            else {
                this.uniqueQuarter?.root.remove();
                this.uniqueQuarter = null;
            }
        }
        for (const category of Object.values(ProductionPanelCategory)) {
            this.realizeCategory(category);
        }
    }
    updateCityName(city) {
        this.cityNameElement.setAttribute('title', city.name);
    }
    updateUpgradeToCityButton(upgradeCost, isTown, cityID) {
        const result = CanConvertToCity(cityID);
        this.upgradeToCityButton.setAttribute('disabled', result.Success ? 'false' : 'true');
        this.upgradeToCityButton.classList.toggle('hidden', !isTown);
        this.upgradeToCityButtonCostElement.textContent = upgradeCost.toString();
        if (result.FailureReasons) {
            const failureTooltip = result.FailureReasons.join('\n');
            this.upgradeToCityButton.setAttribute('data-tooltip-content', failureTooltip);
        }
        else {
            this.upgradeToCityButton.removeAttribute('data-tooltip-content');
        }
    }
    onFrameEngineInput(inputEvent) {
        const live = this.handleFrameEngineInput(inputEvent);
        if (!live) {
            inputEvent.preventDefault();
            inputEvent.stopImmediatePropagation();
        }
    }
    handleFrameEngineInput(inputEvent) {
        const { name, status } = inputEvent.detail;
        if (status != InputActionStatuses.FINISH) {
            // don't allow zooming in/out while in this screen
            return !(name === 'camera-zoom-in' || name === 'camera-zoom-out');
        }
        let live = false;
        switch (name) {
            case "shell-action-1":
                if (this.city?.isTown && CanConvertToCity(this.cityID).Success) {
                    this.onUpgradeToCityButton();
                    Audio.playSound("data-audio-tab-selected");
                    if (this.isPurchase) {
                        Audio.playSound('data-audio-city-production-purchase-mode', 'city-actions');
                    }
                }
                break;
            case "shell-action-2":
                this.viewHidden = !this.viewHidden;
                Audio.playSound("data-audio-checkbox-press");
                break;
            case "camera-zoom-out":
                this.onPrevCityButton();
                break;
            case "camera-zoom-in":
                this.onNextCityButton();
                break;
            default:
                live = true;
                break;
        }
        if (!live) {
            this.updateNavTray();
        }
        return live;
    }
    onEngineInput(inputEvent) {
        const live = this.handleEngineInput(inputEvent);
        if (!live) {
            inputEvent.preventDefault();
            inputEvent.stopImmediatePropagation();
        }
    }
    handleEngineInput(inputEvent) {
        const { name, status } = inputEvent.detail;
        if (status != InputActionStatuses.FINISH) {
            // don't allow zooming in/out while in this screen
            return !(name === 'camera-zoom-in' || name === 'camera-zoom-out');
        }
        let live = false;
        switch (name) {
            case "cancel":
                if (this.Root.dataset.showTownFocus === 'true') {
                    this.Root.dataset.showTownFocus = 'false';
                    FocusManager.setFocus(this.townFocusSection);
                }
                else {
                    live = true;
                }
                break;
            default:
                live = true;
                break;
        }
        if (!live) {
            this.updateNavTray();
        }
        return live;
    }
    updateNavTray() {
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
        // only add shell actions if current focused element is not within the build queue or the town focus panel
        const currentFocus = FocusManager.getFocus();
        if (currentFocus?.closest('panel-build-queue') || currentFocus?.closest('panel-town-focus')) {
            return;
        }
        NavTray.addOrUpdateShellAction2(this.viewHiddenActionText);
    }
    setHidden(hidden) {
        this.Root.classList.toggle("hidden", hidden);
        this.buildQueue?.classList.toggle("collapsed", hidden);
    }
    onViewReceiveFocus() {
        FocusManager.setFocus(this.productionAccordion);
        if (this.city?.isTown) {
            Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
        }
    }
    updateCityStatus(isBeingRazed, hasUnrest) {
        let hideStatus = false;
        if (isBeingRazed) {
            this.cityStatusTextElement.setAttribute('data-l10n-id', 'LOC_ATTR_RAZED_CITY_UNHAPPINESS');
        }
        else if (hasUnrest) {
            this.cityStatusTextElement.setAttribute('data-l10n-id', 'LOC_CITY_UNREST');
        }
        else {
            hideStatus = true;
        }
        this.cityStatusContainerElement.classList.toggle('hidden', hideStatus);
    }
    updateTownFocusSection(cityID, isTown, hasUnrest, currentGrowthType, currentProjectType) {
        if (isTown) {
            const currentFocusProject = GetCurrentTownFocus(cityID, currentGrowthType, currentProjectType);
            if (!currentFocusProject) {
                console.error(`panel-production-chooser: Failed to get current focus project`);
                return;
            }
            const { name, description, tooltipDescription, growthType, projectType } = currentFocusProject;
            const showDefaultLabel = growthType === GrowthTypes.EXPAND && projectType === ProjectTypes.NO_PROJECT;
            this.townFocusSection.dataset.growthType = growthType.toString();
            this.townFocusSection.dataset.projectType = projectType.toString();
            this.townFocusSection.dataset.name = name;
            this.townFocusSection.dataset.description = description;
            if (tooltipDescription) {
                this.townFocusSection.dataset.tooltipDescription = tooltipDescription;
            }
            else {
                this.townFocusSection.removeAttribute('data-tooltip-description');
            }
            this.townFocusSection.dataset.disabled = hasUnrest ? 'true' : 'false';
            this.townFocusSection.dataset.showDefaultLabel = showDefaultLabel.toString();
            this.townFocusSection.classList.remove('hidden');
        }
        else {
            this.townFocusSection.classList.add('hidden');
            this.Root.dataset.showTownFocus = 'false';
        }
    }
    updateUnrestUi({ hasUnrest, turnsOfUnrest, canPurchase }) {
        this.townFocusSection.dataset.disabled = hasUnrest ? 'true' : 'false';
        this.productionPurchaseContainer.classList.toggle('hidden', hasUnrest);
        this.townUnrestDisplay.classList.toggle('hidden', !canPurchase);
        this.townUnrestDisplay.dataset.turnsOfUnrest = turnsOfUnrest.toString();
    }
    updateProductionPurchaseBar(isTown) {
        this.productionPurchaseTabBar.classList.toggle('hidden', isTown);
        this.townPurchaseLabel.classList.toggle('hidden', !isTown);
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-show-town-focus':
                this.townFocusPanel.classList.toggle('hidden', newValue !== 'true');
                FocusManager.setFocus(this.townFocusPanel);
                this.updateNavTray();
                break;
        }
    }
    renderUpgradeToCityButton() {
        const upgradeToCityButton = document.createElement('chooser-item');
        upgradeToCityButton.setAttribute('hover-only-trigger', 'false');
        upgradeToCityButton.setAttribute('action-key', 'inline-shell-action-1');
        // need to remove the tabindex as the fxs-subsystem-frame add its own vslot
        waitForLayout(() => upgradeToCityButton.removeAttribute('tabindex'));
        upgradeToCityButton.classList.add('flex-row-reverse', 'flex', 'text-accent-2', 'font-title', 'uppercase', 'p-2');
        upgradeToCityButton.dataset.slot = 'footer';
        const upgradeToCityButtonContent = document.createElement('div');
        upgradeToCityButtonContent.classList.add('flex-auto', 'relative', 'flex', 'items-center');
        const upgradeToCityButtonLabel = document.createElement('div');
        upgradeToCityButtonLabel.classList.add('ml-1', 'flex-auto', 'text-base');
        upgradeToCityButtonLabel.setAttribute('data-l10n-id', 'LOC_UI_CONVERT_TO_CITY');
        const costWrapper = document.createElement('div');
        costWrapper.className = 'flex items-center';
        const costElement = document.createElement('div');
        costElement.className = 'text-sm font-body tracking-25';
        const fxsIcon = document.createElement('fxs-icon');
        fxsIcon.className = 'size-8 bg-no-repeat bg-center bg-contain';
        fxsIcon.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        fxsIcon.setAttribute('data-icon-context', 'YIELD');
        fxsIcon.setAttribute('data-icon-id', 'YIELD_GOLD');
        costWrapper.appendChild(costElement);
        costWrapper.appendChild(fxsIcon);
        upgradeToCityButtonContent.appendChild(upgradeToCityButtonLabel);
        upgradeToCityButtonContent.appendChild(costWrapper);
        upgradeToCityButton.appendChild(upgradeToCityButtonContent);
        return [upgradeToCityButton, costElement];
    }
    render() {
        this.Root.classList.add('panel-production-chooser', 'relative', 'z-0', 'flex', 'flex-col');
        this.Root.setAttribute('data-tooltip-anchor', 'right');
        this.cityStatusContainerElement.classList.add('hidden', 'min-h-6', 'flex', 'items-center', 'justify-center', 'mb-1');
        this.cityStatusContainerElement.dataset.slot = 'header';
        this.cityStatusIconElement.src = 'fs://game/yield_angry.png';
        this.cityStatusIconElement.classList.value = 'size-6 bg-contain bg-center bg-no-repeat mr-1';
        this.cityStatusContainerElement.appendChild(this.cityStatusIconElement);
        this.cityStatusTextElement.classList.value = 'font-title text-base text-negative-light tracking-100 uppercase';
        this.cityStatusContainerElement.appendChild(this.cityStatusTextElement);
        this.frame.appendChild(this.cityStatusContainerElement);
        const cityNameWrapper = document.createElement('div');
        cityNameWrapper.classList.add('flex', 'items-start', 'justify-center');
        Databind.classToggle(cityNameWrapper, "mx-10", "!{{g_NavTray.isTrayRequired}}");
        Databind.classToggle(cityNameWrapper, "mx-2", "{{g_NavTray.isTrayRequired}}");
        cityNameWrapper.dataset.slot = 'header';
        this.prevCityButton.classList.add('flex', 'flex-row', 'items-center');
        this.prevCityButton.setAttribute('action-key', 'inline-prev-city');
        const prevCityButtonArrow = document.createElement('div');
        prevCityButtonArrow.classList.add('img-arrow', 'w-8', 'h-12');
        Databind.classToggle(prevCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
        this.prevCityButton.appendChild(prevCityButtonArrow);
        cityNameWrapper.appendChild(this.prevCityButton);
        this.cityNameElement.classList.add('flex-auto', 'px-4', 'text-lg', 'text-center', 'font-title', 'uppercase', 'tracking-100');
        this.cityNameElement.setAttribute('font-fit-mode', 'shrink');
        this.cityNameElement.setAttribute('wrap', 'nowrap');
        cityNameWrapper.appendChild(this.cityNameElement);
        this.nextCityButton.classList.add('flex', 'flex-row-reverse', 'items-center');
        this.nextCityButton.setAttribute('action-key', 'inline-next-city');
        const nextCityButtonArrow = document.createElement('div');
        nextCityButtonArrow.classList.add('img-arrow', 'w-8', 'h-12', '-scale-x-100');
        Databind.classToggle(nextCityButtonArrow, "hidden", "{{g_NavTray.isTrayRequired}}");
        this.nextCityButton.appendChild(nextCityButtonArrow);
        cityNameWrapper.appendChild(this.nextCityButton);
        this.frame.appendChild(cityNameWrapper);
        this.frame.classList.add('flex-auto', 'pointer-events-auto', 'panel-production__frame');
        Databind.classToggle(this.frame, "mb-16", "{{g_NavTray.isTrayRequired}}");
        // TODO: Adding margin bottom to compensate for height miscalculation. Remove when gameface updates YOGA.
        this.frame.dataset.headerClass = 'flex flex-col flex-initial px-3 mx-0\\.5';
        this.frame.dataset.footerClass = 'px-5 pb-2 mx-0\\.5';
        const yieldBarRow = document.createElement('div');
        yieldBarRow.classList.value = 'flex self-center justify-center pb-2';
        yieldBarRow.dataset.slot = 'header';
        this.frame.appendChild(yieldBarRow);
        this.showCityDetailsButton.classList.value = "relative flex items-center justify-center w-16 h-18 production-chooser__city-details-button mr-2";
        this.showCityDetailsButton.setAttribute('tabindex', '-1');
        const buttonHighlight = document.createElement('div');
        buttonHighlight.classList.add('absolute', 'inset-0', 'city-details-highlight');
        this.showCityDetailsButton.appendChild(buttonHighlight);
        const showCityDetailsIcon = document.createElement('div');
        showCityDetailsIcon.classList.value = 'img-city-details relative';
        this.showCityDetailsButton.appendChild(showCityDetailsIcon);
        this.showCityDetailsButton.setAttribute("data-audio-press-ref", "data-audio-select-press");
        this.showCityDetailsButton.setAttribute("data-audio-activate-ref", "none");
        yieldBarRow.appendChild(this.showCityDetailsButton);
        yieldBarRow.insertAdjacentHTML('beforeend', `<city-yields></city-yields>`);
        this.townFocusSection.dataset.slot = 'header';
        this.frame.appendChild(this.townFocusSection);
        this.productionPurchaseContainer.classList.value = 'flex items-center';
        this.productionPurchaseContainer.setAttribute('data-slot', 'header');
        this.townPurchaseLabel.classList.value = 'flex flex-auto items-center justify-center';
        this.townPurchaseLabel.insertAdjacentHTML('beforeend', `
		 	<div class="text-secondary-2 text-gradient-secondary text-xs font-title uppercase" data-l10n-id="LOC_UI_PURCHASE_TAB"></div>
		`);
        this.productionPurchaseContainer.appendChild(this.townPurchaseLabel);
        const productionPurchaseTabBarTabs = [
            {
                id: 'production-chooser-tab-production',
                label: "LOC_UI_PRODUCTION_TAB",
                className: "px-2",
            },
            {
                id: 'production-chooser-tab-purchase',
                label: "LOC_UI_PURCHASE_TAB",
                className: "px-2",
            }
        ];
        this.productionPurchaseTabBar.classList.add('flex-auto', 'max-h-12', 'mb-1');
        this.productionPurchaseTabBar.setAttribute('rect-render', 'true');
        this.productionPurchaseTabBar.setAttribute('nav-help-left-class', 'pl-2');
        this.productionPurchaseTabBar.setAttribute('nav-help-right-class', 'pr-2');
        this.productionPurchaseTabBar.setAttribute('tab-items', JSON.stringify(productionPurchaseTabBarTabs));
        this.productionPurchaseTabBar.setAttribute('data-slot', 'header');
        this.productionPurchaseTabBar.setAttribute('tab-for', '.panel-production__frame');
        this.productionPurchaseTabBar.setAttribute("alt-controls", "false");
        this.productionPurchaseTabBar.setAttribute("data-audio-group-ref", "city-actions");
        this.productionPurchaseTabBar.setAttribute("data-audio-tab-selected", "none");
        this.productionPurchaseContainer.appendChild(this.productionPurchaseTabBar);
        const viewHiddenCheckboxLabel = document.createElement('p');
        viewHiddenCheckboxLabel.classList.value = 'text-xs';
        viewHiddenCheckboxLabel.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_VIEW_HIDDEN');
        const viewHiddenContainer = document.createElement('div');
        Databind.classToggle(viewHiddenContainer, "hidden", "{{g_NavTray.isTrayRequired}}");
        viewHiddenContainer.classList.value = 'flex items-center px-2';
        viewHiddenContainer.appendChild(this.viewHiddenCheckbox);
        viewHiddenContainer.appendChild(viewHiddenCheckboxLabel);
        this.productionPurchaseContainer.appendChild(viewHiddenContainer);
        this.frame.appendChild(this.productionPurchaseContainer);
        this.upgradeToCityButton.dataset.slot = 'footer';
        this.upgradeToCityButton.setAttribute('caption', 'LOC_PROJECT_TOWN_PROMOTION_NAME');
        this.upgradeToCityButton.setAttribute("data-audio-group-ref", "city-actions");
        this.upgradeToCityButton.setAttribute("data-audio-activate-ref", "data-audio-city-production-upgrade");
        this.upgradeToCityButton.setAttribute('tabindex', '-1');
        this.frame.appendChild(this.upgradeToCityButton);
        this.frame.appendChild(this.townUnrestDisplay);
        this.productionAccordion.classList.add('relative');
        this.productionAccordion.setAttribute("disable-focus-allowed", "true");
        for (const category of Object.values(ProductionPanelCategory)) {
            const section = this.productionCategorySlots[category];
            this.productionAccordion.appendChild(section.root);
        }
        this.frame.appendChild(this.productionAccordion);
        this.subPanelContainer.classList.add('-z-1', 'absolute', 'top-32', 'bottom-12', 'left-full', '-ml-10');
        this.buildQueue.classList.add('absolute', 'left-3');
        this.subPanelContainer.appendChild(this.buildQueue);
        this.townFocusPanelCloseButton.classList.add('absolute', 'top-0', 'right-0');
        this.townFocusPanel.appendChild(this.townFocusPanelCloseButton);
        this.subPanelContainer.appendChild(this.townFocusPanel);
        const productionChooserHSlot = document.createElement("fxs-hslot");
        productionChooserHSlot.classList.add("flex-auto");
        productionChooserHSlot.appendChild(this.frame);
        productionChooserHSlot.appendChild(this.subPanelContainer);
        this.Root.appendChild(productionChooserHSlot);
    }
}
Controls.define('panel-production-chooser', {
    createInstance: ProductionChooserScreen,
    description: '',
    attributes: [
        { name: 'data-show-town-focus' }
    ],
    styles: ["fs://game/base-standard/ui/production-chooser/panel-production-chooser.css"],
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/panel-production-chooser.js.map
