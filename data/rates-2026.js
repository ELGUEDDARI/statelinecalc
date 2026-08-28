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
       so it is not modelled here - it is explained on the page.
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
    }
  }
};

if (typeof module !== "undefined" && module.exports) { module.exports = RATES_2026; }
