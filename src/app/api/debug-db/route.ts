import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/database/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Query Coding Club
    const { data: codingClub, error: codingClubError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          c.id, 
          c.name, 
          c.club_president_id, 
          u1.full_name AS president_name, 
          u1.email AS president_email, 
          c.department_lead_id, 
          u2.full_name AS lead_name, 
          u2.email AS lead_email 
        FROM public.clubs c 
        LEFT JOIN public.users u1 ON c.club_president_id = u1.id 
        LEFT JOIN public.users u2 ON c.department_lead_id = u2.id 
        WHERE c.name = 'Coding Club'
      `
    });

    // Query Active Members of Coding Club
    const { data: activeMembers, error: activeMembersError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          m.id AS membership_id, 
          m.user_id, 
          u.full_name, 
          u.email, 
          u.role, 
          m.status 
        FROM public.memberships m 
        JOIN public.users u ON m.user_id = u.id 
        JOIN public.clubs c ON m.club_id = c.id 
        WHERE c.name = 'Coding Club' AND m.status = 'ACTIVE'
      `
    });

    // Query All Clubs
    const { data: allClubs, error: allClubsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT id, name, is_active FROM public.clubs`
    });

    // Query User Count by Role
    const { data: roleCounts, error: roleCountsError } = await supabase.rpc('exec_sql', {
      sql: `SELECT role, count(*) FROM public.users GROUP BY role`
    });

    return NextResponse.json({
      success: true,
      codingClub: codingClub?.[0] || null,
      activeMembers,
      allClubs,
      roleCounts,
      errors: {
        codingClub: codingClubError,
        activeMembers: activeMembersError,
        allClubs: allClubsError,
        roleCounts: roleCountsError,
      }
    });
  } catch (error: any) {
    console.error('Debug DB Data Error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
      }
    }, { status: 500 });
  }
}
