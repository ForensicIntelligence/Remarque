import {EditorState,TextSelection,NodeSelection,Plugin} from 'prosemirror-state';
import {EditorView,Decoration,DecorationSet} from 'prosemirror-view';
import {keymap} from 'prosemirror-keymap';
import {baseKeymap,toggleMark,setBlockType,wrapIn,lift,chainCommands,exitCode} from 'prosemirror-commands';
import {wrapInList,splitListItem,sinkListItem,liftListItem} from 'prosemirror-schema-list';
import {tableEditing,goToNextCell,addRowAfter,addColumnAfter,deleteRow,deleteColumn,setCellAttr} from 'prosemirror-tables';
import {codeHighlighting} from './code-highlighting.mjs';
import {equationEditor} from './equation-editor.mjs';
import {tableEditor} from './table-editor.mjs';
import {schema} from './schema.mjs';
import {project,transactionPatches,applyPatches,mapOffset} from './projection.mjs';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import {gfm as turndownGFM} from 'turndown-plugin-gfm';

let source='',revision=0,documentID='',projection=project(''),muted=false,compositionBase=null,compositionTimer=null;
let typingGroup=null,typingTime=0,selectedObject=null,lastSelectedRange={start:0,end:0},rendererModule=null;
let preferences={},readOnly=false,mode='rendered',liveDraft=null,renderTimer=null,pendingRender=false;const objectPreviews=new Map();
const pending=new Map();
const assetRequests=new Map(),assetCache=new Map();
const post=message=>window.webkit?.messageHandlers?.remarque?.postMessage({documentID,...message});
const editable=document.querySelector('#editor');
const turndown=new TurndownService({headingStyle:'atx',codeBlockStyle:'fenced'});turndown.use(turndownGFM);
function group(){const now=Date.now();if(now-typingTime>500)typingGroup=crypto.randomUUID();typingTime=now;return typingGroup;}
const bindings={...baseKeymap,
  'Mod-z':()=>{post({type:'undo'});return true;},'Mod-Shift-z':()=>{post({type:'redo'});return true;},
  'Mod-b':toggleMark(schema.marks.strong),'Mod-i':toggleMark(schema.marks.em),
  Enter:chainCommands(splitListItem(schema.nodes.list_item),baseKeymap.Enter),
  Tab:chainCommands(goToNextCell(1),sinkListItem(schema.nodes.list_item)),
  'Shift-Tab':chainCommands(goToNextCell(-1),liftListItem(schema.nodes.list_item)),
  'Mod-Enter':exitCode
};
const liveDecorations=new Plugin({props:{decorations(state){if(!liveDraft)return DecorationSet.empty;const end=liveDraft.pos+liveDraft.size;if(end>state.doc.content.size)return DecorationSet.empty;return DecorationSet.create(state.doc,[Decoration.node(liveDraft.pos,end,{class:'live-block-hidden'}),Decoration.widget(end,()=>liveDraft.area,{side:1,ignoreSelection:true,stopEvent:()=>true,key:'live-source-area'})]);}}});
const plugins=[keymap(bindings),tableEditing(),codeHighlighting(()=>preferences.highlightCode!==false),liveDecorations];
function freshState(doc,selection,storedMarks=null){let state=EditorState.create({doc,plugins});if(selection!=null){try{const bound=p=>Math.min(doc.content.size,Math.max(0,p));const from=bound(typeof selection==='number'?selection:selection.from),to=bound(typeof selection==='number'?selection:selection.to);state=state.apply(state.tr.setSelection(TextSelection.between(doc.resolve(from),doc.resolve(to))).setStoredMarks(storedMarks));}catch{}}return state;}

