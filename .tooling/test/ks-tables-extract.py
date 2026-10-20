"""Lit les tables de retenue PAR TRANCHES DE SALAIRE du Kansas Withholding Tax Guide, KW-100 (Rev. 10-24).

Source : https://www.ksrevenue.gov/pdf/kw100.pdf, lu dans la copie Wayback du 2026-10-09
(https://web.archive.org/web/20261009005330/https://ksrevenue.gov/pdf/kw100.pdf ; ksrevenue.gov ne repond pas depuis
cette machine). Les pages 21 a 40 impriment, pour chaque periode de paie et chaque situation (SINGLE / MARRIED), une grille :
colonnes « At least », « But less than », puis 11 montants pour 0 a 10 allocations.

On lit les MOTS avec leurs positions (PyMuPDF), pas le texte mis en page : `pdftotext -layout` entrelace les colonnes de ces
tables (verifie le 2026-10-20), `pdftotext -raw` melange l'ordre des pages. Une ligne de grille = exactement 13 nombres sur la
meme ligne verticale.

Usage : python -I ks-tables-extract.py kw100.pdf  ->  JSON sur la sortie standard
"""
import json
import re
import sys

import pymupdf

ENTETE = re.compile(r"(SINGLE|MARRIED)\s+Persons\s*\S*\s*(WEEKLY|BI-WEEKLY|SEMI-MONTHLY|MONTHLY|DAILY or MISC\.)\s+Payroll Period")
NOMBRE = re.compile(r"[\d,]+")

doc = pymupdf.open(sys.argv[1])
sortie = {}
for numero in range(20, len(doc)):          # pages 21 a 40 (la page 6 imprime un extrait d'exemple : ignore)
    page = doc[numero]
    m = ENTETE.search(page.get_text().replace("\n", " "))
    if not m:
        continue
    cle = m.group(1) + "|" + m.group(2)
    lignes = {}
    for x0, y0, x1, y1, mot, *_ in page.get_text("words"):
        lignes.setdefault(round(y0 / 2), []).append((x0, mot))
    for _, mots in sorted(lignes.items()):
        mots.sort()
        jetons = [w for _, w in mots]
        if len(jetons) == 13 and all(NOMBRE.fullmatch(j) for j in jetons):
            n = [int(j.replace(",", "")) for j in jetons]
            sortie.setdefault(cle, []).append([n[0], n[1]] + n[2:])
for cle in sortie:
    sortie[cle].sort()
print(json.dumps(sortie, separators=(",", ":")))
