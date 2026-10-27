"""Run the existing local processor on public controls; never calls a deployed endpoint."""

from pathlib import Path
import hashlib
import json
import subprocess

frontend = Path(__file__).resolve().parents[1]
processor = frontend.parent / "3d-processor"
assembly = processor / "src/Processor/bin/Debug/net10.0/Processor.dll"
cases = [
    ("collection-review/one-placed-cube.3mf", 12, 0, 1, 8000),
    ("collection-review/two-placed-cubes.3mf", 24, 0, 2, None),
    ("english-market-batch/closed-20mm-cube.stl", 12, 0, 1, 8000),
    ("english-market-batch/open-face-cube.stl", 10, 4, 1, None),
    ("export-fidelity/square-hole-8mm.stl", 32, 0, 1, 11360),
]
observations = []
for name, triangles, open_edges, components, volume in cases:
    source = frontend / "public/examples" / name
    run = subprocess.run(["dotnet", str(assembly), str(source), "--json"], capture_output=True, text=True)
    if run.returncode not in (0, 2):
        raise RuntimeError(run.stderr)
    report = json.loads(run.stdout)
    assert report["triangleCount"] == triangles
    assert report["topology"]["openEdgeCount"] == open_edges
    assert report["topology"]["connectedComponentCount"] == components
    assert (report["volume"] is None) if volume is None else abs(report["volume"] - volume) < 1e-7
    observations.append({"file": name, "sha256": hashlib.sha256(source.read_bytes()).hexdigest(), "report": report})
methods = []
for relative in ["src/Processor/Reporting/MeshQualityReportBuilder.cs", "src/Processor/Topology/MeshTopologyAnalyzer.cs"]:
    methods.append({"source": relative, "sha256": hashlib.sha256((processor / relative).read_bytes()).hexdigest()})
record = {
    "observedDate": "2026-10-27",
    "executionPath": "Local ProcessorApplication CLI, the server processor code path; not a deployed endpoint, browser UI or physical test.",
    "processorRevision": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=processor, text=True).strip(),
    "processorSources": methods,
    "reproduction": "dotnet build ../3d-processor/src/Processor/Processor.csproj && python3 scripts/capture-handoff-processor.py",
    "observations": observations,
}
(frontend / "public/examples/file-handoff/processor-observation.json").write_text(json.dumps(record, indent=2) + "\n")
print("Verified five controls through the unchanged local processor.")
