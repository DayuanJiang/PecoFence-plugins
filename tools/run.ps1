# Runs one plugin the way PecoFence does and reports what it costs and what it does
# (AGENTS.md sections 5 and 6). Windows only. It starts the plugin's script with no window, the
# PECOFENCE_* environment and UTF-8 output, watches the script and its child processes, then
# compares what happened with plugin.json.
# Usage: powershell -NoProfile -File tools\run.ps1 -Plugin plugins\<id> [-Seconds 120] [-Json result.json]
# Ends with "RESULT: PASS" or "RESULT: FAIL" (exit code 0 or 1); WARN lines are the soft rules.
param(
    [Parameter(Mandatory = $true)][string]$Plugin,
    [int]$Seconds = 120,
    [string]$Json = ''
)
$ErrorActionPreference = 'Stop'
$failures = 0
$result = [ordered]@{}
function Fail([string]$msg) { $script:failures++; Write-Output "FAIL: $msg" }
function Warn([string]$msg) { Write-Output "WARN: $msg" }
function Pass([string]$msg) { Write-Output "PASS: $msg" }

$dir = (Resolve-Path $Plugin).Path
$id = Split-Path $dir -Leaf
$m = Get-Content -LiteralPath (Join-Path $dir 'plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$hosts = @($m.permissions.network | Where-Object { $_ } | ForEach-Object { "$_".ToLowerInvariant() })

$work = Join-Path ([IO.Path]::GetTempPath()) "pfplugin-run-$id"
$data = Join-Path $work 'data'
New-Item -ItemType Directory -Force -Path $data | Out-Null

# --- What the system looks like before ---------------------------------------------------------
function RunKeys {
    $keys = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce',
            'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce'
    foreach ($k in $keys) {
        if (Test-Path $k) { (Get-ItemProperty $k).PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { "$k|$($_.Name)|$($_.Value)" } }
    }
}
function Tasks { @(Get-ScheduledTask -ErrorAction SilentlyContinue | ForEach-Object { "$($_.TaskPath)$($_.TaskName)" }) }
function Services { @(Get-Service -ErrorAction SilentlyContinue | ForEach-Object { $_.Name }) }
$watchRoots = @($env:USERPROFILE)
# Folders Windows' own background components write to at any time (certificate caches, app
# packages); a plugin writing there is caught by the review reading its code instead.
$skip = @($work, [IO.Path]::GetTempPath(), (Join-Path $env:LOCALAPPDATA 'Microsoft'), (Join-Path $env:LOCALAPPDATA 'Temp'),
          (Join-Path $env:LOCALAPPDATA 'Packages'), (Join-Path $env:USERPROFILE 'AppData\LocalLow\Microsoft'),
          (Join-Path $env:APPDATA 'Microsoft'), $PWD.Path) | ForEach-Object { $_.TrimEnd('\') + '\' }
function Files {
    $map = @{}
    foreach ($r in $watchRoots) {
        foreach ($f in @(Get-ChildItem -LiteralPath $r -Recurse -Force -File -ErrorAction SilentlyContinue)) {
            $path = $f.FullName
            if (@($skip | Where-Object { $path.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }).Count) { continue }
            $map[$path] = "$($f.Length)|$($f.LastWriteTimeUtc.Ticks)"
        }
    }
    $map
}
$runBefore = @(RunKeys); $tasksBefore = Tasks; $servicesBefore = Services; $filesBefore = Files

# --- Start the script as PecoFence does --------------------------------------------------------
$script = Join-Path $dir 'main.ps1'
$psi = New-Object Diagnostics.ProcessStartInfo
$psi.FileName = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$psi.Arguments = "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command `"[Console]::OutputEncoding=[Text.Encoding]::UTF8; & '$($script.Replace("'", "''"))'`""
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.StandardOutputEncoding = [Text.Encoding]::UTF8
$psi.StandardErrorEncoding = [Text.Encoding]::UTF8
$psi.WorkingDirectory = $dir
foreach ($kv in @{ PECOFENCE = '1'; PECOFENCE_DATA = $data; PECOFENCE_LANGUAGE = 'en'; PECOFENCE_THEME = 'light'; PECOFENCE_FENCE = 'plugin-test'; PECOFENCE_ACTION = '' }.GetEnumerator()) {
    $psi.EnvironmentVariables[$kv.Key] = $kv.Value
}

$lines = New-Object Collections.Concurrent.ConcurrentQueue[object]
$errors = New-Object Collections.Concurrent.ConcurrentQueue[string]
$clock = [Diagnostics.Stopwatch]::StartNew()
$proc = New-Object Diagnostics.Process
$proc.StartInfo = $psi
$outEvent = Register-ObjectEvent $proc OutputDataReceived -MessageData @{ q = $lines; c = $clock } -Action {
    if ($null -ne $EventArgs.Data) { $Event.MessageData.q.Enqueue([pscustomobject]@{ t = $Event.MessageData.c.Elapsed.TotalSeconds; text = $EventArgs.Data }) }
}
$errEvent = Register-ObjectEvent $proc ErrorDataReceived -MessageData $errors -Action {
    if ($EventArgs.Data) { $Event.MessageData.Enqueue($EventArgs.Data) }
}
[void]$proc.Start()
$proc.BeginOutputReadLine()
$proc.BeginErrorReadLine()

function Tree([int]$root) {
    $all = @(Get-CimInstance Win32_Process -Property ProcessId, ParentProcessId, Name)
    $ids = @($root); $grew = $true
    while ($grew) {
        $grew = $false
        foreach ($p in $all) { if ($ids -contains $p.ParentProcessId -and $ids -notcontains $p.ProcessId) { $ids += $p.ProcessId; $grew = $true } }
    }
    $all | Where-Object { $ids -contains $_.ProcessId }
}

$limit = if ($m.streamable) { $Seconds } else { 10 }
$cpu = @{}; $peakMem = 0; $children = @{}; $remote = @{}
$restStart = if ($m.streamable) { [Math]::Min(30, $limit / 2) } else { 0 }
$cpuAtRestStart = $null
while ($clock.Elapsed.TotalSeconds -lt $limit -and -not $proc.HasExited) {
    $mem = 0
    foreach ($p in @(Tree $proc.Id)) {
        try {
            $gp = Get-Process -Id $p.ProcessId -ErrorAction Stop
            $cpu[$p.ProcessId] = $gp.TotalProcessorTime.TotalSeconds
            $mem += $gp.PrivateMemorySize64
            if ($p.ProcessId -ne $proc.Id) { $children[$p.Name] = $true }
            foreach ($c in @(Get-NetTCPConnection -OwningProcess $p.ProcessId -ErrorAction SilentlyContinue)) {
                if ($c.RemoteAddress -and $c.RemoteAddress -notmatch '^(0\.0\.0\.0|::|127\.|::1$)') { $remote["$($c.RemoteAddress)"] = $true }
            }
        } catch { }
    }
    if ($mem -gt $peakMem) { $peakMem = $mem }
    if ($null -eq $cpuAtRestStart -and $clock.Elapsed.TotalSeconds -ge $restStart) {
        $cpuAtRestStart = @{ t = $clock.Elapsed.TotalSeconds; cpu = ($cpu.Values | Measure-Object -Sum).Sum }
    }
    Start-Sleep -Milliseconds 500
}
$elapsed = $clock.Elapsed.TotalSeconds
$cpuTotal = ($cpu.Values | Measure-Object -Sum).Sum
$timedOut = -not $proc.HasExited
if ($timedOut) {
    try { $proc.StandardInput.Close() } catch { }   # what PecoFence does when the fence goes away
    [void]$proc.WaitForExit(1500)
    $endedByItself = $proc.HasExited
    if (-not $proc.HasExited) { foreach ($p in @(Tree $proc.Id)) { try { Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop } catch { } } }
}
Start-Sleep -Milliseconds 300
Unregister-Event -SourceIdentifier $outEvent.Name; Unregister-Event -SourceIdentifier $errEvent.Name
$out = @($lines.ToArray())
$err = @($errors.ToArray())

# --- What changed ------------------------------------------------------------------------------
$runAfter = @(RunKeys)
$newRun = @($runAfter | Where-Object { $runBefore -notcontains $_ })
if ($newRun.Count) { Fail "autostart entries changed: $($newRun -join '; ')" }
$newTasks = @(Tasks | Where-Object { $tasksBefore -notcontains $_ })
if ($newTasks.Count) { Fail "scheduled tasks created: $($newTasks -join ', ')" }
$newServices = @(Services | Where-Object { $servicesBefore -notcontains $_ })
if ($newServices.Count) { Fail "services created: $($newServices -join ', ')" }
$filesAfter = Files
$changed = @($filesAfter.Keys | Where-Object { $filesBefore[$_] -ne $filesAfter[$_] })
if ($changed.Count) { Fail "files written outside PECOFENCE_DATA and TEMP: $(@($changed | Select-Object -First 10) -join ', ')" }
if (-not ($newRun.Count + $newTasks.Count + $newServices.Count + $changed.Count)) { Pass 'no changes outside the plugin''s own folders' }

# The network: every address contacted belongs to a declared host.
$allowedIps = @{}
foreach ($h in $hosts) { try { foreach ($a in [Net.Dns]::GetHostAddresses($h)) { $allowedIps["$a"] = $h } } catch { } }
$contacted = @($remote.Keys)
if (-not $hosts.Count -and $contacted.Count) { Fail "connected to $($contacted -join ', ') although permissions.network is empty" }
foreach ($ip in $contacted) {
    if ($hosts.Count -and -not $allowedIps.ContainsKey($ip)) {
        $name = try { [Net.Dns]::GetHostEntry($ip).HostName } catch { 'no name' }
        Warn "connected to $ip ($name), which is not an address of a declared host (CDN addresses change; the review checks it)"
    }
}

# Programs started besides PowerShell itself.
$others = @($children.Keys | Where-Object { @('conhost.exe', 'powershell.exe') -notcontains $_ })
if ($others.Count) { Warn "started programs: $($others -join ', ')" }

# --- Soft rules --------------------------------------------------------------------------------
$first = if ($out.Count) { $out[0].t } else { $null }
$long = @($out | Where-Object { $_.text.Length -gt 300 })
$screens = @($out | Where-Object { $_.text -eq '~~~' })
$result.id = $id
$result.version = "$($m.version)"
$result.streamable = [bool]$m.streamable
$result.secondsRun = [Math]::Round($elapsed, 1)
$result.firstOutputSeconds = if ($null -ne $first) { [Math]::Round($first, 2) } else { $null }
$result.lines = $out.Count
$result.peakPrivateMB = [Math]::Round($peakMem / 1MB, 1)
$result.cpuSeconds = [Math]::Round($cpuTotal, 2)
$result.addressesContacted = $contacted
$result.programsStarted = @($children.Keys)

if ($null -eq $first) { Warn 'printed nothing' }
elseif ($first -gt 3) { Warn "first output after $([Math]::Round($first, 1)) s (limit 3 s)" }
if ($long.Count) { Warn "$($long.Count) lines longer than 300 characters" }
if ($err.Count) { Warn "wrote to standard error: $(@($err | Select-Object -First 3) -join ' / ')" }
if ($m.streamable) {
    $restSeconds = $elapsed - $cpuAtRestStart.t
    $cpuRest = if ($restSeconds -gt 1) { ($cpuTotal - $cpuAtRestStart.cpu) / $restSeconds } else { 0 }
    $screensRest = @($screens | Where-Object { $_.t -ge $cpuAtRestStart.t }).Count / [Math]::Max(1, $restSeconds)
    $result.cpuAtRestPercentOfOneCore = [Math]::Round($cpuRest * 100, 2)
    $result.screensPerSecondAtRest = [Math]::Round($screensRest, 2)
    if ($cpuRest -gt 0.01) { Warn "CPU at rest $([Math]::Round($cpuRest * 100, 2)) % of one core (limit 1 %)" }
    if ($screensRest -gt 1) { Warn "$([Math]::Round($screensRest, 2)) screens a second at rest (limit 1)" }
    if (-not $timedOut) { Warn "a streaming script ended by itself after $([Math]::Round($elapsed, 1)) s" }
    elseif (-not $endedByItself) { Warn 'did not end within a second after its input closed' }
} else {
    if ($timedOut) { Warn 'a normal script ran longer than 10 s; PecoFence ends it there' }
    if ($proc.HasExited -and $proc.ExitCode -ne 0) { Warn "exit code $($proc.ExitCode)" }
}

Write-Output ("COST: first output {0} s, peak memory {1} MB, CPU {2} s in {3} s{4}" -f $result.firstOutputSeconds, $result.peakPrivateMB, $result.cpuSeconds, $result.secondsRun,
    $(if ($m.streamable) { ", at rest $($result.cpuAtRestPercentOfOneCore) % of one core, $($result.screensPerSecondAtRest) screens/s" } else { '' }))
$result.result = if ($failures) { 'FAIL' } else { 'PASS' }
if ($Json) { $result | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $Json -Encoding UTF8 }
Write-Output "RESULT: $($result.result)"
exit ([int][bool]$failures)
