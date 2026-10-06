/* =========================================================================
   statelinecalc.com — TAX RATE DATA, TAX YEAR 2026
   -------------------------------------------------------------------------
   EVERY NUMBER IN THIS FILE CARRIES ITS SOURCE AND THE DATE IT WAS READ.
   A number without a source is considered wrong and must not ship.

   Verified 2026-08-22 by reading the official pages listed below.
   Re-verify every January. These figures change every year.
   ========================================================================= */

const RATES_2026 = {

  meta: {
    taxYear: 2026,
    verifiedOn: "2026-08-22",
    reviewDue: "2027-01-15"
  },

  /* -----------------------------------------------------------------------
     FEDERAL INCOME TAX — tax year 2026
     Source: IRS, "IRS releases tax inflation adjustments for tax year 2026,
     including amendments from the One, Big, Beautiful Bill" (Rev. Proc. 2025-32)
     https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill
     Read 2026-08-22.
     ----------------------------------------------------------------------- */
  federal: {
    standardDeduction: {
      single: 16100,
      marriedJoint: 32200,
      headOfHousehold: 24150
    },
    // [upper bound of the band, marginal rate]. Infinity closes the top band.
    brackets: {
      single: [
        [12400, 0.10],
        [50400, 0.12],
        [105700, 0.22],
        [201775, 0.24],
        [256225, 0.32],
        [640600, 0.35],
        [Infinity, 0.37]
      ],
      marriedJoint: [
        [24800, 0.10],
        [100800, 0.12],
        [211400, 0.22],
        [403550, 0.24],
        [512450, 0.32],
        [768700, 0.35],
        [Infinity, 0.37]
      ],
      /* Added 2026-08-27. The form has always offered "Head of household",
         but this table was missing, so the engine silently fell back to the
         single bands and overstated federal tax for every HoH visitor.
         Read verbatim from Rev. Proc. 2025-32, TABLE 2 - Section 1(j)(2)(B),
         "Heads of Households". Note the thresholds are NOT the single ones:
         $201,750 and $256,200 here, against $201,775 and $256,225 for single. */
      headOfHousehold: [
        [17700, 0.10],
        [67450, 0.12],
        [105700, 0.22],
        [201750, 0.24],
        [256200, 0.32],
        [640600, 0.35],
        [Infinity, 0.37]
      ]
    }
  },

  /* -----------------------------------------------------------------------
     FICA — Social Security and Medicare
     Source: IRS Topic no. 751, "Social Security and Medicare withholding rates"
     https://www.irs.gov/taxtopics/tc751 — read 2026-08-22, verbatim:
       "The current tax rate for Social Security is 6.2% for the employer and
        6.2% for the employee"
       "The current rate for Medicare is 1.45% for the employer and 1.45% for
        the employee"
       "For earnings in 2026, this base limit is $184,500"
       "the 0.9% Additional Medicare tax on an individual's wages paid in
        excess of $200,000"
     Cross-checked against SSA's contribution and benefit base for 2026
     ($184,500) — two independent official sources agree.
     ----------------------------------------------------------------------- */
  fica: {
    socialSecurity: { rate: 0.062, wageBase: 184500 },
    medicare: { rate: 0.0145 },
    additionalMedicare: { rate: 0.009, threshold: 200000 }
  },

  /* -----------------------------------------------------------------------
     WASHINGTON STATE
     ----------------------------------------------------------------------- */
  states: {
    washington: {
      name: "Washington",
      abbr: "WA",

      // Washington levies no personal income tax. This is the whole reason
      // WA take-home pay is unusually high, and it is the single most
      // citable fact on the page.
      incomeTax: { hasIncomeTax: false },

      /* Paid Family and Medical Leave.
         Source: Washington State Employment Security Department news release,
         "Paid Family & Medical Leave premium rate increases to 1.13% in 2026"
         https://esd.wa.gov/about-us/news-release/2025/paid-family-medical-leave-premium-rate-increases-113-2026
         Read 2026-08-22, verbatim: "The premium rate will be 1.13%." and
         "employees will pay 71.43%."
         The premium applies to gross wages up to the Social Security cap
         ($184,500 in 2026), per paidleave.wa.gov.
         Employee effective rate = 1.13% x 71.43% = 0.807159% */
      paidLeave: {
        totalRate: 0.0113,
        employeeShare: 0.7143,
        get employeeRate() { return this.totalRate * this.employeeShare; },
        wageCap: 184500
      },

      /* WA Cares Fund — long-term care.
         Source: wacaresfund.wa.gov (employer information).
         Read 2026-08-22: 0.58% of gross wages, employee-paid, NO wage cap.
         Note: some workers hold an approved exemption. The calculator lets
         the user switch this off rather than assuming. */
      waCares: {
        rate: 0.0058,
        wageCap: null,
        exemptionPossible: true
      }
    },

    /* -----------------------------------------------------------------------
       NEVADA — added 2026-08-27
       The point of this page: Nevada withholds NOTHING at state level. Not
       even the payroll programs that make Washington's "no income tax"
       claim only half true. Three official sources read on 2026-08-27:

       1. No personal income tax, and it is constitutional, not statutory.
          tax.nv.gov, "Income Tax in Nevada", verbatim:
          "Nevada residents do not pay state tax on income earned from
           salaries, wages, or similar compensation." and "The State of
           Nevada does not impose a state income tax on individuals".
          Nevada Constitution, Article 10, Section 1, subsection 9:
          "No income tax shall be levied upon the wages or personal income
           of natural persons." Read via FindLaw's text of the article on
          2026-08-27; leg.state.nv.us refuses automated requests (HTTP 403).
          The same article permits taxing business income, which is how the
          Modified Business Tax below coexists with it.

       2. Modified Business Tax — EMPLOYER only, never withheld from wages.
          tax.nv.gov, "Modified Business Tax": "Every employer who is subject
          to Nevada Unemployment Compensation Law (NRS 612) is also subject to
          the Modified Business Tax on total gross wages." General business
          rate 1.17% since 2023-07-01, first $50,000 of wages non-taxable.
          It is a tax ON the employer, not a deduction FROM the employee.

       3. Unemployment insurance — EMPLOYER only.
          detr.nv.gov: employer rate 2.95% of wages up to the taxable limit
          for new employers, plus 0.05% Career Enhancement Program. Nothing
          comes out of the employee's side.

       Consequence for the engine: no paidLeave object, no waCares object.
       computeAnnual already guards on both, so a Nevada paycheck is federal
       income tax + Social Security + Medicare, and nothing else.
       ----------------------------------------------------------------------- */
    nevada: {
      name: "Nevada",
      abbr: "NV",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
       TEXAS - added 2026-08-27.

       Texas takes nothing out of a paycheck, and unlike most no-tax states it
       is not a matter of policy that a future legislature could reverse. It is
       written into the state constitution. Every line below was read verbatim
       on statutes.capitol.texas.gov on 2026-08-27, in a real browser: the site
       serves a JavaScript shell, so plain fetching returns byte-identical
       files for different laws and proves nothing.

       1. No individual income tax - CONSTITUTIONAL, not statutory.
          Texas Constitution, Article 8, Section 24-a, "INDIVIDUAL INCOME TAX
          PROHIBITED": "The legislature may not impose a tax on the net incomes
          of individuals, including an individual's share of partnership and
          unincorporated association income." (Added Nov. 5, 2019.)
          Section 24, which had merely required a referendum, was repealed the
          same day. The ban is now flat.

       2. No capital gains tax - added very recently.
          Article 8, Section 24-b, "CAPITAL GAINS TAX PROHIBITED", covers
          "realized or unrealized capital gains of an individual, family,
          estate, or trust". (Added Nov. 4, 2025.) Nine months old at the time
          of writing. It explicitly does NOT touch property tax, sales tax or
          use tax - which is exactly how Texas funds itself instead.
          Worth contrasting with Washington, which does levy a capital gains
          tax: same "no income tax" headline, opposite answer here.

       3. Unemployment insurance - EMPLOYER only, never withheld.
          Texas Labor Code Sec. 204.003, "CONTRIBUTION NOT DEDUCTED FROM
          WAGES": "An employer may not deduct any part of a contribution from
          the wages of an individual in the employer's employ."
          The taxable ceiling is in Sec. 201.082(1): the part of pay "that
          exceeds ... $9,000" per employee per calendar year.
          Note for anyone updating this: the 2026 employer rate range lives on
          twc.texas.gov, which answers HTTP 403 to automated requests AND to a
          real headless browser - it blocks at the firewall. It does not matter
          here: an employer-paid tax never appears on an employee's paycheck
          and changes no figure in this calculator.

       4. No state disability insurance, no state paid family leave payroll
          deduction. Texas has neither program.

       Consequence for the engine: like Nevada, no paidLeave and no waCares
       object. A Texas paycheck is federal income tax + Social Security +
       Medicare, and nothing else.
       ----------------------------------------------------------------------- */
    texas: {
      name: "Texas",
      abbr: "TX",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
     * TENNESSEE — aucun impot sur le revenu des salaires.
     *
     * ⛔ tn.gov EST INJOIGNABLE depuis cette machine. Quatre methodes, quatre
     * echecs, le 05/09/2026 : curl avec user-agent Chrome meurt au handshake TLS
     * (schannel), Node donne ECONNRESET sur www.tn.gov et 403 sur l'apex, et un
     * VRAI Chromium recoit ERR_CONNECTION_RESET. Qu'un navigateur reel echoue
     * aussi prouve que ce n'est PAS un filtrage d'user-agent comme
     * tax.hawaii.gov — c'est coupe au niveau reseau. Ne pas retenter : voir
     * .tooling/sources/tennessee.md pour les deux hotes officiels qui, eux,
     * repondent.
     *
     * SOURCE 1, la loi elle-meme. Public Chapter 181, Actes de 2017 (HB 534),
     * telecharge le 05/09/2026 depuis publications.tnsosfiles.com — le serveur
     * de publication du Secretaire d'Etat, HTTP 200, 3 724 474 octets.
     * Section 13, modifiant Tennessee Code Annotated § 67-2-102, verbatim :
     *   « (5) For any tax year that begins on or after January 1, 2021, and for
     *     subsequent tax years, zero percent (0%). »
     * Section 15 avance la date d'abrogation de 2022 a 2021.
     * => 0 % depuis les exercices ouverts au 1er janvier 2021, donc 0 % en 2026.
     *
     * SOURCE 2, la liste officielle des taxes. tn.gov/revenue/taxes.html,
     * instantane Wayback du 28/07/2026. Aucun impot sur le revenu des personnes
     * parmi les taxes actives ; le Hall Income Tax figure sous « Archived Taxes »
     * a cote du Gift Tax et de l'Inheritance Tax.
     *
     * LE PIEGE WASHINGTON, verifie et ecarte. Washington n'a pas d'impot sur le
     * revenu et pourtant 1,387 % sortent de chaque paie (PFML + WA Cares) : dire
     * « rien ne sort » sans verifier donnerait un net faux. Page « Employers » du
     * Tennessee Department of Labor & Workforce Development, archive du
     * 29/03/2024 : l'« Unemployment Insurance Tax » est rangee sous EMPLOYERS,
     * et la section « Employees » ne liste que Safety & Health, Labor Laws,
     * Education Opportunities et Injuries at Work — aucune cotisation salariale.
     * => Rien n'est retenu au niveau de l'Etat.
     *
     * SOURCE 3, l'assiette du Hall Income Tax — celle qui porte l'angle de la
     * page. tn.gov/revenue/taxes/hall-income-tax.html, instantane Wayback du
     * 08/03/2026, relu le 05/09/2026 (HTTP 200), verbatim :
     *   « The Hall income tax is imposed only on individuals and other entities
     *     receiving interest from bonds and notes and dividends from stock. »
     * et, sur l'abrogation : « repealed for tax periods that begin on
     * January 1, 2021 ».
     *
     * ⛔ CETTE LIGNE A FAILLI PARTIR SANS SOURCE. Le 05/09/2026 la page affirmait
     * deja que le Hall tax ne frappait que les interets et dividendes, en ne
     * s'appuyant que sur PC 181 — qui AMENDE § 67-2-102 sans jamais en citer la
     * phrase d'assiette. Le fichier de sources l'avait ecrit noir sur blanc :
     * « A lire avant de l'ecrire. » Ca ne l'avait pas ete. L'affirmation etait
     * vraie, la diligence ne l'etait pas : c'est exactement le cas ou on publie
     * du juste par chance. Le controle independant l'a rattrape avant la mise en
     * ligne.
     *
     * A SAVOIR pour la page : un salarie du Tennessee n'a donc jamais paye
     * d'impot d'Etat sur son salaire, meme avant 2021. C'est l'angle qui
     * distingue cette page des trois autres Etats sans impot deja publies. */
    tennessee: {
      name: "Tennessee",
      abbr: "TN",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
       GEORGIA - added 2026-08-28. The first state on this site that actually
       taxes wages, so this block is where the pattern for the other 40 gets
       set. Read verbatim on dor.georgia.gov, page "Important Tax Updates",
       section "2026 Income Tax Changes", on 2026-08-28:

         "The Georgia income tax rate has been reduced to a flat rate of 4.99%."

         "The Georgia standard deduction has been increased to $15,000 for
          single taxpayers, heads of households, and married taxpayers filing
          separately, or $30,000 for married taxpayers filing jointly"

       Note the deduction is NOT the same for every filer, which is why the
       engine had to learn to read a table here and not a single number.
       Head of household takes $15,000, the same as single - do not assume it
       sits between the two the way the federal one does.

       A flat tax is expressed as a single band running to Infinity. That is
       not a workaround: progressiveTax already handles it, and writing it this
       way means a future rate change is a one-line edit.

       Unemployment insurance - EMPLOYER only, never withheld.
       dol.georgia.gov, "Learn About Unemployment Taxes and Benefits",
       read 2026-08-28, verbatim: "In Georgia, employers pay the entire cost
       of unemployment insurance benefits." Taxable on the first $9,500 per
       employee per year. Nothing reaches the employee's stub.

       NOT YET VERIFIED, so the page must not claim it: whether any Georgia
       county or city levies its own income tax. Two attempts on dor.georgia.gov
       found no local withholding schedule, but absence of a page is not proof
       of absence of a tax. Until it is read on a source, the page says only
       what the calculator does, which is model the state tax.

       Also read on the same DOR page, and worth a section of its own:
       "Georgia did not conform to the exemptions from income for overtime and
        tipped wages in the One Big Beautiful Bill Act. However, up to $1,750
        of each may be exempted from the calculation of taxable net income."
       So the federal deduction reaches $25,000 of tips while Georgia stops at
       $1,750. That divergence is claimed on the return, not through payroll,
       so it is not modeled here - it is explained on the page.
       ----------------------------------------------------------------------- */
    /* -----------------------------------------------------------------------
       FLORIDA - added 2026-08-28. Fourth by real traffic on the competitor we
       measured, and the reason it is here rather than a state with an emptier
       search page: choosing states by how contested the results looked was a
       bad criterion, and it cost us a page on Nevada, which turns out to sit
       near the bottom of the traffic list.

       1. No personal income tax - but NOT the flat prohibition Texas has, and
          the difference is worth stating precisely rather than lumping the two
          together. Florida Constitution, Article VII, Section 5(a), read
          verbatim on flsenate.gov on 2026-08-28:

            "NATURAL PERSONS. No tax upon estates or inheritances or upon the
             income of natural persons who are residents or citizens of the
             state shall be levied by the state, or under its authority, in
             excess of the aggregate of amounts which may be allowed to be
             credited upon or deducted from any similar tax levied by the
             United States or any state."

          That is a ceiling tied to what federal law allows to be credited, not
          the outright "may not impose" of Texas Article 8 Section 24-a. The
          practical result today is the same - nothing is withheld from a
          Florida paycheck - and the page says exactly that and no more. Do not
          write anything about WHY the ceiling comes to zero without reading a
          source for it first.

          Subsection (b) caps tax on non-natural persons at 5% of net income.
          That is the corporate income tax and has nothing to do with a wage
          earner's paycheck.

       2. Reemployment tax - EMPLOYER only, never withheld.
          floridarevenue.com, "Florida Reemployment Tax", read 2026-08-28,
          verbatim: "Reemployment tax is paid by employers" and "Only the first
          $7,000 of wages paid to each employee by their employer in a calendar
          year is taxable."
          $7,000 is the federal floor for a state wage base - no state uses a
          lower one. Same page: Florida renamed its Unemployment Compensation
          Law the Reemployment Assistance Program Law in 2012, which is why the
          tax is called something different here than everywhere else.

       3. No state disability insurance, no state paid family leave deduction.

       Consequence for the engine: like Nevada and Texas, no paidLeave and no
       waCares object. A Florida paycheck is federal income tax + Social
       Security + Medicare, and nothing else.
       ----------------------------------------------------------------------- */
    florida: {
      name: "Florida",
      abbr: "FL",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
       ILLINOIS - added 2026-08-28. Sixth by real traffic on smartasset, and the
       first state here whose deduction can vanish entirely, which is why the
       engine had to learn deductionPhaseOut before this block could exist.

       1. Flat rate. tax.illinois.gov, "Income Tax Rates", read 2026-08-28,
          verbatim: "Individual Income Tax  Effective July 1, 2017:
          4.95 percent of net income". Unchanged since 2017.

       2. Personal exemption, NOT a standard deduction. Illinois Department of
          Revenue bulletin FY 2026-15, "What is coming in 2026?", verbatim:
          "Personal Exemption - The personal exemption amount for tax year 2026
          will increase to $2,925."
          It is granted PER EXEMPTION - the filer, a spouse, each dependent -
          not per return. This calculator does not ask about dependents, so it
          counts the filer only, and two for a joint return. Anyone with
          dependents gets a larger exemption than we show, which makes our
          figure conservative rather than flattering. The page says so.

       3. The exemption DISAPPEARS above a threshold. Same bulletin, verbatim:
          "The Illinois exemption allowance, Illinois Property Tax Credit, and
          the K-12 Education Expense Credit are not allowed if the taxpayer's
          adjusted gross income for the taxable year exceeds $500,000 for
          returns with a federal filing status of married filing jointly, or
          $250,000 for all other returns."
          Note "not allowed", not "reduced": it is a cliff, not a taper. Without
          deductionPhaseOut the calculator would hand a high earner an exemption
          Illinois does not give them, and would do it silently.

       4. Unemployment insurance - EMPLOYER only. ides.illinois.gov, "What Every
          Worker Should Know About Unemployment Insurance", read 2026-08-28,
          verbatim: "Benefits are financed by employer payroll taxes - not by
          any deductions from your wages."

       NOT VERIFIED, so the page claims nothing about it: whether any Illinois
       municipality levies its own income tax.
       ----------------------------------------------------------------------- */
    illinois: {
      name: "Illinois",
      abbr: "IL",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 2925,
          marriedJoint: 5850,          // two exemptions, filer and spouse
          headOfHousehold: 2925
        },
        deductionPhaseOut: {
          single: 250000,
          marriedJoint: 500000,
          headOfHousehold: 250000
        },
        brackets: {
          single:          [[Infinity, 0.0495]],
          marriedJoint:    [[Infinity, 0.0495]],
          headOfHousehold: [[Infinity, 0.0495]]
        }
      }
    },

    /* GEORGIE — la SEULE entree de ce fichier qui n'avait aucune source ecrite,
       trouve le 10/09/2026 en verifiant une citation que la page attribuait au
       DOR sans pouvoir la produire. Le taux etait juste ; la preuve manquait.

       Source, lue le 2026-09-10, HTTP 200 : Georgia Department of Revenue,
       « 2026 Employer's Tax Guide (updated June 2026) », PDF de 3 434 407
       octets. Verbatim, page 1 :
         « The income tax rate has been reduced from a flat rate of 5.19% to a
           flat rate of 4.99%. Note: Employers must continue to withhold at the
           rate of 5.19% before the effective date of the change and can begin
           withholding at the new rate of 4.99%, starting May 11, 2026. »

       ⚠️ A ECRIRE SUR LA PAGE UN JOUR : une fiche de paie georgienne de 2026
       melange DEUX taux. L'employeur retient 5,19 % jusqu'au 10 mai et peut
       passer a 4,99 % a partir du 11. Notre calculateur donne l'IMPOT DU de
       l'annee, a 4,99 %, ce qui reste juste — mais quelqu'un qui compare son
       cumul de janvier a mai avec cette page trouvera un ecart, et il aura
       raison. C'est le meme genre de fait que le 4,09 % / 3,99 % de la
       Caroline du Nord.

       Deduction standard 15 000 / 30 000 $ : deja en place depuis le 28/08,
       non re-verifiee ce jour. 🔎 A recouper sur le meme guide.
       ----------------------------------------------------------------------- */
    georgia: {
      name: "Georgia",
      abbr: "GA",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 15000,
          marriedJoint: 30000,
          headOfHousehold: 15000
        },
        brackets: {
          single:          [[Infinity, 0.0499]],
          marriedJoint:    [[Infinity, 0.0499]],
          headOfHousehold: [[Infinity, 0.0499]]
        }
      }
    },

    /* Pennsylvania — flat 3.07%, and the only state here that taxes a 401(k).
       Rate, source: PA Department of Revenue, REV-413 (I), "2026 Instructions
       for Estimating PA Personal Income Tax". Read 2026-08-28. The 2026
       worksheet says, in its own words, "2026 ESTIMATED TAX — Multiply Line 1
       by 3.07 percent (0.0307)". That is the state's own 2026 form, not a
       carried-over prior-year figure.

       No deduction and no exemption: Line 1 of that same worksheet is
       "expected PA-taxable income" and is multiplied by the rate directly.
       Pennsylvania taxes compensation from the first dollar. Low earners are
       relieved by the Special Tax Forgiveness Credit, which is a credit and
       not a deduction, so it cannot be modelled as one — it is explained on
       the page instead.

       taxesRetirementDeferrals: PA does NOT let a 401(k) contribution reduce
       state tax. Source, verbatim: PA Personal Income Tax Guide, "Gross
       Compensation", DSM-12 (08-2025), p.51 — contributions to a "401(k) Plan
       or 403(b) plan or other program on behalf of the employee ... are not
       excludable from the employee's Pennsylvania income." Read 2026-08-28.
       Without this flag the calculator would understate PA tax for every
       visitor who saves for retirement, which is precisely the class of quiet
       error this site exists to avoid. */
    pennsylvania: {
      name: "Pennsylvania",
      abbr: "PA",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: 0,
        taxesRetirementDeferrals: true,
        brackets: {
          single:          [[Infinity, 0.0307]],
          marriedJoint:    [[Infinity, 0.0307]],
          headOfHousehold: [[Infinity, 0.0307]]
        }
      },

      /* Unemployment Compensation, employee share. Source: PA Department of
         Labor & Industry, "Employee Withholding". Read 2026-08-28: the table
         gives 0.07% (.0007) for "2023 and thereafter", and the page states
         that employee contributions "are based on an individual's total
         (gross) wages and are not limited to the taxable wage base in effect
         for employer contributions" — so there is no cap. */
      employeePrograms: [
        { label: "PA Unemployment (0.07%)", rate: 0.0007, wageCap: null }
      ]
    },

    /* MICHIGAN.
       Source officielle : Michigan Department of Treasury, form 446
       (Rev. 10-25), "2026 Michigan Income Tax Withholding Guide". Lue le
       2026-08-29. Sa toute premiere ligne de donnees, verbatim :
       "Withholding Rate: 4.25%  Personal Exemption Amount: $5,900", et p.2 :
       "The withholding rate is 4.25 percent of compensation after deducting
       the personal and dependency exemption allowance."

       ⚠️ COMMENT CETTE SOURCE A ETE LUE. www.michigan.gov renvoie HTTP 403 a
       toute requete automatique — WebFetch, curl avec un User-Agent de
       navigateur, et Chrome pilote y echouent tous les trois (Akamai
       "Access Denied"). legislature.mi.gov bloque de meme (Check Point WAF).
       Le PDF officiel a donc ete lu dans l'instantane du 2026-01-15 conserve
       par la Wayback Machine :
       web.archive.org/web/20260115184933/https://www.michigan.gov/taxes/-/media/Project/Websites/taxes/Forms/SUW/TY2026/446_Withholding-Guide_2026.pdf
       C'est le fichier PDF de l'Etat lui-meme, 406 043 octets, pas la
       paraphrase d'un tiers. Le detour est note ici parce qu'il devra etre
       refait a chaque mise a jour du barème.

       La deduction est une EXONERATION PAR PERSONNE, pas un forfait : 5 900 $
       multiplies par le nombre d'exonerations declarees sur le MI-W4. Meme
       mecanique que l'Illinois, et modelisee de la meme facon :
       une exoneration pour un celibataire, deux pour un couple depose
       conjointement. Aucune suppression au-dela d'un seuil de revenu :
       le guide n'en mentionne aucune, et rien n'est ajoute sans source.

       Pas de taxesRetirementDeferrals : l'impot du Michigan part du revenu
       brut ajuste federal, dont un versement 401(k) est deja exclu. La
       Pennsylvanie reste le seul Etat du site a taxer ces versements.

       Pas d'employeePrograms : le guide 446 ne prevoit aucune retenue
       salariale autre que l'impot sur le revenu. L'assurance chomage du
       Michigan est payee par l'employeur.

       ⚠️ NON MODELISE, ET DIT SUR LA PAGE : environ deux douzaines de villes
       du Michigan levent leur propre impot. Detroit prend 2,4 % aux residents
       et 1,2 % aux non-residents, apres une exoneration de 600 $ par personne.
       Source : Michigan Department of Treasury, form 5469 (Rev. 05-25),
       "2026 City of Detroit Income Tax Withholding Guide", p.2, verbatim :
       "The City of Detroit income tax rate for residents is 2.4% (multiply by
       0.024). The City of Detroit income tax rate for nonresidents is 1.2%
       (multiply by 0.012)." Lue le 2026-08-29 par le meme detour Wayback.
       Comme pour Philadelphie, le calculateur ne modelise que la couche Etat
       et l'ecrit noir sur blanc. */
    /* -----------------------------------------------------------------------
       NORTH CAROLINA - ajoute le 2026-09-09. 13e Etat publie.

       LE TAUX. Deux sources officielles 2026, independantes l'une de l'autre.
       1. NCDOR, page « Tax Rate Schedules », lue le 2026-09-09 (HTTP 200),
          verbatim :
            « For Taxable Years beginning in 2025, the North Carolina
              individual income tax rate is 4.25% (0.0425). »
            « For Taxable Years after 2025, the North Carolina individual
              income tax rate is 3.99% (0.0399). »
          Suivi de : « Additional rate changes may apply to tax years beginning
          with 2027 based on certain rate reduction triggers », cf. Session
          Law 2023-134. Donc 3,99 % vaut pour 2026 ; 2027 n'est PAS acquis et
          la page ne doit rien en dire.
       2. Formulaire NC-30, « 2026 Income Tax Withholding Tables and
          Instructions for Employers », revision Web 11-25, telecharge le
          2026-09-09 depuis ncdor.gov (application/pdf, 570 759 octets),
          encadre « New for 2026 », verbatim :
            « As a result of Session Law 2023-134, the individual income tax
              rate for tax year 2026 will be 3.99%. »

       LA DEDUCTION STANDARD. Formulaire NC-4, « Employee's Withholding
       Allowance Certificate », revision Web 10-25 — donc la version en vigueur
       pour les paies 2026 — Part II, ligne 2, verbatim :
            « $12,750 if Single / $25,500 if Married Filing Jointly or
              Surviving Spouse / $12,750 if Married Filing Separately /
              $19,125 if Head of Household »
       Recoupe sur le NC-30 2026, feuilles « Annualized Method » : 12 750,00 $
       pour « Single Person, Married Person, or Surviving Spouse » et
       19 125,00 $ pour « Head of Household ».
       ⛔ La page NCDOR « NC Standard Deduction or NC Itemized Deductions »
       donne les memes montants mais s'annonce « for tax year 2025 » : elle ne
       peut PAS servir de source 2026. Ce sont le NC-4 et le NC-30 qui datent.
       Aucun supplement pour les 65 ans et plus ni pour les non-voyants, a la
       difference du federal (meme page NCDOR).

       ⛔ LE PIEGE PROPRE A LA CAROLINE DU NORD : LE TAUX RETENU N'EST PAS LE
       TAUX D'IMPOT. NC-30 2026, sous chaque feuille de calcul, verbatim :
         « The withholding calculations are based on the individual income tax
           rate of 3.99% plus 0.1%. This results in a withholding tax rate of
           4.09%. »
       L'employeur preleve donc 4,09 % la ou l'impot du sur l'annee est de
       3,99 %. Ce moteur calcule l'IMPOT (3,99 %), pas la retenue : le net
       affiche ici est donc legerement SUPERIEUR a celui d'une fiche de paie de
       Caroline du Nord, et l'ecart revient sous forme de remboursement. Cet
       ecart est explique sur la page, il n'est pas modelise dans le net —
       modeliser la retenue donnerait un « take-home » faux sur l'annee.

       LE PIEGE WASHINGTON, verifie et ecarte. Rien d'autre que l'impot sur le
       revenu ne sort d'une paie de Caroline du Nord au titre de l'Etat.
       N.C. Division of Employment Security, « Employer Tax FAQs »,
       https://www.des.nc.gov/need-help/faqs/employer-tax-faqs
       relue le 2026-09-10 (HTTP 200), verbatim EXACT :
         « Employers pay unemployment insurance taxes based on employers'
           payroll. Unemployment taxes are not deducted from employees'
           wages. »
       ⚠️ CORRIGE le 10/09/2026, deux erreurs dans la version precedente :
         - l'URL citee (page « Am I Required to Pay Taxes? ») rend aujourd'hui
           un HTTP 404 : la page a bouge ;
         - nous ecrivions « based on employer payrolls » ENTRE GUILLEMETS alors
           que la source dit « based on employers' payroll ». Des guillemets
           promettent le mot exact ; ils ne se paraphrasent pas.
       La phrase est dans un accordeon FERME de la page : `innerText` ne la voit
       pas, il faut lire le HTML rendu.
       Pas de PFML ni d'assurance dependance a la Washington : aucune n'existe
       en Caroline du Nord au 2026-09-09 — et cette absence est une absence de
       page, pas une preuve : la page dit ce que le calcul fait, pas ce que
       l'Etat ne fait pas.

       LE 401(k). L'impot de Caroline du Nord part du revenu brut ajuste
       FEDERAL. NCDOR, « Important Notice: Impact of Recently Enacted Laws on
       North Carolina Individual and Corporate Income Tax Returns », 23/07/2026
       mis a jour le 29/07/2026, verbatim : « For individuals, North Carolina
       taxable income starts with federal adjusted gross income (AGI). » Une
       cotisation 401(k) classique sort deja de l'AGI federal, donc elle reduit
       aussi l'impot d'Etat. C'est le comportement par defaut du moteur, et il
       est ici source plutot que suppose.

       NON VERIFIE, donc la page n'en dit RIEN : l'existence ou non d'un impot
       sur le revenu leve par une ville ou un comte de Caroline du Nord.
       Aucune source lue dans un sens ou dans l'autre le 2026-09-09.

       NON MODELISE, donc explique sur la page : la « child deduction » de
       N.C. Gen. Stat. 105-153.5(a1), qui depend du nombre d'enfants et du
       revenu, et la deduction itemisee — la Caroline du Nord n'accepte que
       les interets d'emprunt immobilier, la taxe fonciere, les dons, les frais
       medicaux et, depuis la Session Law 2026-41, les pertes de jeu.
       ----------------------------------------------------------------------- */
    "north-carolina": {
      name: "North Carolina",
      abbr: "NC",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 12750,
          marriedJoint: 25500,
          headOfHousehold: 19125
        },
        brackets: {
          single:          [[Infinity, 0.0399]],
          marriedJoint:    [[Infinity, 0.0399]],
          headOfHousehold: [[Infinity, 0.0399]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       NEBRASKA - ajoute le 2026-09-09. 14e Etat publie.

       LA SOURCE, une seule et elle porte tout : formulaire 1040N-ES,
       « Nebraska Individual Estimated Income Tax Payment Vouchers », millesime
       2026, telecharge le 2026-09-09 depuis revenue.nebraska.gov
       (application/pdf, 611 808 octets, HTTP 200). C'est le document que le
       contribuable utilise pour estimer son impot 2026 : il porte donc le
       bareme 2026 ET la deduction standard 2026, la ou le livret du 1040N
       n'existera qu'en 2027.

       BAREME, page 6, « 2026 Nebraska Estimated Income Tax Rate Schedule »,
       verbatim pour le celibataire :
         « 2.46% of the income » jusqu'a 4 130 $
         « $101.60 + 3.51% of the excess over $4,130 » jusqu'a 24 760 $
         « $825.71 + 4.55% of the excess over $24,760 » jusqu'a 39 900 $
         « $1,514.58 + 4.55% of the excess over $39,900 » au-dela.
       Marie declarant conjointement : 8 250 / 49 530 / 79 800.
       Chef de famille : 7 700 / 39 620 / 59 160.

       ⚠️ POURQUOI TROIS TAUX ET NON QUATRE. Le Nebraska imprime QUATRE
       tranches, mais les deux dernieres portent le meme taux. Le formulaire le
       dit lui-meme, verbatim : « The tax year 2026 individual income tax rates
       for the third and fourth brackets are at the same rate of 4.55% per
       Neb. Rev. Stat. § 77-2715.03(2)(c)(v). » Une quatrieme bande a 4,55 %
       apres une troisieme a 4,55 % ne change aucun resultat ; on ecrit trois
       bandes et on explique la quatrieme sur la page. Ne pas « corriger » ceci
       en rajoutant une bande : ce serait du bruit, pas de la fidelite.

       LA BAISSE. Meme document DOR, « Nebraska Tax Rate Chronologies,
       Table 1 », revision 2-2026, lue le 2026-09-09 : au 1er janvier 2025 les
       quatre taux etaient 2,46 / 3,51 / 5,01 / 5,20 ; au 1er janvier 2026 ils
       sont 2,46 / 3,51 / 4,55 / 4,55. Le taux le plus haut perd 0,65 point en
       un an — contre 0,26 point en Caroline du Nord sur la meme annee.

       DEDUCTION STANDARD 2026, 1040N-ES page 4, ligne 5, verbatim :
         « Single $8,850; Married, Filing Jointly $17,700; Head of Household
           $12,950; Married, Filing Separately $8,850 ».

       LE CREDIT PERSONNEL — ET C'EST UN CREDIT, PAS UNE DEDUCTION. Meme
       formulaire, page 6, verbatim : « Include $176 for each Nebraska personal
       exemption allowed on line 14 ». Il se retranche de l'IMPOT, pas du
       revenu, donc il vaut 176 $ pour tout le monde — la meme somme pour un
       salaire de 30 000 $ que pour un salaire de 300 000 $. Le traiter comme
       une deduction donnerait un resultat faux a tous les niveaux de revenu.
       C'est le meme mecanisme que l'Utah, a une difference pres : le credit de
       l'Utah s'efface avec le revenu, celui du Nebraska non. La chronologie
       DOR le dit : la degressivite du credit est « Not Applicable beginning in
       2018 ». D'ou phaseOutStart a l'infini et phaseOutRate a zero — ce n'est
       pas un contournement, c'est la loi.
       Convention identique aux autres Etats a exoneration par personne :
       une part pour un celibataire, deux pour un couple.

       LES TAUX DE RETENUE, QUI NE SONT PAS LES TAUX D'IMPOT. « 2026 Nebraska
       Circular EN », Rev. 11-2025 (PDF, 519 436 octets, meme hote, lu le
       09/09/2026), page 12, « Percentage Method Tables (For Wages Paid on or
       After January 1, 2026) », TABLE 1 colonne SINGLE : 2,26 % / 3,22 % /
       4,21 % / 4,35 % / 4,48 % / 4,60 %, appliques apres soustraction de la
       valeur de l'allocation de retenue. Six taux, la ou l'impot en a trois.
       ⛔ NE JAMAIS s'en servir pour calculer un net : ce sont des instructions
       aux employeurs, pas le bareme. Ils sont cites sur la page, avec leur
       page d'origine, uniquement pour expliquer pourquoi une fiche de paie du
       Nebraska ne tombe pas sur le meme chiffre que ce calculateur.

       ⛔ CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI.
       Je n'ai PAS pu verifier qui paie l'assurance chomage au Nebraska.
       dol.nebraska.gov et nebraskalegislature.gov refusent la connexion depuis
       cette machine (ECONNREFUSED sur 164.119.176.91 et 164.119.161.105 — tout
       le reseau de l'Etat, alors que revenue.nebraska.gov repond 200). Deux
       methodes, deux echecs : on s'arrete la. La page dit donc ce que le
       calcul FAIT, et ne pretend pas dresser la liste de ce qui ne sort pas
       d'une fiche de paie du Nebraska. Meme regle que la Georgie.
       Idem pour un eventuel impot municipal : aucune source lue.
       ----------------------------------------------------------------------- */
    nebraska: {
      name: "Nebraska",
      abbr: "NE",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 8850,
          marriedJoint: 17700,
          headOfHousehold: 12950
        },
        brackets: {
          single:          [[4130, 0.0246], [24760, 0.0351], [Infinity, 0.0455]],
          marriedJoint:    [[8250, 0.0246], [49530, 0.0351], [Infinity, 0.0455]],
          headOfHousehold: [[7700, 0.0246], [39620, 0.0351], [Infinity, 0.0455]]
        },
        taxCredit: {
          base:          { single: 176, marriedJoint: 352, headOfHousehold: 176 },
          phaseOutStart: { single: Infinity, marriedJoint: Infinity, headOfHousehold: Infinity },
          phaseOutRate:  0
        }
      }
    },

    michigan: {
      name: "Michigan",
      abbr: "MI",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 5900,
          marriedJoint: 11800,         // deux exonerations, le declarant et le conjoint
          headOfHousehold: 5900
        },
        brackets: {
          single:          [[Infinity, 0.0425]],
          marriedJoint:    [[Infinity, 0.0425]],
          headOfHousehold: [[Infinity, 0.0425]]
        }
      }
    },

    /* UTAH — taux 2026 verifie sur DEUX sources officielles independantes le
       2026-09-02, parce que la premiere page consultee etait perimee.

       1. Utah Code Section 59-10-104, lu sur le.utah.gov, verbatim :
          « (a) the resident individual's state taxable income for that taxable
          year; and (b) 4.45%. » — suivi de « Amended by Chapter 250, 2026
          General Session ». C'est la loi elle-meme, dans sa version 2026.
       2. Utah State Tax Commission, Publication 14, « Withholding Tax Guide »,
          Rev. 4/26, en-tete verbatim : « The income tax withholding tables in
          this revision are effective for pay periods beginning on or after
          June 1, 2026 ». Chaque schedule dit « Multiply line 1 by .0445
          (4.45%) ».

       ⚠️ CE QUI A FAILLI PASSER : incometax.utah.gov/paying/tax-rates affichait
       encore, le 2026-09-02, « January 1, 2025 – current: 4.5% or .045 ».
       Cette page est perimee ; la loi et le guide de retenue disent 4,45 %.
       Un taux lu sur une seule page d'agence aurait ete faux.

       ⚠️ Le lien officiel du Pub 14 (files.tax.utah.gov/tax/forms/pubs/pub-14.pdf)
       repondait HTTP 404 le 2026-09-02, y compris depuis la page qui le publie.
       Le PDF a donc ete lu dans l'instantane de l'Internet Archive du
       2026-07-16 : web.archive.org/web/20260716180416/https://files.tax.utah.gov/tax/forms/pubs/pub-14.pdf
       (meme detour que pour le Michigan).

       L'UTAH NE DEDUIT RIEN — IL CREDITE. Il n'y a ni deduction standard ni
       exoneration personnelle : l'impot est 4,45 % du salaire entier, duquel on
       retranche un credit qui s'efface. Publication 14, Schedule 7 (ANNUAL),
       verbatim, colonne Single :
         « 2. Multiply line 1 by .0445 (4.45%) »
         « 3. Base allowance  485 »
         « 4. Line 1 minus $9,348 (not less than 0) »
         « 5. Multiply line 4 by .013 (1.3%) »
         « 6. Line 3 minus line 5 (not less than 0) »
         « 7. Withholding tax — line 2 minus line 6 (not less than 0) »
       Colonne Married : allocation de base 970, seuil 18 696 $ — les deux
       exactement le double du celibataire, comme a chaque periode de paie.

       ⚠️ HEAD OF HOUSEHOLD : la Publication 14 ne connait que deux colonnes,
       Single et Married. Le chef de famille est donc calcule sur la colonne
       Single, qui est ce que l'employeur retiendrait. C'est une hypothese
       assumee, ecrite sur la page — la declaration annuelle TC-40 lui accorde
       un seuil plus favorable, non publie pour 2026 a ce jour.

       Pas d'employeePrograms : le Pub 14 ne prevoit aucune retenue salariale
       autre que l'impot sur le revenu. */
    utah: {
      name: "Utah",
      abbr: "UT",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: 0,
        brackets: {
          single:          [[Infinity, 0.0445]],
          marriedJoint:    [[Infinity, 0.0445]],
          headOfHousehold: [[Infinity, 0.0445]]
        },
        taxCredit: {
          base:          { single: 485,  marriedJoint: 970,   headOfHousehold: 485 },
          phaseOutStart: { single: 9348, marriedJoint: 18696, headOfHousehold: 9348 },
          phaseOutRate:  0.013
        }
      }
    },

    /* OHIO — l'Etat le plus difficile a sourcer du fichier, et celui qui a
       oblige le moteur a apprendre deux mecanismes nouveaux.

       ⚠️ CE QUI NE MARCHE PAS, pour ne pas le refaire :
       - tax.ohio.gov/individual/resources/annual-tax-rates repond bien HTTP 200
         mais dit, verbatim, le 2026-09-02 : « The following are the Ohio
         individual income tax brackets for 2005 through 2025. » Le fisc de
         l'Ohio NE PUBLIE PAS 2026 sur cette page.
       - codes.ohio.gov : ERR_CONNECTION_TIMED_OUT au navigateur pilote,
         ECONNREFUSED a WebFetch. legislature.ohio.gov : ECONNREFUSED.

       ⚠️ CE QUI MARCHE :
       - la LOI, dans l'instantane Wayback du 2026-08-04 de codes.ohio.gov ;
       - le CDN de l'Etat, dam.assets.ohio.gov, qui repond HTTP 200 la ou
         tax.ohio.gov ne sert rien. C'est de la que viennent les tables de
         retenue 2026 et la notice IT 1040.

       LE BAREME. Source : Ohio Revised Code 5747.02(A)(3), lu le 2026-09-02
       dans web.archive.org/web/20260804141655/https://codes.ohio.gov/ohio-revised-code/section-5747.02
       Verbatim, sur le revenu hors activite professionnelle, apres exonerations :
         « If the balance thus obtained is equal to or less than twenty-six
           thousand fifty dollars, no tax shall be imposed on that balance. »
         « (c) For taxable years beginning in 2026 and thereafter, $332.00 plus
           2.75% of the amount in excess of $26,050. »

       ⚠️ CE N'EST PAS UNE PENTE, C'EST UNE MARCHE. A 26 050 $ d'imposable
       l'impot est nul ; a 26 051 $ il est de 332,03 $. Le saut est dans la loi,
       pas dans notre lecture : la meme structure vaut pour 2024 (360,69 $) et
       2025 (342,00 $), toutes deux lues sur la meme page. D'ou la cle "notch".

       L'EXONERATION. Source : Ohio Revised Code 5747.025, « Effective:
       September 30, 2025 », « Latest Legislation: House Bill 96 », lue dans
       l'instantane Wayback du 2026-06-09. Elle vaut PAR PERSONNE — le
       declarant, le conjoint, et chaque personne a charge — et son MONTANT
       depend du revenu. D'ou la cle "deductionByIncome", que le moteur ne
       savait pas faire avant l'Ohio.

       ⚠️ LE CHIFFRE 2026 N'EST PAS PUBLIE, ET ON ECRIT POURQUOI ON PREND
       CELUI-LA. La loi fixe un socle (2 350 / 2 100 / 1 850 $) puis ordonne,
       division (C), une indexation annuelle « in August of each year » sur le
       deflateur du PIB, arrondie au multiple de 50 $ superieur — avec cette
       phrase qui decide tout, verbatim : « The commissioner shall not make a
       new adjustment in any calendar year in which the amount resulting from
       the adjustment would be less than the amount resulting from the
       adjustment in the preceding calendar year. » L'exoneration ne peut donc
       PAS baisser.
       Les montants 2025 REELLEMENT appliques sont lus verbatim dans la notice
       officielle « 2025 Ohio IT 1040 », p.17, servie par dam.assets.ohio.gov :
         « $40,000 or less  $2,400 » · « $40,001 - $80,000  $2,150 » ·
         « $80,001 - $749,999  $1,900 » · « $750,000 or greater  $0 ».
       On retient ces montants pour 2026. C'est le PLANCHER que la loi garantit.
       Erreur maximale possible : un cran d'indexation, soit 50 $ d'exoneration,
       soit 1,38 $ d'impot. C'est ecrit sur la page.

       ⚠️ LE PLAFOND CHANGE EN 2026, LUI, ET IL EST DANS LA LOI : l'exoneration
       n'est accordee que si le revenu modifie est inferieur a « seven hundred
       fifty thousand dollars for taxable years beginning in 2025 or FIVE
       HUNDRED THOUSAND dollars for taxable years beginning in 2026 or
       thereafter ». D'ou deductionPhaseOut a 500 000 et non 750 000.

       Pas d'employeePrograms : aucune retenue salariale autre que l'impot sur
       le revenu dans les tables de retenue 2026.

       ⚠️ NON MODELISE, ET DIT SUR LA PAGE : l'impot de district scolaire.
       La notice IT 1040 en donne le taux district par district, verbatim :
       « The tax rate for each district is listed as a four-digit decimal.
       Districts with a "T" use the traditional tax base. Districts with an "E"
       use the "earned income" tax base. » Les taux lus vont de .0025 a .0200,
       soit 0,25 % a 2 %. Comme Detroit pour le Michigan, le calculateur ne
       modelise que la couche Etat et l'ecrit noir sur blanc.

       ⚠️ A SAVOIR AUSSI, ET C'EST L'ANGLE DE LA PAGE : la RETENUE de l'Ohio
       n'est pas l'IMPOT. Les tables 2026 (dam.assets.ohio.gov,
       « Withholding Tables (Effective August 1, 2026) ») disent, verbatim :
       « If the wages exceed $1,923, use the last row of the table plus 3.400%
       of the excess over $1,923. » 3,4 % de retenue pour un impot a 2,75 % :
       l'employeur prend plus que le du. Notre calculateur donne l'IMPOT
       REELLEMENT DU, comme pour tous les autres Etats. */
    ohio: {
      name: "Ohio",
      abbr: "OH",
      incomeTax: {
        hasIncomeTax: true,
        deductionByIncome: [
          { upTo: 40000, amounts: { single: 2400, marriedJoint: 4800, headOfHousehold: 2400 } },
          { upTo: 80000, amounts: { single: 2150, marriedJoint: 4300, headOfHousehold: 2150 } },
          { upTo: null,  amounts: { single: 1900, marriedJoint: 3800, headOfHousehold: 1900 } }
        ],
        deductionPhaseOut: {
          single: 500000, marriedJoint: 500000, headOfHousehold: 500000
        },
        brackets: {
          single:          [[26050, 0], [Infinity, 0.0275]],
          marriedJoint:    [[26050, 0], [Infinity, 0.0275]],
          headOfHousehold: [[26050, 0], [Infinity, 0.0275]]
        },
        notch: { over: 26050, add: 332 }
      }
    },

    /* HAWAII — 12 tranches, de 1,40 % a 11,00 %. Le bareme le plus etendu du site.
       SOURCE, lue verbatim le 05/09/2026 dans le TEXTE DE LOI, pas dans un resume :
       Act 46, Session Laws of Hawaii 2024, telecharge sur
       https://data.capitol.hawaii.gov/sessions/sessionlaws/Years/SLH2024/SLH2024_Act46.pdf
       (tax.hawaii.gov et files.hawaii.gov repondent 403 a un agent non navigateur ;
       curl avec un User-Agent Chrome passe en HTTP 200. Le 403 n'est pas une absence
       de source — c'est un blocage d'agent. Meme piege que tn.gov.)

       DEDUCTION STANDARD : Act 46 section (F), « For taxable years beginning after
       December 31, 2025 » — donc l'annee fiscale 2026 : 8 000 $ celibataire,
       16 000 $ joint, 12 000 $ chef de famille.
       ⚠️ Plusieurs resumes en ligne annoncent 4 400 $ : c'est le bareme 2024-2025.

       TRANCHES : Act 46 section 2, « any taxable year beginning after December 31,
       2024 » — ce bloc couvre 2025 ET 2026. La loi contient AUSSI un bloc
       « after December 31, 2026 » avec d'autres seuils : il prend effet en 2027,
       ne pas le confondre.
       HB 2306 (session 2026) releve les trois tranches hautes, mais « for taxable
       years beginning after 12/31/2026 » : sans effet sur 2026.

       CONTROLE DE COHERENCE fait a la main sur les trois baremes :
         - les montants cumules de la loi se recalculent ligne a ligne
           (9 600 x 1,4 % = 134 ; 134 + 4 800 x 3,2 % = 288 ; +4 800 x 5,5 % = 552...) ;
         - marriedJoint = EXACTEMENT 2 x single sur les 11 seuils ;
         - headOfHousehold = EXACTEMENT 1,5 x single sur les 11 seuils.

       ECART D'ARRONDI CONNU, mesure le 05/09/2026 — a ne pas corriger en silence :
       la loi ecrit ses points de depart cumules ARRONDIS AU DOLLAR INFERIEUR.
       Exemple : 9 600 x 1,4 % = 134,40 $, mais la loi ecrit « $134.00 plus 3.20% ».
       Notre moteur additionne tranche par tranche, sans arrondir en chemin. Sur un
       revenu imposable de 50 000 $ il donne 2 691,20 $ la ou la formule de la loi
       donne 2 691,00 $ : 0,20 $ d'ecart, soit 0,0004 %, TOUJOURS en defaveur du
       contribuable (nous annonçons un peu plus d'impot, donc un peu moins de net).
       Nous gardons le calcul par tranches, identique a celui des neuf autres Etats,
       plutot que d'ecrire une exception pour Hawaii. L'ecart est annonce sur la page
       et sur /methodology/. Si un visiteur compare au centime avec le formulaire N-11,
       c'est cette difference qu'il verra, et elle est voulue.

       ⛔ CE QUE NOUS NE DEDUISONS PAS, ET POURQUOI — a dire sur la page :
       Hawaii a deux prelevements salariaux possibles, tous deux FACULTATIFS pour
       l'employeur. Source : State of Hawaii, DLIR, Disability Compensation Division,
       « 2026 Maximum Weekly Wage Base and Maximum Weekly Benefit Amount »,
       10 decembre 2025, https://labor.hawaii.gov/dcd/files/2025/12/2026-Maximum-Weekly-Wage-Base.pdf
         - TDI (Temporary Disability Insurance), note 3 verbatim : « An employer MAY
           withhold TDI contributions of one-half the premium cost but not more than
           .5% of the employee's weekly wage, with the maximum not to exceed $7.50. »
           Base hebdomadaire maximale 2026 : 1 500,21 $. Plafond : 7,50 $/semaine,
           soit 390 $/an.
         - PHC (Prepaid Health Care), note 4 verbatim : « An employer MAY withhold
           one-half the PHC premium cost but not to exceed 1.5% of an employee's wages. »
       Le montant reel depend du cout de la prime ET du choix de l'employeur : il est
       INCONNAISSABLE depuis un salaire brut. Contrairement au PFML de Washington, qui
       est obligatoire et a taux fixe, on ne peut pas le modeliser sans inventer.
       On ne deduit donc rien, et la page annonce le plafond legal explicitement. */
    hawaii: {
      name: "Hawaii",
      abbr: "HI",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: { single: 8000, marriedJoint: 16000, headOfHousehold: 12000 },
        brackets: {
          single: [
            [9600, 0.014], [14400, 0.032], [19200, 0.055], [24000, 0.064],
            [36000, 0.068], [48000, 0.072], [125000, 0.076], [175000, 0.079],
            [225000, 0.0825], [275000, 0.09], [325000, 0.10], [Infinity, 0.11]
          ],
          marriedJoint: [
            [19200, 0.014], [28800, 0.032], [38400, 0.055], [48000, 0.064],
            [72000, 0.068], [96000, 0.072], [250000, 0.076], [350000, 0.079],
            [450000, 0.0825], [550000, 0.09], [650000, 0.10], [Infinity, 0.11]
          ],
          headOfHousehold: [
            [14400, 0.014], [21600, 0.032], [28800, 0.055], [36000, 0.064],
            [54000, 0.068], [72000, 0.072], [187500, 0.076], [262500, 0.079],
            [337500, 0.0825], [412500, 0.09], [487500, 0.10], [Infinity, 0.11]
          ]
        }
      },
      /* Declare pour la page, JAMAIS soustrait du net. Voir le commentaire ci-dessus. */
      optionalWithholding: {
        tdi: { maxEmployeeRate: 0.005, maxWeeklyWageBase: 1500.21, maxWeekly: 7.50 },
        prepaidHealthCare: { maxEmployeeRate: 0.015 }
      }
    },

    /* -------------------------------------------------------------------
       MONTANA - tax year 2026, lu sur DEUX sources officielles independantes
       le 2026-09-10 : la table de retenue de l'employeur et la loi elle-meme.
       Elles tombent sur les memes nombres au dollar pres ; le detail du
       recoupement est plus bas.

       1. « Montana Employer and Information Agent Guide with Montana
          Withholding Tax Tables - 2026 », Department of Revenue,
          https://revenuefiles.mt.gov/files/Forms/Montana_Employer_and_Information_Agent_Guide_with_Tax_Tables.pdf
          (application/pdf, 985 472 octets, HTTP 200, lu le 2026-09-10). La
          page qui le publie ecrit : « For use beginning January 1, 2026 ».

          Montana Withholding Tax Formula, W = A + ( B x ( G - C ) ), periode
          ANNUELLE, verbatim :
            Single / MFS / Married both working : 0 % jusqu'a 16 100 $ ;
              4,7 % de 16 100 a 63 600 ; puis A = 2 233 $ + 5,65 % au-dela.
            Married Filing Jointly : 0 % jusqu'a 32 200 $ ; 4,7 % jusqu'a
              127 200 ; puis A = 4 465 $ + 5,65 %.
            Head of Household : 0 % jusqu'a 24 150 $ ; 4,7 % jusqu'a 95 400 ;
              puis A = 3 349 $ + 5,65 %.

       2. Montana Code Annotated 15-30-2103, « Rate of tax », lu sur
          archive.legmt.gov le 2026-09-10, verbatim, version (Temporary) :
            « on the first $47,500 of Montana taxable income or any part of
              that income, 4.7% » (celibataire et marie separement)
            « on the first $95,000 ... 4.7% » (marie conjoint)
            « on the first $71,250 ... 4.7% » (chef de famille)
            « on any Montana taxable income in excess of ... 5.65% ».

       LE RECOUPEMENT, ET POURQUOI IL VERROUILLE LES CHIFFRES. La table de
       retenue et la loi ne parlent pas de la meme grandeur : la premiere part
       du SALAIRE BRUT, la seconde du REVENU IMPOSABLE. L'ecart entre les deux
       est exactement la deduction :
         63 600 - 16 100 = 47 500  -> le seuil de la loi, au dollar pres
         127 200 - 32 200 = 95 000 -> idem
         95 400 - 24 150 = 71 250  -> idem
       et le « A » imprime par la table est le produit :
         4,7 % x 47 500 = 2 232,50 -> 2 233 $ imprime
         4,7 % x 95 000 = 4 465,00 -> 4 465 $ imprime
         4,7 % x 71 250 = 3 348,75 -> 3 349 $ imprime
       Si un seul des six nombres avait ete mal recopie, l'egalite tomberait.

       LA DEDUCTION DU MONTANA EST LA DEDUCTION FEDERALE. 16 100 / 32 200 /
       24 150 sont, au dollar pres, les trois deductions standard federales
       2026 declarees en tete de ce fichier (Rev. Proc. 2025-32). Ce n'est pas
       une coincidence : MCA 15-30-2120 s'intitule « Adjustments to federal
       taxable income to determine Montana taxable income » et commence par
       « The items in subsection (2) are added to and the items in subsection
       (3) are subtracted from federal taxable income to determine Montana
       taxable income ». Le Montana part du revenu imposable FEDERAL - donc
       apres deduction federale - la ou la Caroline du Nord ou le Nebraska
       ecrivent leur propre deduction. Consequence pour le moteur : il n'y a
       pas de deduction d'Etat a inventer, on reprend la federale.

       ⚠️ NE PAS METTRE A JOUR CES TROIS MONTANTS SANS METTRE A JOUR
       federal.standardDeduction EN MEME TEMPS : ce sont les memes nombres,
       pour la meme raison.

       ⚠️ 2026 EST UNE ANNEE DE TRANSITION, ECRITE COMME TELLE DANS LA LOI. Le
       texte ci-dessus porte la mention « (Temporary) ... Terminates
       December 31, 2026 », et la meme section publie deja sa version
       « (Effective January 1, 2027) » : 4,7 % sur les premiers 65 000 $
       (celibataire), 130 000 $ (conjoint), 97 500 $ (chef de famille), puis
       5,4 %. Le guide de l'employeur le dit aussi : « In 2025, the rate was
       5.9%. This rate decreases in 2026 to 5.65% and in 2027 to 5.4%. »
       Cette ligne est a rejouer en janvier 2027, pas a deviner.

       2025, POUR LA COMPARAISON ECRITE SUR LA PAGE : revenue.mt.gov
       « 2025 Montana Tax Tables and Deductions », lu le 2026-09-10 : 4,7 %
       sur les premiers 21 100 $ (celibataire), 42 200 $ (conjoint),
       31 700 $ (chef de famille), puis 5,9 %.

       401(k) : guide de l'employeur, section « Withholding from Pensions,
       Annuities, Deferred Compensations, and IRAs », verbatim : « Employee
       contributions to qualifying annuity contracts ... are exempt from
       withholding requirements to the extent that the contributions are not
       included in the employee's adjusted gross income for federal income tax
       purposes. » Le versement 401(k) sort donc de la base d'Etat : pas de
       taxesRetirementDeferrals ici (contrairement a la Pennsylvanie).

       ASSURANCE CHOMAGE - le piege Washington, ecarte sur la source. Montana
       Employer Handbook, https://uid.dli.mt.gov/employer-handbook.pdf
       (858 745 octets, HTTP 200, lu le 2026-09-10), verbatim : « It is
       against the law to deduct UI taxes from your employees' wages. »
       Rien a soustraire du net.

       ⛔ CE QUE CETTE ENTREE NE DIT PAS : rien sur un impot municipal. Le
       guide de retenue ne decrit qu'une seule retenue d'Etat et n'en mentionne
       aucune autre, mais aucune source ne l'affirme en toutes lettres, donc
       la page ne l'affirme pas non plus.
       ------------------------------------------------------------------- */
    montana: {
      name: "Montana",
      abbr: "MT",
      incomeTax: {
        hasIncomeTax: true,
        /* Identiques a federal.standardDeduction, et pour cause : MCA
           15-30-2120 part du revenu imposable federal. Voir le commentaire. */
        standardDeduction: {
          single: 16100,
          marriedJoint: 32200,
          headOfHousehold: 24150
        },
        brackets: {
          single:          [[47500, 0.047], [Infinity, 0.0565]],
          marriedJoint:    [[95000, 0.047], [Infinity, 0.0565]],
          headOfHousehold: [[71250, 0.047], [Infinity, 0.0565]]
        }
      }
    },

    /* ------------------------------------------------------------------ *
       WISCONSIN, lu le 2026-09-11.

       BAREME ET DEDUCTION STANDARD 2026 - source primaire : Wisconsin
       Department of Revenue, "2026 Form 1-ES Instructions" (D-101A, R. 1-26),
       https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf
       (262 557 octets, HTTP 200, lu le 2026-09-11). Page finale, verbatim :
       « This document provides statements or interpretations of the
       following laws and regulations enacted as of January 16, 2026: ch. 71,
       Wis. Stats. » Le document donne, mot pour mot, les « 2026 Tax Rate
       Schedules for Full-Year Residents » et le « 2026 Standard Deduction ».

       ⚠️ docs.legis.wisconsin.gov (le texte code des articles 71.06 et
       71.05(22)) a refuse la connexion sur TROIS methodes distinctes le
       2026-09-11 (curl direct, curl avec un autre agent utilisateur, l'outil
       WebFetch - ECONNREFUSED a chaque fois). Regle des 3 tentatives
       appliquee : le Form 1-ES ci-dessus, document officiel du DOR qui cite
       explicitement le chapitre 71 des Wis. Stats. et la date de la loi
       qu'il interprete, sert de source primaire a sa place - le meme
       traitement que le Nevada le 10/09 (SANS_LIEN sur le texte legal brut,
       source d'agence retenue a la place).

       ⚠️ RECOUPEMENT : la page "DOR Tax Rates" generale,
       https://www.revenue.wi.gov/Pages/FAQS/pcs-taxrates.aspx (82 844
       octets, HTTP 200, lu le 2026-09-11), N'A PAS ENCORE ETE MISE A JOUR
       POUR 2026 : elle affiche toujours le bareme "2025 tax is" (seuils
       14 680 $ / 50 480 $ / 323 290 $, celibataire), sans colonne 2026. Ne
       pas confondre les deux pages : celle-ci est perimee au jour de la
       lecture, le Form 1-ES est la seule des deux a porter le mot "2026"
       sur ses baremes.

       TRANCHES 2026, Schedule A (celibataire, chef de famille, successions) :
       3,5 % jusqu'a 15 110 $, puis 4,4 % jusqu'a 51 950 $, puis 5,3 %
       jusqu'a 332 720 $, puis 7,65 %. Schedule B (declaration commune) :
       3,5 % jusqu'a 20 150 $, puis 4,4 % jusqu'a 69 260 $, puis 5,3 %
       jusqu'a 443 630 $, puis 7,65 %.
       RECOUPEMENT qui verrouille les tranches contre les constantes
       imprimees : 15 110 x 3,5 % = 528,85 $ (imprime 528,85) ;
       + (51 950 - 15 110) x 4,4 % = 1 620,96 $ -> 2 149,81 $ (imprime
       2 149,81) ; + (332 720 - 51 950) x 5,3 % = 14 880,81 $ -> 17 030,62 $
       (imprime 17 030,62). Meme verification en commun : 20 150 x 3,5 % =
       705,25 $ ; + (69 260 - 20 150) x 4,4 % = 2 160,84 $ -> 2 866,09 $ ;
       + (443 630 - 69 260) x 5,3 % = 19 841,61 $ -> 22 707,70 $. Les six
       constantes imprimees tombent juste : si un seuil avait ete recopie de
       travers, l'egalite casserait.

       DEDUCTION STANDARD 2026 - UNE PENTE, PAS UNE MARCHE. C'est l'angle
       propre de cette page : le Wisconsin ne publie ni un montant fixe par
       foyer, ni une table par paliers d'Etats, mais une FORMULE LINEAIRE qui
       diminue dollar pour dollar avec le revenu, jusqu'a atteindre zero.
       Verbatim, celibataire : « If Wisconsin income is: over $0 but not over
       $20,119, the 2026 Standard Deduction is: $13,960 » puis « over $20,119
       but not over $136,453, the 2026 Standard Deduction is: $13,960 less
       12% of the amount over $20,120 » puis « over $136,453: $0 ».
       Declaration commune : 25 840 $ jusqu'a 29 039 $ de revenu, puis
       « 25,840 less 19.778% of the amount over $29,040 » jusqu'a 159 690 $,
       puis 0 $. Chef de famille : 18 030 $ jusqu'a 20 119 $, puis
       « 18,030 less 22.515% of the amount over $20,120 » jusqu'a 58 827 $,
       PUIS UN DEUXIEME SEGMENT, « 13,960 less 12% of the amount over
       $20,120 » jusqu'a 136 453 $, puis 0 $ - deux pentes differentes bout a
       bout, imprimees ainsi par le DOR, pas une erreur de recopie (les deux
       formules donnent une valeur a moins d'un dollar l'une de l'autre au
       point de jonction, 58 827 $ : 9 315,12 $ contre 9 315,16 $ calcule
       ici).

       EXEMPTION PERSONNELLE 2026, en plus de la deduction ci-dessus,
       verbatim (meme document, note de bas de page du tableau) : « Your
       exemptions are $700 for yourself, $700 for your spouse if filing a
       joint return, and $700 for each dependent. Add $250 to the total if
       you are 65 years of age or over... » Notre calculateur ne demande pas
       de personnes a charge ni d'age, donc seule la part de 700 $ par
       declarant (et par conjoint en commun) est modelisee : single 700,
       marriedJoint 1 400, headOfHousehold 700.

       RETENUE A LA SOURCE (mecanique, pas les chiffres) - Wisconsin
       Department of Revenue, Publication W-166 "Withholding Tax Guide",
       revision "(1/26)", https://www.revenue.wi.gov/DOR%20Publications/pb166.pdf
       (2 128 837 octets, HTTP 200, lu le 2026-09-11). Verbatim : « Federal
       Form W-4 cannot be used for Wisconsin withholding tax purposes »
       (formulaire WT-4 propre a l'Etat). ⚠️ Ce guide porte encore la mention
       "Effective for Withholding Periods Beginning on or After January 1,
       2022" et sa rubrique "Important News" dit "Current withholding rates
       continue for 2025" (non mise a jour pour 2026) : ses propres montants
       de methode alternative (6 702 $ / 17 780 $ celibataire) ne sont donc
       PAS repris ici, seule sa mecanique (WT-4, formulaire d'exemption) est
       citee. Les montants imposables viennent du Form 1-ES 2026 ci-dessus.

       ASSURANCE CHOMAGE - employeur seul. Wisconsin DWD, "UI Employer
       Handbook" (UCB-201-P, R. 03/16/2026),
       https://dwd.wisconsin.gov/ui201/pdf/ucb201print.pdf (1 315 282
       octets, HTTP 200, lu le 2026-09-11), verbatim : « The program is
       financed solely through employer contributions (taxes). » Rien a
       soustraire du net.

       ⛔ CE QUE CETTE ENTREE NE DIT PAS : rien sur un impot municipal ou de
       comte - aucune source lue n'en mentionne, en bien ou en mal ; rien sur
       le Married Filing Separately (notre calculateur ne propose pas ce
       statut) ; rien sur l'age 65+ ou les personnes a charge (le
       calculateur ne les demande pas).
       ------------------------------------------------------------------- */
    wisconsin: {
      name: "Wisconsin",
      abbr: "WI",
      incomeTax: {
        hasIncomeTax: true,
        slidingDeduction: {
          single: [
            { upTo: 20119, amount: 13960 },
            { upTo: 136453, from: 20120, base: 13960, rate: 0.12 },
            { upTo: null, amount: 0 }
          ],
          marriedJoint: [
            { upTo: 29039, amount: 25840 },
            { upTo: 159690, from: 29040, base: 25840, rate: 0.19778 },
            { upTo: null, amount: 0 }
          ],
          headOfHousehold: [
            { upTo: 20119, amount: 18030 },
            { upTo: 58827, from: 20120, base: 18030, rate: 0.22515 },
            { upTo: 136453, from: 20120, base: 13960, rate: 0.12 },
            { upTo: null, amount: 0 }
          ]
        },
        personalExemption: {
          single: 700,
          marriedJoint: 1400,
          headOfHousehold: 700
        },
        brackets: {
          single:          [[15110, 0.035], [51950, 0.044], [332720, 0.053], [Infinity, 0.0765]],
          marriedJoint:    [[20150, 0.035], [69260, 0.044], [443630, 0.053], [Infinity, 0.0765]],
          headOfHousehold: [[15110, 0.035], [51950, 0.044], [332720, 0.053], [Infinity, 0.0765]]
        }
      }
    },

    /* ARKANSAS - ajoute le 2026-09-12. 17e Etat publie.

       LA SOURCE PRINCIPALE : « State of Arkansas, Estimated Tax Declaration
       Vouchers and Instructions for Tax Year 2026 » (AR1000ES, Instr. R
       10/14/2025 ; Worksheet R 10/17/2025 ; Voucher R 10/13/2025),
       telechargee le 2026-09-12 depuis
       dfa.arkansas.gov/wp-content/uploads/2026_Final_AR1000ES.pdf
       (application/pdf, 1 833 297 octets, HTTP 200). C'est le document que le
       contribuable utilise pour estimer son impot 2026 : il porte donc le
       bareme ET la deduction standard de l'annee en cours.

       LA DEDUCTION STANDARD, verbatim, ligne 2 du « 2026 Estimated Tax
       Worksheet » : « If you do not expect to itemize deductions, enter the
       standard deduction of $2,470 per taxpayer ». Un celibataire ou un chef
       de famille est UN contribuable (2 470 $) ; un couple qui declare en
       commun en compte deux (4 940 $) - meme convention que le Michigan et le
       Nebraska.

       LE BAREME EST UNE TABLE DE SEGMENTS, PAS DES TRANCHES CONTINUES. La
       « TAX RATE SCHEDULE » de l'AR1000ES imprime, pour chaque segment, un
       montant de base propre au dollar pres - « $0.00 plus 2.0% of the
       excess over $5,599.99 » jusqu'a 11 199,99 $, puis « $111.00 plus 3.0%
       » jusqu'a 15 999,99 $, puis « $255.00 plus 3.4% » jusqu'a 26 399,99 $,
       puis 3,9 % partout au-dessus par paliers de base imprimes : 608,00 $
       (26 400 $), 748,00 $ (30 000 $), 1 138,00 $ (40 000 $), 1 528,00 $
       (50 000 $), 1 918,00 $ (60 000 $), 2 308,00 $ (70 000 $), 2 698,00 $
       (80 001 $), 3 727,00 $ (97 801 $), 3 809,00 $ (100 000 $ et au-dela).
       Recalculer ces paliers avec des tranches marginales ordinaires (2,0 /
       3,0 / 3,4 / 3,9 %, en chaine continue depuis zero) donne un chiffre
       PROCHE mais FAUX au-dela de 94 700,99 $ - verifie le 2026-09-12 : a
       100 000 $ imposables, une chaine continue donne 3 480,00 $ contre les
       3 809,00 $ publies, un ecart de 329 $ qui persiste (et ne se resorbe
       jamais) a tout revenu superieur.

       LE PONT DE 94 701 $ A 97 800,99 $, LA CAUSE DE L'ECART. Une deuxieme
       table, « TAX RATE SCHEDULE (94,701.00 - 97,800.99) », decoupe cette
       bande en 31 paliers de 100 $ dont l'impot monte d'environ 14 $ par
       tranche de 100 $ (3 296,00 $ a 94 701 $, jusqu'a 3 713,00 $ a
       97 701-97 800,99 $) - une recapture d'environ 14 % de taux marginal sur
       une bande etroite, avant de revenir a 3,9 % au-dessus. Aucune des cinq
       autres sources lues pour d'autres Etats n'avait ce mecanisme ; il est
       reproduit ici segment par segment (31 lignes), pas approxime, parce
       que l'ecart qu'il cause (329 $) est trop grand pour etre laisse de
       cote. Moteur : S.incomeTax.bracketTable, .tooling/lib/paie.js et
       assets/calc-paycheck.js, fonction impotTable ajoutee le 2026-09-12
       specifiquement pour cette table (le mecanisme habituel de tranches
       marginales, progressiveTax, ne peut pas exprimer des bases publiees
       qui ne s'enchainent pas exactement d'un segment au suivant).

       LE MEME BAREME S'APPLIQUE A TOUT LE MONDE, SANS DOUBLER LES SEUILS.
       Le formulaire AR1000ES calcule l'impot du PRINCIPAL et du CONJOINT
       dans deux colonnes separees ("PRIMARY" / "SPOUSE"), chacune sur SA
       PROPRE table de segments imposable - contrairement au Wisconsin, au
       Nebraska ou a la Caroline du Nord, l'Arkansas ne double pas les seuils
       pour une declaration commune. C'est un fait rare confirme par une
       deuxieme source, LegalClarity, « Arkansas Tax Brackets: Rates, Tables,
       and Deductions », lu le 2026-09-12 : « the tax brackets for these
       filing statuses are the same in the state of Arkansas ». Ce
       calculateur ne demande qu'un seul revenu, donc bracketTable est
       IDENTIQUE pour single, marriedJoint et headOfHousehold ; seule la
       deduction standard et le credit ci-dessous doublent pour le foyer.

       LE CREDIT D'IMPOT PERSONNEL - ET C'EST UN CREDIT, PAS UNE DEDUCTION.
       Meme AR1000ES, section « TAX CREDITS » : « 1. Single or Married Filing
       Separate Forms ... $29 » et « 2. Married Filing Joint Return, Head of
       Household, Married Filing Separately on the Same Return, or Qualifying
       Widow(er) with Dependent Child ... $58 ». Comme le Nebraska, ce credit
       ne s'efface pas avec le revenu - rien dans le document ne prevoit de
       seuil de degressivite, d'ou phaseOutStart a l'infini et phaseOutRate a
       zero.

       AUCUN IMPOT MUNICIPAL OU DE COMTE. Arkansas Code § 26-73-103(a)(2)(B),
       lu via codes.findlaw.com/ar/title-26-taxation/ar-code-sect-26-73-103.html
       le 2026-09-12 (le site de la legislature d'Arkansas ne publie pas le
       code annote consultable article par article), verbatim : « A county,
       municipality, or other local government shall not levy a tax on
       income. » Aucune ville ni aucun comte d'Arkansas ne peut donc preleve
       un impot sur le revenu.

       L'ASSURANCE CHOMAGE NE SORT PAS DE LA PAIE. Arkansas Division of
       Workforce Services, page FAQ, dws.arkansas.gov/workforce-services/
       unemployment/faq/, lue le 2026-09-12 (HTTP 200), verbatim : « No,
       deductions are not made from your paycheck. Arkansas employers who are
       covered by the Arkansas Division of Reemployment law are required to
       pay a quarterly tax on their payroll. » Meme mecanisme que la plupart
       des Etats deja publies : rien a soustraire du net a ce titre.

       ⛔ CE QUE CETTE ENTREE NE DIT PAS, ET POURQUOI : rien sur le Married
       Filing Separately (le calculateur ne propose pas ce statut) ; rien sur
       les personnes a charge (29 $ chacune selon l'AR1000ES) ni sur l'age
       65+/aveugle/sourd (29 $ chacun) - le calculateur ne demande ni l'un ni
       l'autre ; rien sur un eventuel transfert de la deduction inutilisee
       d'un conjoint sans revenu vers l'autre - aucune source lue ne le
       precise pour ce formulaire d'estimation.
       ------------------------------------------------------------------- */
    arkansas: {
      name: "Arkansas",
      abbr: "AR",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 2470,
          marriedJoint: 4940,
          headOfHousehold: 2470
        },
        bracketTable: (() => {
          const segments = [
            { upTo: 5599.99, amount: 0 },
            { upTo: 11199.99, base: 0, rate: 0.02, from: 5599.99 },
            { upTo: 15999.99, base: 111, rate: 0.03, from: 11199.99 },
            { upTo: 26399.99, base: 255, rate: 0.034, from: 15999.99 },
            { upTo: 29999.99, base: 608, rate: 0.039, from: 26399.99 },
            { upTo: 39999.99, base: 748, rate: 0.039, from: 29999.99 },
            { upTo: 49999.99, base: 1138, rate: 0.039, from: 39999.99 },
            { upTo: 59999.99, base: 1528, rate: 0.039, from: 49999.99 },
            { upTo: 69999.99, base: 1918, rate: 0.039, from: 59999.99 },
            { upTo: 80000.99, base: 2308, rate: 0.039, from: 69999.99 },
            { upTo: 94700.99, base: 2698, rate: 0.039, from: 80000.99 },
            /* Le pont : 31 lignes de 100 $, imprimees a part sur
               « TAX RATE SCHEDULE (94,701.00 - 97,800.99) ». */
            { upTo: 94800.99, amount: 3296 },
            { upTo: 94900.99, amount: 3310 },
            { upTo: 95000.99, amount: 3324 },
            { upTo: 95100.99, amount: 3338 },
            { upTo: 95200.99, amount: 3352 },
            { upTo: 95300.99, amount: 3365 },
            { upTo: 95400.99, amount: 3379 },
            { upTo: 95500.99, amount: 3393 },
            { upTo: 95600.99, amount: 3407 },
            { upTo: 95700.99, amount: 3421 },
            { upTo: 95800.99, amount: 3435 },
            { upTo: 95900.99, amount: 3449 },
            { upTo: 96000.99, amount: 3463 },
            { upTo: 96100.99, amount: 3477 },
            { upTo: 96200.99, amount: 3491 },
            { upTo: 96300.99, amount: 3504 },
            { upTo: 96400.99, amount: 3518 },
            { upTo: 96500.99, amount: 3532 },
            { upTo: 96600.99, amount: 3546 },
            { upTo: 96700.99, amount: 3560 },
            { upTo: 96800.99, amount: 3574 },
            { upTo: 96900.99, amount: 3588 },
            { upTo: 97000.99, amount: 3602 },
            { upTo: 97100.99, amount: 3616 },
            { upTo: 97200.99, amount: 3630 },
            { upTo: 97300.99, amount: 3643 },
            { upTo: 97400.99, amount: 3657 },
            { upTo: 97500.99, amount: 3671 },
            { upTo: 97600.99, amount: 3685 },
            { upTo: 97700.99, amount: 3699 },
            { upTo: 97800.99, amount: 3713 },
            { upTo: 99999.99, base: 3727, rate: 0.039, from: 97800.99 },
            { upTo: null, base: 3809, rate: 0.039, from: 99999.99 }
          ];
          /* Meme table pour les trois statuts : l'Arkansas ne double pas les
             seuils pour une declaration commune (voir le commentaire
             ci-dessus). */
          return { single: segments, marriedJoint: segments, headOfHousehold: segments };
        })(),
        taxCredit: {
          base:          { single: 29, marriedJoint: 58, headOfHousehold: 58 },
          phaseOutStart: { single: Infinity, marriedJoint: Infinity, headOfHousehold: Infinity },
          phaseOutRate:  0
        }
      }
    },

    /* ------------------------------------------------------------------ *
       IDAHO, lu le 2026-09-12.

       ⚠️ tax.idaho.gov ET legislature.idaho.gov ont refuse la connexion
       depuis cette machine sur TROIS methodes distinctes le 2026-09-12 :
       (1) curl direct -> ERR_CONNECTION_TIMED_OUT / exit 28 (TCP vers
       164.165.66.150:443 jamais accepte, verifie avec curl -v) ; (2) curl
       force IPv4 -> meme resultat ; (3) l'outil WebFetch (ECONNREFUSED) et un
       Chromium reel headless via lire-source.js (ERR_CONNECTION_TIMED_OUT).
       sos.idaho.gov, meme TLD, a repondu HTTP 200 normalement le meme jour :
       ce n'est donc pas un blocage de idaho.gov entier, mais des serveurs
       fiscaux/legislatifs precis, injoignables depuis ce reseau. Regle des
       3 tentatives appliquee : les deux documents officiels ci-dessous ont
       ete lus dans leur instantane Internet Archive (meme detour que
       l'Utah le 02/09/2026 pour Publication 14), qui repond HTTP 200 et sert
       un PDF identique a l'original — pas un resume tiers.

       1. « Table for Percentage Computation Method of Withholding », Idaho
          State Tax Commission, EPB00744 (revision 07-23-2026), lu via
          web.archive.org/web/2026/https://tax.idaho.gov/wp-content/uploads/pubs/EPB00744/EPB00744_07-23-2026.pdf
          (application/pdf, 316 188 octets, HTTP 200 le 2026-09-12). Seule
          source retenue pour le mecanisme de paie : elle porte
          explicitement l'annee 2026. Verbatim, periode ANNUELLE :
            Single Persons Including Head of Household — « If wages after
            subtracting child tax credit allowances are: More than $1 ...
            Less than $16,100 ... $0.00 ... $16,100 [et au-dela] 5.3% of the
            amount over $16,100 ».
            Married Persons — memes mots, seuil « $32,200 ».
          Ces deux seuils sont EXACTEMENT les deductions standard federales
          2026 declarees en tete de ce fichier (IRS Rev. Proc. 2025-32) :
          l'Idaho retient sur le revenu apres deduction standard federale,
          comme le Montana.
          ⚠️ Le chef de famille N'A PAS de colonne separee dans cette table :
          il est explicitement regroupe avec le celibataire (« Single Persons
          Including Head of Household »), au seuil de 16 100 $ — different du
          traitement federal (24 150 $) et du formulaire annuel de
          declaration pour l'annee d'imposition 2025 (ou il etait regroupe
          avec le conjoint, voir point 3). C'est la table de retenue 2026 —
          celle qui gouverne ce qui sort effectivement d'un salaire — qui
          fait foi ici.

       2. Idaho State Tax Commission, communique de presse « Withholding
          tables updated for 2026 », date affichee « Friday July 31, 2026 »,
          lu via
          web.archive.org/web/2026/https://tax.idaho.gov/pressrelease/withholding-tables-updated-for-2026/
          (HTTP 200 le 2026-09-12), verbatim : « We've updated the income tax
          withholding tables for 2026. The Idaho Child Tax Credit has
          sunsetted per Idaho Code section 63-3029L. » Confirme que le
          credit d'impot pour enfant PROPRE A L'IDAHO (distinct du credit
          federal) ne s'applique plus a l'annee d'imposition 2026 — d'ou
          l'absence de toute « child tax credit allowance » non nulle dans
          notre moteur. Le montant (205 $/enfant) et le caractere
          NON-REMBOURSABLE viennent du texte de loi lui-meme, Idaho Code
          63-3029L, lu via
          web.archive.org/web/20260519032429/https://legislature.idaho.gov/statutesrules/idstat/title63/t63ch30/sect63-3029l/
          (HTTP 200 le 2026-09-12 ; direct : injoignable, meme blocage),
          verbatim : « there shall be allowed to a taxpayer a nonrefundable
          credit against the tax imposed by this chapter in the amount of
          two hundred five dollars ($205) with respect to each qualifying
          child of the taxpayer [...] For taxable years beginning on or
          after January 1, 2018, and before January 1, 2026 ».

       3. Idaho Code 63-3024, « Individuals' tax and tax on estates and
          trusts » — legislature.idaho.gov injoignable sur les memes trois
          methodes que ci-dessus le 2026-09-12 ; texte de loi lu par extrait
          indexe (WebSearch), verbatim, concordant sur plusieurs miroirs
          juridiques : « computed at the rate of five and three-tenths
          percent (5.3%) of taxable income over two thousand five hundred
          dollars ($2,500) » (celibataire), « over five thousand dollars
          ($5,000) » (declaration commune), « a return of a surviving
          spouse ... and a head of household ... shall be treated as a
          joint return ». Ces montants de 1998 sont indexes chaque annee sur
          l'IPC par la Commission (Idaho Code 63-3024A : « the state tax
          commission shall prescribe a factor ... so that inflation will
          not result in a tax increase ») — le montant EFFECTIF pour 2026
          est celui de la table de retenue ci-dessus (16 100 $ / 32 200 $),
          pas le montant brut de la loi. Pour comparaison, le formulaire
          annuel EIN00046 (revision 03-02-2026, tax year 2025, meme detour
          Wayback, HTTP 200 le 2026-09-12) donnait, verbatim, dans son
          « Worksheet » pour la ligne « Tax » : « Single or married filing
          separately, enter $4,811 » / « Married filing jointly, head of
          household, or qualifying surviving spouse, enter $9,622 » — la
          valeur 2026 (16 100 $/32 200 $) est bien plus elevee parce que 2026
          est la premiere annee ou le DOR fait correspondre directement le
          seuil de retenue a la deduction standard federale OBBBA-augmentee
          (16 100 $/32 200 $, contre 15 750 $/31 500 $ pour 2025), un
          changement de methode de calcul publie par l'agence, pas une
          erreur de recopie : les deux nombres 2026 sont, au dollar pres,
          ceux que federal.standardDeduction declare deja en tete de ce
          fichier.

       TAUX. 5,3 % depuis le 1er janvier 2025, House Bill 40 : Office of the
       Governor (Brad Little), communique « Idaho delivers largest income
       tax cut in state history, sending another $253 million back to
       Idahoans », publie le 2025-03-06 (JSON-LD datePublished
       2025-03-06T14:48:12-07:00), lu via
       web.archive.org/web/20260512222837/https://gov.idaho.gov/pressrelease/idaho-delivers-largest-income-tax-cut-in-state-history-sending-another-253-million-back-to-idahoans/
       (HTTP 200 le 2026-09-12 ; direct : ECONNREFUSED, meme IP que les
       sources tax.idaho.gov ci-dessus). Verbatim : « Governor Brad Little
       joined members of House and Senate leadership today in signing House
       Bill 40 [...] Most of the tax cut is achieved by reducing the income
       tax rate for individuals and businesses from 5.695% to 5.3%. »
       (House Speaker Mike Moyle, meme communique : « the single largest
       income tax cut in state history »). Recoupe par EIN00046 ci-dessus
       (« Effective January 1, 2025, the individual income tax rate is
       5.3% »). Inchange pour l'annee d'imposition 2026 : aucune loi de
       baisse supplementaire trouvee pour 2026 (House Bill 559, 2026, ne
       touche que la conformite federale des deductions — deduction
       seniors, pourboires, interets sur pret auto, heures supplementaires
       — pas le taux d'imposition).

       PAS DE DEDUCTION STANDARD DISTINCTE A CONSTRUIRE : le seuil de
       16 100 $/32 200 $ EST directement la deduction a soustraire (comme le
       Montana), donc standardDeduction porte ces deux nombres et brackets
       n'a qu'une seule tranche, a taux plein, au-dela.

       ASSURANCE CHOMAGE — Idaho Department of Labor, « Handbook for
       Businesses, Unemployment Insurance Tax Information » (date de
       couverture 11/5/2025), lu via
       web.archive.org/web/2026/https://www.labor.idaho.gov/wp-content/uploads/2025/11/Handbook_Tax-information_Nov.-2025-1.pdf
       (HTTP 200 le 2026-09-12), page 2, verbatim : « State Unemployment Tax
       (SUTA) is an employer-paid tax paid into the unemployment insurance
       trust fund ». Rien a soustraire du salaire de l'employe.

       ⛔ CE QUE CETTE ENTREE NE DIT PAS : rien sur un impot municipal ou de
       comte. Aucune des sources lues ne l'affirme en toutes lettres, donc la
       page ne l'affirme pas non plus (meme regle que le Montana et le
       Wisconsin). Rien non plus sur le statut Married Filing Separately (non
       propose par notre calculateur) ni sur les personnes a charge/l'age
       65+ (le calculateur ne les demande pas).
       ------------------------------------------------------------------- */
    idaho: {
      name: "Idaho",
      abbr: "ID",
      incomeTax: {
        hasIncomeTax: true,
        /* Identiques a federal.standardDeduction pour single/marriedJoint,
           et pour cause : voir le commentaire. headOfHousehold reprend le
           montant "single" parce que EPB00744 regroupe explicitement les
           deux dans sa colonne "Single Persons Including Head of
           Household" — ce n'est pas un oubli, c'est la table 2026. */
        standardDeduction: {
          single: 16100,
          marriedJoint: 32200,
          headOfHousehold: 16100
        },
        brackets: {
          single:          [[Infinity, 0.053]],
          marriedJoint:    [[Infinity, 0.053]],
          headOfHousehold: [[Infinity, 0.053]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       VIRGINIA - ajoute le 2026-09-16. 19e Etat publie.

       LA SOURCE : "Income Tax Withholding Guide for Employers", Virginia
       Department of Taxation, revision 05/25 (document 2614086), telechargee
       le 2026-09-16 depuis tax.virginia.gov/sites/default/files/vatax-pdf/
       employer-withholding-instructions.pdf (application/pdf, 1 678 640
       octets, HTTP 200 direct - aucun obstacle reseau cette fois).

       LE BAREME NE S'ELARGIT PAS PAR STATUT, comme l'Arkansas. Page 21,
       "Formula for Computing Tax to be Withheld", verbatim :
         "Not over $3,000 : 2% of T"
         "$3,000 to $5,000 : $60 + (3% of excess over $3,000)"
         "$5,000 to $17,000 : $120 + (5% of excess over $5,000)"
         "Over $17,000 : $720 + (5.75% of excess over $17,000)"
       Une seule table, single ou married, contrairement a la Caroline du
       Nord ou au Nebraska qui doublent leurs seuils au mariage. Recoupement
       a la main sur l'exemple imprime page 22 (John, 5 exemptions, 63 576 $
       de brut annualise, 13 400 $ de deduction+exemptions) : T = 50 176 $,
       W = 720 + 5,75% x 33 176 = 2 628,12 $ -> imprime 2 628 $ (arrondi
       demonstratif de l'agence). Notre moteur ne recoupe pas cet exemple
       telle-quelle (il utilise 1 exemption, pas 5), mais chaque segment de
       la formule est verifie separement.

       LA DEDUCTION STANDARD 2026. Page 5, "New: Increase in Standard
       Deduction", verbatim : "the standard deduction from $8,500 to $8,750
       for single filers and from $17,000 to $17,500 for married filers
       filing jointly. Under this Act, the increase in the standard
       deduction is scheduled to sunset after Taxable Year 2026" - donc
       8 750 $ / 17 500 $ s'appliquent a l'annee d'imposition 2026, le
       millesime de cette page, avant de retomber a 3 000 $ / 6 000 $ en
       2027. headOfHousehold reprend le montant "single" : le formulaire de
       retenue VA-4 ne distingue que Single et Married (aucune case Head of
       Household), et une recherche independante (visaverge.com,
       citant le texte du House Bill 12 qui rend l'augmentation permanente)
       confirme que le chef de famille partage le seuil du celibataire,
       8 750 $, pour 2026 - source tierce utilisee en RECOUPEMENT seulement,
       jamais comme source du chiffre lui-meme.

       L'EXEMPTION PERSONNELLE, ET C'EST UNE VRAIE DEDUCTION (contrairement
       au credit du Nebraska ou de l'Utah). Page 21, legende de la formule :
       "E1 = Personal and Dependent Exemptions", et l'etape 1 de la formule
       soustrait "(E1 X $930)" du revenu annualise avant application du
       bareme. Notre calculateur ne demande pas le nombre de personnes a
       charge, donc suit la meme convention que le Wisconsin et le Nebraska :
       1 exemption (930 $) pour un celibataire ou un chef de famille, 2
       (1 860 $) pour un couple qui declare conjointement - le declarant et
       le conjoint, sans personne a charge.

       PAS D'IMPOT LOCAL SUR LE REVENU. Ce guide de 32 pages couvre chaque
       categorie de retenue qu'un employeur de Virginie doit appliquer -
       aucune occurrence du mot "local" dans tout le document, aucune ligne
       de retenue municipale ou de comte dans la formule ou les tables.
       Cette absence dans un document officiel exhaustif est le signal
       retenu ; recoupee par trois sources tierces independantes lues le
       2026-09-16 (ADP, SmartAsset, SurePayroll), qui affirment toutes en
       toutes lettres que la Virginie n'a pas d'impot local sur le revenu -
       utilisees en RECOUPEMENT seulement, jamais comme source du fait
       lui-meme. Les taxes foncieres locales existent (dls.maryland.gov et
       equivalents Virginie), mais ne sortent pas d'un salaire.

       CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI. L'assurance chomage
       (VEC) : vec.virginia.gov a renvoye HTTP 403 (blocage de robot,
       verifie le 2026-09-16) sur la page qui declare l'obligation
       employeur-seul ; la meme regle est vraie sans exception dans les 18
       autres Etats deja publies sur ce site et confirmee par un organisme
       tiers de paie (rippling.com, "This tax is levied on employers, not
       their employees"), utilise en RECOUPEMENT. Rien sur Married Filing
       Separately (non propose par le calculateur) ni sur l'age 65+/aveugle
       (E2, 800 $ par exemption, que le calculateur ne demande pas).
       ----------------------------------------------------------------------- */
    virginia: {
      name: "Virginia",
      abbr: "VA",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 8750,
          marriedJoint: 17500,
          headOfHousehold: 8750
        },
        personalExemption: {
          single: 930,
          marriedJoint: 1860,
          headOfHousehold: 930
        },
        brackets: {
          single:          [[3000, 0.02], [5000, 0.03], [17000, 0.05], [Infinity, 0.0575]],
          marriedJoint:    [[3000, 0.02], [5000, 0.03], [17000, 0.05], [Infinity, 0.0575]],
          headOfHousehold: [[3000, 0.02], [5000, 0.03], [17000, 0.05], [Infinity, 0.0575]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       ALASKA — 20e Etat, ajoute 2026-09-17. Deux sources officielles lues le
       jour meme, les DEUX joignables directement par curl (aucun blocage,
       contrairement a la Tennessee/Nevada/Idaho/Virginie) :

       1. AUCUN IMPOT SUR LE REVENU DES PARTICULIERS.
          tax.alaska.gov, Department of Revenue - Tax Division, page "Personal
          Income" (https://tax.alaska.gov/programs/programs/index.aspx?10001),
          lue le 2026-09-17, HTTP 200, verbatim :
            "Does Alaska have a personal income tax? The State of Alaska
             currently does not have an individual income tax, therefore no
             employee withholding for state income tax is required."
          Recoupement historique (non retenu comme source du chiffre, juste
          pour l'angle editorial) : l'impot sur le revenu des particuliers a
          ete abroge retroactivement au 1er janvier 1980 (loi signee par le
          gouverneur Jay Hammond en septembre 1980), finance par les recettes
          petrolieres du pipeline Trans-Alaska. AS 43.20.011 ("Tax on
          corporations"), la disposition actuelle du Alaska Net Income Tax
          Act, ne taxe QUE les societes aujourd'hui - confirme le 2026-09-17
          sur codes.findlaw.com/ak/title-43-revenue-and-taxation/ak-st-sect-
          43-20-011/, HTTP 200 : la section ne mentionne aucune assiette
          individuelle. Un projet de loi (SB 92, session 2025) proposerait de
          reintroduire un impot individuel a 3,2 %/5,7 % - PROPOSE, non
          adopte ; non modelise ici, et la page ne le presente pas comme une
          loi en vigueur.

       2. ASSURANCE CHOMAGE - PARTAGEE ENTRE EMPLOYEUR ET SALARIE. C'est le
          fait distinctif de cet Etat : l'Alaska est le SEUL Etat des 20 deja
          publies sur ce site ou une part de l'assurance chomage sort de la
          paie du salarie plutot que d'etre payee entierement par
          l'employeur. Source : Alaska Department of Labor and Workforce
          Development, "2026 Unemployment Insurance Tax Rates"
          (https://labor.alaska.gov/estax/2026-experience-rates.html), lue le
          2026-09-17, HTTP 200, verbatim :
            "The 2026 Employee Rate is 0.50%"
            "The 2026 Taxable Wage Base is $54,200.00"
          La page precise aussi "The Total Rate = Employer Rate + Employee
          Rate" : le salarie ne paie que sa part (0,50 %), jamais le total.
          0,50 % x 54 200 $ = 271 $ par an au maximum, atteint des 54 200 $ de
          salaire brut.

       CE QUE CETTE PAGE NE DIT PAS, ET POURQUOI. Taxe locale sur le revenu :
          aucune source d'Etat officielle listant les 165 municipalites
          (boroughs et villes) de l'Alaska n'a pu etre chargee depuis cette
          machine (commerce.alaska.gov/web/dcra/officeofthestateassessor/
          alaskataxfacts.aspx repond HTTP 403 a toute requete automatisee).
          Aucune municipalite d'Alaska taxant les salaires n'a ete trouvee
          dans les recherches menees, mais faute d'une source d'Etat lue
          directement, la page ne l'affirme pas comme un fait etabli - elle
          dit ce qu'elle sait (aucun impot local trouve) sans promettre une
          verification exhaustive des 165 juridictions. Meme prudence que
          pour la Georgie le 28/08/2026.
       ----------------------------------------------------------------------- */
    alaska: {
      name: "Alaska",
      abbr: "AK",
      incomeTax: { hasIncomeTax: false },

      /* Assurance chomage, part SALARIALE. L'Alaska est le seul des 20 Etats
         publies ou ce champ est non vide : voir la source 2 ci-dessus. */
      employeePrograms: [
        { label: "AK Unemployment Insurance (0.50%)", rate: 0.005, wageCap: 54200 }
      ]
    },

    /* -----------------------------------------------------------------------
       NORTH DAKOTA — 21e Etat, ajoute 2026-09-17. Deux sources officielles
       lues le jour meme.

       1. BAREME DE RETENUE 2026 (Section 2, formulaire W-4 2020 et apres).
          "North Dakota Income Tax Withholding Rates & Instructions, For
          wages paid in 2026", North Dakota Office of State Tax Commissioner,
          telechargee le 2026-09-17 depuis tax.nd.gov/sites/www/files/
          documents/forms/individual/2026-iit/2026-income-tax-withholding-
          rates-booklet.pdf (HTTP 200 direct, aucun obstacle reseau), page 45,
          "Annual Percentage Method Tables (Forms W-4 for 2020 and after)",
          verbatim :
            Single : "0 + 1.95% of amount over $ 57,625" puis
                     "3,916.09 + 2.50% of amount over 258,450"
            Married Filing Jointly : "0 + 1.95% of amount over $ 57,500" puis
                     "2,164.99 + 2.50% of amount over 168,525"
            Head of Household : "0 + 1.95% of amount over $ 78,475" puis
                     "4,118.40 + 2.50% of amount over 289,675"
          Chaque montant de base recoupe l'arithmetique de son propre segment
          au centime pres (verifie a la main le 2026-09-17) :
            Single    : (258450-57625) x 1,95% = 3 916,09 $ -> imprime 3 916,09 $
            Married   : (168525-57500) x 1,95% = 2 165,00 $ -> imprime 2 164,99 $ (arrondi agence)
            Head of H.: (289675-78475) x 1,95% = 4 118,40 $ -> imprime 4 118,40 $
          Cette coherence interne parfaite confirme que les trois seuils ont
          ete lus dans le bon ordre malgre une mise en page a colonnes (verifie
          trois fois avec des extractions PDF differentes : pdftotext -layout,
          -raw et sans option, resultat identique a chaque fois).

          LE FAIT DISTINCTIF DE CETTE PAGE : le seuil du couple qui declare
          conjointement (57 500 $) N'EST PAS LE DOUBLE du seuil du celibataire
          (57 625 $) — il est meme legerement PLUS BAS. C'est l'inverse du
          schema habituel (Nebraska, Caroline du Nord, bareme federal), ou le
          mariage double le seuil. La formule de retenue du Dakota du Nord
          n'essaie pas de deviner le revenu du foyer entier a partir d'un seul
          bulletin de paie : chaque tranche de retenue est calibree pour un
          SEUL salaire, quel que soit le statut, ce qui explique pourquoi les
          trois seuils (57 625 $ / 57 500 $ / 78 475 $) sont du meme ordre de
          grandeur plutot que le statut marie doublant le statut celibataire.
          Cette formule de RETENUE (ce qui sort reellement d'un bulletin de
          paie, l'objet de ce calculateur) differe du bareme STATUTAIRE de
          declaration annuelle publie separement sur tax.nd.gov/individual-
          income-tax (qui, pour 2025, dernier millesime affiche sur cette
          page au 2026-09-17, montre un seuil "Married filing jointly" a
          80 975 $ contre 48 475 $ pour "Single" — bien plus large, comme
          attendu pour une declaration annuelle). Cette page modelise la
          RETENUE, conformement a l'objet d'un "paycheck calculator".

          Pas de deduction standard ni d'exemption personnelle distinctes a
          soustraire : la tranche a 0% agit deja comme un seuil integre dans
          le bareme de retenue lui-meme (contrairement a la Virginie, qui
          soustrait deduction + exemption avant d'appliquer un bareme qui
          commence a 0 $).

       2. ASSURANCE CHOMAGE — ENTIEREMENT A LA CHARGE DE L'EMPLOYEUR, comme
          19 des 20 Etats deja publies (seul l'Alaska partage la charge).
          Source : Job Service North Dakota, "2026 Unemployment Insurance Tax
          Rate Schedules" (jobsnd.com/sites/www/files/documents/jsnd-
          documents/uitaxrateschedules2026.pdf), lue le 2026-09-17, HTTP 200,
          verbatim : "2026 Taxable Wage Base is $46,600" et "New Employer
          Rate ... Non-Construction 1.00%". Aucune mention d'un taux ou d'une
          part salariale nulle part dans ce document ni dans le "Employer's
          Handbook on the Unemployment Insurance Program in North Dakota"
          (library.nd.gov/statedocs/JobService/jsnd4036.pdf, lu le meme
          jour) — recoupe le schema standard : cette taxe ne sort jamais
          d'un bulletin de paie au Dakota du Nord, donc n'est pas modelisee
          dans employeePrograms.

       PAS D'IMPOT LOCAL SUR LE REVENU. La propre page officielle "Local
       Taxes - City and County Taxes" du Tax Commissioner
       (tax.nd.gov/business/sales-and-use-tax/local-taxes-city-and-county-
       taxes), lue le 2026-09-17, HTTP 200, enumere EXHAUSTIVEMENT les
       categories de taxes locales que villes et comtes peuvent lever,
       verbatim : "Cities and counties may levy sales and use taxes, as well
       as special taxes such as lodging taxes, lodging and restaurant taxes,
       and motor vehicle rental taxes." Aucun impot sur le revenu n'apparait
       dans cette liste exhaustive d'un document officiel dedie precisement
       a l'enumeration des taxes locales — un signal plus fort que l'absence
       de source rencontree en Alaska/Georgie, puisque la page dont c'est
       precisement l'objet ne mentionne pas d'impot local sur le revenu parmi
       les categories qu'elle liste. Recoupe par une recherche independante
       (search web, plusieurs sources tierces) confirmant qu'aucune ville du
       Dakota du Nord (Fargo, Bismarck compris) ne leve d'impot local sur le
       revenu — utilisee en RECOUPEMENT seulement.
       ----------------------------------------------------------------------- */
    "north-dakota": {
      name: "North Dakota",
      abbr: "ND",
      incomeTax: {
        hasIncomeTax: true,
        brackets: {
          single:          [[57625, 0], [258450, 0.0195], [Infinity, 0.025]],
          marriedJoint:    [[57500, 0], [168525, 0.0195], [Infinity, 0.025]],
          headOfHousehold: [[78475, 0], [289675, 0.0195], [Infinity, 0.025]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       WYOMING — added 2026-09-17, the 22nd state, the 7th with no income tax
       (after Texas, Florida, Nevada, Tennessee, Washington, Alaska). CSV
       SEMrush du 01/09 : "wyoming paycheck calculator" KD 9, volume 880/mois,
       CPC 2,29 $ (retenu apres North Dakota KD 7 ; Maine, KD 9 egalement mais
       CPC 5,72 $, ecarte cette session parce que son mecanisme de retenue
       comporte un abattement standard DEGRESSIF au-dela d'un seuil de revenu
       annualise — formule non encore supportee par le moteur, chantier a
       part ; Vermont KD 9 ecarte, CPC 0,00 $, signal faible). SERP reelle
       verifiee par WebSearch le 2026-09-17 : 9/9 acteurs etablis (ADP,
       OnPay, Gusto, Indeed Flex, PaycheckCity, SmartAsset, QuickBooks,
       SurePayroll, usapaycheck.org) — porte fermee au sens strict du
       21/08, publiee quand meme sur le meme raisonnement volume/CPC que
       Virginia/Alaska/North Dakota (decision PDG du 11/09).

       ── L'ANGLE DE CETTE PAGE ────────────────────────────────────────────
       Le Wyoming ne se contente pas de taxer a 0% : la loi lui interdit
       EXPLICITEMENT, a lui-meme et a toute subdivision, de lever un impot
       sur les salaires. C'est plus fort que "le taux est a zero" (Tennessee,
       apres abrogation) ou que "la loi ne prevoit rien" (Texas, Floride) :
       c'est une clause de PREEMPTION qui couvre l'Etat ET les villes/comtes
       dans la meme phrase — source ci-dessous.

       1. AUCUN IMPOT SUR LE REVENU, NI D'ETAT NI LOCAL — LA MEME PHRASE DE
          LOI COUVRE LES DEUX. Wyoming Statutes, Title 39 ("Taxation and
          Revenue"), Chapter 12 ("Income Tax"), § 39-12-101 ("Preemption by
          state"), PDF officiel telecharge directement depuis wyoleg.gov
          (wyoleg.gov/statutes/compress/title39.pdf, HTTP 200, lu le
          2026-09-17), verbatim, texte integral du seul article du chapitre
          12 :
            "The state of Wyoming does hereby preempt for itself the field
             of imposing and levying income taxes, earning taxes, or any
             other form of tax based on wages or other income and no
             county, city, town or other political subdivision shall have
             the right to impose, levy or collect such taxes."
          C'est le SEUL article du chapitre consacre a l'impot sur le revenu
          dans l'integralite du Titre 39 (la taxation et les revenus de
          l'Etat) — aucun bareme, aucune tranche, aucun formulaire de
          retenue nulle part ailleurs dans ce titre. Recoupe par la page
          "Our Mission" du Department of Revenue (revenue.wyo.gov/our-
          mission, lue le 2026-09-17), qui enumere les taxes que le
          Department administre — mineral et excise taxes, sales/use/
          lodging/cigarette/estate tax (Excise Tax Division), mineral
          severance taxes (Mineral Tax Division), property taxes (Property
          Tax Division) — sans jamais mentionner d'impot sur le revenu des
          personnes physiques.

       2. ASSURANCE CHOMAGE — ENTIEREMENT A LA CHARGE DE L'EMPLOYEUR, comme
          20 des 21 Etats deja publies (seul l'Alaska partage la charge) —
          mais avec un mecanisme de taux NOUVEAU-VENU plus complexe que
          d'habitude, propre a l'angle de cette page. Wyoming Department of
          Workforce Services (DWS), deux pages officielles lues le
          2026-09-17, HTTP 200 :
            a) "Unemployment Taxable Wage Base" (dws.wyo.gov/dws-division/
               unemployment-insurance/wyui/unemployment-taxable-wage-base/),
               tableau HTML verbatim : "2026  $33,800" (en hausse depuis
               32 400 $ en 2025 ; 34 900 $ deja publies pour 2027).
            b) "Unemployment Tax Rates" (dws.wyo.gov/dws-division/
               unemployment-insurance/employers/unemployment-tax-rates/),
               verbatim : "The Unemployment Tax Rates in Wyoming are
               assigned per W.S. 27-3 Article 5. [...] New employers (with
               less than three years of 'experience') will be assigned a
               base rate calculated on their specific industry. [...] If an
               employer fails to complete their registration prior to
               submitting their report, they will be assigned the highest
               base rate possible which is 8.5%."
          A LA DIFFERENCE de tous les autres Etats publies a ce jour, il
          n'existe PAS un taux unique "nouvel employeur" : le taux depend du
          secteur d'activite (NAICS), avec un plafond de 8,5% pour tout
          employeur non enregistre a temps. La page ne peut donc annoncer
          qu'une fourchette sourcee, jamais un chiffre unique invente.
          Aucune mention d'une part salariale nulle part dans ces deux
          pages ni dans les FAQ employeurs du DWS : la charge ne sort donc
          jamais d'un bulletin de paie (pas d'entree employeePrograms).
       ----------------------------------------------------------------------- */
    wyoming: {
      name: "Wyoming",
      abbr: "WY",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
       MISSISSIPPI — added 2026-09-17, the 23rd state. CSV SEMrush du 01/09 :
       "mississippi paycheck calculator" KD 11, volume 1 300/mois, CPC 4,67 $
       (le CPC le plus haut des quatre candidats a KD 11 : New Mexico 3,33 $,
       Rhode Island 3,69 $, South Dakota 1,79 $). South Carolina (KD 10,
       volume 1 900, CPC 2,40 $), pourtant le KD le plus bas de la liste,
       ECARTEE apres lecture de dor.sc.gov/iit le 2026-09-17 : la Caroline du
       Sud a introduit pour 2026 une "South Carolina Income Adjusted
       Deduction" (SCIAD) qui, verbatim, "may be reduced based on a
       taxpayer's federal AGI" — un abattement DEGRESSIF selon le revenu, la
       meme famille de mecanisme non supporte qui a deja ecarte le Maine le
       17/09 (chantier a part, budget dedie). SERP reelle verifiee par
       WebSearch le 2026-09-17 sur "mississippi paycheck calculator" : 9/9
       acteurs etablis (ADP, Indeed Flex, Gusto, PaycheckCity, SurePayroll,
       SmartAsset, QuickBooks, Fingercheck, OnPay) — porte fermee au sens
       strict du 21/08, publiee quand meme sur le meme raisonnement
       volume/CPC que Virginia/Alaska/North Dakota/Wyoming (decision PDG du
       11/09).

       ── L'ANGLE DE CETTE PAGE ────────────────────────────────────────────
       Le Mississippi ne taxe RIEN sur les 10 000 premiers dollars de revenu
       imposable, puis un TAUX UNIQUE de 4,0% sur le reste — pas un bareme a
       plusieurs tranches comme la Virginie ou le Dakota du Nord. C'est un
       bareme a deux segments, le second a taux constant, modelise ici comme
       [[10000, 0], [Infinity, 0.04]] dans le meme moteur `brackets` que les
       Etats progressifs.

       1. LE BAREME 2026 ET LA DEDUCTION/EXEMPTION PAR STATUT. "Withholding
          Income Tax Tables And Employer Instructions", Pub 89-700-25-1
          (Rev. 07/25), Mississippi Department of Revenue, PDF officiel
          telecharge directement depuis dor.ms.gov (dor.ms.gov/sites/
          default/files/tax-forms/business/89700251revised1.13.2026.pdf,
          HTTP 200, lu le 2026-09-17). Page 1, tableau "Income Tax Rates,
          Taxable Income (Tax Year 2026)", verbatim :
            "First $10,000 ... 0%"
            "Remaining balance (excess of $10,000) ... 4.0%"
          (des sources tierces independantes — Rippling, Netchex — citent
          4,4% pour 2026 ; la table officielle du 89-700, datee de la meme
          annee fiscale, dit 4,0% sans ambiguite et c'est ce chiffre qui est
          retenu, conformement a la regle du projet de ne jamais preferer un
          site tiers a la source officielle). Meme page, tableau "Exemptions
          and Deductions Schedule", verbatim :
            Single :      exemption $6,000,  standard deduction $2,300
            Head-of-Family ($8,000 + $1,500 per dependent) : exemption
              $9,500 (avec 1 personne a charge), standard deduction $3,400
            Married :     exemption $12,000, standard deduction $4,600
          Notre calculateur ne demande pas le nombre de personnes a charge,
          donc suit la meme convention que le Wisconsin, le Nebraska et la
          Virginie : le montant "Head-of-Family" imprime dans le tableau
          officiel du Mississippi lui-meme suppose deja UNE personne a
          charge ($8,000 de base + $1,500), retenu tel quel plutot que
          recalcule a zero personne a charge.

       2. ASSURANCE CHOMAGE — ENTIEREMENT A LA CHARGE DE L'EMPLOYEUR, comme
          21 des 22 Etats deja publies (seul l'Alaska partage la charge).
          Mississippi Department of Employment Security (MDES), deux
          documents officiels lus le 2026-09-17, HTTP 200 :
            a) "Instructions for Completing Form UI-2/3" (mdes.ms.gov/
               media/10376/UI_2_3_R_and_Instructions.pdf), verbatim en tete
               de document : "Taxable wage base per year per employee is
               $14,000."
            b) Page "Unemployment Tax Rates" (mdes.ms.gov/employers/
               unemployment-tax/reporting-and-filing/unemployment-tax-
               rates/), verbatim : "In Mississippi, the tax rate for a
               start-up business is 1.00% the first year of liability,
               1.10% the second year of liability and 1.20% the third and
               subsequent years of liability." Aucune mention d'une part
               salariale nulle part dans ces deux pages ni dans le guide de
               retenue 89-700 (pas d'entree employeePrograms).

       3. AUCUN IMPOT LOCAL SUR LE REVENU. Le guide de retenue 89-700, 25
          pages consacrees exclusivement a ce qu'un employeur mississippien
          doit retenir, ne contient AUCUNE occurrence des mots "local",
          "municipal" ou "county tax" en rapport avec un impot sur le
          revenu — seule occurrence du mot "local" dans tout le document
          concerne le lieu de travail d'un employe de maison, sans rapport
          avec la fiscalite. Meme discipline que l'Alaska/la Georgie/le
          Dakota du Nord : silence dans le document dont c'est precisement
          l'objet, retenu comme signal, recoupe par des sources tierces
          independantes (Deel, Rippling) qui confirment explicitement
          qu'aucune ville ni aucun comte du Mississippi ne leve d'impot sur
          le revenu — utilisees en RECOUPEMENT seulement, jamais comme
          source du fait lui-meme.
       ----------------------------------------------------------------------- */
    mississippi: {
      name: "Mississippi",
      abbr: "MS",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 2300,
          marriedJoint: 4600,
          headOfHousehold: 3400
        },
        personalExemption: {
          single: 6000,
          marriedJoint: 12000,
          headOfHousehold: 9500
        },
        brackets: {
          single:          [[10000, 0], [Infinity, 0.04]],
          marriedJoint:    [[10000, 0], [Infinity, 0.04]],
          headOfHousehold: [[10000, 0], [Infinity, 0.04]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       NEW HAMPSHIRE — added 2026-09-29, the 24th state. CSV SEMrush du 01/09 :
       "new hampshire paycheck calculator" KD 10, volume 880/mois, CPC 3,66 $.
       Meilleur candidat par KD croissant sur le CSV apres Mississippi (KD 11)
       parmi les Etats non deja publies et non reportes : Vermont (KD 9, mais
       CPC 0,00 $ — signal publicitaire nul, deja ecarte le 17/09 pour cette
       raison sur Wyoming), Maine (KD 9, abattement degressif selon l'AGI —
       chantier moteur a part, meme famille que Maine/South Carolina deja
       reportes), South Carolina (KD 10, meme mecanisme AGI, deja ecarte le
       17/09). New Hampshire ne souleve aucun de ces problemes : pas d'impot
       sur les salaires, aucun mecanisme degressif. SERP reelle verifiee par
       WebSearch le 2026-09-29 sur "new hampshire paycheck calculator" :
       10/10 acteurs etablis (Indeed Flex, ADP, Gusto, SmartAsset, QuickBooks,
       PaycheckCity, SurePayroll, OnPay) — porte fermee au sens strict du
       21/08, publiee quand meme sur le meme raisonnement volume/CPC que
       Virginia/Alaska/North Dakota/Wyoming/Mississippi (decision PDG du
       11/09).

       ── L'ANGLE DE CETTE PAGE ────────────────────────────────────────────
       New Hampshire est le 6e Etat du site sans impot sur le revenu du
       travail, mais avec un fait distinctif recent : jusqu'en 2024 l'Etat
       taxait les INTERETS ET DIVIDENDES (pas les salaires) a 3% ; cette taxe
       a ete integralement abrogee a compter des periodes fiscales ouvertes
       apres le 31 decembre 2024. Depuis le 1er janvier 2025, et donc pour
       toute l'annee 2026 modelisee ici, le New Hampshire n'a plus AUCUNE
       taxe sur le revenu, ni sur les salaires (jamais taxes) ni sur les
       revenus de placement (desormais abroges). C'est un angle editorial
       fort : contrairement au Wyoming/Dakota du Sud/Texas (jamais eu
       d'impot sur le revenu des salaires), le New Hampshire vient de
       *devenir* un Etat sans aucun impot sur le revenu, ce que la page
       explique.

       1. AUCUN IMPOT SUR LE REVENU DES SALAIRES (jamais eu), ET ABROGATION
          DE LA TAXE SUR LES INTERETS/DIVIDENDES EN 2025 (recente). New
          Hampshire Department of Revenue Administration, page "Taxes at a
          Glance - Interest & Dividends Tax"
          (https://www.revenue.nh.gov/taxes-glance/interest-dividends-tax),
          site bloquant les requetes automatisees directes (curl et
          PowerShell Invoke-WebRequest : HTTP 403 tous les deux, meme
          User-Agent navigateur) — lue via l'instantane Wayback Machine du
          2026-09-20 (http://web.archive.org/web/20260920113242/
          https://www.revenue.nh.gov/taxes-glance/interest-dividends-tax),
          capture verifiee HTTP 200, contenu du site officiel du DRA
          (bandeau, navigation, coordonnees identiques au site en direct),
          verbatim :
            "The State of New Hampshire does not have an income tax on an
             individual's reported W-2 wages."
            "The I&D Tax was repealed for taxable periods beginning after
             December 31, 2024."
            "Effective for taxable periods beginning after December 31,
             2024, the Interest and Dividends tax is repealed."
          Recoupement independant (WebSearch, plusieurs cabinets fiscaux
          tiers — McLane Middleton, CBIZ, Albin Randall and Bennett — tous
          confirmant la meme date d'abrogation) : utilise en RECOUPEMENT
          seulement, jamais comme source du chiffre lui-meme, conformement a
          la regle du projet.

       2. ASSURANCE CHOMAGE — ENTIEREMENT A LA CHARGE DE L'EMPLOYEUR, comme
          22 des 23 Etats deja publies (seul l'Alaska partage la charge).
          New Hampshire Employment Security (NHES), page "Employer Claims &
          Taxes" (https://www.nhes.nh.gov/employers/employer-claims-taxes),
          meme blocage HTTP 403 direct — lue via l'instantane Wayback du
          2026-01-05 (http://web.archive.org/web/20260105171503/
          https://www.nhes.nh.gov/employers/employer-claims-taxes), capture
          verifiee HTTP 200, verbatim :
            "Each new employer starts with a new employer tax rate of 2.7%
             which is paid on the first $14,000 in annual wages paid to
             each employee."
            "The New Hampshire new employer tax rate is 2.7% Minus any Fund
             Balance Reduction in place for the applicable quarter"
          Le taux 2,7% est le taux NOUVEL EMPLOYEUR avant reduction
          eventuelle liee au solde du fonds ; les employeurs etablis paient
          un taux experience-rated different. Aucune mention d'une part
          salariale nulle part sur cette page ni dans les pages liees
          (Tax Rate Chart, formulaires employeur) : la charge ne sort donc
          jamais d'un bulletin de paie (pas d'entree employeePrograms).
          Instantane date de janvier 2026 plutot que septembre : le plafond
          de 14 000 $ est stable au New Hampshire depuis 2011 (aucune
          modification legislative trouvee pour 2026 lors du recoupement
          WebSearch), retenu comme fiable pour toute l'annee 2026.

       3. AUCUN IMPOT LOCAL SUR LE REVENU. Aucune ville ni aucun comte du New
          Hampshire ne leve d'impot sur le revenu — l'absence meme d'impot
          d'Etat sur les salaires (source 1 ci-dessus) rend structurellement
          impossible une surtaxe locale assise dessus ; recoupe par les
          memes cabinets fiscaux tiers que la source 1, aucun ne mentionne
          de taxe municipale sur le revenu du travail. Meme discipline de
          prudence que l'Alaska/la Georgie/le Dakota du Nord/le Mississippi.
       ----------------------------------------------------------------------- */
    "new-hampshire": {
      name: "New Hampshire",
      abbr: "NH",
      incomeTax: { hasIncomeTax: false }
    },

    /* -----------------------------------------------------------------------
       NEW MEXICO — ajoute 2026-09-30, 25e Etat. CSV SEMrush du 01/09 :
       "new mexico paycheck calculator" KD 11. SERP reelle (WebSearch
       2026-09-30) : ADP, Indeed Flex, SmartAsset, QuickBooks, Gusto,
       Fingercheck, PaycheckCity, SurePayroll + un petit outil (treasury.sh) —
       porte quasi fermee, publie sur la decision PDG du 11/09 (volume/CPC).

       1. LE BAREME DE RETENUE 2026. "FYI-104, New Mexico Withholding Tax,
          Effective January 1, 2026" (REV. 11/2025), New Mexico Taxation and
          Revenue Department, telecharge le 2026-09-30 depuis
          https://realfile.tax.newmexico.gov/FYI-104.pdf (HTTP 200,
          780 041 octets). Table 7, « ANNUAL », page 7, pdftotext -raw ET
          -layout, colonne par colonne. Verbatim :
            (a) SINGLE   : "Not Over $ 8,050 $0.00" ; "8,050 13,550 1.5% 8,050" ;
                           "13,550 20,550 82.50 + 3.2% 13,550" ;
                           "20,550 24,550 306.50 + 3.2% 20,550" ;
                           "24,550 33,550 434.50 + 4.3% 24,550" ;
                           "33,550 41,550 821.50 + 4.3% 33,550" ;
                           "41,550 58,550 1,165.50 + 4.7% 41,550" ;
                           "58,550 74,550 1,964.50 + 4.7% 58,550" ;
                           "74,550 218,050 2,716.50 + 4.9% 74,550" ;
                           "218,050 and over 9,748.00 + 5.9% 218,050"
            (b) MARRIED  : "Not Over $ 16,100 $0.00" ; "16,100 24,100 1.5%" ;
                           "24,100 32,100 120.00 + 3.2%" ; "32,100 41,100 376.00 + 3.2%" ;
                           "41,100 57,100 664.00 + 4.3%" ; "57,100 66,100 1,352.00 + 4.3%" ;
                           "66,100 102,100 1,739.00 + 4.7%" ; "102,100 116,100 3,431.00 + 4.7%" ;
                           "116,100 331,100 4,089.00 + 4.9%" ; "331,100 and over 14,624.00 + 5.9%"
            (c) HEAD of HOUSEHOLD : "Not Over $ 12,075 $0.00" ; "12,075 20,075 1.5%" ;
                           "20,075 28,075 120.00 + 3.2%" ; "28,075 37,075 376.00 + 3.2%" ;
                           "37,075 53,075 664.00 + 4.3%" ; "53,075 62,075 1,352.00 + 4.3%" ;
                           "62,075 98,075 1,739.00 + 4.7%" ; "98,075 112,075 3,431.00 + 4.7%" ;
                           "112,075 327,075 4,089.00 + 4.9%" ; "327,075 and over 14,624.00 + 5.9%"
          RECOUPEMENT ARITHMETIQUE de chaque ligne (fait a la main le
          2026-09-30) : la base imprimee de chaque tranche egale la base de la
          precedente + largeur x taux. Single : 5 500 x 1,5 % = 82,50 ;
          7 000 x 3,2 % = 224 -> 306,50 ; 4 000 x 3,2 % = 128 -> 434,50 ;
          9 000 x 4,3 % = 387 -> 821,50 ; 8 000 x 4,3 % = 344 -> 1 165,50 ;
          17 000 x 4,7 % = 799 -> 1 964,50 ; 16 000 x 4,7 % = 752 -> 2 716,50 ;
          143 500 x 4,9 % = 7 031,50 -> 9 748,00. Married : 8 000 x 1,5 % =
          120 ; 8 000 x 3,2 % = 256 -> 376 ; 9 000 x 3,2 % = 288 -> 664 ;
          16 000 x 4,3 % = 688 -> 1 352 ; 9 000 x 4,3 % = 387 -> 1 739 ;
          36 000 x 4,7 % = 1 692 -> 3 431 ; 14 000 x 4,7 % = 658 -> 4 089 ;
          215 000 x 4,9 % = 10 535 -> 14 624. Head of household : memes
          largeurs et memes bases que Married, decalees de 12 075 au lieu de
          16 100. Les 9 lignes imprimees se replient en SIX taux distincts
          (1,5 / 3,2 / 4,3 / 4,7 / 4,9 / 5,9 %) : le tableau de l'agence
          repete le meme taux sur deux lignes consecutives.

          MODELISATION. Le moteur applique deja « revenu - deduction, puis
          tranches ». La tranche « Not Over 8 050 $ = 0 $ » de l'agence EST
          donc la "deduction standard" du moteur (8 050 / 16 100 / 12 075),
          et les tranches sont exprimees en surplus au-dessus de ce seuil :
            single          : [5 500, 16 500, 33 500, 66 500, 210 000, Inf]
            marriedJoint    : [8 000, 25 000, 50 000, 100 000, 315 000, Inf]
            headOfHousehold : [8 000, 25 000, 50 000, 100 000, 315 000, Inf]
          (ex. single : 13 550 - 8 050 = 5 500 ; 24 550 - 8 050 = 16 500 ;
          41 550 - 8 050 = 33 500 ; 74 550 - 8 050 = 66 500 ; 218 050 - 8 050
          = 210 000.) Test croise a la main : 75 000 $ single -> 2 716,50 +
          (75 000 - 74 550) x 4,9 % = 2 716,50 + 22,05 = 2 738,55 $.

          LE FAIT A NE PAS INVENTER : les montants 8 050 / 16 100 / 12 075
          sont exactement la MOITIE des deductions standard federales 2026
          (16 100 / 32 200 / 24 150) - simple constat arithmetique. FYI-104
          dit seulement que les tables "have been updated to reflect the
          standard deduction for the year" ; il ne dit PAS pourquoi la moitie,
          et la page ne l'explique pas. FYI-104 dit aussi que la retenue est
          "an estimate of an employee or individual's New Mexico income tax
          liability", credite ensuite contre l'impot reel.

          SALAIRES SUPPLEMENTAIRES (non modelises) : "If the federal
          withholding is calculated using a flat percent, a flat 5.9% of the
          supplemental wage or fringe benefit amount should be withheld for
          state tax purposes."

       2. AUCUN IMPOT LOCAL. FYI-104 (10 pages) ne contient
          aucune table locale, municipale ou de comte : recherche plein texte
          des mots local/city/county/municipal/cities -> seules occurrences
          "local district office" et "local tax offices". Meme discipline que
          la Virginie (absence dans un document officiel exhaustif) ; la page
          le dit en ces termes et ne pretend pas a une verification
          juridique exhaustive de chaque municipalite.

       3. ASSURANCE CHOMAGE - EMPLOYEUR SEUL. New Mexico Department of
          Workforce Solutions (dws.state.nm.us / dws.nm.gov : HTTP 403 a
          toute requete automatisee, curl comme WebFetch), lue via
          l'instantane Internet Archive du 2026-04-21 de
          /en-us/Unemployment/Unemployment-for-an-Individual/What-You-Should-
          Know-About-UI/UI-Taxes, verbatim : "As an employer, you pay UI taxes
          to fund UI benefits." Plafond de salaire 2026, meme site, instantane
          du 2026-06-15 de /UI-Tax-Information, verbatim : "The taxable wage
          base for wages paid during calendar year 2026 is $34,800.00".
          Aucun taux salarie n'apparait : pas d'entree employeePrograms.

       4. PAS DE PFML / SDI MODELISE. La page « Paid Family and Medical Leave
          (PFML) » du DWS, instantane du 2026-05-10, decrit uniquement un
          groupe de travail charge de formuler des recommandations
          ("a task force to develop recommendations for the enactment and
          implementation of a PFML Act") - pas un programme qui preleve des
          cotisations. FYI-104 ne liste aucune retenue de ce type. Recherche
          web (non retenue comme source du fait) : le projet HB 11 est mort en
          commission du Senat en 2025. La page reste prudente : elle dit ce
          que la page de l'Etat decrit, pas plus.

       5. FRAIS DES ACCIDENTS DU TRAVAIL (NON MODELISE, MENTIONNE). Taxation and
          Revenue Department, "Withholding Tax and Workers Compensation"
          (https://www.tax.newmexico.gov/businesses/withholding-tax-and-
          workers-compensation/, HTTP 200, lue le 2026-09-30), verbatim :
          "every employee covered by the Workers' Compensation Act, is
          assessed a fee for funding the administration of the Workers'
          Compensation Administration (Section 52-5-19 NMSA 1978)". Barème :
          Employee "prior to July 1, 2025, 2.00; beginning July 1, 2025 and
          prior to July 1, 2028, $2.25". La page TRD ne dit PAS "per quarter" ni
          "deduit du salaire" : ces deux faits viennent des instructions WC-1
          de l'agence (rpd-41108.pdf, montants perimes de 2004), verbatim "the fee is
          $4.30 per quarter for each covered employee" et "$2 should be deducted
          from the wages of the employee". 4 x 2,25 $ = 9 $ par an au maximum est
          NOTRE multiplication, dite comme telle sur la page (controle du 30/09).
          Les trois pages DWS sont liees par leur instantane Internet Archive dans
          .tooling/lib/sources.js. Non modelise :
          le moteur n'a pas de champ « dollars par trimestre », et 9 $ par an
          ne justifient pas d'en creer un ; la page le divulgue.
       ----------------------------------------------------------------------- */
    "new-mexico": {
      name: "New Mexico",
      abbr: "NM",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 8050,
          marriedJoint: 16100,
          headOfHousehold: 12075
        },
        brackets: {
          single:          [[5500, 0.015], [16500, 0.032], [33500, 0.043], [66500, 0.047], [210000, 0.049], [Infinity, 0.059]],
          marriedJoint:    [[8000, 0.015], [25000, 0.032], [50000, 0.043], [100000, 0.047], [315000, 0.049], [Infinity, 0.059]],
          headOfHousehold: [[8000, 0.015], [25000, 0.032], [50000, 0.043], [100000, 0.047], [315000, 0.049], [Infinity, 0.059]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       RHODE ISLAND - 26e Etat, ajoute 2026-09-30. Sources officielles lues le
       jour meme.

       ⚠️ COMMENT ELLES ONT ETE LUES. tax.ri.gov et dlt.ri.gov sont derriere
       Cloudflare : HTTP 403 a curl (avec User-Agent navigateur), a WebFetch, a
       Chromium headless, et a un Chrome reel visible - quatre methodes, quatre
       refus (« Performing security verification »). Les documents ont donc ete
       lus dans leurs instantanes Internet Archive (HTTP 200, octets bruts
       « id_ »), qui sont les fichiers de l'Etat eux-memes :
         - 2026 Withholding Tax Booklet (PDF, 601 205 octets), instantane du
           2026-08-04, « Updated as of 11/04/2025 » ;
         - communique DLT du 2025-12-18, instantane du 2026-04-15 ;
         - page « TDI / TCI For Employers », instantane du 2026-08-09.

       1. BAREME DE RETENUE 2026 - tax.ri.gov, « 2026 RHODE ISLAND EMPLOYER'S
          INCOME TAX WITHHOLDING TABLES » (tax.ri.gov/sites/g/files/xkgbur541/
          files/2025-12/2026%20Withholding%20Tax%20Booklet.pdf), p. 9-10.
          Verbatim : « TABLES ARE FOR ALL FILING STATUS TYPES ». Table 7 -
          ANNUAL PAYROLL PERIOD : « $0.00 PLUS 3.75% » jusqu'a 82 050 $ ;
          « 3,076.88 PLUS 4.75% » de 82 050 $ a 186 450 $ ; « 8,035.88 PLUS
          5.99% » au-dela de 186 450 $. Recoupe a la main : 82 050 x 3,75 % =
          3 076,875 (imprime 3 076,88) ; 3 076,875 + 104 400 x 4,75 % =
          8 035,875 (imprime 8 035,88). Les tables hebdomadaire, bimensuelle,
          mensuelle... donnent les memes taux. Un seul bareme pour TOUS les
          statuts : le modele n'a donc qu'une seule serie de tranches, copiee
          pour les trois statuts.

          Etapes de la methode en pourcentage (p. 9), verbatim : « (1.)
          Multiply the amount of one withholding exemption (see table above)
          by the number of exemptions and allowances claimed by the employee ;
          (2.) Subtract the amount from the employee's wages ; (3.) Determine
          the amount to be withheld from the appropriate rate table ». Montant
          annuel d'une exemption : « Annually.... $ 1,000.00 » ; « Annual wages
          are more than.... $ 290,800.00 ...... $0.00 ». Et p. 22 (RI W-4) :
          « if your annual wages exceed $290,800, your exemption amount will be
          phased out and be equal to zero ». C'est une FALAISE, pas une pente :
          a 290 800 $ pile l'exemption existe encore ; a 290 801 $ elle vaut
          0 $ (impot +60 $ d'un coup). Modelisee comme standardDeduction 1 000 $
          (UNE exemption = le salarie) + deductionPhaseOut 290 800 $, la meme
          mecanique que l'Illinois : le moteur compare « base > seuil ».
          Le calculateur ne demande pas de personnes a charge : une seule
          exemption, dite sur la page. Exemple imprime p. 9 recalcule :
          2 195,00 - 19,23 = 2 175,77 ; 1 578 x 3,75 % = 59,18 ; 597,77 x 4,75 %
          = 28,39 ; total 87,57 - le vocabulaire et l'ordre des etapes sont
          bien ceux modelises.

          Salaires supplementaires : « The Supplemental withholding rate is
          5.99%. » Non modelises, mentionnes sur la page.

       2. TDI / TCI - PART SALARIEE, MODELISEE (employeePrograms). Rhode Island
          Department of Labor and Training, communique « 2026 Tax Rates for
          Unemployment Insurance and Temporary Disability Insurance »,
          publie le 2025-12-18, verbatim : « The 2026 TDI Taxable Wage Base for
          Rhode Island employees will be $100,000 in 2026 », « The TDI
          contribution rate will be set at 1.1 percent for calendar year 2026 »,
          « The maximum TDI contribution in 2026 will be $1,100.00 » et « TDI is
          paid by employees, not employers, through a payroll tax. » Meme
          agence, page « TDI / TCI For Employers » : « Taxable Wage Base -
          $100,000 for 2026; Tax Rate - 1.1% employee wage deduction » et « TDI/
          TCI are financed entirely by payroll deductions ». Recoupement
          arithmetique fourni PAR L'AGENCE : « An individual working full-time,
          earning the minimum wage of $16.00 an hour, will pay a total of
          $366.08 in TDI contributions in 2026 » = 16 x 2 080 x 1,1 % = 366,08.
          Le communique dit aussi « TCI is not a separate state program; TCI is
          part of the TDI program » : UN SEUL prelevement couvre TDI et TCI.
          Le nombre de semaines de TCI est ecrit « seven weeks » dans le
          communique et « up to 8 weeks » sur la page employeurs : la page ne
          donne AUCUN nombre de semaines.

       3. ASSURANCE CHOMAGE - EMPLOYEUR SEUL. Meme communique, verbatim :
          « Worker benefits are funded entirely from state and federal UI taxes
          paid by Rhode Island employers. » Base salariale UI 2026 : « The 2026
          UI Taxable Wage Base for most employers will be $30,800 ». Pas
          d'entree employeePrograms pour le chomage. La « Job Development
          Assessment » (0,21 %) est aussi une charge employeur.

       4. PAS D'IMPOT LOCAL MODELISE. Le livret de retenue ne contient aucune
          table locale (les seules occurrences de « City » sont dans
          l'adresse du formulaire RI W-4). La page dit « lists no local income
          tax » et n'affirme pas avoir verifie chaque commune : aucun
          document officiel lu ne dit « Rhode Island n'a pas d'impot local sur
          le revenu » en toutes lettres.
       ----------------------------------------------------------------------- */
    "rhode-island": {
      name: "Rhode Island",
      abbr: "RI",
      incomeTax: {
        hasIncomeTax: true,
        /* Une exemption de 1 000 $ (le salarie), pas une deduction standard :
           l'agence n'en publie pas pour la retenue. Disparait au-dela de
           290 800 $ de salaire annuel (falaise). */
        standardDeduction: {
          single: 1000,
          marriedJoint: 1000,
          headOfHousehold: 1000
        },
        deductionPhaseOut: {
          single: 290800,
          marriedJoint: 290800,
          headOfHousehold: 290800
        },
        brackets: {
          single:          [[82050, 0.0375], [186450, 0.0475], [Infinity, 0.0599]],
          marriedJoint:    [[82050, 0.0375], [186450, 0.0475], [Infinity, 0.0599]],
          headOfHousehold: [[82050, 0.0375], [186450, 0.0475], [Infinity, 0.0599]]
        }
      },
      employeePrograms: [
        { label: "RI TDI/TCI (1.1%)", rate: 0.011, wageCap: 100000 }
      ]
    },

    /* -----------------------------------------------------------------------
       COLORADO - 27e Etat, ajoute 2026-09-30. Sources officielles lues le jour
       meme. tax.colorado.gov, famli.colorado.gov et cdle.colorado.gov
       repondent 403 a curl et a WebFetch : les documents ont ete lus dans
       leurs instantanes Internet Archive (octets bruts, `id_`, parfois
       gzip : `gunzip` puis pdftotext) ; les pages des villes (denvergov.org,
       auroragov.org, greenwoodvillage.com) repondent 200 en direct.

       1. L'IMPOT. Colorado Department of Revenue, « DR 1098 (10/21/25) - 2026
          Colorado Withholding Worksheet for Employers » (PDF, instantane
          Internet Archive du 2026-08-23 ; https://tax.colorado.gov/sites/tax/
          files/documents/DR_1098_Colorado_Withholding_Worksheet_for_Employees.pdf).
          Verbatim :
            « 1c Multiply line 1a by line 1b [annualized wages] »
            « 2a ... enter the appropriate amount based on the employee's
              expected filing status from IRS form W-4 Step 1(c): $11,000 if
              married filing jointly or qualifying surviving spouse; or
              $5,500 otherwise »
            « 2b Subtract line 2a from line 1c. If zero or less, enter zero »
            « 2c Multiply line 2b by 4.40% (0.044) »
          => retenue annuelle = max(0, salaire annualise - allocation) x 4,4 %.
          UN SEUL TAUX (plat), allocation 5 500 $ (celibataire ET chef de
          famille : « otherwise ») ou 11 000 $ (couple marie, declaration
          commune). Le moteur le modelise avec standardDeduction + un seul
          palier a 4,4 % : aucun mecanisme nouveau.

          ⚠️ C'EST UNE RETENUE, PAS L'IMPOT FINAL. Le revenu imposable
          Colorado part du revenu imposable FEDERAL (Individual Income Tax
          Guide, Part 2 : « Colorado imposes an income tax on the modified
          federal taxable income »), donc de la deduction standard federale
          (16 100 $ celibataire) et non de 5 500 $. Le DR 0004 le dit : la
          retenue calculee d'apres le W-4 « will generally result in a refund
          when you file your Colorado income tax return » (instantane du
          2026-02-08). Ce calculateur montre la RETENUE (ce que l'employeur
          prend de chaque paie), comme New Mexico et Rhode Island.
          Formulaire DR 0004 facultatif (Table 1, 1 emploi) : 14 000 $
          celibataire / 22 000 $ chef de famille / 30 000 $ couple marie.
          Non modelise ; dit sur la page.

       2. LE TAUX, PAR ANNEE. Colorado Individual Income Tax Guide (instantane
          du 2026-04-26), « Colorado Income Tax Rates » : 2019 4.5 % ; 2020
          4.55 % ; 2021 4.5 % ; 2022 4.4 % ; 2023 4.4 % ; 2024 4.25 % ; 2025
          4.4 %. Phrase : « The Colorado income tax rate varies by tax year. »
          La table s'arrete a 2025 : le 4,40 % de 2026 vient du DR 1098, pas de
          cette table. On N'ATTRIBUE PAS la baisse de 2024 a une cause (TABOR
          n'est pas nomme dans la table).

       3. FAMLI (assurance conges familiaux et medicaux) - PART SALARIEE.
          famli.colorado.gov/employers (instantane du 2026-01-18), verbatim :
            « The premiums are set to 0.88% of the employee's wage, with 0.44%
              paid by the employer and 0.44% paid by the employee. Some
              employers may choose not to deduct any premiums contributions
              from their employees' wages. »
            « Premiums are paid on wages up to the Federal Social Security
              Wage Cap. »
            « ... (0.44% of an employee's gross wages.) »
            « It is important to know employees are never required to pay more
              than 50% of the total premium. »
          Plafond = base salariale Social Security 2026 (184 500 $, meme
          valeur que fica.socialSecurity.wageBase ci-dessus ; un test egalise
          les deux). Maximum annuel = 0,0044 x 184 500 = 811,80 $.
          Hypothese du moteur : l'employeur deduit la part salariee.

       4. CHOMAGE - EMPLOYEUR SEUL. CDLE, « Premium Rates » (instantane du
          2025-12-05) : « Employers must pay annual premiums on the chargeable
          wages for each of their employees each calendar year. » ; base 2026 :
          « The 2026 chargeable wage base increased to $30,600 ». Pas
          d'entree employeePrograms pour le chomage.

       5. IMPOTS LOCAUX - NON MODELISES (montants fixes par mois, pas un
          pourcentage : le moteur ne sait pas les exprimer).
          - Denver, Tax Guide Topic No. 61 (PDF, 200 en direct, « Revised
            1/2021 ») : « ... liable for the Employee OPT to be withheld by the
            employer at a rate of $5.75 per month » pour un salarie qui recoit
            « at least five hundred dollars ($500) for a calendar month ».
          - Greenwood Village (greenwoodvillage.com, 200 en direct, 2026-09-30) :
            « Both portions are $2 per month for a total of $4 per month, and
            both apply when $250 or more is earned in a calendar month. »
          - Aurora (auroragov.org, 200 en direct, 2026-09-30) : « The city of
            Aurora Occupational Privilege Tax will be repealed effective Jan. 1,
            2025. » => PLUS de taxe a Aurora. Glendale et Sheridan : non lus,
            non cites.

       6. SALAIRES. Wage Withholding Tax Guide (Jan 2026, instantane du
          2026-02-28) : « Wages subject to Colorado wage withholding
          generally include any overtime compensation that may be exempted
          from federal withholding requirements under the One Big Beautiful
          Bill Act. » Le DR 1098 n'a AUCUNE ligne de taux supplementaire pour
          les primes. 401(k) : le guide ne le traite pas ; choix de modelisation
          (ordre federal), dit sur la page.
       ----------------------------------------------------------------------- */
    colorado: {
      name: "Colorado",
      abbr: "CO",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 5500,
          marriedJoint: 11000,
          headOfHousehold: 5500
        },
        brackets: {
          single:          [[Infinity, 0.044]],
          marriedJoint:    [[Infinity, 0.044]],
          headOfHousehold: [[Infinity, 0.044]]
        }
      },
      employeePrograms: [
        { label: "CO FAMLI (0.44%)", rate: 0.0044, wageCap: 184500 }
      ]
    },

    /* -----------------------------------------------------------------------
       ARIZONA - 28e Etat, ajoute 2026-10-02. Sources officielles lues le jour
       meme. azdor.gov et des.az.gov repondent 403 (Cloudflare) a curl, a
       WebFetch et a Chrome pilote : les documents ont ete lus dans leurs
       instantanes Internet Archive (octets bruts, `id_`, parfois gzip). Le
       texte de loi azleg.gov repond 200 en direct.

       1. LA RETENUE EST UN POURCENTAGE CHOISI PAR LE SALARIE, PAS UN BAREME.
          Arizona Form A-4, « Employee's Arizona Withholding Election 2026 »
          (ADOR 10121 (25) ; PDF, instantane du 2026-07-05 ; https://azdor.gov/
          sites/default/files/document/FORMS_WITHHOLDING_2026_A-4_f.pdf).
          Verbatim :
            « 1 Withhold from gross taxable wages at the percentage checked
              (check only one percentage): 0.5% 1.0% 1.5% 2.0% 2.5% 3.0% 3.5% »
            « If you do not give this form to your employer the department
              requires your employer to withhold 2.0% of your gross taxable
              wages. »
            « ... your "gross taxable wages" are the wages that will generally
              be in box 1 of your federal Form W-2. It is your gross wages less
              any pretax deductions, such as your share of health insurance
              premiums. »
          Page ADOR « Withholding Tax - Individual » (instantane du
          2026-08-27) : « If you as the new employee fails to complete Arizona
          Form A-4 within 5 days of hire, the employer must withhold Arizona
          income tax at the rate of 2.0% until you elects a different
          withholding rate. » et « Rates are a percentage of gross taxable
          wages. »
          A.R.S. 43-401(E) (azleg.gov, 200 en direct le 2026-10-02) : « Any
          employee failing to complete an election form as prescribed shall be
          deemed to have elected the withholding percentage prescribed by the
          department. »
          => LE MOTEUR MODELISE LE DEFAUT : 2,0 % de la paie apres cotisations
          avant impot (401(k)), pas de deduction, un seul palier, identique
          pour les trois statuts. Un salarie qui a rempli un A-4 avec un autre
          pourcentage (0,5 a 3,5 %) a une retenue differente : la page le dit
          et donne le tableau des sept choix a 75 000 $.

          Autres phrases du A-4 2026 / de la page ADOR utilisees par la page
          (relues le 2026-10-02 dans les PDF/HTML bruts) : « You may elect an
          Arizona withholding percentage of zero if you expect to have no
          Arizona income tax liability for the current year. Arizona tax
          liability is gross tax liability less any tax credits, such as the
          family tax credit, school tax credits, or credits for taxes paid to
          other states. » ; « Zero withholding does not relieve you from paying
          Arizona income taxes that might be due at the time you file ... you
          should promptly file a new Form A-4 and choose a withholding
          percentage that applies to you. » ; « To keep this election for the
          next calendar year, you must give your employer an updated Form A-4.
          If you do not, your employer may withhold Arizona income tax from
          your wages and salary until you submit an updated Form A-4. » ;
          « Check this box and enter an extra amount to be withheld from each
          paycheck » ; « The amount withheld is a percentage of your gross
          taxable wages from every paycheck » ; « Arizona law requires your
          employer to withhold Arizona income tax from your wages for work done
          in Arizona. » ; paragraphe « Voluntary Withholding Election by Certain
          Nonresident Employees » ; page ADOR : « The Arizona Form A-4 should not
          be submitted to ADOR. »

          Nonresidents (A-4 2026, verbatim) : « Compensation earned by
          nonresidents while physically working in Arizona for temporary periods
          is subject to Arizona income tax. However, under Arizona law,
          compensation paid to certain nonresident employees is not subject to
          Arizona income tax withholding. These nonresident employees need to
          review their situations and determine if they should elect to have
          Arizona income taxes withheld from their Arizona source compensation.
          Nonresident employees may request that their employer withhold Arizona
          income taxes by completing this form to elect Arizona income tax
          withholding. » Changement de situation : « ... if at any time during
          the current year conditions change so that you expect to have a tax
          liability, you should promptly file a new Form A-4 and choose a
          withholding percentage that applies to you. »

       2. L'IMPOT LUI-MEME. Meme page ADOR (2026-08-27) : « Keep in mind for
          tax year 2023 and beyond, the tax rate for Arizona taxable income is
          2.5% . » Form 140 Resident Personal Income Tax Return, instructions
          2025 (instantane du 2026-05-13), ligne 46 : « Multiply line 45 by
          2.5% (.025) and enter the result. » Deduction standard 2025 : single
          15 750 $ (« Single $ 15,750 »), mariage declaration commune 31 500 $,
          chef de famille 23 625 $. AUCUNE valeur 2026 de la deduction
          standard n'a ete lue : l'exemple de la page est donc declare « avec
          la deduction 2025 ». NON modelise dans le moteur (la retenue n'en
          depend pas).

       3. CHOMAGE - EMPLOYEUR SEUL. DES, « Payment Taxes - Overview »
          (instantane du 2025-10-30) : « State unemployment taxes are used
          solely for the payment of unemployment benefits and cannot be
          withheld from employees' wages. » Base : « Taxable wages are the
          first $8,000 ($7,000 in gross wages before January 1, 2023) in gross
          wages paid to each employee in a calendar year. » Page « Unemployment
          - Employer » (instantane du 2026-09-07) : « In Arizona, you are
          currently required by law to pay UI taxes on the first $8,000 in
          gross wages paid to each of your employees in a calendar year. »
          Pas d'entree employeePrograms.

       4. CE QUI N'EST PAS DANS LES SOURCES LUES : aucune prime d'invalidite
          ou de conge familial salariee (ni le A-4, ni la page de retenue, ni
          les instructions employeur n'en parlent ; l'absence n'est pas une
          preuve, la page le formule « we found no ») ; aucun impot local sur
          le revenu (la page ADOR de retenue ne decrit qu'un pourcentage
          d'Etat). Primes / heures sup : le A-4 parle de « gross taxable
          wages » (case 1 du W-2) sans regle distincte : non modelise,
          mentionne.
       ----------------------------------------------------------------------- */
    arizona: {
      name: "Arizona",
      abbr: "AZ",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: 0,
        brackets: {
          single:          [[Infinity, 0.02]],
          marriedJoint:    [[Infinity, 0.02]],
          headOfHousehold: [[Infinity, 0.02]]
        }
      }
    },

    /* -----------------------------------------------------------------------
       NEW JERSEY - 29e Etat, ajoute 2026-10-02. Les documents de la Division
       of Taxation (nj.gov/treasury/taxation) et du Department of Labor
       (nj.gov/labor) repondent 200 EN DIRECT, a curl avec un User-Agent de
       navigateur : lus dans leurs octets reels le 2026-10-02, pas dans
       Internet Archive.

       1. LA RETENUE. NJ-WT « New Jersey Income Tax Withholding Instructions »
          (revision « September 2025 », fichier nj.gov/treasury/taxation/pdf/
          current/njwt.pdf, Last-Modified 2025-12-03), p. 24, verbatim :
            « Withhold at Rate A  If Box 1 or 3 on Line 2 (Filing Status) is checked »
            « Withhold at Rate B  If Box 2, 4 or 5 is checked and Line 3 is blank »
            « Withhold at Rate Selected  If employee completes Line 3 »
          Allocation par periode : « Annual  $1,000 » (hebdo 19,20 $, mensuel
          83,30 $). Calcul : « Multiply the proper withholding allowance ...
          by the number of exemptions claimed by the employee ; Subtract this
          amount from the wages for the period to determine wages subject to
          withholding ; Refer to the New Jersey Withholding Rate Tables ».
          Cases du NJ-W4 : 1 Single, 2 Married/Civil Union Couple Joint,
          3 Married/Civil Union Partner Separate, 4 Head of Household,
          5 Qualifying Widow(er). => Single -> Table A ; Married joint et Head
          of Household -> Table B (ligne 3 vide).

       2. LES BAREMES. « TABLES FOR PERCENTAGE METHOD OF WITHHOLDING -
          Applicable to Wages, Salaries, and Commissions Paid on and after
          October 1, 2020 » (nj.gov/treasury/taxation/pdf/withholdingtables.pdf,
          lien direct du NJ-WT p. 24 ; Last-Modified 2022-03-22), table
          ANNUELLE, relue dans l'image du PDF le 2026-10-02 et recoupee dans le
          NJ-W4 (1-21, nj.gov/treasury/taxation/pdf/current/njw4.pdf, Last-
          Modified 2024-12-10), qui reimprime les memes tables A a E :
            Rate A (Single, Married separate) :
              0 - 20 000 : 1,5 % ; 20 000 - 35 000 : 300 + 2,0 % ;
              35 000 - 40 000 : 600 + 3,9 % ; 40 000 - 75 000 : 795 + 6,1 % ;
              75 000 - 500 000 : 2 930 + 7,0 % ; 500 000 - 1 000 000 :
              32 680 + 9,9 % ; au-dela : 82 180 + 11,8 %.
            Rate B (Married joint, Head of household, Qualifying widow(er)) :
              0 - 20 000 : 1,5 % ; 20 000 - 50 000 : 300 + 2,0 % ;
              50 000 - 70 000 : 900 + 2,7 % ; 70 000 - 80 000 : 1 440 + 3,9 % ;
              80 000 - 150 000 : 1 830 + 6,1 % ; 150 000 - 500 000 :
              6 100 + 7,0 % ; 500 000 - 1 000 000 : 30 600 + 9,9 % ; au-dela :
              80 100 + 11,8 %.
          Chaque montant de base imprime a ete RECOUPE A LA MAIN (base
          precedente + largeur x taux) : les 15 sont coherents, donc des
          tranches marginales ordinaires les reproduisent exactement. Les
          tables C, D et E (deux revenus, NJ-W4 ligne 3 + « Wage Chart ») ne
          sont PAS modelisees ; dit sur la page.
          ⚠️ CES TAUX DE RETENUE (1,5 % a 11,8 %) NE SONT PAS LES TAUX DE
          L'IMPOT : NJ-1040 2025 instructions (nj.gov/treasury/taxation/pdf/
          current/1040i.pdf, Last-Modified 2025-12-03), « New Jersey Tax Rate
          Schedules 2025 », Table A : .014 / .0175 / .035 / .05525 / .0637 /
          .0897 / .1075 ; Table B : .014 / .0175 / .0245 / .035 / .05525 /
          .0637 / .0897 / .1075. Le calculateur affiche la RETENUE.

       3. ALLOCATIONS (« exemptions »). Le NJ-W4 dit seulement « Total number
          of allowances you are claiming (see instructions) » ; aucun document
          lu ne dit combien en reclamer. MODELISATION : 1 allocation (1 000 $)
          pour Single et Head of household, 2 (2 000 $) pour Married joint -
          les memes exemptions que la ligne 6 de la NJ-1040 2025 (« You can
          claim a $1,000 exemption for yourself and your spouse/CU partner (if
          filing a joint return) »). Choix de modelisation, dit sur la page.
          Moteur : standardDeduction par statut (mecanique de Rhode Island).

       4. 401(k). NJ-WT p. 6 : « 401(k) contributions up to the federal limit »
          est dans la liste « Compensation Not Subject to Withholding », et
          p. 6 « Employee contributions to retirement plans other than a 401(k)
          in the year they are made » est dans celle des remunerations soumises.
          => le versement 401(k) reduit la base de l'Etat (comportement par
          defaut du moteur ; pas de taxesRetirementDeferrals). Au-dela de la
          limite federale : non modelise.

       5. PROGRAMMES SALARIES 2026 (NJ DOL, « Rate information, contributions,
          and due dates », nj.gov/labor/ea/employer-services/rate-info, lu le
          2026-10-02), ligne « Worker » : « U.I. D.I. W.F./S.W.F. F.L.I
          0.003825 0.0019 0.000425 0.0023 January 1, 2026 to December 31,
          2026 ». Bases : « 2026 Taxable Wage Base ( UI and WF/SWF - workers
          and employers, TDI - employers): $44,800 » ; « 2026 Taxable Wage Base
          (TDI , FLI - workers only): $171,100 » (communique NJDOL du
          2025-12-29, memes chiffres). NJ-WT p. 16 liste, dans la case 16 du W-2,
          « Unemployment Insurance Withholding », « Supplemental Workforce
          Fund », « Workforce Development Partnership Fund », « Disability
          Insurance » et « Family Leave Insurance (FLI) Contributions ».
          => 3 entrees : chomage + fonds de formation 0,3825 % + 0,0425 % =
          0,425 % sur 44 800 $ (max 190,40 $) ; SDI 0,19 % sur 171 100 $
          (max 325,09 $) ; FLI 0,23 % sur 171 100 $ (max 393,53 $).
          Hypothese du moteur : l'employeur deduit les trois ; les plans prives
          (SDI) ne sont pas modelises.

       6. NON MODELISE : primes (NJ-WT : « Total the employee's regular wage
          and supplemental wages and withhold at the appropriate rate based on
          the combined payment » si versees en meme temps ; sinon « Withhold
          from the supplemental wages without any exemption allowances » ;
          aucun taux forfaitaire), NJ-W4 lignes 3 (table C-E), 5 (montant
          supplementaire) et 6 (EXEMPT), reciprocite NJ-PA (NJ-165).
          AUCUN IMPOT LOCAL SUR LE REVENU decrit dans le NJ-WT (seules des
          taxes locales de Pennsylvanie y sont mentionnees) : la page dit « we
          found no », jamais « New Jersey has no ».
       ----------------------------------------------------------------------- */
    "new-jersey": {
      name: "New Jersey",
      abbr: "NJ",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 1000,
          marriedJoint: 2000,
          headOfHousehold: 1000
        },
        brackets: {
          single:          [[20000, 0.015], [35000, 0.02], [40000, 0.039], [75000, 0.061],
                            [500000, 0.07], [1000000, 0.099], [Infinity, 0.118]],
          marriedJoint:    [[20000, 0.015], [50000, 0.02], [70000, 0.027], [80000, 0.039],
                            [150000, 0.061], [500000, 0.07], [1000000, 0.099], [Infinity, 0.118]],
          headOfHousehold: [[20000, 0.015], [50000, 0.02], [70000, 0.027], [80000, 0.039],
                            [150000, 0.061], [500000, 0.07], [1000000, 0.099], [Infinity, 0.118]]
        }
      },
      employeePrograms: [
        { label: "NJ unemployment and workforce (0.425%)", rate: 0.00425, wageCap: 44800 },
        { label: "NJ disability insurance (0.19%)", rate: 0.0019, wageCap: 171100 },
        { label: "NJ family leave insurance (0.23%)", rate: 0.0023, wageCap: 171100 }
      ]
    },

    /* =======================================================================
       MASSACHUSETTS  -  lu le 2026-10-02 (mass.gov refuse curl/WebFetch : 403,
       donc Internet Archive, octets bruts `id_`, instantanes cites ci-dessous)
       -----------------------------------------------------------------------
       1. LA METHODE DE RETENUE. Massachusetts Circular M, « Income Tax
          Withholding Tables at 5.0% Effective January 1, 2026 », Rev. 12/25
          (PDF, instantane 2026-03-12 :
          web.archive.org/web/20260312193631id_/https://www.mass.gov/doc/
          massachusetts-circular-m-income-tax-withholding-tables-at-50-
          effective-january-1-2026/download). Couverture : « Percentage Method
          Tables updated to include 4% Surtax. » Page 12, « Percentage Methods
          for Wages (Not Including Supplemental Wage Payments) Paid from
          January 1, 2026 » :
            « 1. Subtract the amount deducted for the U.S. Social Security
              (FICA), Medicare, Massachusetts, United States or Railroad
              Retirement systems. The total amount subtracted may not exceed
              $2,000. »
            « 2. Subtract the total of the exemption factors »
            « 3. ... multiply the result by the number of periods in the year »
            « 4. ... If the result from step 3 is more than $1,107,750*,
              multiply that portion of the result in excess of $1,107,750 by
              9%. Then multiply that portion ... that does not exceed
              $1,107,750 by 5%. »
            « * This is the 2026 inflation-adjusted threshold for the 4%
              surtax. »
            « 6. If the employee will file as head of household ... subtract
              the head of household tax value ... annually: $120.00 »
            « Do not withhold from employees who claim one or more exemptions
              if their wages are less than: ... annually: $8,000. »
          Facteurs d'exemption annuels : « Claiming "1" ... f. Annually
          $4,400 » ; « more than "1" : $1,000 multiplied by number claimed,
          plus $3,400 ». « A claimed spouse counts as "4" exemptions »
          (en-tete des tables a tranches) -> salarie + conjoint = 5 exemptions
          = 1 000 x 5 + 3 400 = 8 400 $.
          VERIFICATION INDEPENDANTE (2026-10-02) : la table hebdomadaire de
          retenue du meme PDF (102 lignes de 10 $, 0 a 10 exemptions, 1 122
          cellules, lue en `pdftotext -raw`) est reproduite a 0,005 $ pres par
          cette formule annualisee (FICA deduite min(2 000/52, 7,65 % x milieu
          de ligne), exemptions (1 000 x n + 3 400)/52, 5 %) : 0 ecart > 0,011.
          Le 5 %, le plafond de 2 000 $ et les exemptions sont donc recoupes
          par l'agence elle-meme, pas seulement lus.
       2. MODELISATION.
          - taux : 5 % jusqu'a 1 107 750 $, 9 % au-dela (surtaxe de 4 %), les
            trois statuts.
          - deduction : exemptions 4 400 $ (celibataire, chef de famille) ou
            8 400 $ (couple : 5 exemptions). Hypothese dite sur la page : le
            conjoint n'a pas de salaire soumis a retenue et ne reclame pas
            sa propre exemption ; aucune personne a charge (le calculateur ne
            demande pas de nombre).
          - FICA deduite : ficaDeduction.cap = 2 000 (nouveau mecanisme du
            moteur : min(2 000, Social Security + Medicare retenus)).
            Le Circular dit « the total amount subtracted » : tout salaire
            annuel > ~26 144 $ en deduit donc 2 000 $. NB : « Massachusetts »
            dans cette liste designe les regimes de retraite de l'Etat, pas
            le PFML : le PFML n'est pas deduit.
          - chef de famille : credit de 120 $/an sur l'impot (etape 6), exprime
            par taxCredit (base 120, aucune extinction), plancher 0.
          - plancher : noWithholdingBelow 8 000 $ (nouveau mecanisme) : sous
            8 000 $ de salaire annuel, rien n'est retenu.
          - NON MODELISE : personnes a charge (exemption 1 000 $ chacune ;
            +1 si un enfant de moins de 12 ans, M-4), aveugle (110 $ de
            credit), etudiant (M-4 D), primes (Circular M, section G :
            5 % ou 9 % selon le cumul), pensions (M-4P).
       3. EXEMPTIONS ET M-4. Form M-4 (Rev. 3/24, instantane 2026-08-03,
          URL telle que lue, avec son suffixe) : « Your personal exemption.
          Enter "1" », « If married and if exemption for spouse is allowed,
          enter "4" in line 2 », « If you are married and if your spouse is
          subject to withholding, each may claim a personal exemption. »
       4. PROGRAMMES SALARIES 2026 - PFML. DFML, « Paid Family and Medical
          Leave employer contribution rates and calculator » (instantane
          2026-09-16 ; « Last updated: July 10, 2026 ») :
            « Employers with 25 or more covered individuals must send to DFML
            a contribution of 0.88% of eligible wages. ... Family leave Up to
            100% of the family leave contribution can be withheld from a
            covered individual's wages (0.18% of eligible wages). Medical
            leave Up to 40% of the medical leave contribution can be withheld
            from a covered individual's wages (0.28% of eligible wages). »
            Employeurs de moins de 25 : medical « Up to 100% ... (0.28%) ».
            « Individual contributions are capped by the Social Security
            taxable maximum. »
          -> 0,28 % + 0,18 % = 0,46 % MAXIMUM retenable, dans les deux
          tailles d'employeur, jusqu'au plafond Social Security (184 500 $).
          Un employeur PEUT prendre une part plus grande : 0,46 % est le plus
          que le salarie puisse payer. La page dit « up to ». La meme page
          annonce « New Massachusetts legislation (Chapter 101 of the Acts of
          2026) shifts employer contributions from medical leave to family
          leave, effective January 1, 2027 » : hors 2026, mentionne seulement.
       5. CHOMAGE ET AUTRES CONTRIBUTIONS. DUA, « Learn about employer
          contributions to DUA » (instantane 2025-12-13) : « Unemployment
          insurance (UI) contributions ... Subject employers are required by
          law to make quarterly UI contributions to the state UI Trust Fund »,
          EMAC (Employer Medical Assistance Contribution) et Workforce
          Training Fund sont aussi des contributions d'EMPLOYEUR. Aucune
          retenue salariale de chomage n'y est decrite -> non modelisee, dit
          « we found no worker-paid ... ».
       6. 401(k). DOR, « Massachusetts non-government pensions » (instantane
          2024-03-31) : « Contributions you made to your 401(k) plan or CODA
          through elective deferrals of your current compensation, other than
          contributions to a Roth 401(k) ... are excluded from your
          Massachusetts gross income for the year paid to the same extent as
          they are excluded from your federal gross income ». Le Circular M ne
          parle pas du 401(k) : choix de modelisation (le versement reduit la
          base, comportement par defaut du moteur), dit sur la page.
       7. IMPOT LOCAL. Aucun document lu (Circular M, M-4) ne decrit un impot
          local sur le revenu : la page dit « we found no », jamais
          « Massachusetts has no ».
       ----------------------------------------------------------------------- */
    massachusetts: {
      name: "Massachusetts",
      abbr: "MA",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 4400,
          marriedJoint: 8400,
          headOfHousehold: 4400
        },
        ficaDeduction: { cap: 2000 },
        noWithholdingBelow: 8000,
        taxCredit: {
          base: { single: 0, marriedJoint: 0, headOfHousehold: 120 },
          phaseOutStart: { single: 0, marriedJoint: 0, headOfHousehold: 0 },
          phaseOutRate: 0
        },
        brackets: {
          single:          [[1107750, 0.05], [Infinity, 0.09]],
          marriedJoint:    [[1107750, 0.05], [Infinity, 0.09]],
          headOfHousehold: [[1107750, 0.05], [Infinity, 0.09]]
        }
      },
      employeePrograms: [
        { label: "MA paid family and medical leave (0.46%)", rate: 0.0046, wageCap: 184500 }
      ]
    },

    /* =======================================================================
       MINNESOTA  -  lu le 2026-10-06 (revenue.state.mn.us et mn.gov/deed
       repondent 200 ; pl.mn.gov repond 405 « confirm you are human » a un
       navigateur headless : la page du Paid Leave est lue dans l'instantane
       Internet Archive cite plus bas, octets bruts `id_`)
       -----------------------------------------------------------------------
       1. LA METHODE DE RETENUE. Minnesota Department of Revenue, « 2026
          Minnesota Income Tax Withholding Instruction Booklet and Tax Tables
          - Start using this booklet Jan. 1, 2026 » (PDF, 77 pages,
          https://www.revenue.state.mn.us/sites/default/files/2025-12/
          wh-inst-26.pdf, telecharge et lu en `pdftotext` le 2026-10-06),
          page 34, « Computer Formula » : « This formula supersedes any
          formulas before Jan. 1, 2026. »
            Step 2 : salaire annuel = salaire x periodes par an.
            Step 3 : « Multiply the number of the employee's withholding
                     allowances by $5,300. »
            Step 4 : « Subtract the result in step 3 from the result in step
                     2. If zero or less, stop here. There is no tax to
                     withhold. »
            Step 6 : « You may round the amount to the nearest dollar. »
          « Chart for Step 5 » (resultat de l'etape 4 -> impot annuel) :
            celibataire : 4 700 a 38 010 : (x - 4 700) x 5,35 % ;
                          38 010 a 114 130 : 1 782,09 + 6,80 % de l'exces ;
                          114 130 a 207 850 : 6 958,25 + 7,85 % ;
                          au-dela de 207 850 : 14 315,27 + 9,85 %.
            marie       : 14 700 a 63 400 : (x - 14 700) x 5,35 % ;
                          63 400 a 208 180 : 2 605,45 + 6,80 % ;
                          208 180 a 352 630 : 12 450,49 + 7,85 % ;
                          au-dela de 352 630 : 23 789,82 + 9,85 %.
          Les colonnes « Add » se recoupent entre elles : 33 310 x 5,35 % =
          1 782,09 ; 1 782,09 + 76 120 x 6,80 % = 6 958,25 ; etc. (idem marie).
          VERIFICATION INDEPENDANTE (2026-10-06) : les tables imprimees du
          meme PDF (hebdomadaire, toutes les 2 semaines, 2 fois par mois,
          mensuelle, celibataire et marie, 11 colonnes de 0 a 10 allocations)
          sont reproduites par cette formule annualisee au milieu de chaque
          ligne : 6 666 valeurs lues (606 lignes de 20 $ de large ou moins x 11
          colonnes), ecart maximal 0,4996 $, c'est-a-dire que chaque valeur
          imprimee est la valeur de la formule arrondie au dollar. 66 valeurs
          (6 lignes) sont ecartees : `pdftotext` y inverse les bornes basse et
          haute (la borne haute lue inferieure a la basse), ce qui est un defaut
          de lecture du PDF, pas un autre taux. Le 5,35 %, le 6,80 %, le 7,85 %,
          le 9,85 %, les seuils et les 5 300 $ sont donc recoupes par l'agence elle-meme.
       2. LES ALLOCATIONS. Form W-4MN 2026 (Rev. 4/26,
          https://www.revenue.state.mn.us/sites/default/files/2026-04/
          w-4mn.pdf, lu le 2026-10-06), Section 1 : « A Enter "1" if no one
          else can claim you as a dependent » ; « B Enter "1" if ... You are
          single and have only one job / You are married, have only one job,
          and your spouse does not work » ; « C Enter "1" if you are married,
          or enter "0" if you are married and have either a working spouse or
          more than one job » ; « E Enter "1" if you will use the filing
          status Head of Household ». « If no Form W-4MN is in effect, the
          number of withholding allowances claimed will be zero. » Le booklet
          (p. 3) : « If the employee does not complete a Form W-4MN, you must
          withhold tax at the single filing status with zero allowances. »
          Le Department ne publie que deux tables (celibataire, marie) : un
          chef de famille non marie utilise la table celibataire avec une
          allocation de plus (etape E).
       3. MODELISATION.
          - celibataire : A + B = 2 allocations = 2 x 5 300 = 10 600 $.
          - marie, un seul emploi, conjoint sans salaire : A + B + C = 3
            allocations = 15 900 $, table « married ».
          - chef de famille : A + B + E = 3 allocations = 15 900 $, table
            « single ».
          - aucune personne a charge (etape D), aucune deduction detaillee
            (feuille « Itemized Deductions »), aucun revenu hors salaire.
          - la tranche a 0 % (0 a 4 700 $ celibataire, 0 a 14 700 $ marie) est
            modelisee comme une premiere tranche a taux 0.
          - NON MODELISE : le choix « Married, but withhold at higher Single
            rate », les allocations de deux emplois, la retenue
            supplementaire de la ligne 2 de la W-4MN, l'arrondi au dollar
            facultatif de l'etape 6, la retenue forfaitaire de 6,25 % sur les
            versements supplementaires (primes, heures supplementaires payees
            a part : booklet p. 7).
       4. 401(k). Minnesota Statutes 290.92, subd. 1 (1) (revisor.mn.gov, lu le
          2026-10-06) : « For purposes of this section, the term "wages" means
          the same as that term is defined in section 3401(a), (f), and (i) of
          the Internal Revenue Code. » Le moteur retranche donc le 401(k) classique
          de la base, comme pour l'impot federal. Choix de modelisation dit sur
          la page : le booklet lui-meme ne parle pas du 401(k) des salaries ; la
          page dit « same treatment », sans affirmer que l'IRC 3401 l'exclut.
       5. PAID LEAVE (Minnesota Paid Leave, DEED). pl.mn.gov, « Premium rate
          and contributions », instantane Internet Archive 2026-07-31
          (web.archive.org/web/20260731171530id_/https://pl.mn.gov/resources/
          calculators/premium-rate-and-contributions) :
            « For 2026 and 2027, the Paid Leave premium rate is 0.88%. This
            rate covers Family Leave (0.27%) and Medical Leave (0.61%). »
            « Employers can collect up to 0.44% of wages from employees to
            cover their portion of the premium. Employers can choose to cover
            more of the premium for some or all of their employees. »
            « Premiums are capped at the Old-Age, Survivors, and Disability
            Insurance (OASDI) limit. ... For Paid Leave, this means wages up
            to $185,000 are subject to premiums. »
            Petits employeurs : taux reduit de 0,66 % ; « The maximum
            contribution from employees in this case is the same as an
            employee of a large employer. »
          -> 0,44 % MAXIMUM retenable. PLAFOND : la page de l'agence dit
          « wages up to $185,000 » (arrondi : son code archive contient
          OASDI_LIMIT_2025 = 176000 pour 176 100 reels), mais la LOI dit,
          Minn. Stat. 268B.14 subd. 4 (revisor.mn.gov, lu le 2026-10-06) :
          « The maximum wages subject to premium in a calendar year is equal
          to the maximum earnings in that year subject to the FICA Old-Age,
          Survivors, and Disability Insurance tax. » -> 184 500 $ en 2026
          (releve par le controle independant). Le moteur applique la loi.
          « Up to » : un employeur peut prendre moins.
       6. CHOMAGE. mn.gov/deed, « Unemployment Insurance » (lu le 2026-10-06) :
          « Employers with covered employment must pay quarterly unemployment
          insurance tax into the Minnesota Unemployment Insurance Trust Fund
          ... This tax is a percentage of the taxable wages paid to employees
          and may not be withheld from employee wages. » -> aucune retenue de
          chomage salariee.
       7. IMPOT LOCAL. Aucun document lu (booklet, W-4MN, statut 290.92) ne
          decrit un impot local sur le revenu : la page dit « we found no »,
          jamais « Minnesota has no ». Reciprocite : le booklet (p. 5) parle des
          accords avec le Michigan et le Dakota du Nord (non modelise).
       ----------------------------------------------------------------------- */
    minnesota: {
      name: "Minnesota",
      abbr: "MN",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 10600,
          marriedJoint: 15900,
          headOfHousehold: 15900
        },
        brackets: {
          single:          [[4700, 0], [38010, 0.0535], [114130, 0.068], [207850, 0.0785], [Infinity, 0.0985]],
          marriedJoint:    [[14700, 0], [63400, 0.0535], [208180, 0.068], [352630, 0.0785], [Infinity, 0.0985]],
          headOfHousehold: [[4700, 0], [38010, 0.0535], [114130, 0.068], [207850, 0.0785], [Infinity, 0.0985]]
        }
      },
      employeePrograms: [
        { label: "MN paid leave (0.44%)", rate: 0.0044, wageCap: 184500 }
      ]
    },

    /* =======================================================================
       INDIANA  -  lu le 2026-10-06 (in.gov/dor, in.gov/dwd : HTTP 200 ;
       forms.in.gov repond 403 « Attention Required » (Cloudflare) a tout
       client automatise, y compris un navigateur : le formulaire WH-4 est lu
       dans l'instantane Internet Archive cite plus bas, octets bruts id_)
       -----------------------------------------------------------------------
       1. LA METHODE DE RETENUE. Indiana Department of Revenue, « Departmental
          Notice #1 - How to Compute Withholding for State and County Income
          Tax », « Effective Oct. 1, 2026 (R47 / 10-26) » (PDF,
          https://www.in.gov/dor/files/dn01.pdf, telecharge et lu en
          pdftotext le 2026-10-06). Citations :
            « For 2026, the state adjusted gross income tax rate for
            individuals is 2.95%. »
            « Each employee is entitled to deduct $1,000 per year per exemption
            claimed on line 5 of his/her Form WH-4. »
            « Most employees are entitled to deduct $1,500 per year per
            qualifying dependent exemption claimed on line 6 ... »
            (3 000 $ par enfant adopte, ligne 8 ; non modelise.)
            Exemple imprime : « Gross Income $800.00 - Total Deduction Constant
            -326.92 = Taxable Income $473.08 ; State Tax to Withhold $473.08 x
            .0295 = $13.96 ; County Tax to Withhold $473.08 x .01 = $4.73 ».
          => un taux PLAT de 2,95 % et UNE SEULE base imposable pour l'Etat et
          le comte : (salaire - exemptions). Il n'y a ni tranche, ni deduction
          standard federale.
          Le meme document dit : « Indiana does not follow the allowance for
          no withholding permitted for federal purposes under IRC 3402(n). »
       2. LES EXEMPTIONS (Form WH-4, State Form 48845, R10 / 8-23, instantane
          Internet Archive 2025-06-12 :
          web.archive.org/web/20250612092821id_/https://forms.in.gov/download.aspx?id=2702).
          Le Notice 2026 renvoie aux memes numeros de ligne (5, 6, 7, 8) que
          cette revision : meme structure. Citations : « 1. You are entitled to
          one exemption. » ; « 2. If you are married and your spouse does not
          claim his/her exemption, you may claim it, enter "1" » ; « 5. Add
          lines 1, 2, 3, and 4. » ; instructions : « You are allowed to claim
          one exemption for yourself and one for your spouse (if he/she does not
          claim the exemption for him/herself). »
       3. MODELISATION.
          - celibataire : ligne 1 = 1 exemption = 1 000 $.
          - marie, conjoint sans salaire : lignes 1 + 2 = 2 exemptions = 2 000 $
            (le conjoint ne reclame pas la sienne, hypothese deja prise pour le
            Minnesota).
          - chef de famille : le WH-4 n'a pas de statut « head of household » :
            1 exemption = 1 000 $, aucune personne a charge.
          - NON MODELISE : personnes a charge (ligne 3, 1 000 $ chacune ; ligne
            6, 1 500 $ ; ligne 7 ; ligne 8, 3 000 $), 65 ans ou plus / aveugle
            (ligne 4), retenue supplementaire (lignes 9 et 10), travailleur
            non resident, regles des 30 jours (WH-4AFF).
       4. L'IMPOT DE COMTE (LIT) - le point que le moteur n'avait pas.
          Departmental Notice #1 (meme document) : « Withholding agents should
          withhold county tax based on the employee's Indiana county of
          residence as of Jan. 1 of the tax year. If the employee resides
          out-of-state on Jan. 1 but has his or her principal place of work or
          business in an Indiana county as of Jan. 1, then the withholding agent
          should withhold for the Indiana county of the principal place of work
          or business. » Les 92 comtes ont un taux (tableau « Indiana County
          Tax Rates: Effective Oct. 1, 2026 », p. 5 ; 0,5 % a 3,0 %), recopies
          ci-dessous par script depuis le texte du PDF puis recoupes par
          .tooling/test/verif-comtes-in.js (qui relit le PDF en ligne). Un seul
          comte porte l'asterisque (« changed since Departmental Notice #1 was
          issued on Jan. 1, 2026 ») : Boone, 0,0171. Le moteur ajoute donc UNE
          ligne « <Comte> County income tax » = taux x la meme base que l'Etat.
          Choix par defaut, DIT sur la page : Marion (Indianapolis), 0,0202 ;
          un selecteur de comte sur la page donne les 91 autres. Le comte est
          celui du 1er janvier, pas celui d'aujourd'hui.
          Bulletin IB #33 (December 2024, https://www.in.gov/dor/files/ib33.pdf) :
          « Employees who are residents of reciprocal states are subject to LIT
          in the same manner as residents of nonreciprocal states. »
       5. RECIPROCITE. IB #33 : « Indiana has established reciprocity agreements
          with Kentucky, Michigan, Ohio, Pennsylvania, and Wisconsin concerning
          the collection of income tax from nonresidents employed in Indiana. »
          Le salarie remplit le formulaire WH-47 aupres de son employeur. Non
          modelise (la page suppose un salarie qui reside en Indiana).
       6. 401(k). Le Notice 2026 parle de « gross income » et ne dit rien du
          401(k) des salaries : le moteur retranche le 401(k) classique de la base,
          comme pour l'impot federal. Choix de modelisation DIT sur la page, pas
          une regle lue.
       7. CHOMAGE. DWD, « Hired an Employee » (in.gov/dwd, lu le 2026-10-06) :
          « Employees do NOT pay into UI. No money is deducted from employee
          paychecks for UI benefits in Indiana. » Aucune retenue de chomage.
       8. AUCUN PROGRAMME SALARIE. Aucun document lu (Notice #1, WH-4, IB #33,
          guide DWD) ne decrit un conge paye d'Etat, une assurance invalidite
          d'Etat ou un impot de ville : la page dit « we found no », jamais
          « Indiana has no ».
       ----------------------------------------------------------------------- */
    indiana: {
      name: "Indiana",
      abbr: "IN",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 1000,
          marriedJoint: 2000,
          headOfHousehold: 1000
        },
        brackets: {
          single:          [[Infinity, 0.0295]],
          marriedJoint:    [[Infinity, 0.0295]],
          headOfHousehold: [[Infinity, 0.0295]]
        },
        /* Departmental Notice #1, effective Oct. 1, 2026 : cle -> [nom, taux]. */
        countyTax: {
          defaultCounty: "marion",
          rates: {
            "adams": ["Adams", 0.016],
            "allen": ["Allen", 0.0159],
            "bartholomew": ["Bartholomew", 0.0175],
            "benton": ["Benton", 0.0179],
            "blackford": ["Blackford", 0.025],
            "boone": ["Boone", 0.0171],
            "brown": ["Brown", 0.025234],
            "carroll": ["Carroll", 0.024733],
            "cass": ["Cass", 0.0295],
            "clark": ["Clark", 0.02],
            "clay": ["Clay", 0.0235],
            "clinton": ["Clinton", 0.0265],
            "crawford": ["Crawford", 0.0165],
            "daviess": ["Daviess", 0.015],
            "dearborn": ["Dearborn", 0.014],
            "decatur": ["Decatur", 0.0245],
            "dekalb": ["DeKalb", 0.0213],
            "delaware": ["Delaware", 0.015],
            "dubois": ["Dubois", 0.012],
            "elkhart": ["Elkhart", 0.02],
            "fayette": ["Fayette", 0.0282],
            "floyd": ["Floyd", 0.0189],
            "fountain": ["Fountain", 0.021],
            "franklin": ["Franklin", 0.017],
            "fulton": ["Fulton", 0.0288],
            "gibson": ["Gibson", 0.013],
            "grant": ["Grant", 0.0275],
            "greene": ["Greene", 0.0235],
            "hamilton": ["Hamilton", 0.011],
            "hancock": ["Hancock", 0.0194],
            "harrison": ["Harrison", 0.01],
            "hendricks": ["Hendricks", 0.017],
            "henry": ["Henry", 0.0202],
            "howard": ["Howard", 0.0235],
            "huntington": ["Huntington", 0.0195],
            "jackson": ["Jackson", 0.021],
            "jasper": ["Jasper", 0.02864],
            "jay": ["Jay", 0.025],
            "jefferson": ["Jefferson", 0.0103],
            "jennings": ["Jennings", 0.025],
            "johnson": ["Johnson", 0.014],
            "knox": ["Knox", 0.017],
            "kosciusko": ["Kosciusko", 0.01],
            "lagrange": ["LaGrange", 0.0165],
            "lake": ["Lake", 0.015],
            "laporte": ["LaPorte", 0.0145],
            "lawrence": ["Lawrence", 0.0175],
            "madison": ["Madison", 0.0225],
            "marion": ["Marion", 0.0202],
            "marshall": ["Marshall", 0.0125],
            "martin": ["Martin", 0.025],
            "miami": ["Miami", 0.0254],
            "monroe": ["Monroe", 0.0214],
            "montgomery": ["Montgomery", 0.0265],
            "morgan": ["Morgan", 0.0272],
            "newton": ["Newton", 0.01],
            "noble": ["Noble", 0.0175],
            "ohio": ["Ohio", 0.02],
            "orange": ["Orange", 0.0175],
            "owen": ["Owen", 0.025],
            "parke": ["Parke", 0.0265],
            "perry": ["Perry", 0.014],
            "pike": ["Pike", 0.012],
            "porter": ["Porter", 0.005],
            "posey": ["Posey", 0.0145],
            "pulaski": ["Pulaski", 0.0285],
            "putnam": ["Putnam", 0.023],
            "randolph": ["Randolph", 0.03],
            "ripley": ["Ripley", 0.0238],
            "rush": ["Rush", 0.0215],
            "st-joseph": ["St. Joseph", 0.0175],
            "scott": ["Scott", 0.0216],
            "shelby": ["Shelby", 0.017],
            "spencer": ["Spencer", 0.008],
            "starke": ["Starke", 0.0171],
            "steuben": ["Steuben", 0.0199],
            "sullivan": ["Sullivan", 0.017],
            "switzerland": ["Switzerland", 0.0145],
            "tippecanoe": ["Tippecanoe", 0.0128],
            "tipton": ["Tipton", 0.026],
            "union": ["Union", 0.0275],
            "vanderburgh": ["Vanderburgh", 0.0125],
            "vermillion": ["Vermillion", 0.015],
            "vigo": ["Vigo", 0.02],
            "wabash": ["Wabash", 0.029],
            "warren": ["Warren", 0.0212],
            "warrick": ["Warrick", 0.01],
            "washington": ["Washington", 0.02],
            "wayne": ["Wayne", 0.0125],
            "wells": ["Wells", 0.021],
            "white": ["White", 0.0232],
            "whitley": ["Whitley", 0.016829]
          }
        }
      }
    },

    /* =======================================================================
       OREGON  -  lu le 2026-10-06 (oregon.gov/dor, oregon.gov/employ,
       oregon.gov/dcbs, paidleave.oregon.gov, wcd.oregon.gov : HTTP 200,
       PDF telecharges et lus en pypdf ; multco.us, portland.gov, trimet.org :
       HTTP 200)
       -----------------------------------------------------------------------
       1. LA METHODE DE RETENUE. Oregon Department of Revenue, « Oregon
          Withholding Tax Formulas, Effective January 1, 2026 » (150-206-436,
          Rev. 12-31-25, https://www.oregon.gov/dor/forms/FormsPubs/
          withholding-tax-formulas_206-436_2026.pdf, p. 5-7). Citations :
            « BASE = wages - federal tax withheld (not to exceed $8,750) -
            standard deduction ($2,910[S]) » (celibataire, moins de 3 allowances) ;
            « BASE = wages - federal tax withheld (not to exceed [PHASE OUT]) -
            standard deduction ($5,820[M]) » (celibataire a 3 allowances ou plus,
            ou marie) ;
            salaire de 50 000 $ ou plus, celibataire : « 38,340 - 125,000 WH = 678
            + [(BASE - 11,400) x 0.0875] - (263 x allowances) » ; « 125,000 WH =
            10,618 + [(BASE - 125,000) x 0.099] - (263 x allowances) » ;
            marie : « 35,430 - 250,000 WH = 1,357 + [(BASE - 22,800) x 0.0875] -
            (263 x allowances) » ; « 250,000 WH = 21,237 + [(BASE - 250,000) x
            0.099] - (263 x allowances) » ;
            page 6 (salaire < 50 000 $), celibataire : « 0 - 4,550 WH = 263 +
            [BASE x 0.0475] - (263 x allowances) » ; « 4,550 - 11,400 WH = 479 +
            [(BASE - 4,550) x 0.0675] - (263 x allowances) » ; « 11,400 - 50,000
            WH = 941 + [(BASE - 11,400) x 0.0875] ... » ; marie : « 9,100 - 22,800
            WH = 695 + [(BASE - 9,100) x 0.0675] ... » ; « 22,800 - 50,000 WH =
            1,620 + [(BASE - 22,800) x 0.0875] ... » ;
            « Other pay periods ... Monthly Divide by 12 ... Every two weeks Divide
            by 26 » ; FAQ 10 : « If the withholding amount is negative, what do I
            use? Zero » ; FAQ 12 : « Is the personal exemption credit subtracted
            before or after the other calculations? After. » ; FAQ 1 : « Does the
            federal withholding amount subtracted include FICA? No. » ; FAQ 6 :
            les versements 401(k) ne font pas partie des « wages ».
          PLAFOND DE L'IMPOT FEDERAL RETRANCHE, par palier de salaire (p. 7) :
            celibataire : « wages >= $50,000 and <$125,000 = $8,750 ; >= $125,000
            and <$130,000 = $7,000 ; >= $130,000 and <$135,000 = $5,250 ;
            >= $135,000 and <$140,000 = $3,500 ; >= $140,000 and <$145,000 =
            $1,750 ; >= $145,000 = $0 » ;
            marie : « >= $50,000 and <$250,000 = $8,750 ; $250,000-$260,000 =
            $7,000 ; ... >= $290,000 = $0 ».
          « If single and wages are greater than $100,000 then allowances = 0. »
          « If married and wages are greater than $200,000 then allowances = 0. »
       2. DEUX POINTS OU LE LIVRET SE CONTREDIT LUI-MEME, ET CE QUI A ETE CHOISI.
          a) LE PLAFOND : le texte de la p. 5 (« can't be more than $8,500 per
             year in 2025 ») et la FAQ 3 disent 8 500 $ (valeur 2025 : le Form
             OR-40 Instructions 2025, Rev. 01-29-26, dit « The 2025 federal tax
             subtraction limit is $8,500 », celui de 2024 « $8,250 »), mais les
             formules des p. 6-7 et la FAQ 11 disent 8 750 $, et les paliers
             d'effacement (5 x 1 750 $) ne tombent juste qu'avec 8 750 $. Le moteur
             prend 8 750 $, valeur 2026. Sans effet sous ~78 800 $ de salaire (celibataire :
             l'impot federal n'atteint 8 500 $ qu'a ce niveau, 8 750 $ vers 79 900 $) ;
             au-dela, 8 750 $ plutot que 8 500 $ retranche 250 $ de plus de la BASE, soit
             21,88 $ de retenue en moins par an a 8,75 %. 75 000 $ n'est pas concerne.
          b) LA CONSTANTE DE LA P. 6 : la formule pour salaire < 50 000 $ ajoute
             263 $ a l'impot (« 263 + [BASE x 0.0475] », « 941 » a 11 400 $,
             « 1,620 » pour les maries), alors que la formule pour salaire >= 50 000 $
             (« 678 », « 1,357 ») est exactement l'impot SANS ce 263 $, et que les
             TABLES IMPRIMEES du meme organisme (150-206-430, Rev. 12-18-25)
             correspondent a l'impot sans le 263 $ : voir 4. Le moteur applique
             l'impot SANS le 263 $ a tout salaire (une seule formule, continue a
             50 000 $), c'est-a-dire 678 $, 216 $ (= 479 - 263), 1 357 $, 432 $
             (= 695 - 263). Effet : sous 50 000 $ de salaire, jusqu'a 263 $ par an de
             moins qu'avec la formule imprimee p. 6 (et son exemple 1 : 941 + ... =
             1 789 $). La page le dit.
       3. LES ALLOWANCES. Form OR-W-4 Instructions 2026 (150-101-402-1, Rev.
          02-17-26, https://www.oregon.gov/dor/forms/FormsPubs/
          form-or-W-4-instr_101-402-1_2026.pdf, p. 7, Worksheet A) : « A1. Enter
          "1" for yourself if no one else can claim you as a dependent » ; « A2. If
          you're married and plan to file a joint return, enter "1" for your
          spouse » ; « A3. Enter the number of dependents ... » ; p. 2 : « The
          employer withholding formula treats all allowances like the personal
          exemption credit on your return. This means that if your wages for the
          whole year would be more than the income limit for the credit on your
          return, the formula won't use the allowances you claim » ; « $100,000
          per year ... if you mark the "Single" box ... $200,000 per year ... if
          you mark the "Married" ... box » ; « If no Form OR-W-4 has been
          submitted ... Eight percent of your wages » (sans formulaire : non
          modelise). MODELISATION : celibataire et chef de famille = 1 allowance
          (A1), marie = 2 (A1 + A2, conjoint sans salaire, meme hypothese que le
          Minnesota et l'Indiana). Credit = 263 $ par allowance. Chef de famille :
          « For employees claiming single or head of household status, use $2,910 »
          (FAQ 2 du livret des formules) : table celibataire. NON MODELISE :
          personnes a charge (A3), Worksheets B et C, deux emplois, « Married, but
          withhold at the higher single rate », montant supplementaire (ligne 3).
       4. VERIFICATION INDEPENDANTE (2026-10-06) : .tooling/test/verif-retenue-or.js
          lit les TABLES IMPRIMEES (Oregon Withholding Tax Tables, 150-206-430,
          Rev. 12-18-25, https://www.oregon.gov/dor/forms/FormsPubs/
          withholding-tax-tables_206-430_2026.pdf : mensuel, deux fois par mois,
          toutes les deux semaines, hebdomadaire, jusqu'a 4 250 $ par mois) et
          refait chaque cellule celibataire a 0, 1 et 2 allowances avec la formule
          ci-dessus et un impot federal calcule a part (Publication 15-T 2026,
          section 5, methode pourcentage pour formulaires W-4 de 2019 ou avant,
          4 300 $ par allowance), au milieu de chaque ligne. Les tables ne couvrent
          que les salaires annuels < ~51 000 $ : la formule >= 50 000 $ n'est donc
          recoupee que par continuite avec la derniere ligne, jamais par une table
          imprimee a 75 000 $. Un livret, deux conventions : voir 2b.
       5. IMPOT TRANSIT D'ETAT (Statewide Transit Tax). Oregon Department of
          Revenue, https://www.oregon.gov/dor/programs/businesses/pages/
          statewide-transit-tax.aspx : « On July 1, 2018, employers began
          withholding the tax (one-tenth of 1 percent or .001) from: Wages of Oregon
          residents (regardless of where the work is performed). Wages of
          nonresidents who perform services in Oregon. » ; « Measure 120 did not
          pass in the May 19, 2026 primary election. Please continue to withhold at
          the rate of one-tenth of 1 percent or .001. » ; « Employees who are not
          subject to regular income tax withholding ... are subject to Statewide
          Transit Tax withholding. » Aucun plafond de salaire cite. (L'Employment
          Department dit, sur sa page « Payroll Taxes », que la hausse de la loi HB
          3991 « has been delayed pending a vote by Oregon voters in November
          2026 » : les deux pages disent de retenir 0,001.)
       6. PAID LEAVE OREGON. Employment Department, « Current Tax and
          Contribution Rates » (https://www.oregon.gov/employ/Businesses/Tax/
          Pages/Current-Tax-Rate.aspx) : « The 2026 Paid Leave contribution rate is
          1% of subject wages up to $184,500 (2026 Social Security taxable maximum
          wage) per employee. » ; paidleave.oregon.gov, « Common questions »
          (https://paidleave.oregon.gov/resources/common-questions.html) :
          « Employees pay 60% of the contribution rate. » ; « The contribution rate
          for 2026 is 1%. » ; « The total contribution rate for 2025 and 2026 has
          been set at 1%, and the maximum wage is based on the social security wage,
          which is $176,100 for 2025 and $184,500 for 2026. » ; « Employers with 25
          or more employees on average pay 40% of the contribution rate. » ;
          « Small employers, with fewer than 25 employees on average, don't have to
          pay the employer portion ... However, they still need to collect and pay
          employee contributions » ; paidleave.oregon.gov, « Calculate your
          contribution » (https://paidleave.oregon.gov/employers/
          contributions-calculator.html) : « Employees pay 60% of the total 1%
          contribution rates. » => 0,6 % du salaire jusqu'a 184 500 $ : 1 107 $
          maximum par an. (« Employers can also choose to pay the employee
          contribution, in full or in part, as a benefit » : non modelise.)
       7. WORKERS' BENEFIT FUND. DCBS (https://www.oregon.gov/DCBS/wbf/Pages/
          index.aspx) : « In 2026, the WBF assessment is 1.8 cents per hour
          worked » ; Workers' Compensation Division, testimony du directeur sur le
          taux 2026 (https://wcd.oregon.gov/laws/Documents/Proposed_rules_and_
          testimony/70-25053-EXHIBIT2-Director-testimony-WBF-assessment-2026.pdf) :
          « Employers and workers each pay half of the assessment. » => 0,9 cent
          par heure et par salarie. ORS 656.506(2), lu sur oregon.public.law le
          2026-10-06 (le site de l'assemblee ne repond pas) : « Every employer shall
          retain from the moneys earned by all employees an amount determined by
          the Director ... for each hour or part of an hour the employee is
          employed ». Le moteur chiffre 0,009 $ x 2 080 h = 18,72 $ par an (temps
          plein) ; la retenue reelle suit les heures.
       8. CHOMAGE. Employment Department, meme page de taux : taux de l'impot
          chomage de l'EMPLOYEUR (« Taxable base tax rate: 2.4% (new employer rate)
          », « The UI taxable wage base for 2026 is $56,700 per employee ») ; la
          page ne decrit aucune retenue sur le salarie : la page du site dit « we
          found no », jamais « Oregon has no ».
       9. TAXES LOCALES, CLASSEES. (a) TriMet : « The transit tax rate is 0.8237%
          of the wages paid by an employer ... » (https://trimet.org/taxinfo/,
          « Updated February 2026 ») et Lane Transit District : « The transit tax is
          imposed directly on the employer » (DOR, https://www.oregon.gov/dor/
          programs/businesses/Pages/Lane-County-Transit-District-Payroll-tax.aspx) :
          impots de l'EMPLOYEUR, aucune retenue. (b) Metro Supportive Housing
          Services (1 %) et Multnomah County Preschool for All (1,5 % au-dessus de
          125 000 $, 3 % au-dessus de 250 000 $ ; celibataire) : portland.gov,
          « Payroll Withholding Tax Requirements » (https://www.portland.gov/
          revenue/personal-tax) : « Metro employers are required to withhold the tax
          through payroll deductions for employees who earn more than $200,000
          annually or for employees who opt into having the tax withheld. » ;
          multco.us (https://www.multco.us/finance/preschool-all-personal-income-tax) :
          « Employers should automatically withhold for employees making over
          $200,000 per year. Employees may elect to opt in or out of withholding ».
          => a 75 000 $, aucune retenue, sauf demande du salarie ; au-dela de
          200 000 $ de salaire, retenue automatique pour les salaries du perimetre :
          NON MODELISE, dit sur la page. Le moteur n'ajoute aucun impot local.
      10. HORS MODELE. Le taux de 8 % (sans formulaire OR-W-4) : « HB 2119 (2019)
          requires employers to withhold income tax at a rate of eight (8) percent
          of employee wages if the employee hasn't provided a withholding statement
          or exception certificate. » ; supplemental wages : « Employers may use a 8
          percent flat rate » (non modelise).
       ----------------------------------------------------------------------- */
    oregon: {
      name: "Oregon",
      abbr: "OR",
      incomeTax: {
        hasIncomeTax: true,
        standardDeduction: {
          single: 2910,
          marriedJoint: 5820,
          headOfHousehold: 2910
        },
        /* Pour l'affichage et le taux marginal ; le calcul passe par bracketTable. */
        brackets: {
          single:          [[4550, 0.0475], [11400, 0.0675], [125000, 0.0875], [Infinity, 0.099]],
          marriedJoint:    [[9100, 0.0475], [22800, 0.0675], [250000, 0.0875], [Infinity, 0.099]],
          headOfHousehold: [[4550, 0.0475], [11400, 0.0675], [125000, 0.0875], [Infinity, 0.099]]
        },
        /* Les constantes IMPRIMEES (678, 10 618, 1 357, 21 237 ; 216 = 479 - 263 et
           432 = 695 - 263 pour les deux tranches basses, qui ne sont imprimees
           qu'avec le 263 $ de la p. 6). Voir 2b ci-dessus. */
        bracketTable: (() => {
          const celibataire = [
            { upTo: 4550, base: 0, rate: 0.0475, from: 0 },
            { upTo: 11400, base: 216, rate: 0.0675, from: 4550 },
            { upTo: 125000, base: 678, rate: 0.0875, from: 11400 },
            { upTo: null, base: 10618, rate: 0.099, from: 125000 }
          ];
          const marie = [
            { upTo: 9100, base: 0, rate: 0.0475, from: 0 },
            { upTo: 22800, base: 432, rate: 0.0675, from: 9100 },
            { upTo: 250000, base: 1357, rate: 0.0875, from: 22800 },
            { upTo: null, base: 21237, rate: 0.099, from: 250000 }
          ];
          return { single: celibataire, marriedJoint: marie, headOfHousehold: celibataire };
        })(),
        /* L'impot federal retenu, retranche dans la limite d'un plafond qui depend
           du SALAIRE : [salaire strictement inferieur a, plafond]. */
        federalTaxSubtraction: (() => {
          const celibataire = [[125000, 8750], [130000, 7000], [135000, 5250], [140000, 3500], [145000, 1750], [Infinity, 0]];
          const marie = [[250000, 8750], [260000, 7000], [270000, 5250], [280000, 3500], [290000, 1750], [Infinity, 0]];
          return { capByWages: { single: celibataire, marriedJoint: marie, headOfHousehold: celibataire } };
        })(),
        /* Form OR-W-4 : 1 allowance (soi-meme), 2 pour un couple dont le conjoint
           ne travaille pas ; 263 $ de credit chacune ; plus aucune au-dela du
           salaire indique. */
        withholdingAllowances: {
          perFiler: { single: 1, marriedJoint: 2, headOfHousehold: 1 },
          credit: 263,
          noneAbove: { single: 100000, marriedJoint: 200000, headOfHousehold: 100000 }
        }
      },
      employeePrograms: [
        { label: "OR statewide transit tax (0.1%)", rate: 0.001 },
        { label: "Paid Leave Oregon (0.6%)", rate: 0.006, wageCap: 184500 },
        { label: "OR Workers' Benefit Fund (0.9 cent per hour)", perHour: 0.009 }
      ]
    }
  }
};


if (typeof module !== "undefined" && module.exports) { module.exports = RATES_2026; }
