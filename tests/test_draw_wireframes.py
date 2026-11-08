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
    "user-menu.svg",
    "list.svg",
    "view-options.svg",
    "lists.svg",
    "lists-many.svg",
    "lists-find.svg",
    "task-editor.svg",
    "list-editor.svg",
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


def circles(frame):
    """Return the (cx, cy, r) of every circle of a frame."""
    return [(float(c.get("cx")), float(c.get("cy")), float(c.get("r"))) for c in frame.iter(f"{SVG}circle")]


def test_top_bar_ends_with_the_user_button():
    module = load_script()
    for account in ("local", "connected", "expired"):
        frame = module.Frame(module.COMPACT_WIDTH, module.COMPACT_HEIGHT)
        module.top_bar(frame, "All tasks", account)
        root = ET.fromstring(f'<svg xmlns="http://www.w3.org/2000/svg">{frame.svg(0, 0)}</svg>')
        assert (module.COMPACT_WIDTH - 30, 30, 22) in circles(root), account
        assert "⋮" not in [t.text for t in root.iter(f"{SVG}text")]
        labels = [t.text for t in root.iter(f"{SVG}text")]
        assert "Sign in" not in labels
        assert "Local only" not in labels
        assert (
            sum(
                1
                for p in root.iter(f"{SVG}path")
                if p.get("d", "").startswith(f"M {module.COMPACT_WIDTH - 8 - 44 - 44 + 11 + 4:g} ")
            )
            == 1
        ), account


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_navigation_holds_no_recycle_bin_or_settings_entry(output, name):
    # The user menu holds those two; only their own screens and the user menu screen may name them.
    if name in {"recycle-bin.svg", "settings.svg", "user-menu.svg", "import.svg", "sync-log.svg", "connect.svg"}:
        return
    _, groups = frames(output / name)
    for group in groups:
        labels = [t.text for t in group.iter(f"{SVG}text")]
        assert "Recycle bin" not in labels and "Bin" not in labels, name
        assert "Local only" not in labels and "Synced" not in labels, name


def test_lists_float_new_list_and_no_screen_keeps_a_more_button_in_the_top_bar(output):
    _, groups = frames(output / "lists.svg")
    for group in groups:
        labels = [t.text for t in group.iter(f"{SVG}text")]
        assert "+" in labels
        assert "New list" not in labels
        corner = float(group.get("data-width")) - (16 if group.get("data-width") == "390" else 24) - 28
        assert any(abs(cx - corner) < 0.5 and r == 28 for cx, _, r in circles(group))
    for name in SCREENS:
        _, groups = frames(output / name)
        compact_labels = [t.text for t in groups[0].iter(f"{SVG}text")]
        assert "⋮" not in compact_labels, name


def test_import_wireframe_fills_the_compact_main_view_between_the_bars(output):
    _, groups = frames(output / "import.svg")
    compact = groups[0]
    rects = [
        (float(r.get("x")), float(r.get("y")), float(r.get("width")), float(r.get("height")))
        for r in compact.iter(f"{SVG}rect")
    ]
    assert (0.0, 60.0, 390.0, 720.0) in rects
    assert not [r for r in compact.iter(f"{SVG}rect") if r.get("class") == "scrim"]
    labels = [t.text for t in compact.iter(f"{SVG}text")]
    assert "Import backup" in labels and "Tasks" in labels and "Lists" in labels


def test_task_editor_wireframe_has_no_page_level_more_button(output):
    _, groups = frames(output / "task-editor.svg")
    wide = groups[1]
    header_dots = [
        t for t in wide.iter(f"{SVG}text") if t.text == "⋯" and float(t.get("y")) < 80 and float(t.get("x")) > 900
    ]
    assert header_dots == []


def labels_of(group):
    """Return the texts of one frame, in drawing order."""
    return [t.text for t in group.iter(f"{SVG}text")]


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_sidebar_has_no_creation_action(output, name):
    # List creation sits behind the floating plus of the Lists screen (commit 718553e), not in the sidebar.
    _, groups = frames(output / name)
    for group in groups:
        assert "+ New list" not in labels_of(group), name


def test_many_lists_sidebar_fixes_the_header_and_scrolls_only_the_lists(output):
    module = load_script()
    _, (compact, wide) = frames(output / "lists-many.svg")
    labels = labels_of(wide)
    assert labels.count("Find a list") == 2  # the sidebar jump field and the Lists screen field
    assert labels.index("All tasks") < labels.index("Lists") < labels.index("Find a list")
    texts = {t.text: float(t.get("y")) for t in wide.iter(f"{SVG}text") if float(t.get("x")) < module.SIDEBAR_WIDTH}
    assert texts["All tasks"] < texts["Lists"] < texts["Find a list"] < texts["Garden"]
    thumbs = [r for r in wide.iter(f"{SVG}rect") if r.get("class") == "selected" and r.get("width") == "4"]
    assert len(thumbs) == 1, "the sidebar draws one scrollbar thumb"
    assert float(thumbs[0].get("x")) == module.SIDEBAR_WIDTH - 6
    assert "124 lists" in labels_of(compact) and "124 lists" in labels
    assert "Sort: Manual order" in labels


def test_many_lists_rows_end_above_the_pinned_find_bar(output):
    module = load_script()
    _, (compact, _) = frames(output / "lists-many.svg")
    pinned_top = module.COMPACT_HEIGHT - 64 - 88
    rules = [float(line.get("y1")) for line in compact.iter(f"{SVG}line")]
    assert rules and max(rules) <= pinned_top
    assert any(float(r.get("y")) == pinned_top and r.get("width") == "390" for r in compact.iter(f"{SVG}rect"))


def test_find_wireframe_shows_results_and_the_create_offer(output):
    _, (compact, wide) = frames(output / "lists-find.svg")
    compact_labels, wide_labels = labels_of(compact), labels_of(wide)
    assert 'No list matches "Garden shed".' in compact_labels
    assert 'Create list "Garden shed"' in compact_labels
    assert "0 of 124 lists" in compact_labels
    assert "4 of 124 lists · Sorted by Name" in wide_labels
    assert wide_labels.count("Reset") == 1
    assert wide_labels.count("4 of 124") == 1  # the sidebar field counts its own matches
    assert 'Create list "Garden shed"' not in wide_labels
