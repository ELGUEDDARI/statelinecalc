/* Recoupe la formule de l'Alabama ET les donnees du site contre les TABLES IMPRIMEES du
 * Department of Revenue lui-meme.
 *
 * Source : Alabama Department of Revenue, « Withholding Tax Tables and Instructions for
 * Employers and Withholding Agents », REVISED January 2026,
 * https://www.revenue.alabama.gov/wp-content/uploads/2026/01/whbooklet_0126.pdf
 * (84 pages ; formule p. 7, bareme des deductions p. 8, tables p. 10-81).
 *
 * ── CE QUE LE SCRIPT FAIT ───────────────────────────────────────────────────
 * 0. Il telecharge le PDF et le lit par COORDONNEES (al-tables-extract.py, PyMuPDF) :
 *    pdftotext -layout melange les cellules. 3 600 lignes attendues (600 par periode de
 *    paie x 6 periodes), 32 cellules par ligne : 4 colonnes sans personne a charge
 *    (0, S, MS, M) puis 4 (S, H, MS, M) pour 1 a 7 personnes a charge.
 * 1. FORMULE ECRITE ICI a partir du TEXTE du livret (p. 7), pas du moteur du site :
 *    revenu annualise (GI), moins la deduction standard en escalier, moins l'impot federal
 *    retenu, moins l'exemption (0 / 1 500 / 3 000 $), moins 1 000 / 500 / 300 $ par personne
 *    a charge ; puis 2 % / 4 % / 5 % (seuils 500 et 3 000 ; 1 000 et 6 000 pour « M »).
 * 2. L'impot federal retenu n'est PAS imprime : le livret dit « Actual amount ». Pour
 *    chaque ligne et chaque groupe de colonnes (0 et S, H, M ; MS est mesure a part) le script cherche le montant
 *    federal annuel qui reproduit les 8 a 17 cellules du groupe, et EXIGE que TOUTES
 *    tombent a 0,51 $ pres (arrondi au dollar de l'agence = 0,5 $). Une seule valeur
 *    federale doit expliquer toutes les colonnes de personnes a charge : si l'exemption, un
 *    palier de personnes a charge (1 000 / 500 / 300 $) ou un taux etait faux, le groupe ne
 *    se recoupe pas. Aucune exception : les trois groupes
 *    (celibataire « 0 » et « S », chef de famille « H », marie « M ») se recoupent sur toutes les lignes.
 *    CONSTAT (06/10/2026) : les tables sont calculees sur le HAUT de chaque tranche de salaire
 *    (« at least 500 but less than 510 » = 510), pas sur son milieu : au milieu, 853 groupes sur
 *    ~10 800 depassaient 0,75 $ ; au haut de tranche, aucun groupe 0/S, H ou M ne depasse 0,51 $.
 *    Les colonnes MS (marie, declaration separee ; pas un statut du site) sont mesurees a part :
 *    3 groupes sur ~3 500 s'ecartent, dont une ligne annuelle qui imprime 537 $ la ou ses voisines
 *    impriment 572 $ et 603 $ (apparente faute d'impression du livret, hors verdict).
 * 3. TEMOIN NEGATIF : la meme formule SANS impot federal doit echouer presque partout.
 * 4. La deduction standard est un terme CONSTANT par ligne : l'impot federal deduit
 *    l'absorberait. Elle est donc recoupee A PART contre le « Schedule of Standard Deduction
 *    Amounts » imprime (p. 8, 84 tranches : M, MS, H, S) ET contre la fonction du site.
 * 5. LES DONNEES DU SITE (data/rates-2026.js, bloc alabama) sont comparees a la formule
 *    ecrite ici : deduction standard + exemption aux 3 statuts du site, a chaque tranche
 *    du bareme, et taux d'imposition a des montants imposables repartis sur tout le bareme.
 * 6. Informatif, non asserte : l'ecart entre le federal que les tables supposent et celui
 *    de notre moteur (IRS Publication 15-T), et l'ecart d'impot d'Etat qui en resulte.
 *
 * Lancer : node .tooling/test/verif-retenue-al.js   (necessite python + PyMuPDF)
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const https = require("https");
const { execFileSync } = require("child_process");
const { calcul, R, deductionEtat, progressiveTax } = require("../lib/paie.js");

const URL = "https://www.revenue.alabama.gov/wp-content/uploads/2026/01/whbooklet_0126.pdf";
const pdf = path.join(os.tmpdir(), "al-whbooklet-0126.pdf");

function telecharge(url) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0" } }, r => {
      if (r.statusCode !== 200) return ko(new Error("HTTP " + r.statusCode));
      const out = fs.createWriteStream(pdf);
      r.pipe(out); out.on("finish", () => out.close(ok));
    }).on("error", ko);
  });
}

/* --- la formule, ecrite A PARTIR DU TEXTE du livret (p. 7) ---------------- */
function deduction(gi, statut) {
  if (statut === "MS") {
    if (gi <= 12999) return 4250;
    if (gi >= 17750) return 2500;
    return 4250 - 88 * Math.ceil((gi - 12999) / 250);
  }
  const [haut, pente, bas] = { S: [3000, 25, 2500], M: [8500, 175, 5000], H: [5200, 135, 2500] }[statut];
  if (gi <= 25999) return haut;
  if (gi >= 35500) return bas;
  return haut - pente * Math.ceil((gi - 25999) / 500);
}
const BAREME_M = [[1000, .02], [6000, .04], [Infinity, .05]];
const BAREME_S = [[500, .02], [3000, .04], [Infinity, .05]];
function impot(imposable, bareme) {
  if (imposable <= 0) return 0;
  let x = 0, bas = 0;
  for (const [haut, taux] of bareme) {
    if (imposable > bas) x += (Math.min(imposable, haut) - bas) * taux;
    bas = haut;
    if (imposable <= haut) break;
  }
  return x;
}
const EXEMPTION = { "0": 0, S: 1500, MS: 1500, M: 3000, H: 3000 };
function formule(gi, col, federal) {
  const [lettre, dep] = col;
  const st = lettre === "0" ? "S" : lettre;
  const parTete = gi <= 50000 ? 1000 : gi <= 100000 ? 500 : 300;
  const imposable = gi - deduction(gi, st) - federal - EXEMPTION[lettre] - dep * parTete;
  return impot(imposable, lettre === "M" ? BAREME_M : BAREME_S);
}

