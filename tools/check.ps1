# Static checks of one plugin folder against AGENTS.md sections 1, 3 and 5.
# Usage: powershell -NoProfile -File tools\check.ps1 -Plugin plugins\<id> [-Base origin/main] [-PrAuthor <login>]
# Prints one line per check and ends with "RESULT: PASS" or "RESULT: FAIL" (exit code 0 or 1).
param(
    [Parameter(Mandatory = $true)][string]$Plugin,
    [string]$Base = '',
    [string]$PrAuthor = ''
)
$ErrorActionPreference = 'Stop'
$failures = 0
function Fail([string]$msg) { $script:failures++; Write-Output "FAIL: $msg" }
function Warn([string]$msg) { Write-Output "WARN: $msg" }
function Pass([string]$msg) { Write-Output "PASS: $msg" }
function Finish { if ($script:failures) { Write-Output 'RESULT: FAIL'; exit 1 } else { Write-Output 'RESULT: PASS'; exit 0 } }

$dir = (Resolve-Path $Plugin).Path
$id = Split-Path $dir -Leaf

# --- Section 1: the folder ---------------------------------------------------------------------
$allowed = @{ 'plugin.json' = 64KB; 'main.ps1' = 200KB; 'README.md' = 64KB; 'screenshot.png' = 300KB }
foreach ($f in @(Get-ChildItem -LiteralPath $dir -Recurse -Force -File)) {
    $rel = $f.FullName.Substring($dir.Length).TrimStart('\', '/')
    if (-not $allowed.ContainsKey($rel)) { Fail "file not allowed in a plugin folder: $rel"; continue }
    if ($f.Length -gt $allowed[$rel]) { Fail "$rel is $($f.Length) bytes, more than $($allowed[$rel])" }
}
foreach ($need in 'plugin.json', 'main.ps1', 'README.md') {
    if (-not (Test-Path -LiteralPath (Join-Path $dir $need))) { Fail "missing $need" }
}
if (@(Get-ChildItem -LiteralPath $dir -Recurse -Force -Directory).Count) { Fail 'a plugin folder has no subfolders' }
if ($id -notmatch '^[a-z0-9][a-z0-9-]{2,39}$') { Fail "folder name '$id' is not a valid id (a-z, 0-9 and -, 3 to 40 characters)" }
if ($failures) { Finish }
Pass "files of $id"

# --- Section 3: the manifest -------------------------------------------------------------------
try { $m = Get-Content -LiteralPath (Join-Path $dir 'plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json }
catch { Fail "plugin.json is not valid JSON: $($_.Exception.Message)"; Finish }

if ($m.id -ne $id) { Fail "plugin.json id '$($m.id)' differs from the folder name '$id'" }
if ("$($m.version)" -notmatch '^\d+\.\d+\.\d+$') { Fail "version '$($m.version)' is not x.y.z" }
if ("$($m.minPecoFence)" -notmatch '^\d+\.\d+\.\d+$') { Fail "minPecoFence '$($m.minPecoFence)' is not x.y.z" }
if (-not $m.name -or -not "$($m.name.en)".Trim()) { Fail 'name.en is missing' }
if (-not $m.description -or -not "$($m.description.en)".Trim()) { Fail 'description.en is missing' }
elseif ("$($m.description.en)".Length -gt 200) { Fail 'description.en is longer than 200 characters' }
if ("$($m.author)" -notmatch '^[A-Za-z0-9][A-Za-z0-9-]{0,38}$') { Fail "author '$($m.author)' is not a GitHub login" }
if ($m.streamable -isnot [bool]) { Fail 'streamable must be true or false' }
$p = $m.permissions
if (-not $p) { Fail 'permissions is missing'; Finish }
if ($null -eq $p.network) { Fail 'permissions.network is missing (use [] for none)' }
$hosts = @($p.network | Where-Object { $_ } | ForEach-Object { "$_".ToLowerInvariant() })
foreach ($h in $hosts) { if ($h -notmatch '^(?=.{1,253}$)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$') { Fail "network host '$h' is not a host name" } }
if (@('none', 'read', 'readwrite') -notcontains "$($p.clipboard)") { Fail 'permissions.clipboard must be none, read or readwrite' }
if (@('data', 'data+read') -notcontains "$($p.files)") { Fail 'permissions.files must be data or data+read' }
if ($p.run -isnot [bool]) { Fail 'permissions.run must be true or false' }
if ($failures) { Finish }
Pass "manifest of $id $($m.version)"

# Updates: a higher version, changed only by the plugin's author.
if ($Base) {
    $oldText = & git show "${Base}:plugins/$id/plugin.json" 2>$null
    if ($LASTEXITCODE -eq 0 -and $oldText) {
        $old = ($oldText -join "`n") | ConvertFrom-Json
        if ([version]"$($m.version)" -le [version]"$($old.version)") { Fail "version $($m.version) must be higher than $($old.version)" }
        if ($m.author -ne $old.author) { Fail "author changed from $($old.author) to $($m.author)" }
        if ($PrAuthor -and $PrAuthor -ne $old.author) { Fail "only $($old.author) can change this plugin (this pull request is by $PrAuthor)" }
        if (-not $failures) { Pass "update $($old.version) to $($m.version) by its author" }
    } elseif ($PrAuthor -and $PrAuthor -ne $m.author) {
        Fail "a new plugin comes from its author: plugin.json says $($m.author), the pull request is by $PrAuthor"
    }
}

# --- Sections 2 and 5: the script --------------------------------------------------------------
$bytes = [IO.File]::ReadAllBytes((Join-Path $dir 'main.ps1'))
if ($bytes.Length -lt 3 -or $bytes[0] -ne 0xEF -or $bytes[1] -ne 0xBB -or $bytes[2] -ne 0xBF) { Fail 'main.ps1 is not saved as UTF-8 with BOM' }
$code = [Text.Encoding]::UTF8.GetString($bytes)
$head = if ($code.Length -gt 8192) { $code.Substring(0, 8192) } else { $code }

$isStream = $head -match '<pecofence\.type>streamable</pecofence\.type>'
if ($isStream -ne [bool]$m.streamable) { Fail "streamable is $($m.streamable) in plugin.json, but the header in main.ps1 says $isStream" }
$allowsRun = $head -match '<pecofence\.allow>run</pecofence\.allow>'
if ($allowsRun -and -not $p.run) { Fail 'main.ps1 lets rows start programs, but permissions.run is false' }
if ($p.run -and -not $allowsRun) { Warn 'permissions.run is true, but main.ps1 has no run header: set it to false' }

# What the rules forbid outright, as far as plain text can show it. The review reads the rest.
$forbidden = @(
    @{ re = '(?i)\b(Invoke-Expression|iex)\b'; msg = 'runs code built at run time (Invoke-Expression)' },
    @{ re = '(?i)\[\s*scriptblock\s*\]\s*::\s*Create'; msg = 'runs code built at run time (ScriptBlock::Create)' },
    @{ re = '(?i)\s-(EncodedCommand|enc|ec)\s'; msg = 'starts an encoded command' },
    @{ re = '(?i)-Verb\s+[''"]?RunAs'; msg = 'asks for administrator rights' },
    @{ re = '(?i)\b(Register-ScheduledTask|schtasks(\.exe)?|New-Service|sc\.exe)\b'; msg = 'creates scheduled tasks or services' },
    @{ re = '(?i)CurrentVersion\\Run(Once)?\b|\\Start Menu\\Programs\\Startup'; msg = 'touches autostart' },
    @{ re = '(?i)\b(Stop-Process|taskkill)\b'; msg = 'ends processes' }
)
foreach ($c in $forbidden) { if ($code -match $c.re) { Fail "main.ps1 $($c.msg)" } }

# The registry: only the plugin's own key.
foreach ($mt in [regex]::Matches($code, '(?i)\b(HKLM|HKCU|HKCR|HKU|HKEY_[A-Z_]+|Registry)::?[^\s''"]*')) {
    if ($mt.Value -notmatch "(?i)^HKCU:\\Software\\PecoFence-plugins\\$([regex]::Escape($id))(\\|$)") { Fail "main.ps1 uses the registry outside HKCU:\Software\PecoFence-plugins\$id ($($mt.Value))" }
}

# The network: every host written in the code is declared; no network code without a host.
$netCode = '(?i)\b(Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Net\.WebClient|Net\.Http\.HttpClient|Net\.Sockets|Start-BitsTransfer|WebRequest\]::Create)\b'
$found = @([regex]::Matches($code, '(?i)\b(?:https?|wss?)://([a-z0-9.-]+)') | ForEach-Object { $_.Groups[1].Value.ToLowerInvariant().TrimEnd('.') } | Sort-Object -Unique)
foreach ($h in $found) {
    if ($hosts -notcontains $h) { Fail "main.ps1 names the host $h, which permissions.network does not declare" }
}
if (-not $hosts.Count -and $code -match $netCode) { Fail 'main.ps1 has network code, but permissions.network is empty' }
if ($hosts.Count) {
    $readme = Get-Content -LiteralPath (Join-Path $dir 'README.md') -Raw -Encoding UTF8
    foreach ($h in $hosts) { if ($readme -notmatch [regex]::Escape($h)) { Fail "README.md does not say what is sent to $h" } }
}

# The clipboard.
$clipRead = '(?i)\b(Get-Clipboard|Clipboard\]::(Get|Contains)|AddClipboardFormatListener|GetClipboardData|OpenClipboard)\b'
$clipWrite = '(?i)\b(Set-Clipboard|Clipboard\]::(Set|Clear)|SetClipboardData|EmptyClipboard)\b'
if ($p.clipboard -eq 'none' -and ($code -match $clipRead -or $code -match $clipWrite)) { Fail 'main.ps1 uses the clipboard, but permissions.clipboard is none' }
if ($p.clipboard -eq 'read' -and $code -match $clipWrite) { Fail 'main.ps1 writes the clipboard, but permissions.clipboard is read' }

# Files: writes go to PECOFENCE_DATA or TEMP (the run check sees what really happens).
if ($code -match '(?i)\b(Set-Content|Add-Content|Out-File|New-Item|Copy-Item|Move-Item|WriteAll(Text|Bytes|Lines))\b' -and $code -notmatch 'PECOFENCE_DATA') {
    Warn 'main.ps1 writes files but never uses PECOFENCE_DATA: writes outside it fail the run check'
}

if (-not $failures) { Pass 'script rules' }
Finish
