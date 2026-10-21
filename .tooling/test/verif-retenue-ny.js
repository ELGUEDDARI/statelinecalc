/* Recoupe la retenue de New York (moteur) avec ce que le NYS Department of Taxation and Finance IMPRIME.
 *
 * Sources, lues le 2026-10-21 sur www.tax.ny.gov (HTTP 200, Last-Modified 2025-11-03) :
 *   - NYS-50-T-NYS « New York State Withholding Tax Tables and Methods » (1/26, effective January 1 - December 31, 2026) : methode II (tables
 *     II-A a II-E par periode + « Annual Tax Rate Schedule », pages 17 et 19), methode III (page 22), grilles par tranches de salaire (pages 4 a 13) ;
 *   - NYS-50-T-NYC « New York City Withholding Tax Tables and Methods » (1/26) : methode II (pages 25 et 26), exemples (page 27), grilles (pages 4 a 23) ;
 *   - NYS-50-T-Y (Yonkers) : « Multiply the result by 16.75% (0.1675) ».
 * Extraites par ny-formula-extract.py et ny-tables-extract.py dans .tooling/sources/new-york-*.json.
 * Ce que le script prouve :
 *   1. le « Annual Tax Rate Schedule » imprime (celibataire, marie, NYC) == les donnees du moteur (bracketTable, segment par segment) ;
 *   2. chaque table par periode (hebdomadaire a quotidienne) imprime les memes taux que le bareme annuel et des constantes egales a la valeur annuelle / N
 *      (a l'arrondi de l'agence) ;
 *   3. les huit exemples imprimes de NYS-50-T-NYS (4) et NYS-50-T-NYC (8) se reproduisent a un cent pres ;
 *   4. chaque cellule des 10 grilles d'Etat (NYS) et des 10 grilles de la Ville (NYC) = la formule annuelle, appliquee au MILIEU de la tranche de salaire ;
 *   5. le moteur (annuel, non arrondi) reste a moins de 0,15 $ par paie de la cellule imprimee pour 0 allocation (celibataire et marie du site) ;
 *   6. la methode III (page 22) : 10,45 % / 11,10 % / 11,70 % ;
 *   7. Yonkers : la retenue est 16,75 % du montant d'Etat (aucune table propre : les colonnes 3 a 5 sont celles de l'Etat).
 * Lancer : node .tooling/test/verif-retenue-ny.js
 */
const fs = require("fs");
const path = require("path");
const R = require("../../data/rates-2026.js");
const { calcul, impotTable } = require("../lib/paie.js");
const SRC = path.join(__dirname, "..", "sources");
const F = JSON.parse(fs.readFileSync(path.join(SRC, "new-york-method2-formulas.json"), "utf8"));
const W = JSON.parse(fs.readFileSync(path.join(SRC, "new-york-wage-bracket-tables.json"), "utf8"));
const WC = JSON.parse(fs.readFileSync(path.join(SRC, "new-york-city-wage-bracket-tables.json"), "utf8"));
const TXT = fs.readFileSync(path.join(SRC, "new-york-nys50-t-nys-2026.txt"), "utf8");
const TXTY = fs.readFileSync(path.join(SRC, "new-york-nys50-t-y-2026.txt"), "utf8");
const NY = R.states["new-york"].incomeTax;
let echecs = 0, nVerifs = 0;
const ok = (c, m) => { nVerifs++; if (!c) { echecs++; console.log("ECHEC : " + m); } };
const num = s => parseFloat(String(s).replace(/[$,]/g, ""));
const N = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12, daily: 260 };
const PER = { Weekly: "weekly", Biweekly: "biweekly", Semimonthly: "semimonthly", Monthly: "monthly", Daily: "daily" };

