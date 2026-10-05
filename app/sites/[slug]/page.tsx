import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export default async function HostedSite({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const {data:site}=await createAdminClient().from("domain_sites")
    .select("title,description,content_html,status")
    .eq("slug",slug).eq("status","published").maybeSingle();

  if(!site) notFound();

  return <main style={{minHeight:"100vh",background:"#f7f8fb",color:"#07152f"}}>
    <section style={{maxWidth:1000,margin:"0 auto",padding:"72px 24px"}}>
      <div style={{color:"#b78924",fontWeight:800,letterSpacing:".08em",textTransform:"uppercase"}}>Hébergé par Bickri Domains</div>
      <h1 style={{fontSize:"clamp(40px,7vw,72px)",margin:"16px 0"}}>{site.title}</h1>
      <p style={{fontSize:20,lineHeight:1.7,color:"#53627a"}}>{site.description}</p>
      <div style={{marginTop:36,lineHeight:1.8}} dangerouslySetInnerHTML={{__html:site.content_html}} />
    </section>
  </main>;
}
