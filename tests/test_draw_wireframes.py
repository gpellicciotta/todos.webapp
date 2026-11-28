"""Tests for scripts/draw-wireframes.py, which draws the UI wireframes as SVG files."""

import importlib.util
import itertools
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
    "task-editor-notes.svg",
    "task-editor-configuration.svg",
    "task-editor-history.svg",
    "quick-log.svg",
    "list-editor.svg",
    "recycle-bin.svg",
    "settings.svg",
    "help.svg",
    "sync-log.svg",
    "connect.svg",
    "import.svg",
    "nav-rail.svg",
}
COMMITTED = ROOT / "docs" / "img" / "ui"
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


def test_output_matches_the_committed_wireframes(output):
    # Git may check the SVG files out with CRLF line ends, so compare with LF line ends.
    assert {p.name for p in COMMITTED.glob("*.svg")} == SCREENS
    for path in output.iterdir():
        committed = (COMMITTED / path.name).read_bytes().replace(b"\r\n", b"\n")
        assert committed == path.read_bytes(), f"{path.name} is stale; rerun the script into docs/img/ui"


def nav_toggles(frame):
    """Return the 44 px nav toggle buttons drawn at the start of a frame's top row."""
    module = load_script()
    x, y = module.NAV_TOGGLE
    return [
        r
        for r in frame.iter(f"{SVG}rect")
        if r.get("class") == "control"
        and (float(r.get("x")), float(r.get("y")), float(r.get("width")), float(r.get("height"))) == (x, y, 44, 44)
    ]


def glyph_lines(frame, left, top, right, bottom):
    """Return the horizontal glyph lines, paths of the form `M x y H x2`, that lie inside a box."""
    lines = []
    for p in frame.iter(f"{SVG}path"):
        match = re.fullmatch(r"M (\S+) (\S+) H (\S+)", p.get("d", ""))
        if match:
            x1, y, x2 = map(float, match.groups())
            if left < min(x1, x2) and max(x1, x2) < right and top < y < bottom:
                lines.append((x1, y, x2))
    return lines


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_every_wide_frame_starts_with_the_nav_toggle(output, name):
    # Below 64rem the bottom bar navigates and the toggle is hidden, so only the wide frame draws it.
    x, y = load_script().NAV_TOGGLE
    _, (compact, wide) = frames(output / name)
    assert len(nav_toggles(wide)) == 1, name
    assert len(glyph_lines(wide, x, y, x + 44, y + 44)) == 3, f"{name}: the toggle draws a three-line glyph"
    assert not nav_toggles(compact), name
    title = [t for t in wide.iter(f"{SVG}text") if t.get("font-size") == "28"]
    assert title and all(float(t.get("x")) > x + 44 for t in title), name


def test_nav_rail_shows_glyphs_monograms_and_one_hovered_label(output):
    module = load_script()
    root, (compact, wide) = frames(output / "nav-rail.svg")
    rail = module.RAIL_WIDTH
    bars = [r for r in wide.iter(f"{SVG}rect") if r.get("class") == "bar" and r.get("x") == "0" and r.get("y") == "0"]
    assert [float(r.get("width")) for r in bars] == [rail]
    rail_texts = [t.text for t in wide.iter(f"{SVG}text") if float(t.get("x")) < rail]
    assert rail_texts == [name[0].upper() for name, _ in module.LISTS], "the rail holds only list monograms"
    assert "ToDo's" not in labels_of(wide)
    current = [r for r in wide.iter(f"{SVG}rect") if r.get("class") == "selected" and float(r.get("x")) < rail]
    assert len(current) == 1, "the rail marks All tasks as the current destination"
    glyphs = [p for p in wide.iter(f"{SVG}path") if bounds_of_path(p) and bounds_of_path(p)[2] < rail]
    assert len(glyphs) >= 3 + 2, "the rail draws the toggle glyph and the two destination glyphs"
    tooltips = [r for r in wide.iter(f"{SVG}rect") if r.get("class") == "tooltip"]
    assert len(tooltips) == 1
    left, top, right, bottom = bounds(tooltips[0], module.text_width)
    assert left >= rail
    inside = [
        t.text
        for t in wide.iter(f"{SVG}text")
        if left <= float(t.get("x")) <= right and top <= float(t.get("y")) <= bottom
    ]
    assert len(inside) == 1 and inside[0] in {name for name, _ in module.LISTS}
    title = [t for t in wide.iter(f"{SVG}text") if t.text == "All tasks" and t.get("font-size") == "28"]
    assert [float(t.get("x")) for t in title] == [rail + 40], "the main column widens into the room the rail frees"
    assert "Tasks" in labels_of(compact) and "Lists" in labels_of(compact)
    caption = [t.text for t in root.findall(f"{SVG}text") if t.get("y") == "72"]
    assert "hides" in caption[0], "the caption names the hidden state"