/* --- lire une table de la methode II : [{lo, hi, c3, rate, c5}] ; la derniere ligne (« & over ») a hi = Infinity ------------------------------ */
const lire = rows => {
  const sortie = []; let seuil = null;
  for (const r of rows) {
    if (r[1] === "2" && r[2] === "OVER") continue;                              // ligne d'en-tete « 1 2 3 4 5 »
    if (r.length === 3) { seuil = num(r[1]); continue; }                         // NYS : « $20,722 & over : Methode III »
    const hi = r[2] === "OVER" ? Infinity : num(r[2]);                           // NYC : derniere ligne sans borne haute
    sortie.push({ lo: num(r[1]), hi, c3: num(r[3]), rate: num(r[4]), c5: num(r[5]) });
  }
  return { lignes: sortie, seuil };
};
const nys = F["NYS-50-T-NYS pages 17 et 19"], nyc = F["NYS-50-T-NYC pages 25 et 26"];
const TAB = { single: {}, married: {}, nyc: {} };
for (const p of Object.keys(N)) {
  TAB.single[p] = lire(nys["17/" + p]); TAB.married[p] = lire(nys["19/" + p]); TAB.nyc[p] = lire(nyc["25/" + p]);
  ok(JSON.stringify(TAB.nyc[p].lignes) === JSON.stringify(lire(nyc["26/" + p]).lignes), "NYC " + p + " : les pages 25 (celibataire) et 26 (marie) different");
}
const ann = { single: lire(nys["17/annual"]), married: lire(nys["19/annual"]), nyc: lire(nyc["25/annual"]) };
ok(ann.single.lignes.length === 10 && ann.married.lignes.length === 12 && ann.nyc.lignes.length === 6, "nombre de lignes du bareme annuel : 10 / 12 / 6 attendus, lu " +
  ann.single.lignes.length + " / " + ann.married.lignes.length + " / " + ann.nyc.lignes.length);
ok(ann.single.seuil === 1077550 && ann.married.seuil === 2155350, "seuils de la methode III : 1 077 550 $ / 2 155 350 $, lus " + ann.single.seuil + " / " + ann.married.seuil);

/* --- 1. le bareme annuel imprime == les donnees du moteur --------------------------------------------------------------------------------- */
for (const [st, cle] of [["single", "single"], ["married", "marriedJoint"]]) {
  const imp = ann[st].lignes, mot = NY.bracketTable[cle];
  for (let i = 0; i < imp.length; i++) {
    ok(mot[i].from === imp[i].c3 && mot[i].base === imp[i].c5 && mot[i].rate === imp[i].rate, "bareme annuel " + st + " ligne " + (i + 1) + " : imprime " + JSON.stringify([imp[i].c3, imp[i].c5, imp[i].rate]) + ", moteur " + JSON.stringify([mot[i].from, mot[i].base, mot[i].rate]));
    ok(Math.abs(mot[i].upTo + 0.01 - imp[i].hi) < 1e-6, "bareme annuel " + st + " ligne " + (i + 1) + " : borne haute imprimee " + imp[i].hi + ", moteur " + mot[i].upTo);
    if (i) ok(imp[i].lo === imp[i - 1].hi && imp[i].lo === imp[i].c3, "bareme annuel " + st + " ligne " + (i + 1) + " : lignes non contigues");
  }
}
/* Methode III, page 22 du livret : lue dans le texte. */
const m3 = [...TXT.matchAll(/^\s*([123])\s+\$?([\d,]+)\s+(?:\$?([\d,]+)|\.{3,})\s+(0\.\d{4})\s+[123]\s+\$?([\d,]+)\s+(?:\$?([\d,]+)|\.{3,})\s+(0\.\d{4})/gm)];
ok(m3.length === 3, "methode III : 3 lignes attendues, lu " + m3.length);
const M3 = m3.map(m => ({ s: [num(m[2]), m[3] ? num(m[3]) : Infinity, num(m[4])], m: [num(m[5]), m[6] ? num(m[6]) : Infinity, num(m[7])] }));
ok(M3[0].s[0] === 1077550 && M3[0].s[1] === 5e6 && M3[0].s[2] === 0.1045 && M3[1].s[1] === 25e6 && M3[1].s[2] === 0.111 && M3[2].s[2] === 0.117, "methode III celibataire != 10,45 / 11,10 / 11,70 %");
ok(M3[0].m[0] === 2155350 && M3[0].m[1] === 5e6 && M3[0].m[2] === 0.1045 && M3[1].m[2] === 0.111 && M3[2].m[2] === 0.117, "methode III marie != 10,45 / 11,10 / 11,70 %");
for (const [cle, i0] of [["single", 10], ["marriedJoint", 12]]) {
  const mot = NY.bracketTable[cle];
  ok(mot[i0].rate === 0.1045 && mot[i0].from === 0 && mot[i0].base === 0 && Math.abs(mot[i0].upTo + 0.01 - 5e6) < 1e-6 &&
     mot[i0 + 1].rate === 0.111 && Math.abs(mot[i0 + 1].upTo + 0.01 - 25e6) < 1e-6 && mot[i0 + 2].rate === 0.117 && mot[i0 + 2].upTo === null, "methode III du moteur (" + cle + ")");
}
/* NYC : bareme annuel == celui que la page chiffre (le moteur ne le modelise pas). */
const NYC_ATTENDU = [[0, 0, 0.0205], [8000, 164, 0.028], [8700, 184, 0.0325], [15000, 388, 0.0395], [25000, 783, 0.0415], [60000, 2236, 0.0425]];
ok(JSON.stringify(ann.nyc.lignes.map(l => [l.c3, l.c5, l.rate])) === JSON.stringify(NYC_ATTENDU), "bareme annuel NYC imprime != 2,05 / 2,80 / 3,25 / 3,95 / 4,15 / 4,25 %");

