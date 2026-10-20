/* Recoupe la retenue du Connecticut (moteur) avec ce que le DRS IMPRIME.
 * Sources lues le 2026-10-20 : TPG-211 (Rev. 12/25) -> sources/connecticut-tpg211-tables.json (Tables A, C, D, E, codes A B C D F) ;
 * « 2026 Withholding Tables » (8 pages, hebdo / 2 semaines / 2 fois par mois / mensuel), sans couche de texte, lues par OCR Windows
 * -> sources/connecticut-printed-tables.json (lignes : bas, haut, montants des codes A B C D F).
 * 1. un calcul INDEPENDANT du moteur (la formule TPG-211 ecrite ici, avec le bareme de la Table B) reproduit chaque montant imprime,
 *    au milieu de la ligne de salaire, a 0,005 $ pres (codes A, B, C, D, F) ;
 * 2. le moteur (single = F, marriedJoint = C, headOfHousehold = B) donne le meme montant que ce calcul independant.
 * Lignes ecartees : bornes mal lues par l'OCR (non contigues) ; leur nombre est affiche.
 * Lancer : node .tooling/test/verif-retenue-ct.js
 */
const T = require("../sources/connecticut-tpg211-tables.json");
const O = require("../sources/connecticut-printed-tables.json");
const { calcul } = require("../lib/paie.js");
const look = (rows, s) => { if (s <= rows[0][0]) return rows[0][2]; for (const r of rows) if (s > r[0] && (r[1] === null || s <= r[1])) return r[2]; };
const B = {
  ADF: [[10000, .02], [50000, .045], [100000, .055], [200000, .06], [250000, .065], [500000, .069], [Infinity, .0699]],
  B: [[16000, .02], [80000, .045], [160000, .055], [320000, .06], [400000, .065], [800000, .069], [Infinity, .0699]],
  C: [[20000, .02], [100000, .045], [200000, .055], [400000, .06], [500000, .065], [1000000, .069], [Infinity, .0699]]
};
const prog = (x, b) => { let t = 0, lo = 0; for (const [u, r] of b) { if (x <= lo) break; t += (Math.min(x, u) - lo) * r; lo = u; } return t; };
function tpg(s, code) {
  const ex = code === "D" ? 0 : look(T.A[code], s);
  const ti = s - ex; if (ti <= 0) return 0;
  const b = code === "B" ? B.B : code === "C" ? B.C : B.ADF;
  const addBack = look(T.C[code === "D" ? "A" : code], s);
  const rec = look(T.D[code === "B" ? "B" : code === "C" ? "C" : "A"], s);
  const cr = code === "D" ? 0 : look(T.E[code], s);
  return (prog(ti, b) + addBack + rec) * (1 - cr);
}
let echecs = 0; const ok = (c, m) => { if (!c) { echecs++; console.log("ECHEC : " + m); } };
const N = { 0: 52, 1: 52, 2: 26, 3: 26, 4: 24, 5: 24, 6: 12, 7: 12 }, codes = ["A", "B", "C", "D", "F"];
const statut = { F: "single", C: "marriedJoint", B: "headOfHousehold" };
let lignes = 0, ecartees = 0, valeurs = 0, moteur = 0;
for (const p in O) {
  let prev = null;
  for (const r of O[p]) {
    const bon = r[1] > r[0] && (prev === null || r[0] === prev) && (r[1] - r[0]) < 200;
    if (!bon) { ecartees++; prev = null; continue; }
    prev = r[1]; lignes++;
    const annuel = (r[0] + r[1]) / 2 * N[p];
    codes.forEach((c, i) => {
      valeurs++;
      ok(Math.abs(tpg(annuel, c) / N[p] - r[2 + i]) <= 0.0051, "page " + p + " ligne " + r[0] + "-" + r[1] + " code " + c + " : imprime " + r[2 + i] + ", calcul " + (tpg(annuel, c) / N[p]).toFixed(3));
      if (statut[c]) { moteur++; ok(Math.abs(calcul("connecticut", annuel, statut[c]).etat / N[p] - r[2 + i]) <= 0.0051, "moteur page " + p + " ligne " + r[0] + "-" + r[1] + " " + statut[c]); }
    });
  }
}
/* Structure des tables : contigues, sans trou. */
for (const t of Object.values(T)) for (const rows of Object.values(t)) rows.forEach((r, i) => { if (i) ok(rows[i - 1][1] === r[0], "table non contigue en " + r[0]); });
console.log(lignes + " lignes imprimees propres, " + ecartees + " ecartees (OCR) ; " + valeurs + " montants imprimes reproduits par la formule independante (codes A B C D F) ; " + moteur + " montants du moteur (F, C, B) : " + (echecs ? echecs + " ECHEC(S)" : "OK"));
process.exit(echecs ? 1 : 0);
