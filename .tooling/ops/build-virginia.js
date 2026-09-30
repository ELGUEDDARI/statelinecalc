/* Construit /paycheck-calculator/virginia/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * La Virginie est le 19e Etat publie. Ce qu'elle a de propre :
 *
 *   1. LE BAREME NE S'ELARGIT PAS AU MARIAGE. Une seule table de quatre
 *      tranches (2% / 3% / 5% / 5,75%) s'applique a tout statut de
 *      declaration - le celibataire et le couple qui declare conjointement
 *      franchissent les memes seuils en dollars, contrairement a la
 *      Caroline du Nord ou au Nebraska deja publies, qui doublent leurs
 *      seuils au mariage. Meme famille de bareme que l'Arkansas.
 *   2. UNE VRAIE EXEMPTION PERSONNELLE, PAS UN CREDIT. 930 $ par exemption,
 *      qui se retranche du REVENU avant application du bareme - a distinguer
 *      du credit du Nebraska ou de l'Utah, qui se retranchent de l'IMPOT.
 *   3. LA DEDUCTION STANDARD 2026 EST TEMPORAIRE. La loi de 2025 qui l'a
 *      portee a 8 750 $ / 17 500 $ s'eteint apres l'annee d'imposition 2026 et
 *      retombe a 3 000 $ / 6 000 $ en 2027, sauf nouvelle loi. Un chiffre
 *      juste pour 2026 qui ne le restera pas.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * Income Tax Withholding Guide for Employers, Virginia Department of
 * Taxation, rev. 05/25, lu en direct le 16/09/2026 (HTTP 200, aucun obstacle
 * reseau). Detail complet, chaque citation verbatim : .tooling/sources/virginia.md
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur Married Filing Separately, non propose par le calculateur ;
 *   - rien sur l'exemption Age 65+/aveugle (E2, 800 $), que le calculateur
 *     ne demande pas ;
 *   - rien sur un eventuel impot de comte ou de ville DISTINCT de l'impot
 *     sur le revenu (taxe fonciere, etc.) : hors du champ d'un calculateur
 *     de paie.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-virginia.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "virginia";

/* --- les valeurs de droit citees dans la prose --------------------------- */
const DED_SINGLE = 8750, DED_JOINT = 17500, DED_HOH = 8750;   // p.5, 2026
const DED_2027_SINGLE = 3000, DED_2027_JOINT = 6000;          // sunset apres 2026
const EXEMPT = 930;                                            // E1, p.21
const B1 = 3000, B2 = 5000, B3 = 17000;                        // seuils du bareme
const T1 = 0.02, T2 = 0.03, T3 = 0.05, T4 = 0.0575;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const imposable75 = 75000 - DED_SINGLE - EXEMPT;      // 65,320

const effet = r => r.etat / r.brut * 100;

/* Le seuil ou la Virginie prend son premier cent, cherche par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 50000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* Le gain d'un versement 401(k) : la Virginie part du revenu brut ajuste
   federal, qui exclut deja un versement elective. */
const PCT_401K = 0.06;
const gainVA = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;
const pa75 = calcul("pennsylvania", 75000);
const gainPA = pa75.etat - calcul("pennsylvania", 75000, "single", PCT_401K).etat;