const view=new EditorView(editable,{
  state:freshState(projection.doc),
  attributes:{'aria-label':'Rendered document editor','spellcheck':'true','data-testid':'richEditor'},
  dispatchTransaction(tr){
    const next=view.state.apply(tr);
    if(compositionBase){view.updateState(next);return;}
    if(tr.docChanged){commitTransaction(tr,next);}
    else{view.updateState(next);if(!muted)publishSelection();}
  },
  handleDOMEvents:{
    focus(){flushPendingRender();return false;},
    compositionstart(){compositionBase=projection;clearTimeout(compositionTimer);return false;},
    compositionend(){compositionTimer=setTimeout(()=>{if(!compositionBase)return;const old=compositionBase;compositionBase=null;projection=old;commitTransaction({docChanged:!old.doc.eq(view.state.doc),doc:view.state.doc,steps:[],selection:view.state.selection},view.state,'Compose');},20);return false;}
  },
  handleClick(_view,pos,event){
    const footnote=event.target.closest('.footnote-ref');if(footnote){const target=[...projection.records.values()].find(r=>r.kind==='footnoteDefinition'&&(r.mdast.label||r.mdast.identifier)===footnote.textContent);if(target)selectSource(target.start,target.end,true);return true;}
    if(mode==='liveSource'&&!event.target.closest('.diagram-controls,.diagram-resize')){openLiveBlock(pos);return true;}
    const anchor=event.target.closest('a');
    if(anchor?.getAttribute('href')?.startsWith('#')){const slug=decodeURIComponent(anchor.getAttribute('href').slice(1)),headings=[...view.dom.querySelectorAll('h1,h2,h3,h4,h5,h6')];const target=headings.find(h=>h.textContent.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')===slug);if(target){event.preventDefault();const pos=view.posAtDOM(target,0);view.dispatch(view.state.tr.setSelection(TextSelection.near(view.state.doc.resolve(pos))).scrollIntoView());publishSelection();return true;}}
    if(anchor&&event.metaKey){event.preventDefault();post({type:'openLink',url:anchor.getAttribute('href')});return true;}
    if(anchor)event.preventDefault();
    const task=event.target.closest('li[data-checked]');
    if(task&&event.offsetX<0){const p=view.posAtDOM(task,0)-1;const node=view.state.doc.nodeAt(p);if(node?.type.name==='list_item'){view.dispatch(view.state.tr.setNodeMarkup(p,null,{...node.attrs,checked:!node.attrs.checked}));return true;}}
    return false;
  },
  handlePaste(_view,event){
    const file=[...(event.clipboardData?.files||[])].find(f=>f.type.startsWith('image/'));
    if(file){event.preventDefault();sendImage(file);return true;}
    const html=event.clipboardData?.getData('text/html');
    if(html){event.preventDefault();const md=turndown.turndown(DOMPurify.sanitize(html));insertMarkdown(md);return true;}
    return false;
  },
  handleDrop(_view,event){const file=[...(event.dataTransfer?.files||[])].find(f=>f.type.startsWith('image/'));if(file){event.preventDefault();sendImage(file);return true;}return false;},
  nodeViews:{mermaid:objectView,math_display:objectView,inline_math:objectView,opaque:objectView,image:imageView}
});
function sendImage(file){if(file.size>20*1024*1024){post({type:'error',message:'Images must be 20 MB or smaller.'});return;}const reader=new FileReader();reader.onload=()=>post({type:'pasteImage',base64:reader.result.split(',')[1],extension:({'image/jpeg':'jpg','image/svg+xml':'svg','image/gif':'gif'})[file.type]||'png'});reader.readAsDataURL(file);}
function imageView(node){
  const dom=document.createElement('img');dom.alt=node.attrs.alt;dom.title=node.attrs.title;dom.setAttribute('data-source',node.attrs.src);const token=crypto.randomUUID();
  if(/^data:image\/(png|jpeg|gif|webp|svg\+xml|tiff);base64,/i.test(node.attrs.src))dom.src=node.attrs.src;
  else if(assetCache.has(node.attrs.src))dom.src=assetCache.get(node.attrs.src);
  else{assetRequests.set(token,{element:dom,path:node.attrs.src});post({type:'asset',token,path:node.attrs.src});}
  return {dom,destroy(){assetRequests.delete(token);}};
}

function commitTransaction(tr,next,label='Edit'){
  if(!tr.docChanged){view.updateState(next);return;}
  try{
    const patches=transactionPatches(projection,tr),newSource=applyPatches(source,patches),newProjection=project(newSource,projection,patches);
    const position=Math.min(tr.selection.from,newProjection.doc.content.size),endPosition=Math.min(tr.selection.to,newProjection.doc.content.size);
    const start=newProjection.sourceAt(position),end=newProjection.sourceAt(endPosition,-1);
    commit(patches,newProjection,{start:Math.min(start,end),end:Math.max(start,end)},label,{from:position,to:endPosition},next.storedMarks);
  }catch(error){post({type:'error',message:`The edit could not be applied: ${error.message}`});view.updateState(freshState(projection.doc));}
}
function commit(patches,next,selection,label='Edit',position=null,storedMarks=null){
  if(!patches.length)return;
  const base=revision,transactionID=crypto.randomUUID();
  source=next.source;projection=next;revision++;lastSelectedRange=selection;
  pending.set(transactionID,{source,revision,patches});
  muted=true;view.updateState(freshState(next.doc,position??{from:next.positionAt(selection.start),to:next.positionAt(selection.end)},storedMarks));muted=false;
  post({type:'edit',transactionID,revision:base,patches,start:selection.start,end:selection.end,label,group:label==='Edit'?group():null});
  publishOutline();publishSelection();
}
function patchSource(patches,label='Edit',selection=null){
  const next=project(applyPatches(source,patches),projection,patches);
  const caret=selection??{start:mapOffset(lastSelectedRange.start,patches),end:mapOffset(lastSelectedRange.end,patches)};
  commit(patches,next,caret,label);
}
function publishOutline(){
  const words=projection.tree.children.filter(n=>!['code','math','yaml','toml','html','definition'].includes(n.type)).map(n=>source.slice(n.position.start.offset,n.position.end.offset)).join(' ').match(/[\p{L}\p{N}]+/gu)?.length||0;
  post({type:'outline',revision,items:projection.outline,words});
}
function publishSelection(){
  view.dom.querySelectorAll('.focused-block').forEach(n=>n.classList.remove('focused-block'));let focused=view.domAtPos(view.state.selection.from).node;while(focused&&focused.parentNode!==view.dom)focused=focused.parentNode;if(focused?.classList)focused.classList.add('focused-block');
  const sel=view.state.selection;let start=projection.sourceAt(sel.from),end=projection.sourceAt(sel.to,-1),kind='text';
  if(sel instanceof NodeSelection){
    const r=projection.records.get(sel.node.attrs.origin);
    if(r){start=r.start;end=r.end;kind=sel.node.type.name;selectedObject={origin:r.id,kind,node:sel.node};}
  }else if(document.activeElement?.closest('.ProseMirror'))selectedObject=null;
  if(sel.empty)end=start;
  lastSelectedRange={start:Math.min(start,end),end:Math.max(start,end)};
  post({type:'selection',revision,...lastSelectedRange,kind});publishFormatting();
}
function closeLiveBlock(){if(!liveDraft)return;liveDraft=null;view.updateState(view.state);}
function openLiveBlock(position,focus=true){
 if(mode!=='liveSource')return;let target=null;projection.doc.forEach((node,pos)=>{if(position>=pos&&position<=pos+node.nodeSize)target={node,pos}});if(!target)return;
 const record=projection.records.get(target.node.attrs.origin)||{id:'empty',start:0,end:0,raw:''};if(liveDraft?.id===record.id){if(focus)liveDraft.area.focus();return;}closeLiveBlock();
 const dom=view.nodeDOM(target.pos);if(!dom)return;const area=document.createElement('textarea');area.className='live-source-block';area.value=record.raw;area.spellcheck=preferences.spellcheck!==false;area.setAttribute('aria-label','Edit Markdown block');area.style.fontSize=(preferences.editorSize||15)+'px';area.style.lineHeight=preferences.lineSpacing||1.45;
 const grow=()=>{area.style.height='auto';area.style.height=Math.max(80,area.scrollHeight+8)+'px'};
 liveDraft={id:record.id,area,dom,pos:target.pos,size:target.node.nodeSize,start:record.start,end:record.end};view.updateState(view.state);grow();
 const save=()=>{if(!liveDraft)return;const current=projection.records.get(liveDraft.id)||{id:liveDraft.id,start:liveDraft.start,end:liveDraft.end,raw:source.slice(liveDraft.start,liveDraft.end)};if(current.raw===area.value)return;const oldID=current.id;const text=area.value,patches=[{range:{start:current.start,end:current.end},text}],next=project(applyPatches(source,patches),projection,patches),transactionID=crypto.randomUUID(),base=revision;
   source=next.source;projection=next;revision++;lastSelectedRange={start:current.start+area.selectionStart,end:current.start+area.selectionEnd};
   pending.set(transactionID,{source,revision,patches});liveDraft.end=current.start+text.length;liveDraft.id=next.records.has(oldID)?oldID:[...next.records.values()].find(r=>r.start===current.start&&r.end===current.start+text.length)?.id;
   post({type:'edit',transactionID,revision:base,patches,...lastSelectedRange,label:'Edit',group:group()});publishOutline();
 };
 area.oninput=()=>{grow();if(!area.matches(':disabled')&&!area.dataset.composing)save()};area.oncompositionstart=()=>area.dataset.composing='true';area.oncompositionend=()=>{delete area.dataset.composing;save()};
 area.onselect=()=>{const current=projection.records.get(liveDraft?.id);if(current)post({type:'selection',revision,start:current.start+area.selectionStart,end:current.start+area.selectionEnd,kind:'text'})};
 area.onkeydown=e=>{if(e.metaKey&&e.key.toLowerCase()==='z'){e.preventDefault();post({type:e.shiftKey?'redo':'undo'})}if(e.key==='Escape'){e.preventDefault();area.blur()}};
 area.onblur=()=>{if(!liveDraft||liveDraft.area!==area)return;save();closeLiveBlock();view.updateState(freshState(projection.doc,projection.positionAt(lastSelectedRange.start)));};
 if(focus){area.focus();const caret=Math.max(0,Math.min(area.value.length,lastSelectedRange.start-record.start));area.setSelectionRange(caret,caret)}
 else area.scrollIntoView({block:'nearest'});
}
function publishFormatting(){
 const sel=view.state.selection,sets=[];if(sel.empty)sets.push(view.state.storedMarks||sel.$from.marks());else view.state.doc.nodesBetween(sel.from,sel.to,n=>{if(n.isText)sets.push(n.marks)});
 const active=['strong','em','strike','highlight','code','sup','sub'].filter(name=>sets.length&&sets.every(m=>m.some(mark=>mark.type.name===name)));
 let table=false;for(let depth=sel.$from.depth;depth>0;depth--)if(sel.$from.node(depth).type.name==='table')table=true;
 post({type:'formatState',revision,marks:active,table,kind:sel instanceof NodeSelection?sel.node.type.name:'text'});
}
function selectSource(start,end,reveal=false){
  flushPendingRender();
  const from=projection.positionAt(start),to=projection.positionAt(end);
  muted=true;
  try{const object=[...projection.records.values()].find(r=>r.pmNode?.isAtom&&!r.pmNode.isText&&start>=r.start&&end<=r.end);let sel;if(object){sel=NodeSelection.create(view.state.doc,object.pmStart);selectedObject={origin:object.id,kind:object.pmNode.type.name,node:object.pmNode}}else{sel=TextSelection.create(view.state.doc,Math.min(from,to),Math.max(from,to));selectedObject=null;}let tr=view.state.tr.setSelection(sel);if(reveal)tr=tr.scrollIntoView();view.dispatch(tr);}catch{}
  muted=false;lastSelectedRange={start,end};publishFormatting();
}
function insertMarkdown(markdown){
  const r=lastSelectedRange;
  const prefix=r.start>0&&!source.slice(0,r.start).endsWith('\n\n')?'\n\n':'';
  const suffix=r.end<source.length&&!source.slice(r.end).startsWith('\n\n')?'\n\n':'';
  const text=prefix+markdown+suffix;
  patchSource([{range:r,text}],'Insert',{start:r.start+prefix.length,end:r.start+prefix.length+markdown.length});
}
function objectView(node,_view,getPos){
  const inline=node.isInline,dom=document.createElement(inline?'span':'div');dom.className=`object ${node.type.name}`;dom.dataset.kind=node.attrs.kind||node.type.name;dom.contentEditable='false';dom.tabIndex=0;dom.setAttribute('role','button');
  const label=node.type.name==='mermaid'?'Mermaid diagram':node.type.name.includes('math')?'LaTeX equation':`${node.attrs.kind} source`;
  dom.setAttribute('aria-label',label);const graphic=document.createElement('span');graphic.className='graphic';dom.append(graphic);
  if(node.type.name==='opaque'){
    const detail=document.createElement('details');const summary=document.createElement('summary');summary.textContent=node.attrs.kind==='yaml'?'Front matter':`Source · ${node.attrs.kind}`;const code=document.createElement('pre');code.textContent=node.attrs.raw;detail.append(summary,code);graphic.append(detail);
  }else{
    graphic.textContent=node.attrs.value;graphic.classList.add('pending');
    renderObject(node,graphic);
  }
  const select=()=>{const pos=getPos();if(typeof pos==='number'){view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc,pos)));view.focus();}};
  if(node.type.name==='mermaid'){
    const meta=Object.fromEntries([...node.attrs.metadata.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    const width=Number(meta.width)||preferences.diagramWidth||720,height=Number(meta.height)||preferences.diagramHeight||420,align=(meta.align||preferences.diagramAlignment||'center').toLowerCase();
    dom.style.width=Math.max(120,width)+'px';dom.style.maxWidth='100%';dom.style.marginLeft=align==='left'?'0':'auto';dom.style.marginRight=align==='right'?'0':'auto';graphic.style.maxHeight=Math.max(80,height)+'px';graphic.style.overflow='auto';graphic.style.display='block';
    if(meta.title)dom.setAttribute('aria-label','Mermaid diagram: '+meta.title);
    const controls=document.createElement('div');controls.className='diagram-controls';
    for(const [title,command]of [['Visual Edit','visualDiagram'],['Source','editObject'],['Zoom','zoomDiagram'],['Layout','diagramLayout'],['↑','moveDiagramUp'],['↓','moveDiagramDown'],['Copy Source','copyDiagramSource'],['SVG','exportDiagramSVG'],['PNG','exportDiagramPNG']]){
      const b=document.createElement('button');b.type='button';b.textContent=title;b.setAttribute('aria-label',title==='↑'?'Move diagram up':title==='↓'?'Move diagram down':title);b.onclick=e=>{e.stopPropagation();select();runCommand(command)};controls.append(b);
    }
    dom.append(controls);
    const code=document.createElement('pre');code.className='diagram-source';code.textContent=node.attrs.value;code.hidden=!preferences.mermaidSource;dom.append(code);
    if(preferences.resizeDiagrams!==false){const handle=document.createElement('button');handle.className='diagram-resize';handle.setAttribute('aria-label','Resize diagram');handle.textContent='↘';handle.onclick=e=>e.stopPropagation();handle.onpointerdown=e=>{e.stopPropagation();select();const start={x:e.clientX,y:e.clientY,width:dom.getBoundingClientRect().width,height:graphic.getBoundingClientRect().height};handle.setPointerCapture(e.pointerId);let nextWidth=start.width,nextHeight=start.height;handle.onpointermove=event=>{nextWidth=Math.max(120,Math.min(2400,start.width+event.clientX-start.x));nextHeight=Math.max(80,Math.min(2400,start.height+event.clientY-start.y));dom.style.width=nextWidth+'px';graphic.style.maxHeight=nextHeight+'px'};handle.onpointerup=()=>{handle.onpointermove=null;updateDiagramMetadata(node.attrs.origin,{width:Math.round(nextWidth),height:Math.round(nextHeight)})}};dom.append(handle);}
  }
  dom.addEventListener('click',select);dom.addEventListener('dblclick',()=>{select();editObject();});
  dom.addEventListener('keydown',e=>{if(e.key==='Enter'){select();editObject();e.preventDefault();}});
  return {dom,selectNode(){dom.classList.add('selected');},deselectNode(){dom.classList.remove('selected');},stopEvent:e=>!!e.target.closest('details,.diagram-controls,.diagram-resize'),ignoreMutation:()=>true};
}
async function renderObject(node,element){
  try{
    if(node.type.name==='mermaid'&&preferences.mermaidLive===false&&objectPreviews.has(node.attrs.origin)){element.innerHTML=objectPreviews.get(node.attrs.origin);element.classList.remove('pending');return;}
    rendererModule??=import('./renderers.mjs');const renderers=await rendererModule;
    if(node.type.name==='mermaid'&&preferences.mermaidEnabled===false){element.textContent=node.attrs.value;element.classList.remove('pending');return;}
    const result=node.type.name==='mermaid'?await renderers.diagram(node.attrs.value,{theme:preferences.mermaidFollowsTheme!==false&&(preferences.theme==='Midnight'||preferences.theme==='Graphite'||preferences.theme==='System'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'default'}):await renderers.equation(node.attrs.value,node.type.name==='math_display');
    if(!element.isConnected)return;element.innerHTML=DOMPurify.sanitize(result,{USE_PROFILES:{svg:true,svgFilters:true},ADD_TAGS:['foreignObject'],FORBID_TAGS:['script','iframe','object'],FORBID_ATTR:['onload','onclick']});element.classList.remove('pending');if(node.type.name==='mermaid'){objectPreviews.set(node.attrs.origin,element.innerHTML);if(objectPreviews.size>128)objectPreviews.delete(objectPreviews.keys().next().value);}
  }catch(error){if(element.isConnected){element.textContent=`${error.message}\n\n${node.attrs.value}`;element.classList.add('render-error');element.classList.remove('pending');}}
}
function dialog(title,body){
  document.querySelector('#toolDialog')?.remove();const d=document.createElement('dialog');d.id='toolDialog';d.innerHTML='<header><h2></h2><button aria-label="Close">×</button></header>';d.querySelector('h2').textContent=title;d.querySelector('button').onclick=()=>{d.close();d.remove();view.focus();};d.append(body);document.body.append(d);d.showModal();return d;
}
function editObject(){
  const node=selectedObject?.node,r=projection.records.get(selectedObject?.origin);if(!node||!r){return;}
  if(node.type.name.includes('math')){
    const id=r.id;equationEditor({dialog,value:node.attrs.value,display:node.type.name==='math_display',onChange:(value,display)=>{
      const current=projection.records.get(id);if(!current){post({type:'error',message:'This equation changed elsewhere. Close this panel and select it again.'});return;}
      const text=display?'$$\n'+value+'\n$$':'$'+value+'$';if(text===source.slice(current.start,current.end))return;
      patchSource([{range:{start:current.start,end:current.end},text}],'Edit Equation',{start:current.start,end:current.start+text.length});
    }});return;
  }
  const body=document.createElement('div'),textarea=document.createElement('textarea');textarea.spellcheck=false;textarea.value=node.attrs.value??node.attrs.raw;textarea.setAttribute('aria-label',node.type.name==='mermaid'?'Mermaid source':'LaTeX or block source');body.append(textarea);
  const hint=document.createElement('p');hint.className='hint';hint.textContent='Changes update your Markdown immediately. Use Undo to reverse them.';body.append(hint);
  const objectID=r.id;let handle;
  textarea.addEventListener('input',()=>{
    const current=projection.records.get(objectID);if(!current){post({type:'error',message:'This object changed elsewhere. Close the inspector and select it again.'});return;}
    const currentStart=current.start,currentEnd=current.end,raw=source.slice(currentStart,currentEnd);let replacement;
    if(node.type.name==='mermaid'){
      const opening=raw.match(/(?:^|\n)(`{3,}|~{3,})mermaid[^\n]*\n/);const index=opening?.index??0;
      const prefix=opening?raw.slice(0,index+opening[0].length):'```mermaid\n';const fence=opening?.[1]||'```';
      replacement=prefix+textarea.value+'\n'+fence;
    }else if(node.type.name==='math_display')replacement='$$\n'+textarea.value+'\n$$';
    else if(node.type.name==='inline_math')replacement='$'+textarea.value+'$';else replacement=textarea.value;
    const patch={range:{start:currentStart,end:currentEnd},text:replacement};
    patchSource([patch],'Edit '+(node.type.name==='mermaid'?'Diagram':'Equation'),{start:currentStart,end:currentStart+replacement.length});
  });
  handle=dialog(node.type.name==='mermaid'?'Mermaid · Live Source':node.type.name.includes('math')?'LaTeX · Live Source':'Edit Source',body);textarea.focus();
}
function diagramRecord(){return projection.records.get(selectedObject?.origin)||[...projection.records.values()].find(r=>r.pmNode?.type.name==='mermaid'&&lastSelectedRange.start>=r.start&&lastSelectedRange.start<=r.end);}
function updateDiagramMetadata(id,values,kind="mermaid"){
 const r=projection.records.get(id);if(!r)return;const meta=r.metadata||'',attrs=Object.fromEntries([...meta.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));Object.assign(attrs,values);attrs.id??=crypto.randomUUID();
 const comment='<!-- remarque:'+kind+' '+Object.entries(attrs).map(([k,v])=>k+'="'+String(v).replace(/"/g,'&quot;').replace(/--/g,'—')+'"').join(' ')+' -->';
 const raw=r.raw,first=raw.indexOf('\n');const text=meta?comment+raw.slice(first):comment+'\n\n'+raw;
 patchSource([{range:{start:r.start,end:r.end},text}],'Diagram Layout');
}
function promptInsert(title,fields,callback){
  const form=document.createElement('form');form.className='insert-form';
  for(const [label,value] of fields){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.name=label;input.value=value;l.append(input);form.append(l);}
  const b=document.createElement('button');b.textContent='Insert';b.type='submit';form.append(b);const d=dialog(title,form);
  form.onsubmit=e=>{e.preventDefault();callback(Object.fromEntries(new FormData(form)));d.close();d.remove();view.focus();};form.querySelector('input')?.focus();
}
function runCommand(name,value){
  flushPendingRender();
  if(name==='formatDocument'){import('./formatter.mjs').then(m=>{const text=m.formatMarkdown(source);if(text!==source)patchSource([{range:{start:0,end:source.length},text}],'Format Document');});return;}
  if(name==='refreshPreview'){objectPreviews.clear();redrawObjects();return;}
  if(name==='importDOCX'){import('./importers.mjs').then(m=>post({type:'imported',...m.importDocx(value)})).catch(error=>post({type:'error',message:error.message}));return;}
  if(name==='importHTML'){post({type:'imported',text:turndown.turndown(DOMPurify.sanitize(value)),warnings:[]});return;}
  if(name==='importMermaidData'){import('./importers.mjs').then(m=>{
    const blocks=m.importMermaid(value),body=document.createElement('div');body.className='import-diagram';
    body.innerHTML='<label>Diagram <select></select></label><label>Title <input name="title" value="Imported diagram"></label><div class="dimensions"><label>Width <input name="width" type="number" min="120" max="2400" value="720"></label><label>Height <input name="height" type="number" min="80" max="2400" value="420"></label><label>Alignment <select name="align"><option>center</option><option>left</option><option>right</option></select></label></div><textarea aria-label="Imported Mermaid source"></textarea><div class="gallery-preview"></div><label>Insert <select name="position"><option value="cursor">At cursor</option><option value="append">At document end</option><option value="replace">Replace selected diagram</option></select></label><footer><button class="primary">Import</button><button class="cancel">Cancel</button></footer>';
    const picker=body.querySelector('select'),textarea=body.querySelector('textarea'),preview=body.querySelector('.gallery-preview');blocks.forEach((block,i)=>picker.add(new Option(`${i+1}. ${block.split('\n').find(l=>l.trim())||'Diagram'}`,String(i))));textarea.value=blocks[0];let generation=0;
    const render=async()=>{const current=++generation;try{const m=await import('./renderers.mjs'),svg=await m.diagram(textarea.value);if(current===generation)preview.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{html:true,svg:true,svgFilters:true},ADD_TAGS:['foreignObject']});}catch(e){if(current===generation)preview.textContent=e.message;}};
    picker.onchange=()=>{textarea.value=blocks[Number(picker.value)];render()};textarea.oninput=render;
    const d=dialog('Import Mermaid',body);body.querySelector('.cancel').onclick=()=>{d.close();d.remove()};body.querySelector('.primary').onclick=()=>{const title=body.querySelector('[name=title]').value.replace(/"/g,'&quot;').replace(/--/g,'—'),width=Math.max(120,Math.min(2400,Number(body.querySelector('[name=width]').value)||720)),height=Math.max(80,Math.min(2400,Number(body.querySelector('[name=height]').value)||420)),align=body.querySelector('[name=align]').value;
      const markdown=`<!-- remarque:mermaid id="${crypto.randomUUID()}" title="${title}" width="${width}" height="${height}" align="${align}" -->\n\n\`\`\`mermaid\n${textarea.value}\n\`\`\``;
      const position=body.querySelector('[name=position]').value;
      if(position==='replace'){const r=projection.records.get(selectedObject?.origin);if(!r||selectedObject.kind!=='mermaid'){post({type:'error',message:'Select a Mermaid diagram before choosing Replace.'});return;}patchSource([{range:{start:r.start,end:r.end},text:markdown}],'Import Diagram');}
      else{if(position==='append')lastSelectedRange={start:source.length,end:source.length};insertMarkdown(markdown);}
      d.close();d.remove();};render();
  });return;}
  if(name.startsWith('export:')||name==='print'||name==='printCombined'||name==='present'){
    const exportedRevision=revision,format=name.startsWith('export:')?name.slice(7):name;
    import('./exporters.mjs').then(m=>m.exportDocument({format,source,projection,view,preferences})).then(result=>{if(exportedRevision!==revision)throw Error('The document changed while preparing the export. Please export again.');post({type:'export',...result});}).catch(e=>post({type:'error',message:'Export failed: '+e.message}));return;
  }
  let command;
  const mark={bold:'strong',italic:'em',strike:'strike',highlight:'highlight',code:'code',sup:'sup',sub:'sub'}[name];
  if(mark)command=toggleMark(schema.marks[mark]);
  else if(name==='heading')command=setBlockType(value?schema.nodes.heading:schema.nodes.paragraph,value?{level:value}:null);
  else if(name==='quote')command=wrapIn(schema.nodes.blockquote);
  else if(name==='bullet')command=wrapInList(schema.nodes.bullet_list);
  else if(name==='task')command=(state,dispatch)=>wrapInList(schema.nodes.bullet_list)(state,tr=>{tr.doc.nodesBetween(tr.selection.from,tr.selection.to,(node,pos)=>{if(node.type.name==='list_item')tr.setNodeMarkup(pos,null,{...node.attrs,checked:false});});dispatch(tr);});
  else if(name==='ordered')command=wrapInList(schema.nodes.ordered_list);
  else if(name==='codeBlock')command=setBlockType(schema.nodes.code_block,{language:''});
  else if(name==='indent')command=sinkListItem(schema.nodes.list_item);
  else if(name==='outdent')command=liftListItem(schema.nodes.list_item);
  else if(name==='addRow')command=addRowAfter;
  else if(name==='addColumn')command=addColumnAfter;
  else if(name==='deleteRow')command=deleteRow;
  else if(name==='deleteColumn')command=deleteColumn;
  else if(name.startsWith('align:'))command=setCellAttr('alignment',name.split(':')[1]);
  if(command){command(view.state,tr=>view.dispatch(tr));view.focus();return;}
  if(name==='table')insertMarkdown('| Header | Header |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |');
  if(name==='rule')insertMarkdown('---');
  if(name==='callout')insertMarkdown('> [!NOTE]\n> Your note');
  if(name==='details')insertMarkdown('<details>\n<summary>Details</summary>\n\nContent\n\n</details>');
  if(name==='footnote')insertMarkdown('[^note]\n\n[^note]: Footnote text.');
  if(name==='equation')equationEditor({dialog,value:'',onInsert:(value,display)=>{if(display)insertMarkdown('$$\n'+value+'\n$$');else patchSource([{range:lastSelectedRange,text:'$'+value+'$'}],'Insert Equation');}});
  if(name==='mathMode'&&selectedObject?.kind.includes('math')){const r=projection.records.get(selectedObject.origin),value=selectedObject.node.attrs.value;if(r)patchSource([{range:{start:r.start,end:r.end},text:selectedObject.kind==='inline_math'?'$$\n'+value+'\n$$':'$'+value+'$'}],'Change Equation Mode');}
  if(name.startsWith('tablePlacement:')){const table=[...projection.records.values()].find(r=>r.kind==='table'&&lastSelectedRange.start>=r.start&&lastSelectedRange.start<=r.end);if(table)updateDiagramMetadata(table.id,{align:name.split(':')[1]},'table');return;}
  if(name==='tableEditor'){
    const table=[...projection.records.values()].find(r=>r.kind==='table'&&lastSelectedRange.start>=r.start&&lastSelectedRange.start<=r.end);
    const rows=table?.mdast.children.map(r=>r.children.map(c=>c.children.length?source.slice(c.children[0].position.start.offset,c.children.at(-1).position.end.offset):'')),align=table?.mdast.align;
    tableEditor({dialog,rows,align,onApply:markdown=>{if(table){const current=projection.records.get(table.id);if(current)patchSource([{range:{start:current.start,end:current.end},text:(current.metadata?current.metadata+'\n\n':'')+markdown}],'Edit Table');}else insertMarkdown(markdown);}});
  }
  if(name==='pasteHTML')insertMarkdown(turndown.turndown(DOMPurify.sanitize(value)));
  if(name==='gallery')import('./gallery.mjs').then(m=>m.showGallery({dialog,insertMarkdown}));
  if(name==='editObject')editObject();
  if(name==='visualDiagram'){
    const r=projection.records.get(selectedObject?.origin)||[...projection.records.values()].find(r=>r.pmNode?.type.name==='mermaid'&&lastSelectedRange.start>=r.start&&lastSelectedRange.start<=r.end);
    if(!r){post({type:'error',message:'Select a Mermaid diagram first.'});return;}
    const id=r.id,original=r.raw;
    import('./visual-editor.mjs').then(m=>m.visualEditor({dialog,source:r.pmNode.attrs.value,onApply:value=>{
      const current=projection.records.get(id);if(!current||current.raw!==original)throw Error('The diagram changed while this editor was open. Cancel and reopen it to keep those changes.');
      if(value===r.pmNode.attrs.value)return true;
      const opening=current.raw.match(/(?:^|\n)(`{3,}|~{3,})mermaid[^\n]*\n/),prefix=opening?current.raw.slice(0,opening.index+opening[0].length):'```mermaid\n';
      patchSource([{range:{start:current.start,end:current.end},text:prefix+value+'\n'+(opening?.[1]||'```')}],'Visual Diagram');return true;
    }})).catch(e=>post({type:'error',message:e.message}));
  }
  if(name==='link')promptInsert('Insert Link',[['Label','Link'],['URL','https://']],f=>patchSource([{range:lastSelectedRange,text:`[${f.Label}](${f.URL})`}],'Insert Link'));
  if(name==='image')promptInsert('Insert Image',[['Alt text','Image'],['Path','assets/image.png']],f=>patchSource([{range:lastSelectedRange,text:`![${f['Alt text']}](${f.Path})`}],'Insert Image'));
  if(name==='diagramLayout'){
    const r=diagramRecord();if(!r)return;const meta=Object.fromEntries([...r.pmNode.attrs.metadata.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
    promptInsert('Diagram Layout',[['Title',meta.title||'Diagram'],['Width',meta.width||'720'],['Height',meta.height||'420'],['Alignment',meta.align||'center']],f=>updateDiagramMetadata(r.id,{title:f.Title,width:Math.max(120,Math.min(2400,Number(f.Width)||720)),height:Math.max(80,Math.min(2400,Number(f.Height)||420)),align:['left','center','right'].includes(f.Alignment.toLowerCase())?f.Alignment.toLowerCase():'center'}));
  }
  if(name==='moveDiagramUp'||name==='moveDiagramDown'){
    const r=diagramRecord();if(!r)return;const nodes=[];projection.doc.forEach(n=>nodes.push(n));const i=nodes.findIndex(n=>n.attrs.origin===r.id),j=i+(name==='moveDiagramUp'?-1:1),other=projection.records.get(nodes[j]?.attrs.origin);if(!other)return;
    const first=r.start<other.start?r:other,last=r.start<other.start?other:r;patchSource([{range:{start:first.start,end:last.end},text:last.raw+source.slice(first.end,last.start)+first.raw}],'Move Diagram');
  }
  if(name==='zoomDiagram'){
    const svg=document.querySelector('.object.selected svg');if(svg){const box=document.createElement('div');box.className='diagram-zoom';box.append(svg.cloneNode(true));const d=dialog('Diagram Zoom',box);d.classList.add('wide-dialog');box.onwheel=e=>{e.preventDefault();const picture=box.firstChild;const current=parseFloat(picture.style.width)||100;picture.style.maxWidth='none';picture.style.width=Math.max(20,Math.min(400,current+(e.deltaY<0?10:-10)))+'%'};}
  }
  if(name==='exportDiagramSVG'||name==='exportDiagramPNG'){
    const svg=document.querySelector('.object.selected svg');if(!svg){post({type:'error',message:'Select a rendered Mermaid diagram first.'});return;}
    if(name==='exportDiagramSVG')post({type:'export',format:'Diagram SVG',extension:'svg',title:'Diagram',text:new XMLSerializer().serializeToString(svg)});
    else import('./exporters.mjs').then(async m=>{const result=await m.png(svg);post({type:'export',format:'Diagram PNG',extension:'png',title:'Diagram',base64:m.bytesBase64(result.data)})}).catch(e=>post({type:'error',message:e.message}));
  }
  if(name==='copySVG'){
    const svg=document.querySelector('.object.selected svg');if(svg){post({type:'copy',format:'svg',text:svg.outerHTML});navigator.clipboard?.writeText(svg.outerHTML).catch(()=>{});}
  }
  if(name==='copyDiagramSource'&&selectedObject)post({type:'copy',text:selectedObject.node.attrs.value});
  if(name==='copyHTML'){const copy=view.dom.cloneNode(true);copy.querySelectorAll('[contenteditable],[tabindex]').forEach(n=>{n.removeAttribute('contenteditable');n.removeAttribute('tabindex')});post({type:'copy',format:'html',text:copy.innerHTML});}
}

function flushPendingRender(){
 if(!pendingRender)return;pendingRender=false;clearTimeout(renderTimer);document.querySelector('#previewNotice').hidden=true;
 muted=true;view.updateState(freshState(projection.doc,{from:projection.positionAt(lastSelectedRange.start),to:projection.positionAt(lastSelectedRange.end)}));muted=false;
}
function redrawObjects(){view.setProps({nodeViews:{mermaid:(...args)=>objectView(...args),math_display:(...args)=>objectView(...args),inline_math:(...args)=>objectView(...args),opaque:objectView,image:imageView}});}
document.querySelector('#previewNotice button').onclick=()=>{flushPendingRender();objectPreviews.clear();redrawObjects()};
let nativeScrollUntil=0,scrollTimer;
window.addEventListener('scroll',()=>{if(preferences.scrollSync===false||Date.now()<nativeScrollUntil)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const position=view.posAtCoords({left:view.dom.getBoundingClientRect().left+20,top:35});if(position)post({type:'scroll',revision,start:projection.sourceAt(position.pos)});},80)},{passive:true});
window.Remarque={receive(message){
  if(message.mode){mode=message.mode;document.body.dataset.mode=mode;}
  if(message.type==='scroll'){if(preferences.scrollSync!==false&&message.revision===revision){const position=projection.positionAt(message.start),point=view.coordsAtPos(position);nativeScrollUntil=Date.now()+250;window.scrollBy({top:point.top-35,behavior:'instant'});}return;}
  if(message.type==='state'){
    if(message.preferences)applyPreferences(message.preferences);readOnly=!!message.readOnly;view.setProps({editable:()=>!readOnly&&mode!=='liveSource'});
    if(message.rejected){post({type:'error',message:'A concurrent edit was rejected. The current editor text is preserved in the recovery field.'});document.querySelector('#recovery').value=source;document.querySelector('#recovery').hidden=false;pending.clear();}
    if(message.transactionID&&pending.has(message.transactionID)){pending.delete(message.transactionID);return;}
    if(liveDraft&&document.activeElement===liveDraft.area&&message.source!==source){document.querySelector('#recovery').value=liveDraft.area.value;document.querySelector('#recovery').hidden=false;closeLiveBlock();}
    if(typeof message.source!=='string'||!Number.isInteger(message.revision))return;
    if(!message.rejected&&message.documentID===documentID&&message.revision<revision)return;
    let rebasedComposition=null;
    if(compositionBase){
      clearTimeout(compositionTimer);const base=compositionBase;compositionBase=null;
      try{
        const composed=transactionPatches(base,{docChanged:true,doc:view.state.doc,steps:[]}),external=message.patches||[];
        const overlaps=(a,b)=>a.start<=b.end&&b.start<=a.end;
        if(external.length&&!composed.some(a=>external.some(b=>overlaps(a.range,b.range))))rebasedComposition=composed.map(p=>({range:{start:mapOffset(p.range.start,external),end:mapOffset(p.range.end,external)},text:p.text}));
        else{document.querySelector('#recovery').value=applyPatches(base.source,composed);document.querySelector('#recovery').hidden=false;post({type:'error',message:'Another edit interrupted text composition. Your full Markdown draft is preserved in the recovery field.'});}
      }catch{document.querySelector('#recovery').value=base.source+'\n\n<!-- Uncommitted composition -->\n'+view.state.doc.textContent;document.querySelector('#recovery').hidden=false;}
    }
    documentID=message.documentID;revision=message.revision;source=message.source;projection=project(source,projection,message.patches||[]);
    lastSelectedRange={start:message.start,end:message.end};
    if(mode==='rendered'&&message.surface==='source'&&document.activeElement!==view.dom){
      pendingRender=true;clearTimeout(renderTimer);
      if(preferences.livePreview===false){const banner=document.querySelector('#previewNotice');banner.hidden=false;}
      else renderTimer=setTimeout(flushPendingRender,Math.max(0,Math.min(500,(preferences.debounce??0.15)*1000)));
    }else{pendingRender=true;flushPendingRender();}
    publishOutline();if(rebasedComposition){flushPendingRender();patchSource(rebasedComposition,'Compose');}if(mode==='liveSource')view.dom.setAttribute('aria-label','Live Markdown source editor');
  }else if(message.type==='asset'){
    const request=assetRequests.get(message.token);if(request){if(message.error){request.element.title=message.error;request.element.classList.add('missing-image');}else{let data=message.base64;if(message.mime==='image/svg+xml'){const raw=new TextDecoder().decode(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));const safe=DOMPurify.sanitize(raw,{USE_PROFILES:{svg:true,svgFilters:true}});data=btoa(Array.from(new TextEncoder().encode(safe),b=>String.fromCharCode(b)).join(''));}const src='data:'+message.mime+';base64,'+data;assetCache.set(request.path,src);request.element.src=src;}assetRequests.delete(message.token);}
  }else if(message.type==='preferences'){applyPreferences(message.values);
  }else if(message.type==='selection'){
    if(message.revision===revision){selectSource(message.start,message.end,message.reveal);if(mode==='liveSource'&&message.reveal)openLiveBlock(projection.positionAt(message.start),false);}
  }else if(message.type==='command'){
    if(message.surface!=='rendered')selectSource(message.start,message.end,false);
    runCommand(message.name,message.value);
  }
},getState(){return {source,revision,documentID,selection:lastSelectedRange,doc:view.state.doc.toJSON()};},view};
function applyPreferences(values){const old=preferences;preferences=values;document.documentElement.style.fontSize=(values.previewSize||17)+'px';document.body.style.fontSize=(values.previewSize||17)+'px';view.setProps({attributes:{'aria-label':'Rendered document editor',spellcheck:String(values.spellcheck!==false),'data-testid':'richEditor'}});document.body.dataset.theme=values.theme||'System';document.body.classList.toggle('hide-frontmatter',values.hideFrontMatter!==false);document.querySelectorAll('.diagram-source').forEach(n=>n.hidden=!values.mermaidSource);if(values.livePreview!==false)flushPendingRender();if(old.theme!==values.theme||old.mermaidEnabled!==values.mermaidEnabled||old.mermaidFollowsTheme!==values.mermaidFollowsTheme){objectPreviews.clear();redrawObjects();}view.updateState(view.state);}
window.addEventListener('error',event=>post({type:'error',message:event.message}));
window.addEventListener('unhandledrejection',event=>post({type:'error',message:String(event.reason)}));
post({type:'ready',protocol:1});
