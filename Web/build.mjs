import {build} from 'esbuild';
import {mkdir,copyFile,rm} from 'node:fs/promises';
const out=new URL('../Resources/Editor/',import.meta.url).pathname;
await mkdir(out,{recursive:true});
await rm(out+'chunks',{recursive:true,force:true});
await build({entryPoints:['src/entry.mjs'],outdir:out,entryNames:'editor',bundle:true,splitting:false,format:'iife',target:['safari17'],minify:true,legalComments:'linked',loader:{'.woff2':'file','.woff':'file','.ttf':'file'}});
for(const file of ['index.html','editor.css','math-config.js','help.html','help.css'])await copyFile(new URL(file,import.meta.url),out+file);
console.log('Bundled local editor assets.');
