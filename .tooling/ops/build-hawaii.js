/* Construit /paycheck-calculator/hawaii/.
 *
 * Meme regle que les autres generateurs : la page cite une soixantaine de
 * montants et AUCUN n'est ecrit a la main. Tous sortent de .tooling/lib/paie.js,
 * la bibliotheque unique que la suite de tests compare au moteur du navigateur.
 * Ce qui est ecrit a la main, c'est la prose et les FAITS DE DROIT.
 *
 * QUATRE PIEGES PROPRES A HAWAII, a relire avant toute mise a jour :
 *
 *   1. tax.hawaii.gov et files.hawaii.gov repondent HTTP 403 a tout ce qui
 *      n'est pas un navigateur. Ce n'est PAS une absence de source : curl avec
 *      un User-Agent Chrome passe en 200. Meme piege que tn.gov, abandonne a
 *      tort apres trois essais le 01/09.
 *
 *   2. Le bareme a ete lu dans le TEXTE DE LOI, Act 46 SLH 2024, telecharge sur
 *      data.capitol.hawaii.gov. La loi contient DEUX jeux de tranches : celui
 *      qui commence « after December 31, 2024 » (2025 et 2026, celui-ci) et un
 *      autre « after December 31, 2026 » (2027). Prendre le second aurait
 *      decale toute la page d'un an.
 *
 *   3. Plusieurs resumes en ligne donnent 4 400 $ de deduction standard pour
 *      2026. C'est le chiffre 2024-2025. Act 46 section (F), « for taxable
 *      years beginning after December 31, 2025 », dit 8 000 $ celibataire.
 *
 *   4. HB 2306 (session 2026) releve les trois tranches hautes, mais « for
 *      taxable years beginning after 12/31/2026 » : sans effet sur cette page.
 *
 * Lancer : node .tooling/ops/build-hawaii.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "hawaii";
const R = require(path.join(RACINE, "data", "rates-2026.js"));
const HI = R.states.hawaii;

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* Act 46, SLH 2024, section (F) : « $8,000 in the case of an individual who is
   not married and who is not a surviving spouse or head of household ». */
const DED = HI.incomeTax.standardDeduction.single;      // 8 000
const DED_M = HI.incomeTax.standardDeduction.marriedJoint;   // 16 000
const DED_H = HI.incomeTax.standardDeduction.headOfHousehold; // 12 000
const DED_AVANT = 4400;   // le meme chiffre pour 2024 et 2025, section (E)

const BANDES = HI.incomeTax.brackets.single;
const NB_TRANCHES = BANDES.length;                       // 12
const TAUX_BAS = BANDES[0][1] * 100;                     // 1,40
const TAUX_HAUT = BANDES[BANDES.length - 1][1] * 100;    // 11,00
const SEUIL_HAUT = BANDES[BANDES.length - 2][0];         // 325 000, celibataire

/* TDI et Prepaid Health Care : facultatifs, donc jamais soustraits.
   Source : DLIR, Disability Compensation Division, « 2026 Maximum Weekly Wage
   Base and Maximum Weekly Benefit Amount », 10 decembre 2025. */
const TDI = HI.optionalWithholding.tdi;
const TDI_AN = TDI.maxWeekly * 52;                       // 390,00
const PHC_PCT = HI.optionalWithholding.prepaidHealthCare.maxEmployeeRate * 100; // 1,5

