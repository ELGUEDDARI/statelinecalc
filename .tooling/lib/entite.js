/* =========================================================================
   L'ENTITE « StateLine Calc » — source unique.

   POURQUOI CE FICHIER EXISTE (mesure du 05/09/2026)
   Une recherche Google sur le mot « statelinecalc » ne renvoie PAS le site.
   Elle renvoie Stateline (le service de presse des Pew Charitable Trusts),
   Stateline Nevada, Stateline Casino, StateLineTack. Notre nom se fait
   absorber par l'entite voisine la plus forte.

   Ce n'est PAS un probleme d'orthographe : « StateLine Calc » est deja ecrit
   correctement 154 fois sur les 31 pages, sans une seule variante. Le defaut
   mesure etait ailleurs :
     - le bloc JSON-LD Organization ne portait que name + url + logo,
       repete a l'identique dans 7 gabarits et les pages statiques ;
     - aucun @id, donc rien qui relie le WebSite a l'Organization ;
     - `og:site_name` : ABSENT des 31 pages.
   Un moteur — ou une IA — n'avait aucun moyen de savoir que StateLine Calc
   est une chose distincte de Stateline.

   CE QU'ON N'ECRIT PAS ICI
   Pas de `sameAs`. Il demanderait des profils reels (LinkedIn, X, Wikidata)
   et nous n'en avons aucun. Inventer des URL serait pire que de ne rien
   declarer : une entite qui ment est une entite qu'on cesse de croire.
   ⚠️ Le jour ou un profil existe VRAIMENT, l'ajouter ici — nulle part ailleurs.

   foundingDate : 22/08/2026, lue sur le PREMIER COMMIT du depot
   (`git log --reverse`), pas estimee.
   ========================================================================= */

const RACINE = "https://statelinecalc.com";

const ID_ORG  = RACINE + "/#organization";
const ID_SITE = RACINE + "/#website";

const NOM = "StateLine Calc";

/* Une description qui dit ce que nous faisons ET ce qui nous distingue.
   C'est le texte qu'un moteur reprend pour separer deux entites homonymes. */
const DESCRIPTION_ORG =
  "StateLine Calc publishes free US paycheck and take-home pay calculators, " +
  "state by state, for tax year 2026. Every rate is read from the agency that " +
  "sets it and published with the date it was checked. Figures typed into a " +
  "calculator never leave the visitor's browser.";

const DESCRIPTION_SITE =
  "Free 2026 paycheck, salary-to-hourly and hourly-rate calculators for US " +
  "states, with the tax rates and the official source behind every figure.";

const organisation = {
  "@type": "Organization",
  "@id": ID_ORG,
  "name": NOM,
  "alternateName": "StateLineCalc",
  "url": RACINE + "/",
  "logo": {
    "@type": "ImageObject",
    "url": RACINE + "/assets/icon-512.png",
    "width": 512,
    "height": 512
  },
  "description": DESCRIPTION_ORG,
  "foundingDate": "2026-08-22",
  "knowsAbout": [
    "US payroll taxes",
    "State income tax",
    "Take-home pay",
    "Federal income tax brackets",
    "FICA",
    "Salary to hourly conversion"
  ],
  "areaServed": { "@type": "Country", "name": "United States" }
};

/* Le WebSite pointe vers l'Organization par @id : c'est ce lien qui fait
   d'un site et de son editeur UNE entite, et non deux fragments epars. */
const siteWeb = {
  "@type": "WebSite",
  "@id": ID_SITE,
  "name": NOM,
  "url": RACINE + "/",
  "description": DESCRIPTION_SITE,
  "inLanguage": "en-US",
  "publisher": { "@id": ID_ORG }
};

/* La reference courte, a utiliser dans le @graph d'une page interieure :
   on declare l'entite en entier une fois, on la reference ensuite. */
const refOrganisation = { "@id": ID_ORG };

/* Les balises meta d'entite, a poser dans <head> de CHAQUE page. */
const metaEntite =
  '<meta property="og:site_name" content="' + NOM + '">\n' +
  '<meta name="application-name" content="' + NOM + '">';

module.exports = {
  RACINE, ID_ORG, ID_SITE, NOM,
  DESCRIPTION_ORG, DESCRIPTION_SITE,
  organisation, siteWeb, refOrganisation, metaEntite
};
