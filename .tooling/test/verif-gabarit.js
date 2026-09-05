/* Prouve que les 32 pages servies portent EXACTEMENT le meme en-tete et le meme
 * pied de page, ceux de .tooling/lib/gabarit.js.
 *
 * POURQUOI : avant la centralisation du 05/09/2026, il circulait 3 versions de
 * l'en-tete et 4 du pied de page sur 32 pages, sans que personne l'ait decide.
 * Deux liens manquaient quelque part : les 9 pages « salary to hourly » n'avaient
 * pas le lien vers leur propre hub, et 28 pages sur 32 n'avaient aucun lien
 * « Home » en pied de page. Rien ne le signalait.
 *
 * Ce test echoue des qu'une page derive a nouveau — y compris si un generateur
 * regenere une page avec sa vieille copie.
 *
 * Lancer : node .tooling/test/verif-gabarit.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { entete, piedDePage, NAV, PIED } = require("../lib/gabarit.js");

const RACINE = path.join(__dirname, "..", "..");
const norm = s => s.replace(/\s+/g, " ").trim();

function rubrique(f) {
  const p = "/" + f.replace(/\\/g, "/");
  if (p.includes("/paycheck-calculator/")) return "paycheck";
  if (p.includes("/salary-to-hourly-calculator/")) return "s2h";
  if (p.includes("/methodology/")) return "methodology";
  return null;
}
function bloc(s, balise) {
  const d = s.indexOf("<" + balise), f = s.indexOf("</" + balise + ">");
  return (d < 0 || f < 0) ? null : s.slice(d, f + balise.length + 3);
}

const fichiers = execFileSync("git", ["ls-files", "*.html"], { cwd: RACINE })
  .toString().trim().split("\n")
  .filter(f => fs.readFileSync(path.join(RACINE, f), "utf8").includes('class="brand"'));

let ok = 0; const echecs = [];
console.log("=== GABARIT COMMUN : " + fichiers.length + " pages servies ===\n");

for (const f of fichiers) {
  const s = fs.readFileSync(path.join(RACINE, f), "utf8");
  const h = bloc(s, "header"), p = bloc(s, "footer");
  const rub = rubrique(f);
  const pbs = [];

  if (h === null) pbs.push("aucun <header>");
  else if (norm(h) !== norm(entete(rub))) pbs.push("en-tete different du gabarit");
  if (p === null) pbs.push("aucun <footer>");
  else if (norm(p) !== norm(piedDePage())) pbs.push("pied de page different du gabarit");

  /* Un controle de fond en plus de l'egalite : meme si le gabarit changeait,
     ces liens doivent exister sur chaque page. Un test qui ne compare qu'a
     lui-meme valide aussi une erreur commune a tout le monde. */
  for (const n of NAV) if (!s.includes('href="' + n.href + '"')) pbs.push("lien menu manquant : " + n.href);
  for (const l of PIED) if (!s.includes('href="' + l.href + '"')) pbs.push("lien pied manquant : " + l.href);

  /* La rubrique courante doit etre marquee dans le MENU, et une seule fois.
     ⛔ Compter aria-current sur toute la page donne un faux echec : le fil
     d'Ariane marque deja sa derniere miette de la meme facon. Premiere version
     de ce test, le 05/09/2026 : 24 echecs, tous imputables au test lui-meme.
     Lecon du projet, encore : quand un controle echoue en masse, suspecter le
     controle avant de suspecter les pages. */
  const marques = h === null ? 0 : (h.match(/aria-current="page"/g) || []).length;
  if (rub && marques !== 1) pbs.push("aria-current attendu 1 fois dans l'en-tete, trouve " + marques);
  if (!rub && marques !== 0) pbs.push("aria-current inattendu dans l'en-tete (" + marques + ")");

  if (pbs.length) { echecs.push(f); console.log("  ECHEC | " + f + "\n          " + pbs.join("\n          ")); }
  else ok++;
}

console.log("\n=== RESULTAT : " + ok + " OK, " + echecs.length + " ECHEC ===");
process.exit(echecs.length ? 1 : 0);
