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
        HighlightColors[HighlightColors["centerSelection"] = 0x80ff80e0] = "centerSelection";
        HighlightColors[HighlightColors["urbanSelection"] = 0x80ffa080] = "urbanSelection";
        HighlightColors[HighlightColors["coastalSelection"] = 0x80ffff80] = "coastalSelection";
        HighlightColors[HighlightColors["ruralSelection"] = 0x8080ff80] = "ruralSelection";
        HighlightColors[HighlightColors["centerFill"] = 0x55ff00c0] = "centerFill";
        HighlightColors[HighlightColors["urbanFill"] = 0x55ff4000] = "urbanFill";
        HighlightColors[HighlightColors["coastalFill"] = 0x55ffff00] = "coastalFill";
        HighlightColors[HighlightColors["ruralFill"] = 0x5500ff00] = "ruralFill";
    })(HighlightColors = CityDecorationSupport.HighlightColors || (CityDecorationSupport.HighlightColors = {}));
    class Instance {
        constructor() {
            this.cityOverlayGroup = null;
            this.cityOverlay = null;
            this.citySpriteGrid = null;
            this.beforeUnloadListener = () => { this.onUnload(); };
            this.BUILD_SLOT_SPRITE_PADDING = 12;
            this.YIELD_SPRITE_HEIGHT = 6;
            this.YIELD_SPRITE_ANGLE = Math.PI / 4;  // 45°
            this.YIELD_SPRITE_PADDING = 11;
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
            // borrow the realizeBuildSlots method
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
            const rural = [];
            const urban = [];
            const coastal = [];
            const districts = city.Districts.getIds().map(id => Districts.get(id));
            for (const district of districts) {
                const loc = district.location;
                if (district.type == DistrictTypes.CITY_CENTER) {
                    this.realizeBuildSlots(district, this.citySpriteGrid);
                } else if (district.type == DistrictTypes.URBAN) {
                    this.realizeBuildSlots(district, this.citySpriteGrid);
                    urban.push(loc);
                } else if (district.type == DistrictTypes.RURAL) {
                    const ttypeID = GameplayMap.getTerrainType(loc.x, loc.y);
                    const ttype = GameInfo.Terrains.lookup(ttypeID);
                    const isWater =
                        ttype.TerrainType == "TERRAIN_COAST" ||
                        ttype.TerrainType == "TERRAIN_NAVIGABLE_RIVER";
                    (isWater ? coastal : rural).push(loc);
                }
            }
            this.cityOverlay?.addPlots(coastal, { edgeColor: HighlightColors.coastalSelection, fillColor: HighlightColors.coastalFill });
            this.cityOverlay?.addPlots(rural, { edgeColor: HighlightColors.ruralSelection, fillColor: HighlightColors.ruralFill });
            this.cityOverlay?.addPlots(urban, { edgeColor: HighlightColors.urbanSelection, fillColor: HighlightColors.urbanFill });
            this.cityOverlay?.addPlots([city.location], { edgeColor: HighlightColors.centerSelection, fillColor: HighlightColors.centerFill });
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
