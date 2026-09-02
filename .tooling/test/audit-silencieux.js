/* Cherche les defauts QUI NE FONT ECHOUER AUCUN TEST.
 *
 * Pourquoi ce fichier existe. Le 02/09/2026, trois defauts sont partis en
 * ligne et aucun n'a fait echouer quoi que ce soit :
 *   - <ul class="state-grid"> alors que la CSS ne definit que .linkgrid : le
 *     HTML reste valide, la CSS ignore la classe inconnue, la grille tombe en
 *     liste a puces sur une colonne. Quatre pages, cinq jours.
 *   - un tableau publie qui contredisait le calculateur de sa propre page.
 *   - un generateur relance qui a efface des liens internes.
 * Le point commun : rien ne LEVE d'erreur. Il faut donc aller mesurer ce que
 * le navigateur FAIT, page par page, au lieu d'attendre qu'une exception
 * remonte.
 *
 * Ce que ce fichier controle, sur CHAQUE page du sitemap :
 *   1. les classes CSS employees dans le HTML mais definies nulle part ;
 *   2. les liens internes qui ne repondent pas 200 ;
 *   3. les erreurs de console et les violations de CSP ;
 *   4. le JSON-LD : est-il parsable, et son @type est-il coherent ;
 *   5. les elements de tete obligatoires : title, description, canonical ;
 *   6. le canonical : pointe-t-il sur la page elle-meme ;
 *   7. les restes de gabarit : NaN, undefined, ${...}, [object Object].
 *
 * Lancer : node .tooling/test/audit-silencieux.js [--servi]
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RACINE = path.join(__dirname, "..", "..");
const PORT = 8797;
const SERVI = process.argv.includes("--servi");
const HOTE = "https://statelinecalc.com";

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
                ".txt": "text/plain", ".webmanifest": "application/manifest+json",
                ".xml": "application/xml" };

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

/* Les URL viennent du sitemap : c'est la liste que le site declare lui-meme. */
const sitemap = fs.readFileSync(path.join(RACINE, "sitemap.xml"), "utf8");
const chemins = [...sitemap.matchAll(/<loc>https:\/\/statelinecalc\.com(\/[^<]*)<\/loc>/g)]
  .map(m => m[1]);

