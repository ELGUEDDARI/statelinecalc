/* Controle NAVIGATEUR d'une page d'Etat : en local avant publication, et sur
 * le site SERVI apres.
 *
 * Pourquoi ce fichier existe : le calcul vit en DEUX exemplaires,
 * .tooling/lib/paie.js et assets/calc-paycheck.js, et seul le premier est
 * teste par test-engine.js — le second est un IIFE de navigateur qu'on ne peut
 * pas require. Un ecart entre les deux ne se verrait nulle part : la page
 * publierait un tableau juste et un calculateur faux. C'est arrive une fois
 * qu'on a failli l'introduire, en ajoutant a l'Utah un credit qui s'efface
 * puis a l'Ohio une marche de 332 $ — deux mecanismes que le tableau connait
 * et que le formulaire aurait pu ignorer.
 *
 * Il pilote le formulaire pour de vrai, a des salaires choisis de part et
 * d'autre des points ou l'impot de l'Etat change de forme, et compare ce qui
 * est RENDU a l'ecran a ce que dit la bibliotheque Node.
 *
 * Lancer : node .tooling/test/test-etat-navigateur.js <etat> [--servi]
 *   node .tooling/test/test-etat-navigateur.js ohio
 *   node .tooling/test/test-etat-navigateur.js ohio --servi
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { calcul, R } = require("../lib/paie.js");
const { stabilise } = require("./attente.js");

const RACINE = path.join(__dirname, "..", "..");
const PORT = 8793;
const ETAT = (process.argv[2] || "").toLowerCase();
const SERVI = process.argv.includes("--servi");

if (!ETAT || !R.states[ETAT]) {
  console.error("usage : node test-etat-navigateur.js <etat> [--servi]");
  console.error("etats connus : " + Object.keys(R.states).join(", "));
  process.exit(1);
}
const S = R.states[ETAT];

/* Les salaires testes. Le socle sert a tous les Etats ; on y ajoute les points
   ou CE bareme-la change de forme, parce que c'est la que les deux moteurs ont
   le plus de chances de diverger. */
const CAS = [
  { brut: 25000, statut: "single" },
  { brut: 75000, statut: "single" },
  { brut: 250000, statut: "single" },
  { brut: 60000, statut: "marriedJoint" },
  { brut: 30000, statut: "headOfHousehold" }
];

/* Une marche : on encadre le seuil au dollar pres, des deux cotes. */
if (S.incomeTax.notch) {
  const exo = (S.incomeTax.deductionByIncome
    ? S.incomeTax.deductionByIncome[0].amounts.single
    : (typeof S.incomeTax.standardDeduction === "object"
        ? S.incomeTax.standardDeduction.single : (S.incomeTax.standardDeduction || 0)));
  const seuil = S.incomeTax.notch.over + exo;
  CAS.push({ brut: seuil, statut: "single" }, { brut: seuil + 1, statut: "single" });
}
/* Un credit qui s'efface : on teste avant, pendant et apres l'effacement. */
if (S.incomeTax.taxCredit) {
  const c = S.incomeTax.taxCredit;
  const fin = c.phaseOutStart.single + c.base.single / c.phaseOutRate;
  CAS.push({ brut: Math.round(fin / 2), statut: "single" },
           { brut: Math.round(fin), statut: "single" });
}
/* Des paliers d'exoneration : on teste de part et d'autre de chaque frontiere. */
if (S.incomeTax.deductionByIncome) {
  S.incomeTax.deductionByIncome.forEach(p => {
    if (p.upTo !== null) CAS.push({ brut: p.upTo, statut: "single" },
                                  { brut: p.upTo + 1, statut: "single" });
  });
}

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

  const BASE = SERVI ? "https://statelinecalc.com" : "http://localhost:" + PORT;
  const URL = BASE + "/paycheck-calculator/" + ETAT + "/";
  console.log("\ncible : " + URL);

  const rep = await page.goto(URL, { waitUntil: "networkidle" });
  dit("la page repond 200", rep && rep.status() === 200);

  console.log("\n--- la page s'affiche ---");
  dit("le titre H1 nomme l'Etat",
    (await page.textContent("h1")).indexOf(S.name + " Paycheck Calculator 2026") === 0);
  dit("le formulaire est branche sur le bon Etat",
    (await page.getAttribute("[data-paycheck-form]", "data-state")) === ETAT);
  const corps = await page.evaluate(() => document.body.innerText);
  dit("aucun NaN ni undefined dans le texte rendu", !/NaN|undefined/.test(corps));

  console.log("\n--- le calculateur, pilote pour de vrai (%d cas) ---", CAS.length);
  for (const cas of CAS) {
    const attendu = calcul(ETAT, cas.brut, cas.statut);
    await page.fill("#salary", String(cas.brut));
    await page.selectOption("#period", "annual");
    await page.selectOption("#filing", cas.statut);
    await page.selectOption("#display", "annual");
    await page.click("button[type=submit]");
    /* ⛔ PAS d'attente fixe ici : le net est anime sur 350 ms et une lecture
       trop tot renvoie ~70 % de la valeur. Voir attente.js. */
    await stabilise(page);

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
  console.log("\n=== " + S.name.toUpperCase() + (SERVI ? " (SERVI)" : " (LOCAL)")
    + " : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail === 0 ? 0 : 1);
})();
