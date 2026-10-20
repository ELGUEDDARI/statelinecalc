/* Recoupe la retenue du Kansas (moteur) avec ce que le Department of Revenue IMPRIME.
 *
 * Source : « Withholding Tax Guide », KW-100 (Rev. 10-24), copie Wayback du 2026-10-09 de
 * https://www.ksrevenue.gov/pdf/kw100.pdf (ksrevenue.gov ne repond pas depuis cette machine), lue le 2026-10-20 :
 *   - pages 19-20, « TABLES FOR PERCENTAGE METHOD OF KANSAS WITHHOLDING » : huit tables (hebdomadaire, toutes les deux semaines,
 *     deux fois par mois, mensuel, trimestriel, semestriel, annuel, quotidien), un bareme celibataire et un bareme marie,
 *     transcrits ICI tels qu'imprimes ;
 *   - pages 21-40, tables « par tranches de salaire » : 10 grilles (5 periodes x celibataire/marie) de 104 lignes x 11 colonnes
 *     (0 a 10 allocations), extraites par ks-tables-extract.py dans .tooling/sources/kansas-kw100-tranches.json (11 440 cellules) ;
 *   - page 6, l'exemple imprime : 2 000 $ par quinzaine, marie, 3 allocations -> 41,44 $ -> 41 $.
 * Ce que le script prouve :
 *   1. chaque seuil et chaque montant de base imprime des huit tables = (valeur annuelle) / N, arrondi comme l'agence ;
 *   2. la table annuelle du moteur = TABLE 7 (0 % / 5,2 % / 5,58 %, seuils 3 605 / 26 605 et 8 240 / 54 240) ;
 *   3. l'allocation est 9 160 $ la premiere (18 320 $ pour deux, case « Joint »), 2 320 $ chacune des suivantes : la grille
 *      imprimee est reproduite par ce calcul, cellule par cellule, au milieu de chaque tranche de salaire, a l'arrondi au dollar pres ;
 *   4. le moteur (annuel, non arrondi) reste a moins de 1 $ par paie de chaque cellule imprimee.
 * Les cellules qui s'ecartent : voir les compteurs en sortie. Les lignes dont le bas de tranche est sous le seuil de la tranche
 * a 0 % impriment 0 $ ; c'est le cas de tous les ecarts de plus d'un dollar.
 * Lancer : node .tooling/test/verif-retenue-ks.js
 */
const R = require("../../data/rates-2026.js");
const { calcul, progressiveTax } = require("../lib/paie.js");
const T = require("../sources/kansas-kw100-tranches.json");
const A = R.states.kansas.incomeTax;
let echecs = 0;
const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };

/* Annuel, TABLE 7. */
const ANNUEL = { SINGLE: { z: 3605, t: 26605, base: 1196 }, MARRIED: { z: 8240, t: 54240, base: 2392 } };
/* Tables par periode, telles qu'imprimees (pages 19-20) : [seuil du 5,2 %, seuil du 5,58 %, montant de base]. */
const PERIODES = {
  WEEKLY:           { N: 52,  SINGLE: [69, 512, 23.00],    MARRIED: [158, 1043, 46.00] },
  "BI-WEEKLY":      { N: 26,  SINGLE: [139, 1023, 46.00],  MARRIED: [317, 2086, 92.00] },
  "SEMI-MONTHLY":   { N: 24,  SINGLE: [150, 1109, 49.83],  MARRIED: [343, 2260, 99.67] },
  MONTHLY:          { N: 12,  SINGLE: [300, 2217, 99.67],  MARRIED: [687, 4520, 199.33] },
  QUARTERLY:        { N: 4,   SINGLE: [901, 6651, 299.00], MARRIED: [2060, 13560, 598.00] },
  "SEMI-ANNUAL":    { N: 2,   SINGLE: [1803, 13303, 598.00], MARRIED: [4120, 27120, 1196.00] },
  "DAILY or MISC.": { N: 260, SINGLE: [14, 102, 4.60],     MARRIED: [32, 209, 9.20] }
};
const arrondi = x => Math.floor(x + 0.5 + 1e-9);   // 50 a 99 cents -> dollar superieur

/* 1. Les seuils imprimes sont les seuils annuels divises par le nombre de paies, arrondis. */
let n = 0;
for (const [per, P] of Object.entries(PERIODES)) {
  for (const st of ["SINGLE", "MARRIED"]) {
    const a = ANNUEL[st], [z, t, base] = P[st];
    ok(arrondi(a.z / P.N) === z, per + " " + st + " seuil 0 % : imprime " + z + ", annuel/N " + (a.z / P.N));
    ok(arrondi(a.t / P.N) === t, per + " " + st + " seuil 5,58 % : imprime " + t + ", annuel/N " + (a.t / P.N));
    ok(Math.abs(Math.round(a.base / P.N * 100) / 100 - base) < 1e-9, per + " " + st + " base : imprime " + base + ", annuel/N " + (a.base / P.N));
    n += 3;
  }
}
ok(Math.abs((26605 - 3605) * 0.052 - 1196) < 1e-9 && Math.abs((54240 - 8240) * 0.052 - 2392) < 1e-9, "montants de base annuels = 5,2 % de la tranche");

/* 2. La table annuelle du moteur. */
const bs = A.brackets.single, bm = A.brackets.marriedJoint, bh = A.brackets.headOfHousehold;
ok(JSON.stringify(bs) === JSON.stringify([[3605, 0], [26605, 0.052], [Infinity, 0.0558]]), "bareme celibataire != TABLE 7 (a)");
ok(JSON.stringify(bm) === JSON.stringify([[8240, 0], [54240, 0.052], [Infinity, 0.0558]]), "bareme marie != TABLE 7 (b)");
ok(JSON.stringify(bh) === JSON.stringify(bs), "le chef de famille doit suivre le bareme celibataire (« SINGLE person (including Head of Household) »)");
ok(A.standardDeduction.single === 9160 && A.standardDeduction.marriedJoint === 18320 && A.standardDeduction.headOfHousehold === 9160 + 2320, "allocations != 9 160 / 18 320 / 11 480");
n += 5;

