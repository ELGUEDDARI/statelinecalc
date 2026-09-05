/* Ramene les meta descriptions sous la limite d'affichage de Google.
 *
 * ── POURQUOI ────────────────────────────────────────────────────────────────
 * Mesure le 05/09/2026 : 22 des 33 descriptions depassaient 165 caracteres, la
 * plus longue a 218. Google coupe autour de 160 et remplace la fin par des
 * points de suspension : la moitie de la phrase de Michigan et de Pennsylvanie
 * n'atteignait jamais un lecteur.
 *
 * ⛔ CE QUE CETTE CORRECTION NE FERA PAS, et il faut le dire avant de la faire.
 * Une description agit sur le TAUX DE CLIC d'impressions deja obtenues. Or au
 * 02/09 le site est a 809 impressions, 0 clic, position moyenne 32,8 : a cette
 * position il n'y a presque rien a convertir. Cette passe ne fera donc pas
 * gagner de clic a elle seule. Elle est faite parce qu'une description tronquee
 * reste un defaut, et parce qu'elle ne coutera rien le jour ou les positions
 * remonteront. Ne pas la compter comme un levier de trafic.
 *
 * ── LES MOTS QU'ON GARDE NE SONT PAS CHOISIS AU HASARD ──────────────────────
 * Chaque nouvelle description conserve les termes sur lesquels sa page sort
 * REELLEMENT dans Search Console, releves le meme jour : « nevada paycheck
 * calculator », « paycheck calculator pa », « illinois paycheck calculator
 * hourly », « washington tax calculator »... D'ou « paycheck calculator », le
 * nom de l'Etat et « hourly » preserves partout. Raccourcir en coupant ces
 * mots-la aurait ete pire que la troncature.
 *
 * ⛔ PAGES **ET** GENERATEURS DANS LE MEME PASSAGE. Six pages d'Etat et les
 * pages de service sont ecrites a la main, huit autres sont generees. Ne
 * corriger que les pages laisserait la prochaine regeneration remettre les
 * versions longues, sans que rien ne le signale.
 *
 * Idempotent : une description deja courte est laissee telle quelle.
 * Lancer : node .tooling/ops/raccourcit-descriptions.js
 */
const fs = require("fs");
const path = require("path");

const RACINE = path.join(__dirname, "..", "..");
const LIMITE = 165;

/* page (chemin relatif) -> nouvelle description.
   Les generateurs sont traites plus bas : meme texte, meme correction. */
const PAGES = {
  "paycheck-calculator/index.html":
    "Free 2026 paycheck calculators for all 50 US states. See take-home pay after federal tax, Social Security, Medicare and state withholding.",
  "paycheck-calculator/texas/index.html":
    "Free Texas paycheck calculator, 2026. Hourly or salary. Texas has no state income tax, so see exactly what federal tax, Social Security and Medicare take.",
  "paycheck-calculator/georgia/index.html":
    "Free Georgia paycheck calculator, 2026. Hourly or salary. Georgia's income tax is a flat 4.99% this year, with a $15,000 standard deduction.",
  "paycheck-calculator/florida/index.html":
    "Free Florida paycheck calculator, 2026. Hourly or salary. Florida has no state income tax, so see what federal tax, Social Security and Medicare take.",
  "paycheck-calculator/illinois/index.html":
    "Free Illinois paycheck calculator, 2026. Hourly or salary. Illinois taxes income at a flat 4.95%, after an exemption that vanishes above $250,000.",
  "paycheck-calculator/pennsylvania/index.html":
    "Free Pennsylvania paycheck calculator, 2026. Hourly or salary. A flat 3.07% with no standard deduction &mdash; and, unlike most states, your 401(k) is taxed too.",
  "paycheck-calculator/michigan/index.html":
    "Free Michigan paycheck calculator, 2026. Hourly or salary. A flat 4.25% after a $5,900 exemption per person, plus city tax in Detroit and elsewhere.",
  "paycheck-calculator/utah/index.html":
    "Free Utah paycheck calculator, 2026. Hourly or salary. A flat 4.45% with no standard deduction &mdash; instead a $485 credit that is gone by $46,656.",
  "paycheck-calculator/ohio/index.html":
    "Free Ohio paycheck calculator, 2026. Hourly or salary. Ohio taxes nothing on the first $26,050, then 2.75% &mdash; and crossing that line costs $332.",
  "paycheck-calculator/hawaii/index.html":
    "Free Hawaii paycheck calculator, 2026. Hourly or salary. Hawaii has 12 brackets from 1.40% to 11.00%, and a standard deduction now at $8,000.",
  "methodology/index.html":
    "Exactly how our paycheck calculators work: the formula, the 2026 federal and state figures, where each one comes from, and when we check them again.",
  "about/index.html":
    "StateLine Calc is an independent site of free money calculators for all 50 US states. Every rate is published with its source and its date.",
  "privacy/index.html":
    "What StateLine Calc collects and what it does not. Salary figures you type never leave your browser. We do use Google Analytics &mdash; here is what that means.",
  "terms/index.html":
    "The terms that apply when you use StateLine Calc: what the calculators are for, what they are not, and the limits on our liability. No account needed.",
  "disclaimer/index.html":
    "Why our numbers are estimates and not the figure on your pay stub: what the calculators assume, what they leave out, and when to ask a professional.",
  "salary-to-hourly-calculator/index.html":
    "Convert a salary to an hourly rate for 2026, and see the rate after tax, not only before. $60,000 a year is $28.85 an hour gross &mdash; less once tax is out.",
};

