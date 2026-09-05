/* Construit /paycheck-calculator/tennessee/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le Tennessee est le 12e Etat publie et le 4e sans impot sur le revenu, apres
 * le Texas, la Floride et le Nevada. Le risque etait d'ecrire une 4e page
 * interchangeable — c'est exactement le defaut de contenu a l'echelle releve le
 * 05/09/2026 sur les pages par taux. Ce que le Tennessee a de propre, et
 * qu'aucun des trois autres n'a :
 *   1. Il A EU un impot sur le revenu et l'a supprime, par etapes datees et
 *      votees : 6 % -> 5 % -> 4 % -> 3 % -> 2 % -> 1 % -> 0 %. C'est une
 *      histoire, pas un etat de fait.
 *   2. Cet impot — le Hall income tax — ne frappait QUE les interets et les
 *      dividendes. Un salarie du Tennessee n'a jamais paye d'impot d'Etat sur
 *      son salaire, meme avant 2021. C'est contre-intuitif et c'est vrai.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans .tooling/sources/tennessee.md et dans data/rates-2026.js.
 * ⛔ tn.gov est INJOIGNABLE depuis cette machine (4 methodes, 4 echecs, dont un
 * vrai Chromium). Ne pas retenter. Les deux hotes qui repondent sont
 * publications.tnsosfiles.com et web.archive.org.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-tennessee.js
 */
const fs = require("fs");
const path = require("path");
const LIB = require("../lib/paie.js");
const { grilleEtats } = require("../lib/etats-publies.js");
const { entete, piedDePage } = require("../lib/gabarit.js");
const { carteUsa } = require("../lib/bloc-carte.js");
const { colonne } = require("../lib/colonne.js");

const RACINE = path.join(__dirname, "..", "..");
const ETAT = "tennessee";
const NOM = "Tennessee";
const URL = "https://statelinecalc.com/paycheck-calculator/tennessee/";
const AUJOURD_HUI = "2026-09-05";
const LISIBLE = "September 5, 2026";

const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const $ = n => "$" + c2(n);
const $0 = n => "$" + c0(n);
const q = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();

/* --- les chiffres, tous calcules --------------------------------------- */
const REF = 60000;
const r60 = LIB.calcul(ETAT, REF);

const SALAIRES = [30000, 40000, 50000, 60000, 70000, 80000, 100000, 120000, 150000, 200000];
const lignesSalaire = SALAIRES.map(b => {
  const r = LIB.calcul(ETAT, b);
  return { brut: b, federal: r.federal, fica: r.ss + r.med, net: r.net, taux: r.taux };
});

const TAUX_H = [15, 18, 20, 22, 25, 30, 35, 40, 50];
const HEURES = 2080;
const lignesHoraire = TAUX_H.map(t => {
  const r = LIB.calcul(ETAT, t * HEURES);
  return { taux: t, brut: t * HEURES, net: r.net, netH: r.net / HEURES };
});

/* Les Etats voisins publies, plus les trois autres sans impot : c'est la
   comparaison que le visiteur du Tennessee fait vraiment. */
const COMPARE = ["tennessee", "georgia", "texas", "florida", "nevada", "illinois"];
const lignesCompare = COMPARE.map(k => {
  const r = LIB.calcul(k, REF);
  return { cle: k, nom: LIB.RATES ? null : null, net: r.net, etat: r.etat, taux: r.taux };
});
const NOMS = { tennessee: "Tennessee", georgia: "Georgia", texas: "Texas",
               florida: "Florida", nevada: "Nevada", illinois: "Illinois" };
lignesCompare.forEach(l => { l.nom = NOMS[l.cle]; });
lignesCompare.sort((a, b) => b.net - a.net);

const ecartGA = LIB.calcul(ETAT, REF).net - LIB.calcul("georgia", REF).net;
const ecartIL = LIB.calcul(ETAT, REF).net - LIB.calcul("illinois", REF).net;

