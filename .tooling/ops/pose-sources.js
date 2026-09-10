/* Pose ET met a jour le bloc « Sources » sur les 15 pages d'Etat, dans les
 * generateurs, et sur la page methodologie.
 *
 * ── LA DIFFERENCE AVEC migre-carte.js, ET POURQUOI ELLE COMPTE ──────────────
 * `migre-carte.js` POSE un bloc absent puis repond « deja posee » pour
 * toujours. Le 10/09/2026 cela a laisse la carte de 7 pages annoncer 14 Etats
 * alors que le site en publiait 15 ; il a fallu `rafraichit-blocs.js` pour le
 * rattraper. Ce script-ci ne repete pas l'erreur : le bloc est encadre de
 * marqueurs `<!-- SOURCES:debut -->` / `<!-- SOURCES:fin -->`, donc il est
 * REMPLACE quand il existe et POSE quand il manque. Relancer le met a jour.
 *
 * ── PAGES ET GENERATEURS DANS LE MEME PASSAGE ───────────────────────────────
 * Sinon la prochaine relance d'un generateur retirerait le bloc de sa page
 * sans que rien ne le signale. C'est la regle du depot depuis migre-gabarit.
 *
 * Idempotent. Lancer : node .tooling/ops/pose-sources.js
 */
const fs = require("fs");
const path = require("path");
const { blocSources, blocSourcesToutes } = require("../lib/sources.js");
const { PUBLIES } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");
const ANCRE = "  <h2>Related reading</h2>";
const DEBUT = "  <!-- SOURCES:debut";
const FIN = "  <!-- SOURCES:fin -->";

/* Quel Etat chaque generateur produit. Ecrit en clair : une deduction depuis
   le nom de fichier poserait la mauvaise cle le jour d'un renommage. */
const ETAT_DU_GENERATEUR = {
  "build-hawaii.js": "hawaii", "build-michigan.js": "michigan",
  "build-nebraska.js": "nebraska", "build-north-carolina.js": "north-carolina",
  "build-ohio.js": "ohio", "build-pennsylvania.js": "pennsylvania",
  "build-tennessee.js": "tennessee", "build-utah.js": "utah",
  "build-montana.js": "montana"
};

function remplaceOuPose(s, bloc) {
  const i = s.indexOf(DEBUT);
  if (i >= 0) {
    const j = s.indexOf(FIN, i);
    if (j < 0) return null;                       // bloc tronque : on ne devine pas
    return { texte: s.slice(0, i) + bloc + s.slice(j + FIN.length), action: "mis a jour" };
  }
  if (s.indexOf(ANCRE) < 0) return null;
  return { texte: s.replace(ANCRE, bloc + "\n\n" + ANCRE), action: "pose" };
}

let pages = 0, gens = 0, echecs = 0;

console.log("=== PAGES D'ETAT ===");
for (const nom of Object.keys(PUBLIES).sort()) {
  const cle = PUBLIES[nom];
  const abs = path.join(RACINE, "paycheck-calculator", cle, "index.html");
  if (!fs.existsSync(abs)) { console.log("  ⚠ absente : " + cle); echecs++; continue; }
  const s = fs.readFileSync(abs, "utf8");
  const r = remplaceOuPose(s, blocSources(cle));
  if (!r) { console.log("  ⚠ ancre introuvable : " + cle); echecs++; continue; }
  if (r.texte === s) { console.log("  inchange       " + nom); continue; }
  fs.writeFileSync(abs, r.texte);
  console.log("  " + r.action.padEnd(14) + " " + nom);
  pages++;
}

console.log("\n=== GENERATEURS ===");
for (const [fichier, cle] of Object.entries(ETAT_DU_GENERATEUR)) {
  const abs = path.join(RACINE, ".tooling", "ops", fichier);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + fichier); continue; }
  let s = fs.readFileSync(abs, "utf8");
  if (s.includes("lib/sources.js")) { console.log("  deja conforme  " + fichier); continue; }
  if (!s.includes(ANCRE)) { console.log("  ⚠ ancre introuvable : " + fichier); echecs++; continue; }
  const ancreRequire = s.match(/^const .*require\(["'][^"']*etats-publies\.js["']\);$/m);
  if (!ancreRequire) { console.log("  ⚠ aucun require ou s'accrocher : " + fichier); echecs++; continue; }
  s = s.replace(ancreRequire[0],
    ancreRequire[0] + '\nconst { blocSources } = require("../lib/sources.js");');
  s = s.replace(ANCRE, "${blocSources(" + JSON.stringify(cle) + ")}\n\n" + ANCRE);
  fs.writeFileSync(abs, s);
  console.log("  migre          " + fichier + "  [" + cle + "]");
  gens++;
}

/* La page methodologie porte la liste COMPLETE : c'est la seule page dont le
   metier est de prouver le sourcage, et elle ne contenait, mesure le
   10/09/2026, AUCUN lien sortant. */
console.log("\n=== METHODOLOGIE ===");
{
  const NOM = {};
  for (const [n, c] of Object.entries(PUBLIES)) NOM[c] = n;
  const abs = path.join(RACINE, "methodology", "index.html");
  const ANCRE_M = "<h2>Corrections</h2>";
  if (!fs.existsSync(abs)) { console.log("  absente"); echecs++; }
  else {
    const s = fs.readFileSync(abs, "utf8");
    const bloc = blocSourcesToutes(c => NOM[c] || c);
    let r = null;
    const i = s.indexOf(DEBUT);
    if (i >= 0) {
      const j = s.indexOf(FIN, i);
      if (j >= 0) r = { texte: s.slice(0, i) + bloc + s.slice(j + FIN.length), action: "mis a jour" };
    } else if (s.indexOf(ANCRE_M) >= 0) {
      r = { texte: s.replace(ANCRE_M, bloc + "\n\n" + ANCRE_M), action: "pose" };
    }
    if (!r) { console.log("  ancre introuvable"); echecs++; }
    else if (r.texte === s) console.log("  inchange");
    else {
      fs.writeFileSync(abs, r.texte);
      console.log("  " + r.action + "  (" + (bloc.match(/<a href="http/g) || []).length + " liens)");
      pages++;
    }
  }
}

console.log("\n-> " + pages + " pages, " + gens + " generateurs, " + echecs + " en echec");
process.exit(echecs ? 1 : 0);
