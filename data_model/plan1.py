from products import *
import numpy as np
rng = np.random.default_rng(23)
def rsig(x,n=2):
    if x<=0: return 0
    e=math.floor(math.log10(x)); f=10**(e-n+1); return round(x/f)*f
# ---------- products
products=[]; fgid={}
for i,f in enumerate(FG):
    pid=f"FG-{i+1:03d}"; fgid[f[0]]=pid
    products.append(dict(ProductID=pid,ProductName=f[0],ProductCategory=f[1],Brand=f[2],Plant=f[3],ProductionLine=f[4],
      StandardBatchSize=f[5],ProductionLeadTimeDays=int(rng.integers(1,4)) if f[3]!="P1" else int(rng.integers(2,5)),UnitOfMeasure="Case",
      RunRate=f[7],ChangeoverHrs=f[8],_base=f[6],_season=f[9]))
# ---------- materials ids
materials=[];mid={}
nrm=npm=0
for (n,t,cat,uom,cost,crit,s,pl) in M:
    if t=="RM": nrm+=1; i=f"RM-{nrm:03d}"
    else: npm+=1; i=f"PM-{npm:03d}"
    mid[n]=i
    base=SUP[s-1][2]; lt=max(2,int(round(base*rng.uniform(.9,1.15))))
    materials.append(dict(MaterialID=i,MaterialName=n,MaterialType="Raw Material" if t=="RM" else "Packaging",MaterialCategory=cat,
       SupplierID=f"SUP-{s:02d}",PreferredSupplier=SUP[s-1][0],LeadTimeDays=lt,UnitCost=cost,Criticality=crit,UoM=uom,Plant=pl))
mat={m["MaterialID"]:m for m in materials}
# ---------- BOM
bom=[]
for i,f in enumerate(FG):
    for (mn,q) in f[10]:
        m=mat[mid[mn]]
        sc=round(rng.uniform(.02,.04) if m["MaterialType"]=="Packaging" else rng.uniform(.01,.035),3)
        if mn=="Food Grade CO2": sc=.05
        bom.append(dict(FinishedGoodID=f"FG-{i+1:03d}",FinishedGoodName=f[0],MaterialID=m["MaterialID"],MaterialName=mn,BOMQuantity=q,UnitOfMeasure=m["UoM"],ScrapPercentage=sc))
# ---------- demand
def season(kind,d):
    mo=d.month
    bev={10:1.05,11:.92,12:.82,1:.80,2:.95,3:1.12,4:1.20,5:1.28,6:1.32}[mo]
    ram=1.0
    if kind=="ram":
        ramp={(1,11):1.08,(1,18):1.18,(1,25):1.30,(2,1):1.40,(2,8):1.48,(2,15):1.50,(2,22):1.40,(3,1):1.25,(3,8):1.05}
        ram=1.0
        for (m_,dd),v in ramp.items():
            if d>=dt.date(2027,m_,dd): ram=v
        if d>=dt.date(2027,3,15): ram=.92
    if kind=="bev": return bev
    if kind=="ram": return ram
    return 1.0
demand=[];D={}
for pi,p in enumerate(products):
    for k,wk in enumerate(WEEKS):
        fc=p["_base"]*season(p["_season"],wk)*(1+rng.normal(0,.045))
        fc=int(round(fc/10)*10)
        cov=1.1 if k==0 else max(.15,1.08-.12*k)
        co=int(round(fc*cov*rng.uniform(.88,1.13)/10)*10)
        fd=max(fc,co)
        r=dict(Week=wlabel(wk),WeekStart=wk.isoformat(),Month=wk.strftime("%Y-%m"),ProductID=p["ProductID"],ForecastDemand=fc,CustomerOrders=co,FinalDemand=fd)
        demand.append(r); D[(pi,k)]=fd
# ---------- MPS (rolling, batch rounded)
mps=[];PLAN={};OPEN={}
for pi,p in enumerate(products):
    avg=np.mean([D[(pi,k)] for k in range(8)])
    ss=int(rsig(avg*1.2,2)); p["SafetyStock"]=ss
    op=int(round(ss*rng.uniform(.75,1.2)/10)*10)
    for k,wk in enumerate(WEEKS):
        dem=D[(pi,k)]; net=dem+ss-op
        pp=int(math.ceil(net/p["StandardBatchSize"])*p["StandardBatchSize"]) if net>0 else 0
        end=op+pp-dem
        mps.append(dict(Week=wlabel(wk),WeekStart=wk.isoformat(),Month=wk.strftime("%Y-%m"),ProductID=p["ProductID"],Plant=p["Plant"],ProductionLine=p["ProductionLine"],
            OpeningInventory=op,Demand=dem,SafetyStock=ss,NetRequirement=max(net,0),PlannedProduction=pp,ProjectedEndingInventory=end))
        PLAN[(pi,k)]=pp; op=end
if __name__=="__main__":
    print(sum(D.values()),sum(PLAN.values()))
