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
const VERIFIE_LE = "2026-09-30";

/* Etats dont TOUS les liens (propres + federaux) ont ete re-controles plus tard que
   VERIFIE_LE : Minnesota, 06/10/2026 (HTTP 200 sur les 8 URL, dont les 3 federales ;
   texte des documents du Minnesota relu le meme jour). */
const VERIFIE_ETAT = { minnesota: "2026-10-06", indiana: "2026-10-06", oregon: "2026-10-06" };

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
  alaska: [
    { type: "document",
      url: "https://tax.alaska.gov/programs/programs/index.aspx?10001",
      titre: "Alaska Department of Revenue, Tax Division &mdash; \"Personal Income\" tax type page",
      quoi: "the statement that Alaska currently has no individual income tax and requires no " +
            "state withholding",
      motif: ["does not have an individual income tax"] },
    { type: "document",
      url: "https://labor.alaska.gov/estax/2026-experience-rates.html",
      titre: "Alaska Department of Labor and Workforce Development &mdash; 2026 Unemployment " +
             "Insurance Tax Rates",
      quoi: "the 0.50% employee rate and the $54,200 taxable wage base, the only state on this " +
            "site where part of unemployment insurance comes out of the employee's own pay",
      motif: ["0.50%", "54,200"] }
  ],
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
  ],
  virginia: [
    { type: "document",
      url: "https://www.tax.virginia.gov/sites/default/files/vatax-pdf/employer-withholding-instructions.pdf",
      titre: "Virginia Department of Taxation &mdash; Income Tax Withholding Guide for " +
             "Employers, rev. 05/25 (PDF)",
      quoi: "the four-bracket withholding formula (2% to 5.75%), the $8,750/$17,500 " +
            "standard deduction and the $930 personal exemption",
      motif: ["8,750", "5.75%"] }
  ],
  "north-dakota": [
    { type: "document",
      url: "https://www.tax.nd.gov/sites/www/files/documents/forms/individual/2026-iit/2026-income-tax-withholding-rates-booklet.pdf",
      titre: "North Dakota Office of State Tax Commissioner &mdash; Income Tax Withholding " +
             "Rates &amp; Instructions, for wages paid in 2026 (PDF)",
      quoi: "the three withholding brackets (0%, 1.95%, 2.5%) and their thresholds for " +
            "Single ($57,625/$258,450), Married Filing Jointly ($57,500/$168,525) and Head " +
            "of Household ($78,475/$289,675)",
      motif: ["57,625", "1.95%"] },
    { type: "document",
      url: "https://www.tax.nd.gov/business/sales-and-use-tax/local-taxes-city-and-county-taxes",
      titre: "North Dakota Office of State Tax Commissioner &mdash; Local Taxes, City and " +
             "County Taxes",
      quoi: "the state's own exhaustive list of local taxes cities and counties may levy " +
            "&mdash; sales, use, lodging and rental taxes only, no income tax",
      motif: ["cities and counties may levy sales and use taxes"] },
    { type: "document",
      url: "https://www.jobsnd.com/sites/www/files/documents/jsnd-documents/uitaxrateschedules2026.pdf",
      titre: "Job Service North Dakota &mdash; 2026 Unemployment Insurance Tax Rate Schedules " +
             "(PDF)",
      quoi: "the $46,600 taxable wage base, paid entirely by the employer &mdash; no employee " +
            "rate appears anywhere in this schedule",
      motif: ["46,600"] }
  ],
  wyoming: [
    { type: "document",
      url: "https://wyoleg.gov/statutes/compress/title39.pdf",
      titre: "Wyoming Statutes, Title 39, &sect;&nbsp;39-12-101, &ldquo;Preemption by " +
             "state&rdquo; (PDF)",
      quoi: "the single statute that bars both the state and every county, city and town " +
            "from levying a tax on wages or other income",
      motif: ["preempt for itself the field"] },
    { type: "document",
      url: "https://dws.wyo.gov/dws-division/unemployment-insurance/wyui/unemployment-taxable-wage-base/",
      titre: "Wyoming Department of Workforce Services &mdash; Unemployment Taxable Wage Base",
      quoi: "the $33,800 taxable wage base for 2026",
      motif: ["33,800"] },
    { type: "document",
      url: "https://dws.wyo.gov/dws-division/unemployment-insurance/employers/unemployment-tax-rates/",
      titre: "Wyoming Department of Workforce Services &mdash; Unemployment Tax Rates",
      quoi: "the rule that new-employer rates are set by industry rather than a single flat " +
            "rate, with an 8.5% ceiling for a late registration",
      motif: ["8.5%"] }
  ],
  mississippi: [
    { type: "document",
      url: "https://www.dor.ms.gov/sites/default/files/tax-forms/business/89700251revised1.13.2026.pdf",
      titre: "Mississippi Department of Revenue &mdash; Withholding Income Tax Tables And " +
             "Employer Instructions, Pub 89-700-25-1 (PDF)",
      quoi: "the two-segment 2026 rate schedule (0% on the first $10,000, 4.0% above) and the " +
            "per-status exemption and standard deduction amounts",
      motif: ["4.0%", "6,000"] },
    { type: "document",
      url: "https://mdes.ms.gov/media/10376/UI_2_3_R_and_Instructions.pdf",
      titre: "Mississippi Department of Employment Security &mdash; Instructions for " +
             "Completing Form UI-2/3 (PDF)",
      quoi: "the $14,000 unemployment insurance taxable wage base",
      motif: ["14,000"] },
    { type: "document",
      url: "https://mdes.ms.gov/employers/unemployment-tax/reporting-and-filing/unemployment-tax-rates/",
      titre: "Mississippi Department of Employment Security &mdash; Unemployment Tax Rates",
      quoi: "the 1.00%/1.10%/1.20% new-employer rate schedule, paid entirely by the employer",
      motif: ["1.00%"] }
  ],
  "new-mexico": [
    { type: "document",
      url: "https://realfile.tax.newmexico.gov/FYI-104.pdf",
      titre: "New Mexico Taxation and Revenue Department &mdash; FYI-104, New Mexico " +
             "Withholding Tax, effective January 1, 2026 (PDF)",
      quoi: "the six-rate withholding schedule (1.5% to 5.9%) and the annual table for " +
            "Single ($8,050), Married ($16,100) and Head of Household ($12,075)",
      motif: ["8,050", "5.9%"] },
    { type: "document",
      url: "https://www.tax.newmexico.gov/businesses/withholding-tax-and-workers-compensation/",
      titre: "New Mexico Taxation and Revenue Department &mdash; Withholding Tax and " +
             "Workers Compensation",
      quoi: "the workers&rsquo; compensation administration fee, including the $2.25 " +
            "employee share from July 1, 2025",
      motif: ["2.25", "52-5-19"] },
    { type: "document",
      url: "https://www.tax.newmexico.gov/businesses/wp-content/uploads/sites/4/2020/11/rpd-41108.pdf",
      titre: "New Mexico Taxation and Revenue Department &mdash; Workers&rsquo; Compensation " +
             "Fee Instructions, form WC-1 (PDF, older)",
      quoi: "that the fee is charged per quarter and that the employee&rsquo;s share should be " +
            "deducted from wages; its dollar amounts date from 2004 and are out of date",
      motif: ["deducted from the wages of the employee", "per quarter"] },
    { type: "document",
      url: "https://web.archive.org/web/20260421103306/https://www.dws.state.nm.us/en-us/Unemployment/Unemployment-for-an-Individual/What-You-Should-Know-About-UI/UI-Taxes",
      titre: "New Mexico Department of Workforce Solutions &mdash; UI Taxes (Internet Archive " +
             "snapshot of April 21, 2026)",
      quoi: "the statement that the employer pays unemployment insurance taxes; the " +
            "department&rsquo;s own site refuses automated requests, so we link the archived copy",
      motif: ["you pay UI taxes to fund UI benefits"] },
    { type: "document",
      url: "https://web.archive.org/web/20260615230704/https://www.dws.nm.gov/UI-Tax-Information",
      titre: "New Mexico Department of Workforce Solutions &mdash; Unemployment Insurance Tax " +
             "Information (Internet Archive snapshot of June 15, 2026)",
      quoi: "the $34,800 taxable wage base for 2026",
      motif: ["34,800"] },
    { type: "document",
      url: "https://web.archive.org/web/20260510231813/https://www.dws.state.nm.us/PFML",
      titre: "New Mexico Department of Workforce Solutions &mdash; Paid Family and Medical " +
             "Leave (Internet Archive snapshot of May 10, 2026)",
      quoi: "the page&rsquo;s description of a task force developing recommendations for a " +
            "paid family and medical leave law",
      motif: ["task force"] }
  ],
  "rhode-island": [
    { type: "document",
      url: "https://web.archive.org/web/20260804140612/https://tax.ri.gov/sites/g/files/xkgbur541/files/2025-12/2026%20Withholding%20Tax%20Booklet.pdf",
      titre: "Rhode Island Division of Taxation &mdash; 2026 Employer&rsquo;s Income Tax " +
             "Withholding Tables (PDF, Internet Archive snapshot of August 4, 2026)",
      quoi: "the annual withholding table (3.75%, 4.75% and 5.99%, the same for every filing " +
            "status) and the $1,000 exemption that disappears above $290,800 of annual wages; " +
            "the division&rsquo;s own site refuses automated requests, so we link the archived copy",
      motif: ["82,050", "290,800"] },
    { type: "document",
      url: "https://web.archive.org/web/20260415040946/https://dlt.ri.gov/press-releases/2026-tax-rates-unemployment-insurance-and-temporary-disability-insurance",
      titre: "Rhode Island Department of Labor and Training &mdash; 2026 Tax Rates for " +
             "Unemployment Insurance and Temporary Disability Insurance (Internet Archive snapshot " +
             "of April 15, 2026)",
      quoi: "the 1.1% TDI rate on the first $100,000 of wages, the statement that TDI is paid by " +
            "employees, and the statement that unemployment benefits are funded by employers; the department&rsquo;s site also refuses automated requests, so we link the archived copy",
      motif: ["1.1 percent", "paid by employees, not employers"] },
    { type: "document",
      url: "https://web.archive.org/web/20260809193710/https://dlt.ri.gov/individuals/temporary-disability-caregiver-insurance/employers",
      titre: "Rhode Island Department of Labor and Training &mdash; TDI / TCI For Employers " +
             "(Internet Archive snapshot of August 9, 2026)",
      quoi: "the &ldquo;1.1% employee wage deduction&rdquo; on a $100,000 taxable wage base for 2026; archived copy, for the same reason",
      motif: ["1.1% employee wage deduction"] }
  ],
  colorado: [
    { type: "document",
      url: "https://web.archive.org/web/20260823134135/https://tax.colorado.gov/sites/tax/files/documents/DR_1098_Colorado_Withholding_Worksheet_for_Employees.pdf",
      titre: "Colorado Department of Revenue &mdash; DR 1098, 2026 Colorado Withholding " +
             "Worksheet for Employers (PDF, Internet Archive snapshot of August 23, 2026)",
      quoi: "the withholding method itself: annual wages minus $5,500 ($11,000 if married " +
            "filing jointly), times 4.40%; the department&rsquo;s own site refuses automated " +
            "requests, so we link the archived copy",
      motif: ["4.40%", "5,500"] },
    { type: "document",
      url: "https://web.archive.org/web/20260208073325/https://tax.colorado.gov/sites/tax/files/documents/DR_0004_2026.pdf",
      titre: "Colorado Department of Revenue &mdash; DR 0004, 2026 Colorado Employee " +
             "Withholding Certificate (PDF, Internet Archive snapshot of February 8, 2026)",
      quoi: "the statement that withholding based on the federal W-4 will generally result in " +
            "a refund, and the optional allowances of $14,000, $22,000 and $30,000; archived " +
            "copy, for the same reason",
      motif: ["generally result in a refund", "14,000"] },
    { type: "document",
      url: "https://web.archive.org/web/20260426234623/https://tax.colorado.gov/individual-income-tax-guide",
      titre: "Colorado Department of Revenue &mdash; Individual Income Tax Guide (Internet " +
             "Archive snapshot of April 26, 2026)",
      quoi: "that Colorado taxes modified federal taxable income, and the rate by tax year " +
            "(4.25% for 2024, 4.4% for 2025); archived copy, for the same reason",
      motif: ["modified federal taxable income", "4.25%"] },
    { type: "document",
      url: "https://web.archive.org/web/20260228181124/https://tax.colorado.gov/sites/tax/files/documents/Wage_Withholding_Tax_Guide_Jan_2026.pdf",
      titre: "Colorado Department of Revenue &mdash; Colorado Wage Withholding Tax Guide, " +
             "revised January 2026 (PDF, Internet Archive snapshot of February 28, 2026)",
      quoi: "that overtime compensation is generally subject to Colorado withholding, and that " +
            "the DR 1098 worksheet prescribes the calculation; archived copy, for the same reason",
      motif: ["overtime compensation", "prescribes the method"] },
    { type: "document",
      url: "https://web.archive.org/web/20260118202513/https://famli.colorado.gov/employers",
      titre: "Colorado FAMLI Division &mdash; Employers (Internet Archive snapshot of " +
             "January 18, 2026)",
      quoi: "the 0.88% premium split 0.44% employer and 0.44% employee, on wages up to the " +
            "Social Security wage cap; archived copy, because the live page refuses automated requests",
      motif: ["0.44% paid by the employee", "Social Security Wage Cap"] },
    { type: "document",
      url: "https://web.archive.org/web/20251205221239/https://cdle.colorado.gov/employers/unemployment-insurance-premiums/premium-rates",
      titre: "Colorado Department of Labor and Employment &mdash; Unemployment Insurance " +
             "Premium Rates (Internet Archive snapshot of December 5, 2025)",
      quoi: "the statement that employers pay unemployment premiums, and the $30,600 chargeable " +
            "wage base for 2026; archived copy, because the live page refuses automated requests",
      motif: ["employers must pay annual premiums", "30,600"] },
    { type: "document",
      url: "https://www.denvergov.org/files/assets/public/v/2/finance/documents/treasury/tax-guides/taxguidetopic61_occupationalprivilegetaxes.pdf",
      titre: "City and County of Denver &mdash; Tax Guide Topic No. 61, Occupational " +
             "Privilege Taxes (PDF, revised 1/2021)",
      quoi: "the Employee OPT of $5.75 per month, withheld by the employer, for workers who " +
            "earn at least $500 for a calendar month in Denver",
      motif: ["$5.75 per month", "five hundred dollars"] },
    { type: "document",
      url: "https://www.greenwoodvillage.com/1220/Occupational-Privilege-Tax-OPT",
      titre: "Greenwood Village &mdash; Occupational Privilege Tax (OPT)",
      quoi: "the $2 per month employee portion, which applies when $250 or more is earned " +
            "in a calendar month",
      motif: ["$2 per month", "$250 or more"] },
    { type: "document",
      url: "https://www.auroragov.org/business_services/taxes/occupational_privilege_tax",
      titre: "City of Aurora &mdash; Occupational Privilege Tax",
      quoi: "the city&rsquo;s notice that its occupational privilege tax will be repealed " +
            "effective January 1, 2025, with the last returns covering 2024",
      motif: ["repealed effective Jan. 1, 2025"] }
  ],
  arizona: [
    { type: "document",
      url: "https://web.archive.org/web/20260705190656/https://azdor.gov/sites/default/files/document/FORMS_WITHHOLDING_2026_A-4_f.pdf",
      titre: "Arizona Department of Revenue &mdash; Form A-4, Employee&rsquo;s Arizona " +
             "Withholding Election, 2026 (PDF, Internet Archive snapshot of July 5, 2026)",
      quoi: "the seven percentages an employee can pick (0.5% to 3.5%), the 2.0% the department " +
            "requires when no form is given, and the definition of gross taxable wages; the " +
            "department&rsquo;s own site refuses automated requests, so we link the archived copy",
      motif: ["gross taxable wages", "3.5%"] },
    { type: "document",
      url: "https://web.archive.org/web/20260827135938/https://azdor.gov/individuals/withholding-tax-individual",
      titre: "Arizona Department of Revenue &mdash; Withholding Tax, Individual (Internet " +
             "Archive snapshot of August 27, 2026)",
      quoi: "the 2.0% default when a new employee does not complete Form A-4 within five days, " +
            "and the note that the tax rate on Arizona taxable income is 2.5% for tax year 2023 " +
            "and beyond; archived copy, for the same reason",
      motif: ["tax year 2023 and beyond"] },
    { type: "document",
      url: "https://web.archive.org/web/20260513213053/https://azdor.gov/sites/default/files/document/FORMS_INDIVIDUAL_2025_140i.pdf",
      titre: "Arizona Department of Revenue &mdash; Form 140 Resident Personal Income Tax " +
             "Return, 2025 instructions (PDF, Internet Archive snapshot of May 13, 2026)",
      quoi: "line 46, which multiplies Arizona taxable income by 2.5%, and the 2025 standard " +
            "deductions (single $15,750); archived copy, for the same reason",
      motif: ["2.5% (.025)"] },
    { type: "document",
      url: "https://www.azleg.gov/ars/43/00401.htm",
      titre: "Arizona Revised Statutes &sect; 43-401, Withholding tax; rates; election by employee",
      quoi: "the rule that an employee who fails to complete the election form is deemed to " +
            "have elected the withholding percentage the department prescribes",
      motif: ["deemed to have elected the withholding percentage"] },
    { type: "document",
      url: "https://web.archive.org/web/20251030211242/https://des.az.gov/services/employment/unemployment-employer/reporting-wages-and-paying-unemployment-insurance-taxes/payment-taxes-overview",
      titre: "Arizona Department of Economic Security &mdash; Payment Taxes, Overview " +
             "(Internet Archive snapshot of October 30, 2025)",
      quoi: "the statement that state unemployment taxes cannot be withheld from employees&rsquo; " +
            "wages, and the $8,000 taxable wage base; archived copy, because the live page " +
            "refuses automated requests",
      motif: ["cannot be withheld from employees"] },
    { type: "document",
      url: "https://web.archive.org/web/20260907091451/https://des.az.gov/services/employment/unemployment-employer",
      titre: "Arizona Department of Economic Security &mdash; Unemployment, Employer (Internet " +
             "Archive snapshot of September 7, 2026)",
      quoi: "that employers are currently required to pay unemployment taxes on the first $8,000 " +
            "in gross wages paid to each employee in a calendar year; archived copy, for the same reason",
      motif: ["8,000"] }
  ],
  "new-jersey": [
    { type: "document",
      url: "https://www.nj.gov/treasury/taxation/pdf/current/njwt.pdf",
      titre: "New Jersey Division of Taxation &mdash; NJ-WT, Income Tax Withholding Instructions " +
             "(PDF, September 2025 revision)",
      quoi: "which rate table applies to which NJ-W4 filing status, the $1,000 annual value of one " +
            "withholding allowance, the subtraction before the table is used, the treatment of " +
            "supplemental wages, and the rule that 401(k) contributions up to the federal limit are " +
            "not subject to New Jersey withholding",
      motif: ["Withhold at Rate B", "401(k) contributions up to the federal limit"] },
    { type: "document",
      url: "https://www.nj.gov/treasury/taxation/pdf/withholdingtables.pdf",
      titre: "New Jersey Division of Taxation &mdash; Tables for Percentage Method of Withholding " +
             "(PDF, wages paid on and after October 1, 2020)",
      quoi: "the annual Rate A and Rate B tables, from 1.5% to 11.8%, that this calculator applies",
      motif: ["TABLES FOR PERCENTAGE METHOD OF WITHHOLDING", "October 1, 2020"] },
    { type: "document",
      url: "https://www.nj.gov/treasury/taxation/pdf/current/njw4.pdf",
      titre: "New Jersey Division of Taxation &mdash; Form NJ-W4, Employee&rsquo;s Withholding " +
             "Allowance Certificate (PDF)",
      quoi: "the filing-status boxes, the line for the number of allowances, the rule that single " +
            "and married-separate filers are withheld at Rate A, and the two-income wage chart",
      motif: ["Total number of allowances you are claiming"] },
    { type: "document",
      url: "https://www.nj.gov/labor/ea/employer-services/rate-info",
      titre: "New Jersey Department of Labor and Workforce Development &mdash; Rate information, " +
             "contributions, and due dates",
      quoi: "the 2026 worker contribution rates (unemployment 0.3825%, workforce funds 0.0425%, " +
            "disability 0.19%, family leave 0.23%) and the $44,800 and $171,100 taxable wage bases",
      motif: ["0.003825", "171,100"] },
    { type: "document",
      url: "https://www.nj.gov/labor/lwdhome/press/2025/20251229_newbenefitrates2026.shtml",
      titre: "New Jersey Department of Labor and Workforce Development &mdash; New benefit rates " +
             "for 2026 (press release of December 29, 2025)",
      quoi: "the 2026 taxable wage bases, $44,800 for unemployment and $171,100 for temporary " +
            "disability and family leave insurance",
      motif: ["171,100", "44,800"] },
    { type: "document",
      url: "https://www.nj.gov/treasury/taxation/pdf/current/1040i.pdf",
      titre: "New Jersey Division of Taxation &mdash; 2025 NJ-1040 instructions, with the tax " +
             "rate schedules (PDF)",
      quoi: "the 1.4% to 10.75% rates on the income tax return, which differ from the withholding " +
            "tables, and the $1,000 exemption for yourself and your spouse",
      motif: ["New Jersey Tax Rate Schedules", ".05525"] }
  ],
  massachusetts: [
    { type: "document",
      url: "https://web.archive.org/web/20260312193631/https://www.mass.gov/doc/massachusetts-circular-m-income-tax-withholding-tables-at-50-effective-january-1-2026/download",
      titre: "Massachusetts Department of Revenue &mdash; Circular M, Income Tax Withholding " +
             "Tables at 5.0% Effective January 1, 2026 (PDF, Internet Archive snapshot of March 12, 2026)",
      quoi: "the percentage method itself: the 5% rate, the 9% rate above $1,107,750 (the 4% " +
            "surtax), the Social Security and Medicare deduction capped at $2,000, the exemption " +
            "factors, the head of household credit and the $8,000 floor; the department&rsquo;s own " +
            "site refuses automated requests, so we link the archived copy",
      motif: ["4% Surtax", "1,107,750"] },
    { type: "document",
      url: "https://web.archive.org/web/20260803165850/https://www.mass.gov/doc/form-m-4-massachusetts-employees-withholding-exemption-certificate/download",
      titre: "Massachusetts Department of Revenue &mdash; Form M-4, Employee&rsquo;s Withholding " +
             "Exemption Certificate (PDF, Internet Archive snapshot of August 3, 2026)",
      quoi: "the personal exemption on line 1, the spouse exemption on line 2, and the rule that " +
            "each spouse may claim a personal exemption if both are subject to withholding; " +
            "archived copy, for the same reason",
      motif: ["Your personal exemption", "each may claim a personal exemption"] },
    { type: "document",
      url: "https://web.archive.org/web/20260916051521/https://www.mass.gov/info-details/paid-family-and-medical-leave-employer-contribution-rates-and-calculator",
      titre: "Massachusetts Department of Family and Medical Leave &mdash; Paid Family and Medical " +
             "Leave employer contribution rates and calculator (Internet Archive snapshot of " +
             "September 16, 2026)",
      quoi: "the 2026 split: up to 0.28% of wages for medical leave and 0.18% for family leave " +
            "can be withheld from the worker, capped at the Social Security taxable maximum; " +
            "archived copy, because the live page refuses automated requests",
      motif: ["0.28% of eligible wages", "Social Security taxable maximum"] },
    { type: "document",
      url: "https://web.archive.org/web/20251213160708/https://www.mass.gov/info-details/learn-about-employer-contributions-to-dua",
      titre: "Massachusetts Department of Unemployment Assistance &mdash; Learn about employer " +
             "contributions to DUA (Internet Archive snapshot of December 13, 2025)",
      quoi: "the statement that employers make the unemployment insurance contributions, and the " +
            "other contributions the page lists as employer contributions; archived copy, for the " +
            "same reason",
      motif: ["Subject employers are required by law to make quarterly UI contributions"] },
    { type: "document",
      url: "https://web.archive.org/web/20240331042643/https://www.mass.gov/info-details/massachusetts-non-government-pensions",
      titre: "Massachusetts Department of Revenue &mdash; Massachusetts non-government pensions " +
             "(Internet Archive snapshot of March 31, 2024)",
      quoi: "that 401(k) elective deferrals, other than Roth contributions, are excluded from " +
            "Massachusetts gross income to the same extent as from federal gross income; archived " +
            "copy, for the same reason",
      motif: ["elective deferrals of your current compensation"] }
  ],
  minnesota: [
    { type: "document",
      url: "https://www.revenue.state.mn.us/sites/default/files/2025-12/wh-inst-26.pdf",
      titre: "Minnesota Department of Revenue &mdash; 2026 Minnesota Income Tax Withholding " +
             "Instruction Booklet and Tax Tables (PDF)",
      quoi: "the computer formula on page 34: multiply the allowances on Form W-4MN by $5,300, " +
            "subtract the result from annual wages, and apply the chart of 5.35%, 6.80%, 7.85% and " +
            "9.85% rates for a single or married employee; also the rule that an employee with no " +
            "Form W-4MN is withheld at the single rate with zero allowances",
      motif: ["Computer Formula", "5,300"] },
    { type: "document",
      url: "https://www.revenue.state.mn.us/sites/default/files/2026-04/w-4mn.pdf",
      titre: "Minnesota Department of Revenue &mdash; 2026 Form W-4MN, Minnesota Employee " +
             "Withholding Certificate (PDF)",
      quoi: "the worksheet that turns your situation into allowances, with one for yourself, one " +
            "if you are single or have a non-working spouse and one job, one more if you are " +
            "married, and one more for head of household",
      motif: ["Determining Minnesota Allowances", "Head of Household"] },
    { type: "document",
      url: "https://web.archive.org/web/20260731171530/https://pl.mn.gov/resources/calculators/premium-rate-and-contributions",
      titre: "Minnesota Paid Leave &mdash; Premium rate and contributions (Internet Archive " +
             "snapshot of July 31, 2026)",
      quoi: "the 2026 premium rate of 0.88% and the rule that employers can collect up to 0.44% of " +
            "wages from employees; archived copy, because the live page refuses automated requests",
      motif: ["0.88%", "0.44%"] },
    { type: "document",
      url: "https://www.revisor.mn.gov/statutes/cite/268B.14",
      titre: "Minnesota Statutes, section 268B.14 &mdash; Premiums",
      quoi: "the rule that employers pay at least half of the premium, that employees pay the " +
            "rest through a wage deduction, and that the maximum wages subject to premium equal the " +
            "maximum earnings subject to the Social Security tax",
      motif: ["maximum wages subject to premium"] },
    { type: "document",
      url: "https://mn.gov/deed/business/starting-business/insurance/unemployment-insurance.jsp",
      titre: "Minnesota Department of Employment and Economic Development &mdash; " +
             "Unemployment Insurance, for employers",
      quoi: "the statement that the state unemployment insurance tax is paid by employers and " +
            "&ldquo;may not be withheld from employee wages&rdquo;",
      motif: ["may not be withheld from employee wages"] },
    { type: "document",
      url: "https://www.revisor.mn.gov/statutes/cite/290.92",
      titre: "Minnesota Statutes, section 290.92 &mdash; Tax withheld at source upon wages",
      quoi: "the definition of &ldquo;wages&rdquo; for state withholding as the same term used in " +
            "section 3401 of the Internal Revenue Code, the federal definition this page " +
            "applies to a 401(k) contribution",
      motif: ["3401(a), (f), and (i)"] }
  ],
  indiana: [
    { type: "document",
      url: "https://www.in.gov/dor/files/dn01.pdf",
      titre: "Indiana Department of Revenue &mdash; Departmental Notice #1, How to Compute " +
             "Withholding for State and County Income Tax (PDF)",
      quoi: "the 2.95% state rate for 2026, the $1,000 deduction per exemption claimed on Form " +
            "WH-4, the rule that county tax is withheld on the same wages at the rate of the " +
            "employee&rsquo;s county on January 1, and the rate for each of the 92 counties",
      motif: ["individuals is 2.95%", "Indiana County Tax Rates"] },
    { type: "document",
      url: "https://web.archive.org/web/20250612092821/https://forms.in.gov/download.aspx?id=2702",
      titre: "Indiana Department of Revenue &mdash; Form WH-4, Employee&rsquo;s Withholding " +
             "Exemption and County Status Certificate (Internet Archive snapshot of June 12, 2025)",
      quoi: "the exemptions on lines 1 and 2, one for yourself and one for a spouse who does not " +
            "claim it, and the county of residence and county of principal employment as of " +
            "January 1; archived copy, because forms.in.gov refuses automated requests",
      motif: ["You are entitled to one exemption", "Indiana County of Residence as of January 1"] },
    { type: "document",
      url: "https://www.in.gov/dor/files/ib33.pdf",
      titre: "Indiana Department of Revenue &mdash; Income Tax Information Bulletin #33, " +
             "Withholding Requirements for Nonresident Employees (PDF)",
      quoi: "the reciprocity agreements with Kentucky, Michigan, Ohio, Pennsylvania and " +
            "Wisconsin, and the rule that county income tax is still withheld",
      motif: ["reciprocity agreements with Kentucky, Michigan"] },
    { type: "document",
      url: "https://www.in.gov/dwd/indiana-unemployment/employers/employer-guide/unemployer-insurance-employer-guide/",
      titre: "Indiana Department of Workforce Development &mdash; Unemployment Insurance " +
             "employer guide, Hired an Employee",
      quoi: "the statement that employees do not pay into unemployment insurance and that no " +
            "money is deducted from employee paychecks for it",
      motif: ["Employees do NOT pay into UI"] }
  ],
  oregon: [
    { type: "document",
      url: "https://www.oregon.gov/dor/forms/FormsPubs/withholding-tax-formulas_206-436_2026.pdf",
      titre: "Oregon Department of Revenue &mdash; Oregon Withholding Tax Formulas, effective " +
             "January 1, 2026 (PDF)",
      quoi: "the withholding formula: wages minus the federal tax withheld (capped, and phased out " +
            "as pay rises) minus the standard deduction, the 4.75% to 9.9% rates, and the $263 " +
            "credit for each allowance",
      motif: ["not to exceed $8,750", "Effective January 1, 2026"] },
    { type: "document",
      url: "https://www.oregon.gov/dor/forms/FormsPubs/withholding-tax-tables_206-430_2026.pdf",
      titre: "Oregon Department of Revenue &mdash; Oregon Withholding Tax Tables, effective " +
             "January 1, 2026 (PDF)",
      quoi: "the printed wage-bracket tables that this page&rsquo;s formula is checked against " +
            "for pay below about $51,000 a year",
      motif: ["For wages of $4,250 and more, see Oregon Withholding Tax Formulas"] },
    { type: "document",
      url: "https://www.oregon.gov/dor/forms/FormsPubs/form-or-W-4-instr_101-402-1_2026.pdf",
      titre: "Oregon Department of Revenue &mdash; 2026 Form OR-W-4 Instructions (PDF)",
      quoi: "the allowances: one for yourself, one for a spouse on a joint return, the income " +
            "limits above which the formula ignores them, and the 8% rate used when no form is " +
            "filed",
      motif: ["if no one else can claim you as a dependent", "Eight percent of your wages"] },
    { type: "document",
      url: "https://www.oregon.gov/dor/programs/businesses/pages/statewide-transit-tax.aspx",
      titre: "Oregon Department of Revenue &mdash; Statewide Transit Tax",
      quoi: "the 0.1% employee tax withheld from wages, and the instruction to keep withholding " +
            "at that rate after Measure 120 did not pass",
      motif: ["one-tenth of 1 percent or .001"] },
    { type: "document",
      url: "https://www.oregon.gov/employ/Businesses/Tax/Pages/Current-Tax-Rate.aspx",
      titre: "Oregon Employment Department &mdash; Current Tax and Contribution Rates",
      quoi: "the 2026 Paid Leave Oregon contribution rate of 1% of wages up to $184,500, and the " +
            "unemployment insurance rates, which are rates for employers",
      motif: ["1% of subject wages up to $184,500"] },
    { type: "document",
      url: "https://www.oregon.gov/employ/Businesses/Tax/Pages/Payroll-Taxes.aspx",
      titre: "Oregon Employment Department &mdash; Payroll Taxes, Contributions",
      quoi: "the notice that the State Transit Tax increase has been delayed pending a vote by " +
            "Oregon voters in November 2026, and the instruction to keep withholding 0.1%",
      motif: ["delayed pending a vote by Oregon voters in November 2026"] },
    { type: "document",
      url: "https://paidleave.oregon.gov/resources/common-questions.html",
      titre: "Paid Leave Oregon &mdash; Common questions",
      quoi: "the rule that employees pay 60% of the contribution rate, and the 2026 maximum " +
            "wage of $184,500",
      motif: ["Employees pay 60% of the contribution rate"] },
    { type: "document",
      url: "https://www.oregon.gov/DCBS/wbf/Pages/index.aspx",
      titre: "Oregon Department of Consumer and Business Services &mdash; Workers&rsquo; " +
             "Benefit Fund assessment",
      quoi: "the 2026 assessment of 1.8 cents per hour worked",
      motif: ["1.8 cents per hour worked"] },
    { type: "document",
      url: "https://wcd.oregon.gov/laws/Documents/Proposed_rules_and_testimony/70-25053-EXHIBIT2-Director-testimony-WBF-assessment-2026.pdf",
      titre: "Oregon Workers&rsquo; Compensation Division &mdash; Director&rsquo;s testimony on " +
             "the 2026 Workers&rsquo; Benefit Fund assessment (PDF)",
      quoi: "the statement that employers and workers each pay half of the assessment",
      motif: ["each pay half of the assessment"] },
    { type: "document",
      url: "https://www.portland.gov/revenue/personal-tax",
      titre: "City of Portland Revenue Division &mdash; Personal taxes, payroll withholding " +
             "requirements",
      quoi: "the rule that Metro&rsquo;s housing tax is withheld automatically only for " +
            "employees earning more than $200,000 or who opt in, and the same for Multnomah " +
            "County&rsquo;s Preschool for All tax",
      motif: ["employees who earn more than $200,000 annually"] },
    { type: "document",
      url: "https://www.multco.us/finance/preschool-all-personal-income-tax",
      titre: "Multnomah County &mdash; Preschool For All Personal Income Tax",
      quoi: "the 1.5% and 3% rates, and the instruction that employers withhold automatically " +
            "only for employees making over $200,000",
      motif: ["automatically withhold for employees making over $200,000"] },
    { type: "document",
      url: "https://trimet.org/taxinfo/",
      titre: "TriMet &mdash; Payroll and self-employment tax information",
      quoi: "the 0.8237% transit tax, which the employer pays",
      motif: ["0.8237%"] },
    { type: "document",
      url: "https://www.oregon.gov/dor/programs/businesses/Pages/Lane-County-Transit-District-Payroll-tax.aspx",
      titre: "Oregon Department of Revenue &mdash; Lane County Transit District payroll tax",
      quoi: "the statement that the Lane transit tax is imposed directly on the employer",
      motif: ["imposed directly on the employer"] }
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
          "requests with HTTP 403, and so do the state&rsquo;s own employment pages",
  /* Idaho, 12/09/2026: tax.idaho.gov and legislature.idaho.gov timed out on
     three separate methods from this machine (direct curl, IPv4-forced curl,
     a real headless Chromium) while sos.idaho.gov, the same .gov domain,
     answered normally the same day &mdash; a block on specific state
     servers, not the whole TLD. Both documents were still read, from their
     Internet Archive snapshots (the same PDFs, HTTP 200 there), so the
     figures on this page are sourced and dated; we just have no link from
     this machine that we have verified ourselves. */
  idaho: "tax.idaho.gov and legislature.idaho.gov time out on every automated " +
         "connection attempt from this machine, though the same figures were read from their " +
         "Internet Archive snapshots"
  ,
  /* Virginia, 16/09/2026: vec.virginia.gov (the Virginia Employment
     Commission, source for the unemployment-insurance line) answers an F5/WAF
     403 to both curl and a real headless Chromium. Its Internet Archive
     snapshot from 18/05/2026 was still read, and confirms only employers are
     addressed in the page's "Paying Taxes" section &mdash; no employee
     deduction is mentioned anywhere on it. */
  virginia: "vec.virginia.gov, the Virginia Employment Commission, refuses automated " +
            "requests with an F5/WAF HTTP 403, though its Internet Archive snapshot was read",
  /* New Hampshire, 29/09/2026: both revenue.nh.gov (Interest & Dividends Tax
     repeal) and nhes.nh.gov (unemployment insurance) answer HTTP 403 to
     curl, to PowerShell Invoke-WebRequest AND to a real headless Chromium
     with a browser user agent &mdash; three methods, three refusals, same
     discipline as Idaho. Both documents were still read from their Internet
     Archive snapshots (2026-09-20 for revenue.nh.gov, 2026-01-05 for
     nhes.nh.gov), so the figures on this page are sourced and dated; we
     just have no link from this machine that we have verified ourselves. */
  "new-hampshire": "revenue.nh.gov and nhes.nh.gov refuse automated requests with HTTP 403, " +
                    "though both documents were read from their Internet Archive snapshots"
  /* New Mexico, 30/09/2026 : PAS d'entree ici, volontairement. dws.state.nm.us
     (Department of Workforce Solutions) repond 403 a curl sur tous les chemins
     essayes, MAIS les trois pages lues (chomage employeur seul, base salariale
     34 800 $, PFML) sont liees dans PAR_ETAT["new-mexico"] par leur instantane
     Internet Archive, qui repond 200 et dont le contenu est teste par
     verif-liens-sources.js. Une entree SANS_LIEN dirait « aucun lien verifie »
     alors qu'il y en a trois : le controle du 30/09 l'a releve sur
     /methodology/. */
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
function introduction(cle, nbDocsEtat, manque) {
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
  /* Aucun document propre a l'Etat LINKABLE depuis cette machine. Deux cas,
     et ils ne disent pas la meme chose : soit l'Etat ne publie vraiment rien
     de plus qu'une page d'agence perimee (Ohio, Utah), soit il publie un
     document que le reseau de cette machine ne peut pas joindre alors qu'on
     l'a lu par ailleurs (SANS_LIEN : Michigan, Tennessee, Nevada, Idaho).
     Le 12/09 la page Idaho affirmait « Idaho ne publie pas » alors que le
     document existe et a ete lu via Wayback — trouve par controle-statelinecalc,
     et vrai aussi sur les 3 autres Etats de SANS_LIEN avant cette correction. */
  if (manque) {
    /* On cite SANS_LIEN[cle] textuellement plutot que de deviner comment la
       figure a ete lue : seul Idaho documente une lecture via Wayback,
       Michigan/Tennessee/Nevada disent seulement pourquoi il n'y a pas de
       lien verifie, sans preciser la methode alternative. Une phrase fixe
       qui promettrait Wayback pour les trois serait une affirmation que
       les donnees ne soutiennent pas. */
    return "The federal figures on this page &mdash; the brackets, the standard deduction and " +
           "FICA &mdash; are read from the official documents below. The " + etat + " figures " +
           "are read from the state&rsquo;s own law and withholding guides, which we quote and " +
           "date on our <a href=\"/methodology/\">methodology page</a>: " + etat + " does " +
           "publish its own document, but " + manque + ", so we have no link from this machine " +
           "that we have verified ourselves. " + commun;
  }
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
  <p class="prose">${introduction(cle, docsEtat.length, manque)}</p>

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

  <p class="caption">All links checked <time datetime="${(cle && VERIFIE_ETAT[cle]) || VERIFIE_LE}">${moisJour((cle && VERIFIE_ETAT[cle]) || VERIFIE_LE)}</time>.${
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
