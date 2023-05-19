/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-undef */
"use strict";

beforeEach(() => jest.resetModules());

test("Initialize bootstrap", () => {
    const { BootstrapSelect } = require("../dist/js/bootstrap-select");
    // Set up our document body
    document.body.innerHTML = `
    <select data-bss>
        <option value="1">First</option>
    </select>`;

    const $select = document.querySelector("select");
    const bootstrapSelect = new BootstrapSelect($select);

    expect($select.classList).toContain("d-none");
    expect($select["bs-select"]).toBeTruthy();
});
