/* Construit /paycheck-calculator/north-carolina/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * La Caroline du Nord est le 13e Etat publie et le 6e a taux plat, apres la
 * Georgie, la Pennsylvanie, le Michigan, l'Utah et l'Illinois. Le risque etait
 * d'ecrire une 6e page interchangeable. Ce que la Caroline du Nord a de propre,
 * et qu'aucun des cinq autres n'a :
 *
 *   1. LE TAUX RETENU SUR LA PAIE N'EST PAS LE TAUX D'IMPOT. L'Etat fait
 *      prelever 4,09 % quand il ne reclame que 3,99 %. C'est ecrit noir sur
 *      blanc dans le NC-30 2026, sous chaque feuille de calcul. Aucun autre
 *      Etat publie ici ne fait ca. C'est LA reponse a « pourquoi ma fiche de
 *      paie ne correspond pas au calculateur », et c'est verifiable.
 *   2. Le taux BAISSE selon un calendrier vote : 4,25 % en 2025, 3,99 % en
 *      2026, et 2027 depend de declencheurs de recettes. La page dit ce qui
 *      est acquis et s'arrete la.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur un eventuel impot municipal en Caroline du Nord : aucune source
 *     lue dans un sens ni dans l'autre au 09/09/2026 ;
 *   - rien sur les taux 2027 : « additional rate changes MAY apply », dit
 *     NCDOR. Une baisse conditionnelle n'est pas une baisse.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet, avec les citations verbatim, dans data/rates-2026.js et dans
 * .tooling/sources/north-carolina.md. Les quatre documents ont ete lus le
 * 09/09/2026 : NCDOR « Tax Rate Schedules » (HTTP 200), NC-30 revision 11-25
 * (PDF, 570 759 octets), NC-4 revision 10-25 (PDF), et la page « Am I Required
 * to Pay Taxes? » de la N.C. Division of Employment Security.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-north-carolina.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "north-carolina";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* NCDOR, « Tax Rate Schedules », lu le 09/09/2026, verbatim : « For Taxable
   Years after 2025, the North Carolina individual income tax rate is 3.99%
   (0.0399). » Confirme par le NC-30 2026, encadre « New for 2026 ». */
const TAUX = 0.0399;
const TAUX_2025 = 0.0425;
/* NC-30 2026, sous chaque feuille de calcul, verbatim : « The withholding
   calculations are based on the individual income tax rate of 3.99% plus 0.1%.
   This results in a withholding tax rate of 4.09%. » */
const TAUX_RETENUE = 0.0409;
/* NC-4 (Web 10-25), Part II ligne 2. */
const DED_SINGLE = 12750;
const DED_JOINT = 25500;
const DED_HOH = 19125;
/* NC-30 2026, feuilles annualisees, ligne 5 : « Multiply the number of
   allowances by $2,500.00 ». */
