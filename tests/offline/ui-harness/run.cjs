const { chromium } = require('/opt/npm-tools/node_modules/playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push('pageerror: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
  await p.goto('file:///var/tmp/harness/index.html'); await p.waitForTimeout(500);
  const sims = await p.$$eval('[data-sim]', (n) => n.map((x) => x.getAttribute('data-sim')));
  const secs = await p.$$eval('[data-sec]', (n) => n.length);
  console.log('sims', sims.length, 'sections', secs);
  for (const id of sims) {
    const sec = p.locator(`[data-sim="${id}"]`);
    const before = await sec.locator('svg').count();
    const btns = await sec.locator('button').allInnerTexts();
    // click play-like button (first button whose text includes ابدأ/تشغيل)
    const play = sec.locator('button', { hasText: /ابدأ|تشغيل|استئناف/ }).first();
    if (await play.count()) await play.click();
    await p.waitForTimeout(1500);
    const pause = sec.locator('button', { hasText: /إيقاف/ }).first(); if (await pause.count()) await pause.click();
    const next = sec.locator('button', { hasText: /التالي/ }).first(); let n = 0; while (await next.count() && await next.isEnabled() && n < 20) { await next.click(); n++; }
    const text = (await sec.innerText()).slice(0, 80).replace(/\n/g, ' | ');
    console.log(id, 'svg', before, 'buttons', btns.length, 'steps-advanced', n, '::', text);
    const re = sec.locator('button', { hasText: /إعادة/ }).first(); if (await re.count()) await re.click();
  }
  await p.screenshot({ path: 'shot.png', fullPage: false });
  console.log('ERRORS', errs.length); errs.slice(0, 15).forEach((e) => console.log(' ', e));
  await b.close();
})();
