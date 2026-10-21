/* Recoupe la retenue du Maine (moteur) avec ce que Maine Revenue Services IMPRIME.
 *
 * Source : « 2026 Withholding Tables for Individual Income Tax » (« Revised: August 2026 », Last-Modified 13/08/2026),
 * https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/26_wh_tab_instr_August2026.pdf, lu le 2026-10-21 (texte :
 * .tooling/sources/maine-wh-tables-2026-aug.txt) :
 *   - pages 6-7, « Maine Income Tax Withholding -- Percentage Method -- 2026 » : 6 etapes, deux baremes, la Note (1) du surcharge et trois
 *     exemples imprimes. Ecrits ICI une seconde fois, A PARTIR DU TEXTE du livret, independamment du moteur ;
 *   - pages 9-18, « Wage Bracket Tables » : 10 grilles (celibataire et marie x hebdomadaire, toutes les deux semaines, deux fois par mois,
 *     mensuelle, quotidienne) par tranche de salaire x 0 a 10 allocations, extraites avec les coordonnees des mots (PyMuPDF) dans
 *     .tooling/sources/maine-wh-tables-2026.json (une cellule vide = 0 $) ;
 *   - le bas de chaque grille : « Use percentage method », puis « 7.15% of the excess over Y plus [11 montants] », puis « 9.15% of the excess
 *     over Z plus C ».
 * Ce que le script prouve :
 *   1. les trois exemples imprimes du livret sont reproduits par la methode en pourcentage telle que ecrite ici (0 $, 32 $, 256 $) ;
 *   2. le moteur (rates-2026.js + lib/paie.js) == la methode en pourcentage, aux trois statuts du site, sur un balayage de salaires, y compris
 *      la pente de la deduction standard, ses deux bornes et la tranche du surcharge ;
 *   3. les grilles imprimees sont reproduites cellule par cellule par la formule avec la deduction standard d'AVANT la revision d'aout
 *      (12 450 $ celibataire, 27 750 $ marie) appliquee au HAUT de la tranche de salaire : les grilles n'ont donc PAS ete mises a jour avec le
 *      reste du livret ; le script mesure l'ecart entre les grilles et la methode en pourcentage pour les statuts du site ;
 *   4. le bas des grilles (montants « plus » au point ou la deduction standard est nulle, et le montant au-dela de 19 235 $ par semaine, etc.)
 *      recoupe la methode en pourcentage.
 * Lancer : node .tooling/test/verif-retenue-me.js
 */
const R = require("../../data/rates-2026.js");
const { calcul } = require("../lib/paie.js");
const T = require("../sources/maine-wh-tables-2026.json");
let echecs = 0;
const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };

/* --- 1. La methode en pourcentage, ecrite d'apres le livret ------------------------------------------------------------------------------ */
const ALLOC = 5300;
const SEUILS = {
  single:  { sd: 12850, plein: 102250, nul: 177250, etendue: 75000,  b: [27400, 64850, 1000000],  base: [0, 1589, 4117] },
  married: { sd: 28550, plein: 204550, nul: 354550, etendue: 150000, b: [54850, 129750, 1500000], base: [0, 3181, 8237] }
};
const sdLivret = (annuel, st) => {
  const s = SEUILS[st];
  if (annuel <= s.plein) return s.sd;
  if (annuel >= s.nul) return 0;
  return Math.round(s.sd * (s.nul - annuel) / s.etendue * 1e4) / 1e4;          // « Round to 4 decimals »
};
/* Bareme de la page 6 : 5,80 % ; 6,75 % ; 7,15 % ; plus le surcharge de 2 % (Note 1) au-dela de 1 000 000 $ / 1 500 000 $ de revenu annualise. */
const baremeLivret = (inc, st) => {
  const s = SEUILS[st];
  if (inc <= 0) return 0;
  /* Les montants de base imprimes (1 589 $ et 4 117 $ ; 3 181 $ et 8 237 $) sont arrondis au dollar : on calcule la base exacte (27 400 x 5,8 % ...)
     et on recoupe les montants imprimes separement, plus haut. */
  let t = inc < s.b[0] ? inc * 0.058
        : inc < s.b[1] ? s.b[0] * 0.058 + (inc - s.b[0]) * 0.0675
        : s.b[0] * 0.058 + (s.b[1] - s.b[0]) * 0.0675 + (inc - s.b[1]) * 0.0715;
  const seuilSurcharge = s.b[2];
  if (inc > seuilSurcharge) t += (inc - seuilSurcharge) * 0.02;
  return t;
};
/* Retenue ANNUELLE de la methode en pourcentage : steps 1 a 5, sans l'arrondi final a l'unite (step 6). */
const pmAnnuel = (annuel, st, allocations) => {
  const inc = annuel - allocations * ALLOC - sdLivret(annuel, st);
  return baremeLivret(inc, st);
};
const pm = (paie, N, st, allocations) => pmAnnuel(paie * N, st, allocations) / N;

