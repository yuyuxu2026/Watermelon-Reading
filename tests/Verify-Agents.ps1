$ErrorActionPreference = 'Stop'

$agentsPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'AGENTS.md'
$content = [System.IO.File]::ReadAllText($agentsPath)
$lines = ($content -replace "`r`n", "`n").TrimEnd("`n").Split("`n")
$expected = @(
    '\u6ce8\u610f\u4e8b\u9879:',
    '1.\u6bcf\u6b21\u6539\u52a8\u5b8c\u6210\u540e,\u90fd\u5fc5\u987b\u521b\u5efa\u4e00\u4e2a\u5bf9\u5e94\u7684Git commit,\u4ee5\u4fbf\u540e\u7eed\u8ffd\u8e2a\u548c\u56de\u6eda',
    '2.\u6bcf\u6b21\u6539\u52a8\u540e,\u90fd\u5fc5\u987b\u7f16\u5199\u6216\u8005\u66f4\u65b0\u76f8\u5173\u6d4b\u8bd5,\u5e76\u5728\u4ea4\u4ed8\u7ed9\u7528\u6237\u524d,\u786e\u4fdd\u6240\u6709\u6d4b\u8bd5\u548c\u9a8c\u8bc1\u5168\u90e8\u901a\u8fc7'
) | ForEach-Object { [regex]::Unescape($_) }

if ($lines.Count -ne $expected.Count) {
    throw 'AGENTS.md must contain the heading and both requested rules.'
}
for ($i = 0; $i -lt $expected.Count; $i++) {
    if ($lines[$i] -cne $expected[$i]) {
        throw "AGENTS.md line $($i + 1) differs from the requested content."
    }
}
Write-Output 'PASS: AGENTS.md contains the requested heading and both rules.'
