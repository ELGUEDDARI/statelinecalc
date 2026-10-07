/* Construit /paycheck-calculator/south-dakota/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Le South Dakota est le 34e Etat publie et le 9e sans impot sur les salaires,
 * apres Texas, Floride, Nevada, Tennessee, Washington, Alaska, Wyoming et New
 * Hampshire. Ce qu'il a de propre :
 *   1. Quatre de ses cinq voisins publies (Minnesota, Nebraska, Montana, North
 *      Dakota) taxent les salaires, le cinquieme (Wyoming) non. La comparaison
 *      par ecart en dollars est donc le coeur de la page.
 *   2. La page est honnete sur la limite de la preuve : contrairement au
 *      Wyoming (§ 39-12-101), AUCUNE loi trouvee n'interdit un impot local sur
 *      les salaires (SDCL 10-52-1 : « any tax other than an ad valorem real
 *      property tax » ; Constitution art. XI § 2 : l'Etat PEUT taxer le
 *      revenu). La page dit « we found no local wage tax » et s'appuie sur ce
 *      que le DOR publie, jamais sur « the law bars it ».
 *   3. Chomage (« Reemployment Assistance ») : charge de l'employeur, et la
 *      loi interdit expressement de deduire des salaires les frais
 *      administratifs de 0,08 % (DLR, FAQ). Base 15 000 $ en 2026.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js et .tooling/lib/sources.js. dor.sd.gov
 * et dlr.sd.gov repondent au curl direct (HTTP 200, lus le 2026-10-06).
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js et
 * .tooling/lib/paliers.js. Lancer : node .tooling/ops/build-south-dakota.js
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
const ETAT = "south-dakota";
const NOM = "South Dakota";
const URL = "https://statelinecalc.com/paycheck-calculator/south-dakota/";
const AUJOURD_HUI = "2026-10-06";
const LISIBLE = "October 6, 2026";

const c2 = n => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const c0 = n => n.toLocaleString("en-US", { maximumFractionDigits: 0 });
const $ = n => "$" + c2(n);
const $0 = n => "$" + c0(n);
const q = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/\s+/g, " ").trim();

/* --- les chiffres, tous calcules --------------------------------------- */
const REF = 75000;
const r75 = LIB.calcul(ETAT, REF);

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

/* Les voisins publies : Wyoming, Montana, Nebraska, North Dakota, Minnesota, Iowa (publie le 07/10/2026). */
const COMPARE = ["south-dakota", "wyoming", "montana", "nebraska", "north-dakota", "minnesota", "iowa"];
const lignesCompare = COMPARE.map(k => {
  const r = LIB.calcul(k, REF);
  /* impot d'Etat + programmes d'Etat : ce qui reconcilie la colonne avec le net */
  return { cle: k, nom: null, net: r.net, etat: REF - r.net - r.federal - r.ss - r.med, taux: r.taux };
});
const NOMS = { "south-dakota": "South Dakota", wyoming: "Wyoming", montana: "Montana",
               nebraska: "Nebraska", "north-dakota": "North Dakota", minnesota: "Minnesota", iowa: "Iowa" };
lignesCompare.forEach(l => { l.nom = NOMS[l.cle]; });
lignesCompare.sort((a, b) => b.net - a.net || (a.cle === ETAT ? -1 : 1));

const net = k => LIB.calcul(k, REF).net;
const ecartMN = net(ETAT) - net("minnesota");
const ecartMT = net(ETAT) - net("montana");
const ecartNE = net(ETAT) - net("nebraska");
const ecartND = net(ETAT) - net("north-dakota");
const ecartIA = net(ETAT) - net("iowa");
const retenuFederal = r75.federal + r75.ss + r75.med;

