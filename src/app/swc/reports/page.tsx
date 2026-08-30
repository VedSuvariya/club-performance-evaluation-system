import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { SectionHeader } from '@/components/dashboard/components';
import { ReportGeneratorForm } from '@/features/reports/components/ReportGeneratorForm';
import { ReportHistoryList } from '@/features/reports/components/ReportHistoryList';
import { getReportsHistory, ReportRecord } from '@/lib/database/reports';
import { createSupabaseServerClient } from '@/lib/database/server';

export const dynamic = 'force-dynamic';

interface ClubInfo {
  id: string;
  name: string;
}

interface MemberInfo {
  id: string;
  fullName: string;
  email: string;
  clubId: string;
}

interface MembershipWithUser {
  club_id: string;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
}

export default async function SwcReportsPage() {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');

  const userProp = {
    fullName: profile.full_name || 'SWC Officer',
    email: profile.email || '',
    role: profile.role,
  };

  const supabase = await createSupabaseServerClient();

  // Fetch all active clubs and members
  let clubsList: ClubInfo[] = [];
  let membersList: MemberInfo[] = [];
  let reports: ReportRecord[] = [];

  try {
    const [clubsRes, membershipsRes, reportsRes] = await Promise.all([
      supabase.from('clubs').select('id, name').eq('is_active', true),
      supabase.from('memberships').select('club_id, user:users(id, email, full_name)').eq('status', 'ACTIVE'),
      getReportsHistory({}),
    ]);

    clubsList = (clubsRes.data || []) as ClubInfo[];
    membersList = ((membershipsRes.data || []) as unknown as MembershipWithUser[]).map((m) => ({
      id: m.user?.id || '',
      fullName: m.user?.full_name || 'Unknown Member',
      email: m.user?.email || '',
      clubId: m.club_id,
    }));
    reports = reportsRes;
  } catch (err) {
    console.error('Failed to load SWC reports context:', err);
  }

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <SectionHeader
          title="System-Wide Performance Reports"
          description="Access and generate performance evaluation reports for all departments, member lists, and club summary charts."
        />

        <div className="grid gap-8">
          <ReportGeneratorForm
            userRole="STUDENT_WELFARE_COUNCIL"
            currentUserId={profile.id}
            clubs={clubsList}
            members={membersList}
          />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Report History
            </h3>
            <ReportHistoryList reports={reports} basePath="swc" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
