/* Demonte une page concurrente : ce qu'elle repond, comment elle est ecrite,
   et ce qu'elle donne a manger aux moteurs. On mesure, on ne juge pas au ressenti.
   Lancer : node .tooling/test/veille-concurrent.js <url> */
const { chromium } = require("playwright");
const url = process.argv[2];
(async () => {
  const nav = await chromium.launch();
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36" });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);
    const d = await page.evaluate(() => {
      const t = document.body.innerText;
      const h = n => [...document.querySelectorAll("h" + n)].map(e => e.innerText.trim()).filter(Boolean);
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(s => { try { return JSON.parse(s.textContent); } catch { return null; } })
        .filter(Boolean);
      const types = [];
      const creuse = o => { if (!o) return; if (Array.isArray(o)) return o.forEach(creuse);
        if (typeof o === "object") { if (o["@type"]) types.push(o["@type"]); Object.values(o).forEach(creuse); } };
      creuse(ld);
      return {
        titre: document.title,
        desc: (document.querySelector('meta[name="description"]') || {}).content || "",
        h1: h(1), nbH2: h(2).length, nbH3: h(3).length, h2: h(2).slice(0, 14),
        mots: t.split(/\s+/).filter(Boolean).length,
        tableaux: [...document.querySelectorAll("table")].map(x => x.querySelectorAll("tbody tr").length),
        champs: document.querySelectorAll("input,select").length,
        schema: [...new Set(types)],
        // la reponse est-elle dans le texte, ou seulement derriere le calcul ?
        chiffresDollar: (t.match(/\$[\d,]+/g) || []).length,
        premiers200: t.replace(/\s+/g, " ").slice(0, 260)
      };
    });
    console.log("URL        : " + url);
    console.log("TITRE      : " + d.titre);
    console.log("DESC       : " + d.desc.slice(0, 160));
    console.log("H1         : " + d.h1.join(" / "));
    console.log("STRUCTURE  : " + d.nbH2 + " H2, " + d.nbH3 + " H3, " + d.mots + " mots");
    console.log("TABLEAUX   : " + (d.tableaux.length ? d.tableaux.join(", ") + " lignes" : "AUCUN"));
    console.log("CHAMPS     : " + d.champs);
    console.log("MONTANTS $ : " + d.chiffresDollar + " dans le texte servi");
    console.log("SCHEMA     : " + (d.schema.join(", ") || "AUCUN"));
    console.log("H2         : " + d.h2.join(" | "));
    console.log("DEBUT      : " + d.premiers200);
  } catch (e) { console.log("URL        : " + url + "\nECHEC      : " + e.message); }
  await nav.close();
})();
