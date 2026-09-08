# Caroline du Nord — dossier de sources

*Constitué le 09/09/2026 pour la page `/paycheck-calculator/north-carolina/`.
Tout ce qui est affirmé sur cette page vient d'ici. Une ligne sans source ne part pas.*

---

## Les hôtes qui répondent, et ceux qui ne répondent pas

| Hôte | État au 09/09/2026 | Comment |
|---|---|---|
| `www.ncdor.gov` | **200** | `curl -A "Mozilla/5.0 … Chrome/131"`. Pages et PDF. |
| `www.des.nc.gov` | **200** | idem. ⚠️ Les URL sans `www.` redirigent ; deux chemins devinés ont renvoyé 404, la bonne URL se lit dans les liens de `/employers`. |
| `www.ncleg.gov` | **403 Cloudflare** | « Sorry, you have been blocked ». Ce n'est PAS un filtrage d'user-agent contournable comme Hawaii : c'est un challenge Cloudflare. **Ne pas insister** — le texte de loi n'a pas été nécessaire, les formulaires officiels 2026 portent les mêmes chiffres. |

⛔ Les PDF NCDOR ne sont pas liés en `.pdf`. Le lien de téléchargement est de la forme
`/<slug>/open` et se trouve dans le bloc `field--name-field-file` de la page du formulaire.

---

## 1. Le taux 2026 — 3,99 %

**Source A.** NCDOR, « Tax Rate Schedules »,
`https://www.ncdor.gov/taxes-forms/individual-income-tax/tax-rate-schedules`, HTTP 200, lue le
09/09/2026. Verbatim :

> « For Taxable Years beginning in 2025, the North Carolina individual income tax rate is 4.25%
> (0.0425). »
> « For Taxable Years after 2025, the North Carolina individual income tax rate is 3.99%
> (0.0399). »
> « Additional rate changes may apply to tax years beginning with 2027 based on certain rate
> reduction triggers. For more information, see Session Law 2023-134. »

**Source B.** Formulaire **NC-30**, « 2026 Income Tax Withholding Tables and Instructions for
Employers », révision **Web 11-25**, téléchargé le 09/09/2026 depuis
`https://www.ncdor.gov/income-tax-withholding-tables-and-instructions-employers/open`
(`application/pdf`, 570 759 octets). Encadré « New for 2026 », verbatim :

> « As a result of Session Law 2023-134, the individual income tax rate for tax year 2026 will be
> 3.99%. This change is reflected in the tables and computations included in this publication. »

**⛔ 2027 : rien n'est acquis.** « May apply », « based on certain rate reduction triggers ». La
page ne cite aucun taux 2027.

---

## 2. La déduction standard 2026

**Source A.** Formulaire **NC-4**, « Employee's Withholding Allowance Certificate », révision
**Web 10-25** — donc la version en vigueur pour les paies 2026 — Part II, ligne 2, verbatim :

> « Enter the applicable N.C. standard deduction based on your filing status.
> $12,750 if Single / $25,500 if Married Filing Jointly or Surviving Spouse /
> $12,750 if Married Filing Separately / $19,125 if Head of Household »

**Source B, recoupement.** NC-30 2026, feuilles « Annualized Method », ligne 4 :
12 750,00 $ pour « Single Person, Married Person, or Surviving Spouse » et 19 125,00 $ pour
« Head of Household ». Le NC-30 raisonne par salarié, d'où 12 750 $ pour un marié ; le montant
du **foyer** marié (25 500 $) est celui du NC-4 et du D-400.

**⛔ Ce qui NE fait PAS source pour 2026.** La page NCDOR « North Carolina Standard Deduction or
North Carolina Itemized Deductions » donne les mêmes montants, mais s'ouvre sur : « Unless
otherwise noted, the following information applies to individuals for **tax year 2025** ». Elle
ne peut servir que de confirmation, jamais de source datée.

Deux points lus sur cette même page NCDOR et repris sur la page du site :

