const http=require("http"),fs=require("fs"),path=require("path");
const {chromium,devices}=require("playwright");
const RACINE="c:/Users/sland/Desktop/STATELINECALC", PORT=8803;
const T={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p.endsWith("/"))p+="index.html";
 const f=path.join(RACINE,p); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{"Content-Type":T[path.extname(f)]||"text/plain"}); r.end(fs.readFileSync(f));});
(async()=>{
 await new Promise(r=>srv.listen(PORT,r));
 const nav=await chromium.launch({headless:true});
 let ko=0;
 for (const e of ["florida","texas","georgia","illinois","nevada","washington","michigan","pennsylvania","utah","ohio"]) {
   const ctx=await nav.newContext({...devices["iPhone 13"]});
   const p=await ctx.newPage();
   await p.goto("http://localhost:"+PORT+"/paycheck-calculator/"+e+"/",{waitUntil:"networkidle"});
   const av=await p.evaluate(()=>{const a=document.querySelector(".answer-jump a");
     if(!a) return null; const r=a.getBoundingClientRect(); const cs=getComputedStyle(a);
     /* ENTIEREMENT visible, pas « le bord depasse ». Le premier jet acceptait
        Ohio avec 4 px de bouton a l'ecran. */
     return {visible:r.bottom<=window.innerHeight&&r.top>=0, haut:Math.round(r.top),
             ecran:window.innerHeight,
             fond:cs.backgroundColor, texte:cs.color, hauteurBouton:Math.round(r.height)};});
   if(!av){ console.log("ECHEC | "+e+" : pas de raccourci"); ko++; await ctx.close(); continue; }
   await p.click(".answer-jump a");
   await p.waitForTimeout(900);
   const ap=await p.evaluate(()=>{const c=document.querySelector("#salary");
     const r=c.getBoundingClientRect();
     return {champVisible:r.top>=0&&r.bottom<=window.innerHeight, haut:Math.round(r.top)};});
   const ok = av.visible && ap.champVisible && av.hauteurBouton>=40 && av.fond!=="rgba(0, 0, 0, 0)";
   if(!ok) ko++;
   console.log((ok?"OK   ":"ECHEC")+" | "+e.padEnd(13)+"bouton en "+String(av.haut).padStart(4)+"-"+(av.haut+av.hauteurBouton)+"px sur un ecran de "+av.ecran+" -> apres clic, champ a "+ap.haut+"px "+(ap.champVisible?"VISIBLE":"HORS ECRAN"));
   if(e==="ohio") await p.screenshot({path:path.join(RACINE,".tooling/test/captures/raccourci-mobile.png")});
   await ctx.close();
 }
 await nav.close(); srv.close();
 console.log("\n=== RACCOURCI VERS LE CALCULATEUR : "+(10-ko)+" OK, "+ko+" ECHEC ===\n");
 process.exit(ko?1:0);
})();
