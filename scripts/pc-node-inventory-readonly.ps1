#requires -Version 5.1
[CmdletBinding()]
param(
    [string]$WorkspaceRoot = (Get-Location).Path,
    [string[]]$ModelRoots = @(),
    [string]$OutputPath = ".hermes\evidence\PC_NODE_SNAPSHOT.json",
    [switch]$HashModelFiles
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-CommandInventory {
    param([string[]]$Names)

    $items = @()
    foreach ($name in $Names) {
        $resolved = @(Get-Command $name -All -ErrorAction SilentlyContinue)
        if ($resolved.Count -eq 0) {
            $items += [ordered]@{
                name = $name
                found = $false
                paths = @()
                versions = @()
            }
            continue
        }

        $paths = @(
            $resolved |
                ForEach-Object {
                    if ($_.Path) { $_.Path }
                    elseif ($_.Source) { $_.Source }
                    else { $_.Definition }
                } |
                Where-Object { $_ } |
                Select-Object -Unique
        )

        $versions = @()
        foreach ($entry in $resolved) {
            if ($entry.Version) {
                $versions += [string]$entry.Version
            }
        }

        $items += [ordered]@{
            name = $name
            found = $true
            paths = $paths
            versions = @($versions | Select-Object -Unique)
            duplicate_resolution = ($paths.Count -gt 1)
        }
    }
    return $items
}

function Get-PrivateAddressInventory {
    $items = @()
    $addresses = @(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue)
    foreach ($address in $addresses) {
        $ip = [string]$address.IPAddress
        $isPrivate = (
            $ip -like "10.*" -or
            $ip -like "192.168.*" -or
            $ip -match '^172\.(1[6-9]|2[0-9]|3[0-1])\.'
        )
        if (-not $isPrivate -and $ip -ne "127.0.0.1") {
            continue
        }
        $items += [ordered]@{
            interface_alias = [string]$address.InterfaceAlias
            address = $ip
            prefix_length = [int]$address.PrefixLength
            address_state = [string]$address.AddressState
        }
    }
    return $items
}

function Get-NvidiaInventory {
    $command = Get-Command "nvidia-smi" -ErrorAction SilentlyContinue
    if (-not $command) {
        return [ordered]@{
            found = $false
            gpus = @()
            raw_error = $null
        }
    }

    try {
        $query = & $command.Path `
            --query-gpu=name,uuid,driver_version,memory.total,memory.free,utilization.gpu,temperature.gpu `
            --format=csv,noheader,nounits 2>$null

        $gpus = @()
        foreach ($line in @($query)) {
            $parts = @($line -split ',' | ForEach-Object { $_.Trim() })
            if ($parts.Count -lt 7) { continue }
            $gpus += [ordered]@{
                name = $parts[0]
                uuid = $parts[1]
                driver_version = $parts[2]
                memory_total_mb = [int]$parts[3]
                memory_free_mb = [int]$parts[4]
                utilization_percent = [int]$parts[5]
                temperature_c = [int]$parts[6]
            }
        }

        return [ordered]@{
            found = $true
            executable = $command.Path
            gpus = $gpus
            raw_error = $null
        }
    }
    catch {
        return [ordered]@{
            found = $true
            executable = $command.Path
            gpus = @()
            raw_error = $_.Exception.Message
        }
    }
}

function Get-ModelFileInventory {
    param(
        [string[]]$Roots,
        [bool]$IncludeHashes
    )

    $extensions = @(".gguf", ".safetensors", ".bin", ".pt", ".pth")
    $items = @()

    foreach ($root in $Roots) {
        if (-not (Test-Path -LiteralPath $root -PathType Container)) {
            $items += [ordered]@{
                root = $root
                state = "MISSING"
                files = @()
            }
            continue
        }

        $files = @(
            Get-ChildItem -LiteralPath $root -File -Recurse -ErrorAction SilentlyContinue |
                Where-Object { $extensions -contains $_.Extension.ToLowerInvariant() }
        )

        $fileReports = @()
        foreach ($file in $files) {
            $record = [ordered]@{
                path = $file.FullName
                length_bytes = [int64]$file.Length
                last_write_utc = $file.LastWriteTimeUtc.ToString("o")
                sha256 = $null
            }
            if ($IncludeHashes) {
                try {
                    $record.sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
                }
                catch {
                    $record.sha256 = "HASH_ERROR"
                }
            }
            $fileReports += $record
        }

        $items += [ordered]@{
            root = (Resolve-Path -LiteralPath $root).Path
            state = "PRESENT"
            files = $fileReports
        }
    }

    return $items
}

function Get-ListeningSocketInventory {
    $items = @()
    $connections = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue)
    foreach ($connection in $connections) {
        $process = $null
        try {
            $process = Get-Process -Id $connection.OwningProcess -ErrorAction Stop
        }
        catch {
            $process = $null
        }

        $items += [ordered]@{
            local_address = [string]$connection.LocalAddress
            local_port = [int]$connection.LocalPort
            owning_process_id = [int]$connection.OwningProcess
            process_name = if ($process) { [string]$process.ProcessName } else { $null }
        }
    }
    return @($items | Sort-Object local_port, owning_process_id)
}

