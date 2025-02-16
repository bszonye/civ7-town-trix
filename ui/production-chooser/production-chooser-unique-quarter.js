export class UniqueQuarter {
    set definition(value) {
        this.nameElement.setAttribute('data-l10n-id', value.Name);
        this.uqInfoCols.setAttribute('data-tooltip-content', value.Description);
    }
    set numCompleted(value) {
        this.completionStatusText.textContent = Locale.compose('LOC_UI_PRODUCTION_QUARTER_BUILDINGS_COMPLETED', value);
    }
    constructor() {
        this.root = document.createElement('div');
        this.uqInfoCols = document.createElement('div');
        this.nameElement = document.createElement('div');
        this.completionStatusText = document.createElement('div');
        this.buildingContainer = document.createElement('div');
        this.buildingElementOne = undefined;
        this.buildingElementTwo = undefined;
        this.root.className = 'production-chooser__unique-quarter relative flex flex-col pointer-events-auto';
        this.uqInfoCols.className = 'flex items-center mx-2 mb-2 hover\\:text-accent-1 focus\\:text-accent-1';
        this.uqInfoCols.setAttribute('data-tooltip-anchor-offset', '20');
        this.uqInfoCols.setAttribute('tabindex', '-1');
        const uqCol1 = document.createElement('fxs-icon');
        uqCol1.className = 'size-10 ml-2 mr-3';
        uqCol1.setAttribute('data-icon-id', 'CITY_UNIQUE_QUARTER');
        uqCol1.setAttribute('data-icon-context', 'DEFAULT');
        const uqNameLabelContainer = document.createElement('div');
        uqNameLabelContainer.className = 'flex-auto flex flex-col';
        this.nameElement.className = 'font-title text-sm leading-tight uppercase transition-color';
        const labelElement = document.createElement('div');
        labelElement.className = 'font-body text-xs leading-tight transition-color';
        labelElement.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_UNIQUE_QUARTER');
        uqNameLabelContainer.append(this.nameElement, labelElement);
        this.completionStatusText.className = 'font-body text-xs leading-tight transition-color';
        this.uqInfoCols.append(uqCol1, uqNameLabelContainer, this.completionStatusText);
        this.buildingContainer.className = 'flex flex-col pl-2';
        const uqBarDecor = document.createElement('div');
        uqBarDecor.className = 'absolute -left-px h-full w-1\\.5 img-city-tab-line-vert';
        const uqDivider = document.createElement('div');
        uqDivider.className = 'production-chooser__unique-quarter-divider';
        this.root.append(this.uqInfoCols, this.buildingContainer, uqBarDecor, uqDivider);
    }
    setBuildings(chooserItemOne, chooserItemTwo) {
        if (this.buildingElementOne == chooserItemOne && this.buildingElementTwo == chooserItemTwo) {
            return;
        }
        this.buildingContainer.innerHTML = '';
        this.buildingElementOne = chooserItemOne;
        this.buildingElementTwo = chooserItemTwo;
        this.buildingContainer.append(this.buildingElementOne, this.buildingElementTwo);
    }
    containsBuilding(item) {
        return this.buildingElementOne == item
            || this.buildingElementTwo == item;
    }
}

//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-unique-quarter.js.map
