# Tennessee — dossier de sources

*Constitué le 05/09/2026. La page n'est PAS construite : ce fichier contient tout ce
qu'il faut pour la construire sans refaire la recherche.*

---

## Pourquoi ce fichier existe

Le Tennessee a été abandonné une première fois le 01/09/2026 après trois échecs
d'accès à `tn.gov`. Le 05/09 il a été repris en supposant le même blocage que
`tax.hawaii.gov` — un 403 d'agent, contournable avec un user-agent de navigateur.
**C'était un diagnostic faux.** Ce sont deux problèmes différents.

---

## ⛔ `tn.gov` est injoignable depuis cette machine — 4 méthodes, 4 échecs

| Méthode | Résultat |
|---|---|
| `curl -A "Mozilla/5.0 … Chrome/131"` | HTTP 000, exit 35 — `schannel: failed to receive handshake, SSL/TLS connection failed` |
| `curl --tlsv1.2 / --ciphers / --http1.1` | HTTP 000 dans les trois cas |
| Node.js (OpenSSL) | `www.tn.gov` → `ECONNRESET` ; `tn.gov` → 403, 520 octets |
| **Playwright / Chromium réel** | `net::ERR_CONNECTION_RESET` |

Un vrai navigateur échoue aussi : ce n'est **pas** un filtrage sur le user-agent,
c'est une coupure au niveau réseau. `wapp.capitol.tn.gov` (l'Assemblée générale)
est bloqué pareil : HTTP 000.

👉 **Ne pas relancer une 5ᵉ variante de la même approche.** Passer directement aux
deux hôtes ci-dessous, qui répondent.

## ✅ Deux hôtes officiels qui, eux, répondent

1. **`publications.tnsosfiles.com`** — le serveur de publication du Secrétaire d'État
   du Tennessee, où sont publiés les *Public Chapters* (le texte de loi voté).
   Répond **HTTP 200** à curl avec user-agent Chrome. C'est la meilleure source
   possible : la loi elle-même, pas un résumé.
   Forme de l'URL : `https://publications.tnsosfiles.com/acts/<n° AG>/pub/pc<NNNN>.pdf`
   (109ᵉ AG = 2015-2016, 110ᵉ = 2017-2018, 113ᵉ = 2023-2024).
2. **`web.archive.org`** — pour les pages `tn.gov` elles-mêmes.

⚠️ **Ne pas deviner un numéro de Public Chapter.** Le 05/09, `pc1086.pdf` de la
109ᵉ AG a été téléchargé en croyant que c'était la loi fiscale : c'est une loi
pénale sur le viol sur mineur par personne ayant autorité. `pc0640.pdf` de la
113ᵉ AG, deuxième tentative, ne parlait pas non plus de congé familial.
**On lit le PDF avant de le citer.** Toujours.

---

## ✅ MESURÉ — le Tennessee ne prélève aucun impôt sur le revenu des salaires

### Source 1 — le texte de loi (la meilleure)

**Public Chapter 181, Actes de 2017** (HB 534 / Senate Bill, IMPROVE Act),
téléchargé depuis `https://publications.tnsosfiles.com/acts/110/pub/pc0181.pdf`
le 05/09/2026, HTTP 200, 3 724 474 octets. Extrait avec `pdftotext -layout`.

**Section 13**, modifiant *Tennessee Code Annotated* § 67-2-102, verbatim :

> The rate of the tax imposed by this chapter shall be
> (1) For any tax year that begins on or after January 1, 2017, and prior to January 1, 2018, four percent (4%);
> (2) For any tax year that begins on or after January 1, 2018, and prior to January 1, 2019, three percent (3%);
> (3) For any tax year that begins on or after January 1, 2019, and prior to January 1, 2020, two percent (2%);
> (4) For any tax year that begins on or after January 1, 2020, and prior to January 1, 2021, one percent (1%); and
> **(5) For any tax year that begins on or after January 1, 2021, and for subsequent tax years, zero percent (0%).**

**Section 15**, même acte : § 67-2-124(c) est modifié en remplaçant « January 1, 2022 »
par « January 1, 2021 » partout — c'est l'accélération de l'abrogation d'un an.

👉 Le taux est **0 % depuis les exercices ouverts au 1er janvier 2021**, donc 0 % en 2026.

### Source 2 — la liste officielle des taxes de l'État

Page `tn.gov/revenue/taxes.html`, instantané Wayback du **28/07/2026**
(`http://web.archive.org/web/20260728233349/https://www.tn.gov/revenue/taxes.html`),
HTTP 200, 49 701 octets. Liste complète, verbatim :

