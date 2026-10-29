"""Read-only extraction of surviving ARM64 string metadata from the installed app."""
from pathlib import Path
import json
import struct

binary = Path('/Applications/Remarque.app/Contents/MacOS/Remarque').read_bytes()
count = struct.unpack_from('>I', binary, 4)[0]
architectures = [struct.unpack_from('>IIIII', binary, 8 + i * 20) for i in range(count)]
base = next(a[2] for a in architectures if a[0] == 0x100000C)
commands = struct.unpack_from('<I', binary, base + 16)[0]
position = base + 32
output = Path(__file__).resolve().parent.parent / 'docs' / 'evidence'
for _ in range(commands):
    command, size = struct.unpack_from('<II', binary, position)
    if command == 0x19:
        sections = struct.unpack_from('<I', binary, position + 64)[0]
        for index in range(sections):
            section = position + 72 + index * 80
            name = binary[section:section + 16].split(b'\0')[0].decode()
            length, offset = struct.unpack_from('<QI', binary, section + 40)
            if name in ('__cstring', '__swift5_reflstr', '__objc_methname'):
                chunks = binary[base + offset:base + offset + length].split(b'\0')
                strings = [s.decode('utf-8', 'replace') for s in chunks if s]
                (output / (name.strip('_') + '.json')).write_text(json.dumps(strings, ensure_ascii=False, indent=2))
                (output / (name.strip('_') + '.txt')).write_text('\n\n'.join(strings))
                print(name, len(strings))
    position += size
