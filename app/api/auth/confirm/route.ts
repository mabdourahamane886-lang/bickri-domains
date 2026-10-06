import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (!email || !email.includes("@") || password.length < 6) {
      return NextResponse.json({ error: "Informations invalides." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) return NextResponse.json({ error: "Création du compte impossible." }, { status: 400 });

    return NextResponse.json({ userId: data.user.id });
  } catch {
    return NextResponse.json({ error: "Création du compte impossible." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
