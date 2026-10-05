import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabaseServer";
export async function GET(req:Request){const url=new URL(req.url);const code=url.searchParams.get("code");if(code){const s=await createServerSupabaseClient();await s.auth.exchangeCodeForSession(code)}return NextResponse.redirect(new URL("/dashboard",url.origin));}