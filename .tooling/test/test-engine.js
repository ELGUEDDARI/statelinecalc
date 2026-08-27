/* Test du moteur de calcul, hors navigateur.
   Lancer :  node .tooling/test/test-engine.js
   Chaque cas est recalculé A LA MAIN dans le commentaire, sinon le test ne
   prouve rien : un test qui recopie la sortie du code valide ses propres bugs. */

const R = require("../../data/rates-2026.js");

// On recharge la logique du moteur sans le DOM.
function progressiveTax(taxable, bands) {
  let tax = 0, lower = 0;
  for (const [upper, rate] of bands) {
    if (taxable <= lower) break;
    tax += (Math.min(taxable, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

let pass = 0, fail = 0;
function check(label, got, expected, tol = 0.51) {
  const ok = Math.abs(got - expected) <= tol;
  console.log((ok ? "  OK   " : "  ECHEC") + " | " + label +
    " | obtenu " + got.toFixed(2) + " | attendu " + expected.toFixed(2));
  ok ? pass++ : fail++;
}

console.log("\n=== 1. Impot federal progressif, celibataire ===");

/* Cas A — 75 000 $ brut, celibataire, pas de 401(k).
   Revenu imposable = 75 000 - 16 100 (deduction standard) = 58 900
   10% sur 0 -> 12 400        = 1 240,00
   12% sur 12 400 -> 50 400   = 38 000 x 0,12 = 4 560,00
   22% sur 50 400 -> 58 900   =  8 500 x 0,22 = 1 870,00
   TOTAL                                       = 7 670,00 */
check("federal sur 58 900 imposable",
  progressiveTax(75000 - 16100, R.federal.brackets.single), 7670.00);

/* Cas B — revenu imposable nul (brut sous la deduction standard). */
check("federal sur 0 imposable",
  progressiveTax(0, R.federal.brackets.single), 0);

/* Cas C — pile sur une borne : 12 400 imposable = 10% partout. */
check("federal sur 12 400 imposable (borne exacte)",
  progressiveTax(12400, R.federal.brackets.single), 1240.00);

console.log("\n=== 2. FICA ===");

/* Social Security : 6,2% plafonne a 184 500.
   A 75 000  -> 75 000 x 0,062 = 4 650,00
   A 300 000 -> 184 500 x 0,062 = 11 439,00  (le plafond doit mordre) */
check("SS a 75 000",
  Math.min(75000, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate, 4650.00);
check("SS a 300 000 (plafond)",
  Math.min(300000, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate, 11439.00);

/* Medicare : 1,45% sans plafond + 0,9% au-dela de 200 000.
   A 300 000 -> 300 000 x 0,0145 = 4 350,00
             +  100 000 x 0,009  =   900,00  => 5 250,00 */
check("Medicare + surtaxe a 300 000",
  300000 * R.fica.medicare.rate +
  Math.max(0, 300000 - R.fica.additionalMedicare.threshold) * R.fica.additionalMedicare.rate,
  5250.00);

console.log("\n=== 3. Washington ===");

const WA = R.states.washington;

/* L'Etat de Washington ne preleve AUCUN impot sur le revenu.
   Si ce test casse un jour, toute la page est fausse. */
console.log((WA.incomeTax.hasIncomeTax === false ? "  OK   " : "  ECHEC") +
  " | Washington sans impot sur le revenu");
WA.incomeTax.hasIncomeTax === false ? pass++ : fail++;

/* Paid Leave : 1,13% x 71,43% = 0,807159%
   A 75 000 -> 75 000 x 0,00807159 = 605,37 */
check("WA Paid Leave a 75 000",
  Math.min(75000, WA.paidLeave.wageCap) * WA.paidLeave.employeeRate, 605.37);

/* Le plafond Paid Leave doit mordre a 300 000 :
   184 500 x 0,00807159 = 1 489,21 */
check("WA Paid Leave a 300 000 (plafond)",
  Math.min(300000, WA.paidLeave.wageCap) * WA.paidLeave.employeeRate, 1489.21);

/* WA Cares : 0,58% SANS plafond.
   A 300 000 -> 1 740,00. Si un plafond apparait ici, c'est un bug. */
check("WA Cares a 300 000 (sans plafond)", 300000 * WA.waCares.rate, 1740.00);

console.log("\n=== 4. Cas complet : 75 000 $, celibataire, Washington ===");

/* Recalcul a la main :
   federal        7 670,00
   SS             4 650,00
   Medicare       1 087,50   (75 000 x 0,0145)
   Paid Leave       605,37
   WA Cares         435,00   (75 000 x 0,0058)
   ---------------------------
   total impots  14 447,87
   net           60 552,13
   taux effectif    19,3%    (14 447,87 / 75 000) */
const federal = progressiveTax(75000 - 16100, R.federal.brackets.single);
const ss = 75000 * R.fica.socialSecurity.rate;
const med = 75000 * R.fica.medicare.rate;
const pl = 75000 * WA.paidLeave.employeeRate;
const wc = 75000 * WA.waCares.rate;
const total = federal + ss + med + pl + wc;

check("total des prelevements", total, 14447.87);
check("net annuel", 75000 - total, 60552.13);
check("net mensuel", (75000 - total) / 12, 5046.01);
check("taux effectif x100", (total / 75000) * 100, 19.26, 0.01);

console.log("\n=== 5. Head of household — la regression du 27/08/2026 ===");

/* Ce bloc existe parce que le formulaire proposait "Head of household" alors
   que le bareme n'existait pas : le moteur retombait sur les tranches
   "single" et surestimait l'impot federal. Trouve par controle-copy le
   27/08/2026, sur une page DEJA EN LIGNE.

   Bareme HoH lu VERBATIM dans IRS Rev. Proc. 2025-32, TABLE 2 -
   Section 1(j)(2)(B) "Heads of Households", le 27/08/2026.

   Cas — 75 000 $ brut, head of household, pas de 401(k) :
   Revenu imposable = 75 000 - 24 150 (deduction standard HoH) = 50 850
   10% sur 0 -> 17 700        = 1 770,00
   12% sur 17 700 -> 50 850   = 33 150 x 0,12 = 3 978,00
   TOTAL federal                              = 5 748,00

   A comparer : avec les tranches "single" le meme contribuable se voyait
   afficher 7 670,00 $ - soit 1 922,00 $ de trop. */
const fedHoH = progressiveTax(75000 - 24150, R.federal.brackets.headOfHousehold);
check("federal HoH sur 50 850 imposable", fedHoH, 5748.00);

/* Le bareme HoH doit exister et differer de celui du celibataire. */
check("les tranches HoH existent", R.federal.brackets.headOfHousehold ? 1 : 0, 1, 0);
check("HoH != single (1re tranche)",
  R.federal.brackets.headOfHousehold[0][0], 17700, 0);

/* La selection par statut ne doit plus retomber silencieusement sur single.
   On rejoue ici la ligne exacte du moteur. */
function bandsFor(status) { return R.federal.brackets[status] || R.federal.brackets.single; }
check("selection: headOfHousehold -> ses propres tranches",
  bandsFor("headOfHousehold")[0][0], 17700, 0);
check("selection: single -> tranches single",
  bandsFor("single")[0][0], 12400, 0);
check("selection: marriedJoint -> tranches couple",
  bandsFor("marriedJoint")[0][0], 24800, 0);

/* Net complet HoH a 75 000 $ dans l'Etat de Washington, recalcul a la main :
   federal        5 748,00
   SS             4 650,00   (75 000 x 0,062)
   Medicare       1 087,50   (75 000 x 0,0145)
   Paid Leave       605,37   (75 000 x 0,00807159)
   WA Cares         435,00   (75 000 x 0,0058)
   ---------------------------
   total impots  12 525,87
   net           62 474,13 */
const totalHoH = fedHoH + ss + med + pl + wc;
check("total des prelevements HoH", totalHoH, 12525.87);
check("net annuel HoH", 75000 - totalHoH, 62474.13);

console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
process.exit(fail === 0 ? 0 : 1);
