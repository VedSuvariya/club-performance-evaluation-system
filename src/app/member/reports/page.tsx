import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/dashboard/components';
import { ReportGeneratorForm } from '@/features/reports/components/ReportGeneratorForm';
import { ReportHistoryList } from '@/features/reports/components/ReportHistoryList';
import { getReportsHistory, ReportRecord } from '@/lib/database/reports';

export const dynamic = 'force-dynamic';

export default async function MemberReportsPage() {
  const profile = await requireRole('MEMBER');

  const userProp = {
    fullName: profile.full_name || 'Member',
    email: profile.email || '',
    role: profile.role,
  };

  // Fetch report history for this user
  let reports: ReportRecord[] = [];
  try {
    reports = await getReportsHistory({ userId: profile.id });
  } catch (err) {
    console.error('Failed to load member reports history:', err);
  }

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <SectionHeader
          title="Performance Reports"
          description="Generate and view your individual performance evaluations, task history, and club transfer records."
        />

        <div className="grid gap-8">
          <ReportGeneratorForm
            userRole="MEMBER"
            currentUserId={profile.id}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Report History
            </h3>
            <ReportHistoryList reports={reports} basePath="member" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
