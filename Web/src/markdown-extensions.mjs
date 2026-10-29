export function extendMarkdown(tree,source,parse){
 const offsetTree=(node,offset)=>{if(node.position){node.position.start.offset+=offset;node.position.end.offset+=offset;}for(const child of node.children||[])offsetTree(child,offset);return node};
 const pos=(start,end)=>({start:{offset:start},end:{offset:end}});
 const visit=parent=>{
  for(let i=0;i<(parent.children||[]).length;i++){
   let n=parent.children[i];const start=n.position?.start.offset,end=n.position?.end.offset,raw=source.slice(start,end);
   if(n.type==='paragraph'&&/^[^\n]+\r?\n:[ \t]+/.test(raw)){
    const first=raw.indexOf('\n'),termEnd=raw[first-1]==='\r'?first-1:first,children=[{type:'definitionTerm',children:parse(raw.slice(0,termEnd)).children[0]?.children||[],position:pos(start,start+termEnd)}];
    children[0].children.forEach(c=>offsetTree(c,start));
    const matches=[...raw.slice(first+1).matchAll(/(?:^|\n):[ \t]+/g)];
    for(let j=0;j<matches.length;j++){const from=first+1+matches[j].index+matches[j][0].length,to=j+1<matches.length?first+1+matches[j+1].index:raw.length;const blocks=parse(raw.slice(from,to)).children;blocks.forEach(c=>offsetTree(c,start+from));children.push({type:'definitionDescription',children:blocks,position:pos(start+from,start+to)})}
    parent.children[i]=n={type:'definitionList',children,position:n.position};
   }
   if(n.type==='html'&&/^<details(?:\s[^>]*)?>/i.test(raw.trimStart())){
    const remaining=source.slice(start),open=remaining.match(/^\s*<details(?:\s[^>]*)?>\s*(?:<summary>([\s\S]*?)<\/summary>)?/i),close=remaining.indexOf('</details>');
    if(open&&close>=0&&!remaining.slice(open[0].length,close).includes('<details')){
     const bodyStart=start+open[0].length,bodyEnd=start+close,last=bodyEnd+10,blocks=parse(source.slice(bodyStart,bodyEnd)).children;blocks.forEach(c=>offsetTree(c,bodyStart));
     let count=1;while(i+count<parent.children.length&&parent.children[i+count].position.start.offset<last)count++;
     n={type:'details',summary:(open[1]||'Details').replace(/<[^>]*>/g,''),children:blocks,position:pos(start,last)};parent.children.splice(i,count,n);
    }
   }
   if(n.children)visit(n);
  }
 };
 visit(tree);return tree;
}
