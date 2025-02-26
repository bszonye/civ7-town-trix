import bzCityDetails, { bzUpdateCityDetailsEventName } from "/bz-city-hall/ui/city-details/bz-model-city-details.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import FocusManager from '/core/ui/input/focus-manager.js';
// TODO: clean up all console debug junk
// TODO: extend the original instead of overriding it
var cityDetailTabID;
(function (cityDetailTabID) {
    cityDetailTabID["overview"] = "city-details-tab-overview";
    cityDetailTabID["growth"] = "city-details-tab-growth";
    cityDetailTabID["buildings"] = "city-details-tab-buildings";
    cityDetailTabID["yields"] = "city-details-tab-yields";
})(cityDetailTabID || (cityDetailTabID = {}));
// PanelCityDetails decorator
class bzPanelCityDetails {
    constructor(panel) {
        console.warn(`TRIX bzPanelCityDetails.constructor`);
        this.panel = panel;
        this.panel_prototype = Object.getPrototypeOf(panel);

        // hook existing PanelCityDetails.render method
        this.panel_render = this.panel_prototype.render;
        this.panel_prototype.render = (...args) => {
            this.beforeRender();
            this.panel_render.apply(this.panel, args);
            this.afterRender();
        }
        // listen for model updates
        this.updateCityDetailersListener = this.update.bind(this);
        // redirect from panel
        this.onFocus = () => {
            NavTray.clear();
            NavTray.addOrUpdateGenericBack();
            this.tabBar.setAttribute("selected-tab-index", "0");
            this.slotGroup.setAttribute("selected-slot", cityDetailTabID.overview);
            const overviewSlot = this.Root.querySelector(`#${cityDetailTabID.overview}`);
            if (overviewSlot) {
                FocusManager.setFocus(overviewSlot);
            }
        };
    }
    update() {
        console.warn(`TRIX bzPanelCityDetails.update`);
        // Flag so we can give the overview back focus after updating
        const overviewHasFocus = this.panel.overviewSlot.contains(FocusManager.getFocus());
        // Overview
        // population
        console.warn(`TRIX growing=${bzCityDetails.growingCitizens}`);
        console.warn(`TRIX rural=${bzCityDetails.ruralCitizens}`);
        console.warn(`TRIX urban=${bzCityDetails.urbanCitizens}`);
        console.warn(`TRIX special=${bzCityDetails.specialistCitizens}`);
        console.warn(`TRIX total=${bzCityDetails.totalCitizens}`);
        this.popGrowingContainer.classList.toggle("hidden", !bzCityDetails.growingCitizens);
        this.popGrowingCount.textContent = Locale.compose(bzCityDetails.growingCitizens.toString());
        this.popRuralContainer.classList.toggle("hidden", !bzCityDetails.ruralCitizens);
        this.popRuralCount.textContent = Locale.compose(bzCityDetails.ruralCitizens.toString());
        this.popUrbanContainer.classList.toggle("hidden", !bzCityDetails.urbanCitizens);
        this.popUrbanCount.textContent = Locale.compose(bzCityDetails.urbanCitizens.toString());
        this.popSpecialistContainer.classList.toggle("hidden", !bzCityDetails.specialistCitizens);
        this.popSpecialistCount.textContent = Locale.compose(bzCityDetails.specialistCitizens.toString());
        this.popTotalContainer.classList.toggle("hidden", !bzCityDetails.totalCitizens);
        this.popTotalCount.textContent = Locale.compose(bzCityDetails.totalCitizens.toString());
        console.warn(`TRIX bzPanelCityDetails.update POPULATION`);
        // connections
        this.addConnectionsList(
            this.connectedCitiesContainer,
            'LOC_BZ_UI_CITY_DETAILS_CITIES',
            bzCityDetails.connectedCities);
        this.addConnectionsList(
            this.connectedTownsContainer,
            'LOC_BZ_UI_CITY_DETAILS_TOWNS',
            bzCityDetails.connectedTowns);
        console.warn(`TRIX bzPanelCityDetails.update CONNECTIONS`);
        if (overviewHasFocus) {
            FocusManager.setFocus(this.panel.overviewSlot);
        }
    }
    beforeAttach() {
        window.addEventListener(bzUpdateCityDetailsEventName, this.updateCityDetailersListener);
    }
    afterAttach() {
        const root = this.panel.Root;
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
        this.update();
    }
    beforeDetach() {
        window.removeEventListener(bzUpdateCityDetailsEventName, this.updateCityDetailersListener);
    }
    afterDetach() {
    }
    onAttributeChanged(_name, _prev, _next) { }

    beforeRender() {
        console.warn(`TRIX bzPanelCityDetails.beforeRender`);
    }
    afterRender() {
        console.warn(`TRIX bzPanelCityDetails.afterRender`);
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
}
Controls.decorate('panel-city-details', (val) => new bzPanelCityDetails(val));
console.warn(`TRIX decorator end`);