/* --- la FAQ ------------------------------------------------------------- */
const FAQ = [
  ["Does South Dakota have a state income tax?",
   "No. The South Dakota Department of Revenue states on its individual taxes page that the state " +
   "does not impose a state income tax, so no state tax is withheld from a paycheck. On " + $0(REF) +
   " you keep about " + $0(r75.net) + " a year, and every dollar taken out is federal income tax, " +
   "Social Security or Medicare."],

  ["Do South Dakota cities or counties tax wages?",
   "Not that we could find. The Department of Revenue&rsquo;s municipal tax page describes the local " +
   "taxes state law allows as a municipal sales or use tax and a gross receipts tax, and a wage tax " +
   "is not among them. We did not find a statute that forbids a city from adding one, so this rests " +
   "on what the agency publishes rather than on a ban. This calculator adds no local tax."],

  ["What is taken out of a South Dakota paycheck?",
   "Federal income tax, Social Security at 6.2% and Medicare at 1.45%, plus 0.9% Medicare on pay " +
   "above $200,000. The agency pages we read describe no state or local deduction. Unemployment insurance, which South " +
   "Dakota calls reemployment assistance, is paid by the employer, so it never reaches an " +
   "employee&rsquo;s pay stub. That is not true of every state without a wage tax: Washington still takes " +
   "Paid Family and Medical Leave and WA Cares out of every check, and Alaska withholds a share of " +
   "unemployment insurance from wages."],

  ["How much unemployment insurance do South Dakota employers pay?",
   "The 2026 taxable wage base is $15,000 per employee. A new employer outside construction starts " +
   "at a 1.20% reemployment assistance tax in its first year, a new construction employer at 6.00%, " +
   "and each also pays a 0.55% investment fee. Employers rated on their own claims history pay a " +
   "different rate, plus a 0.08% administrative fee. State law says that fee may not be deducted " +
   "from employees&rsquo; wages, and the Department of Labor and Regulation describes the program as " +
   "financed by employers through payroll taxes."],

  ["How much is " + $0(REF) + " after taxes in South Dakota?",
   "About " + $0(r75.net) + " a year, or " + $(r75.net / 12) + " a month, for a single filer " +
   "taking the standard deduction in 2026 with no 401(k) contribution. That is an effective " +
   "rate of " + (r75.taux * 100).toFixed(1) + "%, all of it federal income tax and FICA. The same " +
   "salary in Minnesota, next door, leaves " + $0(net("minnesota")) + " and in Nebraska " +
   $0(net("nebraska")) + "."],

  ["Is take-home pay in South Dakota the same as in Wyoming or Texas?",
   "Yes, to the cent, for the same gross pay and the same filing status. None of the three " +
   "withholds anything at state level, so what the federal government and FICA leave is what you " +
   "keep. Each pays for government differently, but none of it shows up on a paycheck."]
];

/* --- le HTML ------------------------------------------------------------ */
const TITRE = "South Dakota (SD) Paycheck Calculator 2026 — Take-Home Pay";
const DESC = "South Dakota (SD) does not tax wages, and we found no local wage tax. See what " +
  $0(REF) + " keeps after federal tax and FICA in 2026.";

const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "name": "South Dakota Paycheck Calculator 2026",
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
        { "@type": "ListItem", "position": 3, "name": "South Dakota", "item": URL }
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
    <li aria-current="page">South Dakota</li>
  </ol>
</nav>

  <h1>South Dakota Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>South Dakota does not tax wages: its Department of Revenue says the state imposes no income
    tax, and we found no local wage tax either. On <span class="num">${$0(REF)}</span> you keep
    about <strong class="num">${$0(r75.net)}</strong> a year &mdash; an effective rate of
    ${(r75.taux * 100).toFixed(1)}%, all of it federal income tax, Social Security and Medicare.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

