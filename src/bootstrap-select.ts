// Import our custom CSS
import '../sass/bootstrap-select.scss';

// Import all of Bootstrap's JS
import { Dropdown } from 'bootstrap';
import { escapeMap, keyCodes, EVENT_KEY, classNames, Selector, elementTemplates } from './constants';
import { sanitizeHtml, createElementFromHTML, toKebabCase, mergeDeep, toInteger } from './utils';
import { DEFAULTS } from './defaults';
import type { BootstrapSelectOptions } from './types/options';

export class Selectpicker {
  public $select: HTMLSelectElement = document.createElement('select');
  public options: BootstrapSelectOptions = DEFAULTS;
  constructor($element: HTMLSelectElement, options: BootstrapSelectOptions) {
    this.$select = $element;
    this.options = mergeDeep(this.options, options);

    this.init();
  }

  init() {
    // this.dropdown = new Dropdown(this.$button[0]);
        // if (this.dropdown && this.dropdown._popper) this.dropdown._popper.update();
  }

  createDropdown() {
    const $dropdown = '';
    return createElementFromHTML($dropdown);
  }

  isVirtual() {
    return (typeof this.options.virtualScroll === 'number' && this.$select.options.length >= this.options.virtualScroll) || this.options.virtualScroll === true;
  }

  render() {
    let that = this,
      element = this.$element,
      // ensure titleOption is appended and selected (if necessary) before getting selectedOptions
      placeholderSelected = this.setPlaceholder() && element.selectedIndex === 0,
      selectedOptions = this.getSelectedOptions.call(this),
      selectedCount = selectedOptions.length,
      selectedValues = this.getSelectValues.call(this, selectedOptions),
      button = this.$button,
      buttonInner = button.querySelector('.filter-option-inner-inner'),
      multipleSeparator = document.createTextNode(this.options.multipleSeparator),
      titleFragment = elementTemplates.fragment.cloneNode(false),
      showCount,
      countMax,
      hasContent = false;

    function createSelected(item) {
      if (item.selected) {
        that.createOption(item, true);
      } else if (item.children && item.children.length) {
        item.children.map(createSelected);
      }
    }

    // create selected option elements to ensure select value is correct
    if (this.options.source.data && init) {
      selectedOptions.map(createSelected);
      element.appendChild(this.selectpicker.main.optionQueue);

      if (placeholderSelected) placeholderSelected = element.selectedIndex === 0;
    }

    button.classList.toggle('bs-placeholder', that.multiple ? !selectedCount : !selectedValues && selectedValues !== 0);

    if (!that.multiple && selectedOptions.length === 1) {
      that.selectpicker.view.displayedValue = selectedValues;
    }

    if (this.options.selectedTextFormat === 'static') {
      titleFragment = generateOption.text.call(this, { text: this.options.placeholder }, true);
    } else {
      showCount = this.multiple !== null && this.options.selectedTextFormat.indexOf('count') !== -1 && selectedCount > 0;

      // determine if the number of selected options will be shown (showCount === true)
      if (showCount) {
        countMax = this.options.selectedTextFormat.split('>');
        showCount = (countMax.length > 1 && selectedCount > countMax[1]) || (countMax.length === 1 && selectedCount >= 2);
      }

      // only loop through all selected options if the count won't be shown
      if (showCount === false) {
        if (!placeholderSelected) {
          for (let selectedIndex = 0; selectedIndex < selectedCount; selectedIndex++) {
            if (selectedIndex < 50) {
              let option = selectedOptions[selectedIndex],
                titleOptions = {};

              if (option) {
                if (this.multiple && selectedIndex > 0) {
                  titleFragment.appendChild(multipleSeparator.cloneNode(false));
                }

                if (option.title) {
                  titleOptions.text = option.title;
                } else if (option.content && that.options.showContent) {
                  titleOptions.content = option.content.toString();
                  hasContent = true;
                } else {
                  if (that.options.showIcon) {
                    titleOptions.icon = option.icon;
                  }
                  if (that.options.showSubtext && !that.multiple && option.subtext) titleOptions.subtext = ' ' + option.subtext;
                  titleOptions.text = option.text.trim();
                }

                titleFragment.appendChild(generateOption.text.call(this, titleOptions, true));
              }
            } else {
              break;
            }
          }

          // add ellipsis
          if (selectedCount > 49) {
            titleFragment.appendChild(document.createTextNode('...'));
          }
        }
      } else {
        let optionSelector = ':not([hidden]):not([data-hidden="true"]):not([data-divider="true"]):not([style*="display: none"])';
        if (this.options.hideDisabled) optionSelector += ':not(:disabled)';

        // If this is a multiselect, and selectedTextFormat is count, then show 1 of 2 selected, etc.
        let totalCount = this.$element.querySelectorAll('select > option' + optionSelector + ', optgroup' + optionSelector + ' option' + optionSelector).length,
          tr8nText =
            typeof this.options.countSelectedText === 'function' ? this.options.countSelectedText(selectedCount, totalCount) : this.options.countSelectedText;

        titleFragment = generateOption.text.call(
          this,
          {
            text: tr8nText.replace('{0}', selectedCount.toString()).replace('{1}', totalCount.toString())
          },
          true
        );
      }
    }

    // If the select doesn't have a title, then use the default, or if nothing is set at all, use noneSelectedText
    if (!titleFragment.childNodes.length) {
      titleFragment = generateOption.text.call(
        this,
        {
          text: this.options.placeholder ? this.options.placeholder : this.options.noneSelectedText
        },
        true
      );
    }

    // if the select has a title, apply it to the button, and if not, apply titleFragment text
    // strip all HTML tags and trim the result, then unescape any escaped tags
    button.title = titleFragment.textContent.replace(/<[^>]*>?/g, '').trim();

    if (this.options.sanitize && hasContent) {
      sanitizeHtml([titleFragment], that.options.whiteList, that.options.sanitizeFn);
    }

    buttonInner.innerHTML = '';
    buttonInner.appendChild(titleFragment);

    if (version.major < 4 && this.$newElement.classList.contains('bs3-has-addon')) {
      let filterExpand = button.querySelector('.filter-expand'),
        clone = buttonInner.cloneNode(true);

      clone.className = 'filter-expand';

      if (filterExpand) {
        button.replaceChild(clone, filterExpand);
      } else {
        button.appendChild(clone);
      }
    }

    this.$element.dispatchEvent(new CustomEvent('rendered' + EVENT_KEY));
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