const COLS = [["0", 0], ["S", 0], ["MS", 0], ["M", 0]];
for (let d = 1; d <= 7; d++) for (const l of ["S", "H", "MS", "M"]) COLS.push([l, d]);
/* MS (marie, declaration separee) n'est pas un statut du site : son groupe est mesure a part et
   n'entre pas dans le verdict (voir plus bas). */
const GROUPES = { S: ["0", "S"], H: ["H"], M: ["M"], MS: ["MS"] };
const indices = g => COLS.map((c, i) => GROUPES[g].includes(c[0]) ? i : -1).filter(i => i >= 0);
const PERIODES = { "WEEKLY": 52, "BI-WEEKLY": 26, "SEMI-MONTHLY": 24, "MONTHLY": 12, "QUARTERLY": 4, "ANNUALLY": 1 };

/* Le montant federal annuel qui explique le mieux les cellules d'un groupe. */
function meilleurFederal(gi, n, imprime, idx) {
  if (idx.every(i => imprime[i] === 0)) return null;           // rien a recouper
  const erreur = (F) => {
    let e = 0;
    for (const i of idx) e = Math.max(e, Math.abs(formule(gi, COLS[i], F) / n - imprime[i]));
    return e;
  };
  let meilleur = null;
  for (let F = 0; F <= 120000; F += 10) {
    if (Math.abs(formule(gi, COLS[idx[0]], F) / n - imprime[idx[0]]) > 3) continue;
    for (let f = Math.max(0, F - 12); f <= F + 12; f += 0.5) {
      const e = erreur(f);
      if (!meilleur || e < meilleur.e) meilleur = { F: f, e };
    }
  }
  return meilleur || { F: NaN, e: Infinity };
}

