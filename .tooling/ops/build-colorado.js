/* Construit /paycheck-calculator/colorado/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Colorado est le 27e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN TAUX PLAT, UNE ALLOCATION QUI DEPEND DU STATUT. Le DR 1098 (2026)
 *      prescrit aux employeurs : salaire annualise - allocation, x 4,40 %.
 *      Allocation 11 000 $ (couple marie, declaration commune) ou 5 500 $
 *      « otherwise » (chef de famille compris).
 *   2. UNE RETENUE VOLONTAIREMENT GENEREUSE. L'impot Colorado part du revenu
 *      imposable FEDERAL (deduction standard 16 100 $), pas de 5 500 $. Le
 *      DR 0004 le dit lui-meme : la retenue calculee d'apres le W-4 « will
 *      generally result in a refund ». Le W-4 ne peut pas la reduire (regle 5
 *      du DR 1098) ; seul le DR 0004 le peut (Table 1 : 14 000 $ celibataire).
 *   3. UNE ASSURANCE CONGES (FAMLI) PAYEE A MOITIE PAR LE SALARIE : 0,44 % du
 *      salaire brut jusqu'au plafond Social Security (184 500 $), max 811,80 $.
 *   4. DES TAXES LOCALES FORFAITAIRES, NON MODELISEES. Denver 5,75 $/mois,
 *      Greenwood Village 2 $/mois ; Aurora a ABROGE la sienne au 1/1/2025
 *      (page officielle lue en direct le 30/09/2026). Le moteur ne sait pas
 *      exprimer un montant fixe par mois : la page le dit.
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * tax.colorado.gov, famli.colorado.gov, cdle.colorado.gov : 403 a curl et a
 * WebFetch ; lus dans leurs instantanes Internet Archive (DR 1098 du
 * 23/08/2026, DR 0004 du 08/02, guide de l'impot du 26/04, guide de la
 * retenue du 28/02, FAMLI du 18/01, CDLE du 05/12/2025). Les pages de Denver,
 * Aurora et Greenwood Village repondent 200 en direct. Detail complet, chaque
 * citation verbatim : data/rates-2026.js (bloc "colorado") et
 * .tooling/lib/sources.js (PAR_ETAT.colorado).
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de cause a la baisse 2024 (4,25 %) : la table du guide ne nomme
 *     pas TABOR ; la page cite la table et dit « varies by tax year » ;
 *   - pas de « 4,4 % pour l'annee fiscale 2026 » : la table s'arrete a 2025,
 *     le 4,40 % de 2026 vient du DR 1098 (retenue) ;
 *   - pas de regle 401(k) : le guide n'en parle pas ; choix de modelisation ;
 *   - pas de salaire minimum : non source ;
 *   - Glendale / Sheridan : non lus, non cites ; Denver « Revised 1/2021 » :
 *     la page ne pretend pas que le guide est date de 2026.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-colorado.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "colorado";
const NOM = "Colorado";
const URL = "https://statelinecalc.com/paycheck-calculator/colorado/";
const AUJOURD_HUI = "2026-09-30";
const LISIBLE = "September 30, 2026";

/* --- les valeurs de droit, TOUTES lues dans rates-2026.js ----------------- */
const CO = R.states[CLE];
const TAUX = CO.incomeTax.brackets.single[0][1];                 // 0.044
const ALLOC = CO.incomeTax.standardDeduction.single;             // 5,500 (single et HoH)
const ALLOC_HOH = CO.incomeTax.standardDeduction.headOfHousehold;
const ALLOC_MFJ = CO.incomeTax.standardDeduction.marriedJoint;   // 11,000
const FAMLI = CO.employeePrograms[0];
const FAMLI_TAUX = FAMLI.rate, FAMLI_PLAFOND = FAMLI.wageCap;    // 0.0044 / 184,500
const FAMLI_MAX = FAMLI_TAUX * FAMLI_PLAFOND;                    // 811.80
const FAMLI_TOTAL = FAMLI_TAUX * 2;                              // 0.88 %
const WAGE_BASE_UI = 30600;                                      // CDLE, « 2026 chargeable wage base »
const DR0004_SEUL = 14000, DR0004_HOH = 22000, DR0004_MFJ = 30000; // DR 0004, Table 1, 1 emploi
const DENVER_OPT = 5.75, DENVER_SEUIL = 500;                     // Denver Tax Guide Topic 61
const GV_OPT = 2, GV_SEUIL = 250;                                // Greenwood Village
const fedDed = R.federal.standardDeduction;

