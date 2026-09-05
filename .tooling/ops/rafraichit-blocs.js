/* Reconstruit les blocs generes qui sont INLINE dans les pages ecrites a la main.
 *
 * ── POURQUOI ────────────────────────────────────────────────────────────────
 * Six pages d'Etat n'ont aucun generateur : Floride, Georgie, Illinois, Nevada,
 * Texas, Washington. Trois blocs y sont donc figes dans le HTML alors qu'ils
 * derivent tous de PUBLIES :
 *   - la carte des Etats-Unis  (<section class="bloc-carte">)
 *   - la colonne laterale       (<aside class="colonne">)
 *   - la grille des 50 Etats    (<ul class="linkgrid">)
 * Publier un 12e Etat sans les reconstruire laisserait ces pages annoncer
 * 11 Etats — le meme defaut que les pages par taux figees a 8 le 05/09/2026.
 *
 * Les migrations migre-carte et migre-colonne POSENT un bloc absent ; celle-ci
 * REMPLACE un bloc present. Les deux sont necessaires et ne font pas la meme
 * chose : l'une installe, l'autre met a jour.
 *
 * Idempotent. Lancer : node .tooling/ops/rafraichit-blocs.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { carteUsa } = require("../lib/bloc-carte.js");
const { colonne } = require("../lib/colonne.js");
const { PUBLIES, grilleEtats } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");

/* chemin -> nom d'Etat de la page (pour le repere « vous etes ici ») */
const ETAT_DE = {};
Object.keys(PUBLIES).forEach(n => {
  ETAT_DE[("paycheck-calculator/" + PUBLIES[n] + "/index.html")] = n;
});

/* Remplace le bloc <balise ... class="cls"> … </balise> par `neuf`.
   On compte les balises ouvrantes pour trouver la bonne fermeture : un
   remplacement naif s'arreterait a la premiere </div> imbriquee. */
function remplace(s, balise, cls, neuf) {
  const debut = s.indexOf('<' + balise + ' class="' + cls + '"');
  if (debut < 0) return null;
  const ouvre = new RegExp("<" + balise + "\\b", "g");
  const ferme = new RegExp("</" + balise + ">", "g");
  let profondeur = 0, i = debut;
  while (i < s.length) {
    ouvre.lastIndex = i; ferme.lastIndex = i;
    const o = ouvre.exec(s), f = ferme.exec(s);
    if (!f) return null;
    if (o && o.index < f.index) { profondeur++; i = o.index + 1; continue; }
    profondeur--; i = f.index + 1;
    if (profondeur === 0) return s.slice(0, debut) + neuf + s.slice(f.index + balise.length + 3);
  }
  return null;
}

const pages = execFileSync("git", ["ls-files", "*.html"], { cwd: RACINE })
  .toString().trim().split("\n")
  .filter(f => fs.readFileSync(path.join(RACINE, f), "utf8").includes('class="brand"'));

let touchees = 0, blocs = 0;
for (const rel of pages) {
  const abs = path.join(RACINE, rel);
  let s = fs.readFileSync(abs, "utf8");
  const avant = s;
  const cle = rel.replace(/\\/g, "/");
  const etat = ETAT_DE[cle] || null;
  const faits = [];

  if (s.includes('<section class="bloc-carte">')) {
    const n = remplace(s, "section", "bloc-carte", carteUsa(etat, { avecListe: false }));
    if (n === null) { console.log("  ⚠ carte illisible : " + cle); } else { s = n; faits.push("carte"); }
  }
  if (s.includes('<aside class="colonne"')) {
    const n = remplace(s, "aside", "colonne", colonne(etat));
    if (n === null) { console.log("  ⚠ colonne illisible : " + cle); } else { s = n; faits.push("colonne"); }
  }
  if (s.includes('<ul class="linkgrid">')) {
    const n = remplace(s, "ul", "linkgrid", '<ul class="linkgrid">\n' + grilleEtats() + "\n  </ul>");
    if (n === null) { console.log("  ⚠ grille illisible : " + cle); } else { s = n; faits.push("grille"); }
  }

  if (s === avant) continue;
  fs.writeFileSync(abs, s);
  touchees++; blocs += faits.length;
  console.log("  " + cle.padEnd(48) + faits.join(", "));
}
console.log("-> " + touchees + " pages, " + blocs + " blocs reconstruits");
