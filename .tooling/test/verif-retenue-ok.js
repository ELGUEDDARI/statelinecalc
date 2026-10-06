/* Recoupe l'Oklahoma (data/rates-2026.js et lib/paie.js) avec les DOCUMENTS DE
 * L'AGENCE, RELUS EN LIGNE a chaque lancement.
 *
 * Ce que ce controle prouve :
 *   1. Oklahoma Tax Commission, Packet OW-2 « 2026 Oklahoma Income Tax Withholding
 *      Tables » (Revised 11-2025, effective January 1, 2026) :
 *        - « Effective Date: January 1, 2026 », « Revised 11-2025 » ;
 *        - la phrase de l'allowance (1 000 $ / nombre de periodes), celle de l'arrondi ;
 *        - la table ANNUELLE (Table 7), celibataire ET marie : seuils et montants de
 *          base imprimes, reconstruits A PARTIR DES TRANCHES DU MOTEUR, doivent se
 *          retrouver mot pour mot dans le texte du PDF ;
 *        - les tables 1 a 8 (hebdo ... quotidien) : chaque seuil et chaque montant de
 *          base = table annuelle / nombre de periodes, arrondi comme l'agence ;
 *        - les TABLES DE TRANCHES DE SALAIRE (pages 10-19, hebdo, bimensuel, bimensuel
 *          « semi-monthly », mensuel, quotidien) : pour chaque ligne imprimee, la
 *          retenue du moteur (annuelle / periodes) tombe a 1 $ pres de la case
 *          imprimee, a 1 allowance (celibataire) et 2 allowances (marie).
 *   2. Loi 2026 (HB 2764, 68 O.S. 2355) : « 2025 Tax Legislation Summary » de
 *      l'agence : 3 750 / 4 900 / 7 200 $ (celibataire) et 7 500 / 9 800 / 14 400 $
 *      (marie) ; la tranche a 0 % de la formule = tranche a 0 % de la loi + la
 *      deduction standard (6 350 / 12 700 $, lue dans OK-W-4).
 *   3. OK-W-4 : « Allowance For Yourself », « Allowance For Your Spouse ».
 *   4. OESC : « Most Oklahoma employers are required to pay a tax to the Oklahoma
 *      Unemployment Insurance (UI) Trust Fund. » ; page « Withholding Tax » de l'OTC.
 *
 * Ce qu'il NE prouve PAS : l'absence d'impot local sur les salaires (aucune source
 * officielle trouvee : la page dit « we found no »), le non-declenchement de la baisse
 * de 0,25 % (Board of Equalization, fevrier 2026), la base salariale chomage 2026,
 * le 401(k) (la formule ne le traite pas), le choix « chef de famille = table Single ».
 *
 * AVANT l'integration dans rates-2026.js : si R.states.oklahoma est absent, le bloc
 * est lu dans le fichier indique par OK_BLOCK (defaut : le scratchpad de la phase 1).
 *
 * Lancer : node .tooling/test/verif-retenue-ok.js   (necessite pdftotext)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const R = require("../../data/rates-2026.js");
const { calcul } = require("../lib/paie.js");

if (!R.states.oklahoma) {
  const f = process.env.OK_BLOCK ||
    "C:\\Users\\sland\\AppData\\Local\\Temp\\claude\\c--Users-sland-Desktop-STATELINECALC\\c8ab19d9-ed16-4d9f-9b0c-4de79569165b\\scratchpad\\oklahoma\\oklahoma-block.txt";
  R.states.oklahoma = new Function("return ({" + fs.readFileSync(f, "utf8") + "})")().oklahoma;
  console.log("NOTE : bloc Oklahoma lu dans " + f + " (pas encore dans rates-2026.js)\n");
}

const B = "https://oklahoma.gov";
const URLS = {
  ow2: B + "/content/dam/ok/en/tax/documents/resources/publications/businesses/withholding-tables/WHTables-2026.pdf",
  w4: B + "/content/dam/ok/en/tax/documents/forms/businesses/general/OK-W-4.pdf",
  leg: B + "/content/dam/ok/en/tax/documents/resources/publications/legislation/2025LegislativeUpdate.pdf",
  retenue: B + "/tax/businesses/withholding.html",
  oesc: B + "/oesc/employers/tax.html"
};
const tmp = path.join(os.tmpdir(), "verif-retenue-ok");
fs.mkdirSync(tmp, { recursive: true });

function telecharge(url, n = 0) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36" } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && n < 4) {
        r.resume(); return ok(telecharge(new URL(r.headers.location, url).href, n + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return ko(new Error("HTTP " + r.statusCode + " " + url)); }
      const morceaux = [];
      r.on("data", d => morceaux.push(d));
      r.on("end", () => ok(Buffer.concat(morceaux)));
    }).on("error", ko);
  });
}
const lisPdf = async (nom) => {
  const f = path.join(tmp, nom + ".pdf");
  fs.writeFileSync(f, await telecharge(URLS[nom]));
  return execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] });
};
const lisHtml = async (nom) => (await telecharge(URLS[nom])).toString("utf8");

let pass = 0, fail = 0;
const verifie = (nom, ok, detail) => {
  console.log((ok ? "  OK    | " : "  ECHEC | ") + nom + (detail ? " | " + detail : ""));
  ok ? pass++ : fail++;
};
/* « $ 28.75 » et « $28.75 » se valent ; les espaces des colonnes ne comptent pas. */
const norm = t => t.replace(/\r/g, "").replace(/\$\s+/g, "$").replace(/\s+/g, " ");
const f2 = n => (Math.round(n * 100) / 100).toFixed(2);
const f0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });

