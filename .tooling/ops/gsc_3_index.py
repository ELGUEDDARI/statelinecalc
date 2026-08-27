# Etat d'indexation REEL de toutes les pages, page par page.
#
# Pourquoi ce script existe : le compteur "pages indexees" de Search Console
# est en retard de plusieurs jours et ne dit PAS quelle page manque. L'API
# d'inspection d'URL, elle, repond page par page, a l'instant. Le 27/08/2026
# le compteur affichait 0 alors que les deux pages d'origine etaient bien
# "Submitted and indexed" depuis le 23-24/08. Un compteur n'est pas une preuve.
#
# La liste vient du sitemap, jamais ecrite en dur : une liste figee ici serait
# oubliee a la prochaine page publiee.
#
# Lancer : python .tooling/ops/gsc_3_index.py
#          python .tooling/ops/gsc_3_index.py --soumettre-sitemap

import sys
import xml.etree.ElementTree as ET
import urllib.request
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

DOMAINE = "statelinecalc.com"
PROPRIETE = "sc-domain:" + DOMAINE
SITEMAP = "https://%s/sitemap.xml" % DOMAINE
CLE = r"C:/Users/sland/.config/claude-seo/service_account.json"
SCOPES = ["https://www.googleapis.com/auth/webmasters"]

# On lit le sitemap SERVI, pas celui du disque : c'est celui-la que Google
# voit. Les deux peuvent diverger si un push n'est pas encore deploye.
with urllib.request.urlopen(SITEMAP, timeout=30) as r:
    racine = ET.fromstring(r.read())
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
urls = [loc.text.strip() for loc in racine.iter(NS + "loc")]
print("=== %d URL lues dans le sitemap servi ===\n" % len(urls))

creds = service_account.Credentials.from_service_account_file(CLE, scopes=SCOPES)
sc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

if "--soumettre-sitemap" in sys.argv:
    try:
        sc.sitemaps().submit(siteUrl=PROPRIETE, feedpath=SITEMAP).execute()
        print("SITEMAP RESOUMIS : %s\n" % SITEMAP)
    except HttpError as e:
        print("SITEMAP - ECHEC : %s\n" % e)

# --- inspection page par page -------------------------------------------
compte = {}
for u in urls:
    try:
        rep = sc.urlInspection().index().inspect(body={
            "inspectionUrl": u, "siteUrl": PROPRIETE, "languageCode": "en-US",
        }).execute()
        idx = rep.get("inspectionResult", {}).get("indexStatusResult", {})
        verdict = idx.get("coverageState", "?")
        robots = idx.get("robotsTxtState", "?")
        crawl = (idx.get("lastCrawlTime") or "jamais")[:10]
        # verdict : la seule valeur qui compte est celle-ci, telle que Google
        # l'ecrit. On ne la reformule pas, on la recopie.
        print("%-56s | %-34s | crawl %s | robots %s"
              % (u.replace("https://" + DOMAINE, "") or "/", verdict, crawl, robots))
    except HttpError as e:
        verdict = "ERREUR API"
        print("%-56s | ERREUR : %s" % (u, e))
    compte[verdict] = compte.get(verdict, 0) + 1

print("\n=== RESUME ===")
for k, v in sorted(compte.items(), key=lambda x: -x[1]):
    print("  %2d  %s" % (v, k))
indexees = sum(v for k, v in compte.items() if "indexed" in k.lower() and "not" not in k.lower())
print("\nINDEXEES : %d / %d" % (indexees, len(urls)))
