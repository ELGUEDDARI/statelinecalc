/* =========================================================================
   statelinecalc.com — paycheck engine
   One engine for all 50 states. State-specific figures live in
   data/rates-2026.js, never here.

   Everything runs in the visitor's browser. No value is ever sent to a
   server. That is a compliance decision and a trust argument, and it is
   stated on the page.

   The engine is progressive enhancement only: the page must already answer
   the question in server-rendered HTML before this file loads, because AI
   crawlers do not execute JavaScript.
   ========================================================================= */
(function () {
  "use strict";

  var PERIODS = {
    annual: 1, monthly: 12, semimonthly: 24, biweekly: 26, weekly: 52
  };

  /* "hourly" is deliberately NOT in PERIODS: it has no fixed multiplier.
     How many times an hour fits in a year depends on how many hours the
     visitor actually works, which is why we ask instead of assuming 2,080.
     Added 2026-08-27 to cover the "hourly paycheck calculator" and
     "$X an hour is how much a year" query families in one page, rather
     than in a second thin page per state. */
  var HOURS_DEFAULT = 40;
  function periodsPerYear(period, hoursPerWeek) {
    if (period === "hourly") {
      var h = parseFloat(hoursPerWeek);
      if (!isFinite(h) || h <= 0) h = HOURS_DEFAULT;
      if (h > 168) h = 168;              // there are 168 hours in a week
      return h * 52;
    }
    return PERIODS[period];
  }

  var usd = new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD",
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  var pct = function (x) { return (x * 100).toFixed(1) + "%"; };

  /* Progressive marginal tax. Bands are [upperBound, rate]; only the slice
     of income inside each band is taxed at that band's rate. */
  function progressiveTax(taxable, bands) {
    var tax = 0, lower = 0;
    for (var i = 0; i < bands.length; i++) {
      var upper = bands[i][0], rate = bands[i][1];
      if (taxable <= lower) break;
      tax += (Math.min(taxable, upper) - lower) * rate;
      lower = upper;
    }
    return tax;
  }

  /* Core calculation. Returns annual figures; the caller converts to the
     pay period the visitor asked for.

     Deliberate simplifications, stated on the page rather than hidden:
       - standard deduction only (no itemising, no credits)
       - no pre-tax deductions beyond the 401(k) field
       - no local taxes
       - Additional Medicare Tax applied on the $200,000 single threshold,
         which is how an employer actually withholds it regardless of
         filing status (IRS Topic 751)
  */
  function computeAnnual(input, R) {
    var gross = input.grossAnnual;
    var state = R.states[input.state];

    var pretax = Math.min(input.retirementPct * gross, gross);
    var afterPretax = gross - pretax;

    /* --- federal income tax --- */
    var stdDed = R.federal.standardDeduction[input.filingStatus];
    /* Look the bands up by filing status directly. The old form of this line
       tested only for "marriedJoint" and sent everything else to the single
       bands, which silently overstated federal tax for head-of-household
       filers. Fixed 2026-08-27. The fallback stays, but a missing table is
       now a bug to fix in rates, not a wrong answer served quietly. */
    var bands = R.federal.brackets[input.filingStatus] || R.federal.brackets.single;
    var taxable = Math.max(0, afterPretax - stdDed);
    var federal = progressiveTax(taxable, bands);

    /* --- FICA: computed on gross, not on after-401(k) wages --- */
    var ss = Math.min(gross, R.fica.socialSecurity.wageBase) * R.fica.socialSecurity.rate;
    var medicare = gross * R.fica.medicare.rate;
    var addlMedicare = Math.max(0, gross - R.fica.additionalMedicare.threshold)
      * R.fica.additionalMedicare.rate;

    /* --- state income tax ---
       standardDeduction accepts either a single number, for a state whose
       deduction does not vary, or a table keyed by filing status. Georgia
       needs the table: $15,000 single but $30,000 married filing jointly.
       Before 2026-08-28 only the number was read, so a state like that would
       have been given the wrong deduction for half its visitors without any
       error being raised. Added the table form rather than hard-coding a
       state, because most states that tax income work this way. */
    var stateTax = 0;
    if (state.incomeTax.hasIncomeTax) {
      var sd = state.incomeTax.standardDeduction;
      if (sd && typeof sd === "object") {
        sd = (input.filingStatus in sd) ? sd[input.filingStatus] : sd.single;
      }
      stateTax = progressiveTax(
        Math.max(0, afterPretax - (sd || 0)),
        state.incomeTax.brackets[input.filingStatus] || state.incomeTax.brackets.single
      );
    }

    /* --- state payroll programmes --- */
    var paidLeave = 0, waCares = 0;
    if (state.paidLeave) {
      var plBase = state.paidLeave.wageCap
        ? Math.min(gross, state.paidLeave.wageCap) : gross;
      paidLeave = plBase * state.paidLeave.employeeRate;
    }
    if (state.waCares && input.waCaresApplies) {
      waCares = gross * state.waCares.rate;
    }

    var totalTax = federal + ss + medicare + addlMedicare + stateTax + paidLeave + waCares;
    var net = gross - totalTax - pretax;

    return {
      gross: gross,
      pretax: pretax,
      federal: federal,
      socialSecurity: ss,
      medicare: medicare + addlMedicare,
      stateTax: stateTax,
      paidLeave: paidLeave,
      waCares: waCares,
      totalTax: totalTax,
      net: net,
      effectiveRate: gross > 0 ? totalTax / gross : 0,
      marginalRate: bandRate(taxable, bands)
    };
  }

  function bandRate(taxable, bands) {
    for (var i = 0; i < bands.length; i++) {
      if (taxable <= bands[i][0]) return bands[i][1];
    }
    return bands[bands.length - 1][1];
  }

  /* ---------------------------------------------------------------------
     Wiring. Bails out silently if the page has no calculator, so the same
     script can be included site-wide.
     --------------------------------------------------------------------- */
  function init() {
    var form = document.querySelector("[data-paycheck-form]");
    var out = document.querySelector("[data-paycheck-result]");
    if (!form || !out || typeof RATES_2026 === "undefined") return;

    var stateKey = form.getAttribute("data-state");

    var hoursField = form.querySelector("[data-hours-field]");

    /* The hours-per-week question only makes sense when something on the
       page is expressed per hour. Showing it the rest of the time is noise;
       hiding it when it IS needed silently changes the answer. */
    function syncHours() {
      if (!hoursField) return;
      var needed = form.elements.period.value === "hourly" ||
                   form.elements.display.value === "hourly";
      hoursField.hidden = !needed;
    }

    function read() {
      var salary = parseFloat(form.elements.salary.value);
      var per = form.elements.period.value;
      var field = form.elements.salary.closest(".field");
      var hours = form.elements.hours ? form.elements.hours.value : HOURS_DEFAULT;

      if (!isFinite(salary) || salary <= 0) {
        field.classList.add("is-invalid");
        return null;
      }
      field.classList.remove("is-invalid");

      return {
        grossAnnual: salary * periodsPerYear(per, hours),
        hoursPerWeek: hours,
        filingStatus: form.elements.filing.value,
        retirementPct: (parseFloat(form.elements.retirement.value) || 0) / 100,
        state: stateKey,
        waCaresApplies: form.elements.wacares ? form.elements.wacares.checked : true
      };
    }

    function render() {
      syncHours();
      var input = read();
      if (!input) return;

      var a = computeAnnual(input, RATES_2026);
      var div = periodsPerYear(form.elements.display.value, input.hoursPerWeek);
      var v = function (n) { return usd.format(n / div); };
      var label = form.elements.display.options[form.elements.display.selectedIndex].text;

      var rows = [
        ["Federal income tax", a.federal],
        ["Social Security (6.2%)", a.socialSecurity],
        ["Medicare (1.45%)", a.medicare]
      ];
      if (a.stateTax > 0) rows.push(["State income tax", a.stateTax]);
      if (a.paidLeave > 0) rows.push(["WA Paid Leave (0.807%)", a.paidLeave]);
      if (a.waCares > 0) rows.push(["WA Cares (0.58%)", a.waCares]);
      if (a.pretax > 0) rows.push(["401(k) contribution", a.pretax]);

      var html =
        '<p class="result-label">Your take-home pay</p>' +
        '<p class="result-head num">' + v(a.net) + " <span class=\"result-unit\">/ " +
        label.toLowerCase() + "</span></p><hr>" +
        '<dl class="u-m-0">' +
        '<div class="line"><dt>Gross pay</dt><dd class="num">' + v(a.gross) + "</dd></div>" +
        rows.map(function (r) {
          return '<div class="line"><dt>' + r[0] + '</dt><dd class="num">&minus;' + v(r[1]) + "</dd></div>";
        }).join("") +
        "</dl><hr>" +
        '<div class="line line-total"><dt>Take-home pay</dt><dd class="num">' + v(a.net) + "</dd></div>" +
        '<div class="line"><dt>Effective tax rate</dt><dd class="num">' + pct(a.effectiveRate) + "</dd></div>" +
        '<div class="line"><dt>Federal marginal rate</dt><dd class="num">' + pct(a.marginalRate) + "</dd></div>";

      out.innerHTML = html;
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();   // the block is never empty, so it never grows on first use
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* Expose exprès, pour que les tests puissent verifier le calcul sans
     passer par le DOM. periodsPerYear en fait partie : c'est lui qui porte
     la conversion horaire, donc c'est lui qu'il faut pouvoir tester. */
  window.StateLineCalc = {
    computeAnnual: computeAnnual,
    PERIODS: PERIODS,
    periodsPerYear: periodsPerYear
  };
})();
