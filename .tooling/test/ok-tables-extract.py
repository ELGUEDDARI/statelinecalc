"""Lit les tables de tranches de salaire de la retenue de l'Oklahoma (Packet OW-2,
« 2026 Oklahoma Income Tax Withholding Tables ») par COORDONNEES (PyMuPDF), pas par
l'ordre du texte (pdftotext -layout rate les lignes a milliers « 1,002 »).

Une ligne de table = les mots qui partagent la meme ordonnee : 13 nombres = tranche de
salaire (plus que, pas plus que) puis 11 cellules (0 a 9 et « 10 plus » allowances).
Une ligne finale « X and over » renvoie a la formule : ignoree.

Usage : python ok-tables-extract.py WHTables-2026.pdf  ->  JSON sur la sortie standard
        [{"periode": "Weekly", "statut": "Single", "page": 10, "lo": .., "hi": .., "cells": [11]}]
"""
import json
import re
import sys

import pymupdf

NOMBRE = re.compile(r"^\d{1,3}(,\d{3})*$")
TITRE = re.compile(r"(?m)^(Weekly|Bi-Weekly|Semi-Monthly|Monthly|Daily or Miscellaneous) Payroll Period: (Single|Married) Persons")


def num(s):
    return int(s.replace(",", ""))


def main(chemin):
    doc = pymupdf.open(chemin)
    sortie = []
    for pn, page in enumerate(doc):
        m = TITRE.search(page.get_text())
        if not m:
            continue
        rangs = {}
        for x0, y0, x1, y1, t, *_ in page.get_text("words"):
            rangs.setdefault(round(y0 / 2), []).append((x0, t))
        for cle in sorted(rangs):
            jetons = [t for _, t in sorted(rangs[cle])]
            if len(jetons) != 13 or not all(NOMBRE.match(t) for t in jetons):
                continue
            n = [num(t) for t in jetons]
            sortie.append({"periode": m.group(1), "statut": m.group(2), "page": pn + 1,
                           "lo": n[0], "hi": n[1], "cells": n[2:]})
    json.dump(sortie, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
