"""Draw the low-fidelity UI wireframes of docs/specs/ui-design.md as SVG files.

Each SVG shows one screen twice, side by side: the 390 px compact layout and the 1440 px wide layout.
The drawings use grays, plain boxes, and a generic sans-serif font only, never design system values.
Rerunning the script reproduces the same files byte for byte.

Usage: python scripts/draw-wireframes.py {{output-dir}}
"""

import sys
from pathlib import Path
from xml.sax.saxutils import escape, quoteattr

COMPACT_WIDTH, COMPACT_HEIGHT = 390, 844
WIDE_WIDTH, WIDE_HEIGHT = 1440, 900
MARGIN, GAP, TOP = 40, 60, 110
CANVAS_WIDTH = MARGIN * 2 + COMPACT_WIDTH + GAP + WIDE_WIDTH
CANVAS_HEIGHT = TOP + WIDE_HEIGHT + MARGIN

SIDEBAR_WIDTH = 264
MAIN_LEFT = SIDEBAR_WIDTH + 40
MAIN_RIGHT = 1104
EDITOR_LEFT = 1020
ROW_HEIGHT = 48

STYLE = """
text { font-family: sans-serif; fill: #222222; }
.muted { fill: #666666; }
.on-primary { fill: #ffffff; }
.bold { font-weight: bold; }
rect.frame { fill: #ffffff; stroke: #444444; stroke-width: 2; }
.bar { fill: #eeeeee; stroke: #bbbbbb; }
.box { fill: #f5f5f5; stroke: #bbbbbb; }
.control { fill: #ffffff; stroke: #888888; }
.disabled { fill: #f5f5f5; stroke: #cccccc; }
.primary { fill: #444444; stroke: #444444; }
.selected { fill: #dddddd; stroke: #999999; }
.chip { fill: #eeeeee; stroke: #cccccc; }
.signal { fill: #ffffff; stroke: #222222; stroke-width: 2; }
.scrim { fill: #888888; fill-opacity: 0.5; }
.rule { stroke: #cccccc; }
.drop { stroke: #222222; stroke-width: 3; }
.icon { fill: #ffffff; stroke: #444444; stroke-width: 2; }
.icon-fill { fill: #444444; stroke: #444444; stroke-width: 2; }
.icon-mark { fill: none; stroke: #ffffff; stroke-width: 2; }
.icon-line { stroke: #444444; stroke-width: 2; }
"""

LISTS = [("Home", 8), ("Work", 12), ("Travel", 3), ("Errands", 5), ("Reading", 2)]

TASKS = [
    {
        "text": "Call the plumber about the leak",
        "status": "in-progress",
        "due": "Overdue",
        "lists": ["Home"],
        "notes": 2,
    },
    {"text": "Buy paint for the hallway", "status": "todo", "due": "Today 18:00", "lists": ["Home", "Errands"]},
    {
        "text": "Book flights for the spring trip",
        "status": "todo",
        "due": "Fri 10:00",
        "lists": ["Travel"],
        "notes": 1,
        "shared": True,
    },
    {
        "text": "Renew passport",
        "status": "todo",
        "due": "12 Nov",
        "lists": ["Travel", "Errands", "Home"],
        "shared": True,
    },
    {
        "text": "Prepare slides for the team review",
        "status": "in-progress",
        "due": "Tomorrow",
        "lists": ["Work"],
        "notes": 3,
        "shared": True,
    },
    {"text": "Send the invoice to the client", "status": "todo", "lists": ["Work"]},
    {"text": "Water the plants", "status": "todo"},
    {"text": "Read chapter 4 of the novel", "status": "todo", "lists": ["Reading"]},
    {"text": "Fix the bike light", "status": "todo", "lists": ["Errands"]},
]

HOME_TASKS = [
    {"text": "Call the plumber about the leak", "status": "in-progress", "due": "Overdue", "notes": 2},
    {"text": "Buy paint for the hallway", "status": "todo", "due": "Today 18:00", "lists": ["Errands"]},
    {"text": "Clean the gutters", "status": "todo", "due": "Sat"},
    {"text": "Replace the smoke detector batteries", "status": "todo"},
    {"text": "Sort the winter clothes", "status": "in-progress", "notes": 1},
    {"text": "Fix the squeaky door", "status": "todo"},
    {"text": "Paint the garden fence", "status": "completed"},
    {"text": "Buy a new lawn mower", "status": "cancelled"},
]

STATUSES = [("todo", "To do"), ("in-progress", "In progress"), ("completed", "Completed"), ("cancelled", "Cancelled")]


def text_width(text, size):
    """Estimate the rendered width of a text in a sans-serif font, on the generous side."""
    return len(text) * size * 0.56


def fit(text, width, size):
    """Shorten a text with an ellipsis until its estimated width fits the given width."""
    if text_width(text, size) <= width:
        return text
    while text and text_width(text + "…", size) > width:
        text = text[:-1]
    return text.rstrip() + "…"


