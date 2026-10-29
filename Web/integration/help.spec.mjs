import {test,expect} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
let server,url;
test.beforeAll(async()=>{
 const root=resolve('../Resources/Editor');server=createServer(async(req,res)=>{try{const path=resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(!path.startsWith(root+'/'))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path))}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));url=`http://127.0.0.1:${server.address().port}/help.html`;
});
test.afterAll(()=>new Promise(r=>server.close(r)));
async function load(page){await page.addInitScript(()=>{window.helpMessages=[];window.webkit={messageHandlers:{remarqueHelp:{postMessage:m=>window.helpMessages.push(m)}}}});await page.goto(url);await page.waitForFunction(()=>window.RemarqueHelp);}
async function show(page,title,theme='Paper'){const source=await readFile(resolve('../Resources/Help',title+'.md'),'utf8');await page.evaluate(article=>window.RemarqueHelp.show(article),{title,source,theme,scale:1});await expect(page.locator('#help')).toHaveAttribute('data-ready','true');}
test('all bundled guides render offline in light and dark without errors',async({page})=>{
 test.setTimeout(90000);const errors=[],outbound=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith(url.replace('/help.html','/'))&&!r.url().startsWith('data:'))outbound.push(r.url())});await load(page);
 const names=(await readdir(resolve('../Resources/Help'))).filter(n=>n.endsWith('.md'));
 for(const theme of ['Paper','Midnight'])for(const name of names){await show(page,name.slice(0,-3),theme);expect(await page.locator('[data-error=true],parsererror').count(),name+' '+theme).toBe(0);expect(await page.locator('article').textContent()).not.toContain('This page contains the following errors');await expect(page.locator('.article-header h1')).toHaveText(name.slice(0,-3));expect(await page.locator('article h2').count()).toBeGreaterThan(0);}
 expect(outbound).toEqual([]);expect(errors).toEqual([]);expect(names.length).toBe(21);
});
test('help navigation, settings link, example copy and rendered math work',async({page})=>{
 await load(page);await show(page,'Welcome');await expect(page.getByRole('figure',{name:/Remarque layout/})).toBeVisible();
 await page.screenshot({path:'/tmp/remarque-help-welcome-light.png',fullPage:true});
 await page.getByRole('link',{name:'Your first document →'}).click();expect(await page.evaluate(()=>window.helpMessages.at(-1))).toEqual({action:'topic',value:'Getting Started'});
 await page.getByRole('link',{name:'Settings → Preview',exact:true}).click();expect(await page.evaluate(()=>window.helpMessages.at(-1))).toEqual({action:'settings',value:'Preview'});
 await show(page,'Math and Equations');await expect(page.locator('.example-result .math-inline svg')).toHaveCount(1);await expect(page.locator('.example-result .math-display svg')).toHaveCount(1);
 const visibleGlyphs=await page.locator('.math-inline svg,.math-display svg').evaluateAll(nodes=>nodes.length>2&&nodes.every(svg=>[...svg.querySelectorAll('path')].some(p=>!p.closest('defs'))));
 expect(visibleGlyphs).toBe(true);
 await page.screenshot({path:'/tmp/remarque-help-math-light.png',fullPage:true});
 await page.getByRole('button',{name:'Copy Markdown'}).first().click();expect(await page.evaluate(()=>window.helpMessages.at(-1))).toEqual({action:'copy',value:'The area of a circle is $A=\\pi r^2$.'});
 await page.setViewportSize({width:560,height:760});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await show(page,'Welcome','Midnight');await page.screenshot({path:'/tmp/remarque-help-welcome-dark-narrow.png',fullPage:true});
});
test('help renders untrusted HTML as text and ignores executable links',async({page})=>{
 await load(page);await page.evaluate(()=>window.RemarqueHelp.show({title:'Safe guide',theme:'Paper',source:'<img src="https://example.invalid/tracker" onerror="window.compromised=1">\n\n[Bad](javascript:alert(1))\n\n```example\n<script>window.compromised=1</script>\n```'}));
 expect(await page.evaluate(()=>window.compromised)).toBeUndefined();await expect(page.locator('article img,article script,article a[href^="javascript:"]')).toHaveCount(0);
});
