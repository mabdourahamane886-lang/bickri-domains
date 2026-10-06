import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

async function refreshSupabaseSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getUser();
  return response;
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const root=(process.env.BICKRI_HOSTING_DOMAIN||"bickridomains.com").toLowerCase();
  if (!hostname || hostname === root || hostname === "www." + root) {
    return refreshSupabaseSession(request, NextResponse.next());
  }
  if (hostname.endsWith("." + root)) {
    const slug=hostname.slice(0,-("."+root).length);
    if(/^[a-z0-9-]+$/.test(slug)){
      const url=request.nextUrl.clone();
      url.pathname="/sites/"+slug+(request.nextUrl.pathname==="/"?"":request.nextUrl.pathname);
      return refreshSupabaseSession(request, NextResponse.rewrite(url));
    }
  }
  return refreshSupabaseSession(request, NextResponse.next());
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
