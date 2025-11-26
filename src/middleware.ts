import {NextRequest, NextResponse} from 'next/server';

export const config = {
  matcher: '/:path*',
};

export function middleware(req: NextRequest) {
  // In development, do not apply any middleware logic.
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // This will be undefined if the authValue is not a valid base64 string
    const [user, pwd] = atob(authValue)?.split(':') ?? [];

    if (
      user === process.env.BASIC_AUTH_USER &&
      pwd === process.env.BASIC_AUTH_PASS
    ) {
      return NextResponse.next();
    }
  }
  
  // If we've reached here, authentication has failed.
  url.pathname = '/api/auth';

  return NextResponse.rewrite(url);
}
