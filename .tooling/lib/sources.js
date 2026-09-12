/* =========================================================================
   LES SOURCES OFFICIELLES, LIABLES — source unique.

   ── POURQUOI CE FICHIER EXISTE (mesure du 10/09/2026) ────────────────────
   `veille-confiance.js` a compare nos pages a celles des concurrents sur les
   signaux qui font qu'un humain croit un site d'argent. Un resultat sortait
   du lot :

     liens vers une source .gov — NOUS 0 · SmartAsset 0 · PaycheckCity 2

   Zero sur TOUTES nos pages, y compris `/methodology/`, dont c'est pourtant
   le seul metier. Nous ecrivions « lu sur le Montana Department of Revenue »
   sans jamais donner l'adresse.

   ── LA FAUTE DE LA PREMIERE VERSION, ET CE QU'ELLE A APPRIS ──────────────
   La v1 de ce fichier annoncait chaque lien comme portant son chiffre :
   « Ohio Department of Taxation — the 2.75% rate and the $26,050 threshold ».
   Le controle independant a demande de le PROUVER. Mesure faite le meme jour,
   en cherchant le chiffre dans le texte RENDU de chaque page (pdftotext pour
   les PDF, Chromium reel pour le HTML) :

     7 liens sur 21 portent leur chiffre. 14 ne le portent pas.

   Les 14 sont des pages d'accueil d'agence. Le libelle mentait donc par
   implication sur les deux tiers des entrees. Pire, sur l'Utah il CONTREDISAIT
   la page elle-meme : `/paycheck-calculator/utah/` avertit que la page de taux
   de l'agence « had not been updated for the 2026 cut », et le bloc Sources la
   citait comme preuve du 4,45 %. Verifie le 10/09/2026 dans un Chromium reel,
   `incometax.utah.gov/file-pay/tax-rates/` affiche toujours
   « January 1, 2025 – current 4.5% or .045 ».

   ⛔ D'OU LA REGLE DE CE FICHIER : un lien porte un `type`, et le type est une
   PROMESSE TESTEE, pas une intention.
     - `document` : la piece qui porte le chiffre. Elle DOIT contenir son
       `motif`, et `verif-liens-sources.js` echoue si ce n'est plus le cas.
     - `agence`   : le site de l'office qui fixe le taux. Utile pour partir de
       la source, mais on n'affirme PAS qu'il porte le chiffre 2026. Plusieurs
       ne le portent pas, et deux sont ouvertement perimes — la page le dit.

   ── L'AUTRE REGLE, INCHANGEE ─────────────────────────────────────────────
   ⛔ Aucune URL n'entre ici sans avoir repondu 200 le jour ou on l'ecrit, et
   la date de ce controle est publiee a cote du lien. Un lien mort sur une page
   d'argent coute plus cher que pas de lien — meme regle que pour l'adresse
   e-mail de `/contact/`.

   ⚠️ `ssa.gov` et plusieurs sites d'agences repondent 403 a curl et 200 dans un
   vrai navigateur : c'est un blocage de robot, pas une page morte. Toute URL
   refusee a curl est re-testee avec `lire-source.js` AVANT d'etre declaree
   morte. Le 10/09, ssa.gov est passe de 403 a 200 par ce chemin.

   ── CE QUI N'EST PAS ICI, ET POURQUOI ────────────────────────────────────
   Le Michigan et le Tennessee n'ont AUCUNE entree :
     - `michigan.gov/taxes` et son PDF 446 : 403 Access Denied, a curl ET dans
       un Chromium reel. Deux methodes, deux echecs.
     - `tn.gov/revenue.html` : 403 de meme, ce qui confirme l'abandon du
       01/09/2026 (3 methodes, 3 echecs).
   Ce qui manque est le LIEN, pas la source : les chiffres restent lus et dates
   dans `data/rates-2026.js` et `.tooling/sources/`. La page le DIT.

   Controle : node .tooling/test/verif-liens-sources.js
   ========================================================================= */

/* Date du dernier controle HTTP + motif de TOUTES les URL de ce fichier. */
const VERIFIE_LE = "2026-09-12";

/* type "document" -> doit contenir `motif`, teste en machine.
   type "agence"   -> on ne promet rien sur son contenu.        */

