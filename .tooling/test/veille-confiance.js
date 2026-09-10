/* Compare les SIGNAUX DE CONFIANCE des concurrents et les notres.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * `veille-concurrent.js` mesure ce qu'une page donne a manger aux moteurs :
 * mots, tableaux, montants, schema. Il ne dit rien de ce qui fait qu'un humain
 * CROIT un site d'argent. Le 10/09/2026 le PDG a demande de regarder ce que
 * fait le n°1 sur ce terrain-la et de le depasser. On mesure, on ne juge pas au
 * ressenti : chaque signal ci-dessous est present ou absent, comptable, et
 * re-mesurable dans trois mois.
 *
 * ⚠️ CE QUE CE SCRIPT NE PROUVE PAS. Il ne dit pas qui est n°1 : aucune API de
 * SERP classee n'est branchee sur cette machine. Les concurrents listes sont
 * ceux que la recherche web fait remonter, pas un classement mesure.
 *
 * ⚠️ adp.com repond 403 a curl comme a WebFetch. On le laisse dans la liste :
 * une ligne « INJOIGNABLE » est une information, une ligne absente est un trou.
 *
 * Lancer : node .tooling/test/veille-confiance.js
 */
const https = require("https");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

function get(url, redirections = 0) {
  return new Promise((ok) => {
    const req = https.get(url, { headers: { "User-Agent": UA, "Accept": "text/html" } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && redirections < 4) {
        r.resume();
        const suite = r.headers.location.startsWith("http")
          ? r.headers.location : new URL(r.headers.location, url).href;
        return ok(get(suite, redirections + 1));
      }
      let d = "";
      r.on("data", c => d += c);
      r.on("end", () => ok({ code: r.statusCode, html: d }));
    });
    req.on("error", () => ok({ code: 0, html: "" }));
    req.setTimeout(25000, () => { req.destroy(); ok({ code: 0, html: "" }); });
  });
}

/* Chaque signal : un nom, et une fonction qui rend une CHAINE (ce qu'on a
   trouve) ou null. Jamais un booleen seul : on veut pouvoir relire la preuve. */
