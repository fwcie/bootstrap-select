/* eslint-disable quotes */
import { BootstrapSelectOptions } from "../types/options";
import { DATA_ATTR, classNames } from "./constants";

export const DefaultOptions: BootstrapSelectOptions = {
    noneSelectedText: "Nothing selected",
    noneResultsText: "No results matched {0}",
    noneValue: "?",
    countSelectedText(numSelected: number) {
        return numSelected == 1 ? `${numSelected} item selected` : `${numSelected} items selected`;
    },
    maxOptionsText(numAll: number, numGroup: number) {
        return [
            numAll == 1 ? "Limit reached ({n} item max)" : "Limit reached ({n} items max)",
            numGroup == 1 ? "Group limit reached ({n} item max)" : "Group limit reached ({n} items max)"
        ];
    },
    local: "en",
    selectAllText: "Select All",
    deselectAllText: "Deselect All",
    doneButton: true,
    multipleSeparator: ", ",
    style: classNames.BUTTONCLASS,
    size: "auto",
    title: '',
    placeholder: '',
    allowClear: false,
    selectedTextFormat: "values",
    width: "auto",
    header: "Header test",
    search: true,
    searchPlaceholder: '',
    normalizeSearch: false,
    actionsBox: false,
    showTick: false,
    template: {
        dropdownButton: function ($el: HTMLSelectElement) {
            // Use 'this' as current bootstrap-select instance
            return `<button${$el.disabled ? " disabled" : ""} class="${
                classNames.BUTTONCLASS
            }" type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="${$el.multiple ? "outside" : "true"}"></button>`;
        },
        dropdown: function () {
            // Use 'this' as current bootstrap-select instance
            return `<div class="dropdown"></div>`;
        },
        serchInput: function () {
            // Use 'this' as current bootstrap-select instance
            return `<div class="px-2">
        <input class="form-control form-control-sm bs-select-search" />
      </div>`;
        },
        dropdownMenu: function () {
            // Use 'this' as current bootstrap-select instance
            return `<ul class="dropdown-menu"></ul>`;
        },
        header: function () {
            // Use 'this' as current bootstrap-select instance
            return `<li>
      <h6 class="bg-light p-2 border-bottom rounded-top d-flex align-items-center justify-content-between">
      Dropdown header
      <button role="button" aria-label="close" type="button" class="btn-close float-end"></button>
      </h6>
      </li>`;
        },
        item: function ($el: HTMLOptionElement) {
            // Use 'this' as current bootstrap-select instance
            return `<span ${DATA_ATTR}-value="${$el.value}" class="badge text-bg-light d-inline-flex align-items-center me-1">
      ${$el.textContent ? $el.textContent.trim() : ""}
      <button onclick="void(0)" type="button" role="close" class="btn-close ms-1 bs-select-remove-item"></button></span>`;
        }, // Only for select "multiple"
        optgroup: function ($el: HTMLOptGroupElement) {
            // Use 'this' as current bootstrap-select instance
            return `<li><h6 class="dropdown-header">${$el.title || "Group"}</h6></li>`;
        },
        option: function ($el: HTMLOptionElement, multiple = false) {
            // Use 'this' as current bootstrap-select instance
            return `
            <li>
              <a class="dropdown-item${$el.disabled ? " disabled" : ""}" ${DATA_ATTR}-value="${$el.value}" href="#">${$el.textContent}
              ${multiple ? `<span class="check-mark ms-2 float-end fw-bold opacity-0">&#10003;</span>` : ""}
              </a>
            </li>`;
        },
        divider: function () {
            // Use 'this' as current bootstrap-select instance
            return `<li class="dropdown-divider"></li>`;
        },
        checkMark: function () {
            // Use 'this' as current bootstrap-select instance
            return `<span class="check-mark"></span>`;
        }
    },
    maxOptions: false,
    mobile: false,
    selectOnTab: true,
    dropdownPosition: "auto",
    virtualScroll: 600
};