def bounds_of_path(path):
    """Return the (left, top, right, bottom) box of a path of absolute M, L, H, V, and Q commands, else None."""
    tokens = re.findall(r"[A-Za-z]|-?\d+(?:\.\d+)?", path.get("d", ""))
    if any(t.isalpha() and t not in "MLHVQZ" for t in tokens):
        return None
    xs, ys, command, index = [], [], None, 0
    for token in tokens:
        if token.isalpha():
            command, index = token, 0
            continue
        value = float(token)
        if command in "Hh":
            xs.append(value)
        elif command in "Vv":
            ys.append(value)
        else:
            (xs if index % 2 == 0 else ys).append(value)
            index += 1
    if not xs or not ys:
        return None
    return min(xs), min(ys), max(xs), max(ys)


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
    if name in {
        "recycle-bin.svg",
        "settings.svg",
        "help.svg",
        "user-menu.svg",
        "import.svg",
        "sync-log.svg",
        "connect.svg",
    }:
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


@pytest.mark.parametrize("name", ["all-tasks.svg", "list.svg", "user-menu.svg", "nav-rail.svg"])
def test_compact_task_screens_draw_the_view_actions_button_in_the_top_bar(output, name):
    _, (compact, _) = frames(output / name)
    dots = [(cx, cy) for cx, cy, r in circles(compact) if r == 2 and cy < 60]
    assert len(dots) == 3 and len({cx for cx, _ in dots}) == 1, name
    assert "⋯" not in [t.text for t in compact.iter(f"{SVG}text") if float(t.get("y")) < 140], name


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


EDITOR_SCREENS = [
    "task-editor.svg",
    "task-editor-notes.svg",
    "task-editor-configuration.svg",
    "task-editor-history.svg",
]
TABS = ["Status", "Notes", "Configuration", "History"]


def tab_texts(group):
    """Return the tab strip texts of an editor frame, keyed by name, from the row that holds all four tabs."""
    rows = {}
    for t in group.iter(f"{SVG}text"):
        if t.text in TABS:
            rows.setdefault(t.get("y"), {})[t.text] = t
    return next(row for row in rows.values() if set(row) == set(TABS))


def ys_of(group, wide):
    """Return the baseline of each text of a frame, keeping only the editor panel's texts on the wide frame."""
    module = load_script()
    return {
        t.text: float(t.get("y"))
        for t in group.iter(f"{SVG}text")
        if not wide or float(t.get("x")) >= module.EDITOR_LEFT
    }


@pytest.mark.parametrize("name", EDITOR_SCREENS)
def test_task_editor_has_four_tabs_in_order_and_the_row_has_no_more_button(output, name):
    _, groups = frames(output / name)
    for group in groups:
        tabs = tab_texts(group)
        xs = [float(tabs[n].get("x")) for n in TABS]
        assert xs == sorted(xs)
        assert "Content" not in labels_of(group)
        assert "⋯" not in [
            t.text for t in group.iter(f"{SVG}text") if float(t.get("y")) < 140 and float(t.get("x")) > 1000
        ]
    _, (_, wide) = frames(output / "all-tasks.svg")
    assert not [
        t for t in wide.iter(f"{SVG}text") if t.text == "⋯" and float(t.get("x")) < 1100 and float(t.get("y")) > 150
    ]


@pytest.mark.parametrize("name, current", list(zip(EDITOR_SCREENS, TABS)))
def test_each_editor_screen_underlines_its_own_tab(output, name, current):
    _, groups = frames(output / name)
    for group in groups:
        tabs = tab_texts(group)
        y = float(tabs["Status"].get("y"))
        underlines = [
            r
            for r in group.iter(f"{SVG}rect")
            if r.get("class") == "primary" and r.get("height") == "3" and y < float(r.get("y")) < y + 24
        ]
        assert len(underlines) == 1, name
        left = float(underlines[0].get("x"))
        right = left + float(underlines[0].get("width"))
        assert left <= float(tabs[current].get("x")) <= right, f"{name}: {current} is not underlined"


