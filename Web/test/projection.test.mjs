import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EditorState,TextSelection} from 'prosemirror-state';
import {project,transactionPatches,applyPatches,textBoundaries,minimalPatch} from '../src/projection.mjs';
import {schema} from '../src/schema.mjs';

test('duplicate heading and Unicode map to their own actual source',()=>{
  const source='# Same\r\n\r\ncafé 👩🏽‍💻\r\n\r\n# Same\r\n\r\ncafé 👩🏽‍💻';
  const p=project(source),repeated=p.leaves.filter(x=>x.value==='Same');
  assert.equal(repeated.length,2);assert.notEqual(repeated[0].id,repeated[1].id);
  assert.equal(p.sourceAt(repeated[1].pmStart+2),source.lastIndexOf('Same')+2);
  const leaf=p.leaves.at(-1);assert.equal(p.sourceAt(leaf.pmEnd,-1),source.length);
});
test('typing changes one leaf and preserves every surrounding byte',()=>{
  const source='---\r\ntitle: "Keep"\r\n---\r\n\r\n__world__  \r\n\r\n<!-- untouched -->\r\n';
  const p=project(source),leaf=p.leaves.find(x=>x.value==='world');
  const state=EditorState.create({doc:p.doc});const tr=state.tr.insertText('X',leaf.pmStart+2);
  const patches=transactionPatches(p,tr),next=applyPatches(source,patches);
  assert.equal(next,source.replace('world','woXrld'));assert.equal(patches.length,1);
});
test('escaped punctuation and entities keep nonlinear mappings',()=>{
  const source='A \\* mark &amp; another.';const p=project(source),leaf=p.leaves[0];
  assert.equal(leaf.value,'A * mark & another.');
  assert.equal(p.sourceAt(leaf.pmStart+9),source.indexOf('&amp;'));
  assert.equal(p.sourceAt(leaf.pmStart+10,-1),source.indexOf('&amp;')+5);
});
test('table text edit retains escaped pipes, alignment and neighboring cells',()=>{
  const source='| A | B |\n| :--- | ---: |\n| one \\| two | __keep__ |\n';const p=project(source);
  const leaf=p.leaves.find(x=>x.value==='one | two');
  const tr=EditorState.create({doc:p.doc}).tr.insertText('!',leaf.pmStart+3);
  assert.equal(applyPatches(source,transactionPatches(p,tr)),source.replace('one','one!'));
});
test('long fences do not absorb subsequent Mermaid and metadata belongs to it',()=>{
  const source='````text\n```nested```\n````\n\n<!-- remarque:mermaid id="a" -->\n```mermaid\nflowchart LR\n A-->B\n```';
  const p=project(source);assert.equal(p.doc.childCount,2);assert.equal(p.doc.child(1).type.name,'mermaid');
  const record=p.records.get(p.doc.child(1).attrs.origin);assert.equal(record.start,source.indexOf('<!--'));assert.equal(record.end,source.length);
});
test('fixture renders without rewriting unknown constructs',()=>{
  const source=readFileSync('../docs/fixtures/feature-probe.md','utf8'),p=project(source);
  assert.equal(p.source,source);assert.equal(p.outline.filter(x=>x.kind==='diagram').length,5);
  assert.ok(p.leaves.some(x=>x.value==='Wiki alias'));assert.ok(p.leaves.some(x=>x.value.includes('literal prices')));
  assert.ok(p.doc.content.size>500);
});
test('cross-mark deletion keeps valid semantic text and unaffected blocks',()=>{
  const source='## Keep\n\nOne **bold** and *italic* end.\n\n<!-- exact -->';const p=project(source);
  const a=p.leaves.find(x=>x.value==='bold'),b=p.leaves.find(x=>x.value==='italic');
  const tr=EditorState.create({doc:p.doc}).tr.delete(a.pmStart+2,b.pmStart+3);
  const result=applyPatches(source,transactionPatches(p,tr));
  assert.ok(result.startsWith('## Keep\n\n'));assert.ok(result.endsWith('\n\n<!-- exact -->'));
  const after=project(result);assert.equal(after.doc.child(1).textContent,'One bolic end.');
});
test('minimal patches preserve emoji boundaries',()=>{
  for(const [a,b] of [['A😀Z','A😁Z'],['abc',''],['','text']])assert.equal(applyPatches(a,[minimalPatch(a,b)]),b);
});
