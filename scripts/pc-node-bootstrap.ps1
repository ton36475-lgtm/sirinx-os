[CmdletBinding()]
param(
  [ValidateSet("Plan", "Doctor")]
  [string]$Action = "Plan",

  [string]$ConfigPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($ConfigPath)) {
  $ConfigPath = Join-Path $RepoRoot "config\pc-node-model-fabric.v1.json"
}

function Get-CommandInventory {
  param([Parameter(Mandatory = $true)][string]$Name)

  $items = @(Get-Command $Name -All -ErrorAction SilentlyContinue)
  return @($items | ForEach-Object {
    [ordered]@{
      name = $_.Name
      commandType = [string]$_.CommandType
      source = [string]$_.Source
      path = if ($_.Path) { [string]$_.Path } else { $null }
      version = if ($_.Version) { [string]$_.Version } else { $null }
    }
  })
}

function Get-SafeEnvironmentState {
  param([Parameter(Mandatory = $true)][string[]]$Names)

  $state = [ordered]@{}
  foreach ($name in ($Names | Sort-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($name)) { continue }
    $value = [Environment]::GetEnvironmentVariable($name)
    $state[$name] = [ordered]@{
      present = -not [string]::IsNullOrWhiteSpace($value)
      valuePrinted = $false
    }
  }
  return $state
}

function Test-LocalTcpPort {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [int]$TimeoutMs = 350
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      return $false
    }
    $client.EndConnect($async)
    return $true
  }
  catch {
    return $false
  }
  finally {
    $client.Close()
  }
}

function Test-DshNodeVersion {
  param([string]$VersionText)

  if ([string]::IsNullOrWhiteSpace($VersionText)) { return $false }
  $clean = $VersionText.Trim().TrimStart("v")
  $parts = $clean.Split(".")
  if ($parts.Count -lt 2) { return $false }

  $major = 0
  $minor = 0
  if (-not [int]::TryParse($parts[0], [ref]$major)) { return $false }
  if (-not [int]::TryParse($parts[1], [ref]$minor)) { return $false }

  return (($major -eq 22 -and $minor -ge 19) -or $major -ge 24)
}

if (-not (Test-Path -LiteralPath $ConfigPath -PathType Leaf)) {
  throw "PC Node model-fabric config not found: $ConfigPath"
}

$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json

$credentialNames = @()
foreach ($provider in @($config.providerFamilies)) {
  $reference = [string]$provider.credentialRef
  if ($reference.StartsWith("env:")) {
    $credentialNames += $reference.Substring(4)
  }
}
foreach ($name in @(
  "SIRINX_LITELLM_VIRTUAL_KEY",
  "SIRINX_OMNIROUTE_LOCAL_KEY",
  "SIRINX_DSH_VERSION"
)) {
  $credentialNames += $name
}

$commands = @("node", "npm", "npx", "pnpm", "git", "python", "py", "uv", "jcode", "serena", "tunnel-client")
$inventory = [ordered]@{}
foreach ($command in $commands) {
  $inventory[$command] = Get-CommandInventory -Name $command
}

$nodeVersionText = $null
if (@($inventory.node).Count -gt 0) {
  try {
    $nodeVersionText = (& node --version 2>$null | Select-Object -First 1)
  }
  catch {
    $nodeVersionText = $null
  }
}

$localPorts = [ordered]@{
  deepseekHarnessWeb = 3080
  liteLlmGateway = 4000
  omniRouteGateway = 20128
  aiPassExperimental = 8787
  secureTunnelStatus = 18010
}

$portState = [ordered]@{}
if ($Action -eq "Doctor") {
  foreach ($item in $localPorts.GetEnumerator()) {
    $portState[$item.Key] = [ordered]@{
      port = $item.Value
      listening = Test-LocalTcpPort -Port $item.Value
      scope = "127.0.0.1"
    }
  }
}

$pathConflict = @($inventory.node).Count -gt 1 -or @($inventory.npm).Count -gt 1 -or @($inventory.npx).Count -gt 1

$report = [ordered]@{
  schemaVersion = "sirinx.pc-node-bootstrap-report/v1"
  observedAt = [DateTime]::UtcNow.ToString("o")
  action = $Action
  releaseState = [string]$config.releaseState
  truthState = [string]$config.truthState
  externalMutation = $false
  providerCall = $false
  packageInstall = $false
  serviceStarted = $false
  secretsPrinted = $false
  configPath = (Resolve-Path -LiteralPath $ConfigPath).Path
  config = [ordered]@{
    schemaVersion = [string]$config.schemaVersion
    laneCount = @($config.lanes).Count
    aliasCount = @($config.aliases).Count
    providerFamilyCount = @($config.providerFamilies).Count
    activationGateCount = @($config.activationGates).Count
  }
  environment = [ordered]@{
    commandInventory = $inventory
    pathConflictDetected = $pathConflict
    nodeVersion = $nodeVersionText
    nodeCompatibleWithCurrentDshSource = Test-DshNodeVersion -VersionText $nodeVersionText
    credentials = Get-SafeEnvironmentState -Names $credentialNames
  }
  localPorts = $portState
  plannedCommands = @(
    "node --test services/dev-control-api/src/pc-node-model-fabric.test.mjs",
    "npx --yes @deepseek-ai/dsh@<PINNED_VERSION> web --no-open",
    "jcode --provider-profile sirinx-governed --model sirinx-code run <task>",
    "tunnel-client doctor --profile <PINNED_SERENA_PROFILE> --explain"
  )
  activationStillRequired = @($config.activationGates)
  nextStopPoint = "NO INSTALL, PROVIDER CALL, TUNNEL START, OR PC-NODE PAIRING WAS PERFORMED"
}

$report | ConvertTo-Json -Depth 12
