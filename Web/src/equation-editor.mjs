import palettes from './equation-palettes.json';
import {equation} from './renderers.mjs';
import DOMPurify from 'dompurify';
export function equationEditor({dialog,value='',display=true,onChange,onInsert}){
  const body=document.createElement('div');body.className='equation-editor';
  body.innerHTML='<div class="equation-mode"><label><input type="checkbox"> Display equation</label></div><nav aria-label="Equation palettes"></nav><div class="symbol-grid"></div><textarea aria-label="LaTeX source" spellcheck="false"></textarea><div class="equation-preview" aria-live="polite"></div><footer></footer>';
  const textarea=body.querySelector('textarea'),mode=body.querySelector('input'),preview=body.querySelector('.equation-preview');textarea.value=value;mode.checked=display;let generation=0;
  const update=async(emit=true)=>{const current=++generation;if(emit)onChange?.(textarea.value,mode.checked);if(!textarea.value.trim()){preview.textContent='Enter a LaTeX expression.';return}try{const svg=await equation(textarea.value,mode.checked);if(current===generation)preview.innerHTML=DOMPurify.sanitize(svg,{USE_PROFILES:{svg:true}});}catch(e){if(current===generation)preview.textContent=e.message;}};
  const choose=name=>{const grid=body.querySelector('.symbol-grid');grid.replaceChildren();for(const item of palettes[name]){const button=document.createElement('button');button.textContent=item.label;button.title=item.tex;button.setAttribute('aria-label',item.label+' '+item.tex);button.onclick=()=>{const start=textarea.selectionStart,end=textarea.selectionEnd,selected=textarea.value.slice(start,end);let text=item.tex;const slot=text.indexOf('{}');if(selected&&slot>=0)text=text.slice(0,slot+1)+selected+text.slice(slot+1);textarea.setRangeText(text,start,end,'end');if(slot>=0&&!selected)textarea.setSelectionRange(start+slot+1,start+slot+1);textarea.focus();update();};grid.append(button);}};
  for(const name of Object.keys(palettes)){const button=document.createElement('button');button.textContent=name;button.onclick=()=>choose(name);body.querySelector('nav').append(button);}
  const d=dialog(onChange?'LaTeX · Live Editor':'Insert Equation',body);const footer=body.querySelector('footer');
  const done=document.createElement('button');done.textContent=onChange?'Done':'Insert';done.className='primary';done.onclick=()=>{if(!textarea.value.trim())return;onInsert?.(textarea.value,mode.checked);d.close();d.remove();};footer.append(done);
  if(!onChange){const cancel=document.createElement('button');cancel.textContent='Cancel';cancel.onclick=()=>{d.close();d.remove();};footer.append(cancel);}
  textarea.oninput=()=>{done.disabled=!textarea.value.trim();update();};mode.onchange=()=>update();choose('Structures');done.disabled=!value.trim();update(false);textarea.focus();
}
