/* Lit une source officielle dans un VRAI navigateur et en extrait le texte.
 *
 * Pourquoi ce script existe : le 27/08/2026, deux sources officielles du Texas
 * ont resiste a curl et a WebFetch.
 *   - twc.texas.gov  -> HTTP 403 Forbidden, meme avec un User-Agent de navigateur.
 *   - statutes.capitol.texas.gov -> HTTP 200, mais deux textes de loi DIFFERENTS
 *     renvoyaient exactement 250874 octets identiques : le site sert une coquille
 *     JavaScript. Le contenu n'existe qu'apres execution du script.
 * Un navigateur reel resout les deux : il execute le JS et presente une signature
 * TLS normale. C'est un changement de METHODE, pas une variante de plus.
 *
 * Profil EPHEMERE : on ne touche jamais au profil Chrome de la machine. La regle
 * channel:'chrome' ne vise que les scripts qui ouvrent un profil existant.
 *
 * Usage : node .tooling/ops/lire-source.js <url> [motif-de-recherche]
 */

const { chromium } = require("playwright");

const url = process.argv[2];
const motif = process.argv[3] || null;
if (!url) { console.error("usage: node lire-source.js <url> [motif]"); process.exit(1); }

(async () => {
  const nav = await chromium.launch({ headless: true });
  const ctx = await nav.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
               "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await ctx.newPage();
  let statut = "INDETERMINE";
  try {
    const rep = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    statut = rep ? rep.status() : "pas de reponse";
    // On laisse le JS finir : c'est tout l'interet de passer par un navigateur.
    await page.waitForTimeout(3500);

    const texte = await page.evaluate(() => document.body.innerText);
    console.log("URL      : " + url);
    console.log("STATUT   : " + statut);
    console.log("LONGUEUR : " + texte.length + " caracteres de texte visible");
    console.log("=".repeat(70));

    if (motif) {
      // Un motif = on ne veut que les phrases qui portent le fait, avec leur
      // contexte. Recopier 250 000 caracteres ne prouve rien et noie la preuve.
      const re = new RegExp(motif, "i");
      const lignes = texte.split("\n").map(l => l.trim()).filter(Boolean);
      let trouve = 0;
      lignes.forEach((l, i) => {
        if (re.test(l)) {
          trouve++;
          console.log("--- occurrence " + trouve + " (ligne " + i + ") ---");
          console.log(lignes.slice(Math.max(0, i - 1), i + 3).join("\n"));
          console.log("");
        }
      });
      if (!trouve) console.log("MOTIF ABSENT de la page : " + motif);
    } else {
      console.log(texte.slice(0, 6000));
    }
  } catch (e) {
    console.log("ECHEC : " + e.message);
  } finally {
    await nav.close();
  }
})();
