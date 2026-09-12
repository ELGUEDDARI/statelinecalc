# REMPLACE (au lieu d'ajouter) le contenu d'un enregistrement name+type donne.
# Sert a corriger une valeur fausse (ex: TXT DKIM mal transcrite), pas a ajouter
# une variante en plus. Meme garde-fous que dns-add-record.ps1.
#
# Exemple :
#   ... -Nom "zmail._domainkey" -Type TXT -Valeur "v=DKIM1; k=rsa; p=...."

param(
  [Parameter(Mandatory=$true)][string]$Nom,
  [Parameter(Mandatory=$true)][ValidateSet("A","AAAA","TXT","MX","CNAME")][string]$Type,
  [Parameter(Mandatory=$true)][string]$Valeur,
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

$zone = @()
$trouve = $false
foreach ($e in $avant) {
  if ($e.type -eq $Type -and $e.name -eq $Nom) {
    $zone += @{ name = $e.name; type = $e.type; ttl = $e.ttl; records = @(@{ content = $Valeur }) }
    $trouve = $true
  } else {
    $contenus = @()
    foreach ($r in $e.records) { $contenus += @{ content = $r.content } }
    $zone += @{ name = $e.name; type = $e.type; ttl = $e.ttl; records = $contenus }
  }
}
if (-not $trouve) {
  $zone += @{ name = $Nom; type = $Type; ttl = $Ttl; records = @(@{ content = $Valeur }) }
}

$corps = @{ overwrite = $true; zone = $zone } | ConvertTo-Json -Depth 6

Write-Output ("=== ENVOI (REMPLACEMENT) : " + $Type + " " + $Nom + " -> " + $Valeur + " ===")
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
