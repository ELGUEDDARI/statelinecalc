/* Construit /paycheck-calculator/maryland/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Maryland est le 35e Etat publie, reporte depuis le 17/09 (impot local a 24
 * juridictions). Il reutilise deux mecanismes deja au moteur : l'impot de comte
 * (Indiana, countyTax) et la deduction par palier de revenu (Ohio). Ce qu'il a de
 * propre :
 *
 *   1. DEUX COUCHES D'IMPOT SUR LE REVENU, RETENUES ENSEMBLE, sur la MEME base :
 *      (salaire - 3 400 $ de deduction standard - 3 200 $ par exemption MW507).
 *      Etat : 4,75 % a 6,5 % (la retenue ignore les taux de 2, 3 et 4 %, « without
 *      considering the tax rates in effect that are less than 4.75% »). Local : le
 *      taux du comte de residence ou de Baltimore City, 2,25 % a 3,30 %.
 *   2. LE GUIDE NE PUBLIE QUE DIX TABLES LOCALES (2,25 ... 3,30 %) pour 24
 *      juridictions : « Use the rate that equals or slightly exceeds the actual
 *      local income tax rate ». Carroll (3,03 %) se retient donc a 3,05 %. Le
 *      moteur retient le taux de TABLE, la page montre les deux.
 *   3. ANNE ARUNDEL ET FREDERICK ont un taux local progressif. Le Guide ne dit PAS
 *      quelle table s'applique : choix de modelisation, DIT sur la page.
 *   4. LES EXEMPTIONS DISPARAISSENT quand le revenu monte (MW507, ligne f :
 *      « Drop any fraction ») : 1 exemption (celibataire) jusqu'a 100 000 $, puis 0.
 *   5. FAMLI : AUCUNE COTISATION EN 2026. « Starting January 2027, your employer
 *      will deduct your share from each paycheck » (paidleave.maryland.gov).
 *   6. BALTIMORE CITY n'est pas un comte mais se retient comme un comte.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * marylandcomptroller.gov, dls.maryland.gov, paidleave.maryland.gov,
 * labor.maryland.gov : HTTP 200 le 06/10/2026. Dates et citations :
 * data/rates-2026.js (bloc MARYLAND) et .tooling/lib/sources.js (PAR_ETAT.maryland).
 * Recoupement machine : .tooling/test/verif-retenue-md.js.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Maryland has no SDI / no employee unemployment tax » : aucun document
 *     lu n'en decrit, ce qui n'est pas une preuve : « we found no » ;
 *   - pas de montant de base chomage (8 500 $ sur la page du DOL, releve par une loi
 *     de 2025 : le montant 2026 n'est pas lu) ;
 *   - pas de « Anne Arundel withholds X » : le Guide ne dit pas quelle table
 *     s'applique a ces deux comtes ;
 *   - 401(k) : le Guide dit « Total wages (before any deductions) » sans parler du
 *     401(k) : choix de modelisation, dit sur la page ;
 *   - pas de personnes a charge, 65 ans / aveugle (1 000 $), deductions detaillees,
 *     retenue supplementaire (ligne 2 du MW507), non-residents, residents qui
 *     travaillent au Delaware.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-maryland.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, tauxLocal } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "maryland";
const NOM = "Maryland";
const URL = "https://statelinecalc.com/paycheck-calculator/maryland/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MD = R.states[CLE];
const BR = MD.incomeTax.brackets;
const DED = MD.incomeTax.standardDeduction.single;            // 3 400
const EXEMPTION = 3200;                                       // Guide, tables « Annually »
const CT = MD.incomeTax.countyTax;
const LIGNES = Object.entries(CT.rates).map(([cle, l]) => ({ cle, nom: l[0], taux: l[1], opts: l[2] || {} }));
const DEF = CT.rates[CT.defaultCounty];                       // ["Montgomery", 0.032, ...]
const TAUX_DEF = DEF[1];
const fedDed = R.federal.standardDeduction;
const estGrad = c => !!c.opts.graduated;
const reel = c => estGrad(c) ? null : c.opts.actual;
const simples = LIGNES.filter(c => !estGrad(c));
const parReel = simples.slice().sort((a, b) => reel(a) - reel(b) || a.nom.localeCompare(b.nom));
const bas1 = parReel[0], bas2 = parReel[1], bas3 = parReel[2];
const haut = parReel.filter(c => reel(c) === reel(parReel[parReel.length - 1]));   // Dorchester, Kent
const n320 = LIGNES.filter(c => reel(c) === 0.032).length;
const AA = CT.rates["anne-arundel"], FR = CT.rates.frederick;
const IMPOSABLE_75 = 75000 - DED - EXEMPTION;                 // 68 400

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const loc = r => r.programmes.filter(p => p.county).reduce((t, p) => t + p.montant, 0);
const comteDe = (brut, cle, statut = "single", rp = 0) => calcul(CLE, brut, statut, rp, cle);

const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = (a75.etat + loc(a75)) - (r401.etat + loc(r401));
const a100 = calcul(CLE, 100000), a100p = calcul(CLE, 100001);
const sautExemption = (a100p.etat + loc(a100p)) - (a100.etat + loc(a100));
const wor75 = comteDe(75000, bas1.cle);
const kent75 = comteDe(75000, "kent");
const ecartComtes = wor75.net - kent75.net;
const aa75 = comteDe(75000, "anne-arundel");
const aaMarie = comteDe(75000, "anne-arundel", "marriedJoint");
const carroll75 = comteDe(75000, "carroll");
const carrollReel = IMPOSABLE_75 * 0.0303;
const BONUS = 5000;
const TAUX_PRIME = 0.065 + TAUX_DEF;                          // 9,70 % : table 3.20 % du Guide
const prime = BONUS * TAUX_PRIME;
const FAMLI = 75000 * 0.0045;

/* Voisins : les deux Etats frontaliers deja publies (Pennsylvanie, Virginie). */
const REF = 75000;
const { PUBLIES: PUB, grilleEtats } = require("../lib/etats-publies.js");
const COMPARE = [CLE, "pennsylvania", "virginia"];
const NOMS = { [CLE]: "Maryland", pennsylvania: "Pennsylvania", virginia: "Virginia" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const pa75 = calcul("pennsylvania", REF), va75 = calcul("virginia", REF);
/* Les autres Etats frontaliers : on dit lesquels n'ont pas de calculateur, sans les inventer. */
const FRONTALIERS = ["Delaware", "Pennsylvania", "Virginia", "West Virginia"];
const absents = FRONTALIERS.filter(n => !PUB[n]);

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des 24 juridictions : taux reel (memorandum), taux de la table utilise
   par le moteur sur 68 400 $ imposables (celibataire), impot local et net sur 75 000 $. */
const plage = s => pct2(s[0][1]) + " to " + pct2(s[s.length - 1][1]);
const tauxTable = c => tauxLocal(CT.rates[c.cle], "single", IMPOSABLE_75);
const lignesComtes = LIGNES.slice().sort((a, b) => a.nom.localeCompare(b.nom)).map(c => {
  const r = comteDe(75000, c.cle);
  const nom = c.opts.city ? c.nom : c.nom + " County";
  const reelTxt = estGrad(c) ? plage(c.opts.actualSchedule.single) + " (graduated)" : pct2(c.opts.actual);
  return "        <tr><th scope=\"row\">" + nom + "</th><td class=\"num\">" + reelTxt + "</td><td class=\"num\">" +
         pct2(tauxTable(c)) + "</td><td class=\"num\">" + $$(loc(r)) + "</td><td class=\"num\">" + $(r.net) + "</td></tr>";
}).join("\n");

/* Les options du selecteur : « Montgomery County (3.2%) », defaut Montgomery. */
const optionsComtes = LIGNES.slice().sort((a, b) => a.nom.localeCompare(b.nom)).map(c => {
  const nom = c.opts.city ? c.nom : c.nom + " County";
  const t = estGrad(c) ? pct2(c.opts.actualSchedule.single[0][1]) + "&ndash;" +
    pct2(c.opts.actualSchedule.single.slice(-1)[0][1]) : pct2(c.opts.actual);
  return "            <option value=\"" + c.cle + "\"" + (c.cle === CT.defaultCounty ? " selected" : "") + ">" + nom + " (" + t + ")</option>";
}).join("\n");

/* Le tableau de la valeur d'une exemption (MW507, page 2) et celui des exemptions que le
   calculateur laisse passer, lu dans deductionByIncome. */
const MW507 = [
  ["$100,000 or less", "$3,200", "$3,200"],
  ["$100,001 to $125,000", "$1,600", "$3,200"],
  ["$125,001 to $150,000", "$800", "$3,200"],
  ["$150,001 to $175,000", "$0", "$1,600"],
  ["$175,001 to $200,000", "$0", "$800"],
  ["Over $200,000", "$0", "$0"]
];
const tableMw507 = MW507.map(([a, s, j]) => "        <tr><th scope=\"row\">" + a + "</th><td class=\"num\">" + s + "</td><td class=\"num\">" + j + "</td></tr>").join("\n");
const bornes = ["Up to $100,000", "$100,001 to $150,000", "$150,001 to $175,000", "Over $175,000"];
const tableExempt = MD.incomeTax.deductionByIncome.map((p, i) => {
  const n = k => (p.amounts[k] - DED) / EXEMPTION;
  return "        <tr><th scope=\"row\">" + bornes[i] + "</th><td class=\"num\">" + n("single") + "</td><td class=\"num\">" + n("marriedJoint") + "</td><td class=\"num\">" + n("headOfHousehold") + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Maryland income tax withholding rate in 2026?",
   "Maryland withholds two layers of income tax from the same wages. The state layer runs from " + N(pct2(0.0475)) + " to " + N(pct(0.065)) + ", rising with taxable pay, and the local layer is the rate set by your county or Baltimore City, from " +
   N(pct2(bas1.opts.actual)) + " to " + N(pct2(reel(haut[0]))) + ". Both are figured after a " + $(DED) + " standard deduction and " + $(EXEMPTION) + " for each exemption on Form MW507. On a single filer&rsquo;s " + $(75000) + " salary in " + DEF[0] +
   " County, state withholding is " + $$(a75.etat) + " a year and local withholding is " + $$(loc(a75)) + "."],

  ["How much Maryland tax is withheld on a $75,000 salary?",
   "For a single filer with one exemption in " + DEF[0] + " County, Maryland withholds " + $$(a75.etat + loc(a75)) + " a year, which is " + $$((a75.etat + loc(a75)) / 12) + " a month. " +
   "That is " + $(75000) + " minus " + $(DED) + " minus " + $(EXEMPTION) + " = " + $(IMPOSABLE_75) + " of taxable wages, taxed at " + pct2(0.0475) + " for the state (" + $$(a75.etat) + ") and " + pct2(TAUX_DEF) +
   " for the county (" + $$(loc(a75)) + "), " + pct2(0.0475 + TAUX_DEF) + " in all. A married filer who claims a spouse&rsquo;s exemption too has " + $(75000 - DED - 2 * EXEMPTION) + " of taxable wages and " +
   $$(j75.etat + loc(j75)) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Maryland?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer in " + DEF[0] + " County with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " +
   $$(a75.etat) + " of Maryland income tax and " + $$(loc(a75)) + " of " + DEF[0] + " County income tax &mdash; " +
   "an effective rate of " + (a75.taux * 100).toFixed(1) + "%. In " + bas1.nom + " County, at " + pct2(bas1.opts.actual) + ", the same salary keeps " + $(wor75.net) +
   "; in " + haut[0].nom + " County, at " + pct2(reel(haut[0])) + ", it keeps " + $(kent75.net) + "."],

  ["How much is $20, $25 or $30 an hour after taxes in Maryland?",
   "At 40 hours a week in " + DEF[0] + " County, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with one exemption, " +
   "after federal tax, FICA, Maryland withholding and local withholding, with no retirement contribution."],

  ["How does Maryland&rsquo;s local income tax work?",
   "Each of Maryland&rsquo;s 23 counties and Baltimore City sets its own local income tax rate, and your employer withholds it along with the state tax. The Comptroller&rsquo;s withholding guide says to use the rate for the area where the employee lives, " +
   "and the Comptroller&rsquo;s memorandum says the county on your Form MW507 decides the local portion. Both layers are figured on the same taxable wages, so on " + $(IMPOSABLE_75) + ", " + N(pct2(0.0475)) + " goes to the state and your local rate goes to your county. " +
   "The guide tells employers to report the two together as one amount in box 17 of the W-2, so your pay stub may show only a single state tax line. The calculator above splits them in two and starts with " + DEF[0] + " County (" + pct2(TAUX_DEF) + ")."],

  ["Which Maryland counties have the highest and lowest local income tax rates?",
   "In the Comptroller&rsquo;s 2026 memorandum, " + haut.map(c => c.nom).join(" and ") + " counties have the highest flat rate, " + N(pct2(reel(haut[0]))) + ", and " + n320 + " of the 24 jurisdictions charge " + N(pct2(0.032)) + ". The lowest flat rates are " + bas1.nom + " County at " +
   N(pct2(bas1.opts.actual)) + ", " + bas2.nom + " at " + N(pct2(bas2.opts.actual)) + " and " + bas3.nom + " at " + N(pct2(bas3.opts.actual)) + ". Anne Arundel and Frederick counties charge graduated rates instead. On a " + $(75000) +
   " salary the gap between " + bas1.nom + " and " + haut[0].nom + " is " + $$(ecartComtes) + " a year in take-home pay before rounding. The full list is in the table above."],

  ["Why does the calculator use 3.05% for Carroll County when its rate is 3.03%?",
   "Because that is what Maryland&rsquo;s withholding method does. The Comptroller publishes percentage tables for ten local rates only, from 2.25% to 3.30%, and tells employers to &ldquo;use the rate that equals or slightly exceeds the actual local income tax rate to ensure that sufficient tax is withheld.&rdquo; " +
   "Carroll and Charles counties (3.03%) use the 3.05% table, Cecil (2.74%) uses 2.75%, Harford (3.06%) uses 3.10% and Washington (2.95%) uses 3.00%. On " + $(IMPOSABLE_75) + " of taxable wages, Carroll&rsquo;s table rate withholds " + $$(loc(carroll75)) +
   " instead of " + $$(carrollReel) + ", a difference of " + $$(loc(carroll75) - carrollReel) + " a year. The table column above shows both rates."],

  ["How are Anne Arundel and Frederick counties different?",
   "Their local rates rise with taxable income. A single filer in Anne Arundel pays " + pct2(0.027) + " on the first " + $(50000) + ", " + pct2(0.0294) + " up to " + $(400000) + " and " + pct2(0.032) + " above that; Frederick&rsquo;s steps for a single filer are " + pct2(0.0225) + ", " + pct2(0.0275) + ", " + pct2(0.0296) + " and " + pct2(0.032) + ". " +
   "The withholding guide does not say which of its ten tables an employer should use for those two counties, so this calculator applies the table that equals or slightly exceeds the rate for your taxable income, to all of it, the way the guide&rsquo;s other tables work. " +
   "On " + $(75000) + ", a single filer in Anne Arundel has " + $$(loc(aa75)) + " withheld at the 3.00% table, and a married filer has " + $$(loc(aaMarie)) + " at the 2.75% table. Your employer may use a different method."],

  ["How many exemptions should I claim on Form MW507, and what happens above $100,000?",
   "Claim the personal exemptions you will take on your tax return, one for yourself and one for a spouse who has no wages. Each is worth " + $(EXEMPTION) + " in the withholding formula. " +
   "If you expect adjusted gross income above $100,000 ($150,000 if you file jointly or as head of household), Form MW507 sends you to a worksheet, because the value of an exemption shrinks and then disappears. " +
   "Its last step says to divide by " + $(EXEMPTION) + " and &ldquo;drop any fraction,&rdquo; so a single filer between $100,001 and $125,000, whose exemption is worth $1,600, can claim none. " +
   "This calculator follows that rule: one extra dollar of pay at $100,001 costs about " + $$(sautExemption) + " more in Maryland tax withholding than at $100,000."],

  ["Does a 401(k) contribution lower my Maryland withholding?",
   "In this calculator, yes. The Comptroller&rsquo;s guide starts from &ldquo;total wages (before any deductions)&rdquo; and does not discuss employee 401(k) contributions, so we apply the same treatment as the federal tax on this page, " +
   "which treats a traditional 401(k) contribution as reducing taxable pay. That is a modeling choice, and we can&rsquo;t confirm how a given employer handles it. On $75,000 with 6% going into a 401(k), Maryland state and local withholding together fall by " +
   $$(gain401) + " a year. Social Security and Medicare are still calculated on your gross pay."],

  ["Does Maryland take paid leave, unemployment or disability out of my paycheck in 2026?",
   "Not in the documents we read. Maryland&rsquo;s Family and Medical Leave Insurance program has a contribution of 0.9% of wages, up to the Social Security wage cap, and the Department of Labor says employees pay up to half of that, 0.45%, starting in January 2027, " +
   "which would be up to " + $$(FAMLI) + " a year on " + $(75000) + ". Nothing is deducted for it in 2026, so the calculator takes none. The Department of Labor describes unemployment taxes as paid by employers, and we found no employee deduction for unemployment insurance or for state disability insurance, " +
   "but a pay stub is the final word, so look for any line we did not model."],

  ["I live in Virginia, Pennsylvania, DC or West Virginia and work in Maryland. Is Maryland tax withheld?",
   "It depends on where you live and how long you keep a home in Maryland. Form MW507 lets residents of the District of Columbia, Virginia and West Virginia who work in Maryland and do not keep a place of abode there for 183 days or more claim an exemption from withholding. " +
   "Pennsylvania residents can claim an exemption from the state portion only; they are still withheld at the local rate of the Maryland county where they work, unless they live in York or Adams County, Pennsylvania, or in another Pennsylvania locality that does not tax Maryland residents&rsquo; earnings, and claim the local exemption. " +
   "For most other nonresidents the guide uses a flat nonresident rate with no local tax, plus a special 2.25% nonresident tax. This calculator assumes a Maryland resident."],

  ["How are bonuses withheld in Maryland?",
   "For a lump sum annual bonus, the Comptroller&rsquo;s guide says to withhold at the highest state rate, 6.50%, plus the highest local rate for the county of residence. In the 3.20% county table, that is " + pct2(TAUX_PRIME) + ". " +
   "On a " + $(BONUS) + " bonus in a 3.20% county, that is " + $$(prime) + " before federal tax. The calculator does not model bonuses."],

  ["Why is my Maryland paycheck different from this calculator?",
   "Common reasons: your county on Form MW507 is not the one selected here, or your employer uses a different table for it; you claimed a different number of exemptions, for dependents, age 65 or older, blindness or large itemized deductions; you asked for an extra amount to be withheld from each paycheck; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. Withholding is also only an estimate of what you will owe; the difference is settled when you file."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. */
const dec = s => s.replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Maryland withholds 4.75% to 6.5% in state income tax in 2026, plus a local income tax of 2.25% to 3.30% set by your county or Baltimore City. " +
  "On $75,000 in Montgomery County, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Maryland (MD) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Maryland (MD) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, Maryland income tax and your county or Baltimore City income tax.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Maryland (MD) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Maryland withholds 4.75% to 6.5% in 2026 plus a local income tax of 2.25% to 3.30%. On $75,000 in Montgomery County a single filer keeps about ${$(a75.net)}.">
<meta property="og:url" content="${URL}">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:type" content="website">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "Maryland Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Maryland take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Maryland income tax withheld at 4.75% to 6.5% after a ${$(DED)} standard deduction and ${$(EXEMPTION)} per exemption, and the local income tax for the county or Baltimore City you choose, from 2.25% to 3.30%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Maryland", "item": "${URL}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": ${JSON.stringify(dec(n))}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(dec(a))} } }`).join(",\n")}
      ]
    },
    ${JSON.stringify(organisation, null, 2).split("\n").map((l, i) => i ? "    " + l : l).join("\n")}
  ]
}
</script>
</head>
<body>

