(function(){
const SC=window.SC={draw:{},init:{}};
SC.ids=['products','materials','bom','suppliers','demand','mps','mrp','pos','recs','capacity','weeks','lines'];
const cmp=v=>{if(v==null||isNaN(v))return '—';const a=Math.abs(v);if(a<1000)return d3.format(',.1~f')(v);const u=a>=1e9?[1e9,'B']:a>=1e6?[1e6,'M']:[1e3,'K'];const x=v/u[0];return d3.format(u[1]==='K'&&Math.abs(x)>=100?',.0f':',.1~f')(x)+u[1]};
SC.fmt={n:v=>v==null||isNaN(v)?'—':d3.format(',.1~f')(v),n1:v=>v==null||isNaN(v)?'—':d3.format(',.1f')(v),c:cmp,egp:v=>'EGP '+cmp(v),p0:v=>d3.format('.0f')(v)+'%',p1:v=>d3.format('.1~f')(v)+'%',
  q:v=>{if(v==null||isNaN(v))return '—';const a=Math.abs(v);return a>=1e5?cmp(v):a<10?d3.format(',.1~f')(v):d3.format(',.0f')(v)},d:s=>s?d3.utcFormat('%d %b %Y')(new Date(s)):'—',ds:s=>s?d3.utcFormat('%d %b')(new Date(s)):'—',
  days:v=>d3.format(',.0f')(v)+' d',wks:v=>d3.format(',.1f')(v)+' wks',hrs:v=>cmp(v)+' hrs'};
SC.C={ok:'#2f8f63',warn:'#d89a2b',bad:'#c8433a',crit:'#8f1d1d',blue:'#3b6fa8',gray:'#8a929c',lblue:'#9db8d6',lgray:'#c5cad1'};
SC.statusColor={Healthy:SC.C.ok,'High Utilization':SC.C.warn,'Capacity Risk':'#d9692b','Over Capacity':SC.C.crit,Risk:SC.C.warn,Shortage:SC.C.bad,'At Risk':SC.C.warn,Warning:SC.C.warn,Critical:SC.C.bad,Low:SC.C.ok,Medium:SC.C.warn,High:SC.C.bad,
  'Low Coverage':SC.C.warn,Excess:SC.C.blue,'Below Safety Stock':SC.C.bad,'Order Immediately':SC.C.bad,'Order This Week':SC.C.warn,Upcoming:SC.C.blue,Covered:SC.C.gray,Open:SC.C.blue,'Partially Received':SC.C.warn,Late:SC.C.bad,Received:SC.C.ok};
SC.statusColor.Critical=SC.C.crit;
const RL=['','Low','Medium','High','Critical'];
SC.RL=RL;
SC.list=x=>{if(Array.isArray(x))return x.filter(y=>y!=null&&y!=='').map(String);if(x==null||x==='')return [];
  if(typeof x==='string'){const t=x.trim();if(t[0]==='['){try{const j=JSON.parse(t);if(Array.isArray(j))return SC.list(j)}catch(e){}}return t.split(/[|,;]\s*/).map(y=>y.trim()).filter(Boolean)}
  return [String(x)]};
SC.join=(x,sep)=>SC.list(x).join(sep==null?', ':sep);
SC.sum=(a,f)=>{let s=0;for(const x of a)s+=f(x);return s};
SC.rollup=(rows,kf,vf)=>{const m=new Map();for(const r of rows){const k=kf(r);m.set(k,(m.get(k)||0)+vf(r))}return [...m].map(([k,v])=>({k,v}))};
SC.short=w=>w.replace(/^\d{4}-/,'');
// ---------- model
SC.build=function(){
  const g=id=>dash.data(id);
  if(SC.ids.some(i=>g(i).status!=='ok'))return null;
  if(SC._src&&SC.ids.every(i=>SC._src[i]===g(i).data))return SC.M;
  const D={};SC.ids.forEach(i=>D[i]=g(i).data);SC._src=D;SC._vk=null;
  const M={};
  M.today=new Date(D.weeks[0].Today+'T00:00:00Z');
  M.weeks=D.weeks.map(w=>({...w,date:new Date(w.WeekStart+'T00:00:00Z')}));M.W=Object.fromEntries(M.weeks.map(w=>[w.WeekStart,w.idx]));
  M.P=Object.fromEntries(D.products.map(p=>[p.ProductID,p]));M.products=D.products;
  M.Mt=Object.fromEntries(D.materials.map(m=>[m.MaterialID,m]));M.materials=D.materials;
  M.S=Object.fromEntries(D.suppliers.map(s=>[s.SupplierID,s]));M.suppliers=D.suppliers;
  M.L=Object.fromEntries(D.lines.map(l=>[l.ProductionLine,l]));M.lines=D.lines;
  M.plants=Object.fromEntries([['P1','Plant 1'],['P2','Plant 2'],['P3','Plant 3']]);
  M.plantFull={P1:'Plant 1 – 10th of Ramadan',P2:'Plant 2 – Alexandria',P3:'Plant 3 – Sadat City'};M.plantShort={P1:'P1 – 10th of Ramadan',P2:'P2 – Alexandria',P3:'P3 – Sadat City'};
  M.bom=D.bom;M.bomFG={};M.bomMat={};M.usedBy={};
  for(const b of D.bom){(M.bomFG[b.FinishedGoodID]||(M.bomFG[b.FinishedGoodID]=[])).push(b);(M.bomMat[b.MaterialID]||(M.bomMat[b.MaterialID]=[])).push(b)}
  for(const m in M.bomMat)M.usedBy[m]=new Set(M.bomMat[m].map(b=>b.FinishedGoodID));
  M.mps=D.mps.map(r=>{const p=M.P[r.ProductID];return {...r,idx:M.W[r.WeekStart],name:p.ProductName,cat:p.ProductCategory,brand:p.Brand}});
  M.mpsKey=new Map(M.mps.map(r=>[r.ProductID+'|'+r.idx,r]));
  M.demand=D.demand.map(r=>({...r,idx:M.W[r.WeekStart],plant:M.P[r.ProductID].Plant,line:M.P[r.ProductID].ProductionLine,cat:M.P[r.ProductID].ProductCategory}));
  M.mrp=D.mrp.map(r=>{const m=M.Mt[r.MaterialID],s=M.S[m.SupplierID];
    const base=r.Status==='Shortage'?(m.Criticality==='High'?4:3):r.Status==='At Risk'?2:1;
    const n=(s.SupplierRisk==='High'||s.SupplierRisk==='Critical')&&base>=2&&base<4?base+1:base;
    const od=new Date(r.OrderDate+'T00:00:00Z');
    return {...r,fgs:SC.list(r.AffectedFG),idx:M.W[r.WeekStart],name:m.MaterialName,type:m.MaterialType,cat:m.MaterialCategory,supId:m.SupplierID,sup:s.SupplierName,lt:m.LeadTimeDays,cost:m.UnitCost,crit:m.Criticality,uom:m.UoM,
      grossV:r.GrossRequirement*m.UnitCost,netV:r.NetRequirement*m.UnitCost,shortV:r.ShortageQty*m.UnitCost,riskN:n,risk:RL[n],daysPassed:Math.round((M.today-od)/864e5)}});
  M.mrpKey=new Map(M.mrp.map(r=>[r.MaterialID+'|'+r.idx,r]));
  M.recs=D.recs.map(r=>{const m=M.Mt[r.MaterialID],s=M.S[m.SupplierID];const idx=r.WeekStart?M.W[r.WeekStart]:null;
    const mr=idx==null?null:M.mrpKey.get(r.MaterialID+'|'+idx);
    return {...r,idx,name:m.MaterialName,type:m.MaterialType,cat:m.MaterialCategory,sup:s.SupplierName,uom:m.UoM,cost:m.UnitCost,risk:mr?mr.risk:'Low',daysPassed:r.RecommendedOrderDate?Math.round((M.today-new Date(r.RecommendedOrderDate+'T00:00:00Z'))/864e5):null}});
  M.pos=D.pos.map(p=>{const m=M.Mt[p.MaterialID];return {...p,name:m.MaterialName,cat:m.MaterialCategory,plant:m.Plant,sup:M.S[p.SupplierID].SupplierName,openValue:p.OpenQuantity*p.UnitCost,poValue:p.POQuantity*p.UnitCost,uom:m.UoM}});
  M.cap=D.capacity.map(r=>({...r,idx:M.W[r.WeekStart],util:r.CapacityUtilizationPercentage}));
  M.nW=M.weeks.length;
  SC.M=M;return M;
};
// ---------- filters
SC.keys=['period','month','week','plant','line','cat','prod','matcat','mat','sup','risk'];
SC.F=()=>{const p=dash.params()||{};const F={};SC.keys.forEach(k=>F[k]=p[k]==null||p[k]===''?'':String(p[k]));F.tab=p.tab?String(p.tab):'overview';return F};
SC.set=(k,v)=>dash.setParams({[k]:v===''||v==null?null:v});
SC.setMany=o=>{const x={};for(const k in o)x[k]=o[k]===''||o[k]==null?null:o[k];dash.setParams(x)};
SC.reset=()=>{const x={};SC.keys.forEach(k=>x[k]=null);dash.setParams(x)};
SC.go=(tab,o)=>SC.setMany({tab,...(o||{})});
SC.view=function(){
  const M=SC.M,F=SC.F(),key=JSON.stringify(F);
  if(SC._vk===key&&SC._v)return SC._v;
  const v={F,M};
  const lim=F.period==='all'||!F.period?M.nW:+F.period;
  v.weekOK=M.weeks.map(w=>w.idx<lim&&(!F.month||w.Month===F.month)&&(!F.week||w.Week===F.week));
  v.idxs=M.weeks.filter(w=>v.weekOK[w.idx]).map(w=>w.idx);
  v.snapIdx=v.idxs.length?v.idxs[0]:0;
  v.prodFilter=!!(F.line||F.cat||F.prod);
  v.prodSet=new Set(M.products.filter(p=>(!F.plant||p.Plant===F.plant)&&(!F.line||p.ProductionLine===F.line)&&(!F.cat||p.ProductCategory===F.cat)&&(!F.prod||p.ProductID===F.prod)).map(p=>p.ProductID));
  v.matSet=new Set(M.materials.filter(m=>(!F.plant||m.Plant===F.plant)&&(!F.matcat||m.MaterialCategory===F.matcat)&&(!F.mat||m.MaterialID===F.mat)&&(!F.sup||m.SupplierID===F.sup)&&(!v.prodFilter||[...M.usedBy[m.MaterialID]||[]].some(p=>v.prodSet.has(p)))).map(m=>m.MaterialID));
  v.mps=M.mps.filter(r=>v.weekOK[r.idx]&&v.prodSet.has(r.ProductID));
  v.demand=M.demand.filter(r=>v.weekOK[r.idx]&&v.prodSet.has(r.ProductID));
  v.mrp=M.mrp.filter(r=>v.weekOK[r.idx]&&v.matSet.has(r.MaterialID)&&(!F.risk||r.risk===F.risk));
  v.matIds=new Set(v.mrp.map(r=>r.MaterialID));
  const lineSet=new Set(M.products.filter(p=>v.prodSet.has(p.ProductID)).map(p=>p.ProductionLine));
  v.cap=M.cap.filter(r=>v.weekOK[r.idx]&&(!F.plant||r.Plant===F.plant)&&(!F.line||r.ProductionLine===F.line)&&(!v.prodFilter||lineSet.has(r.ProductionLine)));
  v.recs=M.recs.filter(r=>v.matIds.has(r.MaterialID)&&(r.idx==null||v.weekOK[r.idx])&&(!F.risk||r.risk===F.risk));
  v.pos=M.pos.filter(p=>v.matIds.has(p.MaterialID));
  v.sups=M.suppliers.filter(s=>(!F.sup||s.SupplierID===F.sup)&&(!F.risk||s.SupplierRisk===F.risk)&&M.materials.some(m=>m.SupplierID===s.SupplierID&&(v.matSet.has(m.MaterialID))));
  // inventory snapshot
  v.inv=[...v.matIds].map(id=>{const m=M.Mt[id];const r=M.mrpKey.get(id+'|'+v.snapIdx);if(!r)return null;
    const avail=r.AvailableInventory,ss=r.SafetyStock,avg=m.AvgWeeklyReq,cov=avg>0?avail/avg:0,ltw=m.LeadTimeDays/7;
    const status=avail<ss?'Below Safety Stock':cov<ltw?'Low Coverage':cov>ltw+12?'Excess':'Healthy';
    const grp=status==='Below Safety Stock'||status==='Low Coverage'?'Low Coverage':status==='Excess'?'Excess':'Healthy';
    return {id,m,r,avail,ss,avg,cov,ltw,status,grp,onhand:r.OnHandInventory,value:r.OnHandInventory*m.UnitCost,availV:avail*m.UnitCost,avgV:avg*m.UnitCost,
      excessQty:status==='Excess'?Math.max(0,avail-(ss+avg*(ltw+12))):0}}).filter(Boolean);
  SC._vk=key;SC._v=v;return v;
};
// ---------- tooltip
SC.tip=(e,html)=>{const t=document.getElementById('sc-tip'),root=document.getElementById('sc');if(!html){t.style.display='none';return}
  t.innerHTML=html;t.style.display='block';const b=root.getBoundingClientRect();let x=e.clientX-b.left+12,y=e.clientY-b.top+12;
  if(x+t.offsetWidth>b.width)x=e.clientX-b.left-t.offsetWidth-12;if(x<0)x=2;t.style.left=x+'px';t.style.top=y+'px'};
SC.esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// ---------- DOM helpers
SC.el=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.textContent=html;return e};
SC.card=(grid,o)=>{const c=SC.el('div','sc-card '+(o.w||''));if(o.id)c.id=o.id;const h=SC.el('h3',null,o.title);c.append(h);if(o.note){c.append(SC.el('div','n',o.note))}
  const b=SC.el('div','sc-chart');if(o.h)b.style.minHeight=o.h+'px';c.append(b);grid.append(c);c.body=b;c.h3=h;return c};
SC.grid=host=>{const g=SC.el('div','sc-grid');host.append(g);return g};
SC.kpis=(host,items,small)=>{host.replaceChildren();host.classList.toggle('sm',!!small);for(const it of items){const b=SC.el('button','sc-kpi '+(it.tone||'neutral'));b.type='button';b.title=it.tip||'';
  b.append(SC.el('span','l',it.label),SC.el('span','v',it.value),SC.el('span','s',it.sub||' '));if(it.go)b.addEventListener('click',it.go);host.append(b)}};
SC.pill=(txt,tone)=>`<span class="sc-pill ${tone}">${SC.esc(txt)}</span>`;
SC.riskTone={Low:'ok',Medium:'warn',High:'bad',Critical:'crit',Healthy:'ok','At Risk':'warn',Shortage:'bad',Risk:'warn'};
// ---------- sortable, searchable table (persistent per host)
SC.table=function(host,o){
  let T=host._t;
  if(!T){T=host._t={q:'',sort:o.sort||null};
    const bar=SC.el('div','sc-tbar');const inp=SC.el('input');inp.type='search';inp.placeholder=o.placeholder||'Search…';inp.setAttribute('aria-label','Search table');
    const cnt=SC.el('span','c');bar.append(inp,cnt);if(o.toolbar)bar.append(...o.toolbar);
    const w=SC.el('div','sc-tw');const tbl=SC.el('table');const thead=SC.el('thead'),tbody=SC.el('tbody');tbl.append(thead,tbody);w.append(tbl);
    host.replaceChildren(bar,w);Object.assign(T,{inp,cnt,thead,tbody});
    inp.addEventListener('input',()=>{T.q=inp.value.toLowerCase();T.render()});}
  T.o=o;
  T.render=()=>{const o=T.o;let rows=o.rows;
    if(T.q)rows=rows.filter(r=>o.cols.some(c=>{const x=c.txt?c.txt(r):c.f?c.f(r):r[c.k];return x!=null&&String(x).toLowerCase().includes(T.q)}));
    if(T.sort){const c=o.cols.find(c=>c.k===T.sort.k);if(c){const g=c.sv||(r=>r[c.k]);rows=[...rows].sort((a,b)=>{let x=g(a),y=g(b);if(x==null)return 1;if(y==null)return -1;return(typeof x==='number'?x-y:String(x).localeCompare(String(y)))*(T.sort.dir==='asc'?1:-1)})}}
    const max=o.max||400,shown=rows.slice(0,max);
    T.cnt.textContent=`${SC.fmt.n(rows.length)} rows`+(rows.length>max?` · showing first ${max} (sort or search to narrow)`:'');
    const tr=SC.el('tr');for(const c of o.cols){const th=SC.el('th',c.num?'num':'',c.label);th.dataset.k=c.k;if(c.tip)th.title=c.tip;if(T.sort&&T.sort.k===c.k)th.setAttribute('aria-sort',T.sort.dir==='asc'?'ascending':'descending');
      th.addEventListener('click',()=>{T.sort=T.sort&&T.sort.k===c.k?{k:c.k,dir:T.sort.dir==='asc'?'desc':'asc'}:{k:c.k,dir:c.num?'desc':'asc'};T.render()});tr.append(th)}
    T.thead.replaceChildren(tr);
    const frag=document.createDocumentFragment();
    for(const r of shown){const row=SC.el('tr');if(o.sel&&o.sel(r))row.className='sel';
      for(const c of o.cols){const td=SC.el('td',(c.num?'num ':'')+(c.cls?c.cls(r)||'':''));const val=c.f?c.f(r):r[c.k];if(c.html)td.innerHTML=c.html(r);else td.textContent=val==null?'—':val;row.append(td)}
      if(o.onRow){row.style.cursor='pointer';row.addEventListener('click',()=>o.onRow(r))}frag.append(row)}
    T.tbody.replaceChildren(frag)};
  T.render();
};
SC.fail=(el,msg)=>{el.replaceChildren(SC.el('div','sc-loading',msg||'Failed to load'))};
})();