def test_status_tab_shows_the_status_read_only_with_progress_log_and_entries(output):
    _, groups = frames(output / "task-editor.svg")
    for wide, group in enumerate(groups):
        ys = ys_of(group, wide)
        order = ["In progress, not on track", "1,720 of max 1,600 kcal", "Log", "Today's entries · 4"]
        assert [ys[k] for k in order] == sorted(ys[k] for k in order)
        assert "Undo" in ys and "Amount" in ys
        for gone in ["Ready", "To do", "Cancelled", "Lists", "Delete task", "Description", "Add or search notes"]:
            assert gone not in ys, f"{gone} belongs to another tab"


def test_notes_tab_holds_only_the_notes(output):
    _, groups = frames(output / "task-editor-notes.svg")
    for wide, group in enumerate(groups):
        ys = ys_of(group, wide)
        assert "Add or search notes" in ys
        for gone in ["Description", "Lists", "Delete task", "Log"]:
            assert gone not in ys, gone


def test_configuration_tab_orders_its_parts_and_ends_with_the_danger_zone(output):
    _, groups = frames(output / "task-editor-configuration.svg")
    for wide, group in enumerate(groups):
        ys = ys_of(group, wide)
        order = ["Description", "Lists", "Goal", "Recurrence", "Time window", "Danger zone"]
        assert [ys[k] for k in order] == sorted(ys[k] for k in order)
        assert ys["Cancel task"] > ys["Danger zone"] and ys["Delete task"] > ys["Danger zone"]
        for choice in ["Check", "At least", "At most", "Measure", "Target", "Never", "Year"]:
            assert choice in ys, choice
        assert "Repeat" not in ys and "Target count" not in ys
        rules = [
            float(line.get("y1"))
            for line in group.iter(f"{SVG}line")
            if line.get("class") == "rule"
            and float(line.get("y1")) > 140
            and float(line.get("x2")) - float(line.get("x1")) > 300
        ]
        for upper, lower in itertools.pairwise(order):
            assert any(ys[upper] < r < ys[lower] for r in rules), f"no rule between {upper} and {lower}"


@pytest.mark.parametrize(
    "name, labels, buttons",
    [
        ("task-editor.svg", ["Amount", "Label (optional)"], ["Log", "Undo"]),
        ("task-editor-notes.svg", ["Add note"], ["Add note"]),
        (
            "task-editor-configuration.svg",
            ["Description", "Lists", "Goal", "Measure", "Target", "Recurrence", "Every", "Timezone"],
            ["Delete task"],
        ),
    ],
)
def test_editor_tabs_put_labels_left_of_a_right_hand_column(output, name, labels, buttons):
    _, groups = frames(output / name)
    module = load_script()
    for wide, group in enumerate(groups):
        left = module.EDITOR_LEFT + 24 if wide else 16
        right = module.WIDE_WIDTH - 24 if wide else module.COMPACT_WIDTH - 16
        texts = [t for t in group.iter(f"{SVG}text") if float(t.get("x")) >= left]
        classes = {"control", "chip", "primary"}
        controls = [bounds(r, None) for r in group.iter(f"{SVG}rect") if r.get("class") in classes]
        for label in labels:
            text = next((t for t in texts if t.text == label and float(t.get("x")) == left), None)
            assert text is not None, f"{label} does not start the row"
            beside = [b for b in controls if b[0] > left and b[1] <= float(text.get("y")) <= b[3]]
            assert beside and max(b[2] for b in beside) == right, label
        for button in buttons:
            centers = [
                (float(t.get("x")), float(t.get("y")))
                for t in texts
                if t.text == button and t.get("text-anchor") == "middle"
            ]
            assert centers, button
            for x, y in centers:
                around = [b for b in controls if b[0] <= x <= b[2] and b[1] <= y <= b[3]]
                assert [b[2] for b in around] == [right], button


def test_history_tab_lists_entries_undos_and_verdicts(output):
    _, groups = frames(output / "task-editor-history.svg")
    for wide, group in enumerate(groups):
        texts = " ".join(ys_of(group, wide))
        assert "logged" in texts and "undid" in texts and "Failed" in texts


def test_history_tab_shows_details_first_then_two_tables_with_load_more(output):
    _, groups = frames(output / "task-editor-history.svg")
    for wide, group in enumerate(groups):
        ys = ys_of(group, wide)
        assert ys["Details"] < ys["Occurrences"] < ys["Events"], wide
        for heading in ["Period", "Status", "Progress"]:
            assert ys["Occurrences"] < ys[heading] < ys["Events"], heading
        assert ys["Events"] < ys["When"]
        assert ys["Occurrences"] < ys["Load more occurrences"] < ys["Events"] < ys["Load more events"]


