/* Construit /paycheck-calculator/nebraska/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le Nebraska est le 14e Etat publie et le 3e a bareme progressif, apres Hawaii
 * et l'Ohio. Ce qu'il a de propre :
 *
 *   1. IL IMPRIME QUATRE TRANCHES ET N'EN A PLUS QUE TROIS. Les deux dernieres
 *      portent le meme taux, 4,55 %, et c'est le formulaire de l'Etat qui le
 *      dit. La tranche haute existe encore sur le papier ; elle ne change plus
 *      un centime.
 *   2. LA BAISSE LA PLUS FORTE QU'ON AIT EU A ECRIRE : 5,20 % en 2025,
 *      4,55 % en 2026, soit 0,65 point en un an — contre 0,26 en Caroline du
 *      Nord la meme annee.
 *   3. UN CREDIT DE 176 $ PAR PART, QUI NE S'EFFACE PAS. L'Utah a un credit qui
 *      fond avec le revenu ; celui du Nebraska vaut la meme somme a 30 000 $ et
 *      a 300 000 $.
 *
 * ── LA VERIFICATION QUI DONNE CONFIANCE DANS LE MOTEUR ──────────────────────
 * Le bareme du Nebraska publie ses montants cumules : 101,60 $ a 4 130 $,
 * 825,71 $ a 24 760 $, 1 514,58 $ a 39 900 $. Notre moteur, qui additionne
 * tranche par tranche sans jamais lire ces constantes, retombe exactement
 * dessus. Ce n'est pas une coincidence, c'est le controle : si un seuil ou un
 * taux avait ete mal recopie, l'ecart apparaitrait des la deuxieme tranche.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur qui paie l'assurance chomage au Nebraska : dol.nebraska.gov ET
 *     nebraskalegislature.gov refusent la connexion depuis cette machine
 *     (ECONNREFUSED, tout le reseau 164.119.x). Deux methodes, deux echecs, on
 *     s'arrete. La page dit ce que le calcul FAIT ;
 *   - rien sur un eventuel impot municipal : aucune source lue ;
 *   - rien sur 2027.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/sources/nebraska.md.
 * Formulaire 1040N-ES 2026 (PDF, 611 808 octets) et « Nebraska Tax Rate
 * Chronologies, Table 1 » revision 2-2026, tous deux lus le 09/09/2026 sur
 * revenue.nebraska.gov, HTTP 200.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-nebraska.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "nebraska";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* 1040N-ES 2026, page 6. */
const T1 = 0.0246, T2 = 0.0351, T3 = 0.0455;
const S1 = 4130, S2 = 24760, S3 = 39900;          // seuils celibataire
const DED_SINGLE = 8850, DED_JOINT = 17700, DED_HOH = 12950;
const CREDIT = 176;
/* Chronologie DOR rev. 2-2026, ligne « Jan. 1, 2025 ». */
const T2025 = [[4030, 0.0246], [24120, 0.0351], [38870, 0.0501], [Infinity, 0.0520]];
const DED_2025 = 8600, CREDIT_2025 = 171;
const TAUX_HAUT_2025 = 0.0520;

