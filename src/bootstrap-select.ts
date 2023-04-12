// Import our custom CSS
import '../sass/bootstrap-select.scss';

// Import all of Bootstrap's JS
import { Dropdown } from 'bootstrap';
import { escapeMap, keyCodes, EVENT_KEY, classNames, Selector, elementTemplates } from './constants';
import { sanitizeHtml, createElementFromHTML, getAttributesObject, isEqual, toKebabCase, createEscaper, mergeDeep, toInteger } from './utils';
import { DEFAULTS } from './defaults';
import type { SelectpickerOptions } from './types/options';

let changedArguments: any = null;

let htmlEscape = createEscaper(escapeMap);

let version = {
  success: false,
  full: Dropdown.VERSION,
  major: toInteger(Dropdown.VERSION[0])
};

let selectId = 0;

elementTemplates.selectedOption.setAttribute('selected', 'true');
elementTemplates.noResults.className = 'no-results';
elementTemplates.a.setAttribute('role', 'option');
elementTemplates.a.className = 'dropdown-item';
elementTemplates.subtext.className = 'text-muted';
elementTemplates.text.className = 'text';

let REGEXP_ARROW = new RegExp(keyCodes.ARROW_UP + '|' + keyCodes.ARROW_DOWN);
let REGEXP_TAB_OR_ESCAPE = new RegExp('^' + keyCodes.TAB + '$|' + keyCodes.ESCAPE);

let generateOption = {
  li(content: string | Node, classes: string, optgroup: string) {
    const li = elementTemplates.li.cloneNode(false) as HTMLLIElement;

    if (content) {
      if (content instanceof Node && (content.nodeType === 1 || content.nodeType === 11)) {
        li.appendChild(content);
      } else if (typeof content === 'string') {
        li.innerHTML = content;
      }
    }

    if (typeof classes !== 'undefined' && classes !== '') li.className = classes;
    if (typeof optgroup !== 'undefined' && optgroup !== null) li.classList.add('optgroup-' + optgroup);

    return li;
  },

  a(text: string | Node, classes: string) {
    let a = elementTemplates.a.cloneNode(true) as HTMLAnchorElement;

    if (text) {
      if (text instanceof Node && text.nodeType === 11) {
        a.appendChild(text);
      } else if (typeof text === 'string') {
        a.insertAdjacentHTML('beforeend', text);
      }
    }

    if (typeof classes !== 'undefined' && classes !== '') a.classList.add.apply(a.classList, classes.split(/\s+/));

    return a;
  },

  text(options: { content?: string; text?: string; icon?: string }, useFragment: boolean) {
    let textElement = elementTemplates.text.cloneNode(false) as HTMLSpanElement,
      subtextElement,
      iconElement;

    if (options.content) {
      textElement.innerHTML = options.content;
    } else if (options.text) {
      textElement.textContent = options.text;

      if (options.icon) {
        let whitespace = elementTemplates.whitespace.cloneNode(false);

        // need to use <i> for icons in the button to prevent a breaking change
        // note: switch to span in next major release
        iconElement = (useFragment === true ? elementTemplates.i : elementTemplates.span).cloneNode(false) as HTMLElement;
        iconElement.className = this.options.iconBase + ' ' + options.icon;

        elementTemplates.fragment.appendChild(iconElement);
        elementTemplates.fragment.appendChild(whitespace);
      }

      if (options.subtext) {
        subtextElement = elementTemplates.subtext.cloneNode(false);
        subtextElement.textContent = options.subtext;
        textElement.appendChild(subtextElement);
      }
    }

    if (useFragment === true) {
      while (textElement.childNodes.length > 0) {
        elementTemplates.fragment.appendChild(textElement.childNodes[0]);
      }
    } else {
      elementTemplates.fragment.appendChild(textElement);
    }

    return elementTemplates.fragment;
  },

  label(options) {
    let textElement = elementTemplates.text.cloneNode(false),
      subtextElement,
      iconElement;

    textElement.innerHTML = options.display;

    if (options.icon) {
      let whitespace = elementTemplates.whitespace.cloneNode(false);

      iconElement = elementTemplates.span.cloneNode(false);
      iconElement.className = this.options.iconBase + ' ' + options.icon;

      elementTemplates.fragment.appendChild(iconElement);
      elementTemplates.fragment.appendChild(whitespace);
    }

    if (options.subtext) {
      subtextElement = elementTemplates.subtext.cloneNode(false);
      subtextElement.textContent = options.subtext;
      textElement.appendChild(subtextElement);
    }

    elementTemplates.fragment.appendChild(textElement);

    return elementTemplates.fragment;
  }
};

let getOptionData = {
  fromOption(option: HTMLOptionElement, type: string) {
    let value;

    switch (type) {
      case 'divider':
        value = option.getAttribute('data-divider') === 'true';
        break;

      case 'text':
        value = option.textContent;
        break;

      case 'label':
        value = option.label;
        break;

      case 'style':
        value = option.style.cssText;
        break;

      case 'title':
        value = option.title;
        break;

      default:
        value = option.getAttribute('data-' + toKebabCase(type));
        break;
    }

    return value;
  },
  fromDataSource(option: HTMLOptionElement, type: string) {
    let value;

    switch (type) {
      case 'text':
      case 'label':
        value = option.text || option.value || '';
        break;

      default:
        value = option[type as keyof HTMLOptionElement];
        break;
    }

    return value;
  }
};

class Selectpicker {
  public VERSION: string = '1.0.0';
  public DEFAULTS: SelectpickerOptions = DEFAULTS;
  public $element?: HTMLSelectElement | null = null;
  public $newElement?: HTMLElement | null = null;
  public $clearButton?: HTMLElement | null = null;
  public $button?: HTMLElement | null = null;
  public $menu?: HTMLElement | null = null;
  public $menuInner?: HTMLElement | null = null;
  public $searchbox?: HTMLElement | null = null;
  public options: SelectpickerOptions = DEFAULTS;
  public multiple: boolean = false;
  public autofocus: boolean = false;
  public selectpicker = {
    main: {
      data: [],
      optionQueue: elementTemplates.fragment.cloneNode(false),
      hasMore: false
    },
    search: {
      data: [],
      hasMore: false
    },
    current: {}, // current is either equal to main or search depending on if a search is in progress
    view: {},
    // map of option values and their respective data (only used in conjunction with options.source)
    optionValuesDataMap: {},
    isSearching: false,
    keydown: {
      keyHistory: '',
      resetKeyHistory: {
        start: this.defaultStart
      }
    }
  };
  public sizeInfo = {};

  constructor($element: HTMLSelectElement, options: SelectpickerOptions) {
    this.$element = $element;
    this.options = mergeDeep(this.options, options);

    // Format window padding
    let winPad = this.options.windowPadding;
    if (typeof winPad === 'number') {
      this.options.windowPadding = [winPad, winPad, winPad, winPad];
    }

    // Expose public methods
    this.val = Selectpicker.prototype.val;
    this.render = Selectpicker.prototype.render;
    this.refresh = Selectpicker.prototype.refresh;
    this.setStyle = Selectpicker.prototype.setStyle;
    this.selectAll = Selectpicker.prototype.selectAll;
    this.deselectAll = Selectpicker.prototype.deselectAll;
    this.destroy = Selectpicker.prototype.destroy;
    this.remove = Selectpicker.prototype.remove;
    this.show = Selectpicker.prototype.show;
    this.hide = Selectpicker.prototype.hide;

    this.init();
  }

  defaultStart() {
    const that = this;
    return setTimeout(function () {
      that.selectpicker.keydown.keyHistory = '';
    }, 800);
  }

  init() {
    let that = this,
      id = this.$element.id,
      element = this.$element,
      form = element.form;

    selectId++;
    this.selectId = 'bs-select-' + selectId;

    element.classList.add('bs-select-hidden');

    this.multiple = this.$element.getAttribute('multiple');
    this.autofocus = this.$element.getAttribute('autofocus');

    if (element.classList.contains('show-tick')) {
      this.options.showTick = true;
    }

    this.$newElement = this.createDropdown();

    this.$element.after(this.$newElement);

    // ensure select is associated with form element if it got unlinked after moving it inside newElement
    if (form && element.form === null) {
      if (!form.id) form.id = 'form-' + this.selectId;
      element.setAttribute('form', form.id);
    }

    this.$button = this.$newElement?.querySelector('button');
    if (this.options.allowClear) this.$clearButton = this.$button?.querySelector('.bs-select-clear-selected');
    this.$menu = this.$newElement?.querySelector(Selector.MENU);
    this.$menuInner = this.$menu?.querySelector('.inner');
    this.$searchbox = this.$menu?.querySelector('input');

    element?.classList.remove('bs-select-hidden');

    this.fetchData(function () {
      that.render(true);
      that.buildList();

      requestAnimationFrame(function () {
        that.$element?.dispatchEvent(new CustomEvent('loaded' + EVENT_KEY));
      });
    });

    if (this.options.dropdownAlignRight === true) this.$menu.classList.add(classNames.MENURIGHT);

    if (typeof id !== 'undefined') {
      this.$button.dataset.dataId = id;
    }

    this.checkDisabled();
    this.clickListener();

    if (version.major > 4) this.dropdown = new Dropdown(this.$button);

    if (this.options.liveSearch) {
      this.liveSearchListener();
      this.focusedParent = this.$searchbox;
    } else {
      this.focusedParent = this.$menuInner;
    }

    this.setStyle();
    this.setWidth();
    if (this.options.container) {
      this.selectPosition();
    } else {
      this.$element.addEventListener('hide' + EVENT_KEY, function () {
        if (that.isVirtual()) {
          // empty menu on close
          let menuInner = that.$menuInner,
            emptyMenu = menuInner.firstChild.cloneNode(false);

          // replace the existing UL with an empty one - this is faster than $.empty() or innerHTML = ''
          menuInner.replaceChild(emptyMenu, menuInner.firstChild);
          menuInner.scrollTop = 0;
        }
      });
    }

    if (this.options.mobile) this.mobile();

    const events = ['hide', 'hidden', 'show', 'shown'];

    events.forEach((event) => {
      this.$newElement?.addEventListener(event + '.bs.dropdown', function (e) {
        that.$element?.dispatchEvent(new CustomEvent(event + EVENT_KEY, e));
      });
    });

    if (element.hasAttribute('required')) {
      this.$element.on('invalid' + EVENT_KEY, function () {
        that.$button.classList.add('bs-invalid');

        that.$element
          .on('shown' + EVENT_KEY + '.invalid', function () {
            that.$element
              .val(that.$element.val()) // set the value to hide the validation message in Chrome when menu is opened
              .off('shown' + EVENT_KEY + '.invalid');
          })
          .on('rendered' + EVENT_KEY, function () {
            // if select is no longer invalid, remove the bs-invalid class
            if (this.validity.valid) that.$button.classList.remove('bs-invalid');
            that.$element.off('rendered' + EVENT_KEY);
          });

        that.$button.on('blur' + EVENT_KEY, function () {
          that.$element.trigger('focus').trigger('blur');
          that.$button.off('blur' + EVENT_KEY);
        });
      });
    }

    if (form) {
      $(form).on('reset' + EVENT_KEY, function () {
        requestAnimationFrame(function () {
          that.render();
        });
      });
    }
  }

