"""Lit les tables de retenue de l'Alabama dans le PDF du Department of Revenue et les
rend en JSON, a partir des COORDONNEES des mots (PyMuPDF), pas de l'ordre du texte.

Pourquoi : pdftotext -layout melange les lignes des tables (cellules interleavees,
colonnes collees : « 0000 »). Les coordonnees, elles, sont propres : une ligne de table
= les mots qui partagent la meme ordonnee ; deux premiers nombres = la tranche de
salaire (de, a moins de), puis 32 cellules : 4 colonnes sans personne a charge
(0, S, MS, M) puis, pour 1 a 7 personnes a charge, 4 colonnes (S, H, MS, M).

Rend aussi le « Schedule of Standard Deduction Amounts » (p. 8 du livret) : quatre tableaux
(Married Filing Joint, Married Filing Separate, Head of Family, Single), lus par coordonnees.

Usage : python al-tables-extract.py whbooklet_0126.pdf   ->  JSON sur la sortie standard
        {"rows": [...], "schedule": {"M": [[de, a, montant], ...], "MS": ..., "H": ..., "S": ...}}
"""
import json
import re
import sys

import pymupdf

PERIODES = ["WEEKLY", "BI-WEEKLY", "SEMI-MONTHLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]
NOMBRE = re.compile(r"^\d{1,3}(,\d{3})*$")


def num(s):
    return int(s.replace(",", ""))


def bareme(doc):
    """Les quatre tableaux de la deduction standard. Gauche (x < 300) puis droite ; moitie
    haute (y < 375) = Married Filing Joint / Married Filing Separate, moitie basse =
    Head of Family / Single. Chaque ligne : de, a (ou « and above » -> None), montant."""
    for page in doc:
        if "Alabama Adjusted" in page.get_text() and "Head of Family" in page.get_text():
            break
    else:
        raise SystemExit("bareme de la deduction standard introuvable")
    rangs = {}
    for x0, y0, x1, y1, t, *_ in page.get_text("words"):
        rangs.setdefault(round(y0 / 3), []).append((x0, y0, t))
    sortie = {"M": [], "MS": [], "H": [], "S": []}
    for cle in sorted(rangs):
        mots = sorted(rangs[cle])
        y = mots[0][1]
        for cote, nom_haut, nom_bas in (("g", "M", "H"), ("d", "MS", "S")):
            jetons = [t for x, _, t in mots if (x < 300) == (cote == "g")]
            nombres = [t for t in jetons if NOMBRE.match(t)]
            if len(nombres) == 3:
                de, a, montant = num(nombres[0]), num(nombres[1]), num(nombres[2])
            elif len(nombres) == 2 and "above" in jetons:
                de, a, montant = num(nombres[0]), None, num(nombres[1])
            else:
                continue
            sortie[nom_haut if y < 375 else nom_bas].append([de, a, montant])
    return sortie


def main(chemin):
    doc = pymupdf.open(chemin)
    lignes = []
    for pn in range(len(doc)):
        page = doc[pn]
        texte = page.get_text()
        m = re.search(r"payroll period with respect to employee is\s+(\S+)", texte)
        if not m or m.group(1) not in PERIODES:
            continue
        periode = m.group(1)
        mots = page.get_text("words")
        # regrouper par ordonnee (tolerance 2 pt)
        rangs = {}
        for x0, y0, x1, y1, t, *_ in mots:
            cle = round(y0 / 2)
            rangs.setdefault(cle, []).append((x0, t))
        for cle in sorted(rangs):
            rang = sorted(rangs[cle])
            tokens = [t for _, t in rang]
            if len(tokens) != 34 or not all(NOMBRE.match(t) for t in tokens):
                continue
            lo, hi = num(tokens[0]), num(tokens[1])
            lignes.append({"periode": periode, "page": pn + 1, "lo": lo, "hi": hi,
                           "vals": [num(t) for t in tokens[2:]]})
    json.dump({"rows": lignes, "schedule": bareme(doc)}, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
