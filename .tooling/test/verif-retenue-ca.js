/* Recoupe la retenue de la Californie (moteur) avec ce que l'Employment Development Department IMPRIME.
 *
 * Source : DE 44 « California Employer's Guide » 2026 (DE 44 Rev. 52 (4-26), Last-Modified 17/04/2026),
 * https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de44.pdf, lu le 2026-10-21 (texte : .tooling/sources/california-de44-2026.txt) :
 *   - pages 51 a 56, « Method B - Exact Calculation Method » : Tables 1 a 4 (exoneration, deduction estimee, deduction standard, credit par allocation)
 *     et Tables 5 a 7 (bareme ANNUEL : celibataire, marie, chef de famille). Relues ICI dans le TEXTE du PDF, independamment de data/rates-2026.js ;
 *   - six exemples imprimes (pages 51 a 53) ;
 *   - pages 30 a 50, « Method A - Wage Bracket Table Method » : 15 grilles (celibataire, marie, chef de famille x hebdomadaire, bimensuelle,
 *     semi-mensuelle, mensuelle, journaliere) par tranche de salaire x 0 a 10 allocations, extraites avec les coordonnees des mots (PyMuPDF,
 *     .tooling/test/ca-tables-extract.py) dans .tooling/sources/california-wage-bracket-tables.json (une cellule vide = 0 $).
 * Ce que le script prouve :
 *   1. le bareme, la deduction standard et le credit du moteur == les Tables 3, 4, 5, 6 et 7 relues dans le texte du PDF, ligne a ligne ;
 *   2. les exemples imprimes sont reproduits par la methode B ecrite ici d'apres le texte (a la periode pres : les tables par periode sont
 *      arrondies par l'agence) ;
 *   3. le moteur == la methode B ecrite ici, aux trois statuts du site (1 / 2 / 2 allocations), sur un balayage de salaires ;
 *   4. l'exoneration des bas revenus (Table 1) : la formule donne 0 (a un centime) au seuil et en dessous ;
 *   5. les grilles de la Methode A, cellule par cellule, contre la methode B au milieu de la tranche : on compte les cellules au dixieme de
 *      dollar, l'ecart maximal, et on isole la TROUVAILLE : les grilles MARIE BIMENSUELLE (Table 7) et MARIE JOURNALIERE (Table 16) ne sont
 *      reproduites qu'avec la deduction de 5 706 $ pour TOUTES les allocations (le livret imprime 11 412 $ a partir de 2 allocations, Table 3).
 * Lancer : node .tooling/test/verif-retenue-ca.js
 */
const fs = require("fs");
const path = require("path");
const R = require("../../data/rates-2026.js");
const { calcul } = require("../lib/paie.js");
const GRILLES = require("../sources/california-wage-bracket-tables.json");
const TXT = fs.readFileSync(path.join(__dirname, "..", "sources", "california-de44-2026.txt"), "utf8").split(/\r?\n/);
let echecs = 0, nVerifs = 0;
const ok = (c, m) => { nVerifs++; if (!c) { echecs++; console.log("ECHEC : " + m); } };
const nombre = s => Number(String(s).replace(/[$,%]/g, "").replace(/,/g, ""));

