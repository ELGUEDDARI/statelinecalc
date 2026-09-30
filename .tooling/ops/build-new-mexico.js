/* Construit /paycheck-calculator/new-mexico/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * New Mexico est le 25e Etat publie. Ce qu'il a de propre :
 *
 *   1. SIX TAUX, IMPRIMES SUR NEUF LIGNES. Le tableau annuel de la retenue
 *      (FYI-104, table 7) repete 3,2 %, 4,3 % et 4,7 % sur deux lignes
 *      consecutives ; replie, il reste six taux : 1,5 / 3,2 / 4,3 / 4,7 /
 *      4,9 / 5,9 %. C'est le premier Etat du site a six taux distincts.
 *   2. UNE BANDE A ZERO QUI N'EST PAS LA DEDUCTION STANDARD FEDERALE. 8 050 $
 *      (single), 16 100 $ (married), 12 075 $ (head of household) : exactement
 *      la MOITIE des deductions standard federales 2026. C'est un constat
 *      arithmetique ; FYI-104 dit seulement que ses tables « reflect the
 *      standard deduction for the year » et ne dit pas pourquoi la moitie.
 *      La page ne l'explique donc pas.
 *   3. LES LARGEURS DE TRANCHES NE DOUBLENT PAS AU MARIAGE. La bande a zero
 *      double (8 050 -> 16 100), mais la premiere tranche passe de 5 500 $ a
 *      8 000 $ et le taux maximum commence a 218 050 $ (single) contre
 *      331 100 $ (married), soit 1,52 fois et non 2 fois. Head of household
 *      reprend les largeurs du couple avec une bande a zero de 12 075 $.
 *   4. UN PETIT PRELEVEMENT QUE PERSONNE N'ATTEND : la redevance
 *      « workers' compensation administration fee », 2,25 $ par trimestre a
 *      la charge du salarie depuis le 1er juillet 2025 (9 $ par an). NON
 *      modelise, mais dit sur la page.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * FYI-104 (rev. 11/2025), tax.newmexico.gov, lu le 30/09/2026 (HTTP 200).
 * Detail complet, chaque citation verbatim : data/rates-2026.js (bloc
 * "new-mexico") et .tooling/lib/sources.js (PAR_ETAT["new-mexico"]).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas la raison de la moitie (FYI-104 ne la donne pas) ;
 *   - pas de montant d'impot exact « sur la declaration » : la retenue est
 *     une estimation creditee ensuite contre l'impot reel (dit par l'agence) ;
 *   - rien sur Married Filing Separately ni sur les salaires supplementaires
 *     dans le calcul (mentionnes seulement comme non modelises) ;
 *   - la PFML : la seule chose lue est une page du DWS qui decrit un groupe de
 *     travail ; la page dit cela, pas « la loi n'existe pas ».
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-new-mexico.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "new-mexico";
const NOM = "New Mexico";
const URL = "https://statelinecalc.com/paycheck-calculator/new-mexico/";
const AUJOURD_HUI = "2026-09-30";
const LISIBLE = "September 30, 2026";

/* --- les valeurs de droit, TOUTES lues dans rates-2026.js ----------------- */
const NM = R.states[CLE].incomeTax;
const DED = NM.standardDeduction;              // 8,050 / 16,100 / 12,075
const BR = NM.brackets;
const TAUX = BR.single.map(b => b[1]);         // 1.5 3.2 4.3 4.7 4.9 5.9
const fedDed = R.federal.standardDeduction;    // 16,100 / 32,200 / 24,150
const WAGE_BASE_UI = 34800;                    // DWS, instantane du 2026-06-15
const FEE_SALARIE = 2.25;                      // par trimestre, depuis le 2025-07-01

/* Le seuil de salaire annuel ou chaque taux commence, par statut. La tranche
   i commence a deduction + plafond de la tranche i-1 (i = 0 : la deduction). */
const debut = (statut, i) => DED[statut] + (i === 0 ? 0 : BR[statut][i - 1][0]);
const S_TOP = debut("single", 5), M_TOP = debut("marriedJoint", 5);
const S_0 = DED.single, M_0 = DED.marriedJoint, H_0 = DED.headOfHousehold;

