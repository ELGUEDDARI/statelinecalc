/* Google Consent Mode v2 - valeurs PAR DEFAUT - statelinecalc.com (prepare le 27/10/2026)

   ETAT : PREPARE, NON CHARGE. Aucune page ne reference ce fichier. Il ne s'active qu'avec
   <script src="/assets/consent.js"></script> place AVANT analytics.js (voir
   00-CONSENT-PLAN-2026-10-27.md pour l'ordre exact et les tests).

   Ce qu'il fait : declare a gtag l'etat de consentement initial. Dans l'EEE, au Royaume-Uni et en
   Suisse, tout est « denied » tant que le visiteur n'a pas choisi dans le bandeau du CMP certifie
   Google (c'est le CMP, pas ce fichier, qui envoie ensuite gtag('consent','update', ...)).
   Partout ailleurs (Etats-Unis compris) rien ne change : « granted », la collecte actuelle continue.

   Ce qu'il ne fait PAS : il ne lit aucune valeur saisie, ne pose aucun cookie, ne charge aucun
   script tiers et ne detecte pas le pays lui-meme. Le filtrage par pays est celui du parametre
   « region » de gtag (source : developers.google.com/tag-platform/security/guides/consent, lu le
   27/10/2026), pas du code ici. Codes pays ISO 3166-1 alpha-2.

   Deux appels : le plus specifique l'emporte (meme page de Google). wait_for_update laisse 500 ms
   au CMP pour restituer un choix deja fait avant que gtag n'envoie son premier hit. */
window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }

/* EEE (27 UE + Islande, Liechtenstein, Norvege), Royaume-Uni, Suisse. */
gtag("consent", "default", {
  "ad_storage": "denied",
  "ad_user_data": "denied",
  "ad_personalization": "denied",
  "analytics_storage": "denied",
  "wait_for_update": 500,
  "region": ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
             "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
             "IS", "LI", "NO", "GB", "CH"]
});

/* Reste du monde : etat actuel du site, inchange. */
gtag("consent", "default", {
  "ad_storage": "granted",
  "ad_user_data": "granted",
  "ad_personalization": "granted",
  "analytics_storage": "granted"
});
