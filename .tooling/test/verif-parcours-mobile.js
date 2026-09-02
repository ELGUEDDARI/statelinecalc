const http=require("http"),fs=require("fs"),path=require("path");
const {chromium,devices}=require("playwright");
const RACINE="c:/Users/sland/Desktop/STATELINECALC", PORT=8801;
const T={".html":"text/html; charset=utf-8",".css":"text/css",".js":"text/javascript",".svg":"image/svg+xml",".png":"image/png",".ico":"image/x-icon",".webmanifest":"application/manifest+json"};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split("?")[0]);if(p.endsWith("/"))p+="index.html";
 const f=path.join(RACINE,p); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end();return;}
 r.writeHead(200,{"Content-Type":T[path.extname(f)]||"text/plain"}); r.end(fs.readFileSync(f));});
(async()=>{
 await new Promise(r=>srv.listen(PORT,r));
 const nav=await chromium.launch({headless:true});
 const ctx=await nav.newContext({...devices["iPhone 13"]});
 const p=await ctx.newPage();
 await p.goto("http://localhost:"+PORT+"/paycheck-calculator/ohio/",{waitUntil:"networkidle"});
 await p.fill("#salary","75,000");
 await p.selectOption("#display","annual");
 const avant=await p.evaluate(()=>window.scrollY);
 await p.click("button[type=submit]");
 await p.waitForTimeout(1200);
 const d=await p.evaluate(()=>{
   const o=document.querySelector("[data-paycheck-result]");
   const r=o.getBoundingClientRect();
   const tete=o.querySelector(".result-head");
   const tr=tete.getBoundingClientRect();
   return {defilement:Math.round(window.scrollY), resultatVisible:r.top<window.innerHeight&&r.bottom>0,
           montant:tete.innerText.replace(/\s+/g," "), lignesDuMontant:Math.round(tr.height/ (parseFloat(getComputedStyle(tete).lineHeight)||1))};
 });
 console.log("defilement avant clic : "+avant+"px");
 console.log("defilement apres clic : "+d.defilement+"px");
 console.log("resultat visible a l ecran : "+(d.resultatVisible?"OUI":"NON"));
 console.log("montant affiche : « "+d.montant+" » sur "+d.lignesDuMontant+" ligne(s)");
 await p.screenshot({path:path.join(RACINE,".tooling/test/captures/apres-correction-mobile.png")});
 await nav.close(); srv.close();
})();
