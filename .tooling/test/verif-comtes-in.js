/* Recoupe data/rates-2026.js (Indiana) avec le document de l'agence, RELU EN LIGNE.
 *
 * Ce que ce controle prouve, et ce qu'il ne prouve pas :
 *   - il telecharge https://www.in.gov/dor/files/dn01.pdf, en extrait le texte avec
 *     pdftotext et compare, pour chacun des 92 comtes, le taux imprime au taux du
 *     moteur ; il compare aussi le taux d'Etat (2,95 %), la valeur d'une exemption
 *     (1 000 $, Table A), les deux valeurs des Tables B et C, et la date d'entree
 *     en vigueur du document ;
 *   - il ECHOUE si l'agence republie la notice avec un taux different (elle le fait :
 *     la version du 1er janvier 2026 a ete remplacee par celle du 1er octobre) ;
 *   - il ne prouve rien sur le 401(k) (la notice n'en parle pas) ni sur la lecture
 *     du WH-4 (forms.in.gov refuse tout client automatise, Cloudflare 403).
 *
 * Aucun taux n'est recopie ici : tout vient du PDF et de rates-2026.js.
 * Lancer : node .tooling/test/verif-comtes-in.js
 */
const https = require("https");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const R = require("../../data/rates-2026.js");

const URL_DN1 = "https://www.in.gov/dor/files/dn01.pdf";
const tmp = path.join(os.tmpdir(), "verif-comtes-in");
fs.mkdirSync(tmp, { recursive: true });

function telecharge(url, n = 0) {
  return new Promise((ok, ko) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140.0 Safari/537.36" } }, r => {
      if ([301, 302, 303, 307, 308].includes(r.statusCode) && r.headers.location && n < 4) {
        r.resume(); return ok(telecharge(new URL(r.headers.location, url).href, n + 1));
      }
      if (r.statusCode !== 200) { r.resume(); return ko(new Error("HTTP " + r.statusCode)); }
      const morceaux = [];
      r.on("data", d => morceaux.push(d));
      r.on("end", () => ok(Buffer.concat(morceaux)));
    }).on("error", ko);
  });
}

let pass = 0, fail = 0;
const verifie = (nom, ok, detail) => {
  console.log((ok ? "  OK    | " : "  ECHEC | ") + nom + (detail ? " | " + detail : ""));
  ok ? pass++ : fail++;
};

(async () => {
  const buf = await telecharge(URL_DN1);
  const pdf = path.join(tmp, "dn01.pdf");
  fs.writeFileSync(pdf, buf);
  const texte = execFileSync("pdftotext", ["-layout", pdf, "-"], { encoding: "latin1" });

  const IN = R.states.indiana;
  const taux = IN.incomeTax.brackets.single[0][1];

  verifie("document : « Effective Oct. 1, 2026 »", /Effective Oct\. 1, 2026/.test(texte));
  verifie("taux d'Etat : « the state adjusted gross income tax rate for individuals is " + (taux * 100).toFixed(2) + "% »",
    new RegExp("individuals is " + (taux * 100).toFixed(2).replace(".", "\\.") + "%").test(texte));
  verifie("exemption : « $1,000 per year per exemption claimed on line 5 »",
    /deduct\s+\$1,000\s+per\s+year\s+per\s+exemption\s+claimed\s+on\s+line\s+5/.test(texte.replace(/\s+/g, " ")) ||
    /deduct \$1,000 per year per exemption claimed on line 5/.test(texte.replace(/\s+/g, " ")));
  verifie("moteur : exemption 1 000 $ (celibataire), 2 000 $ (marie)",
    IN.incomeTax.standardDeduction.single === 1000 && IN.incomeTax.standardDeduction.marriedJoint === 2000);
  verifie("Table B : 1 500 $ par personne a charge supplementaire (page « Indiana ... $1,500 »)",
    /\$1,500\s+per\s+year\s+per\s+qualifying\s+dependent\s+exemption/.test(texte.replace(/\s+/g, " ")));
  verifie("Table C : 3 000 $ par enfant adopte",
    /\$3,000\s+per\s+year\s+per\s+qualifying\s+adopted\s+child/.test(texte.replace(/\s+/g, " ")));
  verifie("retenue du comte : « based on the employee's Indiana county of residence as of Jan. 1 »",
    /county\s+of\s+residence\s+as\s+of\s+Jan\.\s+1\s+of\s+the\s+tax\s+year/.test(texte.replace(/\s+/g, " ")));

  /* Le tableau des comtes : « Nom  code  taux[*] », deux colonnes par ligne. */
  const debut = texte.indexOf("County Name  County Code");
  const section = texte.slice(debut);
  const re = /([A-Z][A-Za-z.]*(?: [A-Z][A-Za-z.]*)?)\s+(\d{2})\s+(0\.\d+)(\*?)/g;
  const lus = new Map();
  let m;
  while ((m = re.exec(section))) lus.set(+m[2], { nom: m[1], taux: m[3], etoile: !!m[4] });

  verifie("92 comtes lus dans le PDF, codes 1 a 92 tous presents",
    lus.size === 92 && [...Array(92)].every((_, i) => lus.has(i + 1)), lus.size + " lus");

  const cles = Object.keys(IN.incomeTax.countyTax.rates);
  verifie("92 comtes dans le moteur", cles.length === 92);

  const parNom = new Map([...lus.values()].map(v => [v.nom, v]));
  let ecarts = 0;
  for (const cle of cles) {
    const [nom, t] = IN.incomeTax.countyTax.rates[cle];
    const lu = parNom.get(nom);
    if (!lu || Number(lu.taux) !== t) {
      ecarts++;
      console.log("  ECHEC | comte " + nom + " : moteur " + t + ", PDF " + (lu ? lu.taux : "ABSENT"));
    }
  }
  verifie("chacun des 92 taux du moteur est identique au taux imprime", ecarts === 0 && parNom.size === 92, ecarts + " ecart(s)");

  const etoiles = [...lus.values()].filter(v => v.etoile).map(v => v.nom);
  verifie("asterisques (taux change depuis le 1er janvier) : Boone seulement, comme ecrit sur la page",
    etoiles.length === 1 && etoiles[0] === "Boone", etoiles.join(","));

  const def = IN.incomeTax.countyTax.defaultCounty;
  verifie("comte par defaut = Marion, lu a 0.0202",
    def === "marion" && parNom.get("Marion") && parNom.get("Marion").taux === "0.0202");

  console.log("\n=== RESULTAT : " + pass + " OK, " + fail + " ECHEC ===\n");
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error("ARRET : " + e.message); process.exit(2); });
