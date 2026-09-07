[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot

$rules = [ordered]@{
  'private-key'               = '-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----'
  'supabase-token'            = '\bsbp_[A-Za-z0-9_-]{20,}\b'
  'github-token'              = '\b(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b'
  'google-api-key'            = '\bAIza[0-9A-Za-z_-]{30,}\b'
  'aws-access-key'            = '\b(AKIA|ASIA)[A-Z0-9]{16}\b'
  'jwt-token'                 = '\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b'
  'database-url-with-password' = 'postgres(?:ql)?://[^\s:/]+:[^\s@\[\]]+@[^\s]+'
}

function Get-RepositoryPaths {
  @((git ls-files), (git ls-files --others --exclude-standard)) |
    Where-Object { $_ } |
    Sort-Object -Unique
}

function Get-SmallTextFile([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) { return $null }
  if ((Get-Item -LiteralPath $Path).Length -gt 2MB) { return $null }
  return Get-Content -LiteralPath $Path -Raw -ErrorAction SilentlyContinue
}

function Test-IgnoredFinding([string]$Rule, [string]$Value) {
  return $Rule -eq 'database-url-with-password' -and $Value -match '@(?:localhost|127\.0\.0\.1)(?::|/)'
}

Push-Location $repoRoot
try {
  $findings = @()
  foreach ($path in Get-RepositoryPaths) {
    $content = Get-SmallTextFile $path
    if ($null -eq $content) { continue }
    foreach ($rule in $rules.GetEnumerator()) {
      foreach ($match in [regex]::Matches($content, $rule.Value)) {
        if (Test-IgnoredFinding $rule.Key $match.Value) { continue }
        $line = 1 + [regex]::Matches($content.Substring(0, $match.Index), "`n").Count
        $findings += [pscustomobject]@{ Path = $path; Line = $line; Rule = $rule.Key }
      }
    }
  }

  $trackedText = @{}
  foreach ($path in git ls-files) {
    $content = Get-SmallTextFile $path
    if ($null -ne $content) { $trackedText[$path] = $content }
  }

  $localSecrets = @()
  foreach ($envPath in @('backend/.env', 'frontend/.env', 'frontend/.env.local', '.env.local')) {
    if (-not (Test-Path -LiteralPath $envPath)) { continue }
    foreach ($line in Get-Content -LiteralPath $envPath) {
      if ($line -notmatch '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*$') { continue }
      $key = $Matches[1]
      $value = $Matches[2].Trim().Trim('"').Trim("'")
      if (
        $key -match '(SECRET|TOKEN|PASSWORD|PRIVATE|SERVICE_ROLE|DATABASE_URL|DIRECT_URL)' -and
        $value.Length -ge 16 -and
        $value -notmatch 'replace|example|changeme|your_|\[PASSWORD\]'
      ) {
        $localSecrets += [pscustomobject]@{ Key = $key; Value = $value }
      }
    }
  }

  $copies = @()
  foreach ($secret in $localSecrets) {
    foreach ($entry in $trackedText.GetEnumerator()) {
      if ($entry.Value.Contains($secret.Value)) {
        $copies += [pscustomobject]@{ Key = $secret.Key; Path = $entry.Key }
      }
    }
  }

  $history = git log -p --all --no-ext-diff -- . 2>$null | Out-String
  $historyPatterns = @()
  foreach ($rule in $rules.GetEnumerator()) {
    $count = @([regex]::Matches($history, $rule.Value) |
      Where-Object { -not (Test-IgnoredFinding $rule.Key $_.Value) }).Count
    if ($count) { $historyPatterns += [pscustomobject]@{ Rule = $rule.Key; Count = $count } }
  }
  $historyCopies = @($localSecrets |
    Where-Object { $history.Contains($_.Value) } |
    Select-Object -ExpandProperty Key -Unique)

  [pscustomobject]@{
    CurrentTreeFindings = @($findings | Sort-Object Path, Line, Rule)
    IgnoredSecretCopies = @($copies | Sort-Object Key, Path -Unique)
    HistoryPatternCounts = $historyPatterns
    HistoryLocalSecretCopies = $historyCopies
    Safe = -not ($findings.Count -or $copies.Count -or $historyPatterns.Count -or $historyCopies.Count)
  } | ConvertTo-Json -Depth 5

  if ($findings.Count -or $copies.Count -or $historyPatterns.Count -or $historyCopies.Count) {
    exit 1
  }
}
finally {
  Pop-Location
}
