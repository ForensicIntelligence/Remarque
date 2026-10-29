import {parse} from './projection.mjs';
import {diagram,equation} from './renderers.mjs';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

const root=document.querySelector('#help');let generation=0,currentTitle='',lastArticle;
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
const post=(action,value)=>window.webkit?.messageHandlers?.remarqueHelp?.postMessage({action,value});
const isDark=theme=>['Midnight','Graphite'].includes(theme)||(theme==='System'&&matchMedia('(prefers-color-scheme:dark)').matches);
function sourceBlock(value,language=''){
  const pre=el('pre'),code=el('code');
  if(language&&hljs.getLanguage(language))code.innerHTML=hljs.highlight(value,{language,ignoreIllegals:true}).value;else code.textContent=value;
  pre.append(code);return pre;
}
function appMap(){
  const figure=el('figure','app-map');figure.setAttribute('aria-label','Remarque layout: outline, Markdown source, and editable rendered document');
  figure.innerHTML='<div class="map-title"><span class="window-dots" aria-hidden="true">● ● ●</span> Remarque <span class="map-badge">One document</span></div><div class="map-panes"><div class="map-outline"><span class="eyebrow">Outline</span><strong>Project notes</strong><span>Overview</span><span>Next steps</span></div><div class="map-source"><span class="eyebrow">Left · Markdown source</span><code><b>#</b> Project notes<br><br><b>##</b> Next steps<br><b>- [ ]</b> Review the draft<br><b>- [x]</b> Add a diagram</code></div><div class="map-rendered"><div class="map-tabs"><b>markdown</b><span>Mermaid</span><span>LaTeX</span></div><span class="eyebrow">Right · Editable document</span><h3>Project notes</h3><h4>Next steps</h4><div>☐ Review the draft</div><div>☑ Add a diagram</div></div></div><figcaption><span>① Navigate with the outline</span><span>② Edit either pane</span><span>③ Share one undo history</span></figcaption>';
  return figure;
}
function copyButton(value){const button=el('button','copy-example','Copy Markdown');button.type='button';button.onclick=()=>{post('copy',value);button.textContent='Copied';setTimeout(()=>{button.textContent='Copy Markdown';},1600)};return button;}
function renderNodes(nodes,parent,context,depth=0){
 for(const node of nodes||[]){
  let target;
  const children=()=>renderNodes(node.children,target,context,depth);
  switch(node.type){
   case 'text':parent.append(document.createTextNode(node.value));continue;
   case 'paragraph':target=el('p');break;
   case 'heading':target=el('h'+Math.min(6,node.depth));break;
   case 'strong':target=el('strong');break;
   case 'emphasis':target=el('em');break;
   case 'delete':target=el('del');break;
   case 'inlineCode':target=el('code','',node.value);break;
   case 'break':target=el('br');break;
   case 'thematicBreak':target=el('hr');break;
   case 'list':target=el(node.ordered?'ol':'ul');if(node.ordered)target.start=node.start||1;break;
   case 'listItem':target=el('li');if(typeof node.checked==='boolean'){target.className='task';const check=el('span','task-check',node.checked?'☑':'☐');check.setAttribute('aria-label',node.checked?'Completed':'Not completed');target.append(check)}break;
   case 'blockquote':{
    target=el('blockquote');const marker=node.children?.[0]?.children?.[0],match=marker?.type==='text'&&marker.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/);
    if(match){target.className='callout';target.dataset.kind=match[1].toLowerCase();target.append(el('strong','callout-title',{NOTE:'Good to know',TIP:'Try this',IMPORTANT:'Remember',WARNING:'Take care',CAUTION:'Take care'}[match[1]]));const copy=structuredClone(node.children);copy[0].children[0].value=marker.value.slice(match[0].length);renderNodes(copy,target,context,depth);parent.append(target);continue;}break;
   }
   case 'table':{
    const wrap=el('div','table-wrap');target=el('table');const head=el('thead'),body=el('tbody');
    node.children.forEach((row,i)=>{const tr=el('tr');row.children.forEach((cell,j)=>{const td=el(i===0?'th':'td');if(i===0)td.scope='col';if(node.align?.[j])td.style.textAlign=node.align[j];renderNodes(cell.children,td,context,depth);tr.append(td)});(i===0?head:body).append(tr)});target.append(head,body);wrap.append(target);parent.append(wrap);continue;
   }
   case 'link':{
    target=el('a');const href=node.url||'';
    if(/^#(?:topic:|settings:)/.test(href)){target.href=href;target.onclick=event=>{event.preventDefault();const match=href.match(/^#(topic|settings):(.*)$/);try{post(match[1],decodeURIComponent(match[2]))}catch{}};}
    else if(href.startsWith('#'))target.href=href;
    else{target=el('span');target.title=href;}break;
   }
   case 'code':{
    if(node.lang==='remarque-map'){parent.append(appMap());continue;}
    if(node.lang==='example'&&depth<2){
     const example=el('section','example');const bar=el('div','example-bar');bar.append(el('strong','','See it in action'),copyButton(node.value));
     const columns=el('div','example-columns'),input=el('div','example-source'),output=el('div','example-result');input.append(el('span','eyebrow','Markdown you write'),sourceBlock(node.value,'markdown'));output.append(el('span','eyebrow','What you see'));renderNodes(parse(node.value).children,output,context,depth+1);columns.append(input,output);example.append(bar,columns);parent.append(example);continue;
    }
    if(node.lang==='mermaid'){
     const figure=el('figure','diagram-example'),graphic=el('div','diagram-graphic','Drawing diagram…');graphic.setAttribute('role','img');graphic.setAttribute('aria-label','Illustrated workflow');
     const details=el('details'),summary=el('summary','','Show Mermaid source');details.append(summary,sourceBlock(node.value,'mermaid'));figure.append(graphic,details);parent.append(figure);
     context.jobs.push(diagram(node.value,{theme:context.dark?'dark':'default'}).then(svg=>{graphic.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true}});graphic.dataset.rendered='true';}).catch(()=>{graphic.textContent='The diagram source is shown below.';details.open=true;graphic.dataset.error='true';}));continue;
    }
    parent.append(sourceBlock(node.value,node.lang));continue;
   }
   case 'inlineMath':case 'math':{
    target=el(node.type==='math'?'div':'span',node.type==='math'?'math-display':'math-inline',node.value);target.setAttribute('role','img');target.setAttribute('aria-label','Equation: '+node.value);const graphic=target;
    context.jobs.push(equation(node.value,node.type==='math').then(svg=>{graphic.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true}});graphic.dataset.rendered='true';}).catch(()=>{graphic.textContent=node.value;graphic.dataset.error='true'}));break;
   }
   case 'definitionList':target=el('dl');break;
   case 'definitionTerm':target=el('dt');break;
   case 'definitionDescription':target=el('dd');break;
   case 'details':target=el('details');target.append(el('summary','',node.summary));break;
   case 'html':target=sourceBlock(node.value,'html');break;
   case 'image':target=el('span','',node.alt||'Image');break;
   default:if(node.children){renderNodes(node.children,parent,context,depth);continue;}else if(node.value){target=el('span','',node.value);}else continue;
  }
  children();parent.append(target);
 }
}
async function show(article){
 lastArticle=article;const id=++generation,title=String(article.title||'Guide'),changed=currentTitle!==title,scroll=window.scrollY;currentTitle=title;
 document.body.dataset.theme=article.theme||'System';document.documentElement.style.fontSize=(17*Math.max(.85,Math.min(1.6,article.scale||1)))+'px';document.title=title+' · Remarque Guide';
 const header=el('header','article-header');header.append(el('div','eyebrow','Remarque · Illustrated guide'),el('h1','',title));
 const content=el('article'),context={jobs:[],dark:isDark(article.theme||'System')};renderNodes(parse(String(article.source||'')).children,content,context);
 root.replaceChildren(header,content);root.dataset.ready='false';
 const headings=[...content.querySelectorAll(':scope > h2')];if(headings.length>1){const nav=el('nav','article-index');nav.setAttribute('aria-label','On this page');nav.append(el('span','eyebrow','On this page'));headings.forEach((h,i)=>{h.id='section-'+i;const link=el('a','',h.textContent);link.href='#'+h.id;link.onclick=e=>{e.preventDefault();h.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});h.tabIndex=-1;h.focus({preventScroll:true})};nav.append(link)});header.append(nav)}
 if(changed)window.scrollTo(0,0);else window.scrollTo(0,scroll);
 await Promise.all(context.jobs);if(id===generation)root.dataset.ready='true';
}
window.RemarqueHelp={show};
matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(lastArticle?.theme==='System')show(lastArticle)});
