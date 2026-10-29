// A deliberately bounded editor. Unrecognized Mermaid lines are opaque and are
// kept byte-for-byte. Recognized lines are regenerated only after an explicit edit.
const ID='[A-Za-z_][\\w-]*';
const escapeRX=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const label=s=>s.replace(/^"|"$/g,'').replace(/&quot;|#quot;/g,'"');
const quote=s=>'"'+String(s).replace(/"/g,'#quot;').replace(/[\r\n]/g,' ')+'"';
export function visualModel(source){
 const lines=source.split(/\r?\n/),eol=source.includes('\r\n')?'\r\n':'\n';
 const header=lines.findIndex(x=>/^\s*(flowchart|graph|sequenceDiagram|stateDiagram-v2)\b/.test(x));
 if(header<0)throw Error('Visual editing supports flowcharts, sequence diagrams and simple state diagrams. Use Edit Source for this diagram family.');
 const family=/sequenceDiagram/.test(lines[header])?'sequence':/stateDiagram/.test(lines[header])?'state':'flow';
 const nodes=new Map(),edges=[],entries=[],positions={};let counter=0;
 const node=(id,attrs={})=>{if(!nodes.has(id))nodes.set(id,{id,label:id,shape:id==='[*]'?'circle':'rectangle',...attrs});else if(attrs.label)Object.assign(nodes.get(id),attrs);return nodes.get(id)};
 const endpoint=`(${ID})(\\(\\([^\\n]*?\\)\\)|\\(\\[[^\\n]*?\\]\\)|\\[[^\\n]*?\\]|\\([^\\n]*?\\)|\\{[^\\n]*?\\})?`;
 const parseShape=(id,shape)=>{let attrs={};if(shape){const double=shape.startsWith('((')||shape.startsWith('([');attrs={label:label(shape.slice(double?2:1,double?-2:-1)),shape:shape.startsWith('((')?'circle':shape[0]==='{'?'decision':shape[0]==='('?'rounded':'rectangle'};}return node(id,attrs)};
 for(let i=0;i<lines.length;i++){
  const raw=lines[i],s=raw.trim().replace(/;$/,'');let m,entry={raw,line:i,kind:'opaque'};
  if(i===header)entry.kind='header';
  else if(s.startsWith('%% remarque:positions ')){try{Object.assign(positions,JSON.parse(s.slice('%% remarque:positions '.length)));entry.kind='positions'}catch{}}
  else if(!s||s.startsWith('%%'))entry.kind='comment';
  else if(family==='flow'){
   const edgeRX=new RegExp('^'+endpoint+'\\s*(-->|---|-.->|==>)\\s*(?:\\|([^|]*)\\|\\s*)?'+endpoint+'$');
   if((m=s.match(edgeRX))){parseShape(m[1],m[2]);parseShape(m[5],m[6]);const edge={id:'e'+counter++,from:m[1],to:m[5],style:m[3],label:m[4]||'',line:i,dirty:false};edges.push(edge);entry={...entry,kind:'edge',id:edge.id,inline:[m[2]?m[1]:null,m[6]?m[5]:null].filter(Boolean)}}
   else if((m=s.match(new RegExp('^'+endpoint+'$')))&&m[2]){parseShape(m[1],m[2]);entry={...entry,kind:'node',id:m[1]};nodes.get(m[1]).line=i;}
  }else if(family==='sequence'){
   if((m=s.match(new RegExp('^(participant|actor)\\s+('+ID+')(?:\\s+as\\s+(.+))?$')))){node(m[2],{label:m[3]||m[2],shape:m[1],line:i});entry={...entry,kind:'node',id:m[2]}}
   else if((m=s.match(new RegExp('^('+ID+')\\s*(-->>|->>|-->|->|--x|-x|--\\)|-\\))\\s*('+ID+')\\s*:\\s*(.*)$')))){node(m[1]);node(m[3]);const edge={id:'e'+counter++,from:m[1],to:m[3],style:m[2],label:m[4],line:i,dirty:false};edges.push(edge);entry={...entry,kind:'edge',id:edge.id}}
  }else{
   if((m=s.match(new RegExp('^state\\s+"([^"\\n]*)"\\s+as\\s+('+ID+')$')))){node(m[2],{label:m[1],shape:'rounded',line:i});entry={...entry,kind:'node',id:m[2]}}
   else if((m=s.match(new RegExp('^('+ID+'|\\[\\*\\])\\s*-->\\s*('+ID+'|\\[\\*\\])(?:\\s*:\\s*(.*))?$')))){node(m[1]);node(m[2]);const edge={id:'e'+counter++,from:m[1],to:m[2],style:'-->',label:m[3]||'',line:i,dirty:false};edges.push(edge);entry={...entry,kind:'edge',id:edge.id}}
  }
  entries.push(entry);
 }
 // Complex state bodies cannot safely be interpreted as a flat state machine.
 if(family==='state'&&entries.some(e=>e.kind==='opaque'&&/[{}]/.test(e.raw)))throw Error('Composite states are preserved in source mode. This canvas edits simple state diagrams.');
 let n=0;for(const item of nodes.values()){const p=positions[item.id];item.x=Number.isFinite(p?.x)?p.x:90+(n%4)*175;item.y=Number.isFinite(p?.y)?p.y:75+Math.floor(n/4)*130;n++;}
 const ensureNode=id=>{const item=nodes.get(id);if(!item)throw Error('Select an existing node');return item};
 const formatNode=item=>{if(family==='sequence')return `${item.shape==='actor'?'actor':'participant'} ${item.id} as ${item.label.replace(/[\r\n]/g,' ')}`;if(family==='state')return `state ${quote(item.label)} as ${item.id}`;const q=quote(item.label),shapes={rectangle:`[${q}]`,rounded:`(${q})`,decision:`{${q}}`,circle:`((${q}))`};return item.id+(shapes[item.shape]||shapes.rectangle)};
 const formatEdge=e=>family==='flow'?`${e.from} ${e.style}${e.label?'|'+e.label.replace(/\|/g,'#124;').replace(/[\r\n]/g,' ')+'|':''} ${e.to}`:`${e.from}${family==='state'?' --> ':e.style}${e.to}${e.label||family==='sequence'?': '+e.label.replace(/[\r\n]/g,' '):''}`;
 const api={family,nodes,edges,entries,source,direction:lines[header].trim().split(/\s+/)[1]||'TD',moved:false,
  addNode(){let i=1;while(nodes.has('N'+i))i++;const item=node('N'+i,{label:family==='sequence'?'Participant '+i:'Node '+i,shape:family==='sequence'?'participant':'rectangle',x:100+(nodes.size%4)*175,y:75+Math.floor(nodes.size/4)*130,dirty:true});return item},
  updateNode(id,attrs){const item=ensureNode(id);Object.assign(item,attrs,{dirty:true});for(const e of entries)if(e.inline?.includes(id)){const edge=edges.find(x=>x.id===e.id);if(edge)edge.dirty=true;}},
  removeNode(id){ensureNode(id);const rx=new RegExp('(?<![\\w-])'+escapeRX(id)+'(?![\\w-])');if(entries.some(e=>e.kind==='opaque'&&rx.test(e.raw)))throw Error('A preserved Mermaid directive references this node. Edit that directive in source before deleting the node.');nodes.delete(id);for(const e of edges)if(e.from===id||e.to===id)e.deleted=true;},
  addEdge(from,to){ensureNode(from);ensureNode(to);const e={id:'e'+counter++,from,to,label:'',style:family==='sequence'?'->>':'-->',dirty:true};edges.push(e);return e},
  serialize(){
   const inlineDefinitions=new Set(entries.filter(e=>e.kind==='edge'&&(edges.find(x=>x.id===e.id)?.dirty||e.inline?.some(id=>nodes.get(id)?.dirty))).flatMap(e=>e.inline||[]));
   const additions=[...nodes.values()].filter(n=>n.id!=='[*]'&&n.line==null&&(n.dirty||inlineDefinitions.has(n.id)||family==='sequence'&&edges.some(e=>e.dirty&&!e.deleted&&(e.from===n.id||e.to===n.id)))).map(formatNode);
   const output=[];let edgeIndex=0;const sequenceEdges=edges.filter(e=>!e.deleted);
   for(const entry of entries){
    if(entry.kind==='positions'){if(!api.moved)output.push(entry.raw);continue}
    if(entry.kind==='header'){output.push(entry.raw);output.push(...additions);continue}
    if(entry.kind==='node'){const item=nodes.get(entry.id);if(item)output.push(item.dirty?formatNode(item):entry.raw);continue}
    if(entry.kind==='edge'){
     const original=edges.find(e=>e.id===entry.id),edge=family==='sequence'?sequenceEdges[edgeIndex++]:original;
     if(!edge||edge.deleted)continue;
     const inlineChanged=entry.inline?.some(id=>!nodes.has(id)||nodes.get(id).dirty);
     output.push(edge.dirty||inlineChanged||edge.id!==entry.id?formatEdge(edge):entry.raw);continue;
    }
    output.push(entry.raw);
   }
   const extra=family==='sequence'?sequenceEdges.slice(edgeIndex):edges.filter(e=>e.line==null&&!e.deleted);output.push(...extra.map(formatEdge));
   if(api.moved)output.push('%% remarque:positions '+JSON.stringify(Object.fromEntries([...nodes.values()].map(n=>[n.id,{x:Math.round(n.x),y:Math.round(n.y)}]))));
   return output.join(eol);
  }
 };return api;
}
