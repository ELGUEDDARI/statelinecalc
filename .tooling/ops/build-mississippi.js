/* Construit /paycheck-calculator/mississippi/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Mississippi est le 23e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN BAREME A DEUX SEGMENTS, PAS PLUSIEURS TRANCHES. 0% sur les 10 000
 *      premiers dollars de revenu IMPOSABLE, puis un taux UNIQUE de 4,0% sur
 *      tout le reste - contrairement a la Virginie (4 tranches) ou au Dakota
 *      du Nord (3 tranches), il n'y a qu'une seule marche.
 *   2. DEUX MONTANTS SEPARES QUI S'ADDITIONNENT. Une "exemption" ET une
 *      "standard deduction" distinctes, par statut de declaration, qui se
 *      retranchent toutes les deux du revenu avant application du bareme -
 *      6 000 $ + 2 300 $ pour un celibataire, 12 000 $ + 4 600 $ pour un
 *      couple, 9 500 $ + 3 400 $ pour un chef de famille (avec 1 personne a
 *      charge deja comptee dans le montant officiel).
 *   3. UN CHIFFRE OFFICIEL QUI CONTREDIT DES SOURCES TIERCES. Plusieurs
 *      outils de paie tiers annoncent 4,4% pour 2026 ; le document officiel
 *      du Department of Revenue, date de la meme annee fiscale, dit 4,0% -
 *      c'est ce dernier qui est retenu.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * Withholding Income Tax Tables And Employer Instructions, Pub 89-700-25-1,
 * Mississippi Department of Revenue, lu en direct le 17/09/2026 (HTTP 200).
 * Detail complet, chaque citation verbatim : data/rates-2026.js (bloc
 * mississippi) et .tooling/lib/sources.js (PAR_ETAT.mississippi).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur Married Filing Separately, non propose par le calculateur ;
 *   - rien sur l'exemption age 65+/aveugle, que le calculateur ne demande
 *     pas ;
 *   - le montant "Head-of-Family" du document officiel suppose deja UNE
 *     personne a charge ($8,000 + $1,500) ; le calculateur ne demande pas
 *     le nombre de personnes a charge et reprend ce montant tel quel,
 *     comme pour le Wisconsin, le Nebraska et la Virginie.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-mississippi.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "mississippi";

/* --- les valeurs de droit citees dans la prose --------------------------- */
const SEUIL_0 = 10000;                              // 0% jusqu'a ce montant
const TAUX = 0.04;                                  // 4.0% au-dela
const EX_SINGLE = 6000, EX_JOINT = 12000, EX_HOH = 9500;
const DED_SINGLE = 2300, DED_JOINT = 4600, DED_HOH = 3400;
const TOTAL_SINGLE = EX_SINGLE + DED_SINGLE;        // 8,300
const TOTAL_JOINT = EX_JOINT + DED_JOINT;           // 16,600
const TOTAL_HOH = EX_HOH + DED_HOH;                 // 12,900
const WAGE_BASE_UI = 14000;
const TAUX_UI_AN1 = 0.01;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const imposable75 = 75000 - TOTAL_SINGLE;      // 66,700

const effet = r => r.etat / r.brut * 100;

/* Le seuil ou le Mississippi prend son premier cent, cherche par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 50000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

const gainMS = a75.etat - calcul(CLE, 75000, "single", 0.06).etat;

/* Voisins directs du Mississippi deja publies : Arkansas, Tennessee.
   (Alabama et la Louisiane, les deux autres voisins, ne sont pas encore
   publies.) */