const FEDERALES = [
  {
    type: "document",
    url: "https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill",
    titre: "IRS &mdash; 2026 inflation adjustments (Rev. Proc. 2025-32)",
    quoi: "the federal brackets and the $16,100 standard deduction",
    motif: ["16,100", "standard deduction"]
  },
  {
    type: "document",
    url: "https://www.irs.gov/taxtopics/tc751",
    titre: "IRS &mdash; Topic no. 751, Social Security and Medicare withholding rates",
    quoi: "the 6.2% and 1.45% rates and the 0.9% Additional Medicare Tax",
    motif: ["6.2%", "1.45%"]
  },
  {
    type: "document",
    url: "https://www.ssa.gov/oact/cola/cbb.html",
    titre: "SSA &mdash; Contribution and benefit base",
    quoi: "the $184,500 Social Security wage base",
    motif: ["184,500"]
  }
];

const PAR_ETAT = {
  montana: [
    { type: "document",
      url: "https://revenuefiles.mt.gov/files/Forms/Montana_Employer_and_Information_Agent_Guide_with_Tax_Tables.pdf",
      titre: "Montana &mdash; Employer and Information Agent Guide, 2026 (PDF)",
      quoi: "the 5.65% top rate and the $16,100 band this page is checked against",
      motif: ["5.65%", "16,100"] },
    { type: "document",
      url: "https://uid.dli.mt.gov/employer-handbook.pdf",
      titre: "Montana Department of Labor &amp; Industry &mdash; Employer Handbook (PDF)",
      quoi: "the sentence forbidding any unemployment insurance deduction from wages",
      motif: ["deduct UI taxes from your employees"] },
    { type: "agence",
      url: "https://revenue.mt.gov/taxes/individual-income-tax/",
      titre: "Montana Department of Revenue &mdash; Individual Income Tax" }
  ],
  hawaii: [
    { type: "document",
      url: "https://data.capitol.hawaii.gov/sessions/sessionlaws/Years/SLH2024/SLH2024_Act46.pdf",
      titre: "Hawaii &mdash; Act 46, Session Laws of Hawaii 2024 (PDF)",
      quoi: "the text of the law, with brackets from 1.40% to 11.00%",
      motif: ["11.00", "1.40"] },
    { type: "document",
      url: "https://labor.hawaii.gov/dcd/files/2025/12/2026-Maximum-Weekly-Wage-Base.pdf",
      titre: "Hawaii Department of Labor &mdash; 2026 maximum weekly wage base (PDF)",
      quoi: "the $1,500.21 cap and the $7.50 weekly maximum for disability insurance",
      motif: ["1,500.21", "7.50"] },
    { type: "agence",
      url: "https://tax.hawaii.gov/",
      titre: "Hawaii Department of Taxation" }
  ],
  washington: [
    { type: "document",
      url: "https://esd.wa.gov/about-us/news-release/2025/paid-family-medical-leave-premium-rate-increases-113-2026",
      titre: "Washington Employment Security Department &mdash; 2026 Paid Leave premium",
      quoi: "the 1.13% premium behind the Paid Leave line on a Washington pay stub",
      motif: ["1.13"] },
    { type: "agence", url: "https://dor.wa.gov/", titre: "Washington Department of Revenue" }
  ],
  "north-carolina": [
    { type: "document",
      url: "https://www.des.nc.gov/need-help/faqs/employer-tax-faqs",
      titre: "N.C. Division of Employment Security &mdash; Employer Tax FAQs",
      quoi: "the sentence we quote: unemployment taxes are not deducted from " +
            "employees&rsquo; wages",
      motif: ["not deducted from employees' wages"] },
    { type: "agence", url: "https://www.ncdor.gov/taxes-forms/individual-income-tax",
      titre: "NCDOR &mdash; Individual Income Tax" }
  ],
  nebraska: [
    { type: "document",
      url: "https://revenue.nebraska.gov/sites/default/files/doc/business/Cir_En_2025/2026cir_en_whole.pdf",
      titre: "Nebraska &mdash; 2026 Circular EN, Income Tax Withholding (PDF)",
      quoi: "the withholding tables an employer actually uses, whose own rates " +
            "run from 2.26% to 4.60% and are not the tax itself",
      motif: ["2.26", "4.60"] },
    { type: "agence", url: "https://revenue.nebraska.gov/individuals",
      titre: "Nebraska Department of Revenue &mdash; Individuals" }
  ],
  ohio: [
    { type: "agence", url: "https://tax.ohio.gov/", titre: "Ohio Department of Taxation",
      perime: "its rate page carries no 2026 figure at all, so we read the rate from the " +
              "Revised Code instead" }
  ],
  utah: [
    { type: "agence", url: "https://incometax.utah.gov/",
      titre: "Utah State Tax Commission &mdash; Income Tax",
      perime: "its rate page still showed &ldquo;January 1, 2025 &ndash; current: 4.5%&rdquo; on " +
              "the day we checked, a year after the law cut the rate to 4.45%, so we read the " +
              "rate from the Utah Code and the withholding guide instead" }
  ],
  georgia: [
    { type: "document",
      url: "https://dor.georgia.gov/document/document/2026-employers-tax-guide-updated-june-2026/download",
      titre: "Georgia &mdash; Employer&rsquo;s Tax Guide, 2026 (PDF)",
      quoi: "the cut from 5.19% to 4.99%, and the May 11, 2026 date from which " +
            "employers may withhold at the new rate",
      motif: ["4.99%", "5.19%"] },
    { type: "agence", url: "https://dor.georgia.gov/", titre: "Georgia Department of Revenue" }
  ],
  illinois: [
    { type: "document",
      url: "https://tax.illinois.gov/content/dam/soi/en/web/tax/forms/withholding/documents/currentyear/il-700-t.pdf",
      titre: "Illinois &mdash; Booklet IL-700-T, Withholding Tax Tables (PDF)",
      quoi: "the flat 4.95% rate an Illinois employer withholds at",
      motif: ["4.95%"] },
    { type: "document",
      url: "https://tax.illinois.gov/research/publications/bulletins/fy-2026-15.html",
      titre: "Illinois &mdash; Informational Bulletin FY 2026-15, What&rsquo;s New for Illinois Income Taxes",
      quoi: "the $2,925 exemption allowance for 2026",
      motif: ["2,925"] },
    { type: "document",
      url: "https://ides.illinois.gov/unemployment/resources/what-every-worker-should-know-about-unemployment-insurance.html",
      titre: "Illinois Department of Employment Security &mdash; What Every Worker Should Know",
      quoi: "the rule that benefits are financed by employer payroll taxes, " +
            "not by deductions from wages &mdash; which is why no unemployment " +
            "line appears on an Illinois pay stub",
      motif: ["not by any deductions from your wages"] },
    { type: "agence", url: "https://tax.illinois.gov/", titre: "Illinois Department of Revenue" }
  ],
  pennsylvania: [
    { type: "document",
      url: "https://www.pa.gov/content/dam/copapwp-pagov/en/revenue/documents/formsandpublications/formsforindividuals/pit/documents/2026/2026_rev-413i.pdf",
      titre: "Pennsylvania &mdash; REV-413 (I), Instructions for Estimating PA Personal Income Tax, 2026 (PDF)",
      quoi: "the flat rate, in the state&rsquo;s own words: multiply by 3.07 percent (0.0307)",
      motif: ["3.07 percent"] },
    { type: "document",
      url: "https://www.pa.gov/agencies/dli/resources/for-employers-and-educators/how-to-file/uc-tax/employee-withholding",
      titre: "Pennsylvania Department of Labor &amp; Industry &mdash; UC Employee Withholding",
      quoi: "the 0.07% employee unemployment contribution, and the fact that it has " +
            "no wage cap &mdash; the line that makes a Pennsylvania pay stub unusual",
      motif: ["0.07"] },
    { type: "agence", url: "https://www.revenue.pa.gov/",
      titre: "Pennsylvania Department of Revenue" }
  ],
  texas: [
    { type: "document",
      url: "https://statutes.capitol.texas.gov/Docs/CN/htm/CN.8.htm",
      titre: "Texas Constitution, Article 8, Section 24-a",
      quoi: "the ban itself: the legislature may not impose a tax on the net " +
            "incomes of individuals",
      motif: ["may not impose a tax on the net incomes"] },
    { type: "document",
      url: "https://statutes.capitol.texas.gov/Docs/LA/htm/LA.204.htm",
      titre: "Texas Labor Code, Section 204.003 &mdash; Contribution Not Deducted From Wages",
      quoi: "the rule that an employer may not deduct any part of an unemployment " +
            "contribution from wages",
      motif: ["may not deduct any part of a contribution"] },
    { type: "agence", url: "https://comptroller.texas.gov/taxes/",
      titre: "Texas Comptroller of Public Accounts &mdash; Taxes" }
  ],
  florida: [
    { type: "document",
      url: "https://floridarevenue.com/taxes/taxesfees/Pages/reemployment.aspx",
      titre: "Florida Department of Revenue &mdash; Reemployment Tax",
      quoi: "the rule that the tax is paid by employers, on the first $7,000 of wages",
      motif: ["7,000", "paid by employers"] },
    { type: "agence", url: "https://floridarevenue.com/", titre: "Florida Department of Revenue" }
  ],
  nevada: [
    { type: "agence", url: "https://tax.nv.gov/", titre: "Nevada Department of Taxation" }
  ],
  wisconsin: [
    { type: "document",
      url: "https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf",
      titre: "Wisconsin Department of Revenue &mdash; 2026 Form 1-ES Instructions (PDF)",
      quoi: "the 2026 tax rate schedules and the sliding 2026 standard deduction this page is " +
            "checked against",
      motif: ["528.85", "13,960"] },
    { type: "document",
      url: "https://www.revenue.wi.gov/DOR%20Publications/pb166.pdf",
      titre: "Wisconsin Department of Revenue &mdash; Withholding Tax Guide, Publication W-166 (PDF)",
      quoi: "the rule that a Wisconsin employer cannot use the federal W-4, only the state's own " +
            "Form WT-4",
      motif: ["cannot be used for Wisconsin withholding"] },
    { type: "document",
      url: "https://dwd.wisconsin.gov/ui201/pdf/ucb201print.pdf",
      titre: "Wisconsin Department of Workforce Development &mdash; UI Employer Handbook (PDF)",
      quoi: "the sentence we quote: unemployment insurance is financed solely through employer " +
            "contributions",
      motif: ["financed solely through employer contributions"] },
    { type: "agence",
      url: "https://www.revenue.wi.gov/Pages/FAQS/pcs-taxrates.aspx",
      titre: "Wisconsin Department of Revenue &mdash; Tax Rates FAQ",
      perime: "it still showed only the 2025 brackets on the day we checked, with no 2026 " +
              "column at all, so we read the 2026 figures from the Form 1-ES instructions instead" }
  ],
  arkansas: [
    { type: "document",
      url: "https://www.dfa.arkansas.gov/wp-content/uploads/2026_Final_AR1000ES.pdf",
      titre: "Arkansas Department of Finance and Administration &mdash; 2026 AR1000ES, " +
             "Estimated Tax Declaration Vouchers and Instructions (PDF)",
      quoi: "the 2026 tax rate schedule, including its $94,701&ndash;$97,800.99 bridge table, " +
            "the $2,470 standard deduction and the $29/$58 tax credit",
      motif: ["2,470", "3,809.00"] },
    { type: "document",
      url: "https://dws.arkansas.gov/workforce-services/unemployment/faq/",
      titre: "Arkansas Division of Workforce Services &mdash; Unemployment Insurance FAQ",
      quoi: "the rule that unemployment insurance is an employer-paid tax, not a payroll " +
            "deduction",
      motif: ["deductions are not made from your paycheck"] },
    { type: "document",
      url: "https://codes.findlaw.com/ar/title-26-taxation/ar-code-sect-26-73-103.html",
      titre: "Arkansas Code &sect; 26-73-103, via FindLaw",
      quoi: "the statute that bars a city, county or other local government from levying an " +
            "income tax",
      motif: ["shall not levy a tax on income"] }
  ]
};

