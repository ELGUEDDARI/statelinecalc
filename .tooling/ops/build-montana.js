/* Construit /paycheck-calculator/montana/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le Montana est le 15e Etat publie. Ce qu'il a de propre, et qu'aucune des 14
 * autres pages ne peut dire :
 *
 *   1. IL N'A PAS DE DEDUCTION STANDARD A LUI. Son revenu imposable part du
 *      revenu imposable FEDERAL (MCA 15-30-2120), donc la deduction qui
 *      s'applique est la deduction federale. Ce n'est pas un pis-aller de ma
 *      part : la table de retenue de l'Etat imprime elle-meme 16 100 / 32 200 /
 *      24 150 comme bande a 0 %, au dollar pres.
 *   2. SON BAREME A PLUS QUE DOUBLE LE 1er JANVIER 2026, et il rebouge en 2027.
 *      21 100 $ -> 47 500 $ de premiere tranche, taux haut 5,9 % -> 5,65 %.
 *      La loi porte deja sa version 2027 : 65 000 $ et 5,4 %. Trois baremes en
 *      trois ans, ecrits dans la meme section de code.
 *   3. SA PROPRE TABLE ARRONDIT UNE CASE A L'ENVERS. Le guide dit « All amounts
 *      to be withheld must be rounded up to the nearest dollar ». Quatorze des
 *      quinze constantes « A » suivent cette regle. La quinzieme, mensuel marie
 *      conjoint, imprime 372 $ la ou 4 465 / 12 = 372,08 arrondi vers le haut
 *      donne 373 $. Un dollar par mois, verifiable par n'importe qui.
 *
 * ── LA VERIFICATION QUI DONNE CONFIANCE DANS LE MOTEUR ──────────────────────
 * Les deux sources ne parlent pas de la meme grandeur : la table de retenue
 * part du BRUT, la loi du REVENU IMPOSABLE. L'ecart entre les deux doit valoir
 * exactement la deduction, et le « A » imprime doit valoir 4,7 % de la largeur
 * de la premiere tranche. Les six egalites tombent juste :
 *   63 600 - 16 100 = 47 500   4,7 % x 47 500 = 2 232,50 -> 2 233 imprime
 *   127 200 - 32 200 = 95 000  4,7 % x 95 000 = 4 465,00 -> 4 465 imprime
 *   95 400 - 24 150 = 71 250   4,7 % x 71 250 = 3 348,75 -> 3 349 imprime
 * Et les neuf exemples chiffres du guide sont reproduits par notre moteur a
 * moins d'un dollar (le guide arrondit chaque retenue au dollar superieur).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - rien sur un impot municipal : le guide de retenue ne decrit qu'une seule
 *     retenue d'Etat, mais aucune source ne dit en toutes lettres qu'aucune
 *     ville ne preleve. On ne l'ecrit donc pas ;
 *   - rien sur le taux reduit des plus-values a long terme (3 % / 4,1 %,
 *     MCA 15-30-2103(2)) : ce n'est pas du salaire, ca ne sort pas d'une fiche
 *     de paie, et l'y melanger embrouillerait le lecteur ;
 *   - rien sur le credit d'impot sur le revenu gagne du Montana (porte a 20 %
 *     du credit federal en 2026) : il depend du foyer et des enfants, que le
 *     calculateur ne demande pas.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/sources/montana.md.
 * Guide de l'employeur 2026 (PDF, 985 472 octets), MCA 15-30-2103, MCA
 * 15-30-2120 et le manuel de l'assurance chomage (PDF, 858 745 octets), tous
 * lus le 10/09/2026, HTTP 200.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-montana.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "montana";

/* --- les valeurs de droit citees dans la prose --------------------------- */
/* MCA 15-30-2103 (Temporary), et guide de l'employeur 2026. */
const T1 = 0.047, T2 = 0.0565;
const S_SINGLE = 47500, S_JOINT = 95000, S_HOH = 71250;   // seuils d'imposable
const DED_SINGLE = 16100, DED_JOINT = 32200, DED_HOH = 24150;
/* Les bandes de la table de retenue, periode annuelle, celibataire. */
const ZERO_SINGLE = 16100, HAUT_SINGLE = 63600, A_SINGLE = 2233;
const A_JOINT = 4465, A_HOH = 3349;
const A_JOINT_MENSUEL_IMPRIME = 372;                      // 4 465 / 12 = 372,08
/* revenue.mt.gov, « 2025 Montana Tax Tables and Deductions ». */
const S_2025 = 21100, T2_2025 = 0.059;
/* MCA 15-30-2103 (Effective January 1, 2027). */
const S_2027 = 65000, T2_2027 = 0.054;

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

