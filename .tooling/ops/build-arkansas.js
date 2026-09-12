/* Construit /paycheck-calculator/arkansas/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * L'Arkansas est le 17e Etat publie. Ce qu'il a de propre, et qu'aucune des
 * 16 autres pages ne peut dire :
 *
 *   1. LE BAREME NE DOUBLE PAS POUR UNE DECLARATION COMMUNE. Chaque autre Etat
 *      progressif de ce site (Wisconsin, Nebraska, Caroline du Nord) elargit
 *      ses tranches pour un couple. L'AR1000ES calcule le principal et le
 *      conjoint sur deux colonnes separees, chacune sur LA MEME table de
 *      segments qu'un celibataire. C'est confirme par une seconde source
 *      (LegalClarity). Seule la deduction standard et le credit doublent.
 *   2. LE BAREME EST UNE TABLE DE SEGMENTS, PAS DES TRANCHES CONTINUES, et
 *      cache un « pont » de 31 lignes entre 94 701 $ et 97 800,99 $ ou le taux
 *      marginal grimpe a environ 14 % avant de redescendre a 3,9 % - une
 *      recapture qui laisse l'impot 329 $ plus haut a 100 000 $ et au-dela
 *      qu'un calcul par tranches ordinaires ne le donnerait. Verifie le
 *      12/09/2026 : voir data/rates-2026.js pour le detail des 44 segments.
 *   3. LA DEDUCTION STANDARD EST TRES BASSE (2 470 $, contre 8 850 $ au
 *      Nebraska ou 13 960 $ au Wisconsin), mais le taux plafond (3,9 %) est
 *      aussi le plus bas des Etats progressifs de ce site.
 *
 * ── LA VERIFICATION QUI DONNE CONFIANCE DANS LE MOTEUR ──────────────────────
 * Les paliers de base imprimes par l'AR1000ES se recoupent en chaine : 608 $
 * (a 26 400 $) + 3,9 % x 10 000 $ = 998 $ ... jusqu'a 2 308 $ (a 70 000 $),
 * chaque pas de 390 $ verifiable a la main. Le pont (94 701-97 800,99 $) est
 * verifie separement : sa premiere ligne (3 296 $) et sa derniere (3 713 $)
 * sont recherchees dans la table publiee elle-meme dans test-engine.js,
 * independamment de impotTable().
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur le statut Married Filing Separately : notre calculateur ne le
 *     propose pas ;
 *   - rien sur les personnes a charge (29 $ chacune) ni sur l'age 65+, aveugle
 *     ou sourd (29 $ chacun) : le calculateur ne les demande pas ;
 *   - rien sur un transfert de deduction inutilisee entre conjoints : aucune
 *     source lue ne le precise pour ce formulaire d'estimation.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js. AR1000ES 2026 (PDF, 1 833 297
 * octets, HTTP 200), Arkansas Division of Workforce Services FAQ (HTTP 200),
 * Arkansas Code 26-73-103 via FindLaw (HTTP 200 en navigateur reel, 403 a
 * curl - un blocage de robot, pas une page morte), tous lus le 12/09/2026.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-arkansas.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "arkansas";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* 2026 AR1000ES, Tax Rate Schedule et sa "TAX RATE SCHEDULE (94,701.00 -
   97,800.99)". Voir data/rates-2026.js pour la table complete. */
const DED_SINGLE = 2470, DED_JOINT = 4940;
const CREDIT_SINGLE = 29, CREDIT_JOINT = 58;
const BRIDGE_LO = 94701, BRIDGE_HI = 97800.99;
const BRIDGE_FIRST = 3296, BRIDGE_LAST = 3713;
const GAP_AT_100K = 329; // ecart mesure le 12/09/2026 entre le pont et une chaine continue

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const imposable75 = Math.max(0, 75000 - DED_SINGLE);

