(function(){
const SC=window.SC,C=SC.C,f=SC.fmt,byWeek=(...a)=>SC.byWeek(...a),wl=(...a)=>SC.wl(...a);
const WORST={Shortage:3,'At Risk':2,Healthy:1};
SC.sel={fg:'',mat:''};
// ---------------- MRP
SC.init.mrp=function(root){
  const k=SC.el('div','sc-kpis');root.append(k);const g=SC.grid(root);
  SC.mr={k,
   wk:SC.card(g,{w:'w8',title:'Material requirement by week',note:'Gross requirement value (EGP) from BOM explosion, split raw vs packaging, against net requirement after inventory and receipts.'}),
   cat:SC.card(g,{w:'w4',title:'Requirement by material category',note:'Gross value. Click to filter.'}),
   fg:SC.card(g,{w:'w5',title:'Requirement by finished good',note:'Gross requirement value driven by each finished good’s planned production. Click to open its BOM.',h:320}),
   gn:SC.card(g,{w:'w7',title:'Gross vs net requirements',note:'Net = gross + safety stock − available inventory − scheduled receipts (never below zero). The gap is covered from stock and open POs.'}),
   bom:SC.card(g,{w:'w12',title:'Interactive BOM view',note:'Select a finished good to explode its bill of materials: required quantity = planned production × BOM quantity × (1 + scrap).'}),
   tbl:SC.card(g,{w:'w12',title:'MRP detail',note:'Netting per material across the selected weeks.'})};
  const bar=SC.el('div','sc-tbar');const sel=SC.el('select');sel.setAttribute('aria-label','Finished good');sel.style.cssText='font:inherit;padding:3px;border:1px solid var(--line);border-radius:4px;background:var(--color-bg);color:var(--color-fg)';
  sel.addEventListener('change',()=>{SC.sel.fg=sel.value;SC.redraw()});bar.append(sel);const info=SC.el('span','c');bar.append(info);
  const tb=SC.el('div');SC.mr.bom.body.append(bar,tb);SC.mr.bomSel=sel;SC.mr.bomInfo=info;SC.mr.bomTbl=tb;
  const seg=SC.el('div','sc-seg');seg.innerHTML='<button type="button" aria-pressed="true" data-m="mat">By material</button><button type="button" aria-pressed="false" data-m="wk">Weekly detail</button>';
  SC.mr.mode='mat';seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;SC.mr.mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));const t=SC.mr.tbh.querySelector('.tgt');if(t)t._t=null;SC.redraw()});SC.mr.seg=seg;
  const tbh=SC.el('div');SC.mr.tbl.body.append(tbh);SC.mr.tbh=tbh;
};
const matRows=v=>{const m=new Map();for(const r of v.mrp){let x=m.get(r.MaterialID);if(!x){x={MaterialID:r.MaterialID,name:r.name,type:r.type,Plant:r.Plant,AvailableInventory:r.AvailableInventory,SafetyStock:r.SafetyStock,gross:0,sched:0,net:0,short:0,req:null,status:'Healthy',risk:r.risk,riskN:0,uom:r.uom,cost:r.cost,sup:r.sup,supId:r.supId,lt:r.lt,cat:r.cat};m.set(r.MaterialID,x)}
  x.gross+=r.GrossRequirement;x.sched+=r.ScheduledReceipts;x.net+=r.NetRequirement;x.short+=r.ShortageQty;if(r.NetRequirement>0&&!x.req)x.req=r.WeekStart;
  if(WORST[r.Status]>WORST[x.status])x.status=r.Status;if(r.riskN>x.riskN){x.riskN=r.riskN;x.risk=r.risk}}return [...m.values()]};
