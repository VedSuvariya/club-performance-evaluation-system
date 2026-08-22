import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  const protectedRoutes = [
    { prefix: '/member', role: 'MEMBER' },
    { prefix: '/department-lead', role: 'DEPARTMENT_LEAD' },
    { prefix: '/club-president', role: 'CLUB_PRESIDENT' },
    { prefix: '/swc', role: 'STUDENT_WELFARE_COUNCIL' },
  ];

  const matchedRoute = protectedRoutes.find((r) =>
    path.startsWith(r.prefix)
  );

  if (matchedRoute) {
    if (!user) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.searchParams.set('next', path);
      return NextResponse.redirect(redirectUrl);
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== matchedRoute.role) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/unauthorized';
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (path === '/login' && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile) {
      const redirectUrl = request.nextUrl.clone();
      if (profile.role === 'MEMBER') {
        redirectUrl.pathname = '/member';
      } else if (profile.role === 'DEPARTMENT_LEAD') {
        redirectUrl.pathname = '/department-lead';
      } else if (profile.role === 'CLUB_PRESIDENT') {
        redirectUrl.pathname = '/club-president';
      } else if (profile.role === 'STUDENT_WELFARE_COUNCIL') {
        redirectUrl.pathname = '/swc';
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
