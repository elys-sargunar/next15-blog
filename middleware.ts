import { NextRequest, NextResponse } from "next/server"
import getAuthUser from "./lib/getAuthUser"

const protectedRoutes = ["/posts/create"] // Removed dashboard as it has its own layout check
const publicRoutes = ["/login", "/register"]

export default async function middleware(req:NextRequest){
    const path = req.nextUrl.pathname
    const isProtected = protectedRoutes.includes(path) || path.startsWith("/posts/edit/")
    const isPublic = publicRoutes.includes(path)
    const user = await getAuthUser()
    const userId = user?.userId;

    // Handle protected routes - redirect to login if not authenticated
    if (isProtected && !userId) {
        return NextResponse.redirect(new URL("/login", req.nextUrl))
    }
    
    // Handle public routes - redirect to dashboard if already authenticated
    if (isPublic && userId) {
        return NextResponse.redirect(new URL("/dashboard", req.nextUrl))
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
      // Exclude api routes, static files, admin routes, dashboard, and other special files
      '/((?!api|_next/static|_next/image|admin|dashboard|favicon.ico|sitemap.xml|robots.txt).*)',
    ],
}