/* Construit /paycheck-calculator/wyoming/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le Wyoming est le 22e Etat publie et le 7e sans impot sur le revenu, apres
 * le Texas, la Floride, le Nevada, le Tennessee, l'Etat de Washington et
 * l'Alaska. Ce qu'il a de propre, et qu'aucun des six autres n'a :
 *   1. Une seule phrase de loi couvre a la fois l'Etat ET les collectivites
 *      locales : Wyoming Statutes § 39-12-101 preempte le champ de l'impot
 *      sur le revenu pour le Wyoming lui-meme ET pour tout comte, ville ou
 *      subdivision. Ce n'est pas "le taux est a zero" (Tennessee, apres
 *      abrogation) ni "la loi ne prevoit rien" (Texas, Floride) : c'est une
 *      interdiction ecrite, datee, qui ferme les deux portes dans la meme
 *      phrase.
 *   2. L'assurance chomage n'a PAS un taux "nouvel employeur" unique comme
 *      dans les 21 autres Etats publies : le taux depend du secteur
 *      d'activite (NAICS), avec un plafond de 8,5% pour un employeur non
 *      enregistre a temps. La page le dit avec une fourchette sourcee,
 *      jamais un chiffre invente.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/lib/sources.js.
 * wyoleg.gov et dws.wyo.gov repondent normalement au curl direct (HTTP 200),
 * aucun obstacle reseau rencontre le 2026-09-17.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js et
 * .tooling/lib/paliers.js. Lancer : node .tooling/ops/build-wyoming.js
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
const ETAT = "wyoming";
const NOM = "Wyoming";
const URL = "https://statelinecalc.com/paycheck-calculator/wyoming/";
const AUJOURD_HUI = "2026-09-17";
const LISIBLE = "September 17, 2026";

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

/* Les Etats voisins publies, plus le Texas comme autre reference sans impot. */
const COMPARE = ["wyoming", "idaho", "montana", "nebraska", "utah", "texas"];
const lignesCompare = COMPARE.map(k => {
  const r = LIB.calcul(k, REF);
  return { cle: k, nom: null, net: r.net, etat: r.etat, taux: r.taux };
});
const NOMS = { wyoming: "Wyoming", idaho: "Idaho", montana: "Montana",
               nebraska: "Nebraska", utah: "Utah", texas: "Texas" };
lignesCompare.forEach(l => { l.nom = NOMS[l.cle]; });
lignesCompare.sort((a, b) => b.net - a.net);

const ecartID = LIB.calcul(ETAT, REF).net - LIB.calcul("idaho", REF).net;
const ecartUT = LIB.calcul(ETAT, REF).net - LIB.calcul("utah", REF).net;

/* --- la FAQ ------------------------------------------------------------- */
const FAQ = [
  ["Does Wyoming have a state income tax?",
   "No, and the law does not just leave a rate at zero &mdash; it forbids one outright. " +
   "Wyoming Statutes &sect;&nbsp;39-12-101 preempts &ldquo;the field of imposing and levying " +
   "income taxes, earning taxes, or any other form of tax based on wages or other income&rdquo; " +
   "for the state itself, and it is the only section in the entire income-tax chapter of the " +
   "state's tax code. On " + $0(REF) + " you keep about " + $0(r60.net) + " a year."],

  ["Do Wyoming cities or counties tax wages?",
   "No. The same sentence of law that bars the state from taxing income also bars &ldquo;any " +
   "county, city, town or other political subdivision&rdquo; from doing it. Most no-tax states " +
   "leave that question to be answered separately, city by city; Wyoming closes it in one " +
   "statute that covers every local government in the state at once."],

  ["What is taken out of a Wyoming paycheck?",
   "Federal income tax, Social Security at 6.2% and Medicare at 1.45% &mdash; nothing at state " +
   "or local level. Unemployment insurance is paid entirely by the employer, so it never reaches " +
   "an employee's stub. That is not true of every state without an income tax: Washington still " +
   "takes Paid Family and Medical Leave and WA Cares out of every check, and Alaska withholds a " +
   "share of unemployment insurance from wages. Wyoming really does take nothing."],

  ["How much unemployment insurance do Wyoming employers pay?",
   "It depends on the employer, not a single published rate. Wyoming assigns new-employer rates " +
   "by industry classification rather than one flat figure the way most states do, and an " +
   "employer that has not completed registration before filing its report is assigned the " +
   "highest base rate possible, 8.5%. None of it is withheld from wages: the 2026 taxable wage " +
   "base is $33,800 per employee, and the tax is the employer's alone."],

  ["How much is " + $0(REF) + " after taxes in Wyoming?",
   "About " + $0(r60.net) + " a year, or " + $(r60.net / 12) + " a month, for a single filer " +
   "taking the standard deduction in 2026 with no 401(k) contribution. That is an effective " +
   "rate of " + (r60.taux * 100).toFixed(1) + "%, all of it federal and FICA. The same salary " +
   "in neighboring Idaho leaves " + $0(LIB.calcul("idaho", REF).net) + " and in Utah " +
   $0(LIB.calcul("utah", REF).net) + "."],

  ["Is take-home pay in Wyoming the same as in Texas?",
   "Yes, to the cent, for the same gross pay and the same filing status. Neither state withholds " +
   "anything at state or local level, so what the federal government and FICA leave is what you " +
   "keep. The two states pay for government very differently &mdash; Wyoming leans on mineral " +
   "severance taxes, Texas on sales and property tax &mdash; but neither of those shows up on a " +
   "paycheck."]
];