/* Independant du moteur : les lignes IMPRIMEES par l'agence (FYI-104, table 7),
   utilisees plus bas pour recouper le moteur. */
const AGENCE = {
  single:          { zero: 8050,  ligne: [74550, 2716.50, 0.049] },
  marriedJoint:    { zero: 16100, ligne: [66100, 1739.00, 0.047] },
  headOfHousehold: { zero: 12075, ligne: [62075, 1739.00, 0.047] }
};
const depuisAgence = (statut, brut) => {
  const [seuil, base, taux] = AGENCE[statut].ligne;
  return base + (brut - seuil) * taux;
};

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);

const imposable75 = 75000 - S_0;                // 66,950
const effet = r => r.etat / r.brut * 100;
const gainNM = a75.etat - calcul(CLE, 75000, "single", 0.06).etat;

/* Le premier dollar de salaire sur lequel le moteur prend un cent. */
const seuilImposition = (() => {
  let bas = 0, haut = 50000;
  while (haut - bas > 1) {
    const milieu = Math.floor((bas + haut) / 2);
    if (calcul(CLE, milieu).etat > 0) haut = milieu; else bas = milieu;
  }
  return haut;
})();

/* La decomposition de l'impot a 75 000 $ (single), tranche par tranche. */
const decoupe = (() => {
  const lignes = [];
  let bas = 0, reste = imposable75;
  BR.single.forEach(([plafond, taux]) => {
    if (reste <= 0) return;
    const largeur = Math.min(reste, plafond - bas);
    lignes.push({ largeur, taux, impot: largeur * taux });
    reste -= largeur; bas = plafond;
  });
  return lignes;
})();

/* Voisins deja publies : le Texas est frontalier ; l'Utah touche le Nouveau-
   Mexique au seul point de Four Corners. */
const tx75 = calcul("texas", 75000);
const ut75 = calcul("utah", 75000);

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
const pct = t => (t * 100).toFixed(1) + "%";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le bareme de retenue, replie en six taux, GENERE depuis les donnees. */
const ligneBareme = (i) =>
  "        <tr><th scope=\"row\">" + pct(TAUX[i]) + "</th>"
  + "<td class=\"num\">" + $(debut("single", i)) + "</td>"
  + "<td class=\"num\">" + $(debut("marriedJoint", i)) + "</td>"
  + "<td class=\"num\">" + $(debut("headOfHousehold", i)) + "</td></tr>";
