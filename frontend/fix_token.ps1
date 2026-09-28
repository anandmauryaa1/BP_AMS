$old = "localStorage.getItem('auth_token') || localStorage.getItem('token')"
$new = "localStorage.getItem('auth_token')"

Get-ChildItem 'src' -Recurse -Filter '*Client.tsx' | ForEach-Object {
  $content = Get-Content $_.FullName -Raw
  if ($content -like "*$old*") {
    $content = $content.Replace($old, $new)
    Set-Content -Path $_.FullName -Value $content -Encoding UTF8
    Write-Host "Fixed: $($_.FullName)"
  }
}
Write-Host "Done"
