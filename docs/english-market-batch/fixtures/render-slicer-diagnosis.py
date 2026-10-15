"""Draw selected, measured G-code layers as small public SVG comparisons."""

from pathlib import Path
import re
from xml.sax.saxutils import escape

BASE = Path(__file__).resolve().parent
GCODE = BASE / "slicer-diagnosis"
OUT = Path(__file__).resolve().parents[3] / "public/examples/slicer-diagnosis"


def segments(name, layer):
    x = y = e = z = 0.0
    kind = ""
    found = []
    for line in (GCODE / f"{name}.gcode").read_text().splitlines():
        if line.startswith(";Z:"):
            z = float(line[3:])
            continue
        if line.startswith(";TYPE:"):
            kind = line[6:]
            continue
        if line.startswith("G92 E"):
            e = float(line[5:].split()[0])
            continue
        if not line.startswith(("G0 ", "G1 ")):
            continue
        params = {key: float(value) for key, value in re.findall(
            r"([XYE])(-?\d+(?:\.\d+)?)", line
        )}
        nx, ny, ne = params.get("X", x), params.get("Y", y), params.get("E", e)
        if abs(z - layer) < 0.0001 and ne > e + 1e-8 and kind not in ("Skirt/Brim", "Custom"):
            found.append((x, y, nx, ny, kind))
        x, y, e = nx, ny, ne
    return found


def panel(name, label, layer, xoff):
    lines = [f'<text x="{xoff+130}" y="38" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#183247">{escape(label)}</text>']
    lines.append(f'<rect x="{xoff+30}" y="55" width="200" height="200" fill="white" stroke="#94a3b8"/>')
    for x0, y0, x1, y1, kind in segments(name, layer):
        # The files were sliced into a 200 x 200 mm default bed with model near (100,100).
        color = "#dc2626" if kind.startswith("Support") else "#164e63"
        lines.append(
            f'<line x1="{xoff+30+(x0-80)*5:.2f}" y1="{255-(y0-80)*5:.2f}" '
            f'x2="{xoff+30+(x1-80)*5:.2f}" y2="{255-(y1-80)*5:.2f}" '
            f'stroke="{color}" stroke-width="1.2" stroke-linecap="round"/>'
        )
    return "".join(lines)


def svg(name, title, panels, layer):
    width = len(panels) * 260
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 290" role="img">',
             f'<title>{escape(title)}</title>',
             f'<rect width="{width}" height="290" fill="#f8fafc"/>']
    for i, (source, label) in enumerate(panels):
        parts.append(panel(source, label, layer, i * 260))
    parts += [f'<text x="20" y="281" font-family="Arial, sans-serif" font-size="13" fill="#345">Z={layer} mm. Blue: model; red: support. Travel hidden.</text>', '</svg>']
    (OUT / name).write_text("".join(parts))


svg("overhang-layer.svg", "Support paths below an integral overhang", [
    ("integral-overhang-no-support", "Supports off"),
    ("integral-overhang-support", "Supports on"),
], 5.2)
svg("channel-layer.svg", "A through-channel compared with capped and overlapping solids", [
    ("open-through-channel", "Open passage"),
    ("capped-channel", "Solid cap"),
    ("overlapping-channel", "Overlap"),
], 0.2)
