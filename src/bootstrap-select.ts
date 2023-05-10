import { addClass, createElementFromString, mergeDeep, readDataAttr, removeClass, toInteger, getTextContent } from "./utils/utils";
import { DefaultOptions } from "./utils/options";
import type { BootstrapSelectOptions } from "./types/options";
import { EVENT_KEY, classNames } from "./utils/constants";

export class BootstrapSelect {
    // HTML Element
    public $select: HTMLSelectElement = document.createElement("select");
    public $btnDropdown: HTMLButtonElement = document.createElement("button");
    public $header: HTMLLIElement = document.createElement("li");
    public $searchInput: HTMLLIElement = document.createElement("li");
    public $dropdownMenu: HTMLUListElement = document.createElement("ul");

    public options: BootstrapSelectOptions = DefaultOptions;
    public optionsMap: Array<object> = [];
    public id = "";
    public values: Array<string> = [];

    constructor($element: HTMLSelectElement, options: Partial<BootstrapSelectOptions> = DefaultOptions) {
        // Get data option and merge into options object
        const dataOptions = readDataAttr($element);
        options = mergeDeep<Partial<BootstrapSelectOptions>>(options, dataOptions);

        this.$select = $element;
        this.options = mergeDeep(this.options, options) as BootstrapSelectOptions; 
        this.id = this.$select.getAttribute("id") || "bs-select-" + Date.now();

        this.init();
    }

    init() {
        // Bind this to all template method
        this.options.template.divider = this.options.template.divider.bind(this);
        this.options.template.dropdownButton = this.options.template.dropdownButton.bind(this);
        this.options.template.dropdownMenu = this.options.template.dropdownMenu.bind(this);
        this.options.template.header = this.options.template.header.bind(this);
        this.options.template.optgroup = this.options.template.optgroup.bind(this);
        this.options.template.option = this.options.template.option.bind(this);

        this._createDropdown();
        this.render();
        this._initHandler();
        this._trigger(`initialized${EVENT_KEY}`);
    }

    /**
     * Create html dropdown
     */
    private _createDropdown() {
        this.$btnDropdown = createElementFromString<HTMLButtonElement>(this.options.template.dropdownButton(this.$select));
        this.$dropdownMenu = createElementFromString<HTMLUListElement>(this.options.template.dropdownMenu());
        
        let textContent = getTextContent(this.$select, this);
        if (textContent === this.options.noneSelectedText || textContent === this.options.noneValue) {
            addClass("text-muted", this.$btnDropdown);
        }

        if (textContent === this.options.noneValue && this.options.title !== "") {
            textContent = this.options.title;
        }

        this.$btnDropdown.innerHTML = `<span class="position-static float-start h-100 w-100 text-start overflow-hidden">${textContent}</span>`;

        if (this.$select.children.length > 0) {
            const stickyTop = createElementFromString<HTMLDivElement>(this.options.template.stickyTop());

            if (this.options.header) {
                this.$header = createElementFromString<HTMLLIElement>(this.options.template.header());
                this.$dropdownMenu.classList.add("pt-0");
                stickyTop.append(this.$header);
            }

            if (this.options.search) {
                this.$searchInput = createElementFromString<HTMLLIElement>(this.options.template.serchInput());
                stickyTop.append(this.$searchInput);
            }

            if (this.options.header || this.options.search) {
                this.$dropdownMenu.append(stickyTop);
            }

            let countGroup = 1;

            for (const i in this.$select.children) {
                const child = this.$select.children[i];
                const prevChild = this.$select.children[toInteger(i) - 1];

                if (child instanceof HTMLOptionElement) {
                    // addOption(child);
                    if (!child.value && child.value === "") continue;
                    const $opt = createElementFromString<HTMLLIElement>(this.options.template.option(child, this.$select.multiple));

                    if (child.selected) this._setSelected($opt.querySelector("a") as HTMLAnchorElement);
                    if (child.selected) $opt.setAttribute("selected", "true");
                    this.$dropdownMenu.append($opt);
                } else if (child instanceof HTMLOptGroupElement) {
                    // addGroup(child);
                    if (child.children.length > 0) {
                        const groupClass = `optgroup-${countGroup}`;

                        if (prevChild) {
                            const $divider = createElementFromString<HTMLHRElement>(this.options.template.divider());
                            this.$dropdownMenu.append($divider);
                        }
                        const $optGroup = createElementFromString<HTMLOptGroupElement>(this.options.template.optgroup(child));

                        $optGroup.classList.add(groupClass);
                        this.$dropdownMenu.append($optGroup);
                        for (const i in child.children) {
                            const opt = child.children[i];
                            if (opt instanceof HTMLOptionElement) {
                                if (!opt.value && opt.value === "") continue;
                                const $opt = createElementFromString<HTMLLIElement>(this.options.template.option(opt, this.$select.multiple));
                                if (opt.selected) this._setSelected($opt.querySelector("a") as HTMLAnchorElement);
                                $opt.classList.add(groupClass);
                                this.$dropdownMenu.append($opt);
                            }
                        }
                        countGroup++;
                    }
                }
            }
        }
    }

