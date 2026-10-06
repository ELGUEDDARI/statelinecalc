/* Construit /paycheck-calculator/massachusetts/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Massachusetts est le 30e Etat publie. Ce qu'il a de propre :
 *
 *   1. UN TAUX PLAT DE 5 %, MAIS PAS SUR LE SALAIRE BRUT. Circular M (Rev.
 *      12/25), methode en pourcentage : on retranche (a) les exemptions
 *      (4 400 $ pour 1, 8 400 $ pour salarie + conjoint) et (b) le Social
 *      Security + Medicare retenus, PLAFONNES A 2 000 $ PAR AN. Sur 75 000 $ :
 *      75 000 - 4 400 - 2 000 = 68 600 ; x 5 % = 3 430 $.
 *   2. LA SURTAXE DE 4 % : 9 % sur la part au-dela de 1 107 750 $ (« the 2026
 *      inflation-adjusted threshold for the 4% surtax », meme Circular).
 *   3. UN PROGRAMME SALARIE : le PFML, 0,28 % (medical) + 0,18 % (famille)
 *      = 0,46 % MAXIMUM retenable (DFML, page lue le 02/10), jusqu'au plafond
 *      Social Security.
 *   4. DEUX MECANISMES NOUVEAUX DU MOTEUR (assets/calc-paycheck.js et
 *      .tooling/lib/paie.js, mirroirs) : ficaDeduction {cap: 2000} et
 *      noWithholdingBelow (8 000 $). Le credit chef de famille (120 $/an)
 *      passe par taxCredit, mecanique de l'Utah.
 *   5. UN RECOUPEMENT PAR L'AGENCE ELLE-MEME : la table hebdomadaire du
 *      Circular (102 lignes x 11 colonnes = 1 122 valeurs) est reproduite par
 *      la formule annualisee a moins de 0,01 $ (script du 02/10, voir
 *      data/rates-2026.js).
 *
 * ── SOURCES ──────────────────────────────────────────────────────────────
 * mass.gov repond 403 a curl, WebFetch et Chromium : tous les documents sont
 * lus dans des INSTANTANES INTERNET ARCHIVE (octets bruts `id_`), dates dans
 * .tooling/lib/sources.js (PAR_ETAT.massachusetts) et data/rates-2026.js.
 *
 * ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI :
 *   - pas de « Massachusetts has no local income tax » : aucun document lu n'en
 *     decrit, ce qui n'est pas une preuve : « we found no » ;
 *   - pas de taux 2026 de la DECLARATION : seule la retenue (Circular M) est lue ;
 *   - pas de « le conjoint a 4 400 $ » : le Circular compte « 4 exemptions »
 *     pour le conjoint (formule 1 000 x n + 3 400 : 8 400 $ pour 5) ; on
 *     applique la formule imprimee ;
 *   - pas de nombre d'exemptions « recommande » au-dela de ce que le M-4
 *     dit lui-meme (« claim the total number ... entitled »);
 *   - pas de retenue de chomage salariee : le DUA decrit des contributions
 *     d'EMPLOYEUR ; « we found no worker-paid ... » ;
 *   - pas de salaire minimum (non source) ;
 *   - 401(k) : le Circular M n'en parle pas ; la regle vient d'une page DOR
 *     archivee (31/03/2024) : dit sur la page.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-massachusetts.js
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { calcul, c2, c0, HEURES, R, progressiveTax } = require("../lib/paie.js");

const RACINE = path.join(__dirname, "..", "..");
const CLE = "massachusetts";
const NOM = "Massachusetts";
const URL = "https://statelinecalc.com/paycheck-calculator/massachusetts/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

/* --- les valeurs de droit : lues dans rates-2026.js ----------------------- */
const MA = R.states[CLE];
const BANDES = MA.incomeTax.brackets.single;               // [[1107750, .05], [Inf, .09]]
const SEUIL = BANDES[0][0];                                 // 1 107 750
const TAUX = BANDES[0][1], TAUX_HAUT = BANDES[1][1];        // 5 %, 9 %
const EX = MA.incomeTax.standardDeduction;                  // 4 400 / 8 400 / 4 400
const PLAFOND_FICA = MA.incomeTax.ficaDeduction.cap;        // 2 000
const PLANCHER = MA.incomeTax.noWithholdingBelow;           // 8 000
const CREDIT_HOH = MA.incomeTax.taxCredit.base.headOfHousehold;   // 120
const PFML = MA.employeePrograms[0];
const TAUX_FICA = R.fica.socialSecurity.rate + R.fica.medicare.rate;   // 7,65 %
const fedDed = R.federal.standardDeduction;
const facteurExemption = n => (n === 0 ? 0 : 1000 * n + 3400);   // Circular M, « Exemption Factors »

const a25 = calcul(CLE, 25000);
const a75 = calcul(CLE, 75000);
const a100 = calcul(CLE, 100000);
const a250 = calcul(CLE, 250000);
const a1m5 = calcul(CLE, 1500000);
const a20 = calcul(CLE, 20000);
const a8k = calcul(CLE, PLANCHER);
const a7999 = calcul(CLE, PLANCHER - 1);
const j75 = calcul(CLE, 75000, "marriedJoint");
const h75 = calcul(CLE, 75000, "headOfHousehold");
const h20 = calcul(CLE, 20 * HEURES);
const h25 = calcul(CLE, 25 * HEURES);
const h30 = calcul(CLE, 30 * HEURES);
const r401 = calcul(CLE, 75000, "single", 0.06);
const gain401 = a75.etat - r401.etat;
const progs = r => r.programmes.reduce((t, p) => t + p.montant, 0);
const pfml250 = a250.programmes[0].montant;

