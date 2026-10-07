/* Recoupe la formule de l'Iowa ET les donnees du site contre les TABLES IMPRIMEES du
 * Iowa Department of Revenue lui-meme.
 *
 * Sources : « Iowa Individual Income Tax Withholding Formula », effective January 1, 2026 (PDF,
 * https://revenue.iowa.gov/media/53/download?inline) et « Iowa Withholding Tables » (classeur Excel,
 * https://revenue.iowa.gov/media/54/download?inline, 18 feuilles : Other / HOH / Married x Daily / Weekly /
 * Biweekly / Semimonthly / Monthly / Annually ; 2 848 lignes, 31 328 cellules).
 * Formule du PDF : T1 = G - D ; T2 = T1 x 3,80 % ; T3 = T2 - W / P ; la table ne descend jamais sous zero.
 * D (annuel) = 13 000 / 19 500 / 26 000 ; pour les autres periodes l'agence IMPRIME ses propres D
 * (541,67 ; 1 083,33 ; 812,50 ; 2 166,67 ... : l'arrondi du D fait partie de la table).
 *
 * CE QUE LE SCRIPT FAIT
 * 0. Telecharge le classeur, le lit (ia-tables-extract.py, openpyxl : cellules lues telles quelles).
 * 1. Pour chaque ligne et chaque colonne d'allowances : recalcule, EN ENTIERS (centimes), au milieu de la
 *    tranche, T2 arrondi au cent PUIS T3 arrondi au cent (regle des exemples du PDF : 148,83 - 3,33 = 145,50)
 *    et exige l'EGALITE exacte au centime imprime. Aucune tolerance.
 *    La colonne « $40.00-$79.99 » vaut W = 40 (borne basse de la colonne), « $400.00 or Over » W = 400.
 * 2. Verifie la regle « If annual wages are at least $X, multiply the excess over $Y by 3.80% » de chaque
 *    feuille : X est le haut de la derniere ligne, Y son milieu.
 * 3. TEMOIN NEGATIF : la meme formule a 4 % (au lieu de 3,8 %) doit echouer presque partout.
 * 4. Si data/rates-2026.js contient le bloc iowa : deduction, taux, allowances et impot du moteur contre la
 *    formule, aux 3 statuts, et le moteur AU MILIEU de chaque tranche annuelle contre la table imprimee.
 *
 * Lancer : node .tooling/test/verif-retenue-ia.js   (necessite python + openpyxl)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");

const URL = "https://revenue.iowa.gov/media/54/download?inline";
const xlsx = path.join(os.tmpdir(), "ia-withholding-tables-2026.xlsx");
/* D imprime par l'agence, en centimes : [Other, HOH, Married]. */
const D_CT = {
  Daily: [5000, 7500, 10000], Weekly: [25000, 37500, 50000], Biweekly: [50000, 75000, 100000],
  Semimonthly: [54167, 81250, 108333], Monthly: [108333, 162500, 216667], Annually: [1300000, 1950000, 2600000]
};
const IDX = { Other: 0, HOH: 1, Married: 2 };
const P = { Daily: 260, Weekly: 52, Biweekly: 26, Semimonthly: 24, Monthly: 12, Annually: 1 };
const W_COL = [0, 40, 80, 120, 160, 200, 240, 280, 320, 360, 400];

function telecharge(url) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
      const out = fs.createWriteStream(xlsx);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}
/* arrondi « moitie vers le haut » en entiers : num / den, den > 0, num >= 0. */
const demi = (num, den) => Math.floor((2 * num + den) / (2 * den));
/* Formule imprimee, en centimes. milieuCt = milieu de la tranche, wDollars = allowance, taux = 38 (pour mille). */
function imprime(milieuCt, dCt, wDollars, p, tauxMille) {
  const t1 = Math.max(0, milieuCt - dCt);
  const t2 = demi(t1 * tauxMille, 1000);                 // T2 arrondi au cent
  const num = t2 * p - wDollars * 100;                   // T2 - W/P, multiplie par P
  return num <= 0 ? 0 : demi(num, p);                    // T3 arrondi au cent, jamais negatif
}