let nVerifs = 0;
/* Les montants de base imprimes recoupent le calcul exact a moins d'un dollar (arrondi au dollar du livret). */
ok(Math.abs(27400 * 0.058 - 1589) < 0.25 && Math.abs(27400 * 0.058 + 37450 * 0.0675 - 4117) < 0.1, "bases imprimees du bareme celibataire"); nVerifs += 2;
ok(Math.abs(54850 * 0.058 - 3181) < 0.35 && Math.abs(54850 * 0.058 + 74900 * 0.0675 - 8237) < 0.1, "bases imprimees du bareme marie"); nVerifs += 2;

/* Exemples imprimes. */
ok(pm(300, 52, "single", 2) === 0, "exemple 1 : 300 $ par semaine, 2 allocations -> 0 $"); nVerifs++;
ok(Math.round(pm(1000, 52, "single", 2)) === 32 && Math.abs(pm(1000, 52, "single", 2) - 32.06) < 0.01, "exemple 2 : 1 000 $ par semaine, 2 allocations -> 32,06 -> 32 $ ; obtenu " + pm(1000, 52, "single", 2)); nVerifs++;
ok(Math.round(pm(4500, 52, "married", 2)) === 256 && Math.abs(pm(4500, 52, "married", 2) - 255.62) < 0.005, "exemple 3 : 4 500 $ par semaine, marie, 2 allocations -> 255,62 -> 256 $ ; obtenu " + pm(4500, 52, "married", 2)); nVerifs++;
ok(Math.abs(sdLivret(234000, "married") - 22944.6833) < 0.0001, "exemple 3 : deduction standard 28 550 x 120 550 / 150 000"); nVerifs++;

/* --- 2. Le moteur == la methode en pourcentage, aux trois statuts du site -------------------------------------------------------------- */
const STATUTS = [["single", "single", 1], ["marriedJoint", "married", 2], ["headOfHousehold", "single", 2]];
let maxEcartMoteur = 0, nMoteur = 0;
const balayage = [];
for (let g = 5000; g <= 120000; g += 1250) balayage.push(g);
for (let g = 120000; g <= 450000; g += 3250) balayage.push(g);
balayage.push(18150, 18151, 102250, 102251, 177249, 177250, 177251, 204550, 204551, 354549, 354550, 354551, 999999, 1000000, 1000001, 1500000, 1500001, 2000000, 75000, 41600, 52000, 62400);
for (const [st, bar, al] of STATUTS) for (const g of balayage) {
  const e = calcul("maine", g, st).etat, p = pmAnnuel(g, bar, al);
  maxEcartMoteur = Math.max(maxEcartMoteur, Math.abs(e - p)); nMoteur++;
  ok(Math.abs(e - p) < 0.001, "moteur != methode en pourcentage : " + st + " " + g + " : " + e + " / " + p);
}
nVerifs += nMoteur;

