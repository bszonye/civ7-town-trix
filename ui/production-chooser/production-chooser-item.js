import { ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
const categoryTooltipStyleMap = {
    [ProductionPanelCategory.BUILDINGS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.UNITS]: 'production-unit-tooltip',
    [ProductionPanelCategory.WONDERS]: 'production-constructible-tooltip',
    [ProductionPanelCategory.PROJECTS]: 'production-project-tooltip',
};
export const UpdateProductionChooserItem = (element, data, isPurchase) => {
    element.dataset.name = data.name;
    element.dataset.type = data.type;
    element.dataset.category = data.category;
    element.dataset.isPurchase = isPurchase.toString();
    element.dataset.isAgeless = data.ageless ? 'true' : 'false';
    if (data.secondaryDetails) {
        element.dataset.secondaryDetails = data.secondaryDetails;
    }
    else {
        element.removeAttribute('data-secondary-details');
    }
    const cost = isPurchase ? data.cost : data.turns;
    element.dataset.cost = cost.toString();
    element.setAttribute('disabled', (!!data.disabled).toString());
    if (data.error) {
        element.dataset.error = data.error;
    }
    else {
        element.removeAttribute('data-error');
    }
    if (data.description) {
        element.dataset.description = data.description;
    }
    else {
        element.removeAttribute('data-description');
    }
    if (data.recommendations && data.recommendations.length > 0) {
        element.dataset.recommendations = JSON.stringify(data.recommendations);
    }
    else {
        element.removeAttribute('data-recommendations');
    }
    if (data.type == "IMPROVEMENT_REPAIR_ALL") {
        element.setAttribute('data-repair-all', 'true');
    }
    if (isPurchase) {
        element.setAttribute("data-audio-activate-ref", "data-audio-city-purchase-activate");
    }
    else {
        element.setAttribute("data-audio-activate-ref", "data-audio-city-production-activate");
    }
    element.setAttribute('data-tooltip-style', categoryTooltipStyleMap[data.category]);
};
export class ProductionChooserItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        // #region Element References
        this.iconElement = document.createElement('fxs-icon');
        this.itemNameElement = document.createElement('span');
        this.secondaryDetailsElement = document.createElement('div');
        this.errorTextElement = document.createElement('span');
        this.costContainer = document.createElement('div');
        this.costIconElement = document.createElement('span');
        this.recommendationsContainer = document.createElement('div');
        this.costAmountElement = document.createElement('span');
        this.agelessContainer = document.createElement('div');
    }
    // #endregion
    get isPurchase() {
        return this.Root.getAttribute('data-is-purchase') === 'true';
    }
    onInitialize() {
        super.onInitialize();
        this.selectOnActivate = true;
        this.render();
    }
    onAttach() {
        super.onAttach();
    }
    onDetach() {
        super.onDetach();
    }
    render() {
        this.Root.classList.add('text-sm', 'production-chooser-item');
        this.container.classList.add('p-2', 'font-title', 'tracking-100');
        this.iconElement.classList.add('size-16', 'bg-contain', 'bg-center', 'bg-no-repeat', 'mr-2');
        this.container.appendChild(this.iconElement);
        const infoContainer = document.createElement('div');
        infoContainer.classList.value = 'relative flex flex-col flex-auto justify-between';
        this.itemNameElement.classList.value = 'font-title text-xs text-accent-2 mb-1 uppercase';
        infoContainer.appendChild(this.itemNameElement);
        // TODO: remove z-index when the disabled styling is fixed, we shouldn't render text underneath an overlay.
        this.errorTextElement.classList.value = 'font-body text-negative-light z-1 pointer-events-none';
        infoContainer.appendChild(this.errorTextElement);
        this.secondaryDetailsElement.classList.value = 'invisible flex';
        infoContainer.appendChild(this.secondaryDetailsElement);
        this.container.appendChild(infoContainer);
        const rightColumn = document.createElement('div');
        rightColumn.classList.value = 'relative flex flex-col items-end justify-between';
        this.agelessContainer.classList.value = 'invisible flex items-center';
        this.agelessContainer.innerHTML = `
			<div class="font-title uppercase text-accent-2" data-l10n-id="LOC_UI_PRODUCTION_AGELESS"></div>
			<img src="fs://game/city_ageless.png" class="size-6 mx-1"/>
		`;
        this.recommendationsContainer.classList.value = 'flex items-center justify-center mr-2';
        this.costContainer.appendChild(this.recommendationsContainer);
        this.costContainer.classList.value = 'flex items-center';
        this.costAmountElement.classList.value = 'font-title';
        this.costContainer.appendChild(this.costAmountElement);
        this.costIconElement.classList.value = 'size-8 bg-contain bg-center bg-no-repeat mr-1';
        this.costContainer.appendChild(this.costIconElement);
        rightColumn.appendChild(this.agelessContainer);
        rightColumn.appendChild(this.costContainer);
        this.container.appendChild(rightColumn);
    }
    updateCostIconElement() {
        const costIcon = this.isPurchase ? 'Yield_Gold' : 'hud_turn-timer';
        this.costIconElement.style.setProperty('background-image', `url(${costIcon})`);
        const altText = Locale.compose(this.isPurchase ? "LOC_YIELD_GOLD" : "LOC_UI_CITY_INSPECTOR_TURNS");
        this.costIconElement.ariaLabel = altText;
    }
    createRecommendationElements(recommendationList) {
        this.recommendationsContainer.innerHTML = '';
        const recommendations = JSON.parse(recommendationList);
        const advisorList = recommendations.map(rec => rec.class);
        const advisorRecommendations = AdvisorUtilities.createAdvisorRecommendation(advisorList);
        this.recommendationsContainer.appendChild(advisorRecommendations);
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-name':
                if (newValue) {
                    this.itemNameElement.dataset.l10nId = newValue;
                }
                break;
            case 'data-type':
                if (newValue) {
                    this.iconElement.setAttribute('data-icon-id', newValue);
                }
                else {
                    this.iconElement.removeAttribute('data-icon-id');
                }
                break;
            case 'data-is-purchase':
                this.updateCostIconElement();
                break;
            case 'data-cost':
                const cost = newValue ? parseInt(newValue) : 0;
                const showCost = isNaN(cost) || cost < 0;
                this.costContainer.classList.toggle('hidden', showCost);
                this.costAmountElement.textContent = newValue;
                break;
            case 'data-error':
                if (newValue) {
                    this.errorTextElement.setAttribute('data-l10n-id', newValue);
                    this.errorTextElement.classList.remove('hidden');
                }
                else {
                    this.errorTextElement.removeAttribute('data-l10n-id');
                    this.errorTextElement.classList.add('hidden');
                }
                break;
            case 'data-is-ageless':
                const isAgeless = newValue === 'true';
                this.agelessContainer.classList.toggle('invisible', !isAgeless);
                break;
            case 'data-secondary-details': {
                if (newValue) {
                    this.secondaryDetailsElement.innerHTML = newValue;
                    this.secondaryDetailsElement.classList.remove('invisible');
                }
                else {
                    this.secondaryDetailsElement.classList.add('invisible');
                }
                break;
            }
            case 'data-recommendations': {
                if (newValue) {
                    this.createRecommendationElements(newValue);
                    this.recommendationsContainer.classList.remove('invisible');
                }
                else {
                    this.recommendationsContainer.classList.add('invisible');
                }
                break;
            }
            default:
                super.onAttributeChanged(name, _oldValue, newValue);
                break;
        }
    }
}
Controls.define('production-chooser-item', {
    createInstance: ProductionChooserItem,
    attributes: [
        { name: 'disabled' },
        { name: 'data-category' },
        { name: 'data-name' },
        { name: 'data-type' },
        { name: 'data-cost' },
        { name: 'data-prereq' },
        { name: 'data-description' },
        { name: 'data-error' },
        { name: 'data-is-purchase' },
        { name: 'data-is-ageless' },
        { name: 'data-secondary-details' },
        { name: 'data-recommendations' },
    ]
});
//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-item.js.map
