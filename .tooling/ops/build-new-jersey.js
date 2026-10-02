/* Construit /paycheck-calculator/new-jersey/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * New Jersey est le 29e Etat publie. Ce qu'il a de propre :
 *
 *   1. DEUX TABLES DE RETENUE SELON LE STATUT DU NJ-W4. Rate A (Single,
 *      Married separate) et Rate B (Married joint, Head of household,
 *      Qualifying widow(er)), de 1,5 % a 11,8 %, apres une allocation de
 *      1 000 $ par « allowance ». NJ-WT (Sept. 2025) p. 24 + tables annuelles.
 *   2. LA RETENUE N'EST PAS L'IMPOT. Les tables de retenue vont de 1,5 % a
 *      11,8 % ; le bareme de la declaration NJ-1040 2025 va de 1,4 % a 10,75 %.
 *      Sur 75 000 $ : 2 869 $ retenus contre 2 596 $ selon le bareme de la
 *      declaration (salaire seul, exemption de 1 000 $) : arithmetique de la
 *      page, hypotheses dites ; aucun bareme 2026 de la declaration n'a ete lu.
 *   3. TROIS PROGRAMMES SALARIES (NJ DOL, ligne « Worker » 2026) : chomage +
 *      fonds de formation 0,425 % sur 44 800 $, invalidite (TDI) 0,19 % et
 *      conge familial (FLI) 0,23 % sur 171 100 $.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * Tous les documents repondent 200 en direct (curl + User-Agent navigateur,
 * 02/10/2026) : AUCUN instantane Internet Archive ici. Detail complet,
 * citations verbatim : data/rates-2026.js (bloc "new-jersey") et
 * .tooling/lib/sources.js (PAR_ETAT["new-jersey"]).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « New Jersey has no local income tax » : le NJ-WT ne decrit aucun
 *     impot local du New Jersey, ce qui n'est pas une preuve : « we found no » ;
 *   - pas de nombre d'allocations « recommande » : le NJ-W4 dit « see
 *     instructions », aucun document lu ne chiffre ; 1 / 2 est NOTRE hypothese ;
 *   - pas de taux forfaitaire pour les primes : le NJ-WT n'en donne pas ;
 *   - pas de bareme 2026 de la declaration : seule la NJ-1040 2025 est lue ;
 *   - pas de « SDI » comme nom officiel : le Department of Labor ecrit
 *     « Temporary Disability Insurance » / « Disability Insurance » ;
 *   - pas de table C, D, E (deux revenus) : non modelisees, dites telles.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-new-jersey.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "new-jersey";
const NOM = "New Jersey";
const URL = "https://statelinecalc.com/paycheck-calculator/new-jersey/";
const AUJOURD_HUI = "2026-10-02";
const LISIBLE = "October 2, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const NJ = R.states[CLE];
const TAB_A = NJ.incomeTax.brackets.single;
const TAB_B = NJ.incomeTax.brackets.marriedJoint;
const ALLOC = NJ.incomeTax.standardDeduction;              // 1000 / 2000 / 1000
const ALLOC_UNITE = 1000;                                   // NJ-WT p. 24, « Annual $1,000 »
const [UI, DI, FLI] = NJ.employeePrograms;
const BASE_UI = UI.wageCap;                                 // 44 800
const BASE_DI = DI.wageCap;                                 // 171 100
const fedDed = R.federal.standardDeduction;

/* Bareme de la declaration NJ-1040 2025, Table A (Single) : [plafond, taux,
   « subtract »], tel qu'imprime. Declaration 2025 : aucun bareme 2026 lu. */
const SCHEDULE_A_2025 = [[20000, 0.014, 0], [35000, 0.0175, 70], [40000, 0.035, 682.5],
  [75000, 0.05525, 1492.5], [500000, 0.0637, 2126.25], [1000000, 0.0897, 15126.25],
  [Infinity, 0.1075, 32926.25]];
const impotDeclaration = ti => {
  const l = SCHEDULE_A_2025.find(x => ti <= x[0]);
  return ti * l[1] - l[2];
};

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);