/* Voisins directs de la Virginie deja publies : Caroline du Nord, Tennessee. */
const voisins = ["north-carolina", "tennessee"].map(k => ({ cle: k, r: calcul(k, 75000) }));
const NOMS = { "north-carolina": "North Carolina", tennessee: "Tennessee" };
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
  ["What is the Virginia income tax rate in 2026?",
   "A four-bracket schedule from 2% to 5.75%: 2% on the first $" + c0(B1) + " of Virginia "
   + "taxable income, 3% from $" + c0(B1) + " to $" + c0(B2) + ", 5% from $" + c0(B2) + " to $"
   + c0(B3) + ", and 5.75% on everything above $" + c0(B3) + ". The same four thresholds apply "
   + "whether you file single or married filing jointly &mdash; Virginia does not double its "
   + "brackets for a married couple the way the federal government or some other states do."],

  ["Does Virginia have a standard deduction?",
   "Yes, and for 2026 it is temporarily higher than usual: $" + c0(DED_SINGLE) + " for a single "
   + "filer or head of household, $" + c0(DED_JOINT) + " filing jointly. A 2025 law raised it from "
   + "$8,500/$17,000, but the increase is written to sunset after tax year 2026, reverting to $"
   + c0(DED_2027_SINGLE) + "/$" + c0(DED_2027_JOINT) + " in 2027 unless lawmakers act again. On top "
   + "of the standard deduction, Virginia also subtracts a $" + EXEMPT + " personal exemption per "
   + "person before applying the rate schedule."],

  ["What is take-home pay on a $75,000 salary in Virginia?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Virginia "
   + "income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%. The state figure "
   + "is the four-bracket schedule applied to $" + c0(imposable75) + " of taxable income, after the $"
   + c0(DED_SINGLE) + " standard deduction and the $" + EXEMPT + " personal exemption."],

  ["Does a married couple get a wider Virginia tax bracket than a single filer?",
   "No. Virginia's four thresholds &mdash; $" + c0(B1) + ", $" + c0(B2) + " and $" + c0(B3)
   + " &mdash; are the same in dollars for a single filer and a married couple filing jointly. "
   + "What differs is the standard deduction ($" + c0(DED_JOINT) + " joint versus $" + c0(DED_SINGLE)
   + " single) and the personal exemption count (two people versus one), not the brackets "
   + "themselves. On a $75,000 salary, a joint filer's Virginia tax is " + $$(j75.etat)
   + " against a single filer's " + $$(a75.etat) + " &mdash; the gap comes entirely from the "
   + "larger deduction and exemption, not from wider brackets."],

  ["Does Virginia have local or city income tax?",
   "No. Virginia's own 32-page withholding guide for employers, which covers every category of "
   + "state withholding, never mentions a local or municipal income tax. Nothing comes out of a "
   + "paycheck beyond the state income tax this calculator already models."],

  ["At what salary does Virginia start taking income tax?",
   $(seuilImposition) + " for a single filer &mdash; the point where taxable income (gross pay "
   + "minus the $" + c0(DED_SINGLE) + " standard deduction and the $" + EXEMPT + " personal "
   + "exemption) turns positive and the 2% first bracket applies. Federal tax and FICA still "
   + "apply well below that line."],

  ["Do Virginia employees pay for unemployment insurance?",
   "No. Unemployment tax in Virginia is levied on employers, not employees &mdash; the Virginia "
   + "Employment Commission's own page on employer responsibilities addresses only employer "
   + "liability for the tax and never mentions a wage deduction. The only state line on a "
   + "Virginia pay stub is income tax withholding."],

  ["Does a 401(k) contribution lower my Virginia tax?",
   "Yes. Virginia's income tax starts from your federal adjusted gross income, which already "
   + "excludes a 401(k) elective deferral. On $75,000 with 6% going into a 401(k), your Virginia "
   + "tax falls by " + $$(gainVA) + " a year. The rule is not universal: a "
   + "<a href=\"/paycheck-calculator/pennsylvania/\">Pennsylvania</a> worker making the same "
   + "contribution on the same salary sees their state tax fall by " + $$(gainPA)
   + " &mdash; nothing at all."],

  ["What is $20 an hour after taxes in Virginia?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out to " + $$(h20.netHoraire) + " an hour in real terms. Virginia "
   + "takes " + $$(h20.etat) + " of that through its four-bracket schedule, after the standard "
   + "deduction and personal exemption."],

  ["Why is my Virginia paycheck smaller than this calculator says?",
   "The usual reasons: health insurance premiums and other pre-tax benefit deductions come out "
   + "before tax and are not modeled here, a second job pushes your federal withholding up, and "
   + "your employer withholds from the federal W-4 and Virginia Form VA-4 you actually filed "
   + "rather than the standard one-exemption assumption this page uses. If you claimed more than "
   + "one personal exemption on your VA-4 &mdash; for a spouse or dependents &mdash; your real "
   + "withholding will be lower than this calculator's single-filer figure."]
];