${entete("paycheck")}

<main class="wrap">
<div class="col-contenu">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Maryland</li>
  </ol>
</nav>

  <h1>Maryland Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Maryland take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="${CLE}" novalidate>
      <div class="field">
        <label for="salary">Your gross pay or hourly rate</label>
        <input type="text" id="salary" name="salary" inputmode="decimal" value="75000"
               autocomplete="off">
        <span class="help">Before any taxes or deductions. Do not include tips paid in cash.</span>
        <span class="error" role="alert">Enter an amount greater than zero.</span>
      </div>

      <div class="field" data-hours-field hidden>
        <label for="hours">Hours per week</label>
        <input type="text" id="hours" name="hours" inputmode="decimal" value="40"
               autocomplete="off">
        <span class="help">Only asked when something here is per hour. We use the hours you
        actually work, not an assumed 2,080 a year.</span>
      </div>

      <div class="field">
        <label for="county">Your Maryland county, or Baltimore City</label>
        <select id="county" name="county">
${optionsComtes}
        </select>
        <span class="help">Sets the local income tax withheld with your state tax. We start with ${DEF[0]}
        County. The rate shown is the county&rsquo;s actual 2026 rate; the calculator uses the
        Comptroller&rsquo;s nearest withholding table at or above it.</span>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="period">How often you are paid</label>
          <select id="period" name="period">
            <option value="annual" selected>Per year</option>
            <option value="hourly">Per hour</option>
            <option value="monthly">Per month</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">This tells us what the amount above represents.</span>
        </div>

        <div class="field">
          <label for="filing">Filing status</label>
          <select id="filing" name="filing">
            <option value="single" selected>Single</option>
            <option value="marriedJoint">Married filing jointly</option>
            <option value="headOfHousehold">Head of household</option>
          </select>
          <span class="help">Sets your federal brackets and standard deduction, the Maryland rate scale
          (married and head of household use the joint scale), and the exemptions: one for single or head of household, two for a married filer
          whose spouse has no wages.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Maryland state and local withholding too.</span>
        </div>

        <div class="field">
          <label for="display">Show results</label>
          <select id="display" name="display">
            <option value="monthly" selected>Per month</option>
            <option value="hourly">Per hour</option>
            <option value="annual">Per year</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">Changes the period, not the calculation.</span>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Calculate</button>
    </form>

    <div class="result" data-paycheck-result aria-live="polite"></div>

    <p class="caption u-mt-3">
      Everything is calculated in your browser. Nothing you type is sent to us or stored.
    </p>
  </section>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>How this calculator works</h2>
    <p>Maryland withholds income tax in two layers, and the Comptroller of Maryland&rsquo;s employer withholding guide sets out how. The employer starts with your wages for the year, subtracts a ${N($(DED))} standard deduction, subtracts ${N($(EXEMPTION))} for every
    exemption claimed on Form MW507, the state&rsquo;s withholding certificate, and applies a percentage to what is left. The first layer is the state rate, which rises from ${N(pct2(0.0475))} to ${N(pct(0.065))} as taxable pay grows. The second is your local rate, set by the county where you
    live or by Baltimore City, from ${N(pct2(bas1.opts.actual))} to ${N(pct2(reel(haut[0])))}. Both are taken from the same taxable wages and withheld together.
    </p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Maryland income tax</strong>: your wages after any 401(k) contribution, minus
      ${N($(DED))} and the exemptions (${N($(EXEMPTION))} each), run through the state rates of ${N(pct2(0.0475))}, 5.00%, 5.25%, 5.50%, 5.75%, 6.25% and ${N(pct(0.065))}. A single filer reaches 5.00% above ${N("$100,000")}
      of taxable wages; a married filer or head of household above ${N("$150,000")}.</li>
      <li><strong>Local income tax</strong>: the same taxable wages times the rate for the county or Baltimore City you pick.
      We show it as its own line, labeled with the place and the rate.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Maryland, the <strong>Comptroller of Maryland</strong>&rsquo;s Employer Withholding Guide, effective January 2026, with its ten local rate tables; Form MW507 for the exemptions; the Comptroller&rsquo;s February 2026 memorandum for the rate in each county and Baltimore City, checked against the
    Department of Legislative Services; and the Maryland Department of Labor. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The guide has ten local tables for 24 places.</strong> Maryland tells employers to use the table whose rate &ldquo;equals or slightly exceeds&rdquo; the county&rsquo;s actual rate, so a few counties are withheld at a slightly higher rate than they charge. The county table
    below shows both. Carroll County, at ${N(pct2(0.0303))}, is withheld at ${N(pct2(0.0305))}, which on ${N($(IMPOSABLE_75))} of taxable wages is ${N($$(loc(carroll75) - carrollReel))} a year more than the actual rate would give.</p>

    <p><strong>Which county we start with, and why it matters.</strong> There is no single Maryland local rate, so we have to assume a place until you pick yours. We start with ${DEF[0]} County at ${N(pct2(TAUX_DEF))}, the rate ${n320} of the 24 jurisdictions charge.
    A different county changes your take-home pay: on ${N($(75000))}, a single filer keeps ${N($(wor75.net))} in ${bas1.nom} County and ${N($(kent75.net))} in ${haut[0].nom} County, a gap of ${N($$(ecartComtes))} a year before rounding the two take-home figures. Unless we say otherwise, the figures on this page, including the headline
    figure at the top, use ${DEF[0]} County.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer withholds from each paycheck using the Comptroller&rsquo;s method. Your actual Maryland income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: a different number of exemptions than the
    one it assumes, dependents, age 65 or older, blindness, itemized deductions, an extra amount withheld per paycheck, multiple jobs, bonuses and other lump sum payments, the
    exemption for residents of DC, Virginia and West Virginia who work here, nonresident rates, wages under $5,000 a year (the guide says not to withhold on them, so the calculator shows $0 of Maryland tax there), Maryland residents who work in Delaware, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Maryland take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption in ${DEF[0]} County, no retirement contribution, 2026 state and federal rates. The
  MD state + local tax column adds Maryland income tax withholding to ${DEF[0]} County income tax withholding.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Maryland take-home pay, single filer, ${DEF[0]} County
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MD state + local tax</th>
          <th scope="col">Take-home</th>
          <th scope="col">Per month</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableSalaires}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

    <h2>Maryland local income tax rates and what they cost on $75,000</h2>
    <p>The second column is each place&rsquo;s actual 2026 rate from the Comptroller&rsquo;s memorandum of February 4, 2026, which the Department of Legislative Services table repeats. The third is the table rate the withholding method uses, found by looking up ${N($(IMPOSABLE_75))} of taxable wages (a single filer
    with one exemption) in the Comptroller&rsquo;s ten tables. The fourth is the local tax on those wages, and the fifth is what that filer keeps after every deduction on this page. The state tax is the same ${N($$(a75.etat))} everywhere.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Maryland local income tax rates, 2026, and take-home pay on $75,000, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">County or city</th>
          <th scope="col">Actual 2026 rate</th>
          <th scope="col">Rate withheld at</th>
          <th scope="col">Local tax a year</th>
          <th scope="col">Take-home a year</th>
        </tr>
      </thead>
      <tbody>
