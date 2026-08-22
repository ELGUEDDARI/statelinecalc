# Pousse la branche main sur GitHub, en integrant d'abord ce qui existe
# deja en face. Jamais de --force : si le distant a du travail qu'on n'a
# pas, on le REJOINT, on ne l'ecrase pas.
#
# Le jeton est lu dans le magasin Windows et ecrit dans un fichier
# d'identifiants temporaire, supprime dans le finally.
#
# Usage : powershell -ExecutionPolicy Bypass -File .tooling\ops\git-push.ps1 "message de commit"

param([string]$Message = "Update site")

$ErrorActionPreference = "Continue"
$racine = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Set-Location $racine

$src = @"
using System;
using System.Runtime.InteropServices;
public class CredGit {
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
if (-not ("CredGit" -as [type])) { Add-Type -TypeDefinition $src -Language CSharp }

$tok = [CredGit]::Secret("git:https://github.com")
if (-not $tok) { Write-Output "JETON INTROUVABLE"; exit 2 }

$credFile = Join-Path $env:TEMP ("gh-" + [guid]::NewGuid().ToString("N") + ".cred")
$ligne = "https://ELGUEDDARI:" + $tok + "@github.com"
Set-Content -Path $credFile -Value $ligne -Encoding ascii -NoNewline
$credPath = $credFile.Replace([char]92, [char]47)
$helper = "store --file=" + $credPath

try {
  Write-Output "=== COMMIT DES MODIFICATIONS LOCALES ==="
  git add -A
  $rien = git diff --cached --quiet; $codeCommit = $LASTEXITCODE
  if ($codeCommit -eq 0) {
    Write-Output "  rien a committer"
  } else {
    git -c user.name="ELGUEDDARI" -c user.email="ELGUEDDARI@users.noreply.github.com" `
        commit -m $Message 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
  }

  Write-Output "=== ETAT DISTANT ==="
  git -c credential.helper=$helper fetch origin 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
  $local  = (git rev-parse main 2>$null)
  $distant = (git rev-parse origin/main 2>$null)
  Write-Output ("  local    = " + $local)
  Write-Output ("  origin   = " + $distant)

  if ($distant -and $local -ne $distant) {
    $enAvance = (git rev-list --count "origin/main..main")
    $enRetard = (git rev-list --count "main..origin/main")
    Write-Output ("  en avance de " + $enAvance + " commit(s), en retard de " + $enRetard)
    if ([int]$enRetard -gt 0) {
      Write-Output "=== REBASE SUR LE DISTANT (jamais de force) ==="
      git rebase origin/main 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
    }
  }

  Write-Output "=== PUSH ==="
  git -c credential.helper=$helper push origin main 2>&1 | ForEach-Object { Write-Output ("  " + $_) }
}
finally {
  if (Test-Path -LiteralPath $credFile) {
    [System.IO.File]::Delete($credFile)
  }
  if (Test-Path -LiteralPath $credFile) { Write-Output "ATTENTION : fichier d identifiants NON supprime" }
  else { Write-Output "fichier d identifiants temporaire supprime" }
}

Write-Output "=== VERIFICATION FINALE ==="
git -c credential.helper= fetch origin 2>$null | Out-Null
Write-Output ("  local  = " + (git rev-parse main))
Write-Output ("  origin = " + (git rev-parse origin/main))
