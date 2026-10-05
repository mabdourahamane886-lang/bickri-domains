import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabaseServer";
import {createAdminClient} from "@/lib/supabaseAdmin";

const slugPattern=/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export async function POST(req:Request){
  const supabase=await createServerSupabaseClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({error:"Connexion requise pour créer un site."},{status:401});

  const body=await req.json();
  const slug=String(body.slug||"").trim().toLowerCase();
  const title=String(body.title||"Mon site Bickri").trim().slice(0,160);
  const description=String(body.description||"").trim().slice(0,500);
  const contentHtml=String(body.content_html||"").slice(0,100000);

  if(!slugPattern.test(slug))return NextResponse.json({error:"Sous-domaine invalide."},{status:400});

  const host=slug+"."+(process.env.BICKRI_HOSTING_DOMAIN||"bickridomains.com");
  const {data,error}=await createAdminClient().from("domain_sites").insert({
    user_id:user.id,slug,host,title,description,content_html:contentHtml,status:"published"
  }).select("id,slug,host,title,status").single();

  if(error)return NextResponse.json({error:error.code==="23505"?"Ce sous-domaine existe déjà.":"Impossible de créer le site."},{status:error.code==="23505"?409:500});
  return NextResponse.json({site:data},{status:201});
}
