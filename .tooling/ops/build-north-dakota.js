/* Construit /paycheck-calculator/north-dakota/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * North Dakota est le 21e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN BAREME A TROIS TRANCHES DONT LA PREMIERE EST A 0%, et le zero-
 *      bracket lui-meme sert de deduction : pas de standardDeduction ni de
 *      personalExemption distincts a soustraire, contrairement a la Virginie
 *      ou au Nebraska.
 *   2. LE FAIT LE PLUS CITABLE DE LA PAGE : le seuil du couple qui declare
 *      conjointement (57 500 $) N'EST PAS LE DOUBLE de celui du celibataire
 *      (57 625 $) — il est meme legerement PLUS BAS. C'est l'inverse du
 *      schema qu'on voit partout ailleurs sur ce site (Nebraska double ses
 *      seuils, le federal aussi). La formule de RETENUE du Dakota du Nord
 *      calibre chaque tranche pour un seul bulletin de paie, quel que soit le
 *      statut, plutot que de deviner le revenu du foyer entier.
 *   3. LE TAUX EFFECTIF EST MINUSCULE. A 75 000 $, un chef de famille ne doit
 *      RIEN a l'Etat (sous le seuil de 78 475 $) ; un celibataire ou un
 *      couple doit moins de 350 $ pour l'annee entiere.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * North Dakota Office of State Tax Commissioner, "Income Tax Withholding
 * Rates & Instructions, for wages paid in 2026", lu en direct le 17/09/2026
 * (HTTP 200, aucun obstacle reseau). Detail complet, chaque citation
 * verbatim : data/rates-2026.js, bloc "north-dakota".
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur Married Filing Separately, non propose par le calculateur ;
 *   - rien sur un impot de comte ou de ville DISTINCT de l'impot sur le
 *     revenu (taxe fonciere, etc.) : hors du champ d'un calculateur de paie ;
 *   - le bareme STATUTAIRE de declaration annuelle (different de la formule
 *     de RETENUE que cette page modelise) n'est pas reproduit ici : voir le
 *     commentaire dans data/rates-2026.js pour la distinction complete.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-north-dakota.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "north-dakota";

/* --- les valeurs de droit citees dans la prose --------------------------- */
const T_SINGLE_LO = 57625, T_SINGLE_HI = 258450;
const T_JOINT_LO = 57500, T_JOINT_HI = 168525;
const T_HOH_LO = 78475, T_HOH_HI = 289675;
const RATE_MID = 0.0195, RATE_TOP = 0.025;
const UI_WAGE_BASE = 46600;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const effet = r => r.etat / r.brut * 100;

/* Le seuil ou North Dakota prend son premier cent, cherche par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 100000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* Le gain d'un versement 401(k) : North Dakota part du revenu brut ajuste
   federal, qui exclut deja un versement elective. */
const PCT_401K = 0.06;
const gainND = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;

/* Voisin direct du Dakota du Nord deja publie : le Montana. (Le Minnesota et
   le Dakota du Sud, les deux autres voisins, ne sont pas encore publies.) */
