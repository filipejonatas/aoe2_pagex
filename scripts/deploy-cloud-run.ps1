[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,

  [Parameter(Mandatory = $true)]
  [string]$FrontendUrl,

  [string]$Region = 'southamerica-east1',
  [string]$Service = 'aoe2-pagex-api',
  [string]$EnvFile = 'backend/.env'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath = Join-Path $repoRoot $EnvFile

$gcloudCommand = (Get-Command gcloud -ErrorAction SilentlyContinue).Source
if (-not $gcloudCommand) {
  $defaultGcloudPath = Join-Path $env:LOCALAPPDATA 'Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'
  if (Test-Path -LiteralPath $defaultGcloudPath) {
    $gcloudCommand = $defaultGcloudPath
  }
}

if (-not $gcloudCommand) {
  throw 'Google Cloud CLI (gcloud) nao encontrado. Instale-o antes de executar este script.'
}

if (-not (Test-Path -LiteralPath $envPath)) {
  throw "Arquivo de ambiente nao encontrado: $envPath"
}

function Invoke-Gcloud {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)

  & $script:gcloudCommand @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "gcloud falhou: gcloud $($Arguments -join ' ')"
  }
}

function Read-DotEnv {
  param([string]$Path)

  $values = @{}
  foreach ($line in Get-Content -LiteralPath $Path) {
    $trimmed = $line.Trim()
    if (-not $trimmed -or $trimmed.StartsWith('#')) { continue }
    if ($trimmed -notmatch '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') { continue }

    $name = $Matches[1]
    $value = $Matches[2].Trim()
    if ($value.Length -ge 2) {
      $first = $value[0]
      $last = $value[$value.Length - 1]
      if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
        $value = $value.Substring(1, $value.Length - 2)
      }
    }
    $values[$name] = $value
  }
  return $values
}

function Publish-Secret {
  param(
    [string]$Name,
    [string]$Value
  )

  $existingSecrets = @(& $script:gcloudCommand secrets list --project $ProjectId --format 'value(name)')
  if ($Name -notin $existingSecrets) {
    Invoke-Gcloud secrets create $Name --project $ProjectId --replication-policy automatic --quiet
  }

  $tempPath = Join-Path ([IO.Path]::GetTempPath()) ("aoe2-pagex-{0}.tmp" -f [guid]::NewGuid())
  try {
    [IO.File]::WriteAllText($tempPath, $Value, [Text.UTF8Encoding]::new($false))
    Invoke-Gcloud secrets versions add $Name --project $ProjectId --data-file $tempPath --quiet

    # Keep only the newest version enabled so routine deploys stay inside the
    # Secret Manager free-tier allowance. Disabled versions remain recoverable.
    $enabledVersions = @(& $script:gcloudCommand secrets versions list $Name --project $ProjectId --filter 'state=enabled' --sort-by '~createTime' --format 'value(name)')
    foreach ($oldVersion in ($enabledVersions | Select-Object -Skip 1)) {
      Invoke-Gcloud secrets versions disable $oldVersion --secret $Name --project $ProjectId --quiet
    }
  }
  finally {
    if (Test-Path -LiteralPath $tempPath) {
      Remove-Item -LiteralPath $tempPath -Force
    }
  }
}

$configuration = Read-DotEnv -Path $envPath
$required = @('DATABASE_URL', 'DIRECT_URL')
foreach ($name in $required) {
  if (-not $configuration.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($configuration[$name])) {
    throw "Variavel obrigatoria ausente em ${envPath}: $name"
  }
}

$secretNames = @{
  DATABASE_URL = "$Service-database-url"
  DIRECT_URL = "$Service-direct-url"
  JWT_SECRET = "$Service-jwt-secret"
}

Push-Location $repoRoot
try {
  Invoke-Gcloud config set project $ProjectId --quiet
  Invoke-Gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com --project $ProjectId --quiet

  foreach ($name in $required) {
    Publish-Secret -Name $secretNames[$name] -Value $configuration[$name]
  }

  $jwtSecret = [string]$configuration['JWT_SECRET']
  $jwtIsPlaceholder = [string]::IsNullOrWhiteSpace($jwtSecret) -or $jwtSecret -match 'replace-with|changeme|YOUR_|SEU_'
  $existingSecrets = @(& $gcloudCommand secrets list --project $ProjectId --format 'value(name)')
  $jwtSecretExists = $secretNames.JWT_SECRET -in $existingSecrets

  if (-not $jwtIsPlaceholder) {
    Publish-Secret -Name $secretNames.JWT_SECRET -Value $jwtSecret
  }
  elseif (-not $jwtSecretExists) {
    $randomBytes = [byte[]]::new(48)
    $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()
    try {
      $randomGenerator.GetBytes($randomBytes)
    }
    finally {
      $randomGenerator.Dispose()
    }
    Publish-Secret -Name $secretNames.JWT_SECRET -Value ([Convert]::ToBase64String($randomBytes))
    Write-Host 'JWT_SECRET local era um placeholder; um segredo seguro foi gerado no Secret Manager.'
  }
  else {
    Write-Host 'JWT_SECRET local era um placeholder; mantendo o segredo ja existente no Secret Manager.'
  }

  $projectNumber = (& $gcloudCommand projects describe $ProjectId --format 'value(projectNumber)').Trim()
  if ($LASTEXITCODE -ne 0 -or -not $projectNumber) {
    throw 'Nao foi possivel obter o numero do projeto.'
  }
  $runtimeIdentity = "$projectNumber-compute@developer.gserviceaccount.com"

  foreach ($secretName in $secretNames.Values) {
    Invoke-Gcloud secrets add-iam-policy-binding $secretName --project $ProjectId --member "serviceAccount:$runtimeIdentity" --role roles/secretmanager.secretAccessor --quiet
  }

  $plainVariables = "NODE_ENV=production,FRONTEND_URL=$FrontendUrl,JWT_EXPIRES_IN=7d"
  $secretVariables = "DATABASE_URL=$($secretNames.DATABASE_URL):latest,DIRECT_URL=$($secretNames.DIRECT_URL):latest,JWT_SECRET=$($secretNames.JWT_SECRET):latest"

  Invoke-Gcloud run deploy $Service `
    --project $ProjectId `
    --region $Region `
    --source . `
    --allow-unauthenticated `
    --cpu 1 `
    --memory 512Mi `
    --min-instances 0 `
    --max-instances 1 `
    --concurrency 40 `
    --timeout 30 `
    --port 8080 `
    --cpu-throttling `
    --set-env-vars $plainVariables `
    --set-secrets $secretVariables `
    --startup-probe 'httpGet.path=/api/v1/health,httpGet.port=8080,timeoutSeconds=3,periodSeconds=5,failureThreshold=12' `
    --quiet

  $serviceUrl = (& $gcloudCommand run services describe $Service --project $ProjectId --region $Region --format 'value(status.url)').Trim()
  if ($LASTEXITCODE -ne 0 -or -not $serviceUrl) {
    throw 'Deploy concluido, mas nao foi possivel obter a URL do servico.'
  }

  Write-Host "Backend publicado em: $serviceUrl/api/v1"
  Write-Host "Health check: $serviceUrl/api/v1/health"
}
finally {
  Pop-Location
}
