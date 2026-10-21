"""Lit les TABLES DE LA METHODE II (« Exact Calculation Method », tables II-A a II-E + « Annual Tax Rate Schedule ») imprimees par le
New York State Department of Taxation and Finance : NYS-50-T-NYS (pages 17 et 19, celibataire et marie) et NYS-50-T-NYC (pages 25 et 26,
New York City), 1/26, lues le 2026-10-21 sur www.tax.ny.gov.

Chaque table imprime des lignes numerotees : colonne 1 (au moins), colonne 2 (moins de), colonne 3 (a soustraire du salaire net), colonne 4
(taux), colonne 5 (a ajouter) ; la derniere ligne renvoie a la Methode III (« & over »). Six tables par page : trois a gauche
(hebdomadaire, toutes les deux semaines, deux fois par mois), trois a droite (mensuelle, quotidienne, bareme annuel).

Usage : python -I ny-formula-extract.py NOM.pdf PAGE [PAGE...]  ->  JSON sur la sortie standard (cle « page/table »)
"""
import json, re, sys
import pymupdf

NOMBRE = re.compile(r"^\$?\d[\d,]*(\.\d+)?$")
noms = ["weekly", "biweekly", "semimonthly", "monthly", "daily", "annual"]
doc = pymupdf.open(sys.argv[1])
sortie = {}
for pg in sys.argv[2:]:
    p = doc[int(pg) - 1]
    mots = p.get_text("words")
    # entetes de table : « Table » et « Annual » (y) pour decouper en trois bandes
    ent = sorted({round(m[1]) for m in mots if m[4] in ("Table", "Annual") and m[1] > 40})
    bandes = []
    for y in ent:
        if not bandes or y - bandes[-1] > 40: bandes.append(y)
    bandes = bandes[:3]
    assert len(bandes) == 3, bandes
    lignes = {}
    for x0, y0, x1, y1, w, *_ in mots:
        if y0 < bandes[0] or not NOMBRE.match(w): continue
        cote = 0 if x0 < 300 else 1
        b = max(i for i, y in enumerate(bandes) if y0 >= y - 2)
        if y0 > bandes[b] + (bandes[1] - bandes[0]) - 12: continue
        cle = None
        for k in lignes:
            if k[0] == cote and k[1] == b and abs(k[2] - y0) < 3: cle = k; break
        if cle is None: cle = (cote, b, y0)
        lignes.setdefault(cle, []).append((x0, w))
    for (cote, b, y0), g in sorted(lignes.items()):
        g = sorted(g)
        # une ligne de table = numero de ligne (x faible) + 5 nombres ; la ligne « & over » n'a que le numero + un seuil
        if len(g) == 6:
            sortie.setdefault(pg + "/" + noms[b + 3 * cote], []).append([w for _, w in g])
        elif len(g) == 2:
            sortie.setdefault(pg + "/" + noms[b + 3 * cote], []).append([w for _, w in g] + ["OVER"])
        elif len(g) == 5:   # ligne NYC « N  seuil ........ N  taux  constante » (les points ne sont pas un nombre)
            sortie.setdefault(pg + "/" + noms[b + 3 * cote], []).append([g[0][1], g[1][1], "OVER", g[2][1], g[3][1], g[4][1]])
json.dump(sortie, sys.stdout, indent=1)
