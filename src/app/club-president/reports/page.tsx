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
  description: string | null;
}

interface MemberInfo {
  id: string;
  fullName: string;
  email: string;
  clubId: string;
}

interface MembershipWithUser {
  status: string;
  user: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
}

export default async function PresidentReportsPage() {
  const profile = await requireRole('CLUB_PRESIDENT');

  const userProp = {
    fullName: profile.full_name || 'President',
    email: profile.email || '',
    role: profile.role,
  };

  const supabase = await createSupabaseServerClient();

  // Fetch president's club
  let presidentClub: ClubInfo | null = null;
  let membersList: MemberInfo[] = [];
  let reports: ReportRecord[] = [];

  try {
    const { data: club } = await supabase
      .from('clubs')
      .select('id, name, description')
      .eq('club_president_id', profile.id)
      .maybeSingle();

    presidentClub = club as ClubInfo | null;

    if (presidentClub) {
      // Fetch active members in president's club
      const { data: memberships } = await supabase
        .from('memberships')
        .select(`
          status,
          user:users (
            id,
            email,
            full_name
          )
        `)
        .eq('club_id', presidentClub.id)
        .eq('status', 'ACTIVE');

      membersList = ((memberships as unknown as MembershipWithUser[]) || []).map((m) => ({
        id: m.user?.id || '',
        fullName: m.user?.full_name || 'Unknown Member',
        email: m.user?.email || '',
        clubId: presidentClub!.id,
      }));

      // Fetch reports generated for or by this club
      reports = await getReportsHistory({ clubId: presidentClub.id });
    }
  } catch (err) {
    console.error('Failed to load club president reports context:', err);
  }

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <SectionHeader
          title="Club Performance Reports"
          description="Access individual member performance reviews and aggregate club-level statistics."
        />

        {!presidentClub ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
            <h3 className="text-base font-semibold">No Managed Club Found</h3>
            <p className="mt-1 text-sm">
              You are currently not registered as the Club President of any active club. Please contact the Student Welfare Council to configure your president profile.
            </p>
          </div>
        ) : (
          <div className="grid gap-8">
            <ReportGeneratorForm
              userRole="CLUB_PRESIDENT"
              currentUserId={profile.id}
              leadClubId={presidentClub.id}
              members={membersList}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Report History
              </h3>
              <ReportHistoryList reports={reports} basePath="club-president" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