/* Les huit pages salary-to-hourly viennent toutes du meme gabarit.
   ⛔ « Convert a Illinois salary » etait publie tel quel : le gabarit ecrivait
   « a » en dur. L'article se calcule maintenant sur la voyelle. */
const article = n => (/^[AEIOU]/i.test(n) ? "an" : "a");
const S2H = { florida: "Florida", washington: "Washington", georgia: "Georgia",
  pennsylvania: "Pennsylvania", michigan: "Michigan", illinois: "Illinois",
  texas: "Texas", nevada: "Nevada" };
const s2hTexte = (nom, netH) =>
  "Convert " + article(nom) + " " + nom + " salary to an hourly rate, 2026. " +
  "$60,000 a year is $28.85 an hour gross &mdash; $" + netH + " after tax in " + nom + ".";

/* generateur -> [ancien fragment reconnaissable, nouveau contenu] */
const GENERATEURS = {
  "build-hawaii.js": PAGES["paycheck-calculator/hawaii/index.html"],
  "build-michigan.js": PAGES["paycheck-calculator/michigan/index.html"],
  "build-ohio.js": PAGES["paycheck-calculator/ohio/index.html"],
  "build-pennsylvania.js": PAGES["paycheck-calculator/pennsylvania/index.html"],
  "build-utah.js": PAGES["paycheck-calculator/utah/index.html"],
  "build-s2h-hub.js": PAGES["salary-to-hourly-calculator/index.html"],
  /* Gabarit : on garde les interpolations ${...} telles quelles. */
  "build-s2h-page.js": "Convert ${article(nom)} ${nom} salary to an hourly rate, 2026. " +
    "$60,000 a year is $28.85 an hour gross &mdash; $${S60.netH} after tax in ${nom}.",
};

const META = /(<meta name="description" content=")([^"]*)(")/;

/* ⛔ REMPLACER PAR UNE FONCTION, JAMAIS PAR UNE CHAINE. Dans String.replace,
   « $1 », « $2 », « $3 » d'une chaine de remplacement designent les groupes
   captures. Les descriptions sont pleines de montants : « $15,000 »,
   « $28.85 », « $26,050 », « $250,000 ». Premiere version de ce script, le
   05/09/2026 : « $28.85 » est devenu « $ » suivi de L'ANCIENNE DESCRIPTION
   ENTIERE, recopiee au milieu de la nouvelle, dans sept generateurs et huit
   pages a la fois. Rien ne plantait, la sortie annoncait « 24 pages corrigees »,
   et seule la relecture d'un fichier a montre le carnage. Un compteur de succes
   ne prouve pas que ce qui a ete ecrit est ce qu'on voulait ecrire.
   Avec une fonction, la valeur rendue est prise litteralement. */
const remplace = (s, texte) => s.replace(META, (m, a, vieux, c) => a + texte + c);

function pose(abs, texte, etiquette) {
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + etiquette); return 0; }
  const s = fs.readFileSync(abs, "utf8");
  const m = s.match(META);
  if (!m) { console.log("  ⚠ aucune meta description : " + etiquette); return 0; }
  if (m[2] === texte) { return 0; }
  /* La longueur se mesure sur le texte RENDU : &mdash; compte pour un
     caractere a l'ecran, pas pour sept. */
  const rendu = texte.replace(/&mdash;/g, "—").replace(/&[a-z]+;/g, " ");
  if (rendu.length > LIMITE) {
    console.log("  ⚠ TROP LONGUE (" + rendu.length + ") : " + etiquette);
    return 0;
  }
  const neuf = remplace(s, texte);
  /* On relit ce qu'on vient d'ecrire dans la chaine, avant meme d'ecrire le
     fichier : si le resultat n'est pas exactement le texte voulu, on n'ecrit
     rien. C'est la verification qui manquait a la premiere version. */
  const pose = (neuf.match(META) || [])[2];
  if (pose !== texte) {
    console.log("  ⚠ ECRITURE REFUSEE (le resultat ne correspond pas) : " + etiquette);
    return 0;
  }
  fs.writeFileSync(abs, neuf);
  console.log("  " + String(m[2].length).padStart(4) + " -> " +
              String(rendu.length).padStart(3) + "  " + etiquette);
  return 1;
}