/* 3 et 4. La grille imprimee. */
const allocation = (st, k) => k === 0 ? 0 : st === "SINGLE" ? 9160 + (k - 1) * 2320 : (k === 1 ? 9160 : 18320 + (k - 2) * 2320);
const tableP = (x, st, per) => {
  const [z, t, base] = PERIODES[per][st];
  return x <= z ? 0 : x <= t ? (x - z) * 0.052 : base + (x - t) * 0.0558;
};
const exact = { cellules: 0, egal: 0, bordArrondi: 0, bandeSousZero: 0 };
let pireMoteur = 0;
for (const [cle, lignes] of Object.entries(T)) {
  const [st, per] = cle.split("|"), P = PERIODES[per];
  ok(lignes.length === 104, cle + " : " + lignes.length + " lignes au lieu de 104");
  const brut = st === "SINGLE" ? "single" : "marriedJoint";
  for (const l of lignes) {
    const [bas, haut] = l, mid = (bas + haut) / 2;
    for (let k = 0; k <= 10; k++) {
      const imprime = l[2 + k];
      const alloc = allocation(st, k) / P.N;
      const x = mid - alloc, xBas = bas - alloc;
      const calc = tableP(x, st, per);
      exact.cellules++;
      if (arrondi(calc) === imprime) exact.egal++;
      else if (imprime === 0 && xBas <= P[st][0]) exact.bandeSousZero++;
      else if (Math.abs(calc - imprime) <= 0.57) exact.bordArrondi++;
      else ok(false, cle + " " + bas + "-" + haut + " allocations " + k + " : imprime " + imprime + ", calcul " + calc.toFixed(3));
      /* le moteur : annualise, applique la TABLE 7 apres l'allocation annuelle, divise par N */
      const annuelImposable = Math.max(0, mid * P.N - allocation(st, k));
      const moteur = progressiveTax(annuelImposable, brut === "single" ? bs : bm) / P.N;
      const ecart = Math.abs(moteur - imprime);
      const tolere = imprime === 0 && xBas <= P[st][0] ? 1.8 : 1.0;
      if (ecart > pireMoteur && ecart <= tolere) pireMoteur = ecart;
      ok(ecart <= tolere, "moteur " + cle + " " + bas + "-" + haut + " allocations " + k + " : imprime " + imprime + ", moteur " + moteur.toFixed(3));
    }
  }
}

/* 5. L'exemple imprime (p. 6) : 2 000 $ par quinzaine, marie, 3 allocations (18 320 $ + 2 320 $ pour un enfant). */
{
  const alloc = (18320 + 2320) / 24;                 // 860
  const net = 2000 - alloc;                          // 1 140
  const impot = tableP(net, "MARRIED", "SEMI-MONTHLY");
  ok(Math.abs(alloc - 860) < 1e-9 && Math.abs(net - 1140) < 1e-9, "exemple imprime : allocation 860, net 1 140");
  ok(Math.abs(impot - 41.44) < 0.005, "exemple imprime : 41,44 $, calcul " + impot);
  ok(arrondi(impot) === 41, "exemple imprime : 41 $ apres arrondi");
  /* le moteur, a 2 allocations (marie sans enfant) : 2 000 x 24 = 48 000 - 18 320 = 29 680 ; (29 680 - 8 240) x 5,2 % / 24 = 46,45 $ ;
     la grille imprimee donne 46 $ (tranche 1 970-2 010, colonne 2). */
  const e = calcul("kansas", 48000, "marriedJoint").etat / 24;
  ok(Math.abs(e - 46.4533) < 0.001, "moteur marie 48 000 $ : 46,45 $ par quinzaine, obtenu " + e);
  const ligne = T["MARRIED|SEMI-MONTHLY"].find(l => l[0] <= 2000 && 2000 < l[1]);
  ok(ligne[0] === 1970 && ligne[1] === 2010 && ligne[2] === 86 && ligne[3] === 66 && ligne[4] === 46 && ligne[5] === 41, "ligne imprimee 1 970-2 010 : 86 66 46 41");
  n += 6;
}

/* 6. Arrondi au dollar par paie : ecart au plus 0,50 $ par paie. */
let pire = 0, m = 0;
for (const brut of [18000, 25000, 30000, 40000, 52000, 62400, 75000, 100000, 250000])
  for (const N of [52, 26, 24, 12]) {
    const paie = calcul("kansas", brut).etat / N;
    pire = Math.max(pire, Math.abs(arrondi(paie) - paie)); m++;
  }
ok(pire <= 0.5 + 1e-9, "ecart d'arrondi par paie " + pire);

console.log(n + " seuils et montants imprimes recoupes ; " + exact.cellules + " cellules de la grille par tranches de salaire : " +
  exact.egal + " reproduites exactement, " + exact.bordArrondi + " a un bord d'arrondi (ecart <= 0,57 $), " + exact.bandeSousZero +
  " tranches a cheval sur la tranche a 0 % (imprimees 0 $) ; ecart maximal du moteur " + pireMoteur.toFixed(3) + " $ ; " + m +
  " arrondis par paie (ecart maximal " + pire.toFixed(3) + " $) : " + (echecs ? echecs + " ECHEC(S)" : "OK"));
process.exit(echecs ? 1 : 0);
