import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
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
  await expect.poll(()=>source(page)).toContain('| a\\|b | changed |');expect(await source(page)).toMatch(/^Intro\n\n[\s\S]*\n\nTail$/);
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
