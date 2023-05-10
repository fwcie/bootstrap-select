"use strict";
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const EVENT_KEY = ".bs.select";
const classNames = {
  DIVIDER: "dropdown-divider",
  MENU: "dropdown-menu overflow-auto",
  MENU_TOP: "dropup",
  MENURIGHT: "dropdown-menu-right",
  MENULEFT: "dropdown-menu-left",
  // to-do: replace with more advanced template/customization options
  BUTTONCLASS: "btn btn-light border dropdown-toggle text-wrap d-flex align-items-center flex-grow-1 flex-shrink-1",
  POPOVERHEADER: "popover-header",
  OPTION: "dropdown-item",
  DONE_BUTTON: "bs-select-remove-item"
};
const DATA_ATTR = "data-bss";
const DefaultOptions = {
  noneSelectedText: "Nothing selected",
  noneResultsText: "No results matched {0}",
  noneValue: "?",
  countSelectedText(numSelected) {
    return numSelected == 1 ? `${numSelected} item selected` : `${numSelected} items selected`;
  },
  maxOptionsText(numAll, numGroup) {
    return [
      numAll == 1 ? "Limit reached ({n} item max)" : "Limit reached ({n} items max)",
      numGroup == 1 ? "Group limit reached ({n} item max)" : "Group limit reached ({n} items max)"
    ];
  },
  local: "en",
  selectAllText: "Select All",
  deselectAllText: "Deselect All",
  multipleSeparator: ", ",
  style: classNames.BUTTONCLASS,
  size: "auto",
  title: "",
  placeholder: "",
  allowClear: false,
  selectedTextFormat: "values",
  width: "auto",
  header: false,
  search: false,
  searchPlaceholder: "",
  normalizeSearch: false,
  actionsBox: false,
  showTick: false,
  template: {
    dropdownButton: function($el) {
      const style = $el.getAttribute("style") ? ` style=${$el.getAttribute("style")}` : "";
      return `<button${$el.disabled ? " disabled" : ""} class="${classNames.BUTTONCLASS + " " + $el.classList.value}"${style} type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="${$el.multiple ? "outside" : "true"}"></button>`;
    },
    serchInput: function() {
      return `
            <div class="px-2">
                <input type="search" class="form-control form-control-sm bs-select-search" />
            </div>`;
    },
    dropdownMenu: function() {
      return `<ul class="${classNames.MENU}"></ul>`;
    },
    stickyTop: function() {
      return `<div class="bg-body sticky-top pb-2 shadow-sm"></div>`;
    },
    header: function() {
      return `
            <h6 class="bg-light p-2 border-bottom rounded-top d-flex align-items-center justify-content-between">
                Dropdown header
                <button role="button" aria-label="close" type="button" class="btn-close float-end">
                </button>
            </h6>`;
    },
    optgroup: function($el) {
      return `<li><h6 class="dropdown-header">${$el.label || "Group"}</h6></li>`;
    },
    option: function($el, multiple = false) {
      const style = $el.getAttribute("style") !== "" ? ` style=${$el.getAttribute("style")}` : "";
      return `
            <li>
              <a class="dropdown-item${$el.disabled ? " disabled" : ""} ${$el.classList.value}"${style} ${DATA_ATTR}-value="${$el.value}" href="#">${$el.textContent}
              ${multiple ? `<span class="check-mark ms-2 float-end fw-bold opacity-0">&#10003;</span>` : ""}
              </a>
            </li>`;
    },
    divider: function() {
      return `<li class="dropdown-divider"></li>`;
    },
    checkMark: function() {
      return `<span class="check-mark"></span>`;
    }
  },
  maxOptions: false,
  mobile: false,
  selectOnTab: true,
  dropdownPosition: "auto",
  virtualScroll: 600
};
function toCamelCase(str) {
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) {
    return index === 0 ? word.toLowerCase() : word.toUpperCase();
  }).replace(/\s+/g, "");
}
function createElementFromString(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();
  return div.firstChild;
}
function toInteger(value) {
  return parseInt(value, 10) || 0;
}
function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}
function mergeDeep(target, source) {
  if (!source)
    return target;
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}
function readDataAttr($el) {
  const data = $el.dataset;
  const options = {};
  for (const key in data) {
    if (key.startsWith("bss") && key !== "bss") {
      const validKey = toCamelCase(key.replace("bss", ""));
      const value = data[key] === "" ? true : data[key];
      options[validKey] = value;
    }
  }
  return options;
}
function getTextContent($el, instanceSelect) {
  if (!$el.options) {
    return DefaultOptions.noneSelectedText;
  }
  const selected = $el.querySelectorAll("option:checked");
  const first = $el.options[0];
  const text = [];
  if (selected.length) {
    if ($el.multiple) {
      if (instanceSelect.options.selectedTextFormat.indexOf("count") !== -1) {
        const content = instanceSelect.options.countSelectedText(selected.length, selected.length);
        text.push(content);
        return text.join(DefaultOptions.multipleSeparator);
      } else {
        selected.forEach((opt) => {
          text.push(opt.textContent || DefaultOptions.noneValue);
        });
        return text.join(DefaultOptions.multipleSeparator);
      }
    } else {
      selected.forEach((opt) => {
        text.push(opt.textContent || DefaultOptions.noneValue);
      });
      return text.join(DefaultOptions.multipleSeparator);
    }
  } else {
    if ($el.multiple) {
      text.push(DefaultOptions.noneSelectedText);
    } else {
      text.push(first.textContent || DefaultOptions.noneSelectedText);
    }
    return text.join(DefaultOptions.multipleSeparator);
  }
}
function addClass(className, element) {
  if (className instanceof Array) {
    className.forEach((name) => {
      if (!element.classList.contains(name)) {
        element.classList.add(name);
      }
    });
  } else {
    if (!element.classList.contains(className)) {
      element.classList.add(className);
    }
  }
}
function removeClass(className, element) {
  if (className instanceof Array) {
    className.forEach((name) => {
      if (element.classList.contains(name)) {
        element.classList.remove(name);
      }
    });
  } else {
    if (element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }
}
class BootstrapSelect {
  constructor($element, options = DefaultOptions) {
    // HTML Element
    __publicField(this, "$select", document.createElement("select"));
    __publicField(this, "$btnDropdown", document.createElement("button"));
    __publicField(this, "$header", document.createElement("li"));
    __publicField(this, "$searchInput", document.createElement("li"));
    __publicField(this, "$dropdownMenu", document.createElement("ul"));
    __publicField(this, "options", DefaultOptions);
    __publicField(this, "optionsMap", []);
    __publicField(this, "id", "");
    __publicField(this, "values", []);
    const dataOptions = readDataAttr($element);
    options = mergeDeep(options, dataOptions);
    this.$select = $element;
    this.options = mergeDeep(this.options, options);
    this.id = this.$select.getAttribute("id") || "bs-select-" + Date.now();
    this.init();
  }
  init() {
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
  _createDropdown() {
    this.$btnDropdown = createElementFromString(this.options.template.dropdownButton(this.$select));
    this.$dropdownMenu = createElementFromString(this.options.template.dropdownMenu());
    let textContent = getTextContent(this.$select, this);
    if (textContent === this.options.noneSelectedText || textContent === this.options.noneValue) {
      addClass("text-muted", this.$btnDropdown);
    }
    if (textContent === this.options.noneValue && this.options.title !== "") {
      textContent = this.options.title;
    }
    this.$btnDropdown.innerHTML = `<span class="position-static float-start h-100 w-100 text-start overflow-hidden">${textContent}</span>`;
    if (this.$select.children.length > 0) {
      const stickyTop = createElementFromString(this.options.template.stickyTop());
      if (this.options.header) {
        this.$header = createElementFromString(this.options.template.header());
        this.$dropdownMenu.classList.add("pt-0");
        stickyTop.append(this.$header);
      }
      if (this.options.search) {
        this.$searchInput = createElementFromString(this.options.template.serchInput());
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
          if (!child.value && child.value === "")
            continue;
          const $opt = createElementFromString(this.options.template.option(child, this.$select.multiple));
          if (child.selected)
            this._setSelected($opt.querySelector("a"));
          if (child.selected)
            $opt.setAttribute("selected", "true");
          this.$dropdownMenu.append($opt);
        } else if (child instanceof HTMLOptGroupElement) {
          if (child.children.length > 0) {
            const groupClass = `optgroup-${countGroup}`;
            if (prevChild) {
              const $divider = createElementFromString(this.options.template.divider());
              this.$dropdownMenu.append($divider);
            }
            const $optGroup = createElementFromString(this.options.template.optgroup(child));
            $optGroup.classList.add(groupClass);
            this.$dropdownMenu.append($optGroup);
            for (const i2 in child.children) {
              const opt = child.children[i2];
              if (opt instanceof HTMLOptionElement) {
                if (!opt.value && opt.value === "")
                  continue;
                const $opt = createElementFromString(this.options.template.option(opt, this.$select.multiple));
                if (opt.selected)
                  this._setSelected($opt.querySelector("a"));
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
  _initHandler() {
    var _a, _b, _c;
    this.$dropdownMenu.querySelectorAll(`.${classNames.OPTION}`).forEach(($item) => {
      $item.addEventListener("click", this._onClickOption.bind(this));
    });
    if (this.options.search) {
      this.$btnDropdown.addEventListener("shown.bs.dropdown", () => {
        var _a2;
        (_a2 = this.$searchInput.querySelector("input")) == null ? void 0 : _a2.focus();
      });
      (_a = this.$searchInput.querySelector("input")) == null ? void 0 : _a.addEventListener("keyup", this.search.bind(this));
      (_b = this.$searchInput.querySelector("input")) == null ? void 0 : _b.addEventListener("search", this.search.bind(this));
    }
    if (MutationObserver) {
      const mutationObserver = new MutationObserver(this.refresh.bind(this));
      mutationObserver.observe(this.$select, { childList: true });
    }
    if (this.options.header) {
      (_c = this.$header.querySelector(".btn-close")) == null ? void 0 : _c.addEventListener("click", this.close.bind(this));
    }
  }
  _onClickOption(ev) {
    const $opt = ev.target;
    if (!$opt)
      return;
    this._manageOptionState($opt);
    this._changed();
  }
  _changed() {
    this._updateNative();
    this._updateBtnText();
    this._triggerNative("change");
  }
  _triggerNative(evName) {
    this.$select.dispatchEvent(new Event(evName));
  }
  _trigger(evName) {
    this.$btnDropdown.dispatchEvent(new CustomEvent(evName, { detail: this }));
  }
  _updateNative() {
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
  _removeValue(value) {
    if (this.values.indexOf(value) !== -1) {
      this.values.splice(this.values.indexOf(value), 1);
    }
  }
  _addValue(value) {
    if (this.values.indexOf(value) === -1) {
      this.values.push(value);
    }
  }
  _manageOptionState($opt) {
    if (this.$select.multiple) {
      if ($opt.getAttribute("aria-current") === "true") {
        this._unsetSelected($opt);
      } else {
        this._setSelected($opt);
      }
    } else {
      if ($opt.classList.contains("active")) {
        return;
      } else {
        const $active = this.$dropdownMenu.querySelector(".active");
        if ($active) {
          $active.classList.remove("active");
          $active.removeAttribute("aria-current");
          this._removeValue($active.dataset.bssValue);
        }
        this._setSelected($opt, true);
      }
    }
  }
  _setSelected($opt, single = false) {
    var _a;
    $opt.setAttribute("aria-current", "true");
    (_a = $opt.querySelector(".check-mark")) == null ? void 0 : _a.classList.remove("opacity-0");
    this._addValue($opt.dataset.bssValue);
    if (single)
      $opt.classList.add("active");
  }
  _unsetSelected($opt, single = false) {
    var _a;
    $opt.removeAttribute("aria-current");
    $opt.blur();
    (_a = $opt.querySelector(".check-mark")) == null ? void 0 : _a.classList.add("opacity-0");
    this._removeValue($opt.dataset.bssValue);
    if (single)
      $opt.classList.remove("active");
  }
  _updateBtnText() {
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
  _setupStyle() {
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
  refresh(mutationsList) {
    console.log("refresh dropdown", mutationsList);
    this._trigger(`refreshed${EVENT_KEY}`);
  }
  search(event) {
    var _a, _b, _c;
    const $input = event.target;
    const filter = $input.value || "";
    const li = this.$dropdownMenu.getElementsByTagName("li");
    let nbResult = 0;
    for (let i = 0; i < li.length; i++) {
      const a = li[i].getElementsByTagName("a")[0];
      if (!a)
        continue;
      const txtValue = ((_b = (_a = a.firstChild) == null ? void 0 : _a.textContent) == null ? void 0 : _b.trim()) || ((_c = a.textContent) == null ? void 0 : _c.trim()) || a.innerText.trim();
      if (txtValue.indexOf(filter) > -1) {
        li[i].classList.remove("d-none");
        nbResult++;
      } else {
        li[i].classList.add("d-none");
        if (nbResult > 0)
          nbResult--;
      }
    }
    console.log(nbResult);
  }
  close() {
    if (!this.$btnDropdown.classList.contains("show"))
      return;
    this.$btnDropdown.dispatchEvent(new Event("click"));
  }
  open() {
    if (this.$btnDropdown.classList.contains("show"))
      return;
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
document.addEventListener("DOMContentLoaded", function() {
  const $elements = document.querySelectorAll("[data-bss]");
  if ($elements) {
    $elements.forEach(function($el, i) {
      const opt = i === 4 ? { search: true } : void 0;
      new BootstrapSelect($el, opt);
    });
  }
});
exports.BootstrapSelect = BootstrapSelect;
