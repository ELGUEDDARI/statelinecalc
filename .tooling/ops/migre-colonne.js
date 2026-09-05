/* Pose la colonne laterale sur les pages de contenu, et dans les generateurs.
 *
 * Meme regle que les migrations precedentes : pages ET generateurs dans le meme
 * passage, sinon la prochaine relance d'un generateur retirerait la colonne sans
 * que rien ne le signale.
 *
 * ── OU ELLE VA, ET OU ELLE NE VA PAS ────────────────────────────────────────
 * Sur les pages qui ont du contenu a cote duquel une colonne a un sens : les
 * 11 pages d'Etat, les 4 pages par taux, les 8 pages salary-to-hourly et les
 * deux hubs.
 * ⛔ PAS sur About, Contact, Privacy, Terms, Disclaimer ni Methodology. Une
 * colonne de liens connexes a cote des conditions d'utilisation ne sert
 * personne, et sur des pages courtes elle depasserait le contenu.
 *
 * L'aside se place juste AVANT </main>, en dernier dans le document : un clavier
 * et un lecteur d'ecran le rencontrent apres le contenu principal, ce qui est
 * l'ordre juste pour du complementaire. Sa place a droite vient de la grille.
 *
 * ⛔ LE CONTENU DOIT ETRE ENVELOPPE. Premiere version le 05/09/2026 : l'aside
 * etait pose seul et la grille appliquee directement sur <main>, avec
 * `grid-row: 1 / -1` sur la colonne. Resultat a l'ecran : la colonne s'affichait
 * bien, mais le contenu principal DISPARAISSAIT — une colonne qui s'etend sur
 * toutes les rangees force la grille a etirer chacune d'elles en hauteur, donc
 * le H1 se retrouvait pousse a 800 px sous le fil d'Ariane.
 * On enveloppe donc le contenu dans <div class="col-contenu">. La grille n'a
 * plus que DEUX enfants — le contenu et la colonne — et le probleme disparait
 * par construction. Aucun compteur ne l'aurait vu : il a fallu la capture.
 *
 * Idempotent. Lancer : node .tooling/ops/migre-colonne.js
 */
const fs = require("fs");
const path = require("path");
const { colonne } = require("../lib/colonne.js");
const { PUBLIES, S2H_PUBLIES } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");
const FIN = "</main>";
const OUVERTURE = '<main class="wrap">';

/* chemin relatif -> nom d'Etat de la page (ou null) */
const CIBLES = {};
Object.keys(PUBLIES).forEach(n => {
  CIBLES[path.join("paycheck-calculator", PUBLIES[n], "index.html")] = n;
});
Object.keys(S2H_PUBLIES).forEach(n => {
  CIBLES[path.join("salary-to-hourly-calculator", S2H_PUBLIES[n], "index.html")] = n;
});
[25, 27, 30, 35].forEach(t => {
  CIBLES[path.join(t + "-an-hour-is-how-much-a-year", "index.html")] = null;
});
CIBLES[path.join("paycheck-calculator", "index.html")] = null;
CIBLES[path.join("salary-to-hourly-calculator", "index.html")] = null;

const GENERATEURS = {
  "build-hawaii.js": "Hawaii", "build-michigan.js": "Michigan", "build-ohio.js": "Ohio",
  "build-pennsylvania.js": "Pennsylvania", "build-utah.js": "Utah",
  "build-rate-page.js": null, "build-s2h-hub.js": null
};

let posees = 0, deja = 0, rates = 0;
console.log("=== PAGES ===");
for (const rel of Object.keys(CIBLES).sort()) {
  const abs = path.join(RACINE, rel);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absente : " + rel); rates++; continue; }
  let s = fs.readFileSync(abs, "utf8");
  if (s.includes('class="colonne"')) { deja++; continue; }
  const i = s.lastIndexOf(FIN);
  if (i < 0) { console.log("  ⚠ pas de </main> : " + rel); rates++; continue; }
  const d = s.indexOf(OUVERTURE);
  if (d < 0) { console.log("  ⚠ pas de <main class=\"wrap\"> : " + rel); rates++; continue; }
  const debutContenu = d + OUVERTURE.length;
  s = s.slice(0, debutContenu) + '\n<div class="col-contenu">' +
      s.slice(debutContenu, i) + '</div>\n' + colonne(CIBLES[rel]) + "\n\n" + s.slice(i);
  fs.writeFileSync(abs, s);
  posees++;
  console.log("  posee  " + rel.replace(/\\/g, "/").padEnd(48) + "[" + (CIBLES[rel] || "aucun Etat") + "]");
}
console.log("  -> " + posees + " posees, " + deja + " deja faites, " + rates + " en echec");

console.log("\n=== GENERATEURS ===");
let gen = 0;
for (const [nom, etat] of Object.entries(GENERATEURS)) {
  const abs = path.join(RACINE, ".tooling", "ops", nom);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + nom); continue; }
  let s = fs.readFileSync(abs, "utf8");
  if (s.includes("colonne.js")) { console.log("  deja conforme  " + nom); continue; }
  const ancre = s.match(/^const .*require\(["'][^"']*gabarit\.js["']\);$/m);
  if (!ancre) { console.log("  ⚠ aucun require ou s'accrocher : " + nom); continue; }
  const i = s.lastIndexOf(FIN);
  if (i < 0) { console.log("  ⚠ pas de </main> : " + nom); continue; }
  const d = s.indexOf(OUVERTURE);
  if (d < 0) { console.log("  ⚠ pas de <main class=\"wrap\"> : " + nom); continue; }
  const debutContenu = d + OUVERTURE.length;
  s = s.slice(0, debutContenu) + '\n<div class="col-contenu">' +
      s.slice(debutContenu, i) + '</div>\n${colonne(' +
      (etat === null ? "null" : JSON.stringify(etat)) + ")}\n\n" + s.slice(i);
  s = s.replace(ancre[0], ancre[0] + '\nconst { colonne } = require("../lib/colonne.js");');
  fs.writeFileSync(abs, s);
  gen++;
  console.log("  migre  " + nom.padEnd(24) + "[" + (etat || "aucun Etat") + "]");
}
console.log("  -> " + gen + " generateurs migres");
process.exit(rates ? 1 : 0);