const tableBareme = ["        <tr><th scope=\"row\">0%</th><td class=\"num\">$0</td>"
  + "<td class=\"num\">$0</td><td class=\"num\">$0</td></tr>"]
  .concat(TAUX.map((_, i) => ligneBareme(i))).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the New Mexico income tax rate in 2026?",
   "Six rates, from " + pct(TAUX[0]) + " to " + pct(TAUX[5]) + ": " + TAUX.map(pct).join(", ")
   + ". Which one applies depends on how much of your pay sits in each band. For a single filer, "
   + "the first " + $(S_0) + " of annual wages has nothing withheld, and the " + pct(TAUX[5])
   + " top rate starts above " + $(S_TOP) + ". The state&rsquo;s own table prints nine lines, "
   + "because it repeats " + pct(TAUX[1]) + ", " + pct(TAUX[2]) + " and " + pct(TAUX[3])
   + " on two consecutive lines."],

  ["How much New Mexico income tax is withheld on a $75,000 salary?",
   $$(a75.etat) + " a year for a single filer, which is " + $$(a75.etat / 12) + " a month. "
   + "That is " + pct(a75.etat / a75.brut) + " of gross pay. The figure "
   + "comes straight off the state&rsquo;s table: $2,716.50 plus 4.9% of the $450 above $74,550."],

  ["What is take-home pay on a $75,000 salary in New Mexico?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with "
   + "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, "
   + $(a75.ss + a75.med) + " of Social Security and Medicare and " + $$(a75.etat) + " of New "
   + "Mexico income tax &mdash; an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["At what salary does New Mexico start withholding income tax?",
   "Above " + $(S_0) + " a year for a single filer, " + $(M_0) + " for a married filer and " + $(H_0)
   + " for a head of household. Those are the zero bands printed at the top of the state&rsquo;s "
   + "annual withholding table. Social Security and Medicare apply from the first dollar, and "
   + "federal income tax starts later, above the federal standard deduction (" + $(fedDed.single)
   + " for a single filer)."],

  ["Does New Mexico have local or city income tax?",
   "Not in anything we found. The state&rsquo;s withholding guide, FYI-104, has one set of tables "
   + "and no local, city or county column; the only places it uses the word &ldquo;local&rdquo; "
   + "are &ldquo;local district office&rdquo; and &ldquo;local tax offices.&rdquo; The calculator "
   + "therefore models one state tax and nothing on top of it. We have not checked every "
   + "municipality individually."],

  ["Do New Mexico employees pay for unemployment insurance?",
   "No. The state&rsquo;s Department of Workforce Solutions describes the tax from the employer&rsquo;s "
   + "side: &ldquo;As an employer, you pay UI taxes to fund UI benefits.&rdquo; The 2026 taxable "
   + "wage base is " + $(WAGE_BASE_UI) + " per employee. No employee rate appears on the "
   + "department&rsquo;s tax information page, so the calculator withholds nothing for it."],

  ["Is there a New Mexico state disability or paid family leave deduction?",
   "None that this calculator models, and none in the state&rsquo;s withholding guide. The "
   + "Department of Workforce Solutions&rsquo; page on paid family and medical leave, as archived "
   + "on May 10, 2026, describes a task force developing recommendations for such a law, not a "
   + "program collecting premiums. This page reflects what the state had published as of that date."],

  ["Does New Mexico take a workers&rsquo; compensation fee out of my pay?",
   "Possibly, and it is small. The Taxation and Revenue Department assesses a fee on every "
   + "covered employee to fund the Workers&rsquo; Compensation Administration, and lists the "
   + "employee&rsquo;s share as " + $$(FEE_SALARIE) + " from July 1, 2025. The department&rsquo;s "
   + "older WC-1 instructions, whose dollar amounts are out of date, describe the fee as charged "
   + "per quarter and say the employee&rsquo;s share &ldquo;should be deducted from the wages of "
   + "the employee.&rdquo; If it is charged every quarter, that is at most " + $$(FEE_SALARIE * 4)
   + " a year (4 &times; " + $$(FEE_SALARIE) + ", our arithmetic). It is not part of the "
   + "calculator&rsquo;s total, and it is not the same thing as workers&rsquo; compensation "
   + "insurance, which your employer buys."],

  ["Does a 401(k) contribution lower my New Mexico tax?",
   "In this calculator, yes: the contribution comes out before the state table is applied, the "
   + "same way it does for federal tax, because FYI-104 applies its table to taxable wages. On "
   + "$75,000 with 6% going into a 401(k), the New Mexico figure falls by " + $$(gainNM)
   + " a year, on top of the federal savings."],

  ["What is $20 an hour after taxes in New Mexico?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net)
   + " after tax, which works out to " + $$(h20.netHoraire) + " an hour in real terms. New "
   + "Mexico takes " + $$(h20.etat) + " of that."],

  ["Why is my New Mexico paycheck different from this calculator?",
   "The usual reasons: health insurance premiums and other pre-tax deductions come out before "
   + "tax and are not modeled here, a second job raises federal withholding, and your employer "
   + "withholds from the federal W-4 you actually filled out. New Mexico has no state W-4, so "
   + "the same form drives both. A bonus is different too: the state says a flat "
   + pct(TAUX[5]) + " should be withheld from supplemental wages when federal withholding is a flat "
   + "percentage. The calculator does not model bonuses."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ (&rsquo; &mdash; ...) doivent donc devenir de vrais caracteres dans le
   JSON, sinon les moteurs lisent « state&rsquo;s » a la lettre. Defaut releve
   par controle-statelinecalc le 30/09/2026 ; il existe aussi sur les autres
   Etats recents (non touches ici). */
const dec = s => s.replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&quot;/g, '"')
  .replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "New Mexico withholds state income tax at six rates in 2026, from " + pct(TAUX[0])
  + " to " + pct(TAUX[5]) + ". A single filer has nothing withheld on the first " + $(S_0)
  + " of annual wages, and the " + pct(TAUX[5]) + " rate starts above " + $(S_TOP)
  + ". On $75,000 that is " + $$(a75.etat) + " to the state and about " + $(a75.net)
  + " a year in take-home pay. The state's withholding guide lists no local income tax.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>New Mexico (NM) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free New Mexico (NM) paycheck calculator, 2026. Hourly or salary take-home pay after federal, FICA and NM tax. Six state rates, 1.5% to 5.9%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="New Mexico (NM) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="New Mexico withholds at six rates from 1.5% to 5.9% in 2026, with nothing withheld on the first ${$(S_0)} of a single filer's wages.">
