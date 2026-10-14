(function(){
const SC=window.SC,C=SC.C,f=SC.fmt,byWeek=(...a)=>SC.byWeek(...a),wl=(...a)=>SC.wl(...a);
SC.sel.sup='';SC.sel.cell=null;
// ---------------- INVENTORY
SC.init.inv=function(root){
  const k=SC.el('div','sc-kpis');root.append(k);const g=SC.grid(root);
  SC.iv={k,
   cat:SC.card(g,{w:'w4',title:'Inventory by material category',note:'On-hand inventory value (EGP) at the first week in view.'}),
   dist:SC.card(g,{w:'w4',title:'Inventory coverage distribution',note:'Number of materials by weeks of coverage (available ÷ avg weekly requirement).'}),
   ss:SC.card(g,{w:'w4',title:'Available inventory vs safety stock',note:'Available as % of safety stock, lowest 12 materials. Below 100% = below safety stock.',h:260}),
   sc:SC.card(g,{w:'w12',title:'Coverage vs inventory value',note:'Bubble size = average weekly consumption value. Low coverage = below safety stock or coverage shorter than the supplier lead time; Excess = more than lead time + 12 weeks.',h:320}),
   low:SC.card(g,{w:'w4',title:'Below safety stock',note:'Shortfall to safety stock, EGP.'}),
   ex:SC.card(g,{w:'w4',title:'Excess inventory',note:'Value above lead-time cover + 12 weeks, EGP.'}),
   cov:SC.card(g,{w:'w4',title:'Coverage by material',note:'Lowest 15 materials, weeks of coverage.'}),
   tbl:SC.card(g,{w:'w12',title:'Inventory detail',note:'Position at the first week in view.'})};
};
SC.draw.inv=function(v){
  const M=v.M,a=SC.agg(v),o=SC.iv,I=v.inv,cnt=s=>I.filter(d=>d.status===s).length;
  const excV=SC.sum(I.filter(d=>d.status==='Excess'),d=>d.excessQty*d.m.UnitCost);
  const crit=I.filter(d=>d.m.Criticality==='High'&&(d.status==='Below Safety Stock'||d.status==='Low Coverage'));
  SC.kpis(o.k,[{label:'Total inventory value',value:f.egp(SC.sum(I,d=>d.value)),sub:`${I.length} materials · on hand`},{label:'Avg weeks of coverage',value:f.wks(d3.mean(I,d=>d.cov)||0),sub:`median ${f.wks(d3.median(I,d=>d.cov)||0)}`,tone:'neutral'},
   {label:'Below safety stock',value:f.n(cnt('Below Safety Stock')),sub:'available < safety stock',tone:cnt('Below Safety Stock')?'bad':'ok'},{label:'Excess inventory',value:f.n(cnt('Excess')),sub:f.egp(excV)+' above target',tone:cnt('Excess')>8?'warn':'neutral'},
   {label:'Critical materials',value:f.n(crit.length),sub:'high-criticality, below safety stock or low coverage',tone:crit.length?'bad':'ok',go:()=>SC.go('short')}]);
  SC.barH(o.cat.body,SC.rollup(I,d=>d.m.MaterialCategory,d=>d.value).sort((x,y)=>y.v-x.v).map(d=>({label:d.k,v:d.v,onClick:()=>SC.set('matcat',v.F.matcat===d.k?'':d.k),dim:v.F.matcat&&v.F.matcat!==d.k})),{fmt:f.egp,valW:70,bh:16});
  const bins=[['0–2',0,2,C.bad],['2–4',2,4,C.warn],['4–6',4,6,C.ok],['6–8',6,8,C.ok],['8–12',8,12,C.ok],['12–20',12,20,C.blue],['20+',20,1e9,C.blue]];
  SC.barV(o.dist.body,bins.map(b=>b[0]+' wks'),[{name:'Materials',color:C.blue,colors:bins.map(b=>b[3]),values:bins.map(([l,lo,hi])=>I.filter(d=>d.cov>=lo&&d.cov<hi).length),tfmt:f.n}],{h:210,yfmt:f.n,legend:false});
  const ssr=[...I].filter(d=>d.ss>0).map(d=>({...d,pct:d.avail/d.ss*100})).sort((x,y)=>x.pct-y.pct).slice(0,12);
  SC.barH(o.ss.body,ssr.map(d=>({label:`${d.id} ${d.m.MaterialName}`,v:d.pct,color:d.pct<100?C.bad:d.pct<150?C.warn:C.ok,suffix:'%',onClick:()=>{SC.sel.mat=d.id;SC.go('short')},tip:`<b>${d.id} ${SC.esc(d.m.MaterialName)}</b><br>Available ${f.q(d.avail)} vs safety stock ${f.q(d.ss)} ${d.m.UoM}`})),{fmt:f.n,ref:100,refLabel:'safety stock',bh:15,max:Math.max(150,d3.max(ssr,d=>d.pct)||0)});
  // scatter
  const gc={'Low Coverage':C.bad,Healthy:C.ok,Excess:C.blue};
  SC.bubble(o.sc.body,I.map(d=>({x:Math.max(.1,d.cov),y:Math.max(1000,d.value),r:Math.max(1,d.avgV),color:gc[d.grp],tip:`<b>${d.id} ${SC.esc(d.m.MaterialName)}</b><br>${d.grp} (${d.status})<br>Coverage ${f.n1(d.cov)} wks (lead time ${f.n1(d.ltw)} wks)<br>Inventory ${f.egp(d.value)}<br>Avg weekly use ${f.egp(d.avgV)}`,id:d.id})),
    {h:320,xdom:[0.1,60],ydom:[1000,3e7],xlog:true,ylog:true,xticks:[.1,.5,1,2,4,8,16,32],yticks:[1e3,1e4,1e5,1e6,1e7],xlabel:'Inventory coverage (weeks, log scale)',ylabel:'Inventory value (EGP, log)',vlines:[{v:4,label:'4 wks'},{v:12,label:'12 wks'}],
     legend:[{name:'Low coverage',color:C.bad},{name:'Healthy',color:C.ok},{name:'Excess',color:C.blue}],onClick:d=>{SC.sel.mat=d.id;SC.go('short')}});
  SC.barH(o.low.body,I.filter(d=>d.avail<d.ss).map(d=>({d,s:(d.ss-d.avail)*d.m.UnitCost})).sort((x,y)=>y.s-x.s).slice(0,10).map(({d,s})=>({label:`${d.id} ${d.m.MaterialName}`,v:s,color:C.bad,onClick:()=>{SC.sel.mat=d.id;SC.go('short')}})),{fmt:f.egp,valW:70,bh:16});
  SC.barH(o.ex.body,I.filter(d=>d.excessQty>0).map(d=>({d,s:d.excessQty*d.m.UnitCost})).sort((x,y)=>y.s-x.s).slice(0,10).map(({d,s})=>({label:`${d.id} ${d.m.MaterialName}`,v:s,color:C.blue})),{fmt:f.egp,valW:70,bh:16});
  SC.barH(o.cov.body,[...I].sort((x,y)=>x.cov-y.cov).slice(0,15).map(d=>({label:`${d.id} ${d.m.MaterialName}`,v:d.cov,color:SC.statusColor[d.status]||C.gray,suffix:' wks',tip:`<b>${d.id}</b><br>${d.status}<br>${f.n1(d.cov)} wks vs lead time ${f.n1(d.ltw)} wks`})),{fmt:f.n1,valW:56,bh:15});
  SC.table(o.tbl.body,{rows:I,max:200,sort:{k:'cov',dir:'asc'},placeholder:'Search material, status…',onRow:d=>{SC.sel.mat=d.id;SC.go('short')},cols:[
   {k:'id',label:'Material',f:d=>d.id+' '+d.m.MaterialName,sv:d=>d.id},{k:'cat',label:'Category',f:d=>d.m.MaterialCategory},{k:'onhand',label:'On hand',num:true,f:d=>f.q(d.onhand)},{k:'avail',label:'Available',num:true,f:d=>f.q(d.avail)},{k:'ss',label:'Safety stock',num:true,f:d=>f.q(d.ss)},
   {k:'avg',label:'Avg weekly req.',num:true,f:d=>f.q(d.avg)},{k:'cov',label:'Coverage (wks)',num:true,f:d=>f.n1(d.cov)},{k:'ltw',label:'Lead time (wks)',num:true,f:d=>f.n1(d.ltw)},{k:'value',label:'Value',num:true,f:d=>f.egp(d.value)},
   {k:'status',label:'Status',cls:d=>d.status==='Below Safety Stock'?'bad':d.status==='Low Coverage'?'warn':''}]});
};
// ---------------- CAPACITY
SC.init.cap=function(root){
  const k=SC.el('div','sc-kpis');root.append(k);const g=SC.grid(root);
  SC.cp={k,
   plant:SC.card(g,{w:'w4',title:'Capacity by plant',note:'Required ÷ available hours. Click to drill into the plant’s lines.'}),
   line:SC.card(g,{w:'w4',title:'Capacity by production line',note:'Click a line to filter.'}),
   trend:SC.card(g,{w:'w4',title:'Weekly capacity trend',note:'Average utilization across lines. Ramadan build-up drives the Jan–Mar peak.'}),
   ar:SC.card(g,{w:'w12',title:'Available vs required capacity',note:'Weekly hours. Dips in available hours are planned maintenance weeks.',h:210}),
   heat:SC.card(g,{w:'w12',title:'Utilization heatmap — production line × week',note:'Required ÷ available hours. Click a cell to see which products load the line that week.'}),
   dr:SC.card(g,{w:'w5',title:'Line-week load breakdown',note:'Click a heatmap cell.'}),
   tbl:SC.card(g,{w:'w7',title:'Overloaded line-weeks',note:'Lines planned above 95% of available hours, most loaded first.'})};
};
SC.draw.cap=function(v){
  const M=v.M,a=SC.agg(v),o=SC.cp;
  const wkOver=new Set(a.overLW.map(r=>r.idx));
  SC.kpis(o.k,[{label:'Avg capacity utilization',value:f.p1(a.util),sub:'required ÷ available',tone:a.util>95?'bad':a.util>80?'warn':'ok'},{label:'Lines over capacity',value:f.n(a.overLines.size),sub:`of ${new Set(v.cap.map(r=>r.ProductionLine)).size} lines (≥1 week)`,tone:a.overLines.size?'bad':'ok'},
   {label:'Critical capacity weeks',value:f.n(wkOver.size),sub:'weeks with a line above 100%',tone:wkOver.size?'bad':'ok'},{label:'Available hours',value:f.hrs(a.capAv),sub:'line-hours'},{label:'Required hours',value:f.hrs(a.capReq),sub:'run time + changeovers',tone:a.capReq>a.capAv?'bad':'neutral'}]);
  const uc=u=>u>100?C.crit:u>95?'#d9692b':u>80?C.warn:C.ok,agg=rs=>{const rq=SC.sum(rs,r=>r.RequiredCapacityHours),av=SC.sum(rs,r=>r.AvailableCapacityHours);return {rq,av,u:av?rq/av*100:0}};
  const pl=['P1','P2','P3'].map(p=>({p,...agg(v.cap.filter(r=>r.Plant===p))})).filter(d=>d.av>0);
  SC.barH(o.plant.body,pl.map(d=>({label:M.plantShort[d.p],full:M.plantFull[d.p],v:d.u,color:uc(d.u),suffix:'%',dim:v.F.plant&&v.F.plant!==d.p,onClick:()=>SC.set('plant',v.F.plant===d.p?'':d.p),tip:`<b>${M.plantFull[d.p]}</b><br>${f.p1(d.u)} · ${f.n(d.rq)} of ${f.n(d.av)} hrs`})),{fmt:f.n,max:Math.max(120,d3.max(pl,d=>d.u)),ref:100,refLabel:'100%',bh:26,axis:true});
  const ln=M.lines.filter(l=>v.cap.some(r=>r.ProductionLine===l.ProductionLine)).map(l=>({l,...agg(v.cap.filter(r=>r.ProductionLine===l.ProductionLine))}));
  SC.barH(o.line.body,ln.map(d=>({label:`${d.l.ProductionLine} ${d.l.LineName}`,v:d.u,color:uc(d.u),suffix:'%',dim:v.F.line&&v.F.line!==d.l.ProductionLine,onClick:()=>SC.set('line',v.F.line===d.l.ProductionLine?'':d.l.ProductionLine),tip:`<b>${d.l.ProductionLine} ${SC.esc(d.l.LineName)}</b><br>${f.p1(d.u)} · ${f.n(d.rq)} of ${f.n(d.av)} hrs`})),{fmt:f.n,max:Math.max(120,d3.max(ln,d=>d.u)||0),ref:100,refLabel:'100%',bh:18,axis:true});
  const U=v.idxs.map(i=>agg(v.cap.filter(r=>r.idx===i)).u),lab=wl(M,v.idxs);
  SC.lineChart(o.trend.body,lab,[{name:'Avg utilization',color:C.blue,values:U,tfmt:f.p1}],{h:210,ymin:40,ymax:Math.max(120,d3.max(U)||0),yfmt:f.p0,refs:[{v:80,label:'80%',color:C.warn},{v:100,label:'100%',color:C.crit}],tipTitle:i=>M.weeks[v.idxs[i]].Week,legend:false});
  SC.barV(o.ar.body,lab,[{name:'Available hours',color:C.lgray,values:v.idxs.map(i=>SC.sum(v.cap.filter(r=>r.idx===i),r=>r.AvailableCapacityHours)),tfmt:f.n},{name:'Required hours',color:C.blue,values:v.idxs.map(i=>SC.sum(v.cap.filter(r=>r.idx===i),r=>r.RequiredCapacityHours)),tfmt:f.n}],{h:190,group:true,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  // heatmap
  const hr=ln.map(d=>({label:`${d.l.ProductionLine} ${d.l.LineName}`,id:d.l.ProductionLine}));const hc=v.idxs.map(i=>({i,label:SC.short(M.weeks[i].Week)}));
  const key=new Map(v.cap.map(r=>[r.ProductionLine+'|'+r.idx,r]));
  SC.heat(o.heat.body,hr,hc,(r,c)=>{const x=key.get(r.id+'|'+c.i);return x?x.util:null},{tip:d=>{const x=key.get(d.r.id+'|'+d.c.i);return x?`<b>${SC.esc(d.r.label)}</b> · ${x.Week}<br>${f.p1(x.util)} — ${x.CapacityStatus}<br>${f.n(x.RequiredCapacityHours)} of ${f.n(x.AvailableCapacityHours)} hrs${x.Maintenance?'<br>Planned maintenance':''}`:''},
    onCell:d=>{SC.sel.cell={line:d.r.id,idx:d.c.i};SC.redraw()},onRow:r=>SC.set('line',v.F.line===r.id?'':r.id)});
  // breakdown
  const cb=o.dr.body;cb.replaceChildren();const sc=SC.sel.cell&&key.get(SC.sel.cell.line+'|'+SC.sel.cell.idx);
  if(sc){const rows=M.mps.filter(r=>M.P[r.ProductID].ProductionLine===sc.ProductionLine&&r.idx===sc.idx&&r.PlannedProduction>0).map(r=>{const p=M.P[r.ProductID];return {p:r.ProductID,name:r.name,q:r.PlannedProduction,h:r.PlannedProduction/p.RunRate+r.PlannedProduction/p.StandardBatchSize*p.ChangeoverHrs,b:r.PlannedProduction/p.StandardBatchSize}});
    const hd=SC.el('div','n',`${sc.ProductionLine} ${sc.LineName} · ${sc.Week} · ${f.p1(sc.util)} (${f.n(sc.RequiredCapacityHours)} of ${f.n(sc.AvailableCapacityHours)} hrs)`);hd.style.marginBottom='6px';const t=SC.el('div');cb.append(hd,t);
    SC.table(t,{rows,max:30,sort:{k:'h',dir:'desc'},cols:[{k:'name',label:'Product',f:r=>r.p+' '+r.name},{k:'q',label:'Cases',num:true,f:r=>f.n(r.q)},{k:'b',label:'Batches',num:true,f:r=>f.n1(r.b)},{k:'h',label:'Hours',num:true,f:r=>f.n1(r.h)}]})}
  else cb.append(SC.el('div','sc-loading','Select a cell in the heatmap'));
  SC.table(o.tbl.body,{rows:v.cap.filter(r=>r.util>95),max:100,sort:{k:'util',dir:'desc'},placeholder:'Search line, week…',onRow:r=>{SC.sel.cell={line:r.ProductionLine,idx:r.idx};SC.redraw()},cols:[
   {k:'idx',label:'Week',f:r=>SC.short(r.Week),txt:r=>r.Week},{k:'ProductionLine',label:'Line',f:r=>r.ProductionLine+' '+r.LineName},{k:'AvailableCapacityHours',label:'Available hrs',num:true,f:r=>f.n(r.AvailableCapacityHours)},{k:'RequiredCapacityHours',label:'Required hrs',num:true,f:r=>f.n(r.RequiredCapacityHours)},
   {k:'util',label:'Util.',num:true,f:r=>f.p1(r.util),cls:r=>r.util>100?'bad':'warn'},{k:'CapacityStatus',label:'Status',cls:r=>r.util>100?'bad':'warn'},{k:'Maintenance',label:'Maintenance',f:r=>r.Maintenance?'Yes':''}]});
};
// ---------------- SUPPLIERS
SC.init.sup=function(root){
  const k=SC.el('div','sc-kpis');const dr=SC.el('div');root.append(k,dr);const g=SC.grid(root);
  SC.sp={k,dr,
   otif:SC.card(g,{w:'w4',title:'Supplier OTIF ranking',note:'On-time-in-full %. Colour = supplier risk. Click to drill into the supplier.',h:300}),
   lt:SC.card(g,{w:'w4',title:'Supplier lead time',note:'Average lead time in days.',h:300}),
   rd:SC.card(g,{w:'w4',title:'Supplier risk distribution',note:'Risk = OTIF, lead time, import exposure, critical-material concentration and late POs. Click to filter.'}),
   dep:SC.card(g,{w:'w6',title:'Supplier dependence',note:'Share of total purchase value (open POs + recommended POs).'}),
   mps:SC.card(g,{w:'w6',title:'Materials per supplier',note:'Number of materials supplied; high-criticality materials in red.'}),
   mx:SC.card(g,{w:'w12',title:'Supplier risk matrix',note:'Lead time vs OTIF. Bubble size = purchase value. Bottom-right (long lead time, low OTIF) is the danger zone.',h:330}),
   tbl:SC.card(g,{w:'w12',title:'Supplier scorecard',note:'Click a supplier to drill into its materials.'})};
};
SC.draw.sup=function(v){
  const M=v.M,a=SC.agg(v),o=SC.sp,S=v.sups;
  const riskyCrit=M.materials.filter(m=>v.matSet.has(m.MaterialID)&&m.Criticality==='High'&&['High','Critical'].includes(M.S[m.SupplierID].SupplierRisk));
  SC.kpis(o.k,[{label:'Avg supplier OTIF',value:f.p1(d3.mean(S,s=>s.OTIFPercentage)||0),sub:'simple average',tone:(d3.mean(S,s=>s.OTIFPercentage)||0)>=90?'ok':'warn'},{label:'Avg lead time',value:f.n(Math.round(d3.mean(S,s=>s.AverageLeadTime)||0))+' d',sub:'across suppliers',tone:'neutral'},
   {label:'High-risk suppliers',value:f.n(a.hiSup.length),sub:'High + Critical',tone:a.hiSup.length?'bad':'ok'},{label:'Late POs',value:f.n(a.latePOs.length),sub:f.egp(SC.sum(a.latePOs,p=>p.openValue))+' open',tone:a.latePOs.length>2?'bad':a.latePOs.length?'warn':'ok'},
   {label:'Critical materials at risk',value:f.n(riskyCrit.length),sub:'high-criticality from High/Critical-risk suppliers',tone:riskyCrit.length?'bad':'ok'}]);
  const rc=s=>SC.statusColor[s.SupplierRisk];
  SC.barH(o.otif.body,[...S].sort((x,y)=>y.OTIFPercentage-x.OTIFPercentage).map(s=>({label:`${s.SupplierID} ${s.SupplierName}`,v:s.OTIFPercentage,color:rc(s),suffix:'%',dim:v.F.sup&&v.F.sup!==s.SupplierID,onClick:()=>{SC.sel.sup=SC.sel.sup===s.SupplierID?'':s.SupplierID;SC.redraw()}})),{fmt:f.n,max:100,ref:90,refLabel:'90%',bh:13,valW:40});
  SC.barH(o.lt.body,[...S].sort((x,y)=>y.AverageLeadTime-x.AverageLeadTime).map(s=>({label:`${s.SupplierID} ${s.SupplierName}`,v:s.AverageLeadTime,color:s.AverageLeadTime>45?C.bad:s.AverageLeadTime>=28?C.warn:C.blue,suffix:' d',onClick:()=>{SC.sel.sup=s.SupplierID;SC.redraw()}})),{fmt:f.n,bh:13,valW:40});
  SC.barH(o.rd.body,SC.RL.slice(1).map(l=>({label:l,v:S.filter(s=>s.SupplierRisk===l).length,color:SC.statusColor[l]==null?C.gray:l==='Critical'?C.crit:SC.statusColor[l],dim:v.F.risk&&v.F.risk!==l,onClick:()=>SC.set('risk',v.F.risk===l?'':l)})),{fmt:f.n,bh:26});
  const tot=SC.sum(S,s=>s.PurchaseValue)||1;
  SC.barH(o.dep.body,[...S].sort((x,y)=>y.PurchaseValue-x.PurchaseValue).slice(0,10).map(s=>({label:`${s.SupplierID} ${s.SupplierName}`,v:s.PurchaseValue/tot*100,color:rc(s),suffix:'%',tip:`<b>${SC.esc(s.SupplierName)}</b><br>${f.egp(s.PurchaseValue)} (${f.p1(s.PurchaseValue/tot*100)})`,onClick:()=>{SC.sel.sup=s.SupplierID;SC.redraw()}})),{fmt:f.n1,bh:16,valW:46});
  const mc=s=>M.materials.filter(m=>m.SupplierID===s.SupplierID&&v.matSet.has(m.MaterialID));
  SC.barH(o.mps.body,[...S].map(s=>({s,m:mc(s)})).sort((x,y)=>y.m.length-x.m.length).slice(0,12).map(({s,m})=>({label:`${s.SupplierID} ${s.SupplierName}`,v:m.length,color:m.some(x=>x.Criticality==='High')?C.blue:C.lgray,suffix:`  (${m.filter(x=>x.Criticality==='High').length} critical)`,onClick:()=>{SC.sel.sup=s.SupplierID;SC.redraw()}})),{fmt:f.n,bh:16,valW:90});
  SC.bubble(o.mx.body,S.map(s=>({x:s.AverageLeadTime,y:s.OTIFPercentage,r:s.PurchaseValue||1,color:rc(s),tip:`<b>${s.SupplierID} ${SC.esc(s.SupplierName)}</b> (${SC.esc(s.Country)})<br>Risk: ${s.SupplierRisk} (score ${s.RiskScore})<br>Lead time ${s.AverageLeadTime} d · OTIF ${s.OTIFPercentage}%<br>Purchase value ${f.egp(s.PurchaseValue)}`,id:s.SupplierID,lab:s.SupplierID})),
    {h:330,xdom:[0,65],ydom:[72,100],xfmt:d=>d+' d',yfmt:d=>d+'%',xlabel:'Average lead time (days)',ylabel:'OTIF %',vlines:[{v:28,label:'28 d'},{v:45,label:'45 d'}],legend:SC.RL.slice(1).map(l=>({name:l,color:l==='Critical'?C.crit:SC.statusColor[l]})),onClick:d=>{SC.sel.sup=d.id;SC.redraw()}});
  // drill
  const dr=o.dr;dr.replaceChildren();const s=SC.sel.sup&&M.S[SC.sel.sup];
  if(s){const p=SC.el('div','sc-drill');const x=SC.el('button','x','×');x.type='button';x.addEventListener('click',()=>{SC.sel.sup='';SC.redraw()});p.append(x);
    const h=SC.el('div');h.innerHTML=`<h3>${s.SupplierID} · ${SC.esc(s.SupplierName)} <span class="sc-pill ${SC.riskTone[s.SupplierRisk]||'gray'}">${s.SupplierRisk} risk</span></h3><div class="n">${SC.esc(s.Country)} · OTIF ${s.OTIFPercentage}% · avg lead time ${s.AverageLeadTime} d · ${s.Materials} materials (${s.CriticalMaterials} high-criticality) · ${s.LatePOs} late POs · purchase value ${f.egp(s.PurchaseValue)}</div>`;p.append(h);
    const t=SC.el('div');p.append(t);dr.append(p);
    const rows=M.materials.filter(m=>m.SupplierID===s.SupplierID).map(m=>{const rs=M.mrp.filter(r=>r.MaterialID===m.MaterialID);return {id:m.MaterialID,name:m.MaterialName,crit:m.Criticality,lt:m.LeadTimeDays,short:SC.sum(rs,r=>r.ShortageQty),st:rs.some(r=>r.Status==='Shortage')?'Shortage':rs.some(r=>r.Status==='At Risk')?'At Risk':'Healthy',uom:m.UoM,pos:M.pos.filter(x=>x.MaterialID===m.MaterialID&&x.OpenQuantity>0).length}});
    SC.table(t,{rows,max:40,sort:{k:'short',dir:'desc'},onRow:r=>{SC.sel.mat=r.id;SC.go('short')},cols:[{k:'id',label:'Material',f:r=>r.id+' '+r.name,sv:r=>r.id},{k:'crit',label:'Criticality'},{k:'lt',label:'Lead time',num:true,f:r=>r.lt+' d'},{k:'pos',label:'Open POs',num:true},{k:'short',label:'Shortage qty',num:true,f:r=>f.q(r.short)+' '+r.uom,cls:r=>r.short>0?'bad':''},{k:'st',label:'MRP status',cls:r=>r.st==='Shortage'?'bad':r.st==='At Risk'?'warn':''}]})}
  SC.table(o.tbl.body,{rows:S,max:40,sort:{k:'RiskScore',dir:'desc'},sel:r=>r.SupplierID===SC.sel.sup,onRow:r=>{SC.sel.sup=r.SupplierID;SC.redraw();dr.scrollIntoView({block:'nearest'})},cols:[
   {k:'SupplierID',label:'Supplier',f:r=>r.SupplierID+' '+r.SupplierName},{k:'Country',label:'Country'},{k:'AverageLeadTime',label:'Lead time',num:true,f:r=>r.AverageLeadTime+' d'},{k:'OTIFPercentage',label:'OTIF',num:true,f:r=>r.OTIFPercentage+'%',cls:r=>r.OTIFPercentage<85?'bad':''},
   {k:'Materials',label:'Materials',num:true},{k:'CriticalMaterials',label:'High-crit.',num:true},{k:'LatePOs',label:'Late POs',num:true,cls:r=>r.LatePOs>1?'bad':''},{k:'OpenPOValue',label:'Open PO value',num:true,f:r=>f.egp(r.OpenPOValue)},{k:'RecommendedPurchaseValue',label:'Recommended value',num:true,f:r=>f.egp(r.RecommendedPurchaseValue)},
   {k:'RiskScore',label:'Risk',f:r=>r.SupplierRisk+' ('+r.RiskScore+')',cls:r=>r.SupplierRisk==='Critical'||r.SupplierRisk==='High'?'bad':r.SupplierRisk==='Medium'?'warn':''}]});
};
})();
