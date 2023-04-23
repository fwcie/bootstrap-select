// Import our custom CSS
import '../sass/bootstrap-select.scss';

// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap';
import { addGroup, addOption, createElementFromString, mergeDeep, readDataAttr } from './utils/utils';
import { DefaultOptions } from './utils/options';
import type { BootstrapSelectOptions } from './types/options';

export class BootstrapSelect extends bootstrap.Dropdown {
  // HTML Element
  public $select: HTMLSelectElement = document.createElement('select');
  public $btnDropdown: HTMLButtonElement = document.createElement('button');
  public $dropdown: HTMLDivElement = document.createElement('div');
  public $dropdownMenu: HTMLUListElement = document.createElement('ul');

  public options: BootstrapSelectOptions = DefaultOptions;
  public optionsMap: Array<Object> = [];
  public id: string = '';

  constructor($element: HTMLSelectElement, options: BootstrapSelectOptions = DefaultOptions) {
    super($element);
    // Get data option and merge into options object
    const dataOptions = readDataAttr($element);
    options = mergeDeep<BootstrapSelectOptions>(options, dataOptions);
    
    this.$select = $element;
    this.options = mergeDeep(this.options, options);
    this.id = this.$select.getAttribute('id') || 'bs-select-' + Date.now();
    
    this.init();
  }

  init() {
    let key: keyof typeof this.options.template;

    // Bind this to all template method
    for (key in this.options.template) {
      this.options.template[key] = this.options.template[key].bind(this)
    }

    this._createDropdown();
    this.render();
  }

  /**
   * Create html dropdown
   */
  private _createDropdown() {
    this.$dropdown = createElementFromString<HTMLDivElement>(this.options.template.dropdown());
    this.$btnDropdown = createElementFromString<HTMLButtonElement>(this.options.template.dropdownButton(this.$select));
    this.$dropdownMenu = createElementFromString<HTMLUListElement>(this.options.template.dropdownMenu());

    this.$dropdown.appendChild(this.$btnDropdown);
    this.$dropdown.appendChild(this.$dropdownMenu);

    if (this.$select.children.length > 0) {
      for (let i in this.$select.children) {
        const child = this.$select.children[i];
        const prevChild = this.$select.children[i - 1];
        if (child instanceof HTMLOptionElement) {
          // addOption(child);
          const $opt = createElementFromString<HTMLOptionElement>(this.options.template.option(child));

          if (child.selected) $opt.setAttribute('selected', 'true');
          this.$dropdownMenu.append($opt);
        } else if (child instanceof HTMLOptGroupElement) {
          // addGroup(child);
          if (child.children.length > 0) {
            if (prevChild) {
              const $divider = createElementFromString<HTMLHRElement>(this.options.template.divider());
              this.$dropdownMenu.append($divider);
            }
            const $optGroup = createElementFromString<HTMLOptGroupElement>(this.options.template.optgroup(child));
            this.$dropdownMenu.append($optGroup);
            for (let i in child.children) {
              const opt = child.children[i];
              if (opt instanceof HTMLOptionElement) {
                const $options = createElementFromString<HTMLOptionElement>(this.options.template.option(opt));
                this.$dropdownMenu.append($options);
              }
            }
          }
        }
      }
    }
  }

  isVirtual() {
    return (typeof this.options.virtualScroll === 'number' && this.$select.options.length >= this.options.virtualScroll);
  }

  /**
   * Render the dropdown into DOM
   */
  render() {
    this.$select.after(this.$dropdown);
    this.$select.style.display = 'none';
  }

  setStyle() {}

  selectAll() {}

  deselectAll() {}

  toggle(e?: Event, state: boolean = false) {
    console.log(state);
  }

  open(e?: Event) {
    this.toggle(e, true);
  }

  close(e?: Event) {
    this.toggle(e, false);
  }

  mobile() {}

  refresh() {}

  hide() {}

  show() {}

  destroy() {}
}

document.addEventListener('DOMContentLoaded', function () {
  const $elements = document.querySelectorAll('[data-bsl]') as NodeListOf<HTMLSelectElement>;

  if ($elements) {
    $elements.forEach(function ($el) {
      const BS_S = new BootstrapSelect($el);
      $el["bs-select"] = BS_S;
    })
  }
});