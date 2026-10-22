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
    if (!form || !out) return;
    /* Lot C : si le moteur ou les barèmes n'ont pas chargé, on le dit et on ne calcule rien.
       Cette copie du message et du contrôle est volontaire : pendant un déploiement, un HTML ou un
       moteur en cache peut être plus ancien que ce fichier, qui ne doit donc rien exiger de l'autre. */
    var MSG_DONNEES = '<p class="data-error" role="alert">We couldn’t load the 2026 tax data, ' +
      'so there is no result to show. Reload the page and try again.</p>';
    function donneesDisponibles(etat) {
      return typeof RATES_2026 !== "undefined" && !!RATES_2026 && !!RATES_2026.federal &&
        !!RATES_2026.fica && !!RATES_2026.states && !!RATES_2026.states[etat];
    }
    if (typeof window.StateLineCalc === "undefined" || typeof RATES_2026 === "undefined") {
      out.innerHTML = MSG_DONNEES;
      form.addEventListener("submit", function (e) { e.preventDefault(); });
      return;
    }

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

    /* Same rules as calc-paycheck.js (audit UX 22/10/2026): an invalid entry
       empties the result instead of leaving the last figure on screen, flags
       the field with aria-invalid + aria-describedby, and caps the annual
       salary at $10,000,000. The field here is already a whole-year amount. */
    var PLAFOND_ANNUEL = 10000000;
    var descriptionInitiale = form.elements.salary.getAttribute("aria-describedby");
    function verifierMontant(brut, salary) {
      if (/^\s*$/.test(brut)) return "Enter your salary, for example 75000.";
      if (/^\s*[-−]/.test(brut)) return "Enter an amount greater than zero.";
      if (!isFinite(salary)) return "Enter a number like 75000. Only digits, commas, a dollar sign and one decimal point are accepted.";
      if (salary <= 0) return "Enter an amount greater than zero.";
      if (salary > PLAFOND_ANNUEL) return "That is more than $10,000,000 a year. Enter a smaller amount.";
      return "";
    }
    function marquerInvalide(champ, message) {
      var msg = champ.querySelector(".error");
      if (msg) { if (!msg.id) msg.id = "salary-error"; msg.textContent = message; }
      champ.classList.add("is-invalid");
      form.elements.salary.setAttribute("aria-invalid", "true");
      if (msg) form.elements.salary.setAttribute("aria-describedby",
        (descriptionInitiale ? descriptionInitiale + " " : "") + msg.id);
      out.innerHTML = "";
    }
    function marquerValide(champ) {
      champ.classList.remove("is-invalid");
      form.elements.salary.removeAttribute("aria-invalid");
      if (descriptionInitiale) form.elements.salary.setAttribute("aria-describedby", descriptionInitiale);
      else form.elements.salary.removeAttribute("aria-describedby");
    }

    function render() {
      var brut = form.elements.salary.value;
      var salary = montantSaisi(brut);
      var champ = form.elements.salary.closest(".field");
      var verdict = verifierMontant(brut, salary);
      if (verdict) { marquerInvalide(champ, verdict); return; }
      marquerValide(champ);

      var filing = form.elements.filing.value;
      var stateA = form.elements.stateA.value;
      var stateB = form.elements.stateB.value;
      var nomA = form.elements.stateA.options[form.elements.stateA.selectedIndex].text;
      var nomB = form.elements.stateB.options[form.elements.stateB.selectedIndex].text;

      if (!donneesDisponibles(stateA) || !donneesDisponibles(stateB)) { out.innerHTML = MSG_DONNEES; return; }
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