class Frame:
    """One device frame: a list of SVG elements in frame-local coordinates."""

    def __init__(self, width, height):
        """Create an empty frame of the given size, with its border as the first element."""
        self.width = width
        self.height = height
        self.items = []
        self.rect(0, 0, width, height, "frame", radius=0)

    def rect(self, x, y, width, height, css="box", radius=6):
        """Add a rectangle."""
        self.items.append(
            f'<rect x="{x:g}" y="{y:g}" width="{width:g}" height="{height:g}" rx="{radius:g}" class="{css}"/>'
        )

    def text(self, x, y, content, size=14, css="", anchor="start"):
        """Add a single-line text with its baseline at y."""
        attrs = f' class="{css}"' if css else ""
        if anchor != "start":
            attrs += f' text-anchor="{anchor}"'
        self.items.append(f'<text x="{x:g}" y="{y:g}" font-size="{size}"{attrs}>{escape(content)}</text>')

    def line(self, x1, y1, x2, y2, css="rule"):
        """Add a straight line."""
        self.items.append(f'<line x1="{x1:g}" y1="{y1:g}" x2="{x2:g}" y2="{y2:g}" class="{css}"/>')

    def circle(self, cx, cy, r, css="icon"):
        """Add a circle."""
        self.items.append(f'<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" class="{css}"/>')

    def path(self, d, css):
        """Add a path; paths only draw marks inside shapes that are already bounded."""
        self.items.append(f"<path d={quoteattr(d)} class={quoteattr(css)}/>")

    def svg(self, x, y):
        """Return the frame as an SVG group placed at (x, y) on the canvas."""
        body = "\n".join(f"    {item}" for item in self.items)
        transform = f"translate({x} {y})"
        return f'  <g class="frame" data-width="{self.width}" data-height="{self.height}" transform="{transform}">\n{body}\n  </g>'


# ------------------------------------------------------------------------------------------------
# Basic controls
# ------------------------------------------------------------------------------------------------


def button(f, x, y, label, css="control", size=14, height=44, padding=16):
    """Draw a text button with its left edge at x and return its right edge."""
    width = text_width(label, size) + padding * 2
    f.rect(x, y, width, height, css)
    f.text(x + width / 2, y + height / 2 + size * 0.35, label, size, "on-primary" if css == "primary" else "", "middle")
    return x + width


def button_right(f, right, y, label, css="control", size=14, height=44):
    """Draw a text button with its right edge at `right` and return its left edge."""
    width = text_width(label, size) + 32
    button(f, right - width, y, label, css, size, height)
    return right - width


def icon_button(f, x, y, glyph):
    """Draw a 44 px square icon button holding one glyph."""
    f.rect(x, y, 44, 44, "control")
    f.text(x + 22, y + 27, glyph, 16, "", "middle")


def field(f, x, y, width, value, label=None, height=44, css="control", muted=False):
    """Draw a text field with an optional label above it and return the bottom edge."""
    if label:
        f.text(x, y + 14, label, 13, "muted")
        y += 22
    f.rect(x, y, width, height, css)
    f.text(x + 12, y + 27, fit(value, width - 24, 14), 14, "muted" if muted else "")
    return y + height


def chip(f, right, y, label, css="chip", size=12):
    """Draw a chip ending at `right` and return its left edge."""
    width = text_width(label, size) + 16
    f.rect(right - width, y, width, 24, css, radius=12)
    f.text(right - width / 2, y + 16, label, size, "", "middle")
    return right - width


def chip_left(f, x, y, label, css="chip", size=12):
    """Draw a chip starting at x and return its right edge."""
    width = text_width(label, size) + 16
    chip(f, x + width, y, label, css, size)
    return x + width


def segmented(f, x, y, width, labels, current, size=12, height=36):
    """Draw a segmented control of equal segments, marking the current one."""
    segment = width / len(labels)
    f.rect(x, y, width, height, "control")
    for index, label in enumerate(labels):
        left = x + index * segment
        if index == current:
            f.rect(left + 2, y + 2, segment - 4, height - 4, "selected", radius=4)
        f.text(
            left + segment / 2, y + height / 2 + size * 0.35, label, size, "bold" if index == current else "", "middle"
        )


def radio(f, x, y, label, hint, checked):
    """Draw a radio button with a label and a muted hint line."""
    f.circle(x + 10, y + 10, 9, "icon")
    if checked:
        f.circle(x + 10, y + 10, 4, "icon-fill")
    f.text(x + 30, y + 15, label, 14, "bold")
    if hint:
        f.text(x + 30, y + 35, hint, 12, "muted")


def status_icon(f, cx, cy, status, r=9):
    """Draw a status icon; the four statuses differ in shape, not color."""
    if status == "completed":
        f.circle(cx, cy, r, "icon-fill")
        f.path(f"M{cx - 4} {cy} l3 3 l5 -6", "icon-mark")
        return
    f.circle(cx, cy, r, "icon")
    if status == "in-progress":
        f.path(f"M{cx} {cy - r} A{r} {r} 0 0 1 {cx} {cy + r} Z", "icon-fill")
    elif status == "cancelled":
        f.line(cx - r * 0.55, cy, cx + r * 0.55, cy, "icon-line")


def banner(f, x, y, width, message, action=None):
    """Draw a banner with an alert mark, a message, and an optional action button."""
    f.rect(x, y, width, 52, "box")
    f.rect(x, y, 4, 52, "primary", radius=0)
    f.text(x + 20, y + 31, "!", 16, "bold")
    right = x + width - 8
    if action:
        right = button_right(f, right, y + 8, action, size=13, height=36) - 8
    f.text(x + 40, y + 31, fit(message, right - x - 48, 14), 14)


def scrim(f):
    """Dim the whole frame behind a dialog."""
    f.rect(0, 0, f.width, f.height, "scrim", radius=0)


# ------------------------------------------------------------------------------------------------
# Chrome
# ------------------------------------------------------------------------------------------------


