import ResourceAllocation from '/base-standard/ui/resource-allocation/model-resource-allocation.js';

const initialize = () => {
    const proto = Object.getPrototypeOf(ResourceAllocation);
    const update = proto.update;
    proto.update = function(...args) {
        update.apply(this, args);
        console.warn(`TRIX called update(${args})`);
        const citySort = (a, b) => {
            // TODO: cities before towns
            const la = Locale.compose(a.name);
            const lb = Locale.compose(b.name);
            return la.localeCompare(lb);
        };
        this._availableCities.sort(citySort);
        const resourceSort = (a, b) => {
            // TODO: placeholder, replace with actual sort
            const ca = Locale.compose(a.classType);
            const cb = Locale.compose(b.classType);
            const cx = ca.localeCompare(cb);
            if (cx) return cx;
            const ta = Locale.compose(a.type);
            const tb = Locale.compose(b.type);
            return ta.localeCompare(tb);
        }
        for (const city of this._availableCities) {
            city.currentResources.sort(resourceSort);
            city.visibleResources.sort(resourceSort);
            city.treasureResources.sort(resourceSort);
        }
        // this._allAvailableResources.sort(resourceSort);
        this._availableBonusResources.sort(resourceSort);
        this._availableResources.sort(resourceSort);
        this._availableFactoryResources.sort(resourceSort);
        // this._treasureResources.sort(resourceSort);
    }
};
engine.whenReady.then(initialize);
