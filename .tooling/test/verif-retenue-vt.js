/* Recoupe la retenue du Vermont (moteur) avec ce que le Vermont Department of Taxes IMPRIME.
 *
 * Source : « 2026 Income Tax Withholding Instructions, Tables, and Charts », GB-1210-2026 (« EFFECTIVE JANUARY 1, 2026 - EXPIRES DECEMBER
 * 31, 2026 »), https://tax.vermont.gov/sites/tax/files/documents/GB-1210-2026.pdf, HTTP 200, lu le 2026-10-20 (texte :
 * .tooling/sources/vermont-gb1210-2026.txt) :
 *   - pages 5-6, « Vermont Percentage Method Withholding Tables » : sept tables (hebdomadaire, toutes les deux semaines, deux fois par
 *     mois, mensuel, trimestriel, annuel, quotidien), un bareme celibataire, un bareme marie, une valeur d'allocation par periode,
 *     transcrits ICI tels qu'imprimes ;
 *   - pages 7-16, « Wage Bracket Withholding Charts » : grilles par tranche de salaire x 0 a 10 allocations, extraites par
 *     vt-tables-extract.js (lignes completes seulement) dans .tooling/sources/vermont-gb1210-charts.json ;
 *   - page 6, l'exemple imprime : 1 800 $ par semaine, marie, 2 allocations -> 45,77 $.
 * Ce que le script prouve :
 *   1. chaque base imprimee = base de la tranche precedente + (ecart des seuils) x taux, a deux centimes pres (coherence interne) ;
 *   2. les seuils et allocations imprimes par periode = valeur annuelle / N, a un dollar pres ;
 *   3. la table annuelle du moteur = la table annuelle imprimee, allocation 5 400 $ ;
 *   4. les cellules des grilles par tranches de salaire sont reproduites par la table imprimee de la periode, au milieu de la tranche ;
 *   5. le moteur (annuel) reste a moins de quelques cents par paie de chaque cellule imprimee.
 * Lancer : node .tooling/test/verif-retenue-vt.js
 */
const R = require("../../data/rates-2026.js");
const { calcul, progressiveTax } = require("../lib/paie.js");
const T = require("../sources/vermont-gb1210-charts.json");
const A = R.states.vermont.incomeTax;
let echecs = 0;
const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };
const TAUX = [0.0335, 0.066, 0.076, 0.0875];

/* Tables imprimees : seuils [b1,b2,b3,b4], bases [0, B2, B3, B4], allocation, nombre de periodes. */
const P = {
  WEEKLY:      { N: 52,  alloc: 103.85,  SINGLE: { b: [75, 1051, 2438, 5004],          base: [0, 32.70, 124.24, 319.25] },      MARRIED: { b: [226, 1855, 4164, 6227],         base: [0, 54.57, 206.96, 363.75] } },
  BIWEEKLY:    { N: 26,  alloc: 207.69,  SINGLE: { b: [151, 2103, 4876, 10009],        base: [0, 65.39, 248.41, 638.52] },      MARRIED: { b: [453, 3711, 8328, 12455],        base: [0, 109.14, 413.87, 727.52] } },
  SEMIMONTHLY: { N: 24,  alloc: 225.00,  SINGLE: { b: [164, 2278, 5282, 10843],        base: [0, 70.82, 269.08, 691.72] },      MARRIED: { b: [491, 4020, 9022, 13493],        base: [0, 118.22, 448.35, 788.15] } },
  MONTHLY:     { N: 12,  alloc: 450.00,  SINGLE: { b: [327, 4556, 10565, 21685],       base: [0, 141.67, 538.27, 1383.39] },    MARRIED: { b: [981, 8040, 18044, 26985],       base: [0, 236.48, 896.74, 1576.26] } },
  QUARTERLY:   { N: 4,   alloc: 1350.00, SINGLE: { b: [981, 13669, 31694, 65056],      base: [0, 425.05, 1614.70, 4150.21] },   MARRIED: { b: [2944, 24119, 54131, 80956],     base: [0, 709.36, 2690.15, 4728.85] } },
  ANNUAL:      { N: 1,   alloc: 5400.00, SINGLE: { b: [3925, 54675, 126775, 260225],   base: [0, 1700.13, 6458.73, 16600.93] }, MARRIED: { b: [11775, 96475, 216525, 323825], base: [0, 2837.45, 10760.75, 18915.55] } },
  DAILY:       { N: 260, alloc: 20.77,   SINGLE: { b: [15.10, 210.30, 487.60, 1000.90], base: [0, 6.54, 24.84, 63.85] },        MARRIED: { b: [45.30, 371.10, 832.80, 1245.50], base: [0, 10.91, 41.39, 72.75] } }
};
const tab = (x, t) => { let i = -1; for (let k = 0; k < 4; k++) if (x > t.b[k]) i = k; return i < 0 ? 0 : t.base[i] + (x - t.b[i]) * TAUX[i]; };

