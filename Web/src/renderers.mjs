import mermaid from 'mermaid';
import zenuml from '@mermaid-js/mermaid-zenuml';
import tidyTree from '@mermaid-js/layout-tidy-tree';
import elk from '@mermaid-js/layout-elk';
mermaid.registerExternalDiagrams([zenuml]);
mermaid.registerLayoutLoaders(tidyTree);
mermaid.registerLayoutLoaders(elk);
mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:'default',look:'classic',flowchart:{htmlLabels:false},suppressErrorRendering:true});
let serial=Promise.resolve(),counter=0;
export function diagram(source){
  const task=serial.then(async()=>{const {svg}=await mermaid.render(`remarque-diagram-${++counter}`,source);return svg;});serial=task.catch(()=>{});return task;
}
export async function equation(source,display){
  await window.MathJax.startup.promise;
  const element=await window.MathJax.tex2svgPromise(source,{display});return element.innerHTML;
}