/* Le seuil ou l'Arkansas prend son premier cent, trouve par le moteur. */
const seuilImposition = (() => {
  let bas = 0, haut = 50000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* Le 401(k) : l'Arkansas part du revenu apres versement pretax, donc il suit. */
const PCT_401K = 0.06;
const gainAR = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;

/* Une chaine de tranches marginales continues, SANS le pont, pour montrer
   l'ecart que ce calculateur evite en le reproduisant fidelement. */
function impotContinu(imposable) {
  const bands = [[5599.99, 0], [11199.99, 0.02], [15999.99, 0.03],
                 [26399.99, 0.034], [Infinity, 0.039]];
  let du = 0, bas = 0;
  for (const [plafond, taux] of bands) {
    if (imposable > bas) du += (Math.min(imposable, plafond) - bas) * taux;
    bas = plafond;
    if (imposable <= plafond) break;
  }
  return du;
}
/* L'ecart se mesure sur un revenu IMPOSABLE de 100 000 $ (apres deduction),
   pas sur un salaire brut de 100 000 $ - a75/a100 deduisent d'abord 2 470 $,
   ce qui change ce qui tombe ou non dans le pont. */
const R = require("../../data/rates-2026.js");
const { impotTable } = require("../lib/paie.js");
const impotOfficielAt100k = impotTable(R.states.arkansas.incomeTax.bracketTable.single, 100000);
const continuAt100k = impotContinu(100000);
const ecartReel100k = impotOfficielAt100k - continuAt100k;

const voisins = ["texas", "tennessee", "nebraska", "wisconsin"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { texas: "Texas", tennessee: "Tennessee", nebraska: "Nebraska", wisconsin: "Wisconsin" };

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
  ["What is the Arkansas income tax rate in 2026?",
   "Five brackets from 0% to 3.9%: 0% on the first $5,600 of taxable income, 2.0% to $11,200, "
   + "3.0% to $16,000, 3.4% to $26,400, and 3.9% above that. A separate bridge table between "
   + "$94,701 and $97,800.99 raises the effective rate to roughly 14% across that narrow band "
   + "before it settles back to 3.9%. The 2026 AR1000ES Tax Rate Schedule is where all of this "
   + "is published."],

  ["Does the Arkansas tax rate depend on filing status?",
   "No, and that is unusual - most states widen their brackets for a joint return. Arkansas "
   + "computes each spouse's tax on the exact same schedule a single filer uses, whether the "
   + "return is filed jointly or not. What does change with filing status is the standard "
   + "deduction ($" + DED_SINGLE + " single or head of household, $" + DED_JOINT
   + " filing jointly) and the tax credit ($" + CREDIT_SINGLE + " single, $" + CREDIT_JOINT
   + " joint or head of household)."],

  ["Does Arkansas have a standard deduction?",
   "Yes, a flat $" + DED_SINGLE + " per taxpayer - $" + DED_JOINT + " on a joint return, since "
   + "the AR1000ES worksheet counts two taxpayers. It does not change with income, unlike the "
   + "sliding deductions used in <a href=\"/paycheck-calculator/wisconsin/\">Wisconsin</a>."],

  ["What is take-home pay on a $75,000 salary in Arkansas?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of "
   + "Arkansas income tax - an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["Why does Arkansas tax jump around $95,000 to $98,000?",
   "A bridge table. Between $" + c0(BRIDGE_LO) + " and $" + BRIDGE_HI.toLocaleString("en-US")
   + " of taxable income, the AR1000ES prints 31 separate rows, $100 apart, where tax rises "
   + "about $14 per $100 of income - a marginal rate near 14%, far above the 3.9% top bracket. "
   + "It runs from $" + BRIDGE_FIRST + " of tax at the low end to $" + BRIDGE_LAST
   + " at the high end, then the ordinary 3.9% rate resumes. The effect does not fade afterward: "
   + "recomputing Arkansas tax as one continuous set of brackets, without this bridge, "
   + "understates the tax by $" + GAP_AT_100K + " at $100,000 of taxable income and every dollar "
   + "above it. This calculator reproduces the bridge table exactly rather than approximating it."],

  ["Does Arkansas have a personal tax credit?",
   "Yes - and it is a credit, subtracted from the tax bill, not a deduction subtracted from "
   + "income. The AR1000ES lists $" + CREDIT_SINGLE + " for a single filer and $" + CREDIT_JOINT
   + " filing jointly or as head of household, with another $29 for each dependent, which this "
   + "calculator does not ask about. Unlike some states, this credit does not shrink as income "
   + "rises."],

  ["Do Arkansas employees pay for unemployment insurance?",
   "No. The Arkansas Division of Workforce Services says so directly: “No, deductions are "
   + "not made from your paycheck.” Employers pay a quarterly payroll tax instead, on the "
   + "first $7,000 of each employee's wages. There is no state disability or paid family leave "
   + "deduction either, so Arkansas income tax is the only state-level line on an Arkansas pay "
   + "stub."],

  ["Does Arkansas have city or county income tax?",
   "No. Arkansas Code Section 26-73-103 is explicit: \"A county, municipality, or other local "
   + "government shall not levy a tax on income.\" Cities and counties can levy sales and "
   + "property taxes, but never a tax on wages or earnings."],

  ["Does a 401(k) contribution lower my Arkansas tax?",
   "Yes. Arkansas taxes pay after pre-tax retirement contributions come out, the same base the "
   + "IRS uses, so a 401(k) deferral lowers both your federal and your Arkansas tax. On $75,000 "
   + "with 6% going into a 401(k), Arkansas tax falls by " + $$(gainAR) + " a year."],

  ["What is $20 an hour after taxes in Arkansas?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Arkansas "
   + "takes " + $$(h20.etat) + " of that in state income tax."],

  ["Why is my Arkansas paycheck smaller than this calculator says?",
   "The usual reasons - health insurance premiums and other pre-tax deductions come out before "
   + "tax and are not modeled here, and your employer withholds using its own AR4EC exemption "
   + "certificate on file, not your actual year-end tax liability. Read "
   + "<a href=\"/disclaimer/\">why your pay stub will differ</a> for the rest."]
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
<script src="/assets/analytics.js"></script>
<title>Arkansas (AR) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Arkansas (AR) paycheck calculator, 2026. Rates from 0% to 3.9%, the same schedule for every filing status, and the $94,701&ndash;$97,800 bridge table most calculators miss.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/arkansas/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Arkansas (AR) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Arkansas taxes single and joint filers on the exact same schedule &mdash; and hides a 14% bridge table between $94,701 and $97,800 that most calculators miss entirely.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/arkansas/">
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
      "name": "Arkansas Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/arkansas/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Arkansas take-home pay after federal income tax, Social Security, Medicare and Arkansas income tax at 0 to 3.9 percent, including the $94,701 to $97,800 bridge table."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Arkansas", "item": "https://statelinecalc.com/paycheck-calculator/arkansas/" }
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
    <li aria-current="page">Arkansas</li>
  </ol>
</nav>

  <h1>Arkansas Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Arkansas taxes income at rates from <strong>0% to 3.9%</strong> in 2026, using the
    <strong>same schedule for every filing status</strong> &mdash; unlike most states, it does not
    widen its brackets for a joint return. On $75,000 that is ${N($$(a75.etat))} to the state and
    about ${N($(a75.net))} a year in your pocket. A hidden bridge table between
    ${N("$94,701")} and ${N("$97,800")} raises the effective rate to roughly 14% for that narrow
    slice of income, which this calculator reproduces exactly.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Arkansas take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="arkansas" novalidate>
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
          <span class="help">Sets your federal brackets. In Arkansas it does not change the state
          rate schedule itself, only your standard deduction (${N("$" + DED_SINGLE)} or
          ${N("$" + DED_JOINT)}) and tax credit (${N("$" + CREDIT_SINGLE)} or
          ${N("$" + CREDIT_JOINT)}).</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Arkansas it
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
    <p>Arkansas is a five-bracket state on paper, but the detail worth knowing before you trust
    any number about it is that the 2026 AR1000ES prints its rate schedule as a series of
    <strong>segments with their own base tax amount</strong>, not a simple set of continuous
    percentages. Most segments chain together cleanly &mdash; each one picks up where the last
    left off &mdash; but one does not: between $94,701 and $97,800.99 of taxable income, a second
    table adds roughly $14 of tax for every $100 of income, a marginal rate near 14% hidden inside
    what looks, everywhere else, like a flat 3.9% bracket. Treating the whole schedule as one
    continuous set of brackets - which is how most calculators are built - misses that bridge
    entirely, and the resulting error does not go away once you are past it: it understates tax by
    $${GAP_AT_100K} at $100,000 of taxable income and at every income above that.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Arkansas income tax</strong>: pay after any 401(k) deferral, minus a flat
      ${N("$" + DED_SINGLE)} standard deduction (${N("$" + DED_JOINT)} filing jointly), run through
      the AR1000ES rate schedule, minus a ${N("$" + CREDIT_SINGLE)} tax credit
      (${N("$" + CREDIT_JOINT)} filing jointly or head of household).</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, the <strong>Arkansas Department of Finance and Administration</strong>&rsquo;s
    <em>2026 AR1000ES Estimated Tax Declaration Vouchers and Instructions</em>, which prints the
    &ldquo;TAX RATE SCHEDULE&rdquo;, the bridge table, the standard deduction and the tax credit all
    in one document, read on <time datetime="2026-09-12">September 12, 2026</time>. Our full
    sourcing, including why a third-party legal database rather than the state legislature&rsquo;s
    own site is cited for the local-tax statute, is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>One check worth stating, because it is what makes these figures trustworthy:</strong>
    the base tax amounts the AR1000ES prints for most segments chain together exactly &mdash;
    $608 (at $26,400) plus 3.9% of $10,000 more is $998, landing on the next segment&rsquo;s
    published base one step later, all the way to $2,308 at $70,000. The one place this document
    does <em>not</em> chain smoothly is the $94,701&ndash;$97,800.99 bridge, and we did not smooth
    it out: this calculator reproduces all 31 of its rows exactly rather than approximating a
    curve through them.</p>

    <p>What the calculator deliberately does not do: it does not model the Married Filing
    Separately status, count dependents ($29 each, per the AR1000ES), add the extra $29 credit for
    filers 65 or older, blind or deaf, or account for health insurance premiums and other employer
    benefit deductions.</p>
  </div>

  <h2>Arkansas take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Arkansas column includes the $94,701&ndash;$97,800.99 bridge table where it applies.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Arkansas take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">AR state tax</th>
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

    <h2>Arkansas hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Arkansas</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Arkansas&rsquo;s income tax, that leaves about ${N($(h20.net))} a year,
    or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Arkansas&rsquo;s share of it is
    ${N($$(h20.etat))} for the year, well below the $94,701 bridge table.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Arkansas taxes overtime, tips and shift differentials the same as the rest of your pay,
    through the same rate schedule. Extra hours raise your annual income, which can push part of
    your pay into a higher bracket &mdash; and for a narrow slice of high earners, into the
    $94,701&ndash;$97,800.99 bridge table.</p>

    <h3>Arkansas take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Arkansas take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Arkansas</h2>

  <h3>One schedule, every filing status</h3>
  <p>This is the fact that separates Arkansas from every progressive-tax state on this site.
  Wisconsin, Nebraska and North Carolina all widen their brackets for a joint return. Arkansas
  does not: the AR1000ES computes tax on the primary filer&rsquo;s income and the spouse&rsquo;s
  income separately, each against the exact same schedule a single filer uses. Filing jointly
  changes your standard deduction (${N("$" + DED_JOINT)} instead of ${N("$" + DED_SINGLE)}) and
  your tax credit (${N("$" + CREDIT_JOINT)} instead of ${N("$" + CREDIT_SINGLE)}), not the rates
  themselves.</p>

  <h3>A hidden bridge between $94,701 and $97,800.99</h3>
  <p>Below ${N("$" + c0(BRIDGE_LO))}, Arkansas taxes every dollar at a flat 3.9% above the third
  bracket. Above ${N("$" + BRIDGE_HI.toLocaleString("en-US"))}, it does the same. In between, a
  31-row table published separately in the AR1000ES adds about $14 of tax for every $100 of
  income &mdash; a marginal rate near 14%, printed nowhere in the ordinary rate schedule. It runs
  from ${N("$" + BRIDGE_FIRST)} of tax at the low end of the bridge to ${N("$" + BRIDGE_LAST)} at
  the high end. Recomputing Arkansas tax with ordinary continuous brackets, ignoring this table,
  understates the bill by ${N("$" + GAP_AT_100K)} at $100,000 of taxable income &mdash; and that
  gap does not shrink at higher incomes, because the schedule never returns to where a continuous
  calculation would put it.</p>

  <h3>The standard deduction is flat, and modest</h3>
  <p>Arkansas&rsquo;s ${N("$" + DED_SINGLE)} standard deduction does not slide or step with
  income the way <a href="/paycheck-calculator/wisconsin/">Wisconsin&rsquo;s</a> does &mdash; it
  is the same dollar amount whether you earn $20,000 or $200,000. It is also considerably smaller
  than <a href="/paycheck-calculator/nebraska/">Nebraska&rsquo;s</a> $8,850, though Arkansas&rsquo;s
  top rate of 3.9% is lower than Nebraska&rsquo;s 4.55%.</p>

  <h3>A small credit rides on top of the deduction</h3>
  <p>After the deduction and the rate schedule, Arkansas subtracts a flat tax credit &mdash;
  ${N("$" + CREDIT_SINGLE)} for a single filer, ${N("$" + CREDIT_JOINT)} filing jointly or as head
  of household &mdash; that does not fade as income rises, unlike some states&rsquo; phased-out
  credits. It is small next to the deduction, but every filer gets it.</p>

  <h3>No state takes anything until $${c0(seuilImposition)}</h3>
  <p>Arkansas&rsquo;s zero-percent bracket plus its ${N("$" + DED_SINGLE)} standard deduction and
  ${N("$" + CREDIT_SINGLE)} credit mean a single filer owes no Arkansas income tax at all up to
  about ${N("$" + c0(seuilImposition))}. Below that, federal tax and FICA still apply.</p>

  <h3>Your 401(k) contribution does reduce your Arkansas tax</h3>
  <p>Arkansas taxes income after pre-tax retirement contributions come out, the same base the IRS
  uses for federal tax. On ${N("$75,000")} with 6% going into a 401(k), Arkansas tax falls by
  ${N($$(gainAR))} a year.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Assuming Arkansas brackets double for a joint return</h3>
  <p>They do not. Every other progressive-tax state on this site widens its brackets when you
  file jointly. Arkansas does not &mdash; the schedule is identical, and only the standard
  deduction and tax credit change. Applying a doubled-bracket assumption to Arkansas, as you would
  for Wisconsin or Nebraska, understates a joint filer&rsquo;s tax.</p>

  <h3>Recomputing the rate schedule as one continuous curve</h3>
  <p>Doing that misses the $94,701&ndash;$97,800.99 bridge table entirely, and the resulting
  error, about $${GAP_AT_100K} understated at $100,000 and above, does not fade back out at higher
  incomes. The published schedule has to be read segment by segment, not smoothed into a formula.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Your employer withholds using the exemptions and
  dependents you claimed on Form AR4EC, using withholding tables that are a separate, rounded
  approximation of the tax you actually owe. Health premiums and other benefit deductions come out
  first, and a second job changes the federal picture. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Arkansas in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Standard deduction: ${N("$" + DED_SINGLE)}</li>
    <li>Arkansas taxable income: ${N($(a75.brut))} &minus; ${N("$" + DED_SINGLE)} =
    ${N($$(imposable75))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Arkansas tax on ${N($$(imposable75))}: ${N("$2,308.00")} +
    (${N($$(imposable75))} &minus; ${N("$69,999.99")}) &times; 3.9% =
    ${N($$(a75.etat + CREDIT_SINGLE))}, minus the ${N("$" + CREDIT_SINGLE)} tax credit =
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
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${article(nom)} ${nom} worker ${sens} than an `
    + `Arkansan on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Arkansas borders both <a href="/paycheck-calculator/texas/">Texas</a> and
  <a href="/paycheck-calculator/tennessee/">Tennessee</a>, neither of which taxes wage income at
  all &mdash; a worker earning ${N("$75,000")} keeps ${N($$(voisins[0].r.net - a75.net))} more just
  south of the Arkansas-Texas line, or crossing east into Tennessee. Against
  <a href="/paycheck-calculator/nebraska/">Nebraska</a>, a state that does tax income progressively,
  Arkansas&rsquo;s ${N($$(a75.etat))} at this salary is noticeably lower than Nebraska&rsquo;s
  ${N($$(voisins[2].r.etat))} &mdash; Arkansas&rsquo;s 3.9% top rate is nearly a full point below
  Nebraska&rsquo;s 4.55%.</p>

${blocSources("arkansas")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a> &mdash; a
    neighboring state with no income tax at all.</li>
    <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash;
    another neighbor with no income tax.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Arkansas", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-12">September 12, 2026</time> &middot;
    Last updated <time datetime="2026-09-12">September 12, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Arkansas rates.
  </p>

</div>
${colonne("Arkansas")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "arkansas");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (Math.abs(ecartReel100k - GAP_AT_100K) > 1) {
  console.error("ARRET : l'ecart mesure (%s) ne correspond plus a GAP_AT_100K (%s)",
    ecartReel100k.toFixed(2), GAP_AT_100K);
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