def sync_pill(f, right, y, label):
    """Draw the sync indicator as an icon and label pill ending at `right`; return its left edge."""
    width = text_width(label, 12) + 36
    f.rect(right - width, y, width, 32, "control", radius=16)
    f.circle(right - width + 14, y + 16, 5, "icon")
    f.text(right - width + 26, y + 21, label, 12)
    return right - width


def top_bar(f, title, sync="Local only", back=False, action=None):
    """Draw the compact top bar with an optional back button, the sync pill, and a More button."""
    f.rect(0, 0, f.width, 60, "bar", radius=0)
    x = 16
    if back:
        icon_button(f, 8, 8, "<")
        x = 60
    right = f.width - 8
    icon_button(f, right - 44, 8, "⋮")
    right -= 52
    if action:
        right = button_right(f, right, 8, action, "primary") - 8
    if sync:
        right = sync_pill(f, right, 14, sync) - 8
    f.text(x, 37, fit(title, right - x - 8, 20), 20, "bold")


def bottom_nav(f, current):
    """Draw the compact bottom navigation bar, marking the current destination."""
    top = f.height - 64
    f.rect(0, top, f.width, 64, "bar", radius=0)
    labels = ["Tasks", "Lists", "Bin", "Settings"]
    slot = f.width / len(labels)
    for index, label in enumerate(labels):
        cx = slot * index + slot / 2
        if label == current:
            f.rect(cx - 40, top + 8, 80, 48, "selected", radius=24)
        f.rect(cx - 9, top + 14, 18, 18, "icon", radius=3)
        f.text(cx, top + 48, label, 12, "bold" if label == current else "", "middle")


def sidebar(f, current, lists=LISTS, sync="Local only"):
    """Draw the wide sidebar with destinations, the lists, and the sync indicator."""
    f.rect(0, 0, SIDEBAR_WIDTH, f.height, "bar", radius=0)
    f.text(24, 46, "ToDo's", 22, "bold")
    y = 80

    def item(label, count, selected, indent=0):
        nonlocal y
        if selected:
            f.rect(12, y, SIDEBAR_WIDTH - 24, 40, "selected")
        f.text(28 + indent, y + 26, label, 14, "bold" if selected else "")
        if count is not None:
            f.text(SIDEBAR_WIDTH - 28, y + 26, str(count), 13, "muted", "end")
        y += 44

    item("All tasks", 24 if lists else 0, current == "All tasks")
    item("Lists", None, current == "Lists")
    if lists:
        for name, count in lists:
            item(name, count, current == name, indent=16)
    else:
        f.text(44, y + 22, "No lists yet", 13, "muted")
        y += 36
    item("+ New list", None, False, indent=16)
    y = f.height - 168
    f.line(16, y - 8, SIDEBAR_WIDTH - 16, y - 8)
    item("Recycle bin", None, current == "Recycle bin")
    item("Settings", None, current == "Settings")
    sync_pill(f, 12 + text_width(sync, 12) + 36, f.height - 56, sync)


def page_header(f, x, y, right, title, subtitle=None, actions=()):
    """Draw a wide page title with an optional subtitle and right-aligned action buttons."""
    edge = right
    for label, css in reversed(actions):
        edge = button_right(f, edge, y, label, css) - 8
    f.text(x, y + 32, fit(title, edge - x - 16, 28), 28, "bold")
    if subtitle:
        f.text(x, y + 60, fit(subtitle, right - x, 14), 14, "muted")


# ------------------------------------------------------------------------------------------------
# Task list parts
# ------------------------------------------------------------------------------------------------


def view_controls_compact(f, y, filters="Filters 1"):
    """Draw the compact search field with the Filters and Sort buttons."""
    f.rect(0, y, f.width, 60, "box", radius=0)
    sort_left = button_right(f, f.width - 16, y + 8, "Sort")
    filter_left = button_right(f, sort_left - 8, y + 8, filters)
    field(f, 16, y + 8, filter_left - 24, "Search", muted=True)


def view_controls_wide(f, x, y, right, chips, sort="Sort: Due time"):
    """Draw the wide search field, filter chips, and Sort button in one row."""
    sort_left = button_right(f, right, y, sort)
    field(f, x, y, 220, "Search", muted=True)
    left = x + 232
    for label, active in chips:
        width = text_width(label, 13) + 28
        if left + width > sort_left - 8:
            break
        f.rect(left, y + 2, width, 40, "selected" if active else "control", radius=20)
        f.text(left + width / 2, y + 27, label, 13, "bold" if active else "", "middle")
        left += width + 8


def task_row(f, x, y, width, task, wide, handle=False, selected=False):
    """Draw one 48 px task row and return the y of the next row."""
    if selected:
        f.rect(x, y + 1, width, ROW_HEIGHT - 2, "selected", radius=4)
    f.line(x, y + ROW_HEIGHT, x + width, y + ROW_HEIGHT)
    left = x + 4
    if handle:
        f.text(left + 8, y + 30, "⋮⋮", 14, "muted")
        left += 28
    status_icon(f, left + 18, y + ROW_HEIGHT / 2, task["status"])
    text_left = left + 40
    right = x + width - 4
    if wide:
        icon_button(f, right - 44, y + 2, "⋯")
        right -= 52
        if task.get("notes"):
            right = chip(f, right, y + 12, f"✎ {task['notes']}") - 6
        if task.get("shared"):
            right = chip(f, right, y + 12, "Shared") - 6
        names = task.get("lists", [])
        if len(names) > 2:
            right = chip(f, right, y + 12, f"+{len(names) - 2}") - 6
        for name in reversed(names[:2]):
            right = chip(f, right, y + 12, name) - 6
    if task.get("due"):
        overdue = task["due"] == "Overdue"
        label = "! Overdue" if overdue else task["due"]
        right = chip(f, right, y + 12, label, "signal" if overdue else "chip") - 8
    done = task["status"] in ("completed", "cancelled")
    label = fit(task["text"], right - text_left - 4, 15)
    f.text(text_left, y + 30, label, 15, "muted" if done else "")
    if task["status"] == "cancelled":
        f.line(text_left, y + 25, text_left + text_width(label, 15) * 0.9, y + 25, "icon-line")
    return y + ROW_HEIGHT


