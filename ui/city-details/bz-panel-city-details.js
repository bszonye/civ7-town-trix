// TODO: move arrow buttons to the corners, so they don't move (if possible)
import bzCityDetails, { bzUpdateCityDetailsEventName } from "/bz-city-hall/ui/city-details/bz-model-city-details.js";
import CityDetails, { UpdateCityDetailsEventName } from "/base-standard/ui/city-details/model-city-details.js";
import NavTray from "/core/ui/navigation-tray/model-navigation-tray.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import FocusManager from '/core/ui/input/focus-manager.js';

// vertical separator
const BZ_DIVIDER_STYLE = "flex w-96 self-center";
const BZ_DIVIDER_LINE = `\
<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider"></div>
<div class="w-1\\/2 h-5 bg-cover bg-no-repeat city-details-half-divider -scale-x-100"></div>
`
const BZ_DIVIDER = `<div class="${BZ_DIVIDER_STYLE}">${BZ_DIVIDER_LINE}</div>`

// horizontal separator
const BZ_DOT_DIVIDER = Locale.compose("LOC_PLOT_DIVIDER_DOT");

var cityDetailTabID;
(function (cityDetailTabID) {
    // only need to define the ones we're using in the decorator
    cityDetailTabID["overview"] = "city-details-tab-overview";
    cityDetailTabID["constructibles"] = "city-details-tab-constructibles";
    // cityDetailTabID["growth"] = "city-details-tab-growth";
    cityDetailTabID["buildings"] = "city-details-tab-buildings";
    cityDetailTabID["yields"] = "city-details-tab-yields";
})(cityDetailTabID || (cityDetailTabID = {}));
const BZ_TAB_OVERVIEW = {
    id: cityDetailTabID.overview,
    icon: {
        default: UI.getIconBLP("CITY_BUILDINGS"),
        hover: UI.getIconBLP("CITY_BUILDINGS_HI"),
        focus: UI.getIconBLP("CITY_BUILDINGS_HI")
    },
    iconClass: "size-16",
    headerText: "LOC_BZ_UI_CITY_DETAILS_OVERVIEW_TAB"
};
const BZ_TAB_CONSTRUCTIBLES = {
    id: cityDetailTabID.constructibles,
    icon: {
        default: UI.getIconBLP("CITY_SETTLEMENT"),
        hover: UI.getIconBLP("CITY_SETTLEMENT_HI"),
        focus: UI.getIconBLP("CITY_SETTLEMENT_HI")
    },
    iconClass: "size-16",
    headerText: "LOC_UI_CITY_DETAILS_BUILDINGS_TAB"
};
// custom & adapted icons
const BZ_ICON_CITY = "YIELD_CITIES";  // total city population
const BZ_ICON_TOWN = "YIELD_TOWNS";  // total city population
const BZ_ICON_RURAL = "CITY_RURAL";  // urban population/yield
const BZ_ICON_URBAN = "CITY_URBAN";  // rural population/yield
const BZ_ICON_SPECIAL = "CITY_SPECIAL_BASE";  // specialists
const BZ_ICON_TIMER = "url('hud_turn-timer')";
// color palette
const BZ_COLOR = {
    // game colors
    silver: "#4c5366",  // = primary
    bronze: "#e5d2ac",  // = secondary
    primary: "#4c5366",
    primary1: "#8d97a6",
    primary2: "#4c5366",
    primary3: "#333640",
    primary4: "#23252b",
    primary5: "#12151f",
    secondary: "#e5d2ac",
    secondary1: "#e5d2ac",
    secondary2: "#8c7e62",
    secondary3: "#4c473d",
    accent: "#616266",
    accent1: "#e5e5e5",
    accent2: "#c2c4cc",
    accent3: "#9da0a6",
    accent4: "#85878c",
    accent5: "#616266",
    accent6: "#05070d",
    // bronze shades
    bronze1: "#f9ecd2",
    bronze2: "#e5d2ac",  // = secondary1
    bronze3: "#c7b28a",
    bronze4: "#a99670",
    bronze5: "#8c7e62",  // = secondary 2
    bronze6: "#4c473d",  // = secondary 3
    // rules background
    rules: "#8c7e6233",
    // alert colors
    black: "#000000",
    danger: "#af1b1c99",  // danger = militaristic 60% opacity
    caution: "#cea92f",  // caution = healthbar-medium
    note: "#ff800033",  // note = orange 20% opacity
    // geographic colors
    hill: "#a9967066",  // Rough terrain = dark bronze 40% opacity
    vegetated: "#aaff0033",  // Vegetated features = green 20% opacity
    wet: "#55aaff66",  // Wet features = teal 40% opacity
    road: "#f9ecd2cc",  // Roads & Railroads = pale bronze 80% opacity
    // yield types
    food: "#80b34d",        //  90° 40 50 green
    production: "#a33d29",  //  10° 60 40 red
    gold: "#f6ce55",        //  45° 90 65 yellow
    science: "#6ca6e0",     // 210° 65 65 cyan
    culture: "#5c5cd6",     // 240° 60 60 violet
    happiness: "#f5993d",   //  30° 90 60 orange
    diplomacy: "#afb7cf",   // 225° 25 75 gray
    // independent power types
    militaristic: "#af1b1c",
    scientific: "#4d7c96",
    economic: "#ffd553",
    cultural: "#892bb3",
};
// box metrics (for initialization, component can update)
// TODO: remove unneeded items
const BASE_FONT_SIZE = 18;
const BZ_FONT_SPACING = 1.5;
const BZ_PADDING = 0.6666666667;
const BZ_MARGIN = BZ_PADDING / 2;
const BZ_BORDER = 0.1111111111;
const BZ_RULES_WIDTH = 12;
let metrics = getFontMetrics();

