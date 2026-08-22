# Repare un double-encodage UTF-8 (mojibake).
#
# Cause : Get-Content -Raw a lu le fichier en ANSI (page de code Windows),
# puis Set-Content -Encoding utf8 l'a reecrit en UTF-8. Les octets d'origine
# ont donc ete encodes une seconde fois. Un tiret long devient trois
# caracteres parasites.
#
# On inverse exactement l'operation : reencoder le texte en cp1252 pour
# retrouver les octets d'origine, puis les relire comme de l'UTF-8.
#
# Aucun caractere accentue n'est ecrit en dur ici : ce fichier reste en
# ASCII pur, sinon on reproduit le probleme qu'on essaie de corriger.

$racine = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

# Signature du mojibake : U+00E2 (a circonflexe) suivi de U+20AC (signe euro)
$signature = [string][char]0x00E2 + [string][char]0x20AC

$fichiers = Get-ChildItem -Path $racine -Recurse -File -Include *.html,*.css,*.js,*.xml,*.txt |
            Where-Object { $_.FullName -notmatch "\\\.git\\" }

$repares = 0
foreach ($f in $fichiers) {
  $txt = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  if ($txt.Contains($signature)) {
    $octets = [System.Text.Encoding]::GetEncoding(1252).GetBytes($txt)
    $repare = [System.Text.Encoding]::UTF8.GetString($octets)
    $restant = ([regex]::Matches($repare, [regex]::Escape($signature))).Count
    [System.IO.File]::WriteAllText($f.FullName, $repare, (New-Object System.Text.UTF8Encoding($false)))
    Write-Output ("REPARE : " + $f.FullName.Replace($racine, "") + " | restant apres = " + $restant)
    $repares++
  }
}

if ($repares -eq 0) { Write-Output "Aucun fichier a reparer." }

Write-Output "=== CONTROLE FINAL SUR TOUS LES FICHIERS ==="
$sale = 0
foreach ($f in $fichiers) {
  $txt = [System.IO.File]::ReadAllText($f.FullName, [System.Text.Encoding]::UTF8)
  $n = ([regex]::Matches($txt, [regex]::Escape($signature))).Count
  if ($n -gt 0) { Write-Output ("  ENCORE CASSE : " + $f.Name + " (" + $n + ")"); $sale++ }
}
if ($sale -eq 0) { Write-Output "  OK : plus aucune sequence de double-encodage." }
