/* Compare les TABLEAUX SERVIS a la bibliotheque de calcul, ligne par ligne,
 * pour tous les Etats.
 *
 * Pourquoi ce fichier existe. Le 02/09/2026, la page Ohio a ete publiee avec un
 * tableau faux : il annoncait 43 $ d'impot d'Etat sur 30 000 $ la ou la loi en
 * demande 374,63 $. Cause : gen-table.js et gen-hourly-table.js empruntaient a
 * paie.js ses OUTILS (progressiveTax, deductionEtat) mais refaisaient
 * l'assemblage a la main. Ils ignoraient donc, en silence, tout mecanisme
 * ajoute au moteur apres eux — la marche de l'Ohio, le credit de l'Utah, et les
 * retenues employeePrograms de la Pennsylvanie.
 *
 * Le commit du 28/08 disait avoir mis fin aux copies de l'arithmetique. Il
 * avait supprime les copies des FORMULES, pas celle de l'ASSEMBLAGE. Ce test
 * verifie la seule chose qui compte : que le nombre imprime dans la page est
 * celui que calcul() donne. Il est independant de la facon dont on y arrive.
 *
 * Le tableau est le bloc le plus important du site : c'est la version rendue
 * cote serveur, la seule que les crawlers d'IA lisent. Un tableau faux est
 * donc une erreur publiee ET citee.
 *
 * Lancer : node .tooling/test/test-tableaux.js
 */
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, R, HEURES, c2 } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
let pass = 0, fail = 0;

function check(nom, obtenu, attendu, tol) {
  const ok = Math.abs(obtenu - attendu) <= tol;
  if (ok) pass++; else {
    fail++;
    console.log("  ECHEC | %s | tableau %s | moteur %s", nom, c2(obtenu), c2(attendu));
  }
  return ok;
}

/* Tout ce que l'Etat prend, quel que soit le nom que ca porte dans la fiche :
   impot sur le revenu, conge paye, WA Cares, programmes salaries. C'est ce que
   la colonne « state » du tableau est censee contenir. */
function totalEtat(r) {
  return r.etat + r.paidLeave + r.waCares
       + (r.programmes || []).reduce((t, p) => t + p.montant, 0);
}

const nombre = t => Number(String(t).replace(/[$,]/g, ""));

function lignes(html) {
  return html.split("<tr>").slice(1).map(bloc => {
    const cases = [...bloc.matchAll(/<td[^>]*>(?:<strong>)?([^<]+)/g)].map(m => m[1].trim());
    return cases;
  });
}

const etats = Object.keys(R.states);
console.log("\n=== TABLEAU PAR SALAIRE ===");
for (const cle of etats) {
  const html = execFileSync(process.execPath,
    [path.join(RACINE, ".tooling", "test", "gen-table.js"), cle], { encoding: "utf8" });
  const l = lignes(html);
  if (l.length < 20) { fail++; console.log("  ECHEC | " + cle + " : tableau vide ou illisible"); continue; }
  let ecarts = 0;
  for (const c of l) {
    const brut = nombre(c[0]);
    const r = calcul(cle, brut);
    if (!check(cle + " · impot d'Etat sur " + c[0], nombre(c[3]), totalEtat(r), 1)) ecarts++;
    if (!check(cle + " · net sur " + c[0], nombre(c[4]), r.net, 1)) ecarts++;
  }
  console.log("  %s | %s : %d lignes", ecarts ? "ECHEC" : "OK   ", cle, l.length);
}

console.log("\n=== TABLEAU PAR TAUX HORAIRE ===");
for (const cle of etats) {
  const html = execFileSync(process.execPath,
    [path.join(RACINE, ".tooling", "test", "gen-hourly-table.js"), cle], { encoding: "utf8" });
  const l = lignes(html);
  if (l.length < 20) { fail++; console.log("  ECHEC | " + cle + " : tableau vide ou illisible"); continue; }
  let ecarts = 0;
  for (const c of l) {
    const taux = nombre(c[0]);
    const r = calcul(cle, taux * HEURES);
    if (!check(cle + " · brut a " + c[0] + "/h", nombre(c[1]), r.brut, 1)) ecarts++;
    if (!check(cle + " · net a " + c[0] + "/h", nombre(c[2]), r.net, 1)) ecarts++;
  }
  console.log("  %s | %s : %d lignes", ecarts ? "ECHEC" : "OK   ", cle, l.length);
}

console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
process.exit(fail === 0 ? 0 : 1);
