# Ajoute N'IMPORTE QUEL type d'enregistrement a la zone DNS, SANS detruire
# l'existant. Generalisation de dns-add-txt.ps1.
#
# L'API Hostinger ne sait que remplacer la zone entiere (overwrite: true).
# On relit donc la zone, on fusionne, on renvoie le tout, et on CONTROLE
# apres coup que les enregistrements vitaux sont intacts.
#
# Enregistrements vitaux au 22/08/2026 :
#   - 4 A et 4 AAAA sur @   -> le site (GitHub Pages)
#   - 2 TXT google-site-verification -> les validations Search Console
# Les perdre casse le site ou fait perdre la propriete verifiee.
#
# Exemples :
#   ... -Nom "@"   -Type MX  -Valeur "mx1.improvmx.com" -Priorite 10
#   ... -Nom "@"   -Type TXT -Valeur "v=spf1 include:spf.improvmx.com ~all"
#   ... -Nom "www" -Type CNAME -Valeur "ELGUEDDARI.github.io."

param(
  [Parameter(Mandatory=$true)][string]$Nom,
  [Parameter(Mandatory=$true)][ValidateSet("A","AAAA","TXT","MX","CNAME")][string]$Type,
  [Parameter(Mandatory=$true)][string]$Valeur,
  [int]$Priorite = 0,
  [int]$Ttl = 300
)

$ErrorActionPreference = "Stop"
$domaine = "statelinecalc.com"

$tok = & powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.config\secrets\secret-get.ps1" -Name hostinger-api
if (-not $tok) { Write-Output "JETON HOSTINGER ABSENT"; exit 1 }
$h = @{ Authorization = "Bearer $tok"; "Content-Type" = "application/json" }
$url = "https://developers.hostinger.com/api/dns/v1/zones/$domaine"

Write-Output "=== ZONE AVANT ==="
$avant = (Invoke-WebRequest -Uri $url -Headers $h -TimeoutSec 30 -UseBasicParsing).Content | ConvertFrom-Json
foreach ($e in $avant) { Write-Output ("  " + $e.type + " " + $e.name + " -> " + ($e.records.content -join ", ")) }

# Reconstruction a l'identique + le nouvel enregistrement
$zone = @()
$trouve = $false
foreach ($e in $avant) {
  $contenus = @()
  foreach ($r in $e.records) { $contenus += @{ content = $r.content } }
  if ($e.type -eq $Type -and $e.name -eq $Nom) {
    foreach ($r in $e.records) {
      if ($r.content -eq $Valeur -or $r.content -eq ('"' + $Valeur + '"')) {
        Write-Output "=== DEJA POSE - rien a faire ==="
        exit 0
      }
    }
    $contenus += @{ content = $Valeur }
    $trouve = $true
  }
  $zone += @{ name = $e.name; type = $e.type; ttl = $e.ttl; records = $contenus }
}
if (-not $trouve) {
  $nouveau = @{ name = $Nom; type = $Type; ttl = $Ttl; records = @(@{ content = $Valeur }) }
  if ($Type -eq "MX") { $nouveau["priority"] = $Priorite }
  $zone += $nouveau
}

$corps = @{ overwrite = $true; zone = $zone } | ConvertTo-Json -Depth 6

Write-Output ("=== ENVOI : " + $Type + " " + $Nom + " -> " + $Valeur + " ===")
try {
  $r = Invoke-WebRequest -Uri $url -Method PUT -Headers $h -Body $corps -TimeoutSec 40 -UseBasicParsing
  Write-Output ("PUT => HTTP " + $r.StatusCode + " " + $r.Content)
} catch {
  Write-Output ("PUT => HTTP " + [int]$_.Exception.Response.StatusCode)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output ("  " + $sr.ReadToEnd())
  }
  exit 3
}

Write-Output "=== ZONE APRES (relecture) ==="
$apres = (Invoke-WebRequest -Uri $url -Headers $h -TimeoutSec 30 -UseBasicParsing).Content | ConvertFrom-Json
foreach ($e in $apres) { Write-Output ("  " + $e.type + " " + $e.name + " -> " + ($e.records.content -join ", ")) }

# --- controle de non-regression sur les enregistrements vitaux ----------
$a = 0; $aaaa = 0; $txtGoogle = 0
foreach ($e in $apres) {
  if ($e.type -eq "A"    -and $e.name -eq "@") { $a    = $e.records.Count }
  if ($e.type -eq "AAAA" -and $e.name -eq "@") { $aaaa = $e.records.Count }
  if ($e.type -eq "TXT") { foreach ($r in $e.records) { if ($r.content -like "*google-site-verification*") { $txtGoogle++ } } }
}
Write-Output ("=== CONTROLE : A=" + $a + "/4  AAAA=" + $aaaa + "/4  TXT-Google=" + $txtGoogle + "/2 ===")
if ($a -ne 4 -or $aaaa -ne 4 -or $txtGoogle -lt 2) {
  Write-Output "!!! ALERTE : un enregistrement vital a disparu. Verifier immediatement."
  exit 4
}
Write-Output "OK - site et validations Search Console intacts."