/* Independant du moteur : la formule de la page 12 du Circular M, ecrite ici
   a partir du texte, pas a partir de calcul(). */
function retenueCircular(brut, nbExemptions, { hoh = false } = {}) {
  const fica = Math.min(PLAFOND_FICA, brut * TAUX_FICA);
  const base = Math.max(0, brut - fica - facteurExemption(nbExemptions));
  const impot = Math.min(base, SEUIL) * TAUX + Math.max(0, base - SEUIL) * TAUX_HAUT;
  return brut < PLANCHER ? 0 : Math.max(0, impot - (hoh ? CREDIT_HOH : 0));
}
const sansM4 = retenueCircular(75000, 0);                   // 3 650
const naif5 = 75000 * TAUX;                                 // 3 750
const seuilFica = PLAFOND_FICA / TAUX_FICA;                 // 26 143,79
const baseUnMillionCinq = 1500000 - PLAFOND_FICA - EX.single;   // 1 493 600

const pct = t => String(+(t * 100).toFixed(4)) + "%";
const pct1 = t => (t * 100).toFixed(1) + "%";
const $ = n => "$" + c0(n);
const $$ = n => "$" + c2(n);
const N = s => '<span class="num">' + s + "</span>";

/* Voisins publies : New Hampshire et Rhode Island (frontaliers), + Colorado,
   autre Etat a taux plat avec une prime de conge payee. */
const REF = 75000;
const COMPARE = [CLE, "new-hampshire", "rhode-island", "colorado"];
const NOMS = { [CLE]: "Massachusetts", "new-hampshire": "New Hampshire", "rhode-island": "Rhode Island", colorado: "Colorado" };
const total = r => r.etat + r.paidLeave + r.waCares + progs(r);
const lignesCompare = COMPARE.map(k => {
  const r = calcul(k, REF);
  return { cle: k, nom: NOMS[k], deductions: total(r), net: r.net, taux: r.taux };
}).sort((a, b) => b.net - a.net);
const nh75 = calcul("new-hampshire", REF), ri75 = calcul("rhode-island", REF), co75 = calcul("colorado", REF);

/* --- les tableaux, produits par les generateurs generiques ---------------- */
const gen = (script, arg) => execFileSync(process.execPath,
  [path.join(RACINE, ".tooling", "test", script), arg],
  { encoding: "utf8" }).replace(/\s+$/, "");
const tableSalaires = gen("gen-table.js", CLE);
const tableHoraire = gen("gen-hourly-table.js", CLE);

/* Le tableau des exemptions : la formule imprimee du Circular M. */
const ligneExemption = (n, note) =>
  "        <tr><th scope=\"row\">" + n + "</th><td class=\"num\">" + $(facteurExemption(n)) + "</td><td>" + note + "</td></tr>";
const tableExemptions = [
  ligneExemption(0, "No Form M-4 on file"),
  ligneExemption(1, "You, with no spouse and no dependents"),
  ligneExemption(2, "You at 65 or over (line 1 is 2), or you and one dependent"),
  ligneExemption(3, "You and two dependents"),
  ligneExemption(5, "You plus a spouse (1 + 4), the case this calculator uses for married filers"),
  ligneExemption(6, "You, a spouse and one dependent")
].join("\n");