<meta property="og:url" content="${URL}">
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
      "name": "New Mexico Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 New Mexico take-home pay after federal income tax, Social Security, Medicare and New Mexico income tax withheld at six rates from 1.5% to 5.9%."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "New Mexico", "item": "${URL}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        { "@type": "Question", "name": ${JSON.stringify(dec(n))}, "acceptedAnswer": { "@type": "Answer", "text": ${JSON.stringify(dec(a))} } }`).join(",\n")}
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
    <li aria-current="page">New Mexico</li>
  </ol>
</nav>

  <h1>New Mexico Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your New Mexico take-home pay</h2>

    <form class="calc" data-paycheck-form data-state="${CLE}" novalidate>
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
          <span class="help">Sets your federal brackets, and in New Mexico it sets the zero band
          and the width of each rate band &mdash; the six rates themselves stay the same for every
          status.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in New Mexico it
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
    <p>New Mexico withholds at six rates, from ${N(pct(TAUX[0]))} to ${N(pct(TAUX[5]))}, which makes
    it a longer ladder than <a href="/paycheck-calculator/virginia/">Virginia</a>&rsquo;s four
    bands or <a href="/paycheck-calculator/north-dakota/">North Dakota</a>&rsquo;s three. The state
    prints them on nine lines in its annual table, because three of the rates run across two
    consecutive lines, but there are only six distinct rates.</p>

    <p>The calculator applies four deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>New Mexico income tax</strong>: nothing on the first ${N($(S_0))} of a single
      filer&rsquo;s wages (${N($(M_0))} married, ${N($(H_0))} head of household), then ${N(pct(TAUX[0]))}
      on the next ${N($(BR.single[0][0]))}, and so on up the ladder to ${N(pct(TAUX[5]))}.</li>
    </ul>

    <p>The state layer follows the state&rsquo;s own withholding method. Rates come from the agencies
    that set them: the IRS for the federal brackets, the standard deduction and FICA, cross-checked
    against the Social Security Administration for the wage base; and for the state layer, the
    <strong>New Mexico Taxation and Revenue Department</strong>&rsquo;s publication FYI-104,
    <em>New Mexico Withholding Tax</em>, effective January 1, 2026, read directly from
    tax.newmexico.gov on <time datetime="${AUJOURD_HUI}">${LISIBLE}</time>. Our full sourcing is
    on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> FYI-104 describes New
    Mexico withholding as &ldquo;an estimate of an employee or individual&rsquo;s New Mexico income
    tax liability,&rdquo; credited afterward against the tax you actually owe on your return. So a
    withholding calculator shows what an employer should take from each check, and what you owe
    or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it does not itemize deductions, model Married
    Filing Separately, handle multiple jobs or dependents, apply the flat rate the state uses for
    bonuses and other supplemental wages, or account for health insurance premiums and other
    employer benefit deductions.</p>
  </div>

  <h2>New Mexico take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  New Mexico column follows the state&rsquo;s annual withholding table: nothing on the first
  ${N($(S_0))}, then the six-rate ladder.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 New Mexico take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">NM state tax</th>
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

    <h2>Where each New Mexico rate starts</h2>
    <p>The table below is the state&rsquo;s annual withholding schedule folded down to its six
    rates. Each row shows the annual wage at which that rate begins, by filing status. Nothing is
    withheld on wages up to the first figure.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 New Mexico withholding: annual wages above which each rate applies
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Single</th>
          <th scope="col">Married</th>
          <th scope="col">Head of household</th>
        </tr>
      </thead>
      <tbody>
