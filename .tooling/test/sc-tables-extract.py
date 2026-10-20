"""Lit les tables de retenue PAR TRANCHES DE SALAIRE du South Carolina Department of Revenue, WH-1603 « Withholding Tax Tables » (Rev. 10/30/25).

Source : https://dor.sc.gov/sites/dor/files/forms/WH1603_2026.pdf (HTTP 200, Last-Modified 2025-11-05), lu le 2026-10-20.
Cinq tables (DAILY, WEEKLY, BI-WEEKLY, SEMI-MONTHLY, MONTHLY) ; chaque page imprime deux blocs cote a cote (moitie gauche, moitie droite) :
colonnes « At least », « But less than », puis 11 montants pour 0 a 10 allocations. La derniere ligne imprime « N over - Amount shown
on line above plus 6.0% of excess over $N » : elle est lue a part.

On lit les MOTS avec leurs positions (PyMuPDF). Une ligne de grille = 13 nombres (un bloc) ou 26 nombres (deux blocs) sur la meme ligne.

Usage : python -I sc-tables-extract.py WH1603_2026.pdf  ->  JSON sur la sortie standard
"""
import json
import re
import sys

import pymupdf

ENTETE = re.compile(r"2026\s+(DAILY|WEEKLY|BI-WEEKLY|SEMI-MONTHLY|MONTHLY)\s+TABLE")
NOMBRE = re.compile(r"\d[\d,]*")

doc = pymupdf.open(sys.argv[1])
sortie = {}
au_dela = {}
courante = None
for page in doc:
    texte = page.get_text().replace("\n", " ")
    m = ENTETE.search(texte)
    if m:
        courante = m.group(1)
    if courante is None:
        continue
    # Pages imprimees en paysage, pivotees de 90 degres : une LIGNE de la grille = un meme x0 ; les colonnes vont par y0 decroissant.
    lignes = {}
    for x0, y0, x1, y1, mot, *_ in page.get_text("words"):
        if x0 > 100:
            lignes.setdefault(round(x0 / 5), []).append((-y0, mot))
    for _, mots in sorted(lignes.items()):
        mots.sort()
        jetons = [w for _, w in mots]
        if len(jetons) in (13, 26) and all(NOMBRE.fullmatch(j) for j in jetons):
            n = [int(j.replace(",", "")) for j in jetons]
            for k in range(0, len(n), 13):
                sortie.setdefault(courante, []).append(n[k:k + 13])
        elif "over" in jetons and "excess" in jetons:
            i = jetons.index("over")
            au_dela[courante] = int(jetons[i - 1].replace(",", ""))
            # la derniere ligne du bloc de gauche partage sa ligne avec la mention « N over » du bloc de droite
            if all(NOMBRE.fullmatch(j) for j in jetons[:13]):
                sortie.setdefault(courante, []).append([int(j.replace(",", "")) for j in jetons[:13]])
for cle in sortie:
    sortie[cle].sort()
print(json.dumps({"lignes": sortie, "audela": au_dela}, separators=(",", ":")))
