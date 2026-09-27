import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, locales } from "./lib/i18n";
export function middleware(request:NextRequest){const {pathname}=request.nextUrl;if(pathname.startsWith("/admin")||pathname.startsWith("/_next")||pathname.includes("."))return NextResponse.next();const hasLocale=locales.some(l=>pathname===`/${l}`||pathname.startsWith(`/${l}/`));if(hasLocale)return NextResponse.next();return NextResponse.redirect(new URL(`/${defaultLocale}${pathname===" /"? "":pathname}`.replace(" /","/"),request.url));}
export const config={matcher:["/((?!api).*)"]};
