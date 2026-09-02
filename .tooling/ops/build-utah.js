/* Construit /paycheck-calculator/utah/.
 *
 * Meme raison d'etre que build-michigan.js : la page cite une quarantaine de
 * montants, et aucun n'est ecrit a la main. Tous sortent de
 * .tooling/lib/paie.js, la bibliotheque unique que la suite de tests compare
 * au moteur du navigateur.
 *
 * Ce qui est ecrit a la main, c'est la prose et les FAITS DE DROIT. Chacun a
 * ete lu sur le document de l'agence, et la facon de le lire est notee dans
 * data/rates-2026.js. Deux pieges propres a l'Utah, a ne pas oublier a la
 * prochaine mise a jour :
 *   1. incometax.utah.gov/paying/tax-rates affichait encore 4,5 % le
 *      2026-09-02. C'est PERIME. La loi (Utah Code 59-10-104, « Amended by
 *      Chapter 250, 2026 General Session ») et la Publication 14 Rev. 4/26
 *      disent toutes deux 4,45 %. Deux sources contre une : ne jamais se fier
 *      a cette page seule.
 *   2. Le PDF officiel du Pub 14 repondait HTTP 404 sur le serveur de l'Etat,
 *      y compris depuis la page qui le publie. Il a ete lu dans l'instantane
 *      Wayback du 2026-07-16.
 *
 * Lancer : node .tooling/ops/build-utah.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "utah";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* Utah Code 59-10-104, verbatim : « (b) 4.45% ». Publication 14, Rev. 4/26,
   Schedule 7 (ANNUAL) : « Multiply line 1 by .0445 (4.45%) », « Base allowance
   485 », « Line 1 minus $9,348 (not less than 0) », « Multiply line 4 by .013
   (1.3%) », « Withholding tax — line 2 minus line 6 (not less than 0) ». */
const TAUX = 0.0445;
const SOCLE = 485;                 // allocation de base annuelle, celibataire
const SOCLE_M = 970;               // idem, couple : exactement le double
const SEUIL = 9348;                // ou commence l'effacement, celibataire
const SEUIL_M = 18696;             // idem, couple
const EFFACE = 0.013;              // 1,3 % par dollar au-dessus du seuil

/* Le revenu auquel le credit a entierement disparu. Au-dela, et seulement
   au-dela, l'Utah est vraiment un impot a taux unique. */
