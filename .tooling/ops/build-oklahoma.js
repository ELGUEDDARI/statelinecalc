/* Construit /paycheck-calculator/oklahoma/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Oklahoma est le 37e Etat publie. Aucun mecanisme nouveau au moteur : premiere
 * tranche a 0 % + personalExemption par statut (comme le Wisconsin et l'Alabama),
 * sans deduction standard separee. Ce qu'il a de propre :
 *
 *   1. LA FORMULE N'A PAS DE DEDUCTION STANDARD. Packet OW-2 « 2026 Oklahoma Income
 *      Tax Withholding Tables » (Revised 11-2025) : l'allowance (1 000 $ / periodes)
 *      est retranchee du salaire, puis la table s'applique. La premiere tranche est a
 *      0 % jusqu'a 10 100 $ (celibataire) / 20 200 $ (marie) : 3 750 + 6 350 et
 *      7 500 + 12 700 (loi 2026 + deduction standard lue dans l'OK-W-4). C'est un
 *      constat ARITHMETIQUE, la page ne pretend pas connaitre l'intention de l'agence.
 *   2. TROIS TAUX (2,5 / 3,5 / 4,5 %) APRES UNE TRANCHE A 0 % : a 75 000 $, 4,5 % est
 *      le taux marginal.
 *   3. ALLOWANCES : 1 000 $ chacune ; OK-W-4 : 1 pour soi, 1 pour un conjoint qui ne
 *      travaille pas. Modele : celibataire 1, marie 2, chef de famille 1 (table
 *      « Single » : l'OK-W-4 n'a que Single / Married / « Married, but withhold at
 *      higher Single rate »).
 *   4. LOI 2026 (HB 2764) : baisse de taux pour 2026 ; une baisse supplementaire de
 *      0,25 % declenchable par le Board of Equalization ne peut pas toucher 2026
 *      (Revenue Impact Statement, version CS : « tax year 2028 »).
 *   5. AUCUNE RETENUE SALARIEE D'ETAT TROUVEE : chomage a la charge de l'employeur
 *      (OESC) ; ni SDI ni conge paye lus ; aucune taxe locale sur les salaires trouvee
 *      dans les pages de l'agence : « we found », JAMAIS « Oklahoma has no ».
 *   6. LES TABLES IMPRIMEES se recoupent avec la formule : .tooling/test/verif-retenue-ok.js
 *      (10 tables de tranches de salaire, 440 lignes, 4 840 cases, lues par
 *      coordonnees : ok-tables-extract.py).
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * oklahoma.gov (OTC, OESC), oklegislature.gov : HTTP 200 le 06/10/2026. Dates et
 * citations : data/rates-2026.js (bloc OKLAHOMA) et .tooling/lib/sources.js (PAR_ETAT.oklahoma).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Oklahoma has no local income tax » ni « no SDI » : negatif non prouvable ;
 *   - pas de base salariale chomage (la page « Contribution Rates » affiche le millesime
 *     2027 ; la base 2026 n'a pas ete lue) ;
 *   - pas de taux anterieur a 2026 (jamais lu dans un document officiel) ;
 *   - 401(k) : choix de modelisation dit sur la page (le OW-2 ne le traite pas) ;
 *   - personnes a charge, allowances supplementaires, retenue supplementaire, « Exempt »,
 *     militaires, non-residents, primes : non modelises.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js, hors
 * les attendus recalcules a la main dans les garde-fous du bas.
 * Lancer : node .tooling/ops/build-oklahoma.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "oklahoma";
const NOM = "Oklahoma";
const URL = "https://statelinecalc.com/paycheck-calculator/oklahoma/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const OKS = R.states[CLE];
const IT = OKS.incomeTax;
const EX = IT.personalExemption;                       // 1 000 / 2 000 / 1 000
const B_S = IT.brackets.single, B_M = IT.brackets.marriedJoint;
const fedDed = R.federal.standardDeduction;
/* Constantes de LECTURE (OK-W-4 et loi 2026), recoupees par verif-retenue-ok.js : */
const LOI_ZERO_S = 3750, LOI_ZERO_M = 7500, DED_S = 6350, DED_M = 12700;

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
const base75 = 75000 - EX.single;                                  // 74 000
const t1 = (B_S[1][0] - B_S[0][0]) * B_S[1][1];                    // 1 150 x 2,5 % = 28,75
const t2 = (B_S[2][0] - B_S[1][0]) * B_S[2][1];                    // 2 300 x 3,5 % = 80,50
const t3 = (base75 - B_S[2][0]) * B_S[3][1];                       // 60 450 x 4,5 % = 2 720,25
const tax75 = progressiveTax(base75, B_S);
const zeroS = B_S[0][0], zeroM = B_M[0][0];                        // 10 100 / 20 200
const jBase = 75000 - EX.marriedJoint;                             // 73 000
const jTax = progressiveTax(jBase, B_M);
/* Ce que valent les trois premieres tranches par rapport a un taux unique de 4,5 %. */
const econS = B_S[2][0] * B_S[3][1] - progressiveTax(B_S[2][0], B_S);   // 609,75 - 109,25 = 500,50
const econM = B_M[2][0] * B_M[3][1] - progressiveTax(B_M[2][0], B_M);   // 1 219,50 - 218,50 = 1 001,00
/* Erreurs typiques. */
const sansAllowance = progressiveTax(75000, B_S);                       // 2 874,50
const ecartSansAllowance = sansAllowance - a75.etat;                    // 45,00
const deuxFoisDed = progressiveTax(base75 - DED_S, B_S);                // 2 543,75 : deduction standard retranchee en plus
const ecartDeuxFois = a75.etat - deuxFoisDed;                           // 285,75
/* Seuil de salaire brut sous lequel rien n'est retenu. */
const zeroBrutS = zeroS + EX.single;                                    // 11 100
const zeroBrutM = zeroM + EX.marriedJoint;                              // 22 200
const a30tax = a30.etat;