const SANS_LIEN = {
  michigan: "the Michigan Department of Treasury answers an automated request with HTTP 403",
  tennessee: "tn.gov answers an automated request with HTTP 403",
  /* Nevada, 10/09/2026 : NRS chapter 612 is the source for « unemployment is
     paid by employers ». leg.state.nv.us answered 403 to curl, to a headless
     browser AND to a real visible Chrome ; detr.nv.gov and ui.nv.gov answer an
     Akamai « Access Denied ». Three methods, three refusals — so we say so
     instead of pretending an agency home page proves the point. */
  nevada: "leg.state.nv.us, which publishes NRS chapter 612, refuses automated " +
          "requests with HTTP 403, and so do the state&rsquo;s own employment pages"
};

const MOIS = ["January", "February", "March", "April", "May", "June", "July",
              "August", "September", "October", "November", "December"];
function moisJour(iso) {
  const [a, m, j] = iso.split("-").map(Number);
  return MOIS[m - 1] + " " + j + ", " + a;
}

const ligneDocument = s =>
  '    <li><a href="' + s.url + '">' + s.titre + '</a> &mdash; ' + s.quoi + '.</li>';

const ligneAgence = s =>
  '    <li><a href="' + s.url + '">' + s.titre + '</a>' +
  (s.perime ? ' &mdash; ' + s.perime + '.' : '.') + '</li>';