/* --- 2. les tables par periode : memes taux, constantes = annuel / N ---------------------------------------------------------------------- */
let maxC3 = 0, maxC5 = 0;
for (const st of ["single", "married", "nyc"]) {
  for (const p of Object.keys(N)) {
    const t = TAB[st][p].lignes, a = ann[st].lignes;
    ok(t.length === a.length, st + " " + p + " : " + t.length + " lignes, " + a.length + " au bareme annuel");
    for (let i = 0; i < t.length; i++) {
      ok(t[i].rate === a[i].rate, st + " " + p + " ligne " + (i + 1) + " : taux imprime " + t[i].rate + " != annuel " + a[i].rate);
      const e3 = Math.abs(t[i].c3 - a[i].c3 / N[p]), e5 = Math.abs(t[i].c5 - a[i].c5 / N[p]);
      maxC3 = Math.max(maxC3, e3); maxC5 = Math.max(maxC5, e5);
      ok(e3 < 1, st + " " + p + " ligne " + (i + 1) + " : colonne 3 imprimee " + t[i].c3 + ", annuel / N = " + (a[i].c3 / N[p]).toFixed(3));
      ok(e5 <= 0.0051, st + " " + p + " ligne " + (i + 1) + " : colonne 5 imprimee " + t[i].c5 + ", annuel / N = " + (a[i].c5 / N[p]).toFixed(4));
      if (i) ok(t[i].lo === t[i - 1].hi, st + " " + p + " ligne " + (i + 1) + " : lignes non contigues");
    }
  }
}

