# IDAHO — sources lues pour la page 2026

*Toutes lues le **12/09/2026**, depuis cette machine, via l'instantane Internet Archive
(HTTP 200) apres echec direct — voir §5. Regle du depot : un chiffre sans source et sans
date est repute faux.*

---

## 1. La source primaire du mecanisme de retenue — EPB00744, revision 07-23-2026

**Table for Percentage Computation Method of Withholding**, Idaho State Tax Commission,
document **EPB00744**, revision **07-23-2026**.
`https://tax.idaho.gov/wp-content/uploads/pubs/EPB00744/EPB00744_07-23-2026.pdf`
Lu via `web.archive.org/web/2026/<url ci-dessus>`, `application/pdf`, **316 188 octets**,
HTTP 200 le 12/09/2026 (le lien direct time-out depuis cette machine, voir §5).

Verbatim, periode **ANNUELLE** :

> Single Persons Including Head of Household
> If wages after subtracting child tax credit allowances are: More than $1, Less than $16,100 :
> the amount of Idaho income tax to withhold is $0.00. $16,100 [and above]: 5.3% of the amount
> over $16,100.

> Married Persons
> If wages after subtracting child tax credit allowances are: More than $1, Less than $32,200 :
> $0.00. $32,200 [and above]: 5.3% of the amount over $32,200.

Les periodes mensuelle, semi-mensuelle, bihebdomadaire, hebdomadaire et journaliere de la
meme table donnent des seuils qui sont, chacun, l'annuel divise par (12, 24, 26, 52, 260) et
arrondi — recoupement fait a la main : 16 100 / 12 = 1 341,67 → imprime 1 342 ; 16 100 / 24 =
670,83 → imprime 671 ; 16 100 / 26 = 619,23 → imprime 619 ; 16 100 / 52 = 309,6 → imprime 310 ;
16 100 / 260 = 61,9 → imprime 62. Les six periodes concordent au dollar pres.

**⚠️ Le chef de famille N'A PAS de colonne separee** : il est explicitement regroupe avec le
celibataire, au seuil de 16 100 $ — different du traitement federal (24 150 $ pour la
deduction standard HOH) et different du formulaire annuel 2025 (§3, ci-dessous), qui
regroupait au contraire le chef de famille avec le conjoint. C'est le fait distinctif de
cette page.

Les seuils 16 100 $ / 32 200 $ sont, au dollar pres, la deduction standard federale 2026
declaree en tete de `data/rates-2026.js` (IRS Rev. Proc. 2025-32, lue le 22/08/2026).

---

## 2. Le communique qui accompagne la table — sunset du credit d'impot pour enfant

**« Withholding tables updated for 2026 »**, Idaho State Tax Commission, date affichee
**« Friday July 31, 2026 »**.
`https://tax.idaho.gov/pressrelease/withholding-tables-updated-for-2026/`
Lu via Wayback, HTTP 200 le 12/09/2026 (direct : time-out, voir §5).

Verbatim : « We've updated the income tax withholding tables for 2026. The Idaho Child Tax
Credit has sunsetted per Idaho Code section 63-3029L. You don't need to adjust withholding
back to the beginning of the year, but you should use the revised tables going forward. »

Confirme que le credit d'impot pour enfant **propre a l'Idaho** (distinct du credit federal)
a expire le 1er janvier 2026 par sa propre clause d'extinction, et que la table EPB00744 (§1)
ne comporte donc plus d'allocation non nulle pour ce credit.

---

## 3. Pour comparaison — le formulaire annuel de l'annee d'imposition 2025

**Individual Income Tax**, Idaho State Tax Commission, document **EIN00046**, revision
**03-02-2026** (formulaire de declaration pour l'annee d'imposition **2025**, depose en 2026).
`https://tax.idaho.gov/wp-content/uploads/forms/EIN00046/EIN00046_03-02-2026.pdf`
Lu via Wayback, `application/pdf`, **3 040 929 octets**, HTTP 200 le 12/09/2026.

Verbatim, « Worksheet » de la ligne 20 (Tax) :
> 1. Enter the amount of Idaho taxable income from Form 40, line 19.
> 2. Enter the amount shown below for your filing status: Single or married filing separately,
> enter $4,811. Married filing jointly, head of household, or qualifying surviving spouse,
> enter $9,622.
> 3. Subtract line 2 from line 1. 4. Multiply subtotal by 5.3%.

⚠️ **Ne pas confondre avec le seuil 2026** : ce document est pour l'annee d'imposition 2025,
et regroupe le chef de famille avec le CONJOINT (9 622 $) — l'inverse de la table de retenue
2026 (§1), qui le regroupe avec le CELIBATAIRE. L'ecart entre 4 811 $ (2025) et 16 100 $
(2026) n'est pas une erreur : 2026 est la premiere annee ou le seuil de retenue est calque
sur la deduction standard federale OBBBA-augmentee, plutot que sur le petit montant indexe a
part par l'Idaho (§4). Meme document, verbatim, ligne 20 (Standard Deduction Worksheet) pour
2025 : « Single or married filing separately, enter $15,750. Married filing jointly or
qualifying surviving spouse, enter $31,500. Head of household, enter $23,625. » — ce sont les
montants federaux 2025 (avant l'augmentation OBBBA supplementaire qui porte les chiffres 2026
a 16 100 $ / 32 200 $ / 24 150 $).

