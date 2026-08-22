/* Prouve que GA4 emet vraiment un evenement depuis la page en ligne.
   Le bouton "Tester l'installation" de Google est une boite noire : s'il
   dit non, on ne sait pas pourquoi. Ici on regarde la requete reelle.

   Lancer : node .tooling/test/test-ga4.js */

const { chromium } = require("playwright");

(async () => {
  const nav = await chromium.launch({ headless: true });
  const ctx = await nav.newContext();
  const page = await ctx.newPage();

  const collectes = [];
  const scripts = [];
  const erreurs = [];

  page.on("request", r => {
    const u = r.url();
    if (u.includes("google-analytics.com") || u.includes("analytics.google.com")) collectes.push(u);
    if (u.includes("googletagmanager.com")) scripts.push(u);
  });
  page.on("response", async r => {
    if (r.url().includes("googletagmanager.com")) {
      scripts.push("  -> reponse HTTP " + r.status());
    }
  });
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message));

  for (const url of ["https://statelinecalc.com/",
                     "https://statelinecalc.com/paycheck-calculator/washington/"]) {
    collectes.length = 0; scripts.length = 0; erreurs.length = 0;
    console.log("\n=== " + url + " ===");
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    console.log("  script gtag charge : " + (scripts.length ? "OUI" : "NON"));
    scripts.forEach(s => console.log("    " + s));

    const gtagPresent = await page.evaluate(() => typeof window.gtag === "function");
    const idConfig = await page.evaluate(() => {
      try {
        return (window.dataLayer || [])
          .filter(a => a && a[0] === "config")
          .map(a => a[1]).join(",");
      } catch (e) { return "?"; }
    });
    console.log("  window.gtag       : " + (gtagPresent ? "OUI" : "NON"));
    console.log("  ID configure      : " + (idConfig || "(aucun)"));
    console.log("  requetes de mesure envoyees : " + collectes.length);
    collectes.forEach(c => console.log("    " + c.substring(0, 130)));
    if (erreurs.length) { console.log("  ERREURS CONSOLE :"); erreurs.forEach(e => console.log("    " + e)); }

    const ok = gtagPresent && collectes.length > 0 && idConfig.includes("G-XK0HYXJH0E");
    console.log("  => " + (ok ? "GA4 COLLECTE BIEN SUR CETTE PAGE" : "GA4 NE COLLECTE PAS"));
  }

  await nav.close();
})();
