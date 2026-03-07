import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function decodeJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        return null;
    }
}

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Ignore public routes, api routes, static files
    if (
        pathname.includes('.') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/_next')
    ) {
        return NextResponse.next();
    }

    // Allow auth routes to skip token check if unauthenticated
    if (pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password' || pathname === '/verify-otp') {
        return NextResponse.next();
    }

    const token =
        request.cookies.get('access_token')?.value || // If we use cookies for access token
        request.headers.get('authorization')?.split(' ')[1]; // Or auth header if passed by client proxy

    if (!token) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    const decoded = decodeJwt(token);

    if (!decoded) {
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('access_token');
        return response;
    }

    // Check Expiry
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        const response = NextResponse.redirect(new URL('/login?expired=true', request.url));
        response.cookies.delete('access_token');
        return response;
    }

    const role = decoded.role as string;

    if (pathname === '/') {
        // Redirect root to role dashboard
        if (role === 'Admin') return NextResponse.redirect(new URL('/admin', request.url));
        if (role === 'Doctor') return NextResponse.redirect(new URL('/doctor', request.url));
        return NextResponse.redirect(new URL('/radiologist', request.url));
    }

    // Handle legacy/incorrect /dashboard routes
    if (pathname.startsWith('/dashboard')) {
        const pathSuffix = pathname.replace('/dashboard', '');
        return NextResponse.redirect(new URL(pathSuffix || '/', request.url));
    }

    // Role based access enforcement
    if (pathname.startsWith('/radiologist') && !['Radiologist', 'Lab_Technician'].includes(role)) {
        return NextResponse.redirect(new URL('/', request.url)); // Let the root redirect handle it
    }

    if (pathname.startsWith('/doctor') && role !== 'Doctor') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    if (pathname.startsWith('/admin') && role !== 'Admin') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|assets|api).*)'],
};