/* --- la FAQ, une seule fois, reprise telle quelle dans le JSON-LD -------- */
const faq = [
  ["What is the Massachusetts income tax withholding rate in 2026?",
   "Massachusetts Circular M sets withholding at a flat 5% for 2026, with a 4% surtax that makes it 9% on the part of annual wages " +
   "above " + $(SEUIL) + ". The rate is applied after the employer subtracts your exemptions and up to " + $(PLAFOND_FICA) +
   " of the Social Security and Medicare tax withheld from you, so the amount withheld is less than 5% of your pay. " +
   "On a single filer&rsquo;s " + $(75000) + " salary it is " + $$(a75.etat) + " a year, or " + pct1(a75.etat / 75000) + " of pay."],

  ["How much Massachusetts tax is withheld on a $75,000 salary?",
   "For a single filer claiming one exemption, " + $$(a75.etat) + " a year, which is " + $$(a75.etat / 12) + " a month. " +
   "That is 5% of " + $(75000 - EX.single - PLAFOND_FICA) + ", which is $75,000 minus the " + $(EX.single) + " exemption minus the " +
   $(PLAFOND_FICA) + " Social Security and Medicare deduction. A married couple using the five exemptions this calculator assumes has " +
   $$(j75.etat) + " withheld, and a head of household has " + $$(h75.etat) + " withheld after the $" + CREDIT_HOH + " credit."],

  ["What is take-home pay on a $75,000 salary in Massachusetts?",
   "About " + $(a75.net) + " a year, or " + $$(a75.net / 12) + " a month, for a single filer with no retirement contribution. " +
   "That is after " + $$(a75.federal) + " of federal income tax, " + $(a75.ss + a75.med) + " of Social Security and Medicare, " +
   $$(a75.etat) + " of Massachusetts income tax withholding and " + $$(progs(a75)) + " for paid family and medical leave &mdash; " +
   "an effective rate of " + (a75.taux * 100).toFixed(1) + "%."],

  ["How much is $20, $25 or $30 an hour after taxes in Massachusetts?",
   "At 40 hours a week, $20 an hour leaves about " + $(h20.net) + " a year, or " + $$(h20.netHoraire) +
   " an hour. $25 an hour leaves about " + $(h25.net) + ", or " + $$(h25.netHoraire) + " an hour. " +
   "$30 an hour leaves about " + $(h30.net) + ", or " + $$(h30.netHoraire) + " an hour. Those are single-filer figures with one " +
   "exemption, after federal tax, FICA, Massachusetts withholding and the paid leave contribution, with no retirement contribution."],

  ["What Massachusetts payroll deductions are there besides income tax?",
   "One that we model: the paid family and medical leave (PFML) contribution. For 2026 the Department of Family and Medical Leave says " +
   "up to " + N("0.28%") + " of wages can be withheld from you for medical leave and up to " + N("0.18%") + " for family leave, " +
   "which is " + N(pct(PFML.rate)) + " in all, capped at the Social Security taxable maximum of " + $(PFML.wageCap) + ". On " + $(75000) +
   " that is " + $$(progs(a75)) + " a year, and at most " + $$(PFML.wageCap * PFML.rate) + " at any salary. " +
   "&ldquo;Up to&rdquo; matters: the department says employers may choose to cover a larger share, so your pay stub may show less. " +
   "The unemployment insurance page we read describes contributions made by employers, and we found no unemployment deduction " +
   "from workers&rsquo; pay."],

  ["Does a 401(k) contribution lower my Massachusetts withholding?",
   "In this calculator, yes. The Department of Revenue says elective deferrals to a 401(k), other than Roth contributions, are excluded " +
   "from Massachusetts gross income to the same extent as from federal gross income. Circular M itself does not mention 401(k) plans, " +
   "so how a given employer treats it is not something we can confirm. On $75,000 with 6% going into a 401(k), Massachusetts withholding " +
   "falls by " + $$(gain401) + " a year. Social Security, Medicare and the paid leave contribution are still calculated on your gross pay."],

  ["How many exemptions should I claim on Form M-4?",
   "The form says to claim the total number of exemptions you are entitled to, to avoid over-withholding, unless you have significant other " +
   "income. Line 1 is your personal exemption: enter 1, or 2 if you are 65 or over or will be before next year. If you are married and your " +
   "spouse&rsquo;s exemption is allowed, enter 4 on line 2. Line 3 is the number of qualified dependents. Circular M values the first exemption at " +
   $(facteurExemption(1)) + " a year and every additional one at $1,000. This calculator assumes 1 for single filers and heads of household and 5 " +
   "(you plus a spouse) for married couples filing jointly, with no dependents."],

  ["What is the Massachusetts 4% surtax, and is it taken from my paycheck?",
   "Circular M&rsquo;s percentage method adds a 4% surtax, which makes the rate 9% on the part of annual wages above " + $(SEUIL) +
   ", which it calls the 2026 inflation-adjusted threshold. A paycheck is affected only if your year&rsquo;s wages, after the exemption and " +
   "the Social Security and Medicare deduction, go past that amount. On " + $(1500000) + " a single filer has " + $$(a1m5.etat) +
   " withheld: 5% of the first " + $(SEUIL) + " plus 9% of the " + $(baseUnMillionCinq - SEUIL) + " above it."],

  ["Do Massachusetts cities or towns tax paychecks?",
   "Circular M and Form M-4 describe one state income tax withholding system and no local one. We found no Massachusetts local income tax " +
   "in the documents we read, but we have not checked every city and town, so look for a local line on your pay stub. " +
   "This calculator includes none."],

  ["How are bonuses withheld in Massachusetts?",
   "Circular M has a separate method for supplemental wage payments such as bonuses: the employer withholds 5% of the payment, and 9% on " +
   "the part that takes the worker&rsquo;s year of wages above " + $(SEUIL) + ". The percentage method for regular wages that this " +
   "calculator uses does not include them, and the calculator does not model bonuses."],

  ["Why is my Massachusetts paycheck different from this calculator?",
   "The usual reasons: you claimed a different number of exemptions on Form M-4, or filed none, which means no exemptions at all; an extra " +
   "amount per paycheck is being withheld; health insurance premiums and other pre-tax deductions come out before tax and are not modeled here; " +
   "your employer covers part of the paid leave contribution; or your employer uses the weekly, biweekly, semimonthly or monthly " +
   "wage-bracket tables in Circular M instead of the percentage method. Bonuses are not modeled either."]
];

/* JSON-LD : un bloc <script> n'est pas decode comme du HTML. Les entites de la
   FAQ doivent devenir de vrais caracteres dans le JSON ; nettoieJsonLd le fait
   aussi sur la page entiere a l'ecriture. */