/* Independant du moteur : retenue = table(salaire - allocations). */
const retenueTable = (brut, tab, nbAlloc) => progressiveTax(Math.max(0, brut - nbAlloc * ALLOC_UNITE), tab);
const sans = retenueTable(75000, TAB_A, 0);                 // 2 930
const parAllocation = sans - a75.etat;                      // 61
const impotFinal75 = impotDeclaration(75000 - ALLOC.single);   // 2 596
const ecart75 = a75.etat - impotFinal75;                    // 273
const impotFinal250 = impotDeclaration(250000 - ALLOC.single);
const ecart250 = a250.etat - impotFinal250;
const moisPlafondUI = BASE_UI / (75000 / 12);               // 7.17 mois

/* Les montants de base imprimes dans les tables, recalcules (cumul des tranches). */
function lignesTable(tab) {
  let bas = 0, base = 0;
  return tab.map(([haut, taux]) => {
    const l = { bas, haut, base, taux };
    if (isFinite(haut)) base += (haut - bas) * taux;
    bas = haut;
    return l;
  });
}
const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct2 = t => String(+(t * 100).toFixed(2)) + "%";
const pct1 = t => (t * 100).toFixed(1) + "%";

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

const tableRate = (tab) => lignesTable(tab).map(l =>
  "        <tr><th scope=\"row\">" + (l.bas === 0 ? "$0" : $(l.bas)) + (isFinite(l.haut) ? " &ndash; " + $(l.haut) : " and over") + "</th>"
  + "<td class=\"num\">" + (l.base === 0 ? "$0" : $$(l.base)) + "</td>"
  + "<td class=\"num\">" + pct1(l.taux) + "</td></tr>").join("\n");

/* Voisins publies : Pennsylvanie (seul voisin publie), + Rhode Island et
   Colorado, qui prennent eux aussi une prime d'assurance salariee. */