  showNoResults(searchMatch: string, searchValue: string) {
    if (!searchMatch.length) {
      elementTemplates.noResults.innerHTML = this.options.noneResultsText.replace('{0}', '"' + htmlEscape(searchValue) + '"');
      this.$menuInner?.firstChild?.appendChild(elementTemplates.noResults);
    }
  }

  filterHidden(item: { hidden: boolean; disabled: boolean }) {
    return !(item.hidden || (this.options.hideDisabled && item.disabled));
  }

  createDropdown() {
    // Options
    // If we are multiple or showTick option is set, then add the show-tick class
    let showTick = this.multiple || this.options.showTick ? ' show-tick' : '',
      multiselectable = this.multiple ? ' aria-multiselectable="true"' : '',
      inputGroup = '',
      autofocus = this.autofocus ? ' autofocus' : '';

    if (version.major < 4 && this.$element.parent().hasClass('input-group')) {
      inputGroup = ' input-group-btn';
    }

    // Elements
    let drop,
      header = '',
      searchbox = '',
      actionsbox = '',
      donebutton = '',
      clearButton = '';

    if (this.options.header) {
      header =
        '<div class="' +
        classNames.POPOVERHEADER +
        '">' +
        '<button type="button" class="close" aria-hidden="true">&times;</button>' +
        this.options.header +
        '</div>';
    }

    if (this.options.liveSearch) {
      searchbox =
        '<div class="bs-searchbox">' +
        '<input type="search" class="form-control" autocomplete="off"' +
        (this.options.liveSearchPlaceholder === null ? '' : ' placeholder="' + htmlEscape(this.options.liveSearchPlaceholder) + '"') +
        ' role="combobox" aria-label="Search" aria-controls="' +
        this.selectId +
        '" aria-autocomplete="list">' +
        '</div>';
    }

    if (this.multiple && this.options.actionsBox) {
      actionsbox =
        '<div class="bs-actionsbox">' +
        '<div class="btn-group btn-group-sm">' +
        '<button type="button" class="actions-btn bs-select-all btn ' +
        classNames.BUTTONCLASS +
        '">' +
        this.options.selectAllText +
        '</button>' +
        '<button type="button" class="actions-btn bs-deselect-all btn ' +
        classNames.BUTTONCLASS +
        '">' +
        this.options.deselectAllText +
        '</button>' +
        '</div>' +
        '</div>';
    }

    if (this.multiple && this.options.doneButton) {
      donebutton =
        '<div class="bs-donebutton">' +
        '<div class="btn-group">' +
        '<button type="button" class="btn btn-sm ' +
        classNames.BUTTONCLASS +
        '">' +
        this.options.doneButtonText +
        '</button>' +
        '</div>' +
        '</div>';
    }

    if (this.options.allowClear) {
      clearButton = '<span class="close bs-select-clear-selected" title="' + this.options.deselectAllText + '"><span>&times;</span>';
    }

    drop =
      '<div class="dropdown bootstrap-select' +
      showTick +
      inputGroup +
      '">' +
      '<button type="button" tabindex="-1" class="' +
      this.options.styleBase +
      ' dropdown-toggle" ' +
      (this.options.display === 'static' ? 'data-bs-display="static"' : '') +
      Selector.DATA_TOGGLE +
      autofocus +
      ' role="combobox" aria-owns="' +
      this.selectId +
      '" aria-haspopup="listbox" aria-expanded="false">' +
      '<div class="filter-option">' +
      '<div class="filter-option-inner">' +
      '<div class="filter-option-inner-inner">&nbsp;</div>' +
      '</div> ' +
      '</div>' +
      clearButton +
      '</span>' +
      '</button>' +
      '<div class="' +
      classNames.MENU +
      '">' +
      header +
      searchbox +
      actionsbox +
      '<div class="inner ' +
      classNames.SHOW +
      '" role="listbox" id="' +
      this.selectId +
      '" tabindex="-1" ' +
      multiselectable +
      '>' +
      '<ul class="' +
      classNames.MENU +
      ' inner ' +
      classNames.SHOW +
      '" role="presentation">' +
      '</ul>' +
      '</div>' +
      donebutton +
      '</div>' +
      '</div>';

    return createElementFromHTML(drop);
  }

  setPositionData() {
    this.selectpicker.view.canHighlight = [];
    this.selectpicker.view.size = 0;
    this.selectpicker.view.firstHighlightIndex = false;

    for (let i = 0; i < this.selectpicker.current.data.length; i++) {
      let li = this.selectpicker.current.data[i],
        canHighlight = true;

      if (li.type === 'divider') {
        canHighlight = false;
        li.height = this.sizeInfo.dividerHeight;
      } else if (li.type === 'optgroup-label') {
        canHighlight = false;
        li.height = this.sizeInfo.dropdownHeaderHeight;
      } else {
        li.height = this.sizeInfo.liHeight;
      }

      if (li.disabled) canHighlight = false;

      this.selectpicker.view.canHighlight.push(canHighlight);

      if (canHighlight) {
        this.selectpicker.view.size++;
        li.posinset = this.selectpicker.view.size;
        if (this.selectpicker.view.firstHighlightIndex === false) this.selectpicker.view.firstHighlightIndex = i;
      }

      li.position = (i === 0 ? 0 : this.selectpicker.current.data[i - 1].position) + li.height;
    }
  }

  isVirtual() {
    return (this.options.virtualScroll !== false && this.selectpicker.main.data.length >= this.options.virtualScroll) || this.options.virtualScroll === true;
  }

  createView(isSearching, setSize, refresh) {
    let that = this,
      scrollTop = 0;

    this.selectpicker.isSearching = isSearching;
    this.selectpicker.current = isSearching ? this.selectpicker.search : this.selectpicker.main;

    this.setPositionData();

    if (setSize) {
      if (refresh) {
        scrollTop = this.$menuInner.scrollTop;
      } else if (!that.multiple) {
        let element = that.$element,
          selectedIndex = (element.options[element.selectedIndex] || {}).liIndex;

        if (typeof selectedIndex === 'number' && that.options.size !== false) {
          let selectedData = that.selectpicker.main.data[selectedIndex],
            position = selectedData && selectedData.position;

          if (position) {
            scrollTop = position - (that.sizeInfo.menuInnerHeight + that.sizeInfo.liHeight) / 2;
          }
        }
      }
    }

    scroll(scrollTop, true);

    this.$menuInner.off('scroll.createView').on('scroll.createView', function (e, updateValue) {
      if (!that.noScroll) scroll(this.scrollTop, updateValue);
      that.noScroll = false;
    });

    function scroll(scrollTop, init) {
      let size = that.selectpicker.current.data.length,
        chunks = [],
        chunkSize,
        chunkCount,
        firstChunk,
        lastChunk,
        currentChunk,
        prevPositions,
        positionIsDifferent,
        previousElements,
        menuIsDifferent = true,
        isVirtual = that.isVirtual();

      that.selectpicker.view.scrollTop = scrollTop;

      chunkSize = that.options.chunkSize; // number of options in a chunk
      chunkCount = Math.ceil(size / chunkSize) || 1; // number of chunks

      for (let i = 0; i < chunkCount; i++) {
        let endOfChunk = (i + 1) * chunkSize;

        if (i === chunkCount - 1) {
          endOfChunk = size;
        }

        chunks[i] = [i * chunkSize + (!i ? 0 : 1), endOfChunk];

        if (!size) break;

        if (currentChunk === undefined && scrollTop - 1 <= that.selectpicker.current.data[endOfChunk - 1].position - that.sizeInfo.menuInnerHeight) {
          currentChunk = i;
        }
      }

      if (currentChunk === undefined) currentChunk = 0;

      prevPositions = [that.selectpicker.view.position0, that.selectpicker.view.position1];

      // always display previous, current, and next chunks
      firstChunk = Math.max(0, currentChunk - 1);
      lastChunk = Math.min(chunkCount - 1, currentChunk + 1);

      that.selectpicker.view.position0 = isVirtual === false ? 0 : Math.max(0, chunks[firstChunk][0]) || 0;
      that.selectpicker.view.position1 = isVirtual === false ? size : Math.min(size, chunks[lastChunk][1]) || 0;

      positionIsDifferent = prevPositions[0] !== that.selectpicker.view.position0 || prevPositions[1] !== that.selectpicker.view.position1;

      if (that.activeElement !== undefined) {
        if (init) {
          if (that.activeElement !== that.selectedElement) {
            that.defocusItem(that.activeElement);
          }
          that.activeElement = undefined;
        }

        if (that.activeElement !== that.selectedElement) {
          that.defocusItem(that.selectedElement);
        }
      }

      if (that.prevActiveElement !== undefined && that.prevActiveElement !== that.activeElement && that.prevActiveElement !== that.selectedElement) {
        that.defocusItem(that.prevActiveElement);
      }

      if (init || positionIsDifferent || that.selectpicker.current.hasMore) {
        previousElements = that.selectpicker.view.visibleElements ? that.selectpicker.view.visibleElements.slice() : [];

        if (isVirtual === false) {
          that.selectpicker.view.visibleElements = that.selectpicker.current.elements;
        } else {
          that.selectpicker.view.visibleElements = that.selectpicker.current.elements.slice(that.selectpicker.view.position0, that.selectpicker.view.position1);
        }

        that.setOptionStatus();

        // if searching, check to make sure the list has actually been updated before updating DOM
        // this prevents unnecessary repaints
        if (isSearching || (isVirtual === false && init)) menuIsDifferent = !isEqual(previousElements, that.selectpicker.view.visibleElements);

        // if virtual scroll is disabled and not searching,
        // menu should never need to be updated more than once
        if ((init || isVirtual === true) && menuIsDifferent) {
          let menuInner = that.$menuInner,
            menuFragment = document.createDocumentFragment(),
            emptyMenu = menuInner.firstChild.cloneNode(false),
            marginTop,
            marginBottom,
            elements = that.selectpicker.view.visibleElements,
            toSanitize = [];

          // replace the existing UL with an empty one - this is faster than $.empty()
          menuInner.replaceChild(emptyMenu, menuInner.firstChild);

          for (let i = 0, visibleElementsLen = elements.length; i < visibleElementsLen; i++) {
            let element = elements[i],
              elText,
              elementData;

            if (that.options.sanitize) {
              elText = element.lastChild;

              if (elText) {
                elementData = that.selectpicker.current.data[i + that.selectpicker.view.position0];

                if (elementData && elementData.content && !elementData.sanitized) {
                  toSanitize.push(elText);
                  elementData.sanitized = true;
                }
              }
            }

            menuFragment.appendChild(element);
          }

          if (that.options.sanitize && toSanitize.length) {
            sanitizeHtml(toSanitize, that.options.whiteList, that.options.sanitizeFn);
          }

          if (isVirtual === true) {
            marginTop = that.selectpicker.view.position0 === 0 ? 0 : that.selectpicker.current.data[that.selectpicker.view.position0 - 1].position;
            marginBottom =
              that.selectpicker.view.position1 > size - 1
                ? 0
                : that.selectpicker.current.data[size - 1].position - that.selectpicker.current.data[that.selectpicker.view.position1 - 1].position;

            menuInner.firstChild.style.marginTop = marginTop + 'px';
            menuInner.firstChild.style.marginBottom = marginBottom + 'px';
          } else {
            menuInner.firstChild.style.marginTop = 0;
            menuInner.firstChild.style.marginBottom = 0;
          }

          menuInner.firstChild.appendChild(menuFragment);

          // if an option is encountered that is wider than the current menu width, update the menu width accordingly
          // switch to ResizeObserver with increased browser support
          if (isVirtual === true && that.sizeInfo.hasScrollBar) {
            let menuInnerInnerWidth = menuInner.firstChild.offsetWidth;

            if (init && menuInnerInnerWidth < that.sizeInfo.menuInnerInnerWidth && that.sizeInfo.totalMenuWidth > that.sizeInfo.selectWidth) {
              menuInner.firstChild.style.minWidth = that.sizeInfo.menuInnerInnerWidth + 'px';
            } else if (menuInnerInnerWidth > that.sizeInfo.menuInnerInnerWidth) {
              // set to 0 to get actual width of menu
              that.$menu.style.minWidth = 0;

              let actualMenuWidth = menuInner.firstChild.offsetWidth;

              if (actualMenuWidth > that.sizeInfo.menuInnerInnerWidth) {
                that.sizeInfo.menuInnerInnerWidth = actualMenuWidth;
                menuInner.firstChild.style.minWidth = that.sizeInfo.menuInnerInnerWidth + 'px';
              }

              // reset to default CSS styling
              that.$menu.style.minWidth = '';
            }
          }
        }

        if (
          ((!isSearching && that.options.source.data) || (isSearching && that.options.source.search)) &&
          that.selectpicker.current.hasMore &&
          currentChunk === chunkCount - 1
        ) {
          // Don't load the next chunk until scrolling has started
          // This prevents unnecessary requests while the user is typing if pageSize is <= chunkSize
          if (scrollTop > 0) {
            // Chunks use 0-based indexing, but pages use 1-based. Add 1 to convert and add 1 again to get next page
            let page = Math.floor((currentChunk * that.options.chunkSize) / that.options.source.pageSize) + 2;

            that.fetchData(
              function () {
                that.render();
                that.buildList(size, isSearching);
                that.setPositionData();
                scroll(scrollTop);
              },
              isSearching ? 'search' : 'data',
              page,
              isSearching ? that.selectpicker.search.previousValue : undefined
            );
          }
        }
      }

      that.prevActiveElement = that.activeElement;

      if (!that.options.liveSearch) {
        that.$menuInner.trigger('focus');
      } else if (isSearching && init) {
        let index = 0,
          newActive;

        if (!that.selectpicker.view.canHighlight[index]) {
          index = 1 + that.selectpicker.view.canHighlight.slice(1).indexOf(true);
        }

        newActive = that.selectpicker.view.visibleElements[index];

        that.defocusItem(that.selectpicker.view.currentActive);

        that.activeElement = (that.selectpicker.current.data[index] || {}).element;

        that.focusItem(newActive);
      }
    }

    $(window)
      .off('resize' + EVENT_KEY + '.' + this.selectId + '.createView')
      .on('resize' + EVENT_KEY + '.' + this.selectId + '.createView', function () {
        let isActive = that.$newElement?.classList.contains(classNames.SHOW);

        if (isActive) scroll(that.$menuInner.scrollTop);
      });
  }