def status_menu(f, x, y, current):
    """Draw the status menu that the status button opens, marking the current status."""
    f.rect(x, y, 200, 192, "frame", radius=8)
    for index, (status, label) in enumerate(STATUSES):
        top = y + 8 + index * 44
        if status == current:
            f.rect(x + 6, top, 188, 44, "selected", radius=4)
            f.text(x + 180, top + 27, "✓", 14, "bold", "end")
        status_icon(f, x + 26, top + 22, status)
        f.text(x + 48, top + 27, label, 14, "bold" if status == current else "")


def task_rows(f, x, y, width, tasks, wide, bottom, handle=False, selected=None):
    """Draw task rows until the list or the space runs out; return the y after the last row."""
    for index, task in enumerate(tasks):
        if y + ROW_HEIGHT > bottom:
            break
        y = task_row(f, x, y, width, task, wide, handle, index == selected)
    return y


def add_bar(f, x, y, width, placeholder="Add a task"):
    """Draw the add bar: a text field and an Add button."""
    f.rect(x, y, width, 60, "bar", radius=0 if width == f.width else 8)
    add_left = button_right(f, x + width - 8, y + 8, "Add", "primary")
    field(f, x + 8, y + 8, add_left - x - 16, placeholder, muted=True)


def compact_task_screen(f, title, tasks, sync="Local only", back=False, nav="Tasks"):
    """Draw a compact task list screen with controls, rows, add bar, and bottom navigation."""
    top_bar(f, title, sync, back)
    view_controls_compact(f, 60)
    bottom = f.height - 64 - 60
    task_rows(f, 0, 120, f.width, tasks, False, bottom)
    add_bar(f, 0, bottom, f.width)
    bottom_nav(f, nav)


# ------------------------------------------------------------------------------------------------
# Dialogs and sheets
# ------------------------------------------------------------------------------------------------


def compact_sheet(f, title, top=48):
    """Draw a full-height compact sheet over a dimmed screen; return its content top."""
    scrim(f)
    f.rect(0, top, f.width, f.height - top, "frame", radius=16)
    f.text(20, top + 40, title, 20, "bold")
    icon_button(f, f.width - 56, top + 12, "×")
    return top + 72


def wide_dialog(f, title, width, height):
    """Draw a centered wide dialog over a dimmed screen; return its left, top, and right content edges."""
    scrim(f)
    left = (f.width - width) / 2
    top = (f.height - height) / 2
    f.rect(left, top, width, height, "frame", radius=12)
    f.text(left + 28, top + 44, title, 22, "bold")
    icon_button(f, left + width - 60, top + 16, "×")
    return left + 28, top + 76, left + width - 28


def wide_all_tasks(f, sync="Local only", selected=None, right=MAIN_RIGHT):
    """Draw the wide All tasks screen as a background or main view."""
    sidebar(f, "All tasks", sync=sync)
    page_header(f, MAIN_LEFT, 28, right, "All tasks")
    chips = [("Lists", False), ("Status: open", True), ("Due", False), ("Created", False)]
    if sync != "Local only":
        chips.append(("Shared", False))
    view_controls_wide(f, MAIN_LEFT, 92, right, chips)
    add_bar(f, MAIN_LEFT, 152, right - MAIN_LEFT)
    task_rows(f, MAIN_LEFT, 228, right - MAIN_LEFT, TASKS, True, f.height - 24, selected=selected)


def wide_list(f, sync="Synced", right=MAIN_RIGHT):
    """Draw the wide Home list screen as a background or main view."""
    sidebar(f, "Home", sync=sync)
    actions = [("Edit list", "control"), ("Share", "control"), ("⋯", "control")]
    page_header(
        f,
        MAIN_LEFT,
        28,
        right,
        "Home",
        "Chores and repairs around the house · Shared with 2 people · You own this list",
        actions,
    )
    segmented(f, MAIN_LEFT, 112, 520, ["Manual", "Due", "Created", "Activity", "Status", "A–Z"], 0, 13, 40)
    f.rect(MAIN_LEFT + 536, 114, 136, 36, "selected", radius=18)
    f.text(MAIN_LEFT + 604, 137, "Status: all", 13, "bold", "middle")
    width = right - MAIN_LEFT
    add_bar(f, MAIN_LEFT, 168, width)
    y = 244
    for index, task in enumerate(HOME_TASKS):
        if index == 3:
            f.line(MAIN_LEFT, y, right, y, "drop")
        y = task_row(f, MAIN_LEFT, y, width, task, True, handle=True)
    f.text(
        MAIN_LEFT,
        y + 32,
        "Drag a handle or use Move up and Move down in the row menu; the black line marks the drop spot.",
        13,
        "muted",
    )


# ------------------------------------------------------------------------------------------------
# Screens
# ------------------------------------------------------------------------------------------------