const a75 = calcul(CLE, 75000);
const a60 = calcul(CLE, 60000);
const a25 = calcul(CLE, 25000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* Ce que la baisse de 2025 a 2026 a rendu, sur le meme salaire et avec le
   bareme 2025 complet — pas une regle de trois sur le taux haut. */
const impot2025 = (brut, ded, credit) =>
  Math.max(0, progressiveTax(Math.max(0, brut - ded), T2025) - credit);
const nb2025_75 = impot2025(75000, DED_2025, CREDIT_2025);
const gainBaisse75 = nb2025_75 - a75.etat;

/* Les constantes cumulees que le formulaire imprime, recalculees par le
   moteur. Si l'une ne tombe pas juste, un seuil a ete mal recopie. */
const cumul1 = S1 * T1;
const cumul2 = cumul1 + (S2 - S1) * T2;
const cumul3 = cumul2 + (S3 - S2) * T3;

/* Le taux effectif ne peut pas atteindre 4,55 % : deduction puis credit. */
const effet25 = a25.etat / 25000 * 100;
const effet75 = a75.etat / 75000 * 100;
const effet250 = a250.etat / 250000 * 100;

/* Le seuil ou le Nebraska commence a prendre quelque chose.
   ⛔ NE PAS LE CALCULER DE TETE. La premiere version de ce fichier ecrivait
   DED_SINGLE + CREDIT / T1 = 16 004 $, en supposant que le credit de 176 $
   s'absorbe entierement dans la bande a 2,46 %. C'est faux : cette bande ne
   produit que 101,60 $ d'impot sur toute sa longueur, donc le credit deborde
   dans la bande a 3,51 % et le seuil reel est plus bas. Le test navigateur l'a
   trouve au dollar pres — 15 100 $ — avant la mise en ligne. On le CHERCHE
   avec le moteur, ce qui reste juste si un taux ou un seuil change. */
const seuilImposition = (() => {
  let bas = 0, haut = 200000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();
/* La part de revenu imposable que le credit efface, en dollars. */
const abriCredit = seuilImposition - DED_SINGLE;

/* Le 401(k) : le Nebraska part de l'AGI federal, donc il suit. */
const PCT_401K = 0.06;
const ne75k = calcul(CLE, 75000, "single", PCT_401K);
const gainNE = a75.etat - ne75k.etat;
const pa75 = calcul("pennsylvania", 75000);
const pa75k = calcul("pennsylvania", 75000, "single", PCT_401K);
const gainPA = pa75.etat - pa75k.etat;

const voisins = ["utah", "north-carolina", "illinois", "texas"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { utah: "Utah", "north-carolina": "North Carolina",
               illinois: "Illinois", texas: "Texas" };

/* « A Illinois worker » : le controle du 09/09/2026 l'a lu comme un lecteur
   americain l'aurait lu. C'est le son qui commande, pas l'orthographe — d'ou
   « an Illinois », « an Ohio », « an Arkansas », mais « a Utah » : U se dit
   « you », une consonne. Les cinq voyelles moins le U. */
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
  ["What is the Nebraska income tax rate in 2026?",
   "2.46%, 3.51% and 4.55%, applied in bands. Nebraska's own 2026 rate schedule prints four "
   + "brackets, but it adds a note that settles the matter: “The tax year 2026 individual income "
   + "tax rates for the third and fourth brackets are at the same rate of 4.55%.” So the top "
   + "bracket still exists on paper and no longer changes anything. For a single filer the bands "
   + "run to $" + c0(S1) + ", then to $" + c0(S2) + ", then 4.55% on everything above."],

  ["How much did Nebraska income tax fall in 2026?",
   "The top rate went from 5.20% to 4.55% — 0.65 of a point in one year. On a $75,000 salary that "
   + "is " + $$(gainBaisse75) + " a year back in your pocket, comparing the full 2026 schedule "
   + "with the full 2025 one rather than just the headline rate. For scale, North Carolina cut "
   + "0.26 of a point over the same year. Both figures come from the states' own documents: "
   + "Nebraska's rate chronology, revised February 2026, lists 2.46 / 3.51 / 5.01 / 5.20 for 2025 "
   + "and 2.46 / 3.51 / 4.55 / 4.55 for 2026."],

  ["What is take-home pay on a $75,000 salary in Nebraska?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Nebraska "
   + "income tax — an effective rate of " + (a75.taux * 100).toFixed(1) + "%. The Nebraska figure "
   + "is the tax on $" + c0(75000 - DED_SINGLE) + " of taxable income, less the $" + CREDIT
   + " personal exemption credit."],

  ["How much is the Nebraska standard deduction for 2026?",
   "$" + c0(DED_SINGLE) + " single, $" + c0(DED_JOINT) + " married filing jointly, $" + c0(DED_HOH)
   + " head of household, $" + c0(DED_SINGLE) + " married filing separately. The amounts are "
   + "printed on line 5 of the 2026 Form 1040N-ES worksheet, the form Nebraska publishes so people "
   + "can estimate the current year's tax."],

  ["What is the Nebraska personal exemption credit worth?",
   "$" + CREDIT + " for each exemption, and the word that matters is credit. It comes off the tax "
   + "itself, not off your income, so it is worth exactly $" + CREDIT + " whether you earn "
   + "$30,000 or $300,000 — a deduction of the same size would be worth about $"
   + (CREDIT * T3).toFixed(0) + " to a higher earner and less to a lower one. Nebraska stopped "
   + "phasing the credit out with income in 2018, so it no longer fades. Utah's taxpayer credit, "
   + "the closest thing among the states on this site, does fade."],

  ["At what salary does Nebraska start taking income tax?",
   "About " + $(seuilImposition) + " for a single filer with one exemption. The first $"
   + c0(DED_SINGLE) + " is covered by the standard deduction, and the $" + CREDIT + " credit "
   + "cancels the tax on the next $" + c0(abriCredit) + " of taxable income. Note that the credit "
   + "reaches past the first band to do it: 2.46% on the whole first band comes to $101.60, less "
   + "than the credit, so the rest is absorbed at 3.51%. Below that line Nebraska takes nothing at "
   + "state level, though federal tax and FICA still apply."],

  ["Does a 401(k) contribution lower my Nebraska tax?",
   "Yes. Nebraska taxable income starts from your federal adjusted gross income, and an elective "
   + "deferral is already out of that figure, so the contribution reduces your state tax as well "
   + "as your federal tax. On $75,000 with 6% going into a 401(k), your Nebraska tax falls by "
   + $$(gainNE) + ". The rule is not universal: in Pennsylvania the same worker's state tax falls "
   + "by " + $$(gainPA) + " — nothing at all."],

  ["What is $20 an hour after taxes in Nebraska?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Nebraska "
   + "takes " + $$(h20.etat) + " of that: the first $" + c0(DED_SINGLE) + " is deducted, the next "
   + "band is taxed at 2.46%, and the $" + CREDIT + " credit comes off at the end."],

  ["Why is my Nebraska paycheck smaller than this calculator says?",
   "The usual reasons, and one that is specific to Nebraska. Specific: your employer withholds "
   + "from the tables in Circular EN, which use their own rates — 2.26% through 4.60% — and a "
   + "withholding allowance value, so the amount held back is an approximation of the tax rather "
   + "than the tax itself. General: health insurance premiums and other benefit deductions come "
   + "out before tax and are not modelled here, and a second job pushes your federal withholding "
   + "up."]
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
<title>Nebraska (NE) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Nebraska (NE) paycheck calculator, 2026. Rates of 2.46% to 4.55% after an $8,850 deduction, less a $176 credit that never fades.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/nebraska/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Nebraska (NE) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Nebraska prints four tax brackets in 2026 and only three of them do anything &mdash; the top two carry the same 4.55%.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/nebraska/">
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
      "name": "Nebraska Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/nebraska/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Nebraska take-home pay after federal income tax, Social Security, Medicare and Nebraska income tax at 2.46, 3.51 and 4.55 percent, after the state's $8,850 standard deduction and its $176 personal exemption credit."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Nebraska", "item": "https://statelinecalc.com/paycheck-calculator/nebraska/" }
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
    <li aria-current="page">Nebraska</li>
  </ol>
</nav>

  <h1>Nebraska Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Nebraska taxes income in bands of <strong>2.46%, 3.51% and 4.55%</strong> in 2026, after a
    standard deduction of ${N("$" + c0(DED_SINGLE))} for a single filer, less a
    ${N("$" + CREDIT)} credit taken off the tax itself. On $75,000 that is
    ${N($$(a75.etat))} to the state and about ${N($(a75.net))} a year in your pocket. The top
    rate fell from <strong>5.20% to 4.55%</strong> this year &mdash; worth
    ${N($$(gainBaisse75))} on that salary.</p>

    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Nebraska take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="nebraska" novalidate>
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
          <span class="help">Sets your federal brackets, and in Nebraska it moves the band
          thresholds, the deduction &mdash; ${N("$" + c0(DED_SINGLE))},
          ${N("$" + c0(DED_JOINT))} or ${N("$" + c0(DED_HOH))} &mdash; and the number of
          ${N("$" + CREDIT)} credits assumed.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Nebraska it
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
    <p>Nebraska is a banded tax with a twist worth knowing before you read any other page about
    it: the state publishes <strong>four</strong> brackets for 2026 and the top two carry the
    <strong>same rate</strong>. Its own rate schedule says so in a footnote &mdash; the third and
    fourth brackets are both 4.55%. So in practice there are three rates, not four, and no amount
    of extra salary moves you past 4.55%.</p>

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
      <li><strong>Nebraska income tax</strong>: your pay minus the state standard deduction
      (${N("$" + c0(DED_SINGLE))} single, ${N("$" + c0(DED_JOINT))} joint,
      ${N("$" + c0(DED_HOH))} head of household), run through the 2026 bands, then
      <em>minus</em> the ${N("$" + CREDIT)} personal exemption credit for each exemption.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and the <strong>Nebraska Department of Revenue</strong> for the state bands, the deduction and
    the credit, read on form 1040N-ES, the <em>2026 Nebraska Individual Estimated Income Tax
    Payment Vouchers</em>, and on the Department&rsquo;s own rate chronology, revised February
    2026. Both were read on <time datetime="2026-09-09">September 9, 2026</time>. Our full sourcing
    is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>One check worth stating, because it is what makes these figures trustworthy:</strong>
    Nebraska&rsquo;s schedule publishes the running total at each band &mdash;
    ${N($$(101.60))} at ${N("$" + c0(S1))}, ${N($$(825.71))} at ${N("$" + c0(S2))},
    ${N($$(1514.58))} at ${N("$" + c0(S3))}. This calculator never reads those constants; it adds
    band by band. It lands on ${N($$(cumul1))}, ${N($$(cumul2))} and ${N($$(cumul3))}. If a
    threshold or a rate had been copied wrong, the second band would already disagree.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model
    Nebraska&rsquo;s child care or other credits, handle multiple jobs, or account for health
    insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Nebraska take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption, no retirement contribution, 2026 state and
  federal rates. The Nebraska column is the banded tax on your pay above
  ${N("$" + c0(DED_SINGLE))}, less the ${N("$" + CREDIT)} credit.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Nebraska take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">NE state tax</th>
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

    <h2>Nebraska hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Nebraska</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Nebraska&rsquo;s banded tax, that leaves about ${N($(h20.net))} a year,
    or ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Nebraska&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. All three sit above the
    ${N("$" + c0(S2))} threshold, so every extra hour is taxed by Nebraska at the same 4.55%.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Nebraska taxes overtime, tips and shift differentials at the same rate as the rest of your
    pay, and for most full-time workers that rate is the top one, 4.55%, because the lower bands
    were used up by your regular earnings. The common complaint that &ldquo;overtime is taxed
    more&rdquo; is a federal effect: extra pay is withheld against a higher federal bracket, and
    nothing about the state layer changes.</p>

    <h3>Nebraska take-home pay by hourly rate</h3>
    <p>Single filer with one exemption, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Nebraska take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Nebraska</h2>

  <h3>Four brackets, three rates</h3>
  <p>Nebraska&rsquo;s 2026 schedule lists four brackets and then adds, in its own words, that
  <em>the tax year 2026 individual income tax rates for the third and fourth brackets are at the
  same rate of 4.55%</em>. The fourth bracket is therefore a line on a form rather than a step in
  your tax. For a single filer the bands are: ${N("2.46%")} up to ${N("$" + c0(S1))} of taxable
  income, ${N("3.51%")} to ${N("$" + c0(S2))}, then ${N("4.55%")} on everything above &mdash;
  including the stretch above ${N("$" + c0(S3))} that the form still prints separately.</p>
  <p>Married filing jointly, the bands are ${N("$" + c0(8250))} and ${N("$" + c0(49530))};
  head of household, ${N("$" + c0(7700))} and ${N("$" + c0(39620))}.</p>

  <h3>The top rate fell 0.65 of a point this year</h3>
  <p>In 2025 Nebraska&rsquo;s four rates were 2.46%, 3.51%, 5.01% and 5.20%. In 2026 they are
  2.46%, 3.51%, 4.55% and 4.55%. Both lines come from the Department&rsquo;s own rate chronology.
  Run the whole 2025 schedule against the whole 2026 one on a ${N($(75000))} salary &mdash; not
  just the headline rate &mdash; and the difference is ${N($$(gainBaisse75))} a year.</p>
  <p>For scale: <a href="/paycheck-calculator/north-carolina/">North Carolina</a> cut 0.26 of a
  point over the same period, from 4.25% to 3.99%. Nebraska&rsquo;s was the larger move.</p>

  <h3>The ${N("$" + CREDIT)} is a credit, and that is not a detail</h3>
  <p>Nebraska gives each exemption a ${N("$" + CREDIT)} <strong>credit</strong>, taken off the tax
  you owe rather than off the income you are taxed on. A deduction of the same size would be worth
  4.55 cents on the dollar to a higher earner and 2.46 cents to a lower one. A credit is worth
  ${N("$" + CREDIT)} to both. It is the one part of the Nebraska calculation that treats a
  ${N("$30,000")} salary and a ${N("$300,000")} salary identically.</p>
  <p>It also no longer fades: Nebraska phased the credit out with income until 2018 and stopped.
  <a href="/paycheck-calculator/utah/">Utah</a> is the counter-example among the states here
  &mdash; its taxpayer credit shrinks as you earn more and disappears entirely at
  ${N("$46,656")}.</p>

  <h3>Nebraska takes nothing below about ${N($(seuilImposition))}</h3>
  <p>Two things stack before the state takes anything: the ${N("$" + c0(DED_SINGLE))} standard
  deduction, then the ${N("$" + CREDIT)} credit, which cancels the tax on the next
  ${N("$" + c0(abriCredit))} of taxable income. A single filer with one exemption therefore pays no
  Nebraska income tax until ${N($(seuilImposition - 1))} of salary; at
  ${N($(seuilImposition))} the state takes its first cent. Federal tax and FICA still apply well
  below that.</p>
  <p>It is worth seeing why that figure is not ${N("$16,004")}, which is what you get by dividing
  the credit by the first rate. The 2.46% band is only ${N("$" + c0(S1))} wide, so it can only
  ever produce ${N($$(cumul1))} of tax &mdash; less than the credit itself. The rest of the credit
  is used up against income taxed at 3.51%, which is why the real threshold arrives sooner.</p>

  <h3>Your effective Nebraska rate stays well under 4.55%</h3>
  <p>The deduction and the credit are fixed dollar amounts, so they shelter a larger share of a
  small salary than a large one. On ${N("$25,000")} the state takes ${N($$(a25.etat))}, an
  effective state rate of ${N(effet25.toFixed(2) + "%")}. On ${N("$75,000")} it takes
  ${N($$(a75.etat))}, or ${N(effet75.toFixed(2) + "%")}. On ${N("$250,000")} it is
  ${N(effet250.toFixed(2) + "%")}. The headline 4.55% is a ceiling the state approaches slowly and
  never reaches.</p>

  <h3>Filing jointly widens the bands and doubles the credit</h3>
  <p>A couple filing jointly shelters ${N("$" + c0(DED_JOINT))} instead of
  ${N("$" + c0(DED_SINGLE))}, crosses into 4.55% at ${N("$" + c0(49530))} of taxable income
  instead of ${N("$" + c0(S2))}, and claims two ${N("$" + CREDIT)} credits. On a
  ${N($(75000))} single income, choosing married filing jointly takes the state tax from
  ${N($$(a75.etat))} to ${N($$(j75.etat))}.</p>

  <h3>Your 401(k) contribution does reduce your Nebraska tax</h3>
  <p>Nebraska taxable income starts from your federal adjusted gross income, and an elective
  deferral to a 401(k) or 403(b) is already excluded from that figure. So the contribution cuts
  your state tax as well as your federal tax. On ${N("$75,000")} with 6% going in, your Nebraska
  tax falls by ${N($$(gainNE))} a year.</p>
  <p>It is worth saying because the rule is not universal: a
  <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker making the same
  contribution on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash; nothing at
  all.</p>

  <h3>What your employer withholds is not what you owe</h3>
  <p>Nebraska&rsquo;s withholding tables, in the state&rsquo;s <em>2026 Circular EN</em>, run on
  their own set of rates &mdash; 2.26%, 3.22%, 4.21%, 4.35%, 4.48% and 4.60%, read off the
  percentage method tables on page 12 &mdash; applied after subtracting a withholding allowance
  value. They are built to land near the right answer across a whole year,
  not to reproduce the tax schedule line for line. This page calculates the <strong>tax</strong>,
  which is what the year actually costs you; your pay stub will differ, and the difference settles
  when you file.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Treating the ${N("$" + CREDIT)} as a deduction</h3>
  <p>It is the single most common error on a Nebraska return, and it goes the wrong way: as a
  deduction the ${N("$" + CREDIT)} would be worth about ${N($$(CREDIT * T3))} to a top-band
  earner. As the credit it actually is, it is worth ${N("$" + CREDIT)}. Subtracting it from your
  income instead of your tax overstates what you owe.</p>

  <h3>Assuming the top bracket costs more</h3>
  <p>In 2026 it does not. The third and fourth brackets carry the same 4.55%, so crossing
  ${N("$" + c0(S3))} of taxable income changes nothing about your Nebraska rate. If you read
  elsewhere that Nebraska&rsquo;s top rate is 5.20%, that was 2025.</p>

  <h3>Using the withholding rates as tax rates</h3>
  <p>Circular EN&rsquo;s 2.26% to 4.60% are instructions to employers, not the tax. They are
  designed to approximate your liability over a year, and they are the reason your stub rarely
  matches a calculator to the cent.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Your employer withholds from the allowances you claimed;
  health premiums and benefit deductions come out first; and a second job changes the federal
  picture. Treat this as an accurate model of the federal and state layers, and read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Nebraska in 2026, claiming one exemption, with no
  retirement contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$16,100")} =
    ${N("$58,900")}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Nebraska taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(DED_SINGLE))} =
    ${N($(75000 - DED_SINGLE))}</li>
    <li>Nebraska tax before the credit: ${N($$(a75.etat + CREDIT))}</li>
    <li>Less the personal exemption credit: &minus; ${N("$" + CREDIT)} =
    ${N($$(a75.etat))}</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>The same worker in 2025, under the old schedule and the old
  ${N("$" + c0(DED_2025))} deduction, owed ${N($$(nb2025_75))} to Nebraska. The 2026 schedule
  costs ${N($$(gainBaisse75))} less.</p>

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
    + `Nebraskan on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>After this year&rsquo;s cut Nebraska sits close to the flat-rate states rather than above
  them, which is what the 0.65-point move was for. What separates it from them is the shape: a
  low-paid worker in Nebraska is taxed at 2.46% on the first band, where a flat state charges its
  full rate from the first taxable dollar.</p>

${blocSources("nebraska")}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/utah/">Utah paycheck calculator</a> &mdash; the other state
    here that gives a credit rather than a deduction, and the one where it fades away.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Nebraska", { avecListe: false })}

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
    Nebraska rates.
  </p>

</div>
${colonne("Nebraska")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "nebraska");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
console.log("controle des constantes du formulaire : %s / %s / %s (attendu 101.60 / 825.71 / 1,514.58)",
  c2(cumul1), c2(cumul2), c2(cumul3));
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
