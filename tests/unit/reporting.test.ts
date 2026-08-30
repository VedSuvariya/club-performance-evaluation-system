/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getCurrentUser } from '@/lib/permissions';
import { createSupabaseServerClient } from '@/lib/database/server';
import {
  createReportRecord,
  updateReportStatus,
  getReportById,
} from '@/lib/database/reports';
import {
  validateReportGenerationAccess,
  verifyReportAccess,
} from '@/features/reports/services';
import { generateReportAction } from '@/features/reports/actions';

// Mock Supabase Server Client
vi.mock('@/lib/database/server', () => ({
  createSupabaseServerClient: vi.fn(),
}));

// Mock Permissions
vi.mock('@/lib/permissions', () => ({
  getCurrentUser: vi.fn(),
  requireRole: vi.fn(),
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock PDF generation functions to avoid running jsPDF code inside Node/vitest context
vi.mock('@/features/reports/pdf-generator', () => ({
  generateMemberReportPDF: vi.fn().mockReturnValue(Buffer.from('mockpdf')),
  generateClubReportPDF: vi.fn().mockReturnValue(Buffer.from('mockpdf')),
}));

describe('Reporting System Backend & Access Controls', () => {
  let mockUserId = 'generator-1';
  const mockFrom = vi.fn();
  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: {}, error: null }),
      download: vi.fn().mockResolvedValue({ data: Buffer.from('mockpdf'), error: null }),
      createBucket: vi.fn().mockResolvedValue({ data: {}, error: null }),
    }),
  };
  const mockSupabase = {
    from: mockFrom,
    storage: mockStorage,
    auth: {
      getUser: vi.fn().mockImplementation(async () => {
        return {
          data: { user: { id: mockUserId, email: 'test@example.com' } },
          error: null,
        };
      }),
    },
  };

  const createMockQuery = (data: any, error: any = null) => {
    const chain: any = {};
    const returnChain = () => chain;
    chain.select = returnChain;
    chain.insert = returnChain;
    chain.update = returnChain;
    chain.eq = returnChain;
    chain.neq = returnChain;
    chain.in = returnChain;
    chain.order = returnChain;
    chain.single = vi.fn().mockResolvedValue({ data, error });
    chain.maybeSingle = vi.fn().mockResolvedValue({ data, error });
    chain.then = (onfulfilled: any) => Promise.resolve({ data, error }).then(onfulfilled);
    return chain;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserId = 'generator-1';
    (createSupabaseServerClient as any).mockResolvedValue(mockSupabase);
    mockFrom.mockImplementation(() => createMockQuery([]));
  });

  // 1. Database creation
  it('should insert a pending report record with status GENERATING', async () => {
    mockFrom.mockImplementation(() => createMockQuery({ id: 'report-123' }));
    const id = await createReportRecord('MEMBER_EVALUATION', 'user-1', null, 'generator-1');
    expect(id).toBe('report-123');
    expect(mockFrom).toHaveBeenCalledWith('reports');
  });

  // 2. Database update status
  it('should update report status and storage path', async () => {
    mockFrom.mockImplementation(() => createMockQuery(null));
    await updateReportStatus('report-123', 'COMPLETED', 'storage/path.pdf');
    expect(mockFrom).toHaveBeenCalledWith('reports');
  });

  // 3. Database fetch by ID
  it('should fetch report details and map correctly', async () => {
    const reportData = {
      id: 'report-123',
      report_type: 'MEMBER_EVALUATION',
      target_user_id: 'user-1',
      target_club_id: null,
      generated_by: 'generator-1',
      status: 'COMPLETED',
      storage_path: 'path.pdf',
      created_at: '2026-08-23T12:00:00Z',
      target_user: { id: 'user-1', full_name: 'Member Test', email: 'member@test.com' },
      generator: { id: 'generator-1', full_name: 'Gen Test', email: 'gen@test.com', role: 'DEPARTMENT_LEAD' },
    };
    mockFrom.mockImplementation(() => createMockQuery(reportData));
    
    const report = await getReportById('report-123');
    expect(report).not.toBeNull();
    expect(report?.id).toBe('report-123');
    expect(report?.reportType).toBe('MEMBER_EVALUATION');
    expect(report?.targetUser?.fullName).toBe('Member Test');
  });

  // 4. Role-based Access Control checks: MEMBER
  describe('RBAC Validation for MEMBER role', () => {
    it('allows MEMBER to generate a report about themselves', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'MEMBER_EVALUATION',
        targetUserId: 'member-1',
        targetClubId: null,
        generatorId: 'member-1',
        generatorRole: 'MEMBER',
      });
      expect(res.isAuthorized).toBe(true);
    });

    it('blocks MEMBER from generating a report about another member', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'MEMBER_EVALUATION',
        targetUserId: 'member-2',
        targetClubId: null,
        generatorId: 'member-1',
        generatorRole: 'MEMBER',
      });
      expect(res.isAuthorized).toBe(false);
      expect(res.errorReason).toContain('only generate reports about themselves');
    });

    it('blocks MEMBER from generating a club summary report', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'CLUB_SUMMARY',
        targetUserId: null,
        targetClubId: 'club-1',
        generatorId: 'member-1',
        generatorRole: 'MEMBER',
      });
      expect(res.isAuthorized).toBe(false);
      expect(res.errorReason).toContain('evaluation reports');
    });
  });

  // 5. Role-based Access Control checks: DEPARTMENT_LEAD
  describe('RBAC Validation for DEPARTMENT_LEAD role', () => {
    beforeEach(() => {
      mockUserId = 'lead-1';
      // Mock getLeadClub returning 'club-100'
      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery({ id: 'club-100', name: 'Lead Club' });
        }
        // Mock membership verification: target user belongs to club-100
        if (table === 'memberships') {
          return createMockQuery({ id: 'membership-1' });
        }
        return createMockQuery([]);
      });
    });

    it('allows DEPARTMENT_LEAD to generate report for members in their club', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'MEMBER_EVALUATION',
        targetUserId: 'member-10',
        targetClubId: null,
        generatorId: 'lead-1',
        generatorRole: 'DEPARTMENT_LEAD',
      });
      expect(res.isAuthorized).toBe(true);
    });

    it('blocks DEPARTMENT_LEAD from generating report for members not in their club', async () => {
      // Mock membership lookup failing (returns null)
      mockFrom.mockImplementation((table) => {
        if (table === 'clubs') {
          return createMockQuery({ id: 'club-100' });
        }
        return createMockQuery(null);
      });

      const res = await validateReportGenerationAccess({
        reportType: 'MEMBER_EVALUATION',
        targetUserId: 'member-99',
        targetClubId: null,
        generatorId: 'lead-1',
        generatorRole: 'DEPARTMENT_LEAD',
      });
      expect(res.isAuthorized).toBe(false);
      expect(res.errorReason).toContain('not active in the Department Lead\'s club');
    });

    it('allows DEPARTMENT_LEAD to generate club summary for their own club', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'CLUB_SUMMARY',
        targetUserId: null,
        targetClubId: 'club-100',
        generatorId: 'lead-1',
        generatorRole: 'DEPARTMENT_LEAD',
      });
      expect(res.isAuthorized).toBe(true);
    });

    it('blocks DEPARTMENT_LEAD from generating club summary for another club', async () => {
      const res = await validateReportGenerationAccess({
        reportType: 'CLUB_SUMMARY',
        targetUserId: null,
        targetClubId: 'club-200',
        generatorId: 'lead-1',
        generatorRole: 'DEPARTMENT_LEAD',
      });
      expect(res.isAuthorized).toBe(false);
      expect(res.errorReason).toContain('only generate reports for their own club');
    });
  });

  // 6. Secure download permissions checks
  describe('Report Download Security Access Rules', () => {
    it('permits SWC to download any report', async () => {
      const report = { id: 'r-1', report_type: 'CLUB_SUMMARY', target_club_id: 'c-1', generated_by: 'lead-1' };
      mockFrom.mockImplementation(() => createMockQuery(report));
      
      const allowed = await verifyReportAccess('r-1', 'swc-1', 'STUDENT_WELFARE_COUNCIL');
      expect(allowed).toBe(true);
    });

    it('allows member to download their own report but blocks others', async () => {
      const report = { id: 'r-1', report_type: 'MEMBER_EVALUATION', target_user_id: 'member-1' };
      mockFrom.mockImplementation(() => createMockQuery(report));

      const allowedSelf = await verifyReportAccess('r-1', 'member-1', 'MEMBER');
      expect(allowedSelf).toBe(true);

      const allowedOther = await verifyReportAccess('r-1', 'member-2', 'MEMBER');
      expect(allowedOther).toBe(false);
    });
  });

  // 7. Server Action generateReportAction error checking
  describe('Server Action generateReportAction', () => {
    it('returns error if unauthenticated', async () => {
      (getCurrentUser as any).mockResolvedValue(null);

      const res = await generateReportAction({
        reportType: 'CLUB_SUMMARY',
        targetClubId: 'club-1',
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe('UNAUTHENTICATED');
    });
  });
});
