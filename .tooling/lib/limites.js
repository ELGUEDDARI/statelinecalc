/* =========================================================================
   DEUX BLOCS DE CONFIANCE, GENERES UNE SEULE FOIS POUR TOUT LE SITE.

   ── POURQUOI CE FICHIER EXISTE (demande du PDG, 12/09/2026) ───────────────
   Deux ameliorations de confiance/fidelisation demandees sur le gabarit
   commun, pas page par page :

     1. blocLimites()   — « What this calculator does not cover », inspire
        de QuickBooks qui liste explicitement les limites de son outil.
     2. blocChecklist() — « What you need before you calculate », avant le
        formulaire. Purement informatif, aucun nouveau champ de saisie.

   ⛔ REGLE SUIVIE POUR ECRIRE blocLimites() : chaque point a ete VERIFIE dans
   le moteur reel avant d'etre ecrit, pas invente. Preuves, ligne par ligne :

     - assets/calc-paycheck.js, fonction computeAnnual() : la deduction
       federale est TOUJOURS le standard deduction (R.federal.standardDeduction),
       il n'existe aucun chemin d'itemisation ni aucun credit federal (Child
       Tax Credit, EITC, credits d'education) — confirme aussi par
       disclaimer/index.html ligne 194 : "education credits reduce tax owed
       dollar for dollar. We do not model them."
     - Le formulaire (ex. paycheck-calculator/washington/index.html,
       lignes 261-334) ne demande qu'UN montant, UNE frequence de paie et UN
       pourcentage de 401(k) : aucun second emploi, aucun revenu 1099, aucune
       prime d'assurance sante, HSA ou FSA ne peut etre saisi. Le seul montant
       pre-impot est `pretax = retirementPct * gross` (calc-paycheck.js).
     - Les taxes locales sont exclues PAR CONCEPTION : methodology/index.html
       lignes 285, 303, 349 le disent explicitement pour la Pennsylvanie,
       l'Ohio et le Michigan/Wisconsin ("the local earned income tax we
       deliberately do not model", "the city income tax we deliberately do
       not model", "the city and school district taxes we deliberately do
       not model"). Aucun Etat ne recoit de ligne de taxe locale.
     - Pas d'heures supplementaires : periodsPerYear() (calc-paycheck.js,
       ~ligne 28) multiplie simplement le taux horaire par les heures
       saisies ; aucune majoration au-dela de 40 h/semaine n'existe dans le
       code.
     - Additional Medicare Tax : `R.fica.additionalMedicare.threshold`
       (data/rates-2026.js) est un seuil UNIQUE de 200 000 $, applique quel
       que soit le statut de declaration (calc-paycheck.js ligne ~89 :
       "applied on the $200,000 single threshold, which is how an employer
       actually withholds it regardless of filing status"). Ce n'est pas ce
       qu'un couple marie devra reellement en fin d'annee (seuil different,
       fixe par l'IRS a la declaration).
     - Statuts de declaration : le formulaire n'offre que single,
       marriedJoint, headOfHousehold (ex. washington/index.html lignes
       294-298) — pas de married filing separately, pas de qualifying
       surviving spouse.
     - Aucune saisie de retenue sur salaire (garnishment) : le moteur ne
       connait ni pension alimentaire ni saisie-arret ; `net` ne retranche
       que impot + programmes d'Etat + 401(k).

   Les DEUX blocs sont statiques (memes 50 Etats, meme moteur, memes champs
   de formulaire) : pas de parametre par Etat, contrairement a blocSources().

   Poses par .tooling/ops/pose-limites.js, entre les memes marqueurs HTML que
   sources.js (<!-- LIMITES:debut/fin -->, <!-- CHECKLIST:debut/fin -->), pour
   pouvoir etre remplaces sans etre retapes.
   ========================================================================= */

/* Indiana (06/10/2026) est le premier Etat dont le moteur ajoute une ligne de taxe
   LOCALE : l'impot de comte, retenu avec l'impot d'Etat. La phrase generique
   « this calculator does not add that line for any state » serait fausse sur sa
   page : le bloc depend donc de l'Etat, et reste identique partout ailleurs. */
const LOCAL_GENERIQUE = `    <li><strong>Local taxes</strong> &mdash; city income tax, county tax, or a school-district
    tax. Where a state levies one, our <a href="/methodology/">methodology page</a> says so by
    name; this calculator does not add that line, with two exceptions: the
    <a href="/paycheck-calculator/indiana/">Indiana</a> and <a href="/paycheck-calculator/maryland/">Maryland</a>
    calculators add the local income tax for the county you choose.</li>`;
