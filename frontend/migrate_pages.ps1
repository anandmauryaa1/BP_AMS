# This script renames existing page.tsx files to *Client.tsx and creates SSR server wrapper page.tsx files
# for all admin/employee/manager/reports pages

$pages = @(
  @{
    Dir = "src/app/admin/leaves"
    ClientName = "AdminLeavesClient"
    Title = "Leave Management — BP AMS"
    Desc = "Review and approve employee leave requests."
    ServerFetchers = @"
  const [leaves, employees] = await Promise.all([
    getLeaves(),
    getEmployees(),
  ]);
  return <ClientComp initialLeaves={leaves} initialEmployees={employees} />;
"@
    Imports = "import { getLeaves, getEmployees } from '@/lib/server-api';"
    Props = "initialLeaves={leaves} initialEmployees={employees}"
  },
  @{
    Dir = "src/app/admin/planning"
    ClientName = "AdminPlanningClient"
    Title = "Production Planning — BP AMS"
    Desc = "Manage daily, weekly, and monthly production plans."
    Imports = "import { getChannels, getEmployees, getTasks, getDailyPlans } from '@/lib/server-api';"
    Props = "initialChannels={channels} initialEmployees={employees} initialTasks={tasks} initialDailyPlans={dailyPlans}"
    ServerFetchers = @"
  const today = new Date().toISOString().split('T')[0];
  const [channels, employees, tasks, dailyPlans] = await Promise.all([
    getChannels(),
    getEmployees(),
    getTasks(),
    getDailyPlans(today),
  ]);
  return <ClientComp initialChannels={channels} initialEmployees={employees} initialTasks={tasks} initialDailyPlans={dailyPlans} />;
"@
  },
  @{
    Dir = "src/app/admin/projects"
    ClientName = "AdminProjectsClient"
    Title = "Projects — BP AMS"
    Desc = "Manage video production projects."
    Imports = "import { getProjects, getChannels, getEmployees } from '@/lib/server-api';"
    Props = "initialProjects={projects} initialChannels={channels} initialEmployees={employees}"
    ServerFetchers = @"
  const [projects, channels, employees] = await Promise.all([
    getProjects(),
    getChannels(),
    getEmployees(),
  ]);
  return <ClientComp initialProjects={projects} initialChannels={channels} initialEmployees={employees} />;
"@
  },
  @{
    Dir = "src/app/admin/tasks"
    ClientName = "AdminTasksClient"
    Title = "Tasks — BP AMS"
    Desc = "Manage production tasks across all projects."
    Imports = "import { getTasks, getProjects, getEmployees } from '@/lib/server-api';"
    Props = "initialTasks={tasks} initialProjects={projects} initialEmployees={employees}"
    ServerFetchers = @"
  const [tasks, projects, employees] = await Promise.all([
    getTasks(),
    getProjects(),
    getEmployees(),
  ]);
  return <ClientComp initialTasks={tasks} initialProjects={projects} initialEmployees={employees} />;
"@
  },
  @{
    Dir = "src/app/admin/channels"
    ClientName = "AdminChannelsClient"
    Title = "Channels — BP AMS"
    Desc = "Manage YouTube, Instagram, and Facebook channels."
    Imports = "import { getChannels } from '@/lib/server-api';"
    Props = "initialChannels={channels}"
    ServerFetchers = @"
  const channels = await getChannels();
  return <ClientComp initialChannels={channels} />;
"@
  },
  @{
    Dir = "src/app/admin/attendance"
    ClientName = "AdminAttendanceClient"
    Title = "Attendance — BP AMS"
    Desc = "Monitor and manage employee attendance records."
    Imports = "import { getAttendanceRecords } from '@/lib/server-api';"
    Props = "initialRecords={records}"
    ServerFetchers = @"
  const today = new Date().toISOString().split('T')[0];
  const records = await getAttendanceRecords(today);
  return <ClientComp initialRecords={records} />;
"@
  },
  @{
    Dir = "src/app/admin/audit-logs"
    ClientName = "AdminAuditLogsClient"
    Title = "Audit Logs — BP AMS"
    Desc = "Security audit trail of all administrative actions."
    Imports = "import { getAuditLogs } from '@/lib/server-api';"
    Props = "initialLogs={logs}"
    ServerFetchers = @"
  const logs = await getAuditLogs();
  return <ClientComp initialLogs={logs} />;
"@
  },
  @{
    Dir = "src/app/admin/calendar"
    ClientName = "AdminCalendarClient"
    Title = "Calendar — BP AMS"
    Desc = "Deliverable scheduling and publication calendar."
    Imports = "import { getCalendarDeliverables, getChannels, getProjects, getEmployees } from '@/lib/server-api';"
    Props = "initialDeliverables={deliverables} initialChannels={channels} initialProjects={projects} initialEmployees={employees}"
    ServerFetchers = @"
  const [deliverables, channels, projects, employees] = await Promise.all([
    getCalendarDeliverables(),
    getChannels(),
    getProjects(),
    getEmployees(),
  ]);
  return <ClientComp initialDeliverables={deliverables} initialChannels={channels} initialProjects={projects} initialEmployees={employees} />;
"@
  },
  @{
    Dir = "src/app/(employee)/dashboard"
    ClientName = "EmployeeDashboardClient"
    Title = "My Dashboard — BP AMS"
    Desc = "Your attendance, tasks, and daily work queue."
    Imports = "import { getEmployeeAttendanceToday, getCurrentWorkSession, getEmployeeDailyQueue, getMe } from '@/lib/server-api';"
    Props = "initialAttendance={attendance} initialWorkSession={ws.currentSession} initialActiveProjects={ws.activeProjects} initialQueue={queue.myQueue} initialTasksToday={queue.myTasksToday} initialUser={me}"
    ServerFetchers = @"
  const [attendance, ws, queue, me] = await Promise.all([
    getEmployeeAttendanceToday(),
    getCurrentWorkSession(),
    getEmployeeDailyQueue(),
    getMe(),
  ]);
  return <ClientComp initialAttendance={attendance} initialWorkSession={ws.currentSession} initialActiveProjects={ws.activeProjects} initialQueue={queue.myQueue} initialTasksToday={queue.myTasksToday} initialUser={me} />;
"@
  },
  @{
    Dir = "src/app/(employee)/leaves"
    ClientName = "EmployeeLeavesClient"
    Title = "My Leaves — BP AMS"
    Desc = "View and apply for leave requests."
    Imports = "import { getMyLeaves } from '@/lib/server-api';"
    Props = "initialLeaves={leaves}"
    ServerFetchers = @"
  const leaves = await getMyLeaves();
  return <ClientComp initialLeaves={leaves} />;
"@
  },
  @{
    Dir = "src/app/(employee)/tasks"
    ClientName = "EmployeeTasksClient"
    Title = "My Tasks — BP AMS"
    Desc = "Your assigned production tasks and progress."
    Imports = "import { getMyTasks } from '@/lib/server-api';"
    Props = "initialTasks={tasks}"
    ServerFetchers = @"
  const tasks = await getMyTasks();
  return <ClientComp initialTasks={tasks} />;
"@
  },
  @{
    Dir = "src/app/(employee)/profile"
    ClientName = "EmployeeProfileClient"
    Title = "My Profile — BP AMS"
    Desc = "View and update your profile information."
    Imports = "import { getMyProfile } from '@/lib/server-api';"
    Props = "initialProfile={profile}"
    ServerFetchers = @"
  const profile = await getMyProfile();
  return <ClientComp initialProfile={profile} />;
"@
  },
  @{
    Dir = "src/app/(employee)/attendance"
    ClientName = "EmployeeAttendanceClient"
    Title = "My Attendance — BP AMS"
    Desc = "View your attendance history and work sessions."
    Imports = ""
    Props = ""
    ServerFetchers = @"
  return <ClientComp />;
"@
  }
)

foreach ($page in $pages) {
  $dir = $page.Dir
  $clientName = $page.ClientName
  $origPage = "$dir/page.tsx"
  $clientFile = "$dir/$clientName.tsx"

  # Rename existing page.tsx -> ClientName.tsx (change export name)
  if (Test-Path $origPage) {
    $content = Get-Content $origPage -Raw
    # Replace export default function XxxPage() with clientName
    $oldFuncPattern = 'export default function \w+\('
    $newFunc = "export default function $clientName("
    $content = $content -replace $oldFuncPattern, $newFunc
    Set-Content -Path $clientFile -Value $content -Encoding UTF8
    Write-Host "Created client: $clientFile"
  }

  # Build server wrapper
  $serverContent = @"
import type { Metadata } from 'next';
$($page.Imports)
import $clientName from './$clientName';

export const metadata: Metadata = {
  title: '$($page.Title)',
  description: '$($page.Desc)',
};

export default async function Page() {
$($page.ServerFetchers)
}
"@

  Set-Content -Path $origPage -Value $serverContent -Encoding UTF8
  Write-Host "Created server wrapper: $origPage"
}

Write-Host "All done!"