/* Voisins : Texas, Arkansas, Colorado, New Mexico (publies) ; Kansas et Missouri ne le sont pas. */
const REF = 75000;
const COMPARE = [CLE, "texas", "arkansas", "colorado", "new-mexico"];
const NOMS = { [CLE]: "Oklahoma", texas: "Texas", arkansas: "Arkansas", colorado: "Colorado", "new-mexico": "New Mexico" };
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const tx75 = calcul("texas", REF), ar75 = calcul("arkansas", REF), co75 = calcul("colorado", REF), nm75 = calcul("new-mexico", REF);
const plusMoins = (autre, nom) => autre.net > a75.net
  ? "a " + nom + " worker keeps " + N($$(autre.net - a75.net)) + " more"
  : "a " + nom + " worker keeps " + N($$(a75.net - autre.net)) + " less";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des quatre tranches : seuils lus dans brackets. */
const TRANCHES = [
  ["0%", "First " + $(B_S[0][0]), "First " + $(B_M[0][0])],
  ["2.5%", "Next " + $(B_S[1][0] - B_S[0][0]) + " (to " + $(B_S[1][0]) + ")", "Next " + $(B_M[1][0] - B_M[0][0]) + " (to " + $(B_M[1][0]) + ")"],
  ["3.5%", "Next " + $(B_S[2][0] - B_S[1][0]) + " (to " + $(B_S[2][0]) + ")", "Next " + $(B_M[2][0] - B_M[1][0]) + " (to " + $(B_M[2][0]) + ")"],
  ["4.5%", "Over " + $(B_S[2][0]), "Over " + $(B_M[2][0])]
].map(([t, s, m], i) => {
  if (pct(B_S[i][1]) !== t || pct(B_M[i][1]) !== t) throw new Error("ARRET : taux != tableau");
  return "        <tr><th scope=\"row\">" + t + "</th><td class=\"num\">" + s + "</td><td class=\"num\">" + m + "</td></tr>";
}).join("\n");

/* Le tableau de la tranche a 0 % : de quoi elle est faite (lu dans le OK-W-4 et la loi 2026). */
const LIGNES_ZERO = [
  ["Zero-rate bracket in the 2026 tax law", LOI_ZERO_S, LOI_ZERO_M],
  ["Standard deduction (Form OK-W-4)", DED_S, DED_M],
  ["Zero tier in the withholding formula", zeroS, zeroM]
].map(([lib, s, m], i) => "        <tr><th scope=\"row\">" + (i === 2 ? "<strong>" + lib + "</strong>" : lib) + "</th><td class=\"num\">" + $(s) + "</td><td class=\"num\">" + $(m) + "</td></tr>").join("\n");