console.log("=== PAGES ===");
let n = 0;
for (const [rel, texte] of Object.entries(PAGES)) {
  n += pose(path.join(RACINE, rel), texte, rel.replace(/\\/g, "/"));
}
/* Les huit pages salary-to-hourly : le net horaire se relit dans la page, il
   n'est jamais re-saisi ici — un chiffre recopie a la main finit par diverger. */
for (const [cle, nom] of Object.entries(S2H)) {
  const rel = path.join("salary-to-hourly-calculator", cle, "index.html");
  const abs = path.join(RACINE, rel);
  if (!fs.existsSync(abs)) continue;
  const s = fs.readFileSync(abs, "utf8");
  const netH = (s.match(/\$([0-9]+\.[0-9]{2}) after tax in /) || [])[1];
  if (!netH) { console.log("  ⚠ net horaire illisible : " + cle); continue; }
  n += pose(abs, s2hTexte(nom, netH), rel.replace(/\\/g, "/"));
}
console.log("  -> " + n + " pages corrigees");

console.log("\n=== GENERATEURS ===");
let g = 0;
for (const [nom, texte] of Object.entries(GENERATEURS)) {
  const abs = path.join(RACINE, ".tooling", "ops", nom);
  if (!fs.existsSync(abs)) { console.log("  ⚠ absent : " + nom); continue; }
  const s = fs.readFileSync(abs, "utf8");
  const m = s.match(META);
  if (!m) { console.log("  ⚠ aucune meta description : " + nom); continue; }
  if (m[2] === texte) continue;
  const neuf = remplace(s, texte);
  if ((neuf.match(META) || [])[2] !== texte) {
    console.log("  ⚠ ECRITURE REFUSEE (le resultat ne correspond pas) : " + nom);
    continue;
  }
  fs.writeFileSync(abs, neuf);
  console.log("  " + String(m[2].length).padStart(4) + " -> " +
              String(texte.length).padStart(3) + "  " + nom);
  g++;
}
console.log("  -> " + g + " generateurs corriges");

/* Le gabarit s2h appelle desormais article(nom) : la fonction doit exister dans
   le generateur, sinon la prochaine regeneration ecrirait « undefined Illinois
   salary ». On la pose ici, dans le meme passage que le texte qui s'en sert. */
const S2HGEN = path.join(RACINE, ".tooling", "ops", "build-s2h-page.js");
if (fs.existsSync(S2HGEN)) {
  let s = fs.readFileSync(S2HGEN, "utf8");
  if (!/function article|const article/.test(s)) {
    const ancre = "  const nom = f.nom;";
    if (s.includes(ancre)) {
      s = s.replace(ancre, ancre +
        "\n  /* « a Illinois » etait publie tel quel : l'article etait ecrit en dur" +
        "\n     dans la meta description. Il se calcule sur la voyelle. */" +
        "\n  const article = n => (/^[AEIOU]/i.test(n) ? \"an\" : \"a\");");
      fs.writeFileSync(S2HGEN, s);
      console.log("\n  fonction article() posee dans build-s2h-page.js");
    } else {
      console.log("\n  ⚠ ancre introuvable dans build-s2h-page.js : article() NON posee");
    }
  }
}
