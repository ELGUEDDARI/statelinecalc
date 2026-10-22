/* Construit /paycheck-calculator/delaware/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Delaware est le 42e Etat publie. Aucun mecanisme nouveau au moteur : deduction standard par
 * statut + tranches + credit retranche de l'impot (taxCredit) + un programme salarie. Ce qu'il a
 * de propre, et que la page DIT :
 *
 *   1. UN BAREME ETIQUETE 2025. La Division of Revenue n'a publie aucune table 2026 : son guide de
 *      l'employeur etiquette « Effective January 1, 2025 » le bareme et « Effective January 1, 2025
 *      (No changes from January 1, 2014) » les tables de retenue. La page ne dit donc JAMAIS « the
 *      2026 tables » : elle dit « the Division's current guide » et explique l'etiquette. Aucun
 *      changement 2026 trouve (page « Tax Season Updates »). verif-retenue-de.js ECHOUE si
 *      l'etiquette change.
 *   2. LA FORMULE EST RECOUPEE PAR 4 680 VALEURS IMPRIMEES (5 tables de retenue x 9 colonnes de
 *      credits) : ecart maximal 0,005 $ = l'arrondi au cent. Cf. verif-retenue-de.js.
 *   3. UN CREDIT DE 110 $ PAR EXEMPTION, retranche de l'impot (pas du salaire) : celibataire 1,
 *      couple 2, chef de famille 1. Le guide dit que l'employeur se fie au W-4 federal ; aucun
 *      formulaire delawarien n'est exige.
 *   4. UN CONGE PAYE (Delaware Paid Leave) : 0,8 % au total en 2025-2026 (19 Del. C. § 3705),
 *      l'employeur « shall deduct not greater than 50% » => PART SALARIALE MAXIMALE 0,40 %
 *      (employeur de 25 salaries ou plus), jusqu'a la limite FICA. Le site modelise ce MAXIMUM ;
 *      la page dit « up to ».
 *   5. UN IMPOT LOCAL, Wilmington, 1,25 % (Earned Income Tax Regulations, rev. 2023). NON MODELISE,
 *      chiffre sur la page (937,50 $ a 75 000 $), car le calculateur ne sait ni ou l'on habite
 *      ni ou l'on travaille.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - « 2026 tables » / « Delaware raised... » : aucune table 2026 ni aucun changement n'existe dans
 *     les documents lus ;
 *   - « Delaware has no other local tax » : seulement « we found no other » ;
 *   - « your employer deducts paid leave » : l'employeur PEUT en prendre jusqu'a la moitie ;
 *   - 401(k) : choix de modelisation dit sur la page (le guide ne le traite pas).
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-delaware.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "delaware";
const NOM = "Delaware";
const URL = "https://statelinecalc.com/paycheck-calculator/delaware/";
const AUJOURD_HUI = "2026-10-13";
const LISIBLE = "October 13, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const DES = R.states[CLE];
const IT = DES.incomeTax;
const SD = IT.standardDeduction;                       // 3 250 / 6 500 / 3 250
const CR = IT.taxCredit.base;                          // 110 / 220 / 110
const B = IT.brackets.single;                          // 7 paliers, le premier a 0 %
const PL = DES.employeePrograms[0];                    // 0,40 %, plafond 184 500 $
const fedDed = R.federal.standardDeduction;
const WIL = 0.0125;                                    // Wilmington, Earned Income Tax Regulations, Section 201

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => (t * 100).toFixed(2) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const r2 = x => Math.round(x * 100 + 1e-6) / 100;

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
const pl75 = a75.programmes[0].montant;                // 300
const pl250 = a250.programmes[0].montant;              // 738

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const imp75 = 75000 - SD.single;                                          // 71 750
const pieces = [];                                                        // tranche par tranche
for (let i = 0, bas = 0; i < B.length; i++) {
  const haut = Math.min(imp75, B[i][0]);
  pieces.push({ bas, haut: B[i][0], taux: B[i][1], montant: Math.max(0, haut - bas) * B[i][1], base: Math.max(0, haut - bas) });
  bas = B[i][0];
}
const taxeAvantCredit = progressiveTax(imp75, B);                         // 3 719
const jImp = 75000 - SD.marriedJoint;                                     // 68 500
const jAvantCredit = progressiveTax(jImp, B);                             // 3 504,50
/* Ce que les six premiers paliers valent par rapport au taux superieur, applique a tout. */
const SEUIL_HAUT = B[B.length - 2][0];                                    // 60 000
const TAUX_HAUT = B[B.length - 1][1];                                     // 6,60 %
const econ = SEUIL_HAUT * TAUX_HAUT - progressiveTax(SEUIL_HAUT, B);      // 1 016,50
/* Erreurs typiques. */
const sansDeduction = progressiveTax(75000, B) - CR.single;               // 3 823,50
const ecartSansDeduction = sansDeduction - a75.etat;                      // 214,50
const tauxUnique = imp75 * TAUX_HAUT - CR.single;                         // 4 625,50
const ecartTauxUnique = tauxUnique - a75.etat;                            // 1 016,50
const sansCredit = taxeAvantCredit;                                       // 3 719
const ecartSansCredit = sansCredit - a75.etat;                            // 110
/* Wilmington. */
const wil75 = 75000 * WIL;                                                // 937,50
const netApresWil = a75.net - wil75;
/* Conge paye : l'employeur de 10 a 24 salaries (conge parental seulement, 0,32 % au total). */
const PL_PETIT = 0.0032 / 2;                                              // 0,16 %
const plPetit75 = 75000 * PL_PETIT;                                       // 120

