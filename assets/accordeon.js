/* Accordeons FAQ et pied de page (DESIGN 1, 22/10/2026).
   Sous 768 px : ce sont de vrais accordeons <details> (la CSS et le HTML suffisent, ce fichier ne
   fait rien). A partir de 768 px : tout reste OUVERT et les <summary> sortent de la tabulation,
   sinon un lecteur d'ecran annoncerait « replie » sur un bloc visible et le clavier s'arreterait
   sur 11 controles sans effet. Le script remplace ::details-content pour les navigateurs qui ne le
   connaissent pas (Firefox avant 143, Safari avant 18.4) : sans lui FAQ et pied y resteraient
   replies sur ordinateur. Sans JavaScript, le HTML reste lisible (details natifs).
   Aucun changement de mise en page : le contenu est deja visible via la CSS quand elle le sait. */
(function () {
  "use strict";
  if (!window.matchMedia) return;
  var mq = window.matchMedia("(min-width: 768px)");
  function appliquer() {
    var liste = document.querySelectorAll("details.faq-item, details.pied-col, details.fold");
    for (var i = 0; i < liste.length; i++) {
      var d = liste[i], s = d.firstElementChild;
      if (!s || s.tagName !== "SUMMARY") continue;
      if (mq.matches) {
        if (!d.hasAttribute("data-etat-mobile")) d.setAttribute("data-etat-mobile", d.open ? "1" : "0");
        d.open = true;
        s.setAttribute("tabindex", "-1");
        s.setAttribute("aria-disabled", "true");
      } else {
        if (d.hasAttribute("data-etat-mobile")) {
          d.open = d.getAttribute("data-etat-mobile") === "1";
          d.removeAttribute("data-etat-mobile");
        }
        s.removeAttribute("tabindex");
        s.removeAttribute("aria-disabled");
      }
    }
  }
  /* Sur ordinateur un clic (ou Entree/Espace) sur le summary ne doit rien refermer. */
  document.addEventListener("click", function (e) {
    if (!mq.matches || !e.target.closest) return;
    var s = e.target.closest("details.faq-item > summary, details.pied-col > summary, details.fold > summary");
    if (s) e.preventDefault();
  });
  /* Table des matieres des pages main.layout-2col : colonne collante, donc ouverte, a partir de 1100 px. */
  var mqToc = window.matchMedia("(min-width: 1100px)");
  function appliquerToc() {
    var d = document.querySelector("main.layout-2col .col-contenu > details.toc");
    if (!d) return;
    var s = d.firstElementChild;
    if (mqToc.matches) {
      if (!d.hasAttribute("data-etat-mobile")) d.setAttribute("data-etat-mobile", d.open ? "1" : "0");
      d.open = true;
      if (s) { s.setAttribute("tabindex", "-1"); s.setAttribute("aria-disabled", "true"); }
    } else {
      if (d.hasAttribute("data-etat-mobile")) {
        d.open = d.getAttribute("data-etat-mobile") === "1";
        d.removeAttribute("data-etat-mobile");
      }
      if (s) { s.removeAttribute("tabindex"); s.removeAttribute("aria-disabled"); }
    }
  }
  document.addEventListener("click", function (e) {
    if (!mqToc.matches || !e.target.closest) return;
    var s = e.target.closest("main.layout-2col details.toc > summary");
    if (s) e.preventDefault();
  });
  /* VAGUE 0 (27/10/2026) : un lien d'ancre (puce, #states) vers un contenu replie ouvre le repli. */
  function ouvrirCible() {
    var id = decodeURIComponent((location.hash || "").slice(1));
    var el = id && document.getElementById(id);
    if (!el || !el.closest) return;
    var d = el.closest("details.fold"), ouvert = false;
    while (d) { if (!d.open) { d.open = true; ouvert = true; } d = d.parentElement && d.parentElement.closest("details.fold"); }
    if (ouvert && el.scrollIntoView) el.scrollIntoView();
  }
  window.addEventListener("hashchange", ouvrirCible);
  appliquer();
  appliquerToc();
  ouvrirCible();
  if (mqToc.addEventListener) mqToc.addEventListener("change", appliquerToc);
  else if (mqToc.addListener) mqToc.addListener(appliquerToc);
  if (mq.addEventListener) mq.addEventListener("change", appliquer);
  else if (mq.addListener) mq.addListener(appliquer);
})();
