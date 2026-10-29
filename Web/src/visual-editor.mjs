import {visualModel} from './visual-model.mjs';
const NS='http://www.w3.org/2000/svg';
const svg=(tag,attrs={},text=null)=>{const n=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);if(text!=null)n.textContent=text;return n};
export function visualEditor({dialog,source,onApply}){
 const model=visualModel(source),body=document.createElement('div');body.className='visual-editor';
 body.innerHTML='<div class="visual-tools"><button data-action="node">Add Node</button><button data-action="edge">Add Edge</button><label><input type="checkbox" checked name="snap"> Snap to Grid</label><button data-action="layout">Auto Layout</button><label>Zoom <input type="range" min="50" max="180" value="100" name="zoom"></label></div><p class="visual-notice" role="status"></p><div class="visual-columns"><label>Generated Mermaid<textarea aria-label="Generated Mermaid" readonly spellcheck="false"></textarea></label><div class="visual-canvas"></div><aside aria-label="Element inspector"></aside></div><footer><button class="primary">Apply</button><button class="cancel">Cancel</button></footer>';
 const d=dialog('Mermaid · Visual Editor',body);d.classList.add('wide-dialog');
 const canvas=body.querySelector('.visual-canvas'),inspector=body.querySelector('aside'),code=body.querySelector('textarea'),notice=body.querySelector('.visual-notice');
 const opaque=model.entries.filter(e=>e.kind==='opaque').length;
 let selected=null,addingEdge=false,edgeFrom=null,zoom=1;
 const showNotice=message=>notice.textContent=message||(opaque?`${opaque} unedited syntax line${opaque===1?' is':'s are'} preserved verbatim.`:'Drag nodes to position them. Select a node or connection to edit it.');
 const field=(title,value,change,options=null)=>{const l=document.createElement('label');l.textContent=title;const input=document.createElement(options?'select':'input');input.setAttribute('aria-label',title);if(options)for(const [id,text]of options)input.add(new Option(text,id));input.value=value;input.oninput=()=>{change(input.value);refresh(false)};l.append(input);inspector.append(l);return input};
 function select(kind,id){if(addingEdge&&kind==='node'){if(!edgeFrom){edgeFrom=id;showNotice('Choose the destination node.');return;}const edge=model.addEdge(edgeFrom,id);addingEdge=false;edgeFrom=null;selected={kind:'edge',id:edge.id};}else selected={kind,id};refresh();}
 function draw(){
  const width=Math.max(780,...[...model.nodes.values()].map(n=>n.x+110)),height=Math.max(440,...[...model.nodes.values()].map(n=>n.y+100),model.edges.length*55+140);
  const root=svg('svg',{viewBox:`0 0 ${width} ${height}`,width:width*zoom,height:height*zoom,'aria-label':model.family==='sequence'?'Sequence diagram canvas':'Diagram canvas'});
  root.append(svg('defs'));const marker=svg('marker',{id:'visual-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'currentColor'}));root.firstChild.append(marker);
  const members=[...model.nodes.values()];
  for(const [i,e]of model.edges.filter(e=>!e.deleted).entries()){
   const a=model.nodes.get(e.from),b=model.nodes.get(e.to);if(!a||!b)continue;
   const seq=model.family==='sequence',y=120+i*55,ax=seq?90+members.indexOf(a)*170:a.x,ay=seq?y:a.y,bx=seq?90+members.indexOf(b)*170:b.x,by=seq?y:b.y;
   const g=svg('g',{class:'visual-edge'+(selected?.id===e.id?' selected':''),tabindex:0,role:'button','aria-label':`Connection ${a.label} to ${b.label}: ${e.label}`});
   const path=ax===bx&&ay===by?`M${ax},${ay} h65 v32 h-65`:`M${ax},${ay} L${bx},${by}`;
   g.append(svg('path',{d:path,class:'edge-hit',fill:'none',stroke:'transparent','stroke-width':18}));
   g.append(svg('path',{d:path,fill:'none',stroke:'currentColor','stroke-width':e.style==='==>'?4:2,'stroke-dasharray':e.style.startsWith('-.')||e.style.startsWith('--')&&seq?'6 4':'none','marker-end':e.style==='---'?'':'url(#visual-arrow)'}));
   g.append(svg('text',{x:(ax+bx)/2,y:(ay+by)/2-10,'text-anchor':'middle'},e.label));g.onclick=()=>select('edge',e.id);g.onkeydown=event=>{if(event.key==='Enter')select('edge',e.id)};root.append(g);
  }
  for(const [index,n]of members.entries()){
   const seq=model.family==='sequence',x=seq?90+index*170:n.x,y=seq?45:n.y;
   if(seq)root.append(svg('line',{x1:x,y1:70,x2:x,y2:height-10,stroke:'currentColor','stroke-dasharray':'5 5',opacity:.25}));
   const g=svg('g',{transform:`translate(${x},${y})`,class:'visual-node'+(selected?.id===n.id?' selected':''),tabindex:0,role:'button','aria-label':`Node ${n.label}`,'data-node':n.id});
   if(n.shape==='decision')g.append(svg('polygon',{points:'0,-38 72,0 0,38 -72,0'}));
   else if(n.shape==='circle')g.append(svg('ellipse',{rx:n.id==='[*]'?13:58,ry:n.id==='[*]'?13:32}));
   else g.append(svg('rect',{x:-65,y:-25,width:130,height:50,rx:n.shape==='rounded'?20:5}));
   g.append(svg('text',{'text-anchor':'middle',dy:5},n.id==='[*]'?'':n.label.length>20?n.label.slice(0,18)+'…':n.label));
   g.onclick=()=>select('node',n.id);g.onkeydown=event=>{if(event.key==='Enter')select('node',n.id);if(!seq&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();n.x=Math.max(65,n.x+({ArrowLeft:-20,ArrowRight:20}[event.key]||0));n.y=Math.max(40,n.y+({ArrowUp:-20,ArrowDown:20}[event.key]||0));model.moved=true;refresh(false)}};
   if(!seq)g.onpointerdown=event=>{if(addingEdge)return;const start={x:event.clientX,y:event.clientY,nx:n.x,ny:n.y};g.setPointerCapture(event.pointerId);g.onpointermove=e=>{const step=body.querySelector('[name=snap]').checked?20:1;n.x=Math.max(65,Math.round((start.nx+(e.clientX-start.x)/zoom)/step)*step);n.y=Math.max(40,Math.round((start.ny+(e.clientY-start.y)/zoom)/step)*step);g.setAttribute('transform',`translate(${n.x},${n.y})`);model.moved=true};g.onpointerup=()=>{g.onpointermove=null;select('node',n.id)}};
   root.append(g);
  }
  canvas.replaceChildren(root);
 }
 function refresh(rebuildInspector=true){
  code.value=model.serialize();draw();showNotice();if(!rebuildInspector)return;
  inspector.replaceChildren();if(!selected){inspector.textContent='Select a node or connection.';return;}
  if(selected.kind==='node'){
   const n=model.nodes.get(selected.id);if(!n)return;
   const h=document.createElement('h3');h.textContent=n.id;inspector.append(h);
   if(n.id!=='[*]')field('Label',n.label,value=>model.updateNode(n.id,{label:value}));
   if(model.family!=='state')field('Shape',n.shape,value=>model.updateNode(n.id,{shape:value}),model.family==='sequence'?[['participant','Participant'],['actor','Actor']]:[['rectangle','Rectangle'],['rounded','Rounded'],['decision','Decision'],['circle','Circle']]);
   const remove=document.createElement('button');remove.textContent='Delete node and connected edges';remove.onclick=()=>{try{model.removeNode(n.id);selected=null;refresh()}catch(e){showNotice(e.message)}};inspector.append(remove);
  }else{
   const e=model.edges.find(x=>x.id===selected.id);if(!e)return;const opts=[...model.nodes.values()].map(n=>[n.id,n.label]);
   field('From',e.from,value=>{e.from=value;e.dirty=true},opts);field('To',e.to,value=>{e.to=value;e.dirty=true},opts);field('Message or label',e.label,value=>{e.label=value;e.dirty=true});
   field('Arrow style',e.style,value=>{e.style=value;e.dirty=true},(model.family==='sequence'?['->>','-->>','->','-->','-x','--x','-)','--)']:model.family==='state'?['-->']:['-->','---','-.->','==>']).map(v=>[v,v]));
   if(model.family==='sequence')for(const [label,delta]of [['Move message up',-1],['Move message down',1]]){const b=document.createElement('button');b.textContent=label;b.disabled=opaque>0;b.title=opaque?'Reordering is disabled when preserved control-flow syntax is present.':'';b.onclick=()=>{const i=model.edges.indexOf(e),j=i+delta;if(j>=0&&j<model.edges.length){[model.edges[i],model.edges[j]]=[model.edges[j],model.edges[i]];refresh()}};inspector.append(b)}
   const remove=document.createElement('button');remove.textContent='Delete connection';remove.onclick=()=>{e.deleted=true;selected=null;refresh()};inspector.append(remove);
  }
 }
 body.querySelector('[data-action=node]').textContent=model.family==='sequence'?'Add Participant':'Add Node';
 body.querySelector('[data-action=node]').onclick=()=>{const n=model.addNode();selected={kind:'node',id:n.id};refresh()};
 body.querySelector('[data-action=edge]').textContent=model.family==='sequence'?'Add Message':'Add Edge';
 body.querySelector('[data-action=edge]').onclick=()=>{addingEdge=true;edgeFrom=null;showNotice('Choose the source node, then the destination node.')};
 body.querySelector('[data-action=layout]').onclick=()=>{let i=0;for(const n of model.nodes.values()){n.x=90+(i%4)*175;n.y=75+Math.floor(i/4)*130;i++}model.moved=true;refresh(false)};
 body.querySelector('[name=zoom]').oninput=e=>{zoom=Number(e.target.value)/100;draw()};
 body.querySelector('.cancel').onclick=()=>{d.close();d.remove()};
 body.querySelector('.primary').onclick=()=>{try{if(onApply(model.serialize())!==false){d.close();d.remove()}}catch(e){showNotice(e.message)}};
 refresh();
}
