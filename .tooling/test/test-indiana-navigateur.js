/* Controle NAVIGATEUR de ce que l'Indiana a de PROPRE : le selecteur de comte.
 *
 * test-etat-navigateur.js teste deja l'Indiana au comte par defaut (Marion). Ce
 * fichier-ci pilote le SELECTEUR : il choisit des comtes, lit la ligne
 * « <Comte> County income tax (x%) » rendue a l'ecran, le net, et les compare a
 * la bibliotheque Node (calcul(), 5e argument = comte). Il verifie aussi que
 * la page ne deborde pas a 375 px, que le selecteur porte 92 comtes dont Marion
 * par defaut, que le resultat n'est jamais vide au chargement (CLS) et qu'aucune
 * valeur saisie ne part vers un tiers.
 *
 * Lancer : node .tooling/test/test-indiana-navigateur.js [--servi]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { calcul, R } = require("../lib/paie.js");
const { stabilise } = require("./attente.js");

const RACINE = path.join(__dirname, "..", "..");
const PORT = 8794;
const SERVI = process.argv.includes("--servi");
const ETAT = "indiana";
const CT = R.states.indiana.incomeTax.countyTax;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
                ".webmanifest": "application/manifest+json", ".xml": "application/xml" };
const serveur = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(RACINE, p);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
const dit = (nom, ok, detail) => { ok ? pass++ : fail++; console.log("  %s | %s%s", ok ? "OK   " : "ECHEC", nom, detail ? " | " + detail : ""); };
const proche = (nom, a, b, tol) => dit(nom, Math.abs(a - b) <= tol, "obtenu " + a.toFixed(2) + " | attendu " + b.toFixed(2));

const CAS = [
  { comte: "marion", brut: 75000, statut: "single" },
  { comte: "porter", brut: 75000, statut: "single" },
  { comte: "randolph", brut: 75000, statut: "single" },
  { comte: "hamilton", brut: 52000, statut: "single" },
  { comte: "boone", brut: 75000, statut: "marriedJoint" },
  { comte: "brown", brut: 250000, statut: "single" },
  { comte: "st-joseph", brut: 40000, statut: "headOfHousehold" },
  { comte: "lake", brut: 1000, statut: "single" },
  { comte: "allen", brut: 20000, statut: "single" }
];

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  const nav = await chromium.launch({ headless: true });
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const erreurs = [];
  const tiers = [];
  page.on("console", m => { if (m.type() === "error") erreurs.push("console: " + m.text().slice(0, 160)); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message.slice(0, 160)));
  page.on("request", r => {
    const u = r.url();
    if (!/^https?:\/\/(localhost|statelinecalc\.com)/.test(u) && !/googletagmanager|google-analytics|analytics\.google/.test(u)) tiers.push(u.slice(0, 100));
    if (/salary=|75000|52000/.test(decodeURIComponent(u)) && /google|analytics/.test(u)) tiers.push("FUITE : " + u.slice(0, 120));
  });

  const BASE = SERVI ? "https://statelinecalc.com" : "http://localhost:" + PORT;
  const URL = BASE + "/paycheck-calculator/" + ETAT + "/";
  console.log("\ncible : " + URL);
  const rep = await page.goto(URL, { waitUntil: "networkidle" });
  dit("la page repond 200", rep && rep.status() === 200);

  console.log("\n--- le selecteur de comte ---");
  const opts = await page.$$eval("#county option", o => o.map(x => ({ v: x.value, t: x.textContent, s: x.selected })));
  dit("92 comtes dans le selecteur", opts.length === 92, opts.length + " options");
  dit("Marion est selectionne par defaut", opts.filter(o => o.s).map(o => o.v).join() === "marion");
  dit("chaque option affiche son taux, lu dans le moteur",
    opts.every(o => { const r = CT.rates[o.v]; return r && o.t === r[0] + " (" + +(r[1] * 100).toFixed(4) + "%)"; }));

  console.log("\n--- le resultat n'est jamais vide au chargement (pas de CLS) ---");
  const h0 = await page.evaluate(() => document.querySelector("[data-paycheck-result]").offsetHeight);
  dit("le bloc resultat est rempli des le chargement", h0 > 100, h0 + " px");
  const lu0 = await page.evaluate(() => document.querySelector("[data-paycheck-result]").innerText);
  dit("la ligne de comte par defaut est visible : « Marion County income tax (2.02%) »", /Marion County income tax \(2\.02%\)/.test(lu0));

  console.log("\n--- le calculateur, pilote pour de vrai, comte par comte (%d cas) ---", CAS.length);
  for (const cas of CAS) {
    const att = calcul(ETAT, cas.brut, cas.statut, 0, cas.comte);
    const attComte = att.programmes.filter(p => p.county).reduce((t, p) => t + p.montant, 0);
    await page.fill("#salary", String(cas.brut));
    await page.selectOption("#period", "annual");
    await page.selectOption("#filing", cas.statut);
    await page.selectOption("#county", cas.comte);
    await page.selectOption("#display", "annual");
    await page.click("button[type=submit]");
    await stabilise(page);
    const lu = await page.evaluate(() => {
      const nb = t => Number(String(t).replace(/[^0-9.]/g, ""));
      const res = document.querySelector("[data-paycheck-result]");
      const net = nb(res.querySelector(".result-head").textContent);
      let etat = 0, comte = 0, libelle = "";
      res.querySelectorAll(".line").forEach(l => {
        const dt = l.querySelector("dt").textContent;
        if (/^State income tax/.test(dt)) etat = nb(l.querySelector("dd").textContent);
        if (/County income tax/.test(dt)) { comte = nb(l.querySelector("dd").textContent); libelle = dt; }
      });
      const segs = [...res.querySelectorAll(".part-nom")].map(e => e.textContent);
      return { net, etat, comte, libelle, segs };
    });
    const nom = cas.comte + " " + cas.brut + " " + cas.statut;
    proche("impot d'Etat, " + nom, lu.etat, att.etat, 1);
    proche("impot de comte, " + nom, lu.comte, attComte, 1);
    proche("net, " + nom, lu.net, att.net, 1);
    if (attComte > 0) {
      dit("etiquette du comte, " + nom, lu.libelle === att.programmes[0].label, lu.libelle);
      dit("segment « County income tax » dans la repartition, " + nom, lu.segs.indexOf("County income tax") >= 0);
      dit("le comte n'est pas range avec « State payroll programs », " + nom, lu.segs.indexOf("State payroll programs") < 0);
    }
  }

  console.log("\n--- le texte annonce par le resume (lecteur d'ecran / IA) ---");
  await page.selectOption("#county", "randolph");
  await page.fill("#salary", "75000");
  await stabilise(page);
  const resume = await page.evaluate(() => document.querySelector("[data-paycheck-result] .visually-hidden").textContent);
  dit("le resume dit « county income tax at X percent » (minuscule en milieu de phrase)", /county income tax at \d+ percent/.test(resume), resume.slice(0, 160));

  console.log("\n--- mobile 375 px : aucun defilement horizontal ---");
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(300);
  const larg = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  dit("scrollWidth <= clientWidth", larg.sw <= larg.cw, larg.sw + " / " + larg.cw);
  const tabs = await page.$$eval(".table-scroll", els => els.map(e => e.scrollWidth > e.clientWidth || true).length);
  dit("les tableaux sont dans des conteneurs defilants", tabs >= 5, tabs + " conteneurs");

  console.log("\n--- le tableau des 92 comtes est dans le HTML servi (sans JS) ---");
  const html = await (await ctx.request.get(URL)).text();
  const lignesComtes = (html.match(/<th scope="row">[A-Z][A-Za-z. ]+<\/th><td class="num">\d(?:\.\d+)?%<\/td><td class="num">\$[\d,.]+<\/td><td class="num">\$[\d,]+<\/td>/g) || []).length;
  dit("92 lignes de comte rendues cote serveur", lignesComtes === 92, lignesComtes + " lignes");
  dit("aucun attribut style=\"\" dans la page", !/\sstyle="/.test(html));
  dit("aucun script en ligne", !/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/.test(html));
  const jsonld = (html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1];
  let types = [];
  try { types = JSON.parse(jsonld)["@graph"].map(x => x["@type"]); } catch (e) { /* ci-dessous */ }
  dit("JSON-LD : WebApplication, BreadcrumbList, FAQPage, Organization", ["WebApplication", "BreadcrumbList", "FAQPage", "Organization"].every(t => types.indexOf(t) >= 0), types.join());

  console.log("\n--- ce que la console et le reseau ont dit ---");
  dit("aucune erreur de console, aucune violation de CSP", erreurs.length === 0);
  erreurs.forEach(e => console.log("      " + e));
  dit("aucune requete tierce hors mesure d'audience, aucune fuite de la valeur saisie", tiers.length === 0);
  tiers.forEach(e => console.log("      " + e));

  await nav.close();
  serveur.close();
  console.log("\n=== INDIANA SELECTEUR " + (SERVI ? "(SERVI)" : "(LOCAL)") + " : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
