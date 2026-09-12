const { chromium } = require('playwright');

(async () => {
  const userDataDir = 'C:\\Users\\sland\\.config\\browser-profiles\\zoho-statelinecalc';
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 900 }
  });
  const page = context.pages()[0] || await context.newPage();

  await page.goto('https://mail.zoho.eu/zm/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4000);

  const shot = 'C:\\Users\\sland\\AppData\\Local\\Temp\\claude\\c--Users-sland-Desktop-STATELINECALC\\8be0e7e5-4940-4fc4-8922-c7627e981b47\\scratchpad\\zoho-inbox.png';
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log('URL=' + page.url());
  console.log('TITRE=' + await page.title());

  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('BODY_SNIPPET=' + bodyText.slice(0, 1500));

  await context.close();
})().catch((e) => {
  console.error('ERREUR: ' + e.message);
  process.exit(1);
});