/* --- la FAQ ------------------------------------------------------------- */
const FAQ = [
  ["Does Tennessee have a state income tax?",
   "No. Tennessee levies no income tax on wages, and it never has. The state's only individual " +
   "income tax was the Hall income tax, which applied to interest and dividends rather than to " +
   "salaries, and its rate has been zero percent since tax years beginning January 1, 2021. " +
   "Public Chapter 181 of 2017 set that out in steps: 4% in 2017, 3% in 2018, 2% in 2019, 1% in " +
   "2020, then zero. On " + $0(REF) + " you keep about " + $0(r60.net) + " a year."],

  ["What is taken out of a Tennessee paycheck?",
   "Federal income tax, Social Security at 6.2% and Medicare at 1.45% — and nothing else at " +
   "state level. Tennessee has no state withholding, and unemployment insurance is paid by the " +
   "employer rather than deducted from the employee, so a Tennessee payslip has no state line " +
   "on it at all. That is not true of every state without an income tax: Washington still takes " +
   "Paid Family and Medical Leave and WA Cares out of every check."],

  ["Was the Hall income tax ever taken out of wages?",
   "No, and this is the part people get wrong. The Hall income tax applied to income from " +
   "interest on bonds and dividends from stocks, not to earned income. A Tennessee worker paid " +
   "no state tax on a salary even in the years the Hall tax was in force. What ended in 2021 " +
   "was a tax on investment income."],

  ["How much is " + $0(REF) + " after taxes in Tennessee?",
   "About " + $0(r60.net) + " a year, or " + $(r60.net / 12) + " a month, for a single filer " +
   "taking the standard deduction in 2026 with no 401(k) contribution. That is an effective " +
   "rate of " + (r60.taux * 100).toFixed(1) + "%, all of it federal and FICA. The same salary " +
   "in Georgia leaves " + $0(LIB.calcul("georgia", REF).net) + " and in Illinois " +
   $0(LIB.calcul("illinois", REF).net) + "."],

  ["Is take-home pay in Tennessee the same as in Texas or Florida?",
   "Yes, to the cent, for the same gross pay and the same filing status. None of the three " +
   "withholds anything at state level, so what the federal government and FICA leave is what " +
   "you keep. The difference between those states is in what they charge elsewhere — sales " +
   "tax, property tax and business taxes — none of which comes out of a paycheck."],

  ["Do any Tennessee cities levy their own income tax?",
   "No. Some states let cities tax wages on top of the state — Ohio and Michigan both do, and " +
   "Detroit takes 2.4% from residents — but Tennessee has no local income tax, so there is no " +
   "city layer to add to the figures on this page."]
];

/* --- le HTML ------------------------------------------------------------ */
const TITRE = "Tennessee Paycheck Calculator 2026 — Take-Home Pay After Tax";
const DESC = "Tennessee takes nothing from your wages at state level. See what " + $0(REF) +
  " leaves you after federal tax and FICA, with the statute that set the state rate to zero.";

const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "name": "Tennessee Paycheck Calculator 2026",
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
        { "@type": "ListItem", "position": 3, "name": "Tennessee", "item": URL }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": FAQ.map(([question, reponse]) => ({
        "@type": "Question", "name": question,
        "acceptedAnswer": { "@type": "Answer", "text": reponse }
      }))
    }
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
<script src="/assets/analytics.js"></script>
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
    <li aria-current="page">Tennessee</li>
  </ol>
