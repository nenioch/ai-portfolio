# Bouwt een losstaand HTML-bestand dat je gewoon kunt dubbelklikken:
# rooi-harten-kart.html.
#
# Het klooster komt uit het model in ..\rooi-harten-tilburg-3d\src (dat project
# blijft onaangeroerd). ES-modules laden niet via file://, daarom worden de
# modules hier tot een enkel <script type="module"> samengevoegd, net als in
# build.ps1 van het model. Three.js blijft van de CDN komen.

$root = $PSScriptRoot
$model = Join-Path (Split-Path $root -Parent) 'rooi-harten-tilburg-3d\src'
$src = Join-Path $root 'src'
$out = Join-Path $root 'rooi-harten-kart.html'

# volgorde = afhankelijkheidsvolgorde
$files = @()
foreach ($n in @('textures.js', 'plan.js', 'kit.js', 'klooster.js', 'kapel.js', 'exterior.js')) { $files += Join-Path $model $n }
foreach ($n in @('route.js', 'cut.js', 'interior.js', 'track.js', 'kart.js', 'ai.js', 'touch.js', 'game.js')) { $files += Join-Path $src $n }

$externals = New-Object System.Collections.Generic.List[string]
$body = New-Object System.Collections.Generic.List[string]

# import-regels, ook als ze over meerdere regels lopen
$importRx = [regex]"(?m)^[ \t]*import\s+([^;]*?)\s+from\s*'([^']+)'\s*;[ \t]*\r?\n?"

foreach ($path in $files) {
    $name = Split-Path $path -Leaf
    if (-not (Test-Path $path)) { Write-Host "ontbreekt: $path" -ForegroundColor Red; exit 1 }
    $text = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

    foreach ($m in $importRx.Matches($text)) {
        if ($m.Groups[2].Value.StartsWith('.')) { continue }   # eigen of model-module
        $line = ($m.Value.Trim() -replace '\s+', ' ')
        if (-not $externals.Contains($line)) { $externals.Add($line) }
    }
    $text = $importRx.Replace($text, '')

    # plan.js werd als namespace geimporteerd (import * as P); die maken we hier
    $planNames = $null
    if ($name -eq 'plan.js') {
        $planNames = [regex]::Matches($text, '(?m)^export\s+(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)') |
            ForEach-Object { $_.Groups[1].Value } | Select-Object -Unique
    }

    # export-sleutelwoord weghalen, de declaratie blijft staan
    $text = [regex]::Replace($text, '(?m)^export\s+(?=(const|let|var|function|class)\s)', '')

    $body.Add("// ===== $name " + ('=' * [Math]::Max(1, 60 - $name.Length)))
    $body.Add($text)
    if ($planNames) { $body.Add('const P = { ' + ($planNames -join ', ') + ' };') }
}

$css = [System.IO.File]::ReadAllText((Join-Path $src 'style.css'), [System.Text.Encoding]::UTF8)
$html = [System.IO.File]::ReadAllText((Join-Path $root 'index.html'), [System.Text.Encoding]::UTF8)
$js = ($externals -join "`r`n") + "`r`n`r`n" + ($body -join "`r`n")

$cssTag = '<link rel="stylesheet" href="./src/style.css">'
$jsTag = '<script type="module" src="./src/game.js"></script>'
if (-not $html.Contains($cssTag) -or -not $html.Contains($jsTag)) {
    Write-Host "index.html bevat de verwachte <link>- of <script>-regel niet meer" -ForegroundColor Red
    exit 1
}
$html = $html.Replace($cssTag, "<style>`r`n$css`r`n</style>")
$html = $html.Replace($jsTag, "<script type=""module"">`r`n$js`r`n</script>")

[System.IO.File]::WriteAllText($out, $html, (New-Object System.Text.UTF8Encoding($false)))
$kb = [Math]::Round((Get-Item $out).Length / 1KB)
Write-Host "rooi-harten-kart.html gebouwd ($kb kB) - dubbelklik het bestand." -ForegroundColor Green
