/* Construit /paycheck-calculator/michigan/.
 *
 * Meme raison d'etre que build-pennsylvania.js : la page cite une quarantaine
 * de montants, et aucun n'est ecrit a la main. Tous sortent de
 * .tooling/lib/paie.js, la bibliotheque unique que la suite de tests compare
 * au moteur du navigateur.
 *
 * Ce qui est ecrit a la main, c'est la prose et les FAITS DE DROIT. Chacun a
 * ete lu sur le document de l'agence, et la facon de le lire est notee dans
 * data/rates-2026.js : www.michigan.gov renvoie HTTP 403 a toute requete
 * automatique, les deux PDF officiels ont donc ete lus dans les instantanes
 * de la Wayback Machine. Ce detour devra etre refait a chaque mise a jour.
 *
 * Lancer : node .tooling/ops/build-michigan.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "michigan";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* Form 446 (Rev. 10-25), "2026 Michigan Income Tax Withholding Guide", en-tete,
   verbatim : "Withholding Rate: 4.25%  Personal Exemption Amount: $5,900". */
const TAUX = 0.0425;
const EXO = 5900;
/* Form 5469 (Rev. 05-25), "2026 City of Detroit Income Tax Withholding Guide",
   verbatim : "The City of Detroit income tax rate for residents is 2.4%
   (multiply by 0.024). The City of Detroit income tax rate for nonresidents is
   1.2% (multiply by 0.012)." et "Each exemption is valued at $600.00 per year." */
