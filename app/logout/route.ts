import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabaseServer";
export async function GET(req:Request){const s=await createServerSupabaseClient();await s.auth.signOut();return NextResponse.redirect(new URL("/",req.url));}