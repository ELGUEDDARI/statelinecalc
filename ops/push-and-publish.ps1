# =========================================================================
#  Pousse le site sur GitHub et active GitHub Pages sur statelinecalc.com
#
#  Le jeton est lu dans le magasin Windows (CredRead) et ecrit dans un
#  fichier temporaire d'identifiants, supprime a la fin. Il n'apparait
#  jamais sur une ligne de commande, donc jamais dans la liste des
#  processus, et jamais dans .git/config.
#
#  Usage : powershell -ExecutionPolicy Bypass -File ops\push-and-publish.ps1
# =========================================================================

$ErrorActionPreference = "Continue"

$racine = Split-Path $PSScriptRoot -Parent
$owner  = "ELGUEDDARI"
$repo   = "statelinecalc"
$domain = "statelinecalc.com"

$src = @"
using System;
using System.Runtime.InteropServices;
public class CredStore2 {
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
  public struct CREDENTIAL {
    public uint Flags; public uint Type; public IntPtr TargetName; public IntPtr Comment;
    public long LastWritten; public uint CredentialBlobSize; public IntPtr CredentialBlob;
    public uint Persist; public uint AttributeCount; public IntPtr Attributes;
    public IntPtr TargetAlias; public IntPtr UserName;
  }
  [DllImport("advapi32.dll", CharSet=CharSet.Unicode, SetLastError=true)]
  public static extern bool CredRead(string target, uint type, uint flags, out IntPtr cred);
  public static string Secret(string target) {
    IntPtr p;
    if (!CredRead(target, 1, 0, out p)) return null;
    CREDENTIAL c = (CREDENTIAL)Marshal.PtrToStructure(p, typeof(CREDENTIAL));
    if (c.CredentialBlobSize == 0) return null;
    return Marshal.PtrToStringUni(c.CredentialBlob, (int)c.CredentialBlobSize / 2);
  }
}
"@
if (-not ("CredStore2" -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

$tok = [CredStore2]::Secret("git:https://github.com")
if (-not $tok) { Write-Output "JETON INTROUVABLE"; exit 2 }

Set-Location $racine

# --- etat AVANT ---------------------------------------------------------
Write-Output "=== ETAT AVANT ==="
if (Test-Path ".git") { Write-Output "depot git local DEJA initialise" }
else { Write-Output "pas de depot git local" }

# --- init ---------------------------------------------------------------
if (-not (Test-Path ".git")) {
  git init --initial-branch=main | Out-Null
  # Identite locale au depot uniquement. On utilise l'adresse noreply de
  # GitHub pour ne pas publier l'e-mail personnel du PDG dans l'historique
  # public des commits.
  git config user.name  "ELGUEDDARI"
  git config user.email "ELGUEDDARI@users.noreply.github.com"
  git remote add origin "https://github.com/$owner/$repo.git"
}

# --- identifiants temporaires ------------------------------------------
$credFile = Join-Path $env:TEMP ("gh-" + [guid]::NewGuid().ToString("N") + ".cred")
Set-Content -Path $credFile -Value ("https://" + $owner + ":" + $tok + "@github.com") -Encoding ascii -NoNewline
$credPath = ($credFile -replace '\\','/')

try {
  git add -A
  git -c user.name="ELGUEDDARI" -c user.email="ELGUEDDARI@users.noreply.github.com" `
      commit -m "Launch: Washington paycheck calculator, design system, 2026 rate data" | Out-Null

  Write-Output "=== PUSH ==="
  git -c credential.helper="store --file=$credPath" push -u origin main 2>&1 | ForEach-Object { Write-Output $_ }
}
finally {
  Remove-Item -LiteralPath $credFile -Force -ErrorAction SilentlyContinue
  if (Test-Path $credFile) { Write-Output "ATTENTION : fichier d identifiants NON supprime" }
  else { Write-Output "fichier d identifiants temporaire supprime" }
}

# --- activation de GitHub Pages ----------------------------------------
$h = @{ Authorization = "Bearer $tok"; "User-Agent" = "statelinecalc-setup";
        Accept = "application/vnd.github+json" }

Write-Output "=== GITHUB PAGES ==="
$dejaActif = $false
try {
  $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$owner/$repo/pages" -Headers $h -TimeoutSec 30 -UseBasicParsing
  $dejaActif = $true
  Write-Output "Pages DEJA actif"
} catch { Write-Output "Pages pas encore actif - activation" }

if (-not $dejaActif) {
  $corps = @{ source = @{ branch = "main"; path = "/" } } | ConvertTo-Json
  try {
    $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$owner/$repo/pages" -Method POST `
         -Headers $h -Body $corps -ContentType "application/json" -TimeoutSec 40 -UseBasicParsing
    Write-Output ("activation => HTTP " + $r.StatusCode)
  } catch {
    Write-Output ("activation => HTTP " + [int]$_.Exception.Response.StatusCode)
    if ($_.Exception.Response) {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Output ("  reponse : " + $sr.ReadToEnd())
    }
  }
}

# --- re-verification APRES ---------------------------------------------
Write-Output "=== VERIFICATION (relecture API) ==="
try {
  $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$owner/$repo/pages" -Headers $h -TimeoutSec 30 -UseBasicParsing
  $p = $r.Content | ConvertFrom-Json
  Write-Output ("  url         = " + $p.html_url)
  Write-Output ("  domaine     = " + $p.cname)
  Write-Output ("  statut      = " + $p.status)
  Write-Output ("  https force = " + $p.https_enforced)
  Write-Output ("  source      = " + $p.source.branch + " " + $p.source.path)
} catch {
  Write-Output ("  lecture impossible => HTTP " + [int]$_.Exception.Response.StatusCode + " - etat INDETERMINE")
}
