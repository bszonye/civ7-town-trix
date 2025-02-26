import bzCityDetails, { bzUpdateCityDetailsEventName } from "/bz-city-hall/ui/city-details/bz-model-city-details.js";
import CityDetails, { UpdateCityDetailsEventName } from "/base-standard/ui/city-details/model-city-details.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import FocusManager from '/core/ui/input/focus-manager.js';
// TODO: clean up all console debug junk
const BZ_DIVIDER = `\
<div class="flex w-96 self-center">
    <div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
    <div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
</div>
`
// TODO: move overview tab here
// TODO: make a new buildings tab and hide the original
// TODO: modifiy the original tab defs instead of overriding them?
var cityDetailTabID;
(function (cityDetailTabID) {
    cityDetailTabID["overview"] = "city-details-tab-overview";
    cityDetailTabID["growth"] = "city-details-tab-growth";
    cityDetailTabID["constructibles"] = "city-details-tab-constructibles";
    cityDetailTabID["yields"] = "city-details-tab-yields";
})(cityDetailTabID || (cityDetailTabID = {}));
const cityDetailTabItems = [
    {
        id: cityDetailTabID.overview,
        icon: {
            default: UI.getIconBLP("CITY_BUILDINGS"),
            hover: UI.getIconBLP("CITY_BUILDINGS_HI"),
            focus: UI.getIconBLP("CITY_BUILDINGS_HI")
        },
        iconClass: "size-16",
        headerText: "LOC_BZ_UI_CITY_DETAILS_OVERVIEW_TAB"
    },
    {
        id: cityDetailTabID.growth,
        icon: {
            default: UI.getIconBLP("CITY_CITIZENS"),
            hover: UI.getIconBLP("CITY_CITIZENS_HI"),
            focus: UI.getIconBLP("CITY_CITIZENS_HI")
        },
        iconClass: "size-16",
        headerText: "LOC_UI_CITY_DETAILS_GROWTH_TAB"
    },
    {
        id: cityDetailTabID.constructibles,
        icon: {
            default: UI.getIconBLP("CITY_SETTLEMENT"),
            hover: UI.getIconBLP("CITY_SETTLEMENT_HI"),
            focus: UI.getIconBLP("CITY_SETTLEMENT_HI")
        },
        iconClass: "size-16",
        headerText: "LOC_UI_CITY_DETAILS_BUILDINGS_TAB"
    },
    {
        id: cityDetailTabID.yields,
        icon: {
            default: UI.getIconBLP("CITY_YIELDS"),
            hover: UI.getIconBLP("CITY_YIELDS_HI"),
            focus: UI.getIconBLP("CITY_YIELDS_HI")
        },
        iconClass: "size-16",
        headerText: "LOC_UI_CITY_DETAILS_YIELDS_TAB"
    }
];
// PanelCityDetails decorator
class bzPanelCityDetails {
    static panel_prototype;
    static panel_render;
    static panel_yieldSlot;
    constructor(panel) {
        this.panel = panel;
        panel.bzPanel = this;
        this.patch(this.panel);
        // listen for model updates
        this.updateOverviewListener = this.updateOverview.bind(this);
        this.updateConstructiblesListener = this.updateConstructibles.bind(this);
        // redirect from panel
        this.panel.onFocus = () => {
            NavTray.clear();
            NavTray.addOrUpdateGenericBack();
            this.panel.tabBar.setAttribute("selected-tab-index", "0");
            this.panel.slotGroup.setAttribute("selected-slot", cityDetailTabID.overview);
            const overviewSlot = this.panel.Root.querySelector(`#${cityDetailTabID.overview}`);
            if (overviewSlot) {
                FocusManager.setFocus(overviewSlot);
            }
        };
    }
    patch(panel) {
        const panel_prototype = Object.getPrototypeOf(panel);
        if (bzPanelCityDetails.panel_prototype == panel_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzPanelCityDetails.panel_prototype = panel_prototype;
        // wrap render method to extend it
        const panel_render = proto.render;
        proto.render = function(...args) {
            this.bzPanel.beforeRender();
            const rv = panel_render.apply(this, args);
            this.bzPanel.afterRender();
            return rv;
        }
        // replace panel.renderYieldsSlot to fix a bug
        bzPanelCityDetails.panel_renderYieldSlot = proto.renderYieldsSlot;
        proto.renderYieldsSlot = function() {
            return this.bzPanel.renderYieldsSlot();
        }
    }
    beforeAttach() {
    }
    afterAttach() {
        window.addEventListener(bzUpdateCityDetailsEventName, this.updateOverviewListener);
        window.addEventListener(UpdateCityDetailsEventName, this.updateConstructiblesListener);
        const root = this.panel.Root;
        // overview
        this.overviewSlot = MustGetElement(`#${cityDetailTabID.overview}`);
        this.popGrowingContainer = MustGetElement(".population-growing-container", root);
        this.popGrowingCount = MustGetElement(".population-growing", root);
        this.popRuralContainer = MustGetElement(".population-rural-container", root);
        this.popRuralCount = MustGetElement(".population-rural", root);
        this.popUrbanContainer = MustGetElement(".population-urban-container", root);
        this.popUrbanCount = MustGetElement(".population-urban", root);
        this.popSpecialistContainer = MustGetElement(".population-specialist-container", root);
        this.popSpecialistCount = MustGetElement(".population-specialist", root);
        this.popTotalContainer = MustGetElement(".population-total-container", root);
        this.popTotalCount = MustGetElement(".population-total", root);
        this.connectedCitiesContainer = MustGetElement(".connected-cities-container", root);
        this.connectedTownsContainer = MustGetElement(".connected-towns-container", root);
        // constructibles
        this.constructibleSlot = MustGetElement(`#${cityDetailTabID.constructibles}`);
        this.buildingsCategory = MustGetElement(".bz-buildings-category", this.Root);
        this.buildingsList = MustGetElement(".bz-buildings-list", this.Root);
        this.improvementsCategory = MustGetElement(".bz-improvements-category", this.Root);
        this.improvementsList = MustGetElement(".bz-improvements-list", this.Root);
        this.wondersCategory = MustGetElement(".bz-wonders-category", this.Root);
        this.wondersList = MustGetElement(".bz-wonders-list", this.Root);
        this.update();
    }
    beforeDetach() {
        window.removeEventListener(bzUpdateCityDetailsEventName, this.updateOverviewListener);
        window.removeEventListener(UpdateCityDetailsEventName, this.updateConstructiblesListener);
    }
    afterDetach() { }
    onAttributeChanged(_name, _prev, _next) { }
    beforeRender() { }
    afterRender() {
        this.panel.tabBar.setAttribute("tab-items", JSON.stringify(cityDetailTabItems));
        this.renderOverviewSlot();
        this.renderConstructiblesSlot();
    }
    renderOverviewSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("mt-3", "pr-4");
        slot.setAttribute("data-navrule-left", "stop");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.overview;
        slot.innerHTML = `
        <fxs-scrollable class="w-128">
            <div class="population-container flex flex-col ml-4">
                <p class="font-title uppercase text-base leading-normal text-gradient-secondary" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION"></p>
                <div class="population-growing-container flex justify-between w-48">
                    <div class="ml-4" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION_GROWING"></div>
                    <div class="population-growing mx-2"></div>
                </div>
                <div class="population-rural-container flex justify-between w-48">
                    <div class="ml-4" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION_RURAL"></div>
                    <div class="population-rural mx-2"></div>
                </div>
                <div class="population-urban-container flex justify-between w-48">
                    <div class="ml-4" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION_URBAN"></div>
                    <div class="population-urban mx-2"></div>
                </div>
                <div class="population-specialist-container flex justify-between w-48">
                    <div class="ml-4" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION_SPECIALIST"></div>
                    <div class="population-specialist mx-2"></div>
                </div>
                <div class="population-total-container flex justify-between w-48 uppercase text-gradient-secondary">
                    <div class="font-title uppercase leading-normal" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_POPULATION_TOTAL"></div>
                    <div class="population-total mx-2"></div>
                </div>
            </div>
            ${BZ_DIVIDER}
            <div class="connections-container flex flex-col ml-4">
                <p class="font-title uppercase text-base leading-normal text-gradient-secondary" data-l10n-id="LOC_BZ_UI_CITY_DETAILS_CONNECTIONS"></p>
                <div class="flex flex-col w-128">
                    <div class="connected-cities-container flex flex-col"></div>
                    <div class="connected-towns-container flex flex-col mt-1"></div>
                </div>
            </div>
        </fxs-scrollable>
        `;
        this.panel.slotGroup.appendChild(slot);
    }
    renderConstructiblesSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("pr-4");
        slot.setAttribute("data-navrule-left", "stop");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.constructibles;
        slot.innerHTML = `
        <fxs-scrollable>
            <div class="flex flex-col w-128 mb-2">
                <div class="bz-buildings-category flex mt-1 mx-1">
                    <fxs-icon class="size-12 m-1" data-icon-id="CITY_BUILDINGS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_BUILDINGS"></div>
                </div>
                <div class="bz-buildings-list flex-col -mt-1 mx-1"></div>
                <div class="bz-improvements-category flex mt-1 mx-1">
                    <fxs-icon class="size-12 m-1" data-icon-id="CITY_IMPROVEMENTS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_IMPROVEMENTS"></div>
                </div>
                <div class="bz-improvements-list flex-col mx-1"></div>
                <div class="bz-wonders-category flex mt-1 mx-1">
                    <fxs-icon class="size-12 m-1" data-icon-id="CITY_WONDERS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase ml-2 text-gradient-secondary" data-l10n-id="LOC_UI_CITY_DETAILS_WONDERS"></div>
                </div>
                <div class="bz-wonders-list flex-col mx-1"></div>
            </div>
        </fxs-scrollable>
        `;
        this.panel.slotGroup.appendChild(slot);
    }
    renderYieldsSlot() {
        const slot = document.createElement("fxs-vslot");
        slot.classList.add("pr-4");
        slot.setAttribute("data-navrule-left", "stop");
        slot.setAttribute("data-navrule-right", "stop");
        slot.id = cityDetailTabID.yields;
        // bugfix: game code incorrectly closes this with </div>
        slot.innerHTML = `
            <fxs-scrollable class="yields-scrollable">
                <div class="yields-container w-128"></div>
            </fxs-scrollable>
        `;
        this.panel.slotGroup.appendChild(slot);
    }
    update() {
        this.updateOverview();
        this.updateConstructibles();
    }
    updateOverview() {
        // Flag so we can give the overview back focus after updating
        const overviewHasFocus = this.overviewSlot.contains(FocusManager.getFocus());
        // Overview
        // population
        this.popGrowingContainer.classList.toggle("hidden", !bzCityDetails.pendingCitizens);
        this.popGrowingCount.textContent = Locale.compose(bzCityDetails.pendingCitizens.toString());
        this.popRuralContainer.classList.toggle("hidden", !bzCityDetails.ruralCitizens);
        this.popRuralCount.textContent = Locale.compose(bzCityDetails.ruralCitizens.toString());
        this.popUrbanContainer.classList.toggle("hidden", !bzCityDetails.urbanCitizens);
        this.popUrbanCount.textContent = Locale.compose(bzCityDetails.urbanCitizens.toString());
        this.popSpecialistContainer.classList.toggle("hidden", !bzCityDetails.specialistCitizens);
        this.popSpecialistCount.textContent = Locale.compose(bzCityDetails.specialistCitizens.toString());
        this.popTotalContainer.classList.toggle("hidden", !bzCityDetails.totalCitizens);
        this.popTotalCount.textContent = Locale.compose(bzCityDetails.totalCitizens.toString());
        // connections
        this.addConnectionsList(
            this.connectedCitiesContainer,
            'LOC_BZ_UI_CITY_DETAILS_CITIES',
            bzCityDetails.connectedCities);
        this.addConnectionsList(
            this.connectedTownsContainer,
            'LOC_BZ_UI_CITY_DETAILS_TOWNS',
            bzCityDetails.connectedTowns);
        if (overviewHasFocus) {
            FocusManager.setFocus(this.overviewSlot);
        }
    }
    updateConstructibles() {
        // Flag so we can give the constructibles back focus after updating
        const constructiblesHaveFocus = this.constructibleSlot.contains(FocusManager.getFocus());
        // sort the data from CityDetails
        const buildings = CityDetails.buildings;
        const improvements = CityDetails.improvements;
        const wonders = CityDetails.wonders;
        bzCityDetails.sortConstructibles(buildings, improvements, wonders);
        // Buildings
        const shouldShowBuildings = buildings.length > 0;
        this.buildingsCategory.classList.toggle("hidden", !shouldShowBuildings);
        this.buildingsList.innerHTML = "";
        for (const building of buildings) {
            this.buildingsList.appendChild(this.addDistrictData(building));
            this.buildingsList.appendChild(this.createDivider());
        }
        // Improvements
        const shouldShowImprovements = improvements.length > 0;
        this.improvementsCategory.classList.toggle("hidden", !shouldShowImprovements);
        this.improvementsList.innerHTML = "";
        for (const improvement of improvements) {
            this.improvementsList.appendChild(this.addConstructibleData(improvement));
        }
        // Wonders
        const shouldShowWonders = wonders.length > 0;
        this.wondersCategory.classList.toggle("hidden", !shouldShowWonders);
        this.wondersList.innerHTML = "";
        for (const wonder of wonders) {
            this.wondersList.appendChild(this.addConstructibleData(wonder));
        }
        // separate improvements & wonders if we have both
        if (shouldShowImprovements && shouldShowWonders) {
            this.improvementsList.appendChild(this.createDivider());
        }
        if (constructiblesHaveFocus) {
            FocusManager.setFocus(this.constructibleSlot);
        }
    }
    addConnectionsList(container, head, list) {
        container.innerHTML = "";
        const eHead = document.createElement("div");
        eHead.classList.value = "font-title uppercase leading-normal";
        eHead.setAttribute("data-l10n-id", Locale.compose(head, list.length));
        container.appendChild(eHead);
        const names = list.map(i => Locale.compose(i.name));
        names.sort((a, b) => a.localeCompare(b));
        for (const name of names) {
            const eName = document.createElement("div");
            eName.classList.add("ml-4");
            eName.textContent = name;
            container.appendChild(eName);
        }
    }
    addDistrictData(districtData) {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("flex", "flex-col");
        if (districtData.name && districtData.description) {
            const uniqueQuarterContainer = document.createElement("div");
            uniqueQuarterContainer.classList.add("flex", "ml-8");
            mainDiv.appendChild(uniqueQuarterContainer);
            const uniqueQuarterIcon = document.createElement("fxs-icon");
            uniqueQuarterIcon.classList.add("size-12", "mr-2");
            uniqueQuarterIcon.setAttribute("data-icon-context", "DEFAULT");
            uniqueQuarterIcon.setAttribute("data-icon-id", "CITY_UNIQUE_QUARTER");
            uniqueQuarterContainer.appendChild(uniqueQuarterIcon);
            const uniqueQuarterTextContainer = document.createElement("div");
            uniqueQuarterTextContainer.classList.add("flex", "flex-col", "flex-auto", "pr-1");
            uniqueQuarterContainer.appendChild(uniqueQuarterTextContainer);
            const districtName = document.createElement("div");
            districtName.classList.add("my-1", "font-title", "uppercase", "text-xs");
            districtName.innerHTML = districtData.name;
            uniqueQuarterTextContainer.appendChild(districtName);
            const districtDescription = document.createElement("div");
            districtDescription.classList.add("text-xs", "leading-normal", "max-w-96");
            districtDescription.innerHTML = districtData.description;
            uniqueQuarterTextContainer.appendChild(districtDescription);
        }
        for (const constructibleData of districtData.constructibleData) {
            mainDiv.appendChild(this.addConstructibleData(constructibleData));
        }
        return mainDiv;
    }
    addConstructibleData(constructibleData) {
        const mainDiv = document.createElement("fxs-activatable");
        mainDiv.classList.add("constructible-entry", "flex", "flex-col");
        mainDiv.setAttribute("tabindex", "-1");
        const topDiv = document.createElement("div");
        topDiv.classList.add("constructible-entry-highlight", "flex", "ml-8", "my-1", "pointer-events-none", "items-center");
        const icon = document.createElement("fxs-icon");
        icon.classList.add("size-12");
        icon.setAttribute("data-icon-context", constructibleData.iconContext);
        icon.setAttribute("data-icon-id", constructibleData.icon);
        topDiv.appendChild(icon);
        const rightContainer = document.createElement("div");
        rightContainer.classList.add("flex", "flex-col");
        const nameContainer = document.createElement("div");
        nameContainer.classList.add("flex", "ml-2", "center");
        rightContainer.appendChild(nameContainer);
        const name = document.createElement("div");
        name.classList.add("mr-2", "font-title", "uppercase", "text-xs");
        name.textContent = Locale.compose(constructibleData.name);
        nameContainer.appendChild(name);
        if (constructibleData.damaged) {
            const damagedText = document.createElement("div");
            damagedText.classList.add("uppercase", "text-negative", "text-xs");
            damagedText.textContent = "LOC_UI_CITY_DETAILS_BUILDING_DAMAGED";
            nameContainer.appendChild(damagedText);
        }
        const yieldAdjustContainer = document.createElement("div");
        yieldAdjustContainer.classList.add("flex", "justify-between", "w-96");
        const yieldContainer = document.createElement("div");
        const maintenanceContainer = document.createElement("div");
        if (constructibleData.yieldMap) {
            yieldContainer.classList.add("flex", "flex-wrap", "max-w-96");
            for (const [_yieldType, yieldData] of constructibleData.yieldMap) {
                if (yieldData.icon && yieldData.iconContext) {
                    const yieldEntry = document.createElement("div");
                    yieldEntry.classList.add("flex", "mx-1");
                    yieldContainer.appendChild(yieldEntry);
                    const yieldIcon = document.createElement("fxs-icon");
                    yieldIcon.setAttribute("data-icon-context", yieldData.iconContext);
                    yieldIcon.setAttribute("data-icon-id", yieldData.icon);
                    yieldIcon.classList.add("size-6");
                    yieldEntry.appendChild(yieldIcon);
                    const yieldValue = document.createElement("div");
                    yieldValue.classList.add("text-xs", "self-center");
                    yieldValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", yieldData.value);
                    yieldEntry.appendChild(yieldValue);
                }
            }
        }
        yieldAdjustContainer.appendChild(yieldContainer);
        if (constructibleData.maintenanceMap) {
            maintenanceContainer.classList.add("flex");
            // const maintenanceText = document.createElement("div");
            // maintenanceText.classList.add("text-xs");
            // maintenanceText.textContent = Locale.compose("LOC_UI_PRODUCTION_BUILDING_MAINTENANCE");
            // maintenanceContainer.appendChild(maintenanceText);
            for (const [_maintenanceType, maintenanceData] of constructibleData.maintenanceMap) {
                if (maintenanceData.icon && maintenanceData.iconContext) {
                    const maintenanceEntry = document.createElement("div");
                    maintenanceEntry.classList.add("flex", "mx-1");
                    maintenanceContainer.appendChild(maintenanceEntry);
                    const maintenanceIcon = document.createElement("fxs-icon");
                    maintenanceIcon.setAttribute("data-icon-context", maintenanceData.iconContext);
                    maintenanceIcon.setAttribute("data-icon-id", maintenanceData.icon);
                    maintenanceIcon.classList.add("size-6");
                    maintenanceEntry.appendChild(maintenanceIcon);
                    const maintenanceValue = document.createElement("div");
                    maintenanceValue.classList.add("text-xs", "self-center", "text-negative-light");
                    maintenanceValue.textContent = Locale.compose("LOC_UI_CITY_DETAILS_YIELD_ONE_DECIMAL", maintenanceData.value);
                    maintenanceEntry.appendChild(maintenanceValue);
                }
            }
        }
        yieldAdjustContainer.appendChild(maintenanceContainer);
        rightContainer.appendChild(yieldAdjustContainer);
        mainDiv.setAttribute("data-constructible-data", JSON.stringify(constructibleData));
        mainDiv.addEventListener("mouseover", this.panel.mouseOverBuildingListener);
        mainDiv.addEventListener("mouseout", this.panel.mouseOutBuildingListener);
        mainDiv.addEventListener("focus", this.panel.focusBuildingListener);
        mainDiv.addEventListener("focusout", this.panel.focusOutBuildingListener);
        mainDiv.addEventListener("action-activate", this.panel.activateBuildingListener);
        topDiv.appendChild(rightContainer);
        mainDiv.appendChild(topDiv);
        return mainDiv;
    }
    createDivider() {
        const dividerDiv = document.createElement("div");
        dividerDiv.classList.add("flex", "w-96", "self-center");
        dividerDiv.innerHTML = `
            <div class="w-1\\/2 -my-1 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
            <div class="w-1\\/2 -my-1 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
        `;
        return dividerDiv;
    }
}
Controls.decorate('panel-city-details', (val) => new bzPanelCityDetails(val));