const voisins = ["montana"].map(k => ({ cle: k, r: calcul(k, 75000) }));
const NOMS = { montana: "Montana" };
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
  ["What is the North Dakota income tax rate in 2026?",
   "A three-bracket withholding schedule: 0% on the first part of your income, 1.95% on the " +
   "next portion, and 2.5% on anything above that. Where each band starts depends on your " +
   "filing status &mdash; $" + c0(T_SINGLE_LO) + " for a single filer, $" + c0(T_JOINT_LO) +
   " married filing jointly, $" + c0(T_HOH_LO) + " head of household &mdash; from the state " +
   "Tax Commissioner's 2026 withholding tables."],

  ["Why is North Dakota's married-filing-jointly threshold lower than the single threshold?",
   "Because North Dakota's withholding formula is built for a single paycheck, not a household. " +
   "Most states that split by filing status set the married threshold at roughly double the " +
   "single one &mdash; Nebraska and the federal brackets both do &mdash; on the assumption that " +
   "a joint return combines two incomes. North Dakota's 2026 withholding tables do the opposite: the joint " +
   "threshold ($" + c0(T_JOINT_LO) + ") is actually a little lower than the single threshold ($" +
   c0(T_SINGLE_LO) + "), because each table is calibrated to one employee's wages regardless of " +
   "marital status, not to a combined household income the employer cannot see."],

  ["What is take-home pay on a $75,000 salary in North Dakota?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with " +
   "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, $" +
   c0(a75.ss + a75.med) + " of Social Security and Medicare and just " + $$(a75.etat) + " of North " +
   "Dakota income tax &mdash; an effective state rate of " + effet(a75).toFixed(2) + "%, among the " +
   "lowest of any state on this site with an income tax at all."],

  ["Does a head of household filer owe North Dakota income tax on $75,000?",
   "No. The head of household zero-bracket runs all the way to $" + c0(T_HOH_LO) + ", so a head of " +
   "household filer earning $75,000 owes $0 in North Dakota income tax &mdash; only the federal " +
   "government and FICA take a share. A single filer on the same salary owes " + $$(a75.etat) +
   ", because the single zero-bracket stops at $" + c0(T_SINGLE_LO) + "."],

  ["Does North Dakota have local or city income tax?",
   "No. The state Tax Commissioner's own page on local taxes lists exactly what cities and " +
   "counties may levy &mdash; sales and use taxes, plus lodging, restaurant and motor vehicle " +
   "rental taxes &mdash; and income tax is not among them. Nothing comes out of a North Dakota " +
   "paycheck beyond the state income tax this calculator already models."],

  ["At what salary does North Dakota start taking income tax?",
   $(seuilImposition) + " for a single filer &mdash; the point where the 0% bracket ends and the " +
   "1.95% band begins. Federal tax and FICA still apply well below that line."],

  ["Do North Dakota employees pay for unemployment insurance?",
   "No. North Dakota's 2026 unemployment insurance tax schedule, published by Job Service North " +
   "Dakota, sets a $" + c0(UI_WAGE_BASE) + " taxable wage base and a range of employer rates " +
   "&mdash; nowhere does it mention an employee rate. Like 19 of the other 20 states already on " +
   "this site (Alaska is the lone exception), unemployment insurance is entirely an employer " +
   "cost in North Dakota and never appears as a line on a worker's pay stub."],

  ["Does a 401(k) contribution lower my North Dakota tax?",
   "Yes, modestly. North Dakota's withholding formula starts from your wages after a 401(k) " +
   "elective deferral is already excluded. On $75,000 with 6% going into a 401(k), your North " +
   "Dakota tax falls by " + $$(gainND) + " a year &mdash; a small number next to the federal and " +
   "FICA savings, because North Dakota's own rates are so low to begin with."],

  ["What is $20 an hour after taxes in North Dakota?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross, which is under the $" +
   c0(T_SINGLE_LO) + " single zero-bracket &mdash; so North Dakota takes $0 in state income tax. " +
   "After federal tax and FICA only, take-home pay is about " + $(h20.net) + " a year, a real " +
   "hourly rate of " + $$(h20.netHoraire) + "."],

  ["Why is my North Dakota paycheck smaller than this calculator says?",
   "The usual reasons: health insurance premiums and other pre-tax benefit deductions come out " +
   "before tax and are not modeled here, and a second job pushes your federal withholding up. " +
   "North Dakota's own state tax is small enough at most incomes that these federal-side factors " +
   "explain almost all of any gap you see."]
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
<title>North Dakota (ND) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free North Dakota (ND) paycheck calculator, 2026. Three brackets from 0% to 2.5%, no local income tax, and one of the lowest state tax bills in the country.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/north-dakota/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="North Dakota (ND) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="North Dakota taxes income on a three-bracket schedule from 0% to 2.5%, with no local income tax anywhere in the state.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/north-dakota/">
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
      "name": "North Dakota Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/north-dakota/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 North Dakota take-home pay after federal income tax, Social Security, Medicare and North Dakota income tax on a three-bracket schedule from 0% to 2.5%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "North Dakota", "item": "https://statelinecalc.com/paycheck-calculator/north-dakota/" }
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
    <li aria-current="page">North Dakota</li>
  </ol>