def empty_state(f, cx, y, width):
    """Draw the first-launch empty state centered on cx."""
    f.circle(cx, y + 36, 32, "icon")
    f.text(cx, y + 108, "No tasks yet.", 20, "bold", "middle")
    f.text(cx, y + 136, "Your tasks stay on this device.", 15, "muted", "middle")
    left = cx - width / 2
    button(f, left, y + 168, "Import a backup", "control", 14)
    button_right(f, left + width, y + 168, "Connect to sync", "control", 14)


def first_launch():
    """All tasks in local mode, before the first task."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "All tasks")
    empty_state(compact, compact.width / 2, 220, 340)
    add_bar(compact, 0, compact.height - 124, compact.width)
    bottom_nav(compact, "Tasks")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "All tasks", lists=[])
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "All tasks")
    add_bar(wide, MAIN_LEFT, 100, MAIN_RIGHT - MAIN_LEFT)
    empty_state(wide, (MAIN_LEFT + MAIN_RIGHT) / 2, 240, 380)
    return "First launch", "Local mode with no data: no sign-in, straight to a usable empty state.", compact, wide


def all_tasks():
    """All tasks with the default open filter."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    status_menu(compact, 12, 216, "todo")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide)
    status_menu(wide, MAIN_LEFT + 8, 324, "todo")
    return (
        "All tasks",
        "Every open task, filtered and sorted; the status button opens a menu with the four statuses.",
        compact,
        wide,
    )


def list_view():
    """One list in manual order with the order buttons."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Home", "Synced", back=True)
    compact.text(16, 88, fit("Chores and repairs around the house", 300, 14), 14, "muted")
    compact.text(16, 110, "Shared with 2 people · You own this list", 13, "muted")
    segmented(compact, 16, 124, compact.width - 32, ["Manual", "Due", "Created", "Activity", "Status", "A–Z"], 0, 12)
    bottom = compact.height - 124
    task_rows(compact, 0, 172, compact.width, HOME_TASKS, False, bottom)
    add_bar(compact, 0, bottom, compact.width)
    bottom_nav(compact, "Lists")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide)
    return (
        "List",
        "Manual order, shown with all statuses; other order buttons sort the view without changing that order.",
        compact,
        wide,
    )


def list_row(f, x, y, width, name, description, counts, sharing):
    """Draw one 64 px row of the lists overview and return the next y."""
    f.line(x, y + 64, x + width, y + 64)
    right = x + width - 8
    if sharing:
        right = chip(f, right, y + 20, sharing) - 8
    f.text(right, y + 37, counts, 13, "muted", "end")
    right -= text_width(counts, 13) + 16
    f.text(x + 12, y + 27, fit(name, right - x - 12, 16), 16, "bold")
    f.text(x + 12, y + 49, fit(description, right - x - 12, 13), 13, "muted")
    return y + 64


LIST_ROWS = [
    ("Home", "Chores and repairs around the house", 8, 14, "Shared"),
    ("Work", "Projects and follow-ups", 12, 30, None),
    ("Travel", "Spring trip planning", 3, 6, "By Ann"),
    ("Errands", "Things to buy or drop off", 5, 9, None),
    ("Reading", "Books to finish", 2, 4, None),
]


def lists():
    """The lists overview."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Lists", "Synced", action="New list")
    y = 60
    for name, description, open_count, total, sharing in LIST_ROWS:
        y = list_row(compact, 0, y, compact.width, name, description, f"{open_count}/{total} open", sharing)
    bottom_nav(compact, "Lists")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Lists", sync="Synced")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Lists", actions=[("New list", "primary")])
    y = 100
    for name, description, open_count, total, sharing in LIST_ROWS:
        counts = f"{open_count} open · {total} total"
        y = list_row(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, name, description, counts, sharing)
    return "Lists", "Every list with its open and total counts and its sharing state.", compact, wide


def editor_fields(f, x, y, width, compact):
    """Draw the task editor sections from Description to Delete; return the bottom edge."""
    f.text(x, y + 14, "Description", 13, "muted")
    f.rect(x, y + 22, width, 64, "control")
    f.text(x + 12, y + 50, "Buy paint for the hallway", 15)
    y += 100
    segmented(f, x, y, width, ["To do", "In progress", "Completed", "Cancelled"], 0, 12, 40)
    y += 56
    f.text(x, y + 14, "Due", 13, "muted")
    date_width = width * 0.45
    field(f, x, y + 22, date_width, "6 Nov 2026")
    field(f, x + date_width + 8, y + 22, width * 0.3, "18:00")
    button_right(f, x + width, y + 22, "Clear")
    y += 80
    radio(f, x, y, "Keep open", None, True)
    radio(f, x + width * 0.4, y, "Cancel when overdue", None, False)
    y += 36
    f.text(x, y + 14, "Lists", 13, "muted")
    left = chip_left(f, x, y + 24, "Home  ×", size=13) + 8
    left = chip_left(f, left, y + 24, "Errands  ×", size=13) + 8
    chip_left(f, left, y + 24, "+ Add to list", "control", 13)
    y += 64
    f.text(x, y + 14, "Notes", 13, "muted")
    y += 24
    add_left = button_right(f, x + width, y, "Add note")
    field(f, x, y, add_left - x - 8, "Add a note", muted=True)
    y += 52
    notes = [
        ("You · 3 Nov 09:12 · edited", "Hardware store closes at 18:00."),
        ("Ann · 2 Nov 14:05", "Get the matte white, not the gloss."),
    ]
    for meta, body in notes:
        f.rect(x, y, width, 60, "box")
        f.text(x + 12, y + 22, meta, 12, "muted")
        f.text(x + 12, y + 46, fit(body, width - 64, 14), 14)
        f.text(x + width - 20, y + 22, "⋯", 14, "", "middle")
        y += 68
    if not compact:
        f.text(x, y + 14, "Created 1 Nov · Last activity 3 Nov 09:12 · Owner: you", 12, "muted")
        y += 24
    return danger_zone(f, x, y, width, "Delete task")


