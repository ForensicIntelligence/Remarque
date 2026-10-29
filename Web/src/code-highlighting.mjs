import {Plugin} from 'prosemirror-state';
import {Decoration,DecorationSet} from 'prosemirror-view';
import hljs from 'highlight.js/lib/common';
const cache=new Map();
export const codeHighlighting=enabled=>new Plugin({props:{decorations(state){
 if(!enabled())return DecorationSet.empty;const decorations=[];
 state.doc.descendants((node,pos)=>{if(node.type.name!=='code_block'||!node.textContent||node.textContent.length>100000)return;
  const key=node.attrs.language+'\0'+node.textContent;let spans=cache.get(key);
  if(!spans){spans=[];const language=node.attrs.language;if(!hljs.getLanguage(language))return;const html=hljs.highlight(node.textContent,{language,ignoreIllegals:true}).value,container=document.createElement('div');container.innerHTML=html;let offset=0;
   const visit=(n,classes=[])=>{if(n.nodeType===3){const start=offset;offset+=n.textContent.length;if(classes.length&&offset>start)spans.push({from:start,to:offset,class:classes.join(' ')})}else for(const c of n.childNodes)visit(c,[...classes,...(n.classList||[])])};visit(container);cache.set(key,spans);if(cache.size>128)cache.delete(cache.keys().next().value);
  }
  for(const span of spans)decorations.push(Decoration.inline(pos+1+span.from,pos+1+span.to,{class:span.class}));
 });return DecorationSet.create(state.doc,decorations);
}}});