${tableBareme}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>New Mexico hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in New Mexico</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare and New Mexico income tax, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your account &mdash; is ${N($$(h20.netHoraire))}. New Mexico&rsquo;s share of it is
    ${N($$(h20.etat))} for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Because New Mexico&rsquo;s rates step up as
    pay rises, the state takes ${N($$(h30.etat))} of the $30 wage, or ${N((effet(h30)).toFixed(2) + "%")}
    of gross pay, against ${N($$(h25.etat))} of the $25 one, or ${N((effet(h25)).toFixed(2) + "%")}: a
    larger share of the pay falls in the higher bands.</p>

    <h3>Overtime and shift differentials</h3>
    <p>Overtime and shift differentials are wages, and the state&rsquo;s withholding tables apply to
    wages. If overtime or a bonus is paid separately from your regular wages, the state&rsquo;s
    withholding guide recommends its Table 8 for that pay; this calculator does not use it. Instead
    it handles overtime the way it handles any other pay: the higher your annual total, the further
    up the six-rate ladder it reaches. If you work variable hours, enter the average you expect for
    the year.</p>

    <h3>New Mexico take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 New Mexico take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in New Mexico</h2>

  <h3>Six rates, printed on nine lines</h3>
  <p>The state&rsquo;s annual table lists nine taxed bands for a single filer, after the zero band, and three rates
  (${N(pct(TAUX[1]))}, ${N(pct(TAUX[2]))} and ${N(pct(TAUX[3]))}) each fill two consecutive lines with the same
  percentage. Read down the page and you meet ${N(pct(TAUX[0]))}, ${N(pct(TAUX[1]))}, ${N(pct(TAUX[1]))},
  ${N(pct(TAUX[2]))}, ${N(pct(TAUX[2]))}, ${N(pct(TAUX[3]))}, ${N(pct(TAUX[3]))}, ${N(pct(TAUX[4]))} and
  ${N(pct(TAUX[5]))}. On ${N("$25,000")} the state takes ${N($$(a25.etat))}, an effective rate of
  ${N(effet(a25).toFixed(2) + "%")}. On ${N("$250,000")} it takes ${N($$(a250.etat))}, or
  ${N(effet(a250).toFixed(2) + "%")}, because more of a high income is taxed at the higher rates.</p>

  <h3>The zero band is half the federal standard deduction</h3>
  <p>For a single filer the withholding table taxes nothing up to ${N($(S_0))}. That is exactly half
  of the ${N($(fedDed.single))} federal standard deduction; the married figure of ${N($(M_0))} is half
  of ${N($(fedDed.marriedJoint))}, and the head-of-household figure of ${N($(H_0))} is half of
  ${N($(fedDed.headOfHousehold))}. FYI-104 says only that its tables reflect the standard deduction
  for the year, and does not explain the halving, so we use the bands as the state prints them.</p>

  <h3>Married does not simply double</h3>
  <p>The zero band doubles from ${N($(S_0))} to ${N($(M_0))}, but the bands above it do not. A single
  filer&rsquo;s first ${N(pct(TAUX[0]))} band is ${N($(BR.single[0][0]))} wide; a married filer&rsquo;s
  is ${N($(BR.marriedJoint[0][0]))}. The top rate begins at ${N($(S_TOP))} of wages for a single
  filer and ${N($(M_TOP))} for a married one, about ${N((M_TOP / S_TOP).toFixed(2))} times as high,
  not twice. Head of household uses the same band widths as a married couple, with its own
  ${N($(H_0))} zero band. On the same ${N("$75,000")}, New Mexico takes ${N($$(a75.etat))} from a
  single filer, ${N($$(h75.etat))} from a head of household and ${N($$(j75.etat))} from a married
  couple filing jointly.</p>

  <h3>We found no local income tax in New Mexico</h3>
  <p>The state&rsquo;s withholding guide has a single table for each pay period and no local,
  city or county tables. We found nothing to add on top of the state tax, and we say so rather
  than claim we checked every municipality one by one.</p>

  <h3>Unemployment insurance is not deducted from your pay</h3>
  <p>Some states take an employee contribution for unemployment coverage;
  <a href="/paycheck-calculator/alaska/">Alaska</a> is one example on this site. New Mexico&rsquo;s
  Department of Workforce Solutions describes the tax from the employer&rsquo;s side &mdash;
  &ldquo;As an employer, you pay UI taxes to fund UI benefits&rdquo; &mdash; and sets the 2026
  taxable wage base at ${N($(WAGE_BASE_UI))}. No employee rate is published, so the calculator
  takes nothing for it.</p>

  <h3>A small state fee you may not expect</h3>
  <p>New Mexico charges each covered employee a workers&rsquo; compensation administration fee.
  The state lists the employee&rsquo;s share as ${N($$(FEE_SALARIE))} from July 1, 2025. The
  department&rsquo;s older WC-1 instructions, whose dollar amounts are out of date, describe the fee
  as charged per quarter and say the employee&rsquo;s share &ldquo;should be deducted from the wages
  of the employee.&rdquo; If it is charged every quarter, that is at most ${N($$(FEE_SALARIE * 4))} a
  year (4 &times; ${N($$(FEE_SALARIE))}, our arithmetic). It is not in the calculator&rsquo;s total,
  and it is a different thing from the workers&rsquo; compensation insurance policy your employer
  carries.</p>

  <h3>Your 401(k) contribution lowers your New Mexico tax</h3>
  <p>The calculator takes your 401(k) contribution out before it applies the state table, because
  FYI-104 applies its table to taxable wages. On ${N("$75,000")} with 6% going in, your New Mexico
  tax falls by ${N($$(gainNM))} a year, on top of the federal savings.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Applying the top rate to your whole paycheck</h3>
  <p>The ${N(pct(TAUX[5]))} rate is the last step of the ladder, not the price of every dollar. For a
  single filer it applies only to wages above ${N($(S_TOP))}; on ${N("$75,000")} the state&rsquo;s
  effective rate is ${N(effet(a75).toFixed(2) + "%")}.</p>

  <h3>Expecting a married couple&rsquo;s bands to be double</h3>
  <p>Only the zero band doubles. The bands above it are wider by different amounts, so a married
  filer&rsquo;s state tax is not simply half of a single filer&rsquo;s on twice the income. Pick the
  filing status you actually use.</p>

  <h3>Applying your usual rate to a bonus</h3>
  <p>FYI-104 says that when federal withholding on supplemental wages is a flat percentage,
  &ldquo;a flat ${N(pct(TAUX[5]))} of the supplemental wage or fringe benefit amount should be withheld for
  state tax purposes.&rdquo; A bonus can therefore be withheld at ${N(pct(TAUX[5]))} even if your ordinary
  pay sits in a lower band. This calculator does not model bonuses.</p>

  <h3>Reading withholding as the tax you owe</h3>
  <p>The state calls it an estimate credited against your actual liability. A large refund or a
  balance due when you file does not mean the withholding table was applied wrongly.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer withholds from the federal W-4 you actually filled out
  &mdash; New Mexico has no state W-4, and the state suggests using a copy of the federal form. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in New Mexico in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>New Mexico wages above the ${N($(S_0))} zero band: ${N($(a75.brut))} &minus; ${N($(S_0))} =
    ${N($(imposable75))}</li>
