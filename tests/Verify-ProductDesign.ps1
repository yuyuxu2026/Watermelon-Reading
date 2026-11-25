$ErrorActionPreference = 'Stop'

$documentPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'docs/product-design.md'
if (-not (Test-Path -LiteralPath $documentPath)) {
    throw 'Product design document is missing.'
}

$content = [System.IO.File]::ReadAllText($documentPath)
$requiredHeadings = @(
    '# 西瓜阅读 MVP 产品设计',
    '## 1. 产品定位',
    '## 2. 产品目标',
    '## 3. MVP 范围',
    '## 4. 核心用户流程',
    '## 5. MVP 验收标准',
    '## 6. 暂不纳入 MVP 的功能',
    '## 7. 后续迭代方向'
)

foreach ($heading in $requiredHeadings) {
    if (-not $content.Contains($heading)) {
        throw "Missing required section: $heading"
    }
}

foreach ($term in @('UTF-8', 'GBK', '阅读位置', '书架', '只支持 `.txt` 文件')) {
    if (-not $content.Contains($term)) {
        throw "Missing required MVP detail: $term"
    }
}

Write-Output 'PASS: product design document contains the required MVP scope and sections.'
