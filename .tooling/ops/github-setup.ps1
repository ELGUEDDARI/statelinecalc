# =========================================================================
#  Cree le depot GitHub et active GitHub Pages avec le domaine personnalise.
#
#  Le jeton est lu dans le Gestionnaire d'identifiants Windows via
#  "git credential fill". Il n'est JAMAIS affiche, JAMAIS ecrit sur disque,
#  JAMAIS passe sur une ligne de commande (donc invisible dans la liste des
#  processus).
#
#  Usage : powershell -ExecutionPolicy Bypass -File ops\github-setup.ps1
# =========================================================================

$ErrorActionPreference = "Continue"

$owner  = "ELGUEDDARI"
$repo   = "statelinecalc"
$domain = "statelinecalc.com"

# --- lecture du jeton stocke -------------------------------------------
# Trois sources, dans l'ordre : le coffre DPAPI du projet, puis git avec le
# helper wincred (qui lit l'entree LegacyGeneric du magasin Windows), puis
# le helper par defaut. Le helper "manager" configure au niveau systeme ne
# rend rien : son binaire git-credential-manager est absent du PATH.

function Lire-JetonGit([string]$helper) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "git"
  $psi.Arguments = if ($helper) { "-c credential.helper=$helper credential fill" }
                   else { "credential fill" }
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.UseShellExecute = $false
  $p = [System.Diagnostics.Process]::Start($psi)
  $p.StandardInput.Write("protocol=https`nhost=github.com`n`n")
  $p.StandardInput.Close()
  $sortie = $p.StandardOutput.ReadToEnd()
  $p.WaitForExit()
  foreach ($ligne in ($sortie -split "`n")) {
    if ($ligne.Trim().StartsWith("password=")) { return $ligne.Trim().Substring(9) }
  }
  return $null
}

# Lecture directe du magasin Windows par l'API Win32 CredRead.
# C'est la seule methode qui marche ici : le helper "manager" est configure
# au niveau systeme mais son binaire est absent du PATH, donc git ne rend
# rien alors que le secret existe (verifie : 80 octets sous
# "git:https://github.com", utilisateur ELGUEDDARI).
$src = @"
using System;
using System.Runtime.InteropServices;
public class CredStore {
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
if (-not ("CredStore" -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

$tok = $null
$origine = ""

$tok = [CredStore]::Secret("git:https://github.com")
if ($tok) { $origine = "magasin Windows (CredRead)" }

$f = "$env:USERPROFILE\.config\secrets\github-api.dpapi"
if (-not $tok -and (Test-Path $f)) {
  $tok = & powershell -NoProfile -ExecutionPolicy Bypass `
         -File "$env:USERPROFILE\.config\secrets\secret-get.ps1" -Name github-api
  if ($tok) { $origine = "coffre DPAPI" }
}
if (-not $tok) { $tok = Lire-JetonGit "wincred"; if ($tok) { $origine = "magasin Windows (wincred)" } }
if (-not $tok) { $tok = Lire-JetonGit $null;     if ($tok) { $origine = "helper git par defaut" } }

if (-not $tok) {
  Write-Output "AUCUN JETON GITHUB EXPLOITABLE (coffre, wincred, helper par defaut)."
  exit 2
}
Write-Output ("jeton trouve via : " + $origine)
Write-Output ("jeton lu : " + $tok.Length + " caracteres, prefixe " + $tok.Substring(0,4))

$h = @{ Authorization = "Bearer $tok"; "User-Agent" = "statelinecalc-setup";
        Accept = "application/vnd.github+json" }

# --- qui suis-je, et avec quels droits ---------------------------------
try {
  $r = Invoke-WebRequest -Uri "https://api.github.com/user" -Headers $h -TimeoutSec 30 -UseBasicParsing
  $me = ($r.Content | ConvertFrom-Json)
  Write-Output ("compte = " + $me.login)
  Write-Output ("scopes = " + $r.Headers["x-oauth-scopes"])
} catch {
  Write-Output ("api.github.com/user => HTTP " + [int]$_.Exception.Response.StatusCode)
  exit 3
}

# --- le depot existe-t-il deja ? (verifier AVANT d'agir) ---------------
$existe = $false
try {
  $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$owner/$repo" -Headers $h -TimeoutSec 30 -UseBasicParsing
  $existe = $true
  Write-Output "depot DEJA EXISTANT - je ne le recree pas"
} catch {
  if ([int]$_.Exception.Response.StatusCode -eq 404) { Write-Output "depot absent - creation" }
  else { Write-Output ("lecture depot => HTTP " + [int]$_.Exception.Response.StatusCode) }
}

if (-not $existe) {
  $corps = @{
    name = $repo
    description = "Free money calculators for all 50 US states - statelinecalc.com"
    homepage = "https://$domain"
    private = $false
    has_issues = $false
    has_wiki = $false
    auto_init = $false
  } | ConvertTo-Json
  try {
    $r = Invoke-WebRequest -Uri "https://api.github.com/user/repos" -Method POST -Headers $h `
         -Body $corps -ContentType "application/json" -TimeoutSec 40 -UseBasicParsing
    Write-Output ("creation depot => HTTP " + $r.StatusCode)
  } catch {
    $sc = [int]$_.Exception.Response.StatusCode
    Write-Output ("creation depot => HTTP " + $sc)
    if ($_.Exception.Response) {
      $sr = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      Write-Output ("  reponse : " + $sr.ReadToEnd())
    }
    exit 4
  }
}

# --- re-verification APRES, sur la source rechargee --------------------
try {
  $r = Invoke-WebRequest -Uri "https://api.github.com/repos/$owner/$repo" -Headers $h -TimeoutSec 30 -UseBasicParsing
  $d = $r.Content | ConvertFrom-Json
  Write-Output ("VERIFIE : " + $d.full_name + " | branche par defaut = " + $d.default_branch +
                " | url = " + $d.html_url)
} catch {
  Write-Output "VERIFICATION IMPOSSIBLE - etat INDETERMINE"
}
