# MONTANA — sources lues pour la page 2026

*Toutes lues le **10/09/2026**, depuis cette machine, HTTP 200 sauf mention contraire.*
*Regle du depot : un chiffre sans source et sans date est repute faux.*

---

## 1. La table de retenue de l'employeur — la source operative

**Montana Employer and Information Agent Guide with Montana Withholding Tax Tables — 2026**
`https://revenuefiles.mt.gov/files/Forms/Montana_Employer_and_Information_Agent_Guide_with_Tax_Tables.pdf`
`application/pdf`, **985 472 octets**, HTTP 200.
Page de publication : `https://revenue.mt.gov/publications/montana-employer-and-information-agent-guide`,
qui l'annonce sous le titre **« For use beginning January 1, 2026: ... — 2026 (PDF) »**.

### Formule (page 16 du guide)
> W = A + ( B x ( G - C ))
> G = Gross Earnings for the payroll period
> W = Withholding tax for the payroll period
> **Important: All amounts to be withheld must be rounded up to the nearest dollar.**
> « This formula will duplicate the results found in the tables immediately preceding this
> section. There may be insignificant variances due to rounding. »

### Periode ANNUELLE, verbatim (pages 17 a 19)

| Situation | 0 % jusqu'a | 4,7 % jusqu'a | A | puis |
|---|---|---|---|---|
| Single / MFS / **Married both working** | **16 100 $** | **63 600 $** | **2 233 $** | 5,65 % |
| Married Filing Jointly | **32 200 $** | **127 200 $** | **4 465 $** | 5,65 % |
| Head of Household | **24 150 $** | **95 400 $** | **3 349 $** | 5,65 % |

### « What's new? », page 1, verbatim
> « **House Bill 337, passed in 2025, lowered the top marginal tax rate and increased the income
> brackets for tax year 2026.** Beginning in tax year 2027, the bill lowers the top marginal
> ordinary income tax rate and increases the income brackets even further. The bill also increases
> the Montana earned income tax credit to 20% of the federal earned income tax credit beginning in
> tax year 2026. »

Et, sur la retenue des redevances minieres — qui suit par construction le taux marginal le plus
haut, donc qui le **date** :
> « In 2025, the rate was 5.9%. **This rate decreases in 2026 to 5.65% and in 2027 to 5.4%.** »

### 401(k) et plans differes, verbatim
> « Employee contributions to qualifying annuity contracts such as "tax sheltered" annuity plans
> for teachers, public employees deferred compensation, or other similar plans, as defined by the
> Internal Revenue Code (I.R.C.), **are exempt from withholding requirements to the extent that
> the contributions are not included in the employee's adjusted gross income for federal income
> tax purposes.** »

---

## 2. La loi elle-meme — source independante de la premiere

**Montana Code Annotated 15-30-2103, « Rate of tax »**
`https://archive.legmt.gov/bills/mca/title_0150/chapter_0300/part_0210/section_0030/0150-0300-0210-0030.html`
HTTP 200, 24 718 octets. En-tete de page : « Montana Code Annotated 2025 ».

Version **(Temporary)** — celle qui s'applique a 2026, verbatim :
> « (c) for every individual other than a surviving spouse or head of household who is not a
> married individual: (i) **on the first $47,500 of Montana taxable income** or any part of that
> income, **4.7%**; (ii) on any Montana taxable income in excess of $47,500 or any part of that
> income, **5.65%** »
> Marie conjoint : **95 000 $** · Chef de famille : **71 250 $** · Marie separement : **47 500 $**.
> « **(Terminates December 31, 2026** — sec. 7, Ch. 227, L. 2025.) »

Version **(Effective January 1, 2027)**, publiee dans la meme section :
> **65 000 $** (celibataire), **130 000 $** (conjoint), **97 500 $** (chef de famille), puis
> **5,4 %**, avec une clause d'indexation annuelle au 1er novembre.

⚠️ Le paragraphe (2) de la meme section fixe des taux reduits (3 % / 4,1 %) sur les
**plus-values a long terme**. Sans effet sur un salaire : la page n'en parle pas.

---

## 3. Le point de depart du calcul — pourquoi il n'y a pas de deduction d'Etat

**MCA 15-30-2120, « Adjustments to federal taxable income to determine Montana taxable income »**
`https://archive.legmt.gov/bills/mca/title_0150/chapter_0300/part_0210/section_0200/0150-0300-0210-0200.html`
HTTP 200, 32 448 octets. Verbatim :
> « (1) The items in subsection (2) are added to and the items in subsection (3) are subtracted
> from **federal taxable income** to determine Montana taxable income. »

