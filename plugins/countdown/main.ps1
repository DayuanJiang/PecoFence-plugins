# <pecofence.title>Countdown</pecofence.title>
# Countdown: days left until the dates listed in events.txt, in this fence's data folder.
# One date per line: "2026-12-25 Christmas". Lines starting with # are skipped.

$texts = @{
    'en'    = @{ left = 'in {0} days'; tomorrow = 'tomorrow'; today = 'today'; ago = '{0} days ago'; edit = 'Edit the list'; none = 'No dates yet'; bad = 'Not understood: {0}' }
    'zh-CN' = @{ left = '还有 {0} 天'; tomorrow = '明天'; today = '就是今天'; ago = '已过 {0} 天'; edit = '编辑清单'; none = '还没有日期'; bad = '这一行看不懂：{0}' }
}
$lang = if ($texts.ContainsKey("$env:PECOFENCE_LANGUAGE")) { "$env:PECOFENCE_LANGUAGE" } elseif ("$env:PECOFENCE_LANGUAGE" -like 'zh*') { 'zh-CN' } else { 'en' }
$t = $texts[$lang]

# Text from the file is the user's, not ours: keep it from turning into row parameters.
function Clean([string]$s) { $s -replace '\|', [char]0x00A6 -replace '::', ':' -replace '[\r\n]+', ' ' -replace '["'']', [char]0x2019 }

$data = if ($env:PECOFENCE_DATA) { $env:PECOFENCE_DATA } else { Join-Path ([IO.Path]::GetTempPath()) 'countdown' }
New-Item -ItemType Directory -Force -Path $data | Out-Null
$file = Join-Path $data 'events.txt'
if (-not (Test-Path -LiteralPath $file)) {
    $year = (Get-Date).Year
    Set-Content -LiteralPath $file -Encoding UTF8 -Value @('# One date per line: 2026-12-25 Christmas', "$year-12-25 Christmas", "$($year + 1)-01-01 New Year")
}

$today = (Get-Date).Date
$upcoming = @(); $past = @(); $bad = @()
foreach ($line in Get-Content -LiteralPath $file -Encoding UTF8) {
    $line = "$line".Trim()
    if (-not $line -or $line.StartsWith('#')) { continue }
    $date = $null
    if ($line -match '^(\d{4}-\d{2}-\d{2})\s+(.+)$') {
        try { $date = [datetime]::ParseExact($Matches[1], 'yyyy-MM-dd', [Globalization.CultureInfo]::InvariantCulture) } catch { $date = $null }
    }
    if ($null -eq $date) { $bad += ($t.bad -f (Clean $line)); continue }
    $item = [pscustomobject]@{ Days = [int]($date - $today).TotalDays; Name = Clean $Matches[2] }
    if ($item.Days -ge 0) { $upcoming += $item } else { $past += $item }
}

$open = "open=""$file"""
if (-not ($upcoming.Count + $past.Count + $bad.Count)) { "$($t.none) | $open" }
foreach ($e in ($upcoming | Sort-Object Days)) {
    $when = switch ($e.Days) { 0 { $t.today } 1 { $t.tomorrow } default { $t.left -f $e.Days } }
    $color = if ($e.Days -le 1) { ' color=green' } else { '' }
    "$($e.Name)  $when | $open$color"
}
foreach ($e in ($past | Sort-Object Days -Descending)) { "$($e.Name)  $($t.ago -f (-$e.Days)) | $open color=gray" }
foreach ($b in $bad) { "$b | $open color=orange" }
'---'
"$($t.edit) | $open"
