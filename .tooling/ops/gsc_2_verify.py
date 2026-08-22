# Etape 2/2 - verifie la propriete du domaine, l'ajoute a Search Console,
# soumet le sitemap, et ajoute le PDG comme proprietaire.
#
# La verification DNS peut echouer les premieres minutes : l'enregistrement
# TXT doit s'etre propage. On reessaie, on ne conclut pas a l'echec sur un
# seul non.
#
# Lancer : python .tooling/ops/gsc_2_verify.py

import time
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

DOMAINE = "statelinecalc.com"
PROPRIETE = "sc-domain:" + DOMAINE
SITEMAP = "https://statelinecalc.com/sitemap.xml"
CLE = r"C:/Users/sland/.config/claude-seo/service_account.json"

# Hypothese nommee : c'est le compte Google du PDG. A corriger s'il en
# utilise un autre pour Search Console.
PROPRIETAIRE_PDG = "bruitblancsommeil1@gmail.com"

SCOPES = [
    "https://www.googleapis.com/auth/siteverification",
    "https://www.googleapis.com/auth/webmasters",
]

creds = service_account.Credentials.from_service_account_file(CLE, scopes=SCOPES)
sv = build("siteVerification", "v1", credentials=creds, cache_discovery=False)
sc = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

site = {"type": "INET_DOMAIN", "identifier": DOMAINE}

# --- 1. Est-ce deja verifie ? (verifier l'etat AVANT d'agir) -------------
deja = False
try:
    liste = sv.webResource().list().execute()
    for r in liste.get("items", []):
        if r["site"]["identifier"] == DOMAINE:
            deja = True
            ressource_id = r["id"]
            print("DEJA VERIFIE : " + r["id"])
except HttpError as e:
    print("liste impossible : " + str(e.resp.status))

# --- 2. Verification, avec reessais sur la propagation DNS --------------
if not deja:
    ressource_id = None
    for essai in range(1, 7):
        try:
            rep = sv.webResource().insert(
                verificationMethod="DNS_TXT", body={"site": site}
            ).execute()
            ressource_id = rep["id"]
            print("VERIFIE : " + ressource_id)
            break
        except HttpError as e:
            print("  essai %d/6 : HTTP %s" % (essai, e.resp.status))
            if essai < 6:
                time.sleep(20)
    if not ressource_id:
        print("ETAT = INDETERMINE - le TXT n'est peut-etre pas encore propage.")
        print("Le TXT EST pose (verifie sur l'API Hostinger). Relancer ce script plus tard.")
        raise SystemExit(1)

# --- 3. Ajout de la propriete a Search Console -------------------------
try:
    sc.sites().add(siteUrl=PROPRIETE).execute()
    print("PROPRIETE AJOUTEE : " + PROPRIETE)
except HttpError as e:
    print("ajout propriete : HTTP %s" % e.resp.status)

# --- 4. Soumission du sitemap ------------------------------------------
try:
    sc.sitemaps().submit(siteUrl=PROPRIETE, feedpath=SITEMAP).execute()
    print("SITEMAP SOUMIS : " + SITEMAP)
except HttpError as e:
    print("soumission sitemap : HTTP %s" % e.resp.status)

# --- 5. Ajout du PDG comme proprietaire ---------------------------------
# Sans ca, le site n'apparait PAS dans son Search Console, et l'import
# vers Bing ne le trouvera pas.
try:
    actuel = sv.webResource().get(id=ressource_id).execute()
    owners = actuel.get("owners", [])
    if PROPRIETAIRE_PDG in owners:
        print("PDG DEJA PROPRIETAIRE")
    else:
        owners.append(PROPRIETAIRE_PDG)
        actuel["owners"] = owners
        sv.webResource().update(id=ressource_id, body=actuel).execute()
        print("PDG AJOUTE COMME PROPRIETAIRE : " + PROPRIETAIRE_PDG)
except HttpError as e:
    print("ajout proprietaire : HTTP %s - a faire a la main si besoin" % e.resp.status)

# --- 6. Re-verification APRES, sur la source rechargee -----------------
print("=== RELECTURE ===")
try:
    sites = sc.sites().list().execute()
    for s in sites.get("siteEntry", []):
        if DOMAINE in s["siteUrl"]:
            print("  " + s["siteUrl"] + " | permission = " + s["permissionLevel"])
    sm = sc.sitemaps().list(siteUrl=PROPRIETE).execute()
    for s in sm.get("sitemap", []):
        print("  sitemap " + s["path"] + " | derniere soumission = " + s.get("lastSubmitted", "?"))
except HttpError as e:
    print("  relecture impossible : HTTP %s - ETAT INDETERMINE" % e.resp.status)
