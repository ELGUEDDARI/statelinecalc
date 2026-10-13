"""Lit « Form WV IT-100.2A, Tables for Percentage Method of Withholding » (West Virginia Tax Division,
March 2026) avec PyMuPDF : les 12 tables imprimees (2 baremes x 6 periodes de paie).

Le PDF a 4 pages. Pages 1-2 = bareme « TWO EARNER/TWO OR MORE JOBS », pages 3-4 = « OPTIONAL ONE
EARNER/ONE JOB ». Chaque page porte 3 tables, dans l'ordre de lecture du texte :
  page 1 : hebdomadaire (Table 1), bimensuelle (Table 2), bi-mensuelle 24x (Table 3)
  page 2 : mensuelle (Table 4), annuelle (Table 5), quotidienne (Table 6)
(pages 3 et 4 : meme ordre). L'ordre est CONTROLE : le premier seuil de chaque table doit etre
~ le seuil annuel / nombre de periodes (7 500 ou 10 000 / 52, 26, 24, 12, 1, 260), sinon le script echoue.

Une table = 5 lignes : « - $ T1 $ 2,11 % » puis « T1 $ T2 $ BASE $ plus 2,81 % T1 » etc., la derniere
ligne n'a pas de plafond. Le script rend, pour chaque table, les seuils T1..T4, les bases B2..B5 et les
taux, plus la deduction par exemption imprimee dans l'en-tete (« Gross Wage Minus $X for Each Exemption »).

Usage : python wv-tables-extract.py it100.2a.pdf  ->  JSON sur la sortie standard
"""
import json
import re
import sys

import pymupdf

NUM = r"(\d[\d,]*(?:\.\d+)?)"
ORDRE = ["weekly", "biweekly", "semimonthly", "monthly", "annual", "daily"]
PERIODES = {"weekly": 52, "biweekly": 26, "semimonthly": 24, "monthly": 12, "annual": 1, "daily": 260}
BAREMES = ["two-earner", "one-earner"]


def f(s):
    return float(s.replace(",", ""))


def table(chunk):
    """chunk = texte d'une table entre deux « Over But Not Over Of Excess Over »."""
    r1 = re.search(r"- \$ " + NUM + r" \$ ([\d.]+)% -", chunk)
    rows = re.findall(NUM + r" \$ " + NUM + r" \$ " + NUM + r" \$ plus ([\d.]+)% " + NUM, chunk)
    fin = re.findall(NUM + r" \$ " + NUM + r" \$ plus ([\d.]+)% " + NUM + r" \$", chunk)
    if not r1 or len(rows) != 3 or not fin:
        raise SystemExit("table illisible : " + chunk[:300])
    seuils = [f(r1.group(1))] + [f(r[1]) for r in rows]
    bases = [0.0] + [f(r[2]) for r in rows]
    taux = [f(r1.group(2)) / 100] + [f(r[3]) / 100 for r in rows]
    # derniere ligne : « T4 $ BASE5 $ plus 4,58 % T4 $ »
    t4, b5, t5, t4bis = fin[-1]
    if f(t4) != seuils[3] or f(t4bis) != seuils[3]:
        raise SystemExit("derniere ligne incoherente : " + str(fin[-1]))
    bases.append(f(b5))
    taux.append(f(t5) / 100)
    return {"seuils": seuils, "bases": bases, "taux": [round(x, 6) for x in taux]}


def main(chemin):
    doc = pymupdf.open(chemin)
    if len(doc) != 4:
        raise SystemExit("4 pages attendues, %d lues" % len(doc))
    entete = re.sub(r"\s+", " ", doc[0].get_text())
    version = re.search(r"Form WV IT.100\.2A (?:\| )?([A-Za-z]+ \d{4})", entete)
    sortie = {"version": version.group(1) if version else None, "tables": [], "deductions": {}, "bareme_par_page": []}
    for pn, page in enumerate(doc):
        t = re.sub(r"\s+", " ", page.get_text())
        titre = "two-earner" if "TWO EARNER/TWO OR MORE JOBS" in t else ("one-earner" if "OPTIONAL ONE EARNER/ONE JOB" in t else None)
        titre = titre or (sortie["bareme_par_page"][-1] if pn % 2 == 1 else None)
        sortie["bareme_par_page"].append(titre)
        for m in re.finditer(r"Gross Wage Minus \$([\d,.]+) for Each Exemption Claimed", t):
            sortie["deductions"].setdefault(str(pn + 1), []).append(f(m.group(1)))
        chunks = [c for c in t.split("Over But Not Over Of Excess Over")[1:]]
        if len(chunks) != 3:
            raise SystemExit("page %d : 3 tables attendues, %d lues" % (pn + 1, len(chunks)))
        base = 0 if pn % 2 == 0 else 3
        for i, c in enumerate(chunks):
            per = ORDRE[base + i]
            tb = table(c)
            tb.update({"page": pn + 1, "bareme": titre, "periode": per, "periodes_par_an": PERIODES[per]})
            sortie["tables"].append(tb)
    json.dump(sortie, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main(sys.argv[1])