/* --- 3. les exemples imprimes ----------------------------------------------------------------------------------------------------------------- */
/* Methode II par periode, ecrite a partir du texte (etapes 1 a 5) ; Table A = Table B + exemptions x Table C, valeurs imprimees page 14 (NYS) et 24 (NYC). */
const B_NYS = { weekly: [142.30, 152.90], biweekly: [284.60, 305.80], semimonthly: [308.35, 331.25], monthly: [616.70, 662.50], daily: [28.45, 30.60] };
const C_NYS = { weekly: 19.25, biweekly: 38.50, semimonthly: 41.65, monthly: 83.30, daily: 3.85 };
const B_NYC = { weekly: [96.15, 105.75], biweekly: [192.30, 211.50], semimonthly: [208.35, 229.15], monthly: [416.70, 458.30], daily: [19.25, 21.15] };
const periode = (tab, net) => { for (const l of tab.lignes) if (net < l.hi) return (net - l.c3) * l.rate + l.c5; throw new Error("net au-dela de la table"); };
const exemple = (lib, st, p, brut, nbEx, attendu, B, C, tab) => {
  const ded = B[p][st === "single" ? 0 : 1] + nbEx * C[p];
  const net = brut - ded, tax = periode(tab[p], net);
  ok(Math.abs(tax - attendu) <= 0.011, lib + " : imprime " + attendu + ", calcule " + tax.toFixed(4));
  return tax;
};
exemple("NYS exemple 1 (hebdomadaire 400 $, celibataire, 3 allocations)", "single", "weekly", 400, 3, 8.01, B_NYS, C_NYS, TAB.single);
exemple("NYS exemple 2 (deux fois par mois 5 000 $, celibataire, 1 allocation)", "single", "semimonthly", 5000, 1, 258.51, B_NYS, C_NYS, TAB.single);
exemple("NYS exemple 3 (mensuel 50 000 $, celibataire, 3 allocations)", "single", "monthly", 50000, 3, 3576.63, B_NYS, C_NYS, TAB.single);
exemple("NYS exemple 4 (quotidien 750 $, celibataire, 2 allocations)", "single", "daily", 750, 2, 44.10, B_NYS, C_NYS, TAB.single);
/* Memes exemples par le moteur annuel : (brut x N - (7 400 + 1 000 x allocations)) -> bareme -> / N. */
const moteurAnnuel = (cle, brutPeriode, p, deductionAnnuelle) => impotTable(NY.bracketTable[cle], Math.max(0, brutPeriode * N[p] - deductionAnnuelle)) / N[p];
ok(Math.abs(moteurAnnuel("single", 400, "weekly", 7400 + 3000) - 8.01) <= 0.05, "moteur annuel, exemple NYS 1 : " + moteurAnnuel("single", 400, "weekly", 10400));
ok(Math.abs(moteurAnnuel("single", 5000, "semimonthly", 7400 + 1000) - 258.51) <= 0.05, "moteur annuel, exemple NYS 2 : " + moteurAnnuel("single", 5000, "semimonthly", 8400));
ok(Math.abs(moteurAnnuel("single", 50000, "monthly", 7400 + 3000) - 3576.63) <= 0.05, "moteur annuel, exemple NYS 3 : " + moteurAnnuel("single", 50000, "monthly", 10400));
ok(Math.abs(moteurAnnuel("single", 750, "daily", 7400 + 2000) - 44.10) <= 0.05, "moteur annuel, exemple NYS 4 : " + moteurAnnuel("single", 750, "daily", 9400));
/* NYC : 8 exemples (page 27). */
for (const [st, p, brut, e, att] of [["single", "weekly", 400, 3, 6.11], ["single", "semimonthly", 5000, 1, 188.80], ["single", "monthly", 50000, 3, 2070.50], ["single", "daily", 750, 2, 29.51],
                                     ["married", "weekly", 400, 4, 5.17], ["married", "semimonthly", 5000, 3, 184.37], ["married", "monthly", 50000, 3, 2068.73], ["married", "daily", 750, 2, 29.43]])
  exemple("NYC exemple (" + st + ", " + p + " " + brut + " $, " + e + " allocations)", st, p, brut, e, att, B_NYC, C_NYS, TAB.nyc);
const nycAnnuel = (brut, ded) => { const net = brut - ded; if (net <= 0) return 0; for (const l of ann.nyc.lignes) if (net < l.hi) return (net - l.c3) * l.rate + l.c5; };
ok(Math.abs(nycAnnuel(400 * 52, 5000 + 3000) / 52 - 6.11) <= 0.03, "NYC annuel, exemple 1");
ok(Math.abs(nycAnnuel(50000 * 12, 5000 + 3000) / 12 - 2070.50) <= 0.03, "NYC annuel, exemple 3 : " + nycAnnuel(600000, 8000) / 12);

