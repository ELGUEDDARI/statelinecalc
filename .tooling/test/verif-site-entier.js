/* Le site ENTIER, dans un vrai navigateur : chaque URL du sitemap, chaque
 * bouton, chaque console.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * Les tests existants controlent chacun une chose sur un perimetre choisi :
 * test-etat-navigateur pilote UN Etat, verif-gabarit lit le HTML sans le rendre,
 * verif-liens ne fait que des requetes HTTP. Aucun ne repond a la question que
 * pose le PDG : « toutes les URL marchent, tous les boutons marchent, aucune
 * erreur ». Le 05/09/2026 la page Tennessee a ete publiee avec le calculateur
 * mort — /data/rates-2026.js manquait — et TOUTES les suites unitaires etaient
 * vertes. Il a fallu ouvrir un navigateur pour le voir.
 *
 * Ce script ne teste pas des valeurs (c'est le travail de test-etat-navigateur
 * et test-tableaux). Il teste que RIEN NE CASSE : pas d'erreur JS, pas de
 * violation CSP, pas de ressource en 404, et chaque bouton produit un effet.
 *
 * ⛔ Chromium neuf et sans profil. On ne pointe JAMAIS un profil Chrome ouvert
 * sans channel:'chrome' — Chrome deplacerait le profil dans profile.CHROME_DELETE
 * et la session serait perdue. Ici, aucun profil : le risque n'existe pas.
 *
 * Lancer : node .tooling/test/verif-site-entier.js [--servi]
 *   sans --servi : sert le depot en local sur un port dedie
 *   avec --servi : tape sur https://statelinecalc.com
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { stabilise } = require("./attente.js");

const RACINE = path.join(__dirname, "..", "..");
const PORT = 8797;
const SERVI = process.argv.includes("--servi");
const BASE = SERVI ? "https://statelinecalc.com" : "http://127.0.0.1:" + PORT;

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css",
  ".js": "text/javascript", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".png": "image/png", ".webmanifest": "application/manifest+json",
  ".xml": "application/xml", ".txt": "text/plain" };

let ok = 0;
const echecs = [];
function dit(bon, quoi, detail) {
  if (bon) { ok++; return; }
  echecs.push(quoi + (detail ? "  |  " + detail : ""));
  console.log("  ECHEC | " + quoi + (detail ? "  |  " + detail : ""));
}

/* Les URL a visiter viennent du sitemap SERVI : c'est ce que Google lit, donc
   c'est la liste qui fait foi — pas un tableau recopie a la main ici, qui
   divergerait le jour ou une page serait ajoutee sans etre inscrite. */
function lisSitemap() {
  const p = path.join(RACINE, "sitemap.xml");
  const xml = fs.readFileSync(p, "utf8");
  return (xml.match(/<loc>([^<]+)<\/loc>/g) || [])
    .map(m => m.replace(/<\/?loc>/g, "").replace("https://statelinecalc.com", ""))
    .map(u => u === "" ? "/" : u);
}

