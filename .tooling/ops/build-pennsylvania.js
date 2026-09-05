/* Construit /paycheck-calculator/pennsylvania/.
 *
 * Pourquoi un constructeur pour UNE page : parce que la page cite une
 * quarantaine de montants, et que quatre erreurs d'arithmetique manuelle ont
 * ete rattrapees le 28/08/2026 en comparant au generateur. Ici aucun chiffre
 * n'est ecrit a la main : tous sortent de .tooling/lib/paie.js, la meme
 * bibliotheque qui produit les tableaux et que la suite de tests compare au
 * moteur du navigateur.
 *
 * Ce qui est ecrit a la main, c'est la prose et les FAITS DE DROIT, chacun lu
 * sur la source officielle et date dans les commentaires ci-dessous.
 *
 * Lancer : node .tooling/ops/build-pennsylvania.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "pennsylvania";

/* --- toutes les valeurs citees dans la prose, calculees ------------------ */
const TAUX = 0.0307;          // REV-413 (I), formulaire 2026 de l'Etat
const UC = 0.0007;            // PA DLI, "2023 and thereafter", sans plafond
const PHILLY_RES = 0.03735;   // phila.gov, en vigueur au 1er juillet 2026
const PHILLY_NON = 0.03425;

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a50 = calcul(CLE, 50000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Le 401(k) : ce que l'epargnant pennsylvanien ne recupere pas. */
const PCT_401K = 0.06;
const perte401k = 75000 * PCT_401K * TAUX;
const il75 = calcul("illinois", 75000);
const il75k = calcul("illinois", 75000, "single", PCT_401K);
const gainIL = il75.etat - il75k.etat;

/* Philadelphie sur 60 000 $ : la ville prend plus que l'Etat. */
const phillyRes60 = 60000 * PHILLY_RES;
const ecartPhilly60 = phillyRes60 - a60.etat;

const voisins = ["texas", "washington", "georgia", "illinois"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* --- les deux tableaux, produits par le generateur ----------------------- */
const gen = a => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", "gen-tables-pa.js"), a],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("salaires");
const tableHoraire = gen("horaire");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Pennsylvania income tax rate in 2026?",
   "A flat 3.07%. Pennsylvania has no brackets and no standard deduction, so the rate applies to "
   + "your compensation from the first dollar. The figure comes from the state's own 2026 form, "
   + "REV-413 (I), whose worksheet reads “Multiply Line 1 by 3.07 percent (0.0307)”."],

  ["Does a 401(k) contribution lower my Pennsylvania tax?",
   "No. This is the rule that catches most people out. Pennsylvania treats an elective deferral as "
   + "compensation at the moment it is made, so a 401(k) contribution reduces your federal tax but "
   + "not your state tax. On $75,000 with 6% going into a 401(k), you save on federal tax but the "
   + "state still takes " + $$(a75.etat) + " — " + $$(perte401k) + " more than the same worker "
   + "would pay in a state that follows the federal treatment. Your health insurance premiums under "
   + "a Section 125 cafeteria plan are a different matter: those Pennsylvania does exclude."],

  ["Does Pennsylvania have a standard deduction?",
   "No, and it has no personal exemption either. Line 1 of the state's estimating worksheet is "
   + "“expected PA-taxable income” and is multiplied by 3.07% directly. Low earners are "
   + "relieved through the Special Tax Forgiveness Credit instead, which is a credit claimed on the "
   + "return rather than an amount subtracted from wages, so no withholding calculator can show it."],

  ["What is take-home pay on a $75,000 salary in Pennsylvania?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no "
   + "retirement contribution. That is after " + $(a75.federal) + " of federal income tax, "
   + "$" + c0(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) + " of "
   + "Pennsylvania income tax and " + $$(a75.programmes[0].montant) + " of employee unemployment "
   + "contribution — an effective rate of " + (a75.taux * 100).toFixed(1) + "%. Local earned "
   + "income tax is not included; see the question below."],

  ["What is $20 an hour after taxes in Pennsylvania?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Every hour "
   + "you work is taxed at the same 3.07% by the state, because the rate is flat and there is no "
   + "deduction to use up first."],

  ["Is Pennsylvania unemployment tax taken out of my paycheck?",
   "Yes, and Pennsylvania is unusual in this. In most states unemployment insurance is paid only by "
   + "the employer. Pennsylvania also withholds an employee contribution of 0.07% of gross wages "
   + "— 70 cents per $1,000. It has no wage cap, so it follows your whole salary. On $75,000 "
   + "that is " + $$(a75.programmes[0].montant) + " a year."],

  ["Why is my Pennsylvania paycheck smaller than this calculator says?",
   "Almost always local tax. Pennsylvania municipalities and school districts levy an Earned Income "
   + "Tax, commonly 1% but higher in many places, and Philadelphia's is far higher again. This "
   + "calculator models the state layer only and says so. Health insurance premiums, other benefit "
   + "deductions and W-4 settings account for most of the rest."],

  ["How much is Philadelphia's wage tax in 2026?",
   "Effective July 1, 2026 the City of Philadelphia withholds " + (PHILLY_RES * 100).toFixed(3)
   + "% from residents and " + (PHILLY_NON * 100).toFixed(3) + "% from non-residents who work in "
   + "the city, per the city's own rate table. That is more than the state takes: on a $60,000 "
   + "salary the city's " + $$(phillyRes60) + " exceeds Pennsylvania's " + $$(a60.etat) + " by "
   + $$(ecartPhilly60) + ". A Philadelphia paycheck is not a Pennsylvania paycheck, and this "
   + "calculator does not model the city tax."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/* La liste des Etats publies vit dans .tooling/lib/etats-publies.js, et nulle
   part ailleurs. Chaque generateur en portait sa copie ; relancer celui-ci le
   02/09/2026 a silencieusement efface de la page ses liens vers trois Etats
   publies apres sa derniere execution. Un generateur ne doit pas pouvoir
   defaire le maillage en etant simplement relance. */
const { grilleEtats } = require("../lib/etats-publies.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Locked down deliberately. connect-src names the Google Analytics endpoints
     and nothing else, so page views go out and nothing else can. What the
     visitor TYPES still never leaves the browser: the calculator runs locally
     and no salary value is ever passed to the analytics layer. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js"></script>
<title>Pennsylvania Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Pennsylvania paycheck calculator, 2026. Hourly or salary. Pennsylvania taxes income at a flat 3.07% with no standard deduction &mdash; and, unlike almost every other state, it taxes your 401(k) contribution too.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/pennsylvania/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Pennsylvania Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Pennsylvania taxes income at a flat 3.07% from the first dollar, with no standard deduction &mdash; and your 401(k) contribution does not reduce it.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/pennsylvania/">
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
      "name": "Pennsylvania Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/pennsylvania/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Pennsylvania take-home pay after federal income tax, Social Security, Medicare, Pennsylvania's flat 3.07 percent income tax and the 0.07 percent employee unemployment contribution, including Pennsylvania's treatment of 401(k) contributions as taxable compensation."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Pennsylvania", "item": "https://statelinecalc.com/paycheck-calculator/pennsylvania/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
      ]
    },
    { "@id": "https://statelinecalc.com/#organization" }
  ]
}
</script>
</head>
<body>