    private _initHandler() {
        this.$dropdownMenu.querySelectorAll(`.${classNames.OPTION}`).forEach($item => {
            $item.addEventListener("click", this._onClickOption.bind(this));
        });

        if (this.options.search) {
            this.$btnDropdown.addEventListener("shown.bs.dropdown", () => {
                this.$searchInput.querySelector("input")?.focus();
            });

            this.$searchInput.querySelector("input")?.addEventListener("keyup", this.search.bind(this));
            this.$searchInput.querySelector("input")?.addEventListener("search", this.search.bind(this));
        }


        // Refresh dropdown when native select input has change
        if (MutationObserver) {
            const mutationObserver = new MutationObserver(this.refresh.bind(this));

            mutationObserver.observe(this.$select, { childList: true });
        }

        if (this.options.header) {
            this.$header.querySelector(".btn-close")?.addEventListener("click", this.close.bind(this));
        }
    }

    private _onClickOption(ev: Event) {
        const $opt = ev.target as HTMLAnchorElement;

        if (!$opt) return;

        this._manageOptionState($opt);
        this._changed();
    }

    private _changed() {
        this._updateNative();
        this._updateBtnText();
        this._triggerNative("change");
    }

    private _triggerNative(evName: string) {
        this.$select.dispatchEvent(new Event(evName));
    }

    private _trigger(evName: string) {
        this.$btnDropdown.dispatchEvent(new CustomEvent(evName, { detail: this }));
    }

    private _updateNative() {
        this.$select.value = this.values[this.values.length - 1];

        for (let i = 0; i < this.$select.options.length; i++) {
            const $opt = this.$select.options.item(i);

            if ($opt) {
                if ($opt.value && this.values.includes($opt.value)) {
                    $opt.selected = true;
                } else {
                    $opt.selected = false;
                }
            }
        }
    }

    private _removeValue(value: string) {
        if (this.values.indexOf(value) !== -1) {
            this.values.splice(this.values.indexOf(value), 1);
        }
    }

    private _addValue(value: string) {
        if (this.values.indexOf(value) === -1) {
            this.values.push(value);
        }
    }

    private _manageOptionState($opt: HTMLAnchorElement) {
        if (this.$select.multiple) {
            if ($opt.getAttribute("aria-current") === "true") {
                this._unsetSelected($opt);
            } else {
                this._setSelected($opt);
            }
        } else {
            // option already selected, do nothing
            if ($opt.classList.contains("active")) {
                return;
            } else {
                // Clear last selected item
                const $active = this.$dropdownMenu.querySelector(".active") as HTMLAnchorElement;

                if ($active) {
                    $active.classList.remove("active");
                    $active.removeAttribute("aria-current");
                    this._removeValue($active.dataset.bssValue as string);
                }

                this._setSelected($opt, true);
            }
        }
    }

    private _setSelected($opt: HTMLAnchorElement, single = false) {
        $opt.setAttribute("aria-current", "true");
        // $opt.classList.add('active');
        $opt.querySelector(".check-mark")?.classList.remove("opacity-0");
        this._addValue($opt.dataset.bssValue as string);

        if (single) $opt.classList.add("active");
    }

