$loadingContent = "export { default } from '@/app/loading';"
$errorContent = "export { default } from '@/app/error';"

$segments = @(
  'src/app/admin/dashboard',
  'src/app/admin/attendance',
  'src/app/admin/audit-logs',
  'src/app/admin/calendar',
  'src/app/admin/channels',
  'src/app/admin/employees',
  'src/app/admin/leaves',
  'src/app/admin/planning',
  'src/app/admin/profile',
  'src/app/admin/projects',
  'src/app/admin/reports',
  'src/app/admin/tasks',
  'src/app/(employee)/attendance',
  'src/app/(employee)/dashboard',
  'src/app/(employee)/leaves',
  'src/app/(employee)/profile',
  'src/app/(employee)/tasks',
  'src/app/manager/employees',
  'src/app/reports/daily',
  'src/app/reports/weekly',
  'src/app/reports/monthly'
)

foreach ($seg in $segments) {
  $lf = $seg + '/loading.tsx'
  $ef = $seg + '/error.tsx'
  if (-not (Test-Path $lf)) {
    New-Item -Path $lf -ItemType File -Force | Out-Null
    Set-Content -Path $lf -Value $loadingContent -Encoding UTF8
    Write-Host "Created $lf"
  }
  if (-not (Test-Path $ef)) {
    New-Item -Path $ef -ItemType File -Force | Out-Null
    Set-Content -Path $ef -Value $errorContent -Encoding UTF8
    Write-Host "Created $ef"
  }
}
Write-Host "Done"
