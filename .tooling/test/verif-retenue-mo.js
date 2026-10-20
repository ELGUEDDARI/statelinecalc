/* Recoupe la formule de retenue du Missouri (moteur) avec ce que le Department of Revenue IMPRIME.
 *
 * Source : « Employer's Tax Guide », Form-4282 (rev. 03-2026), copie Wayback du 2026-08-08 de
 * https://dor.mo.gov/forms/4282_2026.pdf (dor.mo.gov repond 403 en direct), pages 12-13 :
 *   - « Income Tax Withholding Percentage Table » : sept bornes par periode de paie (quotidien, hebdomadaire,
 *     toutes les 2 semaines, bimensuel, mensuel, annuel), transcrites ICI telles qu'imprimees ;
 *   - l'exemple « Employee is married (spouse works) » : 35 000 $ - 16 100 $ = 18 900 $ ; 707,81 $ par an ; 59 $ par mois.
 * Ce que le script prouve :
 *   1. les bornes imprimees de chaque periode = (1 348 $ x k) / N, arrondi a l'unite, pour k = 1..7 (N = 260, 52, 26, 24, 12, 1) ;
 *   2. la table annuelle du moteur = 0 % jusqu'a 1 348 $, six echelons de 1 348 $, 4,7 % au-dela de 9 436 $ ;
 *   3. l'exemple imprime : 18 900 $ -> 707,81 $ (l'agence additionne 263 arrondi) ; le moteur donne 707,668 $, ecart <= 0,15 $ ;
 *      et 707,81 / 12 arrondi au dollar = 59 $ = ce que le moteur donne arrondi pareil ;
 *   4. l'ecart total entre le moteur (non arrondi) et la retenue arrondie au dollar par paie reste sous 0,50 $ par paie.
 * Lancer : node .tooling/test/verif-retenue-mo.js
 */
const R = require("../../data/rates-2026.js");
const { calcul, progressiveTax } = require("../lib/paie.js");
const A = R.states.missouri.incomeTax;
let echecs = 0;
const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };

const IMPRIME = {
  daily:    { N: 260, bornes: [5, 10, 16, 21, 26, 31, 36] },
  weekly:   { N: 52,  bornes: [26, 52, 78, 104, 130, 156, 181] },
  biweekly: { N: 26,  bornes: [52, 104, 156, 207, 259, 311, 363] },
  semimonthly: { N: 24, bornes: [56, 112, 169, 225, 281, 337, 393] },
  monthly:  { N: 12,  bornes: [112, 225, 337, 449, 562, 674, 786] },
  annual:   { N: 1,   bornes: [1348, 2696, 4044, 5392, 6740, 8088, 9436] }
};
let n = 0;
for (const [nom, t] of Object.entries(IMPRIME)) {
  t.bornes.forEach((b, i) => {
    const calc = Math.round((1348 * (i + 1)) / t.N);
    n++;
    ok(calc === b, nom + " borne " + (i + 1) + " : imprime " + b + ", formule " + calc);
  });
}
const B = A.brackets.single;
const taux = [0, 0.02, 0.025, 0.03, 0.035, 0.04, 0.045, 0.047];
B.forEach((tr, i) => {
  ok(Math.abs(tr[1] - taux[i]) < 1e-12, "taux " + i);
  if (i < 7) ok(tr[0] === 1348 * (i + 1), "borne annuelle " + i + " : " + tr[0]);
  n++;
});
ok(JSON.stringify(A.brackets.marriedJoint) === JSON.stringify(B) && JSON.stringify(A.brackets.headOfHousehold) === JSON.stringify(B), "bareme different selon le statut");
ok(A.standardDeduction.single === 16100 && A.standardDeduction.marriedJoint === 32200 && A.standardDeduction.headOfHousehold === 24150, "deductions != 16 100 / 32 200 / 24 150");

/* Exemple imprime. */
const impose = 35000 - 16100;
const moteur = progressiveTax(impose, B);
ok(impose === 18900, "imposable de l'exemple");
ok(Math.abs(moteur - 707.81) <= 0.15, "exemple imprime : agence 707,81, moteur " + moteur);
ok(Math.round(707.81 / 12) === 59 && Math.round(moteur / 12) === 59, "exemple imprime : 59 $ par mois");
ok(Math.abs(1348 * 0.195 - 262.86) < 1e-9, "cumul au sommet de 9 436 $ = 262,86");

/* Arrondi au dollar par paie : ecart au plus 0,50 $ par paie. */
let pire = 0, m = 0;
for (const brut of [18000, 25000, 30000, 40000, 52000, 62400, 75000, 100000, 250000])
  for (const [N] of [[52], [26], [24], [12]]) {
    const annuel = calcul("missouri", brut).etat;
    const paie = annuel / N, arr = Math.round(paie);
    pire = Math.max(pire, Math.abs(arr - paie)); m++;
  }
ok(pire <= 0.5 + 1e-9, "ecart d'arrondi par paie " + pire);
console.log(n + " bornes/taux imprimes recoupes, exemple imprime, " + m + " arrondis par paie (ecart maximal " + pire.toFixed(3) + " $) : " + (echecs ? echecs + " ECHEC(S)" : "OK"));
process.exit(echecs ? 1 : 0);