const voisins = ["arkansas", "tennessee"].map(k => ({ cle: k, r: calcul(k, 75000) }));
const NOMS = { arkansas: "Arkansas", tennessee: "Tennessee" };
const article = nom => /^[AEIO]/.test(nom) ? "An" : "A";

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* --- les deux tableaux, produits par les generateurs generiques ---------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Mississippi income tax rate in 2026?",
   "Two segments, not several brackets: 0% on the first $" + c0(SEUIL_0) + " of Mississippi "
   + "taxable income, then a flat 4.0% on every dollar above that. There is no third rate and "
   + "no higher bracket further up &mdash; once you clear $" + c0(SEUIL_0) + " of taxable "
   + "income, every additional dollar is taxed at the same 4.0%."],

  ["Does Mississippi have a standard deduction?",
   "Yes, and it comes in two separate pieces that both subtract from your pay before the rate "
   + "applies: a personal exemption ($" + c0(EX_SINGLE) + " single, $" + c0(EX_JOINT) + " married "
   + "filing jointly, $" + c0(EX_HOH) + " head of family with one dependent already built in) and "
   + "a standard deduction ($" + c0(DED_SINGLE) + " single, $" + c0(DED_JOINT) + " married, $"
   + c0(DED_HOH) + " head of family). Together they total $" + c0(TOTAL_SINGLE) + " for a single "
   + "filer, $" + c0(TOTAL_JOINT) + " filing jointly."],

  ["What is take-home pay on a $75,000 salary in Mississippi?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of "
   + "Mississippi income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. "
   + "The state figure is 4.0% of $" + c0(imposable75) + " of taxable income, after the "
   + "$" + c0(TOTAL_SINGLE) + " combined exemption and standard deduction."],

  ["Is Mississippi's 4.0% rate really lower than the 4.4% some calculators show?",
   "For tax year 2026, yes. The Mississippi Department of Revenue's own withholding tables, "
   + "published for wages paid in 2026, print &ldquo;First $" + c0(SEUIL_0) + " &hellip; 0%&rdquo; "
   + "and &ldquo;Remaining balance (excess of $" + c0(SEUIL_0) + ") &hellip; 4.0%.&rdquo; Several "
   + "third-party payroll tools still show 4.4%, which was the 2025 rate before Mississippi's "
   + "scheduled reduction took effect. This calculator follows the official 2026 table."],

  ["Does Mississippi have local or city income tax?",
   "No. Mississippi's own withholding guide for employers, 25 pages covering every category of "
   + "state withholding, contains no local, municipal or county income tax anywhere in it. "
   + "Nothing comes out of a Mississippi paycheck beyond the state income tax this calculator "
   + "already models."],

  ["At what salary does Mississippi start taking income tax?",
   $(seuilImposition) + " for a single filer &mdash; the point where taxable income (gross pay "
   + "minus the $" + c0(TOTAL_SINGLE) + " combined exemption and standard deduction) clears the "
   + "$" + c0(SEUIL_0) + " threshold and the 4.0% rate starts to apply. Federal tax and FICA still "
   + "apply well below that line."],

  ["Do Mississippi employees pay for unemployment insurance?",
   "No. Unemployment tax in Mississippi is levied on employers, not employees &mdash; the "
   + "Mississippi Department of Employment Security's own rate schedule addresses only employer "
   + "liability, starting at 1.00% of the first $" + c0(WAGE_BASE_UI) + " in wages for a new "
   + "employer's first year. The only state line on a Mississippi pay stub is income tax "
   + "withholding."],

  ["Does a 401(k) contribution lower my Mississippi tax?",
   "Yes. Mississippi's income tax base starts from your pay after any 401(k) elective deferral is "
   + "taken out. On $75,000 with 6% going into a 401(k), your Mississippi tax falls by "
   + $$(gainMS) + " a year, on top of the federal tax savings."],

  ["What is $20 an hour after taxes in Mississippi?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out to " + $$(h20.netHoraire) + " an hour in real terms. Mississippi "
   + "takes " + $$(h20.etat) + " of that at the flat 4.0% rate, after the combined exemption and "
   + "standard deduction."],

  ["Why is my Mississippi paycheck smaller than this calculator says?",
   "The usual reasons: health insurance premiums and other pre-tax benefit deductions come out "
   + "before tax and are not modeled here, a second job pushes your federal withholding up, and "
   + "your employer withholds from the federal W-4 and Mississippi Form 89-350 you actually filed "
   + "rather than the single-exemption assumption this page uses. If you claimed exemptions for a "
   + "spouse or dependents on Form 89-350, your real withholding will be lower than this "
   + "calculator's figure."]
];

