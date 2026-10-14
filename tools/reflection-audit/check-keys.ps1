# Checks that every translation key the reflection bank can emit exists in all three locales,
# and that nothing was left behind after a renaming.
#
# The bank sends translation KEYS, not sentences, so a key that is missing renders as the raw
# key in the student's face. This is the only place that can be caught before it ships.

# Resolved from this script, so it works from any working directory.
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$bank = Get-Content "$root\webapi\Services\ReflectionQuestionBank.cs" -Raw

# Keys the bank can produce, written literally.
$literal = [regex]::Matches($bank, '"(reflection-[a-z0-9-]+)"') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

# Keys it builds by interpolation: reflection-step-{x}, reflection-chip-act-{d}-{y},
# reflection-q2-count-{x}.
$generated = @(
    'reflection-step-choose', 'reflection-step-setup', 'reflection-step-solve', 'reflection-step-explain',
    'reflection-chip-act-explain-myself', 'reflection-chip-act-explain-hint', 'reflection-chip-act-explain-shown',
    'reflection-chip-act-compare-myself', 'reflection-chip-act-compare-hint', 'reflection-chip-act-compare-shown',
    'reflection-chip-act-solo-myself', 'reflection-chip-act-solo-hint', 'reflection-chip-act-solo-shown'
)

$used = ($literal + $generated) | Sort-Object -Unique

# The question the client shows when the server sends nothing usable, and the chip labels the
# bank names by hand. Kept here so the check is on what the app renders, not only on the bank.
$clientFallbacks = @('reflection-q1', 'reflection-q2-generic', 'reflection-q3', 'reflection-quick-answer')

$used = ($used + $clientFallbacks) | Sort-Object -Unique

$failures = 0

foreach ($lang in @('en', 'de', 'ja')) {
    $path = "$root\reactapp\src\assets\translations\$lang\student.json"
    $json = Get-Content $path -Raw | ConvertFrom-Json
    $keys = $json.PSObject.Properties.Name

    $missing = $used | Where-Object { $keys -notcontains $_ }
    Write-Host "$lang : $($keys.Count) keys, $($missing.Count) missing"

    foreach ($key in $missing) {
        Write-Host "   MISSING $key" -ForegroundColor Red
        $failures++
    }
}

# Nothing should still point at a key a rename left behind. Every entry here was replaced by a
# clearer one on 2026-10-12, so their presence means a locale still carries dead copy.
$stale = @(
    'reflection-chip-act-myself', 'reflection-chip-act-myself-hint', 'reflection-chip-act-shown',
    'reflection-chip-act-focus-again', 'reflection-chip-act-other-method', 'reflection-chip-act-any-fit',
    'reflection-chip-yn-yes', 'reflection-chip-yn-partly', 'reflection-chip-yn-shown',
    'reflection-q1-held-together', 'reflection-q2-explained',
    'reflection-q2-count-explained', 'reflection-q2-count-compared', 'reflection-q2-count-focus',
    'reflection-q2-decision', 'reflection-q2-self-explanation',
    'reflection-q2-method-comparison', 'reflection-q2-solve-on-own',
    # The three ways of answering became one submit button, so the button label was renamed.
    'reflection-answer-myself'
)

foreach ($lang in @('en', 'de', 'ja')) {
    $keys = (Get-Content "$root\reactapp\src\assets\translations\$lang\student.json" -Raw | ConvertFrom-Json).PSObject.Properties.Name
    foreach ($key in $stale) {
        if ($keys -contains $key) {
            Write-Host "$lang : STALE KEY $key" -ForegroundColor Yellow
            $failures++
        }
    }
}

Write-Host ''
if ($failures -eq 0) { Write-Host 'All reflection keys resolve in all three languages.' }
else { Write-Host "$failures problem(s)." -ForegroundColor Red; exit 1 }
