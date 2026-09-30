/* Construit /paycheck-calculator/rhode-island/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Rhode Island est le 26e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN SEUL BAREME POUR TOUS LES STATUTS. Le livret de retenue 2026 imprime
 *      ses tables « FOR ALL FILING STATUS TYPES » : trois taux (3,75 / 4,75 /
 *      5,99 %) et deux seuils (82 050 $ et 186 450 $) que le salarie soit
 *      celibataire, marie ou chef de famille.
 *   2. UNE EXEMPTION DE 1 000 $ QUI DISPARAIT D'UN COUP. La retenue soustrait
 *      1 000 $ par exemption declaree sur le RI W-4, mais l'exemption vaut 0 $
 *      quand le salaire annuel depasse 290 800 $. Falaise, pas pente : un
 *      dollar de plus coute environ 60 $ d'impot.
 *   3. UNE ASSURANCE INVALIDITE PAYEE PAR LE SALARIE, MODELISEE. TDI/TCI :
 *      1,1 % des 100 000 premiers dollars de salaire (maximum 1 100 $). Le DLT
 *      donne lui-meme un exemple chiffre (366,08 $ au salaire minimum) que le
 *      moteur retrouve au cent pres. Le chomage, lui, est employeur seul.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * tax.ri.gov (livret de retenue 2026) et dlt.ri.gov : tous deux derriere
 * Cloudflare (403 a curl, WebFetch, Chromium headless ET Chrome visible),
 * lus dans leurs instantanes Internet Archive du 04/08, 15/04 et 09/08/2026.
 * Detail complet, chaque citation verbatim : data/rates-2026.js (bloc
 * "rhode-island") et .tooling/lib/sources.js (PAR_ETAT["rhode-island"]).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Rhode Island n'a pas d'impot local » : aucun document lu ne le
 *     dit en toutes lettres ; la page dit ce que le livret contient ;
 *   - pas de nombre de semaines de TCI : le DLT ecrit « seven weeks » dans un
 *     document et « up to 8 weeks » dans un autre ;
 *   - pas de regle sur le 401(k) : le livret n'en parle pas, la page dit que
 *     le calculateur applique l'ordre federal ;
 *   - pas d'explication de la falaise a 290 800 $ au-dela de ce que dit le
 *     livret.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-rhode-island.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "rhode-island";
const NOM = "Rhode Island";
const URL = "https://statelinecalc.com/paycheck-calculator/rhode-island/";
const AUJOURD_HUI = "2026-09-30";
const LISIBLE = "September 30, 2026";

/* --- les valeurs de droit, TOUTES lues dans rates-2026.js ----------------- */
const RI = R.states[CLE];
const BR = RI.incomeTax.brackets.single;         // [[82050,.0375],[186450,.0475],[Inf,.0599]]
const TAUX = BR.map(b => b[1]);
const S1 = BR[0][0], S2 = BR[1][0];              // 82,050 / 186,450
const EXEMPT = RI.incomeTax.standardDeduction.single;          // 1,000
const FALAISE = RI.incomeTax.deductionPhaseOut.single;         // 290,800
const TDI = RI.employeePrograms[0];
const TDI_TAUX = TDI.rate, TDI_PLAFOND = TDI.wageCap;          // 0.011 / 100,000
const TDI_MAX = TDI_TAUX * TDI_PLAFOND;                        // 1,100
const WAGE_BASE_UI = 30800;                                    // DLT, communique du 2025-12-18
const SMIC_RI = 16;                                            // DLT : « minimum wage of $16.00 an hour »
const fedDed = R.federal.standardDeduction;

/* Independant du moteur : les lignes IMPRIMEES par l'agence (livret 2026,
   table 7 annuelle), utilisees plus bas pour recouper le moteur. */
const AGENCE = [[0, 0.00, 0.0375], [82050, 3076.88, 0.0475], [186450, 8035.88, 0.0599]];
const depuisAgence = (brut) => {
  const imposable = brut - (brut > 290800 ? 0 : 1000);
  let ligne = AGENCE[0];
  AGENCE.forEach(l => { if (imposable > l[0]) ligne = l; });
  return ligne[1] + (imposable - ligne[0]) * ligne[2];
};

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const hMin = calcul(CLE, SMIC_RI * HEURES);
const f0 = calcul(CLE, FALAISE);
const f1 = calcul(CLE, FALAISE + 1);
const saut = f1.etat - f0.etat;
const tdi = r => r.programmes[0].montant;