</nav>

  <h1>Tennessee Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Tennessee takes <strong>nothing</strong> from your wages at state level, and it never
    has. The state's only individual income tax was the <strong>Hall income tax</strong>, which
    fell on interest and dividends rather than on salaries, and its rate has been
    <strong>zero</strong> since 2021. On <span class="num">${$0(REF)}</span> you keep about
    <strong class="num">${$0(r60.net)}</strong> a year &mdash; an effective rate of
    ${(r60.taux * 100).toFixed(1)}%, every point of it federal.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

  <h2 id="calc-h">Calculate your Tennessee take-home pay</h2>
  <form class="calc" data-paycheck-form data-state="tennessee" novalidate>
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
        <span class="help">Tennessee has no state filing status &mdash; this changes your federal tax only.</span>
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
    <p>Tennessee is the simplest paycheck in the country to work out, because there is no state
    layer to work out. Whatever the federal government and FICA leave you is what reaches your
    account. Three deductions, and that is the whole list:</p>
    <ul>
      <li><strong>Federal income tax</strong>, on your pay after the standard deduction, at the
      2026 brackets.</li>
      <li><strong>Social Security</strong>, 6.2% of gross pay up to the annual wage base.</li>
      <li><strong>Medicare</strong>, 1.45% of gross pay with no cap, plus 0.9% on pay above
      $200,000.</li>
    </ul>
    <p>There is no fourth line. Tennessee has no state withholding, no local income tax, and no
    payroll program deducted from wages. Unemployment insurance is financed by the employer,
    which is why it never appears on your payslip.</p>
    <p>That last point is worth stating plainly, because &ldquo;no income tax&rdquo; does not
    always mean &ldquo;nothing comes out&rdquo;. <a href="/paycheck-calculator/washington/">Washington</a>
    has no income tax either and still deducts Paid Family and Medical Leave and WA Cares from
    every check &mdash; about ${$0(LIB.calcul(ETAT, REF).net - LIB.calcul("washington", REF).net)}
    a year more than Tennessee on ${$0(REF)}. Tennessee really does take nothing.</p>

    <h2>The tax Tennessee got rid of, and what it actually taxed</h2>
    <p>Tennessee did once have an individual income tax: the <strong>Hall income tax</strong>,
    named after the senator who introduced it in 1929. Two things about it are almost always
    reported wrongly.</p>
    <p><strong>It never touched wages.</strong> The Hall tax applied to income from interest on
    bonds and dividends from stocks &mdash; investment income. A Tennessee worker paid no state
    tax on a salary in 2015, and pays none in 2026. What changed was a tax on savings, not on
    work.</p>
    <p><strong>It was removed on a published schedule, not all at once.</strong> Public
    Chapter 181 of 2017 amended section 67-2-102 of the Tennessee Code to set the rate year by
    year:</p>
    <div class="table-scroll">
      <table>
        <caption class="caption caption-left">Hall income tax rate, as written into Tennessee
        Code Annotated &sect;&nbsp;67-2-102 by Public Chapter 181 of 2017.</caption>
        <thead><tr><th>Tax year beginning</th><th>Rate</th></tr></thead>
        <tbody>
          <tr><td>Before 2017</td><td class="num">5%</td></tr>
          <tr><td>On or after January 1, 2017</td><td class="num">4%</td></tr>
          <tr><td>On or after January 1, 2018</td><td class="num">3%</td></tr>
          <tr><td>On or after January 1, 2019</td><td class="num">2%</td></tr>
          <tr><td>On or after January 1, 2020</td><td class="num">1%</td></tr>
          <tr><td><strong>On or after January 1, 2021</strong></td><td class="num"><strong>0%</strong></td></tr>
        </tbody>
      </table>
    </div>
    <p>The same act moved the repeal date itself forward from 2022 to 2021. Tennessee's
    Department of Revenue now lists the Hall income tax under <em>Archived Taxes</em>, beside the
    gift tax and the inheritance tax.</p>

    <h2>Tennessee take-home pay by salary</h2>
    <p>Single filer, standard deduction, 2026 rates, no 401(k) contribution. Every figure comes
    from the same arithmetic the calculator above runs.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Gross salary</th><th>Federal tax</th><th>Social Security + Medicare</th><th>State tax</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesSalaire.map(l => `          <tr><td class="num">${$0(l.brut)}</td><td class="num">${$0(l.federal)}</td><td class="num">${$0(l.fica)}</td><td class="num">$0</td><td class="num"><strong>${$0(l.net)}</strong></td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>

    <h2>Tennessee hourly paycheck: what your rate is worth after tax</h2>
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

    <h2>Key facts that affect your take-home pay in Tennessee</h2>
    <ul>
      <li><strong>No state income tax on wages, and no local one either.</strong> Unlike
      <a href="/paycheck-calculator/ohio/">Ohio</a> or
      <a href="/paycheck-calculator/michigan/">Michigan</a>, where cities add their own tax on
      top, there is no municipal layer here.</li>
      <li><strong>No state filing status.</strong> Marriage changes your federal tax and nothing
      else. The selector above is federal-only for this state.</li>
      <li><strong>A 401(k) still helps, but only federally.</strong> Deferring pay cuts your
      federal tax; there is no state tax for it to cut.</li>
      <li><strong>Unemployment insurance is the employer's.</strong> Tennessee's Department of
      Labor files it under employers, not employees, so it never reaches your payslip.</li>
    </ul>

    <h2>Common mistakes people make</h2>
    <ul>
      <li><strong>Assuming the Hall tax used to come out of wages.</strong> It did not. It taxed
      interest and dividends. Someone looking back at a 2019 payslip will find no state line on
      it either.</li>
      <li><strong>Assuming no income tax means nothing is withheld.</strong> True in Tennessee,
      not true in Washington. Check the state, not the label.</li>
      <li><strong>Comparing a Tennessee offer to one in Georgia on gross pay alone.</strong> On
      ${$0(REF)} the gap is ${$0(ecartGA)} a year, which is real money and does not show up in
      the salary line.</li>
    </ul>

    <h2>Example calculation</h2>
    <p>A single filer on <strong>${$0(REF)}</strong> in Tennessee, 2026, no 401(k):</p>
    <ul>
      <li>Gross pay: <span class="num">${$(REF)}</span></li>
      <li>Federal income tax: &minus;<span class="num">${$(r60.federal)}</span></li>
      <li>Social Security (6.2%): &minus;<span class="num">${$(r60.ss)}</span></li>
      <li>Medicare (1.45%): &minus;<span class="num">${$(r60.med)}</span></li>
      <li>Tennessee state tax: <span class="num">$0.00</span></li>
      <li><strong>Take-home pay: <span class="num">${$(r60.net)}</span> a year</strong>, or
      <span class="num">${$(r60.net / 12)}</span> a month</li>
    </ul>

    <h2>Compare with neighboring states</h2>
    <p>The same ${$0(REF)}, single filer, 2026. Georgia is Tennessee's neighbor to the south;
    the others are the states this site publishes that a mover most often compares.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>State</th><th>State tax on ${$0(REF)}</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesCompare.map(l => `          <tr><td>${l.cle === ETAT ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</td><td class="num">${l.etat > 0 ? $0(l.etat) : "$0"}</td><td class="num">${$0(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p>Tennessee, Texas, Florida and Nevada come out identical to the cent, because none of them
    withholds anything at state level. Against Illinois the gap is
    <strong>${$0(ecartIL)}</strong> a year on the same gross pay.</p>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

    <h2>Frequently asked questions</h2>
    <div class="faq">
${FAQ.map(([question, reponse]) => `      <h3>${question}</h3>\n      <p>${reponse}</p>`).join("\n")}
    </div>

    <h2>Related reading</h2>
    <ul>
      <li><a href="/paycheck-calculator/">Paycheck calculators for every state we publish</a></li>
      <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a> &mdash; the other
      state where the figures come out the same</li>
      <li><a href="/paycheck-calculator/washington/">Washington paycheck calculator</a> &mdash;
      no income tax, but two programs still come out</li>
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
    Rates verified against IRS and Social Security Administration figures, against Public
    Chapter 181 of 2017 as enrolled, and against the Tennessee Department of Revenue pages
    for the state's taxes and for the repealed Hall income tax.
  </p>
  <p class="disclaimer">StateLine Calc provides general information for educational purposes
  only. It is not financial, tax or legal advice. Results are estimates based on published 2026
  federal rates. Tennessee's individual income tax rate is zero under Tennessee Code Annotated
  &sect;&nbsp;67-2-102 as amended by Public Chapter 181 of 2017.</p>

</div>
${colonne(NOM)}

</main>

${piedDePage()}

<!-- ⛔ rates-2026.js AVANT calc-paycheck.js. Oubli du 05/09/2026 : sans lui le
     calculateur ne s'initialise pas, le formulaire part en navigation normale et
     le visiteur PERD sa page en cliquant Calculate. Aucun test unitaire ne l'a vu ;
     c'est le pilotage au navigateur qui a leve l'erreur. -->
<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>
</body>
</html>
`;

const dossier = path.join(RACINE, "paycheck-calculator", ETAT);
fs.mkdirSync(dossier, { recursive: true });
const dest = path.join(dossier, "index.html");
fs.writeFileSync(dest, html);
console.log("ECRIT : /paycheck-calculator/" + ETAT + "/index.html  (" + fs.statSync(dest).size + " octets)");
console.log("  net sur " + $0(REF) + " : " + $(r60.net) + "  (" + (r60.taux * 100).toFixed(1) + " %)");
console.log("  " + lignesSalaire.length + " lignes de salaire, " + lignesHoraire.length +
            " lignes horaires, " + lignesCompare.length + " Etats compares, " + FAQ.length + " questions");