const LOCAL_PAR_ETAT = {
  /* Alabama (06/10/2026) : le livret du DOR dit que les taxes d'occupation locales ne sont pas
     administrees par l'Etat ; la ville de Birmingham liste une « Occupational Tax » mais AUCUN taux n'a
     ete lu sur une page officielle : la page n'en chiffre aucun et ne dit pas « Alabama has no ». */
  alabama: `    <li><strong>Local occupational taxes</strong> &mdash; the Alabama Department of Revenue says local
    occupational taxes are not administered by the state, and that for details you must contact the city or county
    that levies one. The City of Birmingham, for example, lists an occupational tax on its Tax and License Division
    page. This calculator adds no local line for Alabama. The only local income tax lines on this site are on the
    <a href="/paycheck-calculator/indiana/">Indiana</a> and <a href="/paycheck-calculator/maryland/">Maryland</a> calculators.</li>`,
  indiana: `    <li><strong>Local taxes other than Indiana county income tax</strong> &mdash; any city income
    tax or school-district tax that may apply to you. This calculator does add one local line for Indiana, the county
    income tax, at the rate for the county you choose above. The only other local line on this site is on the
    <a href="/paycheck-calculator/maryland/">Maryland calculator</a>. Our <a href="/methodology/">methodology page</a>
    names the local taxes it leaves out.</li>`,
  maryland: `    <li><strong>Local taxes other than Maryland local income tax</strong> &mdash; any other tax that may
    apply to you. This calculator does add one local line for Maryland, the local income tax, at the rate for
    the county or Baltimore City you choose above. The only other local line on this site is on the
    <a href="/paycheck-calculator/indiana/">Indiana calculator</a>. Our <a href="/methodology/">methodology page</a>
    names the local taxes it leaves out.</li>`,
  /* Oregon (06/10/2026) : les taxes locales existent, et la page doit les CLASSER :
     retenue automatique seulement au-dela de 200 000 $ (Metro, Multnomah) ou sur
     demande ; payees par l'employeur (TriMet, Lane). Aucune n'est ajoutee. */
  oregon: `    <li><strong>Local taxes</strong> &mdash; city income tax, county tax, or a school-district
    tax. In Oregon the ones to know are the Portland-area Metro housing tax and Multnomah County&rsquo;s
    Preschool for All tax, which an employer withholds automatically only above $200,000 of pay or when
    you ask it to, and the TriMet and Lane transit taxes, which your employer pays rather than you.
    This calculator adds none of them, with two exceptions elsewhere on the site: the
    <a href="/paycheck-calculator/indiana/">Indiana</a> and <a href="/paycheck-calculator/maryland/">Maryland</a>
    calculators add the local income tax for the county you choose.</li>`
};

function blocLimites(cle) {
  const local = (cle && LOCAL_PAR_ETAT[cle]) || LOCAL_GENERIQUE;
  return `  <!-- LIMITES:debut - genere par .tooling/lib/limites.js, ne pas editer a la main -->
  <h2>What this calculator does not cover</h2>
  <p class="prose">This tool models federal income tax, Social Security, Medicare and the
  payroll programs your state actually runs &mdash; nothing more. It deliberately leaves out:</p>
  <ul class="prose">
    <li><strong>Itemized deductions and federal tax credits</strong> &mdash; the Child Tax
    Credit, the Earned Income Tax Credit, education credits. The engine always applies the
    standard deduction; there is no itemizing path.</li>
    <li><strong>A second job, self-employment income or 1099 pay.</strong> Every dollar you
    enter is treated as one employer&rsquo;s W-2 wages, taxed at the employee share of Social
    Security and Medicare &mdash; not the self-employment tax a 1099 worker actually owes.</li>
    <li><strong>Pre-tax benefits other than the 401(k) field</strong> &mdash; health insurance
    premiums, an HSA or FSA, commuter benefits. The only amount taken out before tax is the
    percentage you enter for a 401(k).</li>
${local}
    <li><strong>Overtime premiums.</strong> An hourly rate is multiplied by the hours you enter;
    it does not add a time-and-a-half rate for hours worked past 40 in a week.</li>
    <li><strong>Wage garnishments or court-ordered deductions</strong> &mdash; child support, a
    wage levy. Your result assumes none exist.</li>
    <li><strong>The Additional Medicare Tax, at the single-filer threshold.</strong> The 0.9%
    surtax above $200,000 is applied at that one figure for every filing status, the way an
    employer actually withholds it &mdash; not the higher threshold a married couple filing
    jointly may end up owing at tax return time.</li>
    <li><strong>Married filing separately, or a qualifying surviving spouse.</strong> The
    calculator only offers single, married filing jointly, and head of household.</li>
  </ul>
  <p class="caption">None of these change what you owe &mdash; they change what a pay stub
  cannot show without more information than a calculator can ask for. See
  <a href="/disclaimer/">why your pay stub will differ</a> for the details.</p>
  <!-- LIMITES:fin -->`;
}

function blocChecklist(cle) {
  const comte = cle === "indiana"
    ? `
      <li>Your Indiana county as of January 1 &mdash; it sets the county income tax rate</li>`
    : cle === "maryland"
    ? `
      <li>Your Maryland county, or Baltimore City &mdash; it sets the local income tax rate</li>` : "";
  return `  <!-- CHECKLIST:debut - genere par .tooling/lib/limites.js, ne pas editer a la main -->
  <div class="box-neutre">
    <h3 class="u-mt-0">What you need before you calculate</h3>
    <ul class="prose">
      <li>Your gross salary, or your hourly rate</li>
      <li>How often you are paid &mdash; per year, per month, twice a month, every two weeks,
      per week, or per hour</li>
      <li>Your filing status &mdash; single, married filing jointly, or head of household</li>
      <li>Your 401(k) contribution percentage, if you have one &mdash; leave it at 0 if not</li>${comte}
    </ul>
  </div>
  <!-- CHECKLIST:fin -->`;
}

module.exports = { blocLimites, blocChecklist };