  focusItem(li, liData, noStyle) {
    if (li) {
      liData = liData || this.selectpicker.current.data[this.selectpicker.current.elements.indexOf(this.activeElement)];
      let a = li.firstChild;

      if (a) {
        a.setAttribute('aria-setsize', this.selectpicker.view.size);
        a.setAttribute('aria-posinset', liData.posinset);

        if (noStyle !== true) {
          this.focusedParent.setAttribute('aria-activedescendant', a.id);
          li.classList.add('active');
          a.classList.add('active');
        }
      }
    }
  }

  defocusItem(li) {
    if (li) {
      li.classList.remove('active');
      if (li.firstChild) li.firstChild.classList.remove('active');
    }
  }

  setPlaceholder() {
    let that = this,
      updateIndex = false;

    if ((this.options.placeholder || this.options.allowClear) && !this.multiple) {
      if (!this.selectpicker.view.titleOption) this.selectpicker.view.titleOption = document.createElement('option');

      // this option doesn't create a new <li> element, but does add a new option at the start,
      // so startIndex should increase to prevent having to check every option for the bs-title-option class
      updateIndex = true;

      let element = this.$element,
        selectTitleOption = false,
        titleNotAppended = !this.selectpicker.view.titleOption.parentNode,
        selectedIndex = element.selectedIndex,
        selectedOption = element.options[selectedIndex],
        firstSelectable = element.querySelector('select > *:not(:disabled)'),
        firstSelectableIndex = firstSelectable ? firstSelectable.index : 0,
        navigation = window.performance && window.performance.getEntriesByType('navigation'),
        // Safari doesn't support getEntriesByType('navigation') - fall back to performance.navigation
        isNotBackForward = navigation && navigation.length ? navigation[0].type !== 'back_forward' : window.performance.navigation.type !== 2;

      if (titleNotAppended) {
        // Use native JS to prepend option (faster)
        this.selectpicker.view.titleOption.className = 'bs-title-option';
        this.selectpicker.view.titleOption.value = '';

        // Check if selected or data-selected attribute is already set on an option. If not, select the titleOption option.
        // the selected item may have been changed by user or programmatically before the bootstrap select plugin runs,
        // if so, the select will have the data-selected attribute
        selectTitleOption =
          !selectedOption ||
          (selectedIndex === firstSelectableIndex && selectedOption.defaultSelected === false && this.$element.data('selected') === undefined);
      }

      if (titleNotAppended || this.selectpicker.view.titleOption.index !== 0) {
        element.insertBefore(this.selectpicker.view.titleOption, element.firstChild);
      }

      // Set selected *after* appending to select,
      // otherwise the option doesn't get selected in IE
      // set using selectedIndex, as setting the selected attr to true here doesn't work in IE11
      if (selectTitleOption && isNotBackForward) {
        element.selectedIndex = 0;
      } else if (document.readyState !== 'complete') {
        // if navigation type is back_forward, there's a chance the select will have its value set by BFCache
        // wait for that value to be set, then run render again
        window.addEventListener('pageshow', function () {
          if (that.selectpicker.view.displayedValue !== element.value) that.render();
        });
      }
    }

    return updateIndex;
  }

  fetchData(callback: Function, type?: string, page?: number, searchValue?: string) {
    page = page || 1;
    type = type || 'data';

    let that = this,
      data = this.options.source[type],
      builtData;

    if (data) {
      this.options.virtualScroll = true;

      if (typeof data === 'function') {
        data.call(
          this,
          function (data, more, totalItems) {
            let current = that.selectpicker[type === 'search' ? 'search' : 'main'];
            current.hasMore = more;
            current.totalItems = totalItems;
            builtData = that.buildData(data, type);
            callback.call(that, builtData);
            that.$element.trigger('fetched' + EVENT_KEY);
          },
          page,
          searchValue
        );
      } else if (Array.isArray(data)) {
        builtData = that.buildData(data, type);
        callback.call(that, builtData);
      }
    } else {
      builtData = this.buildData(false, type);
      callback.call(that, builtData);
    }
  }

  buildData(data, type) {
    let that = this;
    let dataGetter = data === false ? getOptionData.fromOption : getOptionData.fromDataSource;

    let optionSelector = ':not([hidden]):not([data-hidden="true"]):not([style*="display: none"])',
      mainData = [],
      startLen = this.selectpicker.main.data ? this.selectpicker.main.data.length : 0,
      optID = 0,
      startIndex = this.setPlaceholder() && !data ? 1 : 0; // append the titleOption if necessary and skip the first option in the loop

    if (type === 'search') {
      startLen = this.selectpicker.search.data.length;
    }

    if (this.options.hideDisabled) optionSelector += ':not(:disabled)';

    let selectOptions = data ? data.filter(filterHidden, this) : this.$element.querySelectorAll('select > *' + optionSelector);

    function addDivider(config) {
      let previousData = mainData[mainData.length - 1];

      // ensure optgroup doesn't create back-to-back dividers
      if (previousData && previousData.type === 'divider' && (previousData.optID || config.optID)) {
        return;
      }

      config = config || {};
      config.type = 'divider';

      mainData.push(config);
    }

    function addOption(item, config) {
      config = config || {};

      config.divider = dataGetter(item, 'divider');

      if (config.divider === true) {
        addDivider({
          optID: config.optID
        });
      } else {
        let liIndex = mainData.length + startLen,
          cssText = dataGetter(item, 'style'),
          inlineStyle = cssText ? htmlEscape(cssText) : '',
          optionClass = (item.className || '') + (config.optgroupClass || '');

        if (config.optID) optionClass = 'opt ' + optionClass;

        config.optionClass = optionClass.trim();
        config.inlineStyle = inlineStyle;

        config.text = dataGetter(item, 'text');
        config.title = dataGetter(item, 'title');
        config.content = dataGetter(item, 'content');
        config.tokens = dataGetter(item, 'tokens');
        config.subtext = dataGetter(item, 'subtext');
        config.icon = dataGetter(item, 'icon');

        config.display = config.content || config.text;
        config.value = item.value === undefined ? item.text : item.value;
        config.type = 'option';
        config.index = liIndex;

        config.option = !item.option ? item : item.option; // reference option element if it exists
        config.option.liIndex = liIndex;
        config.selected = !!item.selected;
        config.disabled = config.disabled || !!item.disabled;

        if (data !== false) {
          if (that.selectpicker.optionValuesDataMap[config.value]) {
            config = $.extend(that.selectpicker.optionValuesDataMap[config.value], config);
          } else {
            that.selectpicker.optionValuesDataMap[config.value] = config;
          }
        }

        mainData.push(config);
      }
    }

    function addOptgroup(index, selectOptions) {
      let optgroup = selectOptions[index],
        // skip placeholder option
        previous = index - 1 < startIndex ? false : selectOptions[index - 1],
        next = selectOptions[index + 1],
        options = data ? optgroup.children.filter(filterHidden, this) : optgroup.querySelectorAll('option' + optionSelector);

      if (!options.length) return;

      let config = {
          display: htmlEscape(dataGetter(item, 'label')),
          subtext: dataGetter(optgroup, 'subtext'),
          icon: dataGetter(optgroup, 'icon'),
          type: 'optgroup-label',
          optgroupClass: ' ' + (optgroup.className || ''),
          optgroup: optgroup
        },
        headerIndex,
        lastIndex;

      optID++;

      if (previous) {
        addDivider({ optID: optID });
      }

      config.optID = optID;

      mainData.push(config);

      for (let j = 0, len = options.length; j < len; j++) {
        let option = options[j];

        if (j === 0) {
          headerIndex = mainData.length - 1;
          lastIndex = headerIndex + len;
        }

        addOption(option, {
          headerIndex: headerIndex,
          lastIndex: lastIndex,
          optID: config.optID,
          optgroupClass: config.optgroupClass,
          disabled: optgroup.disabled
        });
      }

      if (next) {
        addDivider({ optID: optID });
      }
    }

    for (let len = selectOptions.length, i = startIndex; i < len; i++) {
      let item = selectOptions[i],
        children = item.children;

      if (children && children.length) {
        addOptgroup.call(this, i, selectOptions);
      } else {
        addOption.call(this, item, {});
      }
    }

    switch (type) {
      case 'data': {
        if (!this.selectpicker.main.data) {
          this.selectpicker.main.data = [];
        }
        Array.prototype.push.apply(this.selectpicker.main.data, mainData);
        this.selectpicker.current.data = this.selectpicker.main.data;
        break;
      }
      case 'search': {
        Array.prototype.push.apply(this.selectpicker.search.data, mainData);
        break;
      }
    }

    return mainData;
  }

