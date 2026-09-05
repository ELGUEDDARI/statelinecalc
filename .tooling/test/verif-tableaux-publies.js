/* Les tableaux TELS QU'ILS SONT DANS LES PAGES, cellule par cellule, contre le
 * moteur de calcul.
 *
 * ── POURQUOI CE FICHIER EXISTE ──────────────────────────────────────────────
 * test-tableaux.js s'annonce en premiere ligne : « Compare les TABLEAUX SERVIS
 * a la bibliotheque de calcul ». Il ne le fait pas. Il execute gen-table.js et
 * gen-hourly-table.js et compare LEUR SORTIE au moteur — il n'ouvre aucune page.
 * Ce qu'il prouve est donc : « le generateur est d'accord avec le moteur ».
 * Ce que tout le monde croyait qu'il prouvait : « la page est d'accord avec le
 * moteur ». Ce n'est pas la meme chose des qu'une page n'utilise pas ce
 * generateur, ou n'a pas ete regeneree depuis.
 *
 * ⛔ CE QUE CE TROU A LAISSE PASSER, le 05/09/2026 : la page Tennessee a ete
 * publiee avec 10 paliers de salaire et 9 taux horaires, la ou ses pairs en
 * portent 30 et 30. Pendant ce temps test-tableaux.js affichait « tennessee :
 * 30 lignes, 1440 OK » — il lisait un generateur que cette page n'emploie pas.
 * Le compteur est meme reste a 1440 EXACTEMENT apres correction de la page,
 * alors que 40 lignes venaient d'y etre ajoutees. Un compteur qui ne bouge pas
 * quand la realite bouge ne mesure pas la realite.
 *
 * Celui-ci ouvre le fichier publie, lit les <table>, et redemande a calcul()
 * chaque nombre imprime. Il ne sait rien des generateurs, et c'est voulu : il
 * doit rester vrai meme pour une page ecrite entierement a la main.
 *
 * ⛔ Il ECHOUE sur un en-tete inconnu au lieu de sauter la colonne. Une colonne
 * ignoree en silence, c'est un tableau declare juste sans avoir ete lu.
 *
 * Lancer : node .tooling/test/verif-tableaux-publies.js
 */
const fs = require("fs");
const path = require("path");
const { calcul, HEURES } = require("../lib/paie.js");
const { PUBLIES } = require("../lib/etats-publies.js");
const { SALAIRES, TAUX_HORAIRES } = require("../lib/paliers.js");

const RACINE = path.join(__dirname, "..", "..");
let ok = 0;
const echecs = [];

function dit(bon, quoi, detail) {
  if (bon) { ok++; return; }
  echecs.push(quoi);
  console.log("  ECHEC | " + quoi + (detail ? "  |  " + detail : ""));
}

/* Un dollar imprime est arrondi ; le moteur ne l'est pas. On tolere la moitie
   de l'unite d'affichage, jamais plus : au-dela, c'est un desaccord reel. */
const proche = (a, b, tol) => Math.abs(a - b) <= tol;
const nombre = t => Number(String(t).replace(/[^0-9.\-]/g, ""));

/* Les en-tetes varient d'une page a l'autre — « FICA » ici, « Social Security +
   Medicare » la ; « TX state » ou « State tax ». On les ramene a un champ du
   moteur. Tout en-tete absent de cette table fait echouer le test. */
const CHAMPS = {
  "gross salary": "brut",
  /* Les onze pages d'Etat ecrivent « Hourly rate », Tennessee « Gross hourly
     rate ». Les deux sont justes ; le test doit lire les pages telles qu'elles
     sont, pas telles qu'il voudrait qu'elles soient. */
  "hourly rate": "tauxH", "gross hourly rate": "tauxH",
  "gross a year": "brut",
  "federal tax": "federal",
  "fica": "fica", "social security + medicare": "fica",
  "take-home": "net", "take-home pay": "net", "take-home a year": "net",
  "per month": "mois", "effective rate": "tauxEff",
  "real hourly rate": "netH", "real rate": "netH",
};
/* La colonne des retenues d'Etat porte un nom different sur presque chaque
   page : « TX state », « State tax », mais aussi « PA Unemployment » et
   « WA Programs » — la Pennsylvanie et Washington nomment le programme plutot
   que l'Etat. Toutes designent la meme chose : ce que l'Etat prend au salarie. */
const estColonneEtat = t =>
  (/\bstate\b/.test(t) && !/gross/.test(t)) ||
  /\bunemployment\b|\bprograms\b|\bpaid leave\b|\bcares\b/.test(t);

function cellules(tr) {
  return [...tr.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)]
    .map(m => m[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim());
}

