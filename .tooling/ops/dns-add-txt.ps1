# Ajoute un enregistrement TXT a la zone DNS SANS detruire l'existant.
#
# L'API Hostinger ne sait que remplacer la zone entiere (overwrite: true).
# Donc on RELIT la zone, on y ajoute le TXT, et on renvoie le tout.
# Ecraser la zone sans la relire ferait tomber le site : les 4 A et 4 AAAA
# de GitHub Pages disparaitraient.
#
# Usage : powershell -ExecutionPolicy Bypass -File .tooling\ops\dns-add-txt.ps1 -Nom "@" -Valeur "google-site-verification=..."

param(
  [Parameter(Mandatory=$true)][string]$Nom,
  [Parameter(Mandatory=$true)][string]$Valeur
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

# Reconstruction a l'identique + le nouveau TXT
$zone = @()
$txtExistant = $false
foreach ($e in $avant) {
  $contenus = @()
  foreach ($r in $e.records) { $contenus += @{ content = $r.content } }
  if ($e.type -eq "TXT" -and $e.name -eq $Nom) {
    $dejaLa = $false
    foreach ($r in $e.records) { if ($r.content -eq $Valeur) { $dejaLa = $true } }
    if ($dejaLa) {
      Write-Output "=== DEJA POSE - rien a faire ==="
      exit 0
    }
    $contenus += @{ content = $Valeur }
    $txtExistant = $true
  }
  $zone += @{ name = $e.name; type = $e.type; ttl = $e.ttl; records = $contenus }
}
if (-not $txtExistant) {
  $zone += @{ name = $Nom; type = "TXT"; ttl = 300; records = @(@{ content = $Valeur }) }
}

$corps = @{ overwrite = $true; zone = $zone } | ConvertTo-Json -Depth 6

Write-Output "=== ENVOI ==="
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

# Controle de non-regression : les enregistrements GitHub Pages doivent etre intacts
$aCount = 0; $aaaaCount = 0
foreach ($e in $apres) {
  if ($e.type -eq "A"    -and $e.name -eq "@") { $aCount    = $e.records.Count }
  if ($e.type -eq "AAAA" -and $e.name -eq "@") { $aaaaCount = $e.records.Count }
}
Write-Output ("=== CONTROLE : A=" + $aCount + "/4, AAAA=" + $aaaaCount + "/4 ===")
if ($aCount -ne 4 -or $aaaaCount -ne 4) { Write-Output "!!! ALERTE : la zone GitHub Pages a ete abimee" ; exit 4 }
Write-Output "OK - le site n'a pas ete casse."
