import 'dotenv/config';
import mongoose from 'mongoose';
import { connectToDatabase } from '../db.js';
import { hashPassword } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { Attendance } from '../models/Attendance.js';
import { WorkSession } from '../models/WorkSession.js';
import { Task } from '../models/Task.js';
import { TaskEvent } from '../models/TaskEvent.js';
import { Project } from '../models/Project.js';
import { Deliverable } from '../models/Deliverable.js';
import { ReviewEvent } from '../models/ReviewEvent.js';
import { Plan } from '../models/Plan.js';
import { Channel } from '../models/Channel.js';
import { Series } from '../models/Series.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { PasswordResetToken } from '../models/PasswordResetToken.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { EmployeeDailyReport } from '../models/EmployeeDailyReport.js';
import { EmployeeWeeklyReport } from '../models/EmployeeWeeklyReport.js';
import { EmployeeMonthlyReport } from '../models/EmployeeMonthlyReport.js';
async function cleanProduction() {
    console.log('====================================================');
    console.log('   BP_AMS PRODUCTION DATABASE CLEANUP & RESET');
    console.log('====================================================\n');
    await connectToDatabase();
    console.log('Connected to MongoDB database:', mongoose.connection.name);
    // 1. Wipe all transactional, operational, mock, and test collections
    const collectionsToWipe = [
        { name: 'Attendances', model: Attendance },
        { name: 'WorkSessions', model: WorkSession },
        { name: 'Tasks', model: Task },
        { name: 'TaskEvents', model: TaskEvent },
        { name: 'Deliverables', model: Deliverable },
        { name: 'ReviewEvents', model: ReviewEvent },
        { name: 'Projects', model: Project },
        { name: 'Plans', model: Plan },
        { name: 'Channels', model: Channel },
        { name: 'Series', model: Series },
        { name: 'LeaveRequests', model: LeaveRequest },
        { name: 'Notifications', model: Notification },
        { name: 'AuditLogs', model: AuditLog },
        { name: 'PasswordResetTokens', model: PasswordResetToken },
        { name: 'PushSubscriptions', model: PushSubscription },
        { name: 'EmployeeDailyReports', model: EmployeeDailyReport },
        { name: 'EmployeeWeeklyReports', model: EmployeeWeeklyReport },
        { name: 'EmployeeMonthlyReports', model: EmployeeMonthlyReport },
    ];
    console.log('\n--- Purging dummy & test collections ---');
    for (const { name, model } of collectionsToWipe) {
        const countBefore = await model.countDocuments();
        await model.deleteMany({});
        console.log(`[CLEANED] ${name}: removed ${countBefore} document(s).`);
    }
    // 2. Remove all dummy/sample accounts (e.g. producer_mike, creative_sarah, john, etc.)
    console.log('\n--- Purging dummy/test user accounts ---');
    const dummyUsernames = ['producer_mike', 'creative_sarah', 'john', 'employee1', 'employee2', 'editor1'];
    const dummyDeleted = await User.deleteMany({
        $or: [
            { username: { $in: dummyUsernames } },
            { email: { $exists: false } },
            { employeeId: { $exists: false } },
            { role: 'EMPLOYEE' },
        ],
    });
    console.log(`[CLEANED] Removed ${dummyDeleted.deletedCount} dummy/test user account(s).`);
    // 3. Ensure clean single Production Super Administrator
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!';
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@blindarea.local';
    const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || 'ADM-001';
    const adminName = process.env.ADMIN_NAME || 'Operations Super Administrator';
    console.log(`\n--- Configuring Clean Production Administrator ---`);
    // Remove any conflicting accounts for this admin identity
    await User.deleteMany({
        $or: [
            { username: adminUsername },
            { email: adminEmail },
            { employeeId: adminEmployeeId },
        ],
    });
    const passwordHash = await hashPassword(adminPassword);
    const adminUser = await User.create({
        employeeId: adminEmployeeId,
        username: adminUsername,
        passwordHash,
        name: adminName,
        email: adminEmail,
        department: 'Management',
        designation: 'Head of Operations & Production',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
    });
    console.log(`[READY] Production Administrator configured:`);
    console.log(`  - Employee ID: ${adminUser.employeeId}`);
    console.log(`  - Username:    ${adminUser.username}`);
    console.log(`  - Email:       ${adminUser.email}`);
    console.log(`  - Name:        ${adminUser.name}`);
    console.log(`  - Role:        ${adminUser.role}`);
    console.log(`  - Status:      ${adminUser.status}`);
    // Also clean up any other remaining user accounts so ONLY production admins remain
    const remainingUsers = await User.find({});
    console.log(`\nRemaining verified users in database (${remainingUsers.length}):`);
    for (const u of remainingUsers) {
        console.log(`  - [${u.role}] ${u.username} (${u.name} | ${u.email || 'N/A'})`);
    }
    // Delete helper/temp scripts
    console.log('\n====================================================');
    console.log('   PRODUCTION DATABASE IS COMPLETELY CLEAN & READY!  ');
    console.log('====================================================\n');
    process.exit(0);
}
cleanProduction().catch((err) => {
    console.error('Database cleanup failed:', err);
    process.exit(1);
});
