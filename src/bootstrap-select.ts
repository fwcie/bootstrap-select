// Import our custom CSS
import '../sass/bootstrap-select.scss';

// Import all of Bootstrap's JS
import { Dropdown } from 'bootstrap';
import { EVENT_KEY, classNames, Selector } from './utils/constants';
import { createElementFromHTML, toKebabCase, mergeDeep, toInteger, readData } from './utils/utils';
import { DefaultOptions } from './utils/options';
import type { BootstrapSelectOptions } from './types/options';

export class BootstrapSelect extends Dropdown {
  // HTML Element
  public $select: HTMLSelectElement = document.createElement('select');
  public $btnDropdown: HTMLButtonElement = document.createElement('button');
  public $dropdown: HTMLUListElement = document.createElement('ul');

  public options: BootstrapSelectOptions = DefaultOptions;

  constructor($element: HTMLSelectElement, options: BootstrapSelectOptions = DefaultOptions) {
    super($element);

    // Get data option and merge into options object
    const dataOptions = readData($element);
    options = mergeDeep<BootstrapSelectOptions>(options, dataOptions);

    this.$select = $element;
    this.options = mergeDeep(this.options, options);
    this.init();
  }

  init() {
    // this.$select.style.display = 'none';


    this.$btnDropdown = createElementFromHTML<HTMLButtonElement>(this.options.template.dropdownButton());
    this.$dropdown = createElementFromHTML<HTMLUListElement>(this.options.template.dropdownEl());
  }

  createDropdown() {
    const $dropdown = '';
    return createElementFromHTML($dropdown);
  }

  isVirtual() {
    return (typeof this.options.virtualScroll === 'number' && this.$select.options.length >= this.options.virtualScroll);
  }

  render() {}

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