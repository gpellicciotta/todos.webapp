"""Tests for scripts/draw-wireframes.py, which draws the UI wireframes as SVG files."""

import importlib.util
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "draw-wireframes.py"
SVG = "{http://www.w3.org/2000/svg}"
SCREENS = {
    "first-launch.svg",
    "all-tasks.svg",
    "list.svg",
    "lists.svg",
    "task-editor.svg",
    "list-editor.svg",
    "sharing.svg",
    "recycle-bin.svg",
    "settings.svg",
    "sync-log.svg",
    "connect.svg",
    "import.svg",
}
GRAY = re.compile(r"^#([0-9a-f]{2})\1\1$")


def load_script():
    """Import the kebab-case script as a module."""
    spec = importlib.util.spec_from_file_location("draw_wireframes", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def output(tmp_path_factory):
    """Run the script once into a temporary directory and return that directory."""
    out = tmp_path_factory.mktemp("ui")
    subprocess.run([sys.executable, str(SCRIPT), str(out)], check=True)
    return out


def frames(path):
    """Return the parsed root and the frame groups of one SVG file."""
    root = ET.parse(path).getroot()
    return root, [g for g in root.iter(f"{SVG}g") if g.get("class") == "frame"]


def bounds(element, text_width):
    """Return the (left, top, right, bottom) box of a rect, circle, line, or text element."""
    tag = element.tag.removeprefix(SVG)

    def num(name):
        return float(element.get(name, 0))

    if tag == "rect":
        return num("x"), num("y"), num("x") + num("width"), num("y") + num("height")
    if tag == "circle":
        r = num("r")
        return num("cx") - r, num("cy") - r, num("cx") + r, num("cy") + r
    if tag == "line":
        return (
            min(num("x1"), num("x2")),
            min(num("y1"), num("y2")),
            max(num("x1"), num("x2")),
            max(num("y1"), num("y2")),
        )
    if tag == "text":
        size = float(element.get("font-size"))
        width = text_width(element.text or "", size)
        x = num("x")
        left = {"start": x, "middle": x - width / 2, "end": x - width}[element.get("text-anchor", "start")]
        return left, num("y") - size, left + width, num("y")
    return None


def test_writes_every_screen(output):
    assert {p.name for p in output.iterdir()} == SCREENS


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_has_background_and_two_labeled_frames(output, name):
    root, groups = frames(output / name)
    background = root.find(f"{SVG}rect")
    assert background.get("fill") == "#ffffff"
    assert [g.get("data-width") for g in groups] == ["390", "1440"]
    labels = [t.text for t in root.findall(f"{SVG}text")]
    assert "Compact · 390 px" in labels
    assert "Wide · 1440 px" in labels


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_shapes_stay_inside_their_frame(output, name):
    text_width = load_script().text_width
    _, groups = frames(output / name)
    for group in groups:
        width, height = float(group.get("data-width")), float(group.get("data-height"))
        for element in group.iter():
            box = bounds(element, text_width)
            if box is None:
                continue
            left, top, right, bottom = box
            label = f"{element.tag.removeprefix(SVG)} {element.text or element.attrib}"
            assert left >= 0 and top >= 0, f"{name}: {label} starts outside the {width:.0f} px frame"
            assert right <= width and bottom <= height, f"{name}: {label} ends outside the {width:.0f} px frame"


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_uses_only_gray_colors(output, name):
    root, _ = frames(output / name)
    style = " ".join(s.text or "" for s in root.iter(f"{SVG}style"))
    colors = re.findall(r"#[0-9a-fA-F]{3,6}\b", style)
    for element in root.iter():
        colors += [element.get(a) for a in ("fill", "stroke") if element.get(a, "").startswith("#")]
    assert colors
    for color in colors:
        assert GRAY.match(color.lower()), f"{name}: {color} is not a gray"


def test_output_is_reproducible(output, tmp_path):
    subprocess.run([sys.executable, str(SCRIPT), str(tmp_path)], check=True)
    for path in output.iterdir():
        assert (tmp_path / path.name).read_bytes() == path.read_bytes()
