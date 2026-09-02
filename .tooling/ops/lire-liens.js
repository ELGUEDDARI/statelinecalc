const { chromium } = require("playwright");
const url = process.argv[2];
(async () => {
  const nav = await chromium.launch({ headless: true });
  const page = await (await nav.newContext({ userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", locale:"en-US" })).newPage();
  const rep = await page.goto(url, { waitUntil:"domcontentloaded", timeout:60000 });
  await page.waitForTimeout(2500);
  console.log("STATUT " + rep.status());
  console.log((await page.evaluate(()=>document.body.innerText)).slice(0,1500));
  console.log("=== LIENS PDF ===");
  const l = await page.evaluate(()=>[...document.querySelectorAll("a[href]")].map(a=>a.textContent.trim()+" -> "+a.href));
  console.log(l.filter(x=>/pdf/i.test(x)).join("\n"));
  await nav.close();
})();
