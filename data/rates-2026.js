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
    }
  }
};

if (typeof module !== "undefined" && module.exports) { module.exports = RATES_2026; }