const a25 = calcul(CLE, 25000);
const a40 = calcul(CLE, 40000);
const a60 = calcul(CLE, 60000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const j75 = calcul(CLE, 75000, "marriedJoint");
const ecartJoint = a75.etat - j75.etat;

const PCT_401K = 0.06;
const k75 = calcul(CLE, 75000, "single", PCT_401K);
const gainHI = a75.etat - k75.etat;
const pa75 = calcul("pennsylvania", 75000);
const pa75k = calcul("pennsylvania", 75000, "single", PCT_401K);
const gainPA = pa75.etat - pa75k.etat;

/* Le taux d'Etat REEL a differents salaires. Sur douze tranches il monte sans
   jamais atteindre le taux affiche : c'est l'angle de la page. */
const eff = (r, b) => (r.etat / b * 100);
const eff25 = eff(a25, 25000), eff40 = eff(a40, 40000);
const eff75 = eff(a75, 75000), eff250 = eff(a250, 250000);

/* L'erreur la plus courante : appliquer 11 % a tout le salaire. */
const faux75 = 75000 * 0.11;

const voisins = ["illinois", "utah", "michigan", "nevada"].map(k => ({
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

/* La grille des douze tranches, produite depuis les donnees. Aucun seuil
   n'est retape : si la loi change, ce tableau suit. */
const ligneTranches = BANDES.map((b, i) => {
  const bas = i === 0 ? 0 : BANDES[i - 1][0];
  const haut = b[0];
  const libelle = haut === Infinity
    ? "Over " + $(bas)
    : $(bas) + " &ndash; " + $(haut);
  return `        <tr>
          <td>${libelle}</td>
          <td class="num">${(b[1] * 100).toFixed(2)}%</td>
        </tr>`;
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Hawaii income tax rate in 2026?",
   "Hawaii does not have one rate. It has " + NB_TRANCHES + " brackets running from "
   + TAUX_BAS.toFixed(2) + "% to " + TAUX_HAUT.toFixed(2) + "%, which is the widest range of any "
   + "state published here. For a single filer the top " + TAUX_HAUT.toFixed(0) + "% rate does not "
   + "begin until " + $(SEUIL_HAUT) + " of taxable income. The brackets come from Act 46, Session "
   + "Laws of Hawaii 2024, in the block that applies to taxable years beginning after December 31, "
   + "2024 - which covers both 2025 and 2026."],

  ["What is take-home pay on a $75,000 salary in Hawaii?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, "
   + $$(a75.ss + a75.med) + " of Social Security and Medicare, and " + $$(a75.etat) + " of Hawaii "
   + "income tax. The effective rate is " + (a75.taux * 100).toFixed(1) + "%, the highest of the "
   + "states published on this site."],

  ["Did Hawaii's standard deduction change for 2026?",
   "Yes, and it nearly doubled. Act 46 raised it from " + $(DED_AVANT) + " to " + $(DED)
   + " for a single filer, from " + $(DED_AVANT * 2) + " to " + $(DED_M) + " for a couple filing "
   + "jointly, and to " + $(DED_H) + " for head of household. The statute words it as “for "
   + "taxable years beginning after December 31, 2025”, which means the 2026 tax year. Several "
   + "summaries online still quote " + $(DED_AVANT) + "; that is the 2024 and 2025 figure."],

  ["Why is my effective Hawaii rate so much lower than 11%?",
   "Because a bracket applies only to the dollars above its threshold, never to the whole salary. "
   + "On " + $(75000) + " a single filer pays " + $$(a75.etat) + " to Hawaii, which is "
   + eff75.toFixed(2) + "% of gross pay - not 11%. Applying the top rate to the whole salary would "
   + "give " + $$(faux75) + ", more than " + $$(faux75 - a75.etat) + " too much. Even on "
   + $(250000) + " the real state share is " + eff250.toFixed(2) + "%."],

  ["Does Hawaii take Temporary Disability Insurance out of my paycheck?",
   "It may, but this calculator does not assume it. Hawaii's Disability Compensation Division "
   + "states that an employer “may withhold TDI contributions of one-half the premium cost but "
   + "not more than .5% of the employee's weekly wage, with the maximum not to exceed $"
   + TDI.maxWeekly.toFixed(2) + "”. The words are may and one-half the premium cost: the real "
   + "amount depends on a policy we cannot see from a salary. The legal ceiling is $"
   + TDI.maxWeekly.toFixed(2) + " a week, " + $(TDI_AN) + " a year. Prepaid Health Care works the "
   + "same way, capped at " + PHC_PCT.toFixed(1) + "% of wages. If your employer withholds either, "
   + "subtract it from the take-home figures here."],

  ["What is $25 an hour after taxes in Hawaii?",
   "At 40 hours a week, $25 an hour is " + $(h25.brut) + " a year gross and about " + $(h25.net)
   + " after tax, which is " + $$(h25.netHoraire) + " an hour in real terms. Hawaii's share is "
   + $$(h25.etat) + " for the year. At this salary you are in the "
   + (BANDES.find(b => (h25.brut - DED) <= b[0])[1] * 100).toFixed(2) + "% bracket, a long way "
   + "below the headline " + TAUX_HAUT.toFixed(0) + "%."],

  ["Does a 401(k) contribution lower my Hawaii tax?",
   "Yes. Hawaii starts from federal adjusted gross income, and an elective deferral to a 401(k) or "
   + "403(b) is already out of that figure, so it reduces your state tax as well as your federal "
   + "tax. On " + $(75000) + " with 6% going in, your Hawaii tax falls by " + $$(gainHI)
   + " a year. The rule is not universal: in Pennsylvania the same worker's state tax falls by "
   + $$(gainPA) + " - nothing at all."],

  ["How does filing jointly change the Hawaii calculation?",
   "Every bracket threshold doubles and so does the standard deduction, from " + $(DED) + " to "
   + $(DED_M) + ". On " + $(75000) + " of household income a couple filing jointly pays "
   + $$(j75.etat) + " to Hawaii where a single filer on the same figure pays " + $$(a75.etat)
   + " - a difference of " + $$(ecartJoint) + " a year. Head of household sits between the two: "
   + "its thresholds are exactly one and a half times the single ones."],

  ["Why might my Hawaii tax differ by a few cents from this figure?",
   "Because the statute rounds and we do not. Act 46 writes each bracket's cumulative starting "
   + "amount to the whole dollar - " + $(9600) + " at 1.40% is $134.40, but the law prints “"
   + "$134.00 plus 3.20%”. We add the bands up exactly, without rounding along the way. On "
   + "$50,000 of taxable income that puts us 20 cents above the statutory formula, always in the "
   + "direction of showing slightly more tax rather than less. It is the only difference between "
   + "this calculator and Hawaii's own worksheet, and it is deliberate."],

  ["Do any Hawaii counties charge their own income tax?",
   "No. Hawaii is unusually centralised: the state levies the income tax and the counties do not "
   + "add an income tax layer on top. That is a real difference from Michigan, where Detroit adds "
   + "2.4%, or Pennsylvania, where local earned income tax is routine. Hawaii's general excise tax "
   + "does vary by county, but it is charged on transactions, not withheld from your pay."]
];

const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const { grilleEtats } = require("../lib/etats-publies.js");
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
<title>Hawaii Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Hawaii paycheck calculator, 2026. Hourly or salary. Hawaii has ${NB_TRANCHES} tax brackets from ${TAUX_BAS.toFixed(2)}% to ${TAUX_HAUT.toFixed(2)}%, and its standard deduction nearly doubled to ${$(DED)} this year.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/hawaii/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Hawaii Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Hawaii taxes income across ${NB_TRANCHES} brackets, from ${TAUX_BAS.toFixed(2)}% to ${TAUX_HAUT.toFixed(2)}% &mdash; but the real share of a ${$(75000)} salary is ${eff75.toFixed(2)}%, not 11%.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/hawaii/">
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
      "name": "Hawaii Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/hawaii/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Hawaii take-home pay after federal income tax, Social Security, Medicare and Hawaii's ${NB_TRANCHES} income tax brackets running from ${TAUX_BAS.toFixed(2)} to ${TAUX_HAUT.toFixed(2)} percent, using the 2026 standard deduction of ${$(DED)} for a single filer."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Hawaii", "item": "https://statelinecalc.com/paycheck-calculator/hawaii/" }
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
<div class="col-contenu">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/paycheck-calculator/">Paycheck Calculator</a></li>
    <li aria-current="page">Hawaii</li>
  </ol>
</nav>

  <h1>Hawaii Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Hawaii taxes income across <strong>${NB_TRANCHES} brackets</strong>, from
    ${N(TAUX_BAS.toFixed(2) + "%")} to ${N(TAUX_HAUT.toFixed(2) + "%")} &mdash; the widest range of
    any state on this site. The top rate does not start until ${N($(SEUIL_HAUT))} of taxable income
    for a single filer, so almost nobody pays it. On ${N($(75000))}, a single filer pays
    ${N($$(a75.etat))} to the state &mdash; ${N(eff75.toFixed(2) + "%")} of gross pay, not 11% &mdash;
    and keeps about ${N($(a75.net))} a year.</p>

    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Hawaii take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="hawaii" novalidate>
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
          <span class="help">In Hawaii this doubles every bracket threshold for a couple, and
          the standard deduction with them.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Hawaii it
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
    <p>Hawaii runs the most detailed income tax schedule of any state published here:
    <strong>${NB_TRANCHES} brackets</strong> where most states now use one or two. That detail is
    the reason the headline rate misleads so badly. An ${TAUX_HAUT.toFixed(0)}% top rate sounds
    punishing, but it applies only to taxable income above ${N($(SEUIL_HAUT))} for a single filer,
    and the eleven bands underneath it do the actual work.</p>

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
      <li><strong>Hawaii income tax</strong> on your wages less the state standard deduction of
      ${N($(DED))} for a single filer, run through the ${NB_TRANCHES} brackets below.</li>
    </ul>

    <p>Rates come from the agencies and the statutes that set them: the IRS for the federal
    brackets, the standard deduction and FICA, cross-checked against the Social Security
    Administration for the wage base. The Hawaii figures were read on
    <time datetime="2026-09-05">September 5, 2026</time> in <strong>the law itself</strong> &mdash;
    Act 46, Session Laws of Hawaii 2024, obtained from the State Capitol's own document server
    &mdash; rather than in any summary of it. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Two traps worth naming, because they are easy to fall into.</strong> Act 46 contains
    <em>two</em> bracket tables: one for taxable years beginning after December 31, 2024, which
    covers 2025 and 2026, and another for years beginning after December 31, 2026. Reading the
    second one would put every figure on this page a year ahead of itself. And several summaries
    still give ${N($(DED_AVANT))} as the 2026 standard deduction; that is the 2024 and 2025 amount,
    superseded for 2026.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Hawaii's
    low-income household renters credit or food/excise tax credit, handle multiple jobs, or account
    for health insurance premiums and other employer benefit deductions. It also does not deduct
    Temporary Disability Insurance or Prepaid Health Care, for the reason set out below.</p>

    <h2>What this calculator does not deduct, and why</h2>
    <p>Hawaii has two payroll withholdings that most state calculators either ignore or guess at.
    We do neither: we name them and leave them out, because guessing would be worse than
    omitting.</p>
    <p><strong>Temporary Disability Insurance.</strong> The Disability Compensation Division's 2026
    contribution notice says an employer &ldquo;<em>may</em> withhold TDI contributions of one-half
    the premium cost but not more than .5% of the employee's weekly wage, with the maximum not to
    exceed ${N($$(TDI.maxWeekly))}&rdquo;. Two words decide it: <em>may</em>, and
    <em>one-half the premium cost</em>. Whether anything is withheld, and how much, depends on a
    policy that cannot be seen from a gross salary. What we can tell you is the ceiling: at most
    ${N($$(TDI.maxWeekly))} a week, ${N($(TDI_AN))} a year, on a maximum weekly wage
    base of ${N($$(TDI.maxWeeklyWageBase))}.</p>
    <p><strong>Prepaid Health Care.</strong> The same notice allows an employer to withhold
    &ldquo;one-half the PHC premium cost but not to exceed ${PHC_PCT.toFixed(1)}% of an employee's
    wages&rdquo;. Again it depends on the premium, and again the ceiling is what we can state.</p>
    <p>This is a genuine difference from
    <a href="/paycheck-calculator/washington/">Washington</a>, where Paid Family and Medical Leave
    and WA Cares are compulsory at fixed rates and therefore <em>are</em> modelled here. If your
    Hawaii employer withholds either of these, subtract it from the take-home figures on this
    page.</p>
  </div>

  <h2>Hawaii take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Hawaii column climbs steadily rather than in one step, because each bracket only taxes the
  dollars above its own threshold.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Hawaii take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">HI state tax</th>
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

    <h2>The ${NB_TRANCHES} Hawaii tax brackets for 2026</h2>
    <p>Single filer, applied to taxable income &mdash; that is, your wages after the
    ${N($(DED))} state standard deduction, not your gross salary. A couple filing jointly doubles
    every threshold; head of household multiplies them by one and a half exactly.</p>

    <div class="table-scroll">
      <table>
        <caption class="caption caption-left">
          2026 Hawaii income tax brackets, single filer, taxable income
        </caption>
        <thead>
          <tr>
            <th scope="col">Taxable income</th>
            <th scope="col" class="num">Rate</th>
          </tr>
        </thead>
        <tbody>
${ligneTranches}
        </tbody>
      </table>
    </div>

    <h2>Hawaii hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Hawaii</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Hawaii's income tax, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your account &mdash; is ${N($$(h20.netHoraire))}. Hawaii's share is ${N($$(h20.etat))} for
    the year, or ${N(eff(h20, h20.brut).toFixed(2) + "%")} of gross pay.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Hawaii takes ${N($$(h25.etat))} and
    ${N($$(h30.etat))} respectively &mdash; ${N(eff(h25, h25.brut).toFixed(2) + "%")} and
    ${N(eff(h30, h30.brut).toFixed(2) + "%")} of gross. Both are a long way below the
    ${TAUX_HAUT.toFixed(0)}% headline.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Hawaii taxes overtime, tips and shift differentials as ordinary wages. With
    ${NB_TRANCHES} brackets, extra hours can push part of your pay into the next band, which is why
    an overtime week is taxed slightly harder at the margin than your base pay &mdash; but only the
    dollars above the threshold move, never the whole salary. The brackets below show exactly where
    each line falls.</p>

    <h3>Hawaii take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Hawaii take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Hawaii</h2>

  <h3>The standard deduction nearly doubled for 2026</h3>
  <p>Act 46 lifted Hawaii's standard deduction from ${N($(DED_AVANT))} to ${N($(DED))} for a single
  filer, from ${N($(DED_AVANT * 2))} to ${N($(DED_M))} for a couple filing jointly, and to
  ${N($(DED_H))} for head of household. It is written into the statute as a schedule rather than a
  single change: the deduction rises again in 2028, 2030 and 2031, reaching ${N("$12,000")} single
  by then. This is the single largest change to a Hawaii paycheck this year.</p>

  <h3>${NB_TRANCHES} brackets, and the top one almost never applies</h3>
  <p>Hawaii's ${TAUX_HAUT.toFixed(0)}% top rate is among the highest state rates in the country and
  is quoted constantly. For a single filer it begins at ${N($(SEUIL_HAUT))} of <em>taxable</em>
  income &mdash; that is roughly ${N($(SEUIL_HAUT + DED))} of gross salary. A worker on
  ${N($(75000))} is in the ${N((BANDES.find(b => (75000 - DED) <= b[0])[1] * 100).toFixed(2) + "%")}
  bracket, four bands below the top.</p>

  <h3>Your effective Hawaii rate rises smoothly and never reaches the headline</h3>
  <p>On ${N($(25000))} the state takes ${N($$(a25.etat))}, an effective state rate of
  ${N(eff25.toFixed(2) + "%")}. On ${N($(40000))} it takes ${N($$(a40.etat))}, or
  ${N(eff40.toFixed(2) + "%")}. On ${N($(75000))} it is ${N(eff75.toFixed(2) + "%")}, and even on
  ${N($(250000))} it is only ${N(eff250.toFixed(2) + "%")}. That gap between
  ${N(eff250.toFixed(2) + "%")} and the ${TAUX_HAUT.toFixed(0)}% headline is what a progressive
  schedule actually looks like from inside a paycheck.</p>

  <h3>Filing jointly doubles every threshold</h3>
  <p>Unlike states that give couples a fixed extra amount, Hawaii doubles the whole schedule: every
  one of the ${NB_TRANCHES} bracket thresholds and the standard deduction with them. On
  ${N($(75000))} of household income a couple pays ${N($$(j75.etat))} where a single filer pays
  ${N($$(a75.etat))} &mdash; ${N($$(ecartJoint))} a year of difference from filing status alone.
  Head of household is not an afterthought either: its thresholds are exactly one and a half times
  the single ones, all the way up.</p>

  <h3>Your 401(k) contribution does reduce your Hawaii tax</h3>
  <p>Hawaii starts from federal adjusted gross income, so an elective deferral to a 401(k) or
  403(b) is already outside the base. On ${N($(75000))} with 6% going in, your Hawaii tax falls by
  ${N($$(gainHI))} a year, on top of the federal saving.</p>
  <p>It is worth saying explicitly because the rule is not universal:
  <a href="/paycheck-calculator/pennsylvania/">a Pennsylvania worker</a> making the same
  contribution on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash;
  Pennsylvania treats the deferral as compensation the moment it is made. Hawaii does not.</p>

  <h3>No county income tax comes out of a Hawaii paycheck</h3>
  <p>Hawaii is unusually centralised: the state levies the income tax and the four counties do not
  add one on top. That is a real difference from
  <a href="/paycheck-calculator/michigan/">Michigan</a>, where a Detroit resident pays 2.4% to the
  city, and from Pennsylvania, where local earned income tax is routine. Hawaii's general excise
  tax does vary by county, but it is charged on transactions rather than withheld from your
  pay.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Applying 11% to the whole salary</h3>
  <p>This is the big one, and Hawaii's reputation invites it. On ${N($(75000))} that arithmetic
  gives ${N($$(faux75))} when the real Hawaii tax is ${N($$(a75.etat))} &mdash; an overstatement of
  ${N($$(faux75 - a75.etat))} a year. A bracket taxes the dollars above its threshold and nothing
  else. The ${TAUX_HAUT.toFixed(0)}% band does not open until ${N($(SEUIL_HAUT))} of taxable
  income.</p>

  <h3>Using the ${$(DED_AVANT)} standard deduction</h3>
  <p>It was correct for 2024 and 2025 and is wrong for 2026. Act 46 raised it to ${N($(DED))}
  single. Using the old figure adds ${N($(DED - DED_AVANT))} to your taxable income and overstates
  your Hawaii tax accordingly. Several online summaries had not caught up when this page was
  written.</p>

  <h3>Reading the wrong bracket table in the statute</h3>
  <p>Act 46 contains two: one for taxable years beginning after December 31, 2024, and one for
  years beginning after December 31, 2026. The first covers 2026. The second does not start until
  2027, and using it a year early shifts every threshold.</p>

  <h3>Assuming TDI comes out automatically</h3>
  <p>It may not. The employer <em>may</em> withhold up to half the premium, capped at
  ${N($$(TDI.maxWeekly))} a week; some employers pay the whole premium and withhold
  nothing. Budgeting for ${N($(TDI_AN))} a year that never leaves your pay is as much of an error
  as forgetting it entirely.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Health premiums and benefit deductions come out first,
  your federal W-4 settings drive the federal share, and a second job changes everything. Treat
  this as an accurate model of the federal and state layers, and read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Hawaii in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} = ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Hawaii taxable income: ${N($(a75.brut))} &minus; ${N($(DED))} =
    ${N($(75000 - DED))}</li>
    <li>Hawaii income tax across the brackets: ${N($$(a75.etat))} &mdash;
    ${N(eff75.toFixed(2) + "%")} of gross, not ${TAUX_HAUT.toFixed(0)}%</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>Not shown: Temporary Disability Insurance, up to ${N($(TDI_AN))} a year, and Prepaid Health
  Care, up to ${PHC_PCT.toFixed(1)}% of wages. Both are at the employer's discretion and are
  explained above.</p>

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
  /* « An Utah worker » : le test portait sur la LETTRE initiale, pas sur le SON.
     Utah se prononce /juːtɑː/, avec un son consonne — un lecteur americain ecrit
     toujours « a Utah worker ». Defaut trouve par le controle le 05/09/2026 sur
     la page Hawaii, present dans trois generateurs. Utah est la SEULE exception
     parmi les 50 Etats : tous les autres a voyelle initiale (Alabama, Alaska,
     Arizona, Arkansas, Idaho, Illinois, Indiana, Iowa, Ohio, Oklahoma, Oregon)
     prennent bien « An ». */
  const SON_CONSONNE = ["Utah"];
  const art = (/^[AEIOU]/.test(nom) && !SON_CONSONNE.includes(nom)) ? "An" : "A";
  return `    <li><a href="/paycheck-calculator/${v.cle}/">${nom}</a> &mdash; ${$(v.r.net)} take-home, `
    + `an effective rate of ${(v.r.taux * 100).toFixed(1)}%. ${art} ${nom} worker ${sens} than a `
    + `Hawaii worker on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>At ${N($(75000))} Hawaii takes more than any other state published here. That ranking is not
  fixed, though: it comes from the brackets a ${N($(75000))} salary reaches, and lower down the
  scale Hawaii's newly doubled ${N($(DED))} deduction and its ${N(TAUX_BAS.toFixed(2) + "%")}
  opening band close much of the gap. The states that levy nothing at all remain in a category of
  their own.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/washington/">Washington paycheck calculator</a> &mdash; no
    income tax, but two compulsory payroll programmes that Hawaii's optional ones are often
    confused with.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Hawaii", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-05">September 5, 2026</time> &middot;
    Last updated <time datetime="2026-09-05">September 5, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Hawaii rates.
  </p>

</div>
${colonne("Hawaii")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "hawaii");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
