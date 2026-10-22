/* Construit /paycheck-calculator/west-virginia/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * West Virginia est le 41e Etat publie. Aucun mecanisme nouveau au moteur : meme
 * structure que l'Oklahoma et le Wisconsin (personalExemption retranchee AVANT les
 * tranches, une table de tranches, pas de deduction standard). Ce qu'il a de propre :
 *
 *   1. DEUX BAREMES DANS LE MEME PDF. Form WV IT-100.2A (March 2026) imprime « TWO
 *      EARNER/TWO OR MORE JOBS » (seuils annuels 7 500 / 18 750 / 30 000 / 45 000) et
 *      « OPTIONAL ONE EARNER/ONE JOB » (10 000 / 25 000 / 40 000 / 60 000), memes taux.
 *      Le defaut est le premier (page d'aide : « The withholding tables are based on
 *      two-earner/two-job income » ; IT-104 ligne 5 : la case se coche pour une retenue
 *      plus basse). Le moteur modelise le defaut aux trois statuts ; la page dit ce que
 *      change la case 5 (calcule ici avec le second bareme, recoupe par verif-retenue-wv.js).
 *   2. CINQ TAUX 2,11 / 2,81 / 3,16 / 4,22 / 4,58 % : baisse de 5 % (SB 392, signee le
 *      31/03/2026, retroactive au 01/01/2026). La page n'ecrit AUCUN taux anterieur.
 *   3. EXEMPTIONS DE 2 000 $ chacune (IT-104) : celibataire 1, marie 2, chef de famille 1.
 *      Les personnes a charge ne sont pas demandees par le calculateur : dit.
 *   4. IMPOTS LOCAUX : aucun impot en pourcentage trouve ; des villes (Wheeling, Charleston)
 *      imposent une « city service fee » forfaitaire par semaine. Montant 2026 NON relu ->
 *      NON MODELISE, aucun montant ecrit.
 *   5. NON-RESIDENTS : l'IT-104 dispense de retenue les residents du KY, MD, OH, PA, VA dont
 *      le seul revenu de source WV est un salaire. Cite, non modelise.
 *   6. CHOMAGE : « No money is deducted from your paycheck to pay for UI benefits »
 *      (Claimant Handbook). Conge paye / assurance invalidite d'Etat : « we found no »,
 *      JAMAIS « West Virginia has no ».
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - aucun taux de 2025 : la source officielle ne les imprime pas ;
 *   - aucun montant de city service fee : le texte lu est un document surcharge de revisions ;
 *   - 401(k) : choix de modelisation dit sur la page (l'IT-100.2A ne le traite pas) ;
 *   - case 5, personnes a charge, retenue supplementaire (ligne 6), non-residents, conjoint
 *     avec revenu, primes, arrondi au dollar par periode : non modelises.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-west-virginia.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "west-virginia";
const NOM = "West Virginia";
const URL = "https://statelinecalc.com/paycheck-calculator/west-virginia/";
const AUJOURD_HUI = "2026-10-13";
const LISIBLE = "October 13, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const WVS = R.states[CLE];
const IT = WVS.incomeTax;
const EX = IT.personalExemption;                       // 2 000 / 4 000 / 2 000
const B = IT.brackets.single;                          // bareme « TWO EARNER » (defaut)
/* Bareme « OPTIONAL ONE EARNER/ONE JOB » de l'IT-100.2A, table annuelle (case 5 de l'IT-104).
   Constante de LECTURE, recoupee avec le PDF par verif-retenue-wv.js (seuils, taux, bases). */
const ONE = [[10000, 0.0211], [25000, 0.0281], [40000, 0.0316], [60000, 0.0422], [Infinity, 0.0458]];
const fedDed = R.federal.standardDeduction;

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
/* Arrondi au cent « moitie vers le haut » avec une tolerance flottante : pour les ECARTS affiches,
   afin que l'ecart imprime soit la difference des deux montants imprimes. */
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

