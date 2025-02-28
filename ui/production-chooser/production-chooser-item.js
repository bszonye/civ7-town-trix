import { ProductionPanelCategory } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';

const _DEBUG_GRAY = ["background-color", "rgba(141, 151, 166, 0.5)"];
const _DEBUG_RED = ["background-color", "rgba(150, 57, 57, .35)"];
const _DEBUG_GREEN = ["background-color", "rgba(57, 150, 57, .35)"];
const _DEBUG_BLUE = ["background-color", "rgba(57, 57, 150, .35)"];

const BZ_WARNING_BLACK = "#000000";
const _BZ_WARNING_RED = "#3a0806";  // danger
const BZ_WARNING_AMBER = "#cea92f";  // caution
const _BZ_WARNING_BRONZE = "#604639";  // note

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
    element.dataset.sortValue = data.sortValue;
    element.dataset.sortCost = data.cost;
    element.dataset.isPurchase = isPurchase.toString();
    element.dataset.isRepair = data.repair ? 'true' : 'false';
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
    get isRepair() {
        return this.Root.getAttribute('data-is-repair') === 'true';
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
        this.Root.classList.add('text-xs', 'leading-tight');
        this.container.classList.add('flex', 'justify-start', 'items-center', 'p-1');
        this.iconElement.classList.add('size-12', 'bg-contain', 'bg-center', 'bg-no-repeat');
        this.container.appendChild(this.iconElement);
        const infoContainer = document.createElement('div');
        infoContainer.classList.value = 'relative flex flex-col justify-center mx-2';
        this.itemNameElement.classList.value = 'font-title text-accent-2 uppercase';
        infoContainer.appendChild(this.itemNameElement);
        // TODO: remove z-index when the disabled styling is fixed, we shouldn't render text underneath an overlay.
        this.errorTextElement.classList.value = 'font-body text-negative-light z-1 pointer-events-none';
        infoContainer.appendChild(this.errorTextElement);
        this.container.appendChild(infoContainer);
        this.recommendationsContainer.classList.value = 'flex items-center justify-left';
        this.container.appendChild(this.recommendationsContainer);
        const rightColumn = document.createElement('div');
        rightColumn.classList.value = 'flex-auto relative flex flex-col items-end justify-center';
        const statsContainer = document.createElement('div');
        statsContainer.classList.value = 'flex items-center';
        // statsContainer.style.setProperty(..._DEBUG_GRAY);
        this.secondaryDetailsElement.classList.value = 'invisible flex';
        statsContainer.appendChild(this.secondaryDetailsElement);
        this.agelessContainer.classList.value = 'hidden flex items-center';
        this.agelessContainer.innerHTML = '<img src="fs://game/city_ageless.png" class="size-6"/>';
        statsContainer.appendChild(this.agelessContainer);
        this.costContainer.classList.value = 'flex items-center';
        // this.costContainer.style.setProperty(..._DEBUG_GRAY);
        this.costAmountElement.classList.value = 'font-title text-base mr-1';
        this.costContainer.appendChild(this.costAmountElement);
        this.costIconElement.classList.value = 'size-8 bg-contain bg-center bg-no-repeat -m-1';
        // this.costIconElement.style.setProperty(..._DEBUG_RED);
        this.costContainer.appendChild(this.costIconElement);
        rightColumn.appendChild(statsContainer);
        rightColumn.appendChild(this.costContainer);
        this.container.appendChild(rightColumn);
    }
    updateCostIconElement() {
        const costIcon = this.isPurchase ? 'Yield_Gold' : 'hud_turn-timer';
        this.costIconElement.style.setProperty('background-image', `url(${costIcon})`);
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
                {
                    const cost = newValue ? parseInt(newValue) : 0;
                    const showCost = isNaN(cost) || cost < 0;
                    this.costContainer.classList.toggle('hidden', showCost);
                    this.costAmountElement.textContent = newValue;
                }
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
            case 'data-is-repair':
                {
                    const isRepair = newValue === 'true';
                    const name = this.itemNameElement;
                    const classes = [
                        "font-bold", "leading-relaxed", "rounded-full",
                        "px-2\\.5", "-ml-1"
                    ];
                    if (isRepair) {
                        name.classList.add(...classes);
                        name.style.setProperty("background-color", BZ_WARNING_AMBER);
                        name.style.setProperty("color", BZ_WARNING_BLACK);
                    } else {
                        name.classList.remove(...classes);
                        name.style.removeProperty("background-color");
                        name.style.removeProperty("color");
                    }
                }
                break;
            case 'data-is-ageless':
                {
                    const isAgeless = newValue === 'true';
                    this.agelessContainer.classList.toggle('hidden', !isAgeless);
                }
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
        { name: 'data-is-repair' },
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
