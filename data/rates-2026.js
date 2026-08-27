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
    }
  }
};

if (typeof module !== "undefined" && module.exports) { module.exports = RATES_2026; }
