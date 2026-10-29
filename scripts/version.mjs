import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);const read=p=>readFile(new URL(p,root),'utf8');
let v=JSON.parse(await read('VERSION.json'));
if(process.argv.includes('--next-build')){v.build++;await writeFile(new URL('VERSION.json',root),JSON.stringify(v,null,2)+'\n');}
if(!/^\d+\.\d+\.\d+$/.test(v.version)||v.build<734||v.bundleIdentifier!=='ca.forensicintelligence.remarkable')throw Error('Invalid version authority');
let project=await read('project.yml'),pkg=JSON.parse(await read('Web/package.json'));
const validIdentifier=id=>id===v.bundleIdentifier||id===v.bundleIdentifier+'.tests';
const expected=`${v.version}-${v.channel==='development'?'dev':v.channel}.${v.build}`;
if(process.argv.includes('--check')){
  const projectIDs=[...project.matchAll(/PRODUCT_BUNDLE_IDENTIFIER:\s*(\S+)/g)].map(m=>m[1]);
  const xcode=await read('RemarqueRebuild.xcodeproj/project.pbxproj');
  const xcodeIDs=[...xcode.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map(m=>m[1]);
  if(!projectIDs.length||!xcodeIDs.length||![...projectIDs,...xcodeIDs].every(validIdentifier))throw Error('Bundle identifiers diverged from VERSION.json. Update both project.yml and the Xcode project.');
  if(!project.includes('PRODUCT_NAME: Remarque')||!xcode.includes('PRODUCT_NAME = Remarque;'))throw Error('Product name must be Remarque.');
  if(!project.includes(`MARKETING_VERSION: '${v.version}'`)||!project.includes(`CURRENT_PROJECT_VERSION: '${v.build}'`)||pkg.version!==expected)throw Error('Version files diverged. Run node scripts/version.mjs, then xcodegen generate.');
}else{
  project=project.replace(/MARKETING_VERSION: '[^']+'/g,`MARKETING_VERSION: '${v.version}'`).replace(/CURRENT_PROJECT_VERSION: '[^']+'/g,`CURRENT_PROJECT_VERSION: '${v.build}'`);
  pkg.version=expected;await writeFile(new URL('project.yml',root),project);await writeFile(new URL('Web/package.json',root),JSON.stringify(pkg,null,2)+'\n');
  const lock=JSON.parse(await read('Web/package-lock.json'));lock.version=expected;lock.packages[''].version=expected;await writeFile(new URL('Web/package-lock.json',root),JSON.stringify(lock,null,2)+'\n');
}
console.log(`${v.version} (${v.build}) · ${v.channel} · ${v.bundleIdentifier}`);