/* Le tableau des allowances : ce que le calculateur compte. */
const LIGNES_ALLOW = [
  ["Single", "1", EX.single],
  ["Married filing jointly", "2", EX.marriedJoint],
  ["Head of household", "1", EX.headOfHousehold]
].map(([lib, n, v]) => "        <tr><th scope=\"row\">" + lib + "</th><td class=\"num\">" + n + "</td><td class=\"num\">" + $(v) + "</td></tr>").join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Oklahoma income tax withholding rate in 2026?",
   "Oklahoma&rsquo;s withholding formula has four tiers, " + N(pct(B_S[0][1])) + ", " + N(pct(B_S[1][1])) + ", " + N(pct(B_S[2][1])) + " and " + N(pct(B_S[3][1])) +
   ". After your employer takes " + $(EX.single) + " off your yearly pay for each allowance, the first " + $(B_S[0][0]) + " is not taxed (" + $(B_M[0][0]) + " on the married table), the next " + $(B_S[1][0] - B_S[0][0]) + " is taxed at " + N(pct(B_S[1][1])) +
   ", the next " + $(B_S[2][0] - B_S[1][0]) + " at " + N(pct(B_S[2][1])) + ", and everything above " + $(B_S[2][0]) + " at " + N(pct(B_S[3][1])) + ". On a single filer&rsquo;s " + $(75000) +
   " salary, Oklahoma withholds " + $$(a75.etat) + " a year."],

  ["How much Oklahoma tax is withheld on a $75,000 salary?",
   "For a single filer claiming one allowance, Oklahoma withholds " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "The base is " + $(75000) + " minus a " + $(EX.single) + " allowance = " + $(base75) + ". Applying the four tiers to that gives " + $$(tax75) + ". A married filer claiming two allowances has " + $$(j75.etat) + " withheld, " +
   "and a head of household, who uses the single table, has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in Oklahoma?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) +
   " of Oklahoma income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. We found no other state payroll deduction, so this calculator shows no other Oklahoma line."],

  ["How much is $20, $25 or $30 an hour after taxes in Oklahoma?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) + " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) +
   " an hour. $30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures after federal tax, FICA and " +
   "Oklahoma income tax withholding, with no retirement contribution."],

  ["Why is nothing withheld on the first $10,100 in Oklahoma?",
   "Because the first tier of the withholding table is taxed at " + N("0%") + ". On the single table it runs to " + $(zeroS) + " of yearly pay left after allowances, so a single filer with one allowance has nothing withheld on pay up to " + $(zeroBrutS) + " a year. " +
   "The number is the sum of two figures we read: the " + $(LOI_ZERO_S) + " zero-rate bracket in the 2026 tax law and the " + $(DED_S) + " standard deduction on Form OK-W-4. On the married table the tier is " + $(zeroM) + ", which is " + $(LOI_ZERO_M) + " plus " + $(DED_M) + ". " +
   "We are describing how the numbers add up, not why the Tax Commission built the table that way."],

  ["What is an allowance on Oklahoma Form OK-W-4?",
   "It is a number you give your employer that lowers the pay Oklahoma taxes. Each one is worth " + $(EX.single) + " a year: the Tax Commission&rsquo;s tables say the amount is the &ldquo;personal exemption amount of $1,000.00 divided by the number of payroll periods in the calendar year.&rdquo; " +
   "You claim 1 for yourself, 1 for a spouse who does not work (0 if the spouse works), 1 for each dependent, and more if you itemize or have other state deductions or credits. " +
   "This calculator counts 1 for a single filer and for a head of household, and 2 for a married filer whose spouse does not work."],

  ["What does &ldquo;Married, but withhold at higher Single rate&rdquo; mean in Oklahoma?",
   "It is the third filing status on Form OK-W-4, next to Single and Married. The Tax Commission&rsquo;s tables say that if an employee chooses it, the employer uses the Single Persons table. " +
   "The form has no head of household choice and the tables have only a single and a married version, so this calculator gives a head of household the single table and one allowance. On " + $(75000) + " that withholds " + $$(h75.etat) + ", the same as for a single filer."],

  ["Did Oklahoma cut its income tax rates for 2026?",
   "Yes. The Tax Commission&rsquo;s 2025 Tax Legislation Summary lists an &ldquo;individual income tax rate reduction, effective for tax year 2026 and subsequent tax years&rdquo; in HB 2764, and prints the 2026 brackets this calculator uses: " + N("0%") + ", " + N("2.5%") + ", " + N("3.5%") + " and " + N("4.5%") + ". " +
   "The law also lets the State Board of Equalization trigger a further " + N("0.25%") + " cut across all brackets when revenue conditions are met. The Legislature&rsquo;s revenue impact statement for the bill says the first tax year such a cut could take effect is 2028, so none can change 2026 withholding. " +
   "That statement describes the committee version of the bill, so we will re-read the sources in January 2027."],

  ["Is there a local income tax in Oklahoma?",
   "We found none. The Oklahoma Tax Commission&rsquo;s withholding tables and its withholding page cover only state withholding, and we did not find a local income tax on wages in the agency pages we read. " +
   "That is not proof that none exists, so if you work in a city that you think taxes wages, check your pay stub. This calculator adds no local line."],

  ["Are there other deductions from an Oklahoma paycheck?",
   "We found none. The Oklahoma Employment Security Commission says most Oklahoma employers are required to pay a tax to the state Unemployment Insurance Trust Fund, and the pages we read describe no deduction from employee wages. " +
   "We also found no state disability insurance or paid family leave program run through payroll. That is not proof that none exists, only what we found."],

  ["Does a 401(k) contribution lower my Oklahoma withholding?",
   "In this calculator, yes. The Tax Commission&rsquo;s withholding tables do not mention 401(k) contributions, so treating them as lowering the wages Oklahoma taxes is our modeling choice, the same one we use for federal tax and in every other state here. " +
   "On " + $(75000) + " with 6% going into a 401(k), Oklahoma income tax withholding falls by " + $$(gain401) + " a year. Ask your payroll department how your employer treats it."],

  ["Why is my Oklahoma paycheck different from this calculator?",
   "Common reasons include: you claimed a different number of allowances on Form OK-W-4; you asked for an extra amount to be withheld, or wrote &ldquo;Exempt&rdquo; on the form; your employer uses the printed tables, which round each paycheck&rsquo;s withholding to the whole dollar, instead of the formula; " +
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
const reponse = "Oklahoma withholds at 2.5%, 3.5% and 4.5% in 2026, after a 0% tier on the first " + $(zeroS) + " of pay left once allowances are subtracted. " +
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
<title>Oklahoma (OK) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Oklahoma (OK) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA and Oklahoma tax. Top rate 4.5%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Oklahoma (OK) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Oklahoma&rsquo;s withholding formula taxes nothing on the first ${$(zeroS)} left after allowances, then 2.5%, 3.5% and 4.5%. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Oklahoma Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Oklahoma take-home pay, hourly or salary, after federal income tax, Social Security, Medicare and Oklahoma income tax withheld under the Oklahoma Tax Commission formula (a $1,000 allowance per person, a zero tier, then 2.5%, 3.5% and 4.5%)."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Oklahoma", "item": "${URL}" }
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
    <li aria-current="page">Oklahoma</li>
  </ol>
