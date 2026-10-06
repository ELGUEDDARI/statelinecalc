/* Construit /paycheck-calculator/new-hampshire/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * New Hampshire est le 24e Etat publie et le 8e sans impot sur le revenu du
 * travail (apres Texas, Floride, Nevada, Tennessee, Washington, Alaska et
 * Wyoming). Ce qui le distingue des sept autres :
 *   1. New Hampshire ne s'est PAS toujours contente d'un simple zero. Jusqu'en
 *      2024, l'Etat taxait les INTERETS ET DIVIDENDES a 3% (une taxe sur les
 *      revenus de placement, jamais sur les salaires). Cette taxe a ete
 *      integralement abrogee a compter des periodes fiscales ouvertes apres
 *      le 31 decembre 2024 : depuis le 1er janvier 2025, et donc pour toute
 *      l'annee 2026 modelisee ici, le New Hampshire n'a plus AUCUNE taxe sur
 *      le revenu, ni sur les salaires (jamais taxes) ni sur les placements
 *      (desormais abroges). C'est un Etat qui vient de DEVENIR un Etat sans
 *      aucun impot sur le revenu, pas un Etat qui l'a toujours ete.
 *   2. Aucun voisin reel de New Hampshire (Maine, Vermont, Massachusetts)
 *      n'est publie sur ce site : le bloc de comparaison utilise donc les
 *      autres Etats sans impot deja publies, et la Pennsylvanie comme
 *      contraste impose, le meme choix editorial que l'Alaska (Illinois).
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/lib/sources.js.
 * revenue.nh.gov et nhes.nh.gov refusent les requetes automatisees (HTTP 403
 * a curl, a PowerShell et a un Chromium reel) : les deux documents ont ete
 * lus via leurs instantanes Internet Archive (voir data/rates-2026.js), meme
 * discipline que l'Idaho et la Virginie.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js et
 * .tooling/lib/paliers.js. Lancer : node .tooling/ops/build-new-hampshire.js
 */