const q = s => s.replace(/&(?!amp;|mdash;|ldquo;|rdquo;|hellip;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Mississippi (MS) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Mississippi (MS) paycheck calculator, 2026. 0% on the first $10,000, a flat 4.0% above it &mdash; no local income tax.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/mississippi/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Mississippi (MS) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Mississippi taxes nothing on the first $10,000 of taxable income, then a flat 4.0% on everything above it &mdash; and no local income tax.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/mississippi/">
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
      "name": "Mississippi Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/mississippi/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Mississippi take-home pay after federal income tax, Social Security, Medicare and Mississippi income tax: 0% on the first $10,000 of taxable income, then a flat 4.0%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Mississippi", "item": "https://statelinecalc.com/paycheck-calculator/mississippi/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
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
    <li aria-current="page">Mississippi</li>
  </ol>
</nav>

  <h1>Mississippi Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Mississippi taxes <strong>0% on the first $10,000</strong> of taxable income in 2026, then a
    <strong>flat 4.0%</strong> on everything above it &mdash; one rate, not several brackets. On
    $75,000 that is ${N($$(a75.etat))} to the state and about ${N($(a75.net))} a year in your
    pocket. Mississippi has <strong>no local or city income tax</strong>.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Mississippi take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="mississippi" novalidate>
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
          <span class="help">Sets your federal brackets, and in Mississippi it sets your exemption
          and standard deduction amounts &mdash; the 0%/4.0% rate schedule stays the same for every
          status.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Mississippi it
          lowers your state tax too.</span>
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
    <p>Mississippi runs a two-segment schedule, not a multi-bracket one like
    <a href="/paycheck-calculator/virginia/">Virginia</a> or
    <a href="/paycheck-calculator/north-dakota/">North Dakota</a>: nothing on the first
    ${N("$" + c0(SEUIL_0))} of taxable income, then a single flat ${N("4.0%")} rate on every dollar
    above it. There is no third bracket further up the income scale &mdash; a $40,000 earner and a
    $400,000 earner pay the exact same marginal rate on their last dollar.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Mississippi income tax</strong>: your gross pay minus a ${N("$" + c0(EX_SINGLE))}
      personal exemption and a ${N("$" + c0(DED_SINGLE))} standard deduction (${N("$" + c0(TOTAL_SINGLE))}
      combined for a single filer), with 0% on the first ${N("$" + c0(SEUIL_0))} of what is left and
      4.0% on the rest.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>Mississippi Department of Revenue</strong>&rsquo;s
    <em>Withholding Income Tax Tables And Employer Instructions</em>, Pub 89-700-25-1, read directly
    from dor.ms.gov on <time datetime="2026-09-17">September 17, 2026</time>. Our full sourcing,
    including the line-by-line formula this calculator follows, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The 2026 rate is lower than some third-party tools still show.</strong> Several
    payroll sites publish 4.4% for Mississippi, which was the rate before this year's scheduled
    reduction. The state's own 2026 withholding table prints 4.0% on income above
    ${N("$" + c0(SEUIL_0))}, and that is the figure this calculator uses.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Married
    Filing Separately, handle multiple jobs or dependents beyond the one already built into the
    head-of-family exemption amount, or account for health insurance premiums and other employer
    benefit deductions.</p>
  </div>

  <h2>Mississippi take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Mississippi column applies the flat 4.0% rate to your pay above the
  ${N("$" + c0(TOTAL_SINGLE))} combined exemption and deduction, once it clears the
  ${N("$" + c0(SEUIL_0))} zero-rate band.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Mississippi take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MS state tax</th>
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

    <h2>Mississippi hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Mississippi</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Mississippi&rsquo;s flat 4.0% rate, that leaves about ${N($(h20.net))} a
    year, or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work
    actually puts in your account &mdash; is ${N($$(h20.netHoraire))}. Mississippi&rsquo;s share of
    it is ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Because the 4.0% rate applies equally at
    every income level above the ${N("$" + c0(SEUIL_0))} threshold, a raise from $25 to $30 an hour
    keeps the same share of Mississippi tax taken out of the new money.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Mississippi taxes overtime, tips and shift differentials the same way it taxes the rest of
    your pay, at the flat 4.0% rate once your taxable income clears ${N("$" + c0(SEUIL_0))}. The
    common complaint that &ldquo;overtime is taxed more&rdquo; is a federal withholding effect, not
    a Mississippi one.</p>

    <h3>Mississippi take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Mississippi take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Mississippi</h2>

  <h3>One rate, not a ladder of brackets</h3>
  <p>Once taxable income clears ${N("$" + c0(SEUIL_0))}, every additional dollar in Mississippi is
  taxed at the same ${N("4.0%")}. There is no higher bracket waiting further up the income scale,
  unlike Virginia's climb to 5.75% or North Dakota's climb to 2.5%. On ${N("$25,000")} the state
  takes ${N($$(a25.etat))}, an effective rate of ${N(effet(a25).toFixed(2) + "%")}. On
  ${N("$250,000")} it takes ${N($$(a250.etat))}, or ${N(effet(a250).toFixed(2) + "%")} &mdash;
  close to the full 4.0%, because almost all of a high income sits above the zero-rate band.</p>

  <h3>The exemption and the deduction are two separate numbers</h3>
  <p>Mississippi does not combine them into one figure the way some states do. A single filer
  subtracts a ${N("$" + c0(EX_SINGLE))} personal exemption and a ${N("$" + c0(DED_SINGLE))}
  standard deduction separately &mdash; ${N("$" + c0(TOTAL_SINGLE))} total &mdash; before the
  0%/4.0% schedule applies. A married couple filing jointly gets ${N("$" + c0(EX_JOINT))} plus
  ${N("$" + c0(DED_JOINT))}, or ${N("$" + c0(TOTAL_JOINT))} combined.</p>

  <h3>2026's rate is lower than 2025's</h3>
  <p>Mississippi's own withholding tables for wages paid in 2026 print ${N("4.0%")} on income above
  ${N("$" + c0(SEUIL_0))}. Several payroll tools built before the update still show 4.4%, the prior
  year's rate. This calculator follows the current official table.</p>

  <h3>Mississippi has no local income tax</h3>
  <p>Unlike Ohio's municipal net-profits tax or the county and city taxes several states levy on
  top of a state income tax, nothing on a Mississippi pay stub represents a local income tax. The
  Department of Revenue's own 25-page withholding guide for employers, which walks through every
  category of state withholding an employer must apply, never mentions one.</p>

  <h3>Your employer cannot deduct unemployment insurance from your pay</h3>
  <p>Some states take an employee contribution for unemployment coverage;
  <a href="/paycheck-calculator/washington/">Washington</a> is the example on this site, where paid
  family leave and long-term care both come off the stub, and <a href="/paycheck-calculator/alaska/">Alaska</a>
  shares part of the cost too. Mississippi does not: unemployment tax is a liability the Mississippi
  Department of Employment Security assigns to employers, starting at 1.00% of the first
  ${N("$" + c0(WAGE_BASE_UI))} in a new employer's first year. The only state line on a Mississippi
  pay stub is income tax withholding.</p>

  <h3>Your 401(k) contribution does reduce your Mississippi tax</h3>
  <p>Mississippi's income tax base is your pay after any 401(k) elective deferral is taken out. On
  ${N("$75,000")} with 6% going in, your Mississippi tax falls by ${N($$(gainMS))} a year, on top of
  the federal savings.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Using the old 4.4% rate</h3>
  <p>4.4% was Mississippi's 2025 rate. The state's own 2026 withholding table prints 4.0% on income
  above ${N("$" + c0(SEUIL_0))}, and a calculator built on the older figure will overstate a
  Mississippi worker's state tax on every salary above that threshold.</p>

  <h3>Combining the exemption and deduction into one number</h3>
  <p>They are two separate line items on Mississippi's own schedule, not one combined "standard
  deduction" the way some other states publish it. A single filer's total is
  ${N("$" + c0(TOTAL_SINGLE))}, but it is built from a ${N("$" + c0(EX_SINGLE))} exemption plus a
  ${N("$" + c0(DED_SINGLE))} deduction &mdash; treating either figure alone as the full amount
  understates take-home pay.</p>

  <h3>Assuming a higher bracket exists further up</h3>
  <p>It does not. Once taxable income clears ${N("$" + c0(SEUIL_0))}, the rate stays at 4.0% no
  matter how high the salary goes &mdash; there is no second threshold the way Virginia or North
  Dakota have one.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer withholds from the Form 89-350 you actually filed &mdash;
  if you claimed exemptions for a spouse or dependents, your real Mississippi withholding will be
  lower than this calculator's single-exemption figure. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Mississippi in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N("$16,100")} = ${N($(a75.brut - 16100))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Mississippi taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(EX_SINGLE))} personal
    exemption &minus; ${N("$" + c0(DED_SINGLE))} standard deduction = ${N($(imposable75))}</li>
    <li>Mississippi tax: ${N("$" + c0(SEUIL_0))} &times; 0% + (${N($(imposable75 - SEUIL_0))}
    &times; 4.0%) = ${N($$(a75.etat))}</li>
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
  <p>The same ${N($(a75.brut))} salary, single filer, 2026 rates, state layer only:</p>
  <ul>
${voisins.map(v => {
  const nom = NOMS[v.cle];
  const d = v.r.net - a75.net;
  const sens = d > 0 ? "keeps " + $$(Math.abs(d)) + " more" : "keeps " + $$(Math.abs(d)) + " less";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${article(nom)} ${nom} worker ${sens} than a `
    + `Mississippian on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Mississippi borders four states; two are already on this site.
  <a href="/paycheck-calculator/tennessee/">Tennessee</a> has no state income tax at all, which is
  why a Tennessee worker keeps ${N($$(Math.abs(voisins[1].r.net - a75.net)))} more of the same
  salary. <a href="/paycheck-calculator/arkansas/">Arkansas</a> runs a table-based progressive
  schedule that climbs higher than Mississippi's flat 4.0%, and on this salary an Arkansas worker
  pays ${N($$(voisins[0].r.etat))} to the state against a Mississippian's ${N($$(a75.etat))}.</p>

${blocSources("mississippi")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/arkansas/">Arkansas paycheck calculator</a>
    &mdash; a bordering state with a table-based progressive schedule instead of Mississippi's
    flat 4.0%.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Mississippi", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-17">September 17, 2026</time> &middot;
    Last updated <time datetime="2026-09-17">September 17, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Mississippi rates.
  </p>

</div>
${colonne("Mississippi")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "mississippi");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre le moteur. */
const bareme = (imposable75 - SEUIL_0) * TAUX;
if (Math.abs(bareme - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition du bareme du cas 75 000 $ ne retombe pas sur le moteur (%s vs %s)",
    bareme.toFixed(2), a75.etat.toFixed(2));
  process.exit(2);
}
if (j75.etat >= a75.etat) {
  console.error("ARRET : un couple devrait payer moins qu'un celibataire sur le meme salaire");
  process.exit(2);
}
if (h75.etat >= a75.etat) {
  console.error("ARRET : un chef de famille devrait payer moins qu'un celibataire sur le meme salaire");
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupement bareme 75 000 $ : OK (%s)", bareme.toFixed(2));
