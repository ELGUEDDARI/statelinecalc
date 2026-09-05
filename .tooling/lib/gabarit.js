/* L'en-tete et le pied de page du site, en UN SEUL endroit.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * Le 05/09/2026, l'en-tete et le pied de page etaient recopies dans les 32
 * pages servies. Mesure faite avant d'ecrire une ligne : **3 versions
 * differentes de l'en-tete** et **4 du pied de page** circulaient, sans que
 * personne ne l'ait decide. L'accueil avait son pied de page a lui, la page
 * Washington aussi.
 *
 * Ce n'est pas qu'un probleme de proprete. Six pages d'Etat — Floride, Georgie,
 * Illinois, Nevada, Texas, Washington — n'ont AUCUN generateur : leur HTML est
 * ecrit a la main. Changer l'en-tete demandait donc d'editer 32 fichiers dont
 * 6 qu'aucun script ne peut regenerer. Et on sait ce que ca donne : le
 * 02/09/2026, relancer build-pennsylvania.js a silencieusement supprime des
 * liens de la page, parce que sa copie de la liste des Etats datait.
 *
 * Regle : on change la navigation ICI, on relance la migration, et le test
 * verif-gabarit.js prouve que les 32 pages sont identiques au bit pres.
 *
 * ── CE QUE LA CENTRALISATION A REPARE AU PASSAGE ────────────────────────────
 * 1. Les 9 pages « salary to hourly » n'avaient PAS le lien « Salary to Hourly »
 *    dans leur menu : les 8 pages d'Etat ne pointaient pas vers leur propre hub.
 * 2. Seules les 4 pages par taux avaient un lien « Home » en pied de page.
 *    Les 28 autres n'en avaient aucun.
 * Les deux sont dans la version canonique. Rien n'a ete retire.
 *
 * ── CE QUI N'EST PAS ICI ────────────────────────────────────────────────────
 * Le <head> (titre, description, canonical, JSON-LD) reste propre a chaque
 * page : il varie legitimement. L'entite Organization/WebSite a deja sa source
 * unique dans entite.js, la liste des Etats publies dans etats-publies.js.
 */

/* Le logo. Dessine en SVG inline plutot que charge : 340 octets, aucune requete,
   et il s'affiche meme si le reseau lache. Les couleurs sont ecrites en dur
   parce qu'un SVG inline ne peut pas lire les variables CSS du document dans
   tous les contextes ou il sert (og-image, favicon).
   VARIANTE CLAIRE, 05/09/2026 : l'en-tete est passe en navy #0A2A5E. Le carre
   du logo etait #0F172A — pose sur ce navy il ne se distinguait plus. Le carre
   est donc blanc ici et les barres reprennent le navy. C'est la version
   sur-fond-sombre de la marque ; la favicon et l'og-image gardent la sombre. */
const LOGO =
  '<svg class="brand-mark" width="22" height="22" viewBox="0 0 64 64" aria-hidden="true" ' +
  'focusable="false"><rect width="64" height="64" rx="14" fill="#FFFFFF"/>' +
  '<rect x="30" y="10" width="4" height="44" rx="2" fill="#2563EB"/>' +
  '<rect x="12" y="34" width="12" height="20" rx="2" fill="#0A2A5E"/>' +
  '<rect x="40" y="22" width="12" height="32" rx="2" fill="#0A2A5E"/></svg>';

/* La navigation principale. Ajouter une rubrique ICI et nulle part ailleurs. */
const NAV = [
  { cle: "paycheck",    href: "/paycheck-calculator/",         libelle: "Paycheck" },
  { cle: "s2h",         href: "/salary-to-hourly-calculator/", libelle: "Salary&nbsp;to&nbsp;Hourly" },
  { cle: "methodology", href: "/methodology/",                 libelle: "Methodology" }
];

/* Les liens du pied de page. */
const PIED = [
  { href: "/",            libelle: "Home" },
  { href: "/about/",      libelle: "About" },
  { href: "/methodology/", libelle: "Methodology" },
  { href: "/contact/",    libelle: "Contact" },
  { href: "/privacy/",    libelle: "Privacy" },
  { href: "/terms/",      libelle: "Terms" },
  { href: "/disclaimer/", libelle: "Disclaimer" }
];

/* actif : "paycheck" | "s2h" | "methodology" | null.
 * On MARQUE la rubrique courante (aria-current) au lieu de retirer son lien :
 * un lecteur d'ecran l'annonce, et la page garde son maillage interne. Les
 * pages « salary to hourly » retiraient leur propre lien — elles perdaient le
 * chemin vers leur hub sans rien gagner. */
function entete(actif) {
  const liens = NAV.map(n => {
    const marque = (n.cle === actif) ? ' aria-current="page"' : "";
    return `        <a href="${n.href}"${marque}>${n.libelle}</a>`;
  }).join("\n");
  /* Le bouton d'action pointe vers le hub des calculateurs, jamais vers une
     ancre : une ancre #calc n'existe pas sur toutes les pages (About, Privacy,
     Terms n'ont pas de calculateur), et un bouton qui ne fait rien sur 8 pages
     est pire que pas de bouton. Le hub, lui, existe partout. */
  return `<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">${LOGO}StateLine Calc</a>
    <div class="site-nav-group">
      <nav class="site-nav" aria-label="Main">
${liens}
      </nav>
      <a class="btn btn-header" href="/paycheck-calculator/">Calculate My Pay</a>
    </div>
  </div>
</header>`;
}

function piedDePage() {
  const liens = PIED.map(l => `      <a href="${l.href}">${l.libelle}</a>`).join(" &middot;\n");
  return `<footer class="site-footer">
  <div class="wrap">
    <p><strong>StateLine Calc</strong> &mdash; free money calculators for all 50 states.
    No sign-up. No personal data required.</p>
    <p class="micro u-on-dark">
${liens}
    </p>
  </div>
</footer>`;
}

module.exports = { entete, piedDePage, NAV, PIED, LOGO };