> « there is no additional NC standard deduction amount for taxpayers who are age 65 or older or
> blind »
> « If you are not eligible for the federal standard deduction, your NC standard deduction is
> ZERO. »

Allowances : NC-30 2026, feuilles annualisées, ligne 5 — « Multiply the number of allowances by
$2,500.00 ».

---

## 3. Le piège propre à cet État : 4,09 % retenus pour 3,99 % dus

NC-30 2026, sous **chacune** des feuilles de calcul (méthode par pourcentage et méthode
annualisée), verbatim :

> « The withholding calculations are based on the individual income tax rate of 3.99% plus 0.1%.
> This results in a withholding tax rate of 4.09%. Round off the final amount to the nearest
> whole dollar. »

Le même 4,09 % réapparaît ailleurs dans le document (retenue à taux fixe des non-résidents,
plafond de retenue additionnelle du NC-4 NRA), ce qui confirme que ce n'est pas une coquille.

**Conséquence retenue pour le moteur :** le site calcule l'**impôt** (3,99 %), pas la retenue.
Le net affiché est donc légèrement supérieur à celui d'une fiche de paie de Caroline du Nord.
L'écart vaut 0,1 % du revenu imposable d'État et il est **expliqué sur la page** plutôt que
modélisé — modéliser la retenue donnerait un revenu annuel faux.

---

## 4. Le piège Washington — vérifié et écarté

N.C. Division of Employment Security, « Am I Required to Pay Taxes? »,
`https://www.des.nc.gov/employers/am-i-required-pay-taxes`, HTTP 200, lue le 09/09/2026,
verbatim :

> « Employers pay unemployment insurance taxes based on employer payrolls. **Unemployment taxes
> are not deducted from employees' wages.** The N.C. Division of Employment Security (DES)
> collects these taxes from employers. »

Aucun régime de congé payé familial ni d'assurance dépendance à prélèvement salarial n'a été
trouvé en Caroline du Nord au 09/09/2026. **Une absence de page n'est pas une preuve** : la page
du site affirme que l'impôt sur le revenu est la seule ligne d'État, en s'appuyant sur la
citation DES ci-dessus, et ne prétend pas dresser la liste de ce qui n'existe pas.

---

## 5. Le point de départ du calcul : l'AGI fédéral

NCDOR, « Important Notice: Impact of Recently Enacted Laws on North Carolina Individual and
Corporate Income Tax Returns », publiée le 23/07/2026, mise à jour le 29/07/2026, lue le
09/09/2026. Verbatim :

> « For individuals, North Carolina taxable income starts with federal adjusted gross income
> (“AGI”). »
> « As part of Session Law 2026-31 the State's reference to the IRC was updated to July 5, 2025
> (formerly January 1, 2023). »

C'est ce qui fonde l'affirmation « une cotisation 401(k) réduit aussi l'impôt de Caroline du
Nord » : la cotisation est déjà hors de l'AGI fédéral.

La même notice donne les deux nouveautés 2026 (Session Laws 2026-31 et 2026-41) : déduction pour
pertes de bois sur pied, et **nouvelle déduction itemisée pour pertes de jeu**, N.C. Gen. Stat.
105-153.5(a)(2). Ni l'une ni l'autre ne touche une fiche de paie ; seule la seconde est
mentionnée, en passant, dans le commentaire de `data/rates-2026.js`.

---

## 6. Ce qui n'a PAS été vérifié — donc ce que la page ne dit pas

- **Impôt municipal ou de comté en Caroline du Nord** : aucune source lue dans un sens ni dans
  l'autre. La page ne dit ni qu'il en existe, ni qu'il n'en existe pas.
- **Montant exact de la « child deduction »** par enfant et par tranche de revenu : la page dit
  qu'elle existe, qu'elle dépend du foyer et qu'elle n'est pas modélisée. Elle n'en cite aucun
  chiffre.
- **Taux 2027 et suivants** : conditionnels, cf. § 1.