</nav>

  <h1>Oklahoma Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist(CLE)}

    <h2 id="calc-h" class="u-mt-0">Calculate your Oklahoma take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Oklahoma
          withholding table and allowances: one allowance for single and head of household, two
          for married with a spouse who does not work.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Oklahoma income tax withholding too.</span>
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
    <p>Oklahoma&rsquo;s withholding formula has no standard deduction line of its own. The Oklahoma Tax Commission&rsquo;s withholding tables tell your employer to turn your pay into a yearly figure, take ${N($(EX.single))} off it for each withholding allowance you claimed on Form OK-W-4, and then read the result off a percentage table.
    The first tier of that table is taxed at ${N("0%")}, and it is large enough to cover the standard deduction. The employer then divides the yearly amount by the number of pay periods.</p>

    <p>The calculator applies these deductions in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Oklahoma income tax</strong>: your wages after any 401(k) contribution, minus the allowance amount for your status (${N($(EX.single))} single, ${N($(EX.marriedJoint))} married),
      taxed at ${N("0%")}, ${N(pct(B_S[1][1]))}, ${N(pct(B_S[2][1]))} and ${N(pct(B_S[3][1]))}.</li>
    </ul>
    <p>This calculator has no other Oklahoma line. We looked for a state payroll deduction on your check and found none.</p>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Oklahoma, the <strong>Oklahoma Tax Commission</strong>&rsquo;s 2026 income tax withholding tables (Packet OW-2, effective January 1, 2026), its Form OK-W-4 and its 2025 tax legislation summary, and the <strong>Oklahoma Employment Security Commission</strong>&rsquo;s employer page.
    Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>How we checked the formula against the printed tables.</strong> The Tax Commission prints annual and per-period percentage tables, and wage-bracket tables for weekly, biweekly, semimonthly, monthly and daily pay, for single and married employees, with a column for each number of allowances from 0 to 10 or more.
    We rebuilt the annual table from this calculator&rsquo;s figures and matched it line for line to the document, then checked every cell of the ten wage-bracket tables, 4,840 in all, against the formula. Each printed amount is what the formula gives somewhere in its pay range, once rounded to the whole dollar.
    The agency rounds each paycheck&rsquo;s withholding to the whole dollar and this calculator does not, so a pay stub can differ from the result here by up to 50 cents a pay period for this reason alone.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Tax Commission&rsquo;s method. Your actual Oklahoma income tax is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately leaves out: dependents and additional allowances, extra withholding, the &ldquo;Exempt&rdquo; lines on Form OK-W-4, the military income deduction, bonuses, nonresidents, local taxes, and health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Oklahoma take-home pay by salary</h2>
  <p class="prose">Single filer, one allowance, no retirement contribution, 2026 state and federal rates. The
  OK state tax + programs column is Oklahoma income tax withholding; we found no Oklahoma payroll program to add.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Oklahoma take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">OK state tax + programs</th>
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

    <h2>Oklahoma&rsquo;s four tiers and the base they apply to</h2>
    <p>These are the tiers in the Tax Commission&rsquo;s 2026 withholding tables. They apply to your yearly pay after the allowance is subtracted, not to your pay itself. For a single filer on ${N($(75000))}, that amount is ${N($(75000))} &minus; ${N($(EX.single))} = ${N($(base75))}.
    Only the first ${N($(B_S[2][0]))} of it is taxed below ${N(pct(B_S[3][1]))}, so for any base above ${N($(B_S[2][0]))}, ${N(pct(B_S[3][1]))} is the rate on every extra dollar.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Oklahoma withholding tiers by size of the base, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single</th>
          <th scope="col">Married</th>
        </tr>
      </thead>
      <tbody>
