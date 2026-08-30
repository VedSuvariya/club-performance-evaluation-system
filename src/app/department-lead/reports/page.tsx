import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/dashboard/components';
import { ReportGeneratorForm } from '@/features/reports/components/ReportGeneratorForm';
import { ReportHistoryList } from '@/features/reports/components/ReportHistoryList';
import { getReportsHistory, ReportRecord } from '@/lib/database/reports';
import { getLeadClub, getClubMembersWithStats } from '@/lib/database/department-lead';

export const dynamic = 'force-dynamic';

interface LeadClubInfo {
  id: string;
  name: string;
  description: string | null;
}

interface MemberInfo {
  id: string;
  fullName: string;
  email: string;
  clubId: string;
}

export default async function LeadReportsPage() {
  const profile = await requireRole('DEPARTMENT_LEAD');

  const userProp = {
    fullName: profile.full_name || 'Lead',
    email: profile.email || '',
    role: profile.role,
  };

  // Fetch managed club
  let leadClub: LeadClubInfo | null = null;
  let membersList: MemberInfo[] = [];
  let reports: ReportRecord[] = [];

  try {
    const rawClub = await getLeadClub(profile.id);
    leadClub = rawClub as LeadClubInfo | null;
    if (leadClub) {
      const activeClub = leadClub;
      // Fetch club members for the selection dropdown
      const activeMembers = await getClubMembersWithStats(activeClub.id);
      membersList = activeMembers.map((m) => ({
        id: m.id,
        fullName: m.fullName,
        email: m.email,
        clubId: activeClub.id,
      }));

      // Fetch reports generated for or by this club
      reports = await getReportsHistory({ clubId: activeClub.id });
    }
  } catch (err) {
    console.error('Failed to load department lead reports context:', err);
  }

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <SectionHeader
          title="Club Performance Reports"
          description="Generate and export performance evaluations for members and summary statistics for your department."
        />

        {!leadClub ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <h3 className="text-base font-semibold">No Managed Club Found</h3>
            <p className="mt-1 text-sm">
              You are currently not registered as the Department Lead of any active club. Please contact the Student Welfare Council to configure your department profile.
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            <ReportGeneratorForm
              userRole="DEPARTMENT_LEAD"
              currentUserId={profile.id}
              leadClubId={leadClub.id}
              members={membersList}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Report History
              </h3>
              <ReportHistoryList reports={reports} basePath="department-lead" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
