/**
 * town-focus-section.ts
 * @copyright 2024, Firaxis Gmaes
 * @description The sectin foo 4
 */
import { GetTownFocusBlp } from '/base-standard/ui/production-chooser/production-chooser-helpers.js';
import { FxsChooserItem } from '/core/ui/components/fxs-chooser-item.js';
import { FxsVSlot } from '/core/ui/components/fxs-slot.js';
export class TownFocusChooserItem extends FxsChooserItem {
    constructor() {
        super(...arguments);
        // #region Element References
        this.nameElement = document.createElement('div');
        this.descriptionElement = document.createElement('div');
        this.projectIconElement = document.createElement('div');
    }
    // #endregion
    onInitialize() {
        super.onInitialize();
        this.render();
        this.selectOnActivate = true;
    }
    updateIcon() {
        const projectTypeAttr = this.Root.getAttribute('data-project-type');
        const growthTypeAttr = this.Root.getAttribute('data-growth-type');
        const projectType = projectTypeAttr ? parseInt(projectTypeAttr) : null;
        const growthType = growthTypeAttr ? parseInt(growthTypeAttr) : null;
        const iconBlp = GetTownFocusBlp(growthType, projectType);
        this.projectIconElement.style.backgroundImage = `url(${iconBlp})`;
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-project-type':
            case 'data-growth-type':
                this.updateIcon();
                break;
            case 'data-name':
                if (newValue) {
                    this.nameElement.setAttribute('data-l10n-id', newValue);
                }
                break;
            case 'data-description':
                if (newValue) {
                    this.descriptionElement.setAttribute('data-l10n-id', newValue);
                }
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
    render() {
        this.Root.dataset.tooltipStyle = 'production-project-tooltip';
        this.container.classList.add('flex', 'flex-row', 'p-3', 'flex-auto');
        this.projectIconElement.classList.add('size-16', 'bg-contain', 'bg-center', 'bg-no-repeat', 'mr-2');
        this.container.appendChild(this.projectIconElement);
        const infoContainer = document.createElement('div');
        infoContainer.classList.add('flex', 'flex-col', 'flex-initial');
        this.nameElement.classList.add('mb-1', 'font-title', 'uppercase', 'text-xs', 'tracking-100');
        this.descriptionElement.classList.add('font-body', 'text-sm');
        infoContainer.append(this.nameElement, this.descriptionElement);
        this.container.appendChild(infoContainer);
    }
}
Controls.define("town-focus-chooser-item", {
    createInstance: TownFocusChooserItem,
    attributes: [
        { name: "disabled" },
        { name: "selected", description: "Is this chooser item selected? (Default: false)" },
        { name: "show-frame-on-hover", description: "Shows the selection frame on hover" },
        {
            name: "data-project-type",
        },
        {
            name: "data-growth-type",
        },
        {
            name: "data-name",
        },
        {
            name: "data-description",
        },
        {
            name: "selected"
        }
    ]
});
export class TownFocusSection extends FxsVSlot {
    constructor() {
        super(...arguments);
        // #region Element References
        this.townFocusItem = document.createElement('town-focus-chooser-item');
        this.defaultLabelElement = document.createElement('div');
    }
    // #endregion
    // #region Lifecycle
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttributeChanged(name, oldValue, newValue) {
        switch (name) {
            case 'data-disabled':
                if (newValue !== null) {
                    this.townFocusItem.setAttribute('disabled', newValue);
                }
                else {
                    this.townFocusItem.removeAttribute('disabled');
                }
                break;
            case 'data-growth-type':
            case 'data-project-type':
            case 'data-name':
            case 'data-description':
            case 'data-tooltip-name':
            case 'data-tooltip-description':
                if (newValue) {
                    this.townFocusItem.setAttribute(name, newValue);
                }
                else {
                    this.townFocusItem.removeAttribute(name);
                }
                break;
            default:
                super.onAttributeChanged(name, oldValue, newValue);
                break;
        }
    }
    // #endregion
    render() {
        this.Root.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'px-14', 'py-2', 'production-chooser__town-focus-gradient');
        this.Root.insertAdjacentHTML('beforeend', '<div class="font-title uppercase text-xs text-secondary-2 text-gradient-secondary" data-l10n-id="LOC_UI_TOWN_FOCUS"></div>');
        this.townFocusItem.classList.add('flex-auto', 'mx-5', 'my-2');
        this.Root.appendChild(this.townFocusItem);
        this.defaultLabelElement.classList.value = 'font-body text-xs text-accent-2';
        this.defaultLabelElement.setAttribute('data-l10n-id', 'LOC_UI_TOWN_FOCUS_DEFAULT_LABEL');
        this.Root.appendChild(this.defaultLabelElement);
    }
}
Controls.define("town-focus-section", {
    createInstance: TownFocusSection,
    attributes: [
        {
            name: "data-type",
        },
        {
            name: "data-growth-type",
        },
        {
            name: "data-project-type",
        },
        {
            name: "data-disabled",
        },
        {
            name: "data-name",
        },
        {
            name: "data-description",
        },
        {
            name: "data-tooltip-name",
        },
        {
            name: "data-tooltip-description",
        },
        {
            name: "data-show-default-label"
        }
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/town-focus-section.js.map
