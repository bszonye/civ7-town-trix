/**
 * @file City Decoration support
 * @copyright 2022, Firaxis Games
 * @description City Decoration support for interface modes (city-selected, city-production, city-growth, city-info)
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export var CityDecorationSupport;
(function (CityDecorationSupport) {
    // TODO: Pull from assets/engine so there is an opportunity to get color correct values (HDR, colorblind, etc...)
    let HighlightColors;
    (function (HighlightColors) {
        HighlightColors[HighlightColors["citySelection"] = 4290747514] = "citySelection";
        HighlightColors[HighlightColors["urbanSelection"] = 4290747514] = "urbanSelection";
        HighlightColors[HighlightColors["ruralSelection"] = 4283282700] = "ruralSelection";
    })(HighlightColors = CityDecorationSupport.HighlightColors || (CityDecorationSupport.HighlightColors = {}));
    class Instance {
        constructor() {
            this.cityOverlayGroup = null;
            this.cityOverlay = null;
            this.beforeUnloadListener = () => { this.onUnload(); };
        }
        initializeOverlay() {
            this.cityOverlayGroup = WorldUI.createOverlayGroup("CityOverlayGroup", 1);
            this.cityOverlay = this.cityOverlayGroup.addPlotOverlay();
            engine.on('BeforeUnload', this.beforeUnloadListener);
        }
        decoratePlots(cityID) {
            this.cityOverlayGroup?.clearAll();
            const city = Cities.get(cityID);
            if (!city) {
                console.error(`City Decoration support: Failed to find city (${ComponentID.toLogString(cityID)})!`);
                return;
            }
            this.cityOverlay?.addPlots(city.location, { edgeColor: HighlightColors.citySelection });
            const cityDistricts = city.Districts;
            if (cityDistricts) {
                // Highlight the rural districts
                const districtIdsRural = cityDistricts.getIdsOfType(DistrictTypes.RURAL);
                if (districtIdsRural.length > 0) {
                    const locations = Districts.getLocations(districtIdsRural);
                    if (locations.length > 0) {
                        this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.ruralSelection });
                    }
                }
                // Highlight the urban districts
                const districtIdsUrban = cityDistricts.getIdsOfTypes([DistrictTypes.URBAN, DistrictTypes.CITY_CENTER]);
                if (districtIdsUrban.length > 0) {
                    const locations = Districts.getLocations(districtIdsUrban);
                    if (locations.length > 0) {
                        this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.urbanSelection });
                    }
                }
            }
        }
        onUnload() {
            this.clearDecorations();
        }
        clearDecorations() {
            this.cityOverlayGroup?.clearAll();
        }
    }
    CityDecorationSupport.manager = new Instance();
})(CityDecorationSupport || (CityDecorationSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/interface-modes/support-city-decoration.js.map
