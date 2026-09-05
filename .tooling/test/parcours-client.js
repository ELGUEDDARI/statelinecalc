/* Utilise le site comme un vrai visiteur, et prend des captures pour qu'on
 * REGARDE le resultat au lieu de le supposer.
 *
 * Ce n'est pas un test de calcul : test-etat-navigateur.js s'en charge. C'est
 * un test de QUALITE PERCUE. On tape ce que les gens tapent vraiment — un
 * salaire avec une virgule, un signe dollar, un taux horaire, rien du tout —
 * et on regarde si la page repond quelque chose d'utile.
 *
 * Lancer : node .tooling/test/parcours-client.js [--servi]
 * Captures : .tooling/test/captures/parcours-*.png
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium, devices } = require("playwright");
const { calcul } = require("../lib/paie.js");
const ETAT = "ohio";

/* Attend que le montant affiche ARRETE de bouger.
   ⛔ Ne jamais remplacer par un delai fige. Le 05/09/2026 le montant principal a
   recu une animation de 350 ms (animerChiffre, calc-paycheck.js) ; ce test
   patientait 180 ms et lisait donc un chiffre EN COURS DE MONTEE. Il a rapporte
   cinq faux defauts de saisie — « 75,000 -> $53,505.35, attendu $59,974 » — alors
   que le parsing n'avait rien. On a failli corriger du code qui marchait pour
   satisfaire un test qui se trompait. Attendre la stabilite se re-regle tout seul
   si la duree de l'animation change. */
async function stabilise(page) {
  let precedent = null;
  for (let i = 0; i < 30; i++) {
    const v = await page.evaluate(() => {
      const t = document.querySelector("[data-paycheck-result] .result-head");
      return t ? t.textContent : null;
    });
    if (v !== null && v === precedent) return;
    precedent = v;
    await page.waitForTimeout(60);
  }
}

const RACINE = path.join(__dirname, "..", "..");
const SORTIE = path.join(__dirname, "captures");
const PORT = 8799;
const SERVI = process.argv.includes("--servi");

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
                ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon",
                ".txt": "text/plain", ".webmanifest": "application/manifest+json" };
const serveur = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.join(RACINE, p);
  if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end("404"); return;
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

const constats = [];
const dit = (ou, quoi) => { constats.push(ou + " | " + quoi); console.log("  " + ou + " | " + quoi); };

/* Ce qu'un vrai visiteur tape. Les trois premieres sont les formes que les
   gens ecrivent naturellement et que beaucoup de calculateurs refusent. */
/* « attendu » est le montant ANNUEL que la saisie doit produire. Sans lui, le
   test se contente de constater qu'un resultat s'affiche — et c'est
   exactement ce qui a laisse passer, le 02/09, un « 75,000 » lu comme 75. Un
   test de saisie qui ne verifie pas la VALEUR ne teste rien. */