const FIN = SEUIL + SOCLE / EFFACE;
const FIN_M = SEUIL_M + SOCLE_M / EFFACE;

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a40 = calcul(CLE, 40000);
const a25 = calcul(CLE, 25000);
const a250 = calcul(CLE, 250000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Ce que le credit vaut reellement a differents niveaux de salaire : un
   montant, pas un pourcentage. C'est l'angle de la page. */
const credit = (brut, marie) => Math.max(0,
  (marie ? SOCLE_M : SOCLE) - Math.max(0, brut - (marie ? SEUIL_M : SEUIL)) * EFFACE);
const cr25 = credit(25000, false);
const cr40 = credit(40000, false);
const cr60m = credit(60000, true);

/* Ce que couterait l'erreur la plus frequente : multiplier tout le salaire par
   4,45 % en oubliant le credit. */
const brut25 = 25000 * TAUX;
const brut40 = 40000 * TAUX;

/* Le 401(k) : l'Utah part des salaires soumis a la retenue federale, donc il
   suit. Publication 14, « Utah Taxable Wages », verbatim : « Utah calculates
   withholding tax based on wages subject to federal withholding tax (as
   defined by the IRS). » */
const PCT_401K = 0.06;
const ut75k = calcul(CLE, 75000, "single", PCT_401K);
const gainUT = a75.etat - ut75k.etat;
const pa75 = calcul("pennsylvania", 75000);
const pa75k = calcul("pennsylvania", 75000, "single", PCT_401K);
const gainPA = pa75.etat - pa75k.etat;

/* Le taux effectif monte avec le revenu tant que le credit s'efface, puis se
   fige a 4,45 % exactement. C'est la forme la plus inhabituelle du fichier. */
const effet25 = a25.etat / 25000 * 100;
const effet40 = a40.etat / 40000 * 100;
const effet75 = a75.etat / 75000 * 100;
const effet250 = a250.etat / 250000 * 100;

const voisins = ["michigan", "illinois", "pennsylvania", "nevada"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));

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
  ["What is the Utah income tax rate in 2026?",
   "A flat 4.45%. Utah cut the rate from 4.5% for 2026, and the figure is written into the law "
   + "itself: Utah Code section 59-10-104 sets the tax at the taxpayer's state taxable income "
   + "multiplied by “4.45%”, amended by Chapter 250 of the 2026 General Session. The Tax "
   + "Commission's own withholding guide, Publication 14 revision 4/26, uses the same number on "
   + "every schedule: “Multiply line 1 by .0445 (4.45%)”. Be careful with the rate page on the "
   + "state's website, which still showed 4.5% in September 2026."],

  ["Does Utah have a standard deduction?",
   "No, and this is the part almost every Utah calculation gets wrong. Utah does not shrink your "
   + "taxable income at all: it charges 4.45% on your full wages, then subtracts a taxpayer "
   + "credit. For 2026 the credit starts at " + $(SOCLE) + " a year for a single filer, and it "
   + "fades by 1.3 cents for every dollar you earn above " + $(SEUIL) + ". It is gone completely "
   + "at " + $(Math.round(FIN)) + ". A married couple filing jointly gets " + $(SOCLE_M)
   + ", fading above " + $(SEUIL_M) + " and gone at " + $(Math.round(FIN_M)) + "."],

  ["What is take-home pay on a $75,000 salary in Utah?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Utah "
   + "income tax — an effective rate of " + (a75.taux * 100).toFixed(1) + "%. At this salary the "
   + "taxpayer credit is long gone, so the Utah figure is a clean 4.45% of gross pay."],

  ["Why is my Utah effective tax rate lower than 4.45%?",
   "Because the taxpayer credit has not run out yet. Below " + $(Math.round(FIN)) + " single, the "
   + "credit still takes something off your bill, so your real state rate sits under the headline "
   + "one. On " + $(25000) + " Utah takes " + $$(a25.etat) + ", which is "
   + effet25.toFixed(2) + "%. On " + $(40000) + " it takes " + $$(a40.etat) + ", or "
   + effet40.toFixed(2) + "%. From " + $(Math.round(FIN)) + " upwards it is exactly 4.45% and "
   + "stays there — Utah is only a true flat tax above that line."],

  ["Does a 401(k) contribution lower my Utah tax?",
   "Yes. Publication 14 defines the base plainly: “Utah calculates withholding tax based on wages "
   + "subject to federal withholding tax (as defined by the IRS).” An elective deferral to a "
   + "401(k) or 403(b) is already out of that figure, so it reduces your Utah tax as well as your "
   + "federal tax. On $75,000 with 6% going in, your Utah tax falls by " + $$(gainUT) + ". The "
   + "rule is not universal: in Pennsylvania the same worker's state tax falls by " + $$(gainPA)
   + " — nothing at all."],

  ["What is $20 an hour after taxes in Utah?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Utah takes "
   + $$(h20.etat) + " of that. At this salary the taxpayer credit is still worth "
   + $$(credit(h20.brut, false)) + ", which is why the state's share is below 4.45% of gross."],

  ["Do any Utah cities charge their own income tax?",
   "Publication 14 provides for one withholding only — the state income tax — and sets out no "
   + "city or county income tax withholding anywhere in its schedules. That is a meaningful "
   + "difference from states like Michigan, where Detroit adds 2.4% on top of the state layer, or "
   + "Pennsylvania, where local earned income tax is normal. Utah's sales and property taxes do "
   + "vary a great deal by locality, but neither comes out of your paycheck."],

  ["How does head of household work in Utah?",
   "Utah's withholding schedules have only two columns, Single and Married, so an employer "
   + "withholds from a head of household on the Single schedule. That is what this calculator "
   + "does, and it is the number that will appear on your pay stub. When you file your annual "
   + "TC-40 return, the taxpayer credit phase-out threshold for head of household sits between "
   + "the single and married figures, so your final bill may come out slightly lower than shown "
   + "here."],

  ["Why is my Utah paycheck smaller than this calculator says?",
   "Health insurance premiums and other benefit deductions come out before tax and are not "
   + "included here; your federal W-4 may be set differently from the filing status assumed; and "
   + "a second job pushes your withholding up. Note also that Utah withholding does not respond "
   + "to allowances at all — Publication 14 states that “No subtraction is made for personal or "
   + "other withholding allowances claimed on federal form W-4”, so the state layer is the same "
   + "for everyone on the same wage and filing status."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const ETATS_50 = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri",
  "Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York",
  "North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island",
  "South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming"];
