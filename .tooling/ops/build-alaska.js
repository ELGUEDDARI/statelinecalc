/* Construit /paycheck-calculator/alaska/.
 *
 * ── L'ANGLE DE CETTE PAGE ───────────────────────────────────────────────────
 * Alaska est le 20e Etat publie et le 5e sans impot sur le revenu, apres le
 * Texas, la Floride, le Nevada et le Tennessee. Le risque, deja note dans
 * build-tennessee.js, est d'ecrire une 5e page interchangeable. Ce que
 * l'Alaska a de propre, et qu'aucun des quatre autres n'a :
 *   L'assurance chomage y est PARTAGEE entre employeur et salarie. Les 19
 *   autres Etats deja publies sur ce site la financent entierement par
 *   l'employeur (Texas, Tennessee, Wisconsin... tous, verifie Etat par Etat).
 *   L'Alaska demande 0,50 % du salaire brut au salarie lui-meme, jusqu'a
 *   54 200 $ de salaire (271 $ maximum par an). C'est le seul Etat de ce
 *   site ou "pas d'impot sur le revenu" ne veut pas dire "rien ne sort" —
 *   la meme lecon que Washington (PFML + WA Cares), pour une raison
 *   totalement differente.
 *
 * ── LES SOURCES ─────────────────────────────────────────────────────────────
 * Detail complet dans data/rates-2026.js (bloc alaska) et .tooling/lib/sources.js
 * (PAR_ETAT.alaska). Contrairement a la Tennessee/au Nevada/a l'Idaho/a la
 * Virginie, tax.alaska.gov ET labor.alaska.gov repondent HTTP 200 a une
 * requete automatisee simple (curl) — aucun blocage reseau sur cet Etat.
 *
 * Aucun montant n'est ecrit a la main : tout sort de .tooling/lib/paie.js.
 * Lancer : node .tooling/ops/build-alaska.js
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
const ETAT = "alaska";
const NOM = "Alaska";
const URL = "https://statelinecalc.com/paycheck-calculator/alaska/";
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

/* La colonne "State tax" regroupe tout ce que l'Etat prend au salarie. Pour
   l'Alaska c'est UNIQUEMENT le programme d'assurance chomage — il n'y a pas
   de champ "etat" (income tax) puisque hasIncomeTax est false. */
function progTotal(r) {
  return (r.programmes || []).reduce((t, pg) => t + pg.montant, 0);
}

const lignesSalaire = SALAIRES.map(b => {
  const r = LIB.calcul(ETAT, b);
  const state = r.etat + r.paidLeave + r.waCares + progTotal(r);
  return { brut: b, federal: r.federal, fica: r.ss + r.med, state, net: r.net,
           mois: r.net / 12, taux: r.taux };
});

const lignesHoraire = TAUX_HORAIRES.map(t => {
  const r = LIB.calcul(ETAT, t * HEURES);
  return { taux: t, brut: t * HEURES, net: r.net, netH: r.net / HEURES };
});

/* Les quatre autres Etats sans impot sur le revenu, plus l'Illinois comme
   point de comparaison a impot eleve — meme liste que Tennessee. */
const COMPARE = ["alaska", "washington", "tennessee", "texas", "nevada", "illinois"];
const lignesCompare = COMPARE.map(k => {
  const r = LIB.calcul(k, REF);
  const state = r.etat + r.paidLeave + r.waCares + progTotal(r);
  return { cle: k, nom: null, net: r.net, etat: state, taux: r.taux };
});
const NOMS = { alaska: "Alaska", washington: "Washington", tennessee: "Tennessee",
               texas: "Texas", nevada: "Nevada", illinois: "Illinois" };
lignesCompare.forEach(l => { l.nom = NOMS[l.cle]; });
lignesCompare.sort((a, b) => b.net - a.net);

const ecartWA = LIB.calcul(ETAT, REF).net - LIB.calcul("washington", REF).net;
const ecartIL = LIB.calcul(ETAT, REF).net - LIB.calcul("illinois", REF).net;
const ecartTN = LIB.calcul("tennessee", REF).net - LIB.calcul(ETAT, REF).net;

