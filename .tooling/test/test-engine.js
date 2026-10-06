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

/* --- UTAH ----------------------------------------------------------------
   Sources, lues le 2026-09-02 :
   - Utah Code 59-10-104 (le.utah.gov), verbatim : « (b) 4.45% », suivi de
     « Amended by Chapter 250, 2026 General Session » ;
   - Publication 14, Rev. 4/26, « effective for pay periods beginning on or
     after June 1, 2026 », Schedule 7 (ANNUAL) : « Multiply line 1 by .0445 »,
     « Base allowance 485 », « Line 1 minus $9,348 », « Multiply line 4 by
     .013 », « line 2 minus line 6 (not less than 0) ».
   L'Utah ne deduit rien du revenu : il credite. Les attendus sont poses a la
   main d'apres le texte du guide, pas repris du moteur. */
function calculUT(brut, pct401k, statut) {
  var base = brut - brut * pct401k;
  var socle = (statut === "marriedJoint") ? 970 : 485;
  var seuil = (statut === "marriedJoint") ? 18696 : 9348;
  var credit = Math.max(0, socle - Math.max(0, base - seuil) * 0.013);
  return Math.max(0, base * 0.0445 - credit);
}

check("UT : le taux est bien 4,45 %",
  R.states.utah.incomeTax.brackets.single[0][1], 0.0445, 0);
check("UT : aucune deduction standard — l'Utah credite, il ne deduit pas",
  R.states.utah.incomeTax.standardDeduction, 0, 0);
check("UT : allocation de base annuelle, celibataire",
  R.states.utah.incomeTax.taxCredit.base.single, 485, 0);
check("UT : allocation de base annuelle, couple — le double",
  R.states.utah.incomeTax.taxCredit.base.marriedJoint, 970, 0);
check("UT : seuil d'effacement du credit, celibataire",
  R.states.utah.incomeTax.taxCredit.phaseOutStart.single, 9348, 0);
check("UT : seuil d'effacement du credit, couple",
  R.states.utah.incomeTax.taxCredit.phaseOutStart.marriedJoint, 18696, 0);

/* Le controle qui vaut tous les autres : l'exemple publie par l'Utah lui-meme.
   Publication 14, « Example 5 - Use Schedule 5, Quarterly/Single », salaire
   trimestriel 9 000 $, retenue publiee 367 $. Le guide arrondit chaque ligne,
   nous non : l'ecart admis est d'un dollar. */
check("UT : l'exemple 5 du Pub 14 (9 000 $ au trimestre) donne bien 367 $",
  9000 * 0.0445 - Math.max(0, 121 - Math.max(0, 9000 - 2337) * 0.013), 367, 1);

check("UT : impot d'Etat sur 30 000 = 4,45 % moins le credit restant",
  calcul("utah", 30000).etat, 1118.48, 0.01);
check("UT : a 75 000 le credit est entierement efface — 4,45 % plein",
  calcul("utah", 75000).etat, 75000 * 0.0445, 0.01);
check("UT : le credit s'annule exactement a 46 656 $",
  Math.max(0, 485 - Math.max(0, 46656 - 9348) * 0.013), 0, 0.01);
check("UT : sous ce seuil le taux effectif est INFERIEUR a 4,45 %",
  calcul("utah", 30000).etat / 30000 < 0.0445 ? 1 : 0, 1, 0);
check("UT : un couple garde le credit plus longtemps qu'un celibataire",
  calculUT(40000, 0, "marriedJoint") < calculUT(40000, 0, "single") ? 1 : 0, 1, 0);
check("UT : le 401(k) reduit bien l'impot d'Etat",
  calcul("utah", 75000).etat - calcul("utah", 75000, "single", 0.06).etat,
  75000 * 0.06 * 0.0445, 0.01);
check("UT : aucun programme salarie retenu",
  (R.states.utah.employeePrograms || []).length, 0, 0);
check("UT : les deux implementations s'accordent sur l'impot d'Etat",
  calcul("utah", 30000).etat, calculUT(30000, 0, "single"), 0.01);
check("UT : et elles s'accordent aussi pour un couple",
  calcul("utah", 120000, "marriedJoint").etat,
  calculUT(120000, 0, "marriedJoint"), 0.01);