/* --- 3. Les grilles imprimees ---------------------------------------------------------------------------------------------------------- */
const SD_ANCIENNE = { single: 12450, married: 27750 };       // celles de la premiere edition du livret (octobre 2025), avant la revision d'aout
const ancien = (annuel, st, k) => {
  /* meme formule, avec l'ancienne deduction standard (meme pente, memes bornes decalees : non utilisees, les grilles s'arretent a 94 640 $ par an) */
  const inc = annuel - k * ALLOC - SD_ANCIENNE[st];
  return baremeLivret(inc, st);
};
let nCellules = 0, nExactes = 0, nBord = 0, maxEcartGrille = 0, nVides = 0, nLignes = 0;
const ecartsStatut = { "single/1": [], "married/2": [], "single/2": [] };
for (const tb of T.tables) {
  const st = tb.status, N = tb.N;
  const R0 = tb.rows;
  /* tranches contigues : la borne basse d'une ligne est la borne haute de la precedente. */
  for (let i = 1; i < R0.length; i++) ok(R0[i][0] === R0[i - 1][1], "tranches non contigues " + st + " " + tb.period + " ligne " + i); nVerifs += R0.length - 1;
  ok(tb.tail.ranges[0][0] === R0[R0.length - 1][1], "la derniere ligne de " + st + " " + tb.period + " ne rejoint pas « Use percentage method »"); nVerifs++;
  for (const [lo, hi, v] of R0) {
    nLignes++;
    for (let k = 0; k <= 10; k++) {
      const imprime = v[k] === null ? 0 : v[k];
      const calcule = ancien(hi * N, st, k) / N;
      nCellules++;
      if (v[k] === null) nVides++;
      const e = Math.abs(calcule - imprime);
      maxEcartGrille = Math.max(maxEcartGrille, e);
      if (e <= 0.5001) { nExactes++; if (e > 0.25) nBord++; } else ok(false, "cellule " + st + " " + tb.period + " [" + lo + ", " + hi + "[ " + k + " allocations : imprime " + imprime + ", calcule " + calcule.toFixed(3));
    }
    /* Ecart grille - methode en pourcentage, pour les statuts du site, au milieu de la tranche. */
    const mid = (lo + hi) / 2;
    if (hi * N < 102250) { // sous la pente : la deduction standard du livret est pleine
      for (const [cle, k] of [[st + "/1", 1], [st + "/2", 2]]) {
        const lieu = ecartsStatut[cle]; if (!lieu) continue;
        const imprime = v[k] === null ? 0 : v[k];
        lieu.push(imprime - pm(mid, N, st, k));
      }
    }
  }
}
nVerifs += nCellules;
/* « single/2 » = le chef de famille (bareme celibataire, 2 allocations) ; « single/1 » le celibataire ; « married/2 » le couple. */
const stat = a => { const m = Math.max(...a), mi = Math.min(...a); return { max: m, min: mi, moy: a.reduce((s, x) => s + x, 0) / a.length, n: a.length }; };
const S1 = stat(ecartsStatut["single/1"]), M2 = stat(ecartsStatut["married/2"]), H2 = stat(ecartsStatut["single/2"]);

/* Le cas pivot : 75 000 $ par an = 1 442,31 $ par semaine. */
const ligneSemaine = T.tables[0].rows.find(([lo, hi]) => lo <= 75000 / 52 && 75000 / 52 < hi);
const grille75 = ligneSemaine ? ligneSemaine[2][1] : null;
const moteur75Semaine = calcul("maine", 75000, "single").etat / 52;
ok(grille75 !== null, "la tranche hebdomadaire de 1 442,31 $ n'est pas dans la grille"); nVerifs++;

