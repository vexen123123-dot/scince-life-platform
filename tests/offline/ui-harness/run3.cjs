const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); p.setDefaultTimeout(1500);
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 200)); });
  await p.goto('file:///var/tmp/harness/index.html');
  const n = await p.locator('[data-sec]').count();
  for (let i = 0; i < n; i++) {
    const t0 = Date.now(); const s = p.locator('[data-sec]').nth(i);
    const nb = await s.locator('button').count(); let c = 0;
    for (let k = 0; k < Math.min(nb, 25); k++) { try { await s.locator('button').nth(k).click({ timeout: 300, force: true }); c++; } catch {} }
    console.log(i, await s.getAttribute('data-sec'), 'buttons', nb, 'clicked', c, Date.now() - t0, 'ms');
  }
  console.log('ERRORS', errs.length, errs.slice(0, 8)); await b.close();
})();
