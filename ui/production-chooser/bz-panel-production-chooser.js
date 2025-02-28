// decorate ProductionChooserScreen to fix the sticky repair bug
// (updates the production list after selecting the repair)
export class bzProductionChooserScreen {
    static panel_prototype;
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
