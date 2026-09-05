/* Attendre que le chiffre du calculateur ait FINI de bouger.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * Le meme defaut a mordu TROIS fois, dans trois scripts differents, en une
 * seule journee (05/09/2026) :
 *   1. parcours-client.js attendait 180 ms  -> 5 faux defauts de saisie
 *   2. mon propre script de verification    -> un faux echec sur Hawaii
 *   3. test-etat-navigateur.js attendait 120 ms -> 11 faux echecs sur l'Ohio,
 *      une page pourtant inchangee et verte la veille
 *
 * A chaque fois la cause est la meme : le net affiche est ANIME (animerChiffre
 * dans assets/calc-paycheck.js, 350 ms), et un script qui lit trop tot lit un
 * chiffre a mi-course. La lecture vaut alors ~70 % de la valeur finale, ce qui
 * ressemble a s'y meprendre a une erreur de calcul.
 *
 * ⛔ LE DANGER N'EST PAS LE FAUX ECHEC, C'EST LA FAUSSE CORRECTION. La premiere
 * fois, on a failli corriger du code juste pour satisfaire un test qui se
 * trompait. Un test qu'on ne comprend pas est plus dangereux qu'un test absent.
 *
 * ⛔ NE JAMAIS attendre une duree fixe. Une duree fixe est un pari sur la
 * machine, et elle se re-casse au prochain changement d'animation. On attend
 * que le texte cesse de changer : ca ne se perime pas.
 *
 * Usage :
 *   const { stabilise } = require("./attente.js");
 *   await page.click("button[type=submit]");
 *   await stabilise(page);
 */

/* Rend la main des que le texte du resultat est identique a la lecture
   precedente, ou apres 1,8 s (30 x 60 ms) si la page ne se stabilise jamais —
   auquel cas c'est au test appelant de constater l'ecart et d'echouer. */
async function stabilise(page, selecteur) {
  const sel = selecteur || "[data-paycheck-result] .result-head";
  let precedent = null;
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate((s) => {
      const t = document.querySelector(s);
      return t ? t.textContent : null;
    }, sel);
    if (v !== null && v === precedent) return;
    precedent = v;
    await page.waitForTimeout(60);
  }
}

module.exports = { stabilise };
