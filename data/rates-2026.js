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
     * A SAVOIR pour la page : le Hall Income Tax ne frappait QUE les interets et
     * dividendes. Un salarie du Tennessee n'a donc jamais paye d'impot d'Etat sur
     * son salaire, meme avant 2021. C'est l'angle qui distingue cette page des
     * trois autres Etats sans impot deja publies. */
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
    }
  }
};

if (typeof module !== "undefined" && module.exports) { module.exports = RATES_2026; }
