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
        dropdownButton: function ($el: HTMLSelectElement) {
            // Use 'this' as current bootstrap-select instance
            const style = $el.getAttribute('style') ? ` style=${$el.getAttribute('style')}` : '';
            return `<button${$el.disabled ? " disabled" : ""} class="${
                classNames.BUTTONCLASS + ' ' + $el.classList.value
            }"${style} type="button" data-bs-toggle="dropdown" aria-expanded="false" data-bs-auto-close="${$el.multiple ? "outside" : "true"}"></button>`;
        },
        serchInput: function () {
            // Use 'this' as current bootstrap-select instance
            return `
            <div class="px-2">
                <input type="search" class="form-control form-control-sm bs-select-search" />
            </div>`;
        },
        dropdownMenu: function () {
            // Use 'this' as current bootstrap-select instance
            return `<ul class="${classNames.MENU}"></ul>`;
        },
        stickyTop: function () {
            return `<div class="bg-body sticky-top pb-2 shadow-sm"></div>`;
        },
        header: function () {
            // Use 'this' as current bootstrap-select instance
            return `
            <h6 class="bg-light p-2 border-bottom rounded-top d-flex align-items-center justify-content-between">
                Dropdown header
                <button role="button" aria-label="close" type="button" class="btn-close float-end">
                </button>
            </h6>`;
        },
        optgroup: function ($el: HTMLOptGroupElement) {
            // Use 'this' as current bootstrap-select instance
            return `<li><h6 class="dropdown-header">${$el.label || "Group"}</h6></li>`;
        },
        option: function ($el: HTMLOptionElement, multiple = false) {
            // Use 'this' as current bootstrap-select instance
            const style = $el.getAttribute('style') !== "" ? ` style=${$el.getAttribute('style')}` : '';
            return `
            <li>
              <a class="dropdown-item${$el.disabled ? " disabled" : ""} ${$el.classList.value}"${style} ${DATA_ATTR}-value="${$el.value}" href="#">${$el.textContent}
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
