import { NextResponse } from 'next/server';
import { getSwcDashboardData } from '@/lib/database/swc';

export async function GET() {
  try {
    const data = await getSwcDashboardData();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Debug SWC Dashboard Error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack,
      },
    }, { status: 500 });
  }
}