  buildList(size?: number, searching?: boolean) {
    let that = this,
      selectData = searching ? this.selectpicker.search.data : this.selectpicker.main.data,
      mainElements = [],
      widestOptionLength = 0;

    if ((that.options.showTick || that.multiple) && !elementTemplates.checkMark.parentNode) {
      elementTemplates.checkMark.className = this.options.iconBase + ' ' + that.options.tickIcon + ' check-mark';
      elementTemplates.a.appendChild(elementTemplates.checkMark);
    }

    function buildElement(mainElements, item) {
      let liElement,
        combinedLength = 0;

      switch (item.type) {
        case 'divider':
          liElement = generateOption.li(false, classNames.DIVIDER, item.optID ? item.optID + 'div' : undefined);

          break;

        case 'option':
          liElement = generateOption.li(generateOption.a(generateOption.text.call(that, item), item.optionClass, item.inlineStyle), '', item.optID);

          if (liElement.firstChild) {
            liElement.firstChild.id = that.selectId + '-' + item.index;
          }

          break;

        case 'optgroup-label':
          liElement = generateOption.li(generateOption.label.call(that, item), 'dropdown-header' + item.optgroupClass, item.optID);

          break;
      }

      if (!item.element) {
        item.element = liElement;
      } else {
        item.element.innerHTML = liElement.innerHTML;
      }
      mainElements.push(item.element);

      // count the number of characters in the option - not perfect, but should work in most cases
      if (item.display) combinedLength += item.display.length;
      if (item.subtext) combinedLength += item.subtext.length;
      // if there is an icon, ensure this option's width is checked
      if (item.icon) combinedLength += 1;

      if (combinedLength > widestOptionLength) {
        widestOptionLength = combinedLength;

        // guess which option is the widest
        // use this when calculating menu width
        // not perfect, but it's fast, and the width will be updating accordingly when scrolling
        that.selectpicker.view.widestOption = mainElements[mainElements.length - 1];
      }
    }

    let startIndex = size || 0;

    for (let len = selectData.length, i = startIndex; i < len; i++) {
      let item = selectData[i];

      buildElement(mainElements, item);
    }

    if (size) {
      if (searching) {
        Array.prototype.push.apply(this.selectpicker.search.elements, mainElements);
      } else {
        Array.prototype.push.apply(this.selectpicker.main.elements, mainElements);
        this.selectpicker.current.elements = this.selectpicker.main.elements;
      }
    } else {
      if (searching) {
        this.selectpicker.search.elements = mainElements;
      } else {
        this.selectpicker.main.elements = this.selectpicker.current.elements = mainElements;
      }
    }
  }

  findLis() {
    return this.$menuInner.find('.inner > li');
  }

