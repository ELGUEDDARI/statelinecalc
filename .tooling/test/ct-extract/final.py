import json
raw=json.load(open('C:/tmp/ct/raw.json'))
out={}
for tbl,codes in raw.items():
    out[tbl]={}
    for code,rows in codes.items():
        rows=[r for r in rows if len(r)==3]
        # contiguity
        prev=None
        for r in rows:
            if prev is not None:
                assert prev[1]==r[0],(tbl,code,prev,r)
            prev=r
        assert rows[-1][1] is None,(tbl,code,rows[-1])
        out[tbl][code]=rows
        print(tbl,code,len(rows),rows[0],rows[-1])
json.dump(out,open('C:/tmp/ct/tables.json','w'))
