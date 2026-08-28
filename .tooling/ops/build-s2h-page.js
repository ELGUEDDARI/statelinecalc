/* Assemble la page "salaire -> taux horaire" d'un Etat et l'ecrit sur le disque.
 *
 * Toutes les valeurs affichees viennent du meme calcul que le moteur du site,
 * jamais d'un chiffre recopie a la main : c'est la seule facon d'etre sur que
 * la prose, le tableau et le calculateur racontent la meme chose. J'ai fait
 * trois erreurs d'arithmetique de tete aujourd'hui, toutes rattrapees en
 * comparant au generateur ; ici il n'y a rien a recopier.
 *
 * Lancer : node .tooling/ops/build-s2h-page.js [etat ...]
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { FICHES, net, c2, c0, HEURES, RACINE } = require("./build-salary-to-hourly.js");

const SALAIRES_VEDETTE = [40000, 50000, 60000, 75000, 100000];

function page(cle) {
  const f = FICHES[cle];
  const nom = f.nom;
  const url = "https://statelinecalc.com/salary-to-hourly-calculator/" + cle + "/";

  const tableau = execFileSync("node",
    [path.join(RACINE, ".tooling", "test", "gen-salary-to-hourly.js"), cle],
    { encoding: "utf8" }).replace(/\n$/, "");

  // Les chiffres cites dans la prose sont CALCULES, pas ecrits.
  const v = {};
  SALAIRES_VEDETTE.forEach(s => {
    const r = net(cle, s);
    v[s] = {
      brutH: c2(s / HEURES), netH: c2(r.net / HEURES),
      netAn: c0(r.net), netMois: c2(r.net / 12), netSem: c2(r.net / 52),
      taux: (r.taux * 100).toFixed(1),
      ecart: c2(s / HEURES - r.net / HEURES)
    };
  });
  const S60 = v[60000], S75 = v[75000], S50 = v[50000], S40 = v[40000], S100 = v[100000];

  const faq = [
    ["$40,000 a year is how much an hour in " + nom + "?",
     "$19.23 an hour before tax, and $" + S40.netH + " an hour after tax in " + nom + " in 2026, "
     + "at 40 hours a week. That is $" + S40.netAn + " a year, $" + S40.netMois + " a month, "
     + "$" + S40.netSem + " a week, an effective rate of " + S40.taux + " percent."],
    ["$50,000 a year is how much an hour in " + nom + "?",
     "$24.04 an hour before tax, and $" + S50.netH + " an hour after tax in " + nom + " in 2026, "
     + "at 40 hours a week. That is $" + S50.netAn + " a year, $" + S50.netMois + " a month, "
     + "$" + S50.netSem + " a week, an effective rate of " + S50.taux + " percent."],
    ["$60,000 a year is how much an hour in " + nom + "?",
     "$28.85 an hour before tax, and $" + S60.netH + " an hour after tax in " + nom + " in 2026, "
     + "at 40 hours a week. Almost every page answering this question gives the gross figure "
     + "only. The after-tax figure is the one that reaches your account: $" + S60.netAn + " a "
     + "year, $" + S60.netMois + " a month, $" + S60.netSem + " a week, an effective rate of "
     + S60.taux + " percent."],
    ["$75,000 a year is how much an hour in " + nom + "?",
     "$36.06 an hour before tax, and $" + S75.netH + " an hour after tax in " + nom + " in 2026, "
     + "at 40 hours a week. That is $" + S75.netAn + " a year, $" + S75.netMois + " a month, "
     + "$" + S75.netSem + " a week, an effective rate of " + S75.taux + " percent."],
    ["$100,000 a year is how much an hour in " + nom + "?",
     "$48.08 an hour before tax, and $" + S100.netH + " an hour after tax in " + nom + " in 2026, "
     + "at 40 hours a week. That is $" + S100.netAn + " a year, $" + S100.netMois + " a month, "
     + "$" + S100.netSem + " a week, an effective rate of " + S100.taux + " percent."],
    ["How do you convert an annual salary to an hourly rate?",
     "Divide by 2,080, which is 40 hours a week for 52 weeks. That gives the gross rate. To get "
     + "the rate that actually reaches you, subtract federal income tax, Social Security, "
     + "Medicare and whatever your state withholds first, then divide. The two numbers are not "
     + "close: on $60,000 in " + nom + " the difference is $" + S60.ecart + " an hour."],
    ["Is 2,080 hours the right number to divide by?",
     "It is the convention, and it assumes 40 hours a week, 52 weeks a year, with no unpaid time "
     + "off. If you work 35 hours a week the divisor is 1,820, and your real hourly rate is "
     + "higher than 2,080 suggests while your annual income is lower. Enter your own hours in "
     + "the calculator rather than accepting the assumption."],
    ["Why is the after-tax rate here lower than on other salary converters?",
     "Because most converters stop at gross. Dividing a salary by 2,080 is arithmetic anyone can "
     + "do; the useful question is what an hour is worth after federal tax, Social Security, "
     + "Medicare and what " + nom + " withholds. This page answers the second question, which is "
     + "why its figure is lower and closer to your bank statement."],
    ["Does my hourly rate change if I am paid a salary?",
     "Your pay does not change, but what an hour is worth to you does. A salaried job that "
     + "quietly runs to 50 hours a week is paid at four fifths of the rate the same salary "
     + "implies at 40. That is the comparison this page exists to make possible."]
  ];

  const q = s => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const titre = nom + " Salary to Hourly Calculator 2026 &mdash; After Tax";

  /* Le tableau des autres Etats. Il existe pour deux raisons, dans cet ordre :
     il repond a la question que se pose vraiment le visiteur - "et ailleurs ?" -
     et il relie chaque page de la famille aux six autres. Au 28/08/2026 ces
     pages n'avaient que DEUX liens entrants chacune, contre 11 a 24 pour les
     pages de paie ; elles etaient de loin les moins reliees du site. */
  const AUTRES = Object.keys(FICHES).filter(k => k !== cle).map(k => {
    const r = net(k, 60000);
    return `        <tr>
          <td><a href="/salary-to-hourly-calculator/${k}/">${FICHES[k].nom}</a></td>
          <td class="num"><strong>$${c2(r.net / HEURES)}</strong></td>
          <td class="num">$${c0(r.net)}</td>
        </tr>`;
  }).join(String.fromCharCode(10));

  return `<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Meme politique de securite que le reste du site : les points de collecte
     analytics sont nommes, rien d'autre ne peut sortir, et ce que le visiteur
     tape ne quitte jamais son navigateur. -->
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self'; img-src 'self' data: https://www.google-analytics.com https://www.googletagmanager.com; font-src 'self'; connect-src https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.google-analytics.com; object-src 'none'; base-uri 'none'; form-action 'none'">
<meta name="referrer" content="strict-origin-when-cross-origin">
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XK0HYXJH0E"></script>
<script src="/assets/analytics.js"></script>
<title>${nom} Salary to Hourly Calculator 2026 — After Tax</title>
<meta name="description" content="Convert a ${nom} salary to an hourly rate for 2026 — and see the rate after tax, not just before. $60,000 a year is $28.85 an hour gross, $${S60.netH} after tax in ${nom}.">
<link rel="canonical" href="${url}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0F172A">
<link rel="stylesheet" href="/assets/style.css">

<meta property="og:title" content="${nom} Salary to Hourly Calculator 2026 — After Tax">
<meta property="og:description" content="$60,000 a year is $28.85 an hour before tax, and $${S60.netH} after tax in ${nom}. Thirty salaries converted both ways.">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://statelinecalc.com/assets/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      "name": "${nom} Salary to Hourly Calculator",
      "url": "${url}",
      "applicationCategory": "FinanceApplication",
      "operatingSystem": "Any",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
      "description": "Converts an annual salary to an hourly rate for ${nom} in 2026, before and after federal tax, Social Security, Medicare and state withholding."
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://statelinecalc.com/" },
        { "@type": "ListItem", "position": 2, "name": "Salary to Hourly Calculator", "item": "https://statelinecalc.com/salary-to-hourly-calculator/" },
        { "@type": "ListItem", "position": 3, "name": "${nom}", "item": "${url}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
${faq.map(([n, a]) => `        {
          "@type": "Question",
          "name": "${q(n)}",
          "acceptedAnswer": { "@type": "Answer", "text": "${q(a)}" }
        }`).join(",\n")}
      ]
    },
    {
      "@type": "Organization",
      "name": "StateLine Calc",
      "url": "https://statelinecalc.com/",
      "logo": "https://statelinecalc.com/assets/icon-512.png"
    }
  ]
}
</script>
</head>
<body>

<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/"><svg class="brand-mark" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="#0F172A"/><rect x="30" y="10" width="4" height="44" rx="2" fill="#1D4ED8"/><rect x="12" y="34" width="12" height="20" rx="2" fill="#FFFFFF"/><rect x="40" y="22" width="12" height="32" rx="2" fill="#FFFFFF"/></svg>StateLine Calc</a>
    <nav class="site-nav" aria-label="Main">
      <a href="/paycheck-calculator/">Paycheck</a>
      <a href="/methodology/">Methodology</a>
    </nav>
  </div>
</header>

<main class="wrap">

<nav class="crumbs" aria-label="Breadcrumb">
  <ol>
    <li><a href="/">Home</a></li>
    <li><a href="/salary-to-hourly-calculator/">Salary to Hourly</a></li>
    <li aria-current="page">${nom}</li>
  </ol>
</nav>

  <h1>${nom} Salary to Hourly Calculator 2026</h1>

  <div class="answer">
    <p><strong>$60,000 a year is $28.85 an hour</strong> before tax, and
    <strong class="num">$${S60.netH}</strong> an hour after tax in ${nom} in 2026, at 40 hours a
    week. Nearly every page answering this question stops at the gross figure. The one below is
    what actually reaches your account: <span class="num">$${S60.netAn}</span> a year,
    <span class="num">$${S60.netMois}</span> a month.</p>
  </div>

  <section aria-labelledby="calc-h">
    <h2 id="calc-h" class="u-mt-0">Convert your own salary</h2>

    <form class="calc" data-paycheck-form data-state="${cle}" novalidate>
      <div class="field">
        <label for="salary">Your annual salary</label>
        <input type="text" id="salary" name="salary" inputmode="decimal" value="60000"
               autocomplete="off">
        <span class="help">Gross, before anything is taken out.</span>
        <span class="error" role="alert">Enter an amount greater than zero.</span>
      </div>

      <div class="field" data-hours-field hidden>
        <label for="hours">Hours per week</label>
        <input type="text" id="hours" name="hours" inputmode="decimal" value="40"
               autocomplete="off">
        <span class="help">Only asked when something here is per hour.</span>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="period">What that amount is</label>
          <select id="period" name="period">
            <option value="annual" selected>Per year</option>
            <option value="hourly">Per hour</option>
            <option value="monthly">Per month</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">Leave on &ldquo;Per year&rdquo; to convert a salary.</span>
        </div>

        <div class="field">
          <label for="filing">Filing status</label>
          <select id="filing" name="filing">
            <option value="single" selected>Single</option>
            <option value="marriedJoint">Married filing jointly</option>
            <option value="headOfHousehold">Head of household</option>
          </select>
          <span class="help">Changes the tax, and so the after-tax rate.</span>
        </div>
      </div>

      <div class="row row-2">
        <div class="field">
          <label for="retirement">401(k) contribution</label>
          <input type="text" id="retirement" name="retirement" inputmode="decimal" value="0">
          <span class="help">Percent of gross pay, before tax.</span>
        </div>

        <div class="field">
          <label for="display">Show results</label>
          <select id="display" name="display">
            <option value="hourly" selected>Per hour</option>
            <option value="annual">Per year</option>
            <option value="monthly">Per month</option>
            <option value="semimonthly">Twice a month</option>
            <option value="biweekly">Every two weeks</option>
            <option value="weekly">Per week</option>
          </select>
          <span class="help">Set to &ldquo;Per hour&rdquo; for the conversion.</span>
        </div>
      </div>

      <button type="submit" class="btn btn-primary">Convert</button>
    </form>

    <div class="result" data-paycheck-result aria-live="polite"></div>

    <p class="caption u-mt-3">
      Everything is calculated in your browser. Nothing you type is sent to us or stored.
    </p>
  </section>

  <div class="ad-slot ad-rectangle" aria-hidden="true"></div>

  <h2>${nom} salary to hourly, before and after tax</h2>
  <p class="prose">Single filer, 40 hours a week, 2026 rates. The third column is the one no
  other converter shows: what an hour of your time is actually worth once ${f.retenue.replace(/^[A-Z]/, m => m.toLowerCase())} and the
  federal government have taken their share.</p>

  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">
        2026 ${nom} salary to hourly rate, single filer, 40 hours a week
      </caption>
      <thead>
        <tr>
          <th scope="col">Annual salary</th>
          <th scope="col">Hourly before tax</th>
          <th scope="col">Hourly AFTER tax</th>
          <th scope="col">Take-home a year</th>
          <th scope="col">Per month</th>
          <th scope="col">Per week</th>
          <th scope="col">Effective rate</th>
        </tr>
      </thead>
      <tbody>
${tableau}
      </tbody>
    </table>
  </div>

  <div class="prose">

  <h2>How the conversion works</h2>
  <p>Dividing by <strong>2,080</strong> is the convention: 40 hours a week, 52 weeks a year. It
  gives you the gross hourly rate, and it is the number every other page stops at. On $60,000
  that is $28.85 an hour.</p>

  <p>But nobody is paid gross. Before anything reaches you, four things come out in ${nom}:</p>
  <ul>
    <li><strong>Federal income tax</strong>, on your pay above the 2026 standard deduction of
    <span class="num">$16,100</span> for a single filer.</li>
    <li><strong>Social Security</strong> at 6.2%, up to a wage base of
    <span class="num">$184,500</span>.</li>
    <li><strong>Medicare</strong> at 1.45% with no cap, plus 0.9% above
    <span class="num">$200,000</span>.</li>
    <li><strong>What ${nom} withholds</strong> &mdash; set out on our
    <a href="${f.lienEtat}">${nom} paycheck calculator</a>, with each rate sourced and dated.</li>
  </ul>

  <p>Do that and $60,000 stops being $28.85 an hour and becomes
  <strong class="num">$${S60.netH}</strong>. The difference is
  <span class="num">$${S60.ecart}</span> an hour &mdash; every hour, all year.</p>

  <h2>What ${nom} changes</h2>
  <p>${f.specifique}</p>

  <h2>The same $60,000 in the other states</h2>
  <p>The gross hourly rate is $28.85 everywhere. What changes is what reaches your account, and on
  an identical salary the spread is wider than most people expect.</p>
  <div class="table-scroll">
    <table>
      <caption class="caption caption-left">$60,000 a year as a real hourly rate, 2026, single filer</caption>
      <thead>
        <tr><th scope="col">State</th><th scope="col">Hourly AFTER tax</th><th scope="col">Take-home a year</th></tr>
      </thead>
      <tbody>
${AUTRES}
      </tbody>
    </table>
  </div>

  <h2>Common questions</h2>
  <div class="faq">
${faq.map(([n, a]) => `    <h3>${n}</h3>\n    <p>${a}</p>`).join("\n\n")}
  </div>

  <h2>Related reading</h2>
  <ul>
    <li><a href="${f.lienEtat}">${nom} paycheck calculator</a> &mdash; the full breakdown, every
    rate with its official source and the date it was checked.</li>
    <li><a href="/salary-to-hourly-calculator/">Salary to hourly, other states</a> &mdash; the
    same conversion where the state takes a different share.</li>
    <li><a href="/methodology/">Methodology</a> &mdash; the exact formula and what this
    deliberately does not model.</li>
  </ul>

  </div>

  <div class="ad-slot ad-leaderboard" aria-hidden="true"></div>

  <p class="dates">
    Published <time datetime="2026-08-28">August 28, 2026</time> &middot;
    Last updated <time datetime="2026-08-28">August 28, 2026</time> &middot;
    Every figure computed from the same 2026 rates as our
    <a href="${f.lienEtat}">${nom} paycheck calculator</a>, sourced and dated there.
  </p>

  <p class="disclaimer">
    StateLine Calc provides general information for educational purposes only. It is not
    financial, tax or legal advice. Results are estimates based on published 2026 rates, the
    standard deduction and 2,080 hours a year. Your actual paycheck depends on your W-4, your
    employer's benefit deductions and your full tax situation.
  </p>

</main>

<footer class="site-footer">
  <div class="wrap">
    <p><strong>StateLine Calc</strong> &mdash; free money calculators for all 50 states.
    No sign-up. No personal data required.</p>
    <p class="micro u-on-dark">
      <a href="/about/">About</a> &middot;
      <a href="/methodology/">Methodology</a> &middot;
      <a href="/contact/">Contact</a> &middot;
      <a href="/privacy/">Privacy</a> &middot;
      <a href="/terms/">Terms</a> &middot;
      <a href="/disclaimer/">Disclaimer</a>
    </p>
  </div>
</footer>

<script src="/data/rates-2026.js"></script>
<script src="/assets/calc-paycheck.js"></script>

</body>
</html>
`;
}

const cibles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FICHES);
cibles.forEach(cle => {
  if (!FICHES[cle]) { console.error("Etat sans fiche : " + cle); process.exit(1); }
  const dossier = path.join(RACINE, "salary-to-hourly-calculator", cle);
  fs.mkdirSync(dossier, { recursive: true });
  const html = page(cle);
  fs.writeFileSync(path.join(dossier, "index.html"), html, "utf8");
  const mots = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  console.log("  ecrit : salary-to-hourly-calculator/%s/ (%d mots, %d H2, %d H3)",
    cle, mots, (html.match(/<h2/g) || []).length, (html.match(/<h3/g) || []).length);
});