  render(init) {
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

  /**
   * @param [style]
   * @param [status]
   */
  setStyle(newStyle, status) {
    let button = this.$button,
      newElement = this.$newElement,
      style = this.options.style.trim(),
      buttonClass;

    if (this.$element.getAttribute('class') && this.$element.getAttribute('class') !== '') {
      const className = this.$element.getAttribute('class').replace(/selectpicker|mobile-device|bs-select-hidden|validate\[.*\]/gi, '');

      if (className !== '') this.$newElement.classList.add(className);
    }

    if (version.major < 4) {
      newElement.classList.add('bs3');

      if (
        newElement.parentNode.classList &&
        newElement.parentNode.classList.contains('input-group') &&
        (newElement.previousElementSibling || newElement.nextElementSibling) &&
        (newElement.previousElementSibling || newElement.nextElementSibling).classList.contains('input-group-addon')
      ) {
        newElement.classList.add('bs3-has-addon');
      }
    }

    if (newStyle) {
      buttonClass = newStyle.trim();
    } else {
      buttonClass = style;
    }

    if (status == 'add') {
      if (buttonClass) button.classList.add.apply(button.classList, buttonClass.split(' '));
    } else if (status == 'remove') {
      if (buttonClass) button.classList.remove.apply(button.classList, buttonClass.split(' '));
    } else {
      if (style) button.classList.remove.apply(button.classList, style.split(' '));
      if (buttonClass) button.classList.add.apply(button.classList, buttonClass.split(' '));
    }
  }

  liHeight(refresh) {
    if (!refresh && (this.options.size === false || Object.keys(this.sizeInfo).length)) return;

    let newElement = elementTemplates.div.cloneNode(false),
      menu = elementTemplates.div.cloneNode(false),
      menuInner = elementTemplates.div.cloneNode(false),
      menuInnerInner = document.createElement('ul'),
      divider = elementTemplates.li.cloneNode(false) as HTMLLIElement,
      dropdownHeader = elementTemplates.li.cloneNode(false),
      li,
      a = elementTemplates.a.cloneNode(false),
      text = elementTemplates.span.cloneNode(false),
      header =
        this.options.header && this.$menu.querySelector('.' + classNames.POPOVERHEADER)
          ? this.$menu.querySelector('.' + classNames.POPOVERHEADER).cloneNode(true)
          : null,
      search = this.options.liveSearch ? elementTemplates.div.cloneNode(false) : null,
      actions =
        this.options.actionsBox && this.multiple && this.$menu.querySelector('.bs-actionsbox')
          ? this.$menu.querySelector('.bs-actionsbox').cloneNode(true)
          : null,
      doneButton =
        this.options.doneButton && this.multiple && this.$menu.querySelector('.bs-donebutton')
          ? this.$menu.querySelector('.bs-donebutton').cloneNode(true)
          : null,
      firstOption = this.$element.options[0];

    this.sizeInfo.selectWidth = this.$newElement.offsetWidth;

    text.className = 'text';
    a.className = 'dropdown-item ' + (firstOption ? firstOption.className : '');
    newElement.className = this.$menu.parentNode.className + ' ' + classNames.SHOW;
    newElement.style.width = 0; // ensure button width doesn't affect natural width of menu when calculating
    if (this.options.width === 'auto') menu.style.minWidth = 0;
    menu.className = classNames.MENU + ' ' + classNames.SHOW;
    menuInner.className = 'inner ' + classNames.SHOW;
    menuInnerInner.className = classNames.MENU + ' inner ' + (version.major >= '4' ? classNames.SHOW : '');
    divider.className = classNames.DIVIDER;
    dropdownHeader.className = 'dropdown-header';

    text.appendChild(document.createTextNode('\u200b'));

    if (this.selectpicker.current.data.length) {
      for (let i = 0; i < this.selectpicker.current.data.length; i++) {
        let data = this.selectpicker.current.data[i];
        if (data.type === 'option' && data.element.firstChild.style.display !== 'none') {
          li = data.element;
          break;
        }
      }
    } else {
      li = elementTemplates.li.cloneNode(false);
      a.appendChild(text);
      li.appendChild(a);
    }

    dropdownHeader.appendChild(text.cloneNode(true));

    if (this.selectpicker.view.widestOption) {
      menuInnerInner.appendChild(this.selectpicker.view.widestOption.cloneNode(true));
    }

    menuInnerInner.appendChild(li);
    menuInnerInner.appendChild(divider);
    menuInnerInner.appendChild(dropdownHeader);
    if (header) menu.appendChild(header);
    if (search) {
      let input = document.createElement('input');
      search.className = 'bs-searchbox';
      input.className = 'form-control';
      search.appendChild(input);
      menu.appendChild(search);
    }
    if (actions) menu.appendChild(actions);
    menuInner.appendChild(menuInnerInner);
    menu.appendChild(menuInner);
    if (doneButton) menu.appendChild(doneButton);
    newElement.appendChild(menu);

    document.body.appendChild(newElement);

    let liHeight = li.offsetHeight,
      dropdownHeaderHeight = dropdownHeader ? dropdownHeader.offsetHeight : 0,
      headerHeight = header ? header.offsetHeight : 0,
      searchHeight = search ? search.offsetHeight : 0,
      actionsHeight = actions ? actions.offsetHeight : 0,
      doneButtonHeight = doneButton ? doneButton.offsetHeight : 0,
      dividerHeight = divider.getBoundingClientRect().height,
      menuStyle = window.getComputedStyle(menu),
      menuWidth = menu.offsetWidth,
      menuPadding = {
        vert:
          toInteger(menuStyle.paddingTop) + toInteger(menuStyle.paddingBottom) + toInteger(menuStyle.borderTopWidth) + toInteger(menuStyle.borderBottomWidth),
        horiz:
          toInteger(menuStyle.paddingLeft) + toInteger(menuStyle.paddingRight) + toInteger(menuStyle.borderLeftWidth) + toInteger(menuStyle.borderRightWidth)
      },
      menuExtras = {
        vert: menuPadding.vert + toInteger(menuStyle.marginTop) + toInteger(menuStyle.marginBottom) + 2,
        horiz: menuPadding.horiz + toInteger(menuStyle.marginLeft) + toInteger(menuStyle.marginRight) + 2
      },
      scrollBarWidth;

    menuInner.style.overflowY = 'scroll';

    scrollBarWidth = menu.offsetWidth - menuWidth;

    document.body.removeChild(newElement);

    this.sizeInfo.liHeight = liHeight;
    this.sizeInfo.dropdownHeaderHeight = dropdownHeaderHeight;
    this.sizeInfo.headerHeight = headerHeight;
    this.sizeInfo.searchHeight = searchHeight;
    this.sizeInfo.actionsHeight = actionsHeight;
    this.sizeInfo.doneButtonHeight = doneButtonHeight;
    this.sizeInfo.dividerHeight = dividerHeight;
    this.sizeInfo.menuPadding = menuPadding;
    this.sizeInfo.menuExtras = menuExtras;
    this.sizeInfo.menuWidth = menuWidth;
    this.sizeInfo.menuInnerInnerWidth = menuWidth - menuPadding.horiz;
    this.sizeInfo.totalMenuWidth = this.sizeInfo.menuWidth;
    this.sizeInfo.scrollBarWidth = scrollBarWidth;
    this.sizeInfo.selectHeight = this.$newElement.offsetHeight;

    this.setPositionData();
  }

  getSelectPosition() {
    let that = this,
      pos = that.$newElement?.getClientRects(),
      $container = that.options.container,
      containerPos = { top: 0, left: 0 };

    if ($container && $container instanceof HTMLElement && $container.nodeName !== 'body') {
      containerPos = $container ? $container.getBoundingClientRect() : { top: 0, left: 0 };
      containerPos.top += parseInt($container.style.borderTopWidth);
      containerPos.left += parseInt($container.style.borderLeftWidth);
    }

    let winPad = that.options.windowPadding;

    const scrollTop = window.pageYOffset || document.body.scrollTop;
    const scrollLeft = window.pageXOffset || document.body.scrollLeft;
    this.sizeInfo.selectOffsetTop = pos.top - containerPos.top - scrollTop;
    this.sizeInfo.selectOffsetBot = window.outerHeight - this.sizeInfo.selectOffsetTop - this.sizeInfo.selectHeight - containerPos.top - winPad[2];
    this.sizeInfo.selectOffsetLeft = pos.left - containerPos.left - scrollLeft;
    this.sizeInfo.selectOffsetRight = window.outerWidth - this.sizeInfo.selectOffsetLeft - this.sizeInfo.selectWidth - containerPos.left - winPad[1];
    this.sizeInfo.selectOffsetTop -= winPad[0];
    this.sizeInfo.selectOffsetLeft -= winPad[3];
  }

  setMenuSize(isAuto) {
    this.getSelectPosition();

    let selectWidth = this.sizeInfo.selectWidth,
      liHeight = this.sizeInfo.liHeight,
      headerHeight = this.sizeInfo.headerHeight,
      searchHeight = this.sizeInfo.searchHeight,
      actionsHeight = this.sizeInfo.actionsHeight,
      doneButtonHeight = this.sizeInfo.doneButtonHeight,
      divHeight = this.sizeInfo.dividerHeight,
      menuPadding = this.sizeInfo.menuPadding,
      menuInnerHeight,
      menuHeight,
      divLength = 0,
      minHeight,
      _minHeight,
      maxHeight,
      menuInnerMinHeight,
      estimate,
      isDropup;

    if (this.options.dropupAuto) {
      // Get the estimated height of the menu without scrollbars.
      // This is useful for smaller menus, where there might be plenty of room
      // below the button without setting dropup, but we can't know
      // the exact height of the menu until createView is called later
      estimate = liHeight * this.selectpicker.current.data.length + menuPadding.vert;

      isDropup =
        this.sizeInfo.selectOffsetTop - this.sizeInfo.selectOffsetBot > this.sizeInfo.menuExtras.vert &&
        estimate + this.sizeInfo.menuExtras.vert + 50 > this.sizeInfo.selectOffsetBot;

      // ensure dropup doesn't change while searching (so menu doesn't bounce back and forth)
      if (this.selectpicker.isSearching === true) {
        isDropup = this.selectpicker.dropup;
      }

      this.$newElement?.classList.toggle(classNames.DROPUP, isDropup);
      this.selectpicker.dropup = isDropup;
    }

    if (this.options.size === 'auto') {
      _minHeight = this.selectpicker.current.data.length > 3 ? this.sizeInfo.liHeight * 3 + this.sizeInfo.menuExtras.vert - 2 : 0;
      menuHeight = this.sizeInfo.selectOffsetBot - this.sizeInfo.menuExtras.vert;
      minHeight = _minHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight;
      menuInnerMinHeight = Math.max(_minHeight - menuPadding.vert, 0);

      if (this.$newElement?.classList.contains(classNames.DROPUP)) {
        menuHeight = this.sizeInfo.selectOffsetTop - this.sizeInfo.menuExtras.vert;
      }

      maxHeight = menuHeight;
      menuInnerHeight = menuHeight - headerHeight - searchHeight - actionsHeight - doneButtonHeight - menuPadding.vert;
    } else if (this.options.size && this.options.size != 'auto' && this.selectpicker.current.elements.length > this.options.size) {
      for (let i = 0; i < this.options.size; i++) {
        if (this.selectpicker.current.data[i].type === 'divider') divLength++;
      }

      menuHeight = liHeight * this.options.size + divLength * divHeight + menuPadding.vert;
      menuInnerHeight = menuHeight - menuPadding.vert;
      maxHeight = menuHeight + headerHeight + searchHeight + actionsHeight + doneButtonHeight;
      minHeight = menuInnerMinHeight = '';
    }

    this.$menu.style.maxHeight = maxHeight + 'px';
    this.$menu.style.overflow = 'hidden';
    this.$menu.style.minHeight = minHeight + 'px';

    this.$menuInner.style.maxHeight = menuInnerHeight + 'px';
    this.$menuInner.style.overflow = 'hidden auto';
    this.$menuInner.style.minHeight = menuInnerMinHeight + 'px';

    // ensure menuInnerHeight is always a positive number to prevent issues calculating chunkSize in createView
    this.sizeInfo.menuInnerHeight = Math.max(menuInnerHeight, 1);

    if (
      this.selectpicker.current.data.length &&
      this.selectpicker.current.data[this.selectpicker.current.data.length - 1].position > this.sizeInfo.menuInnerHeight
    ) {
      this.sizeInfo.hasScrollBar = true;
      this.sizeInfo.totalMenuWidth = this.sizeInfo.menuWidth + this.sizeInfo.scrollBarWidth;
    }

    if (this.options.dropdownAlignRight === 'auto') {
      this.$menu.toggleClass(
        classNames.MENURIGHT,
        this.sizeInfo.selectOffsetLeft > this.sizeInfo.selectOffsetRight && this.sizeInfo.selectOffsetRight < this.sizeInfo.totalMenuWidth - selectWidth
      );
    }

    if (this.dropdown && this.dropdown._popper) this.dropdown._popper.update();
  }

  setSize(refresh) {
    this.liHeight(refresh);

    if (this.options.header) this.$menu.css('padding-top', 0);

    if (this.options.size !== false) {
      let that = this,
        $window = $(window);

      this.setMenuSize();

      if (this.options.liveSearch) {
        this.$searchbox.off('input.setMenuSize propertychange.setMenuSize').on('input.setMenuSize propertychange.setMenuSize', function () {
          return that.setMenuSize();
        });
      }

      if (this.options.size === 'auto') {
        $window
          .off('resize' + EVENT_KEY + '.' + this.selectId + '.setMenuSize' + ' scroll' + EVENT_KEY + '.' + this.selectId + '.setMenuSize')
          .on('resize' + EVENT_KEY + '.' + this.selectId + '.setMenuSize' + ' scroll' + EVENT_KEY + '.' + this.selectId + '.setMenuSize', function () {
            return that.setMenuSize();
          });
      } else if (this.options.size && this.options.size != 'auto' && this.selectpicker.current.elements.length > this.options.size) {
        $window.off('resize' + EVENT_KEY + '.' + this.selectId + '.setMenuSize' + ' scroll' + EVENT_KEY + '.' + this.selectId + '.setMenuSize');
      }
    }

    this.createView(false, true, refresh);
  }

  setWidth() {
    let that = this;

    if (this.options.width === 'auto') {
      requestAnimationFrame(function () {
        that.$menu.style.minWidth = 0;

        // that.$element?.addEventListener('loaded' + EVENT_KEY, function () {
        that.liHeight();
        that.setMenuSize();

        // Get correct width if element is hidden
        let $selectClone = that.$newElement.cloneNode(true) as HTMLElement;

        document.body.append($selectClone);

        const btnWidth = $selectClone.querySelector('button')?.clientHeight;
        $selectClone.style.width = 'auto';

        $selectClone.remove();

        // Set width to whatever's larger, button title or longest option
        that.sizeInfo.selectWidth = Math.max(that.sizeInfo.totalMenuWidth, btnWidth);
        that.$newElement.css('width', that.sizeInfo.selectWidth + 'px');
        // });
      });
    } else if (this.options.width === 'fit') {
      // Remove inline min-width so width can be changed from 'auto'
      this.$menu.css('min-width', '');
      this.$newElement.css('width', '').addClass('fit-width');
    } else if (this.options.width) {
      // Remove inline min-width so width can be changed from 'auto'
      this.$menu.css('min-width', '');
      this.$newElement.css('width', this.options.width);
    } else {
      // Remove inline min-width/width so width can be changed
      this.$menu.style.minWidth = '';
      this.$newElement.style.width = '';
    }
    // Remove fit-width class if width is changed programmatically
    if (this.$newElement.classList.contains('fit-width') && this.options.width !== 'fit') {
      this.$newElement.classList.remove('fit-width');
    }
  }

  selectPosition() {
    this.$bsContainer = $('<div class="bs-container" />');

    let that = this,
      $container = $(this.options.container),
      pos,
      containerPos,
      actualHeight,
      getPlacement = function ($element) {
        let containerPosition = {},
          // fall back to dropdown's default display setting if display is not manually set
          display =
            that.options.display ||
            // Bootstrap 3 doesn't have $.fn.dropdown.Constructor.Default
            ($.fn.dropdown.Constructor.Default ? $.fn.dropdown.Constructor.Default.display : false);

        that.$bsContainer
          .addClass($element.attr('class').replace(/form-control|fit-width/gi, ''))
          .toggleClass(classNames.DROPUP, $element.hasClass(classNames.DROPUP));
        pos = $element.offset();

        if (!$container.is('body')) {
          containerPos = $container.offset();
          containerPos.top += parseInt($container.css('borderTopWidth')) - $container.scrollTop();
          containerPos.left += parseInt($container.css('borderLeftWidth')) - $container.scrollLeft();
        } else {
          containerPos = { top: 0, left: 0 };
        }

        actualHeight = $element.hasClass(classNames.DROPUP) ? 0 : $element.offsetHeight;

        // Bootstrap 4+ uses Popper for menu positioning
        if (version.major < 4 || display === 'static') {
          containerPosition.top = pos.top - containerPos.top + actualHeight;
          containerPosition.left = pos.left - containerPos.left;
        }

        containerPosition.width = $element.offsetWidth;

        that.$bsContainer.css(containerPosition);
      };

    this.$button.on('click.bs.dropdown.data-api', function () {
      if (that.isDisabled()) {
        return;
      }

      getPlacement(that.$newElement);

      that.$bsContainer.appendTo(that.options.container).toggleClass(classNames.SHOW, !that.$button.hasClass(classNames.SHOW)).append(that.$menu);
    });

    $(window)
      .off('resize' + EVENT_KEY + '.' + this.selectId + ' scroll' + EVENT_KEY + '.' + this.selectId)
      .on('resize' + EVENT_KEY + '.' + this.selectId + ' scroll' + EVENT_KEY + '.' + this.selectId, function () {
        let isActive = that.$newElement.hasClass(classNames.SHOW);

        if (isActive) getPlacement(that.$newElement);
      });

    this.$element.on('hide' + EVENT_KEY, function () {
      that.$menu.data('height', that.$menu.height());
      that.$bsContainer.detach();
    });
  }

  createOption(data, init) {
    let optionData = !data.option ? data : data.option;

    if (optionData && optionData.nodeType !== 1) {
      let option = (init ? elementTemplates.selectedOption : elementTemplates.option).cloneNode(true);
      if (optionData.value !== undefined) option.value = optionData.value;
      option.textContent = optionData.text;

      option.selected = true;

      if (optionData.liIndex !== undefined) {
        option.liIndex = optionData.liIndex;
      } else if (!init) {
        option.liIndex = data.index;
      }

      data.option = option;

      this.selectpicker.main.optionQueue.appendChild(option);
    }
  }

  setOptionStatus(selectedOnly) {
    let that = this;

    that.noScroll = false;

    if (that.selectpicker.view.visibleElements && that.selectpicker.view.visibleElements.length) {
      for (let i = 0; i < that.selectpicker.view.visibleElements.length; i++) {
        let liData = that.selectpicker.current.data[i + that.selectpicker.view.position0],
          option = liData.option;

        if (option) {
          if (selectedOnly !== true) {
            that.setDisabled(liData);
          }

          that.setSelected(liData);
        }
      }

      // append optionQueue (documentFragment with option elements for select options)
      if (this.options.source.data) this.$element.appendChild(this.selectpicker.main.optionQueue);
    }
  }

  /**
   * @param {Object} liData - the option object that is being changed
   * @param {boolean} selected - true if the option is being selected, false if being deselected
   */
  setSelected(liData, selected) {
    selected = selected === undefined ? liData.selected : selected;

    let li = liData.element,
      activeElementIsSet = this.activeElement !== undefined,
      thisIsActive = this.activeElement === li,
      prevActive,
      a,
      // if current option is already active
      // OR
      // if the current option is being selected, it's NOT multiple, and
      // activeElement is undefined:
      //  - when the menu is first being opened, OR
      //  - after a search has been performed, OR
      //  - when retainActive is false when selecting a new option (i.e. index of the newly selected option is not the same as the current activeElement)
      keepActive = thisIsActive || (selected && !this.multiple && !activeElementIsSet);

    if (!li) return;

    if (selected !== undefined) {
      liData.selected = selected;
      if (liData.option) liData.option.selected = selected;
    }

    if (selected && this.options.source.data) {
      this.createOption(liData, false);
    }

    a = li.firstChild;

    if (selected) {
      this.selectedElement = li;
    }

    li.classList.toggle('selected', selected);

    if (keepActive) {
      this.focusItem(li, liData);
      this.selectpicker.view.currentActive = li;
      this.activeElement = li;
    } else {
      this.defocusItem(li);
    }

    if (a) {
      a.classList.toggle('selected', selected);

      if (selected) {
        a.setAttribute('aria-selected', true);
      } else {
        if (this.multiple) {
          a.setAttribute('aria-selected', false);
        } else {
          a.removeAttribute('aria-selected');
        }
      }
    }

    if (!keepActive && !activeElementIsSet && selected && this.prevActiveElement !== undefined) {
      prevActive = this.prevActiveElement;

      this.defocusItem(prevActive);
    }
  }

  /**
   * @param {number} index - the index of the option that is being disabled
   * @param {boolean} disabled - true if the option is being disabled, false if being enabled
   */
  setDisabled(liData) {
    let disabled = liData.disabled,
      li = liData.element,
      a;

    if (!li) return;

    a = li.firstChild;

    li.classList.toggle(classNames.DISABLED, disabled);

    if (a) {
      if (version.major >= '4') a.classList.toggle(classNames.DISABLED, disabled);

      if (disabled) {
        a.setAttribute('aria-disabled', disabled);
        a.setAttribute('tabindex', -1);
      } else {
        a.removeAttribute('aria-disabled');
        a.setAttribute('tabindex', 0);
      }
    }
  }

  isDisabled() {
    return this.$element.disabled;
  }

  checkDisabled() {
    if (this.isDisabled()) {
      this.$newElement.classList.add(classNames.DISABLED);
      this.$button.addClass(classNames.DISABLED).attr('aria-disabled', true);
    } else {
      if (this.$button.classList.contains(classNames.DISABLED)) {
        this.$newElement.classList.remove(classNames.DISABLED);
        this.$button.removeClass(classNames.DISABLED).attr('aria-disabled', false);
      }
    }
  }

  clickListener() {
    let that = this;

    this.$button.addEventListener('keyup', function (e) {
      if (/(32)/.test(e.keyCode.toString(10))) {
        e.preventDefault();
      }
    });

    this.$newElement.addEventListener('show.bs.dropdown', function () {
      if (!that.dropdown && version.major === '4') {
        that.dropdown = that.$button.dataset.bsDropdown;
        that.dropdown._menu = that.$menu;
      }
    });

    function clearSelection(e) {
      if (that.multiple) {
        that.deselectAll();
      } else {
        let element = that.$element,
          prevValue = element.value,
          prevIndex = element.selectedIndex,
          prevOption = element.options[prevIndex],
          prevData = prevOption ? that.selectpicker.main.data[prevOption.liIndex] : false;

        if (prevData) {
          that.setSelected(prevData, false);
        }

        element.selectedIndex = 0;

        changedArguments = [prevIndex, false, prevValue];
        that.$element.triggerNative('change');
      }

      // remove selected styling if menu is open
      if (that.$newElement.hasClass(classNames.SHOW)) {
        if (that.options.liveSearch) {
          that.$searchbox.trigger('focus');
        }

        that.createView(false);
      }
    }

    this.$button.addEventListener('click.bs.dropdown.data-api', function (e) {
      if (that.options.allowClear) {
        let target = e.target,
          clearButton = that.$clearButton;

        // IE doesn't support event listeners on child elements of buttons
        if (/MSIE|Trident/.test(window.navigator.userAgent)) {
          target = document.elementFromPoint(e.clientX, e.clientY);
        }

        if (target === clearButton || target.parentElement === clearButton) {
          e.stopImmediatePropagation();
          clearSelection(e);
        }
      }

      if (!that.$newElement.hasClass(classNames.SHOW)) {
        that.setSize();
      }
    });

    function setFocus() {
      if (that.options.liveSearch) {
        that.$searchbox?.focus();
      } else {
        that.$menuInner?.focus();
      }
    }

    function checkPopperExists() {
      if (that.dropdown && that.dropdown._popper && that.dropdown._popper.state) {
        setFocus();
      } else {
        requestAnimationFrame(checkPopperExists);
      }
    }

    this.$element.addEventListener('shown' + EVENT_KEY, function () {
      if (that.$menuInner.scrollTop !== that.selectpicker.view.scrollTop) {
        that.$menuInner.scrollTop = that.selectpicker.view.scrollTop;
      }

      if (version.major > 3) {
        requestAnimationFrame(checkPopperExists);
      } else {
        setFocus();
      }
    });

    // ensure posinset and setsize are correct before selecting an option via a click
    const $items = this.$menuInner.querySelectorAll('li a');

    $items.forEach(function ($item) {
      $item.addEventListener('mouseenter', function (e) {
        let hoverLi = this.parentElement,
          position0 = that.isVirtual() ? that.selectpicker.view.position0 : 0,
          index = Array.prototype.indexOf.call(hoverLi.parentElement.children, hoverLi),
          hoverData = that.selectpicker.current.data[index + position0];

        that.focusItem(hoverLi, hoverData, true);
      });
    });

    $items.forEach(function ($item) {
      $item.addEventListener('click', function (e, retainActive) {
        let $this = $(this),
          element = that.$element,
          position0 = that.isVirtual() ? that.selectpicker.view.position0 : 0,
          clickedData = that.selectpicker.current.data[$this.parent().index() + position0],
          clickedElement = clickedData.element,
          prevValue = this.getSelectValues.call(that),
          prevIndex = element.selectedIndex,
          prevOption = element.options[prevIndex],
          prevData = prevOption ? that.selectpicker.main.data[prevOption.liIndex] : false,
          triggerChange = true;

        // Don't close on multi choice menu
        if (that.multiple && that.options.maxOptions !== 1) {
          e.stopPropagation();
        }

        e.preventDefault();

        // Don't run if the select is disabled
        if (!that.isDisabled() && !$this.parent().hasClass(classNames.DISABLED)) {
          let option = clickedData.option,
            $option = $(option),
            state = option.selected,
            optgroupData = that.selectpicker.current.data.find(function (datum) {
              return datum.optID === clickedData.optID && datum.type === 'optgroup-label';
            }),
            optgroup = optgroupData ? optgroupData.optgroup : undefined,
            dataGetter = optgroup instanceof Element ? getOptionData.fromOption : getOptionData.fromDataSource,
            optgroupOptions = optgroup && optgroup.children,
            maxOptions = parseInt(that.options.maxOptions),
            maxOptionsGrp = (optgroup && parseInt(dataGetter(optgroup, 'maxOptions'))) || false;

          if (clickedElement === that.activeElement) retainActive = true;

          if (!retainActive) {
            that.prevActiveElement = that.activeElement;
            that.activeElement = undefined;
          }

          if (!that.multiple || maxOptions === 1) {
            // Deselect previous option if not multi select
            if (prevData) that.setSelected(prevData, false);
            that.setSelected(clickedData, true);
          } else {
            // Toggle the clicked option if multi select.
            that.setSelected(clickedData, !state);
            that.focusedParent.focus();

            if (maxOptions !== false || maxOptionsGrp !== false) {
              let maxReached = maxOptions < this.getSelectedOptions.call(that).length,
                selectedGroupOptions = 0;

              if (optgroup && optgroup.children) {
                for (let i = 0; i < optgroup.children.length; i++) {
                  if (optgroup.children[i].selected) selectedGroupOptions++;
                }
              }

              let maxReachedGrp = maxOptionsGrp < selectedGroupOptions;

              if ((maxOptions && maxReached) || (maxOptionsGrp && maxReachedGrp)) {
                if (maxOptions && maxOptions === 1) {
                  element.selectedIndex = -1;
                  that.setOptionStatus(true);
                } else if (maxOptionsGrp && maxOptionsGrp === 1) {
                  for (let i = 0; i < optgroupOptions.length; i++) {
                    let _option = optgroupOptions[i];
                    that.setSelected(that.selectpicker.current.data[_option.liIndex], false);
                  }

                  that.setSelected(clickedData, true);
                } else {
                  let maxOptionsText =
                      typeof that.options.maxOptionsText === 'string'
                        ? [that.options.maxOptionsText, that.options.maxOptionsText]
                        : that.options.maxOptionsText,
                    maxOptionsArr = typeof maxOptionsText === 'function' ? maxOptionsText(maxOptions, maxOptionsGrp) : maxOptionsText,
                    maxTxt = maxOptionsArr[0].replace('{n}', maxOptions),
                    maxTxtGrp = maxOptionsArr[1].replace('{n}', maxOptionsGrp),
                    $notify = createElementFromHTML('<div class="notify"></div>');
                  // If {let} is set in array, replace it
                  /** @deprecated */
                  if (maxOptionsArr[2]) {
                    maxTxt = maxTxt.replace('{let}', maxOptionsArr[2][maxOptions > 1 ? 0 : 1]);
                    maxTxtGrp = maxTxtGrp.replace('{let}', maxOptionsArr[2][maxOptionsGrp > 1 ? 0 : 1]);
                  }

                  that.$menu.append($notify);

                  if (maxOptions && maxReached) {
                    $notify.append($('<div>' + maxTxt + '</div>'));
                    triggerChange = false;
                    that.$element.trigger('maxReached' + EVENT_KEY);
                  }

                  if (maxOptionsGrp && maxReachedGrp) {
                    $notify.append($('<div>' + maxTxtGrp + '</div>'));
                    triggerChange = false;
                    that.$element.trigger('maxReachedGrp' + EVENT_KEY);
                  }

                  setTimeout(function () {
                    that.setSelected(clickedData, false);
                  }, 10);

                  $notify.classList.add('fadeOut');

                  setTimeout(function () {
                    $notify.remove();
                  }, 1050);
                }
              }
            }
          }

          if (that.options.source.data) that.$element.appendChild(that.selectpicker.main.optionQueue);

          if (!that.multiple || (that.multiple && that.options.maxOptions === 1)) {
            that.$button.trigger('focus');
          } else if (that.options.liveSearch) {
            that.$searchbox.trigger('focus');
          }

          // Trigger select 'change'
          if (triggerChange) {
            if (that.multiple || prevIndex !== element.selectedIndex) {
              // $option.prop('selected') is current option state (selected/unselected). prevValue is the value of the select prior to being changed.
              changedArguments = [option.index, $option.prop('selected'), prevValue];
              that.$element.triggerNative('change');
            }
          }
        }
      });
    });

    const $els = this.$menu.querySelectorAll(
      'li.' + classNames.DISABLED + ' a, .' + classNames.POPOVERHEADER + ', .' + classNames.POPOVERHEADER + ' :not(.close)'
    );
    $els.forEach(($el) => {
      $el.addEventListener('click', function (e) {
        if (e.currentTarget == this) {
          e.preventDefault();
          e.stopPropagation();
          if (that.options.liveSearch && !$(e.target).hasClass('close')) {
            that.$searchbox.trigger('focus');
          } else {
            that.$button.trigger('focus');
          }
        }
      });
    });

    const $targets = this.$menuInner.querySelectorAll('.divider, .dropdown-header');

    $targets.forEach(($target) => {
      $target.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (that.options.liveSearch) {
          that.$searchbox.trigger('focus');
        } else {
          that.$button.trigger('focus');
        }
      });
    });