const PUBLIES = { Florida: "florida", Georgia: "georgia", Illinois: "illinois",
  Michigan: "michigan", Nevada: "nevada", Pennsylvania: "pennsylvania", Texas: "texas",
  Utah: "utah", Washington: "washington" };
const listeEtats = ETATS_50.map(n => PUBLIES[n]
  ? `    <li><a href="/paycheck-calculator/${PUBLIES[n]}/">${n}</a></li>`
  : `    <li>${n}</li>`).join("\n");

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
<title>Utah Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay</title>
<meta name="description" content="Free Utah paycheck calculator, 2026. Hourly or salary. Utah taxes income at a flat 4.45% with no standard deduction &mdash; instead a taxpayer credit of $485 that fades out and is gone by $46,656.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/utah/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Utah Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay">
<meta property="og:description" content="Utah taxes income at a flat 4.45% in 2026 &mdash; but there is no deduction, only a taxpayer credit that fades out as you earn more.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/utah/">
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
      "name": "Utah Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/utah/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Utah take-home pay after federal income tax, Social Security, Medicare and Utah's flat 4.45 percent income tax, including the Utah taxpayer credit of $485 for a single filer and its 1.3 percent phase-out above $9,348."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Utah", "item": "https://statelinecalc.com/paycheck-calculator/utah/" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": "${q(n)}", "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" } }`).join(",\n")}
      ]
    },
    { "@type": "Organization", "name": "StateLine Calc", "url": "https://statelinecalc.com/", "logo": "https://statelinecalc.com/assets/icon-512.png" }
  ]
}
</script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><svg class="brand-mark" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#0F172A"/><rect x="30" y="10" width="4" height="44" rx="2" fill="#1D4ED8"/><rect x="12" y="34" width="12" height="20" rx="2" fill="#FFFFFF"/><rect x="40" y="22" width="12" height="32" rx="2" fill="#FFFFFF"/></svg>StateLine Calc</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/paycheck-calculator/">Paycheck</a>
      <a href="/salary-to-hourly-calculator/">Salary&nbsp;to&nbsp;Hourly</a>
      <a href="/methodology/">Methodology</a>
    </nav>
  </div>
</header>

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Utah</li>
  </ol>