    private _unsetSelected($opt: HTMLAnchorElement, single = false) {
        $opt.removeAttribute("aria-current");
        $opt.blur();
        $opt.querySelector(".check-mark")?.classList.add("opacity-0");
        this._removeValue($opt.dataset.bssValue as string);

        if (single) $opt.classList.remove("active");
    }

    private _updateBtnText() {
        // TODO : multipe -> retirer/ajouter uniquement l'item voulu
        // Simple : remplacer car peu couteu en perf
        let textContent = getTextContent(this.$select, this);

        if (textContent === this.options.noneSelectedText || textContent === this.options.title) {
            addClass("text-muted", this.$btnDropdown);
        } else {
            removeClass("text-muted", this.$btnDropdown);
        }

        if (textContent === this.options.noneValue && this.options.title !== "") {
            textContent = this.options.title;
        }

        this.$btnDropdown.innerHTML = `<span class="position-static float-start h-100 w-100 text-start overflow-hidden">${textContent}</span>`;
    }

    private _setupStyle() {
        // TODO : gérer le cas ou le dropdown est dans le bas de la page 
        // Donc top plutot que bottom ? if bottom <= window.innerHeigt / 2 ?
        const { bottom } = this.$btnDropdown.getBoundingClientRect();
        this.$dropdownMenu.style.maxHeight = window.innerHeight - bottom + "px";
        this.$dropdownMenu.style.minWidth = this.$btnDropdown.getBoundingClientRect().width + "px";
    }

    /**
     * Render the dropdown into DOM
     */
    render() {
        this._trigger(`render${EVENT_KEY}`);
        this.$select.after(this.$btnDropdown);
        this.$btnDropdown.after(this.$dropdownMenu);
        this.$select.classList.add("d-none");
        this.$select["bs-select"] = this;
        this._setupStyle();
        this._trigger(`rendered${EVENT_KEY}`);
    }

    /**
     * Refresh the dropdown list
     * @param {MutationRecord} mutationsList
     */
    refresh(mutationsList?: MutationRecord[]) {
        console.log("refresh dropdown", mutationsList);
        this._trigger(`refreshed${EVENT_KEY}`);
    }

    search(event: KeyboardEvent | Event) {
        const $input = event.target as HTMLInputElement;
        const filter = $input.value || "";
        const li = this.$dropdownMenu.getElementsByTagName("li");

        // Loop through all list items, and hide those who don't match the search query
        let nbResult = 0;
        for (let i = 0; i < li.length; i++) {
            const a = li[i].getElementsByTagName("a")[0];

            // Not a, so it's "optgroup"
            if (!a) continue;

            const txtValue = a.firstChild?.textContent?.trim() || a.textContent?.trim() || a.innerText.trim();
            if (txtValue.indexOf(filter) > -1) {
                li[i].classList.remove("d-none");
                nbResult++;
            } else {
                li[i].classList.add("d-none");
                if (nbResult > 0) nbResult--;
            }
        }

        console.log(nbResult);
    }

    close() {
        if (!this.$btnDropdown.classList.contains("show")) return;

        this.$btnDropdown.dispatchEvent(new Event("click"));
    }

    open() {
        if (this.$btnDropdown.classList.contains("show")) return;

        this.$btnDropdown.dispatchEvent(new Event("click"));
    }

    destroy() {
        this._trigger(`destroy${EVENT_KEY}`);
        this.$btnDropdown.remove();
        this.$dropdownMenu.remove();
        delete this.$select["bs-select"];
        this.$select.classList.remove("d-none");
        this._trigger(`destroyed${EVENT_KEY}`);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const $elements = document.querySelectorAll("[data-bss]") as NodeListOf<HTMLSelectElement>;

    if ($elements) {
        $elements.forEach(function ($el, i) {
            const opt = i === 4 ? { search: true} : undefined;
            new BootstrapSelect($el, opt);
        });
    }
});
