import { UpdateCityDetailsEventName } from '/base-standard/ui/city-details/model-city-details.js';
import CityYieldsEngine from '/base-standard/ui/utilities/utilities-city-yields.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export class CityYieldsBar extends Component {
    constructor() {
        super(...arguments);
        this.cityID = null;
        this.yieldElements = new Map();
    }
    onInitialize() {
        super.onInitialize();
        this.Root.classList.add('flex', 'flex-row', 'items-center', 'text-sm');
        this.cityID = UI.Player.getHeadSelectedCity();
    }
    onAttach() {
        this.refresh(); // refresh here so if we're reattaching we're up to date
        engine.on('CityYieldChanged', this.onCityYieldOrPopulationChanged, this);
        engine.on('CityPopulationChanged', this.onCityYieldOrPopulationChanged, this);
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
        window.addEventListener(UpdateCityDetailsEventName, this.onCityYieldOrPopulationChanged.bind(this));
    }
    onDetach() {
        engine.off('CityYieldChanged', this.onCityYieldOrPopulationChanged, this);
        engine.off('CityPopulationChanged', this.onCityYieldOrPopulationChanged, this);
        engine.off('CitySelectionChanged', this.onCitySelectionChanged, this);
        window.removeEventListener(UpdateCityDetailsEventName, this.onCityYieldOrPopulationChanged.bind(this));
    }
    onCityYieldOrPopulationChanged() {
        this.refresh();
    }
    onCitySelectionChanged({ cityID }) {
        if (ComponentID.isMatch(this.cityID, cityID)) {
            return;
        }
        this.cityID = cityID;
        this.refresh();
    }
    createOrUpdateYieldEntry({ type, valueNum, label }) {
        if (!type) {
            console.error('city-yields: invalid yield type');
            return;
        }
        const yieldElements = this.yieldElements.get(type);
        const truncValue = (valueNum > 100 ? Math.trunc(valueNum) : Math.trunc(valueNum * 10) / 10).toString();
        if (!yieldElements) {
            const icon = document.createElement('fxs-icon');
            icon.classList.add('size-8', 'bg-no-repeat', 'bg-center');
            icon.setAttribute('data-icon-id', type);
            icon.setAttribute('data-icon-context', 'YIELD');
            const text = document.createTextNode(truncValue);
            const container = document.createElement('div');
            container.role = "paragraph";
            container.className = 'min-w-0 w-12 px-1 flex-initial flex flex-col items-center pointer-events-auto';
            container.ariaLabel = `${truncValue} ${label}`;
            container.append(icon, text);
            this.Root.appendChild(container);
            this.yieldElements.set(type, { text, icon });
        }
        else {
            yieldElements.text.nodeValue = truncValue;
        }
    }
    refresh(yields) {
        if (!yields) {
            const cityId = this.cityID;
            if (!cityId || !ComponentID.isValid(cityId)) {
                console.error('city-yields: invalid city id');
                return;
            }
            yields = CityYieldsEngine.getCityYieldDetails(cityId);
        }
        for (const yieldData of yields) {
            this.createOrUpdateYieldEntry(yieldData);
        }
    }
}
Controls.define('city-yields', {
    createInstance: CityYieldsBar
});
//# sourceMappingURL=file:///base-standard/ui/production-chooser/city-yields.js.map
