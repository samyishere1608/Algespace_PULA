# Runs a small simulation through the API's /loadtest route and reports the verdict.
# Kept as a file so PowerShell cannot mangle the query string.
$ErrorActionPreference = 'Stop'

$file = Join-Path $env:TEMP 'lt-sse.txt'
$base = 'http://localhost:7273/loadtest'
$query = 'base=http://localhost:7273&students=2&durationSeconds=25&timeScale=1&includeAi=0&keep=0&allowRemote=0'

curl.exe -s -N "$base/run?$query" -o $file

$lines = Get-Content $file
"stream lines : " + $lines.Count

$types = ($lines | Select-String -Pattern '"type":"([a-z]+)"' -AllMatches).Matches |
    ForEach-Object { $_.Groups[1].Value } | Group-Object |
    ForEach-Object { "$($_.Name)=$($_.Count)" }
"event types  : " + ($types -join '  ')

$payloads = $lines | Where-Object { $_ -like 'data: *' } | ForEach-Object { $_.Substring(6) }

$verdict = $payloads | Select-Object -Last 1
$json = $verdict | ConvertFrom-Json

"verdict type : " + $json.type

if ($json.type -eq 'error') {
    "message      : " + $json.message
    exit 1
}

"clean        : " + $json.result.clean
"students     : " + $json.result.students
"sessions     : " + $json.result.simulation.completedSessions
"requests     : " + $json.result.summary.total
"failed       : " + $json.result.summary.failed

$data = $json.result.integrity | Where-Object { $_.id -like 'expect.*' }
"data checks  : " + $data.Count
$data | ForEach-Object { "  {0,-34} {1,-6} {2}" -f $_.id, $(if ($_.passed) { 'pass' } else { 'FAIL' }), $_.detail }