let tablesLues = 0;
for (const [nom, cle] of Object.entries(PUBLIES)) {
  const f = path.join(RACINE, "paycheck-calculator", cle, "index.html");
  if (!fs.existsSync(f)) { dit(false, cle + " : page absente"); continue; }
  const s = fs.readFileSync(f, "utf8");

  for (const t of s.match(/<table[\s\S]*?<\/table>/g) || []) {
    const lignes = t.match(/<tr[\s\S]*?<\/tr>/g) || [];
    if (lignes.length < 2) continue;
    const entetes = cellules(lignes[0]).map(x => x.toLowerCase());
    /* On ne s'occupe que des deux tableaux calcules. Le tableau du Hall tax et
       celui des Etats compares ont leur propre controle ailleurs. */
    const estSalaire = entetes[0] === "gross salary";
    const estHoraire = CHAMPS[entetes[0]] === "tauxH";
    if (!estSalaire && !estHoraire) continue;
    tablesLues++;

    /* ⛔ LE CONTROLE QUI MANQUAIT VRAIMENT. Verifier chaque nombre imprime ne
       dit RIEN du nombre de lignes : les 10 paliers de Tennessee etaient tous
       exacts, et la page etait quand meme moitie moins fournie que ses pairs.
       Un tableau juste mais court passe toutes les verifications de valeur.
       On exige donc la grille commune, celle de lib/paliers.js. */
    const attenduLignes = estSalaire ? SALAIRES.length : TAUX_HORAIRES.length;
    dit(lignes.length - 1 === attenduLignes,
        cle + " : le tableau " + (estSalaire ? "des salaires" : "horaire") +
        " porte les " + attenduLignes + " paliers communs",
        "la page en a " + (lignes.length - 1));

    const champs = entetes.map(h => estColonneEtat(h) ? "etat" : CHAMPS[h] || null);
    const inconnus = entetes.filter((h, i) => champs[i] === null);
    dit(inconnus.length === 0, cle + " : tous les en-tetes de colonne sont reconnus",
        "inconnu(s) : " + inconnus.join(", "));
    if (inconnus.length) continue;

    for (const tr of lignes.slice(1)) {
      const c = cellules(tr);
      if (c.length !== champs.length) {
        dit(false, cle + " : ligne a " + c.length + " cellules pour " + champs.length + " colonnes");
        continue;
      }
      /* ⛔ Les retenues d'Etat peuvent occuper PLUSIEURS colonnes. La
         Pennsylvanie en a deux — « PA state tax » (3,07 %) et « PA
         unemployment » (0,07 %) — et le moteur n'expose qu'un total. Comparer
         chaque colonne au total donnait 60 faux echecs : 105 $ de chomage lus
         contre 4 710 $ de retenue totale. On somme les colonnes d'Etat, on
         compare une fois. */
      const val = {};
      champs.forEach((ch, i) => {
        if (ch === "etat") { val.etat = (val.etat || 0) + nombre(c[i]); }
        else { val[ch] = nombre(c[i]); }
      });
      const brut = estHoraire ? val.tauxH * HEURES : val.brut;
      if (!isFinite(brut) || brut <= 0) { dit(false, cle + " : brut illisible « " + c[0] + " »"); continue; }
      const r = calcul(cle, brut, "single");
      const etatTotal = r.etat + r.paidLeave + r.waCares
                      + (r.programmes || []).reduce((t2, p) => t2 + p.montant, 0);
      const attendu = {
        brut: brut, federal: r.federal, fica: r.ss + r.med, etat: etatTotal,
        net: r.net, mois: r.net / 12, netH: r.net / HEURES,
        tauxEff: r.taux * 100, tauxH: val.tauxH,
      };
      /* Une seule verification par champ, meme si plusieurs colonnes y mènent. */
      for (const ch of [...new Set(champs)]) {
        if (ch === "tauxH") continue;
        /* Les dollars sont imprimes a l'unite (tolerance 0,5), le taux effectif
           a la decimale (0,05), le taux horaire reel au cent (0,005). */
        const tol = ch === "tauxEff" ? 0.05 : ch === "netH" ? 0.005 : 0.5;
        dit(proche(val[ch], attendu[ch], tol),
            cle + " " + (estHoraire ? "horaire $" + val.tauxH : "salaire $" + brut) + " / " + ch,
            "page " + val[ch] + "  moteur " + attendu[ch].toFixed(2));
      }
    }
  }
}

console.log("\n=== TABLEAUX PUBLIES : " + tablesLues + " tableaux lus dans les pages, " +
            ok + " cellules OK, " + echecs.length + " ECHEC ===");
process.exit(echecs.length ? 1 : 0);
