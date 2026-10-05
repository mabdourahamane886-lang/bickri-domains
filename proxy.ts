import {NextRequest,NextResponse} from "next/server";

export function proxy(request:NextRequest){
  const hostname=request.headers.get("host")?.split(":")[0]?.toLowerCase();
  const root=(process.env.BICKRI_HOSTING_DOMAIN||"bickridomains.com").toLowerCase();
  if(!hostname||hostname===root||hostname==="www."+root)return NextResponse.next();
  if(hostname.endsWith("."+root)){
    const slug=hostname.slice(0,-("."+root).length);
    if(/^[a-z0-9-]+$/.test(slug)){
      const url=request.nextUrl.clone();
      url.pathname="/sites/"+slug+(request.nextUrl.pathname==="/"?"":request.nextUrl.pathname);
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}
export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
