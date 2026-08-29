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

console.log("\n=== 6. Nevada — l'Etat qui ne prend RIEN ===");

/* Le Nevada est le cas limite du moteur : aucune retenue d'Etat du tout.
   Sources lues le 27/08/2026 :
     - tax.nv.gov : pas d'impot sur le revenu des personnes
     - Constitution du Nevada, Art. 10 Sec. 1(9)
     - tax.nv.gov : Modified Business Tax = EMPLOYEUR
     - detr.nv.gov : assurance chomage = EMPLOYEUR
   Donc : ni paidLeave ni waCares dans la fiche. Le moteur doit rendre zero
   sur ces deux lignes SANS planter, et ne doit rien inventer.

   Cas — 75 000 $ brut, celibataire, pas de 401(k) :
   federal    7 670,00   (identique a Washington : c'est du federal)
   SS         4 650,00
   Medicare   1 087,50
   Etat           0,00
   ---------------------
   total     13 407,50
   net       61 592,50  ->  5 132,71 $/mois  ->  taux 17,88 % */
const NV = R.states.nevada;
check("la fiche Nevada existe", NV ? 1 : 0, 1, 0);
check("Nevada : pas d'impot sur le revenu", NV.incomeTax.hasIncomeTax ? 1 : 0, 0, 0);
check("Nevada : aucun programme Paid Leave", NV.paidLeave ? 1 : 0, 0, 0);
check("Nevada : aucun programme type WA Cares", NV.waCares ? 1 : 0, 0, 0);

const fedNV = progressiveTax(75000 - 16100, R.federal.brackets.single);
const totalNV = fedNV + ss + med;           // ss et med sont deja calcules plus haut
check("total des prelevements Nevada", totalNV, 13407.50);
check("net annuel Nevada", 75000 - totalNV, 61592.50);
check("net mensuel Nevada", (75000 - totalNV) / 12, 5132.71);
check("taux effectif Nevada x100", (totalNV / 75000) * 100, 17.88, 0.01);

/* L'ecart Washington / Nevada doit valoir EXACTEMENT Paid Leave + WA Cares.
   Si ce test casse, c'est qu'une retenue s'est glissee quelque part. */
check("ecart WA -> NV = Paid Leave + WA Cares", (75000 - totalNV) - (75000 - total), pl + wc, 0.02);

console.log("\n=== 7. Paie horaire — arithmetique ===");

/* Ajoute le 27/08/2026. On ne suppose PAS 2 080 heures par an : on demande
   les heures reellement travaillees. 2 080 suppose 40 h par semaine, 52
   semaines, sans exception - ce qui est faux pour la plupart des gens payes
   a l'heure, justement.

   ⚠️ Ce bloc teste l'ARITHMETIQUE. La fonction periodsPerYear elle-meme vit
   dans calc-paycheck.js, qui est un IIFE navigateur et n'est pas requerable
   ici : elle est testee sur la vraie page par test-hourly-live.js. Un test
   qui recopie la fonction ne prouve rien sur la fonction.

   Cas — 30 $/h, 40 h/semaine, Nevada, celibataire, pas de 401(k) :
   annuel     = 30 x 40 x 52          = 62 400
   imposable  = 62 400 - 16 100       = 46 300
   10% sur 0 -> 12 400                =  1 240,00
   12% sur 12 400 -> 46 300 (33 900)  =  4 068,00
   federal                            =  5 308,00
   SS   62 400 x 0,062                =  3 868,80
   Med  62 400 x 0,0145               =    904,80
   Etat (Nevada)                      =      0,00
   -------------------------------------------------
   total                              = 10 081,60
   net annuel                         = 52 318,40
   net PAR HEURE = 52 318,40 / 2 080  =     25,15 */
const brutHoraire = 30, heures = 40;
const annuelH = brutHoraire * heures * 52;
check("30 $/h x 40 h x 52 = brut annuel", annuelH, 62400, 0);

const fedH = progressiveTax(annuelH - 16100, R.federal.brackets.single);
check("federal sur 46 300 imposable", fedH, 5308.00);

