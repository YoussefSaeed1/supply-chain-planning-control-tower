(function(){
const SC=window.SC,C=SC.C,f=SC.fmt;
const wl=(M,idxs)=>idxs.map(i=>SC.short(M.weeks[i].Week));
const byWeek=(v,rows,vf)=>{const m=new Map(v.idxs.map(i=>[i,0]));for(const r of rows)m.set(r.idx,(m.get(r.idx)||0)+vf(r));return v.idxs.map(i=>m.get(i))};
SC.byWeek=byWeek;SC.wl=wl;
const sumU=(rows,fn)=>SC.sum(rows,fn);
SC.agg=function(v){ // shared headline numbers
  const M=v.M,a={};
  a.demand=sumU(v.mps,r=>r.Demand);a.planned=sumU(v.mps,r=>r.PlannedProduction);a.exec=sumU(v.mps,r=>r.ExecutableProduction);
  a.attain=a.planned?a.exec/a.planned*100:100;
  const mats=[...v.matIds];a.nMat=mats.length;
  const sh=v.mrp.filter(r=>r.ShortageQty>0);a.shortRows=sh;a.shortMats=new Set(sh.map(r=>r.MaterialID));
  a.critMats=new Set(sh.filter(r=>r.risk==='Critical').map(r=>r.MaterialID));
  a.riskMats=new Set(v.mrp.filter(r=>r.Status==='At Risk').map(r=>r.MaterialID));[...a.shortMats].forEach(x=>a.riskMats.delete(x));
  a.avail=a.nMat?(1-a.shortMats.size/a.nMat)*100:100;
  a.grossV=sumU(v.mrp,r=>r.grossV);a.netV=sumU(v.mrp,r=>r.netV);a.shortV=sumU(sh,r=>r.shortV);a.shortQ=sumU(sh,r=>r.ShortageQty);
  const need=v.recs.filter(r=>r.NetRequirement>0);a.need=need;a.needV=sumU(need,r=>r.EstPurchaseValue);a.needMats=new Set(need.map(r=>r.MaterialID));
  a.urgent=need.filter(r=>r.Urgency==='Order Immediately'||r.Urgency==='Order This Week');a.immed=need.filter(r=>r.Urgency==='Order Immediately');
  a.latePOs=v.pos.filter(p=>p.POStatus==='Late');a.openPOs=v.pos.filter(p=>p.OpenQuantity>0);a.openPOV=sumU(a.openPOs,p=>p.openValue);
  a.cov=v.inv.length?d3.mean(v.inv,d=>d.cov):0;
  a.capReq=sumU(v.cap,r=>r.RequiredCapacityHours);a.capAv=sumU(v.cap,r=>r.AvailableCapacityHours);a.util=a.capAv?a.capReq/a.capAv*100:0;
  a.overLW=v.cap.filter(r=>r.util>100);a.overLines=new Set(a.overLW.map(r=>r.ProductionLine));
  a.hiSup=v.sups.filter(s=>s.SupplierRisk==='High'||s.SupplierRisk==='Critical');
  return a;
};
// ---------------- OVERVIEW
SC.init.overview=function(root){
  const k=SC.el('div','sc-kpis pri');k.id='ov-kpis';const k2=SC.el('div','sc-kpis sm');root.append(k,k2);
  const g=SC.grid(root);
  SC.ov={k,k2,
    trend:SC.card(g,{w:'w8',title:'Demand vs planned production',note:'Weekly cases. Planned production = what the MPS requires (demand + safety stock − FG inventory, rounded to batch size). Executable production = what is feasible after material constraints.'}),
    health:SC.card(g,{w:'w4',title:'Planning health',note:'Thresholds are defined on each row. Click a row to open its page.'}),
    top:SC.card(g,{w:'w4',title:'Top 10 material shortages',note:'Ranked by shortage value (EGP); shortage = net requirement whose order date has already passed.'}),
    inv:SC.card(g,{w:'w4',title:'Inventory status',note:'Materials by inventory status at the first week in view. Low coverage = coverage shorter than lead time. Click to open Inventory.'}),
    cap:SC.card(g,{w:'w4',title:'Capacity utilization by plant',note:'Required ÷ available hours. Click a plant to drill into its lines.'}),
    alerts:SC.card(g,{w:'w12',title:'Critical alerts',note:'Generated from the current filter selection. Click an alert to open the underlying exception.'})};
  SC.ov.alerts.body.className='';
};
SC.draw.overview=function(v){
  const M=v.M,a=SC.agg(v),o=SC.ov,F=v.F;
  const dTone=(x,g,w)=>x<=g?'ok':x<=w?'warn':'bad';
  const attain=a.attain;
  SC.kpis(o.k,[
   {label:'Total demand',value:f.c(a.demand),sub:'cases · final demand',tip:'Final demand = max(forecast, customer orders), summed over the selected weeks',go:()=>SC.go('mps')},
   {label:'Planned production',value:f.c(a.planned),sub:`executable ${f.c(a.exec)} · attainment ${f.p1(attain)}`,tone:attain>=98?'ok':attain>=92?'warn':'bad',tip:'Planned production = MPS requirement (demand + safety stock − FG inventory, rounded up to batch size). Executable production = feasible after material constraints. Plan attainment = executable ÷ planned.',go:()=>SC.go('mps')},
   {label:'Material availability',value:f.p0(a.avail),sub:`${a.nMat-a.shortMats.size} of ${a.nMat} materials fully covered`,tone:a.avail>=90?'ok':a.avail>=75?'warn':'bad',go:()=>SC.go('mrp'),tip:'Share of materials with no shortage in the selected period'},
   {label:'Critical shortages',value:f.n(a.critMats.size),sub:`${a.shortMats.size} materials in shortage`,tone:a.critMats.size?'bad':'ok',go:()=>SC.go('short',{risk:'Critical'}),tip:'Materials with a shortage and High criticality (the order date has already passed)'},
   {label:'Open purchase requirements',value:f.egp(a.needV),sub:`${a.need.length} POs · ${f.egp(SC.sum(a.urgent,r=>r.EstPurchaseValue))} due now`,tone:a.immed.length?'bad':'neutral',go:()=>SC.go('proc'),tip:'Value of recommended POs from MRP net requirements; “due now” = order date passed or within 7 days'},
   {label:'Capacity utilization',value:f.p0(a.util),sub:`${a.overLW.length} line-weeks over 100%`,tone:a.util>95?'bad':a.util>80?'warn':'ok',go:()=>SC.go('cap'),tip:'Required ÷ available line hours'}]);
  SC.kpis(o.k2,[
   {label:'Avg inventory coverage',value:f.wks(a.cov),sub:'available ÷ avg weekly requirement',tone:'neutral',go:()=>SC.go('inv')},
   {label:'Materials at risk',value:f.n(a.riskMats.size),sub:'not yet short · order due ≤14 days or near safety stock',tone:a.riskMats.size>10?'warn':'ok',go:()=>SC.go('mrp'),tip:'MRP status At Risk: a recommended PO is due within 14 days, or projected stock is close to safety stock. Excludes materials already in shortage.'},
   {label:'High-risk suppliers',value:f.n(a.hiSup.length),sub:`of ${v.sups.length} suppliers · ${a.latePOs.length} late POs`,tone:a.hiSup.length?'warn':'ok',go:()=>SC.go('sup')}],true);
  // trend
  const demandW=byWeek(v,v.mps,r=>r.Demand),planW=byWeek(v,v.mps,r=>r.PlannedProduction),execW=byWeek(v,v.mps,r=>r.ExecutableProduction);
  SC.lineChart(o.trend.body,wl(M,v.idxs),[{name:'Final demand',color:C.gray,values:demandW,area:true},{name:'Planned production (MPS)',color:C.blue,values:planW},{name:'Executable production (material-feasible)',color:C.bad,values:execW,dash:'4 3',w:1.5}],{h:230,tipTitle:i=>M.weeks[v.idxs[i]].Week,legend:true});
  // health
  const fc=v.demand,near=fc.filter(r=>r.idx<v.snapIdx+4);const dv=near.length?SC.sum(near,r=>r.FinalDemand)/SC.sum(near,r=>r.ForecastDemand)*100-100:0;
  const lwShare=v.cap.length?a.overLW.length/v.cap.length*100:0;
  const H=[
   ['Demand',dTone(dv,5,12),`Orders ${f.p1(dv)} above forecast (next 4 wks)`,'mps'],
   ['Production',a.attain>=98?'ok':a.attain>=92?'warn':'bad',`Attainment ${f.p1(a.attain)} (executable ÷ planned)`,'mps'],
   ['Materials',a.avail>=90?'ok':a.avail>=75?'warn':'bad',`${a.shortMats.size} materials short · ${f.p0(a.avail)} available`,'short'],
   ['Procurement',a.immed.length===0&&a.latePOs.length<=2?'ok':a.immed.length<=10?'warn':'bad',`${a.immed.length} POs overdue to place · ${a.latePOs.length} late POs`,'proc'],
   ['Capacity',lwShare<5?'ok':lwShare<10?'warn':'bad',`${a.overLW.length} of ${v.cap.length} line-weeks over 100%`,'cap']];
  const hb=o.health.body;hb.replaceChildren();const hl=SC.el('div','sc-health');
  for(const [n,t,m,pg] of H){const r=SC.el('div','sc-hrow');r.style.cursor='pointer';const lab=t==='ok'?'Healthy':t==='warn'?'Warning':'Critical';
    r.innerHTML=`<b>${n}</b>${SC.pill(lab,t==='ok'?'ok':t==='warn'?'warn':'bad')}<span class="m">${SC.esc(m)}</span>`;r.addEventListener('click',()=>SC.go(pg));hl.append(r)}
  hb.append(hl);
  SC.health=H.map(h=>({n:h[0],t:h[1]}));
  // top shortages
  const top=d3.rollups(a.shortRows,rs=>({v:SC.sum(rs,r=>r.shortV),q:SC.sum(rs,r=>r.ShortageQty),m:rs[0]}),r=>r.MaterialID).sort((x,y)=>y[1].v-x[1].v).slice(0,10);
  SC.barH(o.top.body,top.map(([id,d])=>({label:`${id} ${d.m.name}`,v:d.v,color:d.m.risk==='Critical'?C.crit:C.bad,tip:`<b>${id} ${SC.esc(d.m.name)}</b><br>Shortage ${f.q(d.q)} ${d.m.uom} · ${f.egp(d.v)}<br>Supplier ${SC.esc(d.m.sup)} · LT ${d.m.lt} d`,onClick:()=>SC.go('short',{mat:id})})),{fmt:f.egp,valW:70});
  // inventory status
  const cnt=d3.rollup(v.inv,x=>x.length,d=>d.status);const order=['Below Safety Stock','Low Coverage','Healthy','Excess'];
  SC.barH(o.inv.body,order.map(s=>({label:s,v:cnt.get(s)||0,color:SC.statusColor[s]||C.gray,onClick:()=>SC.go('inv'),tip:`<b>${s}</b><br>${cnt.get(s)||0} materials${s==='Low Coverage'?'<br>coverage shorter than supplier lead time':s==='Excess'?'<br>coverage above lead time + 12 weeks':''}`})),{fmt:f.n,bh:24});
  // capacity by plant
  const pl=['P1','P2','P3'].map(p=>{const rs=v.cap.filter(r=>r.Plant===p);const rq=SC.sum(rs,r=>r.RequiredCapacityHours),av=SC.sum(rs,r=>r.AvailableCapacityHours);return {p,u:av?rq/av*100:null,rq,av}}).filter(d=>d.u!=null);
  SC.barH(o.cap.body,pl.map(d=>({label:M.plantShort[d.p],full:M.plantFull[d.p],v:d.u,color:d.u>100?C.crit:d.u>95?'#d9692b':d.u>80?C.warn:C.ok,suffix:'%',onClick:()=>SC.go('cap',{plant:d.p}),tip:`<b>${M.plantFull[d.p]}</b><br>${f.p1(d.u)} utilization<br>${f.n(d.rq)} of ${f.n(d.av)} hrs`})),{fmt:f.n,max:Math.max(120,d3.max(pl,d=>d.u)),ref:100,refLabel:'100%',bh:26,axis:true});
  // alerts
  const al=[];
  for(const r of a.shortRows.filter(r=>r.risk==='Critical'||r.risk==='High').sort((x,y)=>y.riskN-x.riskN||x.idx-y.idx||y.shortV-x.shortV).slice(0,60)){
    const fg=SC.join(SC.list(r.fgs).slice(0,2));
    al.push({s:r.riskN*100-r.idx,tone:'bad',h:`<b>${r.MaterialID}</b> ${SC.esc(r.name)} will cause a production shortage in ${SC.short(r.Week)} (${f.q(r.ShortageQty)} ${r.uom} short)`,sub:`${r.risk} · order date passed ${r.daysPassed} days ago · affects ${fg||'—'} · supplier ${r.supId}`,go:()=>SC.go('short',{mat:r.MaterialID})})}
  for(const r of a.immed.filter(r=>r.cost>0).sort((x,y)=>y.EstPurchaseValue-x.EstPurchaseValue).slice(0,12))
    al.push({s:250-r.idx,tone:'bad',h:`${r.type==='Packaging'?'Packaging material':'Raw material'} <b>${r.MaterialID}</b> ${SC.esc(r.name)} requires an immediate purchase order`,sub:`Recommended ${f.q(r.RecommendedPOQty)} ${r.uom} (${f.egp(r.EstPurchaseValue)}) for ${SC.short(r.Week)} · lead time ${r.LeadTimeDays} d`,go:()=>SC.go('proc',{mat:r.MaterialID})});
  for(const r of a.overLW.sort((x,y)=>y.util-x.util).slice(0,10))al.push({s:200+r.util/10,tone:'bad',h:`${M.plantFull[r.Plant].split(' – ')[0]} – ${r.LineName} (${r.ProductionLine}) is planned at ${Math.round(r.util)}% capacity in ${SC.short(r.Week)}`,sub:`${f.n(r.RequiredCapacityHours)} required vs ${f.n(r.AvailableCapacityHours)} hrs available${r.Maintenance?' (planned maintenance week)':''}`,go:()=>SC.go('cap',{line:r.ProductionLine})});
  for(const p of a.latePOs.sort((x,y)=>y.openValue-x.openValue).slice(0,8)){const fgs=SC.join([...(M.usedBy[p.MaterialID]||[])].slice(0,2));
    al.push({s:180,tone:'warn',h:`Supplier <b>${p.SupplierID}</b> has a late PO (${p.POID}) for ${SC.esc(p.name)} affecting ${fgs||'—'}`,sub:`${f.q(p.OpenQuantity)} ${p.uom} open · promised ${f.d(p.ExpectedDeliveryDate)} · re-promised ${f.d(p.RevisedDeliveryDate)}`,go:()=>SC.go('sup',{sup:p.SupplierID})})}
  al.sort((x,y)=>y.s-x.s);SC.alertCount=al.length;
  const ab=o.alerts.body;ab.replaceChildren();const box=SC.el('div','sc-alerts');
  if(!al.length)box.append(SC.el('div','sc-loading','No alerts for the current filters'));
  for(const x of al.slice(0,40)){const b=SC.el('button','sc-alert '+(x.tone==='warn'?'warn':''));b.type='button';b.innerHTML=`<span>${x.h}<small>${SC.esc(x.sub)}</small></span>`;b.addEventListener('click',x.go);box.append(b)}
  ab.append(box);o.alerts.h3.textContent=`Critical alerts (${al.length})`;
};
// ---------------- MPS
SC.init.mps=function(root){
  const k=SC.el('div','sc-kpis');root.append(k);const g=SC.grid(root);
  SC.mp={k,
   dem:SC.card(g,{w:'w8',title:'Demand vs production plan',note:'Final demand = max(forecast, customer orders). Ending FG inventory shown against safety stock.'}),
   status:SC.card(g,{w:'w4',title:'MPS status',note:'Product-weeks by status. Healthy ≥ safety stock; Risk below safety stock; Shortage below zero.'}),
   wk:SC.card(g,{w:'w4',title:'Weekly production plan by plant',note:'Planned cases, stacked by plant.'}),
   plant:SC.card(g,{w:'w4',title:'Production by plant',note:'Click to filter the dashboard to a plant.'}),
   cat:SC.card(g,{w:'w4',title:'Production by product category',note:'Click to filter by category.'}),
   fo:SC.card(g,{w:'w12',title:'Forecast vs customer orders (demand planning)',note:'Customer orders cover only the near weeks; further out the forecast drives final demand.',h:200}),
   tbl:SC.card(g,{w:'w12',title:'MPS detail',note:'Projected ending inventory = opening + planned production − demand. Executable production is the material-feasible part of the plan and drives the status.'})};
};
SC.draw.mps=function(v){
  const M=v.M,a=SC.agg(v),o=SC.mp;
  const first=v.idxs[0],fgOpen=SC.sum(v.mps.filter(r=>r.idx===first),r=>r.OpeningInventory);
  const below=new Set(v.mps.filter(r=>r.idx<v.snapIdx+4&&r.MPSStatus!=='Healthy').map(r=>r.ProductID));
  SC.kpis(o.k,[{label:'Total demand',value:f.c(a.demand),sub:'cases · final demand',tip:'Final demand = max(forecast, customer orders)'},
   {label:'Planned production',value:f.c(a.planned),sub:'MPS requirement, batch-rounded',tip:'Production required by the MPS from demand, FG inventory, safety stock and batch size. Never overwritten by executable production.'},
   {label:'Executable production',value:f.c(a.exec),sub:'feasible after material limits',tone:a.attain>=98?'ok':a.attain>=92?'warn':'bad',tip:'Planned production reduced where material shortages block it'},
   {label:'Plan attainment',value:f.p1(a.attain),sub:'executable ÷ planned',tone:a.attain>=98?'ok':a.attain>=92?'warn':'bad'},
   {label:'FG inventory (opening)',value:f.c(fgOpen),sub:'first week in view',tone:'neutral'},
   {label:'Products below safety stock',value:f.n(below.size),sub:`of ${v.prodSet.size} · next 4 weeks in view`,tone:below.size?'warn':'ok',tip:'Products whose executable ending inventory falls below safety stock in the next 4 weeks of the view'}]);
  const dW=byWeek(v,v.mps,r=>r.Demand),pW=byWeek(v,v.mps,r=>r.PlannedProduction),eW=byWeek(v,v.mps,r=>r.ProjectedEndingInventory),sW=byWeek(v,v.mps,r=>r.SafetyStock);
  SC.lineChart(o.dem.body,wl(M,v.idxs),[{name:'Final demand',color:C.gray,values:dW,area:true},{name:'Planned production',color:C.blue,values:pW},{name:'Executable production',color:C.bad,values:byWeek(v,v.mps,r=>r.ExecutableProduction),dash:'4 3',w:1.5},{name:'Projected ending FG inventory',color:C.ok,values:eW,w:1.5},{name:'Safety stock',color:C.warn,values:sW,dash:'4 3',w:1.5}],{h:230,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  const st=d3.rollup(v.mps,x=>x.length,r=>r.MPSStatus);
  SC.barH(o.status.body,['Healthy','Risk','Shortage'].map(s=>({label:s,v:st.get(s)||0,color:SC.statusColor[s],tip:`<b>${s}</b><br>${st.get(s)||0} product-weeks`})),{fmt:f.n,bh:26});
  const pl=['P1','P2','P3'];const cols={P1:C.blue,P2:'#6a9bc8',P3:C.lblue};
  SC.barV(o.wk.body,wl(M,v.idxs),pl.map(p=>({name:M.plants[p],color:cols[p],values:byWeek(v,v.mps.filter(r=>r.Plant===p),r=>r.PlannedProduction)})),{h:220,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  SC.barH(o.plant.body,pl.map(p=>({label:M.plantShort[p],full:M.plantFull[p],v:SC.sum(v.mps.filter(r=>r.Plant===p),r=>r.PlannedProduction),onClick:()=>SC.set('plant',v.F.plant===p?'':p),dim:v.F.plant&&v.F.plant!==p})),{fmt:f.c,bh:24});
  const cats=SC.rollup(v.mps,r=>r.cat,r=>r.PlannedProduction).sort((x,y)=>y.v-x.v);
  SC.barH(o.cat.body,cats.map(c=>({label:c.k,v:c.v,onClick:()=>SC.set('cat',v.F.cat===c.k?'':c.k),dim:v.F.cat&&v.F.cat!==c.k})),{fmt:f.c,bh:20});
  SC.lineChart(o.fo.body,wl(M,v.idxs),[{name:'Forecast demand',color:C.gray,values:byWeek(v,v.demand,r=>r.ForecastDemand)},{name:'Customer orders',color:C.warn,values:byWeek(v,v.demand,r=>r.CustomerOrders)},{name:'Final demand',color:C.blue,values:byWeek(v,v.demand,r=>r.FinalDemand),w:2.4}],{h:190,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  const cl=r=>r.MPSStatus==='Healthy'?'':r.MPSStatus==='Risk'?'warn':'bad';
  SC.table(o.tbl.body,{rows:v.mps,max:300,sort:{k:'idx',dir:'asc'},placeholder:'Search product, plant, status…',cols:[
   {k:'idx',label:'Week',f:r=>SC.short(r.Week),txt:r=>r.Week},{k:'name',label:'Product',f:r=>r.ProductID+' '+r.name},{k:'Plant',label:'Plant'},{k:'Demand',label:'Demand',num:true,f:r=>f.n(r.Demand)},
   {k:'OpeningInventory',label:'Opening inv.',num:true,f:r=>f.n(r.OpeningInventory)},{k:'SafetyStock',label:'Safety stock',num:true,f:r=>f.n(r.SafetyStock)},
   {k:'PlannedProduction',label:'Planned prod.',tip:'MPS requirement, batch-rounded',num:true,f:r=>f.n(r.PlannedProduction)},{k:'ProjectedEndingInventory',label:'Proj. ending inv.',num:true,f:r=>f.n(r.ProjectedEndingInventory)},
   {k:'ExecutableProduction',label:'Executable prod.',tip:'Feasible after material constraints',num:true,f:r=>f.n(r.ExecutableProduction),cls:r=>r.ExecutableProduction<r.PlannedProduction?'bad':''},
   {k:'MPSStatus',label:'MPS status',cls:cl}]});
};
})();