(async () => {
  let echecs = 0;
  const check = (nom, ok, detail) => { console.log((ok ? "OK    " : "ECHEC ") + nom + (detail ? "  " + detail : "")); if (!ok) echecs++; };
  await telecharge(URL);
  const txt = execFileSync("python", [path.join(__dirname, "ia-tables-extract.py"), xlsx], { maxBuffer: 1 << 29, env: { ...process.env, PYTHONIOENCODING: "utf8" } }).toString();
  const { rows, exces, entetes } = JSON.parse(txt);

  check("18 feuilles lues", Object.keys(entetes).length === 18, Object.keys(entetes).length + " / 18");
  check("2 848 lignes, 31 328 cellules", rows.length === 2848 && rows.reduce((t, r) => t + r.cells.length, 0) === 31328,
    rows.length + " lignes");
  check("les 11 colonnes d'allowances sont celles qu'on suppose ($0-39,99, $40-79,99 ... $400 or Over)",
    Object.values(entetes).every(h => h.length === 11 && h[0].startsWith("$0.00-$39.99") && h[1].startsWith("$40.00-$79.99") &&
      h[2].startsWith("$80.00-$119.99") && /400\.00 or Over/.test(h[10])));

  let cellules = 0, mauvaises = 0, temoin = 0, positives = 0;
  for (const r of rows) {
    const milieuCt = Math.round((r.lo + r.hi) * 50);        // (lo + hi) / 2 en centimes
    r.cells.forEach((c, i) => {
      cellules++;
      const attendu = imprime(milieuCt, D_CT[r.periode][IDX[r.statut]], W_COL[i], P[r.periode], 38);
      if (Math.round(c * 100) !== attendu) {
        mauvaises++;
        if (mauvaises < 6) console.log("   ecart", r.feuille, r.lo, r.hi, "col", i, "imprime", c, "formule", attendu / 100);
      }
      if (c > 0) { positives++; if (Math.round(c * 100) !== imprime(milieuCt, D_CT[r.periode][IDX[r.statut]], W_COL[i], P[r.periode], 40)) temoin++; }
    });
  }
  check("toutes les cellules imprimees (" + cellules + ") = formule du PDF, EXACTEMENT au centime", mauvaises === 0, mauvaises + " ecart(s)");
  check("temoin negatif : a 4 % la formule echoue sur la plupart des cellules non nulles (> 90 %)", temoin / positives > 0.9,
    (100 * temoin / positives).toFixed(1) + " % de " + positives + " cellules non nulles");
  for (const e of exces) {
    const dernieres = rows.filter(r => r.feuille === e.feuille);
    const derniere = dernieres[dernieres.length - 1];
    check("regle « excess over » de " + e.feuille + " : des " + e.des + " sur " + e.sur + " = haut de la derniere ligne et milieu (a 0,50 $ pres : la table journaliere imprime 403 pour 403,50)",
      derniere.hi === e.des && Math.abs((derniere.lo + derniere.hi) / 2 - e.sur) <= 0.5, derniere.lo + "-" + derniere.hi);
  }
  check("18 regles « excess over » lues", exces.length === 18);

  /* Phase 2 : les donnees du site. */
  const { R, calcul } = require("../lib/paie.js");
  const I = R.states.iowa;
  if (!I) { console.log("(bloc iowa absent de data/rates-2026.js : controle du site ignore)"); }
  else {
    const T = I.incomeTax;
    check("deduction annuelle du site = 13 000 / 26 000 / 19 500 (Other / Married / HOH)",
      JSON.stringify(T.standardDeduction) === JSON.stringify({ single: 13000, marriedJoint: 26000, headOfHousehold: 19500 }));
    check("taux du site = 3,8 % pour les trois statuts, une seule tranche",
      ["single", "marriedJoint", "headOfHousehold"].every(s => T.brackets[s].length === 1 && T.brackets[s][0][1] === 0.038 && T.brackets[s][0][0] === Infinity));
    check("allowances du site : 40 $ x 1 (Other) / 2 (Married) / 2 (HOH), sans plafond de revenu",
      T.withholdingAllowances.credit === 40 && T.withholdingAllowances.perFiler.single === 1 &&
      T.withholdingAllowances.perFiler.marriedJoint === 2 && T.withholdingAllowances.perFiler.headOfHousehold === 2 &&
      Object.values(T.withholdingAllowances.noneAbove).every(v => v === Infinity));
    check("aucune exemption, aucun credit de revenu, aucune deduction par palier",
      !T.personalExemption && !T.deductionByIncome && !T.slidingDeduction && !T.federalTaxSubtraction && !T.countyTax && !T.taxCredit);
    check("aucun programme salarie (employeePrograms, paidLeave, waCares)", !I.employeePrograms && !I.paidLeave && !I.waCares);

    /* Le moteur, en annuel, contre la formule. */
    const W = { single: 40, marriedJoint: 80, headOfHousehold: 80 };
    const D = { single: 13000, marriedJoint: 26000, headOfHousehold: 19500 };
    let ecart = 0, n = 0;
    for (const st of Object.keys(D))
      for (const g of [3000, 13000, 14052, 14053, 19500, 26000, 30000, 52000, 75000, 101500, 102000, 250000, 1500000]) {
        n++;
        if (Math.abs(calcul("iowa", g, st, 0).etat - Math.max(0, Math.max(0, g - D[st]) * 0.038 - W[st])) > 0.005) ecart++;
      }
    check("impot d'Etat du moteur = formule annuelle (3 statuts x 13 salaires = " + n + ")", ecart === 0, ecart + " ecart(s)");

    /* Le moteur AU MILIEU de chaque tranche ANNUELLE imprimee, contre la table (colonne 40 $ pour Other, 80 $ pour les autres). */
    let comp = 0, mauv = 0, pire = 0;
    const COL = { Other: 1, Married: 2, HOH: 2 };
    const STAT = { Other: "single", Married: "marriedJoint", HOH: "headOfHousehold" };
    for (const r of rows.filter(x => x.periode === "Annually")) {
      comp++;
      const mid = (r.lo + r.hi) / 2;
      const e = Math.abs(calcul("iowa", mid, STAT[r.statut], 0).etat - r.cells[COL[r.statut]]);
      pire = Math.max(pire, e);
      if (e > 0.005) mauv++;
    }
    check("le moteur au milieu de chaque tranche annuelle imprimee (" + comp + " lignes, 3 statuts) = la table, au demi-centime", mauv === 0,
      mauv + " ecart(s), pire " + pire.toFixed(4));
  }
  console.log("\n" + (echecs === 0 ? "TOUT PASSE" : echecs + " ECHEC(S)"));
  process.exit(echecs === 0 ? 0 : 1);
})().catch(e => { console.error("ERREUR", e.message); process.exit(2); });