</nav>

  <h1>Utah Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Utah taxes income at a <strong>flat 4.45%</strong> in 2026, down from 4.5%. There is
    <strong>no standard deduction</strong>: the rate applies to your whole wage, and a
    <strong>taxpayer credit of ${N($(SOCLE))}</strong> comes off the tax afterwards, fading by
    1.3 cents per dollar earned above ${N($(SEUIL))} and gone by ${N($(Math.round(FIN)))}. On
    $75,000, a single filer pays ${N($$(a75.etat))} to the state and keeps about
    ${N($(a75.net))} a year.</p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Utah take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="utah" novalidate>
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
          <span class="help">Sets your federal brackets. In Utah it doubles the taxpayer credit
          for a couple; it never changes the 4.45% rate.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Utah it
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
    <p>Utah looks like the simplest state tax in the country and is not quite. There is one rate,
    4.45%, and no brackets. But there is also no deduction and no personal exemption: the rate is
    applied to your entire wage, and relief arrives afterwards as a <strong>credit against the tax
    itself</strong>. That credit shrinks as you earn more, which means Utah&rsquo;s real rate rises
    with income even though its headline rate never moves.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets. For 2026 that deduction is
      ${N("$16,100")} single, ${N("$32,200")} married filing jointly, ${N("$24,150")} head of
      household.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Utah income tax</strong> at a flat <strong>4.45%</strong> of your whole wage,
      less the taxpayer credit: ${N($(SOCLE))} for a single filer, reduced by 1.3% of every dollar
      above ${N($(SEUIL))}, and never taken below zero.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base.
    The Utah rate was verified on <strong>two independent official sources</strong>, because the
    first one we read was out of date. <strong>Utah Code section 59-10-104</strong>, the statute
    itself, sets the tax at your state taxable income multiplied by &ldquo;4.45%&rdquo;, and is
    marked &ldquo;Amended by Chapter 250, 2026 General Session&rdquo;. The <strong>Utah State Tax
    Commission&rsquo;s Publication 14</strong>, <em>Withholding Tax Guide</em>, revision 4/26 and
    effective for pay periods beginning on or after June 1, 2026, uses the same rate on every one
    of its eight schedules and supplies the credit figures. Both were read on
    <time datetime="2026-09-02">September 2, 2026</time>. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>A warning about the state&rsquo;s own rate page.</strong> On the day we wrote this,
    the Tax Commission&rsquo;s income tax rate page still read &ldquo;January 1, 2025 &ndash;
    current: 4.5% or .045&rdquo;. That page had not been updated for the 2026 cut. The law and the
    withholding guide agree on 4.45%, and that is the figure used here. If another calculator shows
    you 4.5% for 2026, this is almost certainly why.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model the
    dependant exemption or the Utah retirement credit, handle multiple jobs, or account for health
    insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Utah take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The Utah
  column is 4.45% of the first column, less whatever is left of the ${N($(SOCLE))} taxpayer credit
  &mdash; which is why it climbs faster than the salary does up to ${N($(Math.round(FIN)))}, and in
  a straight line after that.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Utah take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">UT state tax</th>
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

    <h2>Utah hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Utah</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Utah&rsquo;s 4.45%, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Utah&rsquo;s share is
    ${N($$(h20.etat))} for the year, which is less than 4.45% of your gross because the taxpayer
    credit is still worth ${N($$(credit(h20.brut, false)))} at this salary.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($(h30.netHoraire))}. Utah&rsquo;s credit runs out between
    the two lower rates: ${N($(Math.round(FIN)))} a year falls between $20 an hour
    (${N($(h20.brut))}) and $25 an hour (${N($(h25.brut))}). So a worker on $25 or $30 an hour pays
    a clean 4.45% on every dollar, while a worker on $20 an hour still has
    ${N($(credit(h20.brut, false)))} of credit left.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Utah taxes overtime, tips and shift differentials at the same 4.45% as your base pay. There
    is a second, quieter effect: overtime raises your annual wage, which shrinks whatever is left
    of the taxpayer credit at 1.3 cents on the dollar. Below ${N($(Math.round(FIN)))} a year, an
    extra hour of overtime is effectively taxed by Utah at 5.75% rather than 4.45% &mdash; the rate
    plus the credit you lose. Above that line the credit is already gone and the marginal rate is
    the headline one.</p>

    <h3>Utah take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Utah take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Utah</h2>

  <h3>The rate is 4.45% in 2026, not 4.5%</h3>
  <p>Utah has cut its income tax rate almost every year, and 2026 is another cut: from 4.5% to
  <strong>4.45%</strong>. The number is in the statute &mdash; Utah Code 59-10-104, amended by
  Chapter 250 of the 2026 General Session &mdash; and in Publication 14, the Tax
  Commission&rsquo;s own withholding guide, on all eight of its payroll schedules. On a
  ${N($(75000))} salary the cut is worth ${N($$(75000 * 0.0005))} a year, which is real money but
  smaller than most people expect a rate cut to be.</p>

  <h3>Utah has no deduction and no exemption &mdash; it has a credit</h3>
  <p>This is the structural fact that makes Utah different from every other state published here,
  and the one most calculators get wrong. Michigan subtracts ${N("$5,900")} from your income before
  taxing it. Illinois subtracts ${N("$2,925")}. Utah subtracts <em>nothing</em>: the 4.45% applies
  to your whole wage. Relief comes afterwards, as a <strong>taxpayer credit</strong> deducted from
  the tax itself.</p>
  <p>For 2026 the credit is ${N($(SOCLE))} a year for a single filer and ${N($(SOCLE_M))} for a
  married couple filing jointly &mdash; exactly double, at every payroll period. It is reduced by
  1.3 cents for every dollar of wages above ${N($(SEUIL))} single or ${N($(SEUIL_M))} joint, and it
  is never allowed to push your tax below zero. Publication 14&rsquo;s annual schedule states it in
  six lines: multiply wages by .0445, take a base allowance of 485, subtract 1.3% of wages over
  $9,348 from that allowance, then subtract what is left from the tax.</p>

  <h3>The credit runs out at ${N($(Math.round(FIN)))}, and that is where Utah becomes a flat tax</h3>
  <p>Because the credit fades at a fixed 1.3 cents on the dollar, the point where it hits zero is
  arithmetic rather than policy: ${N($(SOCLE))} divided by 1.3% is ${N($(Math.round(SOCLE / EFFACE)))},
  added to the ${N($(SEUIL))} threshold, gives <strong>${N($(Math.round(FIN)))}</strong> for a
  single filer and <strong>${N($(Math.round(FIN_M)))}</strong> for a couple. Below that line your
  effective Utah rate is under 4.45%. Above it, Utah is exactly the flat tax it advertises, for
  everyone, forever.</p>

  <h3>Your effective Utah rate rises with income, then stops dead</h3>
  <p>On ${N($(25000))} the state takes ${N($$(a25.etat))}, an effective state rate of
  ${N(effet25.toFixed(2) + "%")}. On ${N($(40000))} it takes ${N($$(a40.etat))}, or
  ${N(effet40.toFixed(2) + "%")}. On ${N($(75000))} it is ${N(effet75.toFixed(2) + "%")}, and on
  ${N($(250000))} it is still ${N(effet250.toFixed(2) + "%")} &mdash; the same, because the credit
  ran out long before. That flat top is unusual: in
  <a href="/paycheck-calculator/michigan/">Michigan</a>, where relief is a fixed-dollar exemption,
  the effective rate keeps creeping toward the headline rate at every income and never quite
  arrives.</p>

  <h3>Your 401(k) contribution does reduce your Utah tax</h3>
  <p>Publication 14 defines the base without ambiguity: &ldquo;Utah calculates withholding tax
  based on wages subject to federal withholding tax (as defined by the IRS).&rdquo; An elective
  deferral to a 401(k) or 403(b) is excluded from those wages, so it cuts your state tax as well as
  your federal tax. On ${N($(75000))} with 6% going in, your Utah tax falls by ${N($$(gainUT))} a
  year.</p>
  <p>It is worth saying explicitly because the rule is not universal:
  <a href="/paycheck-calculator/pennsylvania/">a Pennsylvania worker</a> making the same
  contribution on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash;
  Pennsylvania treats the deferral as compensation the moment it is made. Utah does not.</p>

  <h3>Utah withholding ignores your W-4 allowances entirely</h3>
  <p>Publication 14 is explicit: &ldquo;No subtraction is made for personal or other withholding
  allowances claimed on federal form W-4.&rdquo; Two Utah workers on the same wage and the same
  filing status have the same state withholding, whatever their household looks like. Dependants
  affect your annual TC-40 return, not the amount the employer takes out each payday.</p>

  <h3>No city or county income tax comes out of a Utah paycheck</h3>
  <p>Publication 14 sets out one withholding and one only, the state income tax, with no local
  layer anywhere in its schedules. That is a real difference from several of the states published
  here: a Detroit resident pays 2.4% to the city on top of Michigan&rsquo;s state rate, and local
  earned income tax is routine in Pennsylvania. Utah&rsquo;s sales and property tax rates do vary a
  great deal between cities and counties, but neither is withheld from your pay.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Using 4.5% because that is what the state&rsquo;s rate page says</h3>
  <p>It is out of date. The Tax Commission&rsquo;s rate page still showed &ldquo;January 1, 2025
  &ndash; current: 4.5%&rdquo; in September 2026, while the statute and the withholding guide both
  say 4.45%. On ${N($(75000))} the difference is ${N($$(75000 * 0.0005))} a year &mdash; small, but
  wrong in the direction that makes you budget for less than you get.</p>

  <h3>Looking for a Utah standard deduction</h3>
  <p>There is not one, and the search usually ends badly. People find the federal figure and
  subtract ${N("$16,100")} from their wage before applying 4.45%, which understates their Utah tax
  by ${N($$(16100 * TAUX))}. Utah taxes the whole wage and gives the relief back as a credit
  instead.</p>

  <h3>Multiplying the whole salary by 4.45% and stopping there</h3>
  <p>The opposite error, and it only bites below ${N($(Math.round(FIN)))}. On ${N($(25000))} that
  arithmetic gives ${N($$(brut25))} when the real figure is ${N($$(a25.etat))} &mdash; you have
  forgotten ${N($$(cr25))} of credit. On ${N($(40000))} it gives ${N($$(brut40))} against a real
  ${N($$(a40.etat))}, forgetting ${N($$(cr40))}. Above ${N($(Math.round(FIN)))} the shortcut is
  exactly right, which is part of why the mistake survives.</p>

  <h3>Giving a married couple a single filer&rsquo;s credit</h3>
  <p>A couple filing jointly gets ${N($(SOCLE_M))}, not ${N($(SOCLE))}, and their phase-out does
  not start until ${N($(SEUIL_M))}. On a ${N($(60000))} joint income the credit is still worth
  ${N($$(cr60m))}, where a single filer on the same wage has had nothing left for years. Halving
  the household figures is the most expensive shortcut on this page.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Health premiums and benefit deductions come out first,
  your federal W-4 settings drive the federal share, and a second job changes everything. Treat
  this as an accurate model of the federal and state layers, and read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Utah in 2026, with no retirement contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Utah tax before credit: ${N($(a75.brut))} &times; 4.45% = ${N($$(75000 * TAUX))}</li>
    <li>Taxpayer credit: ${N($(SOCLE))} &minus; 1.3% &times;
    (${N($(a75.brut))} &minus; ${N($(SEUIL))}) = ${N("$0")}, fully phased out</li>
    <li>Utah income tax: ${N($$(a75.etat))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>The same worker on ${N($(25000))} would keep ${N($$(cr25))} of the credit, paying
  ${N($$(a25.etat))} to Utah instead of the ${N($$(brut25))} a flat 4.45% would suggest.</p>

  <h2>Frequently asked questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Compare with other states</h2>
  <p>The same ${N($(a75.brut))} salary, single filer, 2026 rates, state layer only:</p>
  <ul>
${voisins.map(v => {
  const nom = v.cle.charAt(0).toUpperCase() + v.cle.slice(1);
  const d = v.r.net - a75.net;
  const sens = d > 0 ? "keeps " + $$(Math.abs(d)) + " more" : "keeps " + $$(Math.abs(d)) + " less";
  const art = /^[AEIOU]/.test(nom) ? "An" : "A";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${art} ${nom} worker ${sens} than a `
    + `Utahn on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>At ${N($(75000))} only <a href="/paycheck-calculator/illinois/">Illinois</a> takes more of the
  states published here, because Utah&rsquo;s credit has run out by this salary and the full
  4.45% applies to every dollar. Lower down the scale the ranking changes: the credit is
  worth more, proportionally, to a worker on ${N($(25000))} than Michigan&rsquo;s exemption is
  worth to the same worker. The states that levy nothing at all remain in a category of their own.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/michigan/">Michigan paycheck calculator</a> &mdash; the
    same idea built the other way round, with an exemption instead of a credit.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

  <h2>Browse paycheck calculators by state</h2>
  <ul class="state-grid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-02">September 2, 2026</time> &middot;
    Last updated <time datetime="2026-09-02">September 2, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Utah rates.
  </p>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p><strong>StateLine Calc</strong> &mdash; free money calculators for all 50 states.
    No sign-up. No personal data required.</p>
    <p class="micro u-on-dark">
      <a href="/about/">About</a> &middot;
      <a href="/methodology/">Methodology</a> &middot;
      <a href="/contact/">Contact</a> &middot;
      <a href="/privacy/">Privacy</a> &middot;
      <a href="/terms/">Terms</a> &middot;
      <a href="/disclaimer/">Disclaimer</a>
    </p>
  </div>
</footer>

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "utah");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
