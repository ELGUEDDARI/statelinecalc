/* Controle NAVIGATEUR de /paycheck-calculator/utah/, en local, AVANT
 * publication.
 *
 * Pourquoi ce fichier existe et pourquoi il est different des autres : l'Utah
 * est le premier Etat du site dont l'impot se calcule avec un CREDIT qui
 * s'efface, pas avec une deduction. Il a fallu ajouter ce mecanisme aux DEUX
 * moteurs — .tooling/lib/paie.js et assets/calc-paycheck.js — et seul le
 * premier est teste par test-engine.js, parce que le second est un IIFE de
 * navigateur qu'on ne peut pas require. Un ecart entre les deux ne se verrait
 * donc nulle part : la page publierait un tableau juste et un calculateur faux.
 *
 * Ce test pilote le formulaire pour de vrai, a quatre salaires choisis de part
 * et d'autre du point ou le credit disparait, et compare ce qui est RENDU a
 * l'ecran a ce que dit la bibliotheque Node.
 *
 * Lancer : node .tooling/test/test-utah-local.js
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { calcul } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const PORT = 8793;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
                ".webmanifest": "application/manifest+json", ".xml": "application/xml" };

const serveur = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(RACINE, p);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end("404"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

let pass = 0, fail = 0;
function check(nom, obtenu, attendu, tol) {
  const ok = Math.abs(obtenu - attendu) <= tol;
  if (ok) pass++; else fail++;
  console.log("  %s | %s | obtenu %s | attendu %s",
    ok ? "OK   " : "ECHEC", nom, obtenu.toFixed(2), attendu.toFixed(2));
}
function dit(nom, ok) {
  if (ok) pass++; else fail++;
  console.log("  %s | %s", ok ? "OK   " : "ECHEC", nom);
}

/* Les quatre salaires sont choisis : 25 000 et 40 000 laissent du credit,
   46 656 est le point exact ou il s'annule, 75 000 est bien au-dela. */
const CAS = [
  { brut: 25000, statut: "single" },
  { brut: 40000, statut: "single" },
  { brut: 46656, statut: "single" },
  { brut: 75000, statut: "single" },
  { brut: 60000, statut: "marriedJoint" },   // le couple garde son credit plus longtemps
  { brut: 30000, statut: "headOfHousehold" } // rabattu sur la colonne Single du Pub 14
];

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  const nav = await chromium.launch({ headless: true });
  const page = await nav.newPage();
  const erreurs = [];
  page.on("console", m => { if (m.type() === "error") erreurs.push("console: " + m.text().slice(0, 160)); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message.slice(0, 160)));
  page.on("requestfailed", r => {
    if (!/googletagmanager|google-analytics/.test(r.url())) {
      erreurs.push("requete echouee: " + r.url().slice(0, 90));
    }
  });

  await page.goto(`http://localhost:${PORT}/paycheck-calculator/utah/`, { waitUntil: "networkidle" });

  console.log("\n--- la page s'affiche ---");
  dit("le titre H1 est celui de l'Utah",
    (await page.textContent("h1")).indexOf("Utah Paycheck Calculator 2026") === 0);
  dit("le formulaire est branche sur l'Utah",
    (await page.getAttribute("[data-paycheck-form]", "data-state")) === "utah");
  const corps = await page.evaluate(() => document.body.innerText);
  dit("aucun NaN ni undefined dans le texte rendu", !/NaN|undefined/.test(corps));
  dit("le taux 4,45 % est bien celui affiche", corps.includes("4.45%"));
  /* 4,5 % a le droit d'etre cite : la page explique justement que la page de
     taux de l'Etat est perimee. Ce qu'on verifie, c'est que le bon taux domine
     largement, pour qu'aucun lecteur ne reparte avec l'ancien. */
  const n445 = (corps.match(/4\.45%/g) || []).length;
  const n45 = (corps.match(/4\.5%/g) || []).length;
  dit("le taux 4,45 % domine largement l'ancien 4,5 % (" + n445 + " contre " + n45 + ")",
    n45 > 0 && n445 >= n45 * 3);

  console.log("\n--- le calculateur, pilote pour de vrai ---");
  for (const cas of CAS) {
    const attendu = calcul("utah", cas.brut, cas.statut);
    await page.fill("#salary", String(cas.brut));
    await page.selectOption("#period", "annual");
    await page.selectOption("#filing", cas.statut);
    await page.selectOption("#display", "annual");
    await page.click("button[type=submit]");
    await page.waitForTimeout(150);

    const lu = await page.evaluate(() => {
      const nb = t => Number(String(t).replace(/[^0-9.]/g, ""));
      const res = document.querySelector("[data-paycheck-result]");
      const net = nb(res.querySelector(".result-head").textContent);
      let etat = 0;
      res.querySelectorAll(".line").forEach(l => {
        if (/State income tax/.test(l.querySelector("dt").textContent)) {
          etat = nb(l.querySelector("dd").textContent);
        }
      });
      return { net, etat };
    });

    const etiq = cas.brut + " " + cas.statut;
    check("impot d'Etat rendu a l'ecran, " + etiq, lu.etat, attendu.etat, 1);
    check("net rendu a l'ecran, " + etiq, lu.net, attendu.net, 1);
  }

  console.log("\n--- ce que la console du navigateur a dit ---");
  dit("aucune erreur de console, aucune violation de CSP", erreurs.length === 0);
  erreurs.forEach(e => console.log("      " + e));

  await nav.close();
  serveur.close();
  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
