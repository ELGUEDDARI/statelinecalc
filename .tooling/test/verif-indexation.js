/* Tout ce qu'un moteur de recherche regarde avant de decider d'indexer.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * « Indexer sans erreur » n'est pas une chose, c'est une dizaine : le sitemap
 * doit lister exactement les pages publiables, chaque page doit se declarer
 * canonique sur sa propre URL, aucun titre ni aucune description ne doit se
 * repeter, aucune page ne doit se noindexer par accident, et rien qui ne soit
 * pas une page ne doit trainer a la racine du site.
 *
 * ⛔ CE QUE CE SCRIPT A TROUVE LE 05/09/2026, ET QU'AUCUN AUTRE TEST NE VOYAIT :
 * /.tooling/ etait servi publiquement. .nojekyll est present, donc GitHub Pages
 * sert meme les dossiers commencant par un point — 19 fragments de tableaux
 * HTML sans <head> ni titre, plus les fiches de sources et les notes de travail,
 * tous en HTTP 200. Du contenu pauvre, duplique des pages publiees, offert au
 * crawl. Corrige par robots.txt, avec le Disallow repete dans chaque groupe.
 *
 * ⛔ PIEGE DE MESURE, tombe dedans trois fois le meme jour :
 *   - `grep '<title>'` compte AUSSI les <title> des chemins SVG de la carte
 *     (ils servent de nom accessible a chaque Etat) et annonce 12 doublons qui
 *     n'existent pas. On ne lit le titre que dans le <head>.
 *   - `grep 'nofollow'` remonte les liens sortants vers les sources
 *     officielles, ou le nofollow est VOULU. Un noindex, c'est <meta name=
 *     "robots">, pas un attribut de lien.
 *   - `grep 'lang="en"'` rate lang="en-US" et declare 33 pages fautives.
 * A chaque fois le grep avait raison sur ce qu'il cherchait, et tort sur la
 * question posee. On lit donc la structure, pas des sous-chaines.
 *
 * Lancer : node .tooling/test/verif-indexation.js [--servi]
 */
const fs = require("fs");
const path = require("path");
const https = require("https");

const RACINE = path.join(__dirname, "..", "..");
const SERVI = process.argv.includes("--servi");
const SITE = "https://statelinecalc.com";

let ok = 0;
const echecs = [];
function dit(bon, quoi, detail) {
  if (bon) { ok++; console.log("  OK    | " + quoi); return; }
  echecs.push(quoi);
  console.log("  ECHEC | " + quoi + (detail ? "  |  " + detail : ""));
}

function recupere(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      if (r.statusCode !== 200) { r.resume(); return res({ code: r.statusCode, corps: "" }); }
      let d = ""; r.setEncoding("utf8");
      r.on("data", c => d += c); r.on("end", () => res({ code: 200, corps: d }));
    }).on("error", rej);
  });
}

/* Le <head> s'arrete a </head>. Tout ce qui suit appartient au corps, et les
   balises du corps ne comptent pas comme metadonnees. */
const tete = s => s.slice(0, s.indexOf("</head>") + 7);
const prem = (s, re) => { const m = s.match(re); return m ? m[1] : null; };

