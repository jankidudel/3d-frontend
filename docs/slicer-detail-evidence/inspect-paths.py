"""Bounded reader for the retained linear PrusaSlicer controls, not firmware.

Reject unsupported motion/state commands. Track absolute/relative XYZ and E,
resets, retraction debt, complete crossing segments, feature type and Z.
Reported paths are centrelines, not a deposited-plastic outline or readability.
"""

from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent.parent / 'public/examples/slicer-detail'
ALLOWED_M = {73, 82, 83, 84, 104, 106, 107, 109, 140, 190, 201, 203, 204, 205, 221, 900}


def parse(text):
    position = {axis: None for axis in 'XYZ'}
    absolute, e_absolute, extrusion, debt = True, True, 0.0, 0.0
    feature, layer = 'Custom', None
    segments = []
    for number, raw in enumerate(text.splitlines(), 1):
        if raw.startswith(';TYPE:'):
            feature = raw.split(':', 1)[1].strip()
        if raw.startswith(';Z:'):
            layer = float(raw.split(':', 1)[1])
        code = raw.split(';', 1)[0].strip()
        if not code:
            continue
        match = re.fullmatch(r'([GMT])(\d+)\s*(.*)', code)
        if not match:
            raise ValueError(f'Unsupported statement at {number}: {code}')
        family, opcode, arguments = match.group(1), int(match.group(2)), match.group(3)
        tokens = r'([A-Z])\s*(-?\d*\.?\d+(?:[eE][-+]?\d+)?)'
        values = {a: float(v) for a, v in re.findall(tokens, arguments)}
        if re.sub(tokens, '', arguments).strip() or not all(math.isfinite(v) for v in values.values()):
            raise ValueError(f'Malformed arguments at {number}')
        if family == 'M':
            if opcode not in ALLOWED_M:
                raise ValueError(f'Unsupported M state at {number}: {code}')
            if opcode in (82, 83):
                e_absolute = opcode == 82
            if opcode == 221 and values.get('S', 100) != 100:
                raise ValueError('Non-default flow is outside this path-presence reader')
            continue
        if family == 'T':
            if opcode != 0:
                raise ValueError('Multiple tools unsupported')
            continue
        if opcode in (90, 91):
            absolute = opcode == 90
            continue
        if opcode == 21:
            continue
        if opcode == 28:
            position = {axis: None for axis in 'XYZ'}
            continue
        if opcode == 92:
            for axis in 'XYZ':
                if axis in values:
                    position[axis] = values[axis]
            if 'E' in values:
                extrusion = values['E']
            continue
        if opcode not in (0, 1):
            raise ValueError(f'Unsupported G state at {number}: {code}')
        if set(values) - set('XYZEF'):
            raise ValueError('Unsupported motion axis')
        previous = dict(position)
        for axis in 'XYZ':
            if axis in values:
                if not absolute and position[axis] is None:
                    raise ValueError('Relative movement from unknown coordinate')
                position[axis] = values[axis] if absolute else position[axis] + values[axis]
        delta, deposition_start_fraction = 0, 0.0
        if 'E' in values:
            delta = values['E'] - extrusion if e_absolute else values['E']
            extrusion = values['E'] if e_absolute else extrusion + values['E']
        if delta < 0:
            debt -= delta
        elif delta > 0:
            paid = min(debt, delta)
            deposition_start_fraction = paid / delta
            debt -= paid
            delta -= paid
        if delta > 1e-7 and any(axis in values for axis in 'XY') and not all(v is not None for v in (*previous.values(), *position.values())):
            raise ValueError('Depositing movement with unresolved coordinates')
        if delta > 1e-7 and all(v is not None for v in (*previous.values(), *position.values())):
            start, end = [previous[a] for a in 'XYZ'], [position[a] for a in 'XYZ']
            if deposition_start_fraction:
                start = [a + (b - a) * deposition_start_fraction for a, b in zip(start, end)]
            if start[:2] != end[:2]:
                segments.append({'line': number, 'start': start, 'end': end,
                                 'extrusion': delta, 'feature': feature, 'layer': layer})
    return segments


def intersects(segment, rect):
    """Liang-Barsky intersection, including segments crossing without endpoints inside."""
    start, end = segment['start'], segment['end']
    lower, upper = 0.0, 1.0
    for axis, minimum, maximum in ((0, rect[0], rect[2]), (1, rect[1], rect[3])):
        delta = end[axis] - start[axis]
        if delta == 0:
            if start[axis] < minimum or start[axis] > maximum:
                return False
        else:
            a, b = sorted(((minimum - start[axis]) / delta, (maximum - start[axis]) / delta))
            lower, upper = max(lower, a), min(upper, b)
            if lower > upper:
                return False
    return upper > lower


