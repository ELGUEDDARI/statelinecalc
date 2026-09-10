/* Verifie DEUX choses sur chaque lien de .tooling/lib/sources.js :
 *   1. il repond encore ;
 *   2. s'il est declare `document`, la page porte VRAIMENT le chiffre que
 *      notre libelle lui attribue.
 *
 * ── POURQUOI LE POINT 2 EXISTE ──────────────────────────────────────────────
 * Le 10/09/2026, la premiere version du bloc Sources annoncait chaque lien
 * comme portant son chiffre. Le controle independant a demande de le prouver.
 * Mesure : 7 liens sur 21 le portaient, 14 non — c'etaient des pages d'accueil
 * d'agence. Sur l'Utah, le lien CONTREDISAIT meme un avertissement de la page :
 * `incometax.utah.gov` affiche encore « January 1, 2025 – current 4.5% » un an
 * apres la baisse a 4,45 %.
 * Depuis, le fichier distingue `document` et `agence`, et ce controle rend la
 * distinction TESTABLE : un `document` qui cesse de porter son chiffre echoue
 * ici, avant la publication, au lieu de mentir en ligne.
 *
 * ── LA METHODE, EN DEUX TEMPS ───────────────────────────────────────────────
 * curl d'abord, parce que c'est rapide. Mais un 403 de curl NE PROUVE PAS
 * qu'une page est morte : ssa.gov repond 403 a curl et 200 dans un Chromium
 * reel. Toute URL qui n'est pas 200 est donc re-testee dans un vrai navigateur
 * avant d'etre declaree en echec. Meme regle pour lire le texte : pdftotext
 * pour les PDF, navigateur reel pour le HTML.
 *
 * Lancer : node .tooling/test/verif-liens-sources.js
 *          node .tooling/test/verif-liens-sources.js --vite   (codes seuls)
 */
const https = require("https");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFileSync } = require("child_process");
const { FEDERALES, PAR_ETAT, VERIFIE_LE } = require("../lib/sources.js");

const VITE = process.argv.includes("--vite");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const TMP = path.join(os.tmpdir(), "verif-liens-sources");
fs.mkdirSync(TMP, { recursive: true });

function curl(url, n = 0) {
  return new Promise(ok => {
    const req = https.get(url, { headers: { "User-Agent": UA } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && n < 4) {
        r.resume();
        const suite = r.headers.location.startsWith("http")
          ? r.headers.location : new URL(r.headers.location, url).href;
        return ok(curl(suite, n + 1));
      }
      r.resume();
      ok({ code: r.statusCode, type: String(r.headers["content-type"] || "") });
    });
    req.on("error", () => ok({ code: 0, type: "" }));
    req.setTimeout(25000, () => { req.destroy(); ok({ code: 0, type: "" }); });
  });
}

