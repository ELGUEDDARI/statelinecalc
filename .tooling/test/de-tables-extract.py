"""Lit les tables de retenue du Delaware (Division of Revenue, Employer's Guide, Section 24) avec pypdf.

Cinq PDF, un par periode de paie, « Effective January 1, 2025 (No changes from January 1, 2014) » :
  https://revenuefiles.delaware.gov/docs/{daily16,weekly16,bi-wk16,semi-mth16,month16}.pdf
Chaque ligne : « bas haut c0 c1 c2 c3 c4 c5 c6 c7 c8 » = salaire d'au moins `bas`, moins de `haut`,
puis la retenue pour 0 a 8 « withholding credits ». La premiere ligne commence par « $0 ».

Usage : python -I de-tables-extract.py dossier   ->  JSON sur la sortie standard
Le dossier doit contenir les cinq PDF. Sortie : {periode: {"lignes": [[bas, haut, [c0..c8]], ...]}}.
"""
import json
import re
import sys

import pypdf

FICHIERS = {"daily": "daily16", "weekly": "weekly16", "biweekly": "bi-wk16",
            "semimonthly": "semi-mth16", "monthly": "month16"}
NUM = r"\$?([\d,]+(?:\.\d+)?)"
LIGNE = re.compile(r"^" + NUM + r"\s+" + NUM + r"((?:\s+[\d,]+\.\d\d){9})\s*$")


def f(s):
    return float(s.replace(",", ""))


def main(dossier):
    sortie = {}
    for periode, nom in FICHIERS.items():
        lecteur = pypdf.PdfReader(dossier + "/" + nom + ".pdf")
        lignes = []
        for page in lecteur.pages:
            for brut in page.extract_text().split("\n"):
                m = LIGNE.match(brut.strip())
                if m:
                    cellules = [f(x) for x in m.group(3).split()]
                    lignes.append([f(m.group(1)), f(m.group(2)), cellules])
        sortie[periode] = {"lignes": lignes}
    json.dump(sortie, sys.stdout)


if __name__ == "__main__":
    main(sys.argv[1])
