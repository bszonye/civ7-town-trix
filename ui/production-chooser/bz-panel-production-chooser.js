import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { Construct } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
// decorate ProductionChooserScreen to:
// - update the list after selecting repairs (fixes "sticky" repairs)
// - always leave the list open when building repairs
// - remember Production/Purchase tab selection
const BZ_HEAD_STYLE = [
`
.bz-city-hall .advisor-recommendation__container .advisor-recommendation__icon {
    width: 1.1111111111rem;
    height: 1.1111111111rem;
}
`,
];
BZ_HEAD_STYLE.map(style => {
    const e = document.createElement('style');
    e.textContent = style;
    document.head.appendChild(e);
});
document.body.classList.add("bz-city-hall");
export class bzProductionChooserScreen {
    static panel_prototype;
    static panel_doOrConfirmConstruction;
    static isPurchase = false;
    static isCDPanelOpen = true;
    constructor(panel) {
        this.panel = panel;
        panel.bzPanel = this;
        this.patchPrototypes(this.panel);
    }
    patchPrototypes(panel) {
        const panel_prototype = Object.getPrototypeOf(panel);
        if (bzProductionChooserScreen.panel_prototype == panel_prototype) return;
        // patch PanelCityDetails methods
        const proto = bzProductionChooserScreen.panel_prototype = panel_prototype;
        // override doOrConfirmConstruction method
        bzProductionChooserScreen.panel_doOrConfirmConstruction =
            proto.doOrConfirmConstruction;
        proto.doOrConfirmConstruction = function(...args) {
            return this.bzPanel.bzDoOrConfirmConstruction(...args);
        }
        // override isPurchase property
        const panel_isPurchase =
            Object.getOwnPropertyDescriptor(panel_prototype, "isPurchase");
        const isPurchase = {
            configurable: panel_isPurchase.configurable,
            enumerable: panel_isPurchase.enumerable,
            get: panel_isPurchase.get,
            set(value) {
                // remember tab selection
                bzProductionChooserScreen.isPurchase = value;
                panel_isPurchase.set.apply(this, [value]);
            },
        };
        Object.defineProperty(panel_prototype, "isPurchase", isPurchase);
        // override cityID property
        const panel_cityID =
            Object.getOwnPropertyDescriptor(panel_prototype, "cityID");
        const cityID = {
            configurable: panel_cityID.configurable,
            enumerable: panel_cityID.enumerable,
            get: panel_cityID.get,
            set(value) {
                panel_cityID.set.apply(this, [value]);
                // restore tab selection (if needed & possible)
                if (this._isPurchase || this.city.Happiness?.hasUnrest) return;
                if (bzProductionChooserScreen.isPurchase) this.isPurchase = true;
            },
        };
        Object.defineProperty(panel_prototype, "cityID", cityID);
        // override items property
        const panel_items =
            Object.getOwnPropertyDescriptor(panel_prototype, "items");
        const items = {
            configurable: panel_items.configurable,
            enumerable: panel_items.enumerable,
            get: panel_items.get,
            set(value) {
                // sort items
                for (const [_key, list] of Object.entries(value)) {
                    list.sort((a, b) => {
                        // sort by value (higher absolute value is better)
                        if (a.sortValue != b.sortValue) {
                            if (a.sortValue < 0 || b.sortValue < 0) {
                                // negative values sort first (repairs & civilians)
                                return a.sortValue - b.sortValue;
                            }
                            return b.sortValue - a.sortValue;
                        }
                        // sort by cost (lower is better)
                        if (a.sortCost != b.sortCost) return a.sortCost - b.sortCost;
                        // finally, sort by name
                        const aName = Locale.compose(a.name);
                        const bName = Locale.compose(b.name);
                        return aName.localeCompare(bName);
                    });
                }
                panel_items.set.apply(this, [value]);
            },
        };
        Object.defineProperty(panel_prototype, "items", items);
    }
    bzDoOrConfirmConstruction(category, type, animationConfirmCallback) {
        const city = this.panel.city;
        if (!city) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid city!`);
            return;
        }
        const item = this.panel.items[category].find(item => item.type === type);
        if (!item) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid item!`);
            return;
        }
        const queueLengthBeforeAdd = BuildQueue.items.length;
        const bSuccess = Construct(city, item, this.panel.isPurchase);
        // close the production panel after selection, unless:
        // - there were already items queued
        // - the item was purchased
        // - the selection was a repair
        // in all of those cases, the player likely opened the city
        // screen explicitly to manage the queue or build multiple
        // items, so it should remain open.
        if (bSuccess) {
            if (queueLengthBeforeAdd > 0) {
                Audio.playSound("data-audio-queue-item", "audio-production-chooser");
            }
            animationConfirmCallback?.();
            if (this.panel.wasQueueInitiallyEmpty &&
                !this.panel.isPurchase && !item.isRepair) {
                UI.Player.deselectAllCities();
                InterfaceMode.switchToDefault();
                this.panel.requestPlaceBuildingClose();
            }
        }
    }

    beforeAttach() { }
    afterAttach() {
        engine.on('ConstructibleChanged', this.panel.onConstructibleAddedToMap, this.panel);
        // restore the city details panel if it was open previously
        if (bzProductionChooserScreen.isCDPanelOpen && !this.panel.isSmallScreen()) {
            this.panel.showCityDetails();
        }
    }
    onAttributeChanged(_name, _prev, _next) { }
    beforeDetach() {
        if (!this.panel.isSmallScreen()) {
            // remember whether the city details panel is open
            const cdSlot = this.panel.cityDetailsSlot;
            const cdPanel = cdSlot?.querySelector(".panel-city-details");
            bzProductionChooserScreen.isCDPanelOpen =
                cdPanel && !cdPanel.classList.contains("hidden");
        }
    }
    afterDetach() {
        // clear Purchase tab memory when closing the panel.
        // this includes switches to the building-placement interface,
        // but that has its own means of restoring the Purchase tab.
        bzProductionChooserScreen.isPurchase = false;
        engine.off('ConstructibleChanged', this.panel.onConstructibleAddedToMap, this.panel);
    }
}
Controls.decorate('panel-production-chooser', (val) => new bzProductionChooserScreen(val));
