/* Le bloc Sources doit PROMETTRE exactement ce qu'il MONTRE.
 *
 * ── POURQUOI CE TEST EXISTE ─────────────────────────────────────────────────
 * Le 10/09/2026, le controle independant a rendu STOP sur un defaut qu'aucun
 * test ne voyait : le bloc ouvrait par « Every figure on this page is read from
 * an official document », puis listait, sur 8 pages d'Etat sur 15, uniquement
 * les trois documents FEDERAUX (IRS, IRS, SSA). Sur l'Illinois, le 4,95 %,
 * l'exemption de 2 925 $ et le seuil de 500 000 $ — les chiffres qui font la
 * page — n'apparaissaient que sous « Agencies », dont le texte dit lui-meme
 * « we do not claim that these pages carry the 2026 number ».
 *
 * La page se contredisait a deux paragraphes d'intervalle. Aucun chiffre faux,
 * aucun lien mort, tout au vert. Le mensonge naissait d'une phrase FIXE posee
 * au-dessus d'une liste VARIABLE.
 *
 * ── CE QUE CE TEST VERROUILLE ───────────────────────────────────────────────
 * 1. La promesse suit la liste : « Every figure on this page » n'est autorise
 *    que si l'Etat a au moins un document a lui. Sinon la phrase doit dire
 *    que seules les figures federales viennent des documents listes.
 * 2. Un Etat sans document propre doit s'expliquer : soit une note `perime`
 *    sur son agence, soit une entree dans `SANS_LIEN`. Le silence est interdit.
 * 3. La page servie porte le bloc que le generateur produit aujourd'hui — sinon
 *    on teste un fichier que plus personne ne regenere.
 *
 * Lancer : node .tooling/test/verif-bloc-sources.js
 */
const fs = require("fs");
const path = require("path");
const { PAR_ETAT, SANS_LIEN, blocSources, blocSourcesToutes } = require("../lib/sources.js");
const { PUBLIES } = require("../lib/etats-publies.js");

const RACINE = path.join(__dirname, "..", "..");
const PROMESSE_TOTALE = "Every figure on this page";
const PROMESSE_FEDERALE = "The federal figures on this page";

let ok = 0, ko = 0;
const dire = (bon, etat, quoi) => {
  if (bon) { ok++; console.log("  OK     | " + etat.padEnd(16) + " | " + quoi); }
  else { ko++; console.log("  ECHEC  | " + etat.padEnd(16) + " | " + quoi); }
};

console.log("=== Le bloc Sources promet-il ce qu'il montre ? ===\n");

for (const cle of Object.values(PUBLIES)) {
  const propres = PAR_ETAT[cle] || [];
  const docs = propres.filter(s => s.type === "document");
  const bloc = blocSources(cle);

  /* 1. La promesse suit la liste. */
  if (docs.length) {
    dire(bloc.includes(PROMESSE_TOTALE) && !bloc.includes(PROMESSE_FEDERALE),
      cle, docs.length + " document(s) propre(s) -> la page peut promettre « every figure »");
  } else {
    dire(bloc.includes(PROMESSE_FEDERALE) && !bloc.includes(PROMESSE_TOTALE),
      cle, "aucun document propre -> la page ne doit promettre que le federal");
  }

  /* 2. Une absence de document s'explique, elle ne se tait pas. */
  if (!docs.length) {
    const explique = SANS_LIEN[cle] || propres.some(s => s.perime);
    dire(!!explique, cle,
      explique ? "l'absence de document est expliquee au lecteur"
               : "AUCUNE explication : ni note `perime`, ni entree dans SANS_LIEN");
  }

  /* 3. Chaque document annonce ce qu'il porte. */
  for (const d of docs) {
    const complet = Array.isArray(d.motif) && d.motif.length > 0 && !!d.quoi;
    dire(complet, cle, (complet ? "document annonce ce qu'il porte (" + d.motif.join(", ") + ") : "
                                : "document SANS motif ou SANS libelle : ") + d.url);
  }

  /* 4. La page servie porte le bloc que le generateur produit AUJOURD'HUI. */
  const f = path.join(RACINE, "paycheck-calculator", cle, "index.html");
  if (!fs.existsSync(f)) { dire(false, cle, "page introuvable : " + f); continue; }
  const html = fs.readFileSync(f, "utf8");
  const d = html.indexOf("<!-- SOURCES:debut");
  const fin = html.indexOf("<!-- SOURCES:fin -->");
  if (d < 0 || fin < 0) { dire(false, cle, "la page ne porte pas les marqueurs SOURCES"); continue; }
  const pose = html.slice(d, fin + "<!-- SOURCES:fin -->".length).replace(/\r/g, "").trim();
  const attendu = bloc.replace(/\r/g, "").trim().replace(/^\s*<!-- SOURCES:debut/, "<!-- SOURCES:debut");
  dire(pose.replace(/\s+/g, " ") === attendu.replace(/\s+/g, " "), cle,
    "le bloc de la page est celui que le generateur produit aujourd'hui");
}

/* 5. La page methodologie compte-t-elle juste ?
 * Un nombre ecrit en dur au-dessus d'une liste finit toujours par mentir : le
 * 10/09, « Two states have no link at all » surplombait trois Etats, joints par
 * « and » deux fois. On teste le nombre, les noms et la ponctuation. */
const NOMBRES = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
                 "Eight", "Nine", "Ten"];
const nManquants = Object.keys(SANS_LIEN).length;
/* blocSourcesToutes prend la FONCTION qui nomme un Etat, comme pose-sources.js. */
const toutes = blocSourcesToutes(c => c.split("-")
  .map(m => m[0].toUpperCase() + m.slice(1)).join(" "));
const attenduPhrase = NOMBRES[nManquants]
  + (nManquants === 1 ? " state has no link" : " states have no link");
dire(toutes.includes(attenduPhrase), "methodologie",
  "annonce « " + attenduPhrase + " » pour " + nManquants + " Etat(s) sans lien");
for (const cle of Object.keys(SANS_LIEN)) {
  const nom = cle.split("-").map(m => m[0].toUpperCase() + m.slice(1)).join(" ");
  dire(toutes.includes(nom), "methodologie", nom + " est nomme dans la liste");
}
const apres = (toutes.split("no link at all")[1] || "").slice(0, 220);
dire(!/ and [^<]* and /.test(apres), "methodologie",
  "la liste est ponctuee en anglais : virgules, un seul « and »");

console.log("\n=== BLOC SOURCES : " + ok + " OK, " + ko + " ECHEC ===");
if (ko) console.log("⛔ Une page qui promet plus que sa liste ment sans que personne ne l'ait ecrit.\n"
  + "   Corriger `.tooling/lib/sources.js`, puis relancer `.tooling/ops/pose-sources.js`.");
process.exit(ko === 0 ? 0 : 1);
