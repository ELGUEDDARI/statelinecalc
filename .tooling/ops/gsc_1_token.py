# Etape 1/2 - demande a Google le jeton de verification DNS TXT.
# N'ecrit rien, ne modifie rien. Affiche seulement le jeton a poser en DNS.
#
# Lancer : python .tooling/ops/gsc_1_token.py

import json
from google.oauth2 import service_account
from googleapiclient.discovery import build

DOMAINE = "statelinecalc.com"
CLE = r"C:/Users/sland/.config/claude-seo/service_account.json"

SCOPES = [
    "https://www.googleapis.com/auth/siteverification",
    "https://www.googleapis.com/auth/webmasters",
]

creds = service_account.Credentials.from_service_account_file(CLE, scopes=SCOPES)
sv = build("siteVerification", "v1", credentials=creds, cache_discovery=False)

reponse = sv.webResource().getToken(body={
    "site": {"type": "INET_DOMAIN", "identifier": DOMAINE},
    "verificationMethod": "DNS_TXT",
}).execute()

print("TOKEN=" + reponse["token"])
print("METHODE=" + reponse["method"])
