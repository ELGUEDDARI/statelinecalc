# =========================================================================
#  statelinecalc.com - pose la zone DNS pour GitHub Pages
#  Le jeton est lu dans le coffre DPAPI et n'apparait JAMAIS sur une ligne
#  de commande ni dans un log.
#
#  Valeurs relues le 22/08/2026 sur :
#  docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
#  /managing-a-custom-domain-for-your-github-pages-site
#
#  Usage :  powershell -ExecutionPolicy Bypass -File ops\set-dns-github-pages.ps1
# =========================================================================

$ErrorActionPreference = "Stop"

$domaine = "statelinecalc.com"
$pseudoGitHub = "ELGUEDDARI"

$tok = & powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\.config\secrets\secret-get.ps1" -Name hostinger-api
if (-not $tok) { Write-Output "JETON ABSENT"; exit 1 }
$h = @{ Authorization = "Bearer $tok"; "Content-Type" = "application/json" }

# --- etat AVANT ---------------------------------------------------------
Write-Output "=== ZONE AVANT ==="
try {
  $avant = Invoke-WebRequest -Uri "https://developers.hostinger.com/api/dns/v1/zones/$domaine" -Headers $h -TimeoutSec 30 -UseBasicParsing
  Write-Output $avant.Content
} catch { Write-Output ("lecture impossible : HTTP " + [int]$_.Exception.Response.StatusCode) }

# --- la zone a poser ----------------------------------------------------
$zone = @(
  @{ name = "@"; type = "A"; ttl = 14400; records = @(
      @{ content = "185.199.108.153" },
      @{ content = "185.199.109.153" },
      @{ content = "185.199.110.153" },
      @{ content = "185.199.111.153" }
  )},
  @{ name = "@"; type = "AAAA"; ttl = 14400; records = @(
      @{ content = "2606:50c0:8000::153" },
      @{ content = "2606:50c0:8001::153" },
      @{ content = "2606:50c0:8002::153" },
      @{ content = "2606:50c0:8003::153" }
  )},
  @{ name = "www"; type = "CNAME"; ttl = 14400; records = @(
      @{ content = "$pseudoGitHub.github.io." }
  )}
)

$corps = @{ overwrite = $true; zone = $zone } | ConvertTo-Json -Depth 6

Write-Output "=== ENVOI ==="
try {
  $r = Invoke-WebRequest -Uri "https://developers.hostinger.com/api/dns/v1/zones/$domaine" `
       -Method PUT -Headers $h -Body $corps -TimeoutSec 40 -UseBasicParsing
  Write-Output ("PUT => HTTP " + $r.StatusCode)
  Write-Output $r.Content
} catch {
  $sc = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "n/a" }
  Write-Output ("PUT => HTTP " + $sc)
  if ($_.Exception.Response) {
    $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Output ("corps de reponse : " + $sr.ReadToEnd())
  }
}

# --- re-verification APRES, sur la source rechargee ---------------------
Write-Output "=== ZONE APRES (relecture) ==="
try {
  $apres = Invoke-WebRequest -Uri "https://developers.hostinger.com/api/dns/v1/zones/$domaine" -Headers $h -TimeoutSec 30 -UseBasicParsing
  Write-Output $apres.Content
} catch { Write-Output ("relecture impossible : HTTP " + [int]$_.Exception.Response.StatusCode) }