const dec = s => s.replace(/<[^>]+>/g, "").replace(/&mdash;/g, "—").replace(/&rsquo;/g, "’")
  .replace(/&lsquo;/g, "‘").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”")
  .replace(/&hellip;/g, "…").replace(/&times;/g, "×").replace(/&minus;/g, "−")
  .replace(/&ndash;/g, "–").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
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
const reponse = "Massachusetts withholds a flat 5% in 2026, and 9% on wages above " + $(SEUIL)
  + ", after subtracting exemptions and up to $2,000 of Social Security and Medicare. It also takes up to 0.46% for paid leave. "
  + "On $75,000, a single filer keeps about " + $(a75.net) + " a year. At $25 an hour, full time, you keep about " + $$(h25.netHoraire) + " an hour.";

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<title>Massachusetts (MA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary</title>
<meta name="description" content="Free Massachusetts (MA) paycheck calculator, 2026. Hourly or salary take-home pay after federal tax, FICA, the 5% state withholding and paid family and medical leave.">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="Massachusetts (MA) Paycheck Calculator 2026 &mdash; Hourly &amp; Salary">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="Massachusetts withholds a flat 5% in 2026, and 9% above ${$(SEUIL)}, plus up to 0.46% for paid leave. On $75,000 a single filer keeps about ${$(a75.net)}.">
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
      "name": "Massachusetts Paycheck Calculator",
      "url": "${URL}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" },
      "description": "Calculates 2026 Massachusetts take-home pay, hourly or salary, after federal income tax, Social Security, Medicare, Massachusetts income tax withheld by the Department of Revenue's Circular M percentage method (5%, and 9% above ${$(SEUIL)}), and the paid family and medical leave contribution."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "Massachusetts", "item": "${URL}" }
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
    <li aria-current="page">Massachusetts</li>
  </ol>
</nav>

  <h1>Massachusetts Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>${reponse}</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <section aria-labelledby="calc-h">
${blocChecklist()}

    <h2 id="calc-h" class="u-mt-0">Calculate your Massachusetts take-home pay</h2>

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
          <span class="help">Sets your federal brackets and standard deduction, and the Massachusetts
          exemptions: one ($4,400) for single and head of household, five ($8,400) for you and a spouse.
          Head of household also takes a $120 credit.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay. It lowers your federal tax, and in this calculator
          it lowers your Massachusetts withholding too.</span>
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
    <p>Massachusetts withholds a flat ${N("5%")} for nearly everyone, but not on your whole paycheck. Each employee completes Form M-4, the
    state&rsquo;s counterpart to the federal W-4, which sets the number of exemptions. The Department of Revenue&rsquo;s Circular M then
    tells the employer to take your wages for the year, subtract your exemptions, subtract the Social Security and Medicare tax
    withheld from you (at most ${N($(PLAFOND_FICA))} a year), and apply the rate to what is left. The same Circular adds a
    4% surtax: the part of that amount above ${N($(SEUIL))} is withheld at ${N("9%")}.
    For contrast, <a href="/paycheck-calculator/new-hampshire/">New Hampshire</a>, a neighbor we also publish, withholds nothing
    on wages in this calculator.</p>

    <p>The calculator applies five deductions, in this order:</p>
    <ul>
      <li><strong>Federal income tax.</strong> Your gross pay minus the federal standard deduction
      for your filing status, run through the 2026 federal brackets.</li>
      <li><strong>Social Security</strong> at 6.2% of gross wages, up to the 2026 wage base of
      ${N("$184,500")}.</li>
      <li><strong>Medicare</strong> at 1.45% of all wages, with no cap, plus the 0.9% Additional
      Medicare Tax on wages above ${N("$200,000")}.</li>
      <li><strong>Massachusetts income tax withholding</strong>: your wages after any 401(k) contribution, minus
      ${N($(EX.single))} for a single filer or head of household (one exemption) or ${N($(EX.marriedJoint))} for a married
      couple filing jointly (five), minus the Social Security and Medicare you pay up to ${N($(PLAFOND_FICA))}, at
      ${N("5%")}, or ${N("9%")} above ${N($(SEUIL))}. Head of household then subtracts ${N($(CREDIT_HOH))} from the tax.</li>
      <li><strong>Paid family and medical leave</strong> at ${N(pct(PFML.rate))} of the first ${N($(PFML.wageCap))} of wages.</li>
    </ul>

    <p>Rates come from the agencies that set them: the IRS for the federal brackets, the standard
    deduction and FICA, cross-checked against the Social Security Administration for the wage base; and, for
    Massachusetts, the <strong>Department of Revenue</strong>&rsquo;s Circular M and Form M-4, the <strong>Department of Family and
    Medical Leave</strong>&rsquo;s 2026 contribution rates, and two other state pages. Massachusetts&rsquo;s own site refuses automated requests, so we
    read each Massachusetts document from a dated snapshot in the Internet Archive; the snapshots and their dates are linked in the sources
    below. Our full sourcing is on the <a href="/methodology/">methodology page</a>.</p>

    <p><strong>We checked the method against the department&rsquo;s own table.</strong> Circular M also prints a weekly wage-bracket table, with
    a column for every number of exemptions from 0 to 10. On ${LISIBLE} we rebuilt its 102 rows of wages from $150 to $1,170, 1,122 values
    in all, with the method described above. Every value matched to within a cent.</p>

    <p><strong>Withholding is an estimate, not your final bill.</strong> The figure here is what an
    employer takes from each check using the department&rsquo;s method. Your Massachusetts income tax itself is figured
    on your return, so what you owe or get back when you file can differ.</p>

    <p>What the calculator deliberately does not do: it does not let you enter a number of exemptions other than the
    one it assumes, it does not count dependents, age 65 or blindness, it does not add an extra amount per paycheck, it does not apply the exemption
    a full-time student with a small income can claim on Form M-4, and it does not model married filing separately, multiple jobs, bonuses and other supplemental wages,
    or health insurance premiums and other employer benefit deductions.</p>
  </div>

  <h2>Massachusetts take-home pay by salary</h2>
  <p class="prose">Single filer with one exemption, no retirement contribution, 2026 state and federal rates. The
  MA state tax + programs column adds Massachusetts income tax withholding to the paid family and medical leave contribution.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Massachusetts take-home pay, single filer
      </caption>
      <thead>
        <tr>
          <th scope="col">Gross salary</th>
          <th scope="col">Federal tax</th>
          <th scope="col">FICA</th>
          <th scope="col">MA state tax + programs</th>
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

    <h2>The Massachusetts withholding rates and exemptions</h2>
    <p>Circular M&rsquo;s percentage method has two rates. Take annual wages, subtract the exemption factor from the second table below, subtract the
    Social Security and Medicare you pay (no more than ${N($(PLAFOND_FICA))} in total), then apply the rates in the first table. For a single filer on
    ${N($(75000))}, that is ${N($(75000))} &minus; ${N($(EX.single))} &minus; ${N($(PLAFOND_FICA))} = ${N($(75000 - EX.single - PLAFOND_FICA))}, and
    ${N("5%")} of that is ${N($$(a75.etat))}.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Massachusetts withholding rates, annual wages after exemptions and the Social Security and Medicare deduction
      </caption>
      <thead>
        <tr>
          <th scope="col">Taxable wages</th>
          <th scope="col">Base amount</th>
          <th scope="col">Rate on the excess</th>
        </tr>
      </thead>
      <tbody>
        <tr><th scope="row">$0 &ndash; ${$(SEUIL)}</th><td class="num">$0.00</td><td class="num">5.0%</td></tr>
        <tr><th scope="row">${$(SEUIL)} and over (4% surtax)</th><td class="num">${$$(SEUIL * TAUX)}</td><td class="num">9.0%</td></tr>
      </tbody>
    </table>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        Annual exemption factors in Circular M, by the number of exemptions claimed on Form M-4
      </caption>
      <thead>
        <tr>
          <th scope="col">Exemptions claimed</th>
          <th scope="col">Subtracted from annual wages</th>
          <th scope="col">What it can mean</th>
        </tr>
      </thead>
      <tbody>