/* --- la FAQ ------------------------------------------------------------- */
const FAQ = [
  ["Does Alaska have a state income tax?",
   "No. The Alaska Department of Revenue's own \"Personal Income\" page states it directly: " +
   "“The State of Alaska currently does not have an individual income tax, therefore no " +
   "employee withholding for state income tax is required.” Alaska repealed its individual " +
   "income tax retroactive to January 1, 1980, and the statute that once taxed individuals, " +
   "AS 43.20.011, now taxes only corporations. On " + $0(REF) + " you keep about " + $0(r60.net) +
   " a year."],

  ["What is taken out of an Alaska paycheck?",
   "Federal income tax, Social Security at 6.2%, Medicare at 1.45% — and one thing no other " +
   "state on this site charges the employee: a small share of unemployment insurance, 0.50% of " +
   "gross pay up to $54,200 of wages, capped at $271 a year. There is no state income tax, and " +
   "we have not found a local income tax either — see the FAQ below on Alaska's " +
   "municipalities for the caveat on that."],

  ["Why does Alaska take unemployment insurance out of an employee's pay?",
   "Because it structures the tax that way by law. Every other state this site publishes " +
   "— Texas, Tennessee, Washington and 16 more — collects unemployment insurance " +
   "entirely from the employer, and none of it ever reaches the paycheck. Alaska's own labor " +
   "department publishes both halves side by side: an employer rate and a separate employee " +
   "rate, and “The Total Rate = Employer Rate + Employee Rate.” The employee only ever " +
   "pays their own 0.50% share, never the combined total."],

  ["How much is " + $0(REF) + " after taxes in Alaska?",
   "About " + $0(r60.net) + " a year, or " + $(r60.net / 12) + " a month, for a single filer " +
   "taking the standard deduction in 2026 with no 401(k) contribution. That includes " + $(271) +
   " of state unemployment insurance, the maximum for anyone earning at or above the $54,200 " +
   "wage base. The same salary in Tennessee, which charges the employee nothing at state level, " +
   "leaves " + $0(LIB.calcul("tennessee", REF).net) + " — " + $0(ecartTN) + " more."],

  ["Is Alaska really a \"no income tax\" state like Texas or Nevada?",
   "For income tax specifically, yes — the rate is zero in all three, and Texas and Nevada have " +
   "no local income tax either. We have not found one in Alaska, though we cannot confirm that " +
   "for all 165 of its municipalities (see the FAQ below). Where Alaska differs from the other " +
   "two is a separate line unrelated to income tax: " +
   "the employee-paid unemployment insurance share described above. It is a small amount " +
   "(at most " + $(271) + " a year) but it means an Alaska paycheck is not, dollar for dollar, " +
   "identical to a Texas one at the same gross pay — unlike Texas, Tennessee and Nevada, " +
   "which come out identical to the cent."],

  ["Do any Alaska cities or boroughs levy their own income tax on wages?",
   "We have not found one, but we have not been able to confirm it for every one of Alaska's " +
   "165 boroughs and cities against a single official statewide list. Alaska's local governments " +
   "are widely described as funding themselves mainly through sales tax and property tax rather " +
   "than a wage tax; if you work for a specific municipality and want certainty, check with that " +
   "local government directly."]
];

/* --- le HTML ------------------------------------------------------------ */
const TITRE = "Alaska (AK) Paycheck Calculator 2026 — Take-Home Pay";
const DESC = "Alaska (AK) has no state income tax, but unemployment insurance comes out of " +
  "your own pay too. See what " + $0(REF) + " leaves after federal tax and FICA in 2026.";

const jsonld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication", "name": "Alaska Paycheck Calculator 2026",
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
        { "@type": "ListItem", "position": 3, "name": "Alaska", "item": URL }
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
    <li aria-current="page">Alaska</li>
  </ol>
</nav>

  <h1>Alaska Paycheck Calculator 2026</h1>

  <div class="answer">
    <p>Alaska charges <strong>no state income tax</strong>, and its Department of Revenue says so
    directly: no individual income tax means no state withholding. But Alaska is the only state
    this site publishes where the employee also pays a small share of unemployment insurance
    &mdash; 0.50% of wages, capped at <span class="num">$271</span> a year. On
    <span class="num">${$0(REF)}</span> you keep about
    <strong class="num">${$0(r60.net)}</strong> a year.</p>
    <p class="answer-jump"><a href="#calc-h">Calculate my pay &darr;</a></p>
  </div>

