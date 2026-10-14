(function(){
const SC=window.SC,f=SC.fmt;
const TABS=[['overview','Executive overview'],['mps','MPS'],['mrp','MRP'],['short','Shortage control tower'],['proc','Procurement'],['inv','Inventory'],['cap','Capacity'],['sup','Suppliers'],['about','About this project']];
const $=id=>document.getElementById(id);
let built=false;const inited={};
SC.redraw=()=>render();
function buildNav(){const nav=$('sc-nav');for(const [id,l] of TABS){const b=SC.el('button',null,l);b.type='button';b.dataset.t=id;b.setAttribute('role','tab');b.addEventListener('click',()=>{SC.set('tab',id==='overview'?'':id);dash.setLink(id)});nav.append(b)}}
const FIL=[['period','Planning period'],['month','Month'],['week','Week'],['plant','Plant'],['line','Production line'],['cat','Product category'],['prod','Product'],['matcat','Material category'],['mat','Material'],['sup','Supplier'],['risk','Risk level']];
function options(M,v,k){const F=v.F,uniq=a=>[...new Set(a)];
  switch(k){
   case 'period':return [['','All 36 weeks'],['4','Next 4 weeks'],['8','Next 8 weeks'],['13','Next 13 weeks'],['26','Next 26 weeks']];
   case 'month':return uniq(M.weeks.map(w=>w.Month)).map(m=>[m,d3.utcFormat('%b %Y')(new Date(m+'-01'))]);
   case 'week':return M.weeks.map(w=>[w.Week,`${SC.short(w.Week)} · ${f.ds(w.WeekStart)}`]);
   case 'plant':return Object.entries(M.plantFull);
   case 'line':return M.lines.filter(l=>!F.plant||l.Plant===F.plant).map(l=>[l.ProductionLine,`${l.ProductionLine} ${l.LineName}`]);
   case 'cat':return uniq(M.products.map(p=>p.ProductCategory)).map(c=>[c,c]);
   case 'prod':return M.products.filter(p=>(!F.plant||p.Plant===F.plant)&&(!F.line||p.ProductionLine===F.line)&&(!F.cat||p.ProductCategory===F.cat)).map(p=>[p.ProductID,`${p.ProductID} ${p.ProductName}`]);
   case 'matcat':return uniq(M.materials.map(m=>m.MaterialCategory)).sort().map(c=>[c,c]);
   case 'mat':return M.materials.filter(m=>(!F.plant||m.Plant===F.plant)&&(!F.matcat||m.MaterialCategory===F.matcat)&&(!F.sup||m.SupplierID===F.sup)).map(m=>[m.MaterialID,`${m.MaterialID} ${m.MaterialName}`]);
   case 'sup':return M.suppliers.map(s=>[s.SupplierID,`${s.SupplierID} ${s.SupplierName}`]);
   case 'risk':return SC.RL.slice(1).map(r=>[r,r]);}}
function buildFilters(){const box=$('sc-filters');SC.fsel={};for(const [k,l] of FIL){const lb=SC.el('label',null,l);const s=SC.el('select');s.setAttribute('aria-label',l);s.addEventListener('change',()=>SC.set(k,s.value));lb.append(s);box.append(lb);SC.fsel[k]=s}}
function updFilters(M,v){for(const [k,l] of FIL){const s=SC.fsel[k],opts=options(M,v,k),sig=JSON.stringify(opts);if(s._sig!==sig){s.replaceChildren(new Option(k==='period'?'All 36 weeks':'All',''),...opts.filter(o=>!(k==='period'&&o[0]==='')).map(o=>new Option(o[1],o[0])));s._sig=sig}
  s.value=v.F[k]||'';s.classList.toggle('on',!!v.F[k])}
  const bar=$('sc-fbar');bar.replaceChildren();const act=FIL.filter(([k])=>v.F[k]);
  if(act.length){bar.append(SC.el('span',null,'Filtered by:'));for(const [k,l] of act){const o=options(M,v,k).find(o=>o[0]===v.F[k]);const c=SC.el('button','sc-chip',`${l}: ${o?o[1]:v.F[k]} ×`);c.type='button';c.addEventListener('click',()=>SC.set(k,''));bar.append(c)}
    const r=SC.el('button','sc-reset','Reset all');r.type='button';r.addEventListener('click',()=>SC.reset());bar.append(r)}
  const notes=[];if(v.prodFilter)notes.push('Product filters scope the materials to those used by the selected products; netting stays at material level across all products that share them.');
  if(v.F.risk)notes.push('Risk level applies to material exposure (MRP, shortages, procurement) and to supplier risk on the Suppliers page.');
  if(notes.length)bar.append(SC.el('span',null,notes.join(' ')))}
function about(M){const el=$('pg-about');if(el._done)return;el._done=true;
  const n=(a)=>f.n(a.length);
  el.innerHTML=`<div class="sc-about">
  <div class="sc-card"><h3>Supply Chain Planning | MRP &amp; MPS Analytics</h3>
   <p>An interactive supply chain planning solution demonstrating how demand, production schedules, BOM requirements, inventory availability, procurement lead times, supplier risk, and production capacity can be integrated to identify material shortages and support production planning.</p>
   <h3>Business problem</h3><p>Manufacturing organizations need to continuously align demand, production capacity, material availability, supplier lead times, and inventory levels. Without an integrated planning view, material shortages and production constraints may be detected too late.</p>
   <h3>Solution</h3><p>This project simulates an integrated Supply Chain Planning Control Tower connecting MPS, MRP, BOM, Inventory, Procurement, Supplier Performance, and Production Capacity.</p>
   <p><b>Synthetic data used for demonstration purposes only.</b></p></div>
  <div class="sc-card"><h3>Key capabilities</h3><ul><li>Master Production Scheduling</li><li>Material Requirements Planning</li><li>BOM Explosion</li><li>Shortage Detection</li><li>Procurement Recommendations</li><li>Inventory Coverage</li><li>Capacity Planning</li><li>Supplier Risk</li><li>Exception Management</li></ul>
   <h3>The data model</h3><p>Fictional manufacturer “Delta Consumer Products” — <span id="ab-n"></span>. Every table is derived from the one before it, so totals reconcile across pages: MPS drives BOM explosion, which drives MRP netting, which drives purchase recommendations; planned production also drives line capacity hours.</p></div>
  <div class="sc-card"><h3>Decisions Supported</h3><p>This solution supports production readiness, material shortage prioritization, procurement timing, inventory planning, supplier risk management, and capacity planning.</p></div>
  <div class="sc-card"><h3>Planning logic</h3>
   <span class="sc-eq">Final demand = MAX(forecast, customer orders)
Net production = demand + safety stock − FG inventory
Planned production = net production rounded up to batch size
Gross requirement = planned production × BOM qty × (1 + scrap)
Available = on hand − allocated
Net requirement = MAX(gross + safety stock − available − scheduled receipts, 0)
Order date = required delivery date − supplier lead time
Coverage (weeks) = available ÷ average weekly requirement
Capacity utilization = required hours ÷ available hours</span>
   <p>Capacity status: 0–80% Healthy · 80–95% High utilization · 95–100% Capacity risk · &gt;100% Over capacity.</p></div>
  <div class="sc-card"><h3>Modelling choices</h3><ul>
   <li><b>Shortage vs net requirement.</b> Every net requirement generates a recommended PO. It becomes a <i>shortage</i> only when the order date has already passed, so a standard-lead-time PO cannot arrive in time.</li>
   <li><b>Time-phased netting.</b> Recommended POs are sized to MOQ multiples and a cover target (4–8 weeks by lead time) and are rolled forward as planned receipts, so requirements are not double-counted.</li>
   <li><b>Late POs</b> are re-promised about 1–2 weeks out and counted as scheduled receipts.</li>
   <li><b>Planned vs executable production.</b> Planned = what the MPS requires (demand, inventory, safety stock, batch size). Executable = what is feasible after material constraints. Planned is never overwritten; Plan attainment = executable ÷ planned, and MPS status uses the executable plan.</li>
   <li><b>Seasonality.</b> Beverages dip in winter and rise from March; juices and biscuits build up before Ramadan (Feb 2027), which is what overloads lines.</li>
   <li><b>Inventory status.</b> Below safety stock; Low coverage when coverage is shorter than lead time; Excess when coverage exceeds lead time + 12 weeks.</li>
   <li><b>Risk level.</b> Critical = shortage on a high-criticality material; High = other shortages; Medium = at risk; Low = healthy.</li><li><b>Status sets.</b> Material: Healthy / At Risk (PO due ≤14 days or near safety stock) / Shortage. MPS: Healthy / Risk (below safety stock) / Shortage (below zero). Capacity: Healthy / High utilization / Capacity risk / Over capacity. Supplier: Low / Medium / High / Critical. Colours: green healthy, amber warning, red critical, blue/grey neutral.</li><li><b>Units.</b> Quantities are never summed across units of measure; aggregate KPIs use counts or EGP value. A High/Critical-risk supplier raises Medium/High by one level.</li></ul></div></div>`;
  el.querySelector('#ab-n').textContent=`${n(M.products)} finished goods, ${n(M.materials)} raw and packaging materials, 3 plants with ${n(M.lines)} production lines, ${n(M.suppliers)} suppliers, ${M.nW} planning weeks, ${n(M.bom)} BOM lines, ${n(M.pos)} purchase orders`}
function render(){
  const loading=$('sc-loading');const M=SC.build();
  if(!M){const st=SC.ids.map(i=>dash.data(i).status);const bad=st.find(s=>s!=='ok'&&s!=='loading');
    if(bad){loading.classList.remove('dash-skeleton');loading.textContent='Failed to load';}return}
  loading.hidden=true;
  if(!built){built=true;buildNav();buildFilters()}
  const v=SC.view(),tab=TABS.some(t=>t[0]===v.F.tab)?v.F.tab:'overview';
  updFilters(M,v);
  document.querySelectorAll('#sc-nav button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===tab));
  document.querySelectorAll('.sc-page').forEach(p=>p.hidden=p.id!=='pg-'+tab);
  const root=$('pg-'+tab);
  const isData=tab!=='about';$('sc-filters').hidden=!isData;$('sc-fbar').hidden=!isData;
  if(!inited[tab]){inited[tab]=true;if(SC.init[tab])SC.init[tab](root)}
  if(tab==='about')about(M);else SC.draw[tab](v);
  // header takeaway + nav badge
  const a=SC.agg(v);const worst=[...v.cap].sort((x,y)=>y.util-x.util)[0];
  $('sc-take').textContent=`${a.shortMats.size} of ${a.nMat} materials face a shortage, ${a.immed.length} recommended POs should already have been placed, and ${worst?`${worst.ProductionLine} peaks at ${Math.round(worst.util)}% capacity in ${SC.short(worst.Week)}`:'no capacity data in view'}.`;
  const sb=document.querySelector('#sc-nav button[data-t=short]');let bd=sb.querySelector('.badge');if(!bd){bd=SC.el('span','badge');sb.append(bd)}bd.textContent=a.shortMats.size;bd.hidden=!a.shortMats.size;
}
dash.onData(render);
})();