${TRANCHES}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>What the 0% tier is made of</h2>
    <p>The first tier is not a separate break for low earners: its size is the sum of two figures from other Tax Commission documents. The 2025 Tax Legislation Summary prints a ${N("0%")} bracket on the first ${N($(LOI_ZERO_S))} of taxable income for a single filer (${N($(LOI_ZERO_M))} married), and the Form OK-W-4 lists a standard deduction of ${N($(DED_S))} (${N($(DED_M))} married). Added together they give the tier in the withholding table. We are describing how the numbers add up, not why the table was built that way.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        What fills the Oklahoma 0% tier, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">Part</th>
          <th scope="col">Single</th>
          <th scope="col">Married</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_ZERO}
      </tbody>
    </table>
  </div>

  <div class="prose">
    <p>Because the allowance comes off first, a single filer with one allowance has nothing withheld on yearly pay up to ${N($(zeroBrutS))}, and a married filer with two allowances on pay up to ${N($(zeroBrutM))}.</p>

    <h2>Allowances: the number that sets your withholding</h2>
    <p>On Form OK-W-4 you claim 1 allowance for yourself, 1 for a spouse who does not work (0 if the spouse works), 1 for each dependent, and extra ones if you itemize or have other state deductions or credits. Each allowance is worth ${N($(EX.single))} a year. This is how the calculator counts them. The form we read is the March 2021 revision (&ldquo;Revised 3-2021&rdquo; in its header).</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Allowances this calculator assumes, by filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status</th>
          <th scope="col">Allowances</th>
          <th scope="col">Taken off yearly pay</th>
        </tr>
      </thead>
      <tbody>