/* --- 4. les grilles imprimees (NYS puis NYC) : cellule == formule annuelle au milieu de la tranche ----------------------------------------- */
const tabAnn = (lignes, net) => { if (net <= 0) return 0; for (const l of lignes) if (net < l.hi) return (net - l.c3) * l.rate + l.c5; return NaN; };
const stats = {};
const grilles = (nom, G, annuel, deducs) => {
  let tot = 0, exact = 0, bord = 0, maxE = 0, nLignes = 0, vides = 0;
  for (const [k, t] of Object.entries(G)) {
    const [P, st] = k.split("|"), n = N[PER[P]];
    const L = t.lignes;
    for (let i = 1; i < L.length; i++) ok(num(L[i][0]) === num(L[i - 1][1]), nom + " " + k + " ligne " + (i + 1) + " : tranches non contigues");
    ok(num(L[L.length - 1][1]) === num(t.au_dela), nom + " " + k + " : la derniere ligne (" + L[L.length - 1][1] + ") ne rejoint pas « " + t.au_dela + " & over »");
    for (const row of L) {
      nLignes++;
      const mid = (num(row[0]) + num(row[1])) / 2;
      for (let e = 0; e <= 10; e++) {
        const imprime = num(row[2 + e]);
        const calcule = tabAnn(annuel[st].lignes, mid * n - (deducs[st] + 1000 * e)) / n;
        tot++; if (row[2 + e] === "0.00" || row[2 + e] === "$0.00") vides++;
        const d = Math.abs(calcule - imprime);
        maxE = Math.max(maxE, d);
        const pas = nom === "NYC" ? 0.05 : 0.10;
        if (Math.abs(Math.round(calcule / pas + 1e-9) * pas - imprime) < 1e-6) exact++;
        else if (d <= (nom === "NYC" ? 0.03 : 0.14)) bord++;
        else ok(false, nom + " " + k + " [" + row[0] + ", " + row[1] + "[ " + e + " allocations : imprime " + imprime + ", calcule " + calcule.toFixed(3));
      }
    }
  }
  nVerifs += tot;
  stats[nom] = { tot, exact, bord, maxE, nLignes, vides };
};
grilles("NYS", W, { single: ann.single, married: ann.married }, { single: 7400, married: 7950 });
grilles("NYC", WC, { single: ann.nyc, married: ann.nyc }, { single: 5000, married: 5500 });
ok(stats.NYS.tot === 6787 && stats.NYC.tot === 16434, "nombre de cellules inattendu : NYS " + stats.NYS.tot + ", NYC " + stats.NYC.tot);

/* --- 5. le moteur contre la grille imprimee (0 allocation) : celibataire et marie du site ------------------------------------------------- */
let nMoteur = 0, maxMoteur = 0;
for (const [k, t] of Object.entries(W)) {
  const [P, st] = k.split("|"), n = N[PER[P]], statut = st === "single" ? "single" : "marriedJoint";
  for (const row of t.lignes) {
    const mid = (num(row[0]) + num(row[1])) / 2;
    const brutAnnuel = mid * n;
    const cle = statut;
    const moteur = impotTable(NY.bracketTable[cle], Math.max(0, brutAnnuel - NY.standardDeduction[statut])) / n;
    const e = Math.abs(moteur - num(row[2]));
    maxMoteur = Math.max(maxMoteur, e); nMoteur++;
    ok(e <= 0.15, "moteur contre grille " + k + " [" + row[0] + ", " + row[1] + "[ : imprime " + row[2] + ", moteur " + moteur.toFixed(3));
    /* et par calcul() complet : l'impot d'Etat du site au salaire annuel milieu de tranche */
    if (nMoteur % 7 === 0) {
      const c = calcul("new-york", brutAnnuel, statut);
      ok(Math.abs(c.etat / n - moteur) < 1e-9, "calcul() != impotTable a " + brutAnnuel);
    }
  }
}

