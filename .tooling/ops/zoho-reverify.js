const { chromium } = require('playwright');

(async () => {
  const userDataDir = 'C:\\Users\\sland\\.config\\browser-profiles\\zoho-statelinecalc';
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 900 }
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://mailadmin.zoho.eu/hosting?domain=statelinecalc.com', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);

  // Ferme la boite de dialogue Information si presente
  const ok = page.locator('button:has-text("Ok")');
  if (await ok.count() > 0) { await ok.first().click().catch(() => {}); await page.waitForTimeout(1000); }

  const verifyBtn = page.locator('button:has-text("Vérifier tous les enregistrements")');
  await verifyBtn.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (await verifyBtn.count() > 0) {
    await verifyBtn.first().click().catch(() => {});
    await page.waitForTimeout(7000);
  }

  // Referme la boite de dialogue apparue apres re-verification
  const ok2 = page.locator('button:has-text("Ok")');
  if (await ok2.count() > 0) { await ok2.first().click().catch(() => {}); await page.waitForTimeout(1000); }

  const shot = 'C:\\Users\\sland\\AppData\\Local\\Temp\\claude\\c--Users-sland-Desktop-STATELINECALC\\8be0e7e5-4940-4fc4-8922-c7627e981b47\\scratchpad\\zoho-reverify.png';
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log('URL=' + page.url());

  await context.close();
})().catch((e) => {
  console.error('ERREUR: ' + e.message);
  process.exit(1);
});
