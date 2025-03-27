/**
 * @file City Decoration support
 * @copyright 2022, Firaxis Games
 * @description City Decoration support for interface modes (city-selected, city-production, city-growth, city-info)
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { OVERLAY_PRIORITY } from '/base-standard/ui/utilities/utilities-overlay.js';
import { WorkerYieldsLensLayer } from '/bz-city-hall/ui/lenses/layer/building-placement-layer.js';
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
            this.citySpriteGrid = null;
            this.beforeUnloadListener = () => { this.onUnload(); };
            this.BUILD_SLOT_SPRITE_PADDING = 12;
            this.BUILDING_TYPE_SPRITE_PADDING = 7;
            this.OUTER_REGION_OVERLAY_FILTER = { brightness: 4/9 }; // darken plots outside the city
            this.filtered = false;
        }
        initializeOverlay() {
            this.cityOverlayGroup = WorldUI.createOverlayGroup("CityOverlayGroup", OVERLAY_PRIORITY.PLOT_HIGHLIGHT);
            this.cityOverlay = this.cityOverlayGroup.addPlotOverlay();
            this.citySpriteGrid = WorldUI.createSpriteGrid("CityOverlaySpriteGroup", true);
            this.citySpriteGrid.setVisible(false);
            engine.on('BeforeUnload', this.beforeUnloadListener);
        }
        realizeBuildSlots(district, grid) {
            WorkerYieldsLensLayer.prototype.realizeBuildSlots.apply(this, [district, grid]);
        }
        decoratePlots(cityID) {
            this.cityOverlayGroup?.clearAll();
            this.citySpriteGrid?.clear();
            this.citySpriteGrid.setVisible(true);
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
                        for (const loc of locations) {
                            const district = Districts.getAtLocation(loc);
                            if (district) {
                                this.realizeBuildSlots(district, this.citySpriteGrid);
                            }
                        }
                    }
                }
                // Highlight the city center
                this.cityOverlay?.addPlots([city.location], { edgeColor: HighlightColors.centerSelection, fillColor: HighlightColors.centerFill });
                const center = Districts.getAtLocation(city.location);
                this.realizeBuildSlots(center, this.citySpriteGrid);
            }
        }
        onUnload() {
            this.clearDecorations();
        }
        clearDecorations() {
            if (this.filtered) WorldUI.popFilter();
            this.filtered = false;
            this.cityOverlayGroup?.clearAll();
            this.citySpriteGrid?.clear();
            this.citySpriteGrid.setVisible(false);
        }
    }
    CityDecorationSupport.manager = new Instance();
})(CityDecorationSupport || (CityDecorationSupport = {}));

//# sourceMappingURL=file:///base-standard/ui/interface-modes/support-city-decoration.js.map
