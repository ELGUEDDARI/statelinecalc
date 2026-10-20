/* Recoupe la retenue de la Caroline du Sud (moteur) avec ce que le SC Department of Revenue IMPRIME.
 *
 * Sources, lues le 2026-10-20 sur dor.sc.gov (HTTP 200, Last-Modified 2025-11-05) :
 *   - WH-1603F « FORMULA FOR COMPUTING SOUTH CAROLINA 2026 WITHHOLDING TAX » (Rev. 11/4/25),
 *     https://dor.sc.gov/sites/dor/files/forms/WH1603F_2026.pdf : allocation 5 000 $, deduction standard 10 % du salaire plafonnee a
 *     7 500 $, bareme 0 % jusqu'a 3 640 $ / 3 % jusqu'a 18 230 $ / 6 % au-dela (« then subtract $109.20 », « then subtract $656.10 »,
 *     « then add $437.70 »), constantes par periode (A, B, C, D), exemple imprime 750 $ par semaine, 3 allocations -> 549,90 $ -> 10,58 $ ;
 *   - WH-1603 « WITHHOLDING TAX TABLES » (Rev. 10/30/25), https://dor.sc.gov/sites/dor/files/forms/WH1603_2026.pdf : cinq tables (quotidienne,
 *     hebdomadaire, toutes les deux semaines, deux fois par mois, mensuelle), grille « tranche de salaire x 0 a 10 allocations », extraites
 *     par sc-tables-extract.py dans .tooling/sources/south-carolina-wh1603-tables.json.
 * Ce que le script prouve :
 *   1. les constantes imprimees par periode (A, C, D) = valeur annuelle / N, arrondie comme l'agence ;
 *   2. les trois formes du bareme imprimees (soustraction, addition, constante) sont la meme fonction ;
 *   3. l'exemple imprime de la formule se reproduit au cent pres ;
 *   4. chaque cellule de chaque grille imprimee = la formule independante, appliquee au MILIEU de la tranche de salaire annualise,
 *      arrondie au dollar SUPERIEUR (regle trouvee en comparant les trois points de la tranche et les trois arrondis : seule celle-la
 *      reproduit toute la grille) ; chaque grille est contigue, et sa derniere ligne finit au seuil imprime « N over » ;
 *   5. le moteur (annuel, non arrondi) reste a moins de 1 $ par paie de la cellule imprimee, pour 2 allocations (celibataire du site)
 *      et 3 allocations (marie et chef de famille du site).
 * Lancer : node .tooling/test/verif-retenue-sc.js
 */
const R = require("../../data/rates-2026.js");
const { calcul } = require("../lib/paie.js");
const T = require("../sources/south-carolina-wh1603-tables.json");
const A = R.states["south-carolina"].incomeTax;
let echecs = 0;
const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };
const N = { DAILY: 260, WEEKLY: 52, "BI-WEEKLY": 26, "SEMI-MONTHLY": 24, MONTHLY: 12 };
let n = 0;

/* 1. Constantes imprimees (WH-1603F) : [N, A allocation, C deduction max, D impot max de la 1re tranche]. */
const CONST = { MONTHLY: [12, 416.67, 625.00, 36.48], "SEMI-MONTHLY": [24, 208.33, 312.50, 18.24], "BI-WEEKLY": [26, 192.31, 288.46, 16.83], WEEKLY: [52, 96.15, 144.23, 8.42] };
const cent = x => Math.round(x * 100 + 1e-9) / 100;
for (const [per, [np, a, c, d]] of Object.entries(CONST)) {
  ok(cent(5000 / np) === a, per + " allocation : imprime " + a + ", 5 000 / " + np + " = " + 5000 / np);
  ok(cent(7500 / np) === c, per + " deduction max : imprime " + c + ", 7 500 / " + np + " = " + 7500 / np);
  ok(cent(437.70 / np) === d, per + " impot max 1re tranche : imprime " + d + ", 437,70 / " + np + " = " + 437.70 / np);
  n += 3;
}