/* L'exemple pas a pas, a 75 000 $ celibataire. */
const base75 = 75000 - EX.single;                                         // 73 000
const t1 = B[0][0] * B[0][1];                                             // 7 500 x 2,11 % = 158,25
const t2 = (B[1][0] - B[0][0]) * B[1][1];                                 // 11 250 x 2,81 % = 316,125
const t3 = (B[2][0] - B[1][0]) * B[2][1];                                 // 11 250 x 3,16 % = 355,50
const t4 = (B[3][0] - B[2][0]) * B[3][1];                                 // 15 000 x 4,22 % = 633,00
const t5 = (base75 - B[3][0]) * B[4][1];                                  // 28 000 x 4,58 % = 1 282,40
const tax75 = progressiveTax(base75, B);
const cumul45 = progressiveTax(B[3][0], B);                               // 1 462,875
const jBase = 75000 - EX.marriedJoint;                                    // 71 000
const jTax = progressiveTax(jBase, B);
/* Ce que les quatre tranches basses valent par rapport a un taux unique de 4,58 %. */
const econ = B[3][0] * B[4][1] - cumul45;                                 // 2 061 - 1 462,875 = 598,125
/* Erreurs typiques. */
const sansExemption = progressiveTax(75000, B);                           // 2 836,875
const ecartSansExemption = sansExemption - a75.etat;                      // 91,60
const tauxUnique = base75 * B[4][1];                                      // 3 343,40
const ecartTauxUnique = tauxUnique - a75.etat;                            // 598,125
const valeurExemption = EX.single * B[4][1];                              // 91,60
/* La case 5 : second bareme. */
const un = salaire => progressiveTax(salaire - EX.single, ONE);
const un75 = un(75000);                                                   // 2 545,90
const ecart75 = a75.etat - un75;                                          // 199,375
const REP_CASE5 = [30000, 75000, 120000].map(g => ({ g, def: calcul(CLE, g).etat, une: un(g) }));

