import { requireRole } from '@/lib/permissions';
import { AppShell } from '@/components/layout/AppShell';
import { ReportPreview } from '@/features/reports/components/ReportPreview';
import { verifyReportAccess } from '@/features/reports/services';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ reportId: string }>;
}

export default async function LeadReportPreviewPage({ params }: PageProps) {
  const profile = await requireRole('DEPARTMENT_LEAD');
  const { reportId } = await params;

  // Enforce granular RBAC for Department Lead report viewing
  const isAuthorized = await verifyReportAccess(reportId, profile.id, 'DEPARTMENT_LEAD');
  if (!isAuthorized) {
    redirect('/department-lead/reports');
  }

  const userProp = {
    fullName: profile.full_name || 'Lead',
    email: profile.email || '',
    role: profile.role,
  };

  return (
    <AppShell role={profile.role} user={userProp}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ReportPreview reportId={reportId} basePath="department-lead" />
      </div>
    </AppShell>
  );
}
