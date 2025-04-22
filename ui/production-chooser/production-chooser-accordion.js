var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _ProductionChooserAccordionSection_isOpen_accessor_storage;
export class ProductionChooserAccordionSection {
    get isOpen() { return __classPrivateFieldGet(this, _ProductionChooserAccordionSection_isOpen_accessor_storage, "f"); }
    set isOpen(value) { __classPrivateFieldSet(this, _ProductionChooserAccordionSection_isOpen_accessor_storage, value, "f"); }
    constructor(id, title, isOpen) {
        this.id = id;
        this.title = title;
        _ProductionChooserAccordionSection_isOpen_accessor_storage.set(this, void 0);
        this.root = document.createElement('div');
        this.root.id = id;
        this.root.classList.add('production-category', 'mb-2');
        this.header = document.createElement('fxs-activatable');
        this.header.classList.value = 'relative flex items-center group h-10 mb-2 hud_sidepanel_list-bg cursor-pointer';
        this.header.setAttribute('tabindex', '-1');
        this.sectionHeaderFocus = document.createElement('div');
        this.sectionHeaderFocus.classList.value = 'absolute inset-0 img-list-focus-frame opacity-0 group-hover\\:opacity-100 group-focus\\:opacity-100 transition-opacity';
        this.header.appendChild(this.sectionHeaderFocus);
        const sectionTitleWrapper = document.createElement('div');
        sectionTitleWrapper.classList.value = 'relative flex-auto flex items-center justify-center';
        const sectionTitle = document.createElement('div');
        sectionTitle.classList.value = 'text-xs text-accent-2 tracking-100';
        sectionTitle.setAttribute('data-l10n-id', title);
        sectionTitleWrapper.appendChild(sectionTitle);
        this.header.appendChild(sectionTitleWrapper);
        this.arrowIcon = document.createElement('div');
        this.arrowIcon.classList.value = 'w-12 h-8 img-arrow bg-center bg-no-repeat bg-contain transition-transform';
        this.header.appendChild(this.arrowIcon);
        this.root.appendChild(this.header);
        this.slot = document.createElement('div');
        this.slot.classList.add('flex', 'flex-col', 'pl-3', 'shrink-0');
        this.slotWrapper = document.createElement('div');
        this.slotWrapper.classList.add('flex', 'flex-col', 'overflow-hidden', 'transition-height', 'ease-out');
        this.slotWrapper.append(this.slot);
        this.root.appendChild(this.slotWrapper);
        this.resizeObserver = new ResizeObserver((_entries) => {
            this.updateHeight(this.slot.clientHeight);
        });
        this.header.addEventListener('action-activate', () => this.toggle());
        this.isOpen = isOpen;
        this.toggle(isOpen);
    }
    observe() {
        this.resizeObserver.observe(this.slot, { box: 'border-box' });
    }
    disconnect() {
        this.resizeObserver.unobserve(this.slot);
    }
    updateHeight(height) {
        const currentHeight = this.slotWrapper.clientHeight;
        const heightDiffAbs = Math.abs(height - currentHeight);
        // If we have never set the height, we don't want to animate the first time
        const shouldAnimate = this.slotWrapper.attributeStyleMap.has('height');
        if (shouldAnimate) {
            const transitionDurationSeconds = Math.max(.150, Math.min(1, heightDiffAbs / (2 * screen.height)));
            this.slotWrapper.attributeStyleMap.set('transition-duration', CSS.s(transitionDurationSeconds));
        }
        else {
            this.slotWrapper.attributeStyleMap.delete('transition-duration');
        }
        this.slotWrapper.attributeStyleMap.set('height', CSS.px(height));
    }
    toggle(force = undefined) {
        const shouldOpen = force ?? !this.isOpen;
        if (shouldOpen) {
            this.open();
            this.header.setAttribute('data-audio-activate-ref', 'data-audio-dropdown-close');
        }
        else {
            this.close();
            this.header.setAttribute('data-audio-activate-ref', 'data-audio-dropdown-open');
        }
    }
    open() {
        this.arrowIcon.classList.add('-rotate-90');
        this.isOpen = true;
        this.slot.classList.remove('disabled');
        // we toggle tabindex because the slot can be disable-focus-allowed true
        const selectableChildren = this.slot.querySelectorAll(".production-chooser-item");
        for (const child of selectableChildren) {
            child.setAttribute("tabindex", "-1");
        }
        this.observe();
    }
    close() {
        this.arrowIcon.classList.remove('-rotate-90');
        this.isOpen = false;
        // we toggle tabindex because the slot can be disable-focus-allowed true
        const selectableChildren = this.slot.querySelectorAll(".production-chooser-item");
        for (const child of selectableChildren) {
            child.removeAttribute("tabindex");
        }
        this.updateHeight(0);
        this.disconnect();
    }
}
_ProductionChooserAccordionSection_isOpen_accessor_storage = new WeakMap();
//# sourceMappingURL=file:///base-standard/ui/production-chooser/production-chooser-accordion.js.map