${blocChecklist()}

  <h2 id="calc-h">Calculate your Alaska take-home pay</h2>
  <form class="calc" data-paycheck-form data-state="alaska" novalidate>
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
        <span class="help">Alaska has no state filing status &mdash; this changes your federal tax only.</span>
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
        <span class="help">Percent of gross pay. It lowers your federal tax. There is no state income tax here for it to lower.</span>
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
    <p>Alaska has no state income tax, so most of what leaves your paycheck is federal. But it is
    not a three-line paycheck the way Texas or Tennessee is. Four deductions apply here:</p>
    <ul>
      <li><strong>Federal income tax</strong>, on your pay after the standard deduction, at the
      2026 brackets.</li>
      <li><strong>Social Security</strong>, 6.2% of gross pay up to the annual wage base.</li>
      <li><strong>Medicare</strong>, 1.45% of gross pay with no cap, plus 0.9% on pay above
      $200,000.</li>
      <li><strong>Alaska Unemployment Insurance, employee share</strong>: 0.50% of gross pay up
      to $54,200 of wages, capped at $271 a year.</li>
    </ul>
    <p>That fourth line is the reason this page exists separately from Texas or Tennessee.
    Alaska's Department of Labor and Workforce Development publishes an employer rate and an
    <strong>employee rate</strong> side by side for 2026, and says the total contribution is the
    sum of the two. Every other no-income-tax state this site publishes &mdash;
    <a href="/paycheck-calculator/texas/">Texas</a>,
    <a href="/paycheck-calculator/tennessee/">Tennessee</a> and
    <a href="/paycheck-calculator/nevada/">Nevada</a> &mdash; assigns unemployment insurance to
    the employer only, so none of it ever reaches an employee's pay stub. Alaska is the
    exception.</p>

    <h2>Alaska's income tax: repealed in 1980, not zero by accident</h2>
    <p>Alaska did once tax individual income. After the Trans-Alaska Pipeline System came online
    and gave the state a new stream of oil revenue, the legislature repealed the tax retroactive
    to January 1, 1980, and issued refunds on tax already paid that year. The statute that
    used to cover individuals, <strong>AS 43.20.011</strong>, now imposes tax only &ldquo;upon the
    entire taxable income of every corporation&rdquo; &mdash; the individual provisions are gone
    from current law, not merely set to a zero rate the way Tennessee's now-repealed Hall income
    tax was. The Department of Revenue's own tax-types page confirms the practical result in one
    sentence: no individual income tax, no state withholding required.</p>

    <h2>Alaska take-home pay by salary</h2>
    <p>Single filer, standard deduction, 2026 rates, no 401(k) contribution. The State tax column
    is the 0.50% unemployment insurance share described above &mdash; every figure comes from the
    same arithmetic the calculator above runs.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Gross salary</th><th>Federal tax</th><th>Social Security + Medicare</th><th>State tax</th><th>Take-home pay</th><th>Per month</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesSalaire.map(l => `          <tr><td class="num">${$0(l.brut)}</td><td class="num">${$0(l.federal)}</td><td class="num">${$0(l.fica)}</td><td class="num">${$(l.state)}</td><td class="num"><strong>${$0(l.net)}</strong></td><td class="num">${$0(l.mois)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>

    <h2>Alaska hourly paycheck: what your rate is worth after tax</h2>
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

    <h2>Key facts that affect your take-home pay in Alaska</h2>
    <ul>
      <li><strong>No state income tax, and no local income tax found.</strong> Alaska's own tax
      division says its individual income tax was repealed; we have found no local government
      that taxes wages, though we cannot confirm that for all 165 municipalities.</li>
      <li><strong>The one line every other no-tax state on this site skips.</strong> 0.50% of
      gross pay, up to $271 a year, funds unemployment insurance alongside the employer's share
      &mdash; see the FAQ below for why.</li>
      <li><strong>No state filing status.</strong> Marriage changes your federal tax and nothing
      else here.</li>
      <li><strong>A 401(k) still helps, but only federally.</strong> Deferring pay cuts your
      federal tax; there is no state income tax here for it to lower.</li>
    </ul>

    <h2>Common mistakes people make</h2>
    <ul>
      <li><strong>Assuming Alaska takes nothing out at the state level, like Texas.</strong> It
      takes very little &mdash; at most ${$(271)} a year &mdash; but it is not zero.</li>
      <li><strong>Confusing the employee's 0.50% with the total unemployment insurance rate.</strong>
      Alaska publishes an employer rate and an employee rate separately; you only ever pay your
      own share.</li>
      <li><strong>Comparing an Alaska offer to a Tennessee one on gross pay alone.</strong> On
      ${$0(REF)} the gap is ${$0(ecartTN)} a year, entirely from this one line.</li>
    </ul>

    <h2>Example calculation</h2>
    <p>A single filer on <strong>${$0(REF)}</strong> in Alaska, 2026, no 401(k):</p>
    <ul>
      <li>Gross pay: <span class="num">${$(REF)}</span></li>
      <li>Federal income tax: &minus;<span class="num">${$(r60.federal)}</span></li>
      <li>Social Security (6.2%): &minus;<span class="num">${$(r60.ss)}</span></li>
      <li>Medicare (1.45%): &minus;<span class="num">${$(r60.med)}</span></li>
      <li>Alaska state income tax: <span class="num">$0.00</span></li>
      <li>Alaska Unemployment Insurance (0.50%, capped at $271): &minus;<span class="num">${$(271)}</span></li>
      <li><strong>Take-home pay: <span class="num">${$(r60.net)}</span> a year</strong>, or
      <span class="num">${$(r60.net / 12)}</span> a month</li>
    </ul>

    <h2>Compare with other no-income-tax states</h2>
    <p>The same ${$0(REF)}, single filer, 2026. Washington and Illinois are the two comparisons
    this site's readers ask for most; Illinois shows what a real income tax costs at this salary.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>State</th><th>State-level deductions on ${$0(REF)}</th><th>Take-home pay</th><th>Effective rate</th></tr></thead>
        <tbody>
${lignesCompare.map(l => `          <tr><td>${l.cle === ETAT ? "<strong>" + l.nom + "</strong>" : `<a href="/paycheck-calculator/${l.cle}/">${l.nom}</a>`}</td><td class="num">${l.etat > 0 ? $0(l.etat) : "$0"}</td><td class="num">${$0(l.net)}</td><td class="num">${(l.taux * 100).toFixed(1)}%</td></tr>`).join("\n")}
        </tbody>
      </table>
    </div>
    <p>Texas, Tennessee and Nevada come out identical to the cent against each other, because
    none of them withholds anything at state level. Alaska sits ${$0(ecartTN)} below Tennessee on
    the same gross pay, purely from its employee-paid unemployment insurance share. Against
    Illinois the gap is <strong>${$0(ecartIL)}</strong> a year.</p>

    <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

    <h2>Frequently asked questions</h2>
    <div class="faq">
${FAQ.map(([question, reponse]) => `      <h3>${question}</h3>\n      <p>${reponse}</p>`).join("\n")}
    </div>

  ${blocSources("alaska")}

  <h2>Related reading</h2>
    <ul>
      <li><a href="/paycheck-calculator/">Paycheck calculators for every state we publish</a></li>
      <li><a href="/paycheck-calculator/tennessee/">Tennessee paycheck calculator</a> &mdash;
      another no-income-tax state, but with nothing withheld at all</li>
      <li><a href="/paycheck-calculator/washington/">Washington paycheck calculator</a> &mdash;
      no income tax, but two different payroll programs come out instead</li>
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
    Rates verified against IRS and Social Security Administration figures, against the Alaska
    Department of Revenue's Personal Income tax-type page, and against the Alaska Department of
    Labor and Workforce Development's 2026 Unemployment Insurance Tax Rates.
  </p>
  <p class="disclaimer">StateLine Calc provides general information for educational purposes
  only. It is not financial, tax or legal advice. Results are estimates based on published 2026
  federal rates. Alaska levies no individual income tax under current law; its unemployment
  insurance program requires a 0.50% employee contribution on wages up to $54,200, per the Alaska
  Department of Labor and Workforce Development.</p>

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
