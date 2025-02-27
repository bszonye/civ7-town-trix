// decorate ProductionChooserScreen to fix the sticky repair bug
// (updates the production list after selecting the repair)
export class bzProductionChooserScreen {
    constructor(panel) {
        this.panel = panel;
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
