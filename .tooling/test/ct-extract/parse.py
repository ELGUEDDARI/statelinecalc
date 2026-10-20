import pymupdf, re, json, sys
d=pymupdf.open('C:/tmp/ct/tpg211.pdf')
def toks(page):
    ws=page.get_text('words')
    # merge "$" with following number token on same line within 12pt
    ws=sorted(ws,key=lambda w:(round(w[1]),w[0]))
    out=[]
    i=0
    items=[(w[0],w[1],w[2],w[4]) for w in ws]
    res=[]
    used=set()
    for i,(x0,y0,x1,t) in enumerate(items):
        if i in used: continue
        if t=='$':
            # find next token same y (±2), x just after
            for j,(a,b,c,u) in enumerate(items):
                if j in used or j==i: continue
                if abs(b-y0)<3 and a>=x1-1 and a-x1<25 and re.fullmatch(r'[\d,]+',u):
                    res.append((x0,y0,int(u.replace(',',''))));used.add(j);used.add(i);break
            continue
        m=re.fullmatch(r'\$?([\d,]+)',t)
        if m and not re.fullmatch(r'0\d+',t):
            res.append((x0,y0,int(m.group(1).replace(',',''))));used.add(i)
        elif re.fullmatch(r'\.\d+',t):
            res.append((x0,y0,float(t)))
        elif t in ('and','up'):
            res.append((x0,y0,t))
    return res
if __name__=='__main__':
    pg=int(sys.argv[1])
    for x,y,v in sorted(toks(d[pg]),key=lambda r:(round(r[1]),r[0])):
        print(round(x),round(y),v)

def rows_for(pg, bounds, names, ncols=3):
    T=toks(d[pg])
    # body only
    T=[t for t in T if 130<t[1]<740]
    out={}
    for gi,name in enumerate(names):
        lo,hi=bounds[gi],bounds[gi+1]
        G=[t for t in T if lo<=t[0]<hi]
        G.sort(key=lambda t:(t[1],t[0]))
        # cluster by y
        rows=[];cur=[]
        for t in G:
            if cur and abs(t[1]-cur[0][1])>4:
                rows.append(cur);cur=[]
            cur.append(t)
        if cur: rows.append(cur)
        rr=[]
        for r in rows:
            r.sort(key=lambda t:t[0])
            vals=[t[2] for t in r]
            rr.append(vals)
        out[name]=rr
    return out
if __name__=='__main__' and len(sys.argv)>2:
    pass
