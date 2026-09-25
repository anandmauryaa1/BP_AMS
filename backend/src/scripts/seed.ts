import { connectToDatabase } from '../db.js';
import { User } from '../models/User.js';
import { hashPassword } from '../middleware/auth.js';

async function seed() {
  console.log('Starting Seeder...');
  await connectToDatabase();

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePassword123!';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@production.com';
  const adminEmployeeId = process.env.ADMIN_EMPLOYEE_ID || 'ADM-001';
  const adminName = process.env.ADMIN_NAME || 'System Administrator';

  const adminExists = await User.findOne({ $or: [{ role: 'ADMIN' }, { role: 'SUPER_ADMIN' }, { username: adminUsername }] });
  if (!adminExists) {
    console.log(`Creating Admin Account (${adminUsername})...`);
    const passwordHash = await hashPassword(adminPassword);
    await User.create({
      employeeId: adminEmployeeId,
      username: adminUsername,
      passwordHash,
      name: adminName,
      email: adminEmail,
      department: 'Management',
      designation: 'Head of Operations',
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    });
    console.log(`Admin created: username "${adminUsername}", password "${adminPassword}"`);
  } else {
    console.log(`Updating existing Admin account (${adminExists.username}) password & details to match .env...`);
    const passwordHash = await hashPassword(adminPassword);
    adminExists.employeeId = adminExists.employeeId || adminEmployeeId;
    adminExists.email = adminExists.email || adminEmail;
    adminExists.department = adminExists.department || 'Management';
    adminExists.designation = adminExists.designation || 'Head of Operations';
    adminExists.name = adminExists.name || adminName;
    adminExists.passwordHash = passwordHash;
    adminExists.status = 'ACTIVE';
    adminExists.mustChangePassword = false;
    await adminExists.save();
    console.log(`Admin updated: username "${adminUsername}", password "${adminPassword}"`);
  }

  const shouldSeedSample = process.env.NODE_ENV !== 'production' && process.env.INCLUDE_SAMPLE_DATA === 'true';
  if (shouldSeedSample) {
    const empExists = await User.findOne({ username: 'john' });
    if (!empExists) {
      console.log('Creating Sample Employee...');
      const passwordHash = await hashPassword('password123');
      await User.create({
        employeeId: 'EMP-101',
        username: 'john',
        passwordHash,
        name: 'John Doe',
        email: 'john.doe@company.com',
        department: 'Production',
        designation: 'Video Editor',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        mustChangePassword: false,
      });
      console.log('Sample Employee created: username "john", password "password123"');
    }
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

