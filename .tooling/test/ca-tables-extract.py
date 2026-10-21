"""Lit les tables de retenue PAR TRANCHES DE SALAIRE (Methode A) du California Employment Development Department,
DE 44 « California Employer's Guide » 2026 (DE 44 Rev. 52 (4-26)), pages « Method A - Table 3 » a « Table 17 ».

Source : https://edd.ca.gov/siteassets/files/pdf_pub_ctr/de44.pdf (HTTP 200 avec un User-Agent de navigateur), lu le 2026-10-21.
Chaque table (celibataire / marie / chef de famille x hebdomadaire, bimensuelle, semi-mensuelle, mensuelle, journaliere) imprime des
lignes « Wages At least / But less than » puis 11 colonnes : 0 a 9 allocations, « 10 or More ». Une cellule VIDE vaut 0,00 d'impot
retenu (la grille n'imprime pas les zeros). Les tables s'etendent sur une ou deux pages ; l'entete des allocations est repete.

On lit les MOTS avec leurs positions (PyMuPDF) : la colonne d'un montant se decide par la distance de son CENTRE aux centres des
entetes 0..9 de la page (la colonne « 10 or More » est a un pas de plus). Les lignes se regroupent par y.

Usage : python -I ca-tables-extract.py de44.pdf  ->  JSON sur la sortie standard
"""
import json
import re
import sys

import pymupdf

TITRE = re.compile(r"Method A - Table (\d+):")
ENTIER = re.compile(r"\$?\d[\d,]*")
MONTANT = re.compile(r"\d[\d,]*\.\d\d")

doc = pymupdf.open(sys.argv[1])
tables = {}
courante = None
for no in range(29, 52):
    page = doc[no]
    lignes = {}
    for x0, y0, x1, y1, mot, *_ in page.get_text("words"):
        lignes.setdefault(round(y0 / 2), []).append((x0, x1, mot))
    centres = None
    lignes_donnees = []
    for k in sorted(lignes):
        ligne = sorted(lignes[k])
        txt = " ".join(m for _, _, m in ligne)
        t = TITRE.search(txt)
        if t:
            courante = int(t.group(1))
            centres = None
            continue
        if re.search(r"\bDE\b|Rev\.|Page|Taxpayer|Assistance", txt):
            continue
        digits = [(a, b, m) for a, b, m in ligne if a >= 140 and re.fullmatch(r"[0-9]", m)]
        if [m for _, _, m in digits] == [str(i) for i in range(10)]:
            centres = [(a + b) / 2 for a, b, _ in digits]
            continue
        if courante is not None and centres is not None:
            lignes_donnees.append((k, ligne))
    if centres is None:
        continue
    pas = (centres[-1] - centres[0]) / 9
    cc = list(centres) + [centres[-1] + pas]
    for k, ligne in lignes_donnees:
        bornes = [m for a, b, m in ligne if ENTIER.fullmatch(m)]
        if len(bornes) != 2:
            continue
        lo, hi = (int(m.replace("$", "").replace(",", "")) for m in bornes)
        cells = {}
        for a, b, m in ligne:
            if MONTANT.fullmatch(m):
                c = (a + b) / 2
                cells[min(range(11), key=lambda i: abs(cc[i] - c))] = float(m.replace(",", ""))
        tables.setdefault(courante, []).append([lo, hi, [cells.get(c, 0.0) for c in range(11)]])
print(json.dumps(tables, separators=(",", ":")))
