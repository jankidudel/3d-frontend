"""Controlled Prusa-format project packages, actually reopened by the CLI.

The native geometry archive comes from the official exporter. This script adds
the saved full print profile and one explicit object override. It is not a
recording of GUI Save Project or a cross-application portability experiment.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import os
from tempfile import TemporaryDirectory
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT.parent.parent / 'public/examples/slicer-detail'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def execute(executable, work):
    directory = ROOT / 'prusa-2.9.6'
    directory.mkdir(exist_ok=True)
    baseline = PUBLIC / 'baseline.ini'
    seed = work / 'geometry-seed.3mf'
    console = {}
    output_files = {}
    result = subprocess.run([str(executable), '--load', str(baseline), '--center', '100,100',
                             '--export-3mf', '--output', str(seed), str(ROOT / 'inputs/R-box.stl')],
                            capture_output=True, text=True, check=True)
    console['seed-export'] = result.stdout + result.stderr
    with zipfile.ZipFile(seed) as archive:
        source = {name: archive.read(name) for name in archive.namelist()}
    config_text = '\n'.join('; ' + line for line in baseline.read_text().splitlines()
                            if line and not line.startswith('#')) + '\n'
    observations = []
    for identifier, top_layers in [('P-roof', 4), ('P-open', 0)]:
        contents = dict(source)
        object_config = ET.fromstring(contents['Metadata/Slic3r_PE_model.config'])
        obj = object_config.find('object')
        ET.SubElement(obj, 'metadata', {'type': 'object', 'key': 'top_solid_layers', 'value': str(top_layers)})
        for volume in obj.findall('volume'):
            for element in list(volume):
                if element.tag == 'metadata' and element.get('key') == 'source_file':
                    volume.remove(element)
        contents['Metadata/Slic3r_PE_model.config'] = ET.tostring(object_config, encoding='utf-8', xml_declaration=True)
        contents['Metadata/Slic3r_PE.config'] = config_text.encode()
        path = PUBLIC / f'{identifier}.3mf'
        with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as archive:
            for name, data in contents.items():
                archive.writestr(zipfile.ZipInfo(name, (1980, 1, 1, 0, 0, 0)), data,
                                 compress_type=zipfile.ZIP_DEFLATED)
        output = directory / f'{identifier}.gcode'
        command = [str(executable), '--datadir', '/tmp/inspectmesh-prusa-evidence-settings',
                   '--export-gcode', '--dont-arrange', '--output', str(output), str(path)]
        run = subprocess.run(command, capture_output=True, text=True)
        console[f'{identifier}-reopen'] = run.stdout + run.stderr
        output_files[identifier] = os.path.relpath(output, ROOT)
        observations.append({'project': identifier, 'sha256': sha(path), 'global_top_layers': 4,
                             'object_top_layers': top_layers, 'exit_status': run.returncode,
                             'gcode_sha256': sha(output) if output.exists() else None,
                             'observed_at': datetime.now(timezone.utc).isoformat()})
        print(identifier, run.returncode, output.exists(), flush=True)
    # Official export of the actual model geometry from the project, then fresh-profile slicing.
    derivative = PUBLIC / 'P-open-geometry.stl'
    run = subprocess.run([str(executable), '--export-stl', '--dont-arrange', '--output', str(derivative),
                          str(PUBLIC / 'P-open.3mf')], capture_output=True, text=True, check=True)
    console['geometry-export'] = run.stdout + run.stderr
    output = work / 'P-fresh.gcode'
    run = subprocess.run([str(executable), '--load', str(baseline), '--export-gcode', '--dont-arrange',
                          '--output', str(output), str(derivative)], capture_output=True, text=True, check=True)
    console['fresh-baseline'] = run.stdout + run.stderr
    # Reuse an identical retained export; preserve a separate file only if it differs.
    roof_output = directory / 'P-roof.gcode'
    if output.read_bytes() == roof_output.read_bytes():
        output_files['P-fresh'] = os.path.relpath(roof_output, ROOT)
    else:
        retained = directory / 'P-fresh.gcode'
        retained.write_bytes(output.read_bytes())
        output_files['P-fresh'] = os.path.relpath(retained, ROOT)
    (PUBLIC / 'project-observations.json').write_text(json.dumps({
        'method': 'Official CLI geometry export plus explicitly constructed native-format settings/override archives; actual CLI reopen/reslice, not GUI Save Project',
        'application': 'PrusaSlicer 2.9.6', 'projects': observations,
        'derivative_sha256': sha(derivative), 'fresh_output_sha256': sha(output),
        'native_ui_observation': 'Not recorded; CLI project-reader operations only. Appearance and cross-slicer receiving remain untested.',
    }, indent=2) + '\n')

    manifest_path = directory / 'runs.json'
    manifest = json.loads(manifest_path.read_text())
    manifest['project_outputs'] = output_files
    manifest['project_console_output'] = {
        name: text.replace(str(work), 'WORK').replace(str(ROOT), 'EVIDENCE').replace(str(ROOT.parent.parent), 'REPOSITORY')
        for name, text in console.items()
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')


def main():
    executable = Path(sys.argv[1]).resolve(strict=True)
    with TemporaryDirectory(prefix='inspectmesh-project-') as directory:
        execute(executable, Path(directory))


if __name__ == '__main__':
    main()
