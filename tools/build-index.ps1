# Builds index.json, the list PecoFence reads: every plugin with its manifest and, for each file,
# its SHA-256 and an address pinned to this commit, so only the reviewed version installs.
# A plugin named in disabled.json is listed with "disabled" and its reason; PecoFence turns it off.
# Usage: pwsh -NoProfile -File tools/build-index.ps1 -Commit <sha> -Out index.json
param(
    [Parameter(Mandatory = $true)][string]$Commit,
    [Parameter(Mandatory = $true)][string]$Out,
    [string]$Repo = 'DayuanJiang/PecoFence-plugins'
)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$disabled = @{}
$disabledFile = Join-Path $root 'disabled.json'
if (Test-Path $disabledFile) {
    (Get-Content $disabledFile -Raw -Encoding UTF8 | ConvertFrom-Json).PSObject.Properties | ForEach-Object { $disabled[$_.Name] = "$($_.Value)" }
}
$plugins = foreach ($dir in Get-ChildItem (Join-Path $root 'plugins') -Directory | Sort-Object Name) {
    $m = Get-Content (Join-Path $dir.FullName 'plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $files = foreach ($f in Get-ChildItem $dir.FullName -File | Sort-Object Name) {
        [ordered]@{
            name   = $f.Name
            size   = $f.Length
            sha256 = (Get-FileHash $f.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            url    = "https://raw.githubusercontent.com/$Repo/$Commit/plugins/$($dir.Name)/$($f.Name)"
        }
    }
    $entry = [ordered]@{
        id           = $m.id
        version      = $m.version
        name         = $m.name
        description  = $m.description
        author       = $m.author
        minPecoFence = $m.minPecoFence
        streamable   = [bool]$m.streamable
        permissions  = $m.permissions
        files        = @($files)
    }
    if ($disabled.ContainsKey($m.id)) { $entry.disabled = $disabled[$m.id] }
    $entry
}
$index = [ordered]@{ format = 1; commit = $Commit; plugins = @($plugins) }
$index | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Out -Encoding UTF8
Write-Output "index.json: $(@($plugins).Count) plugins at $Commit"