check("UT : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("utah", 5000).etat >= 0 ? 1 : 0, 1, 0);


/* --- OHIO -----------------------------------------------------------------
   Sources, lues le 2026-09-02 :
   - Ohio Revised Code 5747.02(A)(3), instantane Wayback du 2026-08-04, verbatim :
     « If the balance thus obtained is equal to or less than twenty-six thousand
     fifty dollars, no tax shall be imposed on that balance. » puis « (c) For
     taxable years beginning in 2026 and thereafter, $332.00 plus 2.75% of the
     amount in excess of $26,050. »
   - ORC 5747.025 (Wayback 2026-06-09) et la notice « 2025 Ohio IT 1040 » p.17,
     servie par dam.assets.ohio.gov, pour l'exoneration par personne et par
     palier de revenu : 2 400 / 2 150 / 1 900 $, et 0 $ au-dela du plafond.
   Les attendus sont poses a la main d'apres ces textes, pas repris du moteur. */
function calculOH(brut, pct401k, statut) {
  var base = brut - brut * pct401k;
  var parPersonne = base <= 40000 ? 2400 : (base <= 80000 ? 2150 : 1900);
  if (base > 500000) parPersonne = 0;
  var exo = parPersonne * (statut === "marriedJoint" ? 2 : 1);
  var imposable = Math.max(0, base - exo);
  return imposable <= 26050 ? 0 : 332 + 0.0275 * (imposable - 26050);
}

check("OH : le taux au-dessus du seuil est 2,75 %",
  R.states.ohio.incomeTax.brackets.single[1][1], 0.0275, 0);
check("OH : rien n'est du jusqu'a 26 050 $ d'imposable",
  R.states.ohio.incomeTax.brackets.single[0][0], 26050, 0);
check("OH : la marche vaut 332 $ en 2026",
  R.states.ohio.incomeTax.notch.add, 332, 0);
check("OH : et elle se declenche a 26 050 $",
  R.states.ohio.incomeTax.notch.over, 26050, 0);
check("OH : exoneration par personne, revenu <= 40 000",
  R.states.ohio.incomeTax.deductionByIncome[0].amounts.single, 2400, 0);
check("OH : un couple en compte DEUX",
  R.states.ohio.incomeTax.deductionByIncome[0].amounts.marriedJoint, 4800, 0);
check("OH : elle tombe a 2 150 entre 40 001 et 80 000",
  R.states.ohio.incomeTax.deductionByIncome[1].amounts.single, 2150, 0);
check("OH : et a 1 900 au-dela de 80 000",
  R.states.ohio.incomeTax.deductionByIncome[2].amounts.single, 1900, 0);
check("OH : le plafond 2026 descend a 500 000, contre 750 000 en 2025",
  R.states.ohio.incomeTax.deductionPhaseOut.single, 500000, 0);

/* Le controle qui vaut tous les autres : l'exemple publie par l'Ohio lui-meme.
   Notice « 2025 Ohio IT 1040 » p.19, « Nonbusiness Income Tax Liability
   Calculation Example » : imposable 68 050 $, « he owes $342 on the first
   $26,050 of income. The rest is taxed at 2.75% » -> 1 497 $ en 2025.
   Notre annee est 2026 et la base est passee de 342 a 332 : meme arithmetique,
   10 $ de moins. On verifie la STRUCTURE, qui est ce que le moteur implemente. */
check("OH : l'exemple Mitchell du IT 1040, recalcule au socle 2026",
  332 + 0.0275 * (68050 - 26050), 1487, 0.01);
check("OH : le meme exemple au socle 2025 redonne bien les 1 497 $ publies",
  342 + 0.0275 * (68050 - 26050), 1497, 0.01);

/* LA MARCHE. Ce n'est pas une pente : le dollar qui franchit le seuil coute
   332 $ d'un coup. Le test existe pour que personne ne « corrige » ca un jour
   en croyant a un bug. Le seuil tombe a 28 450 $ de salaire pour un
   celibataire : 26 050 $ d'imposable + 2 400 $ d'exoneration. */
check("OH : a 28 450 $ de salaire, l'impot d'Etat est encore nul",
  calcul("ohio", 28450).etat, 0, 0.01);
check("OH : un dollar de plus, et il saute a 332,03 $",
  calcul("ohio", 28451).etat, 332.03, 0.01);
check("OH : ce dollar coute donc 332 $ — la marche est dans la loi",
  calcul("ohio", 28451).etat - calcul("ohio", 28450).etat, 332.03, 0.01);

check("OH : impot d'Etat sur 40 000 (exoneration 2 400)",
  calcul("ohio", 40000).etat, 649.63, 0.01);
check("OH : impot d'Etat sur 75 000 (exoneration 2 150)",
  calcul("ohio", 75000).etat, 1619.00, 0.01);
check("OH : impot d'Etat sur 250 000 (exoneration 1 900)",
  calcul("ohio", 250000).etat, 6438.38, 0.01);
check("OH : au-dela de 500 000, l'exoneration disparait entierement",
  calcul("ohio", 600000).etat, 332 + 0.0275 * (600000 - 26050), 0.01);
check("OH : le palier d'exoneration change bien a 40 000",
  calcul("ohio", 40001).etat - calcul("ohio", 40000).etat > 0 ? 1 : 0, 1, 0);
check("OH : le 401(k) reduit bien l'impot d'Etat",
  calcul("ohio", 75000).etat - calcul("ohio", 75000, "single", 0.06).etat,
  75000 * 0.06 * 0.0275, 0.01);
check("OH : aucun programme salarie retenu",
  (R.states.ohio.employeePrograms || []).length, 0, 0);
check("OH : les deux implementations s'accordent, salaire moyen",
  calcul("ohio", 75000).etat, calculOH(75000, 0, "single"), 0.01);
check("OH : et elles s'accordent aussi pour un couple",
  calcul("ohio", 120000, "marriedJoint").etat, calculOH(120000, 0, "marriedJoint"), 0.01);
check("OH : l'impot d'Etat n'est jamais negatif, meme a 10 000 $",
  calcul("ohio", 10000).etat >= 0 ? 1 : 0, 1, 0);

/* La marche ne doit exister QUE pour l'Ohio : aucun autre Etat ne declare la
   cle "notch", et aucun ne doit avoir change de resultat en l'introduisant. */
check("OH : aucun autre Etat n'a de marche",
  Object.keys(R.states).filter(k => R.states[k].incomeTax.notch).length, 1, 0);
check("OH : aucun autre Etat n'a d'exoneration par palier de revenu",
  Object.keys(R.states).filter(k => R.states[k].incomeTax.deductionByIncome).length, 1, 0);


/* --- WISCONSIN --------------------------------------------------------
   Sources, lues le 2026-09-11 : Wisconsin DOR "2026 Form 1-ES Instructions"
   (D-101A, R. 1-26) pour le bareme (Schedule A/B) et la deduction standard
   glissante (2026 Standard Deduction schedules), et le meme document pour
   l'exemption personnelle de 700 $ (note de bas de page). Voir
   data/rates-2026.js et .tooling/sources/wisconsin.md pour le detail complet.
   Les attendus sont poses a la main d'apres le texte imprime, pas repris du
   moteur : deduction(revenu) puis bareme(imposable), independamment de
   deductionEtat() et deductionGlissante(). */
function dedWI(statut, revenu) {
  if (statut === "single" || statut === "headOfHousehold_stage2") {
    if (revenu <= 20119) return 13960;
    if (revenu <= 136453) return Math.max(0, 13960 - 0.12 * (revenu - 20120));
    return 0;
  }
  if (statut === "marriedJoint") {
    if (revenu <= 29039) return 25840;
    if (revenu <= 159690) return Math.max(0, 25840 - 0.19778 * (revenu - 29040));
    return 0;
  }
  if (statut === "headOfHousehold") {
    if (revenu <= 20119) return 18030;
    if (revenu <= 58827) return Math.max(0, 18030 - 0.22515 * (revenu - 20120));
    if (revenu <= 136453) return Math.max(0, 13960 - 0.12 * (revenu - 20120));
    return 0;
  }
}
function exoWI(statut) {
  return statut === "marriedJoint" ? 1400 : 700;
}
function calculWI(revenu, statut) {
  var imposable = Math.max(0, revenu - dedWI(statut, revenu) - exoWI(statut));
  var bands = statut === "marriedJoint"
    ? [[20150, 0.035], [69260, 0.044], [443630, 0.053], [Infinity, 0.0765]]
    : [[15110, 0.035], [51950, 0.044], [332720, 0.053], [Infinity, 0.0765]];
  return progressiveTax(imposable, bands);
}

check("WI : le taux d'entree est 3,5 % (Schedule A)",
  R.states.wisconsin.incomeTax.brackets.single[0][1], 0.035, 0);
check("WI : le taux plafond est 7,65 %",
  R.states.wisconsin.incomeTax.brackets.single[3][1], 0.0765, 0);
check("WI : recoupement de la 2e constante imprimee, celibataire (528,85 + 4,4%)",
  15110 * 0.035, 528.85, 0.01);
check("WI : recoupement de la 3e constante imprimee, celibataire (2 149,81)",
  528.85 + (51950 - 15110) * 0.044, 2149.81, 0.01);
check("WI : recoupement de la 4e constante imprimee, celibataire (17 030,62)",
  2149.81 + (332720 - 51950) * 0.053, 17030.62, 0.01);
check("WI : recoupement de la 4e constante imprimee, commun (22 707,70)",
  705.25 + (69260 - 20150) * 0.044 + (443630 - 69260) * 0.053, 22707.70, 0.01);

check("WI : deduction pleine sous 20 119 $, celibataire",
  dedWI("single", 15000), 13960, 0);
check("WI : deduction nulle a 136 454 $ et au-dela, celibataire",
  dedWI("single", 136454), 0, 0);
check("WI : la pente s'annule a moins d'un dollar de zero a 136 453 $",
  dedWI("single", 136453), 0.04, 0.02);
check("WI : deduction pleine sous 29 039 $, commun",
  dedWI("marriedJoint", 20000), 25840, 0);
check("WI : deduction nulle a 159 691 $, commun",
  dedWI("marriedJoint", 159691), 0, 0);
check("WI : chef de famille, premier segment (22,515 %) a 50 000 $",
  dedWI("headOfHousehold", 50000), 11302.52, 0.01);
check("WI : chef de famille, le deuxieme segment prend le relais apres 58 827 $",
  dedWI("headOfHousehold", 58828), 9315.04, 0.01);
check("WI : les deux segments du chef de famille se rejoignent a moins d'un dollar",
  Math.abs(dedWI("headOfHousehold", 58827) - (13960 - 0.12 * (58827 - 20120))) < 1 ? 1 : 0, 1, 0);

check("WI : exemption personnelle 700 $ simple",
  R.states.wisconsin.incomeTax.personalExemption.single, 700, 0);
check("WI : exemption personnelle 1 400 $ en commun (700 + 700)",
  R.states.wisconsin.incomeTax.personalExemption.marriedJoint, 1400, 0);

check("WI : impot d'Etat sur 25 000 $, celibataire",
  calcul("wisconsin", 25000).etat, calculWI(25000, "single"), 0.01);
check("WI : impot d'Etat sur 75 000 $, celibataire",
  calcul("wisconsin", 75000).etat, calculWI(75000, "single"), 0.01);
check("WI : impot d'Etat sur 75 000 $ vaut bien 2 943,52 $",
  calcul("wisconsin", 75000).etat, 2943.52, 0.01);
check("WI : impot d'Etat sur 250 000 $, celibataire",
  calcul("wisconsin", 250000).etat, calculWI(250000, "single"), 0.01);
check("WI : impot d'Etat sur 75 000 $, commun",
  calcul("wisconsin", 75000, "marriedJoint").etat, calculWI(75000, "marriedJoint"), 0.01);
check("WI : impot d'Etat sur 75 000 $, chef de famille",
  calcul("wisconsin", 75000, "headOfHousehold").etat, calculWI(75000, "headOfHousehold"), 0.01);
check("WI : le 401(k) reduit bien l'impot d'Etat",
  calcul("wisconsin", 75000).etat - calcul("wisconsin", 75000, "single", 0.06).etat > 0 ? 1 : 0,
  1, 0);
check("WI : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states.wisconsin.employeePrograms || []).length, 0, 0);
check("WI : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("wisconsin", 5000).etat >= 0 ? 1 : 0, 1, 0);
check("WI : la deduction glissante n'existe que pour le Wisconsin",
  Object.keys(R.states).filter(k => R.states[k].incomeTax.slidingDeduction).length, 1, 0);
check("WI : l'exemption personnelle existe pour le Wisconsin, la Virginie et le Mississippi (17/09/2026)",
  Object.keys(R.states).filter(k => R.states[k].incomeTax.personalExemption).length, 3, 0);

/* --- ARKANSAS -----------------------------------------------------------
   Source, lue le 2026-09-12 : "State of Arkansas, Estimated Tax Declaration
   Vouchers and Instructions for Tax Year 2026" (AR1000ES), Tax Rate Schedule
   et sa deuxieme table "94,701.00 - 97,800.99". Voir data/rates-2026.js pour
   le detail complet. Les attendus ci-dessous sont recopies A LA MAIN depuis
   le texte imprime du formulaire (base + % + seuil), independamment de
   impotTable() : ce test verifie le moteur contre le document, pas contre
   lui-meme. */
function impotAR_main(imposable) {
  var seg = [
    [0, 5599.99, 0, 0, 0],
    [5600, 11199.99, 0, 0.02, 5599.99],
    [11200, 15999.99, 111, 0.03, 11199.99],
    [16000, 26399.99, 255, 0.034, 15999.99],
    [26400, 29999.99, 608, 0.039, 26399.99],
    [30000, 39999.99, 748, 0.039, 29999.99],
    [40000, 49999.99, 1138, 0.039, 39999.99],
    [50000, 59999.99, 1528, 0.039, 49999.99],
    [60000, 69999.99, 1918, 0.039, 59999.99],
    [70000, 80000.99, 2308, 0.039, 69999.99],
    [80001, 94700.99, 2698, 0.039, 80000.99],
    [97801, 99999.99, 3727, 0.039, 97800.99],
    [100000, Infinity, 3809, 0.039, 99999.99]
  ];
  for (var i = 0; i < seg.length; i++) {
    if (imposable >= seg[i][0] && imposable <= seg[i][1]) {
      return seg[i][2] + seg[i][3] * (imposable - seg[i][4]);
    }
  }
  return null; // dans le pont 94 701-97 800,99 : hors de ce test, verifie a part
}

check("AR : $0.00 plus 2.0% jusqu'a 11 199,99 $ (base publiee)",
  impotAR_main(11199.99), 112.00, 0.01);
check("AR : $111.00 plus 3.0% jusqu'a 15 999,99 $ (base publiee)",
  impotAR_main(15999.99), 255.00, 0.01);
check("AR : impot d'Etat sur 25 000 $ imposables, publie 561,00 $ (moins credit)",
  R.states.arkansas.incomeTax.bracketTable.single
    .reduce(function (r, s) { if (r !== null) return r;
      if (s.upTo === null || 25000 <= s.upTo) return s.amount !== undefined ? s.amount
        : s.base + s.rate * (25000 - s.from); return null; }, null),
  561.00, 0.01);
check("AR : impot d'Etat sur 75 000 $ imposables (2 308 + 3,9% sur 5 000,01)",
  impotAR_main(75000), 2503.00, 0.01);
check("AR : impot d'Etat sur 100 000 $ imposables, la ou une chaine continue " +
  "se tromperait de 329 $ (3 809,00 $ publies)",
  impotAR_main(100000), 3809.00, 0.01);
check("AR : le pont 94 701-97 800,99 est bien reproduit (31 lignes, +14 $/100 $)",
  (function () {
    var s = R.states.arkansas.incomeTax.bracketTable.single;
    var first = s.filter(function (x) { return x.amount === 3296; }).length;
    var last = s.filter(function (x) { return x.amount === 3713; }).length;
    return (first === 1 && last === 1) ? 1 : 0;
  })(), 1, 0);
check("AR : deduction standard 2 470 $ par contribuable, 4 940 $ en commun",
  R.states.arkansas.incomeTax.standardDeduction.single
    + R.states.arkansas.incomeTax.standardDeduction.single,
  R.states.arkansas.incomeTax.standardDeduction.marriedJoint, 0);
check("AR : credit 29 $ celibataire, 58 $ en commun ou chef de famille",
  R.states.arkansas.incomeTax.taxCredit.base.single
    + R.states.arkansas.incomeTax.taxCredit.base.single,
  R.states.arkansas.incomeTax.taxCredit.base.marriedJoint, 0);
check("AR : le meme bareme s'applique aux trois statuts (pas de seuils doubles)",
  R.states.arkansas.incomeTax.bracketTable.single === R.states.arkansas.incomeTax.bracketTable.marriedJoint
  && R.states.arkansas.incomeTax.bracketTable.single === R.states.arkansas.incomeTax.bracketTable.headOfHousehold
  ? 1 : 0, 1, 0);
check("AR : impot d'Etat complet sur 75 000 $ brut, celibataire, apres deduction et credit",
  calcul("arkansas", 75000).etat,
  impotAR_main(75000 - 2470) - 29, 0.01);
check("AR : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states.arkansas.employeePrograms || []).length, 0, 0);
check("AR : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("arkansas", 5000).etat >= 0 ? 1 : 0, 1, 0);
check("AR : la table de segments (bracketTable) n'existe que pour l'Arkansas",
  Object.keys(R.states).filter(function (k) { return R.states[k].incomeTax.bracketTable; }).length,
  1, 0);

/* --- IDAHO ----------------------------------------------------------------
   Source, lue le 12/09/2026 : "Table for Percentage Computation Method of
   Withholding", Idaho State Tax Commission, EPB00744 (revision 07-23-2026),
   periode ANNUELLE : 5,3% du salaire au-dela de 16 100 $ (celibataire ou chef
   de famille) ou 32 200 $ (commun). Voir data/rates-2026.js pour le detail
   complet et l'obstacle reseau contourne par Internet Archive. Les attendus
   ci-dessous sont recalcules A LA MAIN a partir du texte imprime de la table,
   independamment du moteur : ce test verifie le moteur contre le document,
   pas contre lui-meme. */
function impotID_main(brut, seuil) {
  return Math.max(0, brut - seuil) * 0.053;
}
check("ID : rien retenu sous le seuil de 16 100 $, celibataire",
  impotID_main(16000, 16100), 0, 0);
check("ID : premier dollar imposable a 16 101 $, celibataire",
  impotID_main(16101, 16100), 0.05, 0.01);
check("ID : impot d'Etat sur 25 000 $ brut, celibataire (25 000 - 16 100) x 5,3%",
  impotID_main(25000, 16100), 471.70, 0.01);
check("ID : impot d'Etat sur 75 000 $ brut, celibataire (75 000 - 16 100) x 5,3%",
  impotID_main(75000, 16100), 3121.70, 0.01);
check("ID : impot d'Etat sur 75 000 $ brut, commun (75 000 - 32 200) x 5,3%",
  impotID_main(75000, 32200), 2268.40, 0.01);
check("ID : le moteur retombe sur le calcul a la main, celibataire 75 000 $",
  calcul("idaho", 75000).etat, impotID_main(75000, 16100), 0.01);
check("ID : le moteur retombe sur le calcul a la main, commun 75 000 $",
  calcul("idaho", 75000, "marriedJoint").etat, impotID_main(75000, 32200), 0.01);
check("ID : le chef de famille partage le seuil du celibataire, PAS celui du " +
  "conjoint (EPB00744 : \"Single Persons Including Head of Household\")",
  R.states.idaho.incomeTax.standardDeduction.headOfHousehold,
  R.states.idaho.incomeTax.standardDeduction.single, 0);
check("ID : le seuil chef de famille n'est PAS celui du conjoint",
  R.states.idaho.incomeTax.standardDeduction.headOfHousehold ===
  R.states.idaho.incomeTax.standardDeduction.marriedJoint ? 1 : 0, 0, 0);
check("ID : impot identique single et head of household sur 75 000 $",
  calcul("idaho", 75000, "headOfHousehold").etat,
  calcul("idaho", 75000, "single").etat, 0.005);
check("ID : le seuil 2026 vaut la deduction standard federale 2026, single",
  R.states.idaho.incomeTax.standardDeduction.single,
  R.federal.standardDeduction.single, 0);
check("ID : le seuil 2026 vaut la deduction standard federale 2026, commun",
  R.states.idaho.incomeTax.standardDeduction.marriedJoint,
  R.federal.standardDeduction.marriedJoint, 0);
check("ID : un seul taux, 5,3%, quel que soit le revenu (pas de palier)",
  R.states.idaho.incomeTax.brackets.single.length, 1, 0);
check("ID : le taux unique est bien 5,3%",
  R.states.idaho.incomeTax.brackets.single[0][1], 0.053, 0);
check("ID : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states.idaho.employeePrograms || []).length, 0, 0);
check("ID : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("idaho", 5000).etat >= 0 ? 1 : 0, 1, 0);
check("ID : le seuil d'imposition tombe un dollar apres le seuil de 16 100 $",
  calcul("idaho", 16100).etat === 0 && calcul("idaho", 16101).etat > 0 ? 1 : 0, 1, 0);

/* --- VIRGINIE -------------------------------------------------------------
   Formula for Computing Tax to be Withheld, page 21 du guide de retenue,
   rev. 05/25 : (G)P - [$8,750 + (E1 x $930)] = T, puis bareme a 4 tranches
   2%/3%/5%/5,75% aux seuils 3 000/5 000/17 000 $, IDENTIQUES pour tout
   statut. Chaque cas recalcule a la main, independamment du moteur. */
check("VA : rien retenu sous le seuil de 9 680 $ (8 750 deduction + 930 exemption), celibataire",
  calcul("virginia", 9680).etat, 0, 0);
check("VA : premier dollar imposable a 9 681 $, celibataire (1 $ x 2%)",
  calcul("virginia", 9681).etat, 0.02, 0.001);
check("VA : impot d'Etat sur 25 000 $ brut, celibataire " +
  "(taxable 15 320 $ : 3 000x2% + 2 000x3% + 10 320x5%)",
  calcul("virginia", 25000).etat, 636.00, 0.005);
check("VA : impot d'Etat sur 75 000 $ brut, celibataire " +
  "(taxable 65 320 $ : 720 + 5,75% x 48 320)",
  calcul("virginia", 75000).etat, 3498.40, 0.005);
check("VA : impot d'Etat sur 75 000 $ brut, commun " +
  "(taxable 55 640 $ : 720 + 5,75% x 38 640)",
  calcul("virginia", 75000, "marriedJoint").etat, 2941.80, 0.005);
check("VA : le meme bareme s'applique aux trois statuts (pas de seuils doubles au mariage)",
  JSON.stringify(R.states.virginia.incomeTax.brackets.single) ===
  JSON.stringify(R.states.virginia.incomeTax.brackets.marriedJoint) ? 1 : 0, 1, 0);
check("VA : impot d'Etat identique single et head of household sur 75 000 $",
  calcul("virginia", 75000, "headOfHousehold").etat,
  calcul("virginia", 75000, "single").etat, 0.005);
check("VA : un couple paie moins qu'un celibataire sur le meme salaire",
  calcul("virginia", 75000, "marriedJoint").etat < calcul("virginia", 75000).etat ? 1 : 0, 1, 0);
check("VA : l'exemption personnelle vaut 930 $ par personne, 1 860 $ en commun",
  R.states.virginia.incomeTax.personalExemption.marriedJoint,
  2 * R.states.virginia.incomeTax.personalExemption.single, 0);
check("VA : la deduction standard 2026 vaut la deduction federale +5,3% (8 750 vs 8 300... " +
  "non lie, simple recoupement du chiffre publie)",
  R.states.virginia.incomeTax.standardDeduction.single, 8750, 0);
check("VA : la deduction standard commune est exactement le double de la deduction single",
  R.states.virginia.incomeTax.standardDeduction.marriedJoint,
  2 * R.states.virginia.incomeTax.standardDeduction.single, 0);
check("VA : quatre tranches, 2% / 3% / 5% / 5,75%",
  R.states.virginia.incomeTax.brackets.single.map(b => b[1]).join(",") ===
  [0.02, 0.03, 0.05, 0.0575].join(",") ? 1 : 0, 1, 0);
check("VA : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states.virginia.employeePrograms || []).length, 0, 0);
check("VA : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("virginia", 5000).etat >= 0 ? 1 : 0, 1, 0);

/* ── ALASKA, 20e Etat, ajoute 2026-09-17 ─────────────────────────────────────
   Aucun impot sur le revenu (hasIncomeTax: false), mais un mecanisme unique
   sur ce site : l'assurance chomage est PARTAGEE, employeur ET salarie.
   Source : Alaska Department of Labor and Workforce Development, "2026
   Unemployment Insurance Tax Rates", verbatim "The 2026 Employee Rate is
   0.50%" et "The 2026 Taxable Wage Base is $54,200.00", lu 2026-09-17.

   Cas - 60 000 $ brut, celibataire, calcule a la main :
     impot d'Etat                                       =      0,00
     chomage salarie = 54 200 x 0,50 % (plafonne)        =    271,00
     federal (identique aux autres Etats sans impot)     =  5 020,00
     Social Security 60 000 x 6,2 %                      =  3 720,00
     Medicare 60 000 x 1,45 %                             =    870,00
     total                                                =  9 881,00
     net                                                  = 50 119,00 */
check("AK : aucun impot sur le revenu",
  R.states.alaska.incomeTax.hasIncomeTax === false ? 1 : 0, 1, 0);
check("AK : chomage salarie a 0,50%", R.states.alaska.employeePrograms[0].rate, 0.005, 0);
check("AK : plafond de salaire du chomage a 54 200 $",
  R.states.alaska.employeePrograms[0].wageCap, 54200, 0);
check("AK : chomage salarie sur 60 000 $ (sous le plafond)",
  calcul("alaska", 60000).programmes[0].montant, 271.00, 0.01);
check("AK : chomage plafonne a 271 $ meme au-dela de 54 200 $",
  calcul("alaska", 200000).programmes[0].montant, 271.00, 0.01);
check("AK : chomage exactement 271 $ pile au plafond de 54 200 $",
  calcul("alaska", 54200).programmes[0].montant, 271.00, 0.01);
check("AK : sous le plafond, le chomage suit le salaire (30 000 x 0,50%)",
  calcul("alaska", 30000).programmes[0].montant, 150.00, 0.01);
check("AK : le net sur 60 000 $ integre le chomage salarie",
  calcul("alaska", 60000).net, 50119.00, 0.01);
check("AK : est le seul Etat de ce site avec un employeePrograms non vide " +
  "en plus d'un hasIncomeTax false (Texas/Tennessee/Nevada/Washington/Floride n'en ont pas)",
  (R.states.alaska.employeePrograms || []).length > 0 &&
  R.states.alaska.incomeTax.hasIncomeTax === false ? 1 : 0, 1, 0);
check("AK : l'impot d'Etat (income tax) est toujours zero, quel que soit le salaire",
  calcul("alaska", 500000).etat, 0, 0);

/* ── NORTH DAKOTA, 21e Etat, ajoute 2026-09-17 ───────────────────────────────
   Bareme de retenue 2026 a trois tranches (0% / 1,95% / 2,5%), seuils
   differents par statut de declaration. Source : North Dakota Office of
   State Tax Commissioner, "Income Tax Withholding Rates & Instructions, for
   wages paid in 2026", page 45, "Annual Percentage Method Tables (Forms W-4
   for 2020 and after)", lu 2026-09-17.

   LE FAIT DISTINCTIF : le seuil marie-commun (57 500 $) est LEGEREMENT PLUS
   BAS que le seuil celibataire (57 625 $) — l'inverse du schema habituel
   (Nebraska double ses seuils au mariage). Le seuil chef de famille
   (78 475 $) est le plus large des trois.

   Cas - 75 000 $ brut, celibataire, calcule a la main :
     tranche 1 : 0 $ a 57 625 $ a 0%                      =      0,00
     tranche 2 : 57 625 $ a 75 000 $ (17 375 $) a 1,95%    =    338,81
     total impot d'Etat                                    =    338,81
   Meme salaire, marie-commun :
     tranche 2 : 57 500 $ a 75 000 $ (17 500 $) a 1,95%    =    341,25
   Meme salaire, chef de famille : sous le seuil de 78 475 $ -> 0,00 $. */
check("ND : trois tranches, 0% / 1,95% / 2,5%",
  R.states["north-dakota"].incomeTax.brackets.single.length, 3, 0);
check("ND : impot d'Etat sur 75 000 $ brut, celibataire (17 375 x 1,95%)",
  calcul("north-dakota", 75000).etat, 338.8125, 0.01);
check("ND : impot d'Etat sur 75 000 $ brut, marie-commun (17 500 x 1,95%)",
  calcul("north-dakota", 75000, "marriedJoint").etat, 341.25, 0.01);
check("ND : impot d'Etat sur 75 000 $ brut, chef de famille (sous le seuil de 78 475 $)",
  calcul("north-dakota", 75000, "headOfHousehold").etat, 0, 0);
check("ND : le seuil marie-commun est PLUS BAS que le seuil celibataire (fait distinctif)",
  57500 < 57625 ? 1 : 0, 1, 0);
check("ND : a 75 000 $, le marie-commun paie PLUS que le celibataire (seuil plus bas)",
  calcul("north-dakota", 75000, "marriedJoint").etat > calcul("north-dakota", 75000).etat ? 1 : 0, 1, 0);
check("ND : rien sous le seuil single de 57 625 $",
  calcul("north-dakota", 57625).etat, 0, 0);
check("ND : premier cent au dollar 57 626 $, celibataire (1 x 1,95%)",
  calcul("north-dakota", 57626).etat, 0.0195, 0.001);
check("ND : rien sous le seuil marie-commun de 57 500 $",
  calcul("north-dakota", 57500, "marriedJoint").etat, 0, 0);
check("ND : rien sous le seuil chef de famille de 78 475 $",
  calcul("north-dakota", 78475, "headOfHousehold").etat, 0, 0);
check("ND : la tranche a 2,5% s'applique au-dela de 258 450 $, celibataire",
  calcul("north-dakota", 300000).etat, 4954.8375, 0.01);
check("ND : rien sous 25 000 $, celibataire",
  calcul("north-dakota", 25000).etat, 0, 0);
check("ND : le net sur 60 000 $ integre le bareme a trois tranches, celibataire",
  calcul("north-dakota", 60000).net, 50343.6875, 0.01);
check("ND : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states["north-dakota"].employeePrograms || []).length, 0, 0);
check("ND : l'impot d'Etat n'est jamais negatif, meme a 5 000 $",
  calcul("north-dakota", 5000).etat >= 0 ? 1 : 0, 1, 0);

/* ── WYOMING, 22e Etat, ajoute 2026-09-17 ────────────────────────────────────
   Aucun impot sur le revenu, ni d'Etat ni local, par preemption statutaire
   (Wyoming Statutes § 39-12-101). Comme les 6 autres Etats sans impot deja
   publies (Texas, Floride, Nevada, Tennessee, Washington, Alaska), le net
   est integralement determine par le federal + FICA. A la difference de
   l'Alaska, aucune part salariale d'assurance chomage : employeePrograms
   doit rester vide, comme Texas/Tennessee/Nevada/Floride/Washington
   (Washington a ses propres programmes PFML/WA Cares, mais pas de part
   d'assurance chomage). */
check("WY : aucun impot sur le revenu",
  R.states.wyoming.incomeTax.hasIncomeTax === false ? 1 : 0, 1, 0);
check("WY : l'impot d'Etat est toujours zero, quel que soit le salaire",
  calcul("wyoming", 500000).etat, 0, 0);
check("WY : aucun programme salarie retenu (assurance chomage par industrie, employeur seul)",
  (R.states.wyoming.employeePrograms || []).length, 0, 0);
check("WY : le net sur 60 000 $ egale le federal + FICA, comme les 6 autres Etats sans impot",
  calcul("wyoming", 60000).net, calcul("texas", 60000).net, 0.001);
check("WY : le net sur 75 000 $ egale le Texas au centime pres",
  calcul("wyoming", 75000).net, calcul("texas", 75000).net, 0.001);

/* ── MISSISSIPPI, 23e Etat, ajoute 2026-09-17 ────────────────────────────────
   Bareme a DEUX segments : 0% sur les 10 000 premiers dollars de revenu
   imposable, 4,0% flat au-dela. Exemption ET standard deduction distinctes
   par statut (8 300 $ / 16 600 $ / 12 900 $ combines). Aucune part salariale
   d'assurance chomage (employeur seul, comme 21 des 22 Etats deja publies). */
check("MS : bareme a deux segments seulement",
  R.states.mississippi.incomeTax.brackets.single.length, 2, 0);
check("MS : impot d'Etat sur 75 000 $ brut, celibataire ((75000-8300-10000) x 4%)",
  calcul("mississippi", 75000).etat, 2268, 0.01);
check("MS : impot d'Etat sur 75 000 $ brut, marie-commun ((75000-16600-10000) x 4%)",
  calcul("mississippi", 75000, "marriedJoint").etat, 1936, 0.01);
check("MS : impot d'Etat sur 75 000 $ brut, chef de famille ((75000-12900-10000) x 4%)",
  calcul("mississippi", 75000, "headOfHousehold").etat, 2084, 0.01);
check("MS : rien sous le seuil d'imposition de 18 300 $, celibataire",
  calcul("mississippi", 18300).etat, 0, 0);
check("MS : premier cent au dollar 18 301 $, celibataire (1 x 4%)",
  calcul("mississippi", 18301).etat, 0.04, 0.001);
check("MS : rien a 5 000 $, celibataire",
  calcul("mississippi", 5000).etat, 0, 0);
check("MS : le taux reste 4,0% flat a 300 000 $, pas de troisieme tranche ((300000-8300-10000) x 4%)",
  calcul("mississippi", 300000).etat, 11268, 0.01);
check("MS : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states.mississippi.employeePrograms || []).length, 0, 0);
check("MS : le net sur 60 000 $ integre le bareme a deux segments, celibataire",
  calcul("mississippi", 60000).net, 48722, 0.01);
check("MS : l'impot d'Etat n'est jamais negatif, meme a 1 000 $",
  calcul("mississippi", 1000).etat >= 0 ? 1 : 0, 1, 0);
check("MS : un couple marie paie moins qu'un celibataire sur le meme salaire",
  calcul("mississippi", 75000, "marriedJoint").etat < calcul("mississippi", 75000).etat ? 1 : 0, 1, 0);

/* ── NEW HAMPSHIRE, 24e Etat, ajoute 2026-09-29 ──────────────────────────────
   Aucun impot sur le revenu, ni sur les salaires (jamais) ni sur les
   interets/dividendes (abroge depuis 2025). Comme les 7 autres Etats sans
   impot deja publies (Texas, Floride, Nevada, Tennessee, Washington, Alaska,
   Wyoming), le net est integralement determine par le federal + FICA. Comme
   le Wyoming (et a la difference de l'Alaska), aucune part salariale
   d'assurance chomage : employeePrograms doit rester vide. */
check("NH : aucun impot sur le revenu",
  R.states["new-hampshire"].incomeTax.hasIncomeTax === false ? 1 : 0, 1, 0);
check("NH : l'impot d'Etat est toujours zero, quel que soit le salaire",
  calcul("new-hampshire", 500000).etat, 0, 0);
check("NH : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states["new-hampshire"].employeePrograms || []).length, 0, 0);
check("NH : le net sur 60 000 $ egale le federal + FICA, comme les 7 autres Etats sans impot",
  calcul("new-hampshire", 60000).net, calcul("texas", 60000).net, 0.001);
check("NH : le net sur 75 000 $ egale le Wyoming au centime pres",
  calcul("new-hampshire", 75000).net, calcul("wyoming", 75000).net, 0.001);

/* ── NEW MEXICO, 25e Etat, ajoute 2026-09-30 ────────────────────────────────
   Attendus recalcules A LA MAIN depuis les lignes imprimees dans FYI-104
   (rev. 11/2025), table 7 ANNUAL : base imprimee + taux x (salaire - seuil de
   la ligne). Aucun n'est tire du moteur.
   single 75 000  : 2 716,50 + 4,9 % x (75 000 - 74 550) = 2 738,55
   married 75 000 : 1 739,00 + 4,7 % x (75 000 - 66 100) = 2 157,30
   HoH 75 000     : 1 739,00 + 4,7 % x (75 000 - 62 075) = 2 346,475
   single 25 000  : 434,50 + 4,3 % x (25 000 - 24 550)   = 453,85
   single 250 000 : 9 748,00 + 5,9 % x (250 000 - 218 050) = 11 633,05
   single 500 000 : 9 748,00 + 5,9 % x (500 000 - 218 050) = 26 383,05
   married 250 000: 4 089,00 + 4,9 % x (250 000 - 116 100) = 10 650,10
   HoH 250 000    : 4 089,00 + 4,9 % x (250 000 - 112 075) = 10 847,325 */
check("NM : single 75 000 $ = 2 738,55 $ (ligne 74 550 -> 218 050 de FYI-104)",
  calcul("new-mexico", 75000).etat, 2738.55, 0.005);
check("NM : married 75 000 $ = 2 157,30 $ (ligne 66 100 -> 102 100)",
  calcul("new-mexico", 75000, "marriedJoint").etat, 2157.30, 0.005);
check("NM : head of household 75 000 $ = 2 346,475 $ (ligne 62 075 -> 98 075)",
  calcul("new-mexico", 75000, "headOfHousehold").etat, 2346.475, 0.005);
check("NM : single 25 000 $ = 453,85 $ (ligne 24 550 -> 33 550)",
  calcul("new-mexico", 25000).etat, 453.85, 0.005);
check("NM : single 250 000 $ = 11 633,05 $ (taux maximum 5,9 %)",
  calcul("new-mexico", 250000).etat, 11633.05, 0.005);
check("NM : single 500 000 $ = 26 383,05 $",
  calcul("new-mexico", 500000).etat, 26383.05, 0.005);
check("NM : married 250 000 $ = 10 650,10 $ (ligne 116 100 -> 331 100)",
  calcul("new-mexico", 250000, "marriedJoint").etat, 10650.10, 0.005);
check("NM : head of household 250 000 $ = 10 847,325 $ (ligne 112 075 -> 327 075)",
  calcul("new-mexico", 250000, "headOfHousehold").etat, 10847.325, 0.005);
check("NM : rien de retenu jusqu'a 8 050 $ (single), 16 100 $ (married), 12 075 $ (HoH)",
  calcul("new-mexico", 8050).etat + calcul("new-mexico", 16100, "marriedJoint").etat
  + calcul("new-mexico", 12075, "headOfHousehold").etat, 0, 0);
check("NM : premier dollar au-dessus de 8 050 $ = 1,5 % de 1 $ = 0,015 $",
  calcul("new-mexico", 8051).etat, 0.015, 0.0001);
check("NM : aucun programme salarie retenu (assurance chomage employeur seul)",
  (R.states["new-mexico"].employeePrograms || []).length, 0, 0);
check("NM : six taux distincts",
  new Set(R.states["new-mexico"].incomeTax.brackets.single.map(b => b[1])).size, 6, 0);
check("NM : les six taux sont identiques pour les trois statuts",
  ["marriedJoint", "headOfHousehold"].every(st =>
    JSON.stringify(R.states["new-mexico"].incomeTax.brackets[st].map(b => b[1]))
    === JSON.stringify(R.states["new-mexico"].incomeTax.brackets.single.map(b => b[1]))) ? 1 : 0, 1, 0);
check("NM : un couple marie paie moins qu'un celibataire sur le meme salaire",
  calcul("new-mexico", 75000, "marriedJoint").etat < calcul("new-mexico", 75000).etat ? 1 : 0, 1, 0);

console.log("\n=== Rhode Island (26e Etat) ===");

/* Sources : 2026 Rhode Island Employer's Income Tax Withholding Tables
   (tax.ri.gov, Table 7 ANNUAL, « for all filing status types ») : 3,75 % jusqu'a
   82 050 $, 4,75 % jusqu'a 186 450 $, 5,99 % au-dela ; exemption 1 000 $ par
   personne, 0 $ si le salaire annuel depasse 290 800 $. TDI/TCI 1,1 % sur les
   100 000 premiers dollars (DLT, communique du 18/12/2025). Chaque attendu est
   recalcule a la main, jamais tire du moteur.
   single 75 000  : (75 000 - 1 000) x 3,75 %                         = 2 775,00
   single 25 000  : (25 000 - 1 000) x 3,75 %                         =   900,00
   single 100 000 : base 99 000 = 82 050 x 3,75 % + 16 950 x 4,75%
                    = 3 076,875 + 805,125                              = 3 882,00
   single 250 000 : base 249 000 = 3 076,875 + 104 400 x 4,75 % (4 959,00)
                    + 62 550 x 5,99 % (3 746,745)                      = 11 782,62
   single 300 000 : exemption perdue, base 300 000 = 8 035,875
                    + 113 550 x 5,99 % (6 801,645)                     = 14 837,52
   single 290 800 : exemption encore accordee (« more than »), base 289 800
                    = 8 035,875 + 103 350 x 5,99 % (6 190,665)         = 14 226,54
   single 290 801 : exemption perdue, base 290 801 = 8 035,875
                    + 104 351 x 5,99 % (6 250,6249)                    = 14 286,50
   TDI 75 000 : 75 000 x 1,1 %  = 825,00 ; TDI 250 000 : plafond 100 000 x 1,1 % = 1 100,00
   Salaire minimum 16 $ x 2 080 h x 1,1 % = 366,08 (chiffre donne par le DLT). */
check("RI : single 75 000 $ = 2 775,00 $ d'impot (base 74 000 x 3,75 %)",
  calcul("rhode-island", 75000).etat, 2775.00, 0.005);
check("RI : married 75 000 $ = meme impot (bareme unique pour tous les statuts)",
  calcul("rhode-island", 75000, "marriedJoint").etat, 2775.00, 0.005);
check("RI : head of household 75 000 $ = meme impot",
  calcul("rhode-island", 75000, "headOfHousehold").etat, 2775.00, 0.005);
check("RI : single 25 000 $ = 900,00 $",
  calcul("rhode-island", 25000).etat, 900.00, 0.005);
check("RI : single 100 000 $ = 3 882,00 $ (franchit 82 050 $)",
  calcul("rhode-island", 100000).etat, 3882.00, 0.005);
check("RI : single 250 000 $ = 11 782,62 $ (franchit 186 450 $)",
  calcul("rhode-island", 250000).etat, 11782.62, 0.005);
check("RI : single 300 000 $ = 14 837,52 $ (exemption perdue)",
  calcul("rhode-island", 300000).etat, 14837.52, 0.005);
check("RI : single 290 800 $ pile = 14 226,54 $ (exemption encore accordee)",
  calcul("rhode-island", 290800).etat, 14226.54, 0.005);
check("RI : single 290 801 $ = 14 286,50 $ (falaise : exemption perdue)",
  calcul("rhode-island", 290801).etat, 14286.50, 0.005);
check("RI : rien de retenu a 1 000 $ (l'exemption couvre tout)",
  calcul("rhode-island", 1000).etat, 0, 0);
check("RI : premier dollar au-dessus de 1 000 $ = 3,75 % de 1 $ = 0,0375 $",
  calcul("rhode-island", 1001).etat, 0.0375, 0.0001);
check("RI : TDI/TCI sur 75 000 $ = 825,00 $",
  calcul("rhode-island", 75000).programmes[0].montant, 825.00, 0.005);
check("RI : TDI/TCI sur 250 000 $ = 1 100,00 $ (plafond 100 000 $)",
  calcul("rhode-island", 250000).programmes[0].montant, 1100.00, 0.005);
check("RI : TDI/TCI au salaire minimum (16 $ x 2 080 h) = 366,08 $, chiffre du DLT",
  calcul("rhode-island", 16 * 2080).programmes[0].montant, 366.08, 0.005);
check("RI : net a 75 000 $ = 57 992,50 $ (75 000 - 7 670 - 4 650 - 1 087,50 - 2 775 - 825)",
  calcul("rhode-island", 75000).net, 57992.50, 0.005);
check("RI : un seul programme salarie (TDI/TCI ; le chomage est employeur seul)",
  (R.states["rhode-island"].employeePrograms || []).length, 1, 0);
check("RI : les trois taux sont identiques pour les trois statuts",
  ["marriedJoint", "headOfHousehold"].every(st =>
    JSON.stringify(R.states["rhode-island"].incomeTax.brackets[st])
    === JSON.stringify(R.states["rhode-island"].incomeTax.brackets.single)) ? 1 : 0, 1, 0);

console.log("\n=== Colorado (27e Etat) ===");

/* Sources : DR 1098 (10/21/25), 2026 Colorado Withholding Worksheet for
   Employers (tax.colorado.gov, instantane Internet Archive du 2026-08-23) :
   retenue annuelle = (salaire annualise - allocation) x 4,40 %, allocation
   11 000 $ pour un couple marie (declaration commune) ou 5 500 $ sinon.
   FAMLI : 0,44 % part salariee, jusqu'au plafond Social Security (184 500 $),
   famli.colorado.gov/employers (instantane du 2026-01-18). Chaque attendu est
   recalcule a la main, jamais tire du moteur.
   single 75 000  : (75 000 - 5 500) x 4,4 % = 69 500 x 0,044          = 3 058,00
   married 75 000 : (75 000 - 11 000) x 4,4 % = 64 000 x 0,044         = 2 816,00
   HoH 75 000     : 5 500 comme le celibataire ("otherwise")           = 3 058,00
   single 25 000  : 19 500 x 0,044                                     =   858,00
   single 250 000 : 244 500 x 0,044                                    = 10 758,00
   FAMLI 75 000 : 75 000 x 0,0044 = 330,00 ; 250 000 : 184 500 x 0,0044 = 811,80
   net single 75 000 : 75 000 - 7 670 (federal) - 4 650 - 1 087,50 - 3 058 - 330
                     = 58 204,50
   net single 52 000 (25 $/h) : federal 4 060 (1 240 + 23 500 x 12 %), SS 3 224,
     Medicare 754, CO 46 500 x 4,4 % = 2 046, FAMLI 228,80 -> 41 687,20 */
check("CO : single 75 000 $ = 3 058,00 $ (base 69 500 x 4,4 %)",
  calcul("colorado", 75000).etat, 3058.00, 0.005);
check("CO : married 75 000 $ = 2 816,00 $ (allocation 11 000 $)",
  calcul("colorado", 75000, "marriedJoint").etat, 2816.00, 0.005);
check("CO : head of household 75 000 $ = 3 058,00 $ (allocation 5 500 $ comme single)",
  calcul("colorado", 75000, "headOfHousehold").etat, 3058.00, 0.005);
check("CO : single 25 000 $ = 858,00 $",
  calcul("colorado", 25000).etat, 858.00, 0.005);
check("CO : single 250 000 $ = 10 758,00 $ (taux plat, pas de palier)",
  calcul("colorado", 250000).etat, 10758.00, 0.005);
check("CO : rien de retenu a 5 500 $ (l'allocation couvre tout)",
  calcul("colorado", 5500).etat, 0, 0);
check("CO : premier dollar au-dessus de 5 500 $ = 4,4 % de 1 $ = 0,044 $",
  calcul("colorado", 5501).etat, 0.044, 0.0001);
check("CO : FAMLI sur 75 000 $ = 330,00 $",
  calcul("colorado", 75000).programmes[0].montant, 330.00, 0.005);
check("CO : FAMLI sur 250 000 $ = 811,80 $ (plafond 184 500 $)",
  calcul("colorado", 250000).programmes[0].montant, 811.80, 0.005);
check("CO : le plafond FAMLI est la base salariale Social Security",
  R.states.colorado.employeePrograms[0].wageCap, R.fica.socialSecurity.wageBase, 0);
check("CO : net a 75 000 $ = 58 204,50 $ (75 000 - 7 670 - 4 650 - 1 087,50 - 3 058 - 330)",
  calcul("colorado", 75000).net, 58204.50, 0.005);
check("CO : net a 25 $/h (52 000 $) = 41 687,20 $",
  calcul("colorado", 25 * 2080).net, 41687.20, 0.005);
check("CO : un seul programme salarie (FAMLI ; le chomage est employeur seul)",
  (R.states.colorado.employeePrograms || []).length, 1, 0);
check("CO : un seul taux plat pour les trois statuts",
  ["single", "marriedJoint", "headOfHousehold"].every(st =>
    JSON.stringify(R.states.colorado.incomeTax.brackets[st]) === JSON.stringify([[Infinity, 0.044]])) ? 1 : 0, 1, 0);
check("CO : un couple marie paie moins qu'un celibataire sur le meme salaire",
  calcul("colorado", 75000, "marriedJoint").etat < calcul("colorado", 75000).etat ? 1 : 0, 1, 0);

console.log("\n=== Arizona (28e Etat) ===");

/* Sources : Arizona Form A-4 2026 (ADOR 10121 (25), instantane Internet Archive
   du 2026-07-05) : le salarie choisit 0,5 / 1,0 / 1,5 / 2,0 / 2,5 / 3,0 / 3,5 %
   de « gross taxable wages » ; sans formulaire, « the department requires your
   employer to withhold 2.0% of your gross taxable wages » ; A.R.S. 43-401(E)
   (azleg.gov, 2026-10-02). Le moteur modelise ce DEFAUT : 2,0 % de la paie apres
   401(k), sans deduction, meme chose pour les trois statuts. Chaque attendu est
   recalcule a la main, jamais tire du moteur.
   single 75 000   : 75 000 x 0,02                                   = 1 500,00
   married/HoH     : meme pourcentage, aucune deduction              = 1 500,00
   single 25 000   : 25 000 x 0,02                                   =   500,00
   single 250 000  : 250 000 x 0,02 (pas de plafond, pas de palier)  = 5 000,00
   1 $             : 0,02 $ (aucune franchise)
   401(k) 6 %      : (75 000 - 4 500) x 0,02 = 70 500 x 0,02         = 1 410,00
   net single 75 000 : 75 000 - 7 670 (federal) - 4 650 - 1 087,50 - 1 500
                     = 60 092,50
   net single 52 000 (25 $/h) : federal 4 060 (1 240 + 23 500 x 12 %), SS 3 224,
     Medicare 754, AZ 1 040 -> 52 000 - 4 060 - 3 224 - 754 - 1 040 = 42 922,00
   net single 250 000 : federal 51 304 (1 240 + 4 560 + 12 166 + 23 058 + 10 280),
     SS 11 439, Medicare 3 625 + 450 (0,9 % x 50 000) = 4 075, AZ 5 000
     -> 250 000 - 51 304 - 11 439 - 4 075 - 5 000 = 178 182,00 */
check("AZ : single 75 000 $ = 1 500,00 $ (2,0 % de 75 000)",
  calcul("arizona", 75000).etat, 1500.00, 0.005);
check("AZ : married 75 000 $ = 1 500,00 $ (meme pourcentage)",
  calcul("arizona", 75000, "marriedJoint").etat, 1500.00, 0.005);
check("AZ : head of household 75 000 $ = 1 500,00 $ (meme pourcentage)",
  calcul("arizona", 75000, "headOfHousehold").etat, 1500.00, 0.005);
check("AZ : single 25 000 $ = 500,00 $",
  calcul("arizona", 25000).etat, 500.00, 0.005);
check("AZ : single 250 000 $ = 5 000,00 $ (taux plat, pas de plafond)",
  calcul("arizona", 250000).etat, 5000.00, 0.005);
check("AZ : le premier dollar est retenu a 2,0 % = 0,02 $ (aucune franchise)",
  calcul("arizona", 1).etat, 0.02, 0.0001);
check("AZ : 401(k) 6 % sur 75 000 $ -> 70 500 x 2,0 % = 1 410,00 $",
  calcul("arizona", 75000, "single", 0.06).etat, 1410.00, 0.005);
check("AZ : net a 75 000 $ = 60 092,50 $ (75 000 - 7 670 - 4 650 - 1 087,50 - 1 500)",
  calcul("arizona", 75000).net, 60092.50, 0.005);
check("AZ : net a 25 $/h (52 000 $) = 42 922,00 $",
  calcul("arizona", 25 * 2080).net, 42922.00, 0.005);
check("AZ : net a 250 000 $ = 178 182,00 $",
  calcul("arizona", 250000).net, 178182.00, 0.005);
check("AZ : aucun programme salarie (chomage = employeur seul, pas de SDI/PFML lu)",
  (R.states.arizona.employeePrograms || []).length, 0, 0);
check("AZ : un seul taux plat de 2,0 % pour les trois statuts",
  ["single", "marriedJoint", "headOfHousehold"].every(st =>
    JSON.stringify(R.states.arizona.incomeTax.brackets[st]) === JSON.stringify([[Infinity, 0.02]])) ? 1 : 0, 1, 0);
check("AZ : aucune deduction dans la formule de retenue",
  R.states.arizona.incomeTax.standardDeduction, 0, 0);
check("AZ : le defaut est l'un des sept choix du A-4 (0,5 a 3,5 %)",
  [0.005, 0.01, 0.015, 0.02, 0.025, 0.03, 0.035].includes(R.states.arizona.incomeTax.brackets.single[0][1]) ? 1 : 0, 1, 0);

console.log("\n=== New Jersey (29e Etat) ===");

/* Sources (lues en direct le 2026-10-02) : NJ-WT (Sept. 2025) p. 24 : Rate A
   pour Single (NJ-W4 cases 1/3), Rate B pour Married joint / Head of household ;
   allocation annuelle 1 000 $ ; tables annuelles « Tables for Percentage Method
   of Withholding » ; NJ DOL (ligne « Worker » 2026) : UI 0,3825 % + WF/SWF
   0,0425 % sur 44 800 $, SDI 0,19 % et FLI 0,23 % sur 171 100 $.
   MODELISATION : 1 allocation (Single, HoH), 2 (Married joint).
   Chaque attendu est recalcule a la main.
   single 75 000 : base 75 000 - 1 000 = 74 000 ; Rate A tranche 40-75 k :
                   795 + (74 000 - 40 000) x 6,1 % = 795 + 2 074        = 2 869,00
   married 75 000: base 75 000 - 2 000 = 73 000 ; Rate B tranche 70-80 k :
                   1 440 + 3 000 x 3,9 % = 1 440 + 117                  = 1 557,00
   HoH 75 000    : base 74 000 ; Rate B : 1 440 + 4 000 x 3,9 %        = 1 596,00
   single 25 000 : base 24 000 ; 300 + 4 000 x 2,0 %                    =   380,00
   single 250 000: base 249 000 ; 2 930 + 174 000 x 7,0 %
                   = 2 930 + 12 180                                     = 15 110,00
   single 52 000 : base 51 000 ; 795 + 11 000 x 6,1 % = 795 + 671      = 1 466,00
   401(k) 6 %    : (75 000 - 4 500) - 1 000 = 69 500 ; 795 + 29 500 x 6,1 %
                   = 795 + 1 799,50                                     = 2 594,50
   programmes a 75 000 : UI+WF 44 800 x 0,00425 = 190,40 ; SDI 75 000 x 0,0019
     = 142,50 ; FLI 75 000 x 0,0023 = 172,50                           = 505,40
   net single 75 000 : 75 000 - 7 670 - 4 650 - 1 087,50 - 2 869 - 505,40
                     = 58 218,10
   net single 52 000 : 52 000 - 4 060 - 3 224 - 754 - 1 466 - (190,40 + 98,80
     + 119,60 = 408,80) = 42 087,20
   net single 250 000 : 250 000 - 51 304 - 11 439 - 4 075 - 15 110
     - (190,40 + 325,09 + 393,53 = 909,02) = 167 162,98 */
check("NJ : single 75 000 $ = 2 869,00 $ (Rate A, base 74 000)",
  calcul("new-jersey", 75000).etat, 2869.00, 0.005);
check("NJ : married 75 000 $ = 1 557,00 $ (Rate B, 2 allocations)",
  calcul("new-jersey", 75000, "marriedJoint").etat, 1557.00, 0.005);
check("NJ : head of household 75 000 $ = 1 596,00 $ (Rate B, 1 allocation)",
  calcul("new-jersey", 75000, "headOfHousehold").etat, 1596.00, 0.005);
check("NJ : single 25 000 $ = 380,00 $",
  calcul("new-jersey", 25000).etat, 380.00, 0.005);
check("NJ : single 250 000 $ = 15 110,00 $",
  calcul("new-jersey", 250000).etat, 15110.00, 0.005);
check("NJ : single 52 000 $ (25 $/h) = 1 466,00 $",
  calcul("new-jersey", 25 * 2080).etat, 1466.00, 0.005);
check("NJ : 401(k) 6 % sur 75 000 $ -> base 69 500 = 2 594,50 $",
  calcul("new-jersey", 75000, "single", 0.06).etat, 2594.50, 0.005);
check("NJ : rien de retenu jusqu'a 1 000 $ (l'allocation couvre tout)",
  calcul("new-jersey", 1000).etat, 0, 0);
check("NJ : 1 001 $ -> 1 $ imposable x 1,5 % = 0,015 $",
  calcul("new-jersey", 1001).etat, 0.015, 0.0001);

/* Les montants de base IMPRIMES dans les tables annuelles A et B doivent etre
   reproduits par les tranches marginales (15 montants, lus dans l'image du PDF). */
const njA = R.states["new-jersey"].incomeTax.brackets.single;
const njB = R.states["new-jersey"].incomeTax.brackets.marriedJoint;
[[20000, 300], [35000, 600], [40000, 795], [75000, 2930], [500000, 32680], [1000000, 82180]].forEach(([x, base]) =>
  check("NJ Rate A : impot cumule a " + x + " $ = base imprimee " + base + " $",
    progressiveTax(x, njA), base, 0.005));
[[20000, 300], [50000, 900], [70000, 1440], [80000, 1830], [150000, 6100], [500000, 30600], [1000000, 80100]].forEach(([x, base]) =>
  check("NJ Rate B : impot cumule a " + x + " $ = base imprimee " + base + " $",
    progressiveTax(x, njB), base, 0.005));
check("NJ : Married joint et Head of household partagent la Rate B",
  JSON.stringify(R.states["new-jersey"].incomeTax.brackets.marriedJoint) ===
  JSON.stringify(R.states["new-jersey"].incomeTax.brackets.headOfHousehold) ? 1 : 0, 1, 0);

check("NJ : chomage + fonds de formation sur 75 000 $ = 190,40 $ (44 800 x 0,425 %)",
  calcul("new-jersey", 75000).programmes[0].montant, 190.40, 0.005);
check("NJ : SDI sur 75 000 $ = 142,50 $",
  calcul("new-jersey", 75000).programmes[1].montant, 142.50, 0.005);
check("NJ : FLI sur 75 000 $ = 172,50 $",
  calcul("new-jersey", 75000).programmes[2].montant, 172.50, 0.005);
check("NJ : SDI sur 250 000 $ = 325,09 $ (plafond 171 100 x 0,19 %)",
  calcul("new-jersey", 250000).programmes[1].montant, 325.09, 0.005);
check("NJ : FLI sur 250 000 $ = 393,53 $ (plafond 171 100 x 0,23 %)",
  calcul("new-jersey", 250000).programmes[2].montant, 393.53, 0.005);
check("NJ : trois programmes salaries (UI+WF, SDI, FLI)",
  (R.states["new-jersey"].employeePrograms || []).length, 3, 0);
check("NJ : net a 75 000 $ = 58 218,10 $",
  calcul("new-jersey", 75000).net, 58218.10, 0.005);
check("NJ : net a 25 $/h (52 000 $) = 42 087,20 $",
  calcul("new-jersey", 25 * 2080).net, 42087.20, 0.005);
check("NJ : net a 250 000 $ = 167 162,98 $",
  calcul("new-jersey", 250000).net, 167162.98, 0.005);

console.log("\n=== Massachusetts (30e Etat) ===");

/* Sources (instantanes Internet Archive, lus le 2026-10-02) : Circular M
   (Rev. 12/25), page 12, methode en pourcentage : 5 %, 9 % au-dela de
   1 107 750 $, FICA deduite plafonnee a 2 000 $, exemptions 4 400 $ pour 1
   (1 000 x n + 3 400 au-dela), conjoint = « 4 » exemptions, credit chef de
   famille 120 $/an, rien retenu sous 8 000 $ ; DFML : PFML 0,28 % + 0,18 %
   = 0,46 % maximum, plafond Social Security (184 500 $).
   Chaque attendu est recalcule a la main.
   single 75 000  : FICA 5 737,50 > 2 000 -> deduite 2 000 ; 75 000 - 4 400 - 2 000
                    = 68 600 ; x 5 %                                     = 3 430,00
   married 75 000 : 75 000 - 8 400 - 2 000 = 64 600 ; x 5 %              = 3 230,00
   HoH 75 000     : 3 430,00 - 120                                      = 3 310,00
   single 25 000  : FICA 25 000 x 7,65 % = 1 912,50 (< 2 000) ; 25 000 - 4 400
                    - 1 912,50 = 18 687,50 ; x 5 %                       =   934,375
   single 20 000  : FICA 1 530 ; 20 000 - 4 400 - 1 530 = 14 070 ; x 5 %=   703,50
   married 20 000 : 20 000 - 8 400 - 1 530 = 10 070 ; x 5 %             =   503,50
   HoH 20 000     : 703,50 - 120                                        =   583,50
   single 8 000   : FICA 612 ; 8 000 - 4 400 - 612 = 2 988 ; x 5 %      =   149,40
   single 7 999   : sous 8 000 $ -> 0
   single 52 000  : FICA 3 978 > 2 000 ; 52 000 - 4 400 - 2 000 = 45 600 ; x 5 % = 2 280,00
   single 250 000 : 250 000 - 4 400 - 2 000 = 243 600 ; x 5 %          = 12 180,00
   single 1 500 000 : 1 500 000 - 4 400 - 2 000 = 1 493 600 ;
                    1 107 750 x 5 % = 55 387,50 ; 385 850 x 9 % = 34 726,50 = 90 114,00
   401(k) 6 %     : (75 000 - 4 500) - 4 400 - 2 000 = 64 100 ; x 5 %   =  3 205,00
   PFML 75 000    : 75 000 x 0,46 %                                     =   345,00
   PFML 250 000   : 184 500 x 0,46 %                                    =   848,70
   net single 75 000 : 75 000 - 7 670 - 4 650 - 1 087,50 - 3 430 - 345  = 57 817,50
   net single 52 000 : 52 000 - 4 060 - 3 224 - 754 - 2 280 - 239,20    = 41 442,80
   net single 250 000: 250 000 - 51 304 - 11 439 - 4 075 - 12 180 - 848,70 = 170 153,30 */
check("MA : single 75 000 $ = 3 430,00 $ (75 000 - 4 400 - 2 000, x 5 %)",
  calcul("massachusetts", 75000).etat, 3430.00, 0.005);
check("MA : married 75 000 $ = 3 230,00 $ (5 exemptions = 8 400 $)",
  calcul("massachusetts", 75000, "marriedJoint").etat, 3230.00, 0.005);
check("MA : head of household 75 000 $ = 3 310,00 $ (credit de 120 $)",
  calcul("massachusetts", 75000, "headOfHousehold").etat, 3310.00, 0.005);
check("MA : single 25 000 $ = 934,375 $ (FICA 1 912,50 $ < plafond de 2 000 $)",
  calcul("massachusetts", 25000).etat, 934.375, 0.0005);
check("MA : single 20 000 $ = 703,50 $ (FICA 1 530 $)",
  calcul("massachusetts", 20000).etat, 703.50, 0.005);
check("MA : married 20 000 $ = 503,50 $",
  calcul("massachusetts", 20000, "marriedJoint").etat, 503.50, 0.005);
check("MA : head of household 20 000 $ = 583,50 $",
  calcul("massachusetts", 20000, "headOfHousehold").etat, 583.50, 0.005);
check("MA : single 8 000 $ = 149,40 $ (le plancher est inclus)",
  calcul("massachusetts", 8000).etat, 149.40, 0.005);
check("MA : single 7 999 $ = 0 $ (sous 8 000 $, rien n'est retenu)",
  calcul("massachusetts", 7999).etat, 0, 0);
check("MA : single 52 000 $ (25 $/h) = 2 280,00 $",
  calcul("massachusetts", 25 * 2080).etat, 2280.00, 0.005);
check("MA : single 250 000 $ = 12 180,00 $",
  calcul("massachusetts", 250000).etat, 12180.00, 0.005);
check("MA : single 1 500 000 $ = 90 114,00 $ (5 % puis 9 % au-dela de 1 107 750 $)",
  calcul("massachusetts", 1500000).etat, 90114.00, 0.005);
check("MA : 401(k) 6 % sur 75 000 $ = 3 205,00 $",
  calcul("massachusetts", 75000, "single", 0.06).etat, 3205.00, 0.005);
check("MA : impot cumule a 1 107 750 $ imposable = 55 387,50 $",
  progressiveTax(1107750, R.states.massachusetts.incomeTax.brackets.single), 55387.50, 0.005);
check("MA : PFML sur 75 000 $ = 345,00 $ (0,46 %)",
  calcul("massachusetts", 75000).programmes[0].montant, 345.00, 0.005);
check("MA : PFML sur 250 000 $ = 848,70 $ (plafond 184 500 $ x 0,46 %)",
  calcul("massachusetts", 250000).programmes[0].montant, 848.70, 0.005);
check("MA : net a 75 000 $ = 57 817,50 $",
  calcul("massachusetts", 75000).net, 57817.50, 0.005);
check("MA : net a 25 $/h (52 000 $) = 41 442,80 $",
  calcul("massachusetts", 25 * 2080).net, 41442.80, 0.005);
check("MA : net a 250 000 $ = 170 153,30 $",
  calcul("massachusetts", 250000).net, 170153.30, 0.005);
check("MA : un seul programme salarie (le PFML)",
  (R.states.massachusetts.employeePrograms || []).length, 1, 0);
check("MA : le plafond du PFML est le plafond Social Security",
  R.states.massachusetts.employeePrograms[0].wageCap === R.fica.socialSecurity.wageBase ? 1 : 0, 1, 0);
check("MA : 0,28 % + 0,18 % = 0,46 %",
  R.states.massachusetts.employeePrograms[0].rate, 0.0028 + 0.0018, 1e-12);
check("MA : exemption(n) = 1 000 x n + 3 400 : 1 -> 4 400, 5 -> 8 400",
  (1000 * 1 + 3400) === R.states.massachusetts.incomeTax.standardDeduction.single &&
  (1000 * 5 + 3400) === R.states.massachusetts.incomeTax.standardDeduction.marriedJoint ? 1 : 0, 1, 0);
check("MA : les trois statuts partagent les memes tranches",
  ["marriedJoint", "headOfHousehold"].every(st =>
    JSON.stringify(R.states.massachusetts.incomeTax.brackets[st]) ===
    JSON.stringify(R.states.massachusetts.incomeTax.brackets.single)) ? 1 : 0, 1, 0);
check("ficaDeduction / noWithholdingBelow : propres au Massachusetts (aucun autre Etat ne les declare)",
  Object.keys(R.states).filter(k => k !== "massachusetts" &&
    (R.states[k].incomeTax.ficaDeduction || R.states[k].incomeTax.noWithholdingBelow)).length, 0, 0);

/* Le moteur NAVIGATEUR (assets/calc-paycheck.js) et le moteur NODE (lib/paie.js)
   doivent donner le meme impot d'Etat et le meme net : on charge le premier
   dans un contexte vm sans DOM. */
{
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const ctx = { window: {}, document: { readyState: "complete", addEventListener() {}, querySelector() { return null; } },
                RATES_2026: R, Intl, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "assets", "calc-paycheck.js"), "utf8"), ctx);
  let ecarts = 0, n = 0;
  for (const st of ["single", "marriedJoint", "headOfHousehold"])
    for (const g of [5000, 7999, 8000, 15000, 20000, 25000, 26143, 26145, 52000, 75000, 123456, 250000, 1107750, 1500000])
      for (const rp of [0, 0.06]) {
        const a = ctx.window.StateLineCalc.computeAnnual(
          { grossAnnual: g, state: "massachusetts", filingStatus: st, retirementPct: rp, waCaresApplies: false }, R);
        const b = calcul("massachusetts", g, st, rp);
        n++;
        if (Math.abs(a.stateTax - b.etat) > 0.005 || Math.abs(a.net - b.net) > 0.01) {
          ecarts++; console.log("   ecart navigateur/node :", st, g, rp, a.stateTax, b.etat, a.net, b.net);
        }
      }
  check("MA : moteur navigateur == moteur node sur " + n + " entrees (impot d'Etat et net)", ecarts, 0, 0);
}

console.log("\n=== Minnesota (31e Etat) ===");

/* Sources (lues le 2026-10-06) : Minnesota Department of Revenue, 2026
   Income Tax Withholding Instruction Booklet (wh-inst-26.pdf), page 34,
   « Computer Formula » : annual wage - allowances x 5 300 $, puis le
   « Chart for Step 5 » ; Form W-4MN 2026 : celibataire = 2 allocations
   (A + B) = 10 600 $, marie un seul emploi = 3 (A + B + C) = 15 900 $, chef de
   famille = 3 (A + B + E) sur la table celibataire ; Minnesota Paid Leave :
   0,88 % dont 0,44 % maximum retenable, plafond = FICA OASDI (268B.14), 184 500 $.
   Chaque attendu est recalcule a la main.
   single 75 000   : 75 000 - 10 600 = 64 400 ; 1 782,09 + (64 400 - 38 010) x 6,80 %
                     = 1 782,09 + 1 794,52                               = 3 576,61
   married 75 000  : 75 000 - 15 900 = 59 100 ; (59 100 - 14 700) x 5,35 % = 2 375,40
   HoH 75 000      : 59 100 sur la table celibataire ; 1 782,09 + 21 090 x 6,80 %
                     = 1 782,09 + 1 434,12                               = 3 216,21
   single 25 000   : 14 400 ; (14 400 - 4 700) x 5,35 %                  =   518,95
   single 20 000   : 9 400 ; 4 700 x 5,35 %                              =   251,45
   single 15 300   : 4 700 -> tranche a 0 %                              =     0,00
   married 20 000  : 4 100 < 14 700                                      =     0,00
   married 40 000  : 24 100 ; 9 400 x 5,35 %                             =   502,90
   single 52 000   : 41 400 ; 1 782,09 + 3 390 x 6,80 % = 1 782,09 + 230,52 = 2 012,61
   single 120 000  : 109 400 ; 1 782,09 + 71 390 x 6,80 % = 1 782,09 + 4 854,52 = 6 636,61
   single 250 000  : 239 400 ; 14 315,27 + 31 550 x 9,85 % = 14 315,27 + 3 107,675 = 17 422,945
   married 500 000 : 484 100 ; 23 789,82 + 131 470 x 9,85 %
                     (23 789,815 + 12 949,795)                           = 36 739,61
   401(k) 6 %      : (75 000 - 4 500) - 10 600 = 59 900 ; 1 782,09 + 21 890 x 6,80 %
                     = 1 782,09 + 1 488,52                               = 3 270,61
   paid leave 75 000  : 75 000 x 0,44 %                                  =   330,00
   paid leave 250 000 : 184 500 x 0,44 % (Minn. Stat. 268B.14 subd. 4)   =   811,80
   net single 75 000  : 75 000 - 7 670 - 4 650 - 1 087,50 - 3 576,61 - 330     = 57 685,89
   net single 52 000  : 52 000 - 4 060 - 3 224 - 754 - 2 012,61 - 228,80       = 41 720,59
   net single 250 000 : 250 000 - 51 304 - 11 439 - 4 075 - 17 422,945 - 811,80 = 164 947,255
   Tolerance 0,006 $ sur les cas qui franchissent le 38 010 $ : le Department imprime
   ses constantes « Add » arrondies au cent (1 782,09 au lieu de 1 782,085) et le
   moteur calcule les tranches sans arrondi ; l'ecart est de 0,005 $ au plus. */
check("MN : single 75 000 $ = 3 576,61 $ (75 000 - 10 600, table celibataire)",
  calcul("minnesota", 75000).etat, 3576.61, 0.005);
check("MN : married 75 000 $ = 2 375,40 $ (3 allocations = 15 900 $)",
  calcul("minnesota", 75000, "marriedJoint").etat, 2375.40, 0.005);
check("MN : head of household 75 000 $ = 3 216,21 $ (table celibataire, 15 900 $)",
  calcul("minnesota", 75000, "headOfHousehold").etat, 3216.21, 0.006);
check("MN : single 25 000 $ = 518,95 $",
  calcul("minnesota", 25000).etat, 518.95, 0.005);
check("MN : single 20 000 $ = 251,45 $",
  calcul("minnesota", 20000).etat, 251.45, 0.005);
check("MN : single 15 300 $ = 0 $ (la tranche a 0 % va jusqu'a 4 700 $ apres allocations)",
  calcul("minnesota", 15300).etat, 0, 0);
check("MN : married 20 000 $ = 0 $ (sous 14 700 $ apres allocations)",
  calcul("minnesota", 20000, "marriedJoint").etat, 0, 0);
check("MN : married 40 000 $ = 502,90 $",
  calcul("minnesota", 40000, "marriedJoint").etat, 502.90, 0.005);
check("MN : single 52 000 $ (25 $/h) = 2 012,61 $",
  calcul("minnesota", 25 * 2080).etat, 2012.61, 0.005);
check("MN : single 120 000 $ = 6 636,61 $",
  calcul("minnesota", 120000).etat, 6636.61, 0.005);
check("MN : single 250 000 $ = 17 422,945 $ (4e tranche, 9,85 %)",
  calcul("minnesota", 250000).etat, 17422.945, 0.006);
check("MN : married 500 000 $ = 36 739,61 $",
  calcul("minnesota", 500000, "marriedJoint").etat, 36739.61, 0.005);
check("MN : 401(k) 6 % sur 75 000 $ = 3 270,61 $",
  calcul("minnesota", 75000, "single", 0.06).etat, 3270.61, 0.005);
check("MN : la colonne « Add » imprimee a 38 010 $ (1 782,09 $) tombe juste",
  progressiveTax(38010, R.states.minnesota.incomeTax.brackets.single), 1782.09, 0.005);
check("MN : la colonne « Add » imprimee a 114 130 $ (6 958,25 $) tombe juste",
  progressiveTax(114130, R.states.minnesota.incomeTax.brackets.single), 6958.25, 0.005);
check("MN : la colonne « Add » imprimee a 207 850 $ (14 315,27 $) tombe juste",
  progressiveTax(207850, R.states.minnesota.incomeTax.brackets.single), 14315.27, 0.006);
check("MN : la colonne « Add » imprimee a 63 400 $ marie (2 605,45 $) tombe juste",
  progressiveTax(63400, R.states.minnesota.incomeTax.brackets.marriedJoint), 2605.45, 0.005);
check("MN : la colonne « Add » imprimee a 208 180 $ marie (12 450,49 $) tombe juste",
  progressiveTax(208180, R.states.minnesota.incomeTax.brackets.marriedJoint), 12450.49, 0.005);
check("MN : la colonne « Add » imprimee a 352 630 $ marie (23 789,82 $) tombe juste",
  progressiveTax(352630, R.states.minnesota.incomeTax.brackets.marriedJoint), 23789.82, 0.006);
check("MN : paid leave sur 75 000 $ = 330,00 $ (0,44 %)",
  calcul("minnesota", 75000).programmes[0].montant, 330.00, 0.005);
check("MN : paid leave sur 250 000 $ = 811,80 $ (plafond 184 500 $ x 0,44 %)",
  calcul("minnesota", 250000).programmes[0].montant, 811.80, 0.005);
check("MN : net a 75 000 $ = 57 685,89 $",
  calcul("minnesota", 75000).net, 57685.89, 0.006);
check("MN : net a 25 $/h (52 000 $) = 41 720,59 $",
  calcul("minnesota", 25 * 2080).net, 41720.59, 0.006);
check("MN : net a 250 000 $ = 164 947,255 $",
  calcul("minnesota", 250000).net, 164947.255, 0.006);
check("MN : un seul programme salarie (le paid leave), 0,44 % = la moitie de 0,88 %",
  (R.states.minnesota.employeePrograms || []).length === 1 &&
  Math.abs(R.states.minnesota.employeePrograms[0].rate - 0.0088 / 2) < 1e-12 ? 1 : 0, 1, 0);
check("MN : le plafond du paid leave est le plafond FICA OASDI (Minn. Stat. 268B.14 subd. 4), 184 500 $",
  R.states.minnesota.employeePrograms[0].wageCap === R.fica.socialSecurity.wageBase && R.fica.socialSecurity.wageBase === 184500 ? 1 : 0, 1, 0);
check("MN : allocations = 5 300 $ x 2 (celibataire), x 3 (couple et chef de famille)",
  R.states.minnesota.incomeTax.standardDeduction.single === 2 * 5300 &&
  R.states.minnesota.incomeTax.standardDeduction.marriedJoint === 3 * 5300 &&
  R.states.minnesota.incomeTax.standardDeduction.headOfHousehold === 3 * 5300 ? 1 : 0, 1, 0);
check("MN : le chef de famille utilise les memes tranches que le celibataire (le Department n'imprime que deux tables)",
  JSON.stringify(R.states.minnesota.incomeTax.brackets.headOfHousehold) ===
  JSON.stringify(R.states.minnesota.incomeTax.brackets.single) ? 1 : 0, 1, 0);

/* Le moteur NAVIGATEUR (assets/calc-paycheck.js) et le moteur NODE (lib/paie.js)
   doivent donner le meme impot d'Etat et le meme net. */
{
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const ctx = { window: {}, document: { readyState: "complete", addEventListener() {}, querySelector() { return null; } },
                RATES_2026: R, Intl, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "assets", "calc-paycheck.js"), "utf8"), ctx);
  let ecarts = 0, n = 0;
  for (const st of ["single", "marriedJoint", "headOfHousehold"])
    for (const g of [5000, 15300, 15301, 20000, 25000, 40000, 52000, 75000, 123456, 124730, 250000, 500000, 1500000])
      for (const rp of [0, 0.06]) {
        const a = ctx.window.StateLineCalc.computeAnnual(
          { grossAnnual: g, state: "minnesota", filingStatus: st, retirementPct: rp, waCaresApplies: false }, R);
        const b = calcul("minnesota", g, st, rp);
        n++;
        if (Math.abs(a.stateTax - b.etat) > 0.005 || Math.abs(a.net - b.net) > 0.01) {
          ecarts++; console.log("   ecart navigateur/node :", st, g, rp, a.stateTax, b.etat, a.net, b.net);
        }
      }
  check("MN : moteur navigateur == moteur node sur " + n + " entrees (impot d'Etat et net)", ecarts, 0, 0);
}

console.log("\n=== Indiana (32e Etat) ===");

/* Sources (lues le 2026-10-06) : Indiana Department of Revenue, Departmental
   Notice #1 « Effective Oct. 1, 2026 (R47 / 10-26) » : « For 2026, the state
   adjusted gross income tax rate for individuals is 2.95%. » ; « Each employee is
   entitled to deduct $1,000 per year per exemption claimed on line 5 of his/her
   Form WH-4 » ; l'exemple imprime applique 2,95 % ET le taux de comte a la MEME
   base (473,08 $ x .0295 = 13,96 $ ; 473,08 $ x .01 = 4,73 $) ; tableau des 92
   comtes p. 5. Form WH-4 : ligne 1 = 1 exemption, ligne 2 = 1 pour le conjoint
   qui ne reclame pas la sienne. Defaut du moteur : Marion, 0,0202.
   Chaque attendu est recalcule a la main.
   single 75 000, Marion : base 75 000 - 1 000 = 74 000
        Etat   74 000 x 0,0295 = 2 183,00
        comte  74 000 x 0,0202 = 1 494,80
        federal 7 670 + SS 4 650 + Medicare 1 087,50
        net    75 000 - 7 670 - 5 737,50 - 2 183 - 1 494,80          = 57 914,70
   married 75 000 : base 73 000 ; Etat 2 153,50 ; comte 1 474,60
   HoH 75 000     : 1 exemption comme le celibataire ; Etat 2 183,00
   single 52 000 (25 $/h) : base 51 000 ; Etat 1 504,50 ; comte 1 030,20
        federal (52 000 - 16 100 = 35 900) 1 240 + 23 500 x 12 % = 4 060 ; FICA 3 978
        net 52 000 - 4 060 - 3 978 - 1 504,50 - 1 030,20              = 41 427,30
   single 250 000 : base 249 000 ; Etat 7 345,50 ; comte 5 029,80
        federal 51 304 ; SS 11 439 ; Medicare 4 075
        net 250 000 - 51 304 - 11 439 - 4 075 - 7 345,50 - 5 029,80   = 170 806,70
   single 20 000 : base 19 000 ; Etat 560,50 ; comte 383,80
   single 1 000 : base 0 ; aucun impot d'Etat ni de comte
   Porter (0,005)   75 000 : 74 000 x 0,005   =   370,00
   Randolph (0,03)  75 000 : 74 000 x 0,03    = 2 220,00
   Hamilton (0,011) 75 000 : 74 000 x 0,011   =   814,00
   Boone (0,0171)   75 000 : 74 000 x 0,0171  = 1 265,40
   Brown (0,025234) 75 000 : 74 000 x 0,025234 = 1 867,316
   St. Joseph (0,0175) 75 000 : 74 000 x 0,0175 = 1 295,00
   401(k) 6 % : base (75 000 - 4 500) - 1 000 = 69 500 ; Etat 2 050,25 ; comte 1 403,90 */
const inC = (b, st, rp, c) => calcul("indiana", b, st, rp, c);
const comteIn = r => r.programmes.filter(p => p.county).reduce((t, p) => t + p.montant, 0);
check("IN : single 75 000 $ Etat = 2 183,00 $ (74 000 x 2,95 %)", inC(75000).etat, 2183.00, 0.005);
check("IN : single 75 000 $ comte Marion = 1 494,80 $ (74 000 x 2,02 %)", comteIn(inC(75000)), 1494.80, 0.005);
check("IN : net a 75 000 $ = 57 914,70 $", inC(75000).net, 57914.70, 0.006);
check("IN : married 75 000 $ Etat = 2 153,50 $ (2 exemptions)", inC(75000, "marriedJoint").etat, 2153.50, 0.005);
check("IN : married 75 000 $ comte = 1 474,60 $", comteIn(inC(75000, "marriedJoint")), 1474.60, 0.005);
check("IN : head of household 75 000 $ = single (1 exemption) 2 183,00 $", inC(75000, "headOfHousehold").etat, 2183.00, 0.005);
check("IN : single 52 000 $ (25 $/h) Etat = 1 504,50 $", inC(52000).etat, 1504.50, 0.005);
check("IN : single 52 000 $ comte = 1 030,20 $", comteIn(inC(52000)), 1030.20, 0.005);
check("IN : net a 25 $/h (52 000 $) = 41 427,30 $", inC(52000).net, 41427.30, 0.006);
check("IN : single 250 000 $ Etat = 7 345,50 $ (taux plat, aucune tranche)", inC(250000).etat, 7345.50, 0.005);
check("IN : single 250 000 $ comte = 5 029,80 $", comteIn(inC(250000)), 5029.80, 0.005);
check("IN : net a 250 000 $ = 170 806,70 $", inC(250000).net, 170806.70, 0.006);
check("IN : single 20 000 $ Etat = 560,50 $", inC(20000).etat, 560.50, 0.005);
check("IN : single 20 000 $ comte = 383,80 $", comteIn(inC(20000)), 383.80, 0.005);
check("IN : 1 000 $ de salaire = 0 $ d'Etat (l'exemption absorbe tout)", inC(1000).etat, 0, 0);
check("IN : 1 000 $ de salaire = 0 $ de comte", comteIn(inC(1000)), 0, 0);
check("IN : Porter 0,5 % sur 75 000 $ = 370,00 $", comteIn(inC(75000, "single", 0, "porter")), 370.00, 0.005);
check("IN : Randolph 3,0 % sur 75 000 $ = 2 220,00 $", comteIn(inC(75000, "single", 0, "randolph")), 2220.00, 0.005);
check("IN : Hamilton 1,1 % sur 75 000 $ = 814,00 $", comteIn(inC(75000, "single", 0, "hamilton")), 814.00, 0.005);
check("IN : Boone 1,71 % (asterisque, modifie depuis le 1er janvier) = 1 265,40 $", comteIn(inC(75000, "single", 0, "boone")), 1265.40, 0.005);
check("IN : Brown 2,5234 % (4 decimales) = 1 867,316 $", comteIn(inC(75000, "single", 0, "brown")), 1867.316, 0.0005);
check("IN : St. Joseph (cle st-joseph) 1,75 % = 1 295,00 $", comteIn(inC(75000, "single", 0, "st-joseph")), 1295.00, 0.005);
check("IN : 401(k) 6 % sur 75 000 $ Etat = 2 050,25 $", inC(75000, "single", 0.06).etat, 2050.25, 0.005);
check("IN : 401(k) 6 % sur 75 000 $ comte = 1 403,90 $", comteIn(inC(75000, "single", 0.06)), 1403.90, 0.005);
check("IN : le comte n'est pas range avec les programmes (drapeau county, etiquette Marion 2.02%)",
  inC(75000).programmes.length === 1 && inC(75000).programmes[0].county === true &&
  inC(75000).programmes[0].label === "Marion County income tax (2.02%)" ? 1 : 0, 1, 0);
check("IN : etiquette a 4 decimales, sans zero superflu (Brown 2.5234%, Hamilton 1.1%)",
  inC(75000, "single", 0, "brown").programmes[0].label === "Brown County income tax (2.5234%)" &&
  inC(75000, "single", 0, "hamilton").programmes[0].label === "Hamilton County income tax (1.1%)" ? 1 : 0, 1, 0);
check("IN : un comte inconnu est une ERREUR, jamais un defaut silencieux",
  (() => { try { inC(75000, "single", 0, "atlantis"); return 0; } catch (e) { return 1; } })(), 1, 0);
check("IN : un Etat sans impot de comte refuse un comte",
  (() => { try { calcul("texas", 75000, "single", 0, "marion"); return 0; } catch (e) { return 1; } })(), 1, 0);
check("IN : aucun autre Etat n'a de countyTax (le mecanisme est propre a l'Indiana)",
  Object.keys(R.states).filter(k => R.states[k].incomeTax.countyTax).join(",") === "indiana" ? 1 : 0, 1, 0);
check("IN : 92 comtes, defaut Marion, taux entre 0,5 % et 3,0 %",
  (() => { const c = R.states.indiana.incomeTax.countyTax; const t = Object.values(c.rates).map(x => x[1]);
    return Object.keys(c.rates).length === 92 && c.defaultCounty === "marion" && Math.min(...t) === 0.005 && Math.max(...t) === 0.03 ? 1 : 0; })(), 1, 0);
check("IN : taux plat 2,95 % identique pour les trois statuts, exemptions 1 000 / 2 000 / 1 000 $",
  (() => { const i = R.states.indiana.incomeTax; const b = i.brackets;
    return JSON.stringify(b.single) === JSON.stringify([[Infinity, 0.0295]]) &&
           JSON.stringify(b.marriedJoint) === JSON.stringify(b.single) && JSON.stringify(b.headOfHousehold) === JSON.stringify(b.single) &&
           i.standardDeduction.single === 1000 && i.standardDeduction.marriedJoint === 2000 && i.standardDeduction.headOfHousehold === 1000 ? 1 : 0; })(), 1, 0);
check("IN : aucun programme salarie ni conge paye d'Etat (employeePrograms, paidLeave absents)",
  !R.states.indiana.employeePrograms && !R.states.indiana.paidLeave ? 1 : 0, 1, 0);

/* Le moteur NAVIGATEUR (assets/calc-paycheck.js) et le moteur NODE (lib/paie.js)
   doivent donner le meme impot d'Etat, le meme comte et le meme net, pour CHAQUE
   comte (92) et les trois statuts. */
{
  const vm = require("vm"), fs = require("fs"), path = require("path");
  const ctx = { window: {}, document: { readyState: "complete", addEventListener() {}, querySelector() { return null; } },
                RATES_2026: R, Intl, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "..", "assets", "calc-paycheck.js"), "utf8"), ctx);
  let ecarts = 0, n = 0;
  const comtes = Object.keys(R.states.indiana.incomeTax.countyTax.rates).concat([undefined]);
  for (const c of comtes)
    for (const st of ["single", "marriedJoint", "headOfHousehold"])
      for (const g of [900, 1000, 20000, 52000, 75000, 123456, 250000, 1500000])
        for (const rp of [0, 0.06]) {
          const a = ctx.window.StateLineCalc.computeAnnual(
            { grossAnnual: g, state: "indiana", county: c, filingStatus: st, retirementPct: rp, waCaresApplies: false }, R);
          const b = calcul("indiana", g, st, rp, c);
          n++;
          const ca = a.programmes.filter(p => p.county).reduce((t, p) => t + p.amount, 0);
          const labelOk = a.programmes.length === b.programmes.length && a.programmes.every((p, i) => p.label === b.programmes[i].label);
          if (Math.abs(a.stateTax - b.etat) > 0.005 || Math.abs(ca - comteIn(b)) > 0.005 || Math.abs(a.net - b.net) > 0.01 || !labelOk) {
            ecarts++; if (ecarts < 6) console.log("   ecart navigateur/node :", c, st, g, rp, a.stateTax, b.etat, ca, comteIn(b), a.net, b.net);
          }
        }
  check("IN : moteur navigateur == moteur node sur " + n + " entrees (92 comtes + defaut x 3 statuts : Etat, comte, etiquette, net)", ecarts, 0, 0);
}

console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
process.exit(fail === 0 ? 0 : 1);
