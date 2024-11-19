Write-Host "🔍 Analyzing Next.js Analyzer project..." -ForegroundColor Cyan

# Check project structure
Write-Host "
📁 Checking project structure..."
$expectedDirs = @(
    "src",
    "src/analyzers",
    "src/utils"
)

$expectedFiles = @(
    "package.json",
    "src/index.js",
    "src/analyzers/routesAnalyzer.js",
    "src/analyzers/dataAnalyzer.js",
    "src/analyzers/performanceAnalyzer.js",
    "src/utils/themes.js",
    "src/utils/logger.js",
    "src/utils/buildErrorReporter.js"
)

$missingItems = @()

foreach ($dir in $expectedDirs) {
    if (-not (Test-Path $dir)) {
        $missingItems += "Directory: $dir"
    }
}

foreach ($file in $expectedFiles) {
    if (-not (Test-Path $file)) {
        $missingItems += "File: $file"
    }
}

# Check package.json
Write-Host "
📦 Checking package.json..."
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if (-not $packageJson.type -eq "module") {
    Write-Host "❌ package.json missing 'type': 'module'" -ForegroundColor Red
}

# Check file contents
Write-Host "
🔎 Checking file contents..."
$files = Get-ChildItem -Recurse -Filter "*.js"
foreach ($file in $files) {
    $content = Get-Content $file -Raw
    if ($content -match "require\(") {
        Write-Host "❌ CommonJS require found in $($file.FullName)" -ForegroundColor Red
    }
}

if ($missingItems.Count -gt 0) {
    Write-Host "
❌ Missing items:" -ForegroundColor Red
    $missingItems | ForEach-Object { Write-Host "- $_" -ForegroundColor Red }
} else {
    Write-Host "
✅ Project structure looks good!" -ForegroundColor Green
}