/* Independant du moteur : les lignes 1c a 2d du DR 1098, une a une. */
const dr1098 = (brut, statut) => {
  const l2a = statut === "marriedJoint" ? 11000 : 5500;
  const l2b = Math.max(0, brut - l2a);
  return l2b * 0.044;
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
const fam = r => r.programmes[0].montant;

const imposable75 = 75000 - ALLOC;                                // 69,500
const effet = r => r.etat / r.brut * 100;
const gain401 = a75.etat - calcul(CLE, 75000, "single", 0.06).etat;
/* Ce que la retenue prend en plus de l'impot calcule sur le revenu imposable
   federal : (deduction standard federale - allocation) x 4,4 %. Arithmetique
   de la page, avec ses hypotheses dites : pas d'ajouts/soustractions Colorado,
   pas de credits. */
const ECART_DED = fedDed.single - ALLOC;                          // 10,600
const ECART_IMPOT = ECART_DED * TAUX;                             // 466.40
const impotFinal75 = (75000 - fedDed.single) * TAUX;              // 2,591.60
const GAIN_DR0004 = (DR0004_SEUL - ALLOC) * TAUX;                 // 374.00
const DENVER_AN = DENVER_OPT * 12;                                // 69

/* Voisins terrestres publies : Wyoming, Nebraska, New Mexico, Utah. Kansas n'est pas publie ;
   Oklahoma l'est depuis le 06/10/2026 mais n'est pas dans le tableau (4 voisins). */
const REF = 75000;
const COMPARE = [CLE, "wyoming", "nebraska", "new-mexico", "utah"];
const NOMS = { [CLE]: "Colorado", wyoming: "Wyoming", nebraska: "Nebraska", "new-mexico": "New Mexico", utah: "Utah" };
const total = r => r.etat + r.paidLeave + r.waCares + r.programmes.reduce((t, p) => t + p.montant, 0);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const wy75 = calcul("wyoming", REF), ne75 = calcul("nebraska", REF), nm75 = calcul("new-mexico", REF), ut75 = calcul("utah", REF);

const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";
/* Les taux de ce site ont deux decimales significatives (0,44 %, 4,4 %). */
const pct = t => String(+(t * 100).toFixed(2)) + "%";

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau de la formule de retenue, GENERE depuis les donnees. */
const tableFormule = [
  ["Single", "single", ALLOC],
  ["Head of household", "headOfHousehold", ALLOC_HOH],
  ["Married filing jointly or qualifying surviving spouse", "marriedJoint", ALLOC_MFJ]
].map(([lib, st, alloc]) => {
  const r = calcul(CLE, 75000, st);
  return "        <tr><th scope=\"row\">" + lib + "</th>"
    + "<td class=\"num\">" + $(alloc) + "</td>"
    + "<td class=\"num\">" + $$(r.etat) + "</td></tr>";
}).join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Colorado income tax rate in 2026?",
   "Colorado withholds at one flat rate in 2026: " + pct(TAUX) + ". The Department of Revenue&rsquo;s 2026 " +
   "withholding worksheet multiplies annual wages, after a " + $(ALLOC) + " allowance ($" + c0(ALLOC_MFJ) +
   " if married filing jointly), by 4.40%. There are no brackets. The department&rsquo;s guide says the " +
   "income tax rate varies by tax year and lists it only through 2025 (4.25% for 2024, 4.4% for 2025), so " +
   "we cannot confirm the rate on your 2026 return from what we read."],

  ["How much Colorado income tax is withheld on a $75,000 salary?",
   $$(a75.etat) + " a year for a single filer, which is " + $$(a75.etat / 12) + " a month. That is " +
   "(" + $(75000) + " &minus; " + $(ALLOC) + ") &times; " + pct(TAUX) + ". A married couple filing jointly " +
   "has " + $(ALLOC_MFJ) + " subtracted instead, which gives " + $$(j75.etat) + " on the same salary. " +
   "Colorado also takes " + $$(fam(a75)) + " for FAMLI, so the state&rsquo;s total is " +
   $$(a75.etat + fam(a75)) + "."],

  ["What is take-home pay on a $75,000 salary in Colorado?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with " +
   "no retirement contribution. That is after " + $$(a75.federal) + " of federal income tax, " +
   $(a75.ss + a75.med) + " of Social Security and Medicare, " + $$(a75.etat) + " of Colorado " +
   "income tax and " + $$(fam(a75)) + " of FAMLI &mdash; an effective rate of " +
   (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in Colorado?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are " +
   "single-filer figures after federal tax, FICA, Colorado tax and FAMLI, with no retirement contribution."],

  ["What is the FAMLI deduction on a Colorado paycheck?",
   "Colorado&rsquo;s Family and Medical Leave Insurance premium. The FAMLI Division&rsquo;s employer page, " +
   "as archived in January 2026, says premiums are set at 0.88% of wages, &ldquo;with 0.44% paid by the " +
   "employer and 0.44% paid by the employee,&rdquo; on wages up to the Federal Social Security Wage Cap. The Social " +
   "Security Administration sets that cap at " + $(FAMLI_PLAFOND) + " for 2026, so the most an employee pays is " +
   $$(FAMLI_MAX) + ". On $75,000 the deduction is " + $$(fam(a75)) + " a year, or " + $$(fam(a75) / 12) +
   " a month. The division adds that some employers may choose not to deduct the premium from employees&rsquo; " +
   "wages, and that it reviews the rate every year."],

  ["Why is Colorado withholding higher than the Colorado tax I owe?",
   "Often it is, because the withholding formula subtracts only " + $(ALLOC) + ", while Colorado income tax " +
   "starts from your federal taxable income, which already reflects the federal standard deduction of " + $(fedDed.single) +
   " for a single filer. The state&rsquo;s own withholding certificate says the method based on your W-4 " +
   "&ldquo;will generally result in a refund when you file your Colorado income tax return.&rdquo; Our arithmetic, " +
   "assuming the standard deduction, a 4.4% rate on your 2026 return and no Colorado additions, subtractions or " +
   "credits: about " + $(ECART_IMPOT) + " a year of extra withholding on a single $75,000 salary."],

  ["Do Colorado cities tax paychecks?",
   "Some charge a small fixed amount per month, not a percentage of pay. Denver&rsquo;s tax guide (revised 1/2021) lists an " +
   "employee occupational privilege tax of " + $$(DENVER_OPT) + " per month, withheld by the employer, for " +
   "workers who earn at least " + $(DENVER_SEUIL) + " a month in Denver. Greenwood Village&rsquo;s page lists " +
   "$2 per month once you earn $250 or more in a month. Aurora&rsquo;s page says its tax was to be repealed effective " +
   "January 1, 2025. The calculator does not include these amounts, and we have read only those three cities&rsquo; pages."],

  ["Do Colorado employees pay for unemployment insurance?",
   "Not through any deduction we found. The Department of Labor and Employment says employers must pay " +
   "annual premiums on the chargeable wages of each employee, and it sets the 2026 chargeable wage base at " +
   $(WAGE_BASE_UI) + ". The page lists no employee share, and this calculator takes nothing from your pay for unemployment insurance."],

  ["Does a 401(k) contribution lower my Colorado tax?",
   "In this calculator, yes: the contribution comes out before the Colorado formula is applied, the same " +
   "order it uses for federal tax. The state&rsquo;s withholding guide does not address retirement " +
   "contributions, so treat that as our modeling choice rather than a quotation. On $75,000 with 6% " +
   "going into a 401(k), the Colorado income tax figure falls by " + $$(gain401) + " a year. FAMLI is " +
   "calculated on gross pay in this calculator, so it does not change."],

  ["Why is my Colorado paycheck different from this calculator?",
   "The usual reasons: health insurance premiums and other pre-tax deductions come out before tax and are " +
   "not modeled here, a second job raises federal withholding, and a city head tax such as Denver&rsquo;s " +
   "is not included. If you turned in Colorado form DR 0004, your employer uses the allowance you entered " +
   "instead of the default this calculator applies. Bonuses are not modeled either."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ doivent devenir de vrais caracteres dans le JSON ; nettoieJsonLd le fait
   aussi sur la page entiere a l'ecriture. */
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

/* La reponse directe : 40 a 60 mots, verifie plus bas. Elle couvre le cas
   horaire (20 % des impressions du site sont des requetes « hourly »). */
const reponse = "Colorado withholds a flat " + pct(TAUX) + " of wages above a " + $(ALLOC) + " allowance in 2026, plus "
  + pct(FAMLI_TAUX) + " of pay for FAMLI. On $75,000, a single filer keeps about " + $(a75.net)
  + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire)
  + " an hour after tax. The state&rsquo;s formula has no brackets.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Colorado (CO) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Colorado (CO) paycheck calculator, 2026. Hourly or salary take-home pay after federal, FICA, Colorado's flat 4.4% withholding and FAMLI.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Colorado (CO) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Colorado withholds a flat 4.4% above a $5,500 allowance in 2026, and takes 0.44% of wages for FAMLI. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Colorado Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Colorado take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Colorado income tax withheld at a flat 4.4% above a $5,500 allowance ($11,000 if married filing jointly), and the 0.44% employee share of FAMLI family and medical leave insurance."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Colorado", "item": "${URL}" }
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
    <li aria-current="page">Colorado</li>
  </ol>
</nav>

  <h1>Colorado Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Colorado take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction. In Colorado it also
          sets the allowance: $11,000 if married filing jointly, $5,500 for everyone else.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Colorado income tax too.</span>
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
    <p>Colorado has no tax brackets to climb. The Department of Revenue&rsquo;s withholding worksheet
    takes your annual wages, subtracts one allowance, and multiplies the rest by ${N(pct(TAUX))}. The
    allowance is ${N($(ALLOC_MFJ))} for a married couple filing jointly and ${N($(ALLOC))} for
    everyone else, head of household included. Colorado also runs its own family and medical leave
    insurance program, FAMLI, whose premium employers and employees may split. Even with FAMLI, the state layer is simpler than
    <a href="/paycheck-calculator/new-mexico/">New Mexico</a>&rsquo;s six rates, though not as plain as
    <a href="/paycheck-calculator/wyoming/">Wyoming</a>&rsquo;s, which takes no income tax at all.</p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Colorado income tax</strong>: your wages minus the ${N($(ALLOC))} allowance
      (${N($(ALLOC_MFJ))} if married filing jointly), times ${N(pct(TAUX))}.</li>
      <li><strong>Colorado FAMLI</strong>: ${N(pct(FAMLI_TAUX))} of your gross wages up to
      ${N($(FAMLI_PLAFOND))}.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and for
    the state layer, the <strong>Colorado Department of Revenue</strong>&rsquo;s 2026 <em>Withholding
    Worksheet for Employers</em> (form DR 1098) and the <strong>FAMLI Division</strong>&rsquo;s employer
    page. The state&rsquo;s websites block automated requests, so we read those documents from Internet
    Archive snapshots, linked in the sources below. Our full sourcing is on the
    <a href="/methodology/">methodology page</a>.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer following the state&rsquo;s worksheet takes from each check. Colorado income tax itself is
    calculated on your return, starting from your federal taxable income, so what you owe or get back
    when you file can differ, and the state says the default method generally ends in a refund (see the key facts below).</p>

    <p>What the calculator deliberately does not do: it does not add city head taxes, and it does not model
    Married Filing Separately, multiple jobs, bonuses and other supplemental wages, a DR 0004 certificate,
    or health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Colorado take-home pay by salary</h2>
  <p class="prose">Single filer, no retirement contribution, 2026 state and federal rates. The
  CO state tax + FAMLI column adds the state&rsquo;s income tax to its ${N(pct(FAMLI_TAUX))} family and
  medical leave deduction.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Colorado take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">CO state tax + FAMLI</th>
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

    <h2>The Colorado withholding formula, by filing status</h2>
    <p>Colorado&rsquo;s formula is one line long, so the table below is short. The employer annualizes
    your pay, subtracts the allowance that goes with your filing status on the federal W-4, and
    applies ${N(pct(TAUX))} to what is left. Nothing is withheld on wages up to the allowance.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Colorado withholding formula: allowance and tax on a $75,000 salary
      </caption>
      <thead>
        <tr>
          <th scope="col">Filing status (W-4, Step 1c)</th>
          <th scope="col">Allowance subtracted (nothing is withheld on wages up to this amount)</th>
          <th scope="col">Colorado tax on $75,000</th>
        </tr>
      </thead>
      <tbody>
${tableFormule}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Colorado hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Colorado?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Colorado income tax and FAMLI, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Colorado&rsquo;s share is
    ${N($$(h20.etat))} of income tax and ${N($$(fam(h20)))} of FAMLI for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Colorado?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. The state takes ${N($$(h25.etat + fam(h25)))}
    a year in income tax and FAMLI at $25 an hour, and ${N($$(h30.etat + fam(h30)))} at $30.</p>

    <h3>Overtime</h3>
    <p>The state&rsquo;s worksheet asks for the employee&rsquo;s &ldquo;total taxable wages this payroll
    period (including overtime pay),&rdquo; and the Wage Withholding Tax Guide says Colorado withholding
    generally includes overtime compensation that may be exempted from federal withholding under the
    One Big Beautiful Bill Act. The calculator multiplies your rate by the hours you enter and adds no
    overtime premium. It does not model any federal overtime deduction, so on an overtime-heavy
    paycheck the federal line can differ from what you see. If you work variable hours, enter
    the average you expect for the year.</p>

    <h3>A city head tax on an hourly wage</h3>
    <p>If you work in Denver and earn at least ${N($(DENVER_SEUIL))} in a month, the city&rsquo;s tax
    guide (revised 1/2021) lists ${N($$(DENVER_OPT))} a month withheld from your pay, or ${N($$(DENVER_AN))} a year. Spread over
    2,080 hours that is about ${N(Math.round(DENVER_AN / HEURES * 100) + " cents")} an hour. It is a
    fixed amount, not a percentage, so it weighs more on a part-time paycheck than on a large salary.
    The calculator leaves it out.</p>

    <h3>Colorado take-home pay by hourly rate</h3>
    <p>Single filer, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Colorado take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Colorado</h2>

  <h3>One rate, and an allowance that depends on your filing status</h3>
  <p>The worksheet&rsquo;s line 2a gives ${N($(ALLOC_MFJ))} &ldquo;if married filing jointly or qualifying
  surviving spouse,&rdquo; or ${N($(ALLOC))} &ldquo;otherwise.&rdquo; Line 2c then multiplies by
  ${N("4.40%")}. On the same ${N("$75,000")}, Colorado withholds ${N($$(a75.etat))} from a single filer,
  ${N($$(h75.etat))} from a head of household and ${N($$(j75.etat))} from a married couple filing
  jointly. If an employee gives no W-4 at all, the worksheet says to treat the filing status as single.</p>

  <h3>The default withholding usually ends in a refund</h3>
  <p>Colorado taxes &ldquo;modified federal taxable income,&rdquo; so the tax on your return starts from a
  figure that already has the federal standard deduction taken out: ${N($(fedDed.single))} for a
  single filer in 2026. The withholding formula subtracts only ${N($(ALLOC))}. The gap is
  ${N($(ECART_DED))}, and at ${N(pct(TAUX))} that is ${N($$(ECART_IMPOT))}. On these assumptions &mdash;
  standard deduction, no Colorado additions, subtractions or credits &mdash; a single filer on
  ${N("$75,000")} has ${N($$(a75.etat))} withheld against about ${N($$(impotFinal75))} of tax when they file. That is our arithmetic, and it assumes a ${N("4.4%")} rate on your 2026 return. The state
  says the same thing in words: the method based on your W-4 &ldquo;will generally result in a refund when
  you file your Colorado income tax return.&rdquo; Its own optional form suggests a smaller cushion: the
  ${N($(DR0004_SEUL))} allowance in Table 1 would cut withholding by ${N($$(GAIN_DR0004))}, not
  ${N($$(ECART_IMPOT))}, and we have not found the state&rsquo;s reason for the difference.</p>

  <h3>Your federal W-4 will not shrink the Colorado number</h3>
  <p>The worksheet&rsquo;s fifth rule tells employers not to adjust Colorado withholding outside of its
  calculation, and says an employee must use form DR 0004 to account for federal deductions. (An
  employee who claims exemption from withholding on the W-4 is handled separately, and the Department can
  adjust that claim.) The form is optional. For one job, its Table 1 allows ${N($(DR0004_SEUL))} for a single filer,
  ${N($(DR0004_HOH))} for head of household and ${N($(DR0004_MFJ))} for married filing jointly. Entering
  ${N($(DR0004_SEUL))} instead of ${N($(ALLOC))} would cut a single filer&rsquo;s withholding by
  ${N($$(GAIN_DR0004))} a year, or ${N($$(GAIN_DR0004 / 12))} a month. The department says completing it
  &ldquo;will likely increase your take-home pay&rdquo; for most taxpayers, and warns that if too little is
  withheld you may owe tax and a penalty. This calculator uses the default, not a DR 0004.</p>

  <h3>Colorado&rsquo;s rate is set year by year</h3>
  <p>The Department of Revenue&rsquo;s Individual Income Tax Guide says &ldquo;the Colorado income tax rate
  varies by tax year&rdquo; and prints a table: ${N("4.4%")} for 2022 and 2023, ${N("4.25%")} for 2024, and
  ${N("4.4%")} for 2025. The table stops at 2025, so the ${N("4.40%")} we use for 2026 comes from
  the withholding worksheet, which is the document that governs what an employer takes from a paycheck.</p>

  <h3>FAMLI takes ${pct(FAMLI_TAUX)} of your pay, up to ${$(FAMLI_PLAFOND)}</h3>
  <p>The FAMLI Division&rsquo;s employer page, as archived in January 2026, puts the premium at
  ${N(pct(FAMLI_TOTAL))} of wages, &ldquo;with 0.44% paid by the employer and 0.44% paid by the
  employee,&rdquo; on wages up to the Federal Social Security Wage Cap, which the Social Security
  Administration sets at ${N($(FAMLI_PLAFOND))} for 2026. The employee&rsquo;s most is therefore
  ${N($$(FAMLI_MAX))} a year. The page adds that employees are &ldquo;never required to pay more than 50%
  of the total premium,&rdquo; that some employers may choose not to deduct any of it, and that the
  division reviews the rate every year. Premiums are calculated on gross wages, and the page says they
  are post-tax deductions that do not reduce an employee&rsquo;s taxable income, so they do not lower your federal
  or Colorado income tax. This calculator assumes your employer deducts the employee half.</p>

  <h3>FAMLI stops at ${$(FAMLI_PLAFOND)}, so its share shrinks on high pay</h3>
  <p>On ${N("$75,000")} the deduction is ${N($$(fam(a75)))}. On ${N("$250,000")} it is capped at
  ${N($$(fam(a250)))}, which is only ${N((fam(a250) / 250000 * 100).toFixed(2) + "%")} of gross pay. The
  same percentage applies from the first dollar, so a low earner pays ${N(pct(FAMLI_TAUX))} of every
  dollar while a high earner&rsquo;s share shrinks once pay passes the cap.</p>

  <h3>Some Colorado cities take a fixed monthly head tax</h3>
  <p>Denver&rsquo;s Tax Guide Topic 61, revised 1/2021, says the Employee Occupational Privilege Tax (OPT) is withheld by the employer
  &ldquo;at a rate of $5.75 per month&rdquo; for workers who earn at least $500 in a calendar
  month in Denver. Greenwood Village&rsquo;s page lists $2 per month, for pay of $250 or more in a month.
  Aurora is the notable absence: its page says the city&rsquo;s occupational privilege tax &ldquo;will be
  repealed effective Jan. 1, 2025,&rdquo; and that the last returns are for 2024. We have read only these three cities&rsquo; pages, we cannot say
  what others charge, and the calculator does not model any of them: each is a fixed dollar amount per
  month, not a rate. Check the current figure with your employer or the city.</p>

  <h3>Colorado&rsquo;s unemployment page lists premiums only for employers</h3>
  <p>The Department of Labor and Employment says employers &ldquo;must pay annual premiums on the
  chargeable wages for each of their employees,&rdquo; and sets the 2026 chargeable wage base at
  ${N($(WAGE_BASE_UI))}. We found no employee deduction for unemployment insurance, and the calculator
  takes none. The contrast with FAMLI is the point: the state&rsquo;s page lists no employee share of the
  unemployment premium, while employees may pay half of the leave premium.</p>

  <h3>You do not have to live in Colorado</h3>
  <p>The Wage Withholding Tax Guide says that in general an employer must withhold Colorado income tax from
  an employee who is a Colorado resident, and from a nonresident for services performed in Colorado. The guide
  lists exemptions, so check it for your case. A Wyoming or Nebraska resident who works a shift in Denver should
  generally expect the state line on the pay stub.
  This calculator shows the Colorado withholding; it does not model what your home state does on your
  return.</p>

  <h3>Your 401(k) contribution and the state tax</h3>
  <p>The calculator takes your 401(k) contribution out before it applies the Colorado formula, the same
  order it uses for federal tax. The state&rsquo;s guide does not address retirement contributions, so
  this is a modeling choice, not a quotation. On ${N("$75,000")} with 6% going in, Colorado income tax
  falls by ${N($$(gain401))} a year. FAMLI is applied to gross pay, so it does not change.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. FAMLI stops at the same wage cap, so for a high earner
  both deductions disappear from the same paycheck and take-home pay visibly jumps.</p>

  <h2>Common mistakes people make</h2>

  <h3>Applying 4.4% to your whole paycheck</h3>
  <p>The rate applies to wages after the allowance, not to every dollar. On ${N("$75,000")} Colorado&rsquo;s
  effective income tax rate is ${N(effet(a75).toFixed(2) + "%")}, and on ${N("$250,000")} it is
  ${N(effet(a250).toFixed(2) + "%")}. The allowance matters less as pay grows, but it never
  stops mattering.</p>

  <h3>Reading the FAMLI line as income tax</h3>
  <p>FAMLI is an insurance premium with its own rate and its own ceiling, and it does not depend on your
  filing status. On ${N("$75,000")} it is ${N($(fam(a75)))}, about
  ${N(Math.round(fam(a75) / a75.etat * 100) + "%")} of the ${N($(a75.etat))} of income tax.</p>

  <h3>Claiming more on the W-4 to lower Colorado withholding</h3>
  <p>Claiming extra allowances or other adjustments on your federal W-4 will not lower it; only your filing status carries over. The state&rsquo;s worksheet starts from the filing
  status on your W-4, and the form the state provides for adjusting it is the DR 0004.</p>

  <h3>Reading withholding as the tax you owe</h3>
  <p>A Colorado refund is a typical result of the default formula, not a sign the worksheet was applied
  wrongly. Withholding is settled against your actual liability when you file.</p>

  <h3>Assuming every Colorado worker pays a city head tax</h3>
  <p>Only some cities charge one, the amounts differ, and Aurora&rsquo;s page says its tax was to end on January 1, 2025.
  Look at your own pay stub for a line naming your city before you subtract anything.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, a second job changes the federal
  withholding picture, and your employer may be using a DR 0004 you filled out. Read
  <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Colorado in 2026, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Colorado wages after the allowance: ${N($(a75.brut))} &minus; ${N($(ALLOC))} =
    ${N($(imposable75))}</li>
    <li>Colorado income tax: ${N($(imposable75))} &times; ${N(pct(TAUX))} = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on
    a biweekly one</li>
    <li>Colorado FAMLI: ${N($(a75.brut))} &times; ${N(pct(FAMLI_TAUX))} = ${N($$(fam(a75)))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates, against four of Colorado&rsquo;s neighbors
  that we publish. <a href="/paycheck-calculator/oklahoma/">Oklahoma</a>, which also borders Colorado, has its own calculator here. <a href="/paycheck-calculator/arizona/">Arizona</a>, at the Four Corners, has one too. Kansas is not on this site yet.</p>
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
  <p><a href="/paycheck-calculator/wyoming/">Wyoming</a> withholds nothing at state level, so a Wyoming
  worker keeps ${N($$(wy75.net - a75.net))} more than a Coloradan on the same salary.
  <a href="/paycheck-calculator/nebraska/">Nebraska</a> leaves ${N($$(ne75.net - a75.net))} more and
  <a href="/paycheck-calculator/new-mexico/">New Mexico</a> ${N($$(nm75.net - a75.net))} more.
  <a href="/paycheck-calculator/utah/">Utah</a> is almost level with Colorado, ${N($$(ut75.net - a75.net))}
  ahead. Colorado is the only one of the five that takes a family and medical leave premium from the
  employee&rsquo;s pay, ${N($$(fam(a75)))} on this salary, part of its total of
  ${N($$(total(a75)))} in state-level deductions.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/utah/">Utah paycheck calculator</a> &mdash; a neighboring
    flat-rate state, with a credit that fades out instead of an allowance.</li>
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
    Colorado rates.
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

/* Garde-fous : recoupement independant contre les lignes 2a-2c du DR 1098,
   pas contre notre propre moteur. */
const verifs = [["single", a75, 75000], ["marriedJoint", j75, 75000], ["headOfHousehold", h75, 75000],
                ["single", a25, 25000], ["single", a100, 100000], ["single", a250, 250000]];
for (const [statut, r, brut] of verifs) {
  const attendu = dr1098(brut, statut);
  if (Math.abs(attendu - r.etat) > 0.01) {
    console.error("ARRET : %s a %d $ : DR 1098 %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
if (TAUX !== 0.044 || ALLOC !== 5500 || ALLOC_HOH !== 5500 || ALLOC_MFJ !== 11000) {
  console.error("ARRET : le DR 1098 n'est plus 4,40 % / 5 500 $ / 11 000 $ ; reecrire les sections");
  process.exit(2);
}
if (FAMLI_TAUX !== 0.0044 || FAMLI_PLAFOND !== R.fica.socialSecurity.wageBase || Math.abs(FAMLI_MAX - 811.8) > 0.001) {
  console.error("ARRET : FAMLI n'est plus 0,44 % jusqu'au plafond Social Security (max 811,80 $)");
  process.exit(2);
}
/* Les phrases de la page qui donnent une DIRECTION sont verifiees ici. */
if (!(wy75.net > a75.net && ne75.net > a75.net && nm75.net > a75.net && ut75.net > a75.net && ut75.net - a75.net < 100)) {
  console.error("ARRET : la comparaison avec les voisins n'a plus la forme ecrite dans la page");
  process.exit(2);
}
if (!COMPARE.filter(k => k !== CLE).every(k => !(R.states[k].employeePrograms || []).length && !R.states[k].paidLeave && !R.states[k].waCares)) {
  console.error("ARRET : un voisin a un programme salarie ; la phrase « only one of the five » est fausse");
  process.exit(2);
}
if (Math.abs(a75.etat - (75000 - 5500) * 0.044) > 0.005 || Math.abs(ECART_IMPOT - 466.4) > 0.005 ||
    Math.abs(GAIN_DR0004 - 374) > 0.005) {
  console.error("ARRET : arithmetique de l'ecart retenue / impot final");
  process.exit(2);
}
const nbMotsReponse = reponse.split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements DR 1098 (single, married, HoH a 75 000 $ ; 25 000, 100 000, 250 000 $) : OK ; FAMLI max 811,80 $ ; reponse directe %d mots", nbMotsReponse);