/* --- le HTML ------------------------------------------------------------ */
const TITRE = "Wyoming (WY) Paycheck Calculator 2026 — Take-Home Pay";
const DESC = "Wyoming (WY) has no income tax at the state or local level, by statute. See what " +
  $0(REF) + " keeps after federal tax and FICA in 2026.";

const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "name": "Wyoming Paycheck Calculator 2026",
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
        { "@type": "ListItem", "position": 3, "name": "Wyoming", "item": URL }
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
    <li aria-current="page">Wyoming</li>
  </ol>
</nav>

  <h1>Wyoming Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Wyoming takes <strong>nothing</strong> from your wages at state or local level &mdash;
    not because the rate happens to be zero, but because state law forbids the state and every
    county, city and town from taxing income at all. On <span class="num">${$0(REF)}</span> you
    keep about <strong class="num">${$0(r60.net)}</strong> a year &mdash; an effective rate of
    ${(r60.taux * 100).toFixed(1)}%, every point of it federal.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

${blocChecklist()}

  <h2 id="calc-h">Calculate your Wyoming take-home pay</h2>
  <form class="calc" data-paycheck-form data-state="wyoming" novalidate>
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
        <span class="help">Wyoming has no state filing status &mdash; this changes your federal tax only.</span>
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
    <p>Wyoming is one of the simplest paychecks in the country to work out, because there is no
    state or local layer to add. Whatever the federal government and FICA leave you is what
    reaches your account. Three deductions, and that is the whole list:</p>
    <ul>
      <li><strong>Federal income tax</strong>, on your pay after the standard deduction, at the
      2026 brackets.</li>
      <li><strong>Social Security</strong>, 6.2% of gross pay up to the annual wage base.</li>
      <li><strong>Medicare</strong>, 1.45% of gross pay with no cap, plus 0.9% on pay above
      $200,000.</li>
    </ul>
    <p>There is no fourth line. Wyoming has no state withholding, no local income tax, and no
    payroll program deducted from wages. Unemployment insurance is financed by the employer,
    which is why it never appears on your payslip.</p>
    <p>That last point is worth stating plainly, because &ldquo;no income tax&rdquo; does not
    always mean &ldquo;nothing comes out&rdquo;. <a href="/paycheck-calculator/alaska/">Alaska</a>
    has no income tax either and still withholds a share of unemployment insurance from every
    check. Wyoming really does take nothing.</p>

    <h2>The law that closes both doors at once</h2>
    <p>Most states without an income tax simply never wrote one into law, or repealed one over
    time. Wyoming did something more direct: it wrote a statute that forbids the state
    <strong>and</strong> every local government from ever levying one. Wyoming Statutes
    Title 39, Chapter 12 &mdash; the entire chapter set aside for &ldquo;Income Tax&rdquo; in the
    state's tax code &mdash; contains exactly one section, &sect;&nbsp;39-12-101, titled
    &ldquo;Preemption by state&rdquo;:</p>
    <blockquote>
      <p>&ldquo;The state of Wyoming does hereby preempt for itself the field of imposing and
      levying income taxes, earning taxes, or any other form of tax based on wages or other
      income and no county, city, town or other political subdivision shall have the right to
      impose, levy or collect such taxes.&rdquo;</p>
    </blockquote>
    <p>One sentence answers two questions a mover usually has to research separately: whether
    the state taxes wages, and whether the city or county can add its own layer on top. In
    Wyoming, both answers are settled by the same statute, and no local government in the state
    can ever pass an ordinance that changes that. The Wyoming Department of Revenue's own list of
    the taxes it administers &mdash; sales, use, lodging, cigarette and estate tax; mineral
    severance tax; property tax &mdash; has no income tax on it, because there is nothing to
    administer.</p>

    <h2>Wyoming take-home pay by salary</h2>
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

    <h2>Wyoming hourly paycheck: what your rate is worth after tax</h2>
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

    <h2>Key facts that affect your take-home pay in Wyoming</h2>
    <ul>
      <li><strong>No state income tax, and the law bars a local one too.</strong> Wyoming
      Statutes &sect;&nbsp;39-12-101 preempts the field for the state and for every county, city
      and town in the same sentence.</li>
      <li><strong>No state filing status.</strong> Marriage changes your federal tax and nothing
      else. The selector above is federal-only for this state.</li>
      <li><strong>A 401(k) still helps, but only federally.</strong> Deferring pay cuts your
      federal tax; there is no state tax here for it to cut.</li>
      <li><strong>Unemployment insurance is the employer's, and the rate varies by industry.</strong>
      Wyoming assigns new-employer rates by NAICS classification rather than one flat figure, and
      none of it is withheld from wages.</li>
    </ul>

    <h2>Common mistakes people make</h2>
    <ul>
      <li><strong>Assuming a no-tax state means nothing is withheld.</strong> True in Wyoming,
      not true in Washington or Alaska. Check the state, not the label.</li>
      <li><strong>Looking for a Wyoming city income tax and, when none turns up, assuming the
      search missed something.</strong> It is not missing. The state statute bars it outright, so
      there is nothing to find.</li>
      <li><strong>Comparing a Wyoming offer to one in Idaho on gross pay alone.</strong> On
      ${$0(REF)} the gap is ${$0(ecartID)} a year, which is real money and does not show up in
      the salary line.</li>
    </ul>

    <h2>Example calculation</h2>
    <p>A single filer on <strong>${$0(REF)}</strong> in Wyoming, 2026, no 401(k):</p>
    <ul>
      <li>Gross pay: <span class="num">${$(REF)}</span></li>
      <li>Federal income tax: &minus;<span class="num">${$(r60.federal)}</span></li>
      <li>Social Security (6.2%): &minus;<span class="num">${$(r60.ss)}</span></li>
      <li>Medicare (1.45%): &minus;<span class="num">${$(r60.med)}</span></li>
      <li>Wyoming state tax: <span class="num">$0.00</span></li>
      <li><strong>Take-home pay: <span class="num">${$(r60.net)}</span> a year</strong>, or
      <span class="num">${$(r60.net / 12)}</span> a month</li>
    </ul>

    <h2>Compare with neighboring states</h2>
    <p>The same ${$0(REF)}, single filer, 2026. Idaho, Montana, Nebraska and Utah border
    Wyoming; Texas is included because it is the other state on this site where the figures come
    out identical.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>State</th><th>State tax on ${$0(REF)}</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesCompare.map(l => `          <tr><td>${l.cle === ETAT ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</td><td class="num">${l.etat > 0 ? $0(l.etat) : "$0"}</td><td class="num">${$0(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p>Wyoming and Texas come out identical to the cent, because neither withholds anything at
    state or local level. Against Utah, its neighbor with a flat 4.5% tax, the gap is
    <strong>${$0(ecartUT)}</strong> a year on the same gross pay.</p>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

    <h2>Frequently asked questions</h2>
    <div class="faq">
${FAQ.map(([question, reponse]) => `      <h3>${question}</h3>\n      <p>${reponse}</p>`).join("\n")}
    </div>

  ${blocSources("wyoming")}

  <h2>Related reading</h2>
    <ul>
      <li><a href="/paycheck-calculator/">Paycheck calculators for every state we publish</a></li>
      <li><a href="/paycheck-calculator/texas/">Texas paycheck calculator</a> &mdash; the other
      state where the figures come out the same</li>
      <li><a href="/paycheck-calculator/idaho/">Idaho paycheck calculator</a> &mdash; Wyoming's
      neighbor to the west, with a flat state tax</li>
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
    Rates verified against IRS and Social Security Administration figures, against Wyoming
    Statutes &sect;&nbsp;39-12-101, and against the Wyoming Department of Workforce Services
    pages for the 2026 unemployment insurance wage base and tax rates.
  </p>
  <p class="disclaimer">StateLine Calc provides general information for educational purposes
  only. It is not financial, tax or legal advice. Results are estimates based on published 2026
  federal rates. Wyoming levies no individual income tax at state or local level under Wyoming
  Statutes &sect;&nbsp;39-12-101.</p>

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
fs.writeFileSync(dest, html);
console.log("ECRIT : /paycheck-calculator/" + ETAT + "/index.html  (" + fs.statSync(dest).size + " octets)");
console.log("  net sur " + $0(REF) + " : " + $(r60.net) + "  (" + (r60.taux * 100).toFixed(1) + " %)");
console.log("  " + lignesSalaire.length + " lignes de salaire, " + lignesHoraire.length +
            " lignes horaires, " + lignesCompare.length + " Etats compares, " + FAQ.length + " questions");
