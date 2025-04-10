import '/core/ui/options/options.js';  // make sure this loads first
import { CategoryType } from '/core/ui/options/options-helpers.js';
import { Options, OptionType } from '/core/ui/options/model-options.js';
import ModSettings from '/bz-city-hall/ui/options/mod-options-decorator.js';

const MOD_ID = "bz-city-hall";

const BZ_DEFAULT_OPTIONS = {
    oneClickRepairs: true,
};
const bzCityHallOptions = new class {
    data = { ...BZ_DEFAULT_OPTIONS };
    constructor() {
        const modSettings = ModSettings.load(MOD_ID);
        if (modSettings) this.data = modSettings;
    }
    save() {
        ModSettings.save(MOD_ID, this.data);
        // sync optional styling
        if (this.data.oneClickRepairs) {
            document.body.classList.add("bz-relationship-fix");
        } else {
            document.body.classList.remove("bz-relationship-fix");
        }
        if (this.data.yieldBanner) {
            document.body.classList.add("bz-yield-banner");
        } else {
            document.body.classList.remove("bz-yield-banner");
        }
    }
    get oneClickRepairs() {
        return this.data.oneClickRepairs ?? BZ_DEFAULT_OPTIONS.oneClickRepairs;
    }
    set oneClickRepairs(flag) {
        this.data.oneClickRepairs = !!flag;
        this.save();
    }
};

const onInitOneClickRepairs = (info) => {
    info.currentValue = bzCityHallOptions.oneClickRepairs;
};
const onUpdateOneClickRepairs = (_info, flag) => {
    bzCityHallOptions.oneClickRepairs = flag;
};

Options.addInitCallback(() => {
    Options.addOption({
        category: CategoryType.Mods,
        // @ts-ignore
        group: "bz_mods",
        type: OptionType.Checkbox,
        id: "bz-one-click-repairs",
        initListener: onInitOneClickRepairs,
        updateListener: onUpdateOneClickRepairs,
        label: "LOC_OPTIONS_BZ_ONE_CLICK_REPAIRS",
        description: "LOC_OPTIONS_BZ_ONE_CLICK_REPAIRS_DESCRIPTION",
    });
});

export { bzCityHallOptions as default };
