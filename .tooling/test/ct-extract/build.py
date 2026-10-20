import sys,json
sys.argv=['x']
exec(open('C:/tmp/ct/parse.py').read().split("if __name__=='__main__':")[0])
exec("def rows_for"+open('C:/tmp/ct/parse.py').read().split("def rows_for")[1].split("if __name__=='__main__' and")[0])
res={}
def norm(rows,kind):
    out=[]
    for v in rows:
        v=list(v)
        # handle 'and','up'
        if 'and' in v:
            v=[x for x in v if x not in('and','up')]
            if kind=='E' and len(v)==1: v=[v[0],None,0]
            elif len(v)==2: v=[v[0],None,v[1]]
            elif len(v)==1: v=[v[0],None,None]
        out.append(v)
    return out
A=rows_for(1,[0,175,310,445,700],['A','B','C','F'])
C=rows_for(3,[0,170,300,430,700],['A','B','C','F'])
D=rows_for(4,[0,225,395,700],['A','B','C'])
E=rows_for(5,[0,170,300,430,700],['A','B','C','F'])
for nm,T,k in (('A',A,'A'),('C',C,'C'),('D',D,'D'),('E',E,'E')):
    for code,rows in T.items():
        print(nm,code,len(rows))
        for r in norm(rows,k)[:3]+['...']+norm(rows,k)[-3:]:
            print('   ',r)
json.dump({'A':{c:norm(r,'A') for c,r in A.items()},'C':{c:norm(r,'C') for c,r in C.items()},'D':{c:norm(r,'D') for c,r in D.items()},'E':{c:norm(r,'E') for c,r in E.items()}},open('C:/tmp/ct/raw.json','w'))