/* Voisins : les trois frontaliers sont publies. */
const REF = 75000;
const COMPARE = [CLE, "maryland", "pennsylvania", "new-jersey"];
const NOMS = { [CLE]: "Delaware", maryland: "Maryland", pennsylvania: "Pennsylvania", "new-jersey": "New Jersey" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const md75 = calcul("maryland", REF), pa75 = calcul("pennsylvania", REF), nj75 = calcul("new-jersey", REF);
const MD_COMTE = R.states.maryland.incomeTax.countyTax.defaultCounty;       // "montgomery"
const plusMoins = (autre) => autre.net > a75.net
  ? "keeps " + N($$(autre.net - a75.net)) + " more"
  : "keeps " + N($$(a75.net - autre.net)) + " less";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des sept paliers : salaire imposable, taux, impot cumule au sommet, salaire annuel au sommet (celibataire). */
const libTranche = (i) => i === 0 ? "First " + $(B[0][0])
  : i === B.length - 1 ? "Over " + $(B[i - 1][0])
  : $(B[i - 1][0]) + " to " + $(B[i][0]);
const TRANCHES = B.map((tr, i) => {
  const cumul = i === B.length - 1 ? null : progressiveTax(tr[0], B);
  const paie = i === B.length - 1 ? null : tr[0] + SD.single;
  return "        <tr><th scope=\"row\">" + libTranche(i) + "</th><td class=\"num\">" + pct2(tr[1]) + "</td><td class=\"num\">" +
    (cumul === null ? "&mdash;" : $$(cumul)) + "</td><td class=\"num\">" + (paie === null ? "&mdash;" : $(paie)) + "</td></tr>";
}).join("\n");

/* Le tableau deduction et credit par statut. */
const LIGNES_STATUT = [
  ["Single", "1", SD.single, CR.single],
  ["Married filing jointly", "2", SD.marriedJoint, CR.marriedJoint],
  ["Head of household", "1", SD.headOfHousehold, CR.headOfHousehold]
].map(([lib, n, d, c]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $(d) +
  "</td><td class=\"num\">" + $(c) + "</td></tr>").join("\n");

/* Le tableau du conge paye par taille d'employeur. */
const LIGNES_PL = [
  ["25 or more employees", "Full coverage", "0.80%", "0.40%", $$(75000 * 0.004)],
  ["10 to 24 employees", "Parental leave only", "0.32%", "0.16%", $$(plPetit75)],
  ["Nine or fewer employees", "Exempt", "&mdash;", "&mdash;", "&mdash;"]
].map(([t, c, tot, emp, d]) => "        <tr><th scope=\"row\">" + t + "</th><td>" + c + "</td><td class=\"num\">" + tot +
  "</td><td class=\"num\">" + emp + "</td><td class=\"num\">" + d + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Delaware income tax withholding rate?",
   "Delaware&rsquo;s withholding schedule has seven steps, and six of them tax something: " + B.slice(1).map(t => N(pct2(t[1]))).join(", ").replace(/, ([^,]*)$/, " and $1") +
   ". The first " + $(B[0][0]) + " of taxable income is taxed at " + N(pct2(B[0][1])) + ". Taxable income is your yearly pay minus the " + $(SD.single) + " standard deduction for a single filer, and " + N(pct2(TAUX_HAUT)) +
   " applies only to the part above " + $(SEUIL_HAUT) + ". On a single filer&rsquo;s " + $(75000) + " salary, Delaware withholds " + $$(a75.etat) + " a year."],

  ["How much Delaware tax is withheld on a $75,000 salary?",
   "For a single filer claiming one exemption, Delaware withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "Taxable income is " + $(75000) + " minus the " + $(SD.single) + " standard deduction, or " + $(imp75) + ". The schedule gives " + $$(taxeAvantCredit) + " on that, and the " + $(CR.single) +
   " credit for one exemption brings it to " + $$(a75.etat) + ". A married couple filing jointly, with a " + $(SD.marriedJoint) + " deduction and two credits, has " + $$(j75.etat) +
   " withheld, and a head of household, treated like a single filer, has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Delaware?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) +
   " of Delaware income tax and " + $$(pl75) + " for Delaware Paid Leave at its " + pct2(PL.rate) + " maximum employee share &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) +
   "%. It is before the City of Wilmington wage tax, which this calculator does not include."],

  ["How much is $20, $25 or $30 an hour after taxes in Delaware?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA, " +
   "Delaware income tax withholding and the maximum paid leave deduction, with no retirement contribution and no Wilmington tax."],

  ["What is the Delaware standard deduction for withholding?",
   "The Division of Revenue&rsquo;s Employer&rsquo;s Guide gives " + $(SD.single) + " for a single filer and " + $(SD.marriedJoint) + " for a married couple filing jointly, and the same " + $(SD.single) +
   " for married filing separately. The guide does not name head of household; the Division&rsquo;s 2025 resident return gives a head of household " + $(SD.headOfHousehold) +
   ", so this calculator uses that. Your actual Delaware tax is figured on your return, where you can itemize instead, and where people 65 or older or blind get an additional deduction."],

  ["How many exemptions can I claim for Delaware withholding?",
   "The guide tells employers to rely on the number of allowances an employee claims on the federal Form W-4 or W-4A, and each exemption is worth a " + $(CR.single) +
   " credit against the tax. This calculator counts one exemption for a single filer and for a head of household, and two for a married couple filing jointly, and it does not ask about dependents. " +
   "Each extra exemption would lower Delaware withholding by " + $(CR.single) + " a year, whatever your pay."],

  ["Do I need to fill out a Delaware W-4?",
   "The guide says each new employee must give the employer a signed federal Form W-4 or W-4A. It describes a state worksheet, Form SD/W-4A, as a way to work out how many allowances to claim for Delaware, and says it &ldquo;is not required of Delaware wage earners,&rdquo; " +
   "so we found no Delaware-only form that every employee must file."],

  ["Is there a Delaware Paid Leave deduction on my paycheck?",
   "Possibly. Delaware Paid Leave is funded by contributions of " + N("0.80%") + " of wages in 2025 and 2026 for employers that must provide full coverage, and the law says an employer shall deduct not greater than 50% of the contribution from the employee&rsquo;s wages. " +
   "That makes " + N(pct2(PL.rate)) + " the most an employee can be charged at such an employer, which is " + $$(pl75) + " a year on " + $(75000) + ". An employer may pay the whole contribution itself, and one with 10 to 24 employees covers parental leave only, " +
   "at a lower rate. The calculator assumes the maximum " + N(pct2(PL.rate)) + ", up to the Social Security wage base, and your pay stub shows what your employer actually takes."],

  ["Is pay taxed differently in Wilmington?",
   "Yes, the City of Wilmington adds its own wage tax of " + N(pct2(WIL)) + ". Under the city&rsquo;s Earned Income Tax Regulations it applies to city residents on their earnings wherever they work, and to nonresidents for work done in the city. " +
   "On " + $(75000) + " that is " + $$(wil75) + " a year, or " + $$(wil75 / 12) + " a month. The calculator does not include it, because it cannot know where you live or where you work. If it applies to you, subtract about " + N(pct2(WIL)) + " of your pay from the result."],

  ["Did Delaware change its income tax withholding for 2026?",
   "We found no change. The Division of Revenue&rsquo;s guide still labels its tax schedule &ldquo;Effective January 1, 2025,&rdquo; and labels its withholding tables &ldquo;Effective January 1, 2025 (No changes from January 1, 2014).&rdquo; " +
   "Its tax season updates page, which we read on " + LISIBLE + ", mentions no change to personal income tax rates, the standard deduction or the personal credit. " +
   "That is why this page refers to the Division&rsquo;s current guide rather than to tables for 2026."],

  ["Are there other deductions from a Delaware paycheck?",
   "Besides Paid Leave, we found none. The Division of Unemployment Insurance&rsquo;s employer handbook says workers do not pay any part of the Delaware unemployment tax and that employers can make no payroll deductions for it. " +
   "We also found no state disability insurance program run through payroll. That is not proof that none exists; it is only what we found."],

  ["Does a 401(k) contribution lower my Delaware withholding?",
   "In this calculator, yes for the income tax, no for Paid Leave. The guide says Delaware follows federal law on what income is subject to withholding but does not mention 401(k) contributions, so treating them as lowering the wages Delaware taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Delaware income tax withholding falls by " + $$(gain401) + " a year. Paid Leave is figured on your full pay here, because those contributions are FICA wages. Wilmington taxes pay that goes into a retirement plan at the time it is deferred. Ask your payroll department how your employer treats it."],

  ["Why is my Delaware paycheck different from this calculator?",
   "Common reasons: you claimed a different number of allowances on your federal Form W-4; your employer uses the Division&rsquo;s wage-bracket tables instead of the annualized formula, which differ by at most a cent or so in our check; " +
   "your employer pays all or part of the Paid Leave contribution, or covers parental leave only; you live or work in Wilmington; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
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
const reponse = "Delaware withholds at rates from 2.2% to 6.6%, after a $3,250 standard deduction and a $110 credit for each exemption. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year, after up to 0.40% for paid leave. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>Delaware (DE) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Delaware (DE) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Delaware tax. Top rate 6.6%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Delaware (DE) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Delaware withholds 2.2% to 6.6% after a $3,250 standard deduction and a $110 credit per exemption. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Delaware Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Delaware take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Delaware income tax withheld under the Delaware Division of Revenue annualized method (a standard deduction, rates from 2.20% to 6.60%, and a $110 credit for each exemption) and up to 0.40% for Delaware Paid Leave."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Delaware", "item": "${URL}" }
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
    <li aria-current="page">Delaware</li>
  </ol>
</nav>

  <h1>Delaware Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Delaware take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and your Delaware standard deduction
          and exemptions: one for single and head of household, two for married.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Delaware income tax withholding too.</span>
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
    <p>Delaware&rsquo;s Division of Revenue describes an approved withholding method based on annualized wages, and this calculator follows it. Your pay is scaled up to a year. The standard deduction comes off (${N($(SD.single))} for a single filer, ${N($(SD.marriedJoint))} for a married couple filing jointly), the tax is read from a schedule with rates from ${N(pct2(B[1][1]))} to ${N(pct2(TAUX_HAUT))}, and a ${N($(CR.single))} credit comes off the tax for each exemption. The yearly result is divided by your pay periods. The tax is figured the same way for every filing status; what changes is the deduction and the number of exemptions.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Delaware income tax</strong>: your wages after any 401(k) contribution, minus the Delaware standard deduction for your status, taxed through the schedule, less ${N($(CR.single))} for each exemption (one for single, two for married).</li>
      <li><strong>Delaware Paid Leave</strong>: up to ${N(pct2(PL.rate))} of your wages, up to the Social Security wage base. This is the most an employee can be charged, and your employer may charge less. We assume the maximum.</li>
    </ul>
    <p>This calculator has no other Delaware line. We looked for another state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Delaware, the <strong>Division of Revenue</strong>&rsquo;s Employer&rsquo;s Guide and withholding tables, the <strong>Department of Labor</strong>&rsquo;s Delaware Paid Leave pages and regulations,
    the Delaware Code, and the <strong>City of Wilmington</strong>&rsquo;s Earned Income Tax Regulations.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>What &ldquo;current&rdquo; means here.</strong> The Division&rsquo;s guide labels its tax schedule &ldquo;Effective January 1, 2025&rdquo; and its printed withholding tables &ldquo;Effective January 1, 2025 (No changes from January 1, 2014).&rdquo; We found no table labeled 2026, and the Division&rsquo;s tax season updates page, which we read on ${LISIBLE}, mentions no change to personal income tax rates, the standard deduction or the personal credit.
    So the Delaware figures on this page are the Division&rsquo;s current ones, and we call them that rather than claiming Delaware published new tables for 2026. The federal figures, Social Security wage base and Medicare thresholds are the 2026 ones.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Division prints wage-bracket tables for five pay periods: daily, weekly, biweekly, twice a month and monthly. Each row gives the tax for zero to eight credits.
    We rebuilt every printed value from the formula, using the middle of each row&rsquo;s pay range, and compared 4,680 values. The largest difference was half a cent, which is the Division&rsquo;s own rounding to the cent.
    So the rates, the standard deduction and the ${N($(CR.single))} credit on this page match what the Division prints, and an employer who reads the tables instead of using the formula will withhold the same amount to within a cent or so.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Division&rsquo;s method. Your actual Delaware income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents, the City of Wilmington wage tax, the extra credit and deduction for people age 60, 65 or older, or blind, as well as bonuses, extra withholding, an employer that pays the Paid Leave contribution for you or covers parental leave only, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Delaware take-home pay by salary</h2>
  <p class="prose">Single filer, one exemption, no retirement contribution, 2026 federal rates and the Division&rsquo;s current Delaware schedule. The
  DE state tax + programs column is Delaware income tax withholding plus the maximum Paid Leave deduction of ${pct2(PL.rate)}. It does not include the City of Wilmington wage tax.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Delaware take-home pay, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">DE state tax + programs</th>
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

    <h2>Delaware&rsquo;s seven steps and the income they apply to</h2>
    <p>These are the steps in the Division&rsquo;s tax computation table. They apply to your taxable income, which is your yearly pay after the standard deduction, not to your pay itself. For a single filer on ${N($(75000))}, taxable income is ${N($(75000))} &minus; ${N($(SD.single))} = ${N($(imp75))}.
    Only the first ${N($(SEUIL_HAUT))} of it is taxed below ${N(pct2(TAUX_HAUT))}, so for any taxable income above ${N($(SEUIL_HAUT))}, ${N(pct2(TAUX_HAUT))} is the rate on every extra dollar. For a single filer, that point is reached at ${N($(SEUIL_HAUT + SD.single))} of yearly pay.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Delaware withholding schedule by size of taxable income
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable income</th>
          <th scope="col">Rate</th>
          <th scope="col">Tax at the top of the step</th>
          <th scope="col">Yearly pay at the top, single filer</th>
        </tr>
      </thead>
      <tbody>
${TRANCHES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Standard deduction and exemptions: what changes with your status</h2>
    <p>Delaware has no separate table for each filing status. It gives each status its own standard deduction, and it gives a ${N($(CR.single))} credit for each exemption. The guide tells employers to rely on the allowances an employee claims on the federal Form W-4 or W-4A. This is how the calculator counts them.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        What this calculator assumes, by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status</th>
          <th scope="col">Exemptions</th>
          <th scope="col">Standard deduction</th>
          <th scope="col">Credit against the tax</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_STATUT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>The credit comes off the tax, not off your pay, so it is worth ${N($(CR.single))} a year to a single filer at any income that produces a tax bill of that size or more. The calculator does not ask about dependents. Each one you would add is worth another ${N($(CR.single))} of credit.</p>

    <h2>Delaware Paid Leave: the deduction your employer may take</h2>
    <p>Delaware Paid Leave began taking contributions on January 1, 2025, and benefits became available on January 1, 2026. The law sets the contribution at ${N("0.80%")} of wages for 2025 and 2026 (${N("0.40%")} medical, ${N("0.08%")} family caregiving and ${N("0.32%")} parental), and says an employer shall deduct not greater than 50% of the contribution from an employee&rsquo;s wages.
    The Department of Labor adds that employers can require employees to contribute up to half the cost, and its regulations make a 50/50 split the default. Contributions stop once your wages reach the Social Security wage base for the year.</p>
    <p>That makes the employee share at most ${N(pct2(PL.rate))} at an employer that must provide full coverage. An employer can pay all of it, so your deduction may be less than that, or nothing. Which employers take part depends on size, as the table shows. The last two columns are our arithmetic from the 50% rule, not a figure the Department prints.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Delaware Paid Leave contribution by employer size, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Employer size</th>
          <th scope="col">Coverage required</th>
          <th scope="col">Total contribution</th>
          <th scope="col">Most an employee can be charged</th>
          <th scope="col">On $75,000</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_PL}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>This calculator assumes the maximum ${N(pct2(PL.rate))}, so it takes ${N($$(pl75))} from ${N($(75000))} and ${N($$(pl250))} from ${N($(250000))}, where the wage base stops it. If your employer pays the whole contribution, add that amount back to the result.</p>

    <h2>The City of Wilmington wage tax</h2>
    <p>Wilmington taxes earned income at ${N(pct2(WIL))}. Under the city&rsquo;s Earned Income Tax Regulations, the tax applies to residents of the city on their earnings wherever they work, and to nonresidents for work done or services rendered in the city. The regulations tell a Delaware employer to withhold it for city residents, and an employer with a work location in the city to withhold it for nonresidents who work there.
    In some cases a nonresident&rsquo;s taxable earnings are apportioned by the days worked in the city. The regulations also tax earnings put into a retirement plan at the time they are deferred, so a 401(k) contribution does not lower this tax.</p>
    <p>We read the rate in the regulations as revised in May 2023 and did not find a more recent change. On ${N($(75000))} the tax is ${N($$(wil75))} a year, or ${N($$(wil75 / 12))} a month, which would bring a single filer&rsquo;s take-home pay from ${N($(a75.net))} to about ${N($(netApresWil))}. This calculator does not add it, because it cannot know where you live or where you work. We found no other local income tax on wages in the documents we read.</p>

    <h2>Delaware hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Delaware?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Delaware income tax withholding and Paid Leave, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Delaware&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding plus ${N($$(h20.programmes[0].montant))} for Paid Leave for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Delaware?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Delaware income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Division&rsquo;s guide has a section on supplemental wages with its own method for a bonus paid separately from regular pay, which this calculator does not use; ask your employer how a bonus will be withheld.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Delaware take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), with the maximum Paid Leave deduction and no Wilmington tax.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Delaware take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Delaware</h2>

  <h3>The first ${$(B[0][0])} of taxable income is not taxed</h3>
  <p>The schedule starts at ${N(pct2(B[0][1]))} for the first ${N($(B[0][0]))}. With the ${N($(SD.single))} standard deduction, a single filer&rsquo;s yearly pay has to pass ${N($(B[0][0] + SD.single))} before the schedule charges anything. At ${N($(30000))}, Delaware withholds ${N($$(a30.etat))} a year.</p>

  <h3>Only the first ${$(SEUIL_HAUT)} of taxable income is taxed below the top rate</h3>
  <p>The seven steps form a graduated schedule. The first ${N($(SEUIL_HAUT))} of taxable income produces ${N($$(progressiveTax(SEUIL_HAUT, B)))} of tax. Compared with taxing every dollar up to ${N($(SEUIL_HAUT))} at ${N(pct2(TAUX_HAUT))}, the lower steps save a taxpayer ${N($$(econ))} a year.
  Past ${N($(SEUIL_HAUT))}, each extra dollar of taxable income is taxed at ${N(pct2(TAUX_HAUT))}, whether your pay is ${N($(75000))} or ${N($(250000))}.</p>

  <h3>The standard deduction depends on your filing status</h3>
  <p>A single filer&rsquo;s taxable income is pay minus ${N($(SD.single))}. A married couple filing jointly gets ${N($(SD.marriedJoint))} and two credits, which is why Delaware withholds ${N($$(j75.etat))} from a married filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one. Taxable income for the married filer is ${N($(jImp))}.</p>

  <h3>Head of household is treated like a single filer</h3>
  <p>The Employer&rsquo;s Guide lists a standard deduction for single, married filing jointly and married filing separately, and does not name head of household. The Division&rsquo;s 2025 resident return gives a head of household ${N($(SD.headOfHousehold))}, the same as a single filer, so the calculator withholds a head of household the way it does a single filer: ${N($$(h75.etat))} on ${N("$75,000")}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>The schedule is the same one the Division printed for 2025</h3>
  <p>We found no Delaware table labeled 2026 and no announced change to the rates, the standard deduction or the credit. If the Division publishes a different schedule, the Delaware figures on this page will no longer match what employers use. The guide says the withholding tables show &ldquo;No changes from January 1, 2014,&rdquo; which is a long time to go without a change.</p>

  <h3>Paid Leave is the one extra line</h3>
  <p>Delaware Paid Leave is the one state payroll program we found that can come out of your pay. The Division of Unemployment Insurance&rsquo;s employer handbook says workers do not pay any part of the Delaware unemployment tax and that employers can make no payroll deductions for it. We did not find a state disability insurance program run through payroll. That is a statement about what we read, not a guarantee that nothing else exists, and your pay stub is the final word.</p>

  <h3>A federal W-4 is enough</h3>
  <p>The guide says each new employee must give the employer a signed federal Form W-4 or W-4A. Its state worksheet, Form SD/W-4A, is offered for people whose tax is complicated by non-wage income and substantial deductions, and the guide says it &ldquo;is not required of Delaware wage earners.&rdquo; The guide also says an employee may need to claim a different number of allowances for Delaware, and gives a rule of thumb: take one additional allowance for each ${N("$2,000")} by which your itemized deductions, net of state income taxes paid, exceed the ${N($(SD.single))} standard deduction.</p>

  <h3>Your 401(k) lowers your Delaware wages in this calculator</h3>
  <p>The Division&rsquo;s guide does not mention 401(k) contributions, so this is our modeling choice, the same as for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, Delaware income tax withholding falls by ${N($$(gain401))} a year. Paid Leave is not reduced, because those contributions are FICA wages. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total, and Paid Leave stops at the same wage base, at ${N($$(pl250))}.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the standard deduction</h3>
  <p>Applying the schedule to the full ${N($(75000))} instead of ${N($(imp75))} overstates Delaware withholding by ${N($$(ecartSansDeduction))}: ${N($$(sansDeduction))} instead of ${N($$(a75.etat))}, after the credit in both cases.</p>

  <h3>Taxing everything at the top rate</h3>
  <p>The ${N(pct2(TAUX_HAUT))} rate applies only to taxable income above ${N($(SEUIL_HAUT))}. Applying it to all of ${N($(imp75))} gives ${N($$(tauxUnique))} after the credit, which overstates withholding by about ${N($(ecartTauxUnique))}.</p>

  <h3>Forgetting the credit</h3>
  <p>The ${N($(CR.single))} credit comes off the tax. Leaving it out turns ${N($$(a75.etat))} into ${N($$(sansCredit))} for a single filer, an overstatement of ${N($$(ecartSansCredit))}.</p>

  <h3>Treating the Paid Leave deduction as a tax</h3>
  <p>The ${N($$(pl75))} on ${N("$75,000")} is a contribution to an insurance program that pays wage replacement to people on approved leave, and it is not part of your Delaware income tax. Your employer may pay all of it, and it has its own line on a pay stub.</p>

  <h3>Leaving out the Wilmington wage tax</h3>
  <p>If you live or work in Wilmington, the city tax is about ${N(pct2(WIL))} of your pay on top of everything above, which is ${N($$(wil75))} on ${N("$75,000")}. This calculator&rsquo;s result does not include it.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances on your Form W-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Delaware in 2026, claiming one exemption and no retirement
  contribution, on the Division&rsquo;s current schedule:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Delaware taxable income: ${N($(a75.brut))} &minus; ${N($(SD.single))} standard deduction = ${N($(imp75))}</li>
    <li>Tax on that income: ${pieces.filter(p => p.base > 0 && p.taux > 0).map(p => N($(p.base)) + " &times; " + N(pct2(p.taux)) + " = " + N($$(p.montant))).join(", plus ")}, which makes ${N($$(taxeAvantCredit))}</li>
    <li>Less the ${N($(CR.single))} credit for one exemption: ${N($$(a75.etat))}
    a year of Delaware income tax withholding, ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>Delaware Paid Leave: ${N($(a75.brut))} &times; ${N(pct2(PL.rate))} = ${N($$(pl75))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Delaware borders Maryland, Pennsylvania and New Jersey, and we have a calculator for every one of them.
  Delaware is shown with one exemption, its income tax withholding and the maximum Paid Leave deduction. The Maryland row includes Maryland&rsquo;s local income tax at the ${MD_COMTE.charAt(0).toUpperCase() + MD_COMTE.slice(1)} County rate, and the Pennsylvania row leaves out its local taxes, as Delaware&rsquo;s row leaves out the Wilmington wage tax.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a Delaware worker on the same salary, a <a href="/paycheck-calculator/maryland/">Maryland</a> worker ${plusMoins(md75)}, a <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker ${plusMoins(pa75)}, and a <a href="/paycheck-calculator/new-jersey/">New Jersey</a> worker ${plusMoins(nj75)}. A worker who lives in one of those states and commutes into Delaware, or the reverse, is a different case that this calculator does not model: it assumes a Delaware resident working in Delaware.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/maryland/">Maryland paycheck calculator</a> &mdash; the neighbor to the west and south, which adds a local income tax set by your county.</li>
    <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a> &mdash; the neighbor to the north, with a flat 3.07% from the first dollar.</li>
    <li><a href="/paycheck-calculator/new-jersey/">New Jersey paycheck calculator</a> &mdash; the neighbor across the Delaware River and Bay, with two withholding tables and three employee contributions.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where Delaware ranks on one salary.</li>
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
    financial, tax or legal advice. Results are estimates based on published 2026 federal rates and
    the Delaware Division of Revenue&rsquo;s current schedule, and do not include the City of Wilmington wage tax.
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

/* 1. Recoupement independant : la formule du guide ecrite ici A PARTIR DU TEXTE
   (« Pay / Plus / On Amounts Over » : 0 / 0 % / 0 ; 0 / 2,20 % / 2 000 ; 66 / 3,90 % / 5 000 ; 261 / 4,80 % / 10 000 ;
   741 / 5,20 % / 20 000 ; 1 001 / 5,55 % / 25 000 ; 2 943,50 / 6,60 % / 60 000), pas du moteur. */
const TAB = [[0, 0, 0], [2000, 0, 0.022], [5000, 66, 0.039], [10000, 261, 0.048], [20000, 741, 0.052], [25000, 1001, 0.0555], [60000, 2943.5, 0.066]];
const imprime = (t) => { let d = 0; for (const [seuil, base, taux] of TAB) if (t > seuil) d = base + taux * (t - seuil); return d; };
const fed75 = 7670, fedJ = 4640, fedH = 5748;
if (Math.abs(Math.max(0, imprime(75000 - 3250) - 110) - a75.etat) > 0.006) echec("DE 75 000 $ : guide " + imprime(71750) + ", moteur " + a75.etat);
if (Math.abs(Math.max(0, imprime(75000 - 6500) - 220) - j75.etat) > 0.006) echec("DE marie 75 000 $ : guide " + imprime(68500) + ", moteur " + j75.etat);
if (Math.abs(Math.max(0, imprime(25000 - 3250) - 110) - 722) > 0.006) echec("l'exemple imprime du guide (25 000 $ celibataire = 722,00 $) ne se reproduit plus");
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 13/10/2026). */
const attendusProse = [
  [a75.etat, 3609, "etat 75 000"], [imp75, 71750, "imposable 75 000"], [taxeAvantCredit, 3719, "impot avant credit"],
  [pieces[1].montant, 66, "3 000 x 2,20 %"], [pieces[2].montant, 195, "5 000 x 3,90 %"], [pieces[3].montant, 480, "10 000 x 4,80 %"],
  [pieces[4].montant, 260, "5 000 x 5,20 %"], [pieces[5].montant, 1942.5, "35 000 x 5,55 %"], [pieces[6].montant, 775.5, "11 750 x 6,60 %"],
  [progressiveTax(SEUIL_HAUT, B), 2943.5, "impot au sommet du 6e palier"],
  [a75.net, 57683.5, "net 75 000"], [a75.total, 17316.5, "total 75 000"], [pl75, 300, "conge paye 75 000"], [pl250, 738, "conge paye 250 000"],
  [j75.etat, 3284.5, "etat marie"], [jImp, 68500, "imposable marie"], [jAvantCredit, 3504.5, "impot marie avant credit"], [j75.net, 61038, "net marie"],
  [h75.etat, 3609, "etat chef de famille"], [h75.net, 59605.5, "net chef de famille"],
  [a30.etat, 988.125, "etat 30 000"],
  [sansDeduction, 3823.5, "sans deduction"], [ecartSansDeduction, 214.5, "ecart sans deduction"],
  [tauxUnique, 4625.5, "imposable x 6,60 % moins credit"], [ecartTauxUnique, 1016.5, "ecart taux unique"],
  [econ, 1016.5, "economie des paliers bas"], [ecartSansCredit, 110, "ecart sans credit"],
  [wil75, 937.5, "Wilmington 75 000"], [netApresWil, 56746, "net apres Wilmington"], [plPetit75, 120, "conge paye, employeur de 10 a 24"],
  [gain401, 297, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [h25.net, 41544.875, "net 25 $/h"]
];
/* 20 $/h = 41 600 $, imposable 38 350 : 1 001 + 13 350 x 5,55 % = 1 001 + 740,925 = 1 741,925 ; moins 110 = 1 631,925.
   30 $/h = 62 400 $, imposable 59 150 : 1 001 + 34 150 x 5,55 % = 1 001 + 1 895,325 = 2 896,325 ; moins 110 = 2 786,325.
   25 $/h = 52 000 $, imposable 48 750 : 1 001 + 23 750 x 5,55 % = 1 001 + 1 318,125 = 2 319,125 ; moins 110 = 2 209,125. */
attendusProse.push([h20.etat, 1631.925, "etat 20 $/h"], [h30.etat, 2786.325, "etat 30 $/h"], [h25.etat, 2209.125, "etat 25 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(SD.single === 3250 && SD.marriedJoint === 6500 && SD.headOfHousehold === 3250)) echec("deductions != 3 250 / 6 500 / 3 250");
if (!(CR.single === 110 && CR.marriedJoint === 220 && CR.headOfHousehold === 110)) echec("credits != 110 / 220 / 110");
if (!(B.length === 7 && B[1][0] === 5000 && B[4][0] === 25000 && B[4][1] === 0.052 && B[5][1] === 0.0555 && B[6][1] === 0.066 && SEUIL_HAUT === 60000)) echec("schedule != celui du guide");
if (!(PL.rate === 0.004 && PL.wageCap === 184500)) echec("le conge paye n'est plus 0,40 % jusqu'a 184 500 $");
if (!(R.states.maryland.incomeTax.hasIncomeTax && R.states.pennsylvania.incomeTax.hasIncomeTax && R.states["new-jersey"].incomeTax.hasIncomeTax)) echec("un voisin n'a plus d'impot");
if (a75.programmes.length !== 1 || a75.paidLeave !== 0 || a75.waCares !== 0) echec("le Delaware doit avoir exactement un programme salarie");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
/* La page ne doit JAMAIS appeler « 2026 » les tables du Delaware. */
if (/2026 (withholding )?tables|2026 Delaware (schedule|rates)/i.test(html.replace(/<script[\s\S]*?<\/script>/g, ""))) echec("la page appelle « 2026 » un bareme que la Division etiquette 2025");
console.log("recoupements du guide (formule imprimee ecrite a la main, 75 000 $ celibataire et marie, exemple imprime 25 000 $) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
