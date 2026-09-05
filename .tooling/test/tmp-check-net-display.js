const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://statelinecalc.com/paycheck-calculator/ohio/', { waitUntil: 'networkidle' });
  const buttons = await page.$$eval('button, input[type=submit]', els => els.map(e => ({text:e.textContent.trim(), id:e.id, type:e.type})));
  console.log('BUTTONS', JSON.stringify(buttons));
  await page.fill('#salary', '75,000');
  await page.click('#calculate, button[type=submit], form button');
  await page.waitForTimeout(300);
  const result = await page.evaluate(() => {
    const rez = document.querySelector('#result, .result, [id*=result]');
    return rez ? rez.outerHTML.slice(0,2000) : 'NOT FOUND: ' + document.querySelectorAll('[id]').length;
  });
  console.log(result);
  await browser.close();
})();
