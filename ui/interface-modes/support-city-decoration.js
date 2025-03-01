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
        HighlightColors[HighlightColors["centerSelection"] = 0x80ff00c0] = "centerSelection";
        HighlightColors[HighlightColors["urbanSelection"] = 0x80ff8000] = "urbanSelection";
        HighlightColors[HighlightColors["ruralSelection"] = 0x8000ff80] = "ruralSelection";
        HighlightColors[HighlightColors["centerFill"] = 0x55ff00aa] = "centerFill";
        HighlightColors[HighlightColors["urbanFill"] = 0x55ff8000] = "urbanFill";
        HighlightColors[HighlightColors["ruralFill"] = 0x5500ff80] = "ruralFill";
    })(HighlightColors = CityDecorationSupport.HighlightColors || (CityDecorationSupport.HighlightColors = {}));
    class Instance {
        constructor() {
            this.cityOverlayGroup = null;
            this.cityOverlay = null;
            this.beforeUnloadListener = () => { this.onUnload(); };
            this.OUTER_REGION_OVERLAY_FILTER = { brightness: 4/9 }; // darken plots outside the city
            this.filtered = false;
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
            if (this.filtered) WorldUI.popFilter();  // city changes don't use clearDecorations
            WorldUI.pushRegionColorFilter(city.getPurchasedPlots(), {}, this.OUTER_REGION_OVERLAY_FILTER);
            this.filtered = true;
            const cityDistricts = city.Districts;
            if (cityDistricts) {
                // Highlight the rural districts
                const districtIdsRural = cityDistricts.getIdsOfType(DistrictTypes.RURAL);
                if (districtIdsRural.length > 0) {
                    const locations = Districts.getLocations(districtIdsRural);
                    if (locations.length > 0) {
                        this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.ruralSelection, fillColor: HighlightColors.ruralFill });
                    }
                }
                // Highlight the urban districts
                const districtIdsUrban = cityDistricts.getIdsOfType(DistrictTypes.URBAN);
                if (districtIdsUrban.length > 0) {
                    const locations = Districts.getLocations(districtIdsUrban);
                    if (locations.length > 0) {
                        this.cityOverlay?.addPlots(locations, { edgeColor: HighlightColors.urbanSelection, fillColor: HighlightColors.urbanFill });
                    }
                }
                // Highlight the city center
                this.cityOverlay?.addPlots([city.location], { edgeColor: HighlightColors.centerSelection, fillColor: HighlightColors.centerFill });
            }
        }
        onUnload() {
            this.clearDecorations();
        }
        clearDecorations() {
            if (this.filtered) WorldUI.popFilter();
            this.filtered = false;
            this.cityOverlayGroup?.clearAll();
        }
    }
    CityDecorationSupport.manager = new Instance();
})(CityDecorationSupport || (CityDecorationSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/interface-modes/support-city-decoration.js.map