/* Une SECONDE implementation, naive, de la formule imprimee : lignes de la table
   annuelle (celibataire) -> retenue sur un revenu net de allowances. */
function formuleImprimee(table, net) {
  /* table = [[seuil, base, taux], ...] ; en dessous du premier seuil : 0. */
  let t = 0;
  for (const [seuil, base, taux] of table) if (net > seuil) t = base + taux * (net - seuil);
  return t;
}

(async () => {
  const OK = R.states.oklahoma.incomeTax;
  const ow2 = await lisPdf("ow2");
  const N = norm(ow2);

  verifie("OW-2 : « Effective Date: January 1, 2026 » et « Revised 11-2025 »",
    N.includes("Effective Date: January 1, 2026") && /Revised 11-2025/.test(N));
  verifie("OW-2 : l'allowance = « personal exemption amount of $1,000.00 divided by the number of payroll periods »",
    N.includes("personal exemption amount of $1,000.00 divided by the number of payroll periods in the calendar year"));
  verifie("OW-2 : le moteur retranche 1 000 $ par allowance (celibataire 1, marie 2, chef de famille 1)",
    OK.personalExemption.single === 1000 && OK.personalExemption.marriedJoint === 2000 &&
    OK.personalExemption.headOfHousehold === 1000);
  verifie("OW-2 : les allowances sont retranchees AVANT les tables (« deduct it from the gross wage ... before using the percentage rate tables »)",
    N.includes("deduct it from the gross wage or payment for the period before using the percentage rate tables"));
  verifie("OW-2 : arrondi au dollar (« Round to the nearest whole dollar ... 50 to 99 cents to the next higher dollar »)",
    N.includes("Round to the nearest whole dollar by dropping any amount under 50 cents and increasing amounts from 50 to 99 cents to the next higher dollar"));
  verifie("OW-2 : « Married, but withhold at higher Single rate » -> table Single",
    N.includes('"Married, but withhold at higher Single rate"') &&
    N.includes("use the appropriate Single Persons withholding table"));
  verifie("moteur : AUCUNE deduction standard dans la formule (la tranche a 0 % la contient)",
    OK.standardDeduction === undefined && !OK.deductionByIncome && !OK.slidingDeduction);

  /* ---- Table 7 (annuelle) : tranches du moteur -> lignes imprimees ---- */
  const coupe = (debut, fin) => {
    const i = N.indexOf(debut), j = N.indexOf(fin, i);
    return i >= 0 && j > i ? N.slice(i, j) : "";
  };
  const t7 = coupe("Table 7: ANNUAL Payroll Period", "Table 8: DAILY");
  verifie("OW-2 : la table 7 (ANNUAL) existe", t7.length > 200, t7.length + " caracteres");
  for (const [statut, nom] of [["single", "celibataire"], ["marriedJoint", "marie"]]) {
    const b = OK.brackets[statut];
    /* Lignes attendues : [seuil bas, base, taux, seuil haut]. */
    let base = 0, bas = 0;
    const lignes = [];
    for (const [haut, taux] of b) {
      lignes.push({ bas, base, taux, haut });
      if (isFinite(haut)) base += (haut - bas) * taux;
      bas = haut;
    }
    /* Premiere ligne (0 %) : « $0 $10,100 $0.00 ». Les suivantes : « $B +(T% of the excess over $S) ». */
    verifie("table 7 " + nom + " : « $0 $" + f0(b[0][0]) + " $0.00 »", t7.includes("$0 $" + f0(b[0][0]) + " $0.00"));
    for (let i = 1; i < lignes.length; i++) {
      const l = lignes[i];
      const txt = "$" + f2(l.base) + " +(" + f2(l.taux * 100) + "% of the excess over $" + f0(l.bas) + ")";
      verifie("table 7 " + nom + " : « " + txt + " »", t7.includes(txt));
    }
  }

  /* ---- Tables 1 a 8 : seuils et bases = annuel / periodes ---- */
  const TABLES = [
    ["Table 1: WEEKLY", "Table 2: BI-WEEKLY", 52],
    ["Table 2: BI-WEEKLY", "Table 3: SEMI-MONTHLY", 26],
    ["Table 3: SEMI-MONTHLY", "Table 4: MONTHLY", 24],
    ["Table 4: MONTHLY", "Table 5: QUARTERLY", 12],
    ["Table 5: QUARTERLY", "Table 6: SEMI-ANNUAL", 4],
    ["Table 6: SEMI-ANNUAL", "Table 7: ANNUAL", 2],
    ["Table 8: DAILY", "Weekly Payroll Period: Single", 260]
  ];
  for (const [d, f, per] of TABLES) {
    const tx = coupe(d, f);
    let ok = tx.length > 100, manque = [];
    for (const statut of ["single", "marriedJoint"]) {
      const b = OK.brackets[statut];
      const s1 = b[0][0], s2 = b[1][0], s3 = b[2][0];
      /* Les seuils imprimes sont les seuils annuels / periodes, arrondis au dollar. */
      for (const s of [s1, s2, s3]) {
        const v = "$" + f0(Math.round(s / per));
        if (!tx.includes(v)) { ok = false; manque.push(v); }
      }
      const base2 = (s2 - s1) * b[1][1], base3 = base2 + (s3 - s2) * b[2][1];
      for (const [bs, taux, seuil] of [[0, b[1][1], s1], [base2, b[2][1], s2], [base3, b[3][1], s3]]) {
        const v = "$" + f2(Math.round(bs / per * 100) / 100) + " +(" + f2(taux * 100) + "% of the excess over $" + f0(Math.round(seuil / per)) + ")";
        if (!tx.includes(v)) { ok = false; manque.push(v); }
      }
    }
    verifie(d.split(":")[0] + " (" + d.split(": ")[1] + ") : seuils et montants de base = table annuelle / " + per,
      ok, manque.length ? "absent : " + manque.slice(0, 3).join(" ; ") : "");
  }

  /* ---- Tables de tranches de salaire (lues par COORDONNEES, PyMuPDF) ----
     Pour chaque ligne imprimee [lo, hi] et chaque colonne k = 0..10 allowances :
     la case imprimee doit tomber entre la formule (table 7, annuelle) aux deux bords
     de la tranche, a 0,5 $ d'arrondi pres (+ 0,1 $ : les seuils de la periode sont
     arrondis au dollar). A la colonne 1 (celibataire) / 2 (marie), le MOTEUR doit
     tomber dans le meme intervalle. */
  const lignes = JSON.parse(execFileSync("python", [path.join(__dirname, "ok-tables-extract.py"), path.join(tmp, "ow2.pdf")],
    { encoding: "utf8", maxBuffer: 1 << 26 }));
  const PER = { "Weekly": 52, "Bi-Weekly": 26, "Semi-Monthly": 24, "Monthly": 12, "Daily or Miscellaneous": 260 };
  const TAB = { Single: [[10100, 0, 0.025], [11250, 28.75, 0.035], [13550, 109.25, 0.045]],
                Married: [[20200, 0, 0.025], [22500, 57.5, 0.035], [27100, 218.5, 0.045]] };
  const groupes = {};
  for (const l of lignes) (groupes[l.periode + " / " + l.statut] = groupes[l.periode + " / " + l.statut] || []).push(l);
  for (const [cle, lg] of Object.entries(groupes)) {
    const [periode, statut] = cle.split(" / ");
    const per = PER[periode], tab = TAB[statut], st = statut === "Single" ? "single" : "marriedJoint";
    const colMoteur = statut === "Single" ? 1 : 2;
    let cellules = 0, hors = 0, horsMoteur = 0, pire = "";
    for (const l of lg) {
      for (let k = 0; k < 11; k++) {
        const f = g => formuleImprimee(tab, g * per - 1000 * k) / per;
        const bas = f(l.lo) - 0.6, haut = f(l.hi) + 0.6;
        const v = l.cells[k];
        cellules++;
        if (v < bas || v > haut) { hors++; pire = pire || l.lo + "-" + l.hi + " col " + k + " imprime " + v + " attendu " + f2(bas + 0.6) + ".." + f2(haut - 0.6); }
        if (k === colMoteur) {
          const m = (calcul("oklahoma", Math.max(l.lo * per, 1), st).etat + calcul("oklahoma", l.hi * per, st).etat) / 2 / per;
          const m1 = calcul("oklahoma", Math.max(l.lo * per, 1), st).etat / per - 0.6, m2 = calcul("oklahoma", l.hi * per, st).etat / per + 0.6;
          if (v < m1 || v > m2) { horsMoteur++; pire = pire || "moteur " + l.lo + "-" + l.hi + " imprime " + v + " moteur " + f2(m); }
        }
      }
    }
    verifie(periode + " / " + statut + " : " + lg.length + " lignes, " + cellules + " cases (11 colonnes), toutes dans l'intervalle de la formule ; moteur dans l'intervalle",
      lg.length === 44 && hors === 0 && horsMoteur === 0, "hors intervalle " + hors + ", moteur " + horsMoteur + (pire ? " | " + pire : ""));
  }
  verifie("10 tables de tranches de salaire lues (5 periodes x 2 statuts)", Object.keys(groupes).length === 10, Object.keys(groupes).length + " lues");

  /* ---- Le moteur contre la formule imprimee, aux deux statuts ---- */
  const tabS = [[10100, 0, 0.025], [11250, 28.75, 0.035], [13550, 109.25, 0.045]].map(([s, b, t]) => [s, b, t]);
  const tabS0 = [[10100, 0, 0.025], [11250, 28.75, 0.035], [13550, 109.25, 0.045]];
  const tabM0 = [[20200, 0, 0.025], [22500, 57.5, 0.035], [27100, 218.5, 0.045]];
  let ecartAnnuel = 0, pireA = "";
  for (const g of [8000, 9999, 10500, 11100, 12000, 14550, 20000, 31000, 45000, 75000, 120000, 250000, 1000000]) {
    for (const [statut, tab, alw] of [["single", tabS0, 1000], ["marriedJoint", tabM0, 2000], ["headOfHousehold", tabS0, 1000]]) {
      const e = Math.abs(calcul("oklahoma", g, statut).etat - formuleImprimee(tab, g - alw));
      if (e > ecartAnnuel) { ecartAnnuel = e; pireA = statut + " " + g; }
    }
  }
  verifie("moteur = formule imprimee de la table 7 (13 salaires x 3 statuts), ecart < 0,005 $",
    ecartAnnuel < 0.005, "ecart max " + ecartAnnuel.toFixed(6) + (pireA ? " (" + pireA + ")" : ""));
  void tabS;

  /* ---- Loi 2026 ---- */
  const leg = norm(await lisPdf("leg"));
  verifie("Loi : « Individual income tax rate reduction, effective for tax year 2026 and subsequent tax years. (68 O.S. 2355) » (HB 2764)",
    /HB 2764 Effective November 1, 2025 Individual income tax rate reduction, effective for tax year 2026 and subsequent tax years\. \(68 O\.S\. . 2355\)/.test(leg));
  verifie("Loi : celibataire 0 a 3 750 $ a 0 %, 3 751-4 900 a 2,5 %, 4 901-7 200 a 3,5 % (base 28,75), au-dela 4,5 % (base 109,25)",
    leg.includes("$3,751 $4,900 $0.00 2.5% $3,750") && leg.includes("$4,901 $7,200 $28.75 3.5% $4,900") &&
    leg.includes("$7,201 and above $109.25 4.5% $7,200"));
  verifie("Loi : marie 7 500 / 9 800 / 14 400 $, bases 57,50 et 218,50",
    leg.includes("$7,501 $9,800 $0.00 2.5% $7,500") && leg.includes("$9,801 $14,400 $57.50 3.5% $9,800") &&
    leg.includes("$14,401 and above $218.50 4.5% $14,400"));
  const w4 = norm(await lisPdf("w4"));
  verifie("OK-W-4 : deduction standard 6 350 $ (celibataire) et 12 700 $ (marie) -> 3 750 + 6 350 = 10 100 ; 7 500 + 12 700 = 20 200",
    w4.includes("$6,350 - standard deduction") && w4.includes("$12,700 - standard deduction") &&
    3750 + 6350 === OK.brackets.single[0][0] && 7500 + 12700 === OK.brackets.marriedJoint[0][0]);
  verifie("OK-W-4 : « Allowance For Yourself: Enter 1 for yourself » et « Allowance For Your Spouse »",
    w4.includes("Allowance For Yourself: Enter 1 for yourself") && w4.includes("Allowance For Your Spouse"));
  verifie("OK-W-4 : le conjoint qui travaille donne 0 allowance (« If Yes, enter 0 »)",
    w4.includes("If Yes, enter 0. If no, enter 1 for your spouse"));

  /* ---- Pages HTML ---- */
  const retenue = await lisHtml("retenue").catch(e => "ERREUR " + e.message);
  verifie("OTC « Withholding Tax » : « pays directly to the state »", retenue.includes("pays directly to the state"));
  const oesc = await lisHtml("oesc").catch(e => "ERREUR " + e.message);
  verifie("OESC : « Most Oklahoma employers are required to pay a tax to the Oklahoma Unemployment Insurance (UI) Trust Fund »",
    oesc.includes("Most Oklahoma employers are required to pay a tax to the Oklahoma Unemployment Insurance (UI) Trust Fund"));

  /* ---- Structure ---- */
  const S = R.states.oklahoma;
  verifie("Oklahoma : aucune cotisation salariale d'Etat (paidLeave, waCares, employeePrograms) ni impot de comte",
    !S.paidLeave && !S.waCares && !(S.employeePrograms && S.employeePrograms.length) && !OK.countyTax);
  verifie("net 75 000 $ celibataire = 58 763,00 $ (recalcule a la main : 75 000 - 7 670 - 4 650 - 1 087,50 - 2 829,50)",
    Math.abs(calcul("oklahoma", 75000).net - 58763.00) < 0.006, f2(calcul("oklahoma", 75000).net));

  console.log("\n" + pass + " verifications OK, " + fail + " en echec.");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("INDETERMINE : " + e.message); process.exit(2); });