const ALLOWANCE = 2500;

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a25 = calcul(CLE, 25000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Ce que la deduction vaut reellement, en dollars et pas en pourcentage. */
const valeurDed = DED_SINGLE * TAUX;
const valeurDedJoint = DED_JOINT * TAUX;

/* L'ECART DE 0,1 POINT, en dollars. La retenue et l'impot partent de la meme
   assiette — le NC-30 retire la meme deduction standard que le NC-4 — donc
   l'ecart vaut exactement 0,1 % du revenu imposable de l'Etat. */
const imposable75 = Math.max(0, 75000 - DED_SINGLE);
const imposable60 = Math.max(0, 60000 - DED_SINGLE);
const retenue75 = imposable75 * TAUX_RETENUE;
const ecart75 = retenue75 - a75.etat;
const ecart60 = imposable60 * (TAUX_RETENUE - TAUX);

/* Ce que la baisse de 2025 a 2026 a rendu, sur le meme salaire. */
const impot2025_75 = imposable75 * TAUX_2025;
const gainBaisse75 = impot2025_75 - a75.etat;

/* Le 401(k) : la Caroline du Nord part de l'AGI federal, donc elle suit. */
const PCT_401K = 0.06;
const nc75k = calcul(CLE, 75000, "single", PCT_401K);
const gainNC = a75.etat - nc75k.etat;
const pa75 = calcul("pennsylvania", 75000);
const pa75k = calcul("pennsylvania", 75000, "single", PCT_401K);
const gainPA = pa75.etat - pa75k.etat;

/* Le taux effectif de l'Etat monte avec le revenu : la deduction se dilue. */
const effet25 = a25.etat / 25000 * 100;
const effet75 = a75.etat / 75000 * 100;
const effet250 = a250.etat / 250000 * 100;

const voisins = ["georgia", "tennessee", "pennsylvania", "texas"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { georgia: "Georgia", tennessee: "Tennessee",
               pennsylvania: "Pennsylvania", texas: "Texas" };

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
  ["What is the North Carolina income tax rate in 2026?",
   "A flat 3.99%. North Carolina has no brackets: the same rate applies whether you earn $25,000 "
   + "or $250,000. It comes down from 4.25% in 2025. The figure is the state's own: the NCDOR tax "
   + "rate schedules read “For Taxable Years after 2025, the North Carolina individual income "
   + "tax rate is 3.99% (0.0399)”, and the 2026 NC-30 withholding guide repeats it in its "
   + "“New for 2026” box. Before the rate applies, you subtract the North Carolina "
   + "standard deduction — $" + c0(DED_SINGLE) + " for a single filer."],

  ["Why does my North Carolina employer withhold 4.09% and not 3.99%?",
   "Because the state tells them to. The 2026 NC-30 withholding tables say, under every worksheet, "
   + "“The withholding calculations are based on the individual income tax rate of 3.99% plus "
   + "0.1%. This results in a withholding tax rate of 4.09%.” The extra tenth of a point is "
   + "deliberate over-withholding: you pay tax at 3.99% and your employer holds back 4.09%, so the "
   + "difference comes back as part of your refund. On a $75,000 salary that is about "
   + $$(ecart75) + " a year. This calculator shows the tax you owe at 3.99%, which is why its "
   + "take-home figure is slightly higher than your pay stub."],

  ["What is take-home pay on a $75,000 salary in North Carolina?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of North "
   + "Carolina income tax — an effective rate of " + (a75.taux * 100).toFixed(1) + "%. Your "
   + "employer will actually hold back about " + $$(ecart75) + " more than that state figure, at "
   + "the 4.09% withholding rate, and return it at filing."],

  ["How much is the North Carolina standard deduction for 2026?",
   "$" + c0(DED_SINGLE) + " if you are single or married filing separately, $" + c0(DED_JOINT)
   + " if you are married filing jointly or a surviving spouse, and $" + c0(DED_HOH) + " for head "
   + "of household. The amounts are printed on Form NC-4, the 2026 employee's withholding "
   + "allowance certificate. Two things surprise people: there is no extra amount for being 65 or "
   + "older or blind, unlike the federal deduction, and if you are not eligible for the federal "
   + "standard deduction your North Carolina one is zero."],

  ["Does a 401(k) contribution lower my North Carolina tax?",
   "Yes. North Carolina taxable income starts from your federal adjusted gross income, and an "
   + "elective deferral is already out of that figure, so the contribution reduces your state tax "
   + "as well as your federal tax. On $75,000 with 6% going into a 401(k), your North Carolina tax "
   + "falls by " + $$(gainNC) + ". The rule is not universal: in Pennsylvania the same worker's "
   + "state tax falls by " + $$(gainPA) + " — nothing at all."],

  ["What is $20 an hour after taxes in North Carolina?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. North "
   + "Carolina takes " + $$(h20.etat) + " of that, because the $" + c0(DED_SINGLE) + " standard "
   + "deduction shelters a larger share of a small salary than a large one."],

  ["Is unemployment insurance taken out of a North Carolina paycheck?",
   "No. The N.C. Division of Employment Security states it plainly: “Employers pay "
   + "unemployment insurance taxes based on employers' payroll. Unemployment taxes are not deducted "
   + "from employees' wages.” North Carolina also has no state disability or paid-leave "
   + "payroll deduction of the kind Washington workers pay. State income tax is the only "
   + "state-level line on a North Carolina pay stub."],

  ["Will the North Carolina tax rate fall again in 2027?",
   "It may, and nobody can promise it yet. Session Law 2023-134 set the 3.99% rate for 2026 and "
   + "made every further cut conditional: NCDOR's own wording is that “additional rate changes "
   + "may apply to tax years beginning with 2027 based on certain rate reduction triggers”, "
   + "which are revenue targets the state has to hit first. This page models 2026, the year that "
   + "is settled."],

  ["Why is my North Carolina paycheck smaller than this calculator says?",
   "Start with the 4.09% withholding rate above: your employer holds back a tenth of a point more "
   + "than the tax you owe, on purpose. After that, the usual reasons apply — health insurance "
   + "premiums and other benefit deductions come out before tax and are not modelled here, the "
   + "allowances on your NC-4 may differ from the assumption made here, and a second job pushes "
   + "your federal withholding up."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
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
<title>North Carolina (NC) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free North Carolina (NC) paycheck calculator, 2026. A flat 3.99% after a $12,750 standard deduction &mdash; and why your employer withholds 4.09%.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/north-carolina/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="North Carolina (NC) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="North Carolina taxes income at a flat 3.99% in 2026 &mdash; but your employer is told to withhold 4.09%.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/north-carolina/">
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
      "name": "North Carolina Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/north-carolina/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 North Carolina take-home pay after federal income tax, Social Security, Medicare and North Carolina's flat 3.99 percent income tax, applied after the state's standard deduction of $12,750 for a single filer."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "North Carolina", "item": "https://statelinecalc.com/paycheck-calculator/north-carolina/" }
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
    <li aria-current="page">North Carolina</li>
  </ol>
</nav>

  <h1>North Carolina Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>North Carolina taxes income at a <strong>flat 3.99%</strong> in 2026, down from 4.25% in
    2025, applied after a <strong>standard deduction of ${N("$" + c0(DED_SINGLE))}</strong> for a
    single filer. On $75,000, that is ${N($$(a75.etat))} to the state and about
    ${N($(a75.net))} a year in your pocket. Your employer is told to withhold at
    <strong>4.09%</strong>, not 3.99% &mdash; the extra tenth of a point comes back at filing.</p>

    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your North Carolina take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="north-carolina" novalidate>
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
          <span class="help">Sets your federal brackets. In North Carolina it changes the standard
          deduction &mdash; ${N("$" + c0(DED_SINGLE))}, ${N("$" + c0(DED_JOINT))} or
          ${N("$" + c0(DED_HOH))} &mdash; not the 3.99% rate.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in North
          Carolina it lowers your state tax too.</span>
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
    <p>North Carolina has one of the shortest state tax rules in the country: one flat rate, one
    standard deduction, no brackets. Your pay minus ${N("$" + c0(DED_SINGLE))}, multiplied by
    3.99%. What makes a North Carolina paycheck harder to predict than that rule suggests is not
    the tax &mdash; it is the withholding, which the state deliberately sets a tenth of a point
    above the tax itself.</p>

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
      <li><strong>North Carolina income tax</strong> at a flat <strong>3.99%</strong>, applied
      after subtracting the state standard deduction: ${N("$" + c0(DED_SINGLE))} single,
      ${N("$" + c0(DED_JOINT))} married filing jointly, ${N("$" + c0(DED_HOH))} head of
      household.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and the <strong>North Carolina Department of Revenue</strong> for the state rate and deduction.
    The rate was read on NCDOR&rsquo;s own tax rate schedules and confirmed in form NC-30, the
    <em>2026 Income Tax Withholding Tables and Instructions for Employers</em>; the deduction
    amounts were read on form NC-4, the 2026 <em>Employee&rsquo;s Withholding Allowance
    Certificate</em>. Both were read on <time datetime="2026-09-09">September 9, 2026</time>. Our
    full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The one thing to know before comparing this with your pay stub:</strong> this page
    calculates the tax you owe, at 3.99%. Your employer withholds at 4.09%, because the state
    tells them to. The gap is explained below, and it is the reason a North Carolina stub comes in
    slightly under a correct estimate rather than over.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model the
    North Carolina child deduction, handle multiple jobs, or account for health insurance premiums
    and other employer benefit deductions.</p>
  </div>

  <h2>North Carolina take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  North Carolina column is 3.99% of the first column minus ${N("$" + c0(DED_SINGLE))} &mdash;
  which is why it never quite reaches 3.99% of your salary.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 North Carolina take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">NC state tax</th>
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

    <h2>North Carolina hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in North Carolina</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and North Carolina&rsquo;s 3.99%, that leaves about ${N($(h20.net))} a year,
    or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. North Carolina&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. The state layer moves very little between
    them: every extra hour is taxed at the same 3.99%, so almost all of the rise in your effective
    rate comes from the federal brackets.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>North Carolina taxes overtime, tips and shift differentials at exactly the same 3.99% as
    your base pay, because there is only one rate and the standard deduction has already been used
    up by your regular earnings. The common complaint that &ldquo;overtime is taxed more&rdquo; is
    a federal effect: extra pay is withheld against a higher federal bracket, and nothing about the
    state layer changes. Enter your usual hours to see the base position, then add the overtime
    hours.</p>

    <h3>North Carolina take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 North Carolina take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in North Carolina</h2>

  <h3>Your employer withholds 4.09%. You owe 3.99%.</h3>
  <p>This is the one North Carolina fact that no other state on this site shares, and it is
  written into the state&rsquo;s own instructions to employers. Under every worksheet in form
  NC-30, the 2026 withholding tables, the same sentence appears: <em>&ldquo;The withholding
  calculations are based on the individual income tax rate of 3.99% plus 0.1%. This results in a
  withholding tax rate of 4.09%.&rdquo;</em></p>
  <p>It is deliberate over-withholding. The state would rather send you a refund than chase a
  balance, so it instructs employers to take out a tenth of a point more than the law charges. On
  a ${N($(60000))} salary the extra amounts to about ${N($$(ecart60))} across the year; on
  ${N($(75000))}, about ${N($$(ecart75))}. It is not a tax and it is not lost &mdash; it comes
  back when you file.</p>
  <p>This page models the <strong>tax</strong>, at 3.99%, because that is what the year actually
  costs you. If you are reconciling against a pay stub rather than a tax return, add roughly 0.1%
  of your pay above the standard deduction to the state line, and expect it back later.</p>

  <h3>One rate, no brackets, for everyone</h3>
  <p>North Carolina applies a single rate of 3.99% to taxable income. There is no bracket
  structure: a worker on ${N("$25,000")} and a worker on ${N("$250,000")} face the same percentage
  on every dollar above their standard deduction, and no amount of extra earnings moves you into a
  higher state rate. The only part of your paycheck that changes shape as you earn more is the
  federal share.</p>

  <h3>The rate came down from 4.25%, and 2027 is not settled</h3>
  <p>North Carolina is in the middle of a legislated series of cuts. The rate was
  ${N("4.25%")} for 2025 and is ${N("3.99%")} for 2026 &mdash; on a ${N($(75000))} salary that
  change alone is worth ${N($$(gainBaisse75))} a year. What comes next is conditional rather than
  scheduled: NCDOR&rsquo;s own wording is that &ldquo;additional rate changes may apply to tax
  years beginning with 2027 based on certain rate reduction triggers&rdquo;, set by Session Law
  2023-134. Those triggers are revenue targets. Until they are met, 3.99% is the number, and this
  page will not quote a 2027 rate it cannot source.</p>

  <h3>The standard deduction is ${N("$" + c0(DED_SINGLE))}, and it is not the federal one</h3>
  <p>North Carolina sets its own: ${N("$" + c0(DED_SINGLE))} single or married filing separately,
  ${N("$" + c0(DED_JOINT))} married filing jointly or surviving spouse,
  ${N("$" + c0(DED_HOH))} head of household. Those amounts are printed on form NC-4. Every dollar
  of it escapes the 3.99% rate, which is ${N($$(valeurDed))} a year for a single filer and
  ${N($$(valeurDedJoint))} for a couple filing jointly.</p>
  <p>Two differences from the federal deduction catch people out. There is <strong>no extra
  amount</strong> for being 65 or older or blind &mdash; the federal deduction has one, North
  Carolina&rsquo;s does not. And if you are not eligible for the federal standard deduction at all,
  your North Carolina standard deduction is zero.</p>

  <h3>Your effective North Carolina rate is always below 3.99%, and rises as you earn more</h3>
  <p>Because the deduction is a fixed dollar amount rather than a percentage, it shelters a larger
  share of a small salary than a large one. On ${N("$25,000")} the state takes ${N($$(a25.etat))},
  an effective state rate of ${N(effet25.toFixed(2) + "%")}. On ${N("$75,000")} it takes
  ${N($$(a75.etat))}, or ${N(effet75.toFixed(2) + "%")}. On ${N("$250,000")} it is
  ${N(effet250.toFixed(2) + "%")}. The headline rate is a ceiling the state approaches but never
  reaches &mdash; the opposite of <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a>,
  where the headline rate and the real rate are the same number at every income.</p>

  <h3>Filing jointly moves the deduction, not the rate</h3>
  <p>A couple filing jointly shelters ${N("$" + c0(DED_JOINT))} instead of
  ${N("$" + c0(DED_SINGLE))}, exactly twice the single amount, and pays the same 3.99% on the rest.
  On a ${N($(75000))} single income, choosing married filing jointly takes the state tax from
  ${N($$(a75.etat))} to ${N($$(j75.etat))}. There is no marriage penalty in the North Carolina
  rate itself, because there is only one rate to apply.</p>

  <h3>Your 401(k) contribution does reduce your North Carolina tax</h3>
  <p>North Carolina taxable income starts from your federal adjusted gross income &mdash; NCDOR
  says so in as many words &mdash; and an elective deferral to a 401(k) or 403(b) is already
  excluded from that figure. So the contribution cuts your state tax as well as your federal tax.
  On ${N("$75,000")} with 6% going in, your North Carolina tax falls by ${N($$(gainNC))} a
  year.</p>
  <p>It is worth saying explicitly because the rule is not universal, and the exception is close
  by: a Pennsylvania worker making the same contribution on the same salary sees their state tax
  fall by ${N($$(gainPA))} &mdash; Pennsylvania treats the deferral as compensation the moment it
  is made. North Carolina does not.</p>

  <h3>Nothing else comes out at the state level</h3>
  <p>State income tax is the only state-level line on a North Carolina pay stub. Unemployment
  insurance is paid by employers: the N.C. Division of Employment Security states that
  &ldquo;employers pay unemployment insurance taxes based on employers&rsquo; payroll&rdquo; and that
  &ldquo;unemployment taxes are not deducted from employees&rsquo; wages&rdquo;. There is no state
  disability or paid-family-leave deduction of the kind that takes 1.387% out of a
  <a href="/paycheck-calculator/washington/">Washington</a> paycheck. If a state with no income tax
  can still deduct from your pay, a state with one can also stop at that &mdash; and North Carolina
  does.</p>

  <h3>The child deduction is real, and it is not in these figures</h3>
  <p>North Carolina allows a deduction for taxpayers who qualify for the federal child tax credit.
  It is worth an amount per qualifying child that falls as income rises, and it is claimed on your
  return &mdash; or reflected through the allowances you enter on your NC-4. This calculator does
  not model it, because it depends on facts about your household rather than your salary. If you
  have qualifying children, your real North Carolina tax is lower than the figure shown here.</p>

  <h3>Allowances on your NC-4 are worth ${N("$" + c0(ALLOWANCE))} each</h3>
  <p>The NC-4 works with allowances rather than a simple deduction box. Each one takes
  ${N("$" + c0(ALLOWANCE))} a year out of the pay your employer applies the withholding rate to
  &mdash; the NC-30 worksheet says to multiply the number of allowances by
  ${N("$" + c2(ALLOWANCE))}. Claiming allowances you are not entitled to moves money into your
  pocket now and out of it at filing; claiming none, when you have children or large itemized
  deductions, does the reverse.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Multiplying the whole salary by 3.99%</h3>
  <p>The most common error, and it always goes the same way: it overstates your North Carolina tax
  by ${N($$(valeurDed))} for a single filer. The rate applies to your pay <em>after</em> the
  ${N("$" + c0(DED_SINGLE))} standard deduction comes off, not before.</p>

  <h3>Using 4.09% as the tax rate</h3>
  <p>It is the withholding rate, not the tax rate, and the difference runs the other way from what
  people assume: 4.09% is what leaves your paycheck, 3.99% is what you owe. Budget on 3.99% and
  treat the rest as a small forced saving that comes back at filing.</p>

  <h3>Using the federal standard deduction on the state return</h3>
  <p>NCDOR flags this one itself: the North Carolina standard deduction and the federal standard
  deduction are not the same number, and the federal figure does not belong on line 11 of form
  D-400. Subtracting ${N("$16,100")} instead of ${N("$" + c0(DED_SINGLE))} understates your North
  Carolina tax by ${N($$((16100 - DED_SINGLE) * TAUX))}.</p>

  <h3>Expecting an extra deduction at 65</h3>
  <p>The federal standard deduction grows when you turn 65 or if you are blind. North
  Carolina&rsquo;s does not: the amount is the same at 25 and at 75. Retirement income is treated
  separately from wages, but the deduction itself does not move.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can &mdash; and in North Carolina there is a structural reason
  before the usual ones: the 4.09% withholding rate. After that, your employer withholds from the
  NC-4 you filed, which may claim a different number of allowances than assumed here; health
  premiums and benefit deductions come out first. Treat this as an accurate model of the federal
  and state layers, and read <a href="/disclaimer/">why your pay stub will differ</a> for the
  rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in North Carolina in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>North Carolina taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(DED_SINGLE))} =
    ${N($(imposable75))}</li>
    <li>North Carolina income tax: ${N($(imposable75))} &times; 3.99% = ${N($$(a75.etat))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>The same worker&rsquo;s employer will actually hold back ${N($$(retenue75))} of state tax
  across the year, at the 4.09% withholding rate &mdash; ${N($$(ecart75))} more than the
  ${N($$(a75.etat))} owed. That difference is not an extra cost; it is the refund arriving
  early.</p>

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
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. A ${nom} worker ${sens} than a `
    + `North Carolinian on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>North Carolina sits low among the states that tax wages at all: its rate is below
  Georgia&rsquo;s and its standard deduction is real, but it cannot reach the states next door that
  levy nothing. The gap to Tennessee is the whole of the state tax line, and it is smaller than
  most people expect.</p>

${blocSources("north-carolina")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash; the
    neighbour with no wage tax at all, and what that is worth on the same salary.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("North Carolina", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-09">September 9, 2026</time> &middot;
    Last updated <time datetime="2026-09-09">September 9, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    North Carolina rates.
  </p>

</div>
${colonne("North Carolina")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "north-carolina");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
