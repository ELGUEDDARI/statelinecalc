import re,json
res={}
tot=0;drop=0
for pg in range(8):
    rows=[];ws=[]
    for line in open(f'C:/tmp/ct/p{pg}.tsv',encoding='utf-8-sig'):
        x,y,h,t=line.rstrip('\n').split('\t'); ws.append((int(y),int(x),t))
    ws.sort(); cur=[]
    for w in ws:
        if cur and abs(w[0]-cur[-1][0])>12: rows.append(cur);cur=[]
        cur.append(w)
    if cur: rows.append(cur)
    out=[]
    for r in rows:
        r.sort(key=lambda w:w[1])
        s=' '.join(w[2] for w in r)
        if '$' not in s: continue
        if not re.search(r'\$\s*[\dOo]',s): continue
        s=re.sub(r'(?<=[\d,.$])[oO](?=[\d,.o ]|$)','0',s)
        s=re.sub(r'(?<=\d)[oO]','0',s)
        s=re.sub(r'(\d)\s*,\s*(\d)',r'\1,\2',s)
        s=re.sub(r'\$\s+(\d)',r'$\1',s)
        s=re.sub(r'(\d)\s+\.(\d)',r'\1.\2',s)
        toks=re.findall(r'\$\d[\d,]*(?:\.\d\d)?',s)
        if len(toks)==7:
            out.append([float(t[1:].replace(',','')) for t in toks]);tot+=1
        elif len(toks)==6 and out is not None:
            drop+=1; print('drop',pg,s)
    res[pg]=out
print(tot,drop)
json.dump(res,open('C:/tmp/ct/ocr.json','w'))
for p in res: print(p,len(res[p]),res[p][0],res[p][-1])