// additional CSS definitions
const BZ_HEAD_STYLE = [
`
.bz-city-hall .text-gradient-secondary {
    fxs-font-gradient-color: ${BZ_COLOR.bronze1};
    color: ${BZ_COLOR.bronze2};
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});
document.body.classList.add("bz-city-hall");

function docIcon(image, size, resize, ...style) {
    // create an icon to fit size (with optional image resizing)
    const icon = document.createElement("div");
    icon.classList.value = "relative bg-contain bg-no-repeat shadow";
    if (style.length) icon.classList.add(...style);
    icon.style.height = size;
    icon.style.width = size;
    // note: this sets image width and auto height
    if (resize && resize != size) icon.style.backgroundSize = resize;
    icon.style.backgroundPosition = "center";
    icon.style.backgroundImage =
        image.startsWith("url(") ? image : UI.getIconCSS(image);
    return icon;
}
function docText(text, style) {
    const e = document.createElement("div");
    if (style) e.classList.value = style;
    e.setAttribute('data-l10n-id', text);
    return e;
}
function docTimer(size, resize, ...style) {
    if (!style.length) style = ["-mx-1"];
    return docIcon(BZ_ICON_TIMER, size, resize, ...style);
}
function getFontMetrics() {
    // TODO: remove unneeded stuff
    const sizes = (rem, round=Math.round) => {
        const css = `${rem.toFixed(10)}rem`;
        const base = round(rem * BASE_FONT_SIZE);
        const scale = round(rem * GlobalScaling.currentScalePx);
        const px = `${scale}px`;
        return { rem, css, base, scale, px, };
    }
    // global metrics
    const padding = sizes(BZ_PADDING);
    const margin = sizes(BZ_MARGIN);  // top & bottom of each block
    padding.x = sizes(padding.rem);
    padding.y = sizes(padding.rem - margin.rem);  // room for end block margins
    padding.banner = sizes(padding.rem / 3);  // extra padding for banners
    const border = sizes(BZ_BORDER);
    // font metrics
    const font = (name, ratio=BZ_FONT_SPACING, cratio=3/4) => {
        const rem = typeof name === "string" ?
            GlobalScaling.getFontSizePx(name) / BASE_FONT_SIZE : name;
        const size = sizes(rem);  // font size
        const cap = sizes(size.rem * cratio);  // cap height
        const spacing = sizes(size.rem * ratio);  // line height
        const leading = sizes(spacing.rem - size.rem);  // interline spacing
        leading.half = sizes(leading.rem / 2);  // half-leading
        leading.internal = sizes((spacing.rem - cap.rem) / 2);  // space above caps
        const margin = sizes(BZ_MARGIN - leading.internal.rem);
        const figure = sizes(0.6 * size.rem, Math.ceil);  // figure width
        const digits = (n) => sizes(n * figure.rem, Math.ceil);
        return { size, ratio, cap, spacing, leading, margin, figure, digits, };
    }
    const head = font('base', 1.25);
    const body = font('base', 1.25);
    const note = font('sm', 1);
    const rules = font('base');
    rules.width = sizes(BZ_RULES_WIDTH);
    const table = font('base');
    const yields = font(8/9);
    const radius = sizes(2/3 * padding.rem);
    radius.content = sizes(radius.rem);
    radius.tooltip = sizes(radius.rem + border.rem);
    // minimum end banner height to avoid radius glitches
    const bumper = sizes(Math.max(table.spacing.rem, 2*radius.rem));
    return {
        sizes, font,
        padding, margin, border,
        head, body, note, rules, table, yields,
        radius, bumper,
    };
}
function getTownFocus(city) {
    const ptype = city.Growth?.projectType ?? null;
    const info = ptype && GameInfo.Projects.lookup(ptype);
    const isGrowing = !info || city.Growth?.growthType == GrowthTypes.EXPAND;
    const town = "LOC_CAPITAL_SELECT_PROMOTION_NONE";
    const growth = "LOC_UI_FOOD_CHOOSER_FOCUS_GROWTH";
    const name = info?.Name ?? town;
    const note = isGrowing && name != growth ? growth : null;
    const icon = isGrowing ? "PROJECT_GROWTH" : info.ProjectType;
    return { isGrowing, name, note, icon, info, };
}
const BZ_PRELOADED_ICONS = {};
function preloadIcon(icon, context) {
    if (!icon) return;
    const url = icon.startsWith("url(") ? icon : UI.getIcon(icon, context);
    const name = url.replace(/url|[(\042\047)]/g, '');  // \042\047 = quotation marks
    if (!name || name in BZ_PRELOADED_ICONS) return;
    BZ_PRELOADED_ICONS[name] = true;
    Controls.preloadImage(name, 'plot-tooltip');
}

// PanelCityDetails decorator
class bzPanelCityDetails {
    static panel_prototype;
    static panel_renderYieldsSlot;
    static lastTab = 0;
    constructor(panel) {
        this.panel = panel;
        panel.bzPanel = this;
        this.patchPrototypes(this.panel);
        // listen for model updates
        this.updateOverviewListener = this.updateOverview.bind(this);
        this.updateConstructiblesListener = this.updateConstructibles.bind(this);
        // remember last tab
        this.onTabSelected = (e) => {
            bzPanelCityDetails.lastTab = e.detail.index;
        };
        // redirect from panel
        this.panel.onFocus = () => {
            NavTray.clear();
            NavTray.addOrUpdateGenericBack();
            this.selectTab(bzPanelCityDetails.lastTab);
        };
        Loading.runWhenFinished(() => {
            const icons = [
                BZ_ICON_CITY, BZ_ICON_TOWN, BZ_ICON_RURAL,
                BZ_ICON_URBAN, BZ_ICON_SPECIAL, BZ_ICON_TIMER,
            ];
            for (const y of icons) preloadIcon(y);
        });
    }
    patchPrototypes(panel) {
        const panel_prototype = Object.getPrototypeOf(panel);
        if (bzPanelCityDetails.panel_prototype == panel_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzPanelCityDetails.panel_prototype = panel_prototype;
        // wrap render method to extend it
        const panel_render = proto.render;
        const after_render = this.afterRender;
        proto.render = function(...args) {
            const panel_rv = panel_render.apply(this, args);
            const after_rv = after_render.apply(this.bzPanel, args);
            return after_rv ?? panel_rv;
        }
        // replace panel.renderYieldsSlot to fix a bug
        bzPanelCityDetails.panel_renderYieldsSlot = proto.renderYieldsSlot;
        proto.renderYieldsSlot = function() {
            return this.bzPanel.renderYieldsSlot();
        }
    }
    patchTabSlots() {
        const tabItems = this.panel.tabBar.getAttribute("tab-items");
        const tabs = JSON.parse(tabItems);
        // replace city-detail-tabs-buildings
        tabs.forEach((tab, index) => {
            if (tab.id == cityDetailTabID.buildings) {
                tabs[index] = BZ_TAB_CONSTRUCTIBLES;
            }
        });
        // add Overview tab
        tabs.unshift(BZ_TAB_OVERVIEW);
        this.panel.tabBar.setAttribute("tab-items", JSON.stringify(tabs));
    }
    selectTab(index) {
        this.panel.tabBar.setAttribute("selected-tab-index", index.toString());
        const tabItems = this.panel.tabBar.getAttribute("tab-items");
        const tab = JSON.parse(tabItems).at(index);
        if (!tab?.id) return;
        this.panel.slotGroup.setAttribute("selected-slot", tab.id);
        const slot = this.panel.Root.querySelector(`#${tab.id}`);
        if (slot) FocusManager.setFocus(slot);
    }
    // empty decorators
    beforeAttach() { }
    afterDetach() { }
    onAttributeChanged(_name, _prev, _next) { }
    // attach new & replaced tabs to the panel
    afterAttach() {
        metrics = getFontMetrics();
        this.panel.tabBar.addEventListener("tab-selected", this.onTabSelected);
        this.selectTab(bzPanelCityDetails.lastTab);
        window.addEventListener(bzUpdateCityDetailsEventName, this.updateOverviewListener);
        window.addEventListener(UpdateCityDetailsEventName, this.updateConstructiblesListener);
        // overview
        const oslot = MustGetElement(`#${cityDetailTabID.overview}`);
        this.overviewSlot = oslot;
        this.growthContainer = MustGetElement(".growth-container", oslot);
        this.connectionsContainer = MustGetElement(".connections-container", oslot);
        // constructibles
        const cslot = MustGetElement(`#${cityDetailTabID.constructibles}`);
        this.constructibleSlot = cslot;
        this.buildingsCategory = MustGetElement(".bz-buildings-category", cslot);
        this.buildingsList = MustGetElement(".bz-buildings-list", cslot);
        this.improvementsCategory = MustGetElement(".bz-improvements-category", cslot);
        this.improvementsList = MustGetElement(".bz-improvements-list", cslot);
        this.wondersCategory = MustGetElement(".bz-wonders-category", cslot);
        this.wondersList = MustGetElement(".bz-wonders-list", cslot);
        this.update();
    }
    beforeDetach() {
        this.panel.tabBar.removeEventListener("tab-selected", this.onTabSelected);
        window.removeEventListener(bzUpdateCityDetailsEventName, this.updateOverviewListener);
        window.removeEventListener(UpdateCityDetailsEventName, this.updateConstructiblesListener);
    }
    // render new & replaced tabs
    afterRender() {
        this.patchTabSlots();
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
            <div class="growth-container flex flex-col ml-6"></div>
            ${BZ_DIVIDER}
            <div class="connections-container flex flex-col ml-6"></div>
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
                <div class="bz-buildings-category flex mt-2">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_BUILDINGS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_BUILDINGS"></div>
                </div>
                <div class="bz-buildings-list flex-col"></div>
                <div class="bz-improvements-category flex mt-1">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_IMPROVEMENTS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_IMPROVEMENTS"></div>
                </div>
                <div class="bz-improvements-list flex-col"></div>
                <div class="bz-wonders-category flex mt-1">
                    <fxs-icon class="size-12 ml-3 my-1" data-icon-id="CITY_WONDERS_LIST"></fxs-icon>
                    <div class="self-center font-title text-lg uppercase text-gradient-secondary ml-2" data-l10n-id="LOC_UI_CITY_DETAILS_WONDERS"></div>
                </div>
                <div class="bz-wonders-list flex-col"></div>
            </div>
        </fxs-scrollable>
        `;
        this.panel.slotGroup.appendChild(slot);
    }
    // fixes a mismatched tag in the base-standard function
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
    // update data model from both sources
    update() {
        this.updateOverview();
        this.updateConstructibles();
    }
    // update data model for new tab slot
    updateOverview() {
        // Flag so we can give the overview back focus after updating
        const overviewHasFocus = this.overviewSlot.contains(FocusManager.getFocus());
        this.renderGrowth(this.growthContainer);
        this.renderConnections(this.connectionsContainer);
        if (overviewHasFocus) FocusManager.setFocus(this.overviewSlot);
    }
    renderGrowth(container) {
        // TODO: remove unused localization
        container.innerHTML = '';
        this.renderTitleHeading(container, "LOC_UI_CITY_DETAILS_GROWTH_TAB");
        if (!bzCityDetails.growth) return;
        const { food, pop, religion, } = bzCityDetails.growth;
        const layout = [
            {
                icon: pop.isTown ? BZ_ICON_TOWN : BZ_ICON_CITY,
                label: "LOC_UI_CITY_STATUS_POPULATION_TITLE",
                value: pop.total.toFixed(),
            },
            {
                icon: religion.urban?.icon ?? BZ_ICON_URBAN,
                label: "LOC_UI_CITY_STATUS_URBAN_POPULATION",
                value: pop.urban.toFixed(),
            },
            {
                icon: religion.rural?.icon ?? BZ_ICON_RURAL,
                label: "LOC_UI_CITY_STATUS_RURAL_POPULATION",
                value: pop.rural.toFixed(),
            },
            {
                icon: BZ_ICON_SPECIAL,
                label: "LOC_UI_SPECIALISTS_SUBTITLE",
                value: pop.specialists.toFixed(),
            },
        ];
        const size = metrics.table.spacing.css;
        const small = metrics.sizes(5/6 * metrics.table.spacing.rem).css;
        const table = document.createElement("div");
        table.classList.value = "flex-table justify-start text-base -mx-1";
        table.style.marginBottom = metrics.table.margin.px;
        if (food.isGrowing) {
            // TODO: center text vertically
            const row = document.createElement("div");
            row.classList.value = "self-start flex items-center px-1 rounded-2xl mb-1";
            row.style.backgroundColor = `${BZ_COLOR.food}55`;
            row.style.minHeight = size;
            row.style.marginTop = metrics.body.leading.half.px;
            row.appendChild(docIcon("YIELD_FOOD", size, small, "-mx-1"));
            const current = Locale.compose("LOC_BZ_GROUPED_DIGITS", food.current);
            const threshold = Locale.compose("LOC_BZ_GROUPED_DIGITS", food.threshold);
            const progress = `${current} / ${threshold}`;
            row.appendChild(docText(progress, "text-left flex-auto ml-2"));
            row.appendChild(docText(BZ_DOT_DIVIDER, "mx-2"));
            row.appendChild(docText(food.turns.toFixed(), "text-right mr-1"));
            row.appendChild(docTimer(size, size));
            table.appendChild(row);
        }
        for (const item of layout) {
            const row = document.createElement("div");
            row.classList.value = "flex items-center px-1";
            row.style.minHeight = size;
            row.appendChild(docIcon(item.icon, size, small, "-mx-1"));
            row.appendChild(docText(item.label, "text-left flex-auto mx-2"));
            const value = docText(item.value, "ml-2 text-right");
            row.appendChild(value);
            table.appendChild(row);
        }
        // wrap table to keep it from expanding to full width
        const wrap = document.createElement("div");
        wrap.classList.value = "flex justify-start";
        wrap.appendChild(table);
        container.appendChild(wrap);
    }
    renderConnections(container) {
        container.innerHTML = '';
        this.renderTitleHeading(container, "LOC_BZ_SETTLEMENT_CONNECTIONS");
        // TODO: handle empty list
        if (!bzCityDetails.connections) return;
        const size = metrics.table.spacing.css;
        const small = metrics.sizes(2/3 * metrics.table.spacing.rem).css;
        const table = document.createElement("div");
        table.classList.value = "flex justify-start text-base -mx-1";
        const rows = [];
        const connections = [
            ...bzCityDetails.connections.cities,
            ...bzCityDetails.connections.growing,
            ...bzCityDetails.connections.focused,
        ];
        for (const conn of connections) {
            const row = document.createElement("div");
            row.classList.value = "relative flex justify-start";
            row.style.minHeight = row.style.lineHeight = size;
            if (conn.isTown) {
                const focus = getTownFocus(conn);
                row.appendChild(docIcon(focus.icon, size, size));
            } else {
                row.appendChild(docIcon(BZ_ICON_CITY, size, small));
            }
            const name = document.createElement("div");
            name.classList.value = "max-w-36 mx-1 text-left";
            name.setAttribute('data-l10n-id', conn.name);
            row.appendChild(name);
            rows.push(row);
        }
        const columns = [];
        const half = rows.length < 5 ? rows.length : Math.ceil(rows.length / 2);
        columns.push(rows.slice(0, half));
        if (half < rows.length) columns.push(rows.slice(half));
        for (const [i, column] of columns.entries()) {
            const col = document.createElement("div");
            col.classList.value = "flex-col justify-start";
            if (i) col.classList.add("ml-4");
            for (const row of column) col.appendChild(row);
            table.appendChild(col);
        }
        table.style.marginBottom = metrics.table.margin.px;
        container.appendChild(table);
    }
    renderTitleHeading(container, text) {
        if (!text) return;
        const layout = document.createElement("div");
        layout.classList.value = "text-secondary font-title-base uppercase";
        layout.style.lineHeight = metrics.head.ratio;
        layout.style.marginTop = metrics.head.margin.px;
        const ttText = document.createElement("div");
        ttText.setAttribute('data-l10n-id', text);
        layout.appendChild(ttText);
        container.appendChild(layout);
    }
    // update data model for alternate Constructibles tab slot
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
            this.buildingsList.appendChild(this.createDivider("-my-1"));
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
    addDistrictData(districtData) {
        const mainDiv = document.createElement("div");
        mainDiv.classList.add("flex", "flex-col");
        if (districtData.name && districtData.description) {
            const uniqueQuarterContainer = document.createElement("div");
            uniqueQuarterContainer.classList.add("flex");
            mainDiv.appendChild(uniqueQuarterContainer);
            const uniqueQuarterIcon = document.createElement("fxs-icon");
            uniqueQuarterIcon.classList.add("size-12", "ml-3");
            uniqueQuarterIcon.setAttribute("data-icon-context", "DEFAULT");
            uniqueQuarterIcon.setAttribute("data-icon-id", "CITY_UNIQUE_QUARTER");
            uniqueQuarterContainer.appendChild(uniqueQuarterIcon);
            const uniqueQuarterTextContainer = document.createElement("div");
            uniqueQuarterTextContainer.classList.add("flex", "flex-col", "flex-auto", "ml-2");
            uniqueQuarterTextContainer.style.setProperty("max-width", "23rem");
            uniqueQuarterContainer.appendChild(uniqueQuarterTextContainer);
            const districtName = document.createElement("div");
            districtName.classList.add("my-1", "font-title", "uppercase", "text-xs");
            districtName.innerHTML = districtData.name;
            uniqueQuarterTextContainer.appendChild(districtName);
            const districtDescription = document.createElement("div");
            districtDescription.classList.add("text-xs", "leading-normal");
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
        mainDiv.setAttribute("data-type", constructibleData.type);
        mainDiv.setAttribute('data-tooltip-style', 'production-constructible-tooltip');
        const topDiv = document.createElement("div");
        topDiv.classList.add("constructible-entry-highlight", "flex", "my-1", "pointer-events-none", "items-center");
        const icon = document.createElement("fxs-icon");
        icon.classList.add("size-12", "ml-3");
        icon.setAttribute("data-icon-context", constructibleData.iconContext);
        icon.setAttribute("data-icon-id", constructibleData.icon);
        topDiv.appendChild(icon);
        const rightContainer = document.createElement("div");
        rightContainer.classList.add("flex", "flex-col", "ml-2");
        const nameContainer = document.createElement("div");
        nameContainer.classList.add("flex", "center");
        rightContainer.appendChild(nameContainer);
        const name = document.createElement("div");
        name.classList.add("font-title", "uppercase", "text-xs");
        name.textContent = Locale.compose(constructibleData.name);
        nameContainer.appendChild(name);
        const yieldAdjustContainer = document.createElement("div");
        yieldAdjustContainer.classList.add("flex", "justify-between");
        yieldAdjustContainer.style.setProperty("width", "24rem");  // w-108
        const yieldContainer = document.createElement("div");
        const maintenanceContainer = document.createElement("div");
        if (constructibleData.damaged) {
            const damagedText = document.createElement("div");
            // display warning in a yellow capsule
            // ml-1.5 sets the round end slightly over the margin
            damagedText.classList.value = "uppercase text-xs leading-tight mt-1 ml-1\\.5 px-2 rounded-full";
            damagedText.style.setProperty("background-color", BZ_COLOR.caution);
            damagedText.style.setProperty("color", BZ_COLOR.black);
            damagedText.setAttribute("data-l10n-id",
                "LOC_UI_CITY_DETAILS_BUILDING_DAMAGED");
            yieldContainer.appendChild(damagedText);
        }
        if (constructibleData.yieldMap) {
            yieldContainer.classList.add("flex", "flex-wrap");
            yieldAdjustContainer.style.setProperty("max-width", "24rem");  // max-w-108
            for (const [_yieldType, yieldData] of constructibleData.yieldMap) {
                if (yieldData.icon && yieldData.iconContext) {
                    const yieldEntry = document.createElement("div");
                    yieldEntry.classList.add("flex", "mr-2");
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
                    maintenanceEntry.classList.add("flex", "mr-2");
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
    createDivider(...style) {
        const dividerDiv = document.createElement("div");
        dividerDiv.classList.value = BZ_DIVIDER_STYLE;
        if (style.length) dividerDiv.classList.add(...style);
        dividerDiv.innerHTML = BZ_DIVIDER_LINE;
        return dividerDiv;
    }
}
Controls.decorate('panel-city-details', (val) => new bzPanelCityDetails(val));