SC.matRows=matRows;
SC.draw.mrp=function(v){
  const M=v.M,a=SC.agg(v),o=SC.mr;
  const reqM=new Set(v.mrp.filter(r=>r.GrossRequirement>0).map(r=>r.MaterialID));
  SC.kpis(o.k,[{label:'Gross material requirement value',value:f.egp(a.grossV),sub:'Value of BOM-exploded material demand',tip:'Planned production × BOM quantity × (1 + scrap), valued at unit cost'},{label:'Net material requirement value',value:f.egp(a.netV),sub:'Value of uncovered requirements after inventory and scheduled receipts',tone:'neutral',tip:'Gross requirement + safety stock − available inventory − scheduled receipts, valued at unit cost. Recommended POs are lot-sized (MOQ + cover) so can exceed this.'},
   {label:'Required materials',value:f.n(reqM.size),sub:`${v.mrp.filter(r=>r.type==='Raw Material').length?'raw + packaging':''}`},{label:'Materials with shortage',value:f.n(a.shortMats.size),sub:'order date already passed',tone:a.shortMats.size?'bad':'ok',go:()=>SC.go('short')},
   {label:'Material availability',value:f.p0(a.avail),sub:'materials fully covered',tone:a.avail>=90?'ok':a.avail>=75?'warn':'bad'}]);
  const idx=v.idxs,lab=wl(M,idx);
  SC.barV(o.wk.body,lab,[{name:'Raw materials',color:C.blue,values:byWeek(v,v.mrp.filter(r=>r.type==='Raw Material'),r=>r.grossV),tfmt:f.egp},{name:'Packaging',color:C.lblue,values:byWeek(v,v.mrp.filter(r=>r.type==='Packaging'),r=>r.grossV),tfmt:f.egp}],
    {h:230,lines:[{name:'Net requirement',color:C.bad,values:byWeek(v,v.mrp,r=>r.netV),tfmt:f.egp}],tipTitle:i=>M.weeks[idx[i]].Week});
  const cats=SC.rollup(v.mrp,r=>r.cat,r=>r.grossV).sort((x,y)=>y.v-x.v);
  SC.barH(o.cat.body,cats.map(c=>({label:c.k,v:c.v,onClick:()=>SC.set('matcat',v.F.matcat===c.k?'':c.k),dim:v.F.matcat&&v.F.matcat!==c.k})),{fmt:f.egp,valW:74});
  // by FG via explosion
  const plan=new Map();for(const r of v.mps)plan.set(r.ProductID,(plan.get(r.ProductID)||0)+r.PlannedProduction);
  const fgv=[...v.prodSet].map(p=>{let t=0;for(const b of M.bomFG[p]||[])if(v.matSet.has(b.MaterialID))t+=(plan.get(p)||0)*b.BOMQuantity*(1+b.ScrapPercentage)*M.Mt[b.MaterialID].UnitCost;return {p,t}}).sort((x,y)=>y.t-x.t).slice(0,14);
  SC.barH(o.fg.body,fgv.map(d=>({label:d.p+' '+M.P[d.p].ProductName,v:d.t,color:SC.sel.fg===d.p?C.crit:C.blue,onClick:()=>{SC.sel.fg=d.p;SC.redraw()},tip:`<b>${d.p} ${SC.esc(M.P[d.p].ProductName)}</b><br>Gross requirement ${f.egp(d.t)}<br>Planned ${f.n(plan.get(d.p)||0)} cases`})),{fmt:f.egp,valW:74,bh:15});
  SC.barV(o.gn.body,lab,[{name:'Gross requirement',color:C.lgray,values:byWeek(v,v.mrp,r=>r.grossV),tfmt:f.egp},{name:'Net requirement',color:C.bad,values:byWeek(v,v.mrp,r=>r.netV),tfmt:f.egp}],{h:230,group:true,tipTitle:i=>M.weeks[idx[i]].Week});
  // BOM
  const fgs=[...v.prodSet].sort();if(!fgs.includes(SC.sel.fg))SC.sel.fg=fgs[0]||'';
  const sel=o.bomSel;sel.replaceChildren(...fgs.map(p=>{const op=new Option(`${p} · ${M.P[p].ProductName}`,p);return op}));sel.value=SC.sel.fg;
  const fg=SC.sel.fg;if(fg){const p=M.P[fg],pl=plan.get(fg)||0;o.bomInfo.textContent=`→ ${M.plantFull[p.Plant]} · line ${p.ProductionLine} · batch ${f.n(p.StandardBatchSize)} cases · planned ${f.n(pl)} cases in view`;
    const st=new Map();for(const r of v.mrp)if(WORST[r.Status]>(WORST[st.get(r.MaterialID)]||0))st.set(r.MaterialID,r.Status);
    const rows=(M.bomFG[fg]||[]).map(b=>{const m=M.Mt[b.MaterialID],q=pl*b.BOMQuantity*(1+b.ScrapPercentage);return {id:b.MaterialID,name:b.MaterialName,type:m.MaterialType,uom:b.UnitOfMeasure,bq:b.BOMQuantity,sc:b.ScrapPercentage,q,val:q*m.UnitCost,status:st.get(b.MaterialID)||'—',sup:m.PreferredSupplier}});
    SC.table(o.bomTbl,{rows,max:60,sort:{k:'val',dir:'desc'},cols:[{k:'id',label:'Material',f:r=>r.id+' '+r.name},{k:'type',label:'Type'},{k:'bq',label:'BOM qty / case',num:true,f:r=>d3.format('.4~g')(r.bq)},{k:'uom',label:'UoM'},{k:'sc',label:'Scrap',num:true,f:r=>f.p1(r.sc*100)},
      {k:'q',label:'Required qty',num:true,f:r=>f.q(r.q)},{k:'val',label:'Required value',num:true,f:r=>f.egp(r.val)},{k:'sup',label:'Preferred supplier'},{k:'status',label:'MRP status',cls:r=>r.status==='Shortage'?'bad':r.status==='At Risk'?'warn':''}]})}
  // table
  const th=o.tbh;if(!o.seg.parentNode)th.append(o.seg);
  if(!th.querySelector('.tgt')){const t=SC.el('div','tgt');th.append(t)}const tgt=th.querySelector('.tgt');
  const cl=r=>(r.status||r.Status)==='Shortage'?'bad':(r.status||r.Status)==='At Risk'?'warn':'';
  if(o.mode==='mat'){SC.table(tgt,{rows:matRows(v),max:200,sort:{k:'short',dir:'desc'},placeholder:'Search material, plant, status…',cols:[
   {k:'id',label:'Material',f:r=>r.MaterialID+' '+r.name,sv:r=>r.MaterialID},{k:'type',label:'Type'},{k:'Plant',label:'Plant'},{k:'gross',label:'Gross req.',num:true,f:r=>f.q(r.gross)},{k:'AvailableInventory',label:'Available inv.',num:true,f:r=>f.q(r.AvailableInventory)},
   {k:'sched',label:'Sched. receipts',num:true,f:r=>f.q(r.sched)},{k:'SafetyStock',label:'Safety stock',num:true,f:r=>f.q(r.SafetyStock)},{k:'net',label:'Net req.',num:true,f:r=>f.q(r.net)},{k:'short',label:'Shortage',num:true,f:r=>f.q(r.short),cls:r=>r.short>0?'bad':''},
   {k:'req',label:'Required date',f:r=>f.ds(r.req)},{k:'status',label:'Status',cls:cl}]})}
  else{SC.table(tgt,{rows:v.mrp,max:300,sort:{k:'idx',dir:'asc'},placeholder:'Search material, week, status…',cols:[
   {k:'idx',label:'Week',f:r=>SC.short(r.Week),txt:r=>r.Week},{k:'name',label:'Material',f:r=>r.MaterialID+' '+r.name},{k:'type',label:'Type'},{k:'Plant',label:'Plant'},{k:'GrossRequirement',label:'Gross req.',num:true,f:r=>f.q(r.GrossRequirement)},
   {k:'AvailableInventory',label:'Available inv.',num:true,f:r=>f.q(r.AvailableInventory)},{k:'ScheduledReceipts',label:'Sched. receipts',num:true,f:r=>f.q(r.ScheduledReceipts)},{k:'SafetyStock',label:'Safety stock',num:true,f:r=>f.q(r.SafetyStock)},
   {k:'NetRequirement',label:'Net req.',num:true,f:r=>f.q(r.NetRequirement)},{k:'ShortageQty',label:'Shortage',num:true,f:r=>f.q(r.ShortageQty),cls:r=>r.ShortageQty>0?'bad':''},{k:'WeekStart',label:'Required date',f:r=>f.ds(r.WeekStart)},{k:'Status',label:'Status',cls:cl}]})}
};
// ---------------- SHORTAGE CONTROL TOWER
SC.init.short=function(root){
  const k=SC.el('div','sc-kpis');const dr=SC.el('div');root.append(k,dr);const g=SC.grid(root);
  SC.st={k,dr,
   top:SC.card(g,{w:'w4',title:'Top shortages',note:'By shortage value (EGP). Click a bar to open the material.'}),
   wk:SC.card(g,{w:'w4',title:'Shortages by week',note:'Value of shortages by the week the material is needed.'}),
   plant:SC.card(g,{w:'w4',title:'Shortages by plant',note:'Click to filter.'}),
   sup:SC.card(g,{w:'w4',title:'Shortages by supplier',note:'Colour = supplier risk. Click to open the supplier.'}),
   cat:SC.card(g,{w:'w4',title:'Shortages by material category',note:'Value (EGP).'}),
   tl:SC.card(g,{w:'w4',title:'Why it can’t be fixed by normal ordering',note:'Shortages by days the order date has already passed.'}),
   time:SC.card(g,{w:'w12',title:'Critical material timeline',note:'Each dot is a week with a shortage; the grey band is the window until a new PO could physically arrive (lead time).'}),
   tbl:SC.card(g,{w:'w12',title:'Exception table',note:'One row per material-week with a shortage. Click a row to drill from material to supplier, open POs and BOM usage.'})};
};
SC.impact=function(r,M){const fgs=SC.list(r.fgs);let c=0;for(const p of fgs){const m=M.mpsKey.get(p+'|'+r.idx);if(m)c+=m.PlannedProduction*(r.BlockedShare||0)}return {fgs,c}};
SC.draw.short=function(v){
  const M=v.M,a=SC.agg(v),o=SC.st,rows=a.shortRows;
  const hi=new Set(v.mrp.filter(r=>r.riskN>=3).map(r=>r.MaterialID));
  const prods=new Set(v.mps.filter(r=>r.PlannedProduction>0&&r.MaterialFactor<1).map(r=>r.ProductID));
  const orders=v.mps.filter(r=>r.PlannedProduction>0&&r.MaterialFactor<1);
  SC.kpis(o.k,[{label:'Critical shortages',value:f.n(a.critMats.size),sub:'high-criticality, order date passed',tone:a.critMats.size?'bad':'ok'},{label:'High-risk materials',value:f.n(hi.size),sub:'shortage or risky supplier + at risk',tone:hi.size?'bad':'ok'},
   {label:'Products at risk',value:f.n(prods.size),sub:`of ${v.prodSet.size} finished goods`,tone:prods.size?'warn':'ok'},{label:'Production orders at risk',value:f.n(orders.length),sub:'product-weeks short of material',tone:orders.length?'bad':'ok'},
   {label:'Materials in shortage',value:f.n(a.shortMats.size),sub:`of ${a.nMat} materials in view`,tone:a.shortMats.size?'bad':'ok'},{label:'Est. shortage value',value:f.egp(a.shortV),sub:'shortage qty × unit cost (EGP, all UoM)',tone:a.shortV?'bad':'ok'}]);
  // drill panel
  const dr=o.dr;dr.replaceChildren();const sm=SC.sel.mat&&M.Mt[SC.sel.mat];
  if(sm){const s=M.S[sm.SupplierID],p=SC.el('div','sc-drill');const pos=M.pos.filter(x=>x.MaterialID===sm.MaterialID&&x.OpenQuantity>0);const rc=M.recs.filter(x=>x.MaterialID===sm.MaterialID&&x.NetRequirement>0).slice(0,3);
    const x=SC.el('button','x','×');x.type='button';x.addEventListener('click',()=>{SC.sel.mat='';SC.redraw()});
    const bl=SC.join((M.bomMat[sm.MaterialID]||[]).map(b=>b.FinishedGoodID));
    p.append(x);const h=SC.el('div');h.innerHTML=`<h3>${sm.MaterialID} · ${SC.esc(sm.MaterialName)} <span class="sc-pill ${SC.riskTone[s.SupplierRisk]||'gray'}">Supplier risk: ${s.SupplierRisk}</span></h3>
     <div class="n" style="font-size:12px;line-height:1.6">Material → supplier: <b>${s.SupplierID} ${SC.esc(s.SupplierName)}</b> (${SC.esc(s.Country)}) · OTIF ${s.OTIFPercentage}% · avg lead time ${s.AverageLeadTime} d · material lead time ${sm.LeadTimeDays} d · criticality ${sm.Criticality}<br>
     Used in: ${bl||'—'} · Safety stock ${f.q(sm.SafetyStock)} ${sm.UoM} · MOQ ${f.q(sm.MinimumOrderQty)} · unit cost EGP ${sm.UnitCost}<br>
     Open POs: ${pos.length?SC.join(pos.map(x=>`${x.POID} (${f.q(x.OpenQuantity)} ${x.uom}, ${x.POStatus}, due ${f.ds(x.RevisedDeliveryDate)})`),' · '):'none'}<br>
     Recommended: ${rc.length?rc.map(x=>`${f.q(x.RecommendedPOQty)} ${x.uom} for ${SC.short(x.Week)} (order by ${f.ds(x.RecommendedOrderDate)})`).join(' · '):'—'}</div>`;p.append(h);
    const b2=SC.el('button','sc-reset','Filter dashboard to this supplier');b2.type='button';b2.addEventListener('click',()=>SC.go('sup',{sup:sm.SupplierID}));p.append(b2);dr.append(p)}
  // charts
  const byMat=d3.rollups(rows,rs=>({v:SC.sum(rs,r=>r.shortV),q:SC.sum(rs,r=>r.ShortageQty),m:rs[0]}),r=>r.MaterialID).sort((x,y)=>y[1].v-x[1].v);
  SC.barH(o.top.body,byMat.slice(0,12).map(([id,d])=>({label:`${id} ${d.m.name}`,v:d.v,color:d.m.risk==='Critical'?C.crit:C.bad,onClick:()=>{SC.sel.mat=id;SC.redraw()},tip:`<b>${id} ${SC.esc(d.m.name)}</b><br>${f.q(d.q)} ${d.m.uom} short · ${f.egp(d.v)}`})),{fmt:f.egp,valW:70,bh:16});
  SC.barV(o.wk.body,wl(M,v.idxs),[{name:'Shortage value',color:C.bad,values:byWeek(v,rows,r=>r.shortV),tfmt:f.egp}],{h:210,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  SC.barH(o.plant.body,['P1','P2','P3'].map(p=>({label:M.plantShort[p],full:M.plantFull[p],v:SC.sum(rows.filter(r=>r.Plant===p),r=>r.shortV),color:C.bad,onClick:()=>SC.set('plant',v.F.plant===p?'':p),dim:v.F.plant&&v.F.plant!==p})),{fmt:f.egp,valW:70,bh:24});
  const sp=SC.rollup(rows,r=>r.supId,r=>r.shortV).sort((x,y)=>y.v-x.v).slice(0,10);
  SC.barH(o.sup.body,sp.map(d=>({label:`${d.k} ${M.S[d.k].SupplierName}`,v:d.v,color:SC.statusColor[M.S[d.k].SupplierRisk],onClick:()=>SC.go('sup',{sup:d.k}),tip:`<b>${SC.esc(M.S[d.k].SupplierName)}</b><br>${f.egp(d.v)} · risk ${M.S[d.k].SupplierRisk} · OTIF ${M.S[d.k].OTIFPercentage}%`})),{fmt:f.egp,valW:70,bh:16});
  SC.barH(o.cat.body,SC.rollup(rows,r=>r.cat,r=>r.shortV).sort((x,y)=>y.v-x.v).map(d=>({label:d.k,v:d.v,color:C.bad,onClick:()=>SC.set('matcat',v.F.matcat===d.k?'':d.k)})),{fmt:f.egp,valW:70,bh:16});
  const bk=[['≤ 7 days',0,7],['8–21 days',8,21],['22–42 days',22,42],['> 42 days',43,999]];
  SC.barH(o.tl.body,bk.map(([l,a_,b_])=>({label:l,v:SC.sum(rows.filter(r=>r.daysPassed>=a_&&r.daysPassed<=b_),r=>r.shortV),color:l==='> 42 days'?C.crit:C.bad})),{fmt:f.egp,valW:70,bh:24,});
  // timeline
  const tm=byMat.slice(0,18).map(([id,d])=>{const rs=rows.filter(r=>r.MaterialID===id);const rec=Math.min(M.nW-1,Math.ceil(d.m.lt/7)-1);const first=d3.min(rs,r=>r.idx);
    return {id,label:`${id} ${d.m.name}`,spans:[{from:first,to:Math.max(first,rec),color:C.gray,tip:`<b>${id}</b> exposure until ${SC.short(M.weeks[Math.max(first,rec)].Week)} (lead time ${d.m.lt} d)`}],
      marks:rs.map(r=>({at:r.idx,color:r.risk==='Critical'?C.crit:C.bad,r:4+Math.min(8,Math.sqrt(r.shortV)/450),tip:`<b>${id} ${SC.esc(d.m.name)}</b><br>${SC.short(r.Week)}: ${f.q(r.ShortageQty)} ${r.uom} short (${f.egp(r.shortV)})<br>Order date passed ${r.daysPassed} d ago`}))}});
  const tw=SC.el('div');o.time.body.replaceChildren(tw);SC.timeline(tw,tm,M.nW,M.weeks.map(w=>SC.short(w.Week)),{onRow:r=>{SC.sel.mat=r.id;SC.redraw();dr.scrollIntoView({block:'nearest'})}});
  // table
  const T=rows.map(r=>{const im=SC.impact(r,M);return {...r,impC:im.c,impFG:im.fgs}});
  SC.table(o.tbl.body,{rows:T,max:300,sort:{k:'shortV',dir:'desc'},placeholder:'Search material, supplier, product…',sel:r=>r.MaterialID===SC.sel.mat,onRow:r=>{SC.sel.mat=r.MaterialID;SC.redraw();dr.scrollIntoView({block:'nearest'})},cols:[
   {k:'MaterialID',label:'Material'},{k:'name',label:'Description'},{k:'type',label:'Type'},{k:'Plant',label:'Plant'},{k:'GrossRequirement',label:'Required qty',num:true,f:r=>f.q(r.GrossRequirement)},{k:'AvailableInventory',label:'Available inv.',num:true,f:r=>f.q(r.AvailableInventory)},
   {k:'ScheduledReceipts',label:'Sched. receipts',num:true,f:r=>f.q(r.ScheduledReceipts)},{k:'ShortageQty',label:'Shortage qty',num:true,f:r=>f.q(r.ShortageQty),cls:()=>'bad'},{k:'WeekStart',label:'Required date',f:r=>f.ds(r.WeekStart)},
   {k:'sup',label:'Supplier',f:r=>r.supId+' '+r.sup},{k:'lt',label:'Lead time',num:true,f:r=>r.lt+' d'},{k:'impFG',label:'Affected finished goods',f:r=>{const l=SC.list(r.impFG);return SC.join(l.slice(0,3))+(l.length>3?` +${l.length-3}`:'')}},
   {k:'impC',label:'Production impact',num:true,f:r=>r.impC?`${f.n(Math.round(r.impC/10)*10)} cases`:'—',tip:'Planned cases of affected products that cannot be supported by this material'},{k:'riskN',label:'Risk level',f:r=>r.risk,cls:r=>r.risk==='Critical'?'bad':'warn'}]});
};
// ---------------- PROCUREMENT
SC.init.proc=function(root){
  const k=SC.el('div','sc-kpis');root.append(k);const g=SC.grid(root);
  SC.pc={k,
   wk:SC.card(g,{w:'w8',title:'Purchase requirement by week',note:'Recommended PO value (EGP) by required delivery week, coloured by urgency.'}),
   po:SC.card(g,{w:'w4',title:'Open PO status',note:'Open value (EGP) by PO status. Late = promised date passed.'}),
   sup:SC.card(g,{w:'w4',title:'Purchase requirement by supplier',note:'Recommended PO value (EGP). Click to open the supplier.'}),
   cat:SC.card(g,{w:'w4',title:'Purchase requirement by category',note:'Recommended PO value (EGP). Click to filter.'}),
   lt:SC.card(g,{w:'w4',title:'Supplier lead time analysis',note:'Average lead time (days). Order date = required delivery date − lead time.'}),
   tbl:SC.card(g,{w:'w12',title:'Recommended purchasing',note:'PO quantity = net requirement and cover target, rounded up to MOQ multiples. Red order dates have already passed: expedite or spot-buy.'}),
   po2:SC.card(g,{w:'w12',title:'Open purchase orders',note:'Scheduled receipts feeding MRP. Late POs are re-promised at ~1–2 weeks.'})};
};
SC.draw.proc=function(v){
  const M=v.M,a=SC.agg(v),o=SC.pc,need=a.need;
  SC.kpis(o.k,[{label:'Recommended purchase value',value:f.egp(a.needV),sub:`${need.length} POs`,tone:'neutral'},{label:'Materials to order',value:f.n(a.needMats.size),sub:`of ${v.matIds.size} in view`},
   {label:'Urgent requirements',value:f.n(a.urgent.length),sub:`${a.immed.length} immediately · ${a.urgent.length-a.immed.length} this week`,tone:a.immed.length?'bad':a.urgent.length?'warn':'ok'},
   {label:'Late POs',value:f.n(a.latePOs.length),sub:f.egp(SC.sum(a.latePOs,p=>p.openValue))+' open',tone:a.latePOs.length>2?'bad':a.latePOs.length?'warn':'ok',go:()=>SC.go('sup')},
   {label:'Open PO value',value:f.egp(a.openPOV),sub:`${a.openPOs.length} open POs`},{label:'Avg supplier lead time',value:f.n(Math.round(d3.mean(v.sups,s=>s.AverageLeadTime)||0))+' d',sub:'across suppliers in view'}]);
  const U=['Order Immediately','Order This Week','Upcoming'];
  SC.barV(o.wk.body,wl(M,v.idxs),U.map(u=>({name:u,color:SC.statusColor[u],values:byWeek(v,need.filter(r=>r.Urgency===u),r=>r.EstPurchaseValue),tfmt:f.egp})),{h:230,tipTitle:i=>M.weeks[v.idxs[i]].Week});
  const ps=d3.rollups(v.pos.filter(p=>p.OpenQuantity>0),x=>({v:SC.sum(x,p=>p.openValue),n:x.length}),p=>p.POStatus);
  SC.barH(o.po.body,['Open','Partially Received','Late'].map(s=>{const d=(ps.find(x=>x[0]===s)||[0,{v:0,n:0}])[1];return {label:`${s} (${d.n})`,v:d.v,color:SC.statusColor[s],tip:`<b>${s}</b><br>${d.n} POs · ${f.egp(d.v)}`}}),{fmt:f.egp,valW:70,bh:24});
  const sp=SC.rollup(need,r=>r.SupplierID,r=>r.EstPurchaseValue).sort((x,y)=>y.v-x.v).slice(0,10);
  SC.barH(o.sup.body,sp.map(d=>({label:`${d.k} ${M.S[d.k].SupplierName}`,v:d.v,onClick:()=>SC.go('sup',{sup:d.k})})),{fmt:f.egp,valW:70,bh:16});
  SC.barH(o.cat.body,SC.rollup(need,r=>r.cat,r=>r.EstPurchaseValue).sort((x,y)=>y.v-x.v).map(d=>({label:d.k,v:d.v,onClick:()=>SC.set('matcat',v.F.matcat===d.k?'':d.k)})),{fmt:f.egp,valW:70,bh:16});
  SC.barH(o.lt.body,[...v.sups].sort((x,y)=>y.AverageLeadTime-x.AverageLeadTime).slice(0,12).map(s=>({label:`${s.SupplierID} ${s.SupplierName}`,v:s.AverageLeadTime,color:s.AverageLeadTime>45?C.bad:s.AverageLeadTime>=28?C.warn:C.blue,suffix:' d',onClick:()=>SC.go('sup',{sup:s.SupplierID})})),{fmt:f.n,valW:44,bh:15});
  const cl=r=>r.Urgency==='Order Immediately'?'bad':r.Urgency==='Order This Week'?'warn':'';
  SC.table(o.tbl.body,{rows:v.recs,max:300,sort:{k:'RecommendedOrderDate',dir:'asc'},placeholder:'Search material, supplier, urgency…',cols:[
   {k:'MaterialID',label:'Material',f:r=>r.MaterialID+' '+r.name},{k:'sup',label:'Supplier',f:r=>r.SupplierID+' '+r.sup},{k:'NetRequirement',label:'Net req.',num:true,f:r=>f.q(r.NetRequirement)},{k:'MinimumOrderQty',label:'MOQ',num:true,f:r=>f.q(r.MinimumOrderQty)},
   {k:'RecommendedPOQty',label:'Recommended PO qty',num:true,f:r=>f.q(r.RecommendedPOQty)},{k:'RequiredDeliveryDate',label:'Required delivery',f:r=>f.d(r.RequiredDeliveryDate)},{k:'LeadTimeDays',label:'Lead time',num:true,f:r=>r.LeadTimeDays+' d'},
   {k:'RecommendedOrderDate',label:'Order date',f:r=>r.RecommendedOrderDate?f.d(r.RecommendedOrderDate)+(r.daysPassed>0?` (passed ${r.daysPassed} d)`:''):'—',cls:r=>r.daysPassed>0?'bad':''},{k:'Urgency',label:'Urgency',cls:cl},{k:'EstPurchaseValue',label:'Est. value',num:true,f:r=>f.egp(r.EstPurchaseValue)}]});
  SC.table(o.po2.body,{rows:v.pos.filter(p=>p.OpenQuantity>0),max:200,sort:{k:'ExpectedDeliveryDate',dir:'asc'},placeholder:'Search PO, material, supplier…',cols:[
   {k:'POID',label:'PO'},{k:'name',label:'Material',f:r=>r.MaterialID+' '+r.name},{k:'sup',label:'Supplier',f:r=>r.SupplierID+' '+r.sup},{k:'OrderDate',label:'Order date',f:r=>f.d(r.OrderDate)},{k:'ExpectedDeliveryDate',label:'Expected',f:r=>f.d(r.ExpectedDeliveryDate)},
   {k:'POQuantity',label:'PO qty',num:true,f:r=>f.q(r.POQuantity)},{k:'ReceivedQuantity',label:'Received',num:true,f:r=>f.q(r.ReceivedQuantity)},{k:'OpenQuantity',label:'Open',num:true,f:r=>f.q(r.OpenQuantity)},{k:'openValue',label:'Open value',num:true,f:r=>f.egp(r.openValue)},
   {k:'POStatus',label:'Status',cls:r=>r.POStatus==='Late'?'bad':r.POStatus==='Partially Received'?'warn':''}]});
};
})();