/* --- 1. Les Tables 3, 4, 5, 6 et 7 annuelles, relues dans le texte du PDF ---------------------------------------------------------------- */
const iT5 = TXT.findIndex(l => /Method B - Table 5: Single Persons,/.test(l) && /Method B - Table 8/.test(l));
ok(iT5 > 0, "Table 5 introuvable dans le texte");
/* Les trois tables annuelles sont a gauche, sur la meme page ; la colonne de droite (journaliere) partage les lignes : on ne lit que les 5 premiers champs. */
const LIGNE = /^\s*\$?([\d,]+)\s+\$?([\d,]+)\s+([\d.]+)%\s+\$?([\d,]+)\s+\$?([\d,]+\.\d\d)/;
const HAUT = /N\/A\s+([\d.]+)%\s+\$?([\d,]+)\s+\$?([\d,]+\.\d\d)/;
const tables = [[], [], []];
let courante = -1, dernierDebut = null;
for (let i = iT5; i < iT5 + 70; i++) {
  const l = TXT[i];
  if (/^Method B - Table 5:/.test(l.trim())) courante = 0;
  else if (/^Method B - Table 6: Married Persons/.test(l.trim())) courante = 1;
  else if (/^Method B - Table 7: Unmarried\/Head/.test(l.trim())) courante = 2;
  if (/Quarterly Payroll Period/.test(l)) break;
  if (courante < 0) continue;
  const m = LIGNE.exec(l);
  if (m) tables[courante].push({ from: nombre(m[1]) === 0 && tables[courante].length === 0 ? 0 : null, over: nombre(m[1]), upTo: nombre(m[2]), rate: Math.round(Number(m[3]) * 100) / 10000, amountOver: nombre(m[4]), plus: nombre(m[5]) });
  else if (/^\s+\$0\s+\$/.test(l)) {
    const m0 = /^\s*\$0\s+\$?([\d,]+)\s+([\d.]+)%\s+\$0\s+\$0\.00/.exec(l);
    if (m0) tables[courante].push({ over: 0, upTo: nombre(m0[1]), rate: Math.round(Number(m0[2]) * 100) / 10000, amountOver: 0, plus: 0 });
  }
  const mh = HAUT.exec(l);
  if (mh) tables[courante].push({ over: nombre(mh[2]), upTo: null, rate: Math.round(Number(mh[1]) * 100) / 10000, amountOver: nombre(mh[2]), plus: nombre(mh[3]) });
}
ok(tables.every(t => t.length === 10), "chaque table annuelle doit avoir 10 lignes, lu : " + tables.map(t => t.length).join(", "));
const NOMS = ["single", "marriedJoint", "headOfHousehold"];
tables.forEach((t, k) => {
  const d = R.states.california.incomeTax.bracketTable[NOMS[k]];
  ok(d.length === 10, NOMS[k] + " : 10 lignes dans rates-2026.js");
  t.forEach((ligne, i) => {
    const e = d[i];
    ok(e && e.from === ligne.amountOver && Math.abs(e.base - ligne.plus) < 1e-9 && e.rate === ligne.rate && (e.upTo === ligne.upTo), NOMS[k] + " ligne " + (i + 1) + " : livret " + JSON.stringify(ligne) + " != moteur " + JSON.stringify(e));
  });
});
/* Table 3 et Table 4 annuelles, relues dans le texte. */
const lit = (motif) => { const l = TXT.find(x => motif.test(x)); return l; };
const ligneAnnual3 = lit(/^Annual\s+\$5,706\s+\$5,706\s+\$11,412\s+\$11,412/);
ok(!!ligneAnnual3, "Table 3, ligne annuelle : 5 706 / 5 706 / 11 412 / 11 412");
ok(R.states.california.incomeTax.standardDeduction.single === 5706 && R.states.california.incomeTax.standardDeduction.marriedJoint === 11412 && R.states.california.incomeTax.standardDeduction.headOfHousehold === 11412, "deduction standard du moteur == Table 3");
const credit1 = TXT.find(x => /^1\s+\$3\.24\s+\$6\.47\s+\$7\.01\s+\$14\.03\s+\$42\.08\s+\$84\.15\s+\$168\.30\s+\$0\.65/.test(x));
ok(!!credit1, "Table 4 : une allocation = 168,30 $ par an");
ok(R.states.california.incomeTax.withholdingAllowances.credit === 168.3, "credit du moteur == 168,30 $");
const ligneAnnual1 = TXT.find(x => /^Annual\s+\$18,896\s+\$18,896\s+\$37,791\s+\$37,791/.test(x));
ok(!!ligneAnnual1, "Table 1, ligne annuelle : 18 896 / 18 896 / 37 791 / 37 791");

/* --- 2. La methode B, ecrite d'apres le texte (independante du moteur) ------------------------------------------------------------------- */
const SD = { single: 5706, married0or1: 5706, married2: 11412, hoh: 11412 };
const TAB = { single: tables[0], married: tables[1], hoh: tables[2] };
const impotLivret = (imposable, t) => {
  if (imposable <= 0) return 0;
  let ligne = t[0];
  for (const l of t) if (imposable > l.over) ligne = l;      // « over X but not over Y »
  return ligne.plus + (imposable - ligne.amountOver) * ligne.rate;
};
/* Retenue ANNUELLE : salaire annualise, moins la deduction standard, bareme, moins le credit. sd : 5 706 ou 11 412. */
const methodeB = (annuel, table, sd, allocations) => Math.max(0, impotLivret(annuel - sd, table) - 168.30 * allocations);

