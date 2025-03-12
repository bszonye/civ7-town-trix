import { Construct } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
// decorate ProductionChooserScreen to:
// - update the list after selecting repairs (fixes "sticky" repairs)
// - always leave the list open when building repairs
export class bzProductionChooserScreen {
    static panel_prototype;
    static panel_doOrConfirmConstruction;;
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
        // wrap updateItemElementMap method to extend it
        const panel_update = proto.updateItemElementMap;
        const after_update = this.afterUpdateItemElementMap;
        proto.updateItemElementMap = function(...args) {
            const panel_rv = panel_update.apply(this, args);
            const after_rv = after_update.apply(this.bzPanel, args);
            return after_rv ?? panel_rv;
        }
        // override doOrConfirmConstruction method
        bzProductionChooserScreen.panel_doOrConfirmConstruction =
            proto.doOrConfirmConstruction;
        proto.doOrConfirmConstruction = function(...args) {
            return this.bzPanel.bzDoOrConfirmConstruction(...args);
        }
    }
    afterUpdateItemElementMap(_items) {
        // sort the production list by cost then name
        const mapItems = Array.from(this.panel.itemElementMap);
        mapItems.sort((a, b) => {
            // rows contain [type, item] from itemElementMap
            const ia = a[1].dataset;  // item a
            const ib = b[1].dataset;  // item b
            // sort by value (higher absolute value is better)
            if (ia.sortValue != ib.sortValue) {
                if (ia.sortValue < 0 || ib.sortValue < 0) {
                    // negative values sort first (repairs & civilians)
                    return ia.sortValue - ib.sortValue;
                }
                return ib.sortValue - ia.sortValue;
            }
            // sort by cost (lower is better)
            if (ia.sortCost != ib.sortCost) return ia.sortCost - ib.sortCost;
            // finally, sort by name
            return ia.name.localeCompare(ib.name);
        });
        this.panel.itemElementMap = new Map(mapItems);
    }
    bzDoOrConfirmConstruction(category, type, animationConfirmCallback) {
        const city = this.panel.city;
        if (!city) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid city!`);
            return;
        }
        const items = this.panel.items[category];
        console.warn(`TRIX items=${JSON.stringify(items)}`);
        const item = this.panel.items[category].find(item => item.type === type);
        if (!item) {
            console.error(`panel-production-chooser: confirmSelection: Failed to get a valid item!`);
            return;
        }
        const bSuccess = Construct(city, item, this.panel.isPurchase);
        // This is intentionally divergent behavior:
        // - If we had an empty queue, and successfully added something
        //   to it (which bSuccess already checked above) OTHER than
        //   a repair, then we want to close this screen and deselect
        //   cities, so it behaves as quick-select-auto-close.
        // - If instead, if the queue was *not* empty, that means player
        //   intentionally entered this screen selecting a city, AND the
        //   player had already made recent / still in progress queue
        //   choices.  In this case, we will *not* auto close the
        //   screen, because we assume player is looking at the queue,
        //   or that we should reinforce that choices are being queued
        //   up in the list. (Screen stays open and queue additions
        //   animate).
        // - ALSO keep the screen open if the player chose to build
        //   a repair, as they will likely want to queue more than one.
        console.warn(`TRIX SUCCESS=${bSuccess}`);
        if (bSuccess) {
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
    }
    onAttributeChanged(_name, _prev, _next) { }
    beforeDetach() { }
    afterDetach() {
        engine.off('ConstructibleChanged', this.panel.onConstructibleAddedToMap, this.panel);
    }
}
Controls.decorate('panel-production-chooser', (val) => new bzProductionChooserScreen(val));
