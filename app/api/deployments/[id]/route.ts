import {NextResponse} from "next/server";
import {createAdminClient} from "@/lib/supabaseAdmin";

export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 const secret=process.env.BICKRI_DEPLOY_WEBHOOK_SECRET;
 if(!secret||req.headers.get("X-Bickri-Deploy-Secret")!==secret)return NextResponse.json({error:"Non autorisé."},{status:401});
 const {id}=await params;const b=await req.json();
 const status=String(b.status||"");
 if(!["queued","building","ready","failed","cancelled"].includes(status))return NextResponse.json({error:"Statut invalide."},{status:400});
 const patch:any={status};
 for(const k of ["commit_sha","deployment_url","error_message","logs","started_at","finished_at"])if(k in b)patch[k]=b[k]===null?null:String(b[k]);
 const {data,error}=await createAdminClient().from("domain_deployments").update(patch).eq("id",id).select("id,status,deployment_url,error_message,logs,commit_sha,started_at,finished_at").single();
 if(error)return NextResponse.json({error:"Déploiement introuvable ou mise à jour impossible."},{status:404});
 return NextResponse.json({deployment:data});
}