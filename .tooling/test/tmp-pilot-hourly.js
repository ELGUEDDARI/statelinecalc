const { chromium } = require('playwright');
const { calcul } = require('C:/Users/sland/Desktop/STATELINECALC/.tooling/lib/paie.js');

async function testPage(url, rate) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  const scenarios = [
    { state: 'illinois', filing: 'single', hours: '40', retirement: '0' },
    { state: 'michigan', filing: 'marriedJoint', hours: '37.5', retirement: '5' },
    { state: 'pennsylvania', filing: 'headOfHousehold', hours: '45', retirement: '10' },
    { state: 'georgia', filing: 'single', hours: '32', retirement: '0' },
  ];

  for (const s of scenarios) {
    await page.selectOption('#state', s.state);
    await page.fill('#salary', String(rate));
    await page.selectOption('#filing', s.filing);
    await page.fill('#hours', s.hours);
    await page.fill('#retirement', s.retirement);
    await page.dispatchEvent('#retirement', 'change');
    await page.waitForTimeout(300);
    const html = await page.$eval('.result', el => el.outerHTML);
    const totalMatch = html.match(/line-total[\s\S]*?class="num">([^<]+)</);
    const netAnnualDisplayed = totalMatch ? totalMatch[1] : 'NOT FOUND';
    const brut = rate * parseFloat(s.hours) * 52;
    const r = calcul(s.state, brut, s.filing, parseFloat(s.retirement)/100);
    console.log(JSON.stringify(s), '-> page:', netAnnualDisplayed, ' expected exact net:', r.net.toFixed(2), ' brut used:', brut);
  }
  await browser.close();
}

(async () => {
  await testPage(process.argv[2], parseFloat(process.argv[3]));
})();
