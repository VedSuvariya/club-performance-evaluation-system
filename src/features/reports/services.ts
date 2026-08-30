import { createSupabaseServerClient } from '@/lib/database/server';
import {
  createReportRecord,
  updateReportStatus,
  getReportById,
  getClubSummaryStats,
} from '@/lib/database/reports';
import { getMemberPerformanceSummary } from '@/lib/database/performance';
import { getMemberTransferHistory, getCurrentMembership } from '@/lib/database/club-transfers';
import { getLeadClub } from '@/lib/database/department-lead';
import { generateMemberReportPDF, generateClubReportPDF } from './pdf-generator';

/**
 * Helper to fetch a Club President's managed club.
 */
async function getPresidentClub(presidentUserId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('clubs')
    .select('id, name, description')
    .eq('club_president_id', presidentUserId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Validates if the generator has permissions to request a report for the specified target.
 */
export async function validateReportGenerationAccess(params: {
  reportType: 'MEMBER_EVALUATION' | 'CLUB_SUMMARY';
  targetUserId: string | null;
  targetClubId: string | null;
  generatorId: string;
  generatorRole: string;
}): Promise<{ isAuthorized: boolean; errorReason?: string }> {
  const { reportType, targetUserId, targetClubId, generatorId, generatorRole } = params;
  const supabase = await createSupabaseServerClient();

  // 1. SWC has unrestricted access
  if (generatorRole === 'STUDENT_WELFARE_COUNCIL') {
    return { isAuthorized: true };
  }

  // 2. MEMBER access control
  if (generatorRole === 'MEMBER') {
    if (reportType !== 'MEMBER_EVALUATION') {
      return { isAuthorized: false, errorReason: 'Members can only request member evaluation reports.' };
    }
    if (targetUserId !== generatorId) {
      return { isAuthorized: false, errorReason: 'Members can only generate reports about themselves.' };
    }
    return { isAuthorized: true };
  }

  // 3. DEPARTMENT_LEAD access control
  if (generatorRole === 'DEPARTMENT_LEAD') {
    const leadClub = await getLeadClub(generatorId);
    if (!leadClub) {
      return { isAuthorized: false, errorReason: 'Department Lead is not associated with any club.' };
    }

    if (reportType === 'CLUB_SUMMARY') {
      if (targetClubId !== leadClub.id) {
        return { isAuthorized: false, errorReason: 'Department Lead can only generate reports for their own club.' };
      }
      return { isAuthorized: true };
    }

    if (reportType === 'MEMBER_EVALUATION') {
      if (!targetUserId) {
        return { isAuthorized: false, errorReason: 'Target member must be specified.' };
      }
      // Check if target member belongs to lead's club
      const { data: membership, error: memError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('club_id', leadClub.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (memError || !membership) {
        return { isAuthorized: false, errorReason: 'Target member is not active in the Department Lead\'s club.' };
      }
      return { isAuthorized: true };
    }
  }

  // 4. CLUB_PRESIDENT access control
  if (generatorRole === 'CLUB_PRESIDENT') {
    const presidentClub = await getPresidentClub(generatorId);
    if (!presidentClub) {
      return { isAuthorized: false, errorReason: 'Club President is not associated with any club.' };
    }

    if (reportType === 'CLUB_SUMMARY') {
      if (targetClubId !== presidentClub.id) {
        return { isAuthorized: false, errorReason: 'Club President can only generate reports for their own club.' };
      }
      return { isAuthorized: true };
    }

    if (reportType === 'MEMBER_EVALUATION') {
      if (!targetUserId) {
        return { isAuthorized: false, errorReason: 'Target member must be specified.' };
      }
      // Check if target member belongs to president's club
      const { data: membership, error: memError } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('club_id', presidentClub.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (memError || !membership) {
        return { isAuthorized: false, errorReason: 'Target member is not active in the Club President\'s club.' };
      }
      return { isAuthorized: true };
    }
  }

  return { isAuthorized: false, errorReason: 'Invalid role or request configuration.' };
}

/**
 * Validates if a user can download or view an existing report.
 */
export async function verifyReportAccess(
  reportId: string,
  userId: string,
  role: string
): Promise<boolean> {
  const report = await getReportById(reportId);
  if (!report) {
    return false;
  }

  // SWC has full access
  if (role === 'STUDENT_WELFARE_COUNCIL') {
    return true;
  }

  // MEMBER access checks
  if (role === 'MEMBER') {
    return report.targetUserId === userId;
  }

  // DEPARTMENT_LEAD access checks
  if (role === 'DEPARTMENT_LEAD') {
    const leadClub = await getLeadClub(userId);
    if (!leadClub) return false;

    if (report.reportType === 'CLUB_SUMMARY') {
      return report.targetClubId === leadClub.id;
    }

    if (report.reportType === 'MEMBER_EVALUATION') {
      // Allowed if member belongs to lead's club or lead generated the report
      if (report.generatedBy === userId) return true;
      if (!report.targetUserId) return false;

      const supabase = await createSupabaseServerClient();
      const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', report.targetUserId)
        .eq('club_id', leadClub.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      return !!membership;
    }
  }

  // CLUB_PRESIDENT access checks
  if (role === 'CLUB_PRESIDENT') {
    const presidentClub = await getPresidentClub(userId);
    if (!presidentClub) return false;

    if (report.reportType === 'CLUB_SUMMARY') {
      return report.targetClubId === presidentClub.id;
    }

    if (report.reportType === 'MEMBER_EVALUATION') {
      // Allowed if member belongs to president's club or president generated it
      if (report.generatedBy === userId) return true;
      if (!report.targetUserId) return false;

      const supabase = await createSupabaseServerClient();
      const { data: membership } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', report.targetUserId)
        .eq('club_id', presidentClub.id)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      return !!membership;
    }
  }

  return false;
}

/**
 * Orchestrates fetching live database metrics, rendering the PDF, uploading it, and updating metadata.
 */
export async function generateReportService(
  reportType: 'MEMBER_EVALUATION' | 'CLUB_SUMMARY',
  targetUserId: string | null,
  targetClubId: string | null,
  generatorId: string,
  generatorRole: string
): Promise<string> {
  const supabase = await createSupabaseServerClient();

  // 1. Verify Access
  const access = await validateReportGenerationAccess({
    reportType,
    targetUserId,
    targetClubId,
    generatorId,
    generatorRole,
  });

  if (!access.isAuthorized) {
    throw new Error(access.errorReason || 'UNAUTHORIZED_REPORT_GENERATION');
  }

  // 2. Fetch Generator Profile Display Name
  const { data: generatorProfile } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', generatorId)
    .single();
  const generatorName = generatorProfile?.full_name || 'System Agent';

  // 3. Create database report metadata record in status PENDING/GENERATING
  const reportId = await createReportRecord(
    reportType,
    targetUserId,
    targetClubId,
    generatorId
  );

  try {
    let pdfBuffer: Buffer;
    const generatedAt = new Date().toISOString();

    if (reportType === 'MEMBER_EVALUATION') {
      if (!targetUserId) throw new Error('Target User ID required for Member Report');

      // Fetch User Info
      const { data: profile } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', targetUserId)
        .single();
      if (!profile) throw new Error('Target profile not found');

      // Fetch Active Membership details
      const activeMem = await getCurrentMembership(targetUserId);
      const clubName = activeMem?.clubName || 'None';
      const joinedAt = activeMem?.joinedAt || new Date().toISOString();

      // Fetch Performance Summary
      const perfSummary = await getMemberPerformanceSummary(targetUserId);

      // Fetch Transfer History
      const rawTransfers = await getMemberTransferHistory(targetUserId);
      const transferHistory = rawTransfers.map((t) => ({
        currentClubName: t.currentClubName,
        newClubName: t.newClubName,
        status: t.status,
        decidedAt: t.decidedAt || null,
        reason: t.reason,
        comments: t.comments || null,
      }));

      // Render PDF
      pdfBuffer = generateMemberReportPDF({
        member: {
          fullName: profile.full_name || 'Unknown',
          email: profile.email || '',
          clubName,
          joinedAt,
        },
        metrics: {
          totalAssigned: perfSummary.totalAssigned,
          totalCompleted: perfSummary.totalCompleted,
          completionRate: perfSummary.completionRate,
          averageRating: perfSummary.averageRating,
        },
        recentEvaluations: perfSummary.recentEvaluations.map((e) => ({
          taskTitle: e.taskTitle,
          rating: e.rating,
          feedback: e.feedback,
          evaluatorName: e.evaluatorName,
          createdAt: e.createdAt,
        })),
        transferHistory,
        generatedBy: `${generatorName} (${generatorRole})`,
        generatedAt,
      });

    } else {
      if (!targetClubId) throw new Error('Target Club ID required for Club Report');

      // Fetch aggregated metrics
      const clubStats = await getClubSummaryStats(targetClubId);
      if (!clubStats) throw new Error('Target club statistics not found');

      // Render PDF
      pdfBuffer = generateClubReportPDF({
        clubName: clubStats.clubName,
        description: clubStats.description,
        memberCount: clubStats.memberCount,
        totalAssigned: clubStats.totalAssigned,
        totalCompleted: clubStats.totalCompleted,
        completionRate: clubStats.completionRate,
        evaluatedMembersCount: clubStats.evaluatedMembersCount,
        averageRating: clubStats.averageRating,
        membersList: clubStats.membersList.map((m) => ({
          fullName: m.fullName,
          email: m.email,
          assignedCount: m.assignedCount,
          completedCount: m.completedCount,
          completionRate: m.completionRate,
          averageRating: m.averageRating,
        })),
        recentEvaluations: clubStats.recentEvaluations.map((e) => ({
          taskTitle: e.taskTitle,
          memberName: e.memberName,
          rating: e.rating,
          feedback: e.feedback,
          createdAt: e.createdAt,
        })),
        generatedBy: `${generatorName} (${generatorRole})`,
        generatedAt,
      });
    }

    // 4. Upload PDF binary to private Supabase Storage
    const storagePath = `${reportType}/${reportId}.pdf`;
    
    // Ensure bucket exists programmatically (in case migration is not run, or as an active guard)
    try {
      await supabase.storage.createBucket('reports', { public: false });
    } catch {
      // Ignore if it already exists
    }

    const { error: uploadError } = await supabase.storage
      .from('reports')
      .upload(storagePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // 5. Update database record status to COMPLETED
    await updateReportStatus(reportId, 'COMPLETED', storagePath);

    return reportId;
  } catch (error) {
    // Fail metadata record on error
    await updateReportStatus(reportId, 'FAILED', 'error');
    throw error;
  }
}
