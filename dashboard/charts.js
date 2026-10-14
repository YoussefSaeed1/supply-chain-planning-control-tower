(function(){
const SC=window.SC,C=SC.C;
const cv=document.createElement('canvas').getContext('2d');cv.font='10.5px sans-serif';
const tw=s=>cv.measureText(String(s)).width;
const trunc=(s,px)=>{s=String(s);if(tw(s)<=px)return s;while(s.length>2&&tw(s+'…')>px)s=s.slice(0,-1);return s+'…'};
SC.trunc=trunc;SC.tw=tw;
const W=el=>Math.max(260,el.clientWidth||el.parentElement&&el.parentElement.clientWidth||600);
const mk=(el,w,h)=>{el.replaceChildren();return d3.select(el).append('svg').attr('width','100%').attr('viewBox',`0 0 ${w} ${h}`).attr('height',h)};
const empty=(el,msg)=>{el.replaceChildren();const d=SC.el('div','sc-loading',msg||'No data for the current filters');el.append(d)};
SC.empty=empty;
const hov=(sel,fn)=>sel.on('mousemove',(e,d)=>SC.tip(e,fn(d))).on('mouseleave',e=>SC.tip(e,null));
SC.legend=(el,items)=>{const l=SC.el('div','sc-leg');for(const it of items){const s=SC.el('span');const i=SC.el('i');i.style.background=it.color;s.append(i,document.createTextNode(it.name));l.append(s)}el.prepend(l)};
// ---- horizontal bars
SC.barH=function(el,data,o={}){
  if(!data.length)return empty(el);
  const w=W(el),bh=o.bh||18,gap=6,m={t:4,r:o.valW||64,b:o.axis?18:4,l:Math.min(w*.46,Math.max(...data.map(d=>tw(d.label)))+16)};
  const h=m.t+m.b+data.length*(bh+gap);const svg=mk(el,w,h);
  const max=o.max||d3.max(data,d=>d.v)||1;const x=d3.scaleLinear([0,max],[0,w-m.l-m.r]);
  const g=svg.append('g').attr('transform',`translate(${m.l},${m.t})`);
  const rows=g.selectAll('g.r').data(data).join('g').attr('class',d=>'r'+(d.onClick?' click':'')).attr('transform',(d,i)=>`translate(0,${i*(bh+gap)})`);
  rows.append('rect').attr('width',d=>Math.max(1,x(Math.max(0,d.v)))).attr('height',bh).attr('rx',3).attr('fill',d=>d.color||o.color||C.blue).attr('opacity',d=>d.dim?.35:1);
  rows.append('text').attr('class','lab').attr('x',-6).attr('y',bh/2+3.5).attr('text-anchor','end').text(d=>trunc(d.label,m.l-10));
  rows.append('text').attr('x',d=>x(Math.max(0,d.v))+5).attr('y',bh/2+3.5).text(d=>(o.fmt||SC.fmt.c)(d.v)+(d.suffix||''));
  if(o.ref!=null){const rx=x(o.ref);g.append('line').attr('x1',rx).attr('x2',rx).attr('y1',-2).attr('y2',h-m.t-m.b+2).attr('stroke',C.crit).attr('stroke-dasharray','4 3');g.append('text').attr('x',rx+3).attr('y',h-m.t-m.b+12).text(o.refLabel||'')}
  hov(rows,d=>{const t=d.tip||`<b>${SC.esc(d.full||d.label)}</b><br>${(o.fmt||SC.fmt.c)(d.v)}${d.suffix||''}`;return d.full&&t.indexOf(SC.esc(d.full))<0?`<b>${SC.esc(d.full)}</b><br>`+t:tw(d.label)>m.l-10&&t.indexOf(SC.esc(d.label))<0?`<b>${SC.esc(d.label)}</b><br>`+t:t});
  rows.on('click',(e,d)=>d.onClick&&d.onClick(d));
};
// ---- vertical (optionally stacked / grouped) bars over categories
SC.barV=function(el,cats,series,o={}){
  if(!cats.length)return empty(el);
  const w=W(el),h=o.h||220,m={t:8,r:8,b:o.rot?44:24,l:48};
  const svg=mk(el,w,h);const stacked=o.stack!==false&&series.length>1&&!o.group;
  const vals=cats.map((c,i)=>series.map(s=>s.values[i]||0));
  const ymax=o.ymax||d3.max(vals,v=>stacked?d3.sum(v):d3.max(v))*1.06||1;
  const x=d3.scaleBand(cats.map((c,i)=>i),[m.l,w-m.r]).paddingInner(.15).paddingOuter(.05),y=d3.scaleLinear([0,ymax],[h-m.b,m.t]);
  const fy=o.yfmt||SC.fmt.c;
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',d=>y(d)).attr('y2',d=>y(d)).attr('stroke','var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x',m.l-5).attr('y',d=>y(d)+3).attr('text-anchor','end').text(fy);
  const step=Math.ceil(cats.length/Math.max(1,Math.floor((w-m.l)/(o.rot?26:34))));
  const lab=svg.append('g').selectAll('text').data(cats.map((c,i)=>[c,i]).filter(([c,i])=>i%step===0)).join('text').attr('x',([c,i])=>x(i)+x.bandwidth()/2).attr('y',h-m.b+13).attr('text-anchor',o.rot?'end':'middle').text(([c])=>c);
  if(o.rot)lab.attr('transform',([c,i])=>`rotate(-40 ${x(i)+x.bandwidth()/2} ${h-m.b+13})`);
  const bars=svg.append('g').selectAll('g').data(cats.map((c,i)=>i)).join('g').attr('class',o.onClick?'click':'');
  bars.each(function(i){const g=d3.select(this);let acc=0;const bw=x.bandwidth(),sw=stacked?bw:bw/series.length;
    series.forEach((s,j)=>{const v=s.values[i]||0;const yy=stacked?y(acc+v):y(v),hh=stacked?y(acc)-y(acc+v):h-m.b-y(v);
      g.append('rect').attr('x',x(i)+(stacked?0:j*sw)).attr('y',yy).attr('width',Math.max(1,sw-(stacked?0:1))).attr('height',Math.max(0,hh)).attr('fill',s.colors?s.colors[i]:s.color).attr('rx',1.5);acc+=v})});
  (o.lines||[]).forEach(L=>{const pts=L.values.map((v,i)=>[x(i)+x.bandwidth()/2,y(v)]);svg.append('path').attr('d',d3.line()(pts)).attr('fill','none').attr('stroke',L.color).attr('stroke-width',2).attr('stroke-linejoin','round')});
  (o.refs||[]).forEach(r=>{svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(r.v)).attr('y2',y(r.v)).attr('stroke',r.color||C.crit).attr('stroke-dasharray','4 3');svg.append('text').attr('x',w-m.r-2).attr('y',y(r.v)-3).attr('text-anchor','end').text(r.label||'')});
  const tipHtml=i=>`<b>${SC.esc(o.tipTitle?o.tipTitle(i):cats[i])}</b>`+series.map(s=>`<br><i style="display:inline-block;width:8px;height:8px;background:${s.colors?s.colors[i]:s.color};margin-right:4px"></i>${SC.esc(s.name)}: ${(s.tfmt||fy)(s.values[i]||0)}`).join('')+(o.lines||[]).map(L=>`<br>${SC.esc(L.name)}: ${(L.tfmt||fy)(L.values[i]||0)}`).join('');
  bars.append('rect').attr('x',i=>x(i)-2).attr('width',x.step()).attr('y',m.t).attr('height',h-m.t-m.b).attr('fill','transparent');
  hov(bars,tipHtml);bars.on('click',(e,i)=>o.onClick&&o.onClick(i));
  if(o.legend!==false&&(series.length>1||o.lines))SC.legend(el,[...series.map(s=>({name:s.name,color:s.color})),...(o.lines||[]).map(l=>({name:l.name,color:l.color}))]);
};
// ---- multi-series line chart over weeks
SC.lineChart=function(el,cats,series,o={}){
  if(!cats.length)return empty(el);
  const w=W(el),h=o.h||220,m={t:8,r:o.endLabels?70:10,b:22,l:48};const svg=mk(el,w,h);
  const all=series.flatMap(s=>s.values);const ymin=o.ymin!=null?o.ymin:0,ymax=o.ymax||d3.max(all)*1.08||1;
  const x=d3.scalePoint(cats.map((c,i)=>i),[m.l+6,w-m.r-6]),y=d3.scaleLinear([ymin,ymax],[h-m.b,m.t]);const fy=o.yfmt||SC.fmt.c;
  svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',d=>y(d)).attr('y2',d=>y(d)).attr('stroke','var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x',m.l-5).attr('y',d=>y(d)+3).attr('text-anchor','end').text(fy);
  const step=Math.ceil(cats.length/Math.max(1,Math.floor((w-m.l)/36)));
  svg.append('g').selectAll('text').data(cats.map((c,i)=>[c,i]).filter(([c,i])=>i%step===0)).join('text').attr('x',([c,i])=>x(i)).attr('y',h-6).attr('text-anchor','middle').text(([c])=>c);
  (o.bands||[]).forEach(b=>svg.append('rect').attr('x',m.l).attr('width',w-m.l-m.r).attr('y',y(b.to)).attr('height',Math.max(0,y(b.from)-y(b.to))).attr('fill',b.color).attr('opacity',.1));
  (o.refs||[]).forEach(r=>{svg.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(r.v)).attr('y2',y(r.v)).attr('stroke',r.color||C.crit).attr('stroke-dasharray','4 3');svg.append('text').attr('x',m.l+3).attr('y',y(r.v)-3).text(r.label||'')});
  series.forEach(s=>{const pts=s.values.map((v,i)=>[x(i),y(v)]);
    if(s.area){svg.append('path').attr('d',d3.area().x(d=>d[0]).y0(h-m.b).y1(d=>d[1])(pts)).attr('fill',s.color).attr('opacity',.1)}
    svg.append('path').attr('d',d3.line()(pts)).attr('fill','none').attr('stroke',s.color).attr('stroke-width',s.w||2).attr('stroke-linecap','round').attr('stroke-linejoin','round').attr('stroke-dasharray',s.dash||null);
    if(o.endLabels){const lv=s.values[s.values.length-1];svg.append('text').attr('x',w-m.r+4).attr('y',y(lv)+3).attr('fill',s.color).style('fill',s.color).text(s.name)}});
  const g=svg.append('g').style('display','none');const rule=g.append('line').attr('y1',m.t).attr('y2',h-m.b).attr('stroke','var(--cds-chart-reference)');
  const dots=series.map(s=>g.append('circle').attr('r',3.5).attr('fill',s.color));
  svg.append('rect').attr('x',m.l).attr('y',m.t).attr('width',w-m.l-m.r).attr('height',h-m.t-m.b).attr('fill','transparent').on('mousemove',e=>{
    const r=svg.node().getBoundingClientRect(),px=(e.clientX-r.left)*(w/r.width);let i=Math.round((px-m.l-6)/((w-m.r-m.l-12)/Math.max(1,cats.length-1)));i=Math.max(0,Math.min(cats.length-1,i));
    g.style('display',null);rule.attr('x1',x(i)).attr('x2',x(i));dots.forEach((d,j)=>d.attr('cx',x(i)).attr('cy',y(series[j].values[i])));
    SC.tip(e,`<b>${SC.esc(o.tipTitle?o.tipTitle(i):cats[i])}</b>`+series.map(s=>`<br><i style="display:inline-block;width:8px;height:8px;background:${s.color};margin-right:4px"></i>${SC.esc(s.name)}: ${(s.tfmt||fy)(s.values[i])}`).join(''))}).on('mouseleave',e=>{g.style('display','none');SC.tip(e,null)});
  if(!o.endLabels&&o.legend!==false&&series.length>1)SC.legend(el,series.map(s=>({name:s.name,color:s.color})));
};
// ---- bubble scatter
SC.bubble=function(el,data,o){
  if(!data.length)return empty(el);
  const w=W(el),h=o.h||300,m={t:10,r:14,b:34,l:o.ml||56};const svg=mk(el,w,h);
  const xs=o.xlog?d3.scaleLog(o.xdom,[m.l,w-m.r]):d3.scaleLinear(o.xdom,[m.l,w-m.r]),ys=o.ylog?d3.scaleLog(o.ydom,[h-m.b,m.t]):d3.scaleLinear(o.ydom,[h-m.b,m.t]);
  const r=d3.scaleSqrt([0,d3.max(data,d=>d.r)||1],[3,o.rmax||22]);
  const xt=o.xticks||xs.ticks(6),yt=o.yticks||ys.ticks(5);
  svg.append('g').selectAll('line').data(yt).join('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',d=>ys(d)).attr('y2',d=>ys(d)).attr('stroke','var(--cds-chart-grid)');
  svg.append('g').selectAll('text').data(yt).join('text').attr('x',m.l-5).attr('y',d=>ys(d)+3).attr('text-anchor','end').text(o.yfmt||SC.fmt.c);
  svg.append('g').selectAll('text').data(xt).join('text').attr('x',d=>xs(d)).attr('y',h-m.b+14).attr('text-anchor','middle').text(o.xfmt||String);
  svg.append('text').attr('x',(m.l+w-m.r)/2).attr('y',h-4).attr('text-anchor','middle').text(o.xlabel||'');
  svg.append('text').attr('transform',`translate(11 ${(m.t+h-m.b)/2}) rotate(-90)`).attr('text-anchor','middle').text(o.ylabel||'');
  (o.vlines||[]).forEach(v=>{svg.append('line').attr('x1',xs(v.v)).attr('x2',xs(v.v)).attr('y1',m.t).attr('y2',h-m.b).attr('stroke',v.color||'var(--cds-chart-reference)').attr('stroke-dasharray','4 3');svg.append('text').attr('x',xs(v.v)+3).attr('y',m.t+9).text(v.label||'')});
  const c=svg.append('g').selectAll('circle').data(data).join('circle').attr('class',o.onClick?'click':'').attr('cx',d=>xs(Math.min(d.x,o.xdom[1]))).attr('cy',d=>ys(Math.max(d.y,o.ydom[0]))).attr('r',d=>r(d.r)).attr('fill',d=>d.color).attr('fill-opacity',.55).attr('stroke',d=>d.color).attr('stroke-width',1.2);
  hov(c,d=>d.tip);c.on('click',(e,d)=>o.onClick&&o.onClick(d));
  if(o.legend)SC.legend(el,o.legend);
};
// ---- heatmap (rows x cols)
SC.heat=function(el,rows,cols,val,o={}){
  if(!rows.length||!cols.length)return empty(el);
  const w=W(el),lw=Math.min(150,Math.max(...rows.map(r=>tw(r.label)))+10),cw=Math.max(7,(w-lw-6)/cols.length),ch=o.ch||22,h=rows.length*(ch+2)+26;const svg=mk(el,w,h);
  const col=u=>u==null?'transparent':u<80?'#cfe6da':u<95?'#f3d48c':u<=100?'#e8935a':u<115?'#c8433a':'#8f1d1d';
  const step=Math.ceil(30/cw);
  svg.append('g').selectAll('text').data(cols.map((c,i)=>[c,i]).filter(([c,i])=>i%step===0)).join('text').attr('x',([c,i])=>lw+i*cw+cw/2).attr('y',10).attr('text-anchor','middle').text(([c])=>c.label);
  rows.forEach((r,ri)=>{const g=svg.append('g').attr('transform',`translate(0,${18+ri*(ch+2)})`);
    g.append('text').attr('class','lab click').attr('x',lw-6).attr('y',ch/2+3.5).attr('text-anchor','end').text(trunc(r.label,lw-8)).on('click',()=>o.onRow&&o.onRow(r));
    const cells=g.selectAll('rect').data(cols.map((c,i)=>({c,i,r,u:val(r,c)}))).join('rect').attr('class',o.onCell?'click':'').attr('x',d=>lw+d.i*cw).attr('y',0).attr('width',cw-1).attr('height',ch).attr('rx',2).attr('fill',d=>col(d.u)).attr('stroke',d=>d.u>100?'#fff':'none').attr('stroke-opacity',.25);
    hov(cells,d=>o.tip?o.tip(d):'');cells.on('click',(e,d)=>o.onCell&&o.onCell(d));
    if(cw>=26)g.selectAll('text.v').data(cols.map((c,i)=>({i,u:val(r,c)}))).join('text').attr('class','v').attr('x',d=>lw+d.i*cw+cw/2-.5).attr('y',ch/2+3.5).attr('text-anchor','middle').style('fill',d=>d.u>100?'#fff':'#1d1d1d').style('font-size','9.5px').text(d=>d.u==null?'':Math.round(d.u))});
  SC.legend(el,[{name:'<80% Healthy',color:'#cfe6da'},{name:'80–95% High',color:'#f3d48c'},{name:'95–100% Risk',color:'#e8935a'},{name:'>100% Over capacity',color:'#c8433a'},{name:'>115%',color:'#8f1d1d'}]);
};
// ---- timeline (gantt-like): rows [{label, spans:[{from,to,color}], marks:[{at,color,r,tip}] }]
SC.timeline=function(el,rows,nW,weekLabels,o={}){
  if(!rows.length)return empty(el,'No shortages in the current view');
  const w=W(el),lw=Math.min(190,Math.max(...rows.map(r=>tw(r.label)))+10),bh=16,gap=5,h=rows.length*(bh+gap)+26,svg=mk(el,w,h);
  const x=d3.scaleLinear([0,nW],[lw,w-8]);
  const step=Math.ceil(nW/Math.floor((w-lw)/34));
  for(let i=0;i<nW;i+=step){svg.append('line').attr('x1',x(i)).attr('x2',x(i)).attr('y1',16).attr('y2',h).attr('stroke','var(--cds-chart-grid)');svg.append('text').attr('x',x(i)+2).attr('y',10).text(weekLabels[i])}
  rows.forEach((r,i)=>{const y=20+i*(bh+gap);
    const lab=svg.append('text').attr('class','lab click').attr('x',lw-6).attr('y',y+bh/2+3.5).attr('text-anchor','end').text(trunc(r.label,lw-10)).on('click',()=>o.onRow&&o.onRow(r));
    (r.spans||[]).forEach(s=>{const rc=svg.append('rect').attr('x',x(s.from)).attr('y',y).attr('width',Math.max(3,x(s.to+1)-x(s.from))).attr('height',bh).attr('rx',3).attr('fill',s.color).attr('opacity',.3);hov(rc,()=>s.tip)});
    (r.marks||[]).forEach(mk_=>{const c=svg.append('circle').attr('class','click').attr('cx',x(mk_.at+.5)).attr('cy',y+bh/2).attr('r',mk_.r||5).attr('fill',mk_.color);hov(c,()=>mk_.tip);c.on('click',()=>o.onRow&&o.onRow(r))})});
  SC.legend(el,[{name:'Shortage week (size = value)',color:C.bad},{name:'Exposure window until a new PO could arrive',color:C.lgray}]);
};
})();
