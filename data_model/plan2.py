from plan1 import *
import json
pidx={p["ProductID"]:i for i,p in enumerate(products)}
# ---------- gross requirement per material-week (BOM explosion)
G={m["MaterialID"]:np.zeros(NW) for m in materials}
for b in bom:
    pi=pidx[b["FinishedGoodID"]]
    for k in range(NW): G[b["MaterialID"]][k]+=PLAN[(pi,k)]*b["BOMQuantity"]*(1+b["ScrapPercentage"])
# ---------- material planning parameters
supl={s["SupplierID"]:s for s in SUPPLIERS}
cohort={}
ids=[m["MaterialID"] for m in materials]
for m in materials:
    i=m["MaterialID"]; avg=float(G[i][:12].mean()); m["AvgWeeklyReq"]=avg
    cv={"High":1.4,"Medium":1.0,"Low":.7}[m["Criticality"]]
    m["SafetyStock"]=rsig(avg*cv,2)
    imp=supl[m["SupplierID"]]["Country"]!="Egypt"
    m["MinimumOrderQty"]=rsig(avg*(2.5 if imp else 1.0),1) or 1
    r=rng.random()
    nu=sum(1 for b in bom if b["MaterialID"]==i and True)
    thr=.30 if nu<=2 else .16 if nu<=5 else .06
    r=(.22+(r-thr)/(1-thr)*.78) if r>=thr else (r/(thr*.45)*.10 if r<thr*.45 else .10+(r-thr*.45)/(thr*.55)*.12)
    cohort[i]="A" if r<.10 else ("E" if m["LeadTimeDays"]>=21 else "B") if r<.22 else "B" if r<.74 else "C" if r<.88 else "D" if r<.94 else "B"
OPENPO=[];po_n=[45000100]
def mkpo(i,exp,qty,status,recv=0,od=None):
    m=mat[i]; po_n[0]+=1
    od=od or exp-dt.timedelta(days=m["LeadTimeDays"])
    OPENPO.append(dict(POID=f"PO-{po_n[0]}",MaterialID=i,SupplierID=m["SupplierID"],OrderDate=od.isoformat(),ExpectedDeliveryDate=exp.isoformat(),
        POQuantity=qty,ReceivedQuantity=recv,OpenQuantity=qty-recv,POStatus=status,UnitCost=m["UnitCost"]))
AV0={};ALLOC0={};SCH=np.zeros((len(ids),NW))
ix={i:n for n,i in enumerate(ids)}
for m in materials:
    i=m["MaterialID"]; avg=m["AvgWeeklyReq"]; ss=m["SafetyStock"]; ltw=m["LeadTimeDays"]/7; c=cohort[i]; moq=m["MinimumOrderQty"]
    if c=="A": cov=rng.uniform(1.0,3.5)
    elif c=="E": cov=ltw*rng.uniform(.35,.8)+ss/avg
    elif c=="B": cov=ltw*rng.uniform(1.05,1.8)+ss/avg+1.5
    elif c=="C": cov=rng.uniform(14,26)
    else: cov=None
    av=ss*rng.uniform(.35,.9) if c=="D" else avg*cov
    al=min(av*.2,G[i][0]*rng.uniform(.1,.35))
    AV0[i]=rsig(av,3);ALLOC0[i]=rsig(al,2)
    # open POs
    otif=supl[m["SupplierID"]]["OTIFPercentage"]
    npo={"A":rng.integers(1,3),"B":rng.integers(0,3),"C":0,"D":1,"E":0}[c]
    for _ in range(int(npo)):
        qty=max(moq,int(math.ceil(avg*rng.uniform(1.5,4)/moq)*moq))
        late=rng.random()<(100-otif)/55
        if late:
            exp=TODAY-dt.timedelta(days=int(rng.integers(3,13))); st="Late"; mkpo(i,exp,qty,"Late",int(qty*rng.choice([0,0,.3])))
        else:
            exp=TODAY+dt.timedelta(days=int(rng.integers(3,60)))
            part=rng.random()<.15; mkpo(i,exp,qty,"Partially Received" if part else "Open",int(qty*.4) if part else 0)
# closed history
for _ in range(34):
    i=rng.choice(ids); m=mat[i]; moq=m["MinimumOrderQty"]
    qty=max(moq,int(math.ceil(m["AvgWeeklyReq"]*2/moq)*moq)); exp=TODAY-dt.timedelta(days=int(rng.integers(8,70)))
    mkpo(i,exp,qty,"Received",qty)