const fs = require("fs");
const path = require("path");
const LIB = require("../lib/paie.js");
const { grilleEtats } = require("../lib/etats-publies.js");
const { blocSources } = require("../lib/sources.js");
const { blocLimites, blocChecklist } = require("../lib/limites.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const { colonne } = require("../lib/colonne.js");

const RACINE = path.join(__dirname, "..", "..");
const ETAT = "new-hampshire";
const NOM = "New Hampshire";
const URL = "https://statelinecalc.com/paycheck-calculator/new-hampshire/";
const AUJOURD_HUI = "2026-09-29";
const LISIBLE = "September 29, 2026";

const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const $ = n => "$" + c2(n);
const $0 = n => "$" + c0(n);
const q = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();

/* --- les chiffres, tous calcules --------------------------------------- */
const REF = 60000;
const r60 = LIB.calcul(ETAT, REF);

const { SALAIRES, TAUX_HORAIRES, HEURES_PAR_AN: HEURES } = require("../lib/paliers.js");

const lignesSalaire = SALAIRES.map(b => {
  const r = LIB.calcul(ETAT, b);
  return { brut: b, federal: r.federal, fica: r.ss + r.med, net: r.net,
           mois: r.net / 12, taux: r.taux };
});

const lignesHoraire = TAUX_HORAIRES.map(t => {
  const r = LIB.calcul(ETAT, t * HEURES);
  return { taux: t, brut: t * HEURES, net: r.net, netH: r.net / HEURES };
});

/* Aucun voisin reel (Maine, Vermont, Massachusetts) n'est publie sur ce
 * site : la comparaison porte sur les autres Etats sans impot, plus la
 * Pennsylvanie comme contraste impose (meme choix editorial que l'Alaska). */
const COMPARE = ["new-hampshire", "texas", "washington", "wyoming", "tennessee", "pennsylvania"];
const lignesCompare = COMPARE.map(k => {
  const r = LIB.calcul(k, REF);
  return { cle: k, nom: null, net: r.net, etat: r.etat, taux: r.taux };
});
const NOMS = { "new-hampshire": "New Hampshire", texas: "Texas", washington: "Washington",
               wyoming: "Wyoming", tennessee: "Tennessee", pennsylvania: "Pennsylvania" };
lignesCompare.forEach(l => { l.nom = NOMS[l.cle]; });
lignesCompare.sort((a, b) => b.net - a.net);

const ecartPA = LIB.calcul(ETAT, REF).net - LIB.calcul("pennsylvania", REF).net;
const ecartWA = LIB.calcul(ETAT, REF).net - LIB.calcul("washington", REF).net;

/* --- la FAQ ------------------------------------------------------------- */
const FAQ = [
  ["Does New Hampshire have a state income tax?",
   "No. New Hampshire does not tax an individual&rsquo;s reported W-2 wages, and since 2025 it " +
   "does not tax anything else either. Until 2024 the state ran a separate 3% tax on interest " +
   "and dividend income &mdash; never on wages &mdash; and that tax was fully repealed for " +
   "taxable periods beginning after December 31, 2024. On " + $0(REF) + " you keep about " +
   $0(r60.net) + " a year."],

  ["Wasn't there a New Hampshire tax on interest and dividends?",
   "Yes, but it is gone. The Interest and Dividends Tax was 5% before the end of 2023, cut to " +
   "4% for periods ending on or after December 31, 2023, then 3% for periods ending on or after " +
   "December 31, 2024, and repealed outright for taxable periods beginning after that date. It " +
   "only ever applied to interest and dividend income above a threshold, never to wages, so it " +
   "never touched a paycheck &mdash; but as of 2025 it does not touch anything at all."],

  ["What is taken out of a New Hampshire paycheck?",
   "Federal income tax, Social Security at 6.2% and Medicare at 1.45% &mdash; nothing at state " +
   "or local level. Unemployment insurance is paid entirely by the employer, so it never reaches " +
   "an employee's pay stub. That is not true of every state without a wage tax: Washington still " +
   "takes Paid Family and Medical Leave and WA Cares out of every check, and Alaska withholds a " +
   "share of unemployment insurance from wages. New Hampshire takes nothing beyond the federal " +
   "and FICA lines."],

  ["How much unemployment insurance do New Hampshire employers pay?",
   "New employers start at 2.7% of the first $14,000 paid to each employee each year, before any " +
   "Fund Balance Reduction in effect that quarter; established employers move to an " +
   "experience-rated figure. None of it is withheld from wages: it is the employer's cost alone, " +
   "and it never appears on a pay stub."],

  ["How much is " + $0(REF) + " after taxes in New Hampshire?",
   "About " + $0(r60.net) + " a year, or " + $(r60.net / 12) + " a month, for a single filer " +
   "taking the standard deduction in 2026 with no 401(k) contribution. That is an effective " +
   "rate of " + (r60.taux * 100).toFixed(1) + "%, all of it federal and FICA. The same salary " +
   "in Pennsylvania, which does tax wages, leaves " +
   $0(LIB.calcul("pennsylvania", REF).net) + "."],

  ["Do New Hampshire cities or towns tax wages?",
   "No. There is no municipal or county income tax anywhere in New Hampshire. The absence of a " +
   "state wage tax leaves nothing for a town or city to add a local rate on top of."]
];

/* --- le HTML ------------------------------------------------------------ */
const TITRE = "New Hampshire (NH) Paycheck Calculator 2026 — Take-Home Pay";
const DESC = "New Hampshire (NH) has no tax on wages, and none on interest or dividends since " +
  "2025. See how much of " + $0(REF) + " you keep after federal tax and FICA in 2026.";

const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "name": "New Hampshire Paycheck Calculator 2026",
      "url": URL, "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any", "browserRequirements": "Requires JavaScript",
      "description": DESC,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "publisher": { "@id": "https://statelinecalc.com/#organization" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Paycheck Calculator", "item": "https://statelinecalc.com/paycheck-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "New Hampshire", "item": URL }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": FAQ.map(([question, reponse]) => ({
        "@type": "Question", "name": question,
        "acceptedAnswer": { "@type": "Answer", "text": reponse }
      }))
    },
    require("../lib/entite.js").organisation
  ]
};

