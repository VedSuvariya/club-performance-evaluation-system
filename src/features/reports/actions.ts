'use strict';
'use server';

import { getCurrentUser } from '@/lib/permissions';
import { generateReportService } from './services';
import { revalidatePath } from 'next/cache';

interface GenerateReportParams {
  reportType: 'MEMBER_EVALUATION' | 'CLUB_SUMMARY';
  targetUserId?: string | null;
  targetClubId?: string | null;
}

export async function generateReportAction(params: GenerateReportParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'UNAUTHENTICATED' };
    }

    const { reportType, targetUserId, targetClubId } = params;

    const reportId = await generateReportService(
      reportType,
      targetUserId || null,
      targetClubId || null,
      user.id,
      user.role
    );

    // Revalidate paths for all roles to keep histories fresh
    const paths = [
      '/member/reports',
      '/department-lead/reports',
      '/club-president/reports',
      '/swc/reports'
    ];
    for (const path of paths) {
      try {
        revalidatePath(path);
      } catch {
        // Ignore cache errors in testing environment
      }
    }

    return { success: true, reportId };
  } catch (error) {
    console.error('Error generating report action:', error);
    const errMessage = error instanceof Error ? error.message : 'FAILED_TO_GENERATE_REPORT';
    return { 
      success: false, 
      error: errMessage 
    };
  }
}