    const $popoverClose = this.$menu.querySelector('.' + classNames.POPOVERHEADER + ' .close');

    if ($popoverClose) {
      $popoverClose.addEventListener('click', function () {
        that.$button.trigger('click');
      });
    }

    if (this.$searchbox) {
      this.$searchbox.addEventListener('click', function (e) {
        e.stopPropagation();
      });
    }

    const $actionButtons = this.$menu.querySelectorAll('.actions-btn');

    $actionButtons.forEach(($btn) => {
      $btn.addEventListener('click', function (e) {
        if (that.options.liveSearch) {
          that.$searchbox.trigger('focus');
        } else {
          that.$button.trigger('focus');
        }

        e.preventDefault();
        e.stopPropagation();

        if ($(this).hasClass('bs-select-all')) {
          that.selectAll();
        } else {
          that.deselectAll();
        }
      });
    });

    this.$button.addEventListener('focus' + EVENT_KEY, function (e) {
      let tabindex = that.$element.getAttribute('tabindex');

      // only change when button is actually focused
      if (tabindex !== undefined && e.originalEvent && e.originalEvent.isTrusted) {
        // apply select element's tabindex to ensure correct order is followed when tabbing to the next element
        this.setAttribute('tabindex', tabindex);
        // set element's tabindex to -1 to allow for reverse tabbing
        that.$element.setAttribute('tabindex', -1);
        that.selectpicker.view.tabindex = tabindex;
      }
    });
    this.$button.addEventListener('blur' + EVENT_KEY, function (e) {
      // revert everything to original tabindex
      if (that.selectpicker.view.tabindex !== undefined && e.originalEvent && e.originalEvent.isTrusted) {
        that.$element.setAttribute('tabindex', that.selectpicker.view.tabindex);
        this.setAttribute('tabindex', -1);
        that.selectpicker.view.tabindex = undefined;
      }
    });