$computer = Get-CimInstance Win32_ComputerSystem
$operatingSystem = Get-CimInstance Win32_OperatingSystem
$processors = @(Get-CimInstance Win32_Processor)
$disks = @(Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3")
$processes = @(
    Get-Process |
        Sort-Object WorkingSet64 -Descending |
        Select-Object -First 80 |
        ForEach-Object {
            [ordered]@{
                id = [int]$_.Id
                name = [string]$_.ProcessName
                working_set_bytes = [int64]$_.WorkingSet64
                cpu_seconds = if ($null -ne $_.CPU) { [double]$_.CPU } else { $null }
                path = try { $_.Path } catch { $null }
            }
        }
)

$workspace = if (Test-Path -LiteralPath $WorkspaceRoot) {
    (Resolve-Path -LiteralPath $WorkspaceRoot).Path
}
else {
    $WorkspaceRoot
}

$report = [ordered]@{
    schema = "sirinx.pc-node.snapshot.v1"
    generated_at_utc = (Get-Date).ToUniversalTime().ToString("o")
    mode = "READ_ONLY_INVENTORY"
    secrets_read = $false
    provider_calls = $false
    package_installs = $false
    network_mutations = $false
    workspace_root = $workspace
    node = [ordered]@{
        hostname = $env:COMPUTERNAME
        manufacturer = [string]$computer.Manufacturer
        model = [string]$computer.Model
        domain = [string]$computer.Domain
        total_physical_memory_bytes = [int64]$computer.TotalPhysicalMemory
        logged_on_user_recorded = $false
        machine_guid_recorded = $false
    }
    operating_system = [ordered]@{
        caption = [string]$operatingSystem.Caption
        version = [string]$operatingSystem.Version
        build_number = [string]$operatingSystem.BuildNumber
        architecture = [string]$operatingSystem.OSArchitecture
        last_boot_utc = $operatingSystem.LastBootUpTime.ToUniversalTime().ToString("o")
        free_physical_memory_kb = [int64]$operatingSystem.FreePhysicalMemory
    }
    processors = @(
        $processors | ForEach-Object {
            [ordered]@{
                name = [string]$_.Name
                cores = [int]$_.NumberOfCores
                logical_processors = [int]$_.NumberOfLogicalProcessors
                max_clock_mhz = [int]$_.MaxClockSpeed
            }
        }
    )
    nvidia = Get-NvidiaInventory
    disks = @(
        $disks | ForEach-Object {
            [ordered]@{
                device = [string]$_.DeviceID
                size_bytes = [int64]$_.Size
                free_bytes = [int64]$_.FreeSpace
                volume_name = [string]$_.VolumeName
            }
        }
    )
    private_addresses = Get-PrivateAddressInventory
    command_inventory = Get-CommandInventory -Names @(
        "node", "npm", "npx", "pnpm", "python", "python3", "uv", "git",
        "llama-server", "llama-cli", "ollama", "docker", "jcode", "dsh",
        "serena", "tunnel-client", "nvidia-smi"
    )
    listening_sockets = Get-ListeningSocketInventory
    top_processes_by_working_set = $processes
    model_roots = Get-ModelFileInventory -Roots $ModelRoots -IncludeHashes:$HashModelFiles.IsPresent
    environment_presence = [ordered]@{
        OPENROUTER_API_KEY = [bool]$env:OPENROUTER_API_KEY
        OPENAI_API_KEY = [bool]$env:OPENAI_API_KEY
        ANTHROPIC_API_KEY = [bool]$env:ANTHROPIC_API_KEY
        GEMINI_API_KEY = [bool]$env:GEMINI_API_KEY
        DEEPSEEK_API_KEY = [bool]$env:DEEPSEEK_API_KEY
        DASHSCOPE_API_KEY = [bool]$env:DASHSCOPE_API_KEY
        ZAI_API_KEY = [bool]$env:ZAI_API_KEY
        SIRINX_LITELLM_VIRTUAL_KEY = [bool]$env:SIRINX_LITELLM_VIRTUAL_KEY
        SIRINX_OMNIROUTE_LOCAL_KEY = [bool]$env:SIRINX_OMNIROUTE_LOCAL_KEY
    }
    blockers = @(
        "OPENROUTER_KEY_ROTATION_RECEIPT_REQUIRED",
        "CANONICAL_NODE_PAIRING_UNVERIFIED",
        "TRAINING_HARDWARE_GATE_PENDING",
        "MODEL_AND_DATASET_DOWNLOAD_APPROVAL_REQUIRED",
        "MCP_TUNNEL_ACTIVATION_APPROVAL_REQUIRED"
    )
}

$outputFullPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $OutputPath))
$outputDirectory = Split-Path -Parent $outputFullPath
if (-not (Test-Path -LiteralPath $outputDirectory)) {
    New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$report | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $outputFullPath -Encoding UTF8
Write-Host "PC Node read-only snapshot written to: $outputFullPath"
Write-Host "No secret values, provider calls, package installs, or network mutations were performed."
