# Ce que le site CAPTE reellement dans Google : impressions, clics, position.
#
# ── POURQUOI CE SCRIPT EXISTE ────────────────────────────────────────────────
# Le 05/09/2026, le depot savait dire quelles pages etaient indexees
# (gsc_3_index.py) et rien d'autre. Aucun script ne repondait a la question qui
# decide de tout le travail suivant : sur quelles requetes ce site sort-il, a
# quelle position, et est-ce que quelqu'un clique.
#
# Sans ce chiffre, deux decisions se prenaient au jugement :
#   - « faut-il reecrire les 22 meta descriptions trop longues ? »  Une
#     description n'agit que sur le TAUX DE CLIC d'impressions deja obtenues.
#     Sans impressions, c'est repeindre une vitrine que personne ne regarde.
#   - « le gabarit des pages par taux fonctionne-t-il ? »  On s'appretait a le
#     condamner le 12/09 sur un 0 impression. Or l'inspection d'URL a montre que
#     3 de ces 4 pages n'ont JAMAIS ete crawlees : le 0 ne prouvait rien du
#     gabarit, seulement que Google n'etait pas passe.
#
# ⛔ CE QUE CE SCRIPT NE FAIT PAS, ET POURQUOI C'EST VOULU
# Search Console ne renvoie PAS toutes les donnees. Deux limites a garder en
# tete avant d'interpreter quoi que ce soit :
#   1. Les donnees sont en retard de 2 a 3 jours. Demander « hier » renvoie
#      souvent zero ligne, ce qui se lit a tort comme « zero trafic ». La
#      fenetre s'arrete donc volontairement 3 jours avant aujourd'hui.
#   2. Les requetes rares sont MASQUEES pour proteger la vie privee des
#      utilisateurs. La somme des lignes « query » est donc toujours INFERIEURE
#      au total du site. On affiche les deux, et l'ecart, plutot que de laisser
#      croire que le detail fait le total.
#
# Lecture seule. Aucune ecriture, aucune soumission, aucune donnee personnelle :
# l'API ne renvoie que des agregats, jamais un utilisateur identifiable.
#
# Lancer : python .tooling/ops/gsc_4_performance.py [jours]
#          python .tooling/ops/gsc_4_performance.py 28     (defaut : 28 jours)
#          python .tooling/ops/gsc_4_performance.py 90

import sys
import json
import datetime as dt
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

DOMAINE = "statelinecalc.com"
PROPRIETE = "sc-domain:" + DOMAINE
CLE = r"C:/Users/sland/.config/claude-seo/service_account.json"
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

JOURS = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 28
# Search Console est en retard de 2 a 3 jours. Terminer la fenetre aujourd'hui
# ferait remonter des zeros qui ne sont pas des zeros.
FIN = dt.date.today() - dt.timedelta(days=3)
DEBUT = FIN - dt.timedelta(days=JOURS - 1)

creds = service_account.Credentials.from_service_account_file(CLE, scopes=SCOPES)
sc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)


def interroge(dimensions, limite=1000, filtres=None):
    """Une requete Search Analytics. Renvoie la liste des lignes, jamais None :
    une absence de donnee est une liste vide, pas une erreur."""
    corps = {
        "startDate": DEBUT.isoformat(),
        "endDate": FIN.isoformat(),
        "dimensions": dimensions,
        "rowLimit": limite,
    }
    if filtres:
        corps["dimensionFilterGroups"] = [{"filters": filtres}]
    try:
        rep = sc.searchanalytics().query(siteUrl=PROPRIETE, body=corps).execute()
        return rep.get("rows", [])
    except HttpError as e:
        print("  ERREUR API (%s) : %s" % (",".join(dimensions), e))
        return []


def ligne(cle, r, largeur=52):
    return "  %-*s %7d impr. %6d clics %6.1f%% CTR   pos. %5.1f" % (
        largeur, cle[:largeur], r["impressions"], r["clicks"],
        r["ctr"] * 100, r["position"])


print("=== PERFORMANCE GOOGLE : %s -> %s (%d jours) ===" % (DEBUT, FIN, JOURS))
print("    propriete : %s\n" % PROPRIETE)