/* La phrase qui separe les deux listes. Elle dit exactement ce qu'un lien
   d'agence prouve et ce qu'il ne prouve pas : c'est la correction du defaut
   du 10/09, elle doit rester. */
const AVERTISSEMENT_AGENCE =
  "These are the offices that set the figures. We link them so you can start from the source " +
  "yourself, but an agency&rsquo;s own summary page is not always current, and we do not claim " +
  "that these pages carry the 2026 number &mdash; several of them do not. Where a rate was read " +
  "somewhere else, in a statute, a withholding guide or an estimated-tax form, the exact document " +
  "and the date we read it are on our <a href=\"/methodology/\">methodology page</a>.";

/* Le nom lisible d'un Etat a partir de sa cle de fichier. */
function nomEtat(cle) {
  return cle.split("-").map(m => m[0].toUpperCase() + m.slice(1)).join(" ");
}

/* L'INTRODUCTION EST CALCULEE, PAS ECRITE EN DUR.
   Le 10/09, la phrase fixe « Every figure on this page is read from an official
   document » surplombait, sur 8 Etats, une liste ne contenant que les documents
   federaux. La page se contredisait a deux paragraphes d'intervalle sans qu'aucun
   test ne bronche. Desormais la phrase depend du nombre de documents PROPRES a
   l'Etat, et `verif-bloc-sources.js` echoue si les deux divergent. */
