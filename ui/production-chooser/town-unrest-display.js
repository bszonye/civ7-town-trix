/**
 * @file town-unrest.ts
 * @copyright Firaxis Games, 2024
 * @description Section with a slider that shows how long until the town is no longer in unrest.
 */
// TODO: get this from gamecore, should be scaled by game speed
const MAX_TURNS_UNREST = Game.EconomicRules.adjustForGameSpeed(GameInfo.UnhappinessEffects.lookup('StandardCityTransferUnrest')?.Amount ?? 10);
//GameInfo.UnhappinessEffects.lookup('StandardCityTransferUnrest')?.Amount ?? 10;
export class TownUnrestDisplay extends Component {
    constructor() {
        super(...arguments);
        // #endregion
        // #region Element References
        this.sliderFillElement = document.createElement('div');
        this.remainingTurnsElement = document.createElement('div');
    }
    // #region Component State
    set turnsOfUnrest(value) {
        if (value > MAX_TURNS_UNREST) {
            console.error(`TownUnrestDisplay: turnsOfUnrest value ${value} exceeds MAX_TURNS_UNREST ${MAX_TURNS_UNREST}`);
        }
        const pct = Math.max(0, Math.min(1, value / MAX_TURNS_UNREST));
        this.sliderFillElement.style.transform = `scaleX(${pct})`;
        const turnsRemaining = Math.max(0, MAX_TURNS_UNREST - value);
        this.remainingTurnsElement.textContent = Locale.compose('LOC_UI_PRODUCTION_UNREST_TURNS_REMAINING', turnsRemaining);
    }
    // #endregion
    onInitialize() {
        super.onInitialize();
        this.render();
    }
    onAttributeChanged(name, _oldValue, newValue) {
        switch (name) {
            case 'data-turns-of-unrest':
                this.turnsOfUnrest = newValue ? parseInt(newValue) : 0;
                break;
            default:
                break;
        }
    }
    render() {
        this.Root.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'px-2');
        this.Root.innerHTML = `
			<div class="text-lg font-title uppercase text-negative-light" data-l10n-id="LOC_UI_PRODUCTION_UNREST"></div>
		`;
        const slider = document.createElement('div');
        slider.classList.add('w-full', 'h-1\\.5', 'my-2', 'town-unrest-bg');
        this.sliderFillElement.classList.add('size-full', 'origin-left', 'town-unrest-fill', 'transition-transform');
        slider.appendChild(this.sliderFillElement);
        this.Root.appendChild(slider);
        this.Root.appendChild(this.remainingTurnsElement);
    }
}
Controls.define('town-unrest-display', {
    createInstance: TownUnrestDisplay,
    attributes: [
        { name: 'data-turns-of-unrest' }
    ]
});

//# sourceMappingURL=file:///base-standard/ui/production-chooser/town-unrest-display.js.map
