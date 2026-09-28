# Patch each client file to accept initialProps and use them for initial state

# Generic patcher: inserts a Props interface before the function and updates useState calls
function Patch-ClientFile {
  param(
    [string]$FilePath,
    [string]$FuncName,
    [hashtable]$Props  # key=varName, value=stateInit e.g. @{tasks="any[]"}
  )

  if (-not (Test-Path $FilePath)) {
    Write-Host "SKIP (not found): $FilePath"
    return
  }

  $content = Get-Content $FilePath -Raw

  # Build Props interface
  $propsLines = $Props.Keys | ForEach-Object { "  initial$(([string]$_).Substring(0,1).ToUpper() + ([string]$_).Substring(1))?: $($Props[$_])[];" }
  $propsInterface = "interface Props {`n" + ($propsLines -join "`n") + "`n}"

  # Build destructured param with defaults
  $params = $Props.Keys | ForEach-Object { "initial$(([string]$_).Substring(0,1).ToUpper() + ([string]$_).Substring(1)) = []" }
  $paramStr = "{ " + ($params -join ", ") + " }: Props"

  # Replace function signature
  $content = $content -replace "export default function $FuncName\(\)", "$propsInterface`n`nexport default function $FuncName($paramStr)"

  # Replace useState<any[]>([]) for each prop
  foreach ($varName in $Props.Keys) {
    $capVar = $varName.Substring(0,1).ToUpper() + $varName.Substring(1)
    $initName = "initial$capVar"
    # Replace: const [varName, setVarName] = useState<any[]>([]);
    $content = $content -replace "const \[$varName, set$capVar\] = useState<any\[\]>\(\[\]\)", "const [$varName, set$capVar] = useState<any[]>($initName)"
    # Replace loading: useState(true) -> useState(initialX.length === 0)
  }

  Set-Content -Path $FilePath -Value $content -Encoding UTF8
  Write-Host "Patched: $FilePath"
}

# Admin Attendance
Patch-ClientFile -FilePath "src/app/admin/attendance/AdminAttendanceClient.tsx" `
  -FuncName "AdminAttendanceClient" `
  -Props @{ records = "any" }

# Admin Projects (already has initialProjects param in original code)
# Just need to fix loading state
$f = "src/app/admin/projects/AdminProjectsClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function AdminProjectsClient\(\{`n  initialProjects = \[\],`n  initialChannels = \[\],`n  initialEmployees = \[\],`n\}: \{`n  initialProjects\?: IProject\[\];`n  initialChannels\?: any\[\];`n  initialEmployees\?: any\[\];`n\} = \{\}\)", "export default function AdminProjectsClient({`n  initialProjects = [],`n  initialChannels = [],`n  initialEmployees = [],`n}: {`n  initialProjects?: IProject[];`n  initialChannels?: any[];`n  initialEmployees?: any[];`n})"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Fixed AdminProjectsClient signature"
}

# Admin Channels
$f = "src/app/admin/channels/AdminChannelsClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function AdminChannelsClient\(\)", "export default function AdminChannelsClient({ initialChannels = [] }: { initialChannels?: any[] })"
  $c = $c -replace "const \[channels, setChannels\] = useState<IChannel\[\]>\(\[\]\);", "const [channels, setChannels] = useState<IChannel[]>(initialChannels as IChannel[]);"
  $c = $c -replace "const \[loading, setLoading\] = useState\(true\);", "const [loading, setLoading] = useState(initialChannels.length === 0);"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched AdminChannelsClient"
}

# Admin Audit Logs
$f = "src/app/admin/audit-logs/AdminAuditLogsClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function AdminAuditLogsClient\(\)", "export default function AdminAuditLogsClient({ initialLogs = [] }: { initialLogs?: any[] })"
  $c = $c -replace "const \[logs, setLogs\] = useState<IAuditLog\[\]>\(\[\]\);", "const [logs, setLogs] = useState<IAuditLog[]>(initialLogs as IAuditLog[]);"
  $c = $c -replace "const \[isLoading, setIsLoading\] = useState\(true\);", "const [isLoading, setIsLoading] = useState(initialLogs.length === 0);"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched AdminAuditLogsClient"
}

# Admin Tasks
$f = "src/app/admin/tasks/AdminTasksClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function AdminTasksClient\(\)", "export default function AdminTasksClient({ initialTasks = [], initialProjects = [], initialEmployees = [] }: { initialTasks?: any[]; initialProjects?: any[]; initialEmployees?: any[] })"
  $c = $c -replace "const \[tasks, setTasks\] = useState<any\[\]>\(\[\]\);", "const [tasks, setTasks] = useState<any[]>(initialTasks);"
  $c = $c -replace "const \[projects, setProjects\] = useState<any\[\]>\(\[\]\);", "const [projects, setProjects] = useState<any[]>(initialProjects);"
  $c = $c -replace "const \[employees, setEmployees\] = useState<any\[\]>\(\[\]\);", "const [employees, setEmployees] = useState<any[]>(initialEmployees);"
  $c = $c -replace "const \[loading, setLoading\] = useState\(true\);", "const [loading, setLoading] = useState(initialTasks.length === 0);"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched AdminTasksClient"
}

# Admin Calendar
$f = "src/app/admin/calendar/AdminCalendarClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function AdminCalendarClient\(\)", "export default function AdminCalendarClient({ initialDeliverables = [], initialChannels = [], initialProjects = [], initialEmployees = [] }: { initialDeliverables?: any[]; initialChannels?: any[]; initialProjects?: any[]; initialEmployees?: any[] })"
  $c = $c -replace "const \[deliverables, setDeliverables\] = useState<any\[\]>\(\[\]\);", "const [deliverables, setDeliverables] = useState<any[]>(initialDeliverables);"
  $c = $c -replace "const \[channels, setChannels\] = useState<any\[\]>\(\[\]\);", "const [channels, setChannels] = useState<any[]>(initialChannels);"
  $c = $c -replace "const \[projects, setProjects\] = useState<any\[\]>\(\[\]\);", "const [projects, setProjects] = useState<any[]>(initialProjects);"
  $c = $c -replace "const \[employees, setEmployees\] = useState<any\[\]>\(\[\]\);", "const [employees, setEmployees] = useState<any[]>(initialEmployees);"
  $c = $c -replace "const \[loading, setLoading\] = useState\(true\);", "const [loading, setLoading] = useState(initialDeliverables.length === 0);"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched AdminCalendarClient"
}

# Employee Leaves
$f = "src/app/(employee)/leaves/EmployeeLeavesClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $funcPattern = "export default function EmployeeLeavesClient\(\)"
  $c = $c -replace $funcPattern, "export default function EmployeeLeavesClient({ initialLeaves = [] }: { initialLeaves?: any[] })"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched EmployeeLeavesClient signature"
}

# Employee Tasks
$f = "src/app/(employee)/tasks/EmployeeTasksClient.tsx"
if (Test-Path $f) {
  $c = Get-Content $f -Raw
  $c = $c -replace "export default function EmployeeTasksClient\(\)", "export default function EmployeeTasksClient({ initialTasks = [] }: { initialTasks?: any[] })"
  Set-Content -Path $f -Value $c -Encoding UTF8
  Write-Host "Patched EmployeeTasksClient signature"
}

Write-Host "All patches applied!"
