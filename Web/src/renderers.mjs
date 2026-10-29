import mermaid from 'mermaid';
import zenuml from '@mermaid-js/mermaid-zenuml';
import tidyTree from '@mermaid-js/layout-tidy-tree';
import elk from '@mermaid-js/layout-elk';
mermaid.registerExternalDiagrams([zenuml]);
mermaid.registerLayoutLoaders(tidyTree);
mermaid.registerLayoutLoaders(elk);
let serial=Promise.resolve(),counter=0,cacheBytes=0;
const cache=new Map(),inflight=new Map();
function uniqueIDs(markup){
 const doc=new DOMParser().parseFromString(markup,'image/svg+xml'),prefix='remarque-copy-'+(++counter)+'-',ids=new Map();
 for(const el of doc.querySelectorAll('[id]')){ids.set(el.id,prefix+el.id);el.id=prefix+el.id;}
 for(const el of doc.querySelectorAll('*')){
  for(const attr of [...el.attributes]){if(attr.name==='id')continue;let value=attr.value;for(const [old,id]of ids){value=value.split('url(#'+old+')').join('url(#'+id+')');if(value==='#'+old)value='#'+id;if(['aria-labelledby','aria-describedby'].includes(attr.name))value=value.split(' ').map(v=>v===old?id:v).join(' ')}el.setAttribute(attr.name,value);}
  if(el.tagName==='style'){let text=el.textContent;for(const [old,id]of ids)text=text.replace(new RegExp('#'+old.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![\\w-])','g'),'#'+id);el.textContent=text;}
 }
 return new XMLSerializer().serializeToString(doc.documentElement);
}
export async function diagram(source,options={}){
 if(source.length>200000)throw Error('This diagram exceeds the 200,000-character rendering limit. Its source is preserved.');
 const key=(options.theme||'default')+'\0'+source;
 if(cache.has(key)){const value=cache.get(key);cache.delete(key);cache.set(key,value);return uniqueIDs(value);}
 if(inflight.has(key))return uniqueIDs(await inflight.get(key));
 const task=serial.then(async()=>{
  mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:options.theme||'default',look:'classic',flowchart:{htmlLabels:false},suppressErrorRendering:true,maxTextSize:200000,maxEdges:2000});
  const {svg}=await mermaid.render(`remarque-diagram-${++counter}`,source);cache.set(key,svg);cacheBytes+=svg.length*2;
  while(cache.size>96||cacheBytes>24*1024*1024){const oldest=cache.keys().next().value;cacheBytes-=cache.get(oldest).length*2;cache.delete(oldest);}return svg;
 });serial=task.catch(()=>{});inflight.set(key,task);
 try{return uniqueIDs(await task)}finally{inflight.delete(key)}
}
export async function equation(source,display){
 if(source.length>50000)throw Error('This equation exceeds the 50,000-character rendering limit. Its source is preserved.');
 await window.MathJax.startup.promise;
 const element=await window.MathJax.tex2svgPromise(source,{display});return uniqueIDs(element.innerHTML);
}
