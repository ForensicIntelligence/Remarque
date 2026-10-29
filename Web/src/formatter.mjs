import {parse,applyPatches} from './projection.mjs';
export function formatMarkdown(source){
 const tree=parse(source),patches=[],newline=source.includes('\r\n')?'\r\n':'\n';
 function visit(node){
  if(node.type==='list')node.children.forEach((item,index)=>{const start=item.position.start.offset,raw=source.slice(start,item.position.end.offset),marker=raw.match(/^(?:[-+*]|\d+[.)])[ \t]+/);if(marker){const value=node.ordered?String((node.start||1)+index)+'. ':'- ';if(value!==marker[0])patches.push({range:{start,end:start+marker[0].length},text:value});}});
  for(const child of node.children||[])visit(child);
 }
 visit(tree);
 for(const table of tree.children.filter(n=>n.type==='table')){
  const rows=table.children.map(row=>row.children.map(c=>c.children.length?source.slice(c.children[0].position.start.offset,c.children.at(-1).position.end.offset):''));
  const columns=Math.max(...rows.map(r=>r.length)),widths=Array.from({length:columns},(_,i)=>Math.max(3,...rows.map(r=>(r[i]||'').length)));
  const row=cells=>'| '+widths.map((w,i)=>(cells[i]||'').padEnd(w,' ')).join(' | ')+' |';
  const alignment=widths.map((w,i)=>{const align=table.align[i];return (align==='left'||align==='center'?':':'')+'-'.repeat(Math.max(3,w-(align==='center'?2:align?1:0)))+(align==='right'||align==='center'?':':'')});
  const formatted=[row(rows[0]),row(alignment),...rows.slice(1).map(row)].join(newline),start=table.position.start.offset,end=table.position.end.offset;
  if(formatted!==source.slice(start,end))patches.push({range:{start,end},text:formatted});
 }
 return applyPatches(source,patches);
}
