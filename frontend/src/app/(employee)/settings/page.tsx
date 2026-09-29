import EmployeeSettingsClient from './EmployeeSettingsClient';

export const metadata = {
  title: 'Employee Personal Settings | BP AMS',
  description: 'Manage notification preferences, visual theme, bank account details & account security.',
};

export default function EmployeeSettingsPage() {
  return <EmployeeSettingsClient />;
}