const REF = 75000;
const COMPARE = [CLE, "pennsylvania", "rhode-island", "colorado"];
const NOMS = { [CLE]: "New Jersey", pennsylvania: "Pennsylvania", "rhode-island": "Rhode Island", colorado: "Colorado" };
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const pa75 = calcul("pennsylvania", REF), ri75 = calcul("rhode-island", REF), co75 = calcul("colorado", REF);
const plusMoins = d => d >= 0 ? $$(d) + " more" : $$(-d) + " less";   // d = NJ - autre

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the New Jersey income tax withholding rate in 2026?",
   "There is no single rate. The Division of Taxation&rsquo;s withholding tables rise in steps from 1.5% to 11.8%, and which table " +
   "applies depends on the filing status on Form NJ-W4: Rate A for single employees and married/civil union partners filing " +
   "separately, Rate B for married/civil union couples filing jointly, heads of household and qualifying widow(er)s who did not " +
   "choose another table on line 3. These are withholding rates, not the rates on your return: the 2025 NJ-1040 rate schedules run " +
   "from 1.4% to 10.75%."],

  ["How much New Jersey tax is withheld on a $75,000 salary?",
   "For a single filer claiming one allowance, " + $$(a75.etat) + " a year is withheld, which is " + $$(a75.etat / 12) + " a month. " +
   "That is Rate A applied to " + $(75000 - ALLOC.single) + " ($75,000 minus the $1,000 allowance): $795 plus 6.1% of the " +
   "amount over $40,000. A married couple filing jointly and claiming two allowances has " + $$(j75.etat) + " withheld at Rate B, " +
   "and a head of household claiming one has " + $$(h75.etat) + " withheld."],

  ["What is take-home pay on a $75,000 salary in New Jersey?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer claiming one allowance with no " +
   "retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) +
   " of Social Security and Medicare, " + $$(a75.etat) + " of New Jersey income tax withholding and " + $$(progs(a75)) +
   " of New Jersey unemployment, disability and family leave contributions &mdash; an effective rate of " +
   (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in New Jersey?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are " +
   "single-filer figures with one allowance, after federal tax, FICA, New Jersey withholding and the three New Jersey " +
   "contributions, with no retirement contribution."],

  ["What New Jersey payroll deductions are there besides income tax?",
   "Three, according to the Department of Labor and Workforce Development&rsquo;s 2026 worker rates: " + N("0.3825%") +
   " for unemployment insurance plus " + N("0.0425%") + " for the workforce development and supplemental workforce funds " +
   "(together " + N("0.425%") + ", on the first " + $(BASE_UI) + " of wages, so " + $$(BASE_UI * UI.rate) + " at most), " +
   N("0.19%") + " for temporary disability insurance and " + N("0.23%") + " for family leave insurance, both on the first " +
   $(BASE_DI) + " of wages (" + $$(BASE_DI * DI.rate) + " and " + $$(BASE_DI * FLI.rate) + " at most). On " + $(75000) +
   " that is " + $$(progs(a75)) + " a year. The state&rsquo;s own name for the disability program is temporary disability insurance (TDI); some calculators label it SDI. Your employer may use a private disability plan instead of the state&rsquo;s (" +
   "the state&rsquo;s W-2 instructions mention a private plan number), so check your pay stub."],

  ["Does a 401(k) contribution lower my New Jersey withholding?",
   "In this calculator, yes. The Division of Taxation&rsquo;s withholding guide lists &ldquo;401(k) contributions up to the federal " +
   "limit&rdquo; among the compensation that is not subject to New Jersey withholding, and it lists employee contributions to " +
   "retirement plans other than a 401(k) as subject to it. On $75,000 with 6% going into a 401(k), New Jersey withholding falls by " +
   $$(gain401) + " a year. The three New Jersey contributions are still calculated on your gross pay in this calculator."],

  ["How many allowances should I claim on Form NJ-W4?",
   "We cannot say. Line 4 of the form asks for the &ldquo;total number of allowances you are claiming (see instructions),&rdquo; " +
   "and warns that entering a number &ldquo;will decrease the amount of withholding and could result in an underpayment on your " +
   "return.&rdquo; Each allowance takes $1,000 off your annual wages in the withholding guide, which for a single filer on $75,000 " +
   "changes withholding by " + $$(parAllocation) + " a year. This calculator assumes one allowance for single filers and heads of " +
   "household and two for married couples filing jointly, the same $1,000 exemptions the 2025 NJ-1040 gives for you and your spouse."],

  ["Why is New Jersey withholding higher than my New Jersey income tax?",
   "Because the two come from different tables. The withholding tables run from 1.5% to 11.8%, while the 2025 NJ-1040 rate " +
   "schedules run from 1.4% to 10.75%. For a single filer on $75,000, our arithmetic using the 2025 Table A and a $1,000 exemption " +
   "gives " + $$(impotFinal75) + " of tax, against " + $$(a75.etat) + " withheld, a gap of " + $$(ecart75) + ". That assumes " +
   "wages only, no other deductions or credits, and it uses the 2025 schedule because we did not read a 2026 one."],

  ["Do New Jersey cities or counties tax paychecks?",
   "The Division of Taxation&rsquo;s withholding guide describes one state income tax and mentions local wage taxes only for " +
   "Pennsylvania. We found no New Jersey local income tax in the documents we read, but we have not checked every municipality, " +
   "so look for a local line on your pay stub. This calculator includes none."],

  ["I live in Pennsylvania and work in New Jersey, or the reverse. Which state withholds?",
   "The two states have a reciprocal agreement. According to the Division of Taxation, an employer is not required to withhold " +
   "New Jersey tax from a Pennsylvania resident who files Form NJ-165, and a New Jersey resident working in Pennsylvania generally " +
   "does not need Pennsylvania withholding, so tax is withheld for the state where the employee lives. The agreement does not excuse " +
   "a Pennsylvania employer from withholding Pennsylvania local wage taxes for a New Jersey resident."],

  ["How are bonuses withheld in New Jersey?",
   "The withholding guide gives no flat rate. If a bonus is paid at the same time as regular wages, the employer totals the two and " +
   "withholds at the rate for the combined payment. If it is paid at a different time, the employer withholds from it without any " +
   "of the allowances you claimed. This calculator does not model bonuses."],

  ["Why is my New Jersey paycheck different from this calculator?",
   "The usual reasons: you claimed a different number of allowances on Form NJ-W4, you or your spouse chose a different table on line 3, " +
   "an extra amount per paycheck is being withheld, health insurance premiums and other pre-tax deductions come out before tax and " +
   "are not modeled here, or your employer uses the Division&rsquo;s wage-bracket tables instead of the percentage method. " +
   "Bonuses are not modeled either."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ doivent devenir de vrais caracteres dans le JSON ; nettoieJsonLd le fait
   aussi sur la page entiere a l'ecriture. */
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

/* La reponse directe : 40 a 60 mots, verifie plus bas. Elle couvre le cas
   horaire (20 % des impressions du site sont des requetes « hourly »). */
const reponse = "New Jersey withholds income tax at rates from 1.5% to 11.8% in 2026, using Rate A for single filers and Rate B for joint filers and heads of household. "
  + "On $75,000, a single filer keeps about " + $(a75.net) + " a year after taxes and unemployment, disability and family leave contributions. At $25 an hour, full time, you keep about "
  + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>New Jersey (NJ) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free New Jersey (NJ) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, NJ withholding, disability, family leave and unemployment.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="New Jersey (NJ) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="New Jersey withholds income tax from 1.5% to 11.8% in 2026 and takes three insurance contributions. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "New Jersey Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 New Jersey take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, New Jersey income tax withheld by the Division of Taxation's Rate A or Rate B percentage tables, and the New Jersey unemployment, disability and family leave contributions."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "New Jersey", "item": "${URL}" }
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
    <li aria-current="page">New Jersey</li>
  </ol>
</nav>

  <h1>New Jersey Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your New Jersey take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the New Jersey
          table: Rate A for single, Rate B for married filing jointly and head of household.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your New Jersey withholding too.</span>
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
    <p>New Jersey does not withhold at one flat rate. Each employee completes Form NJ-W4, the state&rsquo;s
    counterpart to the federal W-4, and the employer looks up the table that goes with it. Single employees
    and married/civil union partners filing separately are withheld at <strong>Rate A</strong>. Married/civil union
    couples filing jointly, heads of household and qualifying widow(er)s are withheld at <strong>Rate B</strong>,
    unless they chose another table on line 3. Both are annual percentage-method tables: take your wages for the
    year, subtract ${N($(ALLOC_UNITE))} for each allowance you claim, then apply rates that rise from
    ${N("1.5%")} to ${N("11.8%")}. The full tables are further down. For contrast,
    <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a>, the neighbor we also publish, withholds a flat
    ${N("3.07%")} with no allowance.</p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>New Jersey income tax withholding</strong>: your wages after any 401(k) contribution, minus
      ${N($(ALLOC.single))} for a single filer or head of household (one allowance) or ${N($(ALLOC.marriedJoint))} for a married
      couple filing jointly (two), through Rate A or Rate B.</li>
      <li><strong>Three New Jersey contributions</strong> taken from your pay: unemployment and workforce funds
      (${N(pct(UI.rate))} of the first ${N($(BASE_UI))}), temporary disability insurance (${N(pct(DI.rate))}) and family leave
      insurance (${N(pct(FLI.rate))}), both on the first ${N($(BASE_DI))}.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    New Jersey, the <strong>Division of Taxation</strong>&rsquo;s withholding guide (<em>NJ-WT</em>), its percentage-method
    tables and Form NJ-W4, plus the <strong>Department of Labor and Workforce Development</strong>&rsquo;s 2026
    worker contribution rates and wage bases. Both agencies&rsquo; documents were read directly from their own
    sites on ${LISIBLE}, and are linked in the sources below. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the Division&rsquo;s tables. Your New Jersey income tax itself is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it does not let you enter a number of allowances other than the
    one it assumes, it does not use the other tables (A, C, D and E) that the NJ-W4 wage chart can point to for a married or head-of-household filer, it does not
    add an extra amount per paycheck, and it does not model Married Filing Separately, multiple jobs, bonuses and other
    supplemental wages, or health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>New Jersey take-home pay by salary</h2>
  <p class="prose">Single filer with one allowance, no retirement contribution, 2026 state and federal rates. The
  NJ state tax + programs column adds New Jersey income tax withholding to the three New Jersey contributions
  (unemployment and workforce funds, disability and family leave).</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 New Jersey take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">NJ state tax + programs</th>
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

    <h2>The New Jersey withholding tables, Rate A and Rate B</h2>
    <p>These are the annual percentage-method tables from the Division of Taxation. Subtract your allowances from your
    annual wages, find the row that contains the result, multiply the amount over the row&rsquo;s lower limit by the rate, and add the base amount. The base amounts below are
    the sums of the rows above them, and they match the amounts printed in the Division&rsquo;s tables. Those tables are marked as applying to wages paid on and after October 1, 2020, and the Division&rsquo;s September 2025 guide still points to them. For a single filer on
    ${N($(75000))} with one allowance, the taxable wages are ${N($(75000 - ALLOC.single))}, which falls in the ${N("$40,000 &ndash; $75,000")}
    row of Rate A: ${N("$795.00")} plus ${N("6.1%")} of the ${N($(75000 - ALLOC.single - 40000))} over ${N("$40,000")}, or ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New Jersey withholding, Rate A (single and married/civil union partner filing separately), annual wages after allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable wages</th>
          <th scope="col">Base amount</th>
          <th scope="col">Rate on the excess</th>
        </tr>
      </thead>
      <tbody>
${tableRate(TAB_A)}
      </tbody>
    </table>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        New Jersey withholding, Rate B (married/civil union couple filing jointly, head of household, qualifying widow(er)), annual wages after allowances
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable wages</th>
          <th scope="col">Base amount</th>
          <th scope="col">Rate on the excess</th>
        </tr>
      </thead>
      <tbody>
${tableRate(TAB_B)}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>New Jersey hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in New Jersey?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, New Jersey withholding and the three New Jersey contributions, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. New Jersey&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding plus ${N($$(progs(h20)))} of contributions for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in New Jersey?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. New Jersey income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The Division of Taxation&rsquo;s guide says that when supplemental wages such as bonuses, commissions and overtime pay are paid at
    the same time as regular wages, the employer totals them and withholds at the rate for the combined payment. The calculator
    multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    If you work variable hours, enter the average you expect for the year.</p>

    <h3>New Jersey take-home pay by hourly rate</h3>
    <p>Single filer with one allowance, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 New Jersey take-home pay by hourly rate, single filer, 40 hours a week
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

${blocLimites()}

  <h2>Key facts that affect your take-home pay in New Jersey</h2>

  <h3>Two tables: Rate A for single filers, Rate B for couples filing jointly and heads of household</h3>
  <p>The back of Form NJ-W4 and the Division&rsquo;s guide say it plainly: checking single or married/civil union partner
  separate means Rate A; checking married/civil union couple joint, head of household or qualifying widow(er) means Rate B
  when line 3 is blank. Rate B stretches the lower bands, so the same ${N("$75,000")} has a different amount withheld: ${N($$(a75.etat))}
  for a single filer with one allowance, ${N($$(h75.etat))} for a head of household with one, and ${N($$(j75.etat))} for a
  married couple with two. Rate A reaches ${N("6.1%")} at ${N("$40,000")} of taxable wages; Rate B does not reach it until
  ${N("$80,000")}.</p>

  <h3>Each allowance is worth $1,000 a year, and the form does not say how many to claim</h3>
  <p>The guide values one withholding allowance at ${N($(ALLOC_UNITE))} a year, and the employer subtracts ${N("$1,000")} times the
  number of allowances you claim before using the table. Form NJ-W4 line 4 asks for the total number of allowances &ldquo;(see
  instructions)&rdquo; and warns that entering a number will decrease the amount of withholding and could result in an underpayment on your
  return. We did not find a rule that tells you how many to claim, so this calculator assumes one for a single filer or head
  of household and two for a married couple filing jointly, the same ${N("$1,000")} exemptions the 2025 NJ-1040 allows
  for you and your spouse. On ${N("$75,000")} for a single filer, one allowance changes the withholding by ${N($$(parAllocation))} a
  year: ${N($$(sans))} with none, ${N($$(a75.etat))} with one.</p>

  <h3>The withholding rates are higher than the rates on your tax return</h3>
  <p>The withholding tables run from ${N("1.5%")} to ${N("11.8%")}. The 2025 NJ-1040 rate schedules, the latest we read, run from
  ${N("1.4%")} to ${N("10.75%")}. For a single filer on ${N("$75,000")}, taking the ${N("$1,000")} exemption and applying 2025 Table A gives
  ${N($$(impotFinal75))} of tax, so the withholding of ${N($$(a75.etat))} is ${N($$(ecart75))} higher. On ${N("$250,000")} the same arithmetic gives
  ${N($$(impotFinal250))} against ${N($$(a250.etat))} withheld, ${N($$(ecart250))} higher. That is our arithmetic, not the
  Division&rsquo;s: it assumes wages only, no other deductions or credits, and the 2025 schedule because we did not read a 2026 one.
  Because withholding can run above the tax figured on the return, a refund is possible when you file.</p>

  <h3>Three contributions come out of your paycheck besides income tax</h3>
  <p>The Department of Labor and Workforce Development&rsquo;s 2026 table lists worker rates of ${N("0.3825%")} for unemployment insurance,
  ${N("0.0425%")} for the workforce development and supplemental workforce funds, ${N("0.19%")} for disability insurance and
  ${N("0.23%")} for family leave insurance. The unemployment and workforce funds apply to the first ${N($(BASE_UI))} of wages, so on a
  ${N("$75,000")} salary they stop partway through your eighth monthly paycheck, after ${N($$(BASE_UI * UI.rate))} in all. Disability and family leave apply
  to the first ${N($(BASE_DI))}, so they take ${N($$(a75.programmes[1].montant))} and ${N($$(a75.programmes[2].montant))} on ${N("$75,000")}
  and no more than ${N($$(BASE_DI * DI.rate))} and ${N($$(BASE_DI * FLI.rate))} at any salary. Together that is ${N($$(progs(a75)))} on
  ${N("$75,000")}. The Division of Taxation&rsquo;s W-2 instructions list these items for box 16 and also mention a private plan
  number for disability, so an employer with a private plan may not use the state rate.</p>

  <h3>Your 401(k) lowers your New Jersey wages, but other retirement plans may not</h3>
  <p>The guide lists &ldquo;401(k) contributions up to the federal limit&rdquo; as compensation not subject to New Jersey withholding. It
  lists employee contributions to retirement plans other than a 401(k) as compensation that is subject to it in the year they are made, and
  401(k) contributions that exceed the federal limit as well. On ${N("$75,000")} with 6% going in, New Jersey withholding falls by ${N($$(gain401))} a year.
  The calculator treats the contribution as a traditional 401(k) below the federal limit, so enter 0 if yours is a different kind of plan.</p>

  <h3>Two-income households can choose a different table</h3>
  <p>Form NJ-W4 has a wage chart for married couples, heads of household and qualifying widow(er)s. Its instructions say that if
  your taxable income is greater than ${N("$50,000")}, you should strongly consider using it, and the result is a letter that goes
  on line 3. Rates C, D and E are printed on the form with their own bands. This calculator uses Rate B for those statuses and does not
  model the chart, so a household that chose another table will see a different figure.</p>

  <h3>Exemption from withholding is narrow, and lasts one year</h3>
  <p>Line 6 of Form NJ-W4 lets you write &ldquo;EXEMPT&rdquo; if you expect to owe no New Jersey tax. The form sets the conditions: wages plus taxable
  nonwage income of ${N("$10,000")} or less for a single filer or a married partner filing separately, and ${N("$20,000")} or less for a married
  couple filing jointly, a head of household or a qualifying widow(er). It says the exemption is good for one year only and must be filed
  again each year.</p>

  <h3>Where you live and where you work</h3>
  <p>New Jersey and Pennsylvania have a reciprocal agreement. A Pennsylvania resident working in New Jersey who files Form NJ-165 with the employer
  is not subject to New Jersey withholding, and the guide says tax for a New Jersey resident working in Pennsylvania is withheld for the state where the employee
  lives. Pennsylvania local wage taxes still apply to a New Jersey resident employed in Pennsylvania. For a New Jersey resident who works for a time in another state, the
  guide says the New Jersey withholding should be reduced by the tax withheld for the other state.</p>

  <h3>Unemployment insurance comes partly from you</h3>
  <p>Unlike states where unemployment insurance is paid by the employer alone, New Jersey lists a worker rate for it. The calculator
  takes ${N("0.3825%")} for unemployment plus ${N("0.0425%")} for the workforce funds, up to the ${N($(BASE_UI))} wage base, and nothing
  more for unemployment insurance.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. New Jersey&rsquo;s contributions have ceilings of their own, and the withholding table keeps rising to
  ${N("11.8%")} above ${N("$1,000,000")} of taxable wages, so on ${N("$250,000")} the state takes ${N($$(a250.etat))} in income tax
  withholding, about ${N((a250.etat / 250000 * 100).toFixed(1) + "%")} of wages, and ${N($$(progs(a250)))} in contributions.</p>

  <h2>Common mistakes</h2>

  <h3>Reading 1.5% to 11.8% as the New Jersey income tax rates</h3>
  <p>Those are the withholding rates. The rate schedules on the 2025 NJ-1040 run from 1.4% to 10.75%, and your final bill depends on your
  deductions, exemptions and credits.</p>

  <h3>Assuming everyone is withheld at Rate A</h3>
  <p>Only single filers and married partners filing separately are. If you checked married filing jointly, head of household or
  qualifying widow(er) on Form NJ-W4 and left line 3 blank, your employer uses Rate B, or the table for that letter if you chose one on line 3.</p>

  <h3>Claiming allowances without checking the effect</h3>
  <p>Each allowance takes ${N($(ALLOC_UNITE))} off the wages the table is applied to, and the form warns that claiming
  more lowers withholding and could leave you owing at filing. On ${N("$75,000")} for a single filer, one allowance is worth ${N($$(parAllocation))} a year.</p>

  <h3>Forgetting the three contributions</h3>
  <p>A New Jersey paycheck loses ${N($$(progs(a75)))} a year on ${N("$75,000")} to unemployment, disability and family leave, on top of income tax. A
  calculator that shows only income tax, Social Security and Medicare will show a figure that is too high.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job or a spouse&rsquo;s income changes the right table, and your
  employer may be using the wage-bracket tables the Division also publishes. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in New Jersey in 2026, claiming one allowance, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>New Jersey taxable wages: ${N($(a75.brut))} &minus; ${N($(ALLOC.single))} allowance = ${N($(a75.brut - ALLOC.single))}</li>
    <li>New Jersey withholding, Rate A: ${N("$795.00")} + 6.1% &times; (${N($(a75.brut - ALLOC.single))} &minus; ${N("$40,000")}) = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>Unemployment and workforce funds: ${N($(BASE_UI))} &times; 0.425% = ${N($$(a75.programmes[0].montant))}</li>
    <li>Disability insurance: ${N($(a75.brut))} &times; 0.19% = ${N($$(a75.programmes[1].montant))}</li>
    <li>Family leave insurance: ${N($(a75.brut))} &times; 0.23% = ${N($$(a75.programmes[2].montant))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. New Jersey borders New York, Pennsylvania and Delaware; Pennsylvania is the only one of
  the three that we publish so far. Rhode Island and Colorado are included because each also takes an employee-paid insurance premium on top of income tax.
  New Jersey is shown with one allowance.</p>
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
  <p>A <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker keeps ${N($$(pa75.net - a75.net))} more than a New Jersey worker on the
  same salary: Pennsylvania takes a flat 3.07% and a 0.07% unemployment deduction, with no disability or family leave premium in this
  calculator. A <a href="/paycheck-calculator/rhode-island/">Rhode Island</a> worker keeps ${N($$(Math.abs(ri75.net - a75.net)))} ${ri75.net < a75.net ? "less" : "more"}, and a
  <a href="/paycheck-calculator/colorado/">Colorado</a> worker keeps ${N($$(Math.abs(co75.net - a75.net)))} ${co75.net < a75.net ? "less" : "more"}.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a> &mdash; the neighbor across the Delaware
    River, with a flat 3.07% tax and a reciprocal agreement with New Jersey.</li>
    <li><a href="/paycheck-calculator/rhode-island/">Rhode Island paycheck calculator</a> &mdash; another state with progressive
    withholding and an employee-paid disability insurance deduction.</li>
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
    New Jersey rates.
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
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre la formule des tables (salaire -
   allocations, puis table), pas contre notre propre moteur. */
const verifs = [["single", a75, 75000, TAB_A, 1], ["marriedJoint", j75, 75000, TAB_B, 2], ["headOfHousehold", h75, 75000, TAB_B, 1],
                ["single", a25, 25000, TAB_A, 1], ["single", a100, 100000, TAB_A, 1], ["single", a250, 250000, TAB_A, 1]];
for (const [statut, r, brut, tab, n] of verifs) {
  const attendu = retenueTable(brut, tab, n);
  if (Math.abs(attendu - r.etat) > 0.01) {
    console.error("ARRET : %s a %d $ : table %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
/* Les montants de base imprimes dans les tables du Division (relus a la main). */
const IMPRIMES_A = [0, 300, 600, 795, 2930, 32680, 82180];
const IMPRIMES_B = [0, 300, 900, 1440, 1830, 6100, 30600, 80100];
if (lignesTable(TAB_A).some((l, i) => Math.abs(l.base - IMPRIMES_A[i]) > 0.005) ||
    lignesTable(TAB_B).some((l, i) => Math.abs(l.base - IMPRIMES_B[i]) > 0.005)) {
  console.error("ARRET : une base calculee ne correspond pas a la base imprimee dans les tables"); process.exit(2);
}
/* Le bareme de la declaration recalcule en tranches marginales (NJ-1040 2025,
   Table A) doit redonner la formule imprimee « taux x revenu - subtract ». */
const margA = [[20000, 0.014], [35000, 0.0175], [40000, 0.035], [75000, 0.05525], [500000, 0.0637], [1000000, 0.0897], [Infinity, 0.1075]];
for (const ti of [74000, 249000, 30000, 600000]) {
  if (Math.abs(progressiveTax(ti, margA) - impotDeclaration(ti)) > 0.005) {
    console.error("ARRET : bareme de la declaration incoherent a %d $", ti); process.exit(2);
  }
}
if (!(Math.abs(impotFinal75 - 2596) < 0.005 && Math.abs(ecart75 - 273) < 0.005 && Math.abs(parAllocation - 61) < 0.005 &&
      Math.abs(sans - 2930) < 0.005 && Math.abs(gain401 - 274.5) < 0.005 && Math.abs(progs(a75) - 505.4) < 0.005)) {
  console.error("ARRET : arithmetique de l'ecart retenue / impot ou des programmes"); process.exit(2);
}
if (!(ecart250 > 0 && ecart75 > 0)) { console.error("ARRET : « withholding higher than the schedule » est faux"); process.exit(2); }
if (!(moisPlafondUI > 7 && moisPlafondUI < 8)) { console.error("ARRET : « eighth monthly paycheck » est faux (%s)", moisPlafondUI); process.exit(2); }
if (!(TAB_A[0][1] === 0.015 && TAB_A[TAB_A.length - 1][1] === 0.118 && TAB_B[TAB_B.length - 1][1] === 0.118)) {
  console.error("ARRET : les bornes 1,5 % / 11,8 % ne sont plus celles du moteur"); process.exit(2);
}
/* « Rate A reaches 6.1% at $40,000; Rate B does not reach it until $80,000 » */
const debut61 = tab => (tab.find(b => b[1] === 0.061) ? tab[tab.findIndex(b => b[1] === 0.061) - 1][0] : null);
if (debut61(TAB_A) !== 40000 || debut61(TAB_B) !== 80000) {
  console.error("ARRET : « 6.1 % a 40 000 / 80 000 » est faux"); process.exit(2);
}
if (!(pa75.net > a75.net)) { console.error("ARRET : « Pennsylvania keeps more » est faux"); process.exit(2); }
if ((R.states.pennsylvania.employeePrograms || []).length !== 1 || R.states.pennsylvania.incomeTax.brackets.single[0][1] !== 0.0307 ||
    R.states.pennsylvania.employeePrograms[0].rate !== 0.0007) {
  console.error("ARRET : la description de la Pennsylvanie (3,07 % + 0,07 %) n'est plus celle du moteur"); process.exit(2);
}
if (!(ri75.programmes.length && co75.programmes.length)) { console.error("ARRET : RI / CO n'ont plus de prime salariee"); process.exit(2); }
if (UI.rate !== 0.00425 || DI.rate !== 0.0019 || FLI.rate !== 0.0023 || BASE_UI !== 44800 || BASE_DI !== 171100) {
  console.error("ARRET : les taux / bases ecrits dans la prose ne sont plus ceux du moteur"); process.exit(2);
}
if (ALLOC.single !== 1000 || ALLOC.marriedJoint !== 2000 || ALLOC.headOfHousehold !== 1000) {
  console.error("ARRET : les allocations ne sont plus 1 / 2 / 1"); process.exit(2);
}
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements tables A/B (single, married, HoH a 75 000 $ ; 25 000, 100 000, 250 000 $) : OK ; reponse directe %d mots", nbMotsReponse);
