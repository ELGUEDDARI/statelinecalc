# Signale des URLs a Bing (et aux moteurs partenaires) via IndexNow.
#
# Pourquoi : Bing dit lui-meme que l'indexation d'un site neuf prend du
# temps. IndexNow est le seul canal qui declenche une visite immediate, il
# est gratuit, et il alimente l'index qui sert ChatGPT et Copilot.
#
# La cle n'est pas un secret : elle est publiee a la racine du site, c'est
# le mecanisme de preuve de propriete d'IndexNow.
#
# Usage : powershell -ExecutionPolicy Bypass -File .tooling\ops\indexnow.ps1

$ErrorActionPreference = "Continue"
$racine = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$hote = "statelinecalc.com"

$cle = (Get-Content (Join-Path $racine ".tooling\indexnow-key.txt") -Raw).Trim()
$urlCle = "https://$hote/$cle.txt"

# --- verifier AVANT d'agir : la cle est-elle vraiment servie ? ----------
Write-Output "=== CONTROLE DE LA CLE ==="
try {
  $r = Invoke-WebRequest -Uri $urlCle -TimeoutSec 20 -UseBasicParsing
  $contenu = if ($r.Content -is [byte[]]) { [System.Text.Encoding]::UTF8.GetString($r.Content) } else { [string]$r.Content }
  if ($contenu.Trim() -eq $cle) { Write-Output ("  OK : " + $urlCle) }
  else { Write-Output "  ECHEC : le fichier ne contient pas la cle"; exit 3 }
} catch {
  Write-Output ("  ECHEC : " + $urlCle + " => HTTP " + [int]$_.Exception.Response.StatusCode)
  Write-Output "  Le deploiement GitHub Pages n'est peut-etre pas fini. Reessayer dans une minute."
  exit 2
}

# --- les URLs a signaler ------------------------------------------------
$urls = @(
  "https://$hote/",
  "https://$hote/paycheck-calculator/washington/",
  "https://$hote/sitemap.xml"
)

$corps = @{
  host = $hote
  key = $cle
  keyLocation = $urlCle
  urlList = $urls
} | ConvertTo-Json -Depth 3

Write-Output "=== ENVOI A INDEXNOW ==="
foreach ($u in $urls) { Write-Output ("  " + $u) }
try {
  $r = Invoke-WebRequest -Uri "https://api.indexnow.org/IndexNow" -Method POST `
       -Body $corps -ContentType "application/json; charset=utf-8" -TimeoutSec 30 -UseBasicParsing
  Write-Output ("REPONSE => HTTP " + $r.StatusCode)
  # 200 = accepte, 202 = accepte mais cle en cours de validation
  if ($r.StatusCode -eq 200) { Write-Output "  ACCEPTE" }
  elseif ($r.StatusCode -eq 202) { Write-Output "  ACCEPTE, cle en cours de validation" }
} catch {
  $sc = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "reseau" }
  Write-Output ("REPONSE => HTTP " + $sc)
  Write-Output "  400 = requete mal formee | 403 = cle invalide | 422 = url hors du domaine | 429 = trop de requetes"
}

Write-Output ""
Write-Output "NOTE : IndexNow accuse reception, il ne garantit PAS l'indexation."
Write-Output "La seule preuve reste l'etat d'indexation dans Bing Webmaster et Search Console."
