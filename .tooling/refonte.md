# Refonte visuelle — journal de bord

*Ouvert le 05/09/2026. Mis à jour au fur et à mesure, pas à la fin.
Si la session est coupée, ce fichier suffit à reprendre.*

**Règle qui prime sur tout le reste : REFONTE, PAS RECONSTRUCTION.**
Le calculateur, les formules fiscales, les données, les URL, le contenu SEO et les
pages existantes ne bougent pas. On change la présentation, rien d'autre.
En cas de conflit entre une idée de design et une fonction qui marche : **la fonction gagne.**

---

## Décisions arrêtées par le PDG le 05/09/2026

| Sujet | Décision | Pourquoi |
|---|---|---|
| **Photos** | **Aucune photo de stock.** SVG dessiné maison uniquement | Licence à payer, poids ×4, et la photo « personne devant un ordinateur » est le signal n°1 du template fait par IA. Le n°1 du secteur n'en a aucune au-dessus de la ligne de flottaison |
| **Carte USA** | Les 50 États. Publiés en bleu et cliquables, les 39 autres en gris avec infobulle honnête | C'est vrai, c'est une signature, et ça montre la progression |
| **Police** | **Polices système, 0 Ko.** Pas d'Inter | La CSP interdit Google Fonts ; auto-héberger coûterait 35-45 Ko, soit le double du poids actuel du site. Le premium vient de la hiérarchie, pas du dessin de la police |
| **Drapeau US** | **Non** comme palette de marque. Le rouge garde **un seul métier** : l'argent qui sort, dans les graphiques | Sur un site d'impôts, ressembler à un site gouvernemental crée une confusion qu'on dément par écrit dans le disclaimer. Et le rouge de marque entrerait en collision avec le rouge « ce que tu perds » |

## Palette verrouillée — tout mesuré, AA ou AAA sur les deux fonds

```
Fond de page      #F1F5F9   gris. Écart 1,10 avec le blanc : les cartes se détachent sans bordure
Cartes / contenu  #FFFFFF   blanc, UNIQUEMENT là où il y a du texte
Navy de marque    #0A2A5E   header, footer, État sélectionné        13,95:1
Bleu cliquable    #1D4ED8   liens, boutons, États publiés            6,70:1
Rouge « ça sort » #B22234   impôts et retenues, graphiques           6,62:1
Vert « tu gardes »#047857   le net                                   5,48:1
Texte             #0F2547 / #3F5170 / #5B6B85          15,26 / 8,01 / 5,40
```

⚠️ La palette proposée à l'origine avait **3 échecs WCAG** : `#059669` (3,77), `#D97706` (3,19)
et `#64748B` sur `#F5F7FA` (4,43). Corrigés ci-dessus. Ne pas les réintroduire.

## Le n°1 du secteur, palette relevée sur sa page en direct (05/09/2026)

SmartAsset, surface réellement peinte : navy `#00496E` (nav), bleu vif `#20A7E2` (accents),
gris `#F4F4F6` (fond de page), blanc (cartes), `#333333` (texte). **Zéro pixel de rouge.**
Aucune photo au-dessus de la ligne de flottaison. Carte USA présente mais **grise et inerte**.
Mise en page : contenu principal + colonne de droite avec liens connexes.

---

## PHASE 0 — le gabarit commun ✅ FAIT le 05/09/2026

**Pourquoi elle passe avant tout le reste.** L'en-tête et le pied de page étaient recopiés
dans les 32 pages servies, en **3 versions différentes de l'en-tête** et **4 du pied de page**.
Et 6 pages d'État — Floride, Géorgie, Illinois, Nevada, Texas, Washington — **n'ont aucun
générateur** : leur HTML est écrit à la main. Sans cette phase, chaque phase suivante se
serait payée ×32, dont 6 fichiers non régénérables.

- `.tooling/lib/gabarit.js` — source unique de l'en-tête et du pied de page
- `.tooling/ops/migre-gabarit.js` — migration idempotente, HTML **et** générateurs
- `.tooling/test/verif-gabarit.js` — **32 OK, 0 échec**

**Deux défauts réparés au passage :** les 9 pages « salary to hourly » n'avaient pas le lien
vers leur propre hub dans le menu ; 28 pages sur 32 n'avaient aucun lien « Home » en pied de page.

---

## Ce que l'audit a trouvé et qui reste à traiter

### 1. Sept pages portent encore un bloc `Organization` dupliqué
La migration d'entité du 05/09 ne les a pas atteintes. Elles répètent le publisher en toutes
lettres au lieu de référencer `#organization` par `@id` :
`contact`, `disclaimer`, `methodology`, `paycheck-calculator`, `privacy`,
`salary-to-hourly-calculator`, `terms`.
👉 Pour `salary-to-hourly-calculator`, **le générateur produit déjà la bonne version** : il
suffit de le relancer. Les 6 autres sont écrites à la main.

### 2. `build-s2h-hub.js` et sa page ont divergé
Le générateur produit `<title>… Before and After Tax, by State</title>`, la page servie porte
`<title>… After Tax, by State</title>`. Quelqu'un a amélioré le titre dans le HTML sans le
reporter dans le générateur. **Trancher lequel garder avant de relancer ce générateur.**

