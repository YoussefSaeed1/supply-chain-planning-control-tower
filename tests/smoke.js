const {JSDOM}=require('jsdom');const fs=require('fs');const d3=require('d3');
const W=__dirname+'/../dashboard/',O=__dirname+'/../data/';
let html=fs.readFileSync(W+'index.html','utf8').replace(/<script src="[^"]+"><\/script>/g,'').replace(/<link[^>]*>/,'');
const dom=new JSDOM('<body><div id="dash-root">'+html+'</div></body>',{runScripts:'outside-only',pretendToBeVisual:true});
const w=dom.window;w.d3=d3;
w.HTMLCanvasElement.prototype.getContext=()=>({measureText:s=>({width:String(s).length*6}),set font(v){}});
const data={};for(const id of ['products','materials','bom','suppliers','demand','mps','mrp','pos','recs','capacity','weeks','lines'])data[id]=JSON.parse(fs.readFileSync(O+id+'.json','utf8'));
let params={},cbs=[],errs=[];
w.dash={data:id=>({status:'ok',data:data[id]}),params:()=>params,setParams:o=>{Object.assign(params,o);cbs.forEach(c=>c())},resetParams:()=>{params={}},onData:c=>{cbs.push(c);c()},setLink:()=>{},colors:[]};
w.addEventListener('error',e=>errs.push(e.message));
for(const s of ['core','charts','pages1','pages2','pages3','boot']){try{w.eval(fs.readFileSync(W+s+'.js','utf8'))}catch(e){console.log('LOAD ERR',s,e.stack.split('\n').slice(0,4).join('|'));process.exit(1)}}
const run=(label)=>{try{cbs.forEach(c=>c())}catch(e){console.log('ERR',label,e.stack.split('\n').slice(0,5).join('\n'));errs.push(label)}};
for(const t of ['overview','mps','mrp','short','proc','inv','cap','sup','about']){params={tab:t};run(t);const pg=w.document.getElementById('pg-'+t);console.log(t,'svgs',pg.querySelectorAll('svg').length,'tables',pg.querySelectorAll('table').length,'rows',pg.querySelectorAll('tbody tr').length,'kpis',[...pg.querySelectorAll('.sc-kpi')].map(k=>k.querySelector('.l').textContent+'='+k.querySelector('.v').textContent).join(' | '))}
const scan=(label)=>{const t=w.document.getElementById('dash-root');
  const all=[...t.querySelectorAll('.sc-page:not([hidden]), #sc-take, #sc-fbar')].map(e=>e.textContent+' '+(e.title||'')).join(' | ');
  const m1=all.match(/.{0,40}(NaN|undefined|\[object|Infinity|null).{0,30}/g);
  const lab=[...t.querySelectorAll('.sc-page:not([hidden]) svg text, .sc-kpi, .sc-pill, .sc-card h3, .sc-card .note')].map(e=>e.textContent).join(' | ');
  const m2=lab.match(/.{0,30}\d\.\d{2,}.{0,20}/g);
  if(m1){console.log('BAD1',label,m1.slice(0,3));errs.push(label)}if(m2){console.log('BAD2',label,m2.slice(0,3));errs.push(label)}};
const tabs=['overview','mps','mrp','short','proc','inv','cap','sup','about'];
const extras=[{},{plant:'P1'},{plant:'P2'},{plant:'P3'},{period:'8'},{period:'4',risk:'Critical'},{cat:'Snacks'},{line:'P1-A'},{line:'P2-B'},{sup:'SUP-06'},{risk:'High'},{plant:'P2',period:'12'},{matcat:'Surfactants'}];
for(const t of tabs){for(const x of extras){params={tab:t,...x};run(t+JSON.stringify(x));scan(t+JSON.stringify(x));}}
for(const t of ['short','mrp','proc','inv']){params={tab:t,mat:'MAT-001'};run(t+' mat');scan(t+' mat');params={tab:t,fg:'FG-001'};run(t+' fg');scan(t+' fg')}
for(const t of tabs){params={tab:t};run(t);console.log(t,[...w.document.querySelectorAll('#pg-'+t+' .sc-kpi')].map(k=>k.textContent.replace(/\s+/g,' ')).join(' || ').slice(0,700))}
console.log('errors',errs.length,errs.slice(0,8));