const DET_RES = 0.024;
const DET_NON = 0.012;
const DET_EXO = 600;

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a25 = calcul(CLE, 25000);
const a250 = calcul(CLE, 250000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Ce que l'exoneration vaut reellement : un montant, pas un pourcentage. */
const valeurExo = EXO * TAUX;

/* Le 401(k) : ce que le Michigan rend, et la Pennsylvanie non. */
const PCT_401K = 0.06;
const mi75k = calcul(CLE, 75000, "single", PCT_401K);
const gainMI = a75.etat - mi75k.etat;
const pa75 = calcul("pennsylvania", 75000);
const pa75k = calcul("pennsylvania", 75000, "single", PCT_401K);
const gainPA = pa75.etat - pa75k.etat;

/* Detroit sur 60 000 $ : la ville prend plus de la moitie de ce que l'Etat prend. */
const detRes60 = (60000 - DET_EXO) * DET_RES;
const detNon60 = (60000 - DET_EXO) * DET_NON;
const partDetroit = detRes60 / a60.etat;
const detRes75 = (75000 - DET_EXO) * DET_RES;

/* Le taux effectif de l'Etat monte avec le revenu, contrairement a la
   Pennsylvanie : c'est l'exoneration qui se dilue. */
const effet25 = a25.etat / 25000 * 100;
const effet75 = a75.etat / 75000 * 100;
const effet250 = a250.etat / 250000 * 100;

const voisins = ["illinois", "pennsylvania", "georgia", "texas"].map(k => ({
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
  ["What is the Michigan income tax rate in 2026?",
   "A flat 4.25%. Michigan has no brackets: the same rate applies whether you earn $25,000 or "
   + "$250,000. What it does have is a personal exemption of $" + c0(EXO) + " per person for 2026, "
   + "subtracted from your pay before the rate is applied. Both figures come from the state's own "
   + "form 446, the 2026 Michigan Income Tax Withholding Guide, whose first line reads "
   + "“Withholding Rate: 4.25%  Personal Exemption Amount: $5,900”."],

  ["How much is the Michigan personal exemption worth?",
   "$" + c0(EXO) + " of your pay escapes the 4.25% rate, which is " + $$(valeurExo) + " a year in "
   + "your pocket for a single filer claiming one exemption. A married couple filing jointly and "
   + "claiming two exemptions shelters $" + c0(EXO * 2) + ", worth " + $$(valeurExo * 2) + ". "
   + "Every dependant you claim on your MI-W4 adds another exemption. This is the figure people "
   + "most often leave out when they work out their own Michigan tax, and leaving it out overstates "
   + "the tax by exactly " + $$(valeurExo) + " per exemption."],

  ["What is take-home pay on a $75,000 salary in Michigan?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "one exemption and no retirement contribution. That is after " + $(a75.federal) + " of federal "
   + "income tax, $" + c0(a75.ss + a75.med) + " of Social Security and Medicare and "
   + $$(a75.etat) + " of Michigan income tax — an effective rate of "
   + (a75.taux * 100).toFixed(1) + "%. City income tax is not included; about two dozen Michigan "
   + "cities levy one, and Detroit's is the largest."],

  ["Does a 401(k) contribution lower my Michigan tax?",
   "Yes. Michigan starts from your federal adjusted gross income, and an elective deferral is "
   + "already out of that figure, so the contribution reduces your state tax as well as your "
   + "federal tax. On $75,000 with 6% going into a 401(k), your Michigan tax falls by "
   + $$(gainMI) + ". This is worth stating because the rule is not universal: in "
   + "Pennsylvania the same worker's state tax falls by " + $$(gainPA) + " — nothing at all."],

  ["What is $20 an hour after taxes in Michigan?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Michigan "
   + "takes " + $$(h20.etat) + " of that, because the $" + c0(EXO) + " exemption shelters a larger "
   + "share of a small salary than a large one."],

  ["How much is Detroit's city income tax in 2026?",
   "2.4% for residents and 1.2% for non-residents who work in the city, after an exemption of $"
   + c0(DET_EXO) + " per person. The rates are set out in the Michigan Treasury's form 5469, the "
   + "2026 City of Detroit Income Tax Withholding Guide. On a $60,000 salary a Detroit resident "
   + "pays " + $$(detRes60) + " to the city on top of " + $$(a60.etat) + " to the state — the city "
   + "adds " + Math.round(partDetroit * 100) + "% again on top of the state layer. This calculator "
   + "models the state layer only."],

  ["Which Michigan cities have an income tax?",
   "About two dozen, and Detroit is by far the largest. A Michigan city income tax is levied under "
   + "the state's Uniform City Income Tax Ordinance and is withheld by your employer alongside the "
   + "state tax, so it is genuinely additional money. Detroit is the one this page quotes a rate "
   + "for, because its rate is published in a Treasury withholding guide we can cite. If you live "
   + "or work in a city that levies one, check your pay stub or your city's own income tax office "
   + "— no statewide calculator can know which city applies to you."],

  ["Why is my Michigan paycheck smaller than this calculator says?",
   "The usual reason is city income tax, which is not modelled here. After that: health insurance "
   + "premiums and other benefit deductions come out before tax and are not included, your MI-W4 may "
   + "claim a different number of exemptions than assumed, and a second job pushes your withholding "
   + "up. The state layer itself is the simplest part of a Michigan paycheck and the least likely "
   + "to be the surprise."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
/* La liste des Etats publies vit dans .tooling/lib/etats-publies.js, et nulle
   part ailleurs. Chaque generateur en portait sa copie ; relancer celui-ci le
   02/09/2026 a silencieusement efface de la page ses liens vers trois Etats
   publies apres sa derniere execution. Un generateur ne doit pas pouvoir
   defaire le maillage en etant simplement relance. */
const { grilleEtats } = require("../lib/etats-publies.js");
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
<title>Michigan Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay</title>
<meta name="description" content="Free Michigan paycheck calculator, 2026. Hourly or salary. Michigan taxes income at a flat 4.25% after a $5,900 personal exemption per person &mdash; and about two dozen Michigan cities, Detroit included, add their own tax on top.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/michigan/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Michigan Paycheck Calculator 2026 &mdash; Hourly and Salary Take-Home Pay">
<meta property="og:description" content="Michigan taxes income at a flat 4.25% after a $5,900 exemption per person &mdash; and Detroit takes 2.4% more on top.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/michigan/">
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
      "name": "Michigan Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/michigan/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Michigan take-home pay after federal income tax, Social Security, Medicare and Michigan's flat 4.25 percent income tax, applied after the state's $5,900 personal exemption for each exemption claimed."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Michigan", "item": "https://statelinecalc.com/paycheck-calculator/michigan/" }
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
    <li aria-current="page">Michigan</li>
  </ol>
</nav>

  <h1>Michigan Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Michigan taxes income at a <strong>flat 4.25%</strong> in 2026, applied after a
    <strong>personal exemption of ${N("$" + c0(EXO))} for each exemption you claim</strong>. On
    $75,000, a single filer pays ${N($$(a75.etat))} to the state and keeps about
    ${N($(a75.net))} a year. About two dozen Michigan cities levy their own income tax on top;
    Detroit takes ${N("2.4%")} from residents.</p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Michigan take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="michigan" novalidate>
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
          <span class="help">Sets your federal brackets. In Michigan it changes how many
          ${N("$" + c0(EXO))} exemptions are assumed, not the 4.25% rate.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Michigan it
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
    <p>Michigan has one of the shorter state tax rules in the country: one flat rate, one
    exemption, no brackets. Your pay minus ${N("$" + c0(EXO))} for each exemption you claim,
    multiplied by 4.25%. That is the whole state income tax. What makes a Michigan paycheck harder
    to predict than the rule suggests is the layer underneath it &mdash; roughly two dozen Michigan
    cities levy their own income tax, and whether one applies to you depends on where you live and
    where you work rather than on anything about your salary.</p>

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
      <li><strong>Michigan income tax</strong> at a flat <strong>4.25%</strong>, applied after
      subtracting ${N("$" + c0(EXO))} for each exemption. A single filer is modelled with one
      exemption; married filing jointly with two.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and the <strong>Michigan Department of Treasury</strong> for the state rate and the exemption,
    read on form 446, the <em>2026 Michigan Income Tax Withholding Guide</em>, whose header line
    states both figures. The Detroit rates quoted further down come from the Treasury&rsquo;s form
    5469, the <em>2026 City of Detroit Income Tax Withholding Guide</em>. Both were read on
    <time datetime="2026-08-29">August 29, 2026</time>. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The one thing this calculator does not model:</strong> city income tax. It is the
    single biggest reason a Michigan pay stub comes in under a statewide estimate, and in Detroit
    it is a large number rather than a rounding difference. Read the Detroit section below before
    trusting these figures if you live or work in a city that levies one.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model
    dependants beyond the exemption count implied by your filing status, handle multiple jobs, or
    account for health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Michigan take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption, no retirement contribution, 2026 state and
  federal rates, city income tax excluded. The Michigan column is 4.25% of the first column minus
  ${N("$" + c0(EXO))} &mdash; which is why it never quite reaches 4.25% of your salary.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Michigan take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MI state tax</th>
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

    <h2>Michigan hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Michigan</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Michigan&rsquo;s 4.25%, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your account &mdash; is ${N($$(h20.netHoraire))}. Michigan&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. The state layer moves very little between
    them: every extra hour is taxed at the same 4.25%, so almost all of the rise in your effective
    rate comes from the federal brackets.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Michigan taxes overtime, tips and shift differentials at exactly the same 4.25% as your base
    pay, because there is only one rate and the exemption has already been used up by your regular
    earnings. The common complaint that &ldquo;overtime is taxed more&rdquo; is a federal effect:
    extra pay is withheld against a higher federal bracket, and nothing about the state layer
    changes. Enter your usual hours to see the base position, then add the overtime hours.</p>

    <h3>Michigan take-home pay by hourly rate</h3>
    <p>Single filer with one exemption, 40 hours a week (2,080 hours a year), 2026 rates, city
    income tax excluded.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Michigan take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Michigan</h2>

  <h3>One rate, no brackets, for everyone</h3>
  <p>Michigan applies a single rate of 4.25% to taxable income. There is no bracket structure: a
  worker on ${N("$25,000")} and a worker on ${N("$250,000")} face the same percentage on every
  dollar above their exemption, and no amount of extra earnings moves you into a higher state rate.
  The only part of your paycheck that changes shape as you earn more is the federal share.</p>

  <h3>The ${N("$" + c0(EXO))} personal exemption is per person, not per household</h3>
  <p>Michigan does not have a standard deduction. It has a personal and dependency exemption, and
  the 2026 value is ${N("$" + c0(EXO))} for each exemption you claim on your MI-W4. One for
  yourself, one for a spouse who is not claiming their own, one for each dependant. Every exemption
  takes ${N("$" + c0(EXO))} out of the reach of the 4.25% rate, which is ${N($$(valeurExo))} a year
  in your pocket. A married couple claiming two shelters ${N("$" + c0(EXO * 2))}, worth
  ${N($$(valeurExo * 2))}.</p>
  <p>This is the figure most often missing when someone works out their own Michigan tax. Multiply
  your salary by 4.25% and you overstate the tax by ${N($$(valeurExo))} for every exemption you
  forgot.</p>

  <h3>Your effective Michigan rate is always below 4.25%, and rises as you earn more</h3>
  <p>Because the exemption is a fixed dollar amount rather than a percentage, it shelters a larger
  share of a small salary than a large one. On ${N("$25,000")} the state takes
  ${N($$(a25.etat))}, an effective state rate of ${N(effet25.toFixed(2) + "%")}. On
  ${N("$75,000")} it takes ${N($$(a75.etat))}, or ${N(effet75.toFixed(2) + "%")}. On
  ${N("$250,000")} it is ${N(effet250.toFixed(2) + "%")}. The headline rate is a ceiling the state
  approaches but never reaches &mdash; the opposite of
  <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a>, where the headline rate and the
  real rate are the same number at every income.</p>

  <h3>Your 401(k) contribution does reduce your Michigan tax</h3>
  <p>Michigan taxable income starts from your federal adjusted gross income, and an elective
  deferral to a 401(k) or 403(b) is already excluded from that figure. So the contribution cuts
  your state tax as well as your federal tax. On ${N("$75,000")} with 6% going in, your Michigan
  tax falls by ${N($$(gainMI))} a year.</p>
  <p>It is worth saying explicitly because the rule is not universal, and the exception is close by:
  a Pennsylvania worker making the same contribution on the same salary sees their state tax fall
  by ${N($$(gainPA))} &mdash; Pennsylvania treats the deferral as compensation the moment it is
  made. Michigan does not.</p>

  <h3>Detroit takes 2.4%, and it is not in these figures</h3>
  <p>Detroit levies its own income tax on top of the state&rsquo;s. Per the Michigan Treasury&rsquo;s
  own 2026 withholding guide for the city, the rate is <strong>${(DET_RES * 100).toFixed(1)}%</strong>
  for residents and <strong>${(DET_NON * 100).toFixed(1)}%</strong> for non-residents whose
  predominant place of employment is Detroit, after an exemption of ${N("$" + c0(DET_EXO))} per
  person &mdash; a much smaller exemption than the state&rsquo;s.</p>
  <p>The scale is easy to underestimate. On a ${N($(60000))} salary, a Detroit resident pays
  ${N($$(detRes60))} to the city while paying ${N($$(a60.etat))} to the state: the city adds
  <strong>${N(Math.round(partDetroit * 100) + "%")} again</strong> on top of the state layer. A
  non-resident working in the city pays ${N($$(detNon60))}. Nothing on this page models either.</p>

  <h3>About two dozen Michigan cities levy an income tax</h3>
  <p>Detroit is the largest but not the only one. Michigan cities may levy an income tax under the
  state&rsquo;s Uniform City Income Tax Ordinance, and roughly two dozen do. It is withheld by your
  employer alongside the state tax, it applies to residents wherever they work and to non-residents
  on the work they perform in the city, and it is genuinely additional money. Your city&rsquo;s
  income tax office is the only reliable source for its rate; a statewide calculator cannot know
  which city applies to you.</p>

  <h3>Michigan does not tax your pension the way it taxes your paycheck</h3>
  <p>Worth knowing if you are close to retirement, though it does not affect a working paycheck.
  Michigan phases retirement and pension income out of tax by birth year: the Treasury&rsquo;s 2026
  withholding guide sets the subtraction for recipients born 1946 through 1966 at
  ${N("$49,423")} single and ${N("$98,846")} married filing jointly, and a larger allowance again
  for those born before 1946. Wages are not part of that scheme &mdash; everything on this page is
  the working-age calculation.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Multiplying the whole salary by 4.25%</h3>
  <p>The most common error, and it always goes the same way: it overstates your Michigan tax by
  ${N($$(valeurExo))} per exemption. The rate applies to your pay <em>after</em> the
  ${N("$" + c0(EXO))} exemption comes off, not before.</p>

  <h3>Looking for a Michigan standard deduction</h3>
  <p>There is not one. Michigan gives a personal and dependency exemption instead, and the two are
  not interchangeable: an exemption is claimed per person, so a family of four shelters
  ${N("$" + c0(EXO * 4))} where a single filer shelters ${N("$" + c0(EXO))}. Searching for a
  standard deduction and finding the federal figure leads people to subtract ${N("$16,100")}, which
  understates their Michigan tax by ${N($$((16100 - EXO) * TAUX))}.</p>

  <h3>Using a state figure while living in Detroit</h3>
  <p>A Detroit resident who budgets on the state rate alone is out by ${N($$(detRes60))} a year on a
  ${N($(60000))} salary. If a city tax applies to you, add it to everything on this page.</p>

  <h3>Assuming a city tax only applies where you live</h3>
  <p>It applies both ways. A Michigan city taxes its residents on all their earnings wherever they
  work, and non-residents on the work they perform inside the city. Commuting into Detroit from a
  suburb does not put you outside the city tax; it puts you on the lower non-resident rate.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Your employer withholds from the MI-W4 you filed, which may
  claim a different number of exemptions than assumed here; health premiums and benefit deductions
  come out first; and city tax varies. Treat this as an accurate model of the federal and state
  layers, and read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Michigan in 2026, claiming one exemption, with no
  retirement contribution and outside a city that levies an income tax:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Michigan taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(EXO))} =
    ${N($(a75.brut - EXO))}</li>
    <li>Michigan income tax: ${N($(a75.brut - EXO))} &times; 4.25% = ${N($$(a75.etat))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>The same worker living in Detroit pays ${N($$(detRes75))} more to the city, taking the
  effective rate to about
  ${N(((a75.total + detRes75) / 75000 * 100).toFixed(1) + "%")}.</p>

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
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. A ${nom} worker ${sens} than a `
    + `Michigander on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Michigan sits in the middle of the states published here: its rate is higher than
  Pennsylvania&rsquo;s but its exemption gives back what Pennsylvania does not, and it is well
  behind the states that levy nothing at all. What the comparison cannot show is city tax, which in
  Detroit is large enough to change the ranking on its own.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/salary-to-hourly-calculator/michigan/">Michigan salary to hourly</a>
    &mdash; what an annual salary is worth per hour in Michigan, after tax and not just
    before.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-08-29">August 29, 2026</time> &middot;
    Last updated <time datetime="2026-08-29">August 29, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Michigan rates and exclude city income tax.
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

const dossier = path.join(RACINE, "paycheck-calculator", "michigan");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