Aussi verbatim, page 8 : « Tax Rate Reduction — Effective January 1, 2025, the individual
income tax rate is 5.3%. »

---

## 4. La loi elle-meme — Idaho Code 63-3024 et 63-3024A

`legislature.idaho.gov` injoignable sur les memes trois methodes que le §5 le 12/09/2026.
Texte lu par extrait indexe (recherche), verbatim, concordant sur plusieurs miroirs
juridiques de la meme loi (Justia, FindLaw, le site meme de la legislature dans son propre
extrait de recherche) :

> [63-3024] The tax imposed upon individuals, trusts, and estates ... shall be computed at
> the rate of five and three-tenths percent (5.3%) of taxable income over two thousand five
> hundred dollars ($2,500). For taxpayers filing a joint return ... the tax ... shall be
> computed at the rate of 5.3% of taxable income over five thousand dollars ($5,000). ... a
> return of a surviving spouse ... and a head of household ... shall be treated as a joint
> return.

> [63-3024A] For taxable year 2000 and each year thereafter, the state tax commission shall
> prescribe a factor that shall be used to compute the Idaho income tax thresholds. The factor
> shall provide an adjustment to the Idaho tax thresholds so that inflation will not result in
> a tax increase.

Les montants de 1998 (2 500 $ / 5 000 $) sont donc indexes chaque annee par la Commission ;
le montant EFFECTIF pour l'annee d'imposition 2026 est celui de la table de retenue (§1), pas
le montant brut de la loi — exactement le meme rapport loi/table que le Montana ou le
Wisconsin, verifie a la main ici plutot que suppose.

**⚠️ Cette loi n'a PAS ete lue directement** (voir §5) : le texte cite ci-dessus vient d'un
extrait de recherche qui reproduit le texte codifie, recoupe sur plusieurs miroirs
independants qui concordent mot pour mot. Ce n'est pas la source primaire ideale, mais la
table de retenue 2026 (§1) — qui EST une source primaire directement lue — porte les chiffres
effectivement utilises par le moteur ; la loi ne sert ici qu'a expliquer le mecanisme
d'indexation, pas a fournir un chiffre non recoupe autrement.

---

## 5. L'obstacle reseau — regle des 3 tentatives appliquee

`tax.idaho.gov` et `legislature.idaho.gov` ont refuse la connexion depuis cette machine sur
**TROIS methodes distinctes** le 12/09/2026 :

1. `curl` direct → `ERR_CONNECTION_TIMED_OUT` (exit 28), verifie avec `curl -v` : la
   connexion TCP vers `164.165.66.150:443` n'est jamais acceptee (pas un refus applicatif,
   un blocage reseau).
2. `curl -4` (IPv4 force) → meme resultat.
3. `lire-source.js` (Chromium **reel**, pas curl) → `net::ERR_CONNECTION_TIMED_OUT`.

Fait a noter : `sos.idaho.gov`, meme TLD `.gov`, a repondu **HTTP 200** normalement le meme
jour depuis la meme machine. Ce n'est donc **pas** un blocage de `idaho.gov` dans son
ensemble, mais de serveurs fiscaux/legislatifs precis — cause non identifiee (geoblocage,
pare-feu specifique, panne partielle), sans importance pour la methode retenue.

Le detour choisi : **Internet Archive / Wayback Machine**, qui a repondu HTTP 200 pour les
quatre URLs ci-dessus et servi des PDF/HTML identiques a l'original (memes octets, meme texte)
— le meme detour que l'Utah le 02/09/2026 pour sa Publication 14. Ce n'est pas un resume
tiers : c'est le document officiel, lu par une route differente.

`archive.org` lui-meme a signale une panne temporaire (« Internet Archive services are
temporarily offline ») lors d'une premiere tentative, resolue quelques minutes plus tard a la
nouvelle tentative — non lie au blocage ci-dessus, un incident distinct et passager.

---

## 6. Assurance chomage — employeur seul

**Handbook for Businesses, Unemployment Insurance Tax Information**, Idaho Department of
Labor, date de couverture **11/5/2025**.
`https://www.labor.idaho.gov/wp-content/uploads/2025/11/Handbook_Tax-information_Nov.-2025-1.pdf`
Lu via Wayback, HTTP 200 le 12/09/2026 (`labor.idaho.gov` direct : time-out, meme famille de
blocage que §5).

Verbatim, page 2, « Important Facts about Unemployment Insurance » : « State Unemployment Tax
(SUTA) is an employer-paid tax paid into the unemployment insurance trust fund that provides
benefits to qualified unemployed or underemployed workers during periods of unemployment
through no fault of their own. » Rien a soustraire du salaire de l'employe.

---

## 7. Ce que cette page ne dit pas, et pourquoi

- **Rien sur un impot municipal ou de comte.** Aucune des sources lues ne l'affirme en
  toutes lettres (meme regle que le Montana et le Wisconsin).
- **Rien sur le statut Married Filing Separately.** Notre calculateur ne le propose pas.
- **Rien sur les personnes a charge, l'age 65+, ou le detail ligne-a-ligne du formulaire
  annuel** (deductions pour pourboires, interets sur pret auto, heures supplementaires —
  House Bill 559, conformite federale). Le calculateur modelise la retenue sur salaire, pas
  la declaration annuelle complete.