function introduction(cle, nbDocsEtat) {
  const commun = "If one of our numbers disagrees with one of theirs, they are right and we " +
                 "have a defect to fix &mdash; <a href=\"/contact/\">tell us</a>.";
  if (!cle) {
    return "Every figure we publish is read from an official document and dated, not taken " +
           "from another calculator. These are the documents, and the date we last checked " +
           "that each one still answers. " + commun;
  }
  const etat = nomEtat(cle);
  if (nbDocsEtat > 0) {
    return "Every figure on this page is read from an official document and dated, not taken " +
           "from another calculator &mdash; the federal ones from the IRS and the Social " +
           "Security Administration, the " + etat + " ones from the state&rsquo;s own " +
           (nbDocsEtat > 1 ? "documents" : "document") + " below. Each one carries the " +
           "date we last checked that it still answers. " + commun;
  }
  /* Aucun document propre a l'Etat : on le dit, au lieu de laisser croire le
     contraire. C'est le cas de l'Ohio et de l'Utah (page d'agence perimee) et
     des Etats dont le site refuse les requetes automatiques. */
  return "The federal figures on this page &mdash; the brackets, the standard deduction and " +
         "FICA &mdash; are read from the official documents below. The " + etat + " figures " +
         "are read from the state&rsquo;s own law and withholding guides, which we quote and " +
         "date on our <a href=\"/methodology/\">methodology page</a>: " + etat + " does not " +
         "publish a page we can link that carries its own 2026 figures. " + commun;
}

