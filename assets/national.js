/* statelinecalc.com - page nationale /paycheck-calculator/ (27/10/2026)

   Ce fichier ne calcule RIEN. Le calcul est fait par assets/calc-paycheck.js avec
   data/rates-2026.min.js, exactement comme sur les 50 pages d'Etat. Ici on ne fait
   que trois choses autour du selecteur d'Etat :
     1. montrer la liste de comtes pour l'Indiana et le Maryland (les deux seuls Etats
        dont l'impot local se choisit), copiee depuis les pages de ces Etats ;
     2. mettre a jour le lien « See the full <Etat> paycheck calculator » ;
     3. preselectionner l'Etat si l'adresse porte ?state=<etat> (ex. /paycheck-calculator/?state=ohio).
   Rien de ce que le visiteur tape n'est lu, stocke ou envoye. */
(function () {
  "use strict";
  var form = document.querySelector("[data-paycheck-form]");
  if (!form || !form.elements.state) return;
  var sel = form.elements.state;
  var champ = form.querySelector("[data-county-field]");
  var comte = form.elements.county;
  var etiquette = form.querySelector("[data-county-label]");
  var lien = document.querySelector("[data-state-link]");

  function nom() { return sel.options[sel.selectedIndex].text; }

  function maj() {
    var modele = document.querySelector('template[data-county-for="' + sel.value + '"]');
    if (modele && champ && comte) {
      comte.innerHTML = modele.innerHTML;
      if (etiquette) etiquette.textContent = modele.getAttribute("data-county-title") || "Your county";
      champ.hidden = false;
    } else if (champ && comte) {
      comte.innerHTML = "";
      champ.hidden = true;
    }
    if (lien) {
      lien.setAttribute("href", "/paycheck-calculator/" + sel.value + "/");
      lien.innerHTML = "See the full " + nom() + " paycheck calculator &rarr;";
    }
  }

  /* Ecouteur sur le <select> lui-meme : il part avant celui du formulaire (phase de
     cible, puis remontee), donc la liste de comtes est a jour quand le moteur recalcule. */
  sel.addEventListener("change", maj);

  var m = /[?&]state=([a-z-]+)/.exec(window.location.search);
  if (m && sel.querySelector('option[value="' + m[1] + '"]')) {
    sel.value = m[1];
    maj();
    form.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    maj();
  }
})();