const q = s => s.replace(/&(?!amp;|mdash;|ldquo;|rdquo;|quot;|#\d+;)/g, "&amp;").replace(/"/g, "&quot;");
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
<title>Virginia (VA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Virginia (VA) paycheck calculator, 2026. Four brackets from 2% to 5.75%, an $8,750 standard deduction and a $930 exemption &mdash; no local income tax.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/virginia/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Virginia (VA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Virginia taxes income on a four-bracket schedule from 2% to 5.75%, with the same dollar thresholds for single and joint filers &mdash; and no local income tax.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/virginia/">
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
      "name": "Virginia Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/virginia/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Virginia take-home pay after federal income tax, Social Security, Medicare and Virginia income tax on a four-bracket schedule from 2% to 5.75%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Virginia", "item": "https://statelinecalc.com/paycheck-calculator/virginia/" }
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
    <li aria-current="page">Virginia</li>
  </ol>
</nav>

  <h1>Virginia Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Virginia taxes income on a <strong>four-bracket schedule from 2% to 5.75%</strong> in
    2026, after an ${N("$" + c0(DED_SINGLE))} standard deduction and a ${N("$" + EXEMPT)} personal
    exemption. On $75,000 that is ${N($$(a75.etat))} to the state and about ${N($(a75.net))} a
    year in your pocket. The same dollar brackets apply whether you file single or jointly, and
    Virginia has <strong>no local or city income tax</strong>.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Virginia take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="virginia" novalidate>
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
          <span class="help">Sets your federal brackets, and in Virginia it sets your standard
          deduction and personal exemption count &mdash; the tax brackets themselves stay the
          same for every status.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Virginia it
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
    <p>Virginia runs a genuine four-bracket progressive schedule &mdash; 2%, 3%, 5% and 5.75%
    &mdash; but with a twist most other progressive states on this site do not share: the dollar
    thresholds that mark each bracket, ${N("$" + c0(B1))}, ${N("$" + c0(B2))} and
    ${N("$" + c0(B3))}, are exactly the same whether you file single or married filing jointly.
    <a href="/paycheck-calculator/nebraska/">Nebraska</a>, already on this site, doubles its
    thresholds for a married couple; Virginia does not. What changes with filing status instead is
    the standard deduction and the number of personal exemptions you claim.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Virginia income tax</strong>: your gross pay minus the ${N("$" + c0(DED_SINGLE))}
      standard deduction (${N("$" + c0(DED_JOINT))} filing jointly) and a ${N("$" + EXEMPT)}
      personal exemption per person, run through the four-bracket schedule above.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>Virginia Department of Taxation</strong>&rsquo;s
    <em>Income Tax Withholding Guide for Employers</em>, revision <time datetime="2026-05">May
    2026</time>, read directly from tax.virginia.gov on
    <time datetime="2026-09-16">September 16, 2026</time>. Our full sourcing, including the
    line-by-line formula this calculator follows, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>The standard deduction shown here is temporary.</strong> A 2025 law raised
    Virginia's standard deduction from $8,500 to ${N("$" + c0(DED_SINGLE))} for a single filer and
    from $17,000 to ${N("$" + c0(DED_JOINT))} filing jointly, but the increase is written into the
    law with its own sunset: it applies through tax year 2026 and then reverts to
    ${N("$" + c0(DED_2027_SINGLE))} single and ${N("$" + c0(DED_2027_JOINT))} joint &mdash; the
    figures that applied before tax year 2019 &mdash; starting in 2027, unless the General Assembly
    extends it again. This page models 2026 only.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Married
    Filing Separately, handle multiple jobs, or account for health insurance premiums and other
    employer benefit deductions.</p>
  </div>

  <h2>Virginia take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Virginia column runs the four-bracket schedule against your pay above the
  ${N("$" + c0(DED_SINGLE))} deduction and ${N("$" + EXEMPT)} exemption.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Virginia take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">VA state tax</th>
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

    <h2>Virginia hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Virginia</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Virginia&rsquo;s four-bracket schedule, that leaves about
    ${N($(h20.net))} a year, or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what
    an hour of work actually puts in your account &mdash; is ${N($$(h20.netHoraire))}.
    Virginia&rsquo;s share of it is ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Because the top 5.75% bracket starts at
    just ${N("$" + c0(B3))} of taxable income, most full-time hourly workers in Virginia are
    already in the top bracket for the last dollar they earn.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Virginia taxes overtime, tips and shift differentials the same way it taxes the rest of your
    pay, running each extra dollar through whichever of the four brackets your total taxable
    income has reached. The common complaint that &ldquo;overtime is taxed more&rdquo; is a federal
    withholding effect, not a Virginia one.</p>

    <h3>Virginia take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Virginia take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Virginia</h2>

  <h3>The brackets do not widen for a married couple</h3>
  <p>Virginia's four thresholds &mdash; ${N("$" + c0(B1))}, ${N("$" + c0(B2))} and
  ${N("$" + c0(B3))} &mdash; are the same in dollars for a single filer and a couple filing
  jointly. On a ${N($(75000))} salary, a joint filer's Virginia tax is ${N($$(j75.etat))} against
  a single filer's ${N($$(a75.etat))}. That ${N($$(a75.etat - j75.etat))} gap comes entirely from
  the larger standard deduction (${N("$" + c0(DED_JOINT))} versus ${N("$" + c0(DED_SINGLE))}) and
  the extra ${N("$" + EXEMPT)} personal exemption for a spouse, not from any difference in the
  brackets themselves.</p>

  <h3>The top rate arrives early</h3>
  <p>The 5.75% top bracket starts at just ${N("$" + c0(B3))} of taxable income &mdash; well below
  what most full-time Virginia workers earn in a year. On ${N("$25,000")} the state takes ${N($$(a25.etat))},
  an effective rate of ${N(effet(a25).toFixed(2) + "%")}. On ${N("$75,000")} it takes
  ${N($$(a75.etat))}, or ${N(effet(a75).toFixed(2) + "%")}. On ${N("$250,000")} it is
  ${N(effet(a250).toFixed(2) + "%")} &mdash; close to the marginal 5.75%, because so much of a
  higher income falls in the top bracket.</p>

  <h3>The 2026 standard deduction will not repeat in 2027</h3>
  <p>A 2025 law raised the standard deduction to ${N("$" + c0(DED_SINGLE))} single and
  ${N("$" + c0(DED_JOINT))} joint for tax years 2025 and 2026, but wrote its own expiration into
  the statute: absent new legislation, the deduction reverts to ${N("$" + c0(DED_2027_SINGLE))}
  single and ${N("$" + c0(DED_2027_JOINT))} joint &mdash; the pre-2019 figures &mdash; starting in
  2027. A take-home-pay estimate built on this page's 2026 numbers will not carry over unchanged
  to next year's paycheck.</p>

  <h3>Virginia has no local income tax</h3>
  <p>Unlike Ohio's municipal net-profits tax or the county and city taxes several states levy on
  top of a state income tax, nothing on a Virginia pay stub represents a local income tax. The
  Department of Taxation's own 32-page withholding guide for employers, which walks through every
  category of state withholding an employer must apply, never mentions one.</p>

  <h3>Your employer cannot deduct unemployment insurance from your pay</h3>
  <p>Some states take an employee contribution for unemployment coverage;
  <a href="/paycheck-calculator/washington/">Washington</a> is the example on this site, where paid
  family leave and long-term care both come off the stub. Virginia does not: unemployment tax is a
  liability the Virginia Employment Commission assigns to employers, and nothing on its
  employer-responsibilities page mentions a wage deduction. The only state line on a Virginia pay
  stub is income tax withholding.</p>

  <h3>Your 401(k) contribution does reduce your Virginia tax</h3>
  <p>Virginia's income tax starts from your federal adjusted gross income, and an elective deferral
  to a 401(k) or 403(b) is already excluded from that figure. On ${N("$75,000")} with 6% going in,
  your Virginia tax falls by ${N($$(gainVA))} a year. The rule is not universal: a
  <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker making the same contribution
  on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash; nothing at all.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Assuming a married couple gets wider brackets</h3>
  <p>It does not. Unlike the federal schedule, Virginia applies the same ${N("$" + c0(B1))}/
  ${N("$" + c0(B2))}/${N("$" + c0(B3))} thresholds to every filing status. The gap between a single
  and a joint filer's Virginia tax comes only from the larger standard deduction and the second
  personal exemption &mdash; assuming wider brackets on top of that understates a joint filer's
  tax bill.</p>

  <h3>Using next year's standard deduction</h3>
  <p>${N("$" + c0(DED_2027_SINGLE))} single and ${N("$" + c0(DED_2027_JOINT))} joint are the
  pre-2019 figures that Virginia's standard deduction reverts to after tax year 2026, not the 2026
  numbers this calculator uses. Applying them to a 2026 salary overstates a ${N($(75000))} salary's
  Virginia tax bill by taxing income that is still sheltered this year.</p>

  <h3>Expecting a Head of Household bracket</h3>
  <p>Virginia's withholding formula only distinguishes Single and Married on Form VA-4; there is no
  separate Head of Household column. This calculator gives head of household the same standard
  deduction and one personal exemption as a single filer, which is what the state's own form
  assumes absent additional information.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer withholds from the Form VA-4 you actually filed &mdash;
  if you claimed exemptions for a spouse or dependents, your real Virginia withholding will be
  lower than this calculator's one-exemption figure. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Virginia in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N("$16,100")} = ${N($(a75.brut - 16100))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Virginia taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(DED_SINGLE))} standard
    deduction &minus; ${N("$" + EXEMPT)} personal exemption = ${N($(imposable75))}</li>
    <li>Virginia tax: ${N("$" + c0(B1))} &times; 2% + (${N("$" + c0(B2 - B1))} &times; 3%) +
    (${N("$" + c0(B3 - B2))} &times; 5%) + (${N($(imposable75 - B3))} &times; 5.75%) =
    ${N($$(a75.etat))}</li>
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
    + `Virginian on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Virginia borders two states already on this site.
  <a href="/paycheck-calculator/tennessee/">Tennessee</a> has no state income tax at all, which is
  why a Tennessee worker keeps ${N($$(Math.abs(voisins[1].r.net - a75.net)))} more of the same
  salary. <a href="/paycheck-calculator/north-carolina/">North Carolina</a>'s flat 3.99% rate looks
  lower than Virginia's 5.75% top bracket, and a North Carolina worker on this salary does pay less
  to the state, ${N($$(voisins[0].r.etat))} against Virginia's ${N($$(a75.etat))} &mdash; the flat
  rate applies to every dollar, but it never climbs as high as Virginia's marginal top rate does.</p>

${blocSources("virginia")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/north-carolina/">North Carolina paycheck calculator</a>
    &mdash; a bordering state with a single flat rate instead of Virginia's four brackets.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Virginia", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-16">September 16, 2026</time> &middot;
    Last updated <time datetime="2026-09-16">September 16, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Virginia rates.
  </p>

</div>
${colonne("Virginia")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "virginia");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre le moteur. */
const bareme = B1 * T1 + (B2 - B1) * T2 + (B3 - B2) * T3 + (imposable75 - B3) * T4;
if (Math.abs(bareme - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition du bareme du cas 75 000 $ ne retombe pas sur le moteur (%s vs %s)",
    bareme.toFixed(2), a75.etat.toFixed(2));
  process.exit(2);
}
if (Math.abs(h75.etat - a75.etat) > 0.005) {
  console.error("ARRET : head of household devrait avoir le meme impot d'Etat que single en Virginie");
  process.exit(2);
}
if (j75.etat >= a75.etat) {
  console.error("ARRET : un couple devrait payer moins qu'un celibataire sur le meme salaire");
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupement bareme 75 000 $ : OK (%s)", bareme.toFixed(2));
