import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/database/server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Query rowsecurity status of all public tables
    const { data: tablesInfo, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
    });

    // Query all policies in the public schema
    const { data: policiesInfo, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public'`
    });

    // Query grants on public tables to authenticated and anon roles
    const { data: grantsInfo, error: grantsError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          table_name, 
          grantee, 
          privilege_type 
        FROM information_schema.role_table_grants 
        WHERE table_schema = 'public' 
          AND grantee IN ('authenticated', 'anon', 'public')
      `
    });

    return NextResponse.json({
      success: true,
      tables: tablesInfo,
      policies: policiesInfo,
      grants: grantsInfo,
      errors: {
        tables: tablesError,
        policies: policiesError,
        grants: grantsError,
      }
    });
  } catch (error: any) {
    console.error('Debug DB Error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      }
    }, { status: 500 });
  }
}