/* 1 et 2. coherence interne et seuils = annuel / N. */
const AN = P.ANNUAL; let n = 0;
for (const [per, p] of Object.entries(P)) for (const st of ["SINGLE", "MARRIED"]) {
  const t = p[st];
  for (let k = 1; k < 4; k++) {
    const calc = t.base[k - 1] + (t.b[k] - t.b[k - 1]) * TAUX[k - 1];
    ok(Math.abs(calc - t.base[k]) <= 0.02, per + " " + st + " base " + k + " : imprime " + t.base[k] + ", calcul " + calc.toFixed(4)); n++;
  }
  if (per !== "ANNUAL") for (let k = 0; k < 4; k++) {
    const attendu = AN[st].b[k] / p.N;
    ok(Math.abs(attendu - t.b[k]) <= 1.0, per + " " + st + " seuil " + k + " : imprime " + t.b[k] + ", annuel/N " + attendu.toFixed(2)); n++;
  }
}
for (const [per, p] of Object.entries(P)) {
  ok(Math.abs(AN.alloc / p.N - p.alloc) <= 0.01, per + " allocation : imprimee " + p.alloc + ", annuelle/N " + (AN.alloc / p.N)); n++;
}
/* 3. table annuelle du moteur. */
ok(JSON.stringify(A.brackets.single) === JSON.stringify([[3925, 0], [54675, 0.0335], [126775, 0.066], [260225, 0.076], [Infinity, 0.0875]]), "bareme celibataire != table annuelle imprimee");
ok(JSON.stringify(A.brackets.marriedJoint) === JSON.stringify([[11775, 0], [96475, 0.0335], [216525, 0.066], [323825, 0.076], [Infinity, 0.0875]]), "bareme marie != table annuelle imprimee");
ok(JSON.stringify(A.brackets.headOfHousehold) === JSON.stringify(A.brackets.single), "le chef de famille doit suivre le bareme celibataire (case Single du W-4VT)");
ok(A.standardDeduction.single === 5400 && A.standardDeduction.marriedJoint === 10800 && A.standardDeduction.headOfHousehold === 10800, "allocations != 5 400 / 10 800 / 10 800");
ok(Math.abs(progressiveTax(54675, A.brackets.single) - 1700.125) < 1e-9, "moteur : base annuelle 1 700,125");
n += 5;

/* 4 et 5. Les grilles imprimees. */
const c = { cellules: 0, egal: 0, bord: 0, sousZero: 0 }; let pireMoteur = 0;
for (const [cle, lignes] of Object.entries(T)) {
  const [st, per] = cle.split("|"), p = P[per], t = p[st];
  const entier = per !== "DAILY";
  for (const l of lignes) {
    const [bas, haut] = l, mid = (bas + haut) / 2;
    for (let k = 0; k <= 10; k++) {
      const imprime = l[2 + k];
      const x = mid - k * p.alloc, xBas = bas - k * p.alloc;
      const calc = tab(x, t);
      c.cellules++;
      if (entier ? Math.floor(calc + 0.5 + 1e-9) === imprime : Math.abs(calc - imprime) <= 0.0101) c.egal++;
      else if (imprime === 0 && xBas <= t.b[0]) c.sousZero++;
      else if (Math.abs(calc - imprime) <= (entier ? 0.56 : 0.0201)) c.bord++;
      else ok(false, cle + " " + bas + "-" + haut + " allocations " + k + " : imprime " + imprime + ", calcul " + calc.toFixed(3));
      const brk = st === "SINGLE" ? A.brackets.single : A.brackets.marriedJoint;
      const moteur = progressiveTax(Math.max(0, mid * p.N - 5400 * k), brk) / p.N;
      const ecart = Math.abs(moteur - imprime);
      const lim = (imprime === 0 && xBas <= t.b[0]) ? 1.2 : (entier ? 1.0 : 0.3);
      if (ecart > pireMoteur && ecart <= lim) pireMoteur = ecart;
      ok(ecart <= lim, "moteur " + cle + " " + bas + "-" + haut + " allocations " + k + " : imprime " + imprime + ", moteur " + moteur.toFixed(3));
    }
  }
}

/* 6. Exemple imprime (p. 6) : 1 800 $ par semaine, marie, 2 allocations. */
{
  const net = 1800 - 2 * 103.85;
  const impot = tab(net, P.WEEKLY.MARRIED);
  ok(Math.abs(net - 1592.30) < 1e-9, "exemple : 1 592,30 $");
  ok(Math.abs(impot - 45.77) < 0.005, "exemple : 45,77 $, calcul " + impot);
  /* le moteur : 1 800 x 52 = 93 600 ; 2 allocations = 10 800 ; 82 800 - 11 775 = 71 025 x 3,35 % = 2 379,3375 ; / 52 = 45,7565 */
  const e = calcul("vermont", 93600, "marriedJoint").etat / 52;
  ok(Math.abs(e - 45.7565) < 0.001, "moteur marie 93 600 $ : 45,76 $ par semaine, obtenu " + e);
  n += 3;
}
console.log(n + " seuils et montants imprimes recoupes ; " + c.cellules + " cellules des grilles par tranches : " + c.egal +
  " reproduites exactement, " + c.bord + " a un bord d'arrondi, " + c.sousZero + " tranches a cheval sur la tranche a 0 % ; ecart maximal du moteur " +
  pireMoteur.toFixed(3) + " $ par paie : " + (echecs ? echecs + " ECHEC(S)" : "OK"));
process.exit(echecs ? 1 : 0);