/* Exemples imprimes. Les tables par periode sont arrondies par l'agence ; on compare a l'annuel / N. */
const exemple = (lib, annuel, N, table, sd, alloc, imprimeAnnuel, imprimePeriode) => {
  const v = methodeB(annuel, table, sd, alloc);
  ok(Math.abs(v - imprimeAnnuel) < 0.05, lib + " : annuel livret " + imprimeAnnuel + ", calcul " + v);
  ok(Math.abs(v / N - imprimePeriode) < 0.03, lib + " : par periode livret " + imprimePeriode + ", calcul " + v / N);
};
/* Example A (page 51) : hebdomadaire 210 $, celibataire, 1 allocation : sous l'exoneration de 363 $ par semaine -> rien retenu ; la formule donne 0. */
ok(methodeB(210 * 52, TAB.single, 5706, 1) === 0 && 210 < 363, "exemple A : 210 $ par semaine, rien retenu");
/* Example E (page 53) : semi-mensuel 2 400 $ x 24 = 57 600 ; marie, 4 allocations : 57 600 - 11 412 = 46 188 -> 772,40 - 673,20 = 99,20 -> 4,13. */
exemple("exemple E", 57600, 24, TAB.married, 11412, 4, 99.20, 4.13);
/* Example F (page 53) : 12 x 4 750 = 57 000 ; marie, 4 allocations : 45 588 -> 759,20 - 673,20 = 86,00 -> 7,17. */
exemple("exemple F", 57000, 12, TAB.married, 11412, 4, 86.00, 7.17);
/* Example C (page 52) : mensuel 5 100 x 12 = 61 200 ; marie, 5 allocations : le livret imprime 0,82 par mois (table mensuelle arrondie). */
ok(Math.abs(methodeB(61200, TAB.married, 11412, 5) / 12 - 0.82) < 0.05, "exemple C : 0,82 $ par mois, calcul " + methodeB(61200, TAB.married, 11412, 5) / 12);
/* Example D (page 52) : hebdomadaire 950 x 52 = 49 400 ; chef de famille, 3 allocations : 1,69 $ par semaine. */
ok(Math.abs(methodeB(49400, TAB.hoh, 11412, 3) / 52 - 1.69) < 0.05, "exemple D : 1,69 $ par semaine, calcul " + methodeB(49400, TAB.hoh, 11412, 3) / 52);
/* Example B (page 51) : biweekly 1 600, marie, 3 allocations dont 1 de deduction estimee (-38 $ par periode, Table 2), 2 allocations de credit : 2,38 $ par periode. */
{
  const annuel = (1600 - 38) * 26;           // 40 612
  ok(Math.abs(methodeB(annuel, TAB.married, 11412, 2) / 26 - 2.38) < 0.06, "exemple B : 2,38 $ par periode, calcul " + methodeB(annuel, TAB.married, 11412, 2) / 26);
}

/* --- 3. Le moteur == la methode B ecrite ici, aux trois statuts du site ------------------------------------------------------------------- */
const STATUTS = [["single", TAB.single, 5706, 1], ["marriedJoint", TAB.married, 11412, 2], ["headOfHousehold", TAB.hoh, 11412, 2]];
const balayage = [];
for (let g = 1000; g <= 200000; g += 1250) balayage.push(g);
for (let g = 200000; g <= 2000000; g += 21500) balayage.push(g);
balayage.push(5706, 16785, 18896, 18897, 37791, 37792, 75000, 100000, 250000, 500000, 742953, 1000000, 1000001, 1010417, 1485906, 1485907, 3000000);
let maxMoteur = 0, nMoteur = 0;
for (const [st, tab, sd, al] of STATUTS) for (const g of balayage) {
  const att = methodeB(g, tab, sd, al);
  const eng = calcul("california", g, st).etat;
  nMoteur++; maxMoteur = Math.max(maxMoteur, Math.abs(att - eng));
  ok(Math.abs(att - eng) < 1e-6, "moteur != methode B : " + st + " " + g + " : " + eng + " vs " + att);
}
/* Avec 401(k) : l'impot d'Etat part du salaire apres le versement. */
for (const rp of [0.03, 0.06, 0.15]) for (const [st, tab, sd, al] of STATUTS) for (const g of [40000, 75000, 150000, 400000]) {
  ok(Math.abs(calcul("california", g, st, rp).etat - methodeB(g * (1 - rp), tab, sd, al)) < 1e-6, "401(k) " + rp + " " + st + " " + g);
}

/* --- 4. Exoneration des bas revenus (Table 1) ------------------------------------------------------------------------------------------ */
const SEUIL_EXO = { single: 18896, marriedJoint: 37791, headOfHousehold: 37791 };
for (const [st] of STATUTS) {
  const s = SEUIL_EXO[st];
  ok(calcul("california", s, st).etat < 0.02, st + " au seuil d'exoneration " + s + " : retenue " + calcul("california", s, st).etat + " (attendu 0 a un centime)");
  ok(calcul("california", s - 1, st).etat < 0.02, st + " sous le seuil : retenue ~ 0");
  ok(calcul("california", Math.round(s * 0.5), st).etat === 0, st + " a la moitie du seuil : 0");
  ok(calcul("california", s + 1000, st).etat > 0.1, st + " 1 000 $ au-dessus du seuil : de l'impot est retenu");
}