${decoupe.map(l => `    <li>${N($(l.largeur))} &times; ${N(pct(l.taux))} = ${N($$(l.impot))}</li>`).join("\n")}
    <li>New Mexico tax: ${N($$(a75.etat))}. The same figure from the state&rsquo;s printed line for
    wages between $74,550 and $218,050: $2,716.50 + 4.9% &times; $450 = ${N($$(depuisAgence("single", 75000)))}</li>
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
    <li><a href="/paycheck-calculator/texas/">Texas</a> &mdash; ${$(tx75.net)} take-home, an effective
    rate of ${(tx75.taux * 100).toFixed(1)}%. A Texas worker keeps ${$$(tx75.net - a75.net)} more
    than a New Mexican on the same salary.</li>
    <li><a href="/paycheck-calculator/utah/">Utah</a> &mdash; ${$(ut75.net)} take-home, an effective
    rate of ${(ut75.taux * 100).toFixed(1)}%. A Utah worker keeps ${$$(a75.net - ut75.net)} less
    than a New Mexican on the same salary.</li>
  </ul>
  <p>Of the four states that share a border line with New Mexico (Arizona, Colorado, Oklahoma and
  Texas), only Texas is on this site so far, and
  <a href="/paycheck-calculator/texas/">Texas</a> has no state income tax at all, which is why the
  whole ${N($$(a75.etat))} of New Mexico tax is the gap. Utah, which touches New Mexico at Four
  Corners, is on this site too.
  <a href="/paycheck-calculator/utah/">Utah</a> runs a single flat rate and offsets it with a credit
  instead of a ladder of bands, and on this salary its state bill is ${N($$(ut75.etat))} against
  New Mexico&rsquo;s ${N($$(a75.etat))}.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a>
    &mdash; the bordering state with no income tax at all.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula, every 2026 figure
    with its official source, and what these calculators deliberately do not model.</li>
    <li><a href="/disclaimer/">Why your pay stub will differ</a> &mdash; pre-tax deductions,
    credits and W-4 settings, and how much difference is normal.</li>
  </ul>

  </div>