/* La baisse, mesuree sur le MEME revenu imposable : on compare deux baremes,
   pas deux annees fiscales entieres. Ecrire l'inverse supposerait connaitre la
   deduction federale 2025, qui n'est pas dans ce depot et qu'on ne devine pas.
   Le lecteur voit donc l'effet de la LOI du Montana, isole. */
const B_2025 = [[S_2025, T1], [Infinity, T2_2025]];
const B_2027 = [[S_2027, T1], [Infinity, T2_2027]];
const imposable75 = 75000 - DED_SINGLE;
const mt2025_75 = progressiveTax(imposable75, B_2025);
const mt2027_75 = progressiveTax(imposable75, B_2027);
const gainBaisse75 = mt2025_75 - a75.etat;
const gain2027_75 = a75.etat - mt2027_75;
const ecartSeuil = S_SINGLE - S_2025;
/* Le cas 75 000 $ traverse les DEUX bandes : 58 900 $ d'imposable contre un
   seuil a 47 500 $. Une premiere version de cette page ecrivait « tout dans la
   premiere bande » — le test navigateur l'a demasquee en rendant 2 876,60 $ la
   ou 4,7 % de 58 900 $ font 2 768,30 $. On decompose donc, et on le VERIFIE
   contre le moteur en fin de fichier. */
const part1_75 = S_SINGLE * T1;
const hautBande75 = imposable75 - S_SINGLE;
const part2_75 = hautBande75 * T2;

/* Le taux effectif d'Etat : la deduction est un montant fixe, donc elle abrite
   une part plus grande d'un petit salaire. */
const effet = r => r.etat / r.brut * 100;

/* Le salaire ou le taux haut commence a mordre : imposable = seuil. */
const salaireT2 = S_SINGLE + DED_SINGLE;                  // 63 600 $

/* Le seuil ou le Montana prend son premier cent. Cherche par le moteur, pas
   calcule de tete : si un jour l'Etat ajoute un credit, ceci reste juste. */