/* --- 5. Les 15 grilles de la Methode A, cellule par cellule ---------------------------------------------------------------------------- */
const PERIODES = { 3: ["single", 52], 4: ["married", 52], 5: ["hoh", 52], 6: ["single", 26], 7: ["married", 26], 8: ["hoh", 26], 9: ["single", 24], 10: ["married", 24], 11: ["hoh", 24],
                   12: ["single", 12], 13: ["married", 12], 14: ["hoh", 12], 15: ["single", 260], 16: ["married", 260], 17: ["hoh", 260] };
let nCell = 0, nDixieme = 0, nBord = 0, ecartMax = 0;
const hors = { 7: { n: 0, nAlt: 0, altMax: 0, max: 0 }, 16: { n: 0, nAlt: 0, altMax: 0, max: 0 } };
for (const [no, [st, N]] of Object.entries(PERIODES)) {
  const lignes = GRILLES[no];
  ok(lignes && lignes.length >= 48, "grille " + no + " : lignes lues " + (lignes && lignes.length));
  // continuite des tranches : chaque « at least » est le « less than » de la ligne precedente
  for (let i = 1; i < lignes.length; i++) ok(lignes[i][0] === lignes[i - 1][1], "grille " + no + " : rupture de tranche entre " + lignes[i - 1][1] + " et " + lignes[i][0]);
  for (const [lo, hi, cellules] of lignes) {
    const milieu = (lo + hi) / 2;
    for (let a = 0; a <= 10; a++) {
      const sd = (st === "married") ? (a >= 2 ? 11412 : 5706) : (st === "single" ? 5706 : 11412);
      const attendu = methodeB(milieu * N, TAB[st], sd, a) / N;
      const ecart = Math.abs(attendu - cellules[a]);
      if (no in hors) {
        // les grilles marie bimensuelle et journaliere : ecart a la formule du livret (Table 3) et a la formule avec 5 706 $ partout
        const alt = methodeB(milieu * N, TAB[st], 5706, a) / N;
        hors[no].n++; hors[no].max = Math.max(hors[no].max, ecart);
        const e2 = Math.abs(alt - cellules[a]);
        if (e2 <= 0.15) hors[no].nAlt++;
        hors[no].altMax = Math.max(hors[no].altMax, e2);
        continue;
      }
      nCell++; ecartMax = Math.max(ecartMax, ecart);
      if (ecart <= 0.105) nDixieme++;
      if (ecart <= 0.2) nBord++;
    }
  }
}
ok(ecartMax < 0.2, "grilles de la Methode A : ecart maximal a la formule " + ecartMax);
ok(nBord === nCell, "toutes les cellules (hors Tables 7 et 16) a moins de 20 cents de la formule : " + nBord + " / " + nCell);
for (const no of [7, 16]) ok(hors[no].nAlt === hors[no].n, "grille " + no + " : reproduite avec la deduction de 5 706 $ pour toutes les allocations (" + hors[no].nAlt + " / " + hors[no].n + ")");
/* Et la trouvaille est reelle : avec la deduction du livret (Table 3, 11 412 $) a 2 allocations ou plus, ces deux grilles s'ecartent. */
let ecartTrouvaille = 0;
for (const [no, [st, N]] of [[7, PERIODES[7]], [16, PERIODES[16]]]) {
  let m = 0;
  for (const [lo, hi, c] of GRILLES[no]) for (let a = 2; a <= 10; a++) m = Math.max(m, Math.abs(methodeB(((lo + hi) / 2) * N, TAB.married, 11412, a) / N - c[a]));
  hors[no].ecartTable3 = m; ecartTrouvaille = Math.max(ecartTrouvaille, m);
}
ok(ecartTrouvaille > 1, "la trouvaille Methode A / Table 3 doit etre mesurable (> 1 $) : " + ecartTrouvaille);

/* --- Une ligne de bilan, reprise telle quelle par build-california.js -------------------------------------------------------------------- */
if (echecs === 0) {
  console.log(nVerifs + " verifications : bareme, deduction et credit relus dans le texte du DE 44, " + 6 + " exemples imprimes, " + nMoteur + " cas moteur == methode B (ecart maximal " + maxMoteur.toExponential(1) + "), " +
    nCell + " cellules de grille : " + nDixieme + " au dixieme de dollar pres, " + nBord + " a moins de 20 cents, ecart maximal " + ecartMax.toFixed(3) + " $ ; " +
    "tables marie bimensuelle et journaliere : " + (hors[7].nAlt + hors[16].nAlt) + " / " + (hors[7].n + hors[16].n) + " cellules reproduites avec 5 706 $, ecart a la Table 3 jusqu'a " + hors[7].ecartTable3.toFixed(2) + " $ et " + hors[16].ecartTable3.toFixed(2) + " $ : OK");
} else { console.log(echecs + " ECHEC(S) sur " + nVerifs); process.exit(1); }
