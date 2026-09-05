/* Pose la carte des Etats-Unis sur les 11 pages d'Etat, avec le repere
 * « vous etes ici », ET dans les 5 generateurs qui en produisent une.
 *
 * Meme principe que migre-gabarit.js : les deux dans le meme passage, sinon
 * relancer un generateur retirerait la carte de sa page sans que rien ne le
 * signale. Six des onze pages d'Etat n'ont AUCUN generateur (Floride, Georgie,
 * Illinois, Nevada, Texas, Washington) : elles se modifient ici et seulement ici.
 *
 * La carte se pose juste au-dessus de « Browse paycheck calculators by state »,
 * dont la grille des 50 sert de liste d'appui — d'ou avecListe: false, pour ne
 * pas afficher deux fois les memes onze liens a trois centimetres d'ecart.
 *
 * Idempotent. Lancer : node .tooling/ops/migre-carte.js
 */
const fs = require("fs");
const path = require("path");
const { carteUsa } = require("../lib/bloc-carte.js");
const { PUBLIES } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");
const ANCRE = "  <h2>Browse paycheck calculators by state</h2>";

/* Le nom d'Etat que chaque generateur produit. Ecrit en clair plutot que devine
   dans le source : un generateur construit un seul Etat, et une deduction
   fragile poserait le mauvais repere « vous etes ici ». */
const ETAT_DU_GENERATEUR = {
  "build-hawaii.js": "Hawaii", "build-michigan.js": "Michigan",
  "build-ohio.js": "Ohio", "build-pennsylvania.js": "Pennsylvania",
  "build-utah.js": "Utah"
};

let posees = 0, deja = 0, absentes = 0;

console.log("=== PAGES D'ETAT ===");
for (const nom of Object.keys(PUBLIES).sort()) {
  const rel = path.join("paycheck-calculator", PUBLIES[nom], "index.html");
  const abs = path.join(RACINE, rel);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absente : " + rel); absentes++; continue; }
  let s = fs.readFileSync(abs, "utf8");
  if (s.includes("bloc-carte")) { console.log("  deja posee  " + nom); deja++; continue; }
  if (!s.includes(ANCRE)) { console.log("  ⚠ ancre introuvable : " + rel); absentes++; continue; }
  s = s.replace(ANCRE, carteUsa(nom, { avecListe: false }) + "\n\n" + ANCRE);
  fs.writeFileSync(abs, s);
  console.log("  posee  " + nom.padEnd(14) + "  (" + fs.statSync(abs).size + " octets)");
  posees++;
}

console.log("\n=== GENERATEURS ===");
let gen = 0;
for (const [fichier, etat] of Object.entries(ETAT_DU_GENERATEUR)) {
  const abs = path.join(RACINE, ".tooling", "ops", fichier);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + fichier); continue; }
  let s = fs.readFileSync(abs, "utf8");
  if (s.includes("bloc-carte.js")) { console.log("  deja conforme  " + fichier); continue; }
  if (!s.includes(ANCRE)) { console.log("  ⚠ ancre introuvable : " + fichier); continue; }
  const ancreRequire = s.match(/^const .*require\(["'][^"']*gabarit\.js["']\);$/m);
  if (!ancreRequire) { console.log("  ⚠ aucun require ou s'accrocher : " + fichier); continue; }
  s = s.replace(ancreRequire[0],
    ancreRequire[0] + '\nconst { carteUsa } = require("../lib/bloc-carte.js");');
  s = s.replace(ANCRE, "${carteUsa(" + JSON.stringify(etat) + ', { avecListe: false })}\n\n' + ANCRE);
  fs.writeFileSync(abs, s);
  console.log("  migre  " + fichier.padEnd(24) + "[" + etat + "]");
  gen++;
}

console.log("\n-> " + posees + " pages, " + gen + " generateurs, " + deja + " deja faites, " +
            absentes + " en echec");
process.exit(absentes ? 1 : 0);