${LIGNES_ALLOW}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Oklahoma hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them. In Oklahoma your hours also matter because of the zero tier: part-time pay can fall entirely inside it, and then no state tax is withheld at all.</p>

    <h3>What is $20 an hour after taxes in Oklahoma?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Oklahoma income tax withholding, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Oklahoma&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Oklahoma?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Oklahoma income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses. The withholding tables we read do not set a separate rate for them.
    If you work variable hours, enter the average number of hours you expect to work each week.</p>

    <h3>Oklahoma take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Oklahoma take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Oklahoma</h2>

  <h3>The first ${$(zeroS)} of your base is not taxed</h3>
  <p>A single filer&rsquo;s zero tier ends at ${N($(zeroS))} of yearly pay after allowances, and a married filer&rsquo;s at ${N($(zeroM))}. With one allowance, a single filer therefore has no Oklahoma tax withheld on pay up to ${N($(zeroBrutS))} a year. At ${N($(30000))}, Oklahoma withholds ${N($$(a30tax))} a year.
  The Oklahoma withholding formula has no standard deduction to subtract, because the zero tier already includes it.</p>

  <h3>Nearly all of the base is taxed at ${pct(B_S[3][1])}</h3>
  <p>The four tiers form a graduated schedule, but the ${N(pct(B_S[1][1]))} and ${N(pct(B_S[2][1]))} tiers cover only ${N($(B_S[1][0] - B_S[0][0]))} and ${N($(B_S[2][0] - B_S[1][0]))} for a single filer. Compared with taxing every dollar up to ${N($(B_S[2][0]))} at ${N(pct(B_S[3][1]))}, the three lower tiers save a single filer ${N($$(econS))} a year, or ${N($$(econM))} for a married filer (whose tiers are twice as wide).
  Past ${N($(B_S[2][0]))}, each extra dollar of base is taxed at ${N(pct(B_S[3][1]))}, whether your pay is ${N($(40000))} or ${N($(250000))}.</p>

  <h3>Each allowance is worth ${$(EX.single)} of pay</h3>
  <p>One allowance takes ${N($(EX.single))} off your yearly pay before the tiers apply, which saves about ${N($$(EX.single * B_S[3][1]))} a year in Oklahoma tax at ${N(pct(B_S[3][1]))}. On ${N("$75,000")}, the single filer&rsquo;s one allowance brings the base down to ${N($(base75))}, and a married filer&rsquo;s two bring it to ${N($(jBase))}, so Oklahoma withholds ${N($$(a75.etat))} and ${N($$(j75.etat))}.
  The form says a working spouse counts as 0 allowances, so the calculator&rsquo;s married result assumes one paycheck in the household and a spouse who does not work.</p>

  <h3>Head of household uses the single table</h3>
  <p>Form OK-W-4 offers Single, Married, and &ldquo;Married, but withhold at higher Single rate.&rdquo; The tables have no head of household version, so the calculator withholds a head of household on the single table with one allowance: ${N($$(h75.etat))} on ${N("$75,000")}, the same as a single filer. The federal tax is lower for a head of household (${N($$(h75.federal))} on ${N("$75,000")}), so take-home pay is ${N($(h75.net))}.</p>

  <h3>The 2026 tiers come from a rate reduction, and no further cut can reach 2026</h3>
  <p>The tiers on this page come from HB 2764, a rate reduction effective for tax year 2026. The law lets the State Board of Equalization trigger a further ${N("0.25%")} cut across all brackets when revenue conditions are met. The Legislature&rsquo;s revenue impact statement for the bill says the first tax year a triggered cut could take effect is 2028. That statement describes the committee version of the bill, and we will check the sources again in January 2027.</p>

  <h3>We found no state payroll deductions</h3>
  <p>The Oklahoma Employment Security Commission says most Oklahoma employers are required to pay a tax to the state Unemployment Insurance Trust Fund, and its pages describe no deduction from your wages. We did not find a state disability insurance or paid family leave program run through payroll. That is a statement about what we read, not a guarantee that nothing exists, and your pay stub is the final word.</p>

  <h3>We found no local income tax on wages</h3>
  <p>The Tax Commission&rsquo;s withholding tables and its withholding page cover only state withholding, and we did not find a local income tax on wages in the agency pages we read. This is not proof that none exists. If you work in a city that you think taxes wages, check your pay stub or ask your employer.</p>

  <h3>Your 401(k) lowers your Oklahoma wages in this calculator</h3>
  <p>The withholding tables we read do not mention 401(k) contributions, so this is our modeling choice, the same as for federal tax and every other state on this site. On ${N("$75,000")} with 6% going in, Oklahoma income tax withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. On ${N("$250,000")}, Social Security and Medicare take ${N($$(a250.ss + a250.med))} in total.</p>

  <h2>Common mistakes</h2>

  <h3>Subtracting the standard deduction as well</h3>
  <p>The zero tier already includes the ${N($(DED_S))} standard deduction. Subtracting it again before applying the tiers understates Oklahoma withholding by ${N($$(ecartDeuxFois))} on ${N("$75,000")}: ${N($$(deuxFoisDed))} instead of ${N($$(a75.etat))}.</p>

  <h3>Forgetting the allowance</h3>
  <p>Applying the tiers to the full ${N($(75000))} instead of ${N($(base75))} overstates Oklahoma withholding by ${N($$(ecartSansAllowance))}: ${N($$(sansAllowance))} instead of ${N($$(a75.etat))}.</p>

  <h3>Treating the 2.5% and 3.5% tiers as the main rates</h3>
  <p>They cover only ${N($(B_S[1][0] - B_S[0][0]))} and ${N($(B_S[2][0] - B_S[1][0]))} for a single filer, so nearly all of the tax comes from the ${N(pct(B_S[3][1]))} rate.</p>

  <h3>Claiming a spouse allowance when your spouse works</h3>
  <p>Form OK-W-4 says to enter 0 for your spouse if your spouse works. If both of you claim the spouse allowance, too little may be withheld, and you could owe more when you file.</p>

  <h3>Looking for a head of household table</h3>
  <p>We found none. The Tax Commission&rsquo;s tables are for single and married employees, and a head of household who wants more withheld can choose &ldquo;Married, but withhold at higher Single rate&rdquo; or ask for extra withholding on line 6.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and the allowances on your Form OK-W-4 may differ from the
  ones we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>Amounts are shown to the cent, so adding the rounded lines can differ from the total by a cent.</p>
  <p>A single filer earning ${N($(a75.brut))} in Oklahoma in 2026, claiming one allowance and no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Oklahoma base: ${N($(a75.brut))} &minus; ${N($(EX.single))} allowance = ${N($(base75))}</li>
    <li>Tax on the base: ${N($(B_S[0][0]))} &times; ${N("0%")} = ${N("$0.00")}, plus ${N($(B_S[1][0] - B_S[0][0]))} &times; ${N(pct(B_S[1][1]))} = ${N($$(t1))}, plus ${N($(B_S[2][0] - B_S[1][0]))} &times; ${N(pct(B_S[2][1]))} = ${N($$(t2))}, plus (${N($(base75))} &minus; ${N($(B_S[2][0]))}) &times; ${N(pct(B_S[3][1]))} = ${N($$(t3))}, which makes
    Oklahoma income tax withholding of ${N($$(a75.etat))}
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Oklahoma borders six states, and we have calculators for four of them: Texas, Arkansas, Colorado and New Mexico. Kansas and Missouri are not on this site yet.
  For Oklahoma, the state-level deductions are only the income tax withholding; the other states may add payroll programs.</p>
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
  <p>The table rounds take-home pay to the dollar; the differences below use the exact amounts. Compared with an Oklahoma worker on the same salary, ${plusMoins(tx75, "<a href=\"/paycheck-calculator/texas/\">Texas</a>")}, because, as the Texas page documents, Texas levies no state tax on wages. ${plusMoins(ar75, "<a href=\"/paycheck-calculator/arkansas/\">Arkansas</a>").replace(/^a </, "An <")}, ${plusMoins(nm75, "<a href=\"/paycheck-calculator/new-mexico/\">New Mexico</a>")}, and ${plusMoins(co75, "<a href=\"/paycheck-calculator/colorado/\">Colorado</a>")}. A worker who lives in one of those states and commutes into Oklahoma is a different case that this calculator does not model: it assumes an Oklahoma resident working in Oklahoma.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a> &mdash; the neighbor to the south; that page documents why it levies no state tax on wages.</li>
    <li><a href="/paycheck-calculator/arkansas/">Arkansas paycheck calculator</a> &mdash; the neighbor to the east.</li>
    <li><a href="/paycheck-calculator/colorado/">Colorado paycheck calculator</a> &mdash; the neighbor to the northwest, with a flat withholding rate.</li>
    <li><a href="/paycheck-calculator/new-mexico/">New Mexico paycheck calculator</a> &mdash; the neighbor to the west.</li>
    <li><a href="/paycheck-calculator/alabama/">Alabama paycheck calculator</a> &mdash; another state with a short series of low rates, and a withholding formula that subtracts your federal income tax.</li>
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
    Oklahoma rates.
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