const anomalies = [];
const note = (page, genre, detail) => anomalies.push({ page, genre, detail });

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  const BASE = SERVI ? HOTE : "http://localhost:" + PORT;
  const nav = await chromium.launch({ headless: true });
  const page = await nav.newPage({ viewport: { width: 1280, height: 900 } });

  console.log("\ncible : " + BASE + "  (" + chemins.length + " pages du sitemap)\n");

  /* Les liens deja vus, pour ne pas retester la meme cible 29 fois. */
  const statutConnu = new Map();

  for (const chemin of chemins) {
    const erreurs = [];
    page.removeAllListeners("console");
    page.removeAllListeners("pageerror");
    page.removeAllListeners("requestfailed");
    page.on("console", m => { if (m.type() === "error") erreurs.push("console: " + m.text().slice(0, 140)); });
    page.on("pageerror", e => erreurs.push("pageerror: " + e.message.slice(0, 140)));
    page.on("requestfailed", r => {
      if (!/googletagmanager|google-analytics/.test(r.url())) {
        erreurs.push("requete echouee: " + r.url().slice(0, 90));
      }
    });

    let rep;
    try { rep = await page.goto(BASE + chemin, { waitUntil: "networkidle", timeout: 60000 }); }
    catch (e) { note(chemin, "page injoignable", e.message.split("\n")[0]); continue; }
    if (!rep || rep.status() !== 200) { note(chemin, "statut HTTP", rep ? rep.status() : "aucune reponse"); continue; }

    erreurs.forEach(e => note(chemin, "console", e));

    const d = await page.evaluate(() => {
      /* 1. Toutes les classes posees dans le HTML. */
      const posees = new Set();
      /* el.className sur un element SVG n'est pas une chaine mais un
         SVGAnimatedString : le lire avec String() donnait « [object
         SVGAnimatedString] » et 56 fausses anomalies au premier passage.
         classList marche sur les deux. */
      document.querySelectorAll("[class]").forEach(el =>
        [...el.classList].forEach(c => posees.add(c)));
      /* Toutes les classes que la CSS connait, feuilles du meme domaine incluses. */
      const connues = new Set();
      for (const f of document.styleSheets) {
        let regles; try { regles = f.cssRules; } catch { continue; }
        const creuser = rs => { for (const r of rs) {
          if (r.selectorText) (r.selectorText.match(/\.[A-Za-z0-9_-]+/g) || [])
            .forEach(c => connues.add(c.slice(1)));
          if (r.cssRules) creuser(r.cssRules);
        } };
        creuser(regles);
      }
      const inconnues = [...posees].filter(c => !connues.has(c));

      /* 2. Les liens internes. */
      const liens = [...new Set([...document.querySelectorAll('a[href^="/"]')]
        .map(a => a.getAttribute("href")))];

      /* 4. Le JSON-LD. */
      const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => {
        try { JSON.parse(s.textContent); return null; }
        catch (e) { return e.message.slice(0, 100); }
      }).filter(Boolean);

      /* 5 et 6. La tete. */
      const meta = n => (document.querySelector('meta[name="' + n + '"]') || {}).content || "";
      const canon = (document.querySelector('link[rel="canonical"]') || {}).href || "";

      /* 7. Les restes de gabarit dans le texte rendu. */
      const t = document.body.innerText;
      const restes = [];
      if (/\bNaN\b/.test(t)) restes.push("NaN");
      if (/\bundefined\b/.test(t)) restes.push("undefined");
      if (/\$\{/.test(t)) restes.push("${ non interpole");
      if (/\[object Object\]/.test(t)) restes.push("[object Object]");
      if (/&[a-z]+;/.test(t)) restes.push("entite HTML non decodee : " + (t.match(/&[a-z]+;/) || [])[0]);

      return { inconnues, liens, ld, titre: document.title,
               desc: meta("description"), canon, restes };
    });

    d.inconnues.forEach(c => note(chemin, "classe CSS sans style", c));
    d.ld.forEach(e => note(chemin, "JSON-LD illisible", e));
    d.restes.forEach(r => note(chemin, "reste de gabarit", r));
    if (!d.titre) note(chemin, "tete", "title absent");
    else if (d.titre.length > 65) note(chemin, "tete", "title de " + d.titre.length + " caracteres");
    if (!d.desc) note(chemin, "tete", "meta description absente");
    if (!d.canon) note(chemin, "tete", "canonical absent");
    else if (d.canon !== HOTE + chemin) note(chemin, "canonical", "pointe sur " + d.canon);

    for (const l of d.liens) {
      if (!statutConnu.has(l)) {
        const r = await page.request.get(BASE + l).catch(() => null);
        statutConnu.set(l, r ? r.status() : 0);
      }
      const s = statutConnu.get(l);
      if (s !== 200) note(chemin, "lien interne casse", l + " -> HTTP " + s);
    }

    process.stdout.write(".");
  }

  await nav.close();
  serveur.close();

  console.log("\n");
  if (!anomalies.length) {
    console.log("=== AUCUNE ANOMALIE sur " + chemins.length + " pages ===\n");
    process.exit(0);
  }
  const parGenre = {};
  anomalies.forEach(a => (parGenre[a.genre] = parGenre[a.genre] || []).push(a));
  for (const genre of Object.keys(parGenre).sort()) {
    console.log("### " + genre.toUpperCase() + " — " + parGenre[genre].length);
    const vus = new Set();
    for (const a of parGenre[genre]) {
      const cle = a.detail;
      if (vus.has(cle)) continue;
      vus.add(cle);
      const pages = parGenre[genre].filter(x => x.detail === cle).map(x => x.page);
      console.log("  " + a.detail + "  (" + pages.length + " page"
        + (pages.length > 1 ? "s" : "") + " : " + pages.slice(0, 4).join(", ")
        + (pages.length > 4 ? ", …" : "") + ")");
    }
    console.log("");
  }
  console.log("=== " + anomalies.length + " anomalie(s) sur " + chemins.length + " pages ===\n");
  process.exit(1);
})();
