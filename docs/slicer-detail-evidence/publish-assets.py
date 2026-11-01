"""Publish exact owned controls and render actual retained linear paths as SVG."""
from html import escape
import importlib.util
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent.parent / 'public/examples/slicer-detail'
spec = importlib.util.spec_from_file_location('reader', ROOT / 'inspect-paths.py')
reader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reader)


def figure(name, panels, columns=3, envelope=(40, 24)):
    width, panel_height = 1080, 340
    cell = width / columns
    height = ((len(panels) + columns - 1) // columns) * panel_height + 48
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img">',
           f'<title>{escape(name)}</title><desc>Original rendering of actual retained extrusion centrelines. Dashed rectangles mark source regions, not deposited material.</desc>',
           '<rect width="100%" height="100%" fill="#ffffff"/>']
    for index, (run, z, label) in enumerate(panels):
        origin_x, origin_y = index % columns * cell, index // columns * panel_height
        w, h = envelope
        scale = min((cell - 54) / w, 235 / h)
        x0, y0 = origin_x + 28, origin_y + 278
        offset = (80, 88) if run.startswith('T') else ((85, 85) if run.startswith('R') else (88, 88))
        segments = reader.parse((PUBLIC / f'{run}.gcode').read_text())
        if run.endswith('-S'):
            selected = [s for s in segments if abs(s['end'][2] - z) <= 0.11]
        else:
            selected = [s for s in segments if abs(s['end'][2] - z) < 0.0001]
        svg.append(f'<text x="{origin_x + 22}" y="{origin_y + 27}" font-family="sans-serif" font-size="19" font-weight="bold" fill="#172b32">{escape(label)}</text>')
        svg.append(f'<text x="{origin_x + 22}" y="{origin_y + 50}" font-family="sans-serif" font-size="15" fill="#384f59">{escape(run)}; deposition Z near {z:g} mm</text>')
        svg.append(f'<rect x="{x0}" y="{y0 - h * scale}" width="{w * scale}" height="{h * scale}" fill="none" stroke="#65767e" stroke-dasharray="5 4"/>')
        for segment in selected:
            a, b = segment['start'], segment['end']
            coordinates = (x0 + (a[0] - offset[0]) * scale, y0 - (a[1] - offset[1]) * scale,
                           x0 + (b[0] - offset[0]) * scale, y0 - (b[1] - offset[1]) * scale)
            svg.append('<line x1="%.3f" y1="%.3f" x2="%.3f" y2="%.3f" stroke="#086b65" stroke-width="1.6"/>' % coordinates)
        if run.startswith('T'):
            for glyph, left in [('O', 4), ('H', 17), ('I', 30)]:
                svg.append(f'<text x="{x0 + left * scale}" y="{y0 + 24}" font-family="sans-serif" font-size="16" fill="#172b32">{glyph}</text>')
        svg.append(f'<text x="{origin_x + 22}" y="{origin_y + 325}" font-family="sans-serif" font-size="14" fill="#384f59">{len(selected)} retained extrusion moves in this view</text>')
    svg.append(f'<text x="22" y="{height - 17}" font-family="sans-serif" font-size="15" fill="#172b32">Parsed linear paths, not a native screenshot or a printed-plastic outline. Source XY translation removed.</text></svg>')
    (PUBLIC / name).write_text('\n'.join(svg))


def main():
    PUBLIC.mkdir(exist_ok=True)
    for source in (ROOT / 'inputs').glob('*.stl'):
        shutil.copyfile(source, PUBLIC / source.name)
    manifest = json.loads((ROOT / 'inputs.json').read_text())
    for entry in manifest['files']:
        entry['file'] = Path(entry['file']).name
    (PUBLIC / 'source-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    figure('lettering-paths.svg', [('T1-C', 2.2, 'Narrow original / Classic'), ('T1-A', 2.2, 'Same bytes / Arachne'), ('T2-C', 2.2, 'Local widening / Classic')])
    figure('relief-paths.svg', [('T2-C', 2.2, '0.60 mm relief'), ('T3-C', 2.2, '0.10 mm / coarse schedule'), ('T3-F', 2.1, '0.10 mm / finer schedule')])
    figure('recess-paths.svg', [('T4-C', 1.8, 'Recessed outlines / Classic')], columns=1)
    figure('mode-paths.svg', [('V1-N', 20, 'Solid source / ordinary'), ('V1-S', 20, 'Solid source / spiral'), ('V2-N', 20, 'Modelled cavity / ordinary'), ('V3-S', 20, 'Branching source / spiral')], columns=2, envelope=(24, 24))
    figure('roof-paths.svg', [('R1', 10, 'Top closure enabled'), ('R2', 10, 'Top count zero'), ('R3', 10, 'Saved ordinary profile restored')], envelope=(30, 30))
    # Every published byte must be free of local account/path information.
    for path in PUBLIC.iterdir():
        if path.suffix in ('.gcode', '.ini', '.json', '.svg'):
            text = path.read_text()
            assert '/Users/' not in text and 'jankidudel' not in text, path.name
    print('Published owned assets and five path-derived figures:', PUBLIC)


if __name__ == '__main__':
    main()