def danger_zone(f, x, y, width, label):
    """Draw a divider with extra space, then the editor's delete button; return the bottom edge."""
    f.line(x, y + 20, x + width, y + 20)
    button(f, x, y + 40, label, "control")
    return y + 84


def editor_panel(f, title):
    """Draw the wide right editor panel with its title and close button; return the content left and width."""
    f.rect(EDITOR_LEFT, 0, WIDE_WIDTH - EDITOR_LEFT, WIDE_HEIGHT, "frame", radius=0)
    f.text(EDITOR_LEFT + 24, 46, title, 20, "bold")
    icon_button(f, WIDE_WIDTH - 60, 16, "×")
    return EDITOR_LEFT + 24, WIDE_WIDTH - EDITOR_LEFT - 48


def task_editor():
    """The task editor as a full screen and as a right panel."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Task", "Synced", back=True)
    editor_fields(compact, 16, 76, compact.width - 32, True)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, "Synced", selected=1, right=EDITOR_LEFT - 20)
    left, width = editor_panel(wide, "Task")
    editor_fields(wide, left, 76, width, False)
    return (
        "Task editor",
        "Every field saves on change; a full screen on phones and a right panel on wide screens.",
        compact,
        wide,
    )


def list_editor_fields(f, x, y, width):
    """Draw the list editor fields, details, and delete button; return the bottom edge."""
    y = field(f, x, y, width, "Home", "Name") + 16
    f.text(x, y + 14, "Description", 13, "muted")
    f.rect(x, y + 22, width, 88, "control")
    f.text(x + 12, y + 50, fit("Chores and repairs around the house", width - 24, 14), 14)
    f.text(x + width, y + 132, "36 / 1000", 12, "muted", "end")
    y += 148
    f.text(x, y + 14, "Created 1 Oct · Owner: you · Shared with 2 people", 12, "muted")
    y = danger_zone(f, x, y + 16, width, "Delete list")
    f.text(x, y + 22, "Deleting a list never deletes its tasks.", 13, "muted")
    return y + 32


def list_editor():
    """The list editor, opening where the task editor opens."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "List", "Synced", back=True)
    list_editor_fields(compact, 16, 76, compact.width - 32)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide, right=EDITOR_LEFT - 20)
    left, width = editor_panel(wide, "List")
    list_editor_fields(wide, left, 76, width)
    return (
        "List editor",
        "Opens where the task editor opens: a full screen on phones and a right panel on wide screens.",
        compact,
        wide,
    )


def sharing_fields(f, x, y, width, compact):
    """Draw the sharing dialog content; return the bottom edge."""
    f.text(x, y + 14, "People with access", 13, "muted")
    y += 28
    f.text(x, y + 26, "You", 15, "bold")
    f.text(x + width, y + 26, "Owner", 14, "muted", "end")
    y += 44
    people = [("ann@example.com", "Task editor ▾"), ("ben@example.com", "Viewer ▾")]
    for email, role in people:
        f.line(x, y, x + width, y)
        icon_button(f, x + width - 44, y + 6, "×")
        role_width = text_width(role, 14) + 24
        role_left = x + width - 52 - role_width
        f.rect(role_left, y + 6, role_width, 44, "control")
        f.text(role_left + 12, y + 33, role, 14)
        f.text(x, y + 33, fit(email, role_left - x - 8, 15), 15)
        y += 56
    y += 16
    f.text(x, y + 14, "Invite", 13, "muted")
    y += 22
    if compact:
        field(f, x, y, width, "Email address", muted=True)
        y += 52
        f.rect(x, y, width - 100, 44, "control")
        f.text(x + 12, y + 27, "Task editor ▾", 14)
        button_right(f, x + width, y, "Invite", "primary")
    else:
        invite_left = button_right(f, x + width, y, "Invite", "primary")
        f.rect(invite_left - 168, y, 160, 44, "control")
        f.text(invite_left - 156, y + 27, "Task editor ▾", 14)
        field(f, x, y, invite_left - x - 176, "Email address", muted=True)
    y += 60
    for line in [
        "Viewer: can read the list and its tasks.",
        "Task editor: can add, edit, and reorder tasks.",
        "Editor: can also rename and describe the list.",
    ]:
        f.text(x, y + 14, line, 13, "muted")
        y += 22
    return y