@pytest.mark.parametrize(
    ("name", "description"),
    [("task-editor.svg", "Calories"), ("task-editor-configuration.svg", "Sport"), ("task-editor-history.svg", "Calories")],
)
def test_editor_wireframes_show_the_description_above_the_tabs(output, name, description):
    _, groups = frames(output / name)
    for wide, group in enumerate(groups):
        headings = [t for t in group.iter(f"{SVG}text") if t.text == description and t.get("font-size") == "17"]
        assert len(headings) == 1, (name, wide)
        assert float(headings[0].get("y")) < float(tab_texts(group)["Status"].get("y")), (name, wide)


def brace_of(group):
    """Return the tip (x, y) and the box of the one curly brace of a frame; the tip is its point with the largest x."""
    braces = [p for p in group.iter(f"{SVG}path") if "Q" in p.get("d", "") and p.get("class") == "icon-line-open"]
    assert len(braces) == 1
    numbers = [float(n) for n in re.findall(r"-?\d+(?:\.\d+)?", braces[0].get("d"))]
    points = list(zip(numbers[0::2], numbers[1::2]))
    return max(points), bounds_of_path(braces[0])


def test_view_options_brace_ties_finished_today_to_the_three_finished_statuses(output):
    _, groups = frames(output / "view-options.svg")
    for group in groups:
        texts = {t.text: t for t in group.iter(f"{SVG}text")}
        for label in ["Failed", "Show upcoming", "Finished today only"]:
            assert label in texts, label
        (tip_x, tip_y), (_, top, _, bottom) = brace_of(group)
        finished = texts["Finished today only"]
        box = [
            r
            for r in group.iter(f"{SVG}rect")
            if r.get("width") == "16" and abs(float(r.get("x")) + 28 - float(finished.get("x"))) < 0.5
        ]
        assert len(box) == 1
        assert float(box[0].get("y")) + 8 == tip_y, "the checkbox middle meets the brace tip"
        assert tip_x < float(box[0].get("x")), "the checkbox sits right of the brace"
        for status in ["Completed", "Failed", "Cancelled"]:
            assert top < float(texts[status].get("y")) - 5 < bottom, f"the brace spans {status}"
        for status in ["To do", "In progress"]:
            assert not top < float(texts[status].get("y")) - 5 < bottom, f"the brace leaves out {status}"


def test_in_progress_icon_fills_the_bottom_half():
    module = load_script()
    frame = module.Frame(100, 100)
    module.status_icon(frame, 50, 50, "in-progress")
    assert '<path d="M41 50 A9 9 0 0 0 59 50 Z" class="icon-fill"/>' in frame.items


def test_failed_and_cancelled_icons_are_filled_with_a_light_mark():
    module = load_script()
    for status, mark in [("failed", "M46 46 L54 54 M54 46 L46 54"), ("cancelled", "M45 50 L55 50")]:
        frame = module.Frame(100, 100)
        module.status_icon(frame, 50, 50, status)
        assert '<circle cx="50" cy="50" r="9" class="icon-fill"/>' in frame.items, status
        assert f'<path d="{mark}" class="icon-mark"/>' in frame.items, status


def test_rows_show_goal_progress_over_limit_and_failed(output):
    # The wide All tasks frame shows a search, so the unfiltered wide rows come from the editor screen.
    _, (compact, _) = frames(output / "all-tasks.svg")
    _, (_, wide) = frames(output / "task-editor.svg")
    for group in (compact, wide):
        labels = labels_of(group)
        assert "2 h 50 / 3 h 20 min" in labels
        assert "⚠ 1,720 / max 1,600 kcal · 120 over" in labels
        assert "◷ Yesterday 17:00 · Failed" in labels
        meters = [r for r in group.iter(f"{SVG}rect") if r.get("height") == "5"]
        assert len(meters) >= 4, "each goal row draws a meter track and its fill"


def test_list_ends_with_the_upcoming_group(output):
    _, groups = frames(output / "list.svg")
    for group in groups:
        texts = {t.text: float(t.get("y")) for t in group.iter(f"{SVG}text")}
        assert "Upcoming · 1" in texts and "▷ Starts tomorrow 07:00" in texts
        rows = [y for text, y in texts.items() if text in {"Fix the squeaky door", "Paint the garden fence"}]
        assert rows and max(rows) < texts["Upcoming · 1"] < texts["▷ Starts tomorrow 07:00"]
        assert [c for c in group.iter(f"{SVG}circle") if c.get("class") == "icon-dashed"]