for po in OPENPO:
    if po["OpenQuantity"]>0:
        e=dt.date.fromisoformat(po["ExpectedDeliveryDate"])
        rev=e if e>=TODAY else TODAY+dt.timedelta(days=int(rng.integers(7,17)))   # re-promised date for late POs
        po["RevisedDeliveryDate"]=rev.isoformat()
        k=min(NW-1,max(0,(rev-W0).days//7)); SCH[ix[po["MaterialID"]],k]+=po["OpenQuantity"]
    else: po["RevisedDeliveryDate"]=po["ExpectedDeliveryDate"]
# ---------- MRP netting (time-phased, MOQ-rounded planned receipts)
mrp=[];recs=[]
fg_in_week={}
for b in bom:
    pi=pidx[b["FinishedGoodID"]]
    for k in range(NW):
        if PLAN[(pi,k)]>0: fg_in_week.setdefault((b["MaterialID"],k),[]).append((b["FinishedGoodID"],PLAN[(pi,k)]*b["BOMQuantity"]*(1+b["ScrapPercentage"])))
for m in materials:
    i=m["MaterialID"]; avg=m["AvgWeeklyReq"]; ss=m["SafetyStock"]; moq=m["MinimumOrderQty"]; lt=m["LeadTimeDays"]
    av=AV0[i]; 
    for k,wk in enumerate(WEEKS):
        gross=float(G[i][k]); sch=float(SCH[ix[i],k])
        raw=gross+ss-av-sch; net=max(raw,0)
        prec=0
        if net>0:
            N=4 if lt<=14 else (6 if lt<=35 else 8)
            target=ss+float(G[i][k:k+N].sum())
            prec=int(math.ceil(max(net,target-av-sch,moq)/moq)*moq)
        pre_end=av+sch-gross
        end=pre_end+prec
        onh=av+(ALLOC0[i] if k==0 else 0); al=ALLOC0[i] if k==0 else 0
        od=wk-dt.timedelta(days=lt); late=od<TODAY
        short=net if (net>0 and late) else 0
        status="Shortage" if short>0 else ("At Risk" if ((net>0 and od<=TODAY+dt.timedelta(days=14)) or (pre_end-ss<.3*avg and k<=lt/7+2)) else "Healthy")
        rowd=dict(Week=wlabel(wk),WeekStart=wk.isoformat(),Month=wk.strftime("%Y-%m"),MaterialID=i,Plant=m["Plant"],
            OnHandInventory=round(onh,1),AllocatedInventory=round(al,1),AvailableInventory=round(av,1),SafetyStock=ss,
            GrossRequirement=round(gross,1),ScheduledReceipts=round(sch,1),NetRequirement=round(net,1),ShortageQty=round(short,1),
            PlannedReceipt=prec,ProjectedEndingInventory=round(end,1),Status=status,OrderDate=od.isoformat(),OrderDatePassed=bool(late and net>0))
        if net>0:
            fgs=fg_in_week.get((i,k),[])
            rowd["AffectedFG"]="|".join(f for f,_ in sorted(fgs,key=lambda x:-x[1]))
            share=min(1,short/gross) if gross>0 else 0
            rowd["BlockedShare"]=round(share if late else 0,3)
            urg="Order Immediately" if od<=TODAY else ("Order This Week" if od<=TODAY+dt.timedelta(days=7) else "Upcoming")
            recs.append(dict(MaterialID=i,Week=wlabel(wk),WeekStart=wk.isoformat(),Month=wk.strftime("%Y-%m"),SupplierID=m["SupplierID"],Plant=m["Plant"],
               NetRequirement=round(net,1),MinimumOrderQty=moq,RecommendedPOQty=prec,RequiredDeliveryDate=wk.isoformat(),LeadTimeDays=lt,
               RecommendedOrderDate=od.isoformat(),Urgency=urg,EstPurchaseValue=round(prec*m["UnitCost"]),OrderDatePassed=bool(od<TODAY)))
        mrp.append(rowd); av=end
# materials with no recommendation => Covered
rec_m={r["MaterialID"] for r in recs}
for m in materials:
    if m["MaterialID"] not in rec_m:
        recs.append(dict(MaterialID=m["MaterialID"],Week=None,WeekStart=None,Month=None,SupplierID=m["SupplierID"],Plant=m["Plant"],NetRequirement=0,MinimumOrderQty=m["MinimumOrderQty"],
            RecommendedPOQty=0,RequiredDeliveryDate=None,LeadTimeDays=m["LeadTimeDays"],RecommendedOrderDate=None,Urgency="Covered",EstPurchaseValue=0,OrderDatePassed=False))
if __name__=="__main__":
    import collections
    print(collections.Counter(r["Status"] for r in mrp if r["WeekStart"]==W0.isoformat()))
    print(collections.Counter(r["Status"] for r in mrp))
    print(collections.Counter(r["Urgency"] for r in recs), "mat with short",len({r['MaterialID'] for r in mrp if r['Status']=='Shortage'}))
    print("past due rows",sum(r["OrderDatePassed"] for r in mrp), "late POs",sum(p["POStatus"]=="Late" for p in OPENPO),len(OPENPO))