/* Voisins : les cinq frontaliers sont publies. */
const REF = 75000;
const COMPARE = [CLE, "kentucky", "maryland", "ohio", "pennsylvania", "virginia"];
const NOMS = { [CLE]: "West Virginia", kentucky: "Kentucky", maryland: "Maryland", ohio: "Ohio", pennsylvania: "Pennsylvania", virginia: "Virginia" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const ky75 = calcul("kentucky", REF), md75 = calcul("maryland", REF), oh75 = calcul("ohio", REF),
      pa75 = calcul("pennsylvania", REF), va75 = calcul("virginia", REF);
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

/* Le tableau des cinq tranches, pour les deux baremes. */
const libTranche = (T, i) => i === 0 ? "First " + $(T[0][0])
  : i === T.length - 1 ? "Over " + $(T[i - 1][0])
  : "Next " + $(T[i][0] - T[i - 1][0]) + " (to " + $(T[i][0]) + ")";
const TRANCHES = B.map((tr, i) => {
  if (pct(tr[1]) !== pct(ONE[i][1])) throw new Error("ARRET : les deux baremes n'ont plus les memes taux");
  return "        <tr><th scope=\"row\">" + pct(tr[1]) + "</th><td class=\"num\">" + libTranche(B, i) + "</td><td class=\"num\">" + libTranche(ONE, i) + "</td></tr>";
}).join("\n");

/* Le tableau des exemptions : ce que le calculateur compte. */
const LIGNES_EXEMPT = [
  ["Single", "1", EX.single],
  ["Married filing jointly", "2", EX.marriedJoint],
  ["Head of household", "1", EX.headOfHousehold]
].map(([lib, n, v]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $(v) + "</td></tr>").join("\n");

/* Le tableau de la case 5 : meme salaire, deux baremes. */
const LIGNES_CASE5 = REP_CASE5.map(({ g, def, une }) =>
  "        <tr><th scope=\"row\">" + $(g) + "</th><td class=\"num\">" + $$(def) + "</td><td class=\"num\">" + $$(une) + "</td><td class=\"num\">" + $$(r2(def) - r2(une)) + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the West Virginia income tax withholding rate in 2026?",
   "West Virginia&rsquo;s withholding tables have five rates: " + B.map(t => N(pct(t[1]))).join(", ").replace(/, ([^,]*)$/, " and $1") +
   ". After your employer takes " + $(EX.single) + " off your yearly pay for each exemption you claim, the first " + $(B[0][0]) + " is taxed at " + N(pct(B[0][1])) +
   ", and everything above " + $(B[3][0]) + " at " + N(pct(B[4][1])) + ". On a single filer&rsquo;s " + $(75000) +
   " salary, West Virginia withholds " + $$(a75.etat) + " a year."],

  ["How much West Virginia tax is withheld on a $75,000 salary?",
   "For a single filer claiming one exemption, West Virginia withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus a " + $(EX.single) + " exemption = " + $(base75) + ". Applying the five rates to that gives " + $$(tax75) + ". A married filer claiming two exemptions has " + $$(j75.etat) + " withheld, " +
   "and a head of household, who is given one exemption, has " + $$(h75.etat) + " withheld. All three use the Tax Division&rsquo;s default tables."],

  ["What is take-home pay on a $75,000 salary in West Virginia?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of West Virginia income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. It is before any city service fee, which this calculator does not include."],

  ["How much is $20, $25 or $30 an hour after taxes in West Virginia?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "West Virginia income tax withholding, with no retirement contribution and no city fee."],

  ["Is there a standard deduction in West Virginia withholding?",
   "Not in the formula we read. The Tax Division&rsquo;s tables for 2026 say to subtract " + $(EX.single) + " from yearly pay for each exemption claimed to get the taxable wage, and then read the tax from a table. There is no separate standard deduction step, " +
   "so the only thing that lowers a single filer&rsquo;s base before the five rates apply is the " + $(EX.single) + " exemption. Your actual tax is figured on your return, where other rules apply."],

  ["How many exemptions can I claim on West Virginia Form IT-104?",
   "The form says you may claim one exemption for yourself, plus one for your spouse and one for each dependent you expect to claim on your return. Each is worth " + $(EX.single) + " a year in the tables. " +
   "A married filer who claims both their own exemption and the spouse&rsquo;s, and whose spouse does not claim it on another certificate, enters 2. This calculator counts 1 for a single filer and for a head of household, and 2 for a married filer, and does not ask about dependents. " +
   "Each dependent would lower the base by " + $(EX.single) + " and West Virginia withholding by about " + $$(valeurExemption) + " a year at " + pct(B[4][1]) + "."],

  ["What is the box on line 5 of Form IT-104?",
   "It lets some employees choose a lower withholding rate. The form says that if you are single, a head of household, or married with a spouse who does not work, and you are paid by only one job, you must check the box on line 5 to have tax withheld at a lower rate. " +
   "Your employer then uses the Tax Division&rsquo;s one-earner table, whose tiers are wider. Without the box, we take the two-earner table to apply, and it withholds more. " +
   "On " + $(75000) + " a single filer with one exemption has " + $$(a75.etat) + " withheld on the default table and " + $$(un75) + " on the one-earner table. This calculator uses the default table."],

  ["Did West Virginia cut its income tax rates for 2026?",
   "Yes. The Tax Division says SB 392, signed into law on March 31, 2026, delivers a 5% income tax cut for all West Virginians, retroactive to January 1, 2026, and it publishes the adjusted rates: " +
   B.map(t => N(pct(t[1]))).join(", ").replace(/, ([^,]*)$/, " and $1") + ". The March 2026 withholding tables in this calculator use those rates."],

  ["Is there a local income tax in West Virginia?",
   "We found no percentage-based local income tax on wages in the documents we read. We did find city service fees: Wheeling&rsquo;s regulations tell an employer to withhold the fee from the employee&rsquo;s paycheck, and a 2017 Charleston ordinance imposed a city service fee on each employee per calendar week of employment in the city. " +
   "We did not read a current fee schedule or confirm what each city charges in 2026, so this calculator adds none of them. If you work in a city that charges one, your take-home pay may be lower than the figure shown."],

  ["Are there other deductions from a West Virginia paycheck?",
   "We found none. WorkForce West Virginia&rsquo;s claimant handbook says the unemployment insurance program is funded through taxes paid by employers and that no money is deducted from your paycheck for it. " +
   "We also found no state disability insurance or paid family leave program run through payroll. That is not proof that none exists, only what we found."],

  ["I live in Ohio, Pennsylvania, Maryland, Virginia or Kentucky and work in West Virginia. Is West Virginia tax withheld?",
   "You may be exempt from withholding. Form IT-104 says that if you are a resident of Kentucky, Maryland, Ohio, Pennsylvania or Virginia and your only source of income from West Virginia is wages or salaries, you are exempt from West Virginia personal income tax withholding, and the form explains how to ask your employer not to withhold. " +
   "This calculator assumes you live and work in West Virginia and does not model that exemption."],

  ["Does a 401(k) contribution lower my West Virginia withholding?",
   "In this calculator, yes. The Tax Division&rsquo;s help page says compensation subject to federal withholding is subject to West Virginia withholding, but its tables do not mention 401(k) contributions, so treating them as lowering the wages West Virginia taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), West Virginia income tax withholding falls by " + $$(gain401) + " a year. Ask your payroll department how your employer treats it."],

  ["Why is my West Virginia paycheck different from this calculator?",
   "Common reasons include: you claimed a different number of exemptions on Form IT-104, or checked the box on line 5; you asked for an extra amount to be withheld on line 6; your employer rounds each paycheck&rsquo;s withholding to the whole dollar, as the Tax Division&rsquo;s instructions say; " +
   "health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; a city service fee applies; or part of your pay is a bonus. Withholding is only an estimate of what you will owe, and the final amount is settled when you file."]
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
const reponse = "West Virginia withholds at 2.11% to 4.58% in 2026, after $2,000 comes off your yearly pay for each exemption you claim. " +
  "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script src="/assets/analytics.js" defer></script>
<title>West Virginia (WV) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free West Virginia (WV) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and West Virginia tax. Top rate 4.58%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="West Virginia (WV) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="West Virginia withholds 2.11% to 4.58% after a $2,000 exemption for each person you claim. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "West Virginia Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 West Virginia take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and West Virginia income tax withheld under the West Virginia Tax Division percentage method (a $2,000 exemption per person, then 2.11%, 2.81%, 3.16%, 4.22% and 4.58%)."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "West Virginia", "item": "${URL}" }
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
    <li aria-current="page">West Virginia</li>
  </ol>
</nav>

  <h1>West Virginia Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your West Virginia take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the number of West Virginia
          exemptions: one for single and head of household, two for married.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your West Virginia income tax withholding too.</span>
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
    <p>West Virginia&rsquo;s withholding method has no standard deduction step. The West Virginia Tax Division prints a percentage table for each pay period. Each one takes a set amount off the paycheck for every exemption you claimed on Form IT-104, and then reads the tax off a schedule with five rates.
    The yearly table takes ${N($(EX.single))} off for each exemption, and this calculator follows it: it works on your yearly pay and divides the result by your pay periods. The tax is figured the same way for every filing status; what changes with your status is how many exemptions you have.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>West Virginia income tax</strong>: your wages after any 401(k) contribution, minus the exemption amount for your status (${N($(EX.single))} single, ${N($(EX.marriedJoint))} married),
      taxed at ${B.map(t => N(pct(t[1]))).join(", ").replace(/, ([^,]*)$/, " and $1")}.</li>
    </ul>
    <p>This calculator has no other West Virginia line. We looked for a state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    West Virginia, the <strong>West Virginia Tax Division</strong>&rsquo;s March 2026 withholding tables (Form IT-100.2A), its Form IT-104, its 2026 rate cut page and its withholding help page, and <strong>WorkForce West Virginia</strong>&rsquo;s claimant handbook.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Tax Division prints twelve tables: two sets, one for two earners or two jobs and one for one earner and one job, each with five rates and each covering weekly, biweekly, twice-a-month, monthly, yearly and daily pay.
    We rebuilt the two yearly tables from this calculator&rsquo;s figures and matched every threshold, rate and base amount to the document, with no differences. The other ten tables round their thresholds to the whole dollar, and the largest gap we measured between a printed table and the formula was under three cents per pay period.
    The Tax Division also rounds each paycheck&rsquo;s withholding to the whole dollar and this calculator does not, so a pay stub can differ from the result here by up to 50 cents a pay period for this reason alone.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Tax Division&rsquo;s method. Your actual West Virginia income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents, the box on line 5 of Form IT-104, extra withholding, exemption from withholding for residents of neighboring states, bonuses, city service fees, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>West Virginia take-home pay by salary</h2>
  <p class="prose">Single filer, one exemption, no retirement contribution, 2026 state and federal rates. The
  WV state tax + programs column is West Virginia income tax withholding; we found no West Virginia payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 West Virginia take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">WV state tax + programs</th>
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

    <h2>West Virginia&rsquo;s five rates and the base they apply to</h2>
    <p>These are the tiers in the Tax Division&rsquo;s 2026 withholding tables. They apply to your yearly pay after the exemption is subtracted, not to your pay itself. For a single filer on ${N($(75000))}, that amount is ${N($(75000))} &minus; ${N($(EX.single))} = ${N($(base75))}.
    Only the first ${N($(B[3][0]))} of it is taxed below ${N(pct(B[4][1]))}, so for any base above ${N($(B[3][0]))}, ${N(pct(B[4][1]))} is the rate on every extra dollar.
    The Tax Division prints two sets of tiers with the same rates. The first, built for two earners or two jobs, is the default. The second, for one earner and one job, has wider tiers.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        West Virginia withholding tiers by size of the base, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Default table (two earners or two jobs)</th>
          <th scope="col">Line 5 table (one earner, one job)</th>
        </tr>
      </thead>
      <tbody>
${TRANCHES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Exemptions: the number that sets your withholding</h2>
    <p>On Form IT-104 you claim one exemption for yourself, one for your spouse if you are married and the spouse is not claimed on another certificate, and one for each dependent you expect to claim on your return. Each exemption takes ${N($(EX.single))} off your yearly pay in the tables. The form we read is the March 2023 revision (&ldquo;Rev. 03/2023&rdquo; in its header). This is how the calculator counts them.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Exemptions this calculator assumes, by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status</th>
          <th scope="col">Exemptions</th>
          <th scope="col">Taken off yearly pay</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_EXEMPT}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>With one exemption, a single filer has nothing withheld on yearly pay up to ${N($(EX.single))}, and a married filer with two exemptions has nothing withheld up to ${N($(EX.marriedJoint))}. The calculator does not ask about dependents. Each one you would add lowers the base by ${N($(EX.single))}, which is worth about ${N($$(valeurExemption))} a year of West Virginia withholding at ${N(pct(B[4][1]))}.</p>

    <h2>The line 5 box: what it changes</h2>
    <p>The Tax Division prints two sets of percentage tables. The first is labeled &ldquo;Two earner/two or more jobs&rdquo; and covers married filing jointly with both spouses working, or one person earning wages from two jobs. The second is labeled &ldquo;Optional one earner/one job&rdquo; and covers single, head of household, or married with a nonemployed spouse. Form IT-104 says the revised tables should give a more accurate amount for a married couple who both work or for someone with two or more jobs. It gives some employees a way out: if you are single, a head of household, or married with a spouse who does not work, and you are paid by only one job, you can check the box on line 5 to have tax withheld at a lower rate. Your employer then uses the one-earner tables. Without the box, we take the two-earner tables to apply, because the one-earner tables are labeled optional and the form offers the lower rate only to those who check the box. One page in the Tax Division&rsquo;s help section calls the optional tables &ldquo;Two Earner&rdquo;, the opposite of the labels on the tables and on the form, so we followed the tables and the form.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        West Virginia withholding a year on the two tables, single filer with one exemption, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Yearly pay</th>
          <th scope="col">Default table</th>
          <th scope="col">Line 5 table</th>
          <th scope="col">Difference</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_CASE5}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>This calculator uses the default table for every filing status, because that is what an employer applies unless the box is checked. If you checked it, the result here overstates your West Virginia withholding by the amount in the last column.</p>

    <h2>West Virginia hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in West Virginia?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and West Virginia income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. West Virginia&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in West Virginia?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. West Virginia income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The Tax Division&rsquo;s help page has a section on supplemental withholding, which this calculator does not use; its example still shows a 4.82% rate that does not appear in the 2026 tables, so check any bonus withholding with your employer.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>West Virginia take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 West Virginia take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in West Virginia</h2>

  <h3>There is no standard deduction, only the exemption</h3>
  <p>A single filer&rsquo;s base is pay minus ${N($(EX.single))}, and nothing else comes off before the rates apply. At ${N($(30000))}, West Virginia withholds ${N($(a30.etat))} a year. A married filer with two exemptions has ${N($(EX.marriedJoint))} taken off instead, which is why West Virginia withholds ${N($$(j75.etat))} from a married filer on ${N("$75,000")} and ${N($$(a75.etat))} from a single one.</p>

  <h3>Only the first ${$(B[3][0])} of the base is taxed below the top rate</h3>
  <p>The five rates form a graduated schedule. The first ${N($(B[3][0]))} of the base is taxed at ${N(pct(B[0][1]))}, ${N(pct(B[1][1]))}, ${N(pct(B[2][1]))} and ${N(pct(B[3][1]))}, which comes to ${N($$(cumul45))} in all. Compared with taxing every dollar up to ${N($(B[3][0]))} at ${N(pct(B[4][1]))}, the four lower tiers save a single filer about ${N($(econ))} a year.
  Past ${N($(B[3][0]))}, each extra dollar of base is taxed at ${N(pct(B[4][1]))}, whether your pay is ${N($(60000))} or ${N($(250000))}.</p>

  <h3>Each exemption takes ${$(EX.single)} off your pay</h3>
  <p>One exemption takes ${N($(EX.single))} off your yearly pay before the rates apply, which saves about ${N($$(valeurExemption))} a year in West Virginia tax at ${N(pct(B[4][1]))}. On ${N("$75,000")}, the single filer&rsquo;s one exemption brings the base down to ${N($(base75))}, and a married filer&rsquo;s two bring it to ${N($(jBase))}.
  The calculator&rsquo;s married result assumes both exemptions are claimed on one certificate.</p>

  <h3>Head of household gets one exemption, like a single filer</h3>
  <p>Form IT-104 does not give a head of household a separate exemption or a separate table, so the calculator withholds a head of household the way it does a single filer: ${N($$(h75.etat))} on ${N("$75,000")}. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>The 2026 rates come from a 5% cut that reaches back to January 1</h3>
  <p>The Tax Division says SB 392, signed on March 31, 2026, delivers an across-the-board income tax cut of 5%, retroactive to January 1, 2026. The rates on this page are the cut rates, and the withholding tables dated March 2026 use them. Your return is where the final amount is set.</p>

  <h3>We found no state payroll deductions</h3>
  <p>WorkForce West Virginia says the unemployment insurance program is funded through taxes paid by employers, and that no money is deducted from your paycheck to pay for it. We did not find a state disability insurance or paid family leave program run through payroll. That is a statement about what we read, not a guarantee that nothing exists, and your pay stub is the final word.</p>

  <h3>City service fees are not in the calculator</h3>
  <p>We found no percentage-based local income tax on wages. We did find that some cities charge a flat city service fee for each week of work in the city. Wheeling&rsquo;s regulations tell the employer to withhold it from your paycheck, and a 2017 Charleston ordinance imposed it per calendar week of employment within the city. We did not read a current fee schedule or confirm what each city charges in 2026, so we show no amount. If you work in one of these cities, check your pay stub.</p>

  <h3>Residents of five neighboring states may be exempt</h3>
  <p>Form IT-104 says that if you live in Kentucky, Maryland, Ohio, Pennsylvania or Virginia and your only West Virginia income is wages or salaries, you are exempt from West Virginia withholding, and it provides a certification to give your employer. The calculator assumes you live in West Virginia and does not model the exemption.</p>

  <h3>Your 401(k) lowers your West Virginia wages in this calculator</h3>
  <p>The Tax Division&rsquo;s tables do not mention 401(k) contributions, so this is our modeling choice, the same as for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, West Virginia income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Forgetting the exemption</h3>
  <p>Applying the rates to the full ${N($(75000))} instead of ${N($(base75))} overstates West Virginia withholding by ${N($$(ecartSansExemption))}: ${N($$(sansExemption))} instead of ${N($$(a75.etat))}.</p>

  <h3>Taxing the whole base at the top rate</h3>
  <p>The ${N(pct(B[4][1]))} rate applies only to the base above ${N($(B[3][0]))}. Applying it to all of ${N($(base75))} gives ${N($$(tauxUnique))}, which overstates withholding by about ${N($(ecartTauxUnique))}.</p>

  <h3>Looking for a married table</h3>
  <p>We found none. The Tax Division&rsquo;s percentage tables are labeled by earners and jobs: one set for married filing jointly with both spouses working, or one person with two jobs, and one set for single, head of household, or married with a nonemployed spouse. For a married couple, marital status shows up in the number of exemptions and in which set of tables applies.</p>

  <h3>Checking the line 5 box when your household has two paychecks</h3>
  <p>The form offers the box only to single filers, heads of household, and married employees whose spouse does not work, and only if you have one job. On ${N("$75,000")} the box lowers a single filer&rsquo;s withholding by ${N($$(r2(a75.etat) - r2(un75)))}. Checking it when the household has other income can leave too little withheld, and you could owe more when you file.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the exemptions on your Form IT-104 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in West Virginia in 2026, claiming one exemption and no retirement
  contribution, on the default tables:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>West Virginia base: ${N($(a75.brut))} &minus; ${N($(EX.single))} exemption = ${N($(base75))}</li>
    <li>Tax on the base: ${N($(B[0][0]))} &times; ${N(pct(B[0][1]))} = ${N($$(t1))}, plus ${N($(B[1][0] - B[0][0]))} &times; ${N(pct(B[1][1]))} = ${N($$(t2))}, plus ${N($(B[2][0] - B[1][0]))} &times; ${N(pct(B[2][1]))} = ${N($$(t3))}, plus ${N($(B[3][0] - B[2][0]))} &times; ${N(pct(B[3][1]))} = ${N($$(t4))}, plus (${N($(base75))} &minus; ${N($(B[3][0]))}) &times; ${N(pct(B[4][1]))} = ${N($$(t5))}, which makes
    West Virginia income tax withholding of ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. West Virginia borders five states, and we have a calculator for every one of them: Ohio, Pennsylvania, Maryland, Virginia and Kentucky.
  West Virginia is shown with one exemption and its income tax withholding only. The Maryland row includes Maryland&rsquo;s local income tax at the ${MD_COMTE.charAt(0).toUpperCase() + MD_COMTE.slice(1)} County rate, and the Ohio, Pennsylvania and Kentucky rows leave out their local taxes, as West Virginia&rsquo;s row leaves out city service fees.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences in this paragraph use the exact amounts. Compared with a West Virginia worker on the same salary, an <a href="/paycheck-calculator/ohio/">Ohio</a> worker ${plusMoins(oh75)}, a <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker ${plusMoins(pa75)}, a <a href="/paycheck-calculator/maryland/">Maryland</a> worker ${plusMoins(md75)}, a <a href="/paycheck-calculator/virginia/">Virginia</a> worker ${plusMoins(va75)}, and a <a href="/paycheck-calculator/kentucky/">Kentucky</a> worker ${plusMoins(ky75)}. A worker who lives in one of those states and commutes into West Virginia is a different case that this calculator does not model: it assumes a West Virginia resident working in West Virginia.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/ohio/">Ohio paycheck calculator</a> &mdash; the neighbor to the northwest, and one of the five states whose residents may be exempt from West Virginia withholding.</li>
    <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a> &mdash; the neighbor to the north, with a flat 3.07% from the first dollar.</li>
    <li><a href="/paycheck-calculator/maryland/">Maryland paycheck calculator</a> &mdash; the neighbor to the northeast, which adds a local income tax.</li>
    <li><a href="/paycheck-calculator/virginia/">Virginia paycheck calculator</a> &mdash; the neighbor to the southeast, with four brackets and no local income tax.</li>
    <li><a href="/paycheck-calculator/kentucky/">Kentucky paycheck calculator</a> &mdash; the neighbor to the southwest, a flat 3.5% after a $3,360 deduction.</li>
    <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 take-home pay in every state we publish</a> &mdash; where West Virginia ranks on one salary.</li>
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
    West Virginia rates, and do not include city service fees.
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

/* 1. Recoupement independant : la formule de l'IT-100.2A ecrite ici A PARTIR DU TEXTE
   (salaire - exemption(s) de 2 000 $ ; table annuelle imprimee : bases 0 / 158,25 / 474,38 / 829,88 / 1 462,88
   -> on utilise les cumuls EXACTS, 474,375 et 1 462,875, car le moteur ne les arrondit pas), pas du moteur. */
const imprime = (net, tab) => { let t = 0; for (const [seuil, base, taux] of tab) if (net > seuil) t = base + taux * (net - seuil); return t; };
const TAB_2E = [[0, 0, 0.0211], [7500, 158.25, 0.0281], [18750, 474.375, 0.0316], [30000, 829.875, 0.0422], [45000, 1462.875, 0.0458]];
const TAB_1E = [[0, 0, 0.0211], [10000, 211, 0.0281], [25000, 632.5, 0.0316], [40000, 1106.5, 0.0422], [60000, 1950.5, 0.0458]];
const fed75 = 7670;                          // 58 900 imposables : 1 240 + 4 560 + 1 870
const fedJ = 4640;                           // 42 800 imposables : 2 480 + 2 160
const fedH = 5748;                           // 50 850 imposables : 1 770 + 3 978
if (Math.abs(imprime(75000 - 2000, TAB_2E) - a75.etat) > 0.006) echec("WV 75 000 $ : IT-100.2A " + imprime(73000, TAB_2E) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000 - 4000, TAB_2E) - j75.etat) > 0.006) echec("WV marie 75 000 $ : IT-100.2A " + imprime(71000, TAB_2E) + ", moteur " + j75.etat);
if (Math.abs(imprime(75000 - 2000, TAB_1E) - un75) > 0.006) echec("WV 75 000 $ case 5 : IT-100.2A " + imprime(73000, TAB_1E) + ", ici " + un75);
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 13/10/2026). */
const attendusProse = [
  [a75.etat, 2745.275, "etat 75 000"], [base75, 73000, "base 75 000"], [tax75, 2745.275, "impot sur la base"],
  [t1, 158.25, "7 500 x 2,11 %"], [t2, 316.125, "11 250 x 2,81 %"], [t3, 355.50, "11 250 x 3,16 %"], [t4, 633.00, "15 000 x 4,22 %"], [t5, 1282.40, "28 000 x 4,58 %"],
  [cumul45, 1462.875, "cumul des quatre premieres tranches"],
  [a75.net, 58847.225, "net 75 000"], [a75.total, 16152.775, "total 75 000"],
  [j75.etat, 2653.675, "etat marie"], [jBase, 71000, "base mariee"], [jTax, 2653.675, "impot marie"],
  [h75.etat, 2745.275, "etat chef de famille"], [h75.net, 60769.225, "net chef de famille"],
  [a30.etat, 766.675, "etat 30 000"],
  [sansExemption, 2836.875, "sans exemption"], [ecartSansExemption, 91.60, "ecart sans exemption"],
  [tauxUnique, 3343.40, "base x 4,58 %"], [ecartTauxUnique, 598.125, "ecart taux unique"],
  [econ, 598.125, "economie des quatre tranches basses"],
  [un75, 2545.90, "case 5, 75 000 $"], [ecart75, 199.375, "ecart case 5, 75 000 $"],
  [REP_CASE5[0].une, 727.30, "case 5, 30 000 $"], [REP_CASE5[2].def, 4806.275, "defaut, 120 000 $"], [REP_CASE5[2].une, 4606.90, "case 5, 120 000 $"],
  [gain401, 206.10, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [valeurExemption, 91.60, "valeur d'une exemption a 4,58 %"],
  [h25.net, 42270.125, "net 25 $/h"]
];
/* 20 $/h, 30 $/h : recalcules a la main. 20 $/h = 41 600 $, base 39 600 : 829,875 + 9 600 x 4,22 % = 829,875 + 405,12 = 1 234,995.
   30 $/h = 62 400 $, base 60 400 : 1 462,875 + 15 400 x 4,58 % = 1 462,875 + 705,32 = 2 168,195. 25 $/h = 52 000 $, base 50 000 : 1 462,875 + 229 = 1 691,875. */
attendusProse.push([h20.etat, 1234.995, "etat 20 $/h"], [h30.etat, 2168.195, "etat 30 $/h"], [h25.etat, 1691.875, "etat 25 $/h"]);
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(EX.single === 2000 && EX.marriedJoint === 4000 && EX.headOfHousehold === 2000)) echec("exemptions != 2 000 / 4 000 / 2 000");
if (!(B.length === 5 && B[0][0] === 7500 && B[1][0] === 18750 && B[2][0] === 30000 && B[3][0] === 45000)) echec("seuils des tranches != 7 500 / 18 750 / 30 000 / 45 000");
if (!(ONE[0][0] === 10000 && ONE[3][0] === 60000)) echec("seuils du bareme one-earner != 10 000 / 25 000 / 40 000 / 60 000");
if (IT.standardDeduction !== undefined) echec("la Virginie-Occidentale ne doit pas avoir de deduction standard dans le moteur");
if (!(R.states.kentucky.incomeTax.hasIncomeTax && R.states.maryland.incomeTax.hasIncomeTax && R.states.ohio.incomeTax.hasIncomeTax && R.states.pennsylvania.incomeTax.hasIncomeTax && R.states.virginia.incomeTax.hasIncomeTax)) echec("un voisin n'a plus d'impot");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("la Virginie-Occidentale ne doit avoir aucun programme");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements IT-100.2A (formule imprimee ecrite a la main, 75 000 $ celibataire, marie et case 5) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
