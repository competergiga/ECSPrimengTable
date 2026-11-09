// Run after building the library and the demo in development mode.
// Requires Playwright (or PLAYWRIGHT_MODULE pointing to its installed module).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = resolve('dist/ECSPrimengTable');
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = resolve(root, '.' + pathname);
  if (!path.startsWith(root)) { res.writeHead(403).end(); return; }
  const mime = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html', '.woff2': 'font/woff2' };
  try { const data = await readFile(path); res.setHeader('Content-Type', mime[extname(path)] || 'application/octet-stream'); res.end(data); }
  catch { res.setHeader('Content-Type', 'text/html'); res.end(await readFile(resolve(root, 'index.html'))); }
});
await new Promise(resolve => server.listen(0, 'localhost', resolve));
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
try {
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
 const errors = []; page.on('pageerror', error => errors.push(error.message));
 const fields = [
   { field: 'username', header: 'Username', canBeHidden: false },
   { field: 'age', header: 'Age', canBeHidden: true, visibleOnlyIn: [1, 2] },
   { field: 'email', header: 'Email', canBeHidden: true, visibleOnlyIn: [2] }
 ];
 const columnsInfo = fields.map(c => ({ dataType: 0, dataAlignHorizontal: 0, dataAlignVertical: 1,
   frozenColumnAlign: 0, cellOverflowBehaviour: 0, initialWidth: 120, canBeSorted: true,
   canBeFiltered: true, canBeGlobalFiltered: true, canBeResized: true, canBeReordered: true, ...c }));
 const exportError = 'The export contains 2,001,000 rows. An Excel worksheet supports at most 1,048,574 data rows in this report. Apply filters or select fewer rows before exporting.';
 let exportRequest;
 await page.route('**/Test/**', async route => {
   const url = route.request().url();
   if (url.includes('GenerateExcel')) {
     exportRequest = route.request().postDataJSON();
     await route.fulfill({ status: 400, contentType: 'text/plain; charset=utf-8', body: exportError });
     return;
   }
   let data = [];
   if (url.includes('GetTableConfiguration')) data = { columnsInfo, allowedItemsPerPage: [10, 25], maxViews: 5, dateFormat: 'yyyy-MM-dd', dateTimezone: '+00:00', dateCulture: 'en-US', exportDateFormat: 'yyyy-MM-dd' };
   if (url.includes('GetTableData')) data = { page: 0, totalRecords: 2, totalRecordsNotFiltered: 2, data: [
     { rowID: '1', username: 'Ana', age: 32, email: 'ana@example.test', canBeDeleted: false },
     { rowID: '2', username: 'Luis', age: 41, email: 'luis@example.test', canBeDeleted: true }
   ] };
   await route.fulfill({ json: data });
 });
 await page.goto('http://localhost:' + server.address().port + '/home');
 await page.locator('select').selectOption('en');
 const hamburger = page.getByRole('button', { name: 'Table actions', exact: true });
 await hamburger.waitFor();
 await page.getByRole('button', { name: 'Row actions', exact: true }).first().waitFor();
 async function checkSearchSpacing() {
   const search = page.locator('.ecs-global-search');
   const icon = await search.locator('.pi-search').boundingBox();
   const input = await search.locator('input').boundingBox();
   assert.ok(input.x - (icon.x + icon.width) >= 7.5, 'Search icon must be separated from the input by 8px');
   assert.ok(Math.abs(icon.y + icon.height / 2 - input.y - input.height / 2) < 1, 'Search icon must be vertically aligned with the input');
   assert.ok(input.x + input.width <= page.viewportSize().width, 'Search input must fit the viewport');
 }
 await checkSearchSpacing();
 assert.equal(await page.locator('th#age-header').count(), 0);
 assert.equal(await page.locator('th#email-header').count(), 0);
 assert.equal(await page.locator('ecs-table-button button').filter({ hasText: 'CREATE' }).count(), 0);
 await hamburger.click();
 await page.getByRole('menuitem').filter({ hasText: 'Modify columns' }).waitFor();
 await page.screenshot({ path: resolve(process.env.TEMP || '.', 'ecs-responsive-mobile.png'), fullPage: true, animations: 'disabled' });
 const bounds = await page.locator('.ecs-responsive-menu:visible').boundingBox();
 assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391, 'Header menu clips viewport');
 await page.keyboard.press('Escape');
 await page.getByRole('button', { name: 'Row actions', exact: true }).first().click();
 const disabledDelete = page.locator('.ecs-responsive-menu:visible .p-menuitem-link').filter({ hasText: 'Delete record' });
 assert.match(await disabledDelete.getAttribute('class'), /p-disabled/);
 await page.keyboard.press('Escape');
 await page.getByRole('button', { name: 'Row actions', exact: true }).nth(1).click();
 await page.locator('.ecs-responsive-menu:visible .p-menuitem-link').filter({ hasText: 'Edit record' }).click();
 await page.waitForURL('**/home/2/edit');
 await page.getByRole('link', { name: 'Back to people list' }).click();
 await hamburger.waitFor();
 await page.setViewportSize({ width: 900, height: 1000 });
 await page.locator('th#age-header').waitFor();
 assert.equal(await page.locator('th#email-header').count(), 0);
 await hamburger.waitFor();
 await checkSearchSpacing();
 await page.setViewportSize({ width: 1400, height: 1000 });
 await page.locator('ecs-table-button button').filter({ hasText: 'CREATE' }).waitFor();
 await page.locator('th#email-header').waitFor();
 assert.equal(await hamburger.count(), 0);
 assert.equal(await page.getByRole('button', { name: 'Row actions', exact: true }).count(), 0);
 await page.evaluate(async () => { await document.fonts.ready; });
 const columnIcon = page.locator('ecs-primeng-table p-button .pi-pencil').first();
 await columnIcon.waitFor();
 const glyph = await columnIcon.evaluate(icon => ({
   content: getComputedStyle(icon, '::before').content,
   loaded: document.fonts.check('16px primeicons')
 }));
 assert.ok(glyph.loaded && !['none', 'normal', '""', "''"].includes(glyph.content), 'Column selector must render a loaded PrimeIcons glyph');
 for (const width of [1400, 1200]) {
   await page.setViewportSize({ width, height: 1000 });
   await checkSearchSpacing();
   const viewButtons = page.locator('.ecs-view-buttons button');
   assert.equal(await viewButtons.count(), 2);
   const selectView = await viewButtons.nth(0).boundingBox();
   const restoreView = await viewButtons.nth(1).boundingBox();
   assert.ok(Math.abs(selectView.y - restoreView.y) < 1, 'View buttons must stay on the same line');
   assert.ok(restoreView.x >= selectView.x + selectView.width - 1, 'Restore view must be to the right of the selector');
 }
 await page.screenshot({ path: resolve(process.env.TEMP || '.', 'ecs-responsive-desktop.png'), fullPage: true, animations: 'disabled' });
 await page.setViewportSize({ width: 390, height: 844 });
 await hamburger.click();
 await page.getByRole('menuitem').filter({ hasText: 'Modify columns' }).click();
 await page.getByRole('dialog').waitFor();
 assert.ok(await page.getByRole('dialog').getByText('Email', { exact: true }).count(), 'Hidden column missing from selector');
 const dialog = page.getByRole('dialog');
 const modalSearch = dialog.locator('.ecs-global-search');
 const modalInput = modalSearch.locator('input');
 for (const width of [390, 1400]) {
   if (width === 1400) await dialog.getByRole('button', { name: 'Cancel changes', exact: true }).click();
   await page.setViewportSize({ width, height: 1000 });
   if (width === 1400) {
     await columnIcon.click();
     await dialog.waitFor();
   }
   await modalInput.click();
   const { icon, input } = await modalSearch.evaluate(search => ({
     icon: search.querySelector('.pi-search').getBoundingClientRect().toJSON(),
     input: search.querySelector('input').getBoundingClientRect().toJSON()
   }));
   assert.ok(Math.abs(input.x - icon.x - icon.width - 8) < 1, 'Column search must use the same 8px icon gap');
   assert.ok(Math.abs(icon.y + icon.height / 2 - input.y - input.height / 2) < 1, 'Column search icon must be vertically aligned');
   const padding = await modalInput.evaluate(input => getComputedStyle(input).paddingLeft);
   const generalPadding = await page.locator('.ecs-global-search input').first().evaluate(input => getComputedStyle(input).paddingLeft);
   assert.equal(padding, generalPadding, 'Column search text must have the same left inset as global search');
 }
 await modalInput.fill('Email');
 assert.equal(await dialog.locator('tbody tr').count(), 1, 'Column search must still filter translated names');
 await modalSearch.locator('.pi-times').click();
 assert.equal(await modalInput.inputValue(), '');
 assert.equal(await dialog.locator('tbody tr').count(), 3, 'Clearing column search must restore every column');
 await modalInput.focus();
 await page.screenshot({ path: resolve(process.env.TEMP || '.', 'ecs-column-selector-search.png'), fullPage: true, animations: 'disabled' });
 await dialog.getByRole('button', { name: 'Cancel changes', exact: true }).click();
 await page.locator('ecs-primeng-table p-button .pi-file-excel').click();
 const exportDialog = page.locator('ecs-export-excel').getByRole('dialog');
 await exportDialog.getByRole('button', { name: 'Export', exact: true }).click();
 await page.getByText(exportError, { exact: true }).waitFor();
 assert.equal(exportRequest.applyFilters, false, 'Export must preserve the chosen filter option');
 assert.equal(exportRequest.allColumns, false, 'Export must preserve the chosen column option');
 assert.ok(await exportDialog.isVisible(), 'A rejected export must stay open so the user can change options');
 await exportDialog.getByRole('button', { name: 'Selected rows', exact: true }).click();
 assert.equal(await exportDialog.getByRole('button', { name: 'Selected rows', exact: true }).getAttribute('aria-pressed'), 'true',
   'Selected rows must remain pressed after clicking the option');
 await exportDialog.getByRole('button', { name: 'All columns', exact: true }).click();
 assert.equal(await exportDialog.getByRole('button', { name: 'All columns', exact: true }).getAttribute('aria-pressed'), 'true',
   'Export column options must remain selected after clicking');
 assert.equal(await exportDialog.getByRole('button', { name: 'Selected rows', exact: true }).getAttribute('aria-pressed'), 'true',
   'Changing another export option must not reset the selected-rows option');
 assert.deepEqual(errors, []);
 if (process.env.LIVE_EXPORT_TEST_URL) {
   const livePage = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
   await livePage.goto(process.env.LIVE_EXPORT_TEST_URL);
   await livePage.locator('select').selectOption('en');
   const checkboxes = livePage.locator('tbody p-checkbox').filter({ has: livePage.locator('input:not(:disabled)') }).locator('.p-checkbox-box');
  await checkboxes.nth(0).waitFor({ timeout: 45000 });
   await checkboxes.nth(0).click();
  assert.equal(await livePage.locator('tbody .p-checkbox-box.p-highlight').count(), 1);
   await livePage.locator('ecs-primeng-table p-button .pi-file-excel').click();
   const liveDialog = livePage.locator('ecs-export-excel');
   await liveDialog.getByRole('button', { name: 'Selected rows', exact: true }).click();
   assert.equal(await liveDialog.getByRole('button', { name: 'Selected rows', exact: true }).getAttribute('aria-pressed'), 'true',
     'The export dialog must retain the selected-rows option');
   const downloadPromise = livePage.waitForEvent('download', { timeout: 45000 });
   downloadPromise.catch(() => {});
   const [response] = await Promise.all([
     livePage.waitForResponse(response => response.url().includes('/Test/GenerateExcel'), { timeout: 45000 }),
     liveDialog.getByRole('button', { name: 'Export', exact: true }).click()
   ]);
   const liveRequest = response.request().postDataJSON();
  assert.equal(liveRequest.applyFilters, true, 'Selected rows must force the selection filter: ' + JSON.stringify(liveRequest));
  assert.equal(liveRequest.filter.rowID?.[0]?.value?.length, 1, 'The request must include exactly one selected RowID: ' + JSON.stringify(liveRequest));
  if (response.status() !== 200) assert.fail('Live export failed: ' + await response.text());
   const download = await downloadPromise;
   const destination = resolve(process.env.TEMP || '.', 'ecs-selected-rows-validation.xlsx');
   await download.saveAs(destination);
   const workbook = await readFile(destination);
   assert.equal(workbook.readUInt32LE(0), 0x04034b50, 'The downloaded workbook must be an XLSX ZIP archive');
   console.log('Live Excel download passed: ' + JSON.stringify({ filename: download.suggestedFilename(), bytes: workbook.length, filters: liveRequest.filter }));
 }
 console.log('Browser checks passed: mobile/tablet/desktop, overlays, disabled actions, row navigation, column selector, export validation message.');
} finally {
 await browser.close();
 await new Promise(resolve => server.close(resolve));
}