/* 1. Recoupement independant : la formule du OW-2 ecrite ici A PARTIR DU TEXTE
   (salaire - allowance(s) de 1 000 $ ; table 7 : 0 jusqu'a 10 100 / 20 200, puis 2,5 %, 3,5 %, 4,5 %
   avec les montants de base imprimes 28,75 / 109,25 ; 57,50 / 218,50), pas du moteur. */
const imprime = (net, tab) => { let t = 0; for (const [seuil, base, taux] of tab) if (net > seuil) t = base + taux * (net - seuil); return t; };
const TAB_S = [[10100, 0, 0.025], [11250, 28.75, 0.035], [13550, 109.25, 0.045]];
const TAB_M = [[20200, 0, 0.025], [22500, 57.5, 0.035], [27100, 218.5, 0.045]];
const fed75 = 7670;                          // 58 900 imposables : 1 240 + 4 560 + 1 870
const fedJ = 4640;                           // 42 800 imposables : 2 480 + 2 160
const fedH = 5748;                           // 50 850 imposables : 1 770 + 3 978
if (Math.abs(imprime(75000 - 1000, TAB_S) - a75.etat) > 0.006) echec("OK 75 000 $ : OW-2 " + imprime(74000, TAB_S) + ", moteur " + a75.etat);
if (Math.abs(imprime(75000 - 2000, TAB_M) - j75.etat) > 0.006) echec("OK marie 75 000 $ : OW-2 " + imprime(73000, TAB_M) + ", moteur " + j75.etat);
if (Math.abs(a75.federal - fed75) > 1e-9 || Math.abs(j75.federal - fedJ) > 1e-9 || Math.abs(h75.federal - fedH) > 1e-9) echec("l'impot federal du moteur n'est plus 7 670 / 4 640 / 5 748 $");