Le Montana part du revenu imposable **federal** — donc apres deduction federale. C'est la raison
pour laquelle `standardDeduction` vaut 16 100 / 32 200 / 24 150 dans `data/rates-2026.js` : ce sont
les deductions standard federales 2026 (Rev. Proc. 2025-32, deja citees en tete de ce fichier).

---

## 4. Assurance chomage — le piege Washington, ecarte sur la source

**Montana Employer Handbook**, `https://uid.dli.mt.gov/employer-handbook.pdf`
HTTP 200, **858 745 octets**. Verbatim :
> « **It is against the law to deduct UI taxes from your employees' wages.** »

Rien a soustraire du net cote salarie. Aucune retenue de type invalidite ou conge familial n'est
decrite dans le guide de retenue.

---

## 5. L'annee 2025, pour la comparaison ecrite sur la page

`https://revenue.mt.gov/taxes/tax-tables-and-deductions/2025` — HTTP 200, 50 502 octets.
> Celibataire : « First $21,100 of Montana Ordinary Income — 4.7% » ;
> « Montana Ordinary Income exceeding $21,100 — 5.9% ».
> Conjoint : 42 200 $ · Chef de famille : 31 700 $.

⚠️ La page « Tax Tables and Deductions » du DOR ne publiait, au 10/09/2026, que **2025 et
anterieur**. Les chiffres 2026 viennent donc du guide de retenue et de la loi, pas de cette page.

---

## LE RECOUPEMENT — ce qui verrouille les six nombres

Les deux sources ne mesurent pas la meme grandeur : la table part du **brut**, la loi du
**revenu imposable**. L'ecart doit valoir la deduction, et le « A » doit valoir 4,7 % de la
largeur de la premiere tranche :

```
63 600 - 16 100 = 47 500      4,7 % x 47 500 = 2 232,50  ->  2 233 imprime
127 200 - 32 200 = 95 000     4,7 % x 95 000 = 4 465,00  ->  4 465 imprime
95 400 - 24 150 = 71 250      4,7 % x 71 250 = 3 348,75  ->  3 349 imprime
```

Les cinq tables periodiques sont la table annuelle divisee par 12, 24, 26, 52 et 260 : les
**45 nombres** ont ete verifies un par un. Les seuils sont arrondis au plus proche, les
constantes « A » au dollar **superieur** — conformement a la consigne du guide — **sauf une** :
mensuel marie conjoint, **372 $** imprime la ou 4 465 / 12 = 372,08 arrondi vers le haut donne
**373 $**. C'est la seule des quinze. Ecart : 1 $ par mois de retenue, sans effet sur l'impot du.

Les **neuf exemples chiffres** du guide (pages 17 a 19) sont reproduits par `.tooling/lib/paie.js`
a moins d'un dollar pres — l'ecart etant l'arrondi au dollar superieur que le guide impose.

---

## SOURCES QUI N'ONT PAS REPONDU (arret regle des 3 tentatives)

- `leg.mt.gov/bills/2025/billpdf/HB0337.pdf` et `archive.legmt.gov/bills/2025/BillHtml/HB0337.htm` :
  **HTTP 404** (deux tentatives). Changement de methode plutot que troisieme variante : la loi
  **codifiee** (MCA 15-30-2103) porte le meme contenu, et c'est elle qui fait foi.
- `mtrules.org` (ARM 42.17.105, la regle qui autorise l'ajustement des tables) : connexion
  refusee, code **000**. Non necessaire : le guide cite la regle et publie les tables qui en
  decoulent.

## CE QUE LA PAGE NE DIT PAS, FAUTE DE SOURCE
- Rien sur un eventuel impot municipal. Le guide ne decrit qu'une seule retenue d'Etat, mais
  aucune source lue n'affirme en toutes lettres qu'aucune ville ne preleve.
- Rien sur les taux 2027 presentes comme applicables : ils sont dans la loi, ils sont cites comme
  tels, et la page precise qu'ils seront indexes avant d'entrer en vigueur.

---

## 6. L'ancienne deduction du Montana — pour la section « erreurs courantes »

`https://revenue.mt.gov/taxes/tax-tables-and-deductions/2023` — HTTP 200, 48 803 octets,
lu le 10/09/2026. La page publie deux tables distinctes :
> « **2023 Maximum Standard Deduction Amounts by Filing Status** » — Single **5 540 $**,
> Married Filing Separately 5 540 $, Head of Household 11 080 $ ;
> « **2023 Minimum Standard Deduction Amounts by Filing Status** » — Single **2 460 $**.

Un plancher ET un plafond : c'etait une deduction proportionnelle au revenu, bornee aux deux
bouts. Elle a disparu avec le passage au revenu imposable federal. La page cite ces deux chiffres
pour que le lecteur reconnaisse un resultat de recherche perime au lieu de l'appliquer.