${lignesComtes}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>What Form MW507 and the standard deduction subtract from your wages</h2>
    <p>The Comptroller&rsquo;s method uses one standard deduction, ${N($(DED))}, for every filer, then ${N($(EXEMPTION))} for each exemption you claim on Form MW507. For a single filer with one exemption on ${N($(75000))}, that is
    ${N($(75000))} &minus; ${N($(DED))} &minus; ${N($(EXEMPTION))} = ${N($(IMPOSABLE_75))}, which is then taxed at ${N(pct2(0.0475))} for the state, ${N($$(a75.etat))}, and ${N(pct2(TAUX_DEF))} for ${DEF[0]} County, ${N($$(loc(a75)))}.</p>

    <p>Above ${N("$100,000")} of adjusted gross income ($150,000 if you file jointly or as head of household), the form sends you to a worksheet because the value of an exemption shrinks. This is the table on page 2 of the 2026 form:</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Value of one exemption by federal adjusted gross income, Form MW507, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Federal adjusted gross income</th>
          <th scope="col">Single or married filing separately</th>
          <th scope="col">Joint, head of household or qualifying widow(er)</th>
        </tr>
      </thead>
      <tbody>
${tableMw507}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The worksheet then divides the total by ${N($(EXEMPTION))} and says to &ldquo;drop any fraction,&rdquo; so a half-value exemption counts as none. For the filers this calculator assumes, here is how many whole exemptions that leaves, using your pay after any 401(k) as a stand-in for adjusted gross income:</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Exemptions this calculator subtracts, by pay
      </caption>
      <thead>
        <tr>
          <th scope="col">Pay after 401(k)</th>
          <th scope="col">Single (one exemption)</th>
          <th scope="col">Married filing jointly (two)</th>
          <th scope="col">Head of household (one)</th>
        </tr>
      </thead>
      <tbody>