    this.$element.addEventListener('change' + EVENT_KEY, function () {
      that.render();
      that.$element.trigger('changed' + EVENT_KEY, changedArguments);
      changedArguments = null;
    });
    this.$element.addEventListener('focus' + EVENT_KEY, function () {
      if (!that.options.mobile) that.$button.focus();
    });
  }

  liveSearchListener() {
    let that = this;

    this.$button.on('click.bs.dropdown.data-api', function () {
      if (!!that.$searchbox.val()) {
        that.$searchbox.val('');
        that.selectpicker.search.previousValue = undefined;
      }
    });

    this.$searchbox.on('click.bs.dropdown.data-api focus.bs.dropdown.data-api touchend.bs.dropdown.data-api', function (e) {
      e.stopPropagation();
    });

    this.$searchbox.on('input propertychange', function () {
      let searchValue = that.$searchbox.value;

      that.selectpicker.search.elements = [];
      that.selectpicker.search.data = [];

      if (searchValue) {
        that.selectpicker.search.previousValue = searchValue;

        if (that.options.source.search) {
          that.fetchData(
            function (builtData) {
              that.render();
              that.buildList(undefined, true);
              that.noScroll = true;
              that.$menuInner.scrollTop(0);
              that.createView(true);
              showNoResults.call(that, builtData, searchValue);
            },
            'search',
            0,
            searchValue
          );
        } else {
          let i,
            searchMatch = [],
            q = searchValue.toUpperCase(),
            cache = {},
            cacheArr = [],
            searchStyle = that._searchStyle(),
            normalizeSearch = that.options.liveSearchNormalize;

          if (normalizeSearch) q = normalizeToBase(q);

          for (let i = 0; i < that.selectpicker.main.data.length; i++) {
            let li = that.selectpicker.main.data[i];

            if (!cache[i]) {
              cache[i] = stringSearch(li, q, searchStyle, normalizeSearch);
            }

            if (cache[i] && li.headerIndex !== undefined && cacheArr.indexOf(li.headerIndex) === -1) {
              if (li.headerIndex > 0) {
                cache[li.headerIndex - 1] = true;
                cacheArr.push(li.headerIndex - 1);
              }

              cache[li.headerIndex] = true;
              cacheArr.push(li.headerIndex);

              cache[li.lastIndex + 1] = true;
            }

            if (cache[i] && li.type !== 'optgroup-label') cacheArr.push(i);
          }

          for (let i = 0, cacheLen = cacheArr.length; i < cacheLen; i++) {
            let index = cacheArr[i],
              prevIndex = cacheArr[i - 1],
              li = that.selectpicker.main.data[index],
              liPrev = that.selectpicker.main.data[prevIndex];

            if (li.type !== 'divider' || (li.type === 'divider' && liPrev && liPrev.type !== 'divider' && cacheLen - 1 !== i)) {
              that.selectpicker.search.data.push(li);
              searchMatch.push(that.selectpicker.main.elements[index]);
            }
          }

          that.activeElement = undefined;
          that.noScroll = true;
          that.$menuInner.scrollTop(0);
          that.selectpicker.search.elements = searchMatch;
          that.createView(true);
          showNoResults.call(that, searchMatch, searchValue);
        }
      } else if (that.selectpicker.search.previousValue) {
        // for IE11 (#2402)
        that.$menuInner.scrollTop(0);
        that.createView(false);
      }
    });
  }

  _searchStyle() {
    return this.options.liveSearchStyle || 'contains';
  }

  val(value) {
    let element = this.$element;

    if (typeof value !== 'undefined') {
      let selectedOptions = this.getSelectedOptions.call(this),
        prevValue = this.getSelectValues.call(this, selectedOptions);

      changedArguments = [null, null, prevValue];

      if (!Array.isArray(value)) value = [value];

      value.map(String);

      for (const element of selectedOptions) {
        let item = element;

        if (item && value.indexOf(String(item.value)) === -1) {
          this.setSelected(item, false);
        }
      }

      // only update selected value if it matches an existing option
      this.selectpicker.main.data.filter(function (item) {
        if (value.indexOf(String(item.value)) !== -1) {
          this.setSelected(item, true);
          return true;
        }

        return false;
      }, this);

      if (this.options.source.data) element.appendChild(this.selectpicker.main.optionQueue);

      this.$element.trigger('changed' + EVENT_KEY, changedArguments);

      if (this.$newElement.hasClass(classNames.SHOW)) {
        if (this.multiple) {
          this.setOptionStatus(true);
        } else {
          let liSelectedIndex = (element.options[element.selectedIndex] || {}).liIndex;

          if (typeof liSelectedIndex === 'number') {
            this.setSelected(this.selectpicker.current.data[liSelectedIndex], true);
          }
        }
      }

      this.render();

      changedArguments = null;

      return this.$element;
    } else {
      return this.$element.val();
    }
  }

  getSelectedOptions() {
    var options = this.selectpicker.main.data;

    if (this.options.source.data || this.options.source.search) {
      options = Object.values(this.selectpicker.optionValuesDataMap);
    }

    var selectedOptions = options.filter(function (item) {
      if (item.selected) {
        if (this.options.hideDisabled && item.disabled) return false;
        return true;
      }

      return false;
    }, this);

    // ensure only 1 option is selected if multiple are set in the data source
    if (this.options.source.data && !this.multiple && selectedOptions.length > 1) {
      for (var i = 0; i < selectedOptions.length - 1; i++) {
        selectedOptions[i].selected = false;
      }

      selectedOptions = [selectedOptions[selectedOptions.length - 1]];
    }

    return selectedOptions;
  }

  // much faster than $.val()
  getSelectValues(selectedOptions) {}

  changeAll(status) {
    if (!this.multiple) return;
    if (typeof status === 'undefined') status = true;

    let element = this.$element,
      previousSelected = 0,
      currentSelected = 0,
      prevValue = this.getSelectValues.call(this);

    element.classList.add('bs-select-hidden');

    for (let i = 0, data = this.selectpicker.current.data, len = data.length; i < len; i++) {
      let liData = data[i],
        option = liData.option;

      if (option && !liData.disabled && liData.type !== 'divider') {
        if (liData.selected) previousSelected++;
        option.selected = status;
        liData.selected = status;
        if (status === true) currentSelected++;
      }
    }

    element.classList.remove('bs-select-hidden');

    if (previousSelected === currentSelected) return;

    this.setOptionStatus();

    changedArguments = [null, null, prevValue];

    this.$element.triggerNative('change');
  }

  selectAll() {
    return this.changeAll(true);
  }

  deselectAll() {
    return this.changeAll(false);
  }

  toggle(e, state) {
    let isActive,
      triggerClick = state === undefined;

    e = e || window.event;

    if (e) e.stopPropagation();

    if (triggerClick === false) {
      isActive = this.$newElement.classList.contains(classNames.SHOW);
      triggerClick = (state === true && isActive === false) || (state === false && isActive === true);
    }

    if (triggerClick) this.$button.trigger('click.bs.dropdown.data-api');
  }

  open(e) {
    this.toggle(e, true);
  }

  close(e) {
    this.toggle(e, false);
  }

  keydown(e) {
    let $this = $(this),
      isToggle = $this.hasClass('dropdown-toggle'),
      $parent = isToggle ? $this.closest('.dropdown') : $this.closest(Selector.MENU),
      that = $parent.data('this'),
      $items = that.findLis(),
      index,
      isActive,
      liActive,
      activeLi,
      offset,
      updateScroll = false,
      downOnTab = e.which === keyCodes.TAB && !isToggle && !that.options.selectOnTab,
      isArrowKey = REGEXP_ARROW.test(e.which) || downOnTab,
      scrollTop = that.$menuInner.scrollTop,
      isVirtual = that.isVirtual(),
      position0 = isVirtual === true ? that.selectpicker.view.position0 : 0;

    // do nothing if a function key is pressed
    if (e.which >= 112 && e.which <= 123) return;

    isActive = that.$menu.hasClass(classNames.SHOW);

    if (!isActive && (isArrowKey || (e.which >= 48 && e.which <= 57) || (e.which >= 96 && e.which <= 105) || (e.which >= 65 && e.which <= 90))) {
      that.$button.trigger('click.bs.dropdown.data-api');

      if (that.options.liveSearch) {
        that.$searchbox.trigger('focus');
        return;
      }
    }

    if (e.which === keyCodes.ESCAPE && isActive) {
      e.preventDefault();
      that.$button.trigger('click.bs.dropdown.data-api').trigger('focus');
    }

    if (isArrowKey) {
      // if up or down
      if (!$items.length) return;

      liActive = that.activeElement;
      index = liActive ? Array.prototype.indexOf.call(liActive.parentElement.children, liActive) : -1;

      if (index !== -1) {
        that.defocusItem(liActive);
      }

      if (e.which === keyCodes.ARROW_UP) {
        // up
        if (index !== -1) index--;
        if (index + position0 < 0) index += $items.length;

        if (!that.selectpicker.view.canHighlight[index + position0]) {
          index = that.selectpicker.view.canHighlight.slice(0, index + position0).lastIndexOf(true) - position0;
          if (index === -1) index = $items.length - 1;
        }
      } else if (e.which === keyCodes.ARROW_DOWN || downOnTab) {
        // down
        index++;
        if (index + position0 >= that.selectpicker.view.canHighlight.length) index = that.selectpicker.view.firstHighlightIndex;

        if (!that.selectpicker.view.canHighlight[index + position0]) {
          index = index + 1 + that.selectpicker.view.canHighlight.slice(index + position0 + 1).indexOf(true);
        }
      }

      e.preventDefault();

      let liActiveIndex = position0 + index;

      if (e.which === keyCodes.ARROW_UP) {
        // up
        // scroll to bottom and highlight last option
        if (position0 === 0 && index === $items.length - 1) {
          that.$menuInner.scrollTop = that.$menuInner.scrollHeight;

          liActiveIndex = that.selectpicker.current.elements.length - 1;
        } else {
          activeLi = that.selectpicker.current.data[liActiveIndex];

          // could be undefined if no results exist
          if (activeLi) {
            offset = activeLi.position - activeLi.height;

            updateScroll = offset < scrollTop;
          }
        }
      } else if (e.which === keyCodes.ARROW_DOWN || downOnTab) {
        // down
        // scroll to top and highlight first option
        if (index === that.selectpicker.view.firstHighlightIndex) {
          that.$menuInner.scrollTop = 0;

          liActiveIndex = that.selectpicker.view.firstHighlightIndex;
        } else {
          activeLi = that.selectpicker.current.data[liActiveIndex];

          // could be undefined if no results exist
          if (activeLi) {
            offset = activeLi.position - that.sizeInfo.menuInnerHeight;

            updateScroll = offset > scrollTop;
          }
        }
      }

      liActive = that.selectpicker.current.elements[liActiveIndex];

      that.activeElement = (that.selectpicker.current.data[liActiveIndex] || {}).element;

      that.focusItem(liActive);

      that.selectpicker.view.currentActive = liActive;

      if (updateScroll) that.$menuInner.scrollTop = offset;

      if (that.options.liveSearch) {
        that.$searchbox.trigger('focus');
      } else {
        $this.trigger('focus');
      }
    } else if ((!$this.is('input') && !REGEXP_TAB_OR_ESCAPE.test(e.which)) || (e.which === keyCodes.SPACE && that.selectpicker.keydown.keyHistory)) {
      let searchMatch,
        matches = [],
        keyHistory;

      e.preventDefault();

      that.selectpicker.keydown.keyHistory += keyCodeMap[e.which];

      if (that.selectpicker.keydown.resetKeyHistory.cancel) clearTimeout(that.selectpicker.keydown.resetKeyHistory.cancel);
      that.selectpicker.keydown.resetKeyHistory.cancel = that.selectpicker.keydown.resetKeyHistory.start();

      keyHistory = that.selectpicker.keydown.keyHistory;

      // if all letters are the same, set keyHistory to just the first character when searching
      if (/^(.)\1+$/.test(keyHistory)) {
        keyHistory = keyHistory.charAt(0);
      }

      // find matches
      for (let i = 0; i < that.selectpicker.current.data.length; i++) {
        let li = that.selectpicker.current.data[i],
          hasMatch;

        hasMatch = stringSearch(li, keyHistory, 'startsWith', true);

        if (hasMatch && that.selectpicker.view.canHighlight[i]) {
          matches.push(li.element);
        }
      }

      if (matches.length) {
        let matchIndex = 0;

        $items.removeClass('active').find('a').removeClass('active');

        // either only one key has been pressed or they are all the same key
        if (keyHistory.length === 1) {
          matchIndex = matches.indexOf(that.activeElement);

          if (matchIndex === -1 || matchIndex === matches.length - 1) {
            matchIndex = 0;
          } else {
            matchIndex++;
          }
        }

        searchMatch = matches[matchIndex];

        activeLi = that.selectpicker.main.data[searchMatch];

        if (scrollTop - activeLi.position > 0) {
          offset = activeLi.position - activeLi.height;
          updateScroll = true;
        } else {
          offset = activeLi.position - that.sizeInfo.menuInnerHeight;
          // if the option is already visible at the current scroll position, just keep it the same
          updateScroll = activeLi.position > scrollTop + that.sizeInfo.menuInnerHeight;
        }

        liActive = that.selectpicker.main.elements[searchMatch];

        that.activeElement = liActive;

        that.focusItem(liActive);

        if (liActive) liActive.firstChild.focus();

        if (updateScroll) that.$menuInner.scrollTop = offset;

        $this.trigger('focus');
      }
    }

    // Select focused option if "Enter", "Spacebar" or "Tab" (when selectOnTab is true) are pressed inside the menu.
    if (
      isActive &&
      ((e.which === keyCodes.SPACE && !that.selectpicker.keydown.keyHistory) ||
        e.which === keyCodes.ENTER ||
        (e.which === keyCodes.TAB && that.options.selectOnTab))
    ) {
      if (e.which !== keyCodes.SPACE) e.preventDefault();

      if (!that.options.liveSearch || e.which !== keyCodes.SPACE) {
        that.$menuInner.find('.active a').trigger('click', true); // retain active class
        $this.trigger('focus');

        if (!that.options.liveSearch) {
          // Prevent screen from scrolling if the user hits the spacebar
          e.preventDefault();
        }
      }
    }
  }

  mobile() {
    // ensure mobile is set to true if mobile function is called after init
    this.options.mobile = true;
    this.$element.classList.add('mobile-device');
  }

  refresh() {
    let that = this;
    // update options if data attributes have been changed
    let config = $.extend({}, this.options, getAttributesObject(this.$element), this.$element.data()); // in this order on refresh, as user may change attributes on select, and options object is not passed on refresh
    this.options = config;

    if (this.options.source.data) {
      this.render();
      this.buildList();
    } else {
      this.fetchData(function () {
        that.render();
        that.buildList();
      });
    }

    this.checkDisabled();
    this.setStyle();
    this.setWidth();

    this.setSize(true);

    this.$element.trigger('refreshed' + EVENT_KEY);
  }

  hide() {
    this.$newElement.hide();
  }

  show() {
    this.$newElement.show();
  }

  remove() {
    this.$newElement.remove();
    this.$element.remove();
  }

  destroy() {
    this.$newElement.before(this.$element).remove();

    if (this.$bsContainer) {
      this.$bsContainer.remove();
    } else {
      this.$menu.remove();
    }

    if (this.selectpicker.view.titleOption && this.selectpicker.view.titleOption.parentNode) {
      this.selectpicker.view.titleOption.parentNode.removeChild(this.selectpicker.view.titleOption);
    }

    this.$element.off(EVENT_KEY).removeData('selectpicker').removeClass('bs-select-hidden selectpicker mobile-device');

    $(window).off(EVENT_KEY + '.' + this.selectId);
  }
}