def observe(path, run_name=None):
    file_name = f'{run_name}.gcode' if run_name else path.name
    text = path.read_text()
    segments = parse(text)
    # Slicer centres each source envelope at 100,100; do not compare untransformed source XY.
    offset = (80, 88) if file_name.startswith('T') else ((85, 85) if file_name.startswith(('R', 'P')) else (88, 88))
    def rect(r):
        return [r[0] + offset[0], r[1] + offset[1], r[2] + offset[0], r[3] + offset[1]]
    glyphs = {'O': [4, 6, 10, 18], 'H': [17, 6, 23, 18], 'I': [30, 6, 30.8, 18]}
    observations = {}
    for name, region in glyphs.items():
        selected = [s for s in segments if s['end'][2] > 2.00001 and intersects(s, rect(region))]
        observations[name] = {'positive_move_count': len(selected),
                              'deposition_z': sorted({s['end'][2] for s in selected})}
    slots = {'O-left': [4.04, 7, 4.21, 17], 'H-left': [17.05, 7, 17.4, 11.5],
             'I': [30.1, 7, 30.7, 17], 'O-counter': [4.5, 7, 9.5, 17]}
    recessed = {name: {str(z): sum(1 for s in segments if s['end'][2] == z and intersects(s, rect(region)))
                      for z in (1.6, 1.8, 2.0)} for name, region in slots.items()}
    top = [s for s in segments if s['feature'] == 'Top solid infill']
    spiral = [s for s in segments if min(s['start'][2], s['end'][2]) > 1]
    positive_spiral = [s for s in spiral if s['end'][2] > s['start'][2]]
    totals = dict(re.findall(r'^; (filament used \[[^\]]+\]|estimated printing time \(normal mode\)) = (.+)$', text, re.M))
    upper = [s for s in segments if min(s['start'][2], s['end'][2]) > 20]
    upper_bounds = ({'min': [min(s[k][a] for s in upper for k in ('start', 'end')) for a in range(3)],
                     'max': [max(s[k][a] for s in upper for k in ('start', 'end')) for a in range(3)]} if upper else None)
    return {'file': file_name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'model_move_count': len(segments), 'extrusion_bounds_above_z20': upper_bounds, 'source_to_output_xy_offset_mm': offset,
            'feature_counts': dict(Counter(s['feature'] for s in segments)),
            'top_solid_z': sorted({s['end'][2] for s in top}),
            'upper_roof_solid_z': sorted({s['end'][2] for s in segments if s['end'][2] > 8 and s['feature'] in ('Solid infill', 'Top solid infill')}),
            'glyph_regions_above_plaque': observations if file_name.startswith('T') else None,
            'recess_slot_crossings_by_deposition_z': recessed if file_name.startswith('T4') else None,
            'intertower_void_crossings_above_z10': sum(1 for s in segments if min(s['start'][2], s['end'][2]) > 10 and intersects(s, rect([8.2, 0.1, 15.8, 23.9]))) if file_name.startswith('V3') else None,
            'extruding_moves_above_z1': len(spiral), 'rising_z_moves_above_z1': len(positive_spiral),
            'declared_totals': totals}


def main():
    manifest = json.loads((ROOT / 'prusa-2.9.6/runs.json').read_text())
    outputs = {entry['run']: ROOT / entry['output'] for entry in manifest['runs'] if entry['output']}
    outputs.update({name: ROOT / path for name, path in manifest['project_outputs'].items()})
    rows = [observe(path, name) for name, path in sorted(outputs.items())]
    (PUBLIC / 'path-observations.json').write_text(json.dumps({
        'method': 'Bounded linear path reader; complete XY segment intersections, extrusion state/debt, feature and actual deposition Z',
        'limitations': 'Region presence does not prove complete stroke tracing or printed readability. Native display state and physical results are separate.',
        'comparisons': {'V1-S_vs_V2-S_coordinate_paths_equal':
            [(s['start'], s['end']) for s in parse((PUBLIC / 'V1-S.gcode').read_text())] ==
            [(s['start'], s['end']) for s in parse((PUBLIC / 'V2-S.gcode').read_text())]},
        'runs': rows,
    }, indent=2) + '\n')
    for row in rows:
        print(row['file'], 'top Z', row['top_solid_z'], 'glyphs', row['glyph_regions_above_plaque'])


if __name__ == '__main__':
    main()