/* 2. Le bareme, sous ses trois formes imprimees, et celui du moteur. */
const addition = t => t <= 3640 ? 0 : t <= 18230 ? (t - 3640) * 0.03 : (t - 18230) * 0.06 + 437.70;
const soustraction = t => t <= 3640 ? 0 : t <= 18230 ? t * 0.03 - 109.20 : t * 0.06 - 656.10;
for (const t of [0, 3640, 3641, 10000, 18230, 18231, 20100, 57500, 250000]) {
  ok(Math.abs(addition(t) - soustraction(t)) < 1e-9, "addition != soustraction a " + t);
  n++;
}
ok(Math.abs(3640 * 0.03 - 109.20) < 1e-9 && Math.abs((18230 - 3640) * 0.03 - 437.70) < 1e-9 && Math.abs(18230 * 0.06 - 437.70 - 656.10) < 1e-9, "constantes 109,20 / 437,70 / 656,10");
for (const st of ["single", "marriedJoint", "headOfHousehold"])
  ok(JSON.stringify(A.brackets[st]) === JSON.stringify([[3640, 0], [18230, 0.03], [Infinity, 0.06]]), "bareme du moteur (" + st + ") != WH-1603F");
ok(A.standardDeduction.single === 10000 && A.standardDeduction.marriedJoint === 15000 && A.standardDeduction.headOfHousehold === 15000, "allocations du moteur != 2 / 3 / 3 x 5 000 $");
ok(A.percentDeduction.rate === 0.10 && A.percentDeduction.cap === 7500, "deduction standard du moteur != 10 % plafonnee a 7 500 $");
n += 5;

/* 3. L'exemple imprime : 750 $ par semaine, 3 allocations. */
const formule = (annuel, k) => addition(Math.max(0, annuel - (k === 0 ? 0 : k * 5000 + Math.min(0.10 * annuel, 7500))));
{
  const annuel = 750 * 52, imposable = annuel - 15000 - 3900;
  ok(annuel === 39000 && imposable === 20100, "exemple imprime : 39 000 et 20 100");
  ok(Math.abs(formule(annuel, 3) - 549.90) < 1e-9, "exemple imprime : 549,90, calcul " + formule(annuel, 3));
  ok(cent(formule(annuel, 3) / 52) === 10.58, "exemple imprime : 10,58 $ par semaine");
  n += 3;
}

/* 4. Les grilles imprimees. */
let cellules = 0, exact = 0, lignes = 0;
for (const [per, rows] of Object.entries(T.lignes)) {
  const np = N[per];
  lignes += rows.length;
  for (let i = 1; i < rows.length; i++) ok(rows[i][0] === rows[i - 1][1], per + " : grille non contigue entre " + rows[i - 1][1] + " et " + rows[i][0]);
  ok(rows[0][0] === 0, per + " : la grille ne commence pas a 0");
  ok(rows[rows.length - 1][1] === T.audela[per], per + " : la derniere tranche finit a " + rows[rows.length - 1][1] + ", « over » imprime a " + T.audela[per]);
  for (const r of rows) {
    ok(r.length === 13, per + " " + r[0] + " : " + r.length + " nombres");
    const milieu = (r[0] + r[1]) / 2;
    for (let k = 0; k <= 10; k++) {
      cellules++;
      const imprime = r[2 + k];
      const calcule = Math.ceil(formule(milieu * np, k) / np - 1e-9);
      if (calcule === imprime) exact++;
      else ok(false, per + " " + r[0] + "-" + r[1] + " allocations " + k + " : imprime " + imprime + ", formule " + (formule(milieu * np, k) / np).toFixed(4));
    }
    /* 5. le moteur annuel, 2 allocations (celibataire) et 3 allocations (marie, chef de famille). */
    for (const [st, k] of [["single", 2], ["marriedJoint", 3], ["headOfHousehold", 3]]) {
      const moteur = calcul("south-carolina", milieu * np, st).etat / np;
      ok(Math.abs(moteur - r[2 + k]) <= 1 + 1e-9, "moteur " + st + " " + per + " " + r[0] + "-" + r[1] + " : imprime " + r[2 + k] + ", moteur " + moteur.toFixed(3));
    }
  }
}
n += Object.keys(T.audela).length;

console.log(n + " seuils et montants imprimes recoupes ; " + cellules + " cellules des grilles par tranches de salaire (" + lignes + " lignes, 5 tables) : " +
  exact + " reproduites exactement par la formule independante, " + (cellules - exact) + " ecart(s) ; moteur a moins de 1 $ par paie de chaque cellule (2 et 3 allocations) : " +
  (echecs ? echecs + " ECHEC(S)" : "OK"));
process.exit(echecs ? 1 : 0);
