# Nebraska — dossier de sources

*Constitué le 09/09/2026 pour la page `/paycheck-calculator/nebraska/`.
Une ligne sans source ne part pas.*

---

## Les hôtes, et ce qui bloque

| Hôte | État au 09/09/2026 | Détail |
|---|---|---|
| `revenue.nebraska.gov` | **200** | Pages et PDF, `curl -A "…Chrome/131"`. Tout ce qui suit vient de là. |
| `dol.nebraska.gov` | **connexion refusée** | `curl` code 000, puis `ECONNREFUSED 164.119.176.91`. |
| `nebraskalegislature.gov` | **connexion refusée** | `ECONNREFUSED 164.119.161.105`. |

⛔ Les deux refus sont sur le **même bloc d'adresses** (164.119.x) : c'est le réseau de l'État
qui nous ferme la porte, pas un filtrage d'user-agent contournable comme Hawaii. Deux méthodes,
deux échecs → **on s'arrête** (règle des 3 tentatives). Conséquence directe sur la page : elle
ne dit **rien** sur qui paie l'assurance chômage au Nebraska.

---

## 1. Le barème 2026

**Source.** Formulaire **1040N-ES**, « Nebraska Individual Estimated Income Tax Payment
Vouchers », millésime **2026**,
`https://revenue.nebraska.gov/sites/default/files/doc/tax-forms/2025/f_1040N-ES.pdf`,
HTTP 200, `application/pdf`, **611 808 octets**, lu le 09/09/2026.

C'est le bon document et pas un pis-aller : c'est celui que l'État publie pour que le
contribuable estime l'impôt de **l'année en cours**. Le livret du 1040N pour 2026 n'existera
qu'en 2027.

Page 6, « 2026 Nebraska Estimated Income Tax Rate Schedule », célibataire, verbatim :

> « 2.46% of the income »
> « $101.60 + 3.51% of the excess over $4,130 »
> « $825.71 + 4.55% of the excess over $24,760 »
> « $1,514.58 + 4.55% of the excess over $39,900 »

Marié déclarant conjointement : 8 250 / 49 530 / 79 800.
Chef de famille : 7 700 / 39 620 / 59 160.

**Quatre tranches, trois taux.** Même page, verbatim :

> « The tax year 2026 individual income tax rates for the third and fourth brackets are at the
> same rate of 4.55% per Neb. Rev. Stat. § 77-2715.03(2)(c)(v). »

D'où trois bandes dans `data/rates-2026.js`. Une quatrième bande à 4,55 % après une troisième à
4,55 % ne changerait aucun résultat : ce serait du bruit, pas de la fidélité.

**Le contrôle qui vaut plus qu'une relecture.** Notre moteur additionne tranche par tranche et
ne lit jamais les constantes cumulées du formulaire. Il retombe sur **101,60 / 825,71 /
1 514,58**, aux mêmes centimes. Un seuil ou un taux mal recopié se verrait dès la deuxième
tranche.

---

## 2. La déduction standard 2026

Même PDF, page 4, ligne 5 du worksheet, verbatim :

> « Nebraska standard deduction: Single $8,850; Married, Filing Jointly $17,700; Head of
> Household $12,950; Married, Filing Separately $8,850 »

Recoupé sur « Nebraska Tax Rate Chronologies, Table 1 », révision **2-2026**,
`…/doc/research/chronology/4-607table1.pdf` : ligne « Jan. 1, 2026 » → colonne Standard
Deductions **8 850 / 17 700**. (La chronologie ne donne pas le chef de famille ; c'est le
1040N-ES qui le porte.)

---

## 3. Le crédit de 176 $ — un CRÉDIT, pas une déduction

1040N-ES 2026, page 6, verbatim :

> « Include $176 for each Nebraska personal exemption allowed on line 14 »

Chronologie DOR, même document, ligne « Jan. 1, 2026 », colonne Personal Exemption : **176 $**.

**Il ne s'efface plus.** Note 2 de la chronologie : le crédit était dégressif avec le revenu
« through tax year 2005 », et la liste des seuils de dégressivité porte « Not Applicable
beginning in 2018 ». D'où `phaseOutStart: Infinity` et `phaseOutRate: 0` — ce n'est pas un
contournement du moteur, c'est l'état du droit.

---

## 4. La baisse de 2025 à 2026

Chronologie DOR, révision 2-2026, deux lignes lues côte à côte :

| Ligne | Taux par tranche | Exonération | Déduction std |
|---|---|---|---|
| Jan. 1, **2025** | 2,46 / 3,51 / **5,01 / 5,20** | 171 $ | 8 600 / 17 200 |
| Jan. 1, **2026** | 2,46 / 3,51 / **4,55 / 4,55** | 176 $ | 8 850 / 17 700 |

Le taux haut perd **0,65 point**. La page ne compare pas les taux entre eux : elle fait tourner
le **barème 2025 complet** (seuils 4 030 / 24 120 / 38 870, déduction 8 600, crédit 171) contre
le barème 2026 complet sur le même salaire. Sur 75 000 $ : 2 803,83 $ contre 2 532,96 $, soit
**270,88 $**.

---

## 5. Ce que le test a rattrapé avant la mise en ligne

La première version de la page annonçait que le Nebraska ne prélève rien en dessous de
**16 004 $** — obtenu en divisant le crédit par le premier taux (8 850 + 176 / 0,0246).

**C'est faux.** La bande à 2,46 % ne fait que 4 130 $ de large : elle ne produit que 101,60 $
d'impôt sur toute sa longueur, moins que le crédit. Le reste du crédit s'absorbe donc dans la
bande à 3,51 %, et le seuil réel arrive **plus tôt : 15 100 $**, trouvé au dollar près par
`test-etat-navigateur.js`.

Le seuil est désormais **cherché par dichotomie** dans le générateur, jamais calculé de tête, et
la page explique pourquoi le raccourci évident donne un mauvais chiffre.

---

## 6. Ce qui n'est PAS vérifié — donc ce que la page ne dit pas

- **Qui paie l'assurance chômage** (cf. tableau des hôtes). La page ne dit ni qu'il sort quelque
  chose, ni qu'il ne sort rien : elle dit ce que le calcul modélise. Même règle que la Georgie.
- **Impôt municipal ou de comté** : aucune source lue.
- **Taux 2027 et suivants** : non recherchés, non cités.
- **Les taux de retenue du Circular EN** sont cités comme ce qu'ils sont — des instructions aux
  employeurs — et ne sont **pas** utilisés pour calculer le net.
  Source : « 2026 Nebraska Circular EN », Rev. 11-2025, PDF **519 436 octets**, même hôte,
  téléchargé le 09/09/2026 depuis
  `…/doc/business/Cir_En_2025/2026cir_en_whole.pdf`.
  Page 12, « Nebraska Income Tax Withholding Percentage Method Tables (For Wages Paid on or After
  January 1, 2026) », TABLE 1 — WEEKLY, colonne *SINGLE Person*, lue ligne à ligne :
  **2,26 % · 3,22 % · 4,21 % · 4,35 % · 4,48 % · 4,60 %**, appliqués après soustraction de la
  valeur de l'allocation de retenue. Les six valeurs se répètent à l'identique dans les tables
  2 à 8 (bimensuelle, mensuelle, etc.), seuls les seuils changent avec la périodicité.
  ⛔ Ces six taux ne sont PAS le barème de l'impôt et ne doivent jamais servir à calculer un net :
  ce sont deux échelles différentes, et c'est précisément ce que la page explique.