const SAISIES = [
  { texte: "75,000",    quoi: "un salaire avec une virgule de milliers", attendu: 75000 },
  { texte: "$75000",    quoi: "un salaire avec le signe dollar",         attendu: 75000 },
  { texte: "75 000",    quoi: "un salaire avec une espace",              attendu: 75000 },
  { texte: "$1,250.75", quoi: "un salaire copie-colle, dollar et virgule", attendu: 1250.75 },
  { texte: "18.50",     quoi: "un taux horaire a la virgule", periode: "hourly", attendu: 18.5 * 2080 },
  { texte: "",          quoi: "le champ laisse vide",  refus: true },
  { texte: "0",         quoi: "zero",                  refus: true },
  { texte: "abc",       quoi: "du texte",              refus: true },
  { texte: "12abc",     quoi: "un chiffre suivi de texte", refus: true }
];

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  await new Promise(r => serveur.listen(PORT, r));
  const BASE = SERVI ? "https://statelinecalc.com" : "http://localhost:" + PORT;
  const nav = await chromium.launch({ headless: true });

  /* ---------------------------------------------- 1. le visiteur mobile */
  console.log("\n--- 1. ARRIVEE SUR MOBILE (iPhone 13) ---");
  const mob = await nav.newContext({ ...devices["iPhone 13"] });
  const m = await mob.newPage();
  await m.goto(BASE + "/", { waitUntil: "networkidle" });
  await m.screenshot({ path: path.join(SORTIE, "parcours-1-accueil-mobile.png") });

  const pliMobile = await m.evaluate(() => {
    const h = window.innerHeight;
    const vu = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < h && r.bottom > 0; };
    return {
      hauteurEcran: h,
      h1: (document.querySelector("h1") || {}).innerText || "",
      h1Visible: vu(document.querySelector("h1")),
      premierLienEtat: vu(document.querySelector('a[href^="/paycheck-calculator/"]')),
      debordeALaHorizontale: document.documentElement.scrollWidth > window.innerWidth + 1,
      largeurDoc: document.documentElement.scrollWidth
    };
  });
  dit("mobile", "titre au-dessus du pli : " + (pliMobile.h1Visible ? "OUI" : "NON") + " — « " + pliMobile.h1 + " »");
  dit("mobile", "un lien d'Etat visible sans defiler : " + (pliMobile.premierLienEtat ? "OUI" : "NON"));
  dit("mobile", pliMobile.debordeALaHorizontale
    ? "DEFAUT : la page deborde a l'horizontale (" + pliMobile.largeurDoc + "px pour un ecran de 390)"
    : "aucun debordement horizontal");

  /* ---------------------------------------- 2. il choisit un Etat, mobile */
  console.log("\n--- 2. IL CLIQUE SUR UN ETAT, DEPUIS L'ACCUEIL ---");
  const t0 = Date.now();
  await m.click('a[href="/paycheck-calculator/ohio/"]');
  await m.waitForLoadState("networkidle");
  dit("mobile", "la page Ohio s'ouvre en " + (Date.now() - t0) + " ms");
  await m.screenshot({ path: path.join(SORTIE, "parcours-2-ohio-mobile.png") });

  const arrivee = await m.evaluate(() => {
    const h = window.innerHeight;
    const vu = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.top < h && r.bottom > 0; };
    const champ = document.querySelector("#salary");
    const rep = document.querySelector(".answer");
    return {
      reponseVisible: vu(rep), reponseTexte: rep ? rep.innerText.slice(0, 110) : "",
      champVisible: vu(champ),
      distanceAuChamp: champ ? Math.round(champ.getBoundingClientRect().top) : -1,
      boutonVisible: vu(document.querySelector("button[type=submit]"))
    };
  });
  dit("mobile", "la reponse courte est visible d'emblee : " + (arrivee.reponseVisible ? "OUI" : "NON"));
  dit("mobile", "le champ de saisie est a " + arrivee.distanceAuChamp + "px du haut"
    + (arrivee.champVisible ? " (visible)" : " (IL FAUT DEFILER)"));

  /* -------------------------------- 3. il tape ce qu'un humain tape vraiment */
  console.log("\n--- 3. IL TAPE CE QU'UN HUMAIN TAPE ---");
  for (const s of SAISIES) {
    await m.fill("#salary", s.texte);
    if (s.periode) await m.selectOption("#period", s.periode);
    else await m.selectOption("#period", "annual");
    await m.selectOption("#display", "annual");
    await m.click("button[type=submit]");
    /* ⛔ ATTENDRE LA FIN DE L'ANIMATION, PAS UN DELAI AU HASARD.
       Le 05/09/2026 le montant principal a recu une animation de 350 ms
       (animerChiffre dans calc-paycheck.js). Ce test patientait 180 ms : il
       lisait un chiffre EN COURS DE MONTEE et rapportait 5 faux defauts de
       saisie — « 75,000 -> $53,505.35, attendu $59,974 ». Le parsing n'avait
       rien. Le controle du 05/09 a failli faire corriger un code qui marchait
       pour satisfaire un test qui se trompait.
       On attend donc que la valeur se stabilise, plutot qu'un delai fige qu'il
       faudrait re-regler a chaque changement d'animation. */
    await stabilise(m);
    const r = await m.evaluate(() => {
      const res = document.querySelector("[data-paycheck-result]");
      const champ = document.querySelector("#salary");
      const err = champ.closest(".field").querySelector(".error");
      const tete = res ? res.querySelector(".result-head") : null;
      return {
        net: tete ? Number(tete.textContent.replace(/[^0-9.]/g, "")) : 0,
        invalide: champ.closest(".field").classList.contains("is-invalid"),
        erreurVisible: err ? getComputedStyle(err).display !== "none" : false
      };
    });
    let ok, detail;
    if (s.refus) {
      ok = r.invalide;
      detail = r.invalide ? "refuse, comme il faut" : "ACCEPTE alors qu'il fallait refuser";
    } else {
      /* On ne se contente pas d'un resultat : on verifie le CHIFFRE. */
      const vise = calcul(ETAT, s.attendu, "single");
      ok = !r.invalide && Math.abs(r.net - vise.net) < 1;
      detail = "net affiche " + (r.net ? "$" + r.net.toLocaleString("en-US") : "aucun")
             + ", attendu $" + Math.round(vise.net).toLocaleString("en-US");
    }
    dit(ok ? "OK  " : "DEFAUT", s.quoi + " (« " + s.texte + " ») -> " + detail);
  }

  await m.fill("#salary", "75000");
  await m.selectOption("#period", "annual");
  await m.click("button[type=submit]");
  await m.waitForTimeout(200);
  await m.screenshot({ path: path.join(SORTIE, "parcours-3-resultat-mobile.png") });

  /* ------------------------------------------ 4. le meme parcours, desktop */
  console.log("\n--- 4. LE MEME PARCOURS SUR ORDINATEUR ---");
  const bur = await nav.newContext({ viewport: { width: 1440, height: 900 } });
  const b = await bur.newPage();
  await b.goto(BASE + "/", { waitUntil: "networkidle" });
  await b.screenshot({ path: path.join(SORTIE, "parcours-4-accueil-desktop.png") });
  await b.goto(BASE + "/paycheck-calculator/ohio/", { waitUntil: "networkidle" });
  await b.fill("#salary", "75000");
  await b.click("button[type=submit]");
  await b.waitForTimeout(250);
  await b.screenshot({ path: path.join(SORTIE, "parcours-5-ohio-desktop.png") });
  await b.evaluate(() => document.querySelector("table").scrollIntoView());
  await b.waitForTimeout(200);
  await b.screenshot({ path: path.join(SORTIE, "parcours-6-tableau-desktop.png") });

  const lisible = await b.evaluate(() => {
    const cs = getComputedStyle(document.body);
    const p = document.querySelector(".prose p");
    return { police: cs.fontSize, corps: p ? getComputedStyle(p).fontSize : "?",
             interligne: p ? getComputedStyle(p).lineHeight : "?",
             largeurTexte: p ? Math.round(p.getBoundingClientRect().width) : 0 };
  });
  dit("desktop", "corps de texte " + lisible.corps + ", interligne " + lisible.interligne
    + ", colonne de " + lisible.largeurTexte + "px");

  /* --------------------------------- 5. ce que le visiteur voit sans le JS */
  console.log("\n--- 5. LE VISITEUR (OU L'IA) QUI N'EXECUTE PAS LE JS ---");
  const sansJs = await nav.newContext({ javaScriptEnabled: false });
  const j = await sansJs.newPage();
  await j.goto(BASE + "/paycheck-calculator/ohio/", { waitUntil: "domcontentloaded" });
  const d = await j.evaluate(() => ({
    mots: document.body.innerText.split(/\s+/).filter(Boolean).length,
    montants: (document.body.innerText.match(/\$[\d,]+/g) || []).length,
    lignesTableau: document.querySelectorAll("tbody tr").length
  }));
  dit("sans JS", d.mots + " mots lisibles, " + d.montants + " montants, "
    + d.lignesTableau + " lignes de tableau — le contenu ne depend pas du JS");
  await j.screenshot({ path: path.join(SORTIE, "parcours-7-sans-js.png"), fullPage: false });

  await nav.close();
  serveur.close();
  console.log("\ncaptures ecrites dans .tooling/test/captures/\n");
  const defauts = constats.filter(c => c.startsWith("DEFAUT")).length;
  console.log("=== PARCOURS CLIENT : " + defauts + " defaut(s) releve(s) ===\n");
})();
