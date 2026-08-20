$ErrorActionPreference = "Stop"

$issues = 0
$albumCount = 0

Get-ChildItem -LiteralPath $PSScriptRoot -Directory |
Where-Object {
    Test-Path -LiteralPath (
        Join-Path $_.FullName "info.json"
    )
} |
ForEach-Object {
    $albumCount++
    $folder = $_.Name
    $infoPath = Join-Path $_.FullName "info.json"

    try {
        $infoJson = Get-Content `
            -LiteralPath $infoPath `
            -Raw `
            -Encoding utf8 |
        ConvertFrom-Json
    }
    catch {
        Write-Host "[ERROR] Invalid info.json: $folder"
        $issues++
        return
    }

    $coverFiles = @(
        Get-ChildItem `
            -LiteralPath $_.FullName `
            -File |
        Where-Object {
            $_.Name -like "cover.*"
        }
    )

    Write-Host ""
    Write-Host "Folder: $folder"
    Write-Host "Cover in info.json: $($infoJson.cover)"
    Write-Host "Actual cover files:"

    if ($coverFiles.Count -eq 0) {
        Write-Host "  [ERROR] No cover file found."
        $issues++
        return
    }

    foreach ($coverFile in $coverFiles) {
        Write-Host "  - $($coverFile.Name)"
    }

    $expectedCover = Join-Path `
        $_.FullName `
    ([string]$infoJson.cover)

    if (-not $infoJson.cover) {
        Write-Host "[ERROR] info.json has no cover value."
        $issues++
    }
    elseif (-not (Test-Path -LiteralPath $expectedCover)) {
        Write-Host (
            "[ERROR] Referenced cover does not exist: " +
            $infoJson.cover
        )
        $issues++
    }
    elseif ($coverFiles.Count -gt 1) {
        Write-Host (
            "[WARNING] Multiple cover files exist. " +
            "Only $($infoJson.cover) is referenced."
        )
        $issues++
    }
    else {
        Write-Host "[OK] Cover reference is valid."
    }
}

Write-Host ""
Write-Host "Albums checked: $albumCount"
Write-Host "Issues found: $issues"

if ($albumCount -eq 0) {
    throw "No album folders containing info.json were found."
}

if ($issues -gt 0) {
    throw "Cover validation found $issues issue(s)."
}

Write-Host "[OK] All album cover references are valid."