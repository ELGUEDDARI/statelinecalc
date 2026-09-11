# WISCONSIN — sources lues pour la page 2026

*Toutes lues le **11/09/2026**, depuis cette machine, HTTP 200 sauf mention contraire.*
*Regle du depot : un chiffre sans source et sans date est repute faux.*

---

## 1. La source primaire des tranches et de la deduction — Form 1-ES 2026

**2026 Form 1-ES Instructions — Estimated Income Tax for Individuals, Estates, and Trusts**
`https://www.revenue.wi.gov/TaxForms2026/2026-Form1-ES-Inst.pdf`
`application/pdf`, **262 557 octets**, HTTP 200. Document D-101A, revision **R. 1-26**.

Page finale, « Applicable Laws and Rules », verbatim :
> « This document provides statements or interpretations of the following laws and regulations
> enacted as of **January 16, 2026**: ch. 71, 77.52, 77.522, ... Wis. Stats. »

### 2026 Tax Rate Schedules for Full-Year Residents, verbatim (Schedule A)

> Schedule A — Single, Head of Household, Estates and Trusts
> $0 – $15,110 : 3.5%
> $15,110 – $51,950 : $528.85 + 4.4% of the amount over $15,110
> $51,950 – $332,720 : $2,149.81 + 5.3% of the amount over $51,950
> over $332,720 : $17,030.62 + 7.65% of the amount over $332,720

### Schedule B — Married Filing Jointly, verbatim

> $0 – $20,150 : 3.5%
> $20,150 – $69,260 : $705.25 + 4.4% of the amount over $20,150
> $69,260 – $443,630 : $2,866.09 + 5.3% of the amount over $69,260
> over $443,630 : $22,707.70 + 7.65% of the amount over $443,630

**Recoupement (verifie a la main, dans `test-engine.js`)** : 15 110 x 3,5 % = 528,85 $ ;
+ (51 950 − 15 110) x 4,4 % = 1 620,96 $ → 2 149,81 $ ; + (332 720 − 51 950) x 5,3 % =
14 880,81 $ → 17 030,62 $. Meme chose en commun : 20 150 x 3,5 % = 705,25 $ ;
+ (69 260 − 20 150) x 4,4 % = 2 160,84 $ → 2 866,09 $ ; + (443 630 − 69 260) x 5,3 % =
19 841,61 $ → 22 707,70 $. Les six constantes imprimees tombent juste au centime pres.

### 2026 Standard Deduction, verbatim — LA PENTE, PAS LA MARCHE

Schedule for Single Taxpayers :
> $0 – $20,119 : $13,960
> $20,119 – $136,453 : $13,960 less 12% of the amount over $20,120
> $136,453 – : $0

Schedule for Married Filing Jointly :
> $0 – $29,039 : $25,840
> $29,039 – $159,690 : $25,840 less 19.778% of the amount over $29,040
> $159,690 – : $0

Schedule for Head of Household :
> $0 – $20,119 : $18,030
> $20,119 – $58,827 : $18,030 less 22.515% of the amount over $20,120
> $58,827 – $136,453 : $13,960 less 12% of the amount over $20,120
> $136,453 – : $0

