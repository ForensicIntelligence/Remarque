import {unzipSync,strFromU8} from 'fflate';
import {bytesBase64,base64Bytes} from './exporters.mjs';
import {parse} from './projection.mjs';
const direct=(n,name)=>[...(n?.children||[])].filter(c=>c.localName===name);
const first=(n,name)=>direct(n,name)[0];
const all=(n,name)=>[...n.getElementsByTagNameNS('*',name)];
const attr=(n,name)=>n?.getAttribute('w:'+name)||n?.getAttribute(name)||'';
const mdEscape=s=>s.replace(/([\\`*_[\]<>])/g,'\\$1');
function xml(bytes,name){if(!bytes)throw Error('Missing '+name);if(bytes.length>10*1024*1024)throw Error('XML part is too large');const doc=new DOMParser().parseFromString(strFromU8(bytes),'application/xml');if(doc.querySelector('parsererror'))throw Error('Invalid XML in '+name);return doc;}
export function importDocx(base64){
  const bytes=base64Bytes(base64);if(bytes.length>50*1024*1024)throw Error('This Word file exceeds the 50 MB import limit.');let total=0;
  const files=unzipSync(bytes,{filter:entry=>{total+=entry.originalSize;if(total>100*1024*1024||entry.originalSize>25*1024*1024)throw Error('Uncompressed document exceeds the import limit.');return !entry.name.startsWith('/')&&!entry.name.split('/').includes('..');}});
  const document=xml(files['word/document.xml'],'document.xml'),relationships=new Map(),warnings=[];
  if(files['word/_rels/document.xml.rels'])for(const rel of all(xml(files['word/_rels/document.xml.rels'],'relationships'),'Relationship'))relationships.set(rel.getAttribute('Id'),{target:rel.getAttribute('Target'),external:rel.getAttribute('TargetMode')==='External'});
  const styleMap=new Map();if(files['word/styles.xml'])for(const style of all(xml(files['word/styles.xml'],'styles'),'style'))styleMap.set(attr(style,'styleId'),attr(first(style,'name'),'val'));
  const abstract=new Map(),numbering=new Map();if(files['word/numbering.xml']){const nums=xml(files['word/numbering.xml'],'numbering');for(const item of all(nums,'abstractNum'))abstract.set(attr(item,'abstractNumId'),new Map(direct(item,'lvl').map(level=>[attr(level,'ilvl'),{format:attr(first(level,'numFmt'),'val'),start:attr(first(level,'start'),'val')||'1'}])));for(const item of all(nums,'num'))numbering.set(attr(item,'numId'),abstract.get(attr(first(item,'abstractNumId'),'val')));}
  const counters=new Map();
  function math(node){const children=[...node.children],inner=()=>children.map(math).join('');switch(node.localName){case 't':return node.textContent;case 'f':return '\\frac{'+math(first(node,'num'))+'}{'+math(first(node,'den'))+'}';case 'sSup':return math(first(node,'e'))+'^{'+math(first(node,'sup'))+'}';case 'sSub':return math(first(node,'e'))+'_{'+math(first(node,'sub'))+'}';case 'sSubSup':return math(first(node,'e'))+'_{'+math(first(node,'sub'))+'}^{'+math(first(node,'sup'))+'}';case 'rad':{const degree=first(node,'deg');return '\\sqrt'+(degree?.textContent?'['+math(degree)+']':'')+'{'+math(first(node,'e'))+'}';}case 'd':return '\\left('+direct(node,'e').map(math).join(',')+'\\right)';case 'm':return '\\begin{matrix}'+direct(node,'mr').map(row=>direct(row,'e').map(math).join(' & ')).join(' \\\\ ')+'\\end{matrix}';default:return node.localName.endsWith('Pr')?'':inner();}}
  function runs(node){let result='';for(const child of node.children){
    if(child.localName==='r'){
      let text='';for(const c of child.children){if(c.localName==='t')text+=mdEscape(c.textContent);else if(c.localName==='tab')text+='\t';else if(c.localName==='br')text+='  \n';else if(c.localName==='drawing'||c.localName==='pict'){
        const blip=all(c,'blip')[0],id=blip?.getAttribute('r:embed'),target=relationships.get(id)?.target;
        if(target&&!relationships.get(id)?.external){const path='word/'+target.replace(/^\.\//,'');const data=files[path];if(data){const extension=path.split('.').at(-1).toLowerCase(),mime=({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',svg:'image/svg+xml'})[extension];if(mime)text+='![Imported image](data:'+mime+';base64,'+bytesBase64(data)+')';else warnings.push('An unsupported '+extension+' image needs manual conversion.');}else warnings.push('A referenced Word image was missing.');}
      }}
      const pr=first(child,'rPr');if(pr){if(first(pr,'b')&&attr(first(pr,'b'),'val')!=='0')text='**'+text+'**';if(first(pr,'i')&&attr(first(pr,'i'),'val')!=='0')text='*'+text+'*';if(first(pr,'strike'))text='~~'+text+'~~';const vertical=attr(first(pr,'vertAlign'),'val');if(vertical==='superscript')text='^'+text+'^';if(vertical==='subscript')text='~'+text+'~';}
      result+=text;
    }else if(child.localName==='hyperlink'){const id=child.getAttribute('r:id'),link=relationships.get(id)?.target,anchor=attr(child,'anchor');result+='['+runs(child)+']('+(link||'#'+anchor)+')';}
    else if(child.localName==='oMath'||child.localName==='oMathPara'){result+=(child.localName==='oMathPara'?'\n$$\n':'$')+math(child)+(child.localName==='oMathPara'?'\n$$\n':'$');}
    else if(['sdt','sdtContent','ins'].includes(child.localName))result+=runs(child);
  }return result;}
  function paragraph(node){const pr=first(node,'pPr'),style=attr(first(pr||node,'pStyle'),'val'),styleName=styleMap.get(style)||style;let text=runs(node);const heading=(styleName||'').match(/heading\s*([1-6])/i);if(heading)return '#'.repeat(Number(heading[1]))+' '+text;
    const numPr=pr&&first(pr,'numPr');if(numPr){const level=attr(first(numPr,'ilvl'),'val')||'0',id=attr(first(numPr,'numId'),'val'),definition=numbering.get(id)?.get(level),key=id+':'+level;let marker='- ';if(definition?.format!=='bullet'){const count=counters.get(key)||Number(definition?.start||1);marker=count+'. ';counters.set(key,count+1);}text='  '.repeat(Math.min(8,Number(level)))+marker+text;}
    if(/quote/i.test(styleName))text='> '+text;return text;
  }
  function table(node){const rows=direct(node,'tr').map(row=>direct(row,'tc').map(cell=>direct(cell,'p').map(paragraph).join('<br>').replace(/(?<!\\)\|/g,'\\|')));const width=Math.max(...rows.map(r=>r.length));rows.forEach(r=>{while(r.length<width)r.push('')});if(!rows.length)return '';const lines=rows.map(r=>'| '+r.join(' | ')+' |');lines.splice(1,0,'| '+Array(width).fill('---').join(' | ')+' |');return lines.join('\n');}
  const body=all(document,'body')[0];if(!body)throw Error('The Word document has no body.');const blocks=[];for(const node of body.children){if(node.localName==='p')blocks.push(paragraph(node));else if(node.localName==='tbl')blocks.push(table(node));else if(node.localName!=='sectPr')warnings.push('A '+node.localName+' document block could not be converted automatically.');}
  return {text:blocks.join('\n\n')+'\n',warnings:[...new Set(warnings)]};
}
export function importMermaid(text){
  const blocks=[];const visit=node=>{if(node.type==='code'&&node.lang?.toLowerCase()==='mermaid')blocks.push(node.value);node.children?.forEach(visit);};visit(parse(text));
  return blocks.length?blocks:[text.trim()];
}