${blocChecklist()}

  <h2 id="calc-h">Calculate your South Dakota take-home pay</h2>
  <form class="calc" data-paycheck-form data-state="south-dakota" novalidate>
    <div class="field">
      <label for="salary">Your gross pay or hourly rate</label>
      <input type="text" id="salary" name="salary" inputmode="decimal" value="75000" autocomplete="off">
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
        <span class="help">South Dakota has no state filing status &mdash; this changes your federal tax only.</span>
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
    <p>South Dakota is one of the simplest paychecks in the country to work out, because there is
    no state layer to add. Whatever the federal government and FICA leave you is what reaches your
    account. Three deductions, and that is the whole list:</p>
    <ul>
      <li><strong>Federal income tax</strong>, on your pay after the standard deduction, at the
      2026 brackets.</li>
      <li><strong>Social Security</strong>, 6.2% of gross pay up to the annual wage base.</li>
      <li><strong>Medicare</strong>, 1.45% of gross pay with no cap, plus 0.9% on pay above
      $200,000.</li>
    </ul>
    <p>There is no fourth line. The South Dakota Department of Revenue says the state does not
    impose a state income tax, so there is no state withholding to calculate. The Department of
    Revenue and Department of Labor and Regulation pages we read describe no deduction from
    employee pay, and we have no source for any state paid leave or disability program there. Unemployment insurance is financed by employers, which is why it never appears on your
    pay stub.</p>
    <p>That last point is worth stating plainly, because &ldquo;no income tax&rdquo; does not
    always mean &ldquo;nothing comes out.&rdquo; <a href="/paycheck-calculator/alaska/">Alaska</a>
    has no income tax either and still withholds a share of unemployment insurance from every
    check. South Dakota, as far as its agencies publish, takes only the federal lines.</p>

    <h2>What South Dakota&rsquo;s own agencies say</h2>
    <p>Two official statements carry this page, and it is worth being exact about how far each one
    goes. The Department of Revenue&rsquo;s page for individuals says South Dakota does not impose a
    state income tax. Its page counts the states without an income tax differently from our own
    tally of nine states that tax no wages, but South Dakota is on both lists. That settles the state side. The local side depends on what cities are
    allowed to levy, and the best source we found is the Department&rsquo;s municipal tax page:</p>
    <blockquote>
      <p>&ldquo;South Dakota law allows municipalities to impose a municipal sales or use tax, and
      gross receipts tax.&rdquo;</p>
    </blockquote>
    <p>A tax on wages is not on that list. We did not find a statute that forbids one outright, the
    way <a href="/paycheck-calculator/wyoming/">Wyoming</a> does in a single section of its tax
    code. So the accurate wording is that we found no local wage tax, not that none could ever
    exist. If your city or county has introduced one, it is not in this calculator.</p>

    <h2>Unemployment insurance is the employer&rsquo;s cost</h2>
    <p>South Dakota calls it reemployment assistance. The Department of Labor and Regulation&rsquo;s
    employer handbook describes the program as financed by employers through payroll taxes, and the
    2026 taxable wage base is $15,000 per employee, unchanged since 2015. The one
    deduction question the agency answers in so many words concerns the administrative fee, 0.08% of
    wages for employers rated on their own claims history:</p>
    <blockquote>
      <p>&ldquo;No administrative fee may be credited to the employer&rsquo;s experience-rating account
      or deducted in whole or in part by any employer from the wages of individuals in its
      employ.&rdquo;</p>
    </blockquote>
    <p>New employers start lower. For a business outside construction the first-year reemployment
    assistance tax is 1.20%, for a construction business 6.00%, and both pay a 0.55% investment fee.
    All of it is the employer&rsquo;s expense. None of it is a line on your pay stub.</p>

    <h2>South Dakota take-home pay by salary</h2>
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

    <h2>South Dakota hourly paycheck: what your rate is worth after tax</h2>
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

    <h2>Key facts that affect your take-home pay in South Dakota</h2>
    <ul>
      <li><strong>No state income tax.</strong> The Department of Revenue says South Dakota does not
      impose one, so the &ldquo;State tax&rdquo; column in the tables above is $0 at every salary.</li>
      <li><strong>No state filing status.</strong> Marriage changes your federal tax and nothing
      else. The selector above is federal-only for this state.</li>
      <li><strong>A 401(k) still helps, but only federally.</strong> Deferring pay cuts your
      federal tax; there is no state tax here for it to cut.</li>
      <li><strong>Unemployment insurance is the employer&rsquo;s, on the first $15,000 of each
      employee&rsquo;s pay.</strong> None of it is withheld from wages.</li>
      <li><strong>No local wage tax that we found.</strong> The local taxes the Department of Revenue
      describes are sales, use and gross receipts taxes.</li>
    </ul>

    <h2>Common mistakes people make</h2>
    <ul>
      <li><strong>Assuming a no-tax state means nothing is withheld.</strong> On ${$0(REF)}, federal
      income tax and FICA still take ${$0(retenuFederal)} a year, or ${(r75.taux * 100).toFixed(1)}% of
      gross pay. Only the state layer is missing.</li>
      <li><strong>Looking for a South Dakota version of the W-4.</strong> With no state income tax,
      there is no state withholding for a form to control. Your federal W-4 is the only one that
      changes your take-home pay.</li>
      <li><strong>Living in South Dakota and working across the border.</strong> A resident who
      works in Minnesota, Nebraska or Montana may have that state&rsquo;s income tax withheld instead.
      This page assumes South Dakota is where you work.</li>
      <li><strong>Comparing a South Dakota offer to one in Minnesota on gross pay alone.</strong>
      On ${$0(REF)} the gap is ${$0(ecartMN)} a year, which is real money and does not show up in the
      salary line.</li>
    </ul>

    <h2>Example calculation</h2>
    <p>A single filer on <strong>${$0(REF)}</strong> in South Dakota, 2026, no 401(k):</p>
    <ul>
      <li>Gross pay: <span class="num">${$(REF)}</span></li>
      <li>Federal income tax: &minus;<span class="num">${$(r75.federal)}</span> &mdash; the $16,100
      standard deduction leaves $58,900 taxable, taxed at 10%, 12% and 22%</li>
      <li>Social Security (6.2%): &minus;<span class="num">${$(r75.ss)}</span></li>
      <li>Medicare (1.45%): &minus;<span class="num">${$(r75.med)}</span></li>
      <li>South Dakota state tax: <span class="num">$0.00</span></li>
      <li><strong>Take-home pay: <span class="num">${$(r75.net)}</span> a year</strong>, or
      <span class="num">${$(r75.net / 12)}</span> a month</li>
    </ul>

    <h2>Compare with neighboring states</h2>
    <p>The same ${$0(REF)}, single filer, 2026. Wyoming, Montana, Nebraska, North Dakota, Minnesota and Iowa
    are the six states that border South Dakota, and all of them are published here.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>State</th><th>State tax and payroll deductions on ${$0(REF)}</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesCompare.map(l => `          <tr><td>${l.cle === ETAT ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</td><td class="num">${l.etat > 0 ? $0(l.etat) : "$0"}</td><td class="num">${$0(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p>South Dakota and Wyoming come out identical to the cent, because neither withholds anything
    at state level. Against Minnesota the gap is <strong>${$0(ecartMN)}</strong> a year on the same
    gross pay, against Montana <strong>${$0(ecartMT)}</strong>, against Nebraska
    <strong>${$0(ecartNE)}</strong>, and against North Dakota, which taxes lightly,
    <strong>${$0(ecartND)}</strong>, and against Iowa <strong>${$0(ecartIA)}</strong>.</p>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

    <h2>Frequently asked questions</h2>
    <div class="faq">
${FAQ.map(([question, reponse]) => `      <h3>${question}</h3>\n      <p>${reponse}</p>`).join("\n")}
    </div>

  ${blocSources("south-dakota")}

  <h2>Related reading</h2>
    <ul>
      <li><a href="/paycheck-calculator/">Paycheck calculators for every state we publish</a></li>
      <li><a href="/75000-salary-take-home-pay-by-state/">$75,000 salary: take-home pay in every state
      we publish</a> &mdash; where South Dakota ranks</li>
      <li><a href="/paycheck-calculator/wyoming/">Wyoming paycheck calculator</a> &mdash; the neighbor
      to the west with the same figures, and a statute that bars local income taxes</li>
      <li><a href="/paycheck-calculator/minnesota/">Minnesota paycheck calculator</a> &mdash; the neighbor
      to the east, with four state rates and a paid leave premium</li>
      <li><a href="/paycheck-calculator/iowa/">Iowa paycheck calculator</a> &mdash; the neighbor
      to the southeast, with a flat 3.8% withheld after a deduction and a $40 allowance credit</li>
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
    Rates verified against IRS and Social Security Administration figures, against the South Dakota
    Department of Revenue pages on individual and municipal taxes, and against the South Dakota
    Department of Labor and Regulation pages for the 2026 reemployment assistance wage base and rates.
  </p>
  <p class="disclaimer">StateLine Calc provides general information for educational purposes
  only. It is not financial, tax or legal advice. Results are estimates based on published 2026
  federal rates. The South Dakota Department of Revenue states that South Dakota does not impose a
  state income tax; we found no local income tax on wages.</p>

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
console.log("  net sur " + $0(REF) + " : " + $(r75.net) + "  (" + (r75.taux * 100).toFixed(1) + " %)");
console.log("  " + lignesSalaire.length + " lignes de salaire, " + lignesHoraire.length +
            " lignes horaires, " + lignesCompare.length + " Etats compares, " + FAQ.length + " questions");
