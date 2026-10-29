import {readFile,readdir,writeFile,mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url),lock=JSON.parse(await readFile(new URL('Web/package-lock.json',root),'utf8'));
const notices=new URL('Resources/ThirdPartyNotices/',root);await mkdir(notices,{recursive:true});
const manifest=[];
for(const [path,entry] of Object.entries(lock.packages)){
  if(!path||entry.dev)continue;const directory=new URL('Web/'+path+'/',root);let pkg;
  try{pkg=JSON.parse(await readFile(new URL('package.json',directory),'utf8'));}catch{continue;}
  const files=(await readdir(directory)).filter(x=>/^(licen[cs]e|copying|notice)(\.|$)/i.test(x));const saved=[];
  for(const file of files){const name=pkg.name.replaceAll('/','_')+'-'+file;try{await copyFile(new URL(file,directory),new URL(name,notices));saved.push(name);}catch{}}
  manifest.push({name:pkg.name,version:pkg.version,license:pkg.license||entry.license,source:pkg.repository?.url||pkg.repository||pkg.homepage,licenseFiles:saved});
}
manifest.push({name:'mathjax',version:'3.2.2',license:'Apache-2.0',source:'https://github.com/mathjax/MathJax-src/tree/3.2.2',licenseFiles:['MathJax-LICENSE']});
await writeFile(new URL('manifest.json',notices),JSON.stringify(manifest,null,2)+'\n');
console.log(`Recorded ${manifest.length} runtime dependency notices.`);
