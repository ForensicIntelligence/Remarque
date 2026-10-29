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
