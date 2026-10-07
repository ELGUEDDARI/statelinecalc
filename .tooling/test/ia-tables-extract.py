"""Lit les tables de retenue de l'Iowa (Iowa Withholding Tables, effective January 1, 2026,
released November 2025) dans le classeur Excel que le Department of Revenue publie lui-meme
(https://revenue.iowa.gov/media/54/download?inline, « All Tables (Combined) »).

Contrairement a la Louisiane (PDF lu par coordonnees), l'Iowa publie ses tables en .xlsx :
chaque cellule est lue telle quelle, sans reconstruire de colonnes a partir de coordonnees.

18 feuilles : Other / HOH / Married  x  Daily / Weekly / Biweekly / Semimonthly / Monthly / Annually.
Une ligne = [au moins, moins de, 11 colonnes d'allowances] :
  « $0.00-$39.99 », « $40.00-$79.99 », ... « $360.00-$399.99 », « $400.00 or Over ».

Usage : python ia-tables-extract.py classeur.xlsx  ->  JSON sur la sortie standard
        {"exces": [{"feuille": .., "des": 102000, "sur": 101500}],
         "rows": [{"feuille": "OtherStatusAnnually", "statut": "Other", "periode": "Annually",
                   "lo": 13000, "hi": 14000, "cells": [19, 0, ...11 valeurs]}],
         "entetes": {"OtherStatusAnnually": ["$0.00-$39.99", ...]}}
"""
import json
import re
import sys

import openpyxl


def main(chemin):
    wb = openpyxl.load_workbook(chemin, data_only=True, read_only=True)
    rows, entetes, exces = [], {}, []
    for ws in wb:
        m = re.match(r"(Other|HOH|Married)Status(\w+)$", ws.title)
        if not m:
            continue
        statut, periode = m.group(1), m.group(2)
        for r in ws.iter_rows(values_only=True):
            r = list(r)
            for x in r:
                if isinstance(x, str):
                    # « If annual wages are at least $102,000, multiply the excess over $101,500.00 by 3.80% ... »
                    m2 = re.search(r"wages are at least \$([\d,]+)(?:\.\d+)?, multiply the excess over \$([\d,]+)(?:\.\d+)? by 3\.80%", x)
                    if m2:
                        exces.append({"feuille": ws.title, "des": float(m2.group(1).replace(",", "")),
                                      "sur": float(m2.group(2).replace(",", ""))})
            if len(r) < 14:
                continue
            if isinstance(r[1], str) and r[1].strip() == "At Least":
                entetes[ws.title] = [str(x) for x in r[3:14]]
                continue
            if isinstance(r[1], (int, float)) and isinstance(r[2], (int, float)):
                cells = r[3:14]
                if all(isinstance(c, (int, float)) for c in cells):
                    rows.append({"feuille": ws.title, "statut": statut, "periode": periode,
                                 "lo": float(r[1]), "hi": float(r[2]), "cells": [float(c) for c in cells]})
    json.dump({"rows": rows, "entetes": entetes, "exces": exces}, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