(async () => {
  console.log("=== INDEXATION (" + (SERVI ? "SERVI" : "LOCAL") + ") ===\n");

  const xml = SERVI ? (await recupere(SITE + "/sitemap.xml")).corps
                    : fs.readFileSync(path.join(RACINE, "sitemap.xml"), "utf8");
  const urls = (xml.match(/<loc>([^<]+)<\/loc>/g) || []).map(m => m.replace(/<\/?loc>/g, ""));
  dit(urls.length > 0, "le sitemap se lit (" + urls.length + " URL)");
  dit(new Set(urls).size === urls.length, "aucune URL en double dans le sitemap",
      urls.length - new Set(urls).size + " doublon(s)");
  dit((xml.match(/<lastmod>/g) || []).length === urls.length,
      "chaque entree du sitemap porte un lastmod");

  /* Le sitemap doit couvrir les pages publiables, ni plus ni moins. On compare
     a l'arborescence reelle, en excluant l'atelier et les pages de service. */
  const surDisque = [];
  (function marche(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) marche(p);
      else if (e.name === "index.html") {
        /* ⛔ La racine donne un chemin relatif VIDE, pas "." : concatener sans
           precaution produit « https://statelinecalc.com// » et le sitemap
           parait a la fois incomplet et fantome. Deux faux echecs le
           05/09/2026, sur la page d'accueil, la seule page concernee. */
        const rel = path.relative(RACINE, path.dirname(p)).replace(/\\/g, "/");
        surDisque.push(SITE + "/" + (rel ? rel + "/" : ""));
      }
    }
  })(RACINE);
  const disque = new Set(surDisque);
  const carte = new Set(urls);
  const manquantes = [...disque].filter(u => !carte.has(u));
  const fantomes = [...carte].filter(u => !disque.has(u));
  dit(manquantes.length === 0, "aucune page publiable absente du sitemap", manquantes.join(" "));
  dit(fantomes.length === 0, "aucune URL du sitemap sans page sur le disque", fantomes.join(" "));

  const titres = new Map(), descs = new Map();
  let pbCanon = [], pbNoindex = [], pbLang = [], pbH1 = [], pbOg = [];

  for (const u of urls) {
    let s;
    if (SERVI) {
      const r = await recupere(u);
      if (r.code !== 200) { dit(false, u + " repond 200", "HTTP " + r.code); continue; }
      s = r.corps;
    } else {
      const rel = u.replace(SITE + "/", "").replace(/\/$/, "");
      s = fs.readFileSync(path.join(RACINE, rel, "index.html"), "utf8");
    }
    const h = tete(s);

    const canon = prem(h, /<link rel="canonical" href="([^"]+)"/);
    if (canon !== u || (h.match(/rel="canonical"/g) || []).length !== 1) pbCanon.push(u + " -> " + canon);

    const robots = prem(h, /<meta name="robots" content="([^"]+)"/);
    if (robots && /noindex|none/i.test(robots)) pbNoindex.push(u + " (" + robots + ")");

    if (!/<html[^>]*\blang="en(-[A-Z]{2})?"/.test(s)) pbLang.push(u);

    const t = prem(h, /<title>([^<]*)<\/title>/);
    if (t) { titres.set(t, (titres.get(t) || []).concat(u)); }
    else pbH1.push(u + " sans <title>");

    const d = prem(h, /<meta name="description" content="([^"]*)"/);
    if (d) descs.set(d, (descs.get(d) || []).concat(u));
    else pbH1.push(u + " sans description");

    /* Le H1 se compte dans le CORPS. Une page a exactement un H1. */
    const corps = s.slice(s.indexOf("</head>"));
    const nbH1 = (corps.match(/<h1[\s>]/g) || []).length;
    if (nbH1 !== 1) pbH1.push(u + " a " + nbH1 + " H1");

    if (!/property="og:title"/.test(h) || !/property="og:description"/.test(h)) pbOg.push(u);
  }

  dit(pbCanon.length === 0, "chaque page est canonique sur sa propre URL, une seule fois", pbCanon.join(" ; "));
  dit(pbNoindex.length === 0, "aucune page ne se noindexe", pbNoindex.join(" ; "));
  dit(pbLang.length === 0, "chaque page declare lang=en", pbLang.join(" "));
  dit(pbH1.length === 0, "un titre, une description et un seul H1 par page", pbH1.join(" ; "));
  dit(pbOg.length === 0, "chaque page porte ses balises Open Graph", pbOg.join(" "));

  const dTitres = [...titres.entries()].filter(([, v]) => v.length > 1);
  const dDescs = [...descs.entries()].filter(([, v]) => v.length > 1);
  dit(dTitres.length === 0, "aucun titre en double", dTitres.map(([k, v]) => k + " x" + v.length).join(" ; "));
  dit(dDescs.length === 0, "aucune description en double", dDescs.map(([, v]) => v.join(" = ")).join(" ; "));

  const longs = [...titres.keys()].filter(t => t.length > 65);
  dit(longs.length === 0, "aucun titre au-dela de 65 caracteres (risque de troncature en SERP)",
      longs.map(t => t.length + " : " + t).join(" ; "));
  /* ⛔ CECI N'EST PAS UN ECHEC D'INDEXATION, et c'est pourquoi ce bloc
     n'incremente pas le compteur d'echecs. Une description de 200 caracteres
     s'indexe parfaitement ; elle se fait simplement tronquer dans la SERP, ce
     qui coute du clic, pas de l'indexation. La classer en ECHEC ici serait une
     erreur de categorie — et la reecrire en masse pour verdir un test le serait
     encore plus : la consigne du PDG impose de regarder la SERP reelle avant de
     toucher a une description publiee. Le chiffre est donc MESURE et REMONTE,
     la decision appartient au PDG. */
  const trop = [...descs.entries()].filter(([d]) => d.length > 165);
  const courtes = [...descs.entries()].filter(([d]) => d.length < 70);
  console.log("\n  AVERTISSEMENT (n'empeche pas l'indexation) :");
  console.log("    descriptions > 165 car., tronquees en SERP : " + trop.length + " / " + descs.size +
              (trop.length ? "  (max " + Math.max(...trop.map(([d]) => d.length)) + " car.)" : ""));
  console.log("    descriptions < 70 car., trop maigres        : " + courtes.length + " / " + descs.size);

  /* robots.txt : le Disallow de l'atelier doit figurer dans CHAQUE groupe, sinon
     un robot nomme qui trouve son propre groupe ignore celui de « * ». */
  const rt = SERVI ? (await recupere(SITE + "/robots.txt")).corps
                   : fs.readFileSync(path.join(RACINE, "robots.txt"), "utf8");
  const groupes = rt.split(/^User-agent:/m).slice(1);
  const sansDisallow = groupes
    .filter(g => !/Disallow:\s*\/\.tooling\//.test(g))
    .map(g => g.split("\n")[0].trim());
  dit(groupes.length > 0 && sansDisallow.length === 0,
      "l'atelier /.tooling/ est interdit dans les " + groupes.length + " groupes de robots.txt",
      "groupes sans le Disallow : " + sansDisallow.join(", "));
  dit(/^Sitemap: https:\/\/statelinecalc\.com\/sitemap\.xml$/m.test(rt),
      "robots.txt annonce le sitemap");

  console.log("\n=== INDEXATION (" + (SERVI ? "SERVI" : "LOCAL") + ") : " +
              ok + " OK, " + echecs.length + " ECHEC ===");
  process.exit(echecs.length ? 1 : 0);
})();
