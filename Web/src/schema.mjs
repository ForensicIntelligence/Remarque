import {Schema} from 'prosemirror-model';
import {tableNodes} from 'prosemirror-tables';

const origin = {origin: {default: null}};
const tables = tableNodes({tableGroup: 'block', cellContent: 'block+',cellAttributes:{alignment:{default:null,getFromDOM:dom=>dom.style.textAlign||null,setDOMAttr:(value,attrs)=>{if(value)attrs.style=`text-align:${value}`;}}}});
for (const spec of Object.values(tables)) spec.attrs = {...spec.attrs, ...origin};

export const schema = new Schema({
  nodes: {
    doc: {content: 'block+'},
    paragraph: {content: 'inline*', group: 'block', attrs: origin, parseDOM: [{tag: 'p'}], toDOM: () => ['p', 0]},
    heading: {content: 'inline*', group: 'block', defining: true, attrs: {...origin, level: {default: 1}},
      parseDOM: [1,2,3,4,5,6].map(level => ({tag: `h${level}`, attrs: {level}})), toDOM: n => [`h${n.attrs.level}`, 0]},
    blockquote: {content: 'block+', group: 'block', defining: true, attrs: origin, parseDOM: [{tag: 'blockquote'}], toDOM: () => ['blockquote', 0]},
    bullet_list: {content: 'list_item+', group: 'block', attrs: origin, parseDOM: [{tag: 'ul'}], toDOM: () => ['ul', 0]},
    ordered_list: {content: 'list_item+', group: 'block', attrs: {...origin, order: {default: 1}}, parseDOM: [{tag: 'ol', getAttrs: dom => ({order: Number(dom.getAttribute('start') || 1)})}], toDOM: n => ['ol', {start: n.attrs.order}, 0]},
    list_item: {content: 'paragraph block*', defining: true, attrs: {...origin, checked: {default: null}}, parseDOM: [{tag: 'li'}], toDOM: n => ['li', n.attrs.checked === null ? {} : {'data-checked': String(n.attrs.checked), class: 'task-item'}, 0]},
    code_block: {content: 'text*', marks: '', group: 'block', code: true, defining: true, attrs: {...origin, language: {default: ''}}, parseDOM: [{tag: 'pre', preserveWhitespace: 'full'}], toDOM: n => ['pre', {'data-language': n.attrs.language}, ['code', 0]]},
    horizontal_rule: {group: 'block', attrs: origin, parseDOM: [{tag: 'hr'}], toDOM: () => ['hr']},
    ...tables,
    math_display: {group: 'block', atom: true, attrs: {...origin, value: {default: ''}}, toDOM: n => ['div', {class: 'math-object', 'aria-label': `Equation: ${n.attrs.value}`}, n.attrs.value]},
    mermaid: {group: 'block', atom: true, attrs: {...origin, value: {default: ''}, metadata: {default: ''}}, toDOM: n => ['figure', {class: 'diagram-object'}, ['pre', n.attrs.value]]},
    opaque: {group: 'block', atom: true, attrs: {...origin, raw: {default: ''}, kind: {default: 'source'}}, toDOM: n => ['div', {class: 'opaque-object', 'data-kind': n.attrs.kind}, ['pre', n.attrs.raw]]},
    image: {inline: true, group: 'inline', atom: true, attrs: {...origin, src: {default: ''}, alt: {default: ''}, title: {default: ''}},
      parseDOM: [{tag:'img[src]', getAttrs: d => ({src:d.getAttribute('src'), alt:d.getAttribute('alt')||''})}], toDOM: n => ['img', {src: safeImage(n.attrs.src), alt:n.attrs.alt, title:n.attrs.title}]},
    inline_math: {inline: true, group: 'inline', atom: true, attrs: {...origin, value: {default: ''}}, toDOM: n => ['span', {class: 'inline-math', 'aria-label': `Equation: ${n.attrs.value}`}, n.attrs.value]},
    footnote_ref: {inline: true, group: 'inline', atom: true, attrs: {...origin, label: {default: ''}}, toDOM: n => ['sup', {class: 'footnote-ref'}, n.attrs.label]},
    hard_break: {inline: true, group: 'inline', selectable: false, attrs: origin, parseDOM: [{tag:'br'}], toDOM: () => ['br']},
    text: {group: 'inline'}
  },
  marks: {
    strong: {parseDOM:[{tag:'strong'},{tag:'b'}], toDOM:()=>['strong',0]},
    em: {parseDOM:[{tag:'em'},{tag:'i'}], toDOM:()=>['em',0]},
    strike: {parseDOM:[{tag:'s'},{tag:'del'}], toDOM:()=>['s',0]},
    highlight: {parseDOM:[{tag:'mark'}], toDOM:()=>['mark',0]},
    sup: {parseDOM:[{tag:'sup'}], toDOM:()=>['sup',0]},
    sub: {parseDOM:[{tag:'sub'}], toDOM:()=>['sub',0]},
    code: {code:true, excludes:'strong em strike highlight sup sub', parseDOM:[{tag:'code'}], toDOM:()=>['code',0]},
    link: {attrs:{href:{default:''},title:{default:null},wiki:{default:false}}, inclusive:false, parseDOM:[{tag:'a[href]',getAttrs:d=>({href:d.getAttribute('href'),title:d.getAttribute('title')})}], toDOM:n=>['a',{href:safeLink(n.attrs.href),title:n.attrs.title},0]},
    provenance: {attrs:{id:{}}, inclusive:false, toDOM:n=>['span',{'data-origin':n.attrs.id},0]}
  }
});

export function safeLink(value) { return /^(https?:|mailto:|#|remarque-note:)/i.test(value||'') ? value : '#'; }
export function safeImage(value) { return /^(data:image\/(?:png|jpeg|gif|webp);base64,|remarque-asset:)/i.test(value||'') ? value : ''; }