</nav>

  <h1>North Dakota Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>North Dakota taxes income on a <strong>three-bracket schedule from 0% to 2.5%</strong> in
    2026 &mdash; among the lowest state tax bills in the country. On $75,000 that is just
    ${N($$(a75.etat))} to the state and about ${N($(a75.net))} a year in your pocket. A head of
    household filer on the same salary owes ${N("$0")}. North Dakota also has
    <strong>no local or city income tax</strong>.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your North Dakota take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="north-dakota" novalidate>
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
          <span class="help">Sets your federal brackets, and in North Dakota it sets which
          zero-bracket threshold applies &mdash; the head of household threshold is the widest of
          the three.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in North Dakota
          it lowers your state tax too.</span>
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
    <p>North Dakota runs a genuine three-bracket schedule &mdash; 0%, 1.95% and 2.5% &mdash; but
    where each bracket starts depends on filing status in a way that runs opposite to most other
    states on this site. The zero-bracket for a single filer stops at ${N("$" + c0(T_SINGLE_LO))};
    for a married couple filing jointly it stops at ${N("$" + c0(T_JOINT_LO))} &mdash; slightly
    LOWER, not double the way <a href="/paycheck-calculator/nebraska/">Nebraska</a> and the federal
    schedule both do it. The head of household threshold, ${N("$" + c0(T_HOH_LO))}, is the widest of
    the three. That is because North Dakota's withholding tables are built around a single
    paycheck, not a combined household income an employer cannot see.</p>

    <p>The calculator applies three deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>North Dakota income tax</strong>: your gross pay run directly through the
      three-bracket withholding schedule for your filing status &mdash; there is no separate
      standard deduction or personal exemption to subtract first, because the 0% bracket already
      does that job.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>North Dakota Office of State Tax Commissioner</strong>'s
    <em>Income Tax Withholding Rates &amp; Instructions, for wages paid in 2026</em>, read directly
    from tax.nd.gov on <time datetime="2026-09-17">September 17, 2026</time>. Our full sourcing,
    including the line-by-line formula this calculator follows, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>This page models withholding, not the annual return.</strong> The figures above come
    from North Dakota's 2026 payroll withholding tables &mdash; what actually comes out of a
    paycheck, which is what a paycheck calculator estimates. The state's separate annual filing
    brackets, used to compute the tax owed on a full-year return, use different (and more evenly
    scaled) thresholds; they are a different number for a different purpose, and this page does not
    model them.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Married
    Filing Separately, handle multiple jobs, or account for health insurance premiums and other
    employer benefit deductions.</p>
  </div>

  <h2>North Dakota take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  North Dakota column runs the three-bracket withholding schedule directly against your gross pay.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 North Dakota take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">ND state tax</th>
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

    <h2>North Dakota hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in North Dakota</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross &mdash; under the
    ${N("$" + c0(T_SINGLE_LO))} single zero-bracket, so North Dakota takes ${N("$0")} in state
    income tax. After federal tax and FICA only, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Because the single zero-bracket runs all
    the way to ${N("$" + c0(T_SINGLE_LO))}, a full-time worker at $25 or $30 an hour still pays only
    the 1.95% band, never the top 2.5% rate.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>North Dakota taxes overtime, tips and shift differentials the same way it taxes the rest of
    your pay, running each extra dollar through whichever of the three brackets your total taxable
    income has reached. The common complaint that &ldquo;overtime is taxed more&rdquo; is a federal
    withholding effect, not a North Dakota one.</p>

    <h3>North Dakota take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 North Dakota take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in North Dakota</h2>

  <h3>The married threshold is lower than the single threshold</h3>
  <p>Most progressive states widen their brackets for a married couple filing jointly.
  <a href="/paycheck-calculator/nebraska/">Nebraska</a>, already on this site, doubles its
  thresholds at marriage; the federal schedule does the same. North Dakota's 2026 withholding
  tables do the opposite: the joint zero-bracket (${N("$" + c0(T_JOINT_LO))}) is slightly lower
  than the single zero-bracket (${N("$" + c0(T_SINGLE_LO))}). On a ${N($(75000))} salary, a joint
  filer's North Dakota tax is ${N($$(j75.etat))} against a single filer's ${N($$(a75.etat))}
  &mdash; the joint filer actually pays a few dollars MORE, not less, because their bracket kicks
  in ${N($$(T_SINGLE_LO - T_JOINT_LO))} sooner.</p>

  <h3>Head of household filers get the widest bracket by far</h3>
  <p>The head of household zero-bracket runs to ${N("$" + c0(T_HOH_LO))}, well above both the
  single and joint thresholds. A head of household filer earning ${N($(75000))} owes
  ${N($$(h75.etat))} in North Dakota income tax, because the whole salary sits
  inside the zero-bracket.</p>

  <h3>The state tax bill stays small at almost every income</h3>
  <p>On ${N("$25,000")} North Dakota takes ${N($$(a25.etat))}, an effective rate of
  ${N(effet(a25).toFixed(2) + "%")}. On ${N("$75,000")} it takes ${N($$(a75.etat))}, or
  ${N(effet(a75).toFixed(2) + "%")}. Even on ${N("$250,000")} the effective rate is only
  ${N(effet(a250).toFixed(2) + "%")} &mdash; the 2.5% top rate only touches income above
  ${N("$" + c0(T_SINGLE_HI))} for a single filer, and most of a typical salary still falls in the
  0% or 1.95% bands.</p>

  <h3>North Dakota has no local income tax</h3>
  <p>Unlike Ohio's municipal net-profits tax or the county and city taxes several states levy on
  top of a state income tax, nothing on a North Dakota pay stub represents a local income tax. The
  Tax Commissioner's own page on local taxes lists exactly what cities and counties may levy
  &mdash; sales, use, lodging, restaurant and motor vehicle rental taxes &mdash; and income tax is
  not among them.</p>

  <h3>Your employer, not you, pays for unemployment insurance</h3>
  <p>Job Service North Dakota's 2026 tax rate schedule sets a ${N("$" + c0(UI_WAGE_BASE))} taxable
  wage base and a range of employer rates by industry and experience &mdash; and nowhere mentions
  an employee rate. Some states do take an employee contribution for unemployment coverage;
  <a href="/paycheck-calculator/alaska/">Alaska</a> is the example on this site. North Dakota does
  not: the tax is entirely an employer cost, and nothing related to it appears on a worker's pay
  stub.</p>

  <h3>Your 401(k) contribution reduces your North Dakota tax, but only a little</h3>
  <p>North Dakota's withholding formula starts from your wages after a 401(k) elective deferral is
  already excluded. On ${N("$75,000")} with 6% going in, your North Dakota tax falls by
  ${N($$(gainND))} a year &mdash; a real but small number, because North Dakota's own rates are so
  low that even a full exclusion doesn't add up to much.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Assuming marriage widens the North Dakota bracket</h3>
  <p>It does not &mdash; it narrows it slightly. The joint zero-bracket (${N("$" + c0(T_JOINT_LO))})
  starts ${N($$(T_SINGLE_LO - T_JOINT_LO))} lower than the single zero-bracket (${N("$" + c0(T_SINGLE_LO))}),
  the opposite of what the federal schedule and most other states on this site do. Assuming the
  usual doubling pattern applies here understates a joint filer's North Dakota tax.</p>

  <h3>Confusing the withholding formula with the annual filing brackets</h3>
  <p>This calculator models what actually comes out of a paycheck &mdash; North Dakota's 2026
  payroll withholding tables. The state's separate annual return brackets, used when you file, use
  different thresholds scaled more evenly by filing status. The two numbers answer different
  questions; using one where the other applies produces a wrong estimate either way.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, and a second job changes the federal
  withholding picture. Because North Dakota's own tax is so small at most incomes, these
  federal-side factors explain almost all of any gap you see. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in North Dakota in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N("$16,100")} = ${N($(a75.brut - 16100))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>North Dakota taxable wages: ${N($(a75.brut))} (no separate deduction to subtract first)</li>
    <li>North Dakota tax: ${N("$" + c0(T_SINGLE_LO))} &times; 0% + (${N($(a75.brut - T_SINGLE_LO))}
    &times; 1.95%) = ${N($$(a75.etat))}</li>
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
    + `North Dakota worker on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>North Dakota borders three states; only <a href="/paycheck-calculator/montana/">Montana</a> is
  published on this site so far. Montana's 5.65% top rate is far higher than North Dakota's 2.5%,
  and it shows: a Montana worker on ${N($(75000))} pays ${N($$(voisins[0].r.etat))} in state tax
  against a North Dakota worker's ${N($$(a75.etat))} &mdash; more than eight times as much.</p>

${blocSources("north-dakota")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/montana/">Montana paycheck calculator</a>
    &mdash; a bordering state with a much higher top rate.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("North Dakota", { avecListe: false })}

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
    North Dakota rates.
  </p>

</div>
${colonne("North Dakota")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "north-dakota");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre le moteur. */
const bareme75 = (T_SINGLE_LO * 0) + (75000 - T_SINGLE_LO) * RATE_MID;
if (Math.abs(bareme75 - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition du bareme du cas 75 000 $ (single) ne retombe pas sur le moteur (%s vs %s)",
    bareme75.toFixed(2), a75.etat.toFixed(2));
  process.exit(2);
}
if (h75.etat !== 0) {
  console.error("ARRET : un chef de famille a 75 000 $ devrait devoir 0 $ d'impot d'Etat (sous le seuil de %d)", T_HOH_LO);
  process.exit(2);
}
if (j75.etat <= a75.etat) {
  console.error("ARRET : le celibataire devrait payer MOINS que le couple a 75 000 $ (seuil marie plus bas) — verification du fait distinctif de la page");
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupement bareme 75 000 $ (single) : OK (%s)", bareme75.toFixed(2));
console.log("recoupement fait distinctif (HoH=0, joint>single a 75k) : OK");