C'est le fait qui distingue cette page des 15 autres : le Wisconsin ne publie ni un montant fixe
par foyer (la majorite des Etats), ni une table par paliers (l'Ohio), mais une **formule
lineaire continue** qui decroit dollar pour dollar jusqu'a zero. Le chef de famille a en plus
**deux segments de pente successifs** (22,515 % puis 12 %) — verifie a la main que les deux se
rejoignent a moins d'un dollar au point de jonction (58 827 $ : 9 315,12 $ contre 9 315,16 $).

### Exemption personnelle, verbatim (note de bas de page du tableau, meme document)

> « Your exemptions are $700 for yourself, $700 for your spouse if filing a joint return, and
> $700 for each dependent. Add $250 to the total if you are 65 years of age or over and, if
> filing a joint return, add $250 if your spouse is 65 years of age or over. »

Notre calculateur ne demande ni age ni personnes a charge : seule la part de 700 $ par
declarant (et 700 $ de plus pour le conjoint en commun) est modelisee.

---

## 2. La page generale « Tax Rates » — PERIMEE au jour de la lecture

`https://www.revenue.wi.gov/Pages/FAQS/pcs-taxrates.aspx`
82 844 octets, HTTP 200, lu le 11/09/2026.

Verbatim : « Wisconsin individual income tax rates vary from 3.50% to 7.65%, depending upon
marital status and income. For single taxpayers ... with taxable income: over but not over
**2025** tax is ... $0 $14,680 3.50% ... »

⚠️ Cette page **n'a pas ete mise a jour pour 2026** au jour de la lecture : elle n'affiche que
le bareme 2025 (seuil d'entree 14 680 $, pas 15 110 $), sans aucune colonne 2026. Les chiffres
de cette page publiee par le DOR lui-meme different donc de ceux du Form 1-ES 2026 — **ne pas
les confondre**. Le Form 1-ES est retenu comme source pour la page parce qu'il est le seul des
deux documents a porter explicitement le mot « 2026 » sur son bareme et sa deduction.

---

## 3. Le guide de retenue — mecanique seulement, pas les chiffres

**Publication W-166, Withholding Tax Guide**, revision **(1/26)**
`https://www.revenue.wi.gov/DOR%20Publications/pb166.pdf`
`application/pdf`, **2 128 837 octets**, HTTP 200.

En-tete : « Effective for Withholding Periods Beginning on or After January 1, 2022 ». Rubrique
« Important News » : « Current withholding rates continue for 2025. » (non mise a jour pour la
mention 2026). Ce guide sert uniquement a confirmer la mecanique de retenue — formulaire **WT-4**
propre a l'Etat (« Federal Form W-4 cannot be used for Wisconsin withholding tax purposes »),
400 $ par exemption declaree a l'embauche — mais ses propres montants de « methode alternative »
(6 702 $ / 17 780 $ celibataire) ne sont **pas** repris sur la page : ils ne portent pas
explicitement l'annee 2026, contrairement au Form 1-ES. Les chiffres imposables viennent
exclusivement du Form 1-ES 2026.

---

## 4. Assurance chomage — employeur seul

**Wisconsin DWD, UI Employer Handbook**, document **UCB-201-P (R. 03/16/2026)**
`https://dwd.wisconsin.gov/ui201/pdf/ucb201print.pdf`
`application/pdf`, **1 315 282 octets**, HTTP 200.

Verbatim, section « How is the UI Program Financed? » : « The program is financed solely
through employer contributions (taxes). » Rien a soustraire du salaire de l'employe.

---

## 5. Sources INDISPONIBLES — regle des 3 tentatives appliquee

`docs.legis.wisconsin.gov` (le texte code de **Wis. Stat. 71.06** et **71.05(22)**, demande par
la mission) : **ECONNREFUSED sur TROIS methodes distinctes**, le 11/09/2026 —
1. `curl` direct sur `/statutes/statutes/71/06` ;
2. `curl` avec un agent utilisateur different sur la meme URL ;
3. l'outil WebFetch sur la meme URL (`connect ECONNREFUSED 165.189.140.59:443`).

Meme traitement que le Nevada le 10/09/2026 (SANS_LIEN) : le texte de loi brut est inaccessible
depuis cette machine, et le **Form 1-ES 2026** — document officiel du Wisconsin Department of
Revenue qui cite explicitement le chapitre 71 des Wis. Stats. et la date d'enactment qu'il
interprete (16 janvier 2026) — sert de source primaire a sa place. C'est une source d'agence
d'Etat admissible au sens de la regle n°1 du projet, meme sans avoir pu lire le texte code
lui-meme.

---

## 6. Ce que cette page ne dit pas, et pourquoi

- **Rien sur un impot municipal ou de comte.** Aucune des cinq sources lues n'en mentionne, en
  bien ou en mal.
- **Rien sur le statut Married Filing Separately.** Notre calculateur ne le propose pas.
- **Rien sur l'age 65+ ou les personnes a charge.** Le calculateur ne les demande pas ; le
  supplement de 250 $ par personne agee et l'exemption de 700 $ par personne a charge ne sont
  donc pas modelises, et la page le dit.
