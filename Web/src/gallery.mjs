import {catalogue,themes,looks,layouts} from './catalogue.mjs';
import {diagram} from './renderers.mjs';
import DOMPurify from 'dompurify';
export function configuredCode(code,theme,look,layout){
  const config={theme,look};if(layout!=='dagre')config.layout=layout;
  return '---\nconfig:\n'+Object.entries(config).map(([k,v])=>`  ${k}: ${v}`).join('\n')+'\n---\n'+code;
}
export function showGallery({dialog,insertMarkdown}){
  const body=document.createElement('div');body.className='diagram-gallery';
  body.innerHTML='<p>33 diagram families · 41 starter templates · local rendering</p><div class="gallery-filters"><input type="search" placeholder="Search diagram types" aria-label="Search diagram types"><select aria-label="Category"></select><select aria-label="Theme"></select><select aria-label="Look"></select><select aria-label="Layout"></select></div><div class="gallery-content"><div class="gallery-list" role="list"></div><div class="gallery-detail"><h3></h3><p class="diagram-status"></p><div class="gallery-preview"></div><pre></pre><button class="primary">Insert diagram</button></div></div>';
  const search=body.querySelector('input'),[category,theme,look,layout]=body.querySelectorAll('select'),list=body.querySelector('.gallery-list');
  for(const [select,values] of [[category,['All categories',...new Set(catalogue.map(x=>x.category))]],[theme,themes],[look,looks],[layout,layouts]])for(const value of values)select.add(new Option(value,value));
  let selected=catalogue[0],generation=0;
  const code=()=>configuredCode(selected.code,theme.value,look.value,layout.value);
  const detail=async()=>{
    const current=++generation;body.querySelector('h3').textContent=selected.title;body.querySelector('pre').textContent=code();
    body.querySelector('.diagram-status').textContent=selected.family+(selected.experimental?' · Mermaid experimental syntax':'')+' · Edit as source';
    const preview=body.querySelector('.gallery-preview');preview.textContent='Rendering…';
    try{const svg=await diagram(code());if(current===generation)preview.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true,svgFilters:true},ADD_TAGS:['foreignObject']});}
    catch(e){if(current===generation)preview.textContent='This style/layout combination is unavailable: '+e.message;}
  };
  const filter=()=>{list.replaceChildren();for(const entry of catalogue.filter(x=>(category.value==='All categories'||x.category===category.value)&&`${x.family} ${x.title}`.toLowerCase().includes(search.value.toLowerCase()))){const button=document.createElement('button');button.type='button';button.setAttribute('role','listitem');button.innerHTML='<strong></strong><span></span>';button.querySelector('strong').textContent=entry.family;button.querySelector('span').textContent=entry.title;button.onclick=()=>{selected=entry;detail();};list.append(button);}};
  search.oninput=filter;category.onchange=filter;for(const select of [theme,look,layout])select.onchange=detail;
  const d=dialog('Mermaid diagram gallery',body);d.classList.add('wide');body.querySelector('.primary').onclick=()=>{insertMarkdown('```mermaid\n'+code()+'\n```');d.close();d.remove();};filter();detail();
}
