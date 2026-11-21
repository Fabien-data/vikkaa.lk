import { NextResponse, type NextRequest } from 'next/server';
import { routeForHost } from '@/lib/host-routing';

export function proxy(request: NextRequest) {
  const decision = routeForHost(request.headers.get('host') ?? '', request.nextUrl.pathname);
  switch (decision.type) {
    case 'pass':
      return NextResponse.next();
    case 'redirect':
      return NextResponse.redirect(new URL(decision.to, request.nextUrl), decision.status);
    case 'rewrite': {
      const url = request.nextUrl.clone();
      url.pathname = decision.to;
      return NextResponse.rewrite(url);
    }
    case 'notFound':
      return new NextResponse('Not found', { status: 404 });
  }
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|media/).*)'],
};