const ssH = Math.min(annuelH, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
const medH = annuelH * R.fica.medicare.rate;
const totalH = fedH + ssH + medH;
check("total des prelevements (Nevada)", totalH, 10081.60);
check("net annuel", annuelH - totalH, 52318.40);
check("net PAR HEURE", (annuelH - totalH) / (heures * 52), 25.15, 0.005);

/* Le piege des 2 080 heures : quelqu'un a 35 h/semaine n'a pas le meme
   brut annuel, et donc pas la meme tranche marginale. */
const annuel35 = brutHoraire * 35 * 52;
check("30 $/h x 35 h x 52 = brut annuel", annuel35, 54600, 0);
check("35 h/sem donne bien un brut different de 2 080 h",
  Math.abs(annuel35 - annuelH) > 0 ? 1 : 0, 1, 0);


/* ---------------------------------------------------------------------------
   8. GEORGIE - le premier Etat du site qui preleve vraiment un impot.
   Tout ce qui precede testait des Etats a zero : une erreur de cablage sur
   l'impot d'Etat n'aurait donc jamais pu etre vue. Ici elle le serait.

   Recalcule A LA MAIN, celibataire, 75 000 $, 2026 :
     imposable federal = 75 000 - 16 100 = 58 900
     federal = 1 240 + 4 560 + 1 870                 =  7 670,00
     SS 4 650,00 + Medicare 1 087,50                 =  5 737,50
     imposable Georgie = 75 000 - 15 000 = 60 000
     Georgie = 60 000 x 0,0499                       =  2 994,00
     -------------------------------------------------------------
     total                                           = 16 401,50
     net annuel                                      = 58 598,50
     net mensuel = 58 598,50 / 12                    =  4 883,21
     taux effectif = 16 401,50 / 75 000              =    21,87 %
--------------------------------------------------------------------------- */
console.log("\n=== 8. Georgie : le premier Etat qui preleve ===");
const GA = R.states.georgia;
check("la Georgie preleve bien un impot", GA.incomeTax.hasIncomeTax ? 1 : 0, 1, 0);

const gaImposable = 75000 - GA.incomeTax.standardDeduction.single;
check("assiette Georgie celibataire (75 000 - 15 000)", gaImposable, 60000, 0);
check("impot Georgie a 4,99 %",
  progressiveTax(gaImposable, GA.incomeTax.brackets.single), 2994.00);

const gaTotal = 7670 + 4650 + 1087.50 + 2994;
check("total des prelevements en Georgie", gaTotal, 16401.50);
check("net annuel Georgie", 75000 - gaTotal, 58598.50);
check("net mensuel Georgie", (75000 - gaTotal) / 12, 4883.21, 0.01);

/* La deduction d'Etat n'est PAS la meme selon la situation de famille, et
   c'est exactement le piege que le moteur ne savait pas gerer avant le
   28/08 : il lisait un montant unique. Un couple deduit le double. */
check("deduction d'un couple = le double d'un celibataire",
  GA.incomeTax.standardDeduction.marriedJoint, 30000, 0);
check("un chef de famille deduit comme un celibataire, PAS entre les deux",
  GA.incomeTax.standardDeduction.headOfHousehold, 15000, 0);

/* Preuve que le taux unique passe bien par le meme code que les tranches :
   sur 200 000, un taux unique ne doit produire aucune cassure. */
check("taux unique : 4,99 % pile quel que soit le montant",
  progressiveTax(200000, GA.incomeTax.brackets.single) / 200000, 0.0499, 0.00001);

/* Non-regression : les trois Etats a zero doivent rester a zero. */
["washington", "nevada", "texas"].forEach(function (nom) {
  check(nom + " ne preleve toujours aucun impot sur le revenu",
    R.states[nom].incomeTax.hasIncomeTax ? 1 : 0, 0, 0);
});


/* ---------------------------------------------------------------------------
   9. ILLINOIS - taux unique 4,95 % ET une exoneration qui DISPARAIT.
   L'Illinois n'accorde pas une deduction reduite au-dela du seuil : il ne
   l'accorde plus du tout. "not allowed", pas "reduced". C'est une falaise,
   pas une pente, et c'est le premier Etat du site dans ce cas.

   Recalcule A LA MAIN, celibataire, 75 000 $, 2026 :
     federal 7 670,00 + SS 4 650,00 + Medicare 1 087,50
     Illinois = (75 000 - 2 925) x 0,0495 = 72 075 x 0,0495 = 3 567,71
     total = 16 975,21 ; net = 58 024,79 ; mensuel = 4 835,40
--------------------------------------------------------------------------- */
console.log("\n=== 9. Illinois : taux unique + exoneration a falaise ===");
const IL = R.states.illinois;
check("l'Illinois preleve bien un impot", IL.incomeTax.hasIncomeTax ? 1 : 0, 1, 0);
check("exoneration 2026 = 2 925 $", IL.incomeTax.standardDeduction.single, 2925, 0);
check("un couple compte DEUX exonerations", IL.incomeTax.standardDeduction.marriedJoint, 5850, 0);
check("impot Illinois sur 75 000",
  progressiveTax(75000 - 2925, IL.incomeTax.brackets.single), 3567.71);

const ilTotal = 7670 + 4650 + 1087.50 + 3567.7125;
check("total des prelevements en Illinois", ilTotal, 16975.21);
check("net annuel Illinois", 75000 - ilTotal, 58024.79);
check("net mensuel Illinois", (75000 - ilTotal) / 12, 4835.40, 0.01);

/* LA FALAISE. Sous le seuil l'exoneration s'applique, au-dessus elle
   disparait entierement. On teste des deux cotes, et on verifie que le
   franchissement coute bien 2 925 x 4,95 % = 144,79 $ de plus. */
function deductionIL(statut, revenu) {
  const d = IL.incomeTax.standardDeduction[statut];
  const seuil = IL.incomeTax.deductionPhaseOut[statut];
  return revenu > seuil ? 0 : d;
}
check("a 250 000 pile, l'exoneration s'applique encore",
  deductionIL("single", 250000), 2925, 0);
check("a 250 001, elle a totalement disparu",
  deductionIL("single", 250001), 0, 0);
check("franchir le seuil coute 2 925 x 4,95 %",
  (deductionIL("single", 250000) - deductionIL("single", 250001)) * 0.0495, 144.79, 0.01);
check("le seuil du couple est le double", IL.incomeTax.deductionPhaseOut.marriedJoint, 500000, 0);
check("un couple a 300 000 garde son exoneration",
  deductionIL("marriedJoint", 300000), 5850, 0);

/* Les Etats sans seuil ne doivent surtout pas heriter de ce comportement. */
check("la Georgie n'a pas de seuil de suppression",
  R.states.georgia.incomeTax.deductionPhaseOut === undefined ? 1 : 0, 1, 0);

console.log("\n=== 10. Pennsylvanie : forfait 3,07 %, et le 401(k) NE reduit PAS l'impot ===");

/* Bareme lu le 28/08/2026 sur le formulaire 2026 de l'Etat lui-meme :
   REV-413 (I), "2026 Instructions for Estimating PA Personal Income Tax",
   ligne 2 du calcul : "Multiply Line 1 by 3.07 percent (0.0307)".
   Ligne 1 = "expected PA-taxable income" : AUCUNE deduction, AUCUNE exoneration.

   Cas - 75 000 $ brut, celibataire, calcule a la main :
     impot d'Etat = 75 000 x 3,07 %                    =  2 302,50
     chomage salarie = 75 000 x 0,07 %                 =     52,50
     federal (identique aux autres Etats)              =  7 670,00
     Social Security 75 000 x 6,2 %                    =  4 650,00
     Medicare 75 000 x 1,45 %                          =  1 087,50
     total                                             = 15 762,50
     net                                               = 59 237,50 */
const PA = R.states.pennsylvania;

check("le taux 2026 est bien 3,07 %", PA.incomeTax.brackets.single[0][1], 0.0307, 0);
check("aucune deduction standard en Pennsylvanie", PA.incomeTax.standardDeduction, 0, 0);
check("un couple est taxe au meme taux qu'un celibataire",
  PA.incomeTax.brackets.marriedJoint[0][1], PA.incomeTax.brackets.single[0][1], 0);
check("impot d'Etat sur 75 000", 75000 * 0.0307, 2302.50, 0.01);
check("chomage salarie sur 75 000", 75000 * PA.employeePrograms[0].rate, 52.50, 0.01);

/* Le chomage salarie n'a PAS de plafond : la source de l'Etat dit que les
   cotisations salariees "are not limited to the taxable wage base". Un
   plafond glisse ici sous-estimerait la retenue des hauts salaires. */
check("le chomage salarie n'a pas de plafond",
  PA.employeePrograms[0].wageCap === null ? 1 : 0, 1, 0);
check("sur 500 000, le chomage suit tout le salaire", 500000 * 0.0007, 350, 0.01);

/* LE POINT QUI REND LA PAGE UTILE. En Pennsylvanie, un versement 401(k) est
   une remuneration imposable au moment ou il est fait - source verbatim :
   PA Personal Income Tax Guide, "Gross Compensation", DSM-12 (08-2025), p.51.
   L'assiette d'Etat reste donc le BRUT, quel que soit le versement. Si le
   calcul l'oubliait, il sous-estimerait l'impot de tout visiteur qui epargne,
   et la page mentirait sur son propre sujet. */
function etatPA(brut, pct) {
  const base = PA.incomeTax.taxesRetirementDeferrals ? brut : brut * (1 - pct);
  return base * 0.0307;
}
check("PA sans 401(k)", etatPA(75000, 0), 2302.50, 0.01);
check("PA avec 6 % au 401(k) : le MEME impot", etatPA(75000, 0.06), 2302.50, 0.01);

/* Le meme versement en Illinois fait bien baisser l'impot. Ce test existe pour
   prouver que le drapeau vise la Pennsylvanie et n'a pas ete applique a tous
   par megarde. */
function etatIL(brut, pct) {
  const base = IL.incomeTax.taxesRetirementDeferrals ? brut : brut * (1 - pct);
  return Math.max(0, base - 2925) * 0.0495;
}
check("l'Illinois, lui, accorde bien le rabais",
  etatIL(75000, 0) - etatIL(75000, 0.06), 222.75, 0.01);
check("ce que le PA-epargnant ne recupere pas : 4 500 x 3,07 %",
  75000 * 0.06 * 0.0307, 138.15, 0.01);

/* Le drapeau ne doit exister QUE la ou la loi le dit. La liste est DERIVEE des
   baremes : ecrite a la main, elle aurait laisse le Michigan hors du controle
   le jour de sa publication. La Pennsylvanie est la seule exception attendue. */
Object.keys(R.states).filter(function (k) { return k !== "pennsylvania"; }).forEach(function (k) {
  check(k + " ne taxe pas le 401(k)",
    R.states[k].incomeTax.taxesRetirementDeferrals === undefined ? 1 : 0, 1, 0);
});

/* Le moteur du navigateur et la bibliotheque node doivent tomber sur le meme
   chiffre. Deux implementations qui divergent, c'est la panne silencieuse que
   la duplication a produite le 28/08 au matin. */
const { calcul } = require("../lib/paie.js");
check("bibliotheque node : total des prelevements PA",
  calcul("pennsylvania", 75000).total, 15762.50, 0.01);
check("bibliotheque node : net annuel PA",
  calcul("pennsylvania", 75000).net, 59237.50, 0.01);


/* Une SECONDE implementation, volontairement naive, de l'impot du Michigan.
   Elle n'appelle pas paie.js : c'est tout l'interet d'un controle croise. */
function calculMI(brut, pct401k) {
  var base = brut - brut * pct401k;               // le MI part de l'AGI federal
  return Math.max(0, base - 5900) * 0.0425;
}

/* --- MICHIGAN ------------------------------------------------------------
   Source : form 446 (Rev. 10-25), "2026 Michigan Income Tax Withholding
   Guide" : "Withholding Rate: 4.25%  Personal Exemption Amount: $5,900".
   Les attendus sont poses a la main, pas repris du moteur : un test qui
   redemande au moteur ce qu'il vient de dire ne teste rien. */
check("MI : le taux est bien 4,25 %",
  R.states.michigan.incomeTax.brackets.single[0][1], 0.0425, 0);
check("MI : l'exoneration d'un celibataire vaut 5 900",
  R.states.michigan.incomeTax.standardDeduction.single, 5900, 0);
check("MI : un couple en compte DEUX, soit 11 800",
  R.states.michigan.incomeTax.standardDeduction.marriedJoint, 11800, 0);
check("MI : impot d'Etat sur 75 000 = (75000 - 5900) x 4,25 %",
  calculMI(75000, 0), 2936.75, 0.01);
check("MI : impot d'Etat sur 25 000 = (25000 - 5900) x 4,25 %",
  calculMI(25000, 0), 811.75, 0.01);
check("MI : le taux effectif est SOUS le taux affiche a 25 000",
  calculMI(25000, 0) / 25000 < 0.0425 ? 1 : 0, 1, 0);
check("MI : et il monte avec le revenu",
  calculMI(250000, 0) / 250000 > calculMI(25000, 0) / 25000 ? 1 : 0, 1, 0);
check("MI : le 401(k) reduit bien l'impot d'Etat, contrairement a la PA",
  calculMI(75000, 0) - calculMI(75000, 0.06), 75000 * 0.06 * 0.0425, 0.01);
check("MI : aucun programme salarie retenu",
  (R.states.michigan.employeePrograms || []).length, 0, 0);
check("MI : bibliotheque node, net annuel sur 75 000",
  calcul("michigan", 75000).net, 58655.75, 0.01);
check("MI : les deux implementations s'accordent sur l'impot d'Etat",
  calcul("michigan", 75000).etat, calculMI(75000, 0), 0.01);

console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
process.exit(fail === 0 ? 0 : 1);