(async () => {
  let serveur = null;
  if (!SERVI) {
    serveur = http.createServer((req, res) => {
      let rel = decodeURIComponent(req.url.split("?")[0]);
      if (rel.endsWith("/")) rel += "index.html";
      const abs = path.join(RACINE, rel);
      /* path.resolve contre la remontee de repertoire : un test qui sert le
         disque entier est un trou, meme en local. */
      if (!path.resolve(abs).startsWith(path.resolve(RACINE))) { res.writeHead(403); return res.end(); }
      fs.readFile(abs, (e, buf) => {
        if (e) { res.writeHead(404, { "Content-Type": "text/plain" }); return res.end("404"); }
        res.writeHead(200, { "Content-Type": TYPES[path.extname(abs)] || "application/octet-stream" });
        res.end(buf);
      });
    });
    await new Promise(r => serveur.listen(PORT, "127.0.0.1", r));
  }

  const urls = lisSitemap();
  console.log("=== SITE ENTIER (" + (SERVI ? "SERVI" : "LOCAL") + ") : " + urls.length + " pages ===\n");

  const nav = await chromium.launch({ headless: true });
  for (const u of urls) {
    const page = await nav.newPage();
    const bruit = [];
    page.on("console", m => { if (m.type() === "error") bruit.push("console: " + m.text()); });
    page.on("pageerror", e => bruit.push("erreur JS: " + e.message));
    /* ⛔ NE PAS compter un beacon d'analytics comme une requete echouee. Google
       Analytics repond 204 puis la requete est annulee — c'est le cycle de vie
       normal d'un beacon, pas une panne. Premiere version de ce script, le
       05/09/2026 : 21 faux echecs « console propre » sur 33 pages, tous la-dessus.
       Verifie a la sonde : REPONSE 204 puis net::ERR_ABORTED sur la meme URL. */
    page.on("requestfailed", r => {
      if (/google-analytics\.com|googletagmanager\.com|analytics\.google\.com/.test(r.url())) return;
      bruit.push("requete echouee: " + r.url());
    });
    const rates = [];
    page.on("response", r => { if (r.status() >= 400) rates.push(r.status() + " " + r.url()); });

    let reponse = null;
    try {
      reponse = await page.goto(BASE + u, { waitUntil: "load", timeout: 30000 });
    } catch (e) {
      dit(false, u, "la page n'a pas charge : " + e.message);
      await page.close(); continue;
    }

    dit(reponse && reponse.status() === 200, u + " repond 200",
        reponse ? "HTTP " + reponse.status() : "aucune reponse");
    dit(rates.length === 0, u + " charge toutes ses ressources", rates.join(" ; "));

    /* Le texte rendu, pas le HTML : un NaN qui n'apparait qu'apres execution du
       script ne se voit que la. */
    const corps = await page.evaluate(() => document.body.innerText);
    dit(!/NaN|undefined|\[object Object\]/.test(corps), u + " sans NaN ni undefined",
        (corps.match(/.{0,40}(NaN|undefined|\[object Object\]).{0,40}/) || [""])[0]);

    /* Chaque bouton doit faire QUELQUE CHOSE. Un bouton qui ne change rien a la
       page est soit mort, soit decoratif — dans les deux cas c'est un defaut.
     *
     * ⛔ DEUX PIEGES, tous deux rencontres le 05/09/2026 sur ce meme script :
     *
     * 1. Le calculateur SE LANCE TOUT SEUL au chargement. Le bloc resultat est
     *    vide dans le HTML servi, mais le JS le remplit aussitot avec un salaire
     *    par defaut. Mesurer le DOM « avant clic » mesure donc un DOM DEJA
     *    rempli, et re-saisir la valeur par defaut ne change evidemment rien.
     *    Premiere version : 7 faux « bouton mort » alors que les boutons
     *    marchaient — verifie a la sonde, $50,390 -> $72,145 -> $93,250.
     *
     * 2. La longueur de innerHTML est un mauvais temoin : deux montants de meme
     *    largeur donnent la meme longueur. On lit le TEXTE du resultat.
     *
     * Donc : on saisit une valeur volontairement DIFFERENTE de ce qui est
     * affiche, et on exige que le texte du resultat change. */
    const lireResultat = () => page.evaluate(() => {
      const t = document.querySelector("[data-paycheck-result] .result-head");
      return t ? t.textContent.trim() : null;
    });

    const boutons = await page.$$("button, input[type=submit]");
    for (const b of boutons) {
      if (!(await b.isVisible())) continue;
      const nom = (await b.textContent() || await b.getAttribute("value") || "sans texte").trim().slice(0, 40);
      const champ = await page.$("#salary");
      const avantTexte = await lireResultat();
      const avantDom = await page.evaluate(() => document.body.innerHTML.length);

      if (champ && avantTexte !== null) {
        /* 90000 puis 120000 : si l'un des deux tombait sur la valeur par defaut,
           l'autre ne le peut pas. Le test ne depend d'aucun defaut suppose. */
        const essais = ["90000", "120000"];
        let change = false, vus = [avantTexte];
        for (const v of essais) {
          await page.fill("#salary", v);
          try { await b.click({ timeout: 5000 }); }
          catch (e) { dit(false, u + " bouton « " + nom + " » cliquable", e.message.split("\n")[0]); break; }
          await stabilise(page);
          const apres = await lireResultat();
          vus.push(apres);
          if (apres && apres !== avantTexte) { change = true; break; }
        }
        dit(change, u + " bouton « " + nom + " » recalcule", "resultat inchange : " + vus.join(" -> "));
      } else {
        try { await b.click({ timeout: 5000 }); }
        catch (e) { dit(false, u + " bouton « " + nom + " » cliquable", e.message.split("\n")[0]); continue; }
        await stabilise(page);
        const apresDom = await page.evaluate(() => document.body.innerHTML.length);
        dit(apresDom !== avantDom || page.url() !== BASE + u,
            u + " bouton « " + nom + " » produit un effet", "le DOM n'a pas bouge");
      }
      if (page.url() !== BASE + u) { await page.goto(BASE + u, { waitUntil: "load" }); }
    }

    dit(bruit.length === 0, u + " console propre", bruit.slice(0, 3).join(" ; "));
    await page.close();
  }
  await nav.close();
  if (serveur) serveur.close();

  console.log("\n=== SITE ENTIER (" + (SERVI ? "SERVI" : "LOCAL") + ") : " +
              ok + " OK, " + echecs.length + " ECHEC ===");
  process.exit(echecs.length ? 1 : 0);
})();
