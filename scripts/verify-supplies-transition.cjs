// Run with Next on port 3108 and Playwright available through NODE_PATH.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const mobile of [false, true]) {
      const page = await browser.newPage({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, reducedMotion: mobile ? 'reduce' : 'no-preference' });
      await page.goto('http://localhost:3108/go-bag');
      const next = page.getByRole('button', { name: 'Continue to supplies →', exact: true });
      await next.waitFor();
      await page.getByText('Saved on this device', { exact: true }).waitFor();
      await page.locator('[data-completion-id]').first().click();
      assert.equal(await page.locator('#supplies-toggle').getAttribute('aria-expanded'), 'false', 'Mark done does not navigate');
      await next.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => document.activeElement.id === 'supplies-toggle');
      assert.equal(await page.locator('#supplies-toggle').getAttribute('aria-expanded'), 'true');
      await page.locator('#have-water').fill('7');
      await page.getByRole('textbox', { name: 'Search supplies' }).fill('water');
      await page.getByText('Saved on this device', { exact: true }).waitFor();
      const saved = await page.evaluate(() => localStorage.getItem('gobag:library:v2'));
      await page.locator('#supplies-toggle').focus();
      await page.keyboard.press('Space');
      assert.equal(await page.locator('#supplies-toggle').getAttribute('aria-expanded'), 'false');
      await next.focus();
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.activeElement.id === 'supplies-toggle');
      assert.equal(await page.locator('#have-water').inputValue(), '7');
      assert.equal(await page.getByRole('textbox', { name: 'Search supplies' }).inputValue(), 'water');
      assert.equal(await page.evaluate(() => localStorage.getItem('gobag:library:v2')), saved);
      await next.click(); // Already open: continue must not toggle it closed.
      assert.equal(await page.locator('#supplies-toggle').getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => {
        const rect = document.getElementById('supplies-toggle').getBoundingClientRect();
        return rect.top >= 0 && rect.bottom < innerHeight;
      });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      const householdNext = page.getByRole('button', { name: 'Continue to household plan →', exact: true });
      for (const key of ['Enter', 'Space']) {
        if (await page.locator('#household-toggle').getAttribute('aria-expanded') === 'true') await page.locator('#household-toggle').click();
        await householdNext.focus();
        await page.keyboard.press(key);
        await page.waitForFunction(() => document.activeElement.id === 'household-toggle');
        assert.equal(await page.locator('#household-toggle').getAttribute('aria-expanded'), 'true');
        assert.equal(await page.evaluate(() => localStorage.getItem('gobag:library:v2')), saved);
      }
      await householdNext.click();
      assert.equal(await page.locator('#household-toggle').getAttribute('aria-expanded'), 'true');
      await page.waitForFunction(() => {
        const rect = document.getElementById('household-toggle').getBoundingClientRect();
        return rect.top >= 0 && rect.bottom < innerHeight;
      });
      await page.reload();
      await next.click();
      assert.equal(await page.locator('#have-water').inputValue(), '7', 'Supply quantity persists after reload');
      console.log(`${mobile ? 'Mobile / reduced motion' : 'Desktop'}: keyboard, repeat continue, scroll, filters and saved progress passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