const SIGNAUX = [
  ["adresse e-mail publiee", h => {
    const m = h.match(/mailto:([^"'<>\s?]+)/i);
    return m ? m[1] : null;
  }],
  ["telephone publie", h => {
    const m = h.match(/tel:\+?([0-9()\-.\s]{7,})/i);
    return m ? m[1].trim() : null;
  }],
  ["page contact liee", h => {
    const m = h.match(/href="([^"]*\/(contact|contact-us)[^"]*)"/i);
    return m ? m[1] : null;
  }],
  ["page a propos liee", h => {
    const m = h.match(/href="([^"]*\/(about|about-us|who-we-are)[^"]*)"/i);
    return m ? m[1] : null;
  }],
  ["auteur nomme (schema)", h => {
    const m = h.match(/"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i)
           || h.match(/"author"\s*:\s*"([^"]+)"/i);
    return m ? m[1] : null;
  }],
  ["relecteur / expert-comptable cite", h => {
    const m = h.match(/(reviewed by|fact[- ]checked by|verified by|edited by)[\s:<]*([^<]{0,60})/i);
    return m ? (m[1] + " " + m[2]).replace(/\s+/g, " ").trim().slice(0, 70) : null;
  }],
  ["date de mise a jour visible", h => {
    const m = h.match(/<time[^>]*datetime="([^"]+)"/i)
           || h.match(/(last updated|updated on|reviewed on)[\s:<]*([A-Z][a-z]+ \d{1,2},? \d{4})/i);
    return m ? (m[2] || m[1]) : null;
  }],
  ["page methodologie / editorial", h => {
    const m = h.match(/href="([^"]*(methodolog|editorial|how-we|our-process)[^"]*)"/i);
    return m ? m[1] : null;
  }],
  ["politique de confidentialite liee", h => {
    const m = h.match(/href="([^"]*privacy[^"]*)"/i);
    return m ? m[1] : null;
  }],
  ["conditions d'utilisation liees", h => {
    const m = h.match(/href="([^"]*(terms|conditions)[^"]*)"/i);
    return m ? m[1] : null;
  }],
  ["schema Organization", h => /"@type"\s*:\s*"(Organization|Corporation|NewsMediaOrganization)"/i.test(h)
      ? (h.match(/"@type"\s*:\s*"(Organization|Corporation|NewsMediaOrganization)"/i)[1]) : null],
  ["sameAs (profils officiels)", h => {
    const m = h.match(/"sameAs"\s*:\s*\[([^\]]{0,200})/i);
    return m ? (m[1].match(/https?:\/\/[^"',\s]+/g) || []).length + " profils" : null;
  }],
  ["liens vers une source .gov", h => {
    const n = new Set(h.match(/https?:\/\/[a-z0-9.\-]*\.gov[^"'<>\s]*/gi) || []).size;
    return n ? n + " liens .gov distincts" : null;
  }],
  ["avertissement (pas un conseil)", h =>
    /not (financial|tax|legal) advice|does not constitute (tax|financial|legal) advice|for (general )?informational purposes/i.test(h)
      ? "present" : null],
];

const CIBLES = [
  ["NOUS", "https://statelinecalc.com/paycheck-calculator/north-carolina/"],
  ["SmartAsset", "https://smartasset.com/taxes/north-carolina-paycheck-calculator"],
  ["PaycheckCity", "https://www.paycheckcity.com/calculator/salary/north-carolina"],
  ["ADP", "https://www.adp.com/resources/tools/calculators/north-carolina-salary-paycheck-calculator.aspx"],
];

(async () => {
  const resultats = {};
  for (const [nom, url] of CIBLES) {
    const r = await get(url);
    if (r.code !== 200 || !r.html) {
      resultats[nom] = null;
      console.log("⚠ " + nom + " INJOIGNABLE (HTTP " + r.code + ") — " + url);
      continue;
    }
    resultats[nom] = {};
    for (const [signal, f] of SIGNAUX) {
      let v = null;
      try { v = f(r.html); } catch (e) { v = null; }
      resultats[nom][signal] = v;
    }
    console.log("✓ " + nom + " lu : " + r.html.length + " octets");
  }

  const noms = CIBLES.map(c => c[0]).filter(n => resultats[n]);
  console.log("\n=== SIGNAUX DE CONFIANCE, page d'Etat comparable (Caroline du Nord) ===\n");
  console.log("| Signal | " + noms.join(" | ") + " |");
  console.log("|---|" + noms.map(() => "---").join("|") + "|");
  for (const [signal] of SIGNAUX) {
    const cases = noms.map(n => {
      const v = resultats[n][signal];
      return v ? String(v).replace(/\|/g, "/").slice(0, 38) : "—";
    });
    console.log("| " + signal + " | " + cases.join(" | ") + " |");
  }

  console.log("\n=== CE QU'ILS ONT ET QUE NOUS N'AVONS PAS ===");
  let manques = 0;
  for (const [signal] of SIGNAUX) {
    if (resultats.NOUS && !resultats.NOUS[signal]) {
      const eux = noms.filter(n => n !== "NOUS" && resultats[n][signal]);
      if (eux.length) { manques++; console.log("  MANQUE | " + signal + " — present chez : " + eux.join(", ")); }
    }
  }
  if (!manques) console.log("  aucun : nous portons tous les signaux qu'ils portent");

  console.log("\n=== CE QUE NOUS AVONS ET QU'AUCUN D'EUX N'A ===");
  let avances = 0;
  for (const [signal] of SIGNAUX) {
    if (resultats.NOUS && resultats.NOUS[signal]) {
      const eux = noms.filter(n => n !== "NOUS" && resultats[n][signal]);
      if (!eux.length) { avances++; console.log("  AVANCE | " + signal + " — " + resultats.NOUS[signal]); }
    }
  }
  if (!avances) console.log("  aucun");
  console.log("");
})();