def sharing():
    """The sharing dialog of a list."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "Home", HOME_TASKS, "Synced", back=True, nav="Lists")
    top = compact_sheet(compact, "Share Home")
    y = sharing_fields(compact, 20, top, compact.width - 40, True)
    compact.text(20, y + 38, "Offline variant, with every control disabled:", 12, "muted")
    banner(compact, 20, y + 50, compact.width - 40, "Sharing needs a connection.")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide)
    left, top, right = wide_dialog(wide, "Share Home", 640, 460)
    sharing_fields(wide, left, top, right - left, False)
    return (
        "Sharing",
        "The owner invites people by email with a role, and changes or removes their access.",
        compact,
        wide,
    )


BIN_ROWS = [
    ("T", "Buy new curtains", 5),
    ("L", "Garden", 12),
    ("T", "Cancel the gym membership", 20),
    ("T", "Order printer ink", 29),
]


def bin_row(f, x, y, width, kind, name, age, confirm, compact):
    """Draw one recycle bin row, optionally in its in-row confirmation state; return the next y."""
    left = 30 - age
    days = f"{left} day{'s' if left != 1 else ''} left"
    meta = days if compact else f"Deleted {age} days ago · {days}"
    f.line(x, y + 64, x + width, y + 64)
    f.rect(x + 8, y + 18, 28, 28, "box", radius=4)
    f.text(x + 22, y + 37, kind, 13, "bold", "middle")
    right = x + width - 8
    if confirm:
        right = button_right(f, right, y + 10, "Keep") - 8
        right = button_right(f, right, y + 10, "Delete", "primary") - 8
        question = "Delete?" if compact else "Delete forever?"
        f.text(right - 8, y + 37, question, 14, "bold", "end")
        right -= text_width(question, 14) + 16
    elif compact:
        icon_button(f, right - 44, y + 10, "×")
        right = button_right(f, right - 52, y + 10, "Restore") - 8
    else:
        right = button_right(f, right, y + 10, "Delete permanently") - 8
        right = button_right(f, right, y + 10, "Restore") - 8
    f.text(x + 48, y + 28, fit(name, right - x - 52, 15), 15)
    f.text(x + 48, y + 50, fit(meta, right - x - 52, 12), 12, "muted")
    return y + 64


def recycle_bin():
    """The recycle bin with one row asking for confirmation."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Recycle bin")
    y = 60
    for index, row in enumerate(BIN_ROWS):
        y = bin_row(compact, 0, y, compact.width, *row, index == 1, True)
    compact.text(16, y + 32, "Deleted items stay here for 30 days.", 13, "muted")
    bottom_nav(compact, "Bin")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Recycle bin")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Recycle bin", "Deleted items stay here for 30 days.")
    y = 116
    for index, row in enumerate(BIN_ROWS):
        y = bin_row(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, *row, index == 1, False)
    return "Recycle bin", "Restore or permanently delete; permanent deletion asks in the row first.", compact, wide


def settings_sections(f, x, y, width):
    """Draw the settings sections in local mode; return the bottom edge."""

    def section(title, height):
        nonlocal y
        f.rect(x, y, width, height, "box", radius=8)
        f.text(x + 16, y + 30, title, 16, "bold")
        top = y + 44
        y += height + 12
        return top

    top = section("Appearance", 100)
    segmented(f, x + 16, top, width - 32, ["System", "Light", "Dark"], 0, 13, 40)
    top = section("Data", 100)
    left = button(f, x + 16, top, "Export backup") + 8
    button(f, left, top, "Import backup")
    top = section("Connection", 232)
    f.text(x + 16, top + 14, "Not connected. Your data stays on this device.", 13)
    f.text(x + 16, top + 36, "Connect to sync devices and share lists.", 13, "muted")
    button(f, x + 16, top + 52, "Connect", "primary")
    field(f, x + 16, top + 112, width - 32, "https://todos.pellicciotta.com", "Server URL")
    top = section("About", 72)
    f.text(x + 16, top + 4, "Version 1.0.0 · Built 3 Nov 2026", 13, "muted")
    return y


def settings():
    """Settings in local mode."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Settings")
    settings_sections(compact, 12, 72, compact.width - 24)
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Settings")
    settings_sections(wide, MAIN_LEFT, 96, 640)
    wide.text(MAIN_LEFT + 680, 140, "Connected, the Connection section shows the account,", 13, "muted")
    wide.text(MAIN_LEFT + 680, 160, "server, sync state, Sync log, and Disconnect.", 13, "muted")
    return "Settings", "Theme, backup export and import, connection, server URL, and app version.", compact, wide


LOG_ENTRIES = [
    ("Overwritten value", "Today 09:14", "Buy paint for the hallway · Due time", "Lost: Fri 10:00 · Kept: Today 18:00"),
    ("Rejected change", "Today 08:02", "Buy oat milk · in Groceries", "No access anymore; status change undone"),
    ("Lost access", "Today 08:02", "Groceries, shared by Ann", "2 queued changes were undone"),
    ("Sync error", "Yesterday 22:40", "Server unavailable", "Retried and synced at 22:45"),
]


def log_entry(f, x, y, width, kind, time, item, detail):
    """Draw one sync log entry card; return the next y."""
    f.rect(x, y, width, 96, "box", radius=8)
    f.text(x + 16, y + 28, kind, 15, "bold")
    f.text(x + width - 16, y + 28, time, 12, "muted", "end")
    f.text(x + 16, y + 54, fit(item, width - 32, 14), 14)
    f.text(x + 16, y + 78, fit(detail, width - 32, 13), 13, "muted")
    return y + 108


def sync_log():
    """The sync log while connected."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Sync log", "Synced", back=True)
    y = 76
    for entry in LOG_ENTRIES:
        y = log_entry(compact, 12, y, compact.width - 24, *entry)
    compact.text(16, y + 20, "Entries stay for 30 days.", 13, "muted")
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings", sync="Synced")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Sync log", "Values that sync overwrote or undid in the last 30 days.")
    y = 116
    for entry in LOG_ENTRIES:
        y = log_entry(wide, MAIN_LEFT, y, 720, *entry)
    return (
        "Sync log",
        "What conflict resolution overwrote and what the service rejected, with links to the items.",
        compact,
        wide,
    )


