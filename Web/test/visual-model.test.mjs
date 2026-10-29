import test from 'node:test';
import assert from 'node:assert/strict';
import {visualModel} from '../src/visual-model.mjs';
test('visual editing leaves untouched directives and CRLF intact',()=>{
 const text='flowchart LR\r\n  A[Alpha] --> B[Beta]\r\nclassDef red fill:red\r\nclass A red\r\n%% retained\r\n';const model=visualModel(text);assert.equal(model.serialize(),text);
 model.updateNode('A',{label:'Changed'});const output=model.serialize();assert.match(output,/B\["Beta"\]/);assert.match(output,/classDef red fill:red\r\nclass A red\r\n%% retained\r\n/);assert.throws(()=>model.removeNode('A'),/preserved Mermaid directive/);
});
test('sequence messages reorder and state aliases survive edits',()=>{
 const seq=visualModel('sequenceDiagram\nparticipant A as Alice\nparticipant B as Bob\nA->>B: One\nB-->>A: Two');[seq.edges[0],seq.edges[1]]=[seq.edges[1],seq.edges[0]];assert.ok(seq.serialize().indexOf('Two')<seq.serialize().indexOf('One'));
 const state=visualModel('stateDiagram-v2\nstate "In Progress" as working\n[*] --> working\nworking --> [*]: Done');state.updateNode('working',{label:'Ready'});assert.match(state.serialize(),/state "Ready" as working/);assert.match(state.serialize(),/working --> \[\*\]: Done/);
});
test('positions round trip and unsupported syntax refuses destructive conversion',()=>{
 const m=visualModel('flowchart TD\nA-->B');m.nodes.get('A').x=245;m.moved=true;assert.equal(visualModel(m.serialize()).nodes.get('A').x,245);
 assert.throws(()=>visualModel('classDiagram\nclass A'),/supports flowcharts/);assert.throws(()=>visualModel('stateDiagram-v2\nstate Composite {\nA --> B\n}'),/Composite states/);
});
