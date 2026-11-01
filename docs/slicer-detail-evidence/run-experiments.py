"""Execute owned software controls using an explicitly supplied official binary.

No printer communication or deployment. Every attempt retains its exit status,
effective configuration, console output and unmodified G-code when produced.
Published assets are the canonical copies; setup-only output stays temporary.
"""

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent.parent / 'public/examples/slicer-detail'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute(executable, work):
    run_dir = ROOT / 'prusa-2.9.6'
    run_dir.mkdir(exist_ok=True)
    config_dir = work
    PUBLIC.mkdir(parents=True, exist_ok=True)
    subprocess.run([str(executable), '--help'], capture_output=True, text=True, check=True)
    common = [
        '--datadir', '/tmp/inspectmesh-prusa-evidence-settings', '--threads', '2',
        '--nozzle-diameter', '0.4', '--layer-height', '0.2', '--first-layer-height', '0.2',
        '--extrusion-width', '0.45', '--first-layer-extrusion-width', '0.45',
        '--external-perimeter-extrusion-width', '0.45', '--perimeter-extrusion-width', '0.45',
        '--infill-extrusion-width', '0.45', '--solid-infill-extrusion-width', '0.45',
        '--top-infill-extrusion-width', '0.45', '--support-material-extrusion-width', '0.45',
        '--perimeter-generator', 'classic', '--perimeters', '2', '--no-thin-walls',
        '--fill-density', '15%', '--fill-pattern', 'rectilinear',
        '--top-solid-layers', '4', '--bottom-solid-layers', '4',
        '--top-solid-min-thickness', '0', '--bottom-solid-min-thickness', '0',
        '--no-support-material', '--no-spiral-vase', '--no-variable-layer-height',
        '--no-use-relative-e-distances', '--filament-diameter', '1.75',
        '--filament-density', '1.24', '--temperature', '200', '--first-layer-temperature', '200',
        '--bed-temperature', '60', '--first-layer-bed-temperature', '60',
        '--no-cooling', '--skirts', '0', '--brim-width', '0', '--center', '100,100',
    ]
    # Save all effective defaults as well as the explicit settings above.
    baseline = PUBLIC / 'baseline.ini'
    saved = subprocess.run([str(executable), *common, '--save', str(baseline)],
                           capture_output=True, text=True)
    if saved.returncode or not baseline.exists():
        raise RuntimeError('Could not save baseline configuration: ' + saved.stdout + saved.stderr)
    # Downstream commands load this complete profile. Each variant is saved too.
    base = ['--datadir', '/tmp/inspectmesh-prusa-evidence-settings', '--threads', '2',
            '--load', str(baseline), '--center', '100,100']
    spiral = ['--spiral-vase', '--perimeters', '1', '--fill-density', '0%',
              '--top-solid-layers', '0', '--no-support-material']
    matrix = [
        ('smoke-cube', '../../public/examples/english-market-batch/closed-20mm-cube.stl', []),
        ('T1-C', 'T1', []), ('T1-A', 'T1', ['--perimeter-generator', 'arachne']),
        ('T2-C', 'T2', []), ('T3-C', 'T3', []),
        ('T3-F', 'T3', ['--layer-height', '0.1', '--first-layer-height', '0.1']),
        ('T4-C', 'T4', []), ('V1-N', 'V1', []), ('V1-S', 'V1', spiral),
        ('V2-N', 'V2', []), ('V2-S', 'V2', spiral), ('V3-S', 'V3', spiral),
        ('R1', 'R-box', []), ('R2', 'R-box', ['--top-solid-layers', '0']),
        ('R3', 'R-box', []),
    ]
    attempts = []
    for identifier, control, variant in matrix:
        source = ROOT / 'inputs' / f'{control}.stl'
        if identifier == 'smoke-cube':
            source = ROOT.parent.parent / 'public/examples/english-market-batch/closed-20mm-cube.stl'
        config = config_dir / f'{identifier}.ini'
        output = (work if identifier == 'smoke-cube' else PUBLIC) / f'{identifier}.gcode'
        command = [str(executable), *base, *variant, '--save', str(config),
                   '--export-gcode', '--output', str(output), str(source)]
        result = subprocess.run(command, capture_output=True, text=True)
        log = result.stdout + result.stderr
        retained_config = None
        if identifier != 'smoke-cube' and config.exists():
            retained_config = PUBLIC / config.name
            shutil.copyfile(config, retained_config)
        def portable(value):
            return value.replace(str(work), 'WORK').replace(str(ROOT), 'EVIDENCE').replace(str(ROOT.parent.parent), 'REPOSITORY').replace('/tmp/inspectmesh-prusa-evidence-settings', 'TEMP_SETTINGS')
        retained_command = ['PrusaSlicer', *[portable(arg) for arg in command[1:]]]
        attempts.append({
            'run': identifier, 'input': os.path.relpath(source, ROOT),
            'input_sha256': digest(source), 'command': retained_command,
            'observed_at': datetime.now(timezone.utc).isoformat(), 'exit_status': result.returncode,
            'configuration': os.path.relpath(retained_config, ROOT) if retained_config else None, 'configuration_sha256': digest(config) if config.exists() else None,
            'output': os.path.relpath(output, ROOT) if output.exists() and identifier != 'smoke-cube' else None,
            'output_sha256': digest(output) if output.exists() else None,
            'output_bytes': output.stat().st_size if output.exists() else None,
            'console_output': portable(log),
            'retention': 'Setup smoke test; temporary output discarded.' if identifier == 'smoke-cube' else 'Canonical public asset',
            'warnings': [line for line in log.splitlines() if 'warn' in line.lower() or 'error' in line.lower()],
        })
        print(identifier, 'exit', result.returncode, 'output', output.stat().st_size if output.exists() else 'absent', flush=True)
        if identifier == 'smoke-cube' and (result.returncode or not output.exists()):
            raise RuntimeError('Smoke control failed; fixed comparisons not attempted')
    manifest_path = run_dir / 'runs.json'
    prior = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest_path.write_text(json.dumps({
        **{key: value for key, value in prior.items() if key.startswith('project_')},
        'application': 'PrusaSlicer 2.9.6', 'executable_sha256': digest(executable),
        'release_url': 'https://github.com/prusa3d/PrusaSlicer/releases/tag/version_2.9.6',
        'release_asset': 'PrusaSlicer-2.9.6.dmg',
        'release_sha256': '94fd7b8a9f87c9631e1c71739b15b184fc5f4c0ceabd69072f1c78f229a4fe40',
        'profile_basis': 'Complete saved CLI profile; no named printer or physical test',
        'runs': attempts,
    }, indent=2) + '\n')


def main():
    executable = Path(sys.argv[1]).resolve(strict=True)
    with TemporaryDirectory(prefix='inspectmesh-slicer-') as directory:
        execute(executable, Path(directory))


if __name__ == '__main__':
    main()