const seuilImposition = (() => {
  let bas = 0, haut = 200000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* Le 401(k) : le Montana part du revenu imposable federal, donc il suit. */
const PCT_401K = 0.06;
const gainMT = a75.etat - calcul(CLE, 75000, "single", PCT_401K).etat;
const pa75 = calcul("pennsylvania", 75000);
const gainPA = pa75.etat - calcul("pennsylvania", 75000, "single", PCT_401K).etat;

const voisins = ["nebraska", "utah", "north-carolina", "washington"].map(k => ({
  cle: k, r: calcul(k, 75000)
}));
const NOMS = { nebraska: "Nebraska", utah: "Utah",
               "north-carolina": "North Carolina", washington: "Washington" };

/* « An Illinois worker », « a Utah worker » : le son commande, pas
   l'orthographe. Les cinq voyelles moins le U, qui se dit « you ». */
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
  ["What is the Montana income tax rate in 2026?",
   "Two rates: 4.7% and 5.65%. For a single filer the 4.7% covers the first $" + c0(S_SINGLE)
   + " of Montana taxable income and 5.65% applies above that. Married filing jointly the first "
   + "band runs to $" + c0(S_JOINT) + ", head of household to $" + c0(S_HOH)
   + ". Because Montana starts from your federal taxable income, the 5.65% does not touch a "
   + "single filer until about " + $(salaireT2) + " of salary."],

  ["Does Montana have a standard deduction?",
   "Not one of its own. Montana taxable income starts from your federal taxable income - the "
   + "statute is literally titled “Adjustments to federal taxable income to determine Montana "
   + "taxable income” - so the deduction that applies is the federal one: $" + c0(DED_SINGLE)
   + " single, $" + c0(DED_JOINT) + " married filing jointly, $" + c0(DED_HOH)
   + " head of household for 2026. You can see it in the state's own withholding table, where the "
   + "0% band ends at exactly those three numbers."],

  ["What is take-home pay on a $75,000 salary in Montana?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $(a75.federal) + " of federal income tax, $"
   + c0(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of Montana "
   + "income tax - an effective rate of " + (a75.taux * 100).toFixed(1) + "%. That state figure is "
   + "two pieces: 4.7% on the first $" + c0(S_SINGLE) + " of taxable income, then 5.65% on the $"
   + c0(hautBande75) + " above it."],

  ["How much did Montana income tax fall in 2026?",
   "House Bill 337 did two things at once for tax year 2026: it cut the top rate from 5.9% to "
   + "5.65%, and it more than doubled the first bracket, from $" + c0(S_2025) + " to $"
   + c0(S_SINGLE) + " for a single filer. The second change is the bigger one. On $"
   + c0(imposable75) + " of taxable income the 2025 schedule took " + $$(mt2025_75)
   + " and the 2026 schedule takes " + $$(a75.etat) + " - " + $$(gainBaisse75) + " less."],

  ["Is Montana cutting income tax again in 2027?",
   "Yes, and it is already written into the law rather than proposed. The same section of the "
   + "Montana Code carries a version marked “Effective January 1, 2027”: 4.7% on the "
   + "first $" + c0(S_2027) + " for a single filer, then 5.4%. On the same $" + c0(imposable75)
   + " of taxable income that would be " + $$(mt2027_75) + ", another " + $$(gain2027_75)
   + " less than 2026. The 2026 schedule on this page is marked “Temporary” and "
   + "terminates on December 31, 2026."],

  ["Do Montana employees pay for unemployment insurance?",
   "No, and the state says so plainly. The Montana Employer Handbook reads: “It is against "
   + "the law to deduct UI taxes from your employees' wages.” Unemployment insurance is an "
   + "employer contribution in Montana. There is no state disability or paid family leave "
   + "deduction either, so the only state line on a Montana pay stub is income tax withholding."],

  ["At what salary does Montana start taking income tax?",
   $(seuilImposition) + " for a single filer - one dollar past the $" + c0(DED_SINGLE)
   + " federal standard deduction, and nothing more, because Montana has no deduction or credit "
   + "of its own to stack on top of it. Below that the state "
   + "takes nothing; the first taxable dollar is taxed at 4.7%. Federal tax and FICA still apply "
   + "well below that line."],

  ["Does a 401(k) contribution lower my Montana tax?",
   "Yes. Montana taxable income starts from your federal taxable income, and the employer guide "
   + "says elective deferrals are “exempt from withholding requirements to the extent that "
   + "the contributions are not included in the employee's adjusted gross income for federal "
   + "income tax purposes.” On $75,000 with 6% going into a 401(k), your Montana tax falls "
   + "by " + $$(gainMT) + ". The rule is not universal: in Pennsylvania the same worker's state "
   + "tax falls by " + $$(gainPA) + " - nothing at all."],

  ["What is $20 an hour after taxes in Montana?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out at " + $$(h20.netHoraire) + " an hour in real terms. Montana "
   + "takes " + $$(h20.etat) + " of that: the first $" + c0(DED_SINGLE) + " is covered by the "
   + "federal standard deduction and the rest is taxed at 4.7%."],

  ["Why is my Montana paycheck smaller than this calculator says?",
   "The usual reasons, plus one that is specific to Montana. Specific: your employer withholds "
   + "from the table in the state's employer guide, which rounds. The guide says every amount "
   + "withheld is “rounded up to the nearest dollar,” and its own monthly constant for "
   + "married filing jointly is printed as $" + A_JOINT_MENSUEL_IMPRIME + " where $"
   + c0(A_JOINT) + " divided by 12 and rounded up would be $" + Math.ceil(A_JOINT / 12)
   + ". Differences of a dollar a period are normal and settle when you file. General: health "
   + "insurance premiums and other benefit deductions come out before tax and are not modelled "
   + "here, and a second job pushes your federal withholding up."]
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
<title>Montana (MT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Montana (MT) paycheck calculator, 2026. Rates of 4.7% and 5.65%, and no state deduction &mdash; Montana starts from your federal taxable income.">
<link rel="canonical" href="https://statelinecalc.com/paycheck-calculator/montana/">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Montana (MT) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Montana more than doubled its first tax bracket in 2026 &mdash; from $21,100 to $47,500 &mdash; and the law already schedules another cut for 2027.">
<meta property="og:url" content="https://statelinecalc.com/paycheck-calculator/montana/">
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
      "name": "Montana Paycheck Calculator",
      "url": "https://statelinecalc.com/paycheck-calculator/montana/",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Calculates 2026 Montana take-home pay after federal income tax, Social Security, Medicare and Montana income tax at 4.7 and 5.65 percent, applied to federal taxable income."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Montana", "item": "https://statelinecalc.com/paycheck-calculator/montana/" }
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
    <li aria-current="page">Montana</li>
  </ol>
</nav>

  <h1>Montana Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Montana taxes income at <strong>4.7% and 5.65%</strong> in 2026, and it has
    <strong>no standard deduction of its own</strong> &mdash; it starts from your federal taxable
    income, so the federal ${N("$" + c0(DED_SINGLE))} does that job. On $75,000 that is
    ${N($$(a75.etat))} to the state and about ${N($(a75.net))} a year in your pocket. The first
    bracket <strong>more than doubled</strong> this year, from ${N("$" + c0(S_2025))} to
    ${N("$" + c0(S_SINGLE))} &mdash; worth ${N($$(gainBaisse75))} on that salary.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Calculate your Montana take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="montana" novalidate>
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
          <span class="help">Sets your federal brackets, and in Montana it moves both the
          deduction &mdash; ${N("$" + c0(DED_SINGLE))}, ${N("$" + c0(DED_JOINT))} or
          ${N("$" + c0(DED_HOH))} &mdash; and the point where 5.65% starts.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in Montana it
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
    <p>Montana is a two-rate state, and the thing worth knowing before you read any other page
    about it is what those rates are applied <em>to</em>. Most states start from your federal
    adjusted gross income and then subtract a deduction they set themselves. Montana starts one
    step further down, from your <strong>federal taxable income</strong> &mdash; the figure that
    already has the federal standard deduction taken out. The statute is titled, word for word,
    &ldquo;Adjustments to federal taxable income to determine Montana taxable income.&rdquo; So
    there is no Montana deduction to look up: the ${N("$" + c0(DED_SINGLE))} that shelters a
    single filer is the federal one.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets. For 2026 that deduction is
      ${N("$" + c0(DED_SINGLE))} single, ${N("$" + c0(DED_JOINT))} married filing jointly,
      ${N("$" + c0(DED_HOH))} head of household.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Montana income tax</strong>: the same federal taxable income, taxed at
      ${N("4.7%")} up to ${N("$" + c0(S_SINGLE))} for a single filer
      (${N("$" + c0(S_JOINT))} joint, ${N("$" + c0(S_HOH))} head of household) and
      ${N("5.65%")} above it.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base;
    and for the state layer, two independent Montana sources &mdash; the <strong>Montana Department
    of Revenue</strong>&rsquo;s <em>Employer and Information Agent Guide with Montana Withholding
    Tax Tables</em>, marked &ldquo;for use beginning January 1, 2026,&rdquo; and
    <strong>Montana Code Annotated 15-30-2103</strong>, the rate statute itself. Both were read on
    <time datetime="2026-09-10">September 10, 2026</time>. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>One check worth stating, because it is what makes these figures trustworthy:</strong>
    those two sources do not describe the same quantity. The withholding table starts from
    <em>gross pay</em>; the statute starts from <em>taxable income</em>. The gap between them
    should be exactly the deduction, and the constant the table prints at the top of its first band
    should be 4.7% of that band&rsquo;s width. It works out to the dollar, three times over:
    ${N("$63,600")} &minus; ${N("$16,100")} = ${N("$47,500")};
    ${N("$127,200")} &minus; ${N("$32,200")} = ${N("$95,000")};
    ${N("$95,400")} &minus; ${N("$24,150")} = ${N("$71,250")} &mdash; the three thresholds the
    statute sets. And 4.7% of those widths gives ${N($$(S_SINGLE * T1))},
    ${N($$(S_JOINT * T1))} and ${N($$(S_HOH * T1))}, against the ${N("$" + c0(A_SINGLE))},
    ${N("$" + c0(A_JOINT))} and ${N("$" + c0(A_HOH))} the table prints. If one number had been
    copied wrong, the equality would break.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, apply
    Montana&rsquo;s reduced rates on long-term capital gains, model the state earned income tax
    credit, handle multiple jobs, or account for health insurance premiums and other employer
    benefit deductions.</p>
  </div>

  <h2>Montana take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  Montana column is 4.7% of your pay above ${N("$" + c0(DED_SINGLE))}, rising to 5.65% on
  anything above ${N($(salaireT2))} of salary.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Montana take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MT state tax</th>
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

    <h2>Montana hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Most hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time salaried schedule rather than most hourly work.
    If you are on 32 hours, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Montana</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and Montana&rsquo;s 4.7%, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually
    puts in your account &mdash; is ${N($$(h20.netHoraire))}. Montana&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. All three are below
    ${N($(salaireT2))}, so every extra hour is taxed by Montana at 4.7% &mdash; the 5.65% band
    does not come into it at these rates.</p>

    <h3>Overtime, tips and shift differentials</h3>
    <p>Montana taxes overtime, tips and shift differentials at the same rate as the rest of your
    pay. For most full-time hourly workers that rate is 4.7%, because reaching 5.65% takes
    ${N($(salaireT2))} of salary. The common complaint that &ldquo;overtime is taxed more&rdquo; is
    a federal effect: extra pay is withheld against a higher federal bracket, and nothing about the
    state layer changes.</p>

    <h3>Montana take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Montana take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Montana</h2>

  <h3>Montana has no standard deduction of its own</h3>
  <p>This is the fact that separates Montana from every other state on this site, and it is easy
  to get wrong because there is simply no Montana figure to look up. Montana&rsquo;s
  taxable income is defined by adjusting your <strong>federal taxable income</strong>, which
  already has the federal standard deduction subtracted. So the amount sheltered before Montana
  takes anything is ${N("$" + c0(DED_SINGLE))} single, ${N("$" + c0(DED_JOINT))} married filing
  jointly, ${N("$" + c0(DED_HOH))} head of household for 2026 &mdash; the federal figures.</p>
  <p>You can see it in the state&rsquo;s own paperwork rather than having to take our word for it.
  The Montana withholding formula, annual payroll period, opens with a band taxed at
  ${N("0.0%")} that ends at ${N("$16,100")} for a single filer, ${N("$32,200")} for a couple
  filing jointly and ${N("$24,150")} for a head of household. Those are the three federal standard
  deductions for 2026, to the dollar.</p>
  <p>The practical consequence: if you itemize on your federal return, Montana follows your
  itemized figure rather than a state standard amount. This calculator assumes the standard
  deduction, which is what the large majority of filers claim.</p>

  <h3>The first bracket more than doubled this year</h3>
  <p>In 2025 a single filer in Montana paid 4.7% on the first ${N("$" + c0(S_2025))} of taxable
  income and ${N("5.9%")} on everything above. In 2026 the 4.7% band runs to
  ${N("$" + c0(S_SINGLE))} and the rate above it is ${N("5.65%")}. House Bill 337, passed in
  2025, did both at once, and the Department of Revenue states the rate change in plain terms in
  its employer guide: <em>in 2025, the rate was 5.9%. This rate decreases in 2026 to 5.65% and in
  2027 to 5.4%.</em></p>
  <p>Of the two changes, the wider bracket matters far more to a typical salary. On
  ${N("$" + c0(imposable75))} of taxable income &mdash; a ${N($(75000))} salary after the federal
  deduction &mdash; the 2025 schedule took ${N($$(mt2025_75))} and the 2026 schedule takes
  ${N($$(a75.etat))}. That is ${N($$(gainBaisse75))} a year, and most of it comes from the
  ${N("$" + c0(ecartSeuil))} of income that moved out of the top band and into the 4.7% one.</p>
  <p>For scale: <a href="/paycheck-calculator/nebraska/">Nebraska</a> cut its top rate 0.65 of a
  point over the same year and <a href="/paycheck-calculator/north-carolina/">North Carolina</a>
  cut 0.26. Montana&rsquo;s rate cut was the smallest of the three, 0.25 of a point &mdash; the
  money here is in the bracket, not the rate.</p>

  <h3>The 2026 schedule is temporary, and 2027 is already law</h3>
  <p>The rate section that sets the figures on this page is marked <em>(Temporary)</em> and
  terminates on <time datetime="2026-12-31">December 31, 2026</time>. The same section already
  publishes its replacement, marked <em>(Effective January 1, 2027)</em>: ${N("4.7%")} on the
  first ${N("$" + c0(S_2027))} for a single filer, ${N("$130,000")} filing jointly,
  ${N("$97,500")} head of household, and ${N("5.4%")} above. On the same
  ${N("$" + c0(imposable75))} of taxable income that comes to ${N($$(mt2027_75))}, a further
  ${N($$(gain2027_75))} below this year.</p>
  <p>That is the current text of the law rather than a proposal or a forecast, which is why we can
  put a number on it. What we will not do is publish 2027 figures as if they were settled: under
  the 2027 text the brackets are inflation-adjusted each November, so the
  ${N("$" + c0(S_2027))} will have moved before it applies.</p>

  <h3>Your employer cannot deduct unemployment insurance from your pay</h3>
  <p>Some states take an employee contribution for unemployment or disability cover;
  <a href="/paycheck-calculator/washington/">Washington</a> is the example on this site, where paid
  family leave and long-term care both come off the stub. Montana does not, and the Montana
  Employer Handbook puts it as a prohibition rather than a preference:
  <em>it is against the law to deduct UI taxes from your employees&rsquo; wages.</em> There is no
  state disability or paid family leave deduction either. On a Montana pay stub, the only state
  line is income tax withholding.</p>

  <h3>Your effective Montana rate stays well under 5.65%</h3>
  <p>The deduction is a fixed dollar amount, so it shelters a larger share of a small salary than a
  large one, and the 4.7% band is wide. On ${N("$25,000")} the state takes ${N($$(a25.etat))}, an
  effective state rate of ${N(effet(a25).toFixed(2) + "%")}. On ${N("$75,000")} it takes
  ${N($$(a75.etat))}, or ${N(effet(a75).toFixed(2) + "%")}. Even on ${N("$250,000")} it is
  ${N(effet(a250).toFixed(2) + "%")}. The headline 5.65% is a ceiling the state approaches slowly
  and never reaches.</p>

  <h3>5.65% does not start until ${N($(salaireT2))} of salary</h3>
  <p>The bracket is set on taxable income, not on gross pay, so the deduction pushes the crossing
  point up by its full amount: ${N("$" + c0(S_SINGLE))} of taxable income plus
  ${N("$" + c0(DED_SINGLE))} of deduction is ${N($(salaireT2))} of salary for a single filer.
  Filing jointly the crossing point is ${N($(S_JOINT + DED_JOINT))}; as a head of household,
  ${N($(S_HOH + DED_HOH))}. Below those lines your entire Montana tax is 4.7%.</p>

  <h3>Filing jointly widens the band and doubles the deduction</h3>
  <p>A couple filing jointly shelters ${N("$" + c0(DED_JOINT))} instead of
  ${N("$" + c0(DED_SINGLE))} and crosses into 5.65% at ${N("$" + c0(S_JOINT))} of taxable income
  instead of ${N("$" + c0(S_SINGLE))} &mdash; both exactly double. That second half is worth
  checking rather than assuming, because a widened bracket is not automatic:
  <a href="/paycheck-calculator/ohio/">Ohio</a>&rsquo;s threshold is the same
  ${N("$26,050")} whether you file alone or jointly, and
  <a href="/paycheck-calculator/nebraska/">Nebraska</a>&rsquo;s first band widens from
  ${N("$4,130")} to ${N("$8,250")} rather than to twice ${N("$4,130")}. On a ${N($(75000))}
  single income, choosing married filing jointly takes the Montana tax from ${N($$(a75.etat))} to
  ${N($$(j75.etat))}.</p>

  <h3>Your 401(k) contribution does reduce your Montana tax</h3>
  <p>Montana taxable income starts from your federal taxable income, and an elective deferral to a
  401(k) or 403(b) is already excluded from that figure. The employer guide says so directly:
  employee contributions to qualifying plans are exempt from withholding
  <em>to the extent that the contributions are not included in the employee&rsquo;s adjusted gross
  income for federal income tax purposes.</em> On ${N("$75,000")} with 6% going in, your Montana
  tax falls by ${N($$(gainMT))} a year.</p>
  <p>It is worth saying because the rule is not universal: a
  <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> worker making the same
  contribution on the same salary sees their state tax fall by ${N($$(gainPA))} &mdash; nothing at
  all.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Looking for a Montana standard deduction</h3>
  <p>There is not one to find, and figures published a few years ago will mislead you. Montana did
  once set its own, as a share of income bounded at both ends: for 2023 the Department of Revenue
  published a <em>maximum</em> standard deduction of ${N("$5,540")} for a single filer and a
  <em>minimum</em> of ${N("$2,460")}. That system is gone. Since the state moved to a federal
  taxable income starting point, the deduction that applies is the federal one, and subtracting a
  second, state-specific amount on top of it would understate your tax. If a figure like
  ${N("$5,540")} turns up in a search result, it is the 2023 ceiling of a rule that no longer
  exists.</p>

  <h3>Using the 2025 bracket</h3>
  <p>${N("$" + c0(S_2025))} was the 2025 figure. Using it for 2026 pushes income into the top band
  ${N("$" + c0(ecartSeuil))} too early and overstates the tax on a ${N($(75000))} salary by
  ${N($$(gainBaisse75))}. If a page shows a Montana top rate of ${N("5.9%")}, it is showing
  last year.</p>

  <h3>Expecting the calculator to match the paystub to the dollar</h3>
  <p>It will not, and no calculator can. Two Montana-specific reasons sit on top of the usual ones.
  First, the withholding table rounds: the guide instructs that every amount withheld is
  <em>rounded up to the nearest dollar</em>, and it notes itself that there &ldquo;may be
  insignificant variances due to rounding&rdquo; between its tables and its formula. Second, one of
  its own constants does not follow that rule &mdash; the monthly table for married filing jointly
  prints ${N("$" + A_JOINT_MENSUEL_IMPRIME)} where ${N("$" + c0(A_JOINT))} divided by 12 and
  rounded up gives ${N("$" + Math.ceil(A_JOINT / 12))}. It is a dollar a month, and it settles when
  you file, but it is a good illustration of why a stub and a tax calculation are two different
  things.</p>
  <p>Beyond that: your employer withholds from the Form MW-4 you filed, health premiums and benefit
  deductions come out first, and a second job changes the federal picture. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Montana in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; ${N("$" + c0(DED_SINGLE))} =
    ${N($(imposable75))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Montana taxable income: the same ${N($(imposable75))} &mdash; Montana starts from the
    federal figure</li>
    <li>Montana tax, first band: ${N("$" + c0(S_SINGLE))} &times; 4.7% =
    ${N($$(part1_75))}</li>
    <li>Montana tax, second band: the remaining ${N($(hautBande75))} &times; 5.65% =
    ${N($$(part2_75))}, giving ${N($$(a75.etat))} in all</li>
    <li><strong>Total withheld: ${N($$(a75.total))}</strong></li>
    <li><strong>Take-home pay: ${N($$(a75.net))} a year</strong>, or
    ${N($$(a75.net / 12))} a month</li>
    <li>Effective tax rate: ${N((a75.taux * 100).toFixed(1) + "%")}</li>
  </ul>
  <p>The same taxable income under the 2025 schedule owed ${N($$(mt2025_75))} to Montana; under
  the 2027 schedule already written into the law it would owe ${N($$(mt2027_75))}.</p>

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
    + `Montanan on the same salary.</li>`;
}).join("\n")}
  </ul>
  <p>Comparing headline rates alone would mislead you here. <a href="/paycheck-calculator/utah/">Utah</a>&rsquo;s
  flat ${N("4.45%")} is lower than either of Montana&rsquo;s rates, and yet a Utah worker on this
  salary pays ${N($$(voisins[1].r.etat))} to the state against Montana&rsquo;s
  ${N($$(a75.etat))} &mdash; because Utah subtracts nothing before applying its rate, while
  Montana shelters ${N("$" + c0(DED_SINGLE))} first. What is taken out before the rate matters as
  much as the rate. <a href="/paycheck-calculator/north-carolina/">North Carolina</a>, at
  ${N("3.99%")} after a ${N("$12,750")} deduction, ends up below both, at
  ${N($$(voisins[2].r.etat))}. The state whose worker clearly keeps more is
  <a href="/paycheck-calculator/washington/">Washington</a>, which has no income tax at all
  &mdash; though it takes two small employee contributions that Montana is forbidden to take.</p>

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/nebraska/">Nebraska paycheck calculator</a> &mdash; the
    other state here that cut its rates for 2026, and by more.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa("Montana", { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="2026-09-10">September 10, 2026</time> &middot;
    Last updated <time datetime="2026-09-10">September 10, 2026</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    Montana rates.
  </p>

</div>
${colonne("Montana")}

</main>

${piedDePage()}

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", "montana");
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");

const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);
console.log("recoupement table de retenue / loi : %s - %s = %s (attendu %s)",
  c0(HAUT_SINGLE), c0(ZERO_SINGLE), c0(HAUT_SINGLE - ZERO_SINGLE), c0(S_SINGLE));
console.log("constante A recalculee : %s / %s / %s (imprime %s / %s / %s)",
  c2(S_SINGLE * T1), c2(S_JOINT * T1), c2(S_HOH * T1), A_SINGLE, A_JOINT, A_HOH);
if (HAUT_SINGLE - ZERO_SINGLE !== S_SINGLE) { console.error("ARRET : recoupement faux"); process.exit(2); }
if (T2 !== 0.0565) { console.error("ARRET : taux haut incoherent"); process.exit(2); }
if (Math.abs(part1_75 + part2_75 - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition du cas 75 000 $ ne retombe pas sur le moteur");
  process.exit(2);
}
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