def test_quick_log_opens_under_the_row_of_a_time_goal(output):
    _, groups = frames(output / "quick-log.svg")
    for group in groups:
        texts = {t.text: float(t.get("y")) for t in group.iter(f"{SVG}text")}
        for label in ["Log for Sport", "Time spent", "h", "min", "+ More", "Cancel", "Log"]:
            assert label in texts, label
        assert texts["Sport"] < texts["Log for Sport"]


def test_row_list_pills_are_right_aligned_and_due_text_left_aligned(output):
    _, (_, wide) = frames(output / "all-tasks.svg")
    texts = {t.text: t for t in wide.iter(f"{SVG}text")}
    assert float(texts["◷ Today 18:00"].get("x")) < 400
    errands = [t for t in wide.iter(f"{SVG}text") if t.text == "Errands" and float(t.get("x")) > 400]
    assert errands and max(float(t.get("x")) for t in errands) > 800


def test_filter_note_sits_under_the_add_bar(output):
    _, (_, wide) = frames(output / "all-tasks.svg")
    note = [t for t in wide.iter(f"{SVG}text") if t.text and t.text.startswith("Add creates")]
    info = [t for t in wide.iter(f"{SVG}text") if t.text == "1 of 24 tasks"]
    rows = [t for t in wide.iter(f"{SVG}text") if t.text == "Buy paint for the hallway"]
    assert float(info[0].get("y")) < float(note[0].get("y")) < float(rows[0].get("y"))


def test_rows_show_a_count_badge_and_no_status_menu(output):
    _, (compact, _) = frames(output / "all-tasks.svg")
    labels = labels_of(compact)
    assert "2/3" in labels
    assert "Completed" not in labels and "Cancelled" not in labels


def labels_of(group):
    """Return the texts of one frame, in drawing order."""
    return [t.text for t in group.iter(f"{SVG}text")]


@pytest.mark.parametrize("name", sorted(SCREENS))
def test_sidebar_has_no_app_name(output, name):
    _, groups = frames(output / name)
    for group in groups:
        assert "ToDo's" not in labels_of(group), name


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


def test_sync_log_cards_show_the_item_then_time_and_kind_chips_then_sunken_details(output):
    _, groups = frames(output / "sync-log.svg")
    for group in groups:
        texts = list(group.iter(f"{SVG}text"))
        labels = [t.text for t in texts]
        assert "Values that sync overwrote or undid in the last 30 days." in " ".join(labels)
        assert "Entries stay for 30 days." in labels
        ys = {t.text: float(t.get("y")) for t in texts}
        item, time, kind = "Buy paint for the hallway · Due time", "◷ Today 09:14", "Overwritten value"
        assert ys[item] < ys[time] and ys[time] == ys[kind], "the chips follow the item on one row"
        assert labels.index(time) < labels.index(kind), "the time chip comes before the kind chip"
        chips = [
            r
            for r in group.iter(f"{SVG}rect")
            if r.get("class") == "chip" and abs(float(r.get("y")) + 16 - ys[time]) < 0.5
        ]
        assert len(chips) >= 2, "the time and the kind sit in chips"
        assert labels.count("Open") == 1, "only the item that still exists offers Open"
        assert ys["Open"] == ys[time]
        detail = ys["Lost: Fri 10:00 · Kept: Today 18:00"]
        assert any(
            r.get("class") == "bar" and float(r.get("y")) < detail < float(r.get("y")) + float(r.get("height"))
            for r in group.iter(f"{SVG}rect")
        ), "the values sit in a sunken details box"


def test_user_panel_lists_the_state_recycle_bin_settings_and_help(output):
    _, groups = frames(output / "user-menu.svg")
    for group in groups:
        labels = [t.text for t in group.iter(f"{SVG}text")]
        assert labels[labels.index("Recycle bin") :][:3] == ["Recycle bin", "Settings", "Help"]


def test_settings_holds_no_keyboard_shortcuts_or_about_section(output):
    _, groups = frames(output / "settings.svg")
    for group in groups:
        labels = [t.text for t in group.iter(f"{SVG}text")]
        assert "Keyboard shortcuts" not in labels
        assert "About" not in labels


def test_help_shows_search_topic_chips_and_the_five_panels(output):
    _, groups = frames(output / "help.svg")
    for group in groups:
        labels = [t.text for t in group.iter(f"{SVG}text")]
        for chip in ("All topics", "App info", "Welcome", "Tutorial", "FAQ", "Release notes"):
            assert chip in labels, chip
        for panel in ("Application Info & Support", "Welcome to ToDo's", "Getting Started Tutorial"):
            assert panel in labels, panel
        assert any("Search" in label for label in labels)
