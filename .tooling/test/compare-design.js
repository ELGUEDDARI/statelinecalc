/* Compare NOTRE page a celles des concurrents qui se classent reellement sur
   "washington paycheck calculator" (SERP reelle du 27/08/2026).

   Ce qui est mesure, pas juge a l'oeil :
     - poids de la page et nombre de requetes reseau
     - temps jusqu'au premier rendu (FCP) et LCP
     - nombre de scripts tiers (mouchards, pubs)
     - largeur de la colonne de texte, taille du corps de texte
     - est-ce que le calculateur est visible SANS defiler, sur mobile 390px
     - hauteur totale de page

   Sort un tableau + une capture par site dans .tooling/test/captures/

   Lancer : node .tooling/test/compare-design.js
*/
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const SITES = [
  ["NOUS   statelinecalc", "https://statelinecalc.com/paycheck-calculator/washington/"],
  ["indep  jupid.com",     "https://jupid.com/paycheck-calculator/washington"],
  ["gros   smartasset",    "https://smartasset.com/taxes/washington-paycheck-calculator"],
  ["gros   paycheckcity",  "https://www.paycheckcity.com/calculator/salary/washington"],
  ["gros   adp",           "https://www.adp.com/resources/tools/calculators/states/washington-salary-paycheck-calculator.aspx"]
];

const DOSSIER = path.join(__dirname, "captures");

(async () => {
  fs.mkdirSync(DOSSIER, { recursive: true });
  const nav = await chromium.launch();
  const lignes = [];

  for (const [nom, url] of SITES) {
    const ctx = await nav.newContext({
      viewport: { width: 390, height: 844 },          // iPhone 14, mobile d'abord
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    });
    const page = await ctx.newPage();

    let octets = 0, requetes = 0;
    const hotes = new Set();
    page.on("response", async r => {
      requetes++;
      try {
        const h = new URL(r.url()).hostname;
        if (!h.endsWith(new URL(url).hostname.replace(/^www\./, ""))) hotes.add(h);
        const len = r.headers()["content-length"];
        if (len) octets += parseInt(len, 10);
      } catch (e) { /* url non parsable, on ignore */ }
    });

    const t0 = Date.now();
    let statut = "?";
    try {
      const rep = await page.goto(url, { waitUntil: "load", timeout: 45000 });
      statut = rep ? rep.status() : "?";
      await page.waitForTimeout(2500);               // laisse la pub/JS s'installer
    } catch (e) {
      lignes.push({ nom, statut: "ECHEC", note: e.message.slice(0, 60) });
      await ctx.close();
      continue;
    }
    const charge = Date.now() - t0;

    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0] || {};
      const fcp = (performance.getEntriesByName("first-contentful-paint")[0] || {}).startTime;
      const corps = document.querySelector("main p, article p, p");
      const cs = corps ? getComputedStyle(corps) : null;
      // Y a-t-il un champ de saisie visible sans defiler ?
      const champs = [...document.querySelectorAll("input,select")];
      const auDessus = champs.filter(e => {
        const r = e.getBoundingClientRect();
        return r.top >= 0 && r.top < innerHeight && r.width > 0 && r.height > 0;
      }).length;
      return {
        titre: document.title.slice(0, 55),
        hauteur: Math.round(document.body.scrollHeight),
        debord: Math.round(document.documentElement.scrollWidth - document.documentElement.clientWidth),
        police: cs ? Math.round(parseFloat(cs.fontSize)) : null,
        interligne: cs ? cs.lineHeight : null,
        largeurTexte: corps ? Math.round(corps.getBoundingClientRect().width) : null,
        scripts: document.querySelectorAll("script[src]").length,
        iframes: document.querySelectorAll("iframe").length,
        champsVisibles: auDessus,
        champsTotal: champs.length,
        fcp: fcp ? Math.round(fcp) : null,
        dcl: nav.domContentLoadedEventEnd ? Math.round(nav.domContentLoadedEventEnd) : null
      };
    });

    const fichier = path.join(DOSSIER, nom.split(/\s+/).pop().replace(/\W/g, "_") + ".png");
    await page.screenshot({ path: fichier });        // au-dessus de la ligne de flottaison

    lignes.push({
      nom, statut, charge, octets: Math.round(octets / 1024), requetes,
      tiers: hotes.size, ...m, capture: path.basename(fichier)
    });
    await ctx.close();
  }

  await nav.close();

  const col = (v, n) => String(v === null || v === undefined ? "-" : v).padEnd(n);
  console.log("\n=== MOBILE 390px — mesure du 27/08/2026, page 'washington paycheck calculator' ===\n");
  console.log(col("SITE", 22) + col("HTTP", 6) + col("Ko", 7) + col("req", 5) + col("tiers", 6) +
              col("FCP", 7) + col("police", 8) + col("larg.txt", 9) + col("scripts", 8) +
              col("iframe", 7) + col("champs vus", 11) + col("hauteur", 8));
  console.log("-".repeat(112));
  for (const l of lignes) {
    if (l.statut === "ECHEC") { console.log(col(l.nom, 22) + "ECHEC  " + l.note); continue; }
    console.log(
      col(l.nom, 22) + col(l.statut, 6) + col(l.octets, 7) + col(l.requetes, 5) +
      col(l.tiers, 6) + col(l.fcp ? l.fcp + "ms" : "-", 7) + col(l.police ? l.police + "px" : "-", 8) +
      col(l.largeurTexte ? l.largeurTexte + "px" : "-", 9) + col(l.scripts, 8) +
      col(l.iframes, 7) + col(l.champsVisibles + "/" + l.champsTotal, 11) + col(l.hauteur + "px", 8));
  }
  console.log("\ntiers    = nombre de domaines externes contactes (mouchards, pubs, polices)");
  console.log("champs vus = champs de saisie visibles SANS defiler / total sur la page");
  console.log("captures dans " + DOSSIER + "\n");
})();