/* --- 4. Le bas des grilles ------------------------------------------------------------------------------------------------------------- */
let nBas = 0;
for (const tb of T.tables) {
  const st = tb.status, N = tb.N, [r1, r2] = tb.tail.ranges;
  const Y = r1[1], Z = r2[1];
  ok(r2[0] === Y, "bas de grille : les deux plages ne se touchent pas " + st + " " + tb.period); nBas++;
  /* A Y, la deduction standard est nulle : annuel >= 177 250 $ (celibataire) / 354 550 $ (marie). */
  ok(Y * N >= SEUILS[st].nul, "bas de grille " + st + " " + tb.period + " : " + Y + " x " + N + " est sous la borne a laquelle la deduction standard s'annule"); nBas++;
  for (let k = 0; k <= 10; k++) {
    const calc = pmAnnuel(Y * N, st, k) / N;
    ok(Math.abs(calc - tb.tail.constants[k]) <= 0.5001, "bas de grille " + st + " " + tb.period + " : montant « plus » a " + k + " allocations : imprime " + tb.tail.constants[k] + ", calcule " + calc.toFixed(3)); nBas++;
  }
  /* Au-dela de Z : surcharge ; « plus C » est la retenue au point Z, sans allocation (allocations « fully phased out » selon la note du livret). */
  const surchargeAn = SEUILS[st].b[2];
  ok(Z * N >= surchargeAn && Z * N < surchargeAn * 1.001, "bas de grille " + st + " " + tb.period + " : Z x N proche du seuil du surcharge"); nBas++;
  const calcC = pmAnnuel(Z * N, st, 0) / N;
  ok(Math.abs(calcC - tb.tail.overConstant) <= 0.5001, "bas de grille " + st + " " + tb.period + " : montant au-dela de " + Z + " : imprime " + tb.tail.overConstant + ", calcule " + calcC.toFixed(3)); nBas++;
}
nVerifs += nBas;

/* --- 5. Donnees du moteur : ce que dit le livret --------------------------------------------------------------------------------------- */
const A = R.states.maine.incomeTax;
ok(A.personalExemption.single === ALLOC && A.personalExemption.marriedJoint === 2 * ALLOC && A.personalExemption.headOfHousehold === 2 * ALLOC, "allocations != 5 300 / 10 600 / 10 600"); nVerifs++;
ok(A.slidingDeduction.single[0].amount === 12850 && A.slidingDeduction.marriedJoint[0].amount === 28550, "deductions standard != 12 850 / 28 550"); nVerifs++;
ok(R.states.maine.employeePrograms.length === 1 && R.states.maine.employeePrograms[0].rate === 0.005 && R.states.maine.employeePrograms[0].wageCap === R.fica.socialSecurity.wageBase, "PFML != 0,5 % jusqu'au plafond Social Security"); nVerifs++;

if (echecs) { console.log("\n" + echecs + " ECHEC(S)"); process.exit(1); }
const f = (x, d = 2) => x.toFixed(d);
console.log(nVerifs + " verifications : exemples imprimes (0 $, 32 $, 256 $), moteur == methode en pourcentage sur " + nMoteur + " cas, " +
  nLignes + " lignes de grille, " + nCellules + " cellules des grilles imprimees : " + nExactes + " reproduites (" + nVides + " vides = 0 $, " + nBord + " a un bord d'arrondi), " +
  "ecart maximal " + f(maxEcartGrille) + " $ : OK");
console.log("ecart grilles imprimees - methode en pourcentage (milieu de tranche, sous 102 250 $ par an) : celibataire 1 allocation max " + f(S1.max) + " moy " + f(S1.moy) + " (n=" + S1.n + ") ; " +
  "marie 2 allocations max " + f(M2.max) + " moy " + f(M2.moy) + " (n=" + M2.n + ") ; chef de famille 2 allocations max " + f(H2.max) + " moy " + f(H2.moy) + " (n=" + H2.n + ")");
console.log("cas pivot : 75 000 $ celibataire = " + f(75000 / 52) + " $ par semaine : tranche [" + ligneSemaine[0] + ", " + ligneSemaine[1] + "[ , 1 allocation, grille " + f(grille75) + " $, methode en pourcentage " + f(moteur75Semaine) + " $");
