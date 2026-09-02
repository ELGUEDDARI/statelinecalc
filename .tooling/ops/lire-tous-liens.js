const { chromium } = require("playwright");
(async () => {
  const nav = await chromium.launch({ headless: true });
  const page = await (await nav.newContext({ userAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36", locale:"en-US" })).newPage();
  const rep = await page.goto(process.argv[2], { waitUntil:"domcontentloaded", timeout:60000 });
  await page.waitForTimeout(3000);
  console.log("STATUT " + rep.status());
  const l = await page.evaluate(()=>[...document.querySelectorAll("a[href]")].map(a=>(a.textContent.trim().replace(/\s+/g," ")||"(sans texte)")+" -> "+a.href));
  console.log([...new Set(l)].join("\n"));
  await nav.close();
})();