${tableExempt}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Maryland hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Maryland?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Maryland withholding and ${DEF[0]} County withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Maryland&rsquo;s share is
    ${N($$(h20.etat))} of state income tax withholding plus ${N($$(loc(h20)))} of local income tax for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Maryland?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. State and local income tax together are ${N($$(h25.etat + loc(h25)))}
    a year at $25 an hour, and ${N($$(h30.etat + loc(h30)))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    The Comptroller&rsquo;s guide says a lump sum annual bonus is withheld at the highest state rate, ${N(pct(0.065))}, plus the highest local rate for the county of residence, so a bonus is taxed harder than regular pay.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Maryland take-home pay by hourly rate</h3>
    <p>Single filer with one exemption in ${DEF[0]} County, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Maryland take-home pay by hourly rate, single filer, ${DEF[0]} County, 40 hours a week
      </caption>
      <thead>
        <tr>
          <th scope="col">Hourly rate</th>
          <th scope="col">Gross a year</th>
          <th scope="col">Take-home a year</th>
          <th scope="col">Per month</th>
          <th scope="col">Real hourly rate</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableHoraire}
      </tbody>
    </table>
  </div>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">

${blocLimites(CLE)}

  <h2>Key facts that affect your take-home pay in Maryland</h2>

  <h3>Two income taxes come out of the same wages</h3>
  <p>Maryland&rsquo;s withholding combines the state rate and your local rate. In ${DEF[0]} County they add up to ${N(pct2(0.0475 + TAUX_DEF))} of taxable wages up to ${N("$100,000")} for a single filer, so on ${N("$75,000")} the state tax is ${N($$(a75.etat))} and the local tax is ${N($$(loc(a75)))}.
  The guide tells employers to report the two together as one amount on the W-2, so a pay stub may show them as one line, called state tax.</p>

  <h3>The state rate starts at 4.75% for withholding</h3>
  <p>Maryland&rsquo;s income tax scale starts with rates of 2%, 3% and 4% on the first $3,000 of taxable income, but the Comptroller&rsquo;s guide says withholding schedules are made &ldquo;without considering the tax rates in effect that are less than 4.75%.&rdquo; So 4.75% applies from the first taxable dollar to ${N("$100,000")} of taxable wages, or ${N("$150,000")} for a married filer or head of household, and then the rate climbs to ${N("5.00%")}, ${N("5.25%")}, ${N("5.50%")}, ${N("5.75%")}, ${N("6.25%")} and, above ${N("$1,000,000")} (${N("$1,200,000")} jointly), ${N(pct(0.065))}. On ${N("$250,000")} the state tax is ${N($$(a250.etat))}.</p>

  <h3>Your county is the one on Form MW507</h3>
  <p>The guide says to use the rate for the area where the employee lives, and the Comptroller&rsquo;s memorandum says the county of residence on your Form MW507 decides the local portion. If you move to another county, send your employer a new form. There are 23 counties plus Baltimore City, which is not a county but is withheld like one.</p>

  <h3>The guide rounds a few counties up</h3>
  <p>Withholding tables exist for ten local rates only. Carroll and Charles counties charge ${N(pct2(0.0303))} and are withheld at ${N(pct2(0.0305))}; Cecil charges ${N(pct2(0.0274))} and uses ${N(pct2(0.0275))}; Harford charges ${N(pct2(0.0306))} and uses ${N(pct2(0.031))}; Washington charges ${N(pct2(0.0295))} and uses ${N(pct2(0.03))}.
  The difference is small, but workers in those counties have slightly more withheld than the county&rsquo;s rate would give. Withholding is settled against your actual tax when you file.</p>

  <h3>Anne Arundel and Frederick have graduated local rates</h3>
  <p>Anne Arundel County&rsquo;s local rate is ${N(pct2(0.027))} on the first ${N("$50,000")} of taxable income for a single filer, ${N(pct2(0.0294))} up to ${N("$400,000")} and ${N(pct2(0.032))} above, with higher breakpoints for joint filers. Frederick County&rsquo;s steps are ${N(pct2(0.0225))}, ${N(pct2(0.0275))}, ${N(pct2(0.0296))} and ${N(pct2(0.032))}.
  The Comptroller&rsquo;s guide does not say which table employers should use for them. We apply the table that equals or slightly exceeds the rate for your taxable income to all of it, as the guide&rsquo;s tables do, which gives a single filer on ${N("$75,000")} in Anne Arundel ${N($$(loc(aa75)))} of local tax at ${N("3.00%")}. That is our choice, not a rule the guide spells out.</p>

  <h3>Your exemptions fade out above $100,000</h3>
  <p>A single filer between ${N("$100,001")} and ${N("$125,000")} of income has an exemption worth ${N("$1,600")}, and the worksheet on Form MW507 drops fractions, so the number of exemptions is zero. Married filers keep two exemptions up to ${N("$150,000")}, one up to ${N("$175,000")} and none above. That is a cliff: a single filer who earns ${N("$100,001")} instead of ${N("$100,000")} has about ${N($$(sautExemption))} more withheld for Maryland state and local tax together.</p>

  <h3>No paid leave deduction yet, but one is scheduled for 2027</h3>
  <p>Maryland&rsquo;s Family and Medical Leave Insurance program has a contribution of 0.9% of wages up to the Social Security wage cap. The Department of Labor says employees pay up to half, 0.45%, and that employers start deducting it in January 2027. Nothing is deducted for it in 2026, so this calculator takes none. When it starts, ${N($(75000))} of pay would carry up to ${N($$(FAMLI))} a year.</p>

  <h3>We found no employee deduction for unemployment insurance</h3>
  <p>The Maryland Department of Labor describes unemployment taxes as paid by employers, and nothing we read describes an employee deduction for unemployment insurance or a state disability insurance premium, so the calculator takes no state payroll program deduction in 2026.</p>

  <h3>Your 401(k) lowers your Maryland wages</h3>
  <p>The withholding guide starts from &ldquo;total wages (before any deductions)&rdquo; and does not discuss employee 401(k) contributions. The federal tax on this page already treats a traditional 401(k) contribution as reducing taxable pay, so we apply the same treatment to the state and local tax; it is a modeling choice, not a rule the guide spells out. On ${N("$75,000")} with 6% going in, Maryland state and local withholding together fall by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in all.</p>

  <h2>Common mistakes</h2>

  <h3>Leaving out the local tax</h3>
  <p>A calculator that applies only the state rates overstates take-home pay for nearly every Maryland worker. On ${N("$75,000")} in ${DEF[0]} County the local line is ${N($$(loc(a75)))}; in ${haut[0].nom} County it is ${N($$(loc(kent75)))}.</p>

  <h3>Using one local rate for the whole state</h3>
  <p>Rates run from ${N(pct2(bas1.opts.actual))} in ${bas1.nom} County to ${N(pct2(reel(haut[0])))} in ${haut.map(c => c.nom).join(" and ")}. A single filer on ${N("$75,000")} keeps ${N($(wor75.net))} in ${bas1.nom} County and ${N($(kent75.net))} in ${haut[0].nom}.</p>

  <h3>Subtracting the federal standard deduction</h3>
  <p>The Maryland withholding method subtracts its own ${N($(DED))}, not the federal ${N($(fedDed.single))}, so a single filer on ${N("$75,000")} has ${N($(IMPOSABLE_75))} taxed by Maryland after one exemption, not the ${N($(75000 - fedDed.single))} of federal taxable income.</p>

  <h3>Assuming your exemptions never change</h3>
  <p>Exemptions are worth ${N($(EXEMPTION))} each only up to ${N("$100,000")} of income for a single filer and ${N("$150,000")} for a married filer or head of household. Above those lines the value shrinks, and the worksheet on Form MW507 can leave you with none.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the exemptions on your Form MW507 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in ${DEF[0]} County, Maryland, in 2026, claiming one exemption, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Maryland standard deduction and exemption: ${N($(DED))} + 1 &times; ${N($(EXEMPTION))} = ${N($(DED + EXEMPTION))}</li>
    <li>Taxable wages: ${N($(a75.brut))} &minus; ${N($(DED + EXEMPTION))} = ${N($(IMPOSABLE_75))}</li>
    <li>Maryland income tax: ${N($(IMPOSABLE_75))} &times; ${N(pct2(0.0475))} = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>${DEF[0]} County income tax: ${N($(IMPOSABLE_75))} &times; ${N(pct2(TAUX_DEF))} = ${N($$(loc(a75)))}
    a year, which is ${N($$(loc(a75) / 12))} on a monthly paycheck</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Maryland borders Delaware, Pennsylvania, Virginia and West Virginia, and the District of Columbia; ${absents.length ? absents.slice(0, -1).join(", ") + (absents.length > 1 ? " and " : "") + absents.slice(-1) + (absents.length > 1 ? " are" : " is") + " not published yet" : "all four are published"}.
  Maryland is shown with one exemption and the ${DEF[0]} County income tax included in its state-level deductions.</p>
  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        State-level deductions and take-home pay on ${$(REF)}, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">State</th>
          <th scope="col">State-level deductions</th>
          <th scope="col">Take-home pay</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${lignesCompare.map(l => `        <tr><th scope="row">${l.cle === CLE ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</th><td class="num">${$$(l.deductions)}</td><td class="num">${$(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>
  <p>A <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker keeps ${N($$(Math.abs(pa75.net - a75.net)))} ${pa75.net < a75.net ? "less" : "more"} than a Maryland worker in ${DEF[0]} County on the
  same salary, and a <a href="/paycheck-calculator/virginia/">Virginia</a> worker keeps ${N($$(Math.abs(va75.net - a75.net)))} ${va75.net < a75.net ? "less" : "more"}. Pennsylvania&rsquo;s figure leaves out local earned income tax, which this calculator does not model.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a> &mdash; the neighbor to the north, with a flat 3.07% from the first dollar.</li>
    <li><a href="/paycheck-calculator/virginia/">Virginia paycheck calculator</a> &mdash; the neighbor to the south, with four brackets from 2% to 5.75% and no local income tax.</li>
    <li><a href="/paycheck-calculator/indiana/">Indiana paycheck calculator</a> &mdash; the other state here that adds a county income tax to the state tax, for 92 counties.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa(NOM, { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Last updated <time datetime="${AUJOURD_HUI}">${LISIBLE}</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Maryland rates.
  </p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", CLE);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
  .split(/\s+/).filter(Boolean).length;
const motsProse = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<table[\s\S]*?<\/table>/g, " ")
  .replace(/<select[\s\S]*?<\/select>/g, " ").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots (%d hors tableaux et menus), %d H2, %d H3, %d lignes de tableau",
  mots, motsProse, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* ── Garde-fous ──────────────────────────────────────────────────────────── */
const echec = m => { console.error("ARRET : " + m); process.exit(2); };

/* 1. Recoupement independant : la methode du Guide ecrite ici A PARTIR DU TEXTE
   (taux de la table 3.20 %, colonne « Annually », imprimee : 7,95 % de 0 a 100 000 $
   imposables celibataire ; 150 000 $ joint), pas du moteur. */
const TABLE_320 = 0.0795;
const verifs = [["single", a75, 75000, 1, "montgomery"], ["marriedJoint", j75, 75000, 2, "montgomery"], ["headOfHousehold", h75, 75000, 1, "montgomery"],
                ["single", h20, 20 * HEURES, 1, "montgomery"], ["single", h25, 25 * HEURES, 1, "montgomery"], ["single", h30, 30 * HEURES, 1, "montgomery"]];
for (const [statut, r, brut, n, cle] of verifs) {
  const imposable = brut - 3400 - n * 3200;
  const attendu = imposable * TABLE_320;                    // table 3.20 % : Etat + local
  if (Math.abs(attendu - (r.etat + loc(r))) > 0.006) echec(statut + " " + brut + " $ : table 3.20 % " + attendu.toFixed(3) + ", moteur " + (r.etat + loc(r)).toFixed(3));
}
/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 3249.00, "etat 75 000"], [loc(a75), 2188.80, "Montgomery 75 000"], [a75.net, 56154.70, "net 75 000"],
  [j75.etat, 3097.00, "etat marie"], [loc(j75), 2086.40, "Montgomery marie"], [j75.etat + loc(j75), 5183.40, "etat + local marie"],
  [h75.etat, 3249.00, "etat chef de famille"], [a75.etat + loc(a75), 5437.80, "etat + local 75 000"],
  [h20.net, 32823.10, "net 20 $/h"], [h25.net, 40352.70, "net 25 $/h"], [h30.net, 47882.30, "net 30 $/h"],
  [h25.etat + loc(h25), 3609.30, "etat + local 25 $/h"], [h30.etat + loc(h30), 4436.10, "etat + local 30 $/h"],
  [a250.etat, 12625.50, "etat 250 000"], [loc(a250), 7891.20, "local 250 000"], [a250.net, 162665.30, "net 250 000"],
  [loc(wor75), 1539.00, "Worcester"], [loc(kent75), 2257.20, "Kent"], [ecartComtes, 718.20, "ecart Worcester / Kent"],
  [loc(aa75), 2052.00, "Anne Arundel 75 000"], [loc(aaMarie), 1793.00, "Anne Arundel marie"],
  [loc(carroll75), 2086.20, "Carroll"], [carrollReel, 2072.52, "Carroll au taux reel"],
  [gain401, 357.75, "gain 401(k)"], [sautExemption, 254.4795, "saut a 100 001 $"],
  [prime, 485.00, "prime 5 000 $"], [FAMLI, 337.50, "FAMLI 0,45 % de 75 000 $"], [IMPOSABLE_75, 68400, "imposable 75 000"],
  [a75.federal, 7670, "federal 75 000"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(DED === 3400 && EXEMPTION === 3200 && BR.single[0][1] === 0.0475 && BR.single[BR.single.length - 1][1] === 0.065)) echec("deduction / exemption / taux != moteur");
if (!(LIGNES.length === 24 && DEF[0] === "Montgomery" && TAUX_DEF === 0.032)) echec("24 juridictions et defaut Montgomery 0,032 attendus");
if (!(bas1.nom === "Worcester" && bas1.opts.actual === 0.0225 && bas2.nom === "Talbot" && bas2.opts.actual === 0.024 && bas3.nom === "Garrett" && bas3.opts.actual === 0.0265)) echec("les trois comtes les moins taxes ne sont plus Worcester, Talbot et Garrett");
if (!(haut.map(c => c.nom).join() === "Dorchester,Kent" && reel(haut[0]) === 0.033)) echec("les comtes les plus taxes ne sont plus Dorchester et Kent a 3,30 %");
if (!(n320 === 12)) echec("12 juridictions a 3,20 % attendues, " + n320);
if (!(estGrad(LIGNES.find(c => c.cle === "anne-arundel")) && estGrad(LIGNES.find(c => c.cle === "frederick")) && LIGNES.filter(estGrad).length === 2)) echec("Anne Arundel et Frederick sont les deux seuls comtes progressifs");
if (!(AA[2].actualSchedule.single[0][1] === 0.027 && FR[2].actualSchedule.single[2][1] === 0.0296)) echec("baremes progressifs != memorandum");
if (!(pa75.net !== a75.net && va75.net !== a75.net)) echec("la comparaison (PA, VA) n'est plus celle ecrite");
if (!(R.states.pennsylvania.incomeTax.hasIncomeTax && R.states.virginia.incomeTax.hasIncomeTax)) echec("un voisin n'a plus d'impot");
if (!(absents.join() === "Delaware,West Virginia")) echec("les voisins absents ne sont plus Delaware et West Virginia : " + absents.join());
if (progs(a75) !== loc(a75)) echec("a 75 000 $, le seul « programme » doit etre le local");
if (MD.paidLeave || MD.employeePrograms) echec("un programme salarie apparait : la page dit qu'il n'y en a aucun en 2026");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
/* Les 9 titres H3 de la FAQ sont des questions ; les 4 minimum exiges. */
if (faq.length < 4) echec("moins de 4 questions");
console.log("garde-fous : OK (" + attendusProse.length + " attendus de prose, reponse directe " + nbMotsReponse + " mots)");