const imposable75 = 75000 - EXEMPT;              // 74,000
const effet = r => r.etat / r.brut * 100;
const gainRI = a75.etat - calcul(CLE, 75000, "single", 0.06).etat;

/* Voisins terrestres : Massachusetts et Connecticut, non publies. La
   comparaison porte sur trois Etats deja publies, choisis pour ce qu'ils
   montrent : la Pennsylvanie (taux unique + petite retenue salariee),
   le New Hampshire (rien) et Washington (pas d'impot sur le revenu, mais des
   programmes salaries, comme le TDI). */
const REF = 75000;
const COMPARE = [CLE, "pennsylvania", "washington", "new-hampshire"];
const NOMS = { [CLE]: "Rhode Island", pennsylvania: "Pennsylvania", washington: "Washington",
               "new-hampshire": "New Hampshire" };
const total = r => r.etat + r.paidLeave + r.waCares + r.programmes.reduce((t, p) => t + p.montant, 0);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const pa75 = calcul("pennsylvania", REF), nh75 = calcul("new-hampshire", REF), wa75 = calcul("washington", REF);

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
/* Les taux de ce site ont deux decimales significatives (3,75 %, 5,99 %) : un
   toFixed(1) afficherait « 3.8% » et « 6.0% ». */
const pct = t => String(+(t * 100).toFixed(2)) + "%";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le bareme de retenue, GENERE depuis les donnees : la meme ligne pour les
   trois statuts, donc une seule colonne de seuils. */
const tableBareme = [
  [0, S1, AGENCE[0][1]],
  [S1, S2, AGENCE[1][1]],
  [S2, null, AGENCE[2][1]]
].map(([du, au, base], i) =>
  "        <tr><th scope=\"row\">" + pct(TAUX[i]) + "</th>"
  + "<td class=\"num\">" + (au === null ? "Above " + $(du) : $(du) + " to " + $(au)) + "</td>"
  + "<td class=\"num\">" + (au === null ? "Above " + $(du + EXEMPT) : $(du + EXEMPT) + " to " + $(au + EXEMPT)) + "</td>"
  + "<td class=\"num\">" + $$(base) + "</td></tr>").join("\n");

