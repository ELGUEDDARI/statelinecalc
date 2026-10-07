"""Lit les deux documents OFFICIELS du Kentucky Department of Revenue qui portent la retenue 2026.

1. « 2026 KENTUCKY WITHHOLDING TAX FORMULA », 42A003 (TCF)(10-2025), PDF d'une page : taux, deduction
   standard, formule et deux exemples imprimes (lus par PyMuPDF).
2. « 2026 Employer Withholding Calculator.xlsx » : classeur Excel dont la feuille cachee « Hidden
   Table » contient la formule de retenue de chaque ligne (lue dans le XML, sans Excel).

Il n'y a PAS de tables de tranches de salaire au Kentucky (contrairement a la Louisiane) : la formule
est la seule source, et le tableur la confirme.

Usage : python ky-tables-extract.py formule.pdf calculateur.xlsx   ->  JSON sur la sortie standard
"""
import json
import re
import sys
import zipfile

import pymupdf


def pdf(path):
    d = pymupdf.open(path)
    t = "\n".join(p.get_text() for p in d)
    t = re.sub(r"\s+", " ", t)
    out = {"pages": len(d), "texte": t}
    m = re.search(r"2026 Kentucky Standard Deduction: \$([\d,]+)", t)
    out["deduction"] = float(m.group(1).replace(",", "")) if m else None
    m = re.search(r"2026 Kentucky Tax Rate: ([\d.]+)%", t)
    out["taux"] = float(m.group(1)) / 100 if m else None
    ex = []
    for m in re.finditer(r"Payroll Frequency: ([a-z-]+) Wages: \$([\d,]+) 1\. Compute annual wages: \$[\d,]+ ?x ?(\d+) = \$([\d,]+) "
                         r"2\. Compute Kentucky taxable wages: \$[\d,]+ - \$([\d,]+) = \$([\d,]+) "
                         r"3\. Compute gross annual Kentucky tax: \$([\d,]+) x ([\d.]+)% flat tax rate = \$([\d,.]+) "
                         r"4\. Compute Kentucky withholding tax for tax period: \$[\d,.]+ [^\d]+ (\d+) = \$?([\d,.]+)", t):
        g = lambda i: float(m.group(i).replace(",", ""))
        ex.append({"freq": m.group(1), "salaire": g(2), "periodes": g(3), "annuel": g(4), "deduction": g(5),
                   "imposable": g(6), "imposable_dans_ligne3": g(7), "taux": g(8) / 100, "impot_annuel": g(9),
                   "n": g(10), "retenue": g(11)})
    out["exemples"] = ex
    return out


def xlsx(path):
    z = zipfile.ZipFile(path)
    wb = z.read("xl/workbook.xml").decode("utf8")
    sheets = [(re.search(r'name="([^"]+)"', s).group(1), 'state="hidden"' in s, re.search(r'r:id="(rId\d+)"', s).group(1))
              for s in re.findall(r"<sheet [^>]*>", wb)]
    rels = z.read("xl/_rels/workbook.xml.rels").decode("utf8")
    cible = {r: t for r, t in re.findall(r'<Relationship [^>]*?Id="(rId\d+)"[^>]*?Target="([^"]+)"', rels)}
    cible.update({r: t for t, r in re.findall(r'<Relationship [^>]*?Target="([^"]+)"[^>]*?Id="(rId\d+)"', rels)})
    formules = []
    periodes = {}
    for nom, cache, rid in sheets:
        x = z.read("xl/" + cible[rid].lstrip("/").replace("xl/", "")).decode("utf8")
        for f in re.findall(r"<f>([^<]*)</f>", x):
            formules.append({"feuille": nom, "cachee": bool(cache), "f": f.replace("&gt;", ">").replace("&lt;", "<")})
        if cache:
            # table N : paires (code de frequence, nombre de periodes) en A1:B7
            cells = dict(re.findall(r'<c r="([AB]\d)"[^>]*><v>([^<]+)</v>', x))
            periodes = {cells.get("A%d" % i): cells.get("B%d" % i) for i in range(1, 8)}
    return {"formules": formules, "periodes": periodes}


if __name__ == "__main__":
    print(json.dumps({"pdf": pdf(sys.argv[1]), "xlsx": xlsx(sys.argv[2])}, ensure_ascii=False))