// get Bootstrap's keydown event handler for either Bootstrap 4 or Bootstrap 3
// function keydownHandler(e) {
//   const { target } = e;

//   while (target && target.parentNode !== document) {
//     target = target.parentNode;
//     if (!target) { return; } // If element doesn't exist

//     if (!target.classList.contains('bootstrap-select')){
//         if (version.major < 5) {
//           if (bootstrap.Dropdown) {
//             // wait to define until function is called in case Bootstrap isn't loaded yet
//             let bootstrapKeydown =
//               bootstrap.Dropdown.Constructor._dataApiKeydownHandler ||
//               bootstrap.Dropdown.Constructor.prototype.keydown;
//             return bootstrapKeydown.apply(this, arguments);
//           }
//         } else {
//           return Dropdown.dataApiKeydownHandler;
//         }
//     }
// }
// }

// document.removeEventListener("keydown.bs.dropdown.data-api", keydownHandler);
// document.addEventListener(
//   "keydown.bs.dropdown.data-api",
//   // ":not(.bootstrap-select) > [" + Selector.DATA_TOGGLE + "]",
//   keydownHandler
// );
// document.addEventListener(
//   "keydown.bs.dropdown.data-api",
//   // ":not(.bootstrap-select) > .dropdown-menu",
//   keydownHandler
// );
// document.addEventListener(
//   "keydown" + EVENT_KEY,
//   ".bootstrap-select [" +
//     Selector.DATA_TOGGLE +
//     '], .bootstrap-select [role="listbox"], .bootstrap-select .bs-searchbox input',
//   Selectpicker.prototype.keydown
// );
// document.addEventListener(
//   "focusin.modal",
//   ".bootstrap-select [" +
//     Selector.DATA_TOGGLE +
//     '], .bootstrap-select [role="listbox"], .bootstrap-select .bs-searchbox input',
//   function (e) {
//     e.stopPropagation();
//   }
// );

// SELECTPICKER DATA-API
// =====================

// Initialise class selectpicker
document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.selectpicker').forEach(function ($selectpicker) {
    return new Selectpicker($selectpicker);
  });
});
