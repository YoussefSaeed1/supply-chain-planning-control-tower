from plan2 import *
# ---------- material readiness -> executable production
ratio={}   # (material,k) -> min(1, supported share)
for r in mrp:
    k=(dt.date.fromisoformat(r["WeekStart"])-W0).days//7
    ratio[(r["MaterialID"],k)]=1-r.get("BlockedShare",0)
fac={}
for b in bom:
    pi=pidx[b["FinishedGoodID"]]
    for k in range(NW):
        f=ratio[(b["MaterialID"],k)]
        fac[(pi,k)]=min(fac.get((pi,k),1),f)
cap_hours={}
for p in products: pass
# ---------- capacity
req={}
for pi,p in enumerate(products):
    for k in range(NW):
        q=PLAN[(pi,k)]
        h=q/p["RunRate"]+(q/p["StandardBatchSize"])*p["ChangeoverHrs"] if q>0 else 0
        req[(p["ProductionLine"],k)]=req.get((p["ProductionLine"],k),0)+h
TARGET={"P1-A":.74,"P1-B":.78,"P1-C":.72,"P2-A":.76,"P2-B":.80,"P2-C":.70,"P2-D":.78,"P3-A":.72,"P3-B":.77}
MAINT={"P1-A":[9,22,31],"P1-B":[11,24],"P1-C":[7,20,33],"P2-A":[6,19,30],"P2-B":[12,25],"P2-C":[8,23],"P2-D":[13,27],"P3-A":[10,26],"P3-B":[15,29]}
capacity=[];base={}
for ln,(pl,nm) in LINES.items():
    mean=np.mean([req[(ln,k)] for k in range(NW)])
    base[ln]=min(160,max(48,round(mean/TARGET[ln]/8)*8))
    for k,wk in enumerate(WEEKS):
        av=base[ln]*(0.85 if k in MAINT[ln] else 1.0)
        rq=req[(ln,k)]; u=rq/av*100
        st="Healthy" if u<80 else "High Utilization" if u<95 else "Capacity Risk" if u<=100 else "Over Capacity"
        capacity.append(dict(Week=wlabel(wk),WeekStart=wk.isoformat(),Month=wk.strftime("%Y-%m"),Plant=pl,ProductionLine=ln,LineName=nm,
            AvailableCapacityHours=round(av,1),RequiredCapacityHours=round(rq,1),CapacityUtilizationPercentage=round(u,1),CapacityStatus=st,Maintenance=k in MAINT[ln]))
# ---------- executable MPS + status
for r in mps:
    pi=pidx[r["ProductID"]]; k=(dt.date.fromisoformat(r["WeekStart"])-W0).days//7
    f=fac[(pi,k)]; ex=int(math.floor(r["PlannedProduction"]*f/10)*10)
    r["MaterialFactor"]=round(f,3); r["ExecutableProduction"]=ex
    r["ExecutableEnding"]=r["OpeningInventory"]+ex-r["Demand"]
    e=r["ExecutableEnding"]; r["MPSStatus"]="Healthy" if e>=r["SafetyStock"] else ("Risk" if e>=0 else "Shortage")
# ---------- supplier metrics + risk
for s in SUPPLIERS:
    sid=s["SupplierID"]; ms=[m for m in materials if m["SupplierID"]==sid]
    s["Materials"]=len(ms); s["CriticalMaterials"]=sum(m["Criticality"]=="High" for m in ms)
    s["LatePOs"]=sum(1 for p in OPENPO if p["SupplierID"]==sid and p["POStatus"]=="Late")
    s["OpenPOValue"]=round(sum(p["OpenQuantity"]*p["UnitCost"] for p in OPENPO if p["SupplierID"]==sid and p["OpenQuantity"]>0))
    s["RecommendedPurchaseValue"]=round(sum(r["EstPurchaseValue"] for r in recs if r["SupplierID"]==sid))
    s["PurchaseValue"]=s["OpenPOValue"]+s["RecommendedPurchaseValue"]
    pts=(3 if s["OTIFPercentage"]<80 else 2 if s["OTIFPercentage"]<88 else 1 if s["OTIFPercentage"]<92 else 0)
    pts+=(2 if s["AverageLeadTime"]>45 else 1 if s["AverageLeadTime"]>=28 else 0)
    pts+=(1 if s["Country"] in ("China","India") else 0)+(1 if s["CriticalMaterials"]>=4 else 0)+(1 if s["LatePOs"]>=2 else 0)
    s["RiskScore"]=pts
    s["SupplierRisk"]="Critical" if pts>=6 else "High" if pts>=4 else "Medium" if pts>=2 else "Low"
# ---------- write
def dump(o): return json.loads(json.dumps(o,default=lambda x:float(x) if isinstance(x,(np.floating,)) else int(x) if isinstance(x,np.integer) else str(x)))
for p in products:
    p["SafetyStock"]=int(p["SafetyStock"])
out=dict(meta=dict(today=TODAY.isoformat(),weeks=[wlabel(w) for w in WEEKS],weekStarts=[w.isoformat() for w in WEEKS],currency="EGP"),
  plants=[dict(Plant=k,PlantName=v) for k,v in PLANTS.items()],lines=[dict(ProductionLine=k,Plant=v[0],LineName=v[1],BaselineHours=base[k]) for k,v in LINES.items()],
  products=[{k:v for k,v in p.items() if not k.startswith("_")} for p in products],materials=materials,bom=bom,suppliers=SUPPLIERS,
  demand=demand,mps=mps,mrp=mrp,pos=OPENPO,recs=recs,capacity=capacity)
json.dump(dump(out),open("data.json","w"),separators=(",",":"))
if __name__=="__main__":
    import collections,os
    print(os.path.getsize("data.json")//1024,"KB")
    print("cap status",collections.Counter(c["CapacityStatus"] for c in capacity))
    for ln in LINES: 
        u=[c["CapacityUtilizationPercentage"] for c in capacity if c["ProductionLine"]==ln]; print(ln,base[ln],round(np.mean(u)),round(max(u)),sum(x>100 for x in u))
    print("mps",collections.Counter(r["MPSStatus"] for r in mps),"attain",sum(r["ExecutableProduction"] for r in mps)/sum(r["PlannedProduction"] for r in mps))
    print("supplier risk",collections.Counter(s["SupplierRisk"] for s in SUPPLIERS),[ (s["SupplierID"],s["RiskScore"],s["SupplierRisk"]) for s in SUPPLIERS if s["RiskScore"]>=4])
    ws=collections.Counter(r["Status"] for r in mrp if r["WeekStart"]==W0.isoformat()); print(ws)
