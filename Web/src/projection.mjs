import {fromMarkdown} from 'mdast-util-from-markdown';
import {gfm} from 'micromark-extension-gfm';
import {gfmFromMarkdown} from 'mdast-util-gfm';
import {math} from 'micromark-extension-math';
import {mathFromMarkdown} from 'mdast-util-math';
import {frontmatter} from 'micromark-extension-frontmatter';
import {frontmatterFromMarkdown} from 'mdast-util-frontmatter';
import {decodeString} from 'micromark-util-decode-string';
import emoji from 'emoji-dictionary';
import {schema} from './schema.mjs';
import {extendMarkdown} from './markdown-extensions.mjs';

let nextIdentity = 1;
const baseParse = source => fromMarkdown(source, {extensions:[gfm(),math(),frontmatter(['yaml','toml'])], mdastExtensions:[gfmFromMarkdown(),mathFromMarkdown(),frontmatterFromMarkdown(['yaml','toml'])]});

export const parse=source=>extendMarkdown(baseParse(source),source,baseParse);

export function applyPatches(source, patches) {
  const sorted = [...patches].sort((a,b)=>a.range.start-b.range.start);
  for(let i=0;i<sorted.length;i++) {
    const p=sorted[i];
    if(p.range.start<0||p.range.end<p.range.start||p.range.end>source.length||(i&&sorted[i-1].range.end>p.range.start)) throw new Error('Invalid source patches');
    for(const n of [p.range.start,p.range.end]) if(n>0&&n<source.length&&/[\uDC00-\uDFFF]/.test(source[n])&&/[\uD800-\uDBFF]/.test(source[n-1])) throw new Error('Surrogate split');
  }
  for(const p of sorted.reverse()) source=source.slice(0,p.range.start)+p.text+source.slice(p.range.end);
  return source;
}
export function mapOffset(offset, patches, affinity=1) {
  let delta=0;
  for(const p of [...patches].sort((a,b)=>a.range.start-b.range.start)) {
    if(offset<p.range.start || (offset===p.range.start&&affinity<0)) break;
    if(offset<=p.range.end) return p.range.start+delta+(affinity>0?p.text.length:0);
    delta+=p.text.length-(p.range.end-p.range.start);
  }
  return offset+delta;
}
export function minimalPatch(old, value) {
  let start=0,end=old.length,newEnd=value.length;
  while(start<Math.min(end,newEnd)&&old[start]===value[start])start++;
  if(start>0&&/[\uDC00-\uDFFF]/.test(old[start]||''))start--;
  while(end>start&&newEnd>start&&old[end-1]===value[newEnd-1]){end--;newEnd--;}
  if(end<old.length&&/[\uDC00-\uDFFF]/.test(old[end])){end++;newEnd++;}
  return {range:{start,end},text:value.slice(start,newEnd)};
}

