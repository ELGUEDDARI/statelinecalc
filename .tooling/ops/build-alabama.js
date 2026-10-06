/* Construit /paycheck-calculator/alabama/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Alabama est le 36e Etat publie. Aucun mecanisme nouveau au moteur : il reutilise
 * deductionByIncome (Ohio, Maryland), personalExemption (Wisconsin) et
 * federalTaxSubtraction (Oregon, ici SANS plafond). Ce qu'il a de propre :
 *
 *   1. LA RETENUE RETRANCHE L'IMPOT FEDERAL RETENU, EN ENTIER. Livret du Department
 *      of Revenue (janvier 2026), p. 7, ligne 2B : « Employees annual Federal
 *      withholding tax. Actual amount for this payroll period multiplied by number of
 *      such payroll periods in a year ». Contrairement a l'Oregon, aucun plafond.
 *   2. LA DEDUCTION STANDARD DIMINUE QUAND LE SALAIRE MONTE, par paliers de 500 $ entre
 *      25 999 $ et 35 500 $ : celibataire 3 000 -> 2 500 $, marie 8 500 -> 5 000 $, chef
 *      de famille 5 200 -> 2 500 $.
 *   3. TROIS TAUX, MAIS LES DEUX PREMIERS NE PORTENT QUE SUR LES 3 000 PREMIERS DOLLARS
 *      IMPOSABLES (6 000 $ pour un marie) : a 75 000 $, 5 % est le taux marginal.
 *   4. PERSONNES A CHARGE : 1 000 / 500 / 300 $ chacune selon le revenu (non modelees).
 *   5. AUCUNE RETENUE SALARIEE D'ETAT TROUVEE : le chomage est a la charge de
 *      l'employeur ; ni SDI ni conge paye lus. Les taxes d'occupation LOCALES existent
 *      (livret : « not administered by the Department of Revenue ») : aucun taux lu
 *      sur une page officielle, donc aucun chiffre sur la page.
 *   6. LES TABLES IMPRIMEES se recoupent avec la formule : .tooling/test/verif-retenue-al.js
 *      (3 600 lignes, ~112 000 cellules, au haut de chaque tranche de salaire).
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * revenue.alabama.gov, workforce.alabama.gov, birminghamal.gov : HTTP 200 le
 * 06/10/2026. labor.alabama.gov repond 403 (WAF) a curl et a un Chrome pilote : non
 * lu, non cite. Dates et citations : data/rates-2026.js (bloc ALABAMA) et
 * .tooling/lib/sources.js (PAR_ETAT.alabama).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Alabama has no local income tax » ni de « Alabama has no SDI » : negatif
 *     non prouvable, « we found no » ;
 *   - AUCUN taux de taxe d'occupation (ni le « 1 % » de Birmingham, lu seulement sur des
 *     sites tiers) : la page de la ville confirme l'existence d'une « Occupational Tax »,
 *     pas son taux ;
 *   - pas de POURQUOI de la deduction du federal (loi de l'Etat, declaration annuelle) :
 *     seule la FORMULE DE RETENUE a ete lue ;
 *   - pas d'avis sur la retenue de la deduction des heures supplementaires (Act 2026-604) :
 *     la page du DOR la decrit comme une deduction de la DECLARATION, rien sur la retenue ;
 *   - personnes a charge, « 0 », « MS », retenue supplementaire, indemnite de
 *     licenciement, regle des 30 jours : non modelises.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-alabama.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, deductionEtat, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "alabama";
const NOM = "Alabama";
const URL = "https://statelinecalc.com/paycheck-calculator/alabama/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const AL = R.states[CLE];
const IT = AL.incomeTax;
const EX = IT.personalExemption;                       // 1 500 / 3 000 / 3 000
const B_S = IT.brackets.single, B_M = IT.brackets.marriedJoint;   // 500 / 3 000 ; 1 000 / 6 000
const PAL = IT.deductionByIncome;                      // 21 paliers
const fedDed = R.federal.standardDeduction;
/* Deduction standard seule (sans l'exemption que deductionEtat y ajoute). */
const ded = (st, gi) => deductionEtat(AL, st, gi) - EX[st];
/* Personnes a charge : livret p. 7, ligne 2D. Non modelees : constantes de LECTURE. */
const DEP = [[50000, 1000], [100000, 500], [Infinity, 300]];

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const a75 = calcul(CLE, 75000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const a30 = calcul(CLE, 30000);
const a250 = calcul(CLE, 250000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const sub75 = a75.federal;                                       // retranche en entier
const ded75 = ded("single", 75000);                              // 2 500
const base75 = 75000 - ded75 - sub75 - EX.single;                // 63 330
const tax75 = progressiveTax(base75, B_S);                       // 3 126,50
const sansSub = progressiveTax(75000 - ded75 - EX.single, B_S);  // l'erreur : oublier l'impot federal
const ecartSansSub = sansSub - a75.etat;
const jDed = ded("marriedJoint", 75000);
const jBase = 75000 - jDed - j75.federal - EX.marriedJoint;
const jTax = progressiveTax(jBase, B_M);
const hDed = ded("headOfHousehold", 75000);
const hBase = 75000 - hDed - h75.federal - EX.headOfHousehold;
/* Ce que valent les deux premiers taux par rapport a un taux unique de 5 %. */
const gainBas = progressiveTax(1e6, B_S) - (1e6 - 3000) * 0.05 - 3000 * 0.05 + 3000 * 0.05; // placeholder neutralise plus bas
const econS = 3000 * 0.05 - progressiveTax(3000, B_S);          // 150 - 110 = 40
const econM = 6000 * 0.05 - progressiveTax(6000, B_M);          // 300 - 220 = 80
/* 30 000 $ : la deduction est dans un palier. */
const ded30 = ded("single", 30000);                              // 2 775
/* Une personne a charge, a 75 000 $ : 500 $ de moins en base, ~5 % de cela en impot. */
const depMontant = DEP.find(([haut]) => 75000 <= haut)[1];
const depGain = depMontant * 0.05;

/* Ecart entre le federal que SUPPOSENT les tables imprimees et celui de notre moteur
   (IRS Pub. 15-T), mesure par verif-retenue-al.js le 06/10/2026 : la page le dit. */
const ECART_FED_TABLES = 516, ECART_ETAT_TABLES = 26;

/* Voisins : Florida, Georgia, Mississippi, Tennessee (les quatre sont publies). */
const REF = 75000;
const COMPARE = [CLE, "florida", "georgia", "mississippi", "tennessee"];
const NOMS = { [CLE]: "Alabama", florida: "Florida", georgia: "Georgia", mississippi: "Mississippi", tennessee: "Tennessee" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const fl75 = calcul("florida", REF), ga75 = calcul("georgia", REF), ms75 = calcul("mississippi", REF), tn75 = calcul("tennessee", REF);
const plusMoins = (autre, nom) => autre.net > a75.net
  ? "a " + nom + " worker keeps " + N($$(autre.net - a75.net)) + " more"
  : "a " + nom + " worker keeps " + N($$(a75.net - autre.net)) + " less";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des trois taux : seuils lus dans brackets. */
const SEUILS = [
  ["2%", "First " + $(B_S[0][0]), "First " + $(B_M[0][0])],
  ["4%", "Next " + $(B_S[1][0] - B_S[0][0]) + " (to " + $(B_S[1][0]) + ")", "Next " + $(B_M[1][0] - B_M[0][0]) + " (to " + $(B_M[1][0]) + ")"],
  ["5%", "Over " + $(B_S[1][0]), "Over " + $(B_M[1][0])]
].map(([t, s, m], i) => {
  if (pct(IT.brackets.single[i][1]) !== t || pct(IT.brackets.marriedJoint[i][1]) !== t) throw new Error("ARRET : taux != tableau");
  return "        <tr><th scope=\"row\">" + t + "</th><td class=\"num\">" + s + "</td><td class=\"num\">" + m + "</td></tr>";
}).join("\n");

/* Le tableau de la deduction standard, lu dans deductionByIncome : cinq lignes. */
const lignePalier = (k, lib) => {
  const p = PAL[k];
  return "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + $(p.amounts.single) + "</td><td class=\"num\">" +
         $(p.amounts.marriedJoint) + "</td><td class=\"num\">" + $(p.amounts.headOfHousehold) + "</td></tr>";
};
const plage = k => PAL[k].upTo === null ? $(PAL[k - 1].upTo + 1) + " or more" : $(PAL[k].upTo - 499) + " &ndash; " + $(PAL[k].upTo);
const lignesDed = [
  lignePalier(0, "$0 &ndash; " + $(PAL[0].upTo)), lignePalier(1, plage(1)), lignePalier(9, plage(9)),
  lignePalier(19, plage(19)), lignePalier(PAL.length - 1, plage(PAL.length - 1))
].join("\n");

/* Le tableau des personnes a charge (lu dans le livret, p. 7). */
const lignesDep = DEP.map(([haut, v], i) => {
  const bas = i === 0 ? null : DEP[i - 1][0];
  const lib = bas === null ? "$50,000 or less" : haut === Infinity ? "More than " + $(bas) : "More than " + $(bas) + ", up to " + $(haut);
  return "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + $(v) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Alabama income tax withholding rate in 2026?",
   "Alabama&rsquo;s withholding formula has three rates, " + N(pct(B_S[0][1])) + ", " + N(pct(B_S[1][1])) + " and " + N(pct(B_S[2][1])) +
   ". The first two apply only to the first " + $(B_S[1][0]) + " of what is left after your employer subtracts the federal income tax withheld, a standard deduction and a personal exemption " +
   "(the first " + $(B_M[1][0]) + " if you claim the married exemption). Everything above that is taxed at " + N(pct(B_S[2][1])) + ". On a single filer&rsquo;s " + $(75000) +
   " salary, Alabama withholds " + $$(a75.etat) + " a year."],

  ["How much Alabama tax is withheld on a $75,000 salary?",
   "For a single filer, Alabama withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus " + $(ded75) + " of standard deduction, minus " + $$(sub75) + " of federal tax, minus a " + $(EX.single) + " exemption = " + $(base75) +
   ". Applying the rates to that gives " + $$(tax75) + ". A married filer claiming the married exemption has " + $$(j75.etat) + " withheld, and a head of household has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Alabama?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Alabama income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no other state payroll deduction, so there is no other Alabama line."],

  ["How much is $20, $25 or $30 an hour after taxes in Alabama?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Alabama income tax withholding, with no retirement contribution."],

  ["Does Alabama subtract my federal income tax from my pay?",
   "In the withholding formula, yes. The Department of Revenue&rsquo;s formula has a line for the employee&rsquo;s annual federal withholding tax, &ldquo;actual amount,&rdquo; and your employer takes it off your wages before applying the three rates. " +
   "This calculator’s federal income tax estimate is " + $$(a75.federal) + " on " + $(75000) + ", so the Alabama base is " + $(base75) + " instead of " + $(75000 - ded75 - EX.single) +
   ". Federal tax here does not include Social Security or Medicare. We read the withholding formula, not the return instructions, so this page describes how an employer withholds, not how your final Alabama return is figured."],

  ["Why does Alabama&rsquo;s standard deduction shrink as I earn more?",
   "Because the Department of Revenue&rsquo;s schedule says so. A single filer gets " + $(PAL[0].amounts.single) + " up to " + $(PAL[0].upTo) + " of yearly pay. Above that it falls by " + $(25) +
   " for every $500 of pay until it reaches " + $(PAL[PAL.length - 1].amounts.single) + " at " + $(PAL[PAL.length - 1].upTo === null ? PAL[PAL.length - 2].upTo + 1 : PAL[PAL.length - 1].upTo) + ". " +
   "A married filer goes from " + $(PAL[0].amounts.marriedJoint) + " to " + $(PAL[PAL.length - 1].amounts.marriedJoint) + " and a head of family from " + $(PAL[0].amounts.headOfHousehold) + " to " + $(PAL[PAL.length - 1].amounts.headOfHousehold) +
   " over the same range. At " + $(30000) + " a single filer&rsquo;s deduction is " + $(ded30) + "."],

  ["What do the letters on Alabama Form A-4 mean?",
   "They set your exemption. &ldquo;0&rdquo; claims none and has the most withheld. &ldquo;S&rdquo; is single, and &ldquo;MS&rdquo; is married filing separately: both are worth " + $(EX.single) + ". &ldquo;M&rdquo; is married, claiming yourself and your spouse, and &ldquo;H&rdquo; is head of family for a single person with dependents: both are worth " + $(EX.marriedJoint) +
   ". A number after the letter counts your dependents other than a spouse. This calculator uses S for a single filer, M for a married filer and H for a head of household, always with no dependents. " +
   "The booklet says that if one spouse claims M, the other must claim 0."],

  ["Do dependents lower Alabama withholding?",
   "Yes. The formula subtracts " + $(DEP[0][1]) + " for each dependent other than a spouse when your pay is " + $(DEP[0][0]) + " a year or less, " + $(DEP[1][1]) + " when it is up to " + $(DEP[1][0]) +
   ", and " + $(DEP[2][1]) + " above that. At " + $(75000) + " one dependent takes " + $(depMontant) + " off the base, which is about " + $(depGain) + " less Alabama tax at the " + N(pct(B_S[2][1])) + " rate. " +
   "The calculator does not ask about dependents, so it leaves this out."],

  ["Is there a local income tax in Alabama?",
   "We found no local income tax line in the Department of Revenue&rsquo;s withholding booklet, but it does say that local occupational taxes exist: they are not administered by the Department of Revenue, and for details you must contact the city or county that levies one. " +
   "The City of Birmingham, for example, lists an occupational tax on the Tax and License Division page of its website. We did not find a rate on an official page, so this calculator adds no local line."],

  ["Are there other deductions from an Alabama paycheck?",
   "We found none. The Department of Workforce says the employer is taxed on the first $8,000 paid to each worker for unemployment insurance, and its pages describe no deduction from employee wages. " +
   "We found no state disability insurance or paid family leave program run through payroll in the pages we read. That is not proof that none exists, only what we found."],

  ["Does a 401(k) contribution lower my Alabama withholding?",
   "Yes. The Department of Revenue&rsquo;s booklet lists 401(k) contributions among the amounts excluded from the wages used for withholding, and the calculator treats a traditional 401(k) contribution that way for federal tax too. " +
   "On " + $(75000) + " with 6% going into a 401(k), Alabama income tax withholding falls by " + $$(gain401) + " a year, even though the lower federal tax also shrinks the subtraction."],

  ["How are bonuses withheld in Alabama?",
   "The Department of Revenue&rsquo;s booklet says employers may withhold state income tax from bonuses and supplemental wage payments at a rate of 5%. " +
   "On a $5,000 bonus that is $250 of Alabama withholding. The calculator does not model bonuses."],

  ["Why is my Alabama paycheck different from this calculator?",
   "Common reasons include: you claimed a different letter or number of dependents on Form A-4; you asked for an extra amount to be withheld; your employer uses the printed tables instead of the formula; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; a local occupational tax applies to you; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. */
const dec = s => s.replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Alabama withholds at 2%, 4% and 5% in 2026, and 5% applies to nearly all of what is left after your employer subtracts the federal tax withheld, a standard deduction and an exemption. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Alabama (AL) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Alabama (AL) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Alabama tax. Alabama subtracts federal tax first.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Alabama (AL) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Alabama&rsquo;s withholding formula subtracts your federal income tax from your wages before taxing them at 2%, 4% and 5%. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Alabama Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Alabama take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Alabama income tax withheld by the Department of Revenue formula (federal tax subtraction, standard deduction by income, personal exemption, 2%, 4% and 5% rates)."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Alabama", "item": "${URL}" }
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
    <li aria-current="page">Alabama</li>
  </ol>
</nav>

  <h1>Alabama Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Alabama take-home pay</h2>

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
        actually work to turn an hourly rate into a yearly figure, not an assumed 2,080 a year.</span>
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
          <span class="help">Sets your federal brackets and standard deduction, and the Alabama
          withholding exemption and rates: S for single, M for married and H for head of household,
          with no dependents.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Alabama income tax withholding too.</span>
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
    <p>Alabama does not tax your paycheck at a single rate, and it does not start from the federal standard deduction. The Department of Revenue&rsquo;s withholding formula tells your employer to turn your pay into a yearly figure, then subtract four things: a standard deduction that gets smaller as your pay rises (${N($(ded("single", 25999)))} for a single filer, ${N($(ded75))} at ${N($(75000))}), the federal income tax withheld from your pay, a personal exemption (${N($(EX.single))} if you claim S, ${N($(EX.marriedJoint))} for M or H), and a set amount for each dependent.
    Three rates are applied to what is left, and the employer divides the yearly amount by the number of pay periods.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Alabama income tax</strong>: your wages after any 401(k) contribution, minus the Alabama standard deduction, the federal tax above and the exemption for your status,
      taxed at ${N(pct(B_S[0][1]))}, ${N(pct(B_S[1][1]))} and ${N(pct(B_S[2][1]))}.</li>
    </ul>
    <p>This calculator has no other Alabama line. We looked for a state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Alabama, the <strong>Department of Revenue</strong>&rsquo;s January 2026 withholding tax tables and instructions, its Form A-4 and its page on the overtime premium deduction, and the <strong>Department of Workforce</strong>&rsquo;s employer pages.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The booklet prints withholding tables for weekly, biweekly, semimonthly, monthly, quarterly and annual pay, with columns for each exemption letter and for up to seven dependents.
    The tables do not print the federal tax they subtract, so we worked out which yearly federal amount reproduces each row. Using the formula as the booklet writes it, for each of the three filing statuses this calculator offers, one federal amount reproduced every cell of every row to within a dollar, across all 3,600 pay ranges. The tables are figured at the top of each pay range, not the middle.
    The federal withholding the tables assume is not the same as this calculator&rsquo;s: it differs by as much as ${N($(ECART_FED_TABLES))} a year in the single-filer rows we compared, so this calculator can differ from the printed annual table by up to about ${N($(ECART_ETAT_TABLES))} of Alabama tax. The booklet says the formula should be used by employers who compute withholding with a computer program, which is what this page does.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Department of Revenue&rsquo;s method. Your actual Alabama income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents, the &ldquo;0&rdquo; and &ldquo;MS&rdquo; letters on Form A-4, extra withholding, the 5% rate employers may use on bonuses, severance pay, the 30-day rule for out-of-state workers, the overtime premium deduction on your Alabama return, local occupational taxes, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Alabama take-home pay by salary</h2>
  <p class="prose">Single filer, no dependents, no retirement contribution, 2026 state and federal rates. The
  AL state tax + programs column is Alabama income tax withholding; we found no Alabama payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Alabama take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">AL state tax + programs</th>
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

    <h2>Alabama&rsquo;s three rates and the base they apply to</h2>
    <p>These are the rates in the Department of Revenue&rsquo;s withholding formula. They apply to the amount left after the four deductions described earlier, not to your pay. For a single filer on ${N($(75000))}, that amount is ${N($(75000))} &minus; ${N($(ded75))} &minus; ${N($$(sub75))} of federal tax &minus; ${N($(EX.single))} = ${N($(base75))}.
    Only the first ${N($(B_S[1][0]))} of it is taxed below ${N(pct(B_S[2][1]))}, so for most workers ${N(pct(B_S[2][1]))} is the rate on every extra dollar.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Alabama withholding rates by size of the base, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single, 0, S, MS or H</th>
          <th scope="col">Married (M)</th>
        </tr>
      </thead>
      <tbody>
${SEUILS}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>How the Alabama standard deduction shrinks</h2>
    <p>The deduction is not one amount. It is highest at low pay and falls by one step for every ${N("$500")} of yearly pay, between ${N($(26000))} and ${N($(35500))}, then stays flat from ${N($(35500))} up (a single filer loses ${N($(25))} a step, from ${N($(PAL[0].amounts.single))} down to ${N($(PAL[PAL.length - 1].amounts.single))}). These are the 2026 amounts from the Department of Revenue&rsquo;s schedule for the three statuses this calculator offers.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Alabama standard deduction by yearly pay, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Single</th>
          <th scope="col">Married (M)</th>
          <th scope="col">Head of family (H)</th>
        </tr>
      </thead>
      <tbody>
${lignesDed}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>What each dependent is worth</h2>
    <p>The formula subtracts a fixed amount for each dependent other than a spouse, and the amount falls as pay rises. This calculator does not include dependents, but these are the amounts the Department of Revenue prints.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Alabama withholding deduction for each dependent, by yearly pay, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Per dependent</th>
        </tr>
      </thead>
      <tbody>
${lignesDep}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Alabama hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. Because Alabama&rsquo;s standard deduction changes with yearly pay, your hours matter twice here: they set your yearly pay and, through it, your deduction.</p>

    <h3>What is $20 an hour after taxes in Alabama?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Alabama income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Alabama&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Alabama?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Alabama income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    The Department of Revenue says employers may withhold state income tax from bonuses and supplemental wages at a rate of 5%.
    Separately, for 2026 through 2028 Alabama lets you deduct up to ${N("$1,000")} of the premium part of your overtime pay on your Alabama return. The page we read describes it as a deduction on the return, and says nothing about withholding, so this calculator does not apply it.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Alabama take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Alabama take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Alabama</h2>

  <h3>Your federal income tax lowers your Alabama wages</h3>
  <p>Employers subtract the federal income tax withheld from your pay before applying Alabama&rsquo;s rates, and the booklet sets no cap on it. A single filer on ${N("$75,000")} has about ${N($$(sub75))} of federal income tax in this calculator, so the Alabama base is ${N($(base75))} rather than ${N($(75000 - ded75 - EX.single))}.
  Federal tax does not include Social Security or Medicare. This is why Alabama withholding on ${N("$75,000")} is ${N($$(a75.etat))}, not the ${N($$(sansSub))} you would get by applying the rates to pay minus the deduction and exemption alone.</p>

  <h3>Nearly all of the taxable amount is taxed at ${pct(B_S[2][1])}</h3>
  <p>The three rates form a graduated schedule, but the ${N(pct(B_S[0][1]))} band covers only the first ${N($(B_S[0][0]))} of the base and the ${N(pct(B_S[1][1]))} band the next ${N($(B_S[1][0] - B_S[0][0]))}. Compared with taxing every dollar at ${N(pct(B_S[2][1]))}, the two low bands save a single filer ${N($(econS))} a year. A married filer claiming M has bands of ${N($(B_M[0][0]))} and ${N($(B_M[1][0] - B_M[0][0]))}, worth ${N($(econM))} a year.
  Past that, the base is taxed at ${N(pct(B_S[2][1]))}, whether your pay is ${N($(40000))} or ${N($(250000))}.</p>

  <h3>The standard deduction is small, and it shrinks</h3>
  <p>A single filer&rsquo;s standard deduction is ${N($(PAL[0].amounts.single))} at most and ${N($(PAL[PAL.length - 1].amounts.single))} once pay reaches ${N($(35500))}. A married filer&rsquo;s drops from ${N($(PAL[0].amounts.marriedJoint))} to ${N($(PAL[PAL.length - 1].amounts.marriedJoint))}, and a head of family&rsquo;s from ${N($(PAL[0].amounts.headOfHousehold))} to ${N($(PAL[PAL.length - 1].amounts.headOfHousehold))}. The federal ${N($(fedDed.single))} standard deduction plays no part.
  At ${N($(30000))} a single filer&rsquo;s deduction is ${N($(ded30))}, and Alabama withholds ${N($$(a30.etat))} a year.</p>

  <h3>The married exemption assumes your spouse claims 0</h3>
  <p>On Form A-4, &ldquo;M&rdquo; claims the exemption for both spouses, ${N($(EX.marriedJoint))} in all, and the booklet says the spouse must then claim &ldquo;0.&rdquo; The calculator&rsquo;s married result is for that case: one A-4 claiming M, no dependents. On ${N("$75,000")}, Alabama withholds ${N($$(j75.etat))} for a married filer.
  A head of household gets the &ldquo;H&rdquo; exemption of ${N($(EX.headOfHousehold))}, which the form allows for a single person with dependents; the calculator gives it without counting any dependents, and Alabama withholds ${N($$(h75.etat))} on ${N("$75,000")}.</p>

  <h3>Dependents are a separate line</h3>
  <p>Each dependent other than a spouse subtracts ${N($(DEP[0][1]))}, ${N($(DEP[1][1]))} or ${N($(DEP[2][1]))} depending on pay. At ${N("$75,000")} that is ${N($(depMontant))}, worth about ${N($(depGain))} a year of Alabama tax at ${N(pct(B_S[2][1]))}. The calculator leaves dependents out, so a household with children can expect somewhat less withheld than shown.</p>

  <h3>We found no state payroll deductions</h3>
  <p>Alabama&rsquo;s Department of Workforce says the employer is taxed on the first ${N("$8,000")} paid to each worker for unemployment insurance, and its pages describe no deduction from your wages. We did not find a state disability insurance or paid family leave program taken through payroll. That is a statement about what we read, not a guarantee that nothing exists, and your pay stub is the final word.</p>

  <h3>Local occupational taxes are collected by cities and counties</h3>
  <p>The Department of Revenue&rsquo;s booklet says local occupational taxes are not administered by the department and that you must contact the city or county that administers one. The City of Birmingham lists an occupational tax on its Tax and License Division page. We did not find a rate on an official page, so the calculator shows none, and if you work in a city or county that levies one, your take-home pay will be lower than shown.</p>

  <h3>Your 401(k) lowers your Alabama wages</h3>
  <p>The booklet lists 401(k) contributions among the amounts excluded from wages subject to withholding. The federal tax on this page treats a traditional 401(k) contribution as reducing taxable pay, and so does the Alabama calculation here. On ${N("$75,000")} with 6% going in, Alabama income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting to subtract federal tax</h3>
  <p>Applying Alabama&rsquo;s rates to pay minus the standard deduction and exemption overstates Alabama withholding by ${N($$(ecartSansSub))} on ${N("$75,000")}: ${N($$(sansSub))} instead of ${N($$(a75.etat))}.</p>

  <h3>Using one standard deduction for every income</h3>
  <p>The single deduction is ${N($(PAL[0].amounts.single))} at low pay and ${N($(PAL[PAL.length - 1].amounts.single))} from ${N($(35500))} up. Using ${N($(PAL[0].amounts.single))} at ${N($(75000))}, instead of the ${N($(ded75))} the schedule gives, would understate Alabama withholding by ${N($(tax75 - progressiveTax(base75 - (PAL[0].amounts.single - ded75), B_S)))} a year.</p>

  <h3>Treating the 2% and 4% bands as the main rates</h3>
  <p>They cover only the first ${N($(B_S[1][0]))} of the base for a single filer, so nearly all of the tax comes from the ${N(pct(B_S[2][1]))} rate.</p>

  <h3>Mixing up S, M and H on Form A-4</h3>
  <p>&ldquo;S&rdquo; is worth ${N($(EX.single))} and &ldquo;M&rdquo; or &ldquo;H&rdquo; ${N($(EX.marriedJoint))}, and the married bands are wider. The booklet says that when one spouse claims M, the other must claim &ldquo;0.&rdquo;</p>

  <h3>Expecting a local tax line that the calculator does not have</h3>
  <p>If you work in a city or county that levies an occupational tax, it is not in the result. Check your pay stub, or ask the city or county.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the letter and dependents on your Form A-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Alabama in 2026, claiming S with no dependents and no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Alabama standard deduction at this pay: ${N($(ded75))}</li>
    <li>Alabama base: ${N($(a75.brut))} &minus; ${N($(ded75))} standard deduction &minus; ${N($$(sub75))} federal tax &minus; ${N($(EX.single))} exemption = ${N($(base75))}</li>
    <li>Tax on the base: ${N($(B_S[0][0]))} &times; ${N(pct(B_S[0][1]))} = ${N($$(B_S[0][0] * B_S[0][1]))}, plus ${N($(B_S[1][0] - B_S[0][0]))} &times; ${N(pct(B_S[1][1]))} = ${N($$((B_S[1][0] - B_S[0][0]) * B_S[1][1]))}, plus (${N($(base75))} &minus; ${N($(B_S[1][0]))}) &times; ${N(pct(B_S[2][1]))} = ${N($$((base75 - B_S[1][0]) * B_S[2][1]))}, which makes
    Alabama income tax withholding of ${N($$(a75.etat))}
    a year, ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Alabama borders Florida, Georgia, Mississippi and Tennessee, and we publish all four.
  For Alabama, the state-level deductions are the income tax withholding; the other states may add payroll programs.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences below use the exact amounts. Compared with an Alabama worker on the same salary, ${plusMoins(fl75, "<a href=\"/paycheck-calculator/florida/\">Florida</a>")} and ${plusMoins(tn75, "<a href=\"/paycheck-calculator/tennessee/\">Tennessee</a>")}, because neither taxes wages. ${plusMoins(ms75, "<a href=\"/paycheck-calculator/mississippi/\">Mississippi</a>").replace(/^a /, "A ")}, and ${plusMoins(ga75, "<a href=\"/paycheck-calculator/georgia/\">Georgia</a>")}. A worker who lives in one of those states and commutes into Alabama is a different case that this calculator does not model: it assumes an Alabama resident working in Alabama.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/georgia/">Georgia paycheck calculator</a> &mdash; the neighbor to the east, with a flat 4.99% rate.</li>
    <li><a href="/paycheck-calculator/mississippi/">Mississippi paycheck calculator</a> &mdash; the neighbor to the west, with a 4% rate above a $10,000 zero bracket.</li>
    <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash; the neighbor to the north, with no state tax on wages.</li>
    <li><a href="/paycheck-calculator/florida/">Florida paycheck calculator</a> &mdash; the neighbor to the south, with no state income tax.</li>
    <li><a href="/paycheck-calculator/oregon/">Oregon paycheck calculator</a> &mdash; the other state here whose withholding formula subtracts your federal income tax, up to a cap.</li>
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
    Alabama rates.
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

/* 1. Recoupement independant : la formule du livret ecrite ici A PARTIR DU TEXTE
   (GI - deduction - federal - exemption - personnes a charge ; 2 % / 4 % / 5 %),
   pas du moteur, sur les cas imprimes dans la page. */
const fed75 = 7670;                        // 58 900 imposables : 1 240 + 4 560 + 8 500 x 22 %
const b75 = 75000 - 2500 - fed75 - 1500;   // 63 330
const t75 = 500 * 0.02 + 2500 * 0.04 + (b75 - 3000) * 0.05;
if (Math.abs(t75 - a75.etat) > 0.006) echec("AL 75 000 $ : livret " + t75 + ", moteur " + a75.etat);
const fedJ = 4640;                         // 42 800 imposables : 2 480 + 18 000 x 12 %
const bJ = 75000 - 5000 - fedJ - 3000;     // 62 360
const tJ = 1000 * 0.02 + 5000 * 0.04 + (bJ - 6000) * 0.05;
if (Math.abs(tJ - j75.etat) > 0.006) echec("AL marie 75 000 $ : livret " + tJ + ", moteur " + j75.etat);
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 3126.50, "etat 75 000"], [sub75, 7670, "impot federal retranche"], [base75, 63330, "base 75 000"],
  [tax75, 3126.50, "impot sur la base"], [a75.net, 58466.00, "net 75 000"], [a75.total, 16534.00, "total 75 000"],
  [j75.etat, 3038.00, "etat marie"], [jBase, 62360, "base mariee"], [jTax, 3038.00, "impot marie"],
  [h75.etat, 3147.60, "etat chef de famille"], [hBase, 63752, "base chef de famille"],
  [a30.etat, 1175.25, "etat 30 000"], [ded30, 2775, "deduction a 30 000"],
  [h20.net, 33906.20, "net 20 $/h"], [h25.net, 41805, "net 25 $/h"], [h30.net, 49703.80, "net 30 $/h"],
  [h20.etat, 1699.40, "etat 20 $/h"], [h25.etat, 2157, "etat 25 $/h"], [h30.etat, 2614.60, "etat 30 $/h"],
  [sansSub, 3510, "sans impot federal"], [ecartSansSub, 383.50, "ecart sans impot federal"],
  [gain401, 175.50, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [econS, 40, "economie des deux taux bas, celibataire"], [econM, 80, "economie des deux taux bas, marie"],
  [depGain, 25, "une personne a charge a 75 000 $"],
  [tax75 - progressiveTax(base75 - (PAL[0].amounts.single - ded75), B_S), 25, "ecart d'une deduction de 3 000 $ au lieu de 2 500 $"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(IT.standardDeduction.single === 3000 && ded75 === 2500 && EX.single === 1500 && EX.marriedJoint === 3000 && EX.headOfHousehold === 3000)) echec("deduction / exemptions != moteur");
if (!(PAL.length === 21 && PAL[0].upTo === 25999 && PAL[19].upTo === 35499 && PAL[20].upTo === null)) echec("l'escalier de deduction n'a plus 21 paliers (25 999 ... 35 499, puis plat)");
if (!(ded("single", 25999) === 3000 && ded("single", 26000) === 2975 && ded("single", 35499) === 2525 && ded("single", 35500) === 2500 &&
      ded("marriedJoint", 35500) === 5000 && ded("headOfHousehold", 35499) === 2635)) echec("deduction aux bornes != Schedule imprime");
if (!(B_S.length === 3 && B_S[0][0] === 500 && B_S[1][0] === 3000 && B_M[0][0] === 1000 && B_M[1][0] === 6000)) echec("seuils des taux != 500 / 3 000 ; 1 000 / 6 000");
if (!(DEP.length === 3 && DEP[0][1] === 1000 && DEP[1][1] === 500 && DEP[2][1] === 300)) echec("personnes a charge != 1 000 / 500 / 300");
if (!(fl75.net > a75.net && tn75.net > a75.net && ga75.net > a75.net && ms75.net > a75.net)) echec("la comparaison (FL, TN, GA, MS au-dessus de l'Alabama) n'est plus celle ecrite : verifier plusMoins()");
if (!(R.states.florida.incomeTax.hasIncomeTax === false && R.states.tennessee.incomeTax.hasIncomeTax === false && R.states.georgia.incomeTax.hasIncomeTax && R.states.mississippi.incomeTax.hasIncomeTax)) echec("un voisin n'a plus le regime ecrit");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("l'Alabama ne doit avoir aucun programme");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements livret DOR (formule ecrite a la main, 75 000 $ celibataire et marie) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
