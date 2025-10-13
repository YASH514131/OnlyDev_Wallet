Add-Type -AssemblyName System.Drawing

$outputDir = ".\build\icons"
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$sizes = @(16, 48, 128)

foreach ($size in $sizes) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $startColor = [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
    $endColor = [System.Drawing.Color]::FromArgb(255, 147, 51, 234)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $startColor, $endColor, 45)
    $graphics.FillRectangle($brush, $rect)
    
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 2)
    $graphics.DrawRectangle($borderPen, 1, 1, $size - 2, $size - 2)
    
    $fontSize = $size * 0.6
    $font = New-Object System.Drawing.Font("Arial", $fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    
    $text = "T"
    $textSize = $graphics.MeasureString($text, $font)
    $x = ($size - $textSize.Width) / 2
    $y = ($size - $textSize.Height) / 2
    
    $graphics.DrawString($text, $font, $textBrush, $x, $y)
    
    $outputPath = Join-Path $outputDir "icon$size.png"
    $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "Created: $outputPath"
}

Write-Host "Done! All icons created."