// Decode a raw text token while retaining every displayed UTF-16 boundary's source origin.
export function textBoundaries(raw, value, start) {
  let rendered='', bounds=[start], i=0;
  while(i<raw.length) {
    let consumed=1, text=raw[i];
    if(raw[i]==='\\'&&/[!"#$%&'()*+,\-./:;<=>?@[\]\\^_`{|}~]/.test(raw[i+1]||'')){consumed=2;text=raw[i+1];}
    else if(raw[i]==='&') {
      const match=raw.slice(i).match(/^&(?:#[0-9]+|#x[0-9a-f]+|[A-Za-z][A-Za-z0-9]+);/i);
      if(match){consumed=match[0].length;text=decodeString(match[0]);}
    } else if(raw[i]==='\r'){consumed=raw[i+1]==='\n'?2:1;text='\n';}
    rendered+=text;
    for(let j=1;j<=text.length;j++) bounds.push(start+i+(j===text.length?consumed:Math.min(j,consumed)));
    i+=consumed;
  }
  if(rendered===value)return bounds;
  // Container prefixes occur between lines in one mdast token. Match character boundaries
  // within that token only; never search another paragraph with identical displayed text.
  const out=[start];let at=0;
  for(let j=0;j<value.length;j++) {
    const match=rendered.indexOf(value[j],at);
    if(match>=0){out[j]=bounds[match];out.push(bounds[match+1]);at=match+1;}
    else out.push(out.at(-1));
  }
  return out;
}

function incrementalTree(source,previous,patches){
 if(!previous||patches.length!==1)return null;const patch=patches[0];
 if(/[\r\n]/.test(patch.text)||/[\r\n]/.test(previous.source.slice(patch.range.start,patch.range.end)))return null;
 const index=previous.tree.children.findIndex(n=>['paragraph','heading'].includes(n.type)&&patch.range.start>n.position.start.offset&&patch.range.end<=n.position.end.offset);if(index<0)return null;
 const owner=previous.tree.children[index],from=owner.position.start.offset,to=mapOffset(owner.position.end.offset,patches,1),raw=source.slice(from,to);
 // Reference links depend on definitions outside the block; use the full parser.
 if(/[\[\]]/.test(raw))return null;
 const fragment=parse(raw);if(fragment.children.length!==1||fragment.children[0].type!==owner.type)return null;
 const shift=(node,fn)=>{const copy={...node};if(node.position)copy.position={start:{...node.position.start,offset:fn(node.position.start.offset,-1)},end:{...node.position.end,offset:fn(node.position.end.offset,1)}};if(node.children)copy.children=node.children.map(n=>shift(n,fn));return copy;};
 return {...previous.tree,children:previous.tree.children.map((n,i)=>i===index?shift(fragment.children[0],v=>v+from):i<index?n:shift(n,(offset,affinity)=>mapOffset(offset,patches,affinity)))};
}
export function project(source, previous=null, patches=[]) {
  const tree=incrementalTree(source,previous,patches)||parse(source), records=new Map(), leaves=[], refs=new Map(), reuse=new Map();
  if(previous)for(const r of previous.records.values()) {
    const start=mapOffset(r.mdast?.position?.start.offset??r.start,patches,-1),end=mapOffset(r.mdast?.position?.end.offset??r.end,patches,1);
    reuse.set(`${r.kind}:${start}:${end}`,r.id);
  }
  for(const n of tree.children)if(n.type==='definition')refs.set(n.identifier,n);
  const record=(n,kind=n.type,extra={})=>{
    const start=n.position?.start.offset??0,end=n.position?.end.offset??start;
    const id=reuse.get(`${kind}:${start}:${end}`)||`s${nextIdentity++}`;
    records.set(id,{id,kind,start,end,raw:source.slice(start,end),mdast:n,...extra});return id;
  };
  const textNode=(n,marks=[],override=null)=>{
    const value=override??n.value;if(!value)return [];
    const id=record(n,'text');const r=records.get(id);r.value=value;r.boundaries=textBoundaries(r.raw,value,r.start);
    return [schema.text(value,[...marks,schema.marks.provenance.create({id})])];
  };
  const specialText=(n,marks)=>{
    const raw=source.slice(n.position.start.offset,n.position.end.offset);
    // Extended marks/wiki/emoji only split literal source text, never escaped text/code.
    if(raw!==n.value)return textNode(n,marks);
    const pattern=/\[\[([^\]\n]+)\]\]|==([^=\n]+)==|(?<!~)~([^~\s][^~\n]*?)~(?!~)|\^([^\^\n]+)\^|:([+\w-]+):/g;
    let cursor=0,out=[],m;
    const sub=(a,b,val)=>({type:'text',value:val??raw.slice(a,b),position:{start:{offset:n.position.start.offset+a},end:{offset:n.position.start.offset+b}}});
    while((m=pattern.exec(raw))){
      if(m.index>cursor)out.push(...textNode(sub(cursor,m.index),marks));
      if(m[1]){
        const [target,...alias]=m[1].split('|'),label=alias.join('|')||target;
        const labelStart=m.index+2+(alias.length?target.length+1:0);
        out.push(...textNode(sub(labelStart,labelStart+label.length,label),[...marks,schema.marks.link.create({href:`remarque-note:${encodeURIComponent(target)}`,wiki:true})]));
      }else if(m[2]||m[3]||m[4]){
        const type=m[2]?'highlight':m[3]?'sub':'sup',value=m[2]||m[3]||m[4],size=m[2]?2:1;
        out.push(...textNode(sub(m.index+size,m.index+size+value.length),[...marks,schema.marks[type].create()]));
      }else{
        const decoded=emoji.getUnicode(m[5]);
        if(decoded){const id=record(sub(m.index,m.index+m[0].length),'text');records.get(id).value=decoded;records.get(id).boundaries=[...Array(decoded.length+1)].map((_,i)=>n.position.start.offset+m.index+(i===decoded.length?m[0].length:0));out.push(schema.text(decoded,[...marks,schema.marks.provenance.create({id})]));}
        else out.push(...textNode(sub(m.index,m.index+m[0].length),marks));
      }
      cursor=m.index+m[0].length;
    }
    if(cursor<raw.length)out.push(...textNode(sub(cursor,raw.length),marks));
    return out;
  };
  const inline=(n,marks=[])=>{
    if(n.type==='text')return specialText(n,marks);
    const markType={strong:'strong',emphasis:'em',delete:'strike'}[n.type];
    if(markType)return n.children.flatMap(c=>inline(c,[...marks,schema.marks[markType].create()]));
    if(n.type==='inlineCode') {
      const id=record(n,'text'),r=records.get(id),tick=r.raw.match(/^`+/)?.[0].length||1;
      r.value=n.value;r.boundaries=textBoundaries(r.raw.slice(tick,-tick),n.value,r.start+tick);
      return [schema.text(n.value,[schema.marks.code.create(),schema.marks.provenance.create({id})])];
    }
    if(n.type==='link'||n.type==='linkReference'){
      const def=n.type==='linkReference'?refs.get(n.identifier):n;
      return (n.children||[]).flatMap(c=>inline(c,[...marks,schema.marks.link.create({href:def?.url||'#',title:def?.title||null})]));
    }
    if(n.type==='image'||n.type==='imageReference'){
      const def=n.type==='imageReference'?refs.get(n.identifier):n;
      return [schema.nodes.image.create({origin:record(n),src:def?.url||'',alt:n.alt||'',title:def?.title||''})];
    }
    if(n.type==='inlineMath'){
      const raw=source.slice(n.position.start.offset,n.position.end.offset);
      if(/^\$\d.*\s/.test(raw))return textNode({...n,type:'text',value:raw},marks);
      return [schema.nodes.inline_math.create({origin:record(n),value:n.value})];
    }
    if(n.type==='footnoteReference')return [schema.nodes.footnote_ref.create({origin:record(n),label:n.label||n.identifier})];
    if(n.type==='break')return [schema.nodes.hard_break.create({origin:record(n)})];
    return textNode({...n,value:source.slice(n.position.start.offset,n.position.end.offset)},marks);
  };
  const block=n=>{
    const id=record(n),attrs={origin:id},children=()=>n.children?.map(block).flat().filter(Boolean)||[];
    const textChildren=()=>{
      const result=n.children.flatMap(c=>inline(c));
      // CommonMark removes trailing horizontal whitespace from text tokens. It
      // still belongs to the editable paragraph: losing it moves the caret to
      // the next block on the very next keystroke.
      const last=n.children.at(-1)?.position?.end.offset??n.position.end.offset;
      const tail=source.slice(last,n.position.end.offset);
      if(/^[ \t]+$/.test(tail))result.push(...textNode({type:'text',value:tail,position:{start:{offset:last},end:{offset:n.position.end.offset}}}));
      return result;
    };
    switch(n.type){
      case 'paragraph':return schema.nodes.paragraph.create(attrs,textChildren());
      case 'heading':return schema.nodes.heading.create({...attrs,level:n.depth},textChildren());
      case 'blockquote':{
        const first=n.children[0]?.children?.[0],match=first?.type==='text'&&first.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|$)/i);
        if(!match)return schema.nodes.blockquote.create(attrs,children());
        const copy=structuredClone(n);copy.children[0].children[0].value=first.value.slice(match[0].length);copy.children[0].children[0].position.start.offset+=match[0].length;
        return schema.nodes.blockquote.create({...attrs,callout:match[1].toUpperCase()},copy.children.map(block));
      }
      case 'footnoteDefinition':return schema.nodes.footnote_definition.create({...attrs,label:n.label||n.identifier},children());
      case 'definitionList':return schema.nodes.definition_list.create(attrs,children());
      case 'definitionTerm':return schema.nodes.definition_term.create(attrs,textChildren());
      case 'definitionDescription':return schema.nodes.definition_description.create(attrs,children());
      case 'details':return schema.nodes.details.create({...attrs,summary:n.summary},children().length?children():schema.nodes.paragraph.create());
      case 'list':return schema.nodes[n.ordered?'ordered_list':'bullet_list'].create({...attrs,order:n.start||1},children());
      case 'listItem':return schema.nodes.list_item.create({...attrs,checked:n.checked??null},children());
      case 'thematicBreak':return schema.nodes.horizontal_rule.create(attrs);
      case 'code':
        if(n.lang?.toLowerCase()==='mermaid')return schema.nodes.mermaid.create({...attrs,value:n.value});
        return schema.nodes.code_block.create({...attrs,language:n.lang||''},n.value?schema.text(n.value):null);
      case 'math':return schema.nodes.math_display.create({...attrs,value:n.value});
      case 'table':return schema.nodes.table.create(attrs,n.children.map((row,i)=>schema.nodes.table_row.create({origin:record(row)},row.children.map((cell,j)=>schema.nodes[i===0?'table_header':'table_cell'].create({origin:record(cell),alignment:n.align[j]},schema.nodes.paragraph.create(null,cell.children.flatMap(c=>inline(c))))))));
      default:return schema.nodes.opaque.create({...attrs,raw:source.slice(n.position.start.offset,n.position.end.offset),kind:n.type});
    }
  };
  let nodes=tree.children.map(block);
  if(/^(?:\uFEFF)?(?:\r?\n){2}/.test(source)){
    const blank={type:'paragraph',children:[],position:{start:{offset:0},end:{offset:0}}};
    nodes.unshift(schema.nodes.paragraph.create({origin:record(blank)}));
  }
  if(/\n[ \t\r]*\n$/.test(source)){
    const blank={type:'paragraph',children:[],position:{start:{offset:source.length},end:{offset:source.length}}};
    nodes.push(schema.nodes.paragraph.create({origin:record(blank)}));
  }
  // Recognized placement comments are owned by the following object, not editable prose.
  for(let i=0;i<nodes.length-1;i++){
    const metadataKind=nodes[i].type.name==='opaque'&&nodes[i].attrs.raw.match(/^<!--\s*(?:remarque|remarkable):(mermaid|table)\b/)?.[1];
    if(metadataKind&&nodes[i+1].type.name===metadataKind){
      const comment=nodes[i],diagram=nodes[i+1],r=records.get(diagram.attrs.origin),c=records.get(comment.attrs.origin);
      r.metadata=comment.attrs.raw;r.start=c.start;r.raw=source.slice(r.start,r.end);
      const old=previous&&[...previous.records.values()].find(pr=>pr.pmNode?.type.name===metadataKind&&mapOffset(pr.start,patches,-1)===r.start&&mapOffset(pr.end,patches,1)===r.end);
      if(old&&old.id!==r.id){records.delete(r.id);r.id=old.id;records.set(r.id,r);}
      nodes[i+1]=diagram.type.create({...diagram.attrs,origin:r.id,metadata:comment.attrs.raw,...(metadataKind==='table'?{placement:comment.attrs.raw.match(/align="(left|center|right)"/)?.[1]||null}:{})},diagram.content);nodes.splice(i,1);i--;
    }
  }
  const doc=schema.nodes.doc.create(null,nodes.length?nodes:[schema.nodes.paragraph.create()]);
  doc.descendants((node,pos)=>{
    const id=node.isText?node.marks.find(m=>m.type.name==='provenance')?.attrs.id:node.attrs.origin;
    const r=records.get(id);
    if(r){r.pmStart=pos;r.pmEnd=pos+node.nodeSize;r.pmNode=node;if(node.isText)leaves.push(r);}
  });
  const sourceAt=(position,affinity=1)=>{
    const leaf=leaves.find(r=>position>r.pmStart&&position<r.pmEnd)||leaves.find(r=>affinity>0?position===r.pmStart:position===r.pmEnd)||leaves.find(r=>position>=r.pmStart&&position<=r.pmEnd);
    if(leaf)return leaf.boundaries[Math.max(0,Math.min(leaf.boundaries.length-1,position-leaf.pmStart))];
    const owner=[...records.values()].filter(r=>r.pmStart!==undefined&&position>=r.pmStart&&position<=r.pmEnd).sort((a,b)=>(a.pmEnd-a.pmStart)-(b.pmEnd-b.pmStart))[0];
    if(owner){
      if(owner.kind==='code'){const contentStart=owner.start+owner.raw.indexOf('\n')+1;return Math.min(owner.end,contentStart+Math.max(0,position-owner.pmStart-1));}
      return affinity>0?owner.start:owner.end;
    }
    return position<=0?0:source.length;
  };
  const positionAt=offset=>{
    const leaf=leaves.find(r=>offset>=r.boundaries[0]&&offset<=r.boundaries.at(-1));
    if(leaf){let i=leaf.boundaries.findIndex(n=>n>=offset);return leaf.pmStart+(i<0?leaf.boundaries.length-1:i);}
    const owner=[...records.values()].filter(r=>r.pmStart!==undefined&&offset>=r.start&&offset<=r.end).sort((a,b)=>(a.end-a.start)-(b.end-b.start))[0];
    return owner?Math.min(doc.content.size,owner.pmStart+(owner.pmNode.isTextblock?1:0)):Math.min(doc.content.size,Math.max(0,offset));
  };
  const outline=tree.children.filter(n=>n.type==='heading'||n.type==='code'&&n.lang==='mermaid').map(n=>({title:n.type==='heading'?n.children.map(c=>c.value||c.children?.map(x=>x.value||'').join('')||'').join(''):n.value.split('\n')[0],level:n.depth||0,start:n.position.start.offset,end:n.position.end.offset,kind:n.type==='heading'?'heading':'diagram'}));
  return {source,tree,doc,records,leaves,sourceAt,positionAt,outline};
}

const escaped=s=>s.replace(/([\\`*_[\]<>~^])/g,'\\$1');
export function serializeInline(node) {
  if(node.isText){
    let value=node.text;
    const marks=node.marks.filter(m=>m.type.name!=='provenance');
    if(marks.some(m=>m.type.name==='code')){const n=Math.max(1,...(value.match(/`+/g)||[]).map(x=>x.length+1));return '`'.repeat(n)+value+'`'.repeat(n);}
    value=escaped(value);
    for(const m of [...marks].reverse()){
      const wrap={strong:'**',em:'*',strike:'~~',highlight:'==',sup:'^',sub:'~'}[m.type.name];
      if(wrap)value=wrap+value+wrap;
      if(m.type.name==='link')value=m.attrs.wiki?`[[${decodeURIComponent(m.attrs.href.replace('remarque-note:',''))}|${value}]]`:`[${value}](${m.attrs.href}${m.attrs.title?' "'+m.attrs.title.replace(/"/g,'\\"')+'"':''})`;
    }
    return value;
  }
  if(node.type.name==='image')return `![${node.attrs.alt.replace(/\]/g,'\\]')}](${node.attrs.src}${node.attrs.title?' "'+node.attrs.title+'"':''})`;
  if(node.type.name==='inline_math')return `$${node.attrs.value}$`;
  if(node.type.name==='footnote_ref')return `[^${node.attrs.label}]`;
  if(node.type.name==='hard_break')return '  \n';
  return '';
}
export function serialize(node) {
  const content=[];node.forEach(n=>content.push(n));
  switch(node.type.name){
    case 'doc':return content.map(serialize).join('\n\n');
    case 'paragraph':return content.map(serializeInline).join('');
    case 'heading':return '#'.repeat(node.attrs.level)+' '+content.map(serializeInline).join('');
    case 'blockquote':return (node.attrs.callout?'> [!'+node.attrs.callout+']\n':'')+content.map(serialize).join('\n\n').split('\n').map(l=>'> '+l).join('\n');
    case 'footnote_definition':return '[^'+node.attrs.label+']: '+content.map(serialize).join('\n\n').replace(/\n/g,'\n    ');
    case 'definition_list':return content.map(serialize).join('\n');
    case 'definition_term':return content.map(serializeInline).join('');
    case 'definition_description':return ': '+content.map(serialize).join('\n\n').replace(/\n/g,'\n  ');
    case 'details':return '<details>\n<summary>'+node.attrs.summary.replace(/[<>]/g,'')+'</summary>\n\n'+content.map(serialize).join('\n\n')+'\n\n</details>';
    case 'bullet_list':case 'ordered_list':return content.map((n,i)=>{let body=serialize(n),prefix=node.type.name==='ordered_list'?`${node.attrs.order+i}. `:'- ';if(n.attrs.checked!==null)prefix+=n.attrs.checked?'[x] ':'[ ] ';const lines=body.split('\n');return prefix+lines[0]+(lines.length>1?'\n'+lines.slice(1).map(l=>' '.repeat(prefix.length)+l).join('\n'):'');}).join('\n');
    case 'list_item':return content.map(serialize).join('\n\n');
    case 'horizontal_rule':return '---';
    case 'code_block':{const value=node.textContent,n=Math.max(3,...(value.match(/`+/g)||[]).map(x=>x.length+1)),f='`'.repeat(n);return `${f}${node.attrs.language}\n${value}\n${f}`;}
    case 'math_display':return `$$\n${node.attrs.value}\n$$`;
    case 'mermaid':return `${node.attrs.metadata?node.attrs.metadata+'\n':''}\`\`\`mermaid\n${node.attrs.value}\n\`\`\``;
    case 'opaque':return node.attrs.raw;
    case 'table':{const rows=content.map(r=>{const cells=[];r.forEach(c=>cells.push(serialize(c).replace(/(?<!\\)\|/g,'\\|').replace(/\n+/g,'<br>')));return '| '+cells.join(' | ')+' |';});const alignment=[];content[0]?.forEach(c=>alignment.push(({left:':---',center:':---:',right:'---:'})[c.attrs.alignment]||'---'));return (node.attrs.metadata?node.attrs.metadata+'\n\n':'')+[rows[0],'| '+alignment.join(' | ')+' |',...rows.slice(1)].join('\n');}
    case 'table_cell':case 'table_header':return content.map(serialize).join('\n');
    default:return node.textContent;
  }
}

/** Prefer literal leaf patches. Structural edits reserialize only changed top-level owners. */
export function transactionPatches(projection, transaction) {
  if(!transaction.docChanged)return [];
  const step=transaction.steps.length===1?transaction.steps[0].toJSON():null;
  if(step?.stepType==='replace'&&!(step.slice?.openStart||step.slice?.openEnd)){
    const a=projection.leaves.find(r=>step.from>=r.pmStart&&step.to<=r.pmEnd);
    const contents=step.slice?.content||[];
    if(a&&contents.every(n=>n.type==='text')){
      const text=contents.map(n=>n.text||'').join('');
      const isCode=a.pmNode.marks.some(m=>m.type.name==='code');
      return [{range:{start:a.boundaries[step.from-a.pmStart],end:a.boundaries[step.to-a.pmStart]},text:isCode?text:escaped(text)}];
    }
  }
  const before=[],after=[];
  projection.doc.forEach(n=>before.push(n));transaction.doc.forEach(n=>after.push(n));
  let left=0,right=0;
  while(left<Math.min(before.length,after.length)&&before[left].eq(after[left]))left++;
  while(right<before.length-left&&right<after.length-left&&before[before.length-1-right].eq(after[after.length-1-right]))right++;
  const old=before.slice(left,before.length-right),changed=after.slice(left,after.length-right);
  const first=old[0]&&projection.records.get(old[0].attrs.origin),last=old.at(-1)&&projection.records.get(old.at(-1).attrs.origin);
  let start=first?.start??(left?projection.records.get(before[left-1]?.attrs.origin)?.end??0:0),end=last?.end??start;
  let text=changed.map(serialize).join('\n\n');
  if(!old.length){if(start>0)text='\n\n'+text;else if(projection.source.length)text+='\n\n';}
  const newline=projection.source.includes('\r\n')?'\r\n':'\n';text=text.replace(/\n/g,newline);
  return [{range:{start,end},text}];
}