${carteUsa(NOM, { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${listeEtats}
  </ul>

  <p class="dates">
    Published <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Last updated <time datetime="${AUJOURD_HUI}">${LISIBLE}</time>.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 federal and
    New Mexico rates.
  </p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", CLE);
fs.mkdirSync(dossier, { recursive: true });
fs.writeFileSync(path.join(dossier, "index.html"), require("../lib/jsonld.js").nettoieJsonLd(html), "utf8");

const mots = html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
  .split(/\s+/).filter(Boolean).length;
console.log("page ecrite : %d mots, %d H2, %d H3, %d lignes de tableau",
  mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length,
  (html.match(/<tr>/g) || []).length);

/* Garde-fous : recoupement independant contre les lignes IMPRIMEES par
   l'agence, pas contre notre propre moteur. */
const verifs = [["single", a75], ["marriedJoint", j75], ["headOfHousehold", h75]];
for (const [statut, r] of verifs) {
  const attendu = depuisAgence(statut, 75000);
  if (Math.abs(attendu - r.etat) > 0.005) {
    console.error("ARRET : %s a 75 000 $ : agence %s, moteur %s", statut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
if (Math.abs(decoupe.reduce((t, l) => t + l.impot, 0) - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition tranche par tranche ne retombe pas sur le moteur");
  process.exit(2);
}
if (BR.single.length !== 6 || TAUX.some((t, i) => t !== BR.marriedJoint[i][1])) {
  console.error("ARRET : les six taux doivent etre identiques pour tous les statuts");
  process.exit(2);
}
if (S_0 * 2 !== fedDed.single || M_0 * 2 !== fedDed.marriedJoint || H_0 * 2 !== fedDed.headOfHousehold) {
  console.error("ARRET : la bande a zero n'est plus exactement la moitie de la deduction federale ; reecrire la section");
  process.exit(2);
}
const nbMotsReponse = reponse.split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
if (seuilImposition !== S_0 + 1) {
  console.error("ARRET : le premier dollar impose (%d) n'est pas %d", seuilImposition, S_0 + 1);
  process.exit(2);
}
console.log("recoupements agence (single, married, HoH a 75 000 $) : OK ; reponse directe %d mots", nbMotsReponse);