/* 2. L'arithmetique ecrite dans la prose (verifiee a la main le 06/10/2026). */
const attendusProse = [
  [a75.etat, 2829.50, "etat 75 000"], [base75, 74000, "base 75 000"], [tax75, 2829.50, "impot sur la base"],
  [t1, 28.75, "2,5 % x 1 150"], [t2, 80.50, "3,5 % x 2 300"], [t3, 2720.25, "4,5 % x 60 450"],
  [a75.net, 58763.00, "net 75 000"], [a75.total, 16237.00, "total 75 000"],
  [j75.etat, 2284.00, "etat marie"], [jBase, 73000, "base mariee"], [jTax, 2284.00, "impot marie"],
  [h75.etat, 2829.50, "etat chef de famille"], [h75.net, 60685.00, "net chef de famille"],
  [a30.etat, 804.50, "etat 30 000"],
  [h20.net, 34279.10, "net 20 $/h"], [h25.net, 42167.50, "net 25 $/h"], [h30.net, 50055.90, "net 30 $/h"],
  [h20.etat, 1326.50, "etat 20 $/h"], [h25.etat, 1794.50, "etat 25 $/h"], [h30.etat, 2262.50, "etat 30 $/h"],
  [sansAllowance, 2874.50, "sans allowance"], [ecartSansAllowance, 45.00, "ecart sans allowance"],
  [deuxFoisDed, 2543.75, "deduction standard en double"], [ecartDeuxFois, 285.75, "ecart deduction standard en double"],
  [gain401, 202.50, "gain 401(k)"], [a250.ss + a250.med, 11439 + 4075, "FICA 250 000"],
  [econS, 500.50, "economie des trois tranches basses, celibataire"], [econM, 1001.00, "economie des trois tranches basses, marie"],
  [EX.single * B_S[3][1], 45, "valeur d'une allowance a 4,5 %"], [zeroBrutS, 11100, "seuil brut sans retenue, celibataire"], [zeroBrutM, 22200, "seuil brut sans retenue, marie"]
];
for (const [obtenu, attendu, nom] of attendusProse) {
  if (Math.abs(obtenu - attendu) > 0.006) echec("arithmetique de la prose, " + nom + " : " + obtenu + " != " + attendu);
}
if (!(LOI_ZERO_S + DED_S === zeroS && LOI_ZERO_M + DED_M === zeroM && zeroS === 10100 && zeroM === 20200)) echec("tranche a 0 % != loi + deduction standard");
if (!(EX.single === 1000 && EX.marriedJoint === 2000 && EX.headOfHousehold === 1000)) echec("allowances != 1 000 / 2 000 / 1 000");
if (!(B_S.length === 4 && B_S[1][0] === 11250 && B_S[2][0] === 13550 && B_M[1][0] === 22500 && B_M[2][0] === 27100)) echec("seuils des tranches != 10 100 / 11 250 / 13 550 ; 20 200 / 22 500 / 27 100");
if (IT.standardDeduction !== undefined) echec("l'Oklahoma ne doit pas avoir de deduction standard dans le moteur (la tranche a 0 % la contient)");
if (!(tx75.net > a75.net && ar75.net > a75.net && nm75.net > a75.net && co75.net < a75.net)) echec("la comparaison (TX, AR, NM au-dessus de l'Oklahoma, CO en dessous) n'est plus celle ecrite : verifier plusMoins()");
if (!(R.states.texas.incomeTax.hasIncomeTax === false)) echec("le Texas n'a plus le regime ecrit (pas d'impot sur les salaires)");
if (!(progs(a75) === 0 && a75.programmes.length === 0 && a75.paidLeave === 0 && a75.waCares === 0)) echec("l'Oklahoma ne doit avoir aucun programme");
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) echec("la reponse directe fait " + nbMotsReponse + " mots (40-60 attendus)");
if (motsProse < 1500) echec(motsProse + " mots hors tableaux, sous le plancher de 1 500");
if (/\$NaN|undefined|NaN/.test(html)) echec("valeur manquante dans la page");
const metaDesc = html.match(/<meta name="description" content="([^"]*)"/)[1];
if (metaDesc.length > 160) echec("meta description : " + metaDesc.length + " caracteres");
console.log("recoupements OW-2 (formule imprimee ecrite a la main, 75 000 $ celibataire et marie) : OK ; reponse directe %d mots ; meta %d caracteres", nbMotsReponse, metaDesc.length);
