import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import {catalogue} from '../src/catalogue.mjs';
let server,url;
test.beforeAll(async()=>{
  const root=resolve('../Resources/Editor');
  server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}catch{res.statusCode=404;res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/index.html`;
});
test.afterAll(()=>new Promise(r=>server.close(r)));
async function load(page,source){
  await page.addInitScript(()=>{window.messages=[];window.webkit={messageHandlers:{remarque:{postMessage:m=>{window.messages.push(m);if(m.type==='edit')queueMicrotask(()=>window.Remarque.receive({type:'state',documentID:m.documentID,revision:m.revision+1,transactionID:m.transactionID}));}}}};});
  await page.goto(url);await page.waitForFunction(()=>window.Remarque);
  await page.evaluate(source=>window.Remarque.receive({type:'state',documentID:'test',revision:0,source,start:0,end:0,surface:'source'}),source);
}
const source=page=>page.evaluate(()=>window.Remarque.getState().source);
test('scroll preference applies immediately in both directions and preserves selection reveal',async({page})=>{
 const text=Array.from({length:80},(_,i)=>`## Section ${i}\n\nParagraph ${i} with some content.`).join('\n\n');await load(page,text);
 await expect(page.locator('.ProseMirror h2')).toHaveCount(80);
 await page.evaluate(()=>window.Remarque.receive({type:'scroll',revision:0,start:2500}));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
 await page.evaluate(()=>{window.Remarque.receive({type:'preferences',values:{scrollSync:false}});window.scrollTo(0,0);window.messages=[];window.Remarque.receive({type:'scroll',revision:0,start:3500});});
 await expect.poll(()=>page.evaluate(()=>scrollY)).toBe(0);
 await page.mouse.wheel(0,550);await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(100);
 await page.waitForTimeout(150);expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='scroll').length)).toBe(0);
 await page.evaluate(()=>window.Remarque.receive({type:'selection',revision:0,start:3500,end:3505,reveal:true}));await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(1000);
 await page.evaluate(()=>{window.Remarque.receive({type:'preferences',values:{scrollSync:true}});window.messages=[];});await page.mouse.wheel(0,-400);
 await expect.poll(()=>page.evaluate(()=>window.messages.filter(m=>m.type==='scroll').length)).toBeGreaterThan(0);
});
test('right typing maps to the second duplicate heading without changing first',async({page})=>{
  await load(page,'# Same\n\nAlpha\n\n# Same\n\nBeta\n');
  const heading=page.locator('.ProseMirror h1').nth(1);await heading.click();await page.keyboard.press('End');await page.keyboard.type(' revised');
  await expect.poll(()=>source(page)).toBe('# Same\n\nAlpha\n\n# Same revised\n\nBeta\n');
  expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='selection').at(-1).start)).toBe(29);
  await expect(page.locator('.ProseMirror')).toBeFocused();
});
test('bold toolbar preserves selection and edits remain bold while typing',async({page})=>{
  await load(page,'A word here.\n');
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'bold',start:2,end:6,surface:'source'}));
  await expect.poll(()=>source(page)).toBe('A **word** here.\n');
  await expect(page.locator('strong')).toHaveText('word');
  await page.evaluate(()=>window.Remarque.receive({type:'selection',revision:window.Remarque.getState().revision,start:8,end:8}));
  await page.locator('.ProseMirror').focus();await page.keyboard.type('iness');
  await expect.poll(()=>source(page)).toBe('A **wordiness** here.\n');
});
test('typing a Markdown punctuation character stays literal',async({page})=>{
  await load(page,'Hello world\n');await page.locator('.ProseMirror p').click();await page.keyboard.press('End');await page.keyboard.type(' *literal*');
  await expect.poll(()=>source(page)).toBe('Hello world \\*literal\\*\n');
});
test('table editing preserves alignment and escaped pipes',async({page})=>{
  await load(page,'| A | B |\n| :--- | ---: |\n| a\\|b | c |\n');await page.locator('td').first().click();await page.keyboard.press('End');await page.keyboard.type('!');
  await expect.poll(()=>source(page)).toBe('| A | B |\n| :--- | ---: |\n| a\\|b! | c |\n');
});
test('diagram and equation render offline with local bundles',async({page})=>{
  const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:')&&!r.url().startsWith('data:'))external.push(r.url());});
  await load(page,'```mermaid\nflowchart LR\nA-->B\n```\n\n$$\nE=mc^2\n$$\n');
  await expect(page.locator('.mermaid svg')).toBeVisible({timeout:20000});await expect(page.locator('.math_display svg')).toBeVisible({timeout:20000});expect(external).toEqual([]);
  await page.locator('.mermaid').dblclick();await page.getByRole('textbox',{name:'Mermaid source'}).fill('flowchart LR\nA-->C');
  await expect.poll(()=>source(page)).toContain('A-->C');await expect(page.locator('.mermaid svg')).toBeVisible();
});
test('Enter creates an editable paragraph after the last block',async({page})=>{
  await load(page,'First');await page.evaluate(()=>{window.Remarque.receive({type:'selection',revision:0,start:5,end:5});window.Remarque.view.focus();});await page.keyboard.press('Enter');await page.keyboard.type('Second');
  await expect.poll(()=>source(page)).toBe('First\n\nSecond');
});
test('all 41 templates from all 33 Mermaid families render',async({page})=>{
  test.setTimeout(60000);expect(catalogue.length).toBe(41);expect(new Set(catalogue.map(x=>x.family)).size).toBe(33);
  await load(page,catalogue.map(x=>'# '+x.id+'\n\n```mermaid\n'+x.code+'\n```').join('\n\n'));
  await expect(page.locator('.mermaid .pending')).toHaveCount(0,{timeout:45000});
  const errors=await page.locator('.render-error').allTextContents();expect(errors).toEqual([]);
  await expect(page.locator('.mermaid:has(svg)')).toHaveCount(41);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'export:HTML',surface:'rendered'}));await expect.poll(()=>page.evaluate(()=>window.messages.some(m=>m.type==='export'&&m.format==='HTML'))).toBe(true);
  const html=await page.evaluate(()=>window.messages.find(m=>m.type==='export'&&m.format==='HTML').text);await mkdir('../Tests/RemarqueIntegrationTests/Fixtures',{recursive:true});await writeFile('../Tests/RemarqueIntegrationTests/Fixtures/all-diagrams.html',html);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'export:DOCX',surface:'rendered'}));await expect.poll(()=>page.evaluate(()=>window.messages.some(m=>m.type==='export'&&m.format==='DOCX')),{timeout:20000}).toBe(true);
  const word=await page.evaluate(()=>window.messages.find(m=>m.type==='export'&&m.format==='DOCX'));expect(word.warnings).toEqual([]);const {unzipSync}=await import('fflate');const zip=unzipSync(Buffer.from(word.base64,'base64'));expect(Object.keys(zip).filter(k=>k.startsWith('word/media/')&&k.endsWith('.png'))).toHaveLength(41);

});
test('equation palettes insert TeX and live edits preserve surrounding source',async({page})=>{
  await load(page,'Before\n\n$$\r\nE=mc^2\r\n$$\n\nAfter');
  await page.locator('.math_display').dblclick();await expect(page.getByRole('textbox',{name:'LaTeX source'})).toBeVisible();
  expect(await source(page)).toBe('Before\n\n$$\r\nE=mc^2\r\n$$\n\nAfter');
  await page.getByRole('textbox',{name:'LaTeX source'}).fill('x+y');
  await expect.poll(()=>source(page)).toBe('Before\n\n$$\nx+y\n$$\n\nAfter');
  await page.getByRole('button',{name:'Greek',exact:true}).click();await page.getByRole('button',{name:'α \\alpha',exact:true}).click();
  await expect.poll(()=>source(page)).toContain('x+y\\alpha');
});
test('table builder edits the existing table and cancel is lossless',async({page})=>{
  const original='Intro\n\n| A | B |\n| :--- | ---: |\n| a\\|b | c |\n\nTail';await load(page,original);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'tableEditor',start:11,end:11,surface:'source'}));
  await page.getByRole('textbox',{name:'Row 1, column 2',exact:true}).fill('changed');await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await source(page)).toBe(original);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'tableEditor',start:11,end:11,surface:'source'}));
  await page.getByRole('textbox',{name:'Row 1, column 2',exact:true}).fill('changed');await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect.poll(()=>source(page)).toBe('Intro\n\n| A | B |\n| :--- | ---: |\n| a\\|b | changed |\n\nTail');
});
test('exports create structured Word, EPUB, HTML, LaTeX and Markdown packages',async({page})=>{
  test.setTimeout(60000);
  await load(page,'# Report\n\nA **bold** word and $x^2$.\n\n| Name | Value |\n| --- | ---: |\n| A | 2 |\n\n```mermaid\nflowchart LR\nA-->B\n```\n\n$$\nE=mc^2\n$$\n');
  const results={};for(const format of ['HTML','DOCX','EPUB','LaTeX','Remarque','Embedded Markdown','Slides']){
    await page.evaluate(format=>window.Remarque.receive({type:'command',name:'export:'+format,surface:'rendered'}),format);
    await expect.poll(()=>page.evaluate(format=>window.messages.some(m=>m.type==='export'&&m.format===format)||window.messages.some(m=>m.type==='error'),format),{timeout:20000}).toBe(true);
    const errors=await page.evaluate(()=>window.messages.filter(m=>m.type==='error'));expect(errors).toEqual([]);
    results[format]=await page.evaluate(format=>window.messages.find(m=>m.type==='export'&&m.format===format),format);
  }
  const {unzipSync,strFromU8}=await import('fflate');
  expect(results.HTML.text).toContain('<svg');expect(results.HTML.text).not.toContain('<script');
  const word=unzipSync(Buffer.from(results.DOCX.base64,'base64'));expect(Object.keys(word).filter(k=>k.startsWith('word/media/')&&k.endsWith('.png'))).toHaveLength(3);expect(strFromU8(word['word/document.xml'])).toContain('<w:tbl>');expect(results.DOCX.warnings).toEqual([]);
  const book=unzipSync(Buffer.from(results.EPUB.base64,'base64'));expect(strFromU8(book.mimetype)).toBe('application/epub+zip');expect(strFromU8(book['OEBPS/content.opf'])).toContain('version="3.0"');
  expect(results.LaTeX.extension).toBe('tex');expect(results.LaTeX.text).toContain('\\textbf{bold}');expect(results.LaTeX.text).toContain('E=mc^2');
  const bundle=unzipSync(Buffer.from(results.Remarque.base64,'base64'));expect(strFromU8(bundle['document.md'])).toContain('# Report');expect(results['Embedded Markdown'].text).toContain('# Report');expect(results.Slides.text).toContain('class="slide"');
});
test('composition is committed once and keeps Unicode source intact',async({page})=>{
  await load(page,'Before \n');
  await page.evaluate(()=>{const api=window.Remarque;api.receive({type:'selection',revision:0,start:7,end:7});api.view.focus();api.view.dom.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));api.view.dispatch(api.view.state.tr.insertText('日本語'));});
  expect(await source(page)).toBe('Before \n');
  await page.evaluate(()=>window.Remarque.view.dom.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'日本語'})));
  await expect.poll(()=>source(page)).toBe('Before 日本語\n');
  expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='edit').length)).toBe(1);
});
test('a rejected optimistic edit restores the native revision and retains recovery text',async({page})=>{
  await load(page,'Original');
  await page.evaluate(()=>{const api=window.Remarque;api.receive({type:'selection',revision:0,start:8,end:8});api.view.dispatch(api.view.state.tr.insertText(' local'));api.receive({type:'state',documentID:'test',revision:0,source:'Native truth',start:0,end:0,rejected:'rejected-edit'});});
  expect(await source(page)).toBe('Native truth');await expect(page.getByRole('textbox',{name:'Recovered uncommitted editor content'})).toHaveValue('Original local');
});
test('block splitting and joining does not alter adjacent opaque source',async({page})=>{
  const prefix='---\ntitle: Keep me\n---\n\n<!-- untouched -->\n\n';await load(page,prefix+'One two\n\nTail');
  await page.evaluate(start=>{window.Remarque.receive({type:'selection',revision:0,start,end:start});window.Remarque.view.focus();},prefix.length+4);
  await page.keyboard.press('Enter');await expect.poll(()=>source(page)).toBe(prefix+'One \n\ntwo\n\nTail');
  await page.keyboard.press('Backspace');await expect.poll(()=>source(page)).toBe(prefix+'One two\n\nTail');
});
test('Word import recovers headings, marks, tables and embedded graphics',async({page})=>{
  await load(page,'# Imported Report\n\nA **bold** word.\n\n| A | B |\n| --- | --- |\n| One | Two |\n\n$$\nx^2\n$$');
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'export:DOCX',surface:'rendered'}));
  await expect.poll(()=>page.evaluate(()=>window.messages.some(m=>m.type==='export'))).toBe(true);
  await page.evaluate(()=>{const output=window.messages.find(m=>m.type==='export');window.Remarque.receive({type:'command',name:'importDOCX',value:output.base64});});
  await expect.poll(()=>page.evaluate(()=>window.messages.some(m=>m.type==='imported'))).toBe(true);
  const result=await page.evaluate(()=>window.messages.find(m=>m.type==='imported'));expect(result.text).toContain('# Imported Report');expect(result.text).toContain('**bold**');expect(result.text).toContain('| One | Two |');expect(result.text).toContain('data:image/png;base64,');expect(result.warnings).toEqual([]);
});
test('visual editor cancels losslessly and preserves directives when applying',async({page})=>{
  const text='Before\n\n```mermaid\nflowchart LR\nA[Alpha] --> B[Beta]\nclassDef red fill:red\nclass A red\n```\n\nAfter';await load(page,text);
  await page.locator('.mermaid').click();await page.evaluate(()=>window.Remarque.receive({type:'command',name:'visualDiagram',surface:'rendered'}));
  await page.getByRole('button',{name:'Node Alpha',exact:true}).click();await page.getByRole('textbox',{name:'Label',exact:true}).fill('Changed');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();expect(await source(page)).toBe(text);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'visualDiagram',surface:'rendered'}));await page.getByRole('button',{name:'Node Alpha',exact:true}).click();await page.getByRole('textbox',{name:'Label',exact:true}).fill('Changed');await page.getByRole('button',{name:'Apply',exact:true}).click();
  await expect.poll(()=>source(page)).toContain('A["Changed"]');expect(await source(page)).toContain('B["Beta"]');expect(await source(page)).toContain('classDef red fill:red\nclass A red');expect(await source(page)).toMatch(/^Before\n\n[\s\S]*\n\nAfter$/);
});
test('diagram metadata and repeated source edits keep the same object identity',async({page})=>{
  await load(page,'<!-- remarque:mermaid id="original" width="500" align="left" -->\n\n```mermaid\nflowchart LR\nA-->B\n```');
  await page.locator('.mermaid .graphic').dblclick();const input=page.getByRole('textbox',{name:'Mermaid source',exact:true});await input.fill('flowchart LR\nA-->C');await input.fill('flowchart LR\nA-->D');
  await expect.poll(()=>source(page)).toContain('A-->D');expect(await source(page)).toContain('id="original"');expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='error'))).toEqual([]);
});
test('extended Markdown is rendered and editable without flattening its structure',async({page})=>{
  const text='> [!NOTE]\n> Useful\n\nTerm\n: Definition\n\nA[^1]\n\n[^1]: Footnote\n\n<details>\n<summary>More</summary>\n\nHidden content\n\n</details>';await load(page,text);
  await expect(page.locator('blockquote[data-callout=NOTE]')).toContainText('Useful');await expect(page.locator('dt')).toHaveText('Term');await expect(page.locator('.footnote-definition')).toContainText('Footnote');await expect(page.locator('.ProseMirror details summary')).toHaveText('More');
  const at=text.indexOf('Definition')+'Definition'.length;await page.evaluate(at=>{window.Remarque.receive({type:'selection',revision:0,start:at,end:at});window.Remarque.view.focus()},at);await page.keyboard.type(' updated');await expect.poll(()=>source(page)).toBe(text.replace('Definition','Definition updated'));
});
test('consecutive formatting commands retain the selected text',async({page})=>{
  await load(page,'One word here.');await page.evaluate(()=>window.Remarque.receive({type:'command',name:'bold',start:4,end:8,surface:'source'}));
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'italic',surface:'rendered'}));
  await expect(page.locator('strong em,em strong')).toHaveText('word');expect(await page.evaluate(()=>window.Remarque.view.state.selection.empty)).toBe(false);
});
test('live source mode reveals one block and commits Markdown without altering neighbors',async({page})=>{
  await load(page,'# Title\n\nA **bold** word\n\nTail');await page.evaluate(()=>window.Remarque.receive({type:'state',documentID:'test',mode:'liveSource',revision:0,source:'# Title\n\nA **bold** word\n\nTail',start:12,end:12}));
  await page.locator('.ProseMirror p').first().click();const area=page.getByRole('textbox',{name:'Edit Markdown block'});await expect(area).toHaveValue('A **bold** word');await area.fill('An *edited* word');
  await expect.poll(()=>source(page)).toBe('# Title\n\nAn *edited* word\n\nTail');await area.press('Escape');await expect(page.locator('.ProseMirror em')).toHaveText('edited');expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='error'))).toEqual([]);
});
test('composition rebases across a nonoverlapping native edit',async({page})=>{
  await load(page,'First\n\nLast');
  await page.evaluate(()=>{const a=window.Remarque;a.receive({type:'selection',revision:0,start:11,end:11});a.view.focus();a.view.dom.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));a.view.dispatch(a.view.state.tr.insertText('日本語'));a.receive({type:'state',documentID:'test',revision:1,source:'New First\n\nLast',patches:[{range:{start:0,end:0},text:'New '}],start:0,end:0});});
  await expect.poll(()=>source(page)).toBe('New First\n\nLast日本語');expect(await page.evaluate(()=>window.messages.filter(m=>m.type==='error'))).toEqual([]);
});
test('overlapping composition preserves a full Markdown recovery draft',async({page})=>{
  await load(page,'# Title\n\nBody');
  await page.evaluate(()=>{const a=window.Remarque;a.receive({type:'selection',revision:0,start:13,end:13});a.view.focus();a.view.dom.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));a.view.dispatch(a.view.state.tr.insertText('日本語'));a.receive({type:'state',documentID:'test',revision:1,source:'# Title\n\nNative',patches:[{range:{start:9,end:13},text:'Native'}],start:9,end:9});});
  await expect.poll(()=>source(page)).toBe('# Title\n\nNative');await expect(page.getByRole('textbox',{name:'Recovered uncommitted editor content'})).toHaveValue('# Title\n\nBody日本語');
});
test('table placement remains attached through cell edits and the table editor',async({page})=>{
  await load(page,'Before\n\n| A | B |\n| --- | --- |\n| One | Two |\n\nAfter');
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'tablePlacement:right',surface:'source',start:10,end:10}));await expect(page.locator('table')).toHaveAttribute('data-placement','right');
  await page.locator('td').first().click();await page.keyboard.press('End');await page.keyboard.type('!');await expect.poll(()=>source(page)).toContain('One!');expect(await source(page)).toContain('align="right"');
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'tableEditor',surface:'rendered'}));await page.getByRole('textbox',{name:'Row 1, column 2',exact:true}).fill('Changed');await page.getByRole('button',{name:'Apply',exact:true}).click();expect(await source(page)).toContain('align="right"');expect(await source(page)).toContain('Changed');
});
test('script-bearing Markdown and Mermaid cannot execute or load remote resources',async({page})=>{
  const external=[];page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
  const input='# Safe\n\n<script>window.remarquePwned=true</script>\n\n[Unsafe](javascript:alert(1))\n\n<img src="https://example.invalid/tracker" onerror="window.remarquePwned=true">\n\n```mermaid\nflowchart LR\nA-->B\nclick A "https://example.invalid/diagram"\n```';
  await load(page,input);await expect(page.locator('.mermaid svg')).toBeVisible();expect(await page.evaluate(()=>window.remarquePwned)).toBeUndefined();expect(external).toEqual([]);expect(await source(page)).toBe(input);
  expect(await page.locator('.ProseMirror a').evaluateAll(links=>links.some(a=>(a.getAttribute('href')||'').startsWith('javascript:')))).toBe(false);
  await page.evaluate(()=>window.Remarque.receive({type:'command',name:'export:HTML',surface:'rendered'}));await expect.poll(()=>page.evaluate(()=>window.messages.some(m=>m.type==='export'))).toBe(true);const html=await page.evaluate(()=>window.messages.find(m=>m.type==='export').text);expect(html).not.toContain('<script>window.remarquePwned');expect(html).not.toContain('<img src="https://example.invalid/tracker"');
});
