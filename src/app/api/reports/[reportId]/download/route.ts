import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/permissions';
import { getReportById } from '@/lib/database/reports';
import { verifyReportAccess } from '@/features/reports/services';
import { createSupabaseServerClient } from '@/lib/database/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reportId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthenticated', { status: 401 });
    }

    const { reportId } = await context.params;
    if (!reportId) {
      return new NextResponse('Report ID is required', { status: 400 });
    }

    // 1. Fetch report details
    const report = await getReportById(reportId);
    if (!report) {
      return new NextResponse('Report not found', { status: 404 });
    }

    if (report.status?.toUpperCase() !== 'COMPLETED') {
      return new NextResponse('Report is not ready for download', { status: 400 });
    }

    // 2. Verify authorization
    const isAuthorized = await verifyReportAccess(reportId, user.id, user.role);
    if (!isAuthorized) {
      return new NextResponse('Unauthorized', { status: 403 });
    }

    // 3. Download the PDF from storage
    const supabase = await createSupabaseServerClient();
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('reports')
      .download(report.storagePath);

    if (downloadError || !fileBlob) {
      console.error('Failed to download report PDF from storage:', downloadError);
      return new NextResponse('Failed to retrieve PDF file from storage', { status: 500 });
    }

    // Determine download filename
    const filename = `${report.reportType}_${reportId}.pdf`;

    // 4. Stream/Return the PDF content directly to the client
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);

    return new Response(fileBlob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Error downloading report:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return new NextResponse(message, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