${tableExemptions}
      </tbody>
    </table>
  </div>

  <div class="prose">

    <h2>Massachusetts hourly paycheck: what your rate is worth after tax</h2>

    <h3>Why we ask for your hours instead of assuming 2,080</h3>
    <p>Many hourly calculators multiply your rate by 2,080 and call it a year. That is 40 hours a
    week for 52 weeks, which describes a full-time schedule, not every hourly job.
    If you work 32 hours a week, or 45 with overtime, the assumed figure is wrong before any tax is
    applied. The calculator above asks for your hours and uses them.</p>

    <h3>What is $20 an hour after taxes in Massachusetts?</h3>
    <p>At 40 hours a week, $20 an hour is ${N($(h20.brut))} a year gross. After federal tax, Social
    Security, Medicare, Massachusetts withholding and the paid leave contribution, that leaves about ${N($(h20.net))} a year, or
    ${N($$(h20.net / 12))} a month. Your real hourly rate &mdash; what an hour of work actually puts
    in your bank account &mdash; is ${N($$(h20.netHoraire))}. Massachusetts&rsquo;s share is
    ${N($$(h20.etat))} of income tax withholding plus ${N($$(progs(h20)))} of paid leave contribution for the year.</p>

    <h3>What are $25 and $30 an hour after taxes in Massachusetts?</h3>
    <p>$25 an hour is ${N($(h25.brut))} gross and about ${N($(h25.net))} after tax, a real rate of
    ${N($$(h25.netHoraire))}. $30 an hour is ${N($(h30.brut))} gross and about ${N($(h30.net))}
    after tax, a real rate of ${N($$(h30.netHoraire))}. Massachusetts income tax withholding is ${N($$(h25.etat))}
    a year at $25 an hour, and ${N($$(h30.etat))} at $30.</p>

    <h3>Overtime and bonuses</h3>
    <p>The calculator multiplies your rate by the hours you enter and adds no overtime premium, and it does not model bonuses.
    Circular M&rsquo;s percentage method for regular wages is headed &ldquo;Not Including Supplemental Wage Payments, such as bonuses,&rdquo;
    and the Circular gives supplemental payments their own method in its section G.
    If you work variable hours, enter the average you expect for the year.</p>

    <h3>Massachusetts take-home pay by hourly rate</h3>
    <p>Single filer with one exemption, 40 hours a week (2,080 hours a year), 2026 rates.</p>
  </div>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 Massachusetts take-home pay by hourly rate, single filer, 40 hours a week
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

  <h2>Key facts that affect your take-home pay in Massachusetts</h2>

  <h3>A flat 5%, applied to less than your whole pay</h3>
  <p>There is one rate for nearly everyone, but it is not applied to gross pay. Two things come off first: your exemptions, and the Social Security and Medicare
  tax withheld from you. On ${N("$75,000")} for a single filer those two subtractions total ${N($(EX.single + PLAFOND_FICA))}, so the tax is ${N($$(a75.etat))},
  which is ${N(pct1(a75.etat / 75000))} of pay, not 5%. Multiplying the salary by 5% gives ${N($$(naif5))}, which is ${N($$(naif5 - a75.etat))} too high.</p>

  <h3>The Social Security and Medicare deduction stops at $2,000</h3>
  <p>Step 1 of Circular M tells the employer to subtract the Social Security and Medicare withheld and says the total subtracted &ldquo;may not exceed $2,000.&rdquo; Once the
  year&rsquo;s total reaches that amount, the employer stops subtracting, so the full ${N($(PLAFOND_FICA))} is used by anyone earning more than about ${N($(seuilFica))}
  a year. Below that it is smaller: on ${N("$20,000")} Social Security and Medicare come to ${N($$(a20.ss + a20.med))}, so that is all that is subtracted. This calculator
  works with the year&rsquo;s total, so it does not show the early-year paychecks that can be withheld a little less when an employer subtracts each check&rsquo;s FICA until
  the cap is reached.</p>

  <h3>Each exemption is worth $1,000 after the first, and a spouse counts as four</h3>
  <p>Circular M values one exemption at ${N($(facteurExemption(1)))} a year, and any number above one as ${N("$1,000")} times the number claimed plus
  ${N("$3,400")}. Its tables note that a claimed spouse counts as 4 exemptions, so you plus a spouse is 5, or ${N($(facteurExemption(5)))}. Form M-4 says that if your
  spouse is also subject to withholding, each of you may claim a personal exemption. We could not find a rule that tells you how many dependents to count beyond the form&rsquo;s
  own instruction to claim the total you are entitled to, so this calculator assumes one exemption for a single filer or head of household and five for a married couple,
  with no dependents. On ${N("$75,000")} for a single filer, filing no Form M-4 at all would raise withholding from ${N($$(a75.etat))} to ${N($$(sansM4))}, because the form says that
  without it Massachusetts income taxes are withheld from your wages without exemptions.</p>

  <h3>Head of household takes a $120 credit</h3>
  <p>Step 6 of the percentage method subtracts a head of household tax value of ${N($$(CREDIT_HOH))} a year from the tax. The calculator applies it to the head of household status only, so
  on ${N("$75,000")} the withholding is ${N($$(h75.etat))} instead of ${N($$(a75.etat))}.</p>

  <h3>Above $1,107,750, the surtax makes it 9%</h3>
  <p>Circular M adds a 4% surtax to the percentage method and calls ${N($(SEUIL))} &ldquo;the 2026 inflation-adjusted threshold for the 4% surtax.&rdquo; It applies to
  the part of the annual amount above it. On ${N($(1500000))} for a single filer the taxable amount is ${N($(baseUnMillionCinq))}: 5% of the first ${N($(SEUIL))} is
  ${N($$(SEUIL * TAUX))} and 9% of the remaining ${N($(baseUnMillionCinq - SEUIL))} is ${N($$((baseUnMillionCinq - SEUIL) * TAUX_HAUT))}, which is ${N($$(a1m5.etat))} in all. On ${N("$250,000")}
  the surtax does not come into play, and Massachusetts withholds ${N($$(a250.etat))}.</p>

  <h3>Under $8,000 a year, nothing is withheld</h3>
  <p>Circular M says not to withhold from employees who claim one or more exemptions if their annual wages are less than ${N($(PLANCHER))}. The calculator follows that rule, so on
  ${N($(PLANCHER - 1))} the withholding is ${N($$(a7999.etat))}, and at ${N($(PLANCHER))} the method applies in full and withholds ${N($$(a8k.etat))}. Form M-4 also lets a full-time student
  whose estimated annual income will not exceed $8,000 have nothing withheld, which the calculator does not model.</p>

  <h3>Paid family and medical leave comes out of your pay, up to 0.46%</h3>
  <p>The Department of Family and Medical Leave says an employer can withhold up to ${N("0.28%")} of eligible wages for medical leave and up to ${N("0.18%")} for family leave, which is ${N(pct(PFML.rate))}
  in all, and that individual contributions are capped by the Social Security taxable maximum. On ${N("$75,000")} that is ${N($$(progs(a75)))}; at ${N("$250,000")} the cap holds it
  to ${N($$(pfml250))}. The department also says employers may choose to cover a larger share, so what you actually pay can be lower. The same page says a 2026 law changes how the
  contribution is split between employer and worker starting January 1, 2027, so this page&rsquo;s figure applies to 2026 only.</p>

  <h3>Unemployment insurance is an employer cost</h3>
  <p>The Department of Unemployment Assistance&rsquo;s page on employer contributions describes unemployment insurance contributions, the Employer Medical Assistance Contribution and
  the Workforce Training Fund as contributions employers make, and we found no unemployment deduction from workers&rsquo; pay. The calculator takes none.</p>

  <h3>Your 401(k) lowers your Massachusetts wages</h3>
  <p>The Department of Revenue says elective deferrals to a 401(k), other than Roth contributions, are excluded from Massachusetts gross income to the same extent as they are excluded from
  federal gross income. That statement is on a page we read in a snapshot dated March 31, 2024, and Circular M does not mention 401(k) plans, so this is how we model it rather than
  a rule the Circular spells out. On ${N("$75,000")} with 6% going in, Massachusetts withholding falls by ${N($$(gain401))} a year. Enter 0 if your contribution is a Roth.</p>

  <h3>Employers can use a table instead of the formula</h3>
  <p>Circular M prints wage-bracket tables for weekly, biweekly, semimonthly and monthly pay and says to use the percentage method for exemptions or wages the tables do not cover.
  For the weekly table the two agree to the cent. A ${N("$75,000")} salary paid weekly is about $1,442 a check, above the weekly table&rsquo;s top row, which ends at $1,170, so an employer
  would use the percentage method for it.</p>

  <h3>Social Security stops, Medicare does not</h3>
  <p>Social Security is withheld at 6.2% until your wages reach ${N("$184,500")} in 2026, then
  stops for the rest of the year. Medicare has no ceiling at all: 1.45% on every dollar, plus an
  extra 0.9% on wages above ${N("$200,000")}. The paid leave contribution stops at the same ${N("$184,500")}, so on ${N("$250,000")} Massachusetts takes ${N($$(a250.etat))}
  in income tax withholding, about ${N((a250.etat / 250000 * 100).toFixed(1) + "%")} of wages, and ${N($$(progs(a250)))} for paid leave.</p>

  <h2>Common mistakes</h2>

  <h3>Multiplying your pay by 5%</h3>
  <p>The rate is 5%, but it applies after your exemption and the Social Security and Medicare deduction. On ${N("$75,000")} that is ${N($$(a75.etat))} withheld, not ${N($$(naif5))}.</p>

  <h3>Leaving Form M-4 blank</h3>
  <p>Without a Form M-4 on file, the form says Massachusetts income tax is withheld from your wages without exemptions. On ${N("$75,000")} that is ${N($$(sansM4))} instead of ${N($$(a75.etat))},
  ${N($$(sansM4 - a75.etat))} more than you would otherwise have withheld.</p>

  <h3>Assuming the 4% surtax reaches an ordinary salary</h3>
  <p>The 9% rate starts above ${N($(SEUIL))} of taxable annual wages. A ${N("$250,000")} salary never gets close to it.</p>

  <h3>Forgetting the paid leave contribution</h3>
  <p>A Massachusetts paycheck can lose up to ${N($$(progs(a75)))} a year on ${N("$75,000")} to paid family and medical leave, on top of income tax. A
  calculator that shows only income tax, Social Security and Medicare will show a figure that is too high.</p>

  <h3>Expecting the calculator to match the pay stub to the dollar</h3>
  <p>It will not, and no calculator can. Health insurance premiums and other pre-tax benefit
  deductions come out before tax and are not modeled here, your employer may cover part of the paid leave contribution, and the number of exemptions on your Form M-4 may differ from the
  one we assume. Read <a href="/disclaimer/">why your pay stub will differ</a> for the rest.</p>

  <h2>Example calculation</h2>
  <p>A single filer earning ${N($(a75.brut))} in Massachusetts in 2026, claiming one exemption, with no retirement
  contribution:</p>
  <ul>
    <li>Federal taxable income: ${N($(a75.brut))} &minus; federal standard deduction of
    ${N($(fedDed.single))} = ${N($(a75.brut - fedDed.single))}</li>
    <li>Federal income tax: ${N($$(a75.federal))}</li>
    <li>Social Security: ${N($(a75.brut))} &times; 6.2% = ${N($$(a75.ss))}</li>
    <li>Medicare: ${N($(a75.brut))} &times; 1.45% = ${N($$(a75.med))}</li>
    <li>Social Security and Medicare deducted for Massachusetts: ${N($$(a75.ss + a75.med))}, capped at ${N($(PLAFOND_FICA))}, so ${N($(PLAFOND_FICA))}</li>
    <li>Massachusetts taxable wages: ${N($(a75.brut))} &minus; ${N($(EX.single))} exemption &minus; ${N($(PLAFOND_FICA))} = ${N($(a75.brut - EX.single - PLAFOND_FICA))}</li>
    <li>Massachusetts withholding: ${N("5%")} &times; ${N($(a75.brut - EX.single - PLAFOND_FICA))} = ${N($$(a75.etat))}
    a year, which is ${N($$(a75.etat / 12))} on a monthly paycheck or ${N($$(a75.etat / 26))} on a biweekly one</li>
    <li>Paid family and medical leave: ${N($(a75.brut))} &times; 0.46% = ${N($$(a75.programmes[0].montant))}</li>
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
  <p>The same ${N($(REF))} salary, single filer, 2026 rates. Massachusetts borders New Hampshire, Rhode Island, Connecticut, New York and Vermont; New Hampshire and
  Rhode Island are the two we publish so far. Colorado is included because it, too, has a flat income tax and an employee-paid leave premium. Massachusetts is shown with one exemption.</p>
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
  <p>A <a href="/paycheck-calculator/new-hampshire/">New Hampshire</a> worker keeps ${N($$(nh75.net - a75.net))} more than a Massachusetts worker on the
  same salary, because New Hampshire withholds no income tax on wages in this calculator. A <a href="/paycheck-calculator/rhode-island/">Rhode Island</a> worker keeps ${N($$(Math.abs(ri75.net - a75.net)))} ${ri75.net < a75.net ? "less" : "more"}, and a
  <a href="/paycheck-calculator/colorado/">Colorado</a> worker keeps ${N($$(Math.abs(co75.net - a75.net)))} ${co75.net < a75.net ? "less" : "more"}.</p>

