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
      /* Most states start from pay after pre-tax contributions, as the federal
         government does. Pennsylvania does not: a 401(k) deferral is taxable
         compensation there the moment it is made, so its base is gross pay.
         Reading afterPretax for Pennsylvania would understate its tax for
         every visitor who saves for retirement. Added 2026-08-28. */
      var baseEtat = state.incomeTax.taxesRetirementDeferrals ? gross : afterPretax;
      var sd = state.incomeTax.standardDeduction;
      /* Ohio is the first state here whose exemption AMOUNT depends on income
         rather than only on the household: $2,400 a person up to $40,000 of
         income, $2,150 up to $80,000, $1,900 above. A table keyed on filing
         status cannot say that, so income tiers are read first when a state
         declares them. Added 2026-09-02. */
      var tiers = state.incomeTax.deductionByIncome;
      if (tiers) {
        for (var ti = 0; ti < tiers.length; ti++) {
          if (tiers[ti].upTo === null || baseEtat <= tiers[ti].upTo) {
            var am = tiers[ti].amounts;
            sd = (input.filingStatus in am) ? am[input.filingStatus] : am.single;
            break;
          }
        }
      } else if (sd && typeof sd === "object") {
        sd = (input.filingStatus in sd) ? sd[input.filingStatus] : sd.single;
      }
      /* Some states withdraw the deduction entirely above an income threshold
         rather than tapering it. Illinois is the first one here: its personal
         exemption is "not allowed" above $250,000, or $500,000 filing jointly.
         Without this, a high earner would be handed a deduction the state does
         not give them, and the error would be silent. Added 2026-08-28.
         The threshold is written against federal AGI; for a wage-only filer
         with no other income, pay after pre-tax contributions is the closest
         thing this calculator has to AGI, and that is what we compare. */
      var po = state.incomeTax.deductionPhaseOut;
      if (po) {
        var seuil = (input.filingStatus in po) ? po[input.filingStatus] : po.single;
        if (isFinite(seuil) && baseEtat > seuil) sd = 0;
      }
      var imposableEtat = Math.max(0, baseEtat - (sd || 0));
      stateTax = progressiveTax(
        imposableEtat,
        state.incomeTax.brackets[input.filingStatus] || state.incomeTax.brackets.single
      );
      /* A STEP, not a slope. Ohio owes nothing up to $26,050 of taxable income
         and then "$332.00 plus 2.75% of the amount in excess of $26,050"
         (Ohio Revised Code 5747.02, for 2026 and thereafter), so the dollar
         above the threshold costs $332 at once. A marginal bracket table
         cannot express that jump. Added 2026-09-02. */
      var nt = state.incomeTax.notch;
      if (nt && imposableEtat > nt.over) stateTax += nt.add;
      /* Some states do not shrink the taxable income at all: they charge the
         full rate, then subtract a CREDIT that fades out as pay rises. Utah is
         the first one here - Publication 14, schedules 1 to 8: tax is 4.45% of
         wages, less (a base allowance minus 1.3% of the wages above a
         threshold), and never below zero. Modelling that credit as a deduction
         would give a wrong answer at every income, not only at the edges.
         Added 2026-09-02. */
      var cr = state.incomeTax.taxCredit;
      if (cr) {
        var pick = function (t) {
          return (input.filingStatus in t) ? t[input.filingStatus] : t.single;
        };
        var credit = Math.max(0, pick(cr.base)
          - Math.max(0, baseEtat - pick(cr.phaseOutStart)) * cr.phaseOutRate);
        stateTax = Math.max(0, stateTax - credit);
      }
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

    /* Generic employee-paid state programmes, each with its own label so the
       breakdown can name it honestly. Washington keeps its two named fields
       because its WA Cares row can be switched off by an exempt worker;
       everything else added from here on uses this list. Pennsylvania is the
       first: its 0.07% unemployment contribution comes out of every check.
       Added 2026-08-28, and it is what New Jersey's four programmes will need. */
    var programmes = [];
    (state.employeePrograms || []).forEach(function (pg) {
      var base = pg.wageCap ? Math.min(gross, pg.wageCap) : gross;
      programmes.push({ label: pg.label, amount: base * pg.rate });
    });
    var totalProgrammes = programmes.reduce(function (t, pg) { return t + pg.amount; }, 0);

    var totalTax = federal + ss + medicare + addlMedicare + stateTax
                 + paidLeave + waCares + totalProgrammes;
    var net = gross - totalTax - pretax;

    return {
      gross: gross,
      pretax: pretax,
      federal: federal,
      socialSecurity: ss,
      medicare: medicare + addlMedicare,
      stateTax: stateTax,
      programmes: programmes,
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

    /* L'Etat vient de data-state sur les 10 pages /paycheck-calculator/<etat>/,
       ou il est FIXE. Les pages "X an hour is how much a year" ne portent aucun
       Etat : elles ajoutent un <select name="state">, et l'Etat doit alors etre
       relu a CHAQUE calcul, pas une seule fois au chargement.
       Ajoute le 05/09/2026 : ces pages n'avaient aucun champ de saisie, donc
       aucun moyen pour le visiteur d'obtenir son propre chiffre. */
    function etatCourant() {
      return (form.elements.state && form.elements.state.value)
             || form.getAttribute("data-state");
    }

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

    /* Lit un montant comme un LECTEUR le lit, pas comme parseFloat le lit.
       Trouve le 02/09/2026 en se mettant a la place d'un visiteur : on tape
       "75,000", la forme que tout Americain ecrit, et parseFloat s'arrete a la
       virgule. Le site repondait alors "votre net : $5.77 par mois" - un
       resultat FAUX, affiche sans le moindre avertissement, sur un salaire de
       75 000 $ lu comme 75 $. "$75000" etait de son cote purement REFUSE.
       Un calculateur d'argent qui se trompe en silence sur la saisie la plus
       courante est pire qu'un calculateur qui refuse.

       On accepte donc ce que les gens ecrivent : le signe dollar, les espaces
       (y compris l'insecable que collent les copier-coller), et la virgule des
       milliers. Convention americaine, assumee : la virgule separe les
       milliers, le point les decimales. On refuse tout le reste. */
    function montantSaisi(texte) {
      if (typeof texte !== "string") return NaN;
      var net = texte.replace(/[\s\u00a0\u202f]/g, "").replace(/^[$]/, "").replace(/,/g, "");
      /* Apres nettoyage il ne reste qu'un nombre, sinon on refuse. Sans ce
         controle, "12abc" passerait pour 12. */
      if (!/^\d*\.?\d+$/.test(net)) return NaN;
      return parseFloat(net);
    }

    function read() {
      var salary = montantSaisi(form.elements.salary.value);
      var per = form.elements.period.value;
      var field = form.elements.salary.closest(".field");
      var hoursBrut = form.elements.hours ? form.elements.hours.value : String(HOURS_DEFAULT);
      var hours = montantSaisi(hoursBrut);
      if (!isFinite(hours) || hours <= 0) hours = HOURS_DEFAULT;

      if (!isFinite(salary) || salary <= 0) {
        field.classList.add("is-invalid");
        return null;
      }
      field.classList.remove("is-invalid");

      var retraite = montantSaisi(form.elements.retirement.value);
      if (!isFinite(retraite) || retraite < 0) retraite = 0;

      return {
        grossAnnual: salary * periodsPerYear(per, hours),
        hoursPerWeek: hours,
        filingStatus: form.elements.filing.value,
        retirementPct: retraite / 100,
        state: etatCourant(),
        waCaresApplies: form.elements.wacares ? form.elements.wacares.checked : true
      };
    }

    /* ---- LA REPARTITION DE LA PAIE, en une seule source ------------------
       Le camembert, les barres et les lignes chiffrees lisent TOUS ce tableau.
       Trois representations d'un meme calcul qui se contrediraient seraient
       pires que pas de graphique du tout.

       ⛔ Le 401(k) n'est PAS en rouge. Le rouge, sur ce site, veut dire « cet
       argent ne t'appartient plus ». Une cotisation 401(k) reste ton argent :
       elle est differee, pas prelevee. La peindre comme un impot serait une
       erreur de fond, pas de style — et c'est exactement le genre de nuance
       qu'aucun concurrent ne fait. */
    function repartition(a) {
      var segs = [{ cle: "net", libelle: "Take-home pay", montant: a.net, couleur: "keep" }];
      segs.push({ cle: "fed", libelle: "Federal income tax", montant: a.federal, couleur: "fed" });
      segs.push({ cle: "fica", libelle: "Social Security and Medicare",
                  montant: a.socialSecurity + a.medicare, couleur: "fica" });
      if (a.stateTax > 0) segs.push({ cle: "state", libelle: "State income tax",
                                      montant: a.stateTax, couleur: "state" });
      var autres = 0;
      if (a.paidLeave > 0) autres += a.paidLeave;
      if (a.waCares > 0) autres += a.waCares;
      (a.programmes || []).forEach(function (pg) { if (pg.amount > 0) autres += pg.amount; });
      if (autres > 0) segs.push({ cle: "prog", libelle: "State payroll programmes",
                                  montant: autres, couleur: "prog" });
      if (a.pretax > 0) segs.push({ cle: "401k", libelle: "401(k), still yours",
                                    montant: a.pretax, couleur: "defer" });
      return segs.filter(function (s) { return s.montant > 0; });
    }

    /* Le camembert. Un seul <circle> par part, rayon 15.915 : sa circonference
       vaut 100, donc stroke-dasharray se lit directement en pourcents. Aucune
       bibliotheque — une bibliotheque de graphiques pour un anneau couterait
       de 40 a 200 Ko, soit une a six fois tout le poids du site. */
    function camembert(segs, brut, pctNet) {
      /* pctNet vient de la repartition reconciliee, il n'est PAS recalcule ici :
         deux arrondis independants peuvent donner 78 au centre et 79 dans la
         liste, a trois centimetres l'un de l'autre. */
      var off = 25, parts = "";   /* 25 = demarrer a midi plutot qu'a 3 heures */
      segs.forEach(function (s) {
        var p = brut > 0 ? (s.montant / brut) * 100 : 0;
        parts += '<circle class="donut-seg donut-' + s.couleur + '" cx="21" cy="21" r="15.915"' +
                 ' fill="none" stroke-width="5" stroke-dasharray="' + p.toFixed(2) + ' ' +
                 (100 - p).toFixed(2) + '" stroke-dashoffset="' + off.toFixed(2) + '"></circle>';
        off -= p;
      });
      return '<svg class="donut" viewBox="0 0 42 42" aria-hidden="true" focusable="false">' +
             '<circle class="donut-fond" cx="21" cy="21" r="15.915" fill="none" stroke-width="5"></circle>' +
             parts + "</svg>" +
             '<p class="donut-centre"><span class="donut-pct num">' + pctNet + "%</span>" +
             '<span class="donut-mot">you keep</span></p>';
    }

    /* Le chiffre qui monte. ~350 ms, uniquement sur le montant principal : le
       visiteur vient chercher CE nombre, l'animer le designe. Tout animer
       n'aurait designe rien du tout.
       prefers-reduced-motion n'est pas une option ici : pour quelqu'un sujet au
       mal des transports vestibulaire, un nombre qui defile est un symptome. */
    var animation = null;
    function animerChiffre(el, valeur, formate) {
      if (animation) { cancelAnimationFrame(animation); animation = null; }
      var reduit = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduit || !window.requestAnimationFrame || valeur <= 0) { el.textContent = formate(valeur); return; }
      var debut = null, duree = 350;
      function pas(t) {
        if (debut === null) debut = t;
        var p = Math.min((t - debut) / duree, 1);
        /* Sortie en douceur : la fin compte plus que le debut, c'est la que
           l'oeil se pose sur le chiffre definitif. */
        el.textContent = formate(valeur * (1 - Math.pow(1 - p, 3)));
        if (p < 1) animation = requestAnimationFrame(pas); else animation = null;
      }
      animation = requestAnimationFrame(pas);
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
      (a.programmes || []).forEach(function (pg) {
        if (pg.amount > 0) rows.push([pg.label, pg.amount]);
      });
      if (a.pretax > 0) rows.push(["401(k) contribution", a.pretax]);

      var segs = repartition(a);
      /* Part exacte, pour les largeurs de barre et les parts du camembert :
         celles-la ne s'additionnent pas a l'oeil, elles se dessinent. */
      var part = function (m) { return a.gross > 0 ? (m / a.gross) * 100 : 0; };

      /* ⛔ LES POURCENTAGES AFFICHES SE REPARTISSENT, ILS NE S'ARRONDISSENT PAS
         CHACUN DE SON COTE. Le 05/09/2026, arrondir chaque part separement
         donnait 101 % dans 19 cas sur 36 testes : Ohio a 85 000 $ affichait
         79 + 12 + 8 + 2. Le camembert etait juste — seuls les libelles chiffres
         derivaient — mais un lecteur qui additionne trouve 101, et une IA qui
         cite la page reprend 101. Sur un site dont l'argument est l'exactitude,
         c'est le pire endroit ou se tromper d'un point.
         Methode du plus fort reste : on prend la partie entiere de chacun, puis
         on distribue les points manquants aux parts dont la decimale etait la
         plus grande. La somme fait 100 par construction. */
      var pcts = (function (valeurs, total) {
        var n = valeurs.length;
        if (!(total > 0) || !n) { return valeurs.map(function () { return 0; }); }
        var bruts = valeurs.map(function (v) { return (v / total) * 100; });
        var bas = bruts.map(function (x) { return Math.floor(x); });
        var somme = bas.reduce(function (x, y) { return x + y; }, 0);
        var reste = Math.max(0, Math.min(n, 100 - somme));
        var ordre = bruts.map(function (x, i) { return { i: i, frac: x - Math.floor(x) }; })
                         .sort(function (u, v) { return v.frac - u.frac; });
        for (var k = 0; k < reste; k++) { bas[ordre[k].i]++; }
        return bas;
      })(segs.map(function (s) { return s.montant; }), a.gross);
      var pctDe = function (cle) {
        for (var i = 0; i < segs.length; i++) { if (segs[i].cle === cle) return pcts[i]; }
        return 0;
      };

      /* Le resume en toutes lettres n'est pas un pis-aller pour lecteur d'ecran :
         c'est la phrase que les moteurs generatifs peuvent citer, et le camembert
         ne leur dit rien. Un graphique sans son equivalent texte est invisible
         deux fois.

         ⛔ Le 401(k) est sorti de la phrase « the rest goes to ». Premiere
         version, le 05/09/2026 : elle rangeait la cotisation 401(k) avec les
         impots, ce qui est FAUX — cet argent n'est pas pris, il est differe.
         Une phrase destinee a etre citee par une IA doit etre juste au mot pres.
         Corrige au passage : « Social Security and Medicare TAKES » — sujet
         pluriel. On ecrit « at X percent », qui ne s'accorde avec rien. */
      var prelevements = segs.filter(function (s) { return s.cle !== "net" && s.cle !== "401k"; });
      var differe = segs.filter(function (s) { return s.cle === "401k"; })[0];
      var morceaux = prelevements.map(function (s) {
        return s.libelle.replace(/^State income tax$/, "state income tax")
                        .replace(/^Federal income tax$/, "federal income tax")
                        .replace(/^State payroll programmes$/, "state payroll programmes") +
               " at " + pctDe(s.cle) + " percent";
      });
      var dernier = morceaux.pop();
      var liste = morceaux.length ? morceaux.join(", ") + " and " + dernier : dernier;
      var resume = "Of " + v(a.gross) + " gross, you keep " + v(a.net) + " — " +
                   /* « takes the rest » serait faux des qu'un 401(k) existe :
                      le reste n'est alors pas entierement du prelevement. */
                   pctDe("net") + " percent. Withholding accounts for " + liste + "." +
                   (differe ? " A further " + v(differe.montant) + ", " +
                    pctDe("401k") + " percent, goes to your 401(k), which is " +
                    "deferred rather than taken." : "");

      var html =
        '<p class="result-label">Your take-home pay</p>' +
        /* « $59,973.50 / per year » : la barre ET « per » disaient la meme
           chose, et aucun anglophone n'ecrit les deux. On garde le libelle
           seul, qui se lit tel quel pour chacune des six periodes : per year,
           per month, twice a month, every two weeks, per week, per hour.
           Corrige le 02/09/2026, sur la ligne la plus lue du site. */
        '<p class="result-head num"><span data-anime>' + v(a.net) + "</span> " +
        '<span class="result-unit">' + label.toLowerCase() + "</span></p>" +
        '<div class="repartition">' +
          '<div class="donut-wrap">' + camembert(segs, a.gross, pctDe("net")) + "</div>" +
          '<ul class="parts">' +
            segs.map(function (s, i) {
              return '<li class="part part-' + s.couleur + '">' +
                     '<span class="part-nom">' + s.libelle + "</span>" +
                     '<span class="part-montant num">' + v(s.montant) + "</span>" +
                     '<span class="part-pct num">' + pcts[i] + "%</span>" +
                     '<span class="part-piste"><i class="part-barre"></i></span></li>';
            }).join("") +
          "</ul>" +
        "</div>" +
        '<p class="visually-hidden">' + resume + "</p>" +
        "<hr>" +
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

      /* Les largeurs de barre sont posees APRES l'insertion, pas dans le HTML :
         la CSP interdit l'attribut style="", donc on passe par la propriete. */
      var barres = out.querySelectorAll(".part-barre");
      segs.forEach(function (s, i) { if (barres[i]) barres[i].style.width = part(s.montant).toFixed(2) + "%"; });

      var cible = out.querySelector("[data-anime]");
      if (cible) animerChiffre(cible, a.net / div, function (x) { return usd.format(x); });
    }

    /* Sur un telephone, le resultat vit sous le bouton et donc SOUS l'ecran :
       le visiteur appuie sur « Calculate » et rien ne bouge devant lui. Vu en
       capture le 02/09/2026 sur un iPhone 13 — il faut deviner qu'il faut
       faire defiler pour trouver sa reponse. On l'amene donc au resultat,
       mais seulement s'il n'est pas deja visible : deplacer la page sous les
       yeux de quelqu'un qui voyait deja sa reponse serait pire que le
       probleme. Le clavier virtuel se referme au passage. */
    function montrerLeResultat() {
      if (!out) return;
      var r = out.getBoundingClientRect();
      var dejaVu = r.top >= 0 && r.bottom <= (window.innerHeight || 0);
      if (dejaVu) return;
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      out.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      render();
      montrerLeResultat();
    });
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
