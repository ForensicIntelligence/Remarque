import {EditorState,TextSelection,NodeSelection} from 'prosemirror-state';
import {EditorView} from 'prosemirror-view';
import {keymap} from 'prosemirror-keymap';
import {baseKeymap,toggleMark,setBlockType,wrapIn,lift,chainCommands,exitCode} from 'prosemirror-commands';
import {wrapInList,splitListItem,sinkListItem,liftListItem} from 'prosemirror-schema-list';
import {tableEditing,goToNextCell,addRowAfter,addColumnAfter,deleteRow,deleteColumn,setCellAttr} from 'prosemirror-tables';
import {equationEditor} from './equation-editor.mjs';
import {tableEditor} from './table-editor.mjs';
import {schema} from './schema.mjs';
import {project,transactionPatches,applyPatches,mapOffset} from './projection.mjs';
import DOMPurify from 'dompurify';
import TurndownService from 'turndown';
import {gfm as turndownGFM} from 'turndown-plugin-gfm';

let source='',revision=0,documentID='',projection=project(''),muted=false,compositionBase=null,compositionTimer=null;
let typingGroup=null,typingTime=0,selectedObject=null,lastSelectedRange={start:0,end:0},rendererModule=null;
let preferences={},readOnly=false;
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
const plugins=[keymap(bindings),tableEditing()];
function freshState(doc,selection){let state=EditorState.create({doc,plugins});if(selection){try{state=state.apply(state.tr.setSelection(TextSelection.near(state.doc.resolve(Math.min(state.doc.content.size,Math.max(0,selection))))));}catch{}}return state;}

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
    compositionstart(){compositionBase=projection;clearTimeout(compositionTimer);return false;},
    compositionend(){compositionTimer=setTimeout(()=>{if(!compositionBase)return;const old=compositionBase;compositionBase=null;projection=old;commitTransaction({docChanged:!old.doc.eq(view.state.doc),doc:view.state.doc,steps:[],selection:view.state.selection},view.state,'Compose');},20);return false;}
  },
  handleClick(_view,pos,event){
    const anchor=event.target.closest('a');
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
    commit(patches,newProjection,{start:Math.min(start,end),end:Math.max(start,end)},label,position);
  }catch(error){post({type:'error',message:`The edit could not be applied: ${error.message}`});view.updateState(freshState(projection.doc));}
}
function commit(patches,next,selection,label='Edit',position=null){
  if(!patches.length)return;
  const base=revision,transactionID=crypto.randomUUID();
  source=next.source;projection=next;revision++;lastSelectedRange=selection;
  pending.set(transactionID,{source,revision,patches});
  muted=true;view.updateState(freshState(next.doc,position??next.positionAt(selection.start)));muted=false;
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
  const sel=view.state.selection;let start=projection.sourceAt(sel.from),end=projection.sourceAt(sel.to,-1),kind='text';
  if(sel instanceof NodeSelection){
    const r=projection.records.get(sel.node.attrs.origin);
    if(r){start=r.start;end=r.end;kind=sel.node.type.name;selectedObject={origin:r.id,kind,node:sel.node};}
  }else if(document.activeElement?.closest('.ProseMirror'))selectedObject=null;
  if(sel.empty)end=start;
  lastSelectedRange={start:Math.min(start,end),end:Math.max(start,end)};
  post({type:'selection',revision,...lastSelectedRange,kind});
}
function selectSource(start,end,reveal=false){
  const from=projection.positionAt(start),to=projection.positionAt(end);
  muted=true;
  try{let tr=view.state.tr.setSelection(TextSelection.create(view.state.doc,Math.min(from,to),Math.max(from,to)));if(reveal)tr=tr.scrollIntoView();view.dispatch(tr);}catch{}
  muted=false;lastSelectedRange={start,end};
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
  dom.addEventListener('click',select);dom.addEventListener('dblclick',()=>{select();editObject();});
  dom.addEventListener('keydown',e=>{if(e.key==='Enter'){select();editObject();e.preventDefault();}});
  return {dom,selectNode(){dom.classList.add('selected');},deselectNode(){dom.classList.remove('selected');},stopEvent:e=>e.target.closest('details')&&e.type==='click',ignoreMutation:()=>true};
}
async function renderObject(node,element){
  try{
    rendererModule??=import('./renderers.mjs');const renderers=await rendererModule;
    const result=node.type.name==='mermaid'?await renderers.diagram(node.attrs.value):await renderers.equation(node.attrs.value,node.type.name==='math_display');
    if(!element.isConnected)return;element.innerHTML=DOMPurify.sanitize(result,{USE_PROFILES:{svg:true,svgFilters:true},ADD_TAGS:['foreignObject'],FORBID_TAGS:['script','iframe','object'],FORBID_ATTR:['onload','onclick']});element.classList.remove('pending');
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
  let currentStart=r.start,currentEnd=r.end;let handle;
  textarea.addEventListener('input',()=>{
    const raw=source.slice(currentStart,currentEnd);let replacement;
    if(node.type.name==='mermaid'){
      const opening=raw.match(/(?:^|\n)(`{3,}|~{3,})mermaid[^\n]*\n/);const index=opening?.index??0;
      const prefix=opening?raw.slice(0,index+opening[0].length):'```mermaid\n';const fence=opening?.[1]||'```';
      replacement=prefix+textarea.value+'\n'+fence;
    }else if(node.type.name==='math_display')replacement='$$\n'+textarea.value+'\n$$';
    else if(node.type.name==='inline_math')replacement='$'+textarea.value+'$';else replacement=textarea.value;
    const patch={range:{start:currentStart,end:currentEnd},text:replacement};currentEnd=currentStart+replacement.length;
    patchSource([patch],'Edit '+(node.type.name==='mermaid'?'Diagram':'Equation'),{start:currentStart,end:currentEnd});
  });
  handle=dialog(node.type.name==='mermaid'?'Mermaid · Live Source':node.type.name.includes('math')?'LaTeX · Live Source':'Edit Source',body);textarea.focus();
}
function promptInsert(title,fields,callback){
  const form=document.createElement('form');form.className='insert-form';
  for(const [label,value] of fields){const l=document.createElement('label');l.textContent=label;const input=document.createElement('input');input.name=label;input.value=value;l.append(input);form.append(l);}
  const b=document.createElement('button');b.textContent='Insert';b.type='submit';form.append(b);const d=dialog(title,form);
  form.onsubmit=e=>{e.preventDefault();callback(Object.fromEntries(new FormData(form)));d.close();d.remove();view.focus();};form.querySelector('input')?.focus();
}
function runCommand(name,value){
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
  if(name==='tableEditor'){
    const table=[...projection.records.values()].find(r=>r.kind==='table'&&lastSelectedRange.start>=r.start&&lastSelectedRange.start<=r.end);
    const rows=table?.mdast.children.map(r=>r.children.map(c=>source.slice(c.position.start.offset,c.position.end.offset).trim())),align=table?.mdast.align;
    tableEditor({dialog,rows,align,onApply:markdown=>{if(table){const current=projection.records.get(table.id);if(current)patchSource([{range:{start:current.start,end:current.end},text:markdown}],'Edit Table');}else insertMarkdown(markdown);}});
  }
  if(name==='pasteHTML')insertMarkdown(turndown.turndown(DOMPurify.sanitize(value)));
  if(name==='gallery')import('./gallery.mjs').then(m=>m.showGallery({dialog,insertMarkdown}));
  if(name==='editObject')editObject();
  if(name==='link')promptInsert('Insert Link',[['Label','Link'],['URL','https://']],f=>patchSource([{range:lastSelectedRange,text:`[${f.Label}](${f.URL})`}],'Insert Link'));
  if(name==='image')promptInsert('Insert Image',[['Alt text','Image'],['Path','assets/image.png']],f=>patchSource([{range:lastSelectedRange,text:`![${f['Alt text']}](${f.Path})`}],'Insert Image'));
  if(name==='copySVG'){
    const svg=document.querySelector('.object.selected svg');if(svg){post({type:'copy',format:'svg',text:svg.outerHTML});navigator.clipboard?.writeText(svg.outerHTML).catch(()=>{});}
  }
  if(name==='copyDiagramSource'&&selectedObject)post({type:'copy',text:selectedObject.node.attrs.value});
  if(name==='copyHTML'){const copy=view.dom.cloneNode(true);copy.querySelectorAll('[contenteditable],[tabindex]').forEach(n=>{n.removeAttribute('contenteditable');n.removeAttribute('tabindex')});post({type:'copy',format:'html',text:copy.innerHTML});}
}

window.Remarque={receive(message){
  if(message.type==='state'){
    if(message.preferences)applyPreferences(message.preferences);readOnly=!!message.readOnly;view.setProps({editable:()=>!readOnly});
    if(message.rejected){post({type:'error',message:'A concurrent edit was rejected. The current editor text is preserved in the recovery field.'});document.querySelector('#recovery').value=source;document.querySelector('#recovery').hidden=false;pending.clear();}
    if(message.transactionID&&pending.has(message.transactionID)){pending.delete(message.transactionID);return;}
    if(!message.rejected&&message.documentID===documentID&&message.revision<revision)return;
    if(compositionBase){document.querySelector('#recovery').value=view.state.doc.textContent;document.querySelector('#recovery').hidden=false;compositionBase=null;}
    documentID=message.documentID;revision=message.revision;source=message.source;projection=project(source,projection,message.patches||[]);
    muted=true;view.updateState(freshState(projection.doc,projection.positionAt(message.start)));muted=false;
    lastSelectedRange={start:message.start,end:message.end};publishOutline();
  }else if(message.type==='asset'){
    const request=assetRequests.get(message.token);if(request){if(message.error){request.element.title=message.error;request.element.classList.add('missing-image');}else{let data=message.base64;if(message.mime==='image/svg+xml'){const raw=new TextDecoder().decode(Uint8Array.from(atob(data),c=>c.charCodeAt(0)));const safe=DOMPurify.sanitize(raw,{USE_PROFILES:{svg:true,svgFilters:true}});data=btoa(Array.from(new TextEncoder().encode(safe),b=>String.fromCharCode(b)).join(''));}const src='data:'+message.mime+';base64,'+data;assetCache.set(request.path,src);request.element.src=src;}assetRequests.delete(message.token);}
  }else if(message.type==='preferences'){applyPreferences(message.values);
  }else if(message.type==='selection'){
    if(message.revision===revision)selectSource(message.start,message.end,message.reveal);
  }else if(message.type==='command'){
    if(message.surface!=='rendered')selectSource(message.start,message.end,false);
    runCommand(message.name,message.value);
  }
},getState(){return {source,revision,documentID,selection:lastSelectedRange,doc:view.state.doc.toJSON()};},view};
function applyPreferences(values){preferences=values;document.documentElement.style.fontSize=(values.previewSize||17)+'px';document.body.style.fontSize=(values.previewSize||17)+'px';view.setProps({attributes:{'aria-label':'Rendered document editor',spellcheck:String(values.spellcheck!==false),'data-testid':'richEditor'}});document.body.dataset.theme=values.theme||'System';document.body.classList.toggle('hide-frontmatter',values.hideFrontMatter!==false);}
window.addEventListener('error',event=>post({type:'error',message:event.message}));
window.addEventListener('unhandledrejection',event=>post({type:'error',message:String(event.reason)}));
post({type:'ready',protocol:1});