const html = `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js" defer></script>
<meta name="msvalidate.01" content="6BC658742CD039312B23F62F699F2B93">
<title>${TITRE}</title>
<meta name="description" content="${q(DESC)}">
<link rel="canonical" href="${URL}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">
<meta property="og:title" content="${q(TITRE)}">
<meta property="og:site_name" content="StateLine Calc">
<meta name="application-name" content="StateLine Calc">
<meta property="og:description" content="${q(DESC)}">
<meta property="og:url" content="${URL}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">
${JSON.stringify(jsonld, null, 2)}
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
    <li aria-current="page">New Hampshire</li>
  </ol>
</nav>

  <h1>New Hampshire Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>New Hampshire takes <strong>nothing</strong> from your wages at state or local level, and
    since 2025 it does not tax interest or dividend income either &mdash; a separate 3% tax on
    those was fully repealed. On <span class="num">${$0(REF)}</span> you keep about
    <strong class="num">${$0(r60.net)}</strong> a year &mdash; an effective rate of
    ${(r60.taux * 100).toFixed(1)}%, every point of it federal.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

${blocChecklist()}

  <h2 id="calc-h">Calculate your New Hampshire take-home pay</h2>
  <form class="calc" data-paycheck-form data-state="new-hampshire" novalidate>
    <div class="field">
      <label for="salary">Your gross pay or hourly rate</label>
      <input type="text" id="salary" name="salary" inputmode="decimal" value="60000" autocomplete="off">
      <span class="help">Before any taxes or deductions. Do not include tips paid in cash.</span>
      <span class="error" role="alert">Enter an amount greater than zero.</span>
    </div>
    <div class="row row-2">
      <div class="field">
        <label for="period">How often you are paid</label>
        <select id="period" name="period">
          <option value="annual" selected>Per year</option>
          <option value="monthly">Per month</option>
          <option value="semimonthly">Twice a month</option>
          <option value="biweekly">Every two weeks</option>
          <option value="weekly">Per week</option>
          <option value="hourly">Per hour</option>
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
        <span class="help">New Hampshire has no state filing status &mdash; this changes your federal tax only.</span>
      </div>
    </div>
    <div class="field" data-hours-field>
      <label for="hours">Hours per week</label>
      <input type="text" id="hours" name="hours" inputmode="decimal" value="40" autocomplete="off">
      <span class="help">Your real hours, not an assumed 2,080 a year.</span>
    </div>
    <div class="row row-2">
      <div class="field">
        <label for="retirement">401(k) contribution</label>
        <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0" autocomplete="off">
        <span class="help">Percent of gross pay. It lowers your federal tax. There is no state tax here for it to lower.</span>
      </div>
      <div class="field">
        <label for="display">Show results</label>
        <select id="display" name="display">
          <option value="annual" selected>Per year</option>
          <option value="monthly">Per month</option>
          <option value="semimonthly">Twice a month</option>
          <option value="biweekly">Every two weeks</option>
          <option value="weekly">Per week</option>
          <option value="hourly">Per hour</option>
        </select>
        <span class="help">Changes the period, not the calculation.</span>
      </div>
    </div>
    <button type="submit" class="btn btn-primary">Calculate</button>
  </form>
  <div class="result" data-paycheck-result aria-live="polite"></div>
  <p class="caption">Everything is calculated in your browser. Nothing you type is sent to us or stored.</p>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <div class="prose">
    <h2>How this calculator works</h2>
    <p>New Hampshire is one of the simplest paychecks in the country to work out, because there
    is no state or local layer to add. Whatever the federal government and FICA leave you is
    what reaches your account. Three deductions, and that is the whole list:</p>
    <ul>
      <li><strong>Federal income tax</strong>, on your pay after the standard deduction, at the
      2026 brackets.</li>
      <li><strong>Social Security</strong>, 6.2% of gross pay up to the annual wage base.</li>
      <li><strong>Medicare</strong>, 1.45% of gross pay with no cap, plus 0.9% on pay above
      $200,000.</li>
    </ul>
    <p>There is no fourth line. New Hampshire has no state withholding, no local income tax, and
    no other payroll deduction taken from wages. Unemployment insurance is financed by the employer,
    which is why it never appears on your pay stub.</p>
    <p>That last point is worth stating plainly, because &ldquo;no income tax&rdquo; does not
    always mean &ldquo;nothing comes out&rdquo;. <a href="/paycheck-calculator/alaska/">Alaska</a>
    has no income tax either and still withholds a share of unemployment insurance from every
    check. New Hampshire really does take nothing.</p>

    <h2>The tax that used to exist, and does not anymore</h2>
    <p>New Hampshire has never taxed wages. What it did tax, until recently, was investment
    income: interest and dividends above a threshold, at a rate that had already been stepping
    down for several years. The New Hampshire Department of Revenue Administration&rsquo;s own
    page on the tax lays out the schedule plainly:</p>
    <blockquote>
      <p>&ldquo;The tax was assessed at 5% for tax periods ending prior to December 31, 2023, 4%
      for taxable periods ending on or after December 31, 2023, and 3% for taxable periods
      ending on or after December 31, 2024. The I&amp;D Tax was repealed for taxable periods
      beginning after December 31, 2024.&rdquo;</p>
    </blockquote>
    <p>That repeal means tax year 2026, the year this calculator models, is the second full year
    with no Interest and Dividends Tax on the books. The same page states the wage position
    directly: &ldquo;The State of New Hampshire does not have an income tax on an individual's
    reported W-2 wages.&rdquo; Combined, the two sentences describe a state where nothing taxes
    personal income &mdash; wages were never in scope, and the one tax that touched investment
    income is gone.</p>

    <h2>New Hampshire take-home pay by salary</h2>
    <p>Single filer, standard deduction, 2026 rates, no 401(k) contribution. Every figure comes
    from the same arithmetic the calculator above runs.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Gross salary</th><th>Federal tax</th><th>Social Security + Medicare</th><th>State tax</th><th>Take-home pay</th><th>Per month</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesSalaire.map(l => `          <tr><td class="num">${$0(l.brut)}</td><td class="num">${$0(l.federal)}</td><td class="num">${$0(l.fica)}</td><td class="num">$0</td><td class="num"><strong>${$0(l.net)}</strong></td><td class="num">${$0(l.mois)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>

    <h2>New Hampshire hourly paycheck: what your rate is worth after tax</h2>
    <p>At 40 hours a week for 52 weeks. The gross hourly rate is the same everywhere; what
    survives tax is not.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Gross hourly rate</th><th>Gross a year</th><th>Take-home a year</th><th>Real hourly rate</th></tr></thead>
        <tbody>
${lignesHoraire.map(l => `          <tr><td class="num">$${l.taux}.00</td><td class="num">${$0(l.brut)}</td><td class="num">${$0(l.net)}</td><td class="num"><strong>$${c2(l.netH)}</strong></td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

${blocLimites()}

    <h2>Key facts that affect your take-home pay in New Hampshire</h2>
    <ul>
      <li><strong>No tax on wages, and none on investment income either, as of 2025.</strong> The
      Interest and Dividends Tax, which never touched a paycheck, is fully repealed for taxable
      periods beginning after December 31, 2024.</li>
      <li><strong>No state filing status.</strong> Marriage changes your federal tax and nothing
      else. The selector above is federal-only for this state.</li>
      <li><strong>A 401(k) still helps, but only federally.</strong> Deferring pay cuts your
      federal tax; there is no state tax here for it to cut.</li>
      <li><strong>Unemployment insurance is the employer's.</strong> New employers start at 2.7%
      of the first $14,000 per employee, before any quarterly Fund Balance Reduction; none of it
      is withheld from wages.</li>
    </ul>

    <h2>Common mistakes people make</h2>
    <ul>
      <li><strong>Assuming a no-tax state means nothing is withheld.</strong> True in New
      Hampshire, not true in Washington or Alaska. Check the state, not the label.</li>
      <li><strong>Confusing the old Interest and Dividends Tax with a wage tax.</strong> Even
      before it was repealed in 2025, it never applied to a paycheck &mdash; only to interest
      and dividend income above a threshold.</li>
      <li><strong>Comparing a New Hampshire offer to one in Pennsylvania on gross pay alone.</strong>
      On ${$0(REF)} the gap is ${$0(ecartPA)} a year, which is real money and does not show up
      in the salary line.</li>
    </ul>

    <h2>Example calculation</h2>
    <p>A single filer on <strong>${$0(REF)}</strong> in New Hampshire, 2026, no 401(k):</p>
    <ul>
      <li>Gross pay: <span class="num">${$(REF)}</span></li>
      <li>Federal income tax: &minus;<span class="num">${$(r60.federal)}</span></li>
      <li>Social Security (6.2%): &minus;<span class="num">${$(r60.ss)}</span></li>
      <li>Medicare (1.45%): &minus;<span class="num">${$(r60.med)}</span></li>
      <li>New Hampshire state tax: <span class="num">$0.00</span></li>
      <li><strong>Take-home pay: <span class="num">${$(r60.net)}</span> a year</strong>, or
      <span class="num">${$(r60.net / 12)}</span> a month</li>
    </ul>

    <h2>Compare with other states</h2>
    <p>The same ${$0(REF)}, single filer, 2026. New Hampshire&rsquo;s real neighbors Maine and Vermont
    are not yet published on this site, while Massachusetts has its own page. The table
    below lines it up against the other states here with no wage tax, plus Pennsylvania as a
    contrast that does tax wages.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>State</th><th>State tax on ${$0(REF)}</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesCompare.map(l => `          <tr><td>${l.cle === ETAT ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</td><td class="num">${l.etat > 0 ? $0(l.etat) : "$0"}</td><td class="num">${$0(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p>New Hampshire, Texas, Wyoming and Tennessee all come out identical to the cent, because
    none of them withholds anything at state or local level from a paycheck. Washington has no
    income tax either, but its Paid Family and Medical Leave and WA Cares premiums still leave it
    <strong>${$0(ecartWA)}</strong> below New Hampshire on the same salary &mdash; a reminder that
    &ldquo;no income tax&rdquo; is not the same claim as &ldquo;nothing withheld.&rdquo; Against
    Pennsylvania, which taxes wages at a flat 3.07% and adds a small employee unemployment-insurance
    withholding on top of that, the gap is <strong>${$0(ecartPA)}</strong> a year on the same
    gross pay.</p>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

    <h2>Frequently asked questions</h2>
    <div class="faq">
${FAQ.map(([question, reponse]) => `      <h3>${question}</h3>\n      <p>${reponse}</p>`).join("\n")}
    </div>

  ${blocSources("new-hampshire")}

  <h2>Related reading</h2>
    <ul>
      <li><a href="/paycheck-calculator/">Paycheck calculators for every state we publish</a></li>
      <li><a href="/paycheck-calculator/pennsylvania/">Pennsylvania paycheck calculator</a>
      &mdash; the nearest state on this site that does tax wages</li>
      <li><a href="/paycheck-calculator/wyoming/">Wyoming paycheck calculator</a> &mdash;
      another state with no income tax at any level</li>
      <li><a href="/methodology/">How we calculate these figures, and where the rates come from</a></li>
    </ul>
  </div>

${carteUsa(NOM, { avecListe: false })}

  <h2>Browse paycheck calculators by state</h2>
  <ul class="linkgrid">
${grilleEtats()}
  </ul>

  <p class="dates">
    Published <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Last updated <time datetime="${AUJOURD_HUI}">${LISIBLE}</time> &middot;
    Rates verified against IRS and Social Security Administration figures, against the New
    Hampshire Department of Revenue Administration's page on the repealed Interest and
    Dividends Tax, and against the New Hampshire Employment Security pages for the 2026
    unemployment insurance wage base and new-employer tax rate.
  </p>
  <p class="disclaimer">StateLine Calc provides general information for educational purposes
  only. It is not financial, tax or legal advice. Results are estimates based on published 2026
  federal rates. New Hampshire levies no individual income tax on wages at state or local level,
  and its former tax on interest and dividend income was repealed for taxable periods beginning
  after December 31, 2024.</p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<script src="/data/rates-2026.js" defer></script>
<script src="/assets/calc-paycheck.js" defer></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", ETAT);
fs.mkdirSync(dossier, { recursive: true });
const dest = path.join(dossier, "index.html");
fs.writeFileSync(dest, require("../lib/jsonld.js").nettoieJsonLd(html));
console.log("ECRIT : /paycheck-calculator/" + ETAT + "/index.html  (" + fs.statSync(dest).size + " octets)");
console.log("  net sur " + $0(REF) + " : " + $(r60.net) + "  (" + (r60.taux * 100).toFixed(1) + " %)");
console.log("  " + lignesSalaire.length + " lignes de salaire, " + lignesHoraire.length +
            " lignes horaires, " + lignesCompare.length + " Etats compares, " + FAQ.length + " questions");