function blocSources(cle) {
  const propres = (cle && PAR_ETAT[cle]) || [];
  const docsEtat = propres.filter(s => s.type === "document");
  const docs = docsEtat.concat(FEDERALES);
  const agences = propres.filter(s => s.type === "agence");
  const manque = cle && SANS_LIEN[cle];

  let html = `  <!-- SOURCES:debut - genere par .tooling/lib/sources.js, ne pas editer a la main -->
  <h2>Sources</h2>
  <p class="prose">${introduction(cle, docsEtat.length)}</p>

  <h3>${docsEtat.length ? "The documents these figures are read from"
                        : "The federal documents these figures are read from"}</h3>
  <ul class="prose">
${docs.map(ligneDocument).join("\n")}
  </ul>`;

  if (agences.length) {
    html += `

  <h3>The agencies that set them</h3>
  <p class="prose">${AVERTISSEMENT_AGENCE}</p>
  <ul class="prose">
${agences.map(ligneAgence).join("\n")}
  </ul>`;
  }

  html += `

  <p class="caption">All links checked <time datetime="${VERIFIE_LE}">${moisJour(VERIFIE_LE)}</time>.${
    manque ? " One source is named on this page but not linked: " + manque + ", so we have no " +
             "link we have checked ourselves and we will not publish one we have not. The figures " +
             "and the dates we read them are on our <a href=\"/methodology/\">methodology page</a>." : ""
  }</p>
  <!-- SOURCES:fin -->`;
  return html;
}

/* La liste COMPLETE, pour /methodology/. */
function blocSourcesToutes(nomDeLEtat) {
  const docsEtat = [], agencesEtat = [];
  Object.keys(PAR_ETAT).sort().forEach(cle => {
    const nom = nomDeLEtat(cle);
    PAR_ETAT[cle].forEach(s => {
      const l = s.type === "document"
        ? '    <li><a href="' + s.url + '">' + s.titre + '</a> &mdash; ' + nom + ", " + s.quoi + '.</li>'
        : '    <li><a href="' + s.url + '">' + s.titre + '</a> &mdash; ' + nom +
          (s.perime ? "; " + s.perime : "") + '.</li>';
      (s.type === "document" ? docsEtat : agencesEtat).push(l);
    });
  });
  /* Le nombre et la conjonction se CALCULENT. Le 10/09, « Two states » etait
     ecrit en dur au-dessus d'une liste qui en contenait trois, et le
     `join(" and ")` produisait « Michigan and Nevada and Tennessee ». */
  const clesManquantes = Object.keys(SANS_LIEN).sort();
  const nomsManquants = clesManquantes.map(nomDeLEtat);
  const manquants = nomsManquants.length > 1
    ? nomsManquants.slice(0, -1).join(", ") + " and " + nomsManquants[nomsManquants.length - 1]
    : nomsManquants[0] || "";
  const NOMBRES = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  const combien = NOMBRES[nomsManquants.length] || String(nomsManquants.length);
  const pluriel = nomsManquants.length === 1;

  return `  <!-- SOURCES:debut - genere par .tooling/lib/sources.js, ne pas editer a la main -->
  <h2>Every source we link, with the date we last checked it</h2>
  <p>We publish the links rather than only the agency names, because a claim you cannot check is
  not evidence. Each one answered when we checked it on
  <time datetime="${VERIFIE_LE}">${moisJour(VERIFIE_LE)}</time>. If one has gone dead since,
  <a href="/contact/">tell us</a> and we will fix it.</p>

  <h3>Documents &mdash; these carry the figure itself</h3>
  <p>For each of these we check that the page still contains the number we attribute to it. That
  check is automated, and it fails before publication if a document stops carrying its figure.</p>
  <ul>
${FEDERALES.map(ligneDocument).join("\n")}
${docsEtat.join("\n")}
  </ul>

  <h3>Agencies &mdash; the offices behind the numbers</h3>
  <p>${AVERTISSEMENT_AGENCE}</p>
  <ul>
${agencesEtat.join("\n")}
  </ul>

  <p>${combien} ${pluriel ? "state has" : "states have"} no link at all, and it is worth saying
  why rather than leaving a gap: <strong>${manquants}</strong>. ${pluriel ? "That state&rsquo;s" : "Those states&rsquo;"}
  own sites answer an automated request with HTTP 403 &mdash; and they still refuse when we come
  back from a real browser rather than a script, which is what a refusal like that usually
  means. So we have no
  link we have checked ourselves, and we will not publish one we have not checked. The figures are
  still read from those agencies and dated in our rate file; what is missing is the link, not the
  source.</p>
  <!-- SOURCES:fin -->`;
}

module.exports = { VERIFIE_LE, FEDERALES, PAR_ETAT, SANS_LIEN,
                   blocSources, blocSourcesToutes, moisJour };
