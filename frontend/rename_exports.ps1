$renames = @{
  "src/app/admin/leaves/AdminLeavesClient.tsx" = @{ From = "AdminLeavesPage"; To = "AdminLeavesClient" }
  "src/app/admin/planning/AdminPlanningClient.tsx" = @{ From = "AdminPlanningPage"; To = "AdminPlanningClient" }
  "src/app/admin/projects/AdminProjectsClient.tsx" = @{ From = "AdminProjectsPage"; To = "AdminProjectsClient" }
  "src/app/admin/tasks/AdminTasksClient.tsx" = @{ From = "AdminTasksPage"; To = "AdminTasksClient" }
  "src/app/admin/channels/AdminChannelsClient.tsx" = @{ From = "AdminChannelsPage"; To = "AdminChannelsClient" }
  "src/app/admin/attendance/AdminAttendanceClient.tsx" = @{ From = "AdminAttendancePage"; To = "AdminAttendanceClient" }
  "src/app/admin/audit-logs/AdminAuditLogsClient.tsx" = @{ From = "AdminAuditLogsPage"; To = "AdminAuditLogsClient" }
  "src/app/admin/calendar/AdminCalendarClient.tsx" = @{ From = "AdminCalendarPage"; To = "AdminCalendarClient" }
  "src/app/admin/profile/AdminProfileClient.tsx" = @{ From = "AdminProfilePage"; To = "AdminProfileClient" }
  "src/app/admin/reports/AdminReportsClient.tsx" = @{ From = "AdminReportsPage"; To = "AdminReportsClient" }
  "src/app/(employee)/dashboard/EmployeeDashboardClient.tsx" = @{ From = "EmployeeDashboard"; To = "EmployeeDashboardClient" }
  "src/app/(employee)/leaves/EmployeeLeavesClient.tsx" = @{ From = "EmployeeLeavesPage"; To = "EmployeeLeavesClient" }
  "src/app/(employee)/tasks/EmployeeTasksClient.tsx" = @{ From = "EmployeeTasksPage"; To = "EmployeeTasksClient" }
  "src/app/(employee)/profile/EmployeeProfileClient.tsx" = @{ From = "EmployeeProfilePage"; To = "EmployeeProfileClient" }
  "src/app/(employee)/attendance/EmployeeAttendanceClient.tsx" = @{ From = "EmployeeAttendancePage"; To = "EmployeeAttendanceClient" }
  "src/app/manager/employees/ManagerEmployeesClient.tsx" = @{ From = "ManagerEmployeesPage"; To = "ManagerEmployeesClient" }
}

foreach ($file in $renames.Keys) {
  if (Test-Path $file) {
    $content = Get-Content $file -Raw
    $from = $renames[$file].From
    $to = $renames[$file].To
    $content = $content.Replace("export default function $from(", "export default function $to(")
    Set-Content -Path $file -Value $content -Encoding UTF8
    Write-Host "Renamed $from -> $to in $file"
  }
}
Write-Host "All function renames done"