> **Most Common Taxes:** Business Tax · Franchise & Excise Tax · Sales and Use Tax
> **Alcohol, Beer, and Tobacco Taxes:** Brand Registration · Alcoholic Beverage Taxes · Beer Taxes · Liquor-by-the-Drink Tax · Tobacco Taxes
> **Locally Administered Taxes:** Litigation Fines & Fees · Litigation Tax · Marriage License Tax · Property Tax
> **Other Taxes:** Automobile Rental Surcharge Tax · Bail Bond Tax · Coin-Operated Amusement Tax · Fantasy Sports Tax · Gross Receipts Taxes · Hemp-Derived Cannabinoid Products Tax · Local Occupancy Tax · Motor Fuel Taxes · Oil & Tire Fees · **Professional Privilege Tax** · Recordation Tax · Severance Taxes · Unauthorized Substances Tax
> **Archived Taxes:** Gift Tax · **Hall Income Tax** · Inheritance Tax

👉 Aucun impôt sur le revenu des personnes parmi les taxes actives, et le Hall
Income Tax — le seul qu'ait eu l'État — est rangé dans les taxes **archivées**.

Les deux sources concordent et sont indépendantes l'une de l'autre.

---

## 🔎 NON ENCORE VÉRIFIÉ — à faire avant de construire la page

### 1. Le prélèvement salarial obligatoire — LE PIÈGE WASHINGTON

Washington n'a pas d'impôt sur le revenu **et pourtant** 0,807159 % (PFML) + 0,58 %
(WA Cares) sortent de chaque paie. Écrire « rien ne sort au niveau de l'État » sans
avoir vérifié ce point donnerait un net faux.

Une recherche web du 05/09/2026 indique que le Tennessee n'a **pas** de programme
obligatoire, et que la loi de 2023 sur le congé familial autorise seulement des
polices d'assurance **volontaires**. ⚠️ **Une recherche web n'est pas une preuve.**
À confirmer sur `publications.tnsosfiles.com` (trouver le bon Public Chapter en
lisant les PDF, pas en devinant le numéro) ou sur une archive Wayback du
Department of Labor & Workforce Development.

Point de repère utile : seuls l'Alaska, le New Jersey et la Pennsylvanie prélèvent
l'assurance chômage sur le salarié — partout ailleurs elle est à la charge de
l'employeur. À sourcer aussi si la page l'affirme.

### 2. Le Hall Income Tax portait sur quoi, exactement

Il taxait les **intérêts et dividendes**, jamais les salaires — ce qui veut dire que
le Tennessee n'a en réalité **jamais** taxé le salaire. C'est l'angle éditorial de la
page, et il vaut mieux que « encore un État sans impôt ». Mais le texte de
§ 67-2-102 dans sa rédaction d'origine n'a pas encore été lu : PC 181 ne fait que
l'amender et n'en cite pas la phrase d'assiette. **À lire avant de l'écrire.**

### 3. La Professional Privilege Tax

Elle figure dans les taxes actives ci-dessus. Elle frappe certaines professions
réglementées, forfaitairement et annuellement — ce n'est pas une retenue sur salaire,
mais c'est exactement le genre de détail vrai et vérifiable qui distingue la page de
celles des concurrents. Montant et professions concernées à sourcer avant d'écrire.

---

## L'angle de la page, quand elle se fera

Le Tennessee serait le 12ᵉ État et le 4ᵉ sans impôt sur le revenu, après le Texas,
la Floride et le Nevada. Le risque est de produire une 4ᵉ page interchangeable —
c'est précisément le défaut de contenu à l'échelle relevé le 05/09 sur les pages par
taux. Ce que le Tennessee a de propre, et qu'aucun des trois autres n'a :

- Il **a eu** un impôt sur le revenu et l'a supprimé, par étapes datées et votées
  (6 % → 5 % → 4 % → 3 % → 2 % → 1 % → 0 %). C'est une histoire, pas un état de fait.
- Cet impôt ne touchait **que** les intérêts et dividendes : un salarié du Tennessee
  n'a jamais payé d'impôt d'État sur son salaire, même avant 2021.
- La Professional Privilege Tax, qui frappe des professions au forfait.

⚠️ Rappel : la page devra passer par l'agent `controle-statelinecalc` AVANT d'être
poussée. Construire, faire vérifier, puis publier — jamais l'inverse.