/* La decomposition de l'impot a 75 000 $ (single), tranche par tranche. */
const decoupe = (() => {
  const lignes = [];
  let bas = 0, reste = imposable75;
  BR.forEach(([plafond, taux]) => {
    if (reste <= 0) return;
    const largeur = Math.min(reste, plafond - bas);
    lignes.push({ largeur, taux, impot: largeur * taux });
    reste -= largeur; bas = plafond;
  });
  return lignes;
})();

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Rhode Island income tax rate in 2026?",
   "Three rates: " + TAUX.map(pct).join(", ") + ". The state&rsquo;s withholding tables use the same " +
   "rows for every filing status. After a " + $(EXEMPT) + " allowance, " + pct(TAUX[0]) + " applies to the " +
   "first " + $(S1) + " of taxable wages, " + pct(TAUX[1]) + " to the next " + $(S2 - S1) + ", and " +
   pct(TAUX[2]) + " above " + $(S2) + " of taxable wages."],

  ["How much Rhode Island income tax is withheld on a $75,000 salary?",
   $$(a75.etat) + " a year for a single filer, which is " + $$(a75.etat / 12) + " a month. That is " +
   "(" + $(75000) + " &minus; " + $(EXEMPT) + ") &times; " + pct(TAUX[0]) + ": the whole salary sits in the lowest " +
   "band. Rhode Island also takes " + $$(tdi(a75)) + " for temporary disability insurance, so the " +
   "state&rsquo;s total is " + $$(a75.etat + tdi(a75)) + "."],

  ["What is take-home pay on a $75,000 salary in Rhode Island?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with " +
   "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, " +
   $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) + " of Rhode Island " +
   "income tax and " + $$(tdi(a75)) + " of TDI &mdash; an effective rate of " +
   (a75.taux * 100).toFixed(1) + "%."],

  ["What is the TDI deduction on a Rhode Island paycheck?",
   "Temporary Disability Insurance, which the state&rsquo;s Department of Labor and Training says is " +
   "&ldquo;paid by employees, not employers, through a payroll tax.&rdquo; For 2026 the rate is " +
   pct(TDI_TAUX) + " on the first " + $(TDI_PLAFOND) + " of wages, so the most anyone pays is " +
   $$(TDI_MAX) + ". Temporary Caregiver Insurance (TCI) is part of the same program, not a second " +
   "charge. On $75,000 the deduction is " + $$(tdi(a75)) + " a year, or " + $$(tdi(a75) / 12) +
   " a month."],

  ["Does Rhode Island have local or city income tax?",
   "Not in anything we found. The state&rsquo;s 2026 withholding booklet prints its tables by pay " +
   "period and has no local, city or town table. The calculator therefore models one state " +
   "income tax and the TDI deduction, and nothing on top of them. We have not checked every " +
   "municipality individually."],

  ["Do Rhode Island employees pay for unemployment insurance?",
   "No. The Department of Labor and Training says unemployment benefits are &ldquo;funded entirely " +
   "from state and federal UI taxes paid by Rhode Island employers.&rdquo; The 2026 taxable wage base " +
   "for most employers is " + $(WAGE_BASE_UI) + " per employee. Nothing for it comes out of your pay. " +
   "TDI is different: the same department says employees pay it."],

  ["What happens to the $1,000 allowance on a high salary?",
   "It disappears. The state&rsquo;s withholding table gives each allowance a value of " + $(EXEMPT) +
   " a year, but the value drops to $0 when annual wages are more than " + $(FALAISE) + ". The state&rsquo;s W-4 instructions call this being &ldquo;phased out,&rdquo; but the table shows no partial value in between: " +
   "this calculator withholds " + $$(f0.etat) + " at exactly " + $(FALAISE) + " and " +
   $$(f1.etat) + " at " + $(FALAISE + 1) + ", a jump of about " + $(saut) + " for one more dollar of pay."],

  ["Does a 401(k) contribution lower my Rhode Island tax?",
   "In this calculator, yes: the contribution comes out before the state table is applied, the same " +
   "order it uses for federal tax. The state&rsquo;s withholding booklet does not address retirement " +
   "contributions, so treat that as our modeling choice rather than a quotation. On $75,000 with 6% " +
   "going into a 401(k), the Rhode Island income tax figure falls by " + $$(gainRI) + " a year. The " +
   "TDI figure does not change, because the calculator applies it to gross pay."],

  ["What is $20 an hour after taxes in Rhode Island?",
   "At 40 hours a week, $20 an hour is " + $(h20.brut) + " a year gross and about " + $(h20.net) +
   " after tax, which works out to " + $$(h20.netHoraire) + " an hour in take-home pay. Rhode Island takes " +
   $$(h20.etat) + " in income tax and " + $$(tdi(h20)) + " for TDI."],

  ["Why is my Rhode Island paycheck different from this calculator?",
   "The usual reasons: health insurance premiums and other pre-tax deductions come out before tax " +
   "and are not modeled here, a second job raises federal withholding, and your employer withholds " +
   "from the forms you actually filled out. Rhode Island has its own form, the RI W-4, on which you " +
   "can claim more than one allowance; the calculator assumes one. A bonus is different too: the " +
   "state says its supplemental withholding rate is " + pct(TAUX[2]) + ", and the calculator does not " +
   "model bonuses."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ doivent devenir de vrais caracteres dans le JSON ; nettoieJsonLd le fait
   aussi sur la page entiere a l'ecriture (commit 3a3360a). */
const dec = s => s.replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const { grilleEtats } = require("../lib/etats-publies.js");
const { organisation } = require("../lib/entite.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { colonne } = require("../lib/colonne.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const listeEtats = grilleEtats();

/* La reponse directe : 40 a 60 mots, verifie plus bas. */
const reponse = "Rhode Island withholds income tax at three rates in 2026, from " + pct(TAUX[0])
  + " to " + pct(TAUX[2]) + ", identical for every filing status. It also takes " + pct(TDI_TAUX)
  + " of the first " + $(TDI_PLAFOND) + " of wages for disability insurance. On $75,000, a single filer keeps about "
  + $(a75.net) + " a year. The state's withholding booklet has no local income tax tables.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Rhode Island (RI) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Rhode Island (RI) paycheck calculator, 2026. Hourly or salary take-home pay after federal, FICA, RI tax and TDI. Rates 3.75% to 5.99%.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Rhode Island (RI) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Rhode Island withholds at 3.75%, 4.75% and 5.99% in 2026, and takes 1.1% of the first $100,000 of wages for TDI.">
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
      "name": "Rhode Island Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Rhode Island take-home pay after federal income tax, Social Security, Medicare, Rhode Island income tax withheld at 3.75%, 4.75% and 5.99%, and the 1.1% temporary disability insurance (TDI) deduction."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Rhode Island", "item": "${URL}" }
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
    <li aria-current="page">Rhode Island</li>
  </ol>
</nav>

  <h1>Rhode Island Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Rhode Island take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction. Rhode Island uses the
          same three rates and the same allowance for every status, so it changes nothing at
          state level.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Rhode Island income tax too.</span>
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
    <p>Rhode Island withholds at three rates, from ${N(pct(TAUX[0]))} to ${N(pct(TAUX[2]))}, a shorter
    ladder than <a href="/paycheck-calculator/new-mexico/">New Mexico</a>&rsquo;s six. The state prints
    its withholding tables once, for all filing status types: a single filer, a married filer and a
    head of household all read the same rows. Rhode Island also takes a second deduction that
    has nothing to do with income tax, a temporary disability insurance premium that employees pay.</p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Rhode Island income tax</strong>: your wages minus one ${N($(EXEMPT))} allowance,
      then ${N(pct(TAUX[0]))} on the first ${N($(S1))}, ${N(pct(TAUX[1]))} up to ${N($(S2))}, and
      ${N(pct(TAUX[2]))} above that.</li>
      <li><strong>Rhode Island TDI</strong>: ${N(pct(TDI_TAUX))} of your gross wages up to
      ${N($(TDI_PLAFOND))}.</li>
    </ul>

    <p>The state layer follows the state&rsquo;s own withholding method. Rates come from the agencies
    that set them: the IRS for the federal brackets, the standard deduction and FICA, cross-checked
    against the Social Security Administration for the wage base; and for the state layer, the
    <strong>Rhode Island Division of Taxation</strong>&rsquo;s <em>2026 Employer&rsquo;s Income Tax
    Withholding Tables</em> and the <strong>Department of Labor and Training</strong>&rsquo;s 2026
    rate announcement for TDI, dated December 18, 2025. Both agencies&rsquo; websites refuse
    automated requests, so we read their documents from Internet Archive snapshots, linked in the
    sources below. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The state describes a
    pay-as-you-earn system: each year the employee works out the actual Rhode Island liability,
    pays any balance due, or gets a refund if more was withheld. So a withholding calculator shows what an
    employer should take from each check, and what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it claims one ${N($(EXEMPT))} allowance, yours,
    and does not add allowances for dependents; it does not model Married Filing Separately, multiple jobs, the
    state&rsquo;s separate rules for bonuses and other supplemental wages, or health insurance premiums
    and other employer benefit deductions.</p>
  </div>

  <h2>Rhode Island take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  RI state tax + TDI column adds the state&rsquo;s income tax to its ${N(pct(TDI_TAUX))} disability insurance
  deduction.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Rhode Island take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">RI state tax + TDI</th>
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

    <h2>Where each Rhode Island rate starts</h2>
    <p>The table below is the state&rsquo;s annual withholding schedule. Because the same rows apply
    to every filing status, there is one set of thresholds. The state subtracts the allowance first, so
    each band is shown twice: as taxable wages, and as the annual wages that reach it with one
    ${N($(EXEMPT))} allowance.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Rhode Island withholding: where each rate applies, for every filing status
      </caption>
      <thead>
        <tr>
          <th scope="col">Rate</th>
          <th scope="col">Taxable wages</th>
          <th scope="col">Annual wages, one allowance</th>
          <th scope="col">Tax at the start of the band</th>
        </tr>
      </thead>
      <tbody>
${tableBareme}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Rhode Island hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What $20 an hour comes to in Rhode Island</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Rhode Island income tax and TDI, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your account &mdash; is ${N($$(h20.netHoraire))}. Rhode Island&rsquo;s share is
    ${N($$(h20.etat))} of income tax and ${N($$(tdi(h20)))} of TDI for the year.</p>

    <h3>What $25 and $30 an hour come to</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. All three wages sit inside the lowest
    Rhode Island band, so the state takes ${N(pct(TAUX[0]))} of everything above the allowance
    and ${N(pct(TDI_TAUX))} of the whole wage for TDI: ${N($$(h30.etat + tdi(h30)))} in total at
    $30 an hour, against ${N($$(h25.etat + tdi(h25)))} at $25.</p>

    <h3>What the minimum wage comes to</h3>
    <p>The Department of Labor and Training&rsquo;s own 2026 example is a full-time worker earning the
    ${N($$(SMIC_RI))} minimum wage, who pays ${N("$366.08")} in TDI contributions. This calculator
    gives ${N($$(tdi(hMin)))} for ${N($(hMin.brut))} a year (2,080 hours), the same figure to the
    cent.</p>

    <h3>Overtime</h3>
    <p>The state&rsquo;s booklet lists overtime pay among supplemental wages. Paid with regular wages,
    it is withheld as if the total were one payment for the pay period; paid separately, your employer
    follows a separate method the booklet describes. The calculator multiplies your rate by
    the hours you enter and adds no overtime premium, and it does not model the separate-payment
    method. If you work variable hours, enter the average you expect for the year.</p>

    <h3>Rhode Island take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Rhode Island take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Rhode Island</h2>

  <h3>One withholding table for every filing status</h3>
  <p>The state&rsquo;s tables are headed &ldquo;for all filing status types,&rdquo; and the annual
  table has three lines: ${N(pct(TAUX[0]))} up to ${N($(S1))} of taxable wages, ${N(pct(TAUX[1]))}
  from there to ${N($(S2))}, and ${N(pct(TAUX[2]))} above. On the same ${N("$75,000")}, Rhode Island takes
  ${N($$(a75.etat))} from a single filer, ${N($$(h75.etat))} from a head of household and
  ${N($$(j75.etat))} from a married couple filing jointly. Your filing status still matters
  for federal tax; it just changes nothing on the state line.</p>

  <h3>A ${$(EXEMPT)} allowance that disappears above ${$(FALAISE)}</h3>
  <p>Before the rates apply, the state subtracts ${N($(EXEMPT))} for each allowance you claim on your
  Rhode Island W-4. The calculator claims one. At the ${N(pct(TAUX[0]))} rate each extra allowance is
  worth ${N($$(EXEMPT * TAUX[0]))} a year. But when annual wages are more than ${N($(FALAISE))}, the
  state&rsquo;s table sets the allowance to $0. The state&rsquo;s W-4 instructions call this being &ldquo;phased out,&rdquo; but the table shows no partial value in between, so it works as a cliff: at exactly
  ${N($(FALAISE))} this calculator withholds ${N($$(f0.etat))}, and at ${N($(FALAISE + 1))} it withholds
  ${N($$(f1.etat))}, about ${N($(saut))} more for one more dollar of pay. Few paychecks are
  near that line, and withholding is settled against your actual liability when you file.</p>

  <h3>TDI takes ${pct(TDI_TAUX)} of your first ${$(TDI_PLAFOND)}</h3>
  <p>Temporary Disability Insurance covers wage loss from a non-work-related illness or injury, and
  the state&rsquo;s Department of Labor and Training says it is &ldquo;paid by employees, not employers,
  through a payroll tax.&rdquo; Temporary Caregiver Insurance, which covers time off to bond with a
  new child or care for a seriously ill family member, is part of the same program, so there is one
  deduction, not two. For 2026 the rate is ${N(pct(TDI_TAUX))} on the first ${N($(TDI_PLAFOND))} of
  wages, and the department gives the ceiling itself: a maximum of ${N($$(TDI_MAX))}. We do not
  state how many weeks of caregiver leave the program pays, because the department&rsquo;s own
  pages give two different numbers.</p>

  <h3>TDI stops at ${$(TDI_PLAFOND)}, so it matters most on modest pay</h3>
  <p>On ${N("$75,000")} the deduction is ${N($$(tdi(a75)))}, or ${N(pct(tdi(a75) / 75000))} of pay. On
  ${N("$100,000")} it reaches the ${N($$(tdi(a100)))} ceiling, and on ${N("$250,000")} it is still
  ${N($$(tdi(a250)))}, which is only ${N((tdi(a250) / 250000 * 100).toFixed(2) + "%")} of gross pay. The same
  ${N($(75000))} salary carries a heavier disability-insurance burden than the same
  ${N($(250000))} one, measured as a share of income.</p>

  <h3>We found no local income tax in Rhode Island</h3>
  <p>The state&rsquo;s withholding booklet has a single set of tables for each pay period and no
  local, city or town tables. We found nothing to add on top of the state tax, and we say so rather
  than claim we checked every municipality one by one.</p>

  <h3>Unemployment insurance is not deducted from your pay</h3>
  <p>The Department of Labor and Training says unemployment benefits are &ldquo;funded entirely from
  state and federal UI taxes paid by Rhode Island employers,&rdquo; and sets the 2026 taxable wage base
  for most employers at ${N($(WAGE_BASE_UI))}. Nothing for it is deducted from your check. The
  contrast with TDI is the point: in Rhode Island the employee pays for disability coverage and the
  employer pays for unemployment coverage.</p>

  <h3>You do not have to live in Rhode Island</h3>
  <p>The withholding booklet says Rhode Island employers are required to withhold Rhode Island income
  tax from employees who are residents of other states, insofar as they receive compensation for
  employment in Rhode Island. A Massachusetts or Connecticut resident working in Providence should
  expect the state line on the pay stub. This calculator shows that Rhode Island withholding; it does
  not model what your home state does with it on your return.</p>

  <h3>Your 401(k) contribution and the state tax</h3>
  <p>The calculator takes your 401(k) contribution out before it applies the state table, the same
  order it uses for federal tax. The state&rsquo;s booklet does not address retirement contributions, so
  this is a modeling choice, not a quotation. On ${N("$75,000")} with 6% going in, Rhode Island income
  tax falls by ${N($$(gainRI))} a year. TDI is applied to gross pay, so it does not change.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. This is why take-home pay rises unevenly through the
  year for high earners &mdash; the paycheck after you cross the Social Security wage base is
  visibly larger.</p>

  <h2>Common mistakes people make</h2>

  <h3>Applying the top rate to your whole paycheck</h3>
  <p>The ${N(pct(TAUX[2]))} rate is the last step of the ladder, not the price of every dollar. It
  applies only to taxable wages above ${N($(S2))}; on ${N("$75,000")} the state&rsquo;s effective income
  tax rate is ${N(effet(a75).toFixed(2) + "%")}, and on ${N("$250,000")} it is
  ${N(effet(a250).toFixed(2) + "%")}.</p>

  <h3>Reading the TDI line as income tax</h3>
  <p>TDI is an insurance premium with its own rate and its own ceiling. It does not appear in the
  state&rsquo;s income tax table, and it is ${N(pct(TDI_TAUX))} whatever your filing status. On
  ${N("$75,000")} it is ${N($(tdi(a75)))}, about ${N(Math.round(tdi(a75) / a75.etat * 100) + "%")} of the ${N($(a75.etat))} of
  income tax.</p>

  <h3>Expecting your filing status to change the state number</h3>
  <p>It will not: single, married and head of household read the same table. What changes the state
  figure is the number of allowances on your Rhode Island W-4, not the box you tick on the federal form.</p>

  <h3>Applying your usual rate to a bonus</h3>
  <p>The state&rsquo;s booklet says: &ldquo;The Supplemental withholding rate is ${N(pct(TAUX[2]))}.&rdquo; A
  bonus, commission or back-pay check falls under the state&rsquo;s supplemental wage rules, even if
  your ordinary pay sits in the lowest band. How the rate is applied depends on whether the payment
  comes with regular wages or separately. This calculator does not model bonuses.</p>

  <h3>Reading withholding as the tax you owe</h3>
  <p>Withholding is settled against your actual liability when you file. A large refund or a balance
  due does not mean the withholding table was applied wrongly.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer withholds from the Rhode Island W-4 you actually filled
  out &mdash; the state no longer accepts the federal W-4 for its own withholding. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Rhode Island in 2026, with no retirement
  contribution and one allowance:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Rhode Island taxable wages: ${N($(a75.brut))} &minus; the ${N($(EXEMPT))} allowance =
    ${N($(imposable75))}</li>
${decoupe.map(l => `    <li>${N($(l.largeur))} &times; ${N(pct(l.taux))} = ${N($$(l.impot))}</li>`).join("\n")}
    <li>Rhode Island income tax: ${N($$(a75.etat))}. The same figure from the state&rsquo;s printed first
    line, wages up to $82,050: $0.00 + 3.75% &times; ${N($(imposable75))} = ${N($$(depuisAgence(75000)))}</li>
    <li>Rhode Island TDI: ${N($(a75.brut))} &times; ${N(pct(TDI_TAUX))} = ${N($$(tdi(a75)))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Rhode Island&rsquo;s two neighboring states,
  Massachusetts and Connecticut, are not published on this site yet, so the table lines it up against
  three states we do have: one that taxes wages at a flat rate, one with no income tax, and one
  whose paychecks still carry state payroll programs.</p>
  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        State-level deductions and take-home pay on ${$(REF)}, single filer, 2026
      </caption>
      <thead>
        <tr>
          <th scope="col">State</th>
          <th scope="col">State-level deductions</th>
          <th scope="col">Take-home pay</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${lignesCompare.map(l => `        <tr><th scope="row">${l.cle === CLE ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</th><td class="num">${$$(l.deductions)}</td><td class="num">${$(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
      </tbody>
    </table>
  </div>
  <p><a href="/paycheck-calculator/new-hampshire/">New Hampshire</a> withholds nothing at state level,
  so a New Hampshire worker keeps ${N($$(nh75.net - a75.net))} more than a Rhode Islander on the same
  salary. <a href="/paycheck-calculator/pennsylvania/">Pennsylvania</a> takes a flat 3.07% plus a small
  unemployment-insurance deduction, ${N($$(total(pa75)))} in all, which leaves a Pennsylvanian
  ${N($$(pa75.net - a75.net))} ahead. <a href="/paycheck-calculator/washington/">Washington</a> has no income
  tax, but its Paid Family and Medical Leave and WA Cares premiums still take ${N($$(total(wa75)))},
  against ${N($$(total(a75)))} for Rhode Island&rsquo;s income tax and TDI together. A state with no
  income tax is not the same as a state with nothing withheld.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-hampshire/">New Hampshire paycheck calculator</a>
    &mdash; the only other New England state published so far, with no tax on wages.</li>
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
    Rhode Island rates.
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
const verifs = [["single", a75, 75000], ["marriedJoint", j75, 75000], ["headOfHousehold", h75, 75000],
                ["single", a25, 25000], ["single", a100, 100000], ["single", a250, 250000]];
for (const [statut, r, brut] of verifs) {
  const attendu = depuisAgence(brut);
  if (Math.abs(attendu - r.etat) > 0.01) {
    console.error("ARRET : %s a %d $ : agence %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
if (Math.abs(decoupe.reduce((t, l) => t + l.impot, 0) - a75.etat) > 0.005) {
  console.error("ARRET : la decomposition tranche par tranche ne retombe pas sur le moteur");
  process.exit(2);
}
if (BR.length !== 3 || ["marriedJoint", "headOfHousehold"].some(st =>
    JSON.stringify(RI.incomeTax.brackets[st]) !== JSON.stringify(RI.incomeTax.brackets.single))) {
  console.error("ARRET : les trois taux et les deux seuils doivent etre identiques pour tous les statuts");
  process.exit(2);
}
if (Math.abs(tdi(hMin) - 366.08) > 0.005) {
  console.error("ARRET : le TDI au salaire minimum (%s) ne retombe pas sur les 366,08 $ du DLT", tdi(hMin));
  process.exit(2);
}
if (TDI_MAX !== 1100 || TDI_TAUX !== 0.011 || TDI_PLAFOND !== 100000) {
  console.error("ARRET : le TDI n'est plus 1,1 % sur 100 000 $ (maximum 1 100 $) ; reecrire les sections");
  process.exit(2);
}
if (!(saut > 59 && saut < 61)) {
  console.error("ARRET : la falaise a 290 800 $ ne coute plus environ 60 $ (%s)", saut);
  process.exit(2);
}
const nbMotsReponse = reponse.split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements agence (single, married, HoH a 75 000 $ ; 25 000, 100 000, 250 000 $) : OK ; TDI au salaire minimum = 366,08 $ ; reponse directe %d mots", nbMotsReponse);