### 3. Fausse alerte à ne pas refaire
Régénérer Michigan, Ohio et Pennsylvanie produit des fichiers **plus courts de ~100 lignes**.
J'ai cru à une perte de contenu. **C'est faux** : texte visible et JSON-LD sont identiques au
caractère près, seule l'indentation change. **Comparer le contenu, jamais le nombre de lignes.**

### 4. Le prompt de refonte invente des pages qui n'existent pas
À ne pas créer en les prenant pour acquises :
- **États** : California et New York (le prompt les liste dans « Popular States »)
- **Outils** : Hourly to Salary, Tax Calculator, Overtime Calculator
- **Rubrique** : Tax Guides
- **Champs de calcul** : HSA, Health Insurance, Other Deductions, Additional Withholding.
  Le calculateur lit `salary, state, period, hours, filing, retirement (401k), wacares`. Rien d'autre.

---

## Budget de performance — à défendre à chaque phase

| | Avant refonte (05/09/2026) |
|---|---|
| `assets/style.css` | **13 564 octets** |
| `assets/calc-paycheck.js` | **17 964 octets** |
| `assets/analytics.js` | 908 octets |
| **Total front** | **~32 Ko**, zéro police chargée, zéro image de contenu |

Toute phase qui fait grossir ce total doit dire de combien et pourquoi.

**Après phases 1 et 2 (05/09/2026)** : `style.css` passe de 13 564 à **17 851 octets** bruts,
mais **6 390 octets une fois gzippé** — et **7 793 octets sont des commentaires**, qui ne
coûtent presque rien compressés. Le JavaScript n'a pas bougé : **0 octet ajouté**.

## Où l'on peut réellement dépasser le n°1

Relevé sur sa page le 05/09/2026, ce sont ses faiblesses, pas des suppositions :

1. **Son calculateur est enterré** sous un long bloc de texte et une carte inerte.
   Le nôtre peut être atteignable dès le premier écran.
2. **Sa carte USA est grise et ne fait rien** — décorative. La nôtre sera cliquable.
3. **Son résultat est une simple liste.** Le nôtre aura un chiffre dominant, un camembert
   et des barres.
4. **Il ne cite aucune source.** Nous citons le texte de loi avec la date de lecture.
   C'est notre vrai avantage, et aucun budget ne l'achète.

## Animation : aucune bibliothèque

La CSP (`script-src 'self'` + googletagmanager) interdit tout script externe. Et tout est
faisable en natif :

| Effet | Moyen | Coût |
|---|---|---|
| Chiffre qui monte | `requestAnimationFrame`, ~15 lignes | ~0,4 Ko |
| Camembert | un `<circle>` SVG, `stroke-dasharray` + transition CSS | ~0,3 Ko |
| Barres de répartition | transition CSS sur `width` | ~0,2 Ko |
| FAQ accordéon | `<details>` / `<summary>` natifs | **0 Ko, 0 JS** |
| Menu mobile | `<details>` ou bascule de 10 lignes | ~0,2 Ko |
| Apparition au défilement | `IntersectionObserver` natif | ~0,3 Ko |

Total visé : **moins de 2 Ko de JS ajouté**. Tout sous `prefers-reduced-motion`.

⚠️ **Cible dépassée, à dire plutôt qu'à maquiller.** Après la phase 4, le JS gzippé passe de
6 943 à **9 419 octets, soit +2 476** — au-dessus des 2 Ko annoncés. Le code hors commentaires
passe de 9 521 à 14 666 octets. La dérive ne vient pas de l'animation (~20 lignes) mais des
trois choses ajoutées autour : le modèle de répartition, le résumé en toutes lettres, et le
rendu des barres. Le CSS gzippé passe de 6 380 à 7 570 (+1 190). **Total réellement transmis
en plus : ~3,7 Ko.** C'est justifié, mais ce n'est pas ce qui avait été annoncé.

---

## Ordre des phases

| # | Phase | État |
|---|---|---|
| 0 | Gabarit commun en-tête/pied de page | ✅ **fait** |
| 1 | Jetons de couleur + fond gris / cartes blanches | ✅ **fait** |
| 2 | En-tête : navy, compact, CTA, mobile 2 lignes | ✅ **fait** |
| 3 | Carte du calculateur + champs | ✅ **fait** (via les jetons) |
| 4 | Résultat : chiffre dominant, camembert, barres | ✅ **fait** |
| 5 | Carte USA SVG | à faire |
| 6 | Cartes d'États + grille | à faire |
| 7 | Contenu éditorial : aération, encadrés, tableaux | à faire |
| 8 | Colonne latérale + fil d'Ariane | à faire |
| 9 | Pied de page en 4 colonnes | à faire |
| 10 | Passe mobile 375 → 1440 | à faire |
| 11 | Passe accessibilité | à faire |
| 12 | Mesure de performance avant/après | à faire |
| 13 | Contrôle par l'agent `controle-statelinecalc`, PUIS publication | à faire |

⚠️ **Publication seulement après le contrôle.** Analyser, construire, faire vérifier, publier.