${entete("paycheck")}

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Pennsylvania</li>
  </ol>
</nav>

  <h1>Pennsylvania Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Pennsylvania taxes income at a <strong>flat 3.07%</strong> in 2026, with
    <strong>no standard deduction and no personal exemption</strong> &mdash; the rate applies from
    the first dollar. On $75,000, a single filer pays ${N($$(a75.etat))} to the state and keeps
    about ${N($(a75.net))} a year. Unlike almost every other state, Pennsylvania also taxes your
    401(k) contribution.</p>
  
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Pennsylvania take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="pennsylvania" novalidate>
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
          <span class="help">Sets your federal brackets. It does not change your Pennsylvania
          rate, which is the same 3.07% for everyone.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax. In Pennsylvania it
          does not lower your state tax &mdash; see below.</span>
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
    <p>Pennsylvania is the simplest state income tax in the country to describe and one of the
    easiest to get wrong. Simple, because it is one flat rate with no brackets, no standard
    deduction and no personal exemption: your compensation is multiplied by 3.07% and that is the
    tax. Easy to get wrong, because two of its rules run against what people assume from federal
    tax &mdash; a 401(k) contribution does not reduce it, and unemployment insurance comes out of
    your check as well as your employer&rsquo;s.</p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets. For 2026 that deduction is
      ${N("$16,100")} single, ${N("$32,200")} married filing jointly, ${N("$24,150")} head of
      household.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Pennsylvania income tax</strong> at a flat <strong>3.07%</strong> of your
      compensation, with nothing subtracted first.</li>
      <li><strong>Pennsylvania unemployment contribution</strong> at <strong>0.07%</strong> of
      gross wages, with no cap. Most states take nothing from the employee for unemployment;
      Pennsylvania does.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    the <strong>Pennsylvania Department of Revenue</strong> for the income tax rate; and the
    <strong>Pennsylvania Department of Labor &amp; Industry</strong> for the employee unemployment
    contribution. Every Pennsylvania figure was read on the agency&rsquo;s own document on
    <time datetime="2026-08-28">August 28, 2026</time>. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The one thing this calculator does not model, and it matters more in Pennsylvania
    than in most states:</strong> local Earned Income Tax. Pennsylvania municipalities and school
    districts levy their own tax on wages, commonly 1% split between the two, and in Philadelphia
    far more than that. The figures here are federal plus state only. If you live or work in
    Philadelphia, read the section on the city wage tax below before trusting any of these
    numbers.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, apply the
    Special Tax Forgiveness Credit, model multiple jobs, or account for health insurance premiums
    and other employer benefit deductions.</p>
  </div>

  <h2>Pennsylvania take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates, local
  earned income tax excluded. Because the state rate is flat and nothing is deducted first, the
  Pennsylvania column is exactly 3.07% of the first column, on every line.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Pennsylvania take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">PA state tax</th>
          <th scope="col">PA unemployment</th>
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

    <h2>Pennsylvania hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Pennsylvania</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Pennsylvania&rsquo;s 3.07% and the 0.07% unemployment contribution, that
    leaves about ${N($(h20.net))} a year, or ${N($$(h20.net / 12))} a month. Your real hourly rate
    &mdash; what an hour of work actually puts in your account &mdash; is ${N($$(h20.netHoraire))}.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Notice how little the state layer moves
    between them: Pennsylvania takes the same 3.07% of every extra hour, so the whole rise in your
    effective rate comes from the federal brackets.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Pennsylvania taxes overtime, tips and shift differentials at exactly the same 3.07% as your
    base pay, because there is only one rate. That is worth saying plainly, because the common
    complaint that &ldquo;overtime is taxed more&rdquo; is a federal effect: extra pay is withheld
    against a higher federal bracket, and nothing about the state layer changes. Enter your usual
    hours to see the base position, then add the overtime hours to see the difference.</p>

    <h3>Pennsylvania take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates, local earned income tax
    excluded.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Pennsylvania take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Pennsylvania</h2>

  <h3>One rate, no brackets, for everyone</h3>
  <p>Pennsylvania applies a single rate of 3.07% to personal income. There is no bracket structure
  at all: a worker on ${N("$25,000")} and a worker on ${N("$250,000")} are taxed at the same
  percentage of their compensation, and no amount of extra earnings moves you into a higher state
  rate. That makes the state layer of your paycheck completely predictable &mdash; the only thing
  that changes as you earn more is the federal share.</p>

  <h3>There is no standard deduction and no personal exemption</h3>
  <p>This is the rule that most surprises people arriving from another state. Pennsylvania does not
  give you a slice of tax-free income before the rate starts. Line 1 of the state&rsquo;s own 2026
  estimating worksheet is &ldquo;expected PA-taxable income&rdquo; and Line 2 says to multiply it
  by 3.07%. There is nothing in between. A worker on ${N("$25,000")} pays the same percentage as
  one on ${N("$250,000")}.</p>

  <h3>Your 401(k) contribution does not reduce your state tax</h3>
  <p>Pennsylvania treats an elective deferral as compensation at the moment it is made. The
  state&rsquo;s Personal Income Tax Guide puts it directly: contributions made under a cash or
  deferred arrangement to a &ldquo;401(k) Plan or 403(b) plan or other program on behalf of the
  employee&rdquo; are <em>not excludable</em> from Pennsylvania income. So a 401(k) still cuts your
  federal tax, but the state takes 3.07% of the money either way.</p>
  <p>On ${N("$75,000")} with 6% going into a 401(k), that difference is ${N($$(perte401k))} a year
  that a Pennsylvania saver does not get back. The comparison is stark against a state that follows
  the federal treatment: on the same salary and the same contribution, an Illinois worker&rsquo;s
  state tax falls by ${N($$(gainIL))}, while a Pennsylvania worker&rsquo;s does not move at all.</p>

  <h3>Health insurance premiums are treated differently from retirement</h3>
  <p>It would be wrong to conclude that Pennsylvania ignores every pre-tax deduction. Amounts taken
  from your salary under a federally qualified Section 125 cafeteria plan &mdash; health and
  accident premiums, for instance &mdash; are excluded from Pennsylvania compensation. The
  distinction is between insurance you are buying and retirement you are saving: the first reduces
  your state tax, the second does not. This calculator models neither, so if you have health
  premiums your real Pennsylvania tax is slightly lower than shown.</p>

  <h3>Unemployment insurance comes out of your check too</h3>
  <p>In most states unemployment insurance is an employer tax that never touches your pay stub.
  Pennsylvania is one of the few that also withholds an employee contribution: 0.07% of gross
  wages, or 70 cents per $1,000. The state&rsquo;s own guidance is explicit that these
  contributions &ldquo;are based on an individual&rsquo;s total (gross) wages and are not limited
  to the taxable wage base in effect for employer contributions&rdquo; &mdash; so unlike Social
  Security, it never stops. On ${N($(a75.brut))} it is ${N($$(a75.programmes[0].montant))} a year;
  on ${N("$500,000")} it is ${N($$(500000 * UC))}.</p>

  <h3>Local Earned Income Tax is real money, and it is not in these figures</h3>
  <p>Nearly every Pennsylvania municipality and school district levies an Earned Income Tax on
  wages, most commonly 1% in total. It is withheld by your employer alongside the state tax and it
  is genuinely additional. On a ${N($(a60.brut))} salary, a 1% local tax is ${N($(a60.brut * 0.01))} a year
  &mdash; about a third again on top of the ${N($$(a60.etat))} the state takes. Your rate depends
  on where you live and where you work, so no statewide calculator can give it to you; your
  municipality&rsquo;s website or your pay stub can.</p>

  <h3>Philadelphia is a different calculation altogether</h3>
  <p>Philadelphia does not levy the ordinary Earned Income Tax. It levies a Wage Tax, and it is
  large. Per the city&rsquo;s own rate table, effective <strong>July 1, 2026</strong> the rate is
  <strong>${(PHILLY_RES * 100).toFixed(3)}%</strong> for residents and
  <strong>${(PHILLY_NON * 100).toFixed(3)}%</strong> for non-residents who work in the city, down
  slightly from ${N("3.74%")} and ${N("3.43%")} the year before.</p>
  <p>Read that against the state rate and the scale becomes clear: on a ${N($(a60.brut))} salary
  the city takes ${N($$(phillyRes60))} while the state takes ${N($$(a60.etat))}. In Philadelphia,
  <strong>the city takes ${N($$(ecartPhilly60))} more than Pennsylvania does</strong>. A
  Philadelphia paycheck is not a Pennsylvania paycheck, and nothing on this page models the
  difference.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h3>Your effective Pennsylvania rate is exactly 3.07%, which is unusual</h3>
  <p>In almost every other state your effective state rate is lower than the headline rate, because
  a deduction shelters your first few thousand dollars. Not here. With no deduction and no
  exemption, the share of your pay that goes to Pennsylvania is 3.07% at every income &mdash; the
  headline rate and the real rate are the same number. It is one of the very few places where the
  advertised rate tells you the truth without arithmetic.</p>

  <h2>Common mistakes people make</h2>

  <h3>Assuming a 401(k) cuts your state tax the way it cuts your federal tax</h3>
  <p>It is the single most expensive misunderstanding on this page. Payroll software gets it right,
  but budgeting by hand does not: people subtract their contribution from gross, apply 3.07%, and
  come out short every month. The state applies its rate to the money before it goes in.</p>

  <h3>Looking for a Pennsylvania standard deduction</h3>
  <p>There is not one. People search for it, find the federal figure, and subtract that instead,
  which understates their state tax by ${N($$(16100 * TAUX))} on a single filer&rsquo;s
  ${N("$16,100")} federal deduction. The state rate applies to your whole compensation.</p>

  <h3>Confusing the Special Tax Forgiveness Credit with a deduction</h3>
  <p>Pennsylvania does relieve low earners, through the Special Tax Forgiveness Credit claimed on
  the return. It is a credit against tax, not an amount subtracted from wages, and it depends on
  eligibility income and dependants rather than on your salary alone. That is why it cannot appear
  in a withholding calculator: it changes what you get back in April, not what comes out in March.</p>

  <h3>Using a state figure while living in Philadelphia</h3>
  <p>A Philadelphia resident who budgets on the state rate alone is out by more than the state tax
  itself. If the city applies to you, add its rate to everything on this page.</p>

  <h3>Forgetting the local Earned Income Tax outside Philadelphia</h3>
  <p>One percent sounds small next to a federal bracket. On a ${N($(a60.brut))} salary it is
  ${N($(a60.brut * 0.01))} a year, which is roughly a month of groceries. It is withheld quietly and rarely
  looked at.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Your employer withholds from the W-4 you filed, which may
  assume credits or a second job; health premiums and benefit deductions come out first; and local
  tax varies by municipality. Treat this as an accurate model of the federal and state layers, and
  read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Pennsylvania in 2026, with no retirement
  contribution and outside Philadelphia:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Pennsylvania income tax: ${N($(a75.brut))} &times; 3.07% = ${N($$(a75.etat))}
    &mdash; note that nothing is subtracted first</li>
    <li>Pennsylvania unemployment: ${N($(a75.brut))} &times; 0.07% =
    ${N($$(a75.programmes[0].montant))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>Add a 1% local earned income tax and the same worker pays ${N($(a75.brut * 0.01))} more, taking the
  effective rate to about ${N(((a75.total + a75.brut * 0.01) / a75.brut * 100).toFixed(1) + "%")}.</p>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with neighboring states</h2>
  <p>The same ${N($(a75.brut))} salary, single filer, 2026 rates, state layer only:</p>
  <ul>
${voisins.map(v => {
  const nom = v.cle.charAt(0).toUpperCase() + v.cle.slice(1);
  const d = v.r.net - a75.net;
  const sens = d > 0 ? "keeps " + $$(Math.abs(d)) + " more" : "keeps " + $$(Math.abs(d)) + " less";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. A ${nom} worker ${sens} than a `
    + `Pennsylvanian on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Pennsylvania sits where you would expect from its rate: better than Illinois or Georgia,
  behind the states that levy nothing. What the table cannot show is the 401(k) rule, which widens
  the gap for anyone saving for retirement, and local tax, which widens it again.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/salary-to-hourly-calculator/pennsylvania/">Pennsylvania salary to hourly</a>
    &mdash; what an annual salary is worth per hour in Pennsylvania, after tax and not just
    before.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Pennsylvania", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-08-28">August 28, 2026</time> &middot;
    Last updated <time datetime="2026-08-28">August 28, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Pennsylvania rates and exclude local earned income tax.
  </p>

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "pennsylvania");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
