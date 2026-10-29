import {zipSync,strToU8} from 'fflate';
import {Document,Packer,Paragraph,TextRun,ImageRun,Table,TableRow,TableCell,HeadingLevel,WidthType,ExternalHyperlink,Footer,PageNumber,TableOfContents,AlignmentType,LevelFormat,FootnoteReferenceRun} from 'docx';
import DOMPurify from 'dompurify';
import {serialize} from './projection.mjs';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
export const bytesBase64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
export const base64Bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
export const printCSS=`*{box-sizing:border-box}body{font:12pt/1.55 -apple-system,Arial,sans-serif;color:#20242a;background:white;max-width:900px;margin:32px auto;padding:0 24px}h1,h2,h3{line-height:1.2;break-after:avoid}h1{font-size:26pt}h2{font-size:20pt}h3{font-size:15pt}p{orphans:3;widows:3}pre{white-space:pre-wrap;font:10pt/1.5 monospace;background:#f4f6f8;padding:12px;border:1px solid #dde1e6}code{font-family:monospace}table{border-collapse:collapse;width:100%;margin:16px 0}td,th{border:1px solid #c4cbd4;padding:7px;text-align:left}th{background:#edf1f5}blockquote{border-left:3px solid #5596c4;margin:16px 0;padding:4px 18px;color:#536170}a{color:#1664ae}img,svg{max-width:100%;height:auto}.mermaid,.math_display{text-align:center;break-inside:avoid;margin:20px 0}.inline_math{display:inline-block;vertical-align:middle}.inline_math svg{max-width:none}mark{background:#fff08a}.title-page{break-after:page;text-align:center;padding-top:30vh}.toc{break-after:page}.source-appendix{break-before:page}.task-item{list-style:none}.task-item[data-checked=true]:before{content:'☑ '}.task-item[data-checked=false]:before{content:'☐ '}@media print{body{margin:0;padding:0;max-width:none}a{color:inherit}thead{display:table-header-group}tr{break-inside:avoid}}`;
async function ready(view){for(let i=0;i<150;i++){if(!view.dom.querySelector('.pending'))return;await new Promise(r=>setTimeout(r,100));}throw Error('Rendering has not finished. Resolve diagram errors or try the export again.');}
function clean(view,preferences){
  const clone=view.dom.cloneNode(true);clone.removeAttribute('contenteditable');clone.removeAttribute('class');
  clone.querySelectorAll('.diagram-controls,.diagram-resize,.diagram-source').forEach(n=>n.remove());
  clone.querySelectorAll('.opaque').forEach(n=>{if(['yaml','toml'].includes(n.dataset.kind)&&preferences.includeFrontMatter){const pre=document.createElement('pre');pre.textContent=n.textContent;n.replaceWith(pre);}else if(['yaml','toml','definition'].includes(n.dataset.kind))n.remove();else{const pre=document.createElement('pre');pre.textContent=n.querySelector('pre')?.textContent||n.textContent;n.replaceWith(pre);}});
  clone.querySelectorAll('[data-origin]').forEach(n=>{n.replaceWith(...n.childNodes);});
  clone.querySelectorAll('*').forEach(n=>{for(const name of ['contenteditable','tabindex','spellcheck','data-testid','data-source'])n.removeAttribute(name);n.classList.remove('selected','ProseMirror-selectednode');});
  const ids=new Map();clone.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(h=>{let slug=h.textContent.toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'section';const count=ids.get(slug)||0;ids.set(slug,count+1);h.id=slug+(count?'-'+count:'');});
  clone.querySelectorAll('svg').forEach(svg=>{svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.removeAttribute('height');});
  return clone;
}
function htmlShell(title,body,css=printCSS){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="generator" content="Remarque 3"><title>'+escape(title)+'</title><style>'+css+'</style></head><body>'+body+'</body></html>';}
export async function png(svg){
  const data=new XMLSerializer().serializeToString(svg),image=new Image();const box=svg.viewBox?.baseVal;
  const width=Math.max(1,Math.min(1800,Math.ceil(box?.width||svg.getBoundingClientRect().width||720))),height=Math.max(1,Math.min(2400,Math.ceil(box?.height||svg.getBoundingClientRect().height||420)));
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Could not convert SVG to PNG'));image.src='data:image/svg+xml;base64,'+bytesBase64(new TextEncoder().encode(data));});
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return {data:base64Bytes(canvas.toDataURL('image/png').split(',')[1]),width,height};
}
async function graphics(projection,view){
  const map=new Map(),jobs=[];projection.doc.descendants((node,pos)=>{if(!['mermaid','math_display','inline_math','image'].includes(node.type.name))return;const dom=view.nodeDOM(pos);jobs.push((async()=>{try{if(node.type.name==='image'){const src=dom?.src;if(src?.startsWith('data:image/')){const mime=src.slice(5,src.indexOf(';'));if(mime==='image/svg+xml'){const svg=new DOMParser().parseFromString(new TextDecoder().decode(base64Bytes(src.split(',')[1])),'image/svg+xml').documentElement;map.set(node.attrs.origin,await png(svg));}else map.set(node.attrs.origin,{data:base64Bytes(src.split(',')[1]),width:Math.min(620,dom.naturalWidth||300),height:Math.min(620,dom.naturalWidth||300)*(dom.naturalHeight||200)/(dom.naturalWidth||300),type:mime==='image/jpeg'?'jpg':'png'});}}else{const svg=dom?.querySelector('svg');if(svg)map.set(node.attrs.origin,await png(svg));}}catch(error){map.set(node.attrs.origin,{error:error.message});}})());});await Promise.all(jobs);return map;
}
function docxChildren(node,images,options,depth=0){
  const inline=(n,style={})=>{
    if(n.isText){const attrs={text:n.text,...style};for(const m of n.marks){Object.assign(attrs,({strong:{bold:true},em:{italics:true},strike:{strike:true},highlight:{highlight:'yellow'},code:{font:'Menlo'},sup:{superScript:true},sub:{subScript:true}})[m.type.name]||{});}
      const link=n.marks.find(m=>m.type.name==='link');return link&&!link.attrs.wiki?new ExternalHyperlink({link:link.attrs.href,children:[new TextRun({...attrs,style:'Hyperlink'})]}):new TextRun(attrs);
    }
    if(n.type.name==='hard_break')return new TextRun({break:1});
    if(n.type.name==='footnote_ref'&&options.footnoteIDs?.[n.attrs.label])return new FootnoteReferenceRun(options.footnoteIDs[n.attrs.label]);
    const graphic=images.get(n.attrs.origin);
    if(graphic?.data){const scale=Math.min(1,600/graphic.width);return new ImageRun({type:graphic.type||'png',data:graphic.data,transformation:{width:graphic.width*scale,height:graphic.height*scale},altText:{title:n.attrs.alt||n.type.name,description:n.attrs.value||n.attrs.alt||'',name:'Graphic'}});}
    return new TextRun(n.attrs.label?'['+n.attrs.label+']':n.attrs.value||n.attrs.alt||'');
  };
  const children=[];node.forEach(n=>children.push(n));
  const runs=n=>{const out=[];n.forEach(c=>out.push(inline(c)));return out;};
  switch(node.type.name){
    case 'doc':return children.flatMap(n=>docxChildren(n,images,options,depth));
    case 'paragraph':return [new Paragraph({children:runs(node),spacing:{after:160},...options.paragraph})];
    case 'heading':return [new Paragraph({heading:HeadingLevel['HEADING_'+node.attrs.level],children:runs(node),spacing:{before:260,after:150}})];
    case 'blockquote':return children.flatMap(n=>docxChildren(n,images,{...options,paragraph:{indent:{left:480},...options.paragraph}},depth));
    case 'bullet_list':case 'ordered_list':return children.flatMap(item=>{const blocks=[];item.forEach((n,_offset,i)=>blocks.push(...docxChildren(n,images,{...options,paragraph:i===0?(node.type.name==='bullet_list'?{bullet:{level:Math.min(8,depth)}}:{numbering:{reference:'decimal',level:Math.min(8,depth)}}):{indent:{left:720*(depth+1)}}},depth+1)));return blocks;});
    case 'list_item':return children.flatMap(n=>docxChildren(n,images,options,depth));
    case 'code_block':return node.textContent.split('\n').map(line=>new Paragraph({children:[new TextRun({text:line,font:'Menlo',size:19})],spacing:{after:0},shading:{fill:'F3F5F7'}}));
    case 'horizontal_rule':return [new Paragraph({border:{bottom:{color:'A0A8B2',style:'single',size:6}}})];
    case 'mermaid':case 'math_display':{const blocks=[new Paragraph({children:[inline(node)],alignment:AlignmentType.CENTER})];if(node.type.name==='mermaid'&&options.docxMermaidSource)blocks.push(new Paragraph({children:[new TextRun({text:node.attrs.value,font:'Menlo',size:18})]}));return blocks;}
    case 'table':return [new Table({width:{size:100,type:WidthType.PERCENTAGE},rows:children.map((row,i)=>{const cells=[];row.forEach(cell=>cells.push(new TableCell({children:docxChildren(cell,images,options,depth),shading:i===0?{fill:'EDF1F5'}:undefined})));return new TableRow({children:cells,tableHeader:i===0});})})];
    case 'table_cell':case 'table_header':return children.flatMap(n=>docxChildren(n,images,{...options,paragraph:{alignment:({left:AlignmentType.LEFT,center:AlignmentType.CENTER,right:AlignmentType.RIGHT})[node.attrs.alignment]}},depth));
    case 'footnote_definition':return [];
    case 'definition_list':case 'definition_description':return children.flatMap(n=>docxChildren(n,images,options,depth));
    case 'definition_term':return [new Paragraph({children:runs(node),keepNext:true})];
    case 'details':return [new Paragraph({text:node.attrs.summary,heading:HeadingLevel.HEADING_4}),...children.flatMap(n=>docxChildren(n,images,options,depth))];
    case 'opaque':if(!['yaml','toml','definition'].includes(node.attrs.kind))return [new Paragraph(node.attrs.raw)];return options.includeFrontMatter&&['yaml','toml'].includes(node.attrs.kind)?[new Paragraph({children:[new TextRun({text:node.attrs.raw,font:'Menlo'})]})]:[];
    default:return [new Paragraph(node.textContent)];
  }
}
const texEscape=s=>s.replace(/[\\{}$%&#_^~]/g,c=>({'\\':'\\textbackslash{}','{':'\\{','}':'\\}','$':'\\$','%':'\\%','&':'\\&','#':'\\#','_':'\\_','^':'\\textasciicircum{}','~':'\\textasciitilde{}'})[c]);
function latex(node,assets=new Map()){const children=[];node.forEach(n=>children.push(n));const content=()=>children.map(n=>latex(n,assets)).join('');if(node.isText){let text=texEscape(node.text);for(const mark of node.marks){const cmd=({strong:'textbf',em:'emph',strike:'sout',highlight:'hl',code:'texttt',sup:'textsuperscript',sub:'textsubscript'})[mark.type.name];if(cmd)text='\\'+cmd+'{'+text+'}';if(mark.type.name==='link')text='\\href{'+texEscape(mark.attrs.href)+'}{'+text+'}';}return text;}
 switch(node.type.name){case 'doc':return content();case 'paragraph':return content()+'\n\n';case 'heading':return '\\'+['section','subsection','subsubsection','paragraph','subparagraph','subparagraph'][node.attrs.level-1]+'{'+content()+'}\n';case 'inline_math':return '$'+node.attrs.value+'$';case 'math_display':return '\\[\n'+node.attrs.value+'\n\\]\n';case 'code_block':return '\\begin{verbatim}\n'+node.textContent+'\n\\end{verbatim}\n';case 'mermaid':return assets.has(node.attrs.origin)?'\\begin{center}\\includegraphics[width=\\linewidth,keepaspectratio]{'+assets.get(node.attrs.origin)+'}\\end{center}\n':'\\begin{verbatim}\n'+node.attrs.value+'\n\\end{verbatim}\n';case 'blockquote':return '\\begin{quote}\n'+content()+'\\end{quote}\n';case 'bullet_list':case 'ordered_list':{const kind=node.type.name==='bullet_list'?'itemize':'enumerate';return '\\begin{'+kind+'}\n'+content()+'\\end{'+kind+'}\n';}case 'list_item':return '\\item '+content();case 'horizontal_rule':return '\\noindent\\rule{\\linewidth}{0.4pt}\n';case 'hard_break':return '\\\\\n';case 'image':return assets.has(node.attrs.origin)?'\\includegraphics[width=0.8\\linewidth,keepaspectratio]{'+assets.get(node.attrs.origin)+'}':'\\textit{'+texEscape(node.attrs.alt||'Image')+'}';case 'table':return '\\begin{longtable}{'+Array(children[0]?.childCount||1).fill('l').join('')+'}\n'+children.map(row=>{const cells=[];row.forEach(c=>cells.push(latex(c,assets).trim()));return cells.join(' & ')+' \\\\';}).join('\n')+'\n\\end{longtable}\n';case 'table_cell':case 'table_header':return content();case 'footnote_ref':return '\\textsuperscript{'+texEscape(node.attrs.label)+'}';case 'footnote_definition':return '\\par\\textsuperscript{'+texEscape(node.attrs.label)+'} '+content();case 'details':return '\\paragraph{'+texEscape(node.attrs.summary)+'}'+content();case 'definition_list':return '\\begin{description}\n'+content()+'\\end{description}\n';case 'definition_term':return '\\item['+content()+'] ';case 'definition_description':return content();case 'opaque':return ['yaml','toml','definition'].includes(node.attrs.kind)?'':'\\begin{verbatim}\n'+node.attrs.raw+'\n\\end{verbatim}\n';default:return content();}}
function epub(title,clone){
  const files={},assets=[];let index=0;
  clone.querySelectorAll('img').forEach(img=>{const src=img.getAttribute('src')||'';if(!src.startsWith('data:image/'))return;const mime=src.slice(5,src.indexOf(';')),ext=({'image/svg+xml':'svg','image/jpeg':'jpg','image/gif':'gif','image/webp':'webp'})[mime]||'png',path='assets/image-'+(++index)+'.'+ext;files['OEBPS/'+path]=base64Bytes(src.split(',')[1]);img.setAttribute('src',path);assets.push({path,mime});});
  files['mimetype']=[strToU8('application/epub+zip'),{level:0}];
  const ordered={mimetype:files.mimetype};delete files.mimetype;
  ordered['META-INF/container.xml']=strToU8('<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const body=new XMLSerializer().serializeToString(clone);
  ordered['OEBPS/chapter.xhtml']=strToU8('<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml" lang="en"><head><title>'+escape(title)+'</title><link rel="stylesheet" href="style.css"/></head><body>'+body+'</body></html>');
  ordered['OEBPS/style.css']=strToU8(printCSS);
  ordered['OEBPS/nav.xhtml']=strToU8('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><head><title>Contents</title></head><body><nav epub:type="toc"><h1>Contents</h1><ol>'+[...clone.querySelectorAll('h1,h2,h3')].map(h=>'<li><a href="chapter.xhtml#'+escape(h.id)+'">'+escape(h.textContent)+'</a></li>').join('')+'</ol></nav></body></html>');
  ordered['OEBPS/content.opf']=strToU8('<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" unique-identifier="book-id" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:'+crypto.randomUUID()+'</dc:identifier><dc:title>'+escape(title)+'</dc:title><dc:language>en</dc:language><meta property="dcterms:modified">'+new Date().toISOString().replace(/\.\d+Z$/,'Z')+'</meta></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml" properties="svg"/><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="style.css" media-type="text/css"/>'+assets.map((a,i)=>'<item id="img'+i+'" href="'+a.path+'" media-type="'+a.mime+'"/>').join('')+'</manifest><spine><itemref idref="chapter"/></spine></package>');
  return zipSync({...ordered,...files});
}
export async function exportDocument({format,source,projection,view,preferences={}}){
  await ready(view);const clone=clean(view,preferences),title=clone.querySelector('h1')?.textContent||'Document',warnings=[];
  if(preferences.htmlMermaidSource)clone.querySelectorAll('.mermaid').forEach((n,i)=>{const blocks=[];projection.doc.descendants(node=>{if(node.type.name==='mermaid')blocks.push(node.attrs.value)});const pre=document.createElement('pre');pre.textContent=blocks[i];n.append(pre);});
  if(preferences.titlePage){const titlePage=document.createElement('section');titlePage.className='title-page';titlePage.innerHTML='<h1>'+escape(title)+'</h1>';clone.prepend(titlePage);}
  if(preferences.toc){const toc=document.createElement('nav');toc.className='toc';toc.innerHTML='<h2>Contents</h2><ol>'+[...clone.querySelectorAll('h1[id],h2[id],h3[id]')].map(h=>'<li><a href="#'+escape(h.id)+'">'+escape(h.textContent)+'</a></li>').join('')+'</ol>';clone.prepend(toc);}
  if(format==='RTF'){for(const svg of [...clone.querySelectorAll('svg')]){try{const image=await png(svg),img=document.createElement('img');img.src='data:image/png;base64,'+bytesBase64(image.data);img.width=Math.round(Math.min(image.width,620));img.height=Math.round(image.height*Math.min(1,620/image.width));svg.replaceWith(img)}catch(e){warnings.push(e.message)}}}
  if(format==='HTML'||format==='PDF'||format==='RTF'||format.startsWith('print')){if(format==='printCombined'){const appendix=document.createElement('section');appendix.className='source-appendix';appendix.innerHTML='<h1>Markdown source</h1><pre></pre>';appendix.querySelector('pre').textContent=source;clone.append(appendix);}return {format,extension:format==='HTML'?'html':format.toLowerCase(),text:htmlShell(title,clone.innerHTML),title,warnings};}
  if(format==='LaTeX'){
    const images=await graphics(projection,view),assets={},paths=new Map();let i=0;
    const folder='remarque-assets-'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source)))).slice(0,6).map(v=>v.toString(16).padStart(2,'0')).join('');
    projection.doc.descendants(node=>{if(!['mermaid','image'].includes(node.type.name))return;const img=images.get(node.attrs.origin);if(img?.data){const path=folder+'/graphic-'+(++i)+'.'+(img.type||'png');assets[path]=bytesBase64(img.data);paths.set(node.attrs.origin,path)}else warnings.push('A '+node.type.name+' could not be rendered; its source or alternative text was included.');});
    return {format,extension:'tex',assets,text:'\\documentclass{article}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amsmath,amssymb,hyperref,longtable,soul,graphicx}\n\\usepackage[normalem]{ulem}\n\\begin{document}\n'+latex(projection.doc,paths)+'\n\\end{document}\n',title,warnings};
  }
  if(format==='EPUB')return {format,extension:'epub',base64:bytesBase64(epub(title,clone)),title,warnings};
  if(format==='DOCX'){
    const images=await graphics(projection,view);for(const image of images.values())if(image.error)warnings.push(image.error);
    const footnoteIDs={},footnotes={};let footnoteID=1;projection.doc.descendants(n=>{if(n.type.name==='footnote_definition')footnoteIDs[n.attrs.label]=footnoteID++;});
    const docOptions={...preferences,footnoteIDs};projection.doc.descendants(n=>{if(n.type.name==='footnote_definition'){const children=[];n.forEach(c=>children.push(...docxChildren(c,images,docOptions)));footnotes[footnoteIDs[n.attrs.label]]={children}}});
    let children=docxChildren(projection.doc,images,docOptions);if(preferences.toc)children.unshift(new TableOfContents('Contents',{hyperlink:true,headingStyleRange:'1-6'}));if(preferences.titlePage)children.unshift(new Paragraph({text:title,heading:HeadingLevel.TITLE,pageBreakBefore:false}),new Paragraph({pageBreakBefore:true}));
    const a4=preferences.pageSize==='A4',width=a4?11906:12240,height=a4?16838:15840;
    const doc=new Document({creator:'Remarque',title,footnotes,styles:{default:{document:{run:{font:'Arial',size:23},paragraph:{spacing:{after:160,line:300}}}}},numbering:{config:[{reference:'decimal',levels:Array.from({length:9},(_,level)=>({level,format:LevelFormat.DECIMAL,text:'%'+(level+1)+'.',alignment:AlignmentType.START,style:{paragraph:{indent:{left:720*(level+1),hanging:360}}}}))}]},sections:[{properties:{page:{size:{width:preferences.landscape?height:width,height:preferences.landscape?width:height},margin:{top:1080,bottom:1080,left:1080,right:1080}}},footers:preferences.pageNumbers?{default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({children:[PageNumber.CURRENT]})]})]})}:undefined,children}]});
    return {format,extension:'docx',base64:bytesBase64(new Uint8Array(await (await Packer.toBlob(doc)).arrayBuffer())),title,warnings};
  }
  if(format==='Embedded Markdown'||format==='Remarque'){
    let text=source;const patches=[],files={};projection.doc.descendants((node,pos)=>{if(node.type.name!=='image')return;const r=projection.records.get(node.attrs.origin),src=view.nodeDOM(pos)?.src;if(!r||!src?.startsWith('data:image/'))return;const raw=source.slice(r.start,r.end);if(format==='Embedded Markdown'){patches.push({start:r.start,end:r.end,text:'!['+node.attrs.alt+']('+src+')'});}else{const mime=src.slice(5,src.indexOf(';')),extension=({'image/jpeg':'jpg','image/svg+xml':'svg','image/gif':'gif'})[mime]||'png';const path='assets/image-'+(Object.keys(files).length+1)+'.'+extension;files[path]=base64Bytes(src.split(',')[1]);patches.push({start:r.start,end:r.end,text:'!['+node.attrs.alt+']('+path+')'});}});
    for(const p of patches.sort((a,b)=>b.start-a.start))text=text.slice(0,p.start)+p.text+text.slice(p.end);
    if(format==='Embedded Markdown')return {format,extension:'md',text,title,warnings};files['document.md']=strToU8(text);return {format,extension:'remarque',base64:bytesBase64(zipSync(files)),title,warnings};
  }
  if(format==='Slides'||format==='present'){
    const sections=[];let section=document.createElement('section');section.className='slide';for(const child of [...clone.children]){if(child.tagName==='H1'&&section.children.length){sections.push(section);section=document.createElement('section');section.className='slide';}section.append(child);}if(section.children.length)sections.push(section);
    const controls='<nav class="slide-controls"><button id="previous">←</button><span id="counter"></span><button id="next">→</button></nav>';
    const script=`(()=>{let i=0;const slides=[...document.querySelectorAll('.slide')];const show=n=>{i=Math.max(0,Math.min(slides.length-1,n));slides.forEach((s,j)=>s.hidden=j!==i);document.querySelector('#counter').textContent=(i+1)+' / '+slides.length};document.querySelector('#previous').onclick=()=>show(i-1);document.querySelector('#next').onclick=()=>show(i+1);addEventListener('keydown',e=>{if(['ArrowRight',' ','PageDown'].includes(e.key))show(i+1);if(['ArrowLeft','PageUp'].includes(e.key))show(i-1);if(e.key==='Escape')window.webkit?.messageHandlers?.remarque?.postMessage({type:'closePresentation'});});show(0)})();`;
    const css=printCSS+'body{max-width:1200px;font-size:21px}.slide{min-height:85vh;padding:3vh 4vw}.slide-controls{position:fixed;bottom:18px;left:0;right:0;display:flex;justify-content:center;gap:20px;background:#fff}.slide-controls button{padding:6px 18px}';
    return {format,extension:'html',text:htmlShell(title,sections.map(s=>s.outerHTML).join('')+controls+'<script>'+script+'</script>',css),title,warnings};
  }
  throw Error('Unknown export format');
}