def connect_steps(f, x, y, width):
    """Draw the connect screen during the local data upload; return the bottom edge."""
    lines = [
        "Connecting syncs your data across devices",
        "and lets you share lists.",
        "It needs an account, so you are",
        "no longer anonymous. Access is by invitation.",
    ]
    for index, line in enumerate(lines):
        f.text(x, y + 14, line, 14, "muted" if index > 1 else "")
        y += 22
    y += 20
    steps = [("✓", "Signed in as jane@example.com"), ("…", "Uploading 5 lists and 34 tasks")]
    for mark, label in steps:
        f.circle(x + 12, y + 12, 12, "icon")
        f.text(x + 12, y + 17, mark, 13, "bold", "middle")
        f.text(x + 36, y + 17, fit(label, width - 36, 14), 14)
        y += 36
    f.rect(x, y + 8, width, 12, "control", radius=6)
    f.rect(x, y + 8, width * 0.6, 12, "primary", radius=6)
    f.text(x + width, y + 40, "21 of 34 tasks", 12, "muted", "end")
    y += 64
    f.text(x, y + 14, "Home merged into the account's Home.", 14)
    f.text(x, y + 38, "Next: download the account's data.", 13, "muted")
    y += 56
    button(f, x, y, "Done", "disabled")
    return y + 44


def connect():
    """The connect screen while uploading local data."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Connect", "Syncing", back=True)
    connect_steps(compact, 16, 84, compact.width - 32)
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings", sync="Syncing")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Connect")
    connect_steps(wide, MAIN_LEFT, 100, 560)
    return "Connect", "After sign-in, local data uploads into the account; same-named lists merge.", compact, wide


def import_fields(f, x, y, width):
    """Draw the import dialog content; return the bottom edge."""
    f.rect(x, y, width, 64, "box", radius=8)
    f.text(x + 16, y + 26, fit("todos-backup-2026-10-30.json", width - 32, 15), 15, "bold")
    f.text(x + 16, y + 48, "Exported 30 Oct 2026 · 8 lists · 120 tasks", 12, "muted")
    y += 84
    radio(f, x, y, "Merge", "Add and update items; keep the rest.", True)
    y += 52
    radio(f, x, y, "Overwrite", "Replace your data; missing items go to the bin.", False)
    y += 60
    f.text(x, y + 14, "12 added · 30 updated · 0 to recycle bin", 14, "bold")
    y += 40
    left = button(f, x, y, "Import", "primary") + 8
    button(f, left, y, "Cancel")
    return y + 44


def import_dialog():
    """The import dialog with the mode choice and counts."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Settings")
    settings_sections(compact, 12, 72, compact.width - 24)
    bottom_nav(compact, "Settings")
    top = compact_sheet(compact, "Import backup", 200)
    import_fields(compact, 20, top, compact.width - 40)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Settings")
    settings_sections(wide, MAIN_LEFT, 96, 640)
    left, top, right = wide_dialog(wide, "Import backup", 560, 440)
    import_fields(wide, left, top, right - left)
    return (
        "Import backup",
        "The file's counts, the mode choice, and what the import will change, before applying it.",
        compact,
        wide,
    )


SCREENS = {
    "first-launch.svg": first_launch,
    "all-tasks.svg": all_tasks,
    "list.svg": list_view,
    "lists.svg": lists,
    "task-editor.svg": task_editor,
    "list-editor.svg": list_editor,
    "sharing.svg": sharing,
    "recycle-bin.svg": recycle_bin,
    "settings.svg": settings,
    "sync-log.svg": sync_log,
    "connect.svg": connect,
    "import.svg": import_dialog,
}


def render(title, caption, compact, wide):
    """Return the SVG document showing both frames with their labels."""
    wide_x = MARGIN + COMPACT_WIDTH + GAP
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{CANVAS_WIDTH}" height="{CANVAS_HEIGHT}" viewBox="0 0 {CANVAS_WIDTH} {CANVAS_HEIGHT}">',
        f"  <title>{escape(title)} wireframe</title>",
        f"  <style>{STYLE}  </style>",
        f'  <rect x="0" y="0" width="{CANVAS_WIDTH}" height="{CANVAS_HEIGHT}" fill="#ffffff"/>',
        f'  <text x="{MARGIN}" y="44" font-size="28" class="bold">{escape(title)}</text>',
        f'  <text x="{MARGIN}" y="72" font-size="16" class="muted">{escape(caption)}</text>',
        f'  <text x="{MARGIN}" y="{TOP - 12}" font-size="14" class="muted">Compact · 390 px</text>',
        f'  <text x="{wide_x}" y="{TOP - 12}" font-size="14" class="muted">Wide · 1440 px</text>',
        compact.svg(MARGIN, TOP),
        wide.svg(wide_x, TOP),
        "</svg>",
    ]
    return "\n".join(parts) + "\n"


def main(argv):
    """Write every wireframe into the directory named by the only argument."""
    if len(argv) != 2:
        print("Usage: python scripts/draw-wireframes.py {{output-dir}}", file=sys.stderr)
        return 2
    out = Path(argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for name, draw in SCREENS.items():
        (out / name).write_text(render(*draw()), encoding="utf-8", newline="\n")
    print(f"Wrote {len(SCREENS)} wireframes to {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