# --- 1. Le total du site -----------------------------------------------------
# Sans dimension, l'API renvoie UNE ligne : le vrai total, non masque.
tot = interroge([], limite=1)
if not tot:
    print("AUCUNE DONNEE sur la fenetre.")
    print("Trois lectures possibles, et il faut les distinguer :")
    print("  - le site ne recoit aucune impression (plausible a 2 semaines) ;")
    print("  - la propriete n'a pas encore d'historique sur cette periode ;")
    print("  - le compte de service n'a pas acces a la propriete.")
    print("gsc_3_index.py repond a la troisieme : s'il liste les pages, l'acces")
    print("est bon et l'explication est ailleurs.")
    sys.exit(0)

t = tot[0]
print("--- TOTAL DU SITE ---")
print(ligne("(toutes pages, toutes requetes)", t))
print()

# --- 2. Par page -------------------------------------------------------------
pages = interroge(["page"])
print("--- PAR PAGE (%d page(s) avec au moins une impression) ---" % len(pages))
for r in sorted(pages, key=lambda x: -x["impressions"]):
    print(ligne(r["keys"][0].replace("https://" + DOMAINE, "") or "/", r))
if not pages:
    print("  aucune page n'a encore recu d'impression")
print()

# --- 3. Par requete ----------------------------------------------------------
reqs = interroge(["query"])
sommeImpr = sum(r["impressions"] for r in reqs)
print("--- PAR REQUETE (%d requete(s) visibles) ---" % len(reqs))
for r in sorted(reqs, key=lambda x: -x["impressions"])[:40]:
    print(ligne(r["keys"][0], r))
if not reqs:
    print("  aucune requete visible")
# L'ecart n'est pas une anomalie : c'est l'anonymisation des requetes rares.
if t["impressions"]:
    print("\n  Les requetes visibles couvrent %d des %d impressions (%.0f%%)."
          % (sommeImpr, t["impressions"], 100.0 * sommeImpr / t["impressions"]))
    print("  Le reste est masque par Google (requetes trop rares) — ce n'est")
    print("  pas une donnee manquante, c'est une donnee qui n'existe pas pour nous.")
print()

# --- 4. Requetes de marque vs. reste ----------------------------------------
# Une requete de marque prouve qu'on est deja connu, pas qu'on capte du marche.
# Melanger les deux fait croire a une croissance qui n'en est pas une.
marque = [r for r in reqs if "stateline" in r["keys"][0].lower().replace(" ", "")]
hors = [r for r in reqs if r not in marque]
print("--- MARQUE vs. HORS MARQUE (sur les requetes visibles) ---")
print("  marque      : %4d impr. %4d clics  sur %d requete(s)"
      % (sum(r["impressions"] for r in marque), sum(r["clicks"] for r in marque), len(marque)))
print("  hors marque : %4d impr. %4d clics  sur %d requete(s)"
      % (sum(r["impressions"] for r in hors), sum(r["clicks"] for r in hors), len(hors)))
print()

# --- 5. Ce qui est vu mais pas clique ---------------------------------------
# C'est LA liste qui decide si reecrire une meta description sert a quelque
# chose : une page qui n'a aucune impression ne peut pas gagner de clic.
seuil = 10
muettes = [r for r in pages if r["impressions"] >= seuil and r["clicks"] == 0]
print("--- VU MAIS JAMAIS CLIQUE (>= %d impressions, 0 clic) ---" % seuil)
for r in sorted(muettes, key=lambda x: -x["impressions"]):
    print(ligne(r["keys"][0].replace("https://" + DOMAINE, ""), r))
if not muettes:
    print("  aucune page dans ce cas")
print("  -> ces pages-la, et elles seules, gagneraient a une meilleure")
print("     description ou a un meilleur titre.")
print()

# --- 6. Trace horodatee ------------------------------------------------------
# Un chiffre sans date ne fonde aucune decision. On garde l'historique pour
# pouvoir comparer d'une semaine sur l'autre au lieu de se fier a un souvenir.
trace = {
    "releve": dt.datetime.now().isoformat(timespec="seconds"),
    "debut": DEBUT.isoformat(), "fin": FIN.isoformat(), "jours": JOURS,
    "total": {k: t[k] for k in ("clicks", "impressions", "ctr", "position")},
    "pages": {r["keys"][0]: {k: r[k] for k in ("clicks", "impressions", "ctr", "position")}
              for r in pages},
    "requetes": {r["keys"][0]: {k: r[k] for k in ("clicks", "impressions", "ctr", "position")}
                 for r in reqs},
}
chemin = ".tooling/ops/gsc-performance.jsonl"
with open(chemin, "a", encoding="utf-8") as f:
    f.write(json.dumps(trace, ensure_ascii=False) + "\n")
print("Releve ajoute a %s (une ligne par execution, pour comparer plus tard)." % chemin)
