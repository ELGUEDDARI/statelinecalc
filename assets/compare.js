/* statelinecalc.com — state comparator widget, /state-comparison/ only.
   No new tax logic here: every dollar is produced by
   window.StateLineCalc.computeAnnual(), the exact same function every state
   page calls. This file only reads the two-state form, calls that function
   twice, and lays the two results out side by side. calc-paycheck.js is
   loaded on this page too (for RATES_2026 wiring and the engine export) but
   finds no [data-paycheck-form] and quietly does nothing else.

   Also everything here runs in the browser: nothing typed is sent anywhere,
   same rule as every other calculator on this site. */
(function () {
  "use strict";

  function init() {
    var form = document.querySelector("[data-compare-form]");
    var out = document.querySelector("[data-compare-result]");
    if (!form || !out || typeof window.StateLineCalc === "undefined" ||
        typeof RATES_2026 === "undefined") return;

    var usd = new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2
    });
    var pct = function (x) { return (x * 100).toFixed(1) + "%"; };

    /* Same reader as calc-paycheck.js's montantSaisi(): accepts "$75,000",
       "75000", "75,000.50" — the way people actually type a salary, not just
       what parseFloat happens to accept. Kept as its own small copy rather
       than exported from calc-paycheck.js, so this file never has to reach
       into the other script's internals to work. */
    function montantSaisi(texte) {
      if (typeof texte !== "string") return NaN;
      var net = texte.replace(/[\s  ]/g, "").replace(/^[$]/, "").replace(/,/g, "");
      if (!/^\d*\.?\d+$/.test(net)) return NaN;
      return parseFloat(net);
    }

    /* Prefills from a state page's "Compare X with another state" link:
       /state-comparison/?state=washington&salary=75000 — the salary the
       visitor already typed there, so they do not retype it here. */
    (function prefill() {
      var params = new URLSearchParams(window.location.search);
      var salaire = params.get("salary");
      var etat = params.get("state");
      if (salaire && montantSaisi(salaire) > 0) form.elements.salary.value = salaire;
      if (etat && form.elements.stateA.querySelector('option[value="' + etat + '"]')) {
        form.elements.stateA.value = etat;
      }
    })();

    function carte(nom, cle, a) {
      var lignes = [["Federal income tax", a.federal],
        ["Social Security", a.socialSecurity],
        ["Medicare", a.medicare]];
      if (a.stateTax > 0) lignes.push(["State income tax", a.stateTax]);
      if (a.paidLeave > 0) lignes.push(["Paid Leave", a.paidLeave]);
      if (a.waCares > 0) lignes.push(["WA Cares", a.waCares]);
      (a.programmes || []).forEach(function (pg) {
        if (pg.amount > 0) lignes.push([pg.label, pg.amount]);
      });
      return '<div class="compare-card">' +
        '<h3><a href="/paycheck-calculator/' + cle + '/">' + nom + '</a></h3>' +
        '<p class="result-head num">' + usd.format(a.net) + '</p>' +
        '<p class="caption u-m-0">a year, take-home</p>' +
        '<dl class="u-m-0 u-mt-3">' +
        lignes.map(function (r) {
          return '<div class="line"><dt>' + r[0] + '</dt><dd class="num">&minus;' + usd.format(r[1]) + '</dd></div>';
        }).join('') +
        '</dl><hr>' +
        '<div class="line line-total"><dt>Take-home pay</dt><dd class="num">' + usd.format(a.net) + '</dd></div>' +
        '<div class="line"><dt>Effective tax rate</dt><dd class="num">' + pct(a.effectiveRate) + '</dd></div>' +
        '</div>';
    }

    function render() {
      var salary = montantSaisi(form.elements.salary.value);
      var champ = form.elements.salary.closest(".field");
      if (!isFinite(salary) || salary <= 0) { champ.classList.add("is-invalid"); return; }
      champ.classList.remove("is-invalid");

      var filing = form.elements.filing.value;
      var stateA = form.elements.stateA.value;
      var stateB = form.elements.stateB.value;
      var nomA = form.elements.stateA.options[form.elements.stateA.selectedIndex].text;
      var nomB = form.elements.stateB.options[form.elements.stateB.selectedIndex].text;

      var inputBase = { grossAnnual: salary, filingStatus: filing, retirementPct: 0,
                         waCaresApplies: true };
      var a = window.StateLineCalc.computeAnnual(
        Object.assign({}, inputBase, { state: stateA }), RATES_2026);
      var b = window.StateLineCalc.computeAnnual(
        Object.assign({}, inputBase, { state: stateB }), RATES_2026);

      var ecart = a.net - b.net;
      var diffHtml = (Math.abs(ecart) < 0.5)
        ? "Same take-home pay in both states on this salary."
        : usd.format(Math.abs(ecart)) + " a year (" + usd.format(Math.abs(ecart) / 12) +
          " a month) more take-home in <strong>" + (ecart > 0 ? nomA : nomB) + "</strong>.";

      out.innerHTML =
        '<div class="compare-grid">' + carte(nomA, stateA, a) + carte(nomB, stateB, b) + "</div>" +
        '<p class="compare-diff num">' + diffHtml + "</p>" +
        '<div class="result-actions">' +
          '<button type="button" class="btn btn-secondary" data-print-pdf>Download as PDF</button>' +
        "</div>";
    }

    /* Same delegation pattern as calc-paycheck.js: the button is rebuilt on
       every render(), but `out` itself never changes. */
    out.addEventListener("click", function (e) {
      if (e.target.closest("[data-print-pdf]")) window.print();
    });

    form.addEventListener("submit", function (e) { e.preventDefault(); render(); });
    form.addEventListener("input", render);
    form.addEventListener("change", render);
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
