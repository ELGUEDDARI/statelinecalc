"""Lit les tables de tranches de salaire de la retenue de la Louisiane (R-1306 (1/26),
« Louisiana Withholding Tables and Formulas ») par COORDONNEES (PyMuPDF).

Une ligne de table = les mots qui partagent la meme ordonnee : 5 nombres = tranche de salaire
(min, max) puis 3 cellules (deduction standard 0, 1, 2). Les lignes « (Add 3.09% for amounts in
excess of $X) » sont lues a part : elles donnent le seuil de la formule.

Usage : python la-tables-extract.py 1306-1-26.pdf  ->  JSON sur la sortie standard
        {"rows": [{"periode": "Weekly", "page": 8, "lo": .., "hi": .., "cells": [3]}],
         "excess": [{"periode": "Weekly", "seuil": 1950.0}]}
"""
import json
import re
import sys

import pymupdf

NOMBRE = re.compile(r"^\d{1,3}(,\d{3})*(\.\d{1,2})?$")
TITRE = re.compile(r"(?m)^(Daily|Weekly|Biweekly|Semi-Monthly|Monthly|Quarterly|Annual|Annually)\b.*Louisiana Income Tax Withholding Table")
EXCES = re.compile(r"Add 3\.09% for amounts in excess of \$([\d,]+(?:\.\d+)?)")


def num(s):
    return float(s.replace(",", ""))


def main(chemin):
    doc = pymupdf.open(chemin)
    rows, excess = [], []
    for pn, page in enumerate(doc):
        txt = page.get_text()
        m = TITRE.search(txt)
        if not m:
            continue
        periode = m.group(1)
        for e in EXCES.finditer(txt):
            excess.append({"periode": periode, "page": pn + 1, "seuil": num(e.group(1))})
        rangs = {}
        for x0, y0, x1, y1, t, *_ in page.get_text("words"):
            rangs.setdefault(round(y0 / 2), []).append((x0, t))
        for cle in sorted(rangs):
            jetons = [t for _, t in sorted(rangs[cle])]
            if len(jetons) != 5 or not all(NOMBRE.match(t) for t in jetons):
                continue
            n = [num(t) for t in jetons]
            rows.append({"periode": periode, "page": pn + 1, "lo": n[0], "hi": n[1], "cells": n[2:]})
    json.dump({"rows": rows, "excess": excess}, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
