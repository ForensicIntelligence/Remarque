"""Generate navigation aids from the preserved inventory and UI captures."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parent
evidence = root / 'evidence'
features = []
section = ''
for line in (root / 'FEATURE_INVENTORY.md').read_text().splitlines():
    if line.startswith('## '):
        section = line[3:]
    if re.match(r'^\| [A-Z]+-\d+ \|', line):
        fields = [x.strip() for x in re.split(r'(?<!\\)\|', line)[1:-1]]
        if len(fields) != 4:
            raise ValueError((line, fields))
        features.append(dict(id=fields[0], category=section, feature=fields[1],
                             baseline_contract=fields[2], evidence=fields[3]))
assert len({f['id'] for f in features}) == len(features)
(root / 'feature-index.json').write_text(json.dumps({
    'baseline': 'Remarque 2.1 (733)', 'date': '2026-10-29',
    'feature_count': len(features),
    'evidence_legend': {'V': 'Exercised within recorded probe scope', 'U': 'Observed UI',
                        'D': 'App documentation', 'B': 'Bundle/binary/output structure'},
    'features': features,
}, ensure_ascii=False, indent=2) + '\n')

parts = ['# Remarque control reference\n',
         'Exact control names observed in Remarque 2.1 (733), 29 October 2026. '
         'Values below are the configuration on this machine, **not certified factory defaults**. '
         'A disabled menu item reflects its capture context. Native macOS items and share/service destinations vary by OS and installed applications.\n',
         '## Preferences\n']
for name in ['appearance', 'editing', 'preview', 'mermaid', 'export', 'snippets', 'keyboard']:
    text = (evidence / f'settings-{name}.txt').read_text()
    content = text.split('\n', 2)[-1]
    content = re.split(r'^\s*\d+ toolbar$', content, flags=re.M)[0]
    lines = []
    for line in content.splitlines():
        if any(x in line for x in ('scroll bar', 'value indicator', 'increment arrow', 'decrement arrow', 'increment page', 'decrement page')):
            continue
        if re.search(r'\b(heading|switch|slider|text field|pop up button|text |button|row)\b', line) or ('⇥' in line):
            lines.append(re.sub(r'^\s*\d+ ', '', line).strip())
    parts += [f'### {name.title()}\n', f'[Original capture](evidence/settings-{name}.txt).\n',
              '```text\n' + '\n'.join(lines) + '\n```\n']
parts += ['### About Remarque\n',
          'Eighth preferences item is present in the toolbar overflow; it was shown disabled in that menu capture. '
          'Its full preference-page body was not opened. The native About panel verifies Remarque 2.1 (733) and the product tagline; '
          'embedded settings text includes Forensic Intelligence attribution and publisher website. '
          '[Overflow](evidence/settings-overflow.txt) · [About panel](evidence/ui-about.txt).\n',
          '### Snippet fields and exact bodies\n',
          'Fields: Name, Trigger (type + Tab to expand), Body. Add/Remove controls; `$0` specifies caret placement.\n']
for title, filename in [('Note callout', 'settings-snippet-detail.txt'), ('Warning callout','snippet-warning-callout.txt'),
                        ('Fenced code','snippet-fenced-code.txt'), ('Table 2×2','snippet-table-2-2.txt'),
                        ('Link','snippet-link.txt'), ('Details','snippet-details.txt'), ('Front matter','snippet-front-matter.txt')]:
    s = (evidence / filename).read_text()
    body = re.search(r'text entry area \(settable\) (.*?)(?=\n\s*\d+ (?:scroll bar|text |container|button))', s, re.S)
    parts += [f'**{title}** — [capture](evidence/{filename})\n',
              '````text\n'+(body[1].strip() if body else 'See capture for exact body.')+'\n````\n']

parts += ['## Keyboard shortcuts\n', '| Action | Shortcut |\n| --- | --- |']
shortcuts = [
 ('New document','⌘N'),('Open','⌘O'),('Save','⌘S'),('Save As','⇧⌘S'),('Save Version','⌃⌘S'),('Print rendered document','⌘P'),
 ('Import Document','⇧⌘I'),('Import Mermaid','⌥⌘I'),('Export DOCX','⇧⌘D'),('Show Start Window','⌥⇧⌘N'),('Workspace','⇧⌘0'),
 ('Bold','⌘B'),('Italic','⌘I'),('Insert Link','⌘K'),('Code Block','⌥⌘C'),('Insert Equation','⌃⌘E'),('Mermaid Diagram','⌥⌘M'),
 ('Format Document','⌥⌘L'),('Emoji & Symbols','⌃⌘Space'),('Command Palette','⇧⌘P'),('Find','⌘F'),('Toggle Preview','⌥⌘P'),
 ('Toggle Outline','⌥⌘O'),('Focus Mode','⌥⌘F'),('Typewriter Mode','⌥⌘T'),('Smart Editing Mode','⌥⌘S'),
 ('Live Editing Mode','⌥⌘W'),('Formatting Ribbon','⌃⌘R'),('Start Presentation','⌥⌘Return'),('Mermaid Visual Editor','⇧⌘M'),('Documentation','⌘?')]
parts += [f'| {name} | {key} |' for name,key in shortcuts]
parts += ['\nCommand symbols: ⌘ Command, ⌥ Option, ⇧ Shift, ⌃ Control. '
          'Additional contextual keys: V/N/E in graph canvas; Tab/Shift-Tab for smart headings/lists/snippets; '
          'Return/Shift-Return in Find; arrows/Return/Escape in palette; arrows/Space/Escape documented for presentation. '
          'See [shortcut capture](evidence/help-keyboard-shortcuts.txt).\n', '## Menu commands\n']
for name,filename in [('Remarque','menu-active-remarque.txt'),('File','menu-active-file.txt'),('Edit','menu-active-edit.txt'),
                      ('View','menu-active-view.txt'),('Format','menu-format.txt'),('Diagram','menu-diagram.txt'),
                      ('Tools','menu-tools.txt'),('Window','menu-active-window.txt'),('Help','menu-help.txt')]:
    lines=[]; skip_indent=None
    for line in (evidence/filename).read_text().splitlines()[2:]:
        indent=len(line)-len(line.lstrip('\t'))
        if skip_indent is not None:
            if indent>skip_indent:
                continue
            skip_indent=None
        clean=re.sub(r'^\s*\d+ ', '',line)
        if clean.startswith('Open Recent'):
            lines.extend(['Open Recent', '  Recent document names', '  Clear Menu'])
            skip_indent=indent;continue
        if clean == 'Services':
            lines.extend(['Services', '  macOS service destinations vary by installation'])
            skip_indent=indent;continue
        if clean.startswith('menu ') or 'makeKeyAndOrderFront:' in clean:
            continue
        clean=re.sub(r', ID:.*$', '',clean)
        clean=re.sub(r', Secondary Actions:.*$', '',clean)
        if clean: lines.append('  '*max(0,indent-2)+clean)
    parts += [f'### {name}\n',f'[Original capture](evidence/{filename}).\n', '```text\n'+'\n'.join(lines)+'\n```\n']
parts += ['## Layout source ribbon and diagram card menus\n',
          '- Layout: Editor; Editor + Preview; Editor + Outline; Outline + Editor + Preview; Preview; Mermaid Visual Editor; Focus Mode.\n'
          '- Source styles: Body; Heading 1–6; Quote.\n'
          '- Source ribbon: style; bold; italic; strike; highlight; inline code; per-column left/center/right; whole-table placement; shared text size.\n'
          '- Diagram card: Visual Edit; Zoom; Copy Mermaid Source; Copy SVG; Export Diagram; Show Source. Selection also exposes left/center/right alignment, Reset Size and Copy Source.\n'
          '- Export: HTML; PDF; DOCX; RTF; Slides; EPUB; LaTeX; Remarque Bundle (.remarque); Embedded Markdown (.md).\n',
          '## Equation palettes\n']
for name,file in [('Structures','ui-equation-editor.txt')]+[(x.title(),'equation-'+x+'.txt') for x in ['greek','operators','relations','arrows','symbols','functions']]:
    lines=[]
    for line in (evidence/file).read_text().splitlines():
        if 'button Description:' in line and 'radio button' not in line:
            lines.append(re.sub(r'^\s*\d+ button Description: ', '',line))
        elif re.search(r'\bbutton =',line):
            lines.append('=')
    parts += [f'### {name}\n',f'[Original capture](evidence/{file}).\n','```text\n'+'\n'.join(lines)+'\n```\n']
parts += ['## Built-in help articles\n']
for p in sorted(evidence.glob('help-*.txt')):
    title=p.stem.removeprefix('help-').replace('-',' ').title()
    parts.append(f'- [{title}](evidence/{p.name})')
parts += ['\n## Machine-readable feature catalogue\n',
          f'The [feature index](feature-index.json) contains **{len(features)} feature records** with category, contract and evidence marks. '
          'Its records are grouping units, not a count of independently passed tests. Individual settings, palette buttons and menu variants above remain part of the scope.\n']
(root/'CONTROL_REFERENCE.md').write_text('\n'.join(parts)+'\n')
print(f'Generated {len(features)} feature records and control reference.')
