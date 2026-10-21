"""Lit les grilles de retenue PAR TRANCHES DE SALAIRE (Method I) du New York State Department of Taxation and Finance :
  - NYS-50-T-NYS « New York State Withholding Tax Tables and Methods » (1/26, effective January 1 - December 31, 2026), pages 4 a 13 ;
  - NYS-50-T-NYC « New York City Withholding Tax Tables and Methods » (1/26), pages 4 a 23.
Sources : https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nys.pdf (HTTP 200, Last-Modified 2025-11-03) et .../nys50_t_nyc.pdf
(HTTP 200, Last-Modified 2025-11-03), lues le 2026-10-21.

Cinq periodes (hebdomadaire, toutes les deux semaines, deux fois par mois, mensuelle, quotidienne) x celibataire / marie ; chaque page imprime
« At least », « But less than », puis 11 montants (0 a 9 allocations, puis « 10 or more »). Une table NYC tient sur DEUX pages. La derniere ligne
imprime « $N & over : use Method II ». On lit les MOTS avec leurs positions (PyMuPDF) : l'etiquette de tranche et ses montants ne partagent pas
exactement la meme ordonnee, et un montant nul n'est imprime que dans la premiere colonne : les colonnes vides valent 0,00.

Usage : python -I ny-tables-extract.py nys|nyc NOM.pdf  ->  JSON sur la sortie standard
"""
import json, re, sys
import pymupdf

NOMBRE = re.compile(r"^\$?\d[\d,]*(\.\d+)?$")
PERIODES = ["Weekly", "Biweekly", "Semimonthly", "Monthly", "Daily"]
mode, chemin = sys.argv[1], sys.argv[2]
if mode == "nys":      # une page par table
    PLAN = [(p, s, [4 + 2 * i + j]) for i, p in enumerate(PERIODES) for j, s in enumerate(["single", "married"])]
else:                  # NYC : deux pages par table
    PLAN = [(p, s, [4 + 4 * i + 2 * j, 5 + 4 * i + 2 * j]) for i, p in enumerate(PERIODES) for j, s in enumerate(["single", "married"])]
doc = pymupdf.open(chemin)
sortie = {}
for periode, statut, pages in PLAN:
    lignes = []
    au_dela = None
    for pg in pages:
        p = doc[pg - 1]
        mots = p.get_text("words")
        h0 = [m for m in mots if m[4] == "0" and 50 < m[1] < 56][0]
        h9 = [m for m in mots if m[4] == "9" and 50 < m[1] < 56][0]
        pas = (h9[2] - h0[2]) / 9.0
        par_y = {}
        for x0, y0, x1, y1, w, *_ in mots:
            if y0 < 74 or not NOMBRE.match(w): continue
            cle = None
            for k in par_y:
                if abs(k - y0) < 3: cle = k; break      # une ligne de table = tolerance de 3 points (pas de ligne : 10 points)
            if cle is None: cle = y0
            par_y.setdefault(cle, []).append((x0, x1, w))
        for k in sorted(par_y):
            g = sorted(par_y[k])
            etiq = [w for x0, x1, w in g if x1 < h0[2] - 8 and x0 > h0[2] - 110]
            cols = {}
            for x0, x1, w in g:
                if x1 >= h0[2] - 8: cols[int(round((x1 - h0[2]) / pas))] = w
            if len(etiq) == 2:
                lignes.append(etiq + [cols.get(c, "0.00") for c in range(11)])
        t = " ".join(m[4] for m in mots)
        m_fin = re.search(r"\$([\d,]+)\s+&\s+over", t)
        if m_fin: au_dela = m_fin.group(1)
    sortie[periode + "|" + statut] = {"pages": pages, "nb_lignes": len(lignes), "au_dela": au_dela, "lignes": lignes}
json.dump(sortie, sys.stdout, indent=1)
