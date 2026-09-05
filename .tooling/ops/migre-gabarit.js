/* Migration unique : remplace les 32 copies de l'en-tete et du pied de page
 * par la version canonique de .tooling/lib/gabarit.js, ET fait pointer les
 * generateurs vers le module au lieu de leur copie.
 *
 * Les deux dans le meme passage, volontairement : migrer le HTML sans migrer
 * les generateurs ferait revenir l'ancienne version a la premiere relance d'un
 * generateur, et personne ne le verrait avant la mise en ligne.
 *
 * Idempotent : relancer ne change rien. Lancer : node .tooling/ops/migre-gabarit.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { entete, piedDePage } = require("../lib/gabarit.js");

const RACINE = path.join(__dirname, "..", "..");
const listeGit = m => execFileSync("git", ["ls-files", m], { cwd: RACINE })
  .toString().trim().split("\n").filter(Boolean);

/* Quelle rubrique du menu est la page courante. */
function rubrique(fichier) {
  const p = "/" + fichier.replace(/\\/g, "/");
  if (p.includes("/paycheck-calculator/")) return "paycheck";
  if (p.includes("/salary-to-hourly-calculator/")) return "s2h";
  if (p.includes("/methodology/")) return "methodology";
  return null;
}

/* Remplace le bloc <balise>…</balise> par `remplacant`. Renvoie null si le bloc
   est absent — on ne devine pas, on signale. */
function remplaceBloc(source, balise, remplacant) {
  const debut = source.indexOf("<" + balise);
  const fin = source.indexOf("</" + balise + ">");
  if (debut < 0 || fin < 0 || fin < debut) return null;
  return source.slice(0, debut) + remplacant + source.slice(fin + balise.length + 3);
}

let modifies = 0, inchanges = 0, ignores = 0;

/* ---- 1. les pages HTML servies -------------------------------------------- */
console.log("=== PAGES HTML ===");
for (const f of listeGit("*.html")) {
  const abs = path.join(RACINE, f);
  let s = fs.readFileSync(abs, "utf8");
  if (!s.includes('class="brand"')) { ignores++; continue; }

  const avant = s;
  const h = remplaceBloc(s, "header", entete(rubrique(f)));
  if (h === null) { console.log("  ⚠ SANS <header> : " + f); ignores++; continue; }
  s = h;
  const p = remplaceBloc(s, "footer", piedDePage());
  if (p === null) { console.log("  ⚠ SANS <footer> : " + f); ignores++; continue; }
  s = p;

  if (s === avant) { inchanges++; continue; }
  fs.writeFileSync(abs, s);
  modifies++;
  console.log("  migre  " + f + "  [" + (rubrique(f) || "aucune rubrique") + "]");
}
console.log("  -> " + modifies + " migrees, " + inchanges + " deja conformes, " + ignores + " ignorees");

/* ---- 2. les generateurs ---------------------------------------------------- */
/* Ils portent le HTML dans un litteral de gabarit. On y injecte un appel au
   module. La rubrique se deduit du nom du generateur, pas du chemin de sortie. */
const RUBRIQUE_GEN = {
  "build-hawaii.js": "paycheck", "build-michigan.js": "paycheck",
  "build-ohio.js": "paycheck", "build-pennsylvania.js": "paycheck",
  "build-utah.js": "paycheck", "build-s2h-hub.js": "s2h",
  "build-s2h-page.js": "s2h", "build-rate-page.js": null
};

console.log("\n=== GENERATEURS ===");
let gen = 0;
for (const [nom, rub] of Object.entries(RUBRIQUE_GEN)) {
  const abs = path.join(RACINE, ".tooling", "ops", nom);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + nom); continue; }
  let s = fs.readFileSync(abs, "utf8");
  const avant = s;

  if (!s.includes("gabarit.js")) {
    /* On accroche le require juste apres celui d'etats-publies, sinon apres le
       dernier require du fichier : l'ordre des require n'a pas d'importance ici,
       mais le placement doit etre deterministe pour que la migration soit
       rejouable a l'identique. */
    const ancre = s.match(/^const .*require\(["'][^"']*etats-publies\.js["']\);$/m)
               || s.match(/^const .*require\([^)]*\);$/m);
    if (!ancre) { console.log("  ⚠ aucun require ou s'accrocher : " + nom); continue; }
    const ligne = `const { entete, piedDePage } = require("../lib/gabarit.js");`;
    s = s.replace(ancre[0], ancre[0] + "\n" + ligne);
  }

  const appelH = "${entete(" + (rub === null ? "null" : JSON.stringify(rub)) + ")}";
  const h = s.includes("<header class=") ? remplaceBloc(s, "header", appelH) : s;
  if (h === null) { console.log("  ⚠ <header> introuvable : " + nom); continue; }
  s = h;
  const p = s.includes("<footer class=") ? remplaceBloc(s, "footer", "${piedDePage()}") : s;
  if (p === null) { console.log("  ⚠ <footer> introuvable : " + nom); continue; }
  s = p;

  if (s === avant) { console.log("  deja conforme  " + nom); continue; }
  fs.writeFileSync(abs, s);
  gen++;
  console.log("  migre  " + nom + "  [" + (rub || "aucune rubrique") + "]");
}
console.log("  -> " + gen + " generateurs migres");
