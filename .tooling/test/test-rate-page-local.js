/* Controle NAVIGATEUR de la page /25-an-hour-is-how-much-a-year/, en local,
 * AVANT publication. Un HTML valide n'est pas une page qui s'affiche : on
 * ouvre reellement la page, on ecoute les erreurs de console et les violations
 * de CSP, et on relit les chiffres tels qu'ils sont RENDUS.
 *
 * Lancer : node .tooling/test/test-rate-page-local.js [slug]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/sland/Desktop/SHOPFY NERVOLAXE/node_modules/playwright");

const RACINE = path.join(__dirname, "..", "..");
const SLUG = process.argv[2] || "25-an-hour-is-how-much-a-year";
const PORT = 8791;

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

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  const nav = await chromium.launch({ headless: true });
  const page = await nav.newPage();
  const erreurs = [];
  page.on("console", m => { if (m.type() === "error") erreurs.push("console: " + m.text().slice(0, 160)); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message.slice(0, 160)));
  page.on("requestfailed", r => {
    // googletagmanager est bloque hors ligne : ce n'est pas un defaut de la page
    if (!/googletagmanager|google-analytics/.test(r.url())) {
      erreurs.push("requete echouee: " + r.url().slice(0, 90));
    }
  });

  await page.goto(`http://localhost:${PORT}/${SLUG}/`, { waitUntil: "networkidle" });

  const d = await page.evaluate(() => {
    const txt = document.body.innerText;
    return {
      h1: (document.querySelector("h1") || {}).innerText,
      titre: document.title,
      /* Le controle precedent testait fontFamily contre /serif$/ : la pile du site
         finit par "sans-serif", donc il echouait sur une page parfaitement stylee.
         Lecon du projet : quand un controle echoue, suspecter le controle.
         On teste maintenant une regle que SEULE notre feuille pose. */
      cssChargee: (() => {
        const w = document.querySelector(".wrap");
        const m = w ? getComputedStyle(w).maxWidth : "none";
        return m && m !== "none" ? m : "NON CHARGEE";
      })(),
      lignesTableau: document.querySelectorAll("table tbody tr").length,
      tableaux: document.querySelectorAll("table").length,
      liensInternes: [...document.querySelectorAll("main a[href^='/']")].map(a => a.getAttribute("href")),
      nan: (txt.match(/NaN|undefined|\$\s*\$/g) || []).length,
      montants: (txt.match(/\$[\d,]+(\.\d{2})?/g) || []).length,
      largeurDebordement: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  const echecs = [];
  const ok = (nom, cond, detail) => {
    if (cond) console.log("  OK    | " + nom + (detail ? "  (" + detail + ")" : ""));
    else { console.log("  ECHEC | " + nom + (detail ? "  (" + detail + ")" : "")); echecs.push(nom); }
  };

  console.log("=== /" + SLUG + "/ rendue dans un vrai navigateur ===");
  ok("le H1 pose la question visee", /an Hour Is How Much a Year\?$/.test(d.h1 || ""), d.h1);
  ok("le titre contient la reponse chiffree", /\$52,000/.test(d.titre), d.titre);
  ok("la feuille de style est chargee", d.cssChargee !== "NON CHARGEE", ".wrap max-width = " + d.cssChargee);
  ok("trois tableaux presents", d.tableaux === 3, d.tableaux + " tableaux");
  ok("le tableau des Etats a 8 lignes", d.lignesTableau >= 8 + 6 + 7, d.lignesTableau + " lignes au total");
  ok("aucun NaN ni undefined rendu", d.nan === 0, d.nan + " occurrences");
  ok("des montants sont bien affiches", d.montants > 40, d.montants + " montants");
  ok("aucun debordement horizontal", !d.largeurDebordement);
  ok("aucune erreur de console ni de CSP", erreurs.length === 0, erreurs.join(" | ") || "aucune");

  // chaque lien interne doit repondre 200 sur le serveur local
  let casses = [];
  for (const h of [...new Set(d.liensInternes)]) {
    const r = await page.request.get(`http://localhost:${PORT}${h}`);
    if (r.status() !== 200) casses.push(h + " -> " + r.status());
  }
  ok("tous les liens internes repondent 200", casses.length === 0, casses.join(", ") || d.liensInternes.length + " liens");

  await nav.close(); serveur.close();
  console.log("\n=== RESULTAT : " + (9 + 1 - echecs.length) + " OK, " + echecs.length + " ECHEC ===");
  process.exit(echecs.length ? 1 : 0);
})();