/* --- 6. Yonkers : 16,75 % de l'impot d'Etat (aucune table propre) ------------------------------------------------------------------------- */
const yPages = [...TXTY.matchAll(/Multiply the result by 16\.75% \(0\.1675\)/g)].length;
ok(yPages >= 3, "NYS-50-T-Y : la phrase « Multiply the result by 16.75% (0.1675) » doit apparaitre au moins 3 fois, lu " + yPages);
ok(/Yonkers resident \.+\s+1\.95975% \(0\.0195975\)/.test(TXTY) && Math.abs(0.117 * 0.1675 - 0.0195975) < 1e-12, "taux supplementaire Yonkers 1,95975 % = 11,70 % x 16,75 %");
ok(/Yonkers nonresident \.+\s+0\.50% \(0\.0050\)/.test(TXTY), "taux supplementaire Yonkers non-resident 0,50 %");
/* Les colonnes de la table Yonkers (page 17) sont celles de l'Etat : taux et constantes. */
const lyk = [...TXTY.matchAll(/\$8,500\s+\$0\s+0\.0390\s+\$0/g)];
ok(lyk.length >= 1, "bareme annuel de Yonkers : la premiere ligne (0 / 3,90 % / 0) n'est pas la meme que celle de l'Etat");

/* --- 7. donnees du moteur : ce que disent les sources --------------------------------------------------------------------------------------- */
ok(NY.standardDeduction.single === 7400 && NY.standardDeduction.marriedJoint === 7950 && NY.standardDeduction.headOfHousehold === 7400, "Table A annuelle != 7 400 / 7 950 $");
ok(NY.personalExemption.single === 0 && NY.personalExemption.marriedJoint === 0 && NY.personalExemption.headOfHousehold === 2000, "allocations != 0 / 0 / 2 (chef de famille, ligne 15)");
ok(R.states["new-york"].employeePrograms.length === 2, "deux programmes salaries attendus (PFL, SDI)");
ok(Math.abs(1833.63 * 52 * 0.00432 - 411.91) < 0.005 && Math.abs(R.states["new-york"].employeePrograms[0].wageCap - 1833.63 * 52) < 1e-6, "PFL : 1 833,63 $ x 52 x 0,432 % != 411,91 $");
ok(Math.abs(0.60 * 52 - 0.005 * R.states["new-york"].employeePrograms[1].wageCap) < 1e-9, "SDI : 0,60 $ x 52 != 0,5 % du plafond");
ok(/Combined deduction and exemption allowance \(full year\)/.test(TXT) && /7,400/.test(TXT) && /7,950/.test(TXT), "Table A : 7 400 / 7 950 $ absents du texte du livret");
ok(/Single taxpayers with one job and zero dependents, enter 0/.test(fs.readFileSync(path.join(SRC, "new-york-it2104-2026.txt"), "utf8")), "IT-2104 : la note « enter 0 » est absente du texte");

if (echecs) { console.log("\n" + echecs + " ECHEC(S)"); process.exit(1); }
const f = (x, d = 2) => x.toFixed(d);
console.log(nVerifs + " verifications : bareme annuel NYS (celibataire 10 lignes, marie 12) + NYC (6), methode III, 15 tables par periode, 12 exemples imprimes, " +
  stats.NYS.nLignes + " lignes de grille NYS, " + stats.NYS.tot + " cellules NYS : " + stats.NYS.exact + " au dixieme de dollar pres, " + stats.NYS.bord + " a un bord d'arrondi, ecart maximal " + f(stats.NYS.maxE, 3) + " $ ; " +
  stats.NYC.nLignes + " lignes de grille NYC, " + stats.NYC.tot + " cellules NYC : " + stats.NYC.exact + " au nickel pres, " + stats.NYC.bord + " a un bord d'arrondi, ecart maximal " + f(stats.NYC.maxE, 3) + " $ ; " +
  nMoteur + " lignes ou le moteur reste a " + f(maxMoteur, 3) + " $ de la cellule imprimee : OK");
console.log("constantes par periode : ecart maximal colonne 3 " + f(maxC3, 3) + " $, colonne 5 " + f(maxC5, 4) + " $");