async function navigateur(url) {
  let nav;
  try {
    const { chromium } = require("playwright");
    nav = await chromium.launch({ headless: true });
    const ctx = await nav.newContext({ userAgent: UA, locale: "en-US" });
    const page = await ctx.newPage();
    const r = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    const code = r ? r.status() : 0;
    /* `domcontentloaded` ne suffit pas sur un site qui construit sa page en JS.
       Mesure du 10/09 : statutes.capitol.texas.gov sert la MEME coquille de
       250 874 octets pour CN.8 et LA.204 ; le texte de loi n'arrive qu'apres.
       On attend donc que le reseau se taise, sans en faire un echec si la page
       garde une connexion ouverte (analytics, sondage) : le contenu est la. */
    if (code === 200) {
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
    /* On lit le HTML RENDU, pas `innerText`. Mesure du 10/09 : la page
       des.nc.gov/need-help/faqs/employer-tax-faqs porte sa phrase dans un
       accordeon FERME. innerText rendait 4 508 caracteres et ne la voyait pas ;
       page.content() en rend 206 396 et la trouve. Un accordeon ferme reste du
       contenu publie : Google le lit, le lecteur l'ouvre d'un clic. */
    const texte = code === 200 ? (await page.content()).replace(/<[^>]*>/g, " ") : "";
    await nav.close();
    return { code, texte };
  } catch (e) {
    if (nav) { try { await nav.close(); } catch (e2) {} }
    return { code: 0, texte: "" };
  }
}

function textePdf(url) {
  const f = path.join(TMP, "doc.pdf");
  execFileSync("curl", ["-s", "-L", "--max-time", "60", "-A", UA, "-o", f, url]);
  return execFileSync("pdftotext", ["-layout", f, "-"], { encoding: "utf8", maxBuffer: 80e6 });
}

(async () => {
  const toutes = [];
  FEDERALES.forEach(s => toutes.push(["federal", s]));
  for (const [cle, liste] of Object.entries(PAR_ETAT)) liste.forEach(s => toutes.push([cle, s]));

  const docs = toutes.filter(([, s]) => s.type === "document").length;
  console.log("=== " + toutes.length + " liens (" + docs + " documents, "
    + (toutes.length - docs) + " agences), controle declare le " + VERIFIE_LE + " ===\n");

  let ok = 0, ko = 0, sauves = 0;
  for (const [cle, s] of toutes) {
    const rep = await curl(s.url);
    let code = rep.code;
    /* PDF ou HTML : on tranche sur le TYPE MIME du serveur, jamais sur le nom
       de l'URL. Le guide georgien s'appelle « /download » et est un PDF. */
    const estPdf = /pdf/i.test(rep.type) || s.url.endsWith(".pdf");
    let texte = "", via = "curl";
    if (code !== 200) {
      const codeCurl = code;
      const r = await navigateur(s.url);
      if (r.code === 200) { code = 200; texte = r.texte; via = "navigateur (curl disait " + codeCurl + ")"; sauves++; }
      else { via = "curl " + codeCurl + " puis navigateur " + r.code; }
    }
    if (code !== 200) {
      ko++; console.log("  ECHEC  | " + cle.padEnd(15) + " | injoignable : " + via + " | " + s.url);
      continue;
    }
    if (s.type !== "document" || VITE) {
      ok++; console.log("  OK     | " + cle.padEnd(15) + " | " + (s.type === "document" ? "200, motif non teste (--vite)" : "200, agence") + " | " + s.url);
      continue;
    }
    /* Un `document` doit porter son chiffre. On lit le texte rendu. */
    try {
      if (!texte) texte = estPdf ? textePdf(s.url) : (await navigateur(s.url)).texte;
    } catch (e) { texte = ""; }
    /* Normalisation avant comparaison : les sites d'agence ecrivent
       « employees&rsquo; wages » avec une apostrophe typographique, nos motifs
       avec une apostrophe droite. Sans ca, un motif juste echoue. */
    const t = texte
      .replace(/&(rsquo|lsquo|#8217|#39|apos);/g, "'")
      .replace(/&(nbsp|#160);/g, " ")
      .replace(/[‘’‛]/g, "'")
      .replace(/\s+/g, " ").toLowerCase();
    const trouves = (s.motif || []).filter(m => t.includes(m.toLowerCase()));
    if (trouves.length) {
      ok++;
      console.log("  OK     | " + cle.padEnd(15) + " | porte : " + trouves.join(", ") + " | " + s.url);
    } else {
      ko++;
      console.log("  ECHEC  | " + cle.padEnd(15) + " | NE PORTE PLUS : " + (s.motif || []).join(" | ")
        + " | " + s.url);
    }
  }

  console.log("\n=== LIENS DE SOURCES : " + ok + " OK, " + ko + " ECHEC ===");
  if (sauves) console.log("    (" + sauves + " sauves par le navigateur : le refus de curl etait un blocage de robot)");
  if (ko) console.log("⛔ Un document qui ne porte plus son chiffre doit etre RECLASSE en agence,\n"
    + "   ou remplace, AVANT publication. Ne pas se contenter de changer le motif.");
  process.exit(ko === 0 ? 0 : 1);
})();