${blocSources(CLE)}

  <h2>Related reading</h2>
  <ul>
    <li><a href="/paycheck-calculator/">Paycheck calculators by state</a> &mdash; the full
    index, including which states have no income tax at all.</li>
    <li><a href="/paycheck-calculator/new-hampshire/">New Hampshire paycheck calculator</a> &mdash; the neighbor to the north, which does not
    withhold income tax on wages.</li>
    <li><a href="/paycheck-calculator/rhode-island/">Rhode Island paycheck calculator</a> &mdash; the neighbor to the south, with
    progressive withholding and an employee-paid disability insurance deduction.</li>
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
    Massachusetts rates.
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

/* Garde-fous : recoupement independant contre la formule du Circular M (page
   12, ecrite plus haut a partir du texte), pas contre notre propre moteur. */
const verifs = [["single", a75, 75000, 1, false], ["marriedJoint", j75, 75000, 5, false], ["headOfHousehold", h75, 75000, 1, true],
                ["single", a25, 25000, 1, false], ["single", a100, 100000, 1, false], ["single", a250, 250000, 1, false],
                ["single", a1m5, 1500000, 1, false], ["single", a20, 20000, 1, false],
                ["single", a8k, PLANCHER, 1, false], ["single", a7999, PLANCHER - 1, 1, false]];
