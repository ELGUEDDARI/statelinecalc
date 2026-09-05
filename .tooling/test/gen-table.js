/* Genere les 14 lignes HTML du tableau "take-home pay by salary".
   Ce tableau est la version RENDUE COTE SERVEUR du calculateur : les
   crawlers d'IA n'executent pas le JS, donc sans lui l'outil leur est
   invisible. C'est le bloc le plus important de la page.

   Lancer :
     node .tooling/test/gen-table.js washington > .tooling/test/table-washington.html
     node .tooling/test/gen-table.js nevada     > .tooling/test/table-nevada.html

   Generalise le 27/08/2026, apres avoir ecrit Washington entierement a la
   main (regle E : jamais d'outil avant d'avoir fait la tache une fois).
   Le state est lu dans rates-2026.js : les retenues d'Etat qui n'existent
   pas dans la fiche de l'Etat valent zero, elles ne sont pas supposees.
   Les 84 nombres ne sont jamais saisis a la main.

   Colonne "state" = TOUTES les retenues salariales d'Etat cumulees.
   Washington : Paid Leave + WA Cares. Nevada : rien, donc $0. */

const R = require("../../data/rates-2026.js");
/* Delegue le calcul a la bibliotheque unique .tooling/lib/paie.js.
   Avant le 28/08/2026 ce generateur avait sa propre copie de l'arithmetique.
   Elle ignorait les programmes salaries et la regle 401(k) de la Pennsylvanie,
   et a produit un tableau faux de 0,02 $ l'heure - publie sans rien signaler,
   trouve seulement parce qu'une suite de test compare le tableau SERVI a une
   seconde implementation. Une seule copie du calcul, desormais. */
const LIB = require("../lib/paie.js");


const cle = process.argv[2] || "washington";
const S = R.states[cle];
if (!S) {
  console.error("Etat inconnu : " + cle + "\nDisponibles : " + Object.keys(R.states).join(", "));
  process.exit(2);
}

/* ⚠️ LE CALCUL N'EST PAS REFAIT ICI. Il passe par calcul(), la fonction
   complete de .tooling/lib/paie.js, et non par ses briques.

   Pourquoi cette precision, ecrite le 02/09/2026 : jusqu'a ce jour ce fichier
   empruntait progressiveTax() et deductionEtat() puis REASSEMBLAIT le total
   lui-meme. Il heritait donc des formules mais pas des regles ajoutees ensuite
   au moteur, et se trompait EN SILENCE :
     - Pennsylvanie, depuis le 28/08 : la retenue chomage salariee de 0,07 %
       (employeePrograms) manquait — jusqu'a 105 $ par an ;
     - Utah, publie le matin du 02/09 : le credit qui s'efface manquait ;
     - Ohio, publie le soir du 02/09 : la marche de 332 $ manquait, et le
       tableau annoncait 43 $ d'impot sur 30 000 $ au lieu de 374,63 $.
   Le commit du 28/08 avait supprime les copies des FORMULES, pas celle de
   l'ASSEMBLAGE. C'est ce qui restait a faire.

   Regle a tenir : tout nouveau mecanisme d'Etat s'ajoute a calcul() et nulle
   part ailleurs. test-tableaux.js compare desormais chaque ligne publiee a
   calcul() et echoue si les deux divergent d'un dollar. */
const calcul = LIB.calcul;

const money = n => "$" + Math.round(n).toLocaleString("en-US");
const money2 = n => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* La deduction d'un Etat peut etre un montant unique ou une table par situation
   de famille : la Georgie deduit 15 000 $ pour un celibataire et 30 000 $ pour
   un couple. Les tableaux de cette page sont tous en celibataire, mais lire la
   valeur sans tester le type donnait "gross - {objet}" = NaN, et le generateur
   ecrivait tranquillement "$NaN" dans du HTML destine a la mise en ligne.
   Ajoute le 28/08/2026, en meme temps que le meme correctif dans le moteur. */
const deductionEtat = LIB.deductionEtat;

/* Les paliers vivent dans un module commun depuis le 05/09/2026 : ils etaient
   ecrits en trois exemplaires, et le troisieme, plus court, a produit une page
   Tennessee moitie moins fournie que ses pairs. Voir ../lib/paliers.js. */
const { SALAIRES: salaries } = require("../lib/paliers.js");

const rows = salaries.map(gross => {
  const r = calcul(cle, gross, "single");
  /* La colonne « state » regroupe TOUT ce que l'Etat prend au salarie :
     impot sur le revenu, conge paye, WA Cares, et les programmes salaries
     comme le chomage de Pennsylvanie. */
  const etat = r.etat + r.paidLeave + r.waCares
             + (r.programmes || []).reduce((t, pg) => t + pg.montant, 0);
  return { gross, federal: r.federal, fica: r.ss + r.med, state: etat, net: r.net,
           monthly: r.net / 12, rate: r.taux };
});

/* Un tableau faux ne doit JAMAIS pouvoir etre publie. Avant le 28/08 le
   generateur ecrivait "$NaN" sans broncher ; c'est exactement le genre de
   sortie qu'on colle dans une page sans la relire. On s'arrete en erreur. */
rows.forEach(function (r) {
  Object.keys(r).forEach(function (k) {
    if (!isFinite(r[k])) {
      console.error("ARRET : valeur non finie pour " + k + " sur " + r.gross +
                    " — le barème de cet Etat est incomplet ou mal lu.");
      process.exit(2);
    }
  });
});

console.log(rows.map(r =>
  "          <tr>\n" +
  "            <td class=\"num\">" + money(r.gross) + "</td>\n" +
  "            <td class=\"num\">" + money(r.federal) + "</td>\n" +
  "            <td class=\"num\">" + money(r.fica) + "</td>\n" +
  "            <td class=\"num\">" + money(r.state) + "</td>\n" +
  "            <td class=\"num\"><strong>" + money(r.net) + "</strong></td>\n" +
  "            <td class=\"num\">" + money2(r.monthly) + "</td>\n" +
  "            <td class=\"num\">" + (r.rate * 100).toFixed(1) + "%</td>\n" +
  "          </tr>"
).join("\n"));