(async () => {
  await telecharge(URL);
  const sortie = execFileSync("python", [path.join(__dirname, "al-tables-extract.py"), pdf],
    { encoding: "utf8", maxBuffer: 1 << 28, env: Object.assign({}, process.env, { PYTHONIOENCODING: "utf-8" }) });
  const { rows, schedule } = JSON.parse(sortie);

  let msEcarts = 0, msGroupes = 0, lignes = 0, cellules = 0, mauvaises = 0, maxEcart = 0;
  let temoin = 0, temoinEchecs = 0, ecartFed = 0, nFed = 0, maxEcartEtat = 0;
  const parPeriode = {};
  for (const r of rows) {
    const n = PERIODES[r.periode];
    const gi = n * r.hi;                       // les tables sont calculees sur le HAUT de la tranche
    const v = r.vals;
    lignes++; parPeriode[r.periode] = (parPeriode[r.periode] || 0) + 1;
    for (const g of Object.keys(GROUPES)) {
      const idx = indices(g);
      const b = meilleurFederal(gi, n, v, idx);
      if (!b) continue;
      cellules += idx.length;
      if (g === "MS") { msGroupes++; if (!(b.e <= 0.51)) msEcarts++; continue; }
      const bon = b.e <= 0.51;
      if (bon) maxEcart = Math.max(maxEcart, b.e);
      if (!bon) {
        mauvaises++;
        if (mauvaises < 10) console.log("  ECHEC | %s ligne %d-%d, groupe %s : meilleur ecart %s $ (federal deduit %s)", r.periode, r.lo, r.hi, g, b.e.toFixed(2), b.F);
      }
      /* temoin : la formule sans impot federal doit s'ecarter des cellules */
      for (const i of idx) {
        if (v[i] === 0) continue;
        temoin++;
        if (Math.abs(formule(gi, COLS[i], 0) / n - v[i]) > 1.5) temoinEchecs++;
      }
      /* informatif : federal suppose par les tables (annuel) vs notre moteur */
      if (g === "S" && n === 1 && gi >= 20000) {
        const e = calcul("alabama", gi, "single");
        ecartFed = Math.max(ecartFed, Math.abs(b.F - e.federal)); nFed++;
        maxEcartEtat = Math.max(maxEcartEtat, Math.abs(e.etat - v[1]));
      }
    }
  }

  /* 4. Le bareme des deductions standard imprime (p. 8), contre la formule ET le site. */
  const S = R.states.alabama;
  const statutSite = { M: "marriedJoint", H: "headOfHousehold", S: "single" };
  let tr = 0, trMauvaises = 0, trSite = 0, trSiteMauvaises = 0;
  for (const [st, lignesSched] of Object.entries(schedule)) {
    for (const [de, a, montant] of lignesSched) {
      for (const gi of [de, a === null ? de + 40000 : a, a === null ? de : (de + a) / 2]) {
        tr++;
        if (deduction(gi, st) !== montant) { trMauvaises++; console.log("  ECHEC | bareme p. 8 %s %s-%s : imprime %s, formule %s", st, de, a, montant, deduction(gi, st)); }
        if (st !== "MS") {                                           // le site n'a pas le statut MS
          trSite++;
          const site = deductionEtat(S, statutSite[st], gi) - S.incomeTax.personalExemption[statutSite[st]];
          if (site !== montant) { trSiteMauvaises++; console.log("  ECHEC | site %s a %s : site %s, imprime %s", st, gi, site, montant); }
        }
      }
    }
  }

  /* 5. Le site contre la formule : exemption et taux. */
  let siteTests = 0, siteMauvais = 0;
  for (const [st, lettre] of [["single", "S"], ["marriedJoint", "M"], ["headOfHousehold", "H"]]) {
    if (S.incomeTax.personalExemption[st] !== EXEMPTION[lettre]) { siteMauvais++; console.log("  ECHEC | exemption du site", st); }
    siteTests++;
    for (const x of [0, 1, 499, 500, 501, 999, 1000, 1001, 2999, 3000, 3001, 5999, 6000, 6001, 40000, 200000]) {
      siteTests++;
      const att = impot(x, lettre === "M" ? BAREME_M : BAREME_S);
      const site = progressiveTax(x, S.incomeTax.brackets[st]);
      if (Math.abs(att - site) > 1e-9) { siteMauvais++; console.log("  ECHEC | bareme du site %s a %s : %s contre %s", st, x, site, att); }
    }
  }
  const capInfini = Object.values(S.incomeTax.federalTaxSubtraction.capByWages).every(t => t.length === 1 && t[0][1] === Infinity);
  if (!capInfini) { siteMauvais++; console.log("  ECHEC | le federal retranche doit etre sans plafond"); }

  const eng = calcul("alabama", 75000, "single");
  console.log("\nlignes de tables lues : %d (%s)", lignes, Object.entries(parPeriode).map(([k, v]) => k + " " + v).join(", "));
  console.log("cellules recoupees : %d, ecart maximal %s $ par cellule, %d groupe(s) en ECHEC", cellules, maxEcart.toFixed(3), mauvaises);
  console.log("MS (non modelise, hors verdict) : %d groupes, %d s'ecartent de plus de 0,51 $ (lignes de tranche a cheval sur un palier de 250 $ de la deduction MS)", msGroupes, msEcarts);
  console.log("temoin negatif (formule sans impot federal) : %d cellules non nulles, %d s'ecartent de plus de 1,50 $", temoin, temoinEchecs);
  console.log("bareme des deductions p. 8 : %d lectures (formule) %d ECHEC ; %d lectures (site) %d ECHEC", tr, trMauvaises, trSite, trSiteMauvaises);
  console.log("donnees du site (exemptions, taux, federal sans plafond) : %d controles, %d ECHEC", siteTests, siteMauvais);
  console.log("informatif : le federal suppose par les tables (annuel, celibataire) differe de notre moteur de %s $ au plus (%d lignes) ;", ecartFed.toFixed(0), nFed);
  console.log("             l'impot d'Etat de notre moteur differe de la cellule imprimee de %s $ au plus (colonne S, 0 personne a charge, annuel) ;", maxEcartEtat.toFixed(0));
  console.log("             a 75 000 $ celibataire notre moteur donne %s $ d'impot d'Etat.", eng.etat.toFixed(2));
  const ok = mauvaises === 0 && lignes === 3600 && Object.keys(parPeriode).length === 6 && cellules > 50000 &&
             temoin > 0 && temoinEchecs / temoin > 0.9 &&
             trMauvaises === 0 && trSiteMauvaises === 0 && tr >= 240 && siteMauvais === 0;
  console.log("\n=== RETENUE AL : %s ===", ok ? "OK" : "ECHEC");
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error("INDETERMINE :", e.message); process.exit(2); });