for (const [statut, r, brut, n, hoh] of verifs) {
  const attendu = retenueCircular(brut, n, { hoh });
  if (Math.abs(attendu - r.etat) > 0.005) {
    console.error("ARRET : %s a %d $ : Circular M %s, moteur %s", statut, brut, attendu.toFixed(3), r.etat.toFixed(3));
    process.exit(2);
  }
}
/* Les chiffres ecrits dans la prose (verifies un a un a la main le 02/10/2026) */
if (!(Math.abs(a75.etat - 3430) < 0.005 && Math.abs(j75.etat - 3230) < 0.005 && Math.abs(h75.etat - 3310) < 0.005 &&
      Math.abs(sansM4 - 3650) < 0.005 && Math.abs(naif5 - a75.etat - 320) < 0.005 && Math.abs(sansM4 - a75.etat - 220) < 0.005 &&
      Math.abs(a1m5.etat - 90114) < 0.005 && Math.abs(a8k.etat - 149.4) < 0.005 && a7999.etat === 0 &&
      Math.abs(progs(a75) - 345) < 0.005 && Math.abs(pfml250 - 848.7) < 0.005 && Math.abs(gain401 - 225) < 0.005)) {
  console.error("ARRET : arithmetique de la prose (3 430 / 3 230 / 3 310 / 3 650 / 320 / 220 / 90 114 / 149,40 / 345 / 848,70 / 225)");
  process.exit(2);
}
/* Le Circular : 1 exemption = 4 400 $, « 1 000 x n + 3 400 », conjoint = 4 exemptions. */
if (!(facteurExemption(1) === 4400 && facteurExemption(5) === EX.marriedJoint && EX.single === 4400 && EX.headOfHousehold === 4400)) {
  console.error("ARRET : les exemptions 4 400 / 8 400 ne sont plus celles du Circular"); process.exit(2);
}
if (!(TAUX === 0.05 && TAUX_HAUT === 0.09 && SEUIL === 1107750 && PLAFOND_FICA === 2000 && PLANCHER === 8000 && CREDIT_HOH === 120)) {
  console.error("ARRET : les taux / seuils ecrits dans la prose ne sont plus ceux du moteur"); process.exit(2);
}
if (!(PFML.rate === 0.0046 && PFML.wageCap === R.fica.socialSecurity.wageBase && PFML.wageCap === 184500)) {
  console.error("ARRET : le PFML (0,46 %, plafond = Social Security) n'est plus celui du moteur"); process.exit(2);
}
if (Math.abs(PFML.rate - (0.0028 + 0.0018)) > 1e-12) { console.error("ARRET : 0,28 % + 0,18 % != 0,46 %"); process.exit(2); }
/* « about $26,144 », « about $1,442 a week » (au-dessus de la ligne $1,170) */
if (!(Math.round(seuilFica) === 26144 && Math.round(75000 / 52) === 1442 && 75000 / 52 > 1170)) {
  console.error("ARRET : 26 144 $ / 1 442 $ par semaine"); process.exit(2);
}
if (!(a20.ss + a20.med < PLAFOND_FICA && Math.abs(a20.ss + a20.med - 1530) < 0.005)) {
  console.error("ARRET : a 20 000 $ la FICA n'est plus 1 530 $ < 2 000 $"); process.exit(2);
}
if (!(nh75.net > a75.net && R.states["new-hampshire"].incomeTax.hasIncomeTax === false && (R.states["new-hampshire"].employeePrograms || []).length === 0)) {
  console.error("ARRET : « New Hampshire withholds nothing on wages » est faux"); process.exit(2);
}
if (!(co75.programmes.length && ri75.programmes.length)) { console.error("ARRET : CO / RI n'ont plus de prime salariee"); process.exit(2); }
/* Le 401(k) ne change ni la FICA deduite ni le PFML (calcules sur le brut). */
if (!(Math.abs(progs(r401) - progs(a75)) < 1e-9)) { console.error("ARRET : le PFML depend du 401(k)"); process.exit(2); }
const nbMotsReponse = reponse.replace(/&[a-z]+;/g, " ").split(/\s+/).length;
if (nbMotsReponse < 40 || nbMotsReponse > 60) {
  console.error("ARRET : la reponse directe fait %d mots (40-60 attendus)", nbMotsReponse);
  process.exit(2);
}
if (mots < 1500) { console.error("ARRET : %d mots, sous le plancher de 1 500", mots); process.exit(2); }
if (/\$NaN|undefined|NaN/.test(html)) { console.error("ARRET : valeur manquante dans la page"); process.exit(2); }
console.log("recoupements Circular M (single, married, HoH a 75 000 $ ; 25 000, 100 000, 250 000, 1 500 000, 20 000, 8 000, 7 999 $) : OK ; reponse directe %d mots", nbMotsReponse);
