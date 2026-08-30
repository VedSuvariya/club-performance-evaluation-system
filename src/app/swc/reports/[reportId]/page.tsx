import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { ReportPreview } from '@/features/reports/components/ReportPreview';
import { verifyReportAccess } from '@/features/reports/services';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export default async function SwcReportPreviewPage({ params }: PageProps) {
  const profile = await requireRole('STUDENT_WELFARE_COUNCIL');
  const { reportId } = await params;

  // Enforce granular RBAC for SWC report viewing
  const isAuthorized = await verifyReportAccess(reportId, profile.id, 'STUDENT_WELFARE_COUNCIL');
  if (!isAuthorized) {
    redirect('/swc/reports');
  }

  const userProp = {
    fullName: profile.full_name || 'SWC Officer',
    email: profile.email || '',
    role: profile.role,
  };

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ReportPreview reportId={reportId} basePath="swc" />
      </div>
    </AppShell>
  );
}
