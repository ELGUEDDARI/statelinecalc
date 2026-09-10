/* Le maillage interne, MESURE au lieu d'etre suppose.
 *
 * Le 10/09/2026 le PDG demande : « le cocon semantique est OK ? le maillage
 * interne aussi ? » Personne ne l'avait jamais mesure sur ce site — on avait
 * seulement l'intuition que « les pages se lient entre elles ».
 *
 * Ce script construit le graphe reel des liens internes a partir du HTML SERVI
 * (les fichiers du depot, qui sont ce que GitHub Pages publie) et repond a
 * quatre questions, chacune verifiable :
 *   1. Y a-t-il des pages ORPHELINES (aucun lien entrant) ? Une page orpheline
 *      n'existe pour Google que par le sitemap : c'est le pire defaut de cocon.
 *   2. A quelle PROFONDEUR chaque page est-elle depuis l'accueil ? Au-dela de 3
 *      clics, une page perd la force que lui transmet la page d'accueil.
 *   3. Le cocon est-il RECIPROQUE ? Un hub qui pointe vers ses pages sans
 *      qu'elles lui repondent n'est pas un cocon, c'est une liste.
 *   4. Les ANCRES sont-elles descriptives ? « click here », « this page » ou une
 *      URL brute ne disent rien a Google de la page ciblee.
 *
 * Lancer : node .tooling/test/verif-maillage.js
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..", "..");
const ANCRES_PAUVRES = ["click here", "here", "this page", "read more", "more", "link", "this"];

/* ---- 1. Trouver toutes les pages publiees (celles du sitemap) ------------- */
const sitemap = fs.readFileSync(path.join(RACINE, "sitemap.xml"), "utf8");
const pages = [...sitemap.matchAll(/<loc>https:\/\/statelinecalc\.com(\/[^<]*)<\/loc>/g)]
  .map(m => m[1]);

const fichier = url => path.join(RACINE, url.replace(/^\//, ""), "index.html");

/* ---- 2. Construire le graphe --------------------------------------------- */
const sortants = new Map();   // url -> Set(url)
const ancres = new Map();     // url -> [{vers, texte}]
const absents = [];

for (const url of pages) {
  const f = fichier(url);
  if (!fs.existsSync(f)) { absents.push(url); continue; }
  const html = fs.readFileSync(f, "utf8");
  /* On ignore ce qui n'est pas du corps de page : le JSON-LD et le <head>
     contiennent des URL qui ne sont pas des liens pour un lecteur. */
  const corps = html.replace(/<script[\s\S]*?<\/script>/gi, "")
                    .replace(/<head[\s\S]*?<\/head>/i, "");
  const vers = new Set();
  const listeAncres = [];
  for (const m of corps.matchAll(/<a\s[^>]*href="(\/[^"#?]*)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let cible = m[1];
    if (!cible.endsWith("/")) cible += "/";
    if (cible === url) continue;                    // auto-lien
    if (!pages.includes(cible)) continue;           // hors sitemap (fichier, ancre)
    const texte = m[2].replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, " ")
                      .replace(/\s+/g, " ").trim();
    vers.add(cible);
    listeAncres.push({ vers: cible, texte });
  }
  sortants.set(url, vers);
  ancres.set(url, listeAncres);
}

/* ---- 3. Liens entrants ---------------------------------------------------- */
const entrants = new Map(pages.map(p => [p, new Set()]));
for (const [de, vers] of sortants) for (const v of vers) entrants.get(v)?.add(de);

/* ---- 4. Profondeur depuis l'accueil (parcours en largeur) ----------------- */
const profondeur = new Map([["/", 0]]);
let front = ["/"];
while (front.length) {
  const suivant = [];
  for (const u of front) for (const v of (sortants.get(u) || [])) {
    if (!profondeur.has(v)) { profondeur.set(v, profondeur.get(u) + 1); suivant.push(v); }
  }
  front = suivant;
}

/* ---- 5. Rapport ----------------------------------------------------------- */
let alertes = 0;
const dit = (grave, texte) => { if (grave) alertes++; console.log((grave ? "  ⚠ " : "    ") + texte); };

console.log("=== MAILLAGE INTERNE — " + pages.length + " pages du sitemap ===\n");
if (absents.length) { console.log("PAGES DU SITEMAP SANS FICHIER :"); absents.forEach(u => dit(true, u)); console.log(""); }

console.log("1. PAGES ORPHELINES (aucun lien entrant depuis une autre page)");
const orphelines = pages.filter(p => p !== "/" && (entrants.get(p) || new Set()).size === 0);
if (!orphelines.length) console.log("    aucune — chaque page est atteignable par un lien\n");
else { orphelines.forEach(u => dit(true, u + " — n'existe que par le sitemap")); console.log(""); }

console.log("2. PROFONDEUR DEPUIS L'ACCUEIL");
const parNiveau = {};
for (const p of pages) {
  const d = profondeur.has(p) ? profondeur.get(p) : "inatteignable";
  (parNiveau[d] = parNiveau[d] || []).push(p);
}
for (const d of Object.keys(parNiveau).sort()) {
  const grave = d === "inatteignable" || Number(d) > 3;
  dit(grave, "profondeur " + d + " : " + parNiveau[d].length + " page(s)"
    + (grave ? " -> " + parNiveau[d].slice(0, 6).join(", ") : ""));
}
console.log("");

console.log("3. RECIPROCITE HUB <-> PAGE (un cocon repond, une liste ne repond pas)");
for (const hub of ["/paycheck-calculator/", "/salary-to-hourly-calculator/"]) {
  const enfants = [...(sortants.get(hub) || [])].filter(u => u.startsWith(hub) && u !== hub);
  const muettes = enfants.filter(e => !(sortants.get(e) || new Set()).has(hub));
  dit(muettes.length > 0, hub + " : " + enfants.length + " pages liees, "
    + (muettes.length ? muettes.length + " ne renvoient PAS au hub : " + muettes.join(", ")
                      : "toutes renvoient au hub"));
}
console.log("");

console.log("4. LIENS SORTANTS PAR PAGE (une page qui ne lie rien ne transmet rien)");
const compte = pages.map(p => [p, (sortants.get(p) || new Set()).size]).sort((a, b) => a[1] - b[1]);
compte.slice(0, 5).forEach(([p, n]) => dit(n < 3, p + " : " + n + " lien(s) interne(s)"));
const moyenne = compte.reduce((s, [, n]) => s + n, 0) / compte.length;
console.log("    moyenne : " + moyenne.toFixed(1) + " liens internes par page");
console.log("    maximum : " + compte[compte.length - 1][0] + " (" + compte[compte.length - 1][1] + ")\n");

console.log("5. ANCRES PAUVRES (le texte du lien doit decrire la cible)");
let pauvres = 0;
for (const [de, liste] of ancres) {
  for (const a of liste) {
    if (ANCRES_PAUVRES.includes(a.texte.toLowerCase()) || /^https?:/i.test(a.texte) || a.texte.length < 3) {
      dit(true, de + " -> " + a.vers + " : ancre « " + a.texte + " »");
      pauvres++;
    }
  }
}
if (!pauvres) console.log("    aucune — toutes les ancres sont descriptives\n");

console.log("=== " + (alertes ? alertes + " POINT(S) A REGARDER" : "AUCUNE ALERTE") + " ===");
process.exit(0);
