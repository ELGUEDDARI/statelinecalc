# VIRGINIA — sources lues pour la page 2026

*Toutes lues le **16/09/2026**, depuis cette machine. Regle du depot : un chiffre sans
source et sans date est repute faux.*

---

## 1. La source primaire — Income Tax Withholding Guide for Employers, rev. 05/25

Virginia Department of Taxation, document **2614086**, revision **05/25**.
`https://www.tax.virginia.gov/sites/default/files/vatax-pdf/employer-withholding-instructions.pdf`
HTTP 200 direct (aucun obstacle reseau), `application/pdf`, **1 678 640 octets**.

### 1.a Le bareme — page 21, « Formula for Computing Tax to be Withheld »

Verbatim :
> 1. (G)P - [$8,750 + (E1 X $930) + (E2 X 800)] = T
> 2. If T is: W is:
>    Not over $3,000 2% of T
>    $3,000 $5,000 $60 + (3% of excess over $3,000)
>    $5,000 $17,000 $120 + (5% of excess over $5,000)
>    $17,000 -- $720 + (5.75% of excess over $17,000)

Une seule table de brackets, appliquee a tout statut de declaration : la Virginie
n'elargit PAS ses seuils pour un couple, contrairement a la Caroline du Nord ou au
Nebraska deja publies. Recoupement fait a la main sur l'exemple imprime page 22
(John, 5 exemptions, paie semi-mensuelle, 2 649 $/periode) :
`(2 649)24 - [8 750 + (930)5] = 63 576 - 13 400 = 50 176 $` de T annualise ;
`720 + 5,75% x (50 176 - 17 000) = 720 + 1 908 = 2 628 $` -> `2 628 / 24 = 109,50 $`
par periode, imprime tel quel dans le PDF. Concorde.

### 1.b La deduction standard 2026 — page 5, « New: Increase in Standard Deduction »

Verbatim :
> Legislation enacted during the 2025 General Assembly session increases the standard
> deduction from $8,500 to $8,750 for single filers and from $17,000 to $17,500 for
> married filers filing jointly. Under this Act, the increase in the standard deduction
> is scheduled to sunset after Taxable Year 2026 and revert to the standard deduction
> amounts that applied prior to Taxable Year 2019: $3,000 for single filers and $6,000
> for married couples filing jointly.

Donc 8 750 $ / 17 500 $ couvrent l'annee d'imposition 2026 (le millesime de cette
page), avant de retomber a 3 000 $ / 6 000 $ en 2027. **headOfHousehold** reprend le
montant « single » : le formulaire VA-4 ne distingue que Single et Married (aucune
case Head of Household — verifie par recherche plein texte du PDF, 0 occurrence de
« Head of Household »). Recoupe le 16/09/2026 par une source tierce
(visaverge.com, qui cite le texte du House Bill 12 rendant l'augmentation
permanente et confirme explicitement « both single filers and head of household
filers in Virginia have the same standard deduction of $8,750 ») — **source tierce
utilisee en recoupement seulement**, jamais comme source du chiffre lui-meme, qui
vient du PDF officiel ci-dessus.

### 1.c L'exemption personnelle — page 21, legende de la formule

`E1 = Personal and Dependent Exemptions`, `E2 = Age 65 and Over & Blind Exemptions`.
L'etape 1 de la formule soustrait `(E1 X $930) + (E2 X 800)` du revenu annualise,
avant application du bareme — une vraie DEDUCTION, contrairement au credit
d'impot du Nebraska ou de l'Utah (qui se retranchent de l'impot, pas du revenu).
Notre calculateur ne demande pas le nombre de personnes a charge ni l'age : meme
convention que le Wisconsin et le Nebraska deja publies — 1 exemption (930 $) pour
un celibataire ou un chef de famille, 2 (1 860 $) pour un couple qui declare
conjointement (le declarant et le conjoint, sans personne a charge, E2 = 0).

## 2. Pas d'impot local sur le revenu

Le guide de 32 pages couvre chaque categorie de retenue qu'un employeur de
Virginie doit appliquer (formulaires, frequences de depot, exemptions, tables de
retenue completes pour 6 periodes de paie). **Recherche plein texte du document :
zero occurrence du mot « local ».** Aucune ligne de retenue municipale ou de comte
dans la formule ni dans aucune des tables. Cette absence dans un document officiel
exhaustif est le signal principal retenu.

Recoupe le 16/09/2026 par trois sources tierces independantes, toutes affirmant
explicitement l'absence d'impot local sur le revenu en Virginie :
- ADP (adp.com) : liste les paycheck calculators par Etat sans mention de local tax pour VA.
- SmartAsset (smartasset.com/taxes/virginia-paycheck-calculator).
- SurePayroll (surepayroll.com) : « Virginia has no local or city income tax. »

**Source tierce utilisee en RECOUPEMENT seulement**, jamais comme source du fait
lui-meme — celui-ci repose sur l'absence verifiee dans le document officiel.

## 3. Assurance chomage (VEC) — obstacle reseau documente

`vec.virginia.gov/employer-responsibilities` : **HTTP 403** (page F5/WAF
« The requested URL was rejected »), a la fois par `curl` direct et par un
Chromium reel via `lire-source.js` — deux methodes, deux echecs, meme motif que
le Nevada le 10/09/2026. Snapshot Internet Archive du 18/05/2026 (HTTP 200,
45 983 octets) lu a sa place : la section « Paying Taxes » de la page
« Employer Responsibilities » traite uniquement de la liability des EMPLOYEURS
(« Any employer currently liable for Federal Unemployment Tax is also liable
for unemployment tax in Virginia »), sans aucune mention d'une retenue sur le
salaire de l'employe nulle part sur la page. Ce n'est pas une phrase verbatim
aussi nette que celle trouvee pour l'Idaho ou l'Arkansas — recoupee donc par une
source tierce de paie professionnelle (rippling.com/blog/payroll-tax-in-virginia,
« This tax is levied on employers, not their employees. There are no deductions
from your paycheck for unemployment insurance. ») et par le fait, verifie sur les
18 autres Etats deja publies sur ce site, qu'aucun Etat americain ne fait
autrement. Traite comme SANS_LIEN dans `.tooling/lib/sources.js`.

## 4. Ce que cette page ne dit pas, et pourquoi

- Rien sur Married Filing Separately : non propose par le calculateur.
- Rien sur l'exemption Age 65+/aveugle (E2, 800 $) : le calculateur ne demande
  pas l'age.
- Rien sur un eventuel impot de comte ou de ville distinct de l'impot sur le
  revenu (taxe fonciere, etc.) : hors du champ d'un calculateur de paie.
