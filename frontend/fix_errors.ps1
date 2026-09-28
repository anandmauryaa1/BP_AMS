Get-ChildItem -Path "src/app" -Recurse -Filter "error.tsx" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if (-not ($content.StartsWith("'use client'"))) {
        Set-Content -Path $_.FullName -Value ("'use client';`n" + $content)
        Write-Host "Fixed $($_.FullName)"
    }
}
