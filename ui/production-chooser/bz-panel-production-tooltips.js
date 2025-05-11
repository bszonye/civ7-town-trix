import "/base-standard/ui/production-chooser/panel-production-tooltips.js";
/**
 * settlement-recommendation-tooltip.ts
 * @copyright 2024, Firaxis Gmaes
 * @description The tooltip for showing why a plot is recommended for settlement.
 */
import { GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { AdvisorUtilities } from '/base-standard/ui/tutorial/tutorial-support.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
import { getConstructibleEffectStrings } from '/core/ui/utilities/utilities-core-textprovider.js';
import { IsElement } from '/core/ui/utilities/utilities-dom.js';
class ProductionConstructibleTooltipType {
    // #endregion
    constructor() {
        this.maintenance = null;
        this.target = null;
        // #region Element References
        this.container = document.createElement('fxs-tooltip');
        this.description = document.createElement('p');
        this.header = document.createElement('div');
        this.productionCost = document.createElement('div');
        this.baseYield = document.createElement('div');
        this.constructibleName = document.createElement('div');
        this.constructibleBonusContainer = document.createElement('div');
        this.maintenanceContainer = document.createElement('div');
        this.maintenanceEntriesContainer = document.createElement('div');
        this.gemsContainer = document.createElement('div');
        this.container.className = 'flex flex-col w-96 font-body text-sm text-accent-2';
        this.container.dataset.showBorder = 'false';
        this.header.className = 'font-title text-secondary text-center uppercase tracking-100';
        this.constructibleName.className = 'font-title text-sm uppercase';
        this.baseYield.className = 'mb-1';
        this.constructibleBonusContainer.className = 'mb-1';
        this.maintenanceContainer.className = 'flex p-2 mt-0\\.5 production-chooser-tooltip__subtext-bg';
        const maintenanceLabel = document.createElement('div');
        maintenanceLabel.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_BUILDING_MAINTENANCE');
        this.gemsContainer.className = 'mt-10';
        this.maintenanceEntriesContainer.className = 'flex text-negative-light';
        this.maintenanceContainer.append(maintenanceLabel, this.maintenanceEntriesContainer);
        this.container.append(this.header, this.constructibleName, this.productionCost, this.baseYield, this.constructibleBonusContainer, this.description, this.gemsContainer, this.maintenanceContainer);
    }
    getHTML() {
        return this.container;
    }
    reset() {
    }
    isUpdateNeeded(target) {
        const targetConstructibleItem = target.closest('[data-tooltip-style="production-constructible-tooltip"]');
        if (!targetConstructibleItem) {
            this.target = null;
            // The target nor any of it's parents are production items. Skip update.
            return false;
        }
        if (!targetConstructibleItem.dataset.type || targetConstructibleItem.dataset.type === this.definition?.ConstructibleType) {
            return false;
        }
        const definition = GameInfo.Constructibles.lookup(targetConstructibleItem.dataset.type);
        if (!definition) {
            return false;
        }
        this.maintenance = Database.query('gameplay', 'select YieldType, Amount from Constructible_Maintenances where ConstructibleType = ?', definition.ConstructibleType)?.filter(maintenance => maintenance.Amount > 0) ?? null;
        this.target = targetConstructibleItem;
        this.definition = definition;
        return true;
    }
    update() {
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID) {
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            return;
        }
        const definition = this.definition;
        if (!definition) {
            return;
        }
        this.header.setAttribute('data-l10n-id', definition.Name);
        const isPurchase = this.target?.dataset.isPurchase === 'true';
        if (isPurchase) {
            this.productionCost.classList.add('hidden');
        }
        else {
            // FIX: Argument conversion failed: Wrong type - expected Boolean, got
            // Undefined while converting argument 3 for getConstructibleProductionCost
            // const productionCost = city.Production?.getConstructibleProductionCost(definition.ConstructibleType, FeatureTypes.NO_FEATURE, ResourceTypes.NO_RESOURCE);
            const productionCost = city.Production?.getConstructibleProductionCost(definition.ConstructibleType, FeatureTypes.NO_FEATURE, false);
            if (productionCost === undefined) {
                this.productionCost.classList.add('hidden');
            }
            else {
                this.productionCost.innerHTML = Locale.stylize('LOC_UI_PRODUCTION_COST', productionCost);
            }
        }
        const { baseYield, adjacencies, effects } = getConstructibleEffectStrings(definition.ConstructibleType, city);
        if (baseYield) {
            this.baseYield.innerHTML = Locale.stylize(baseYield);
        }
        else {
            this.baseYield.innerHTML = '';
        }
        this.constructibleBonusContainer.innerHTML = '';
        const bonuses = [...adjacencies, ...effects];
        for (let index = 0; index < bonuses.length; index++) {
            const bonusText = document.createElement('p');
            this.constructibleBonusContainer.appendChild(bonusText);
            bonusText.setAttribute('data-l10n-id', bonuses[index]);
        }
        // Update maintenance
        this.maintenanceEntriesContainer.innerHTML = '';
        if (this.maintenance && this.maintenance.length > 0) {
            for (const maintenance of this.maintenance) {
                const maintenanceEntry = document.createElement('div');
                maintenanceEntry.className = 'flex items-center ml-1';
                const icon = document.createElement('fxs-icon');
                icon.setAttribute('data-icon-id', maintenance.YieldType);
                icon.classList.add('size-5', 'mr-1');
                maintenanceEntry.appendChild(icon);
                const amount = document.createElement('div');
                amount.textContent = `-${maintenance.Amount}`;
                maintenanceEntry.appendChild(amount);
                const yieldName = GameInfo.Yields.lookup(maintenance.YieldType)?.Name ?? maintenance.YieldType;
                maintenanceEntry.ariaLabel = `${Locale.toNumber(maintenance.Amount)} ${Locale.compose(yieldName)}`;
                this.maintenanceEntriesContainer.appendChild(maintenanceEntry);
            }
            this.maintenanceContainer.classList.remove('hidden');
        }
        else {
            this.maintenanceContainer.classList.add('hidden');
        }
        if (this.definition?.Tooltip) {
            this.description.setAttribute('data-l10n-id', this.definition.Tooltip);
            this.description.classList.remove('hidden');
        }
        else {
            this.description.classList.add('hidden');
        }
        const recommendations = this.target?.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map(rec => rec.class);
            while (this.gemsContainer.hasChildNodes()) {
                this.gemsContainer.removeChild(this.gemsContainer.lastChild);
            }
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        this.gemsContainer.classList.toggle('hidden', !recommendations);
    }
    isBlank() {
        return !this.definition;
    }
}
TooltipManager.registerType('production-constructible-tooltip', new ProductionConstructibleTooltipType());
class ProductionUnitTooltipType {
    // #endregion
    constructor() {
        this.target = null;
        // #region Element References
        this.container = document.createElement('fxs-tooltip');
        this.description = document.createElement('p');
        this.header = document.createElement('div');
        this.productionCost = document.createElement('div');
        this.itemName = document.createElement('div');
        this.maintenanceContainer = document.createElement('div');
        this.maintenanceCostText = document.createElement('div');
        this.gemsContainer = document.createElement('div');
        this.container.className = 'flex flex-col w-96 font-body text-accent-2 text-sm';
        this.container.dataset.showBorder = 'false';
        this.header.className = 'font-title text-secondary text-center uppercase tracking-100';
        this.itemName.className = 'font-title uppercase';
        this.productionCost.className = 'mb-1';
        this.gemsContainer.className = 'mt-10';
        this.maintenanceContainer.className = 'flex items-center mt-0\\.5 p-2 production-chooser-tooltip__subtext-bg';
        const maintenanceLabel = document.createElement('div');
        maintenanceLabel.className = 'text-accent-2';
        maintenanceLabel.setAttribute('data-l10n-id', 'LOC_UI_PRODUCTION_MAINTENANCE');
        const goldIcon = document.createElement('fxs-icon');
        goldIcon.ariaLabel = Locale.compose("LOC_YIELD_GOLD");
        goldIcon.setAttribute('data-icon-id', 'YIELD_GOLD');
        goldIcon.classList.add('size-5', 'mr-1');
        this.maintenanceCostText.className = 'text-negative-light';
        this.maintenanceContainer.append(maintenanceLabel, goldIcon, this.maintenanceCostText);
        this.container.append(this.header, this.itemName, this.productionCost, this.description, this.gemsContainer, this.maintenanceContainer);
    }
    getHTML() {
        return this.container;
    }
    reset() {
    }
    isUpdateNeeded(target) {
        const targetUnitItem = target.closest('[data-tooltip-style="production-unit-tooltip"]');
        if (!targetUnitItem) {
            // The target nor any of it's parents are production items. Skip update.
            this.target = null;
            return false;
        }
        if (!targetUnitItem.dataset.type || targetUnitItem.dataset.type === this.definition?.UnitType) {
            return false;
        }
        const definition = GameInfo.Units.lookup(targetUnitItem.dataset.type);
        if (!definition) {
            return false;
        }
        this.target = targetUnitItem;
        this.definition = definition;
        return true;
    }
    update() {
        const cityID = UI.Player.getHeadSelectedCity();
        if (!cityID) {
            return;
        }
        const city = Cities.get(cityID);
        if (!city) {
            return;
        }
        const definition = this.definition;
        if (!definition) {
            return;
        }
        this.header.setAttribute('data-l10n-id', definition.Name);
        const isPurchase = this.target?.dataset.isPurchase === 'true';
        if (isPurchase) {
            this.productionCost.classList.add('hidden');
        }
        else {
            const productionCost = city.Production?.getUnitProductionCost(definition.UnitType);
            if (productionCost === undefined) {
                this.productionCost.classList.add('hidden');
            }
            else {
                this.productionCost.innerHTML = Locale.stylize('LOC_UI_PRODUCTION_COST', productionCost);
            }
        }
        if (this.definition?.Description) {
            this.description.setAttribute('data-l10n-id', this.definition.Description);
            this.description.classList.remove('hidden');
        }
        else {
            this.description.classList.add('hidden');
        }
        if (definition.Maintenance > 0) {
            this.maintenanceCostText.textContent = `-${definition.Maintenance}`;
            this.maintenanceContainer.classList.remove('hidden');
        }
        else {
            this.maintenanceContainer.classList.add('hidden');
        }
        const recommendations = this.target?.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map(rec => rec.class);
            while (this.gemsContainer.hasChildNodes()) {
                this.gemsContainer.removeChild(this.gemsContainer.lastChild);
            }
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        this.gemsContainer.classList.toggle('hidden', !recommendations);
    }
    isBlank() {
        return !this.definition;
    }
}
TooltipManager.registerType('production-unit-tooltip', new ProductionUnitTooltipType());
class ProductionProjectTooltipType {
    // #endregion
    constructor() {
        this.target = null;
        // #region Element References
        this.tooltip = document.createElement('fxs-tooltip');
        this.icon = document.createElement('fxs-icon');
        this.itemName = document.createElement('div');
        this.description = document.createElement('p');
        this.requirementsContainer = document.createElement('div');
        this.requirementsText = document.createElement('div');
        this.gemsContainer = document.createElement('div');
        this.tooltip.className = 'flex w-96 text-accent-2 font-body text-sm';
        const container = document.createElement('div');
        container.className = 'flex';
        const iconColumn = document.createElement('div');
        iconColumn.className = 'flex justify-center';
        this.icon.className = 'size-12 self-start';
        iconColumn.appendChild(this.icon);
        container.appendChild(iconColumn);
        const infoColumn = document.createElement('div');
        infoColumn.className = 'flex flex-col flex-auto';
        container.appendChild(infoColumn);
        const nameWrapper = document.createElement('div');
        nameWrapper.className = 'flex h-12 items-center';
        this.itemName.className = 'font-title text-secondary uppercase tracking-100';
        nameWrapper.appendChild(this.itemName);
        infoColumn.append(nameWrapper, this.description);
        this.requirementsContainer.className = 'flex mt-0\\.5 p-2 production-chooser-tooltip__subtext-bg';
        this.requirementsContainer.append(this.requirementsText);
        this.gemsContainer.className = 'mt-10';
        this.tooltip.append(container, this.requirementsContainer, this.gemsContainer);
    }
    getHTML() {
        return this.tooltip;
    }
    reset() { }
    isUpdateNeeded(target) {
        const newTarget = target.closest('town-focus-chooser-item, production-chooser-item');
        if (this.target === newTarget) {
            return false;
        }
        this.target = newTarget;
        if (!this.target) {
            return false;
        }
        return true;
    }
    getProjectType() {
        if (!this.target) {
            return null;
        }
        // for town-focus-chooser-item (already hashed)
        if (this.target.hasAttribute('data-project-type')) {
            return Number(this.target.dataset.projectType);
        }
        // for production-chooser-item (string name)
        if (this.target.hasAttribute('data-type')) {
            return Game.getHash(this.target.dataset.type);
        }
        return null;
    }
    getDescription() {
        if (!this.target)
            return null;
        if (IsElement(this.target, 'town-focus-chooser-item')) {
            return this.target.dataset.tooltipDescription ?? null;
        }
        return this.target.dataset.description ?? null;
    }
    update() {
        if (!this.target) {
            console.error('ProductionProjectTooltipType.update: update triggered with no valid target');
            return;
        }
        const name = this.target.dataset.name ?? '';
        const description = (this.target.dataset.tooltipDescription || this.target.dataset.description) ?? '';
        const growthType = Number(this.target.dataset.growthType);
        const projectType = this.getProjectType();
        this.itemName.setAttribute('data-l10n-id', name);
        this.description.setAttribute('data-l10n-id', description);
        const iconBlp = GetTownFocusBlp(growthType, projectType);
        this.icon.style.backgroundImage = `url(${iconBlp})`;
        const requirementsText = this.getRequirementsText();
        if (requirementsText) {
            this.requirementsText.innerHTML = requirementsText;
            this.requirementsContainer.classList.remove('hidden');
        }
        else {
            this.requirementsContainer.classList.add('hidden');
        }
        const recommendations = this.target?.dataset.recommendations;
        if (recommendations) {
            const parsedRecommendations = JSON.parse(recommendations);
            const advisorList = parsedRecommendations.map(rec => rec.class);
            const recommendationTooltipContent = AdvisorUtilities.createAdvisorRecommendationTooltip(advisorList);
            this.gemsContainer.appendChild(recommendationTooltipContent);
        }
        this.gemsContainer.classList.toggle('hidden', !recommendations);
    }
    getRequirementsText() {
        const projectType = Number(this.target?.dataset.projectType);
        const project = GameInfo.Projects.lookup(projectType);
        if (!project) {
            return undefined;
        }
        if (project.PrereqPopulation)
            return Locale.compose('LOC_UI_PRODUCTION_REQUIRES_POPULATION', project.PrereqPopulation);
        if (project.PrereqConstructible)
            return Locale.compose('LOC_UI_PRODUCTION_REQUIRES_BUILDING', Locale.compose(project.PrereqConstructible));
        return undefined;
    }
    isBlank() {
        return !this.target;
    }
}
TooltipManager.registerType('production-project-tooltip', new ProductionProjectTooltipType());
//# sourceMappingURL=file:///base-standard/ui/production-chooser/panel-production-tooltips.js.map
