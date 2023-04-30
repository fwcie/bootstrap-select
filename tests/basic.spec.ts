import { test, expect } from "@playwright/test";

test("Basic select", async ({ page }) => {
    await page.goto("/");
    // const BootstrapSelect = await page.evaluateHandle("BootstrapSelect");
    // console.log(BootstrapSelect);
    await expect(page).toHaveTitle(/Bootstrap select/);

    const $basic = page.getByTestId("basic");
    await expect($basic).toBeHidden();
    // eslint-disable-next-line @typescript-eslint/no-empty-function
});
