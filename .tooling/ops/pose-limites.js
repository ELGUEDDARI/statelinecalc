/* Pose ET met a jour les deux blocs de confiance (limites.js) sur les
 * 18 pages d'Etat, les 8 pages "salary to hourly", et dans les generateurs
 * qui les reconstruisent.
 *
 * Meme methode que pose-sources.js : les blocs sont encadres de marqueurs
 * HTML, donc REMPLACES quand ils existent et POSES quand ils manquent.
 * Relancer le script met a jour, il ne double jamais.
 *
 * Ancres choisies apres verification qu'elles existent, au mot pres, sur
 * TOUTES les pages visees (grep prealable, 12/09/2026) :
 *   - CHECKLIST se pose avant `<h2 id="calc-h"` (18 pages d'Etat + 8 s2h,
 *     26/26 verifie).
 *   - LIMITES se pose avant `<h2>Key facts` sur les pages d'Etat (18/18) et
 *     avant `<h2>Common questions</h2>` sur les pages s2h (8/8) : les deux
 *     hubs (index.html) ne l'ont pas, ce n'est pas un defaut - un hub ne
 *     calcule rien.
 *
 * Idempotent. Lancer : node .tooling/ops/pose-limites.js
 */
const fs = require("fs");
const path = require("path");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { PUBLIES, S2H_PUBLIES } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");

function remplaceOuPose(s, debut, fin, ancre, bloc) {
  const i = s.indexOf(debut);
  if (i >= 0) {
    const j = s.indexOf(fin, i);
    if (j < 0) return null;                       // bloc tronque : on ne devine pas
    return { texte: s.slice(0, i) + bloc + s.slice(j + fin.length), action: "mis a jour" };
  }
  const k = s.indexOf(ancre);
  if (k < 0) return null;
  return { texte: s.slice(0, k) + bloc + "\n\n" + s.slice(k), action: "pose" };
}

function traiter(abs, nom, ancreLimites) {
  if (!fs.existsSync(abs)) { console.log("  ⚠ absente : " + nom); return "echec"; }
  let s = fs.readFileSync(abs, "utf8");
  let touche = false;

  const rC = remplaceOuPose(s, "  <!-- CHECKLIST:debut", "  <!-- CHECKLIST:fin -->",
                             '<h2 id="calc-h"', blocChecklist());
  if (!rC) { console.log("  ⚠ ancre CHECKLIST introuvable : " + nom); return "echec"; }
  if (rC.texte !== s) { s = rC.texte; touche = true; }

  const rL = remplaceOuPose(s, "  <!-- LIMITES:debut", "  <!-- LIMITES:fin -->",
                             ancreLimites, blocLimites());
  if (!rL) { console.log("  ⚠ ancre LIMITES introuvable : " + nom); return "echec"; }
  if (rL.texte !== s) { s = rL.texte; touche = true; }

  if (!touche) { console.log("  inchange       " + nom); return "inchange"; }
  fs.writeFileSync(abs, s);
  console.log("  mis a jour     " + nom);
  return "ok";
}

let pages = 0, echecs = 0;

console.log("=== PAGES D'ETAT (paycheck-calculator) ===");
for (const nom of Object.keys(PUBLIES).sort()) {
  const cle = PUBLIES[nom];
  const abs = path.join(RACINE, "paycheck-calculator", cle, "index.html");
  const r = traiter(abs, nom, "  <h2>Key facts");
  if (r === "echec") echecs++; else if (r === "ok") pages++;
}

console.log("\n=== PAGES SALARY-TO-HOURLY ===");
for (const nom of Object.keys(S2H_PUBLIES).sort()) {
  const cle = S2H_PUBLIES[nom];
  const abs = path.join(RACINE, "salary-to-hourly-calculator", cle, "index.html");
  const r = traiter(abs, nom, "  <h2>Common questions</h2>");
  if (r === "echec") echecs++; else if (r === "ok") pages++;
}

console.log("\n-> " + pages + " pages mises a jour, " + echecs + " en echec");
process.exit(echecs ? 1 : 0);
