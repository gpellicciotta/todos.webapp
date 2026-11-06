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
VIEW_PANEL_HEIGHT = 536

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
.icon-line-open { fill: none; stroke: #444444; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
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

LIST_MENU = ["Edit list", "Edit view options", "Share list", "Delete list"]
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


def scrim(f):
    """Dim the whole frame behind a dialog."""
    f.rect(0, 0, f.width, f.height, "scrim", radius=0)


# ------------------------------------------------------------------------------------------------
# Chrome
# ------------------------------------------------------------------------------------------------


def user_button(f, right, y, account="local"):
    """Draw the circular user button, 44 px, with its right edge at `right`; return its left edge.

    A local user shows a person glyph, a connected one its initials, and an expired session adds a Sign in button.
    """
    cx, cy = right - 22, y + 22
    if account == "local":
        f.circle(cx, cy, 22, "icon")
        f.circle(cx, cy - 5, 5, "icon")
        f.path(f"M {cx - 9:g} {cy + 12:g} Q {cx:g} {cy - 4:g} {cx + 9:g} {cy + 12:g}", "icon-line")
    else:
        f.circle(cx, cy, 22, "icon-fill" if account == "connected" else "icon")
        f.text(cx, cy + 5, "JD", 14, "on-primary bold" if account == "connected" else "bold", "middle")
    left = right - 44
    if account == "expired":
        left = button_right(f, left - 8, y, "Sign in", "control")
    return left


def bin_glyph(f, x, y):
    """Draw the 18 px Recycle bin icon with its top left at (x, y)."""
    f.path(f"M {x + 2:g} {y + 4:g} H {x + 16:g} M {x + 6:g} {y + 4:g} V {y + 1:g} H {x + 12:g} V {y + 4:g}", "icon-line-open")
    f.path(f"M {x + 4:g} {y + 4:g} L {x + 5:g} {y + 17:g} H {x + 13:g} L {x + 14:g} {y + 4:g}", "icon-line-open")


def settings_glyph(f, x, y):
    """Draw the 18 px Settings icon, three sliders, with its top left at (x, y)."""
    for row, knob in ((4, 11), (9, 5), (14, 12)):
        f.path(f"M {x + 1:g} {y + row:g} H {x + 17:g}", "icon-line-open")
        f.circle(x + knob, y + row, 2.5, "icon")


def user_panel(f, right, y, name, status):
    """Draw the open user panel with its right edge at `right` and its top at `y`; the button sits above it.

    Recycle bin and Settings are buttons with icons, the first one marking the current route.
    """
    left = right - 200
    f.rect(left, y, 200, 184, "frame", radius=8)
    f.text(left + 16, y + 30, name, 14, "bold")
    f.text(left + 16, y + 50, status, 12, "muted")
    f.line(left + 12, y + 62, right - 12, y + 62)
    for index, (label, glyph) in enumerate((("Recycle bin", bin_glyph), ("Settings", settings_glyph))):
        top = y + 72 + index * 52
        f.rect(left + 8, top, 184, 44, "signal" if index == 0 else "control")
        glyph(f, left + 22, top + 13)
        f.text(left + 52, top + 28, label, 14)


def fab(f, right, bottom, label="New list"):
    """Draw the floating action button, a pill with a plus and a label, with its bottom right corner at (right, bottom)."""
    width = text_width(label, 14) + 56
    left, top = right - width, bottom - 44
    f.rect(left, top, width, 44, "primary", radius=22)
    f.text(left + 18, top + 28, "+", 18, "on-primary bold")
    f.text(left + 42, top + 28, label, 14, "on-primary")


def top_bar(f, title, account="local", back=False):
    """Draw the compact top bar: an optional back button, the title, and the user button."""
    f.rect(0, 0, f.width, 60, "bar", radius=0)
    x = 16
    if back:
        icon_button(f, 8, 8, "<")
        x = 60
    right = user_button(f, f.width - 8, 8, account) - 8
    f.text(x, 37, fit(title, right - x - 8, 20), 20, "bold")


def bottom_nav(f, current):
    """Draw the compact bottom navigation bar, marking the current destination."""
    top = f.height - 64
    f.rect(0, top, f.width, 64, "bar", radius=0)
    labels = ["Tasks", "Lists"]
    slot = f.width / len(labels)
    for index, label in enumerate(labels):
        cx = slot * index + slot / 2
        if label == current:
            f.rect(cx - 40, top + 8, 80, 48, "selected", radius=24)
        f.rect(cx - 9, top + 14, 18, 18, "icon", radius=3)
        f.text(cx, top + 48, label, 12, "bold" if label == current else "", "middle")


def sidebar(f, current, lists=LISTS):
    """Draw the wide sidebar with the destinations and the lists; the user menu holds the rest."""
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


def page_header(f, x, y, right, title, subtitle=None, actions=(), account="local"):
    """Draw a wide page title with an optional subtitle, right-aligned action buttons, and the user button."""
    edge = user_button(f, right, y - 6, account) - 8
    for label, css in reversed(actions):
        edge = button_right(f, edge, y, label, css) - 8
    f.text(x, y + 32, fit(title, edge - x - 16, 28), 28, "bold")
    if subtitle:
        f.text(x, y + 60, fit(subtitle, right - x, 14), 14, "muted")


# ------------------------------------------------------------------------------------------------
# Task list parts
# ------------------------------------------------------------------------------------------------


def info_line(f, x, baseline, right, text, reset=False):
    """Draw the subtle line of the active filters and the task count, with Reset when settings differ."""
    if reset:
        f.text(right, baseline, "Reset", 12, "bold", "end")
        f.line(right - text_width("Reset", 12) + 6, baseline + 3, right, baseline + 3, "icon-line")
        right -= text_width("Reset", 12) + 16
    f.text(x, baseline, fit(text, right - x, 12), 12, "muted")


def more_menu(f, x, y, items):
    """Draw an open More menu; the last item is set apart by a rule, as a destructive action."""
    f.rect(x, y, 200, len(items) * 40 + 16, "frame", radius=8)
    for index, label in enumerate(items):
        top = y + 8 + index * 40
        if index == len(items) - 1 and len(items) > 1:
            f.line(x + 8, top, x + 192, top)
        f.text(x + 16, top + 25, label, 14)


def group_header(f, x, y, width, name, count):
    """Draw one group header with the group name and its task count; return the y below it."""
    f.rect(x, y, width, 32, "box", radius=0)
    f.text(x + 12, y + 21, name, 13, "bold")
    f.text(x + width - 12, y + 21, str(count), 13, "muted", "end")
    return y + 32


def grouped_rows(f, x, y, width, wide, bottom):
    """Draw All tasks grouped by list; a task in several lists appears under each of them."""
    by_name = {
        "Home": [TASKS[0], TASKS[1], TASKS[3]],
        "Work": [TASKS[4], TASKS[5]],
        "Travel": [TASKS[2], TASKS[3]],
        "No list": [TASKS[6]],
    }
    for name, tasks in by_name.items():
        if y + 32 + ROW_HEIGHT > bottom:
            break
        y = group_header(f, x, y, width, name, len(tasks))
        y = task_rows(f, x, y, width, tasks, wide, bottom)
    return y


def check_row(f, x, y, label, checked):
    """Draw one checkbox row of 32 px and return the y below it."""
    f.rect(x, y + 8, 16, 16, "control", radius=3)
    if checked:
        f.text(x + 8, y + 21, "✓", 13, "bold", "middle")
    f.text(x + 28, y + 21, label, 14)
    return y + 32


def view_options_fields(f, x, y, width, compact=False):
    """Draw the View options: filters as an accordion, Group by, and Sort by; return the bottom edge.

    The content of the right panel on wide layouts and of the full screen on compact layouts.
    """
    f.text(x, y + 22, "Filter", 12, "muted")
    button_right(f, x + width, y, "Reset", "control", 13, 32)
    y += 36
    for label, value in [("Lists", "All lists"), ("Status", "Open"), ("Due", "Any"), ("Created", "Any")]:
        expanded = label == "Status"
        f.text(x, y + 26, label, 14, "bold" if expanded else "")
        f.text(x + width - 24, y + 26, value, 13, "muted", "end")
        f.text(x + width - 6, y + 26, "⌄" if expanded else "›", 14, "", "middle")
        y += 40
        if expanded:
            for status, name in STATUSES:
                y = check_row(f, x + 12, y, name, status in ("todo", "in-progress"))
            y += 4
        f.line(x, y, x + width, y)
    y += 12
    f.text(x, y + 14, "Group by", 12, "muted")
    segmented(f, x, y + 22, width, ["None", "List", "Due date", "Status"], 1, 12, 36)
    y += 74
    f.text(x, y + 14, "Sort by", 12, "muted")
    f.rect(x, y + 22, width - 158, 36, "control")
    f.text(x + 12, y + 45, "Created", 14)
    f.text(x + width - 158 - 16, y + 45, "⌄", 14, "", "middle")
    segmented(f, x + width - 150, y + 22, 150, ["Ascending", "Descending"], 1, 11, 36)
    y += 74
    if compact:
        label = "Show 12 tasks"
        pad = (width - text_width(label, 14)) / 2
        button(f, x, f.height - 76, label, "primary", 14, 44, pad)
    return y


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


def add_bar(f, x, y, width, placeholder="Search or add a task", typed=False, info=None, reset=False):
    """Draw the add bar and return its bottom edge.

    A text field that also searches, and an Add button. The subtle info line sits under the field: inside the
    pinned bar on compact layouts, below the box on wide layouts.
    """
    pinned = width == f.width
    height = 60 + (28 if info and pinned else 0)
    f.rect(x, y, width, height, "bar", radius=0 if pinned else 8)
    add_left = button_right(f, x + width - 8, y + 8, "Add", "primary")
    field(f, x + 8, y + 8, add_left - x - 16, placeholder, muted=not typed)
    if info:
        if pinned:
            info_line(f, x + 16, y + 74, x + width - 16, info, reset)
        else:
            info_line(f, x + 8, y + 82, x + width - 8, info, reset)
            height += 30
    return y + height


def compact_task_screen(
    f, title, tasks, account="local", back=False, nav="Tasks", grouped=False, info="24 tasks · Status: open", reset=False
):
    """Draw a compact task list screen with rows, the pinned add bar and info line, and bottom navigation."""
    top_bar(f, title, account, back)
    top = f.height - 64 - 88
    if grouped:
        grouped_rows(f, 0, 68, f.width, False, top)
    else:
        task_rows(f, 0, 68, f.width, tasks, False, top)
    add_bar(f, 0, top, f.width, info=info, reset=reset)
    bottom_nav(f, nav)


# ------------------------------------------------------------------------------------------------
# Dialogs and sheets
# ------------------------------------------------------------------------------------------------


def in_view_panel(f, title):
    """Draw a compact panel that fills the main view between the top bar and the bottom bar; return its content top.

    The bars stay visible and usable, as for the editors. The header holds the title and a close button.
    """
    f.rect(0, 60, f.width, f.height - 60 - 64, "frame", radius=0)
    f.text(16, 60 + 36, title, 20, "bold")
    icon_button(f, f.width - 52, 60 + 8, "×")
    f.line(0, 60 + 60, f.width, 60 + 60)
    return 60 + 60 + 16


def wide_dialog(f, title, width, height):
    """Draw a centered wide dialog over a dimmed screen; return its left, top, and right content edges."""
    scrim(f)
    left = (f.width - width) / 2
    top = (f.height - height) / 2
    f.rect(left, top, width, height, "frame", radius=12)
    f.text(left + 28, top + 44, title, 22, "bold")
    icon_button(f, left + width - 60, top + 16, "×")
    return left + 28, top + 76, left + width - 28


def wide_all_tasks(
    f, account="local", selected=None, right=MAIN_RIGHT, grouped=False, typed=None,
    info="24 tasks · Status: open", reset=False, more=True,
):
    """Draw the wide All tasks screen as a background or main view, with the view's More button unless `more` is off."""
    sidebar(f, "All tasks")
    page_header(f, MAIN_LEFT, 28, right, "All tasks", None, [("⋯", "control")] if more else [], account)
    add_bar(f, MAIN_LEFT, 92, right - MAIN_LEFT, typed or "Search or add a task", typed is not None, info, reset)
    top = 92 + 60 + 30 + 40
    if grouped:
        grouped_rows(f, MAIN_LEFT, top, right - MAIN_LEFT, True, f.height - 24)
    elif typed:
        matches = [task for task in TASKS if typed in task["text"].lower()]
        end = task_rows(f, MAIN_LEFT, top, right - MAIN_LEFT, matches, True, f.height - 24)
        f.text(MAIN_LEFT, end + 32, f"Add creates \u201c{typed}\u201d as a new task; matching tasks stay listed above.", 13, "muted")
    else:
        task_rows(f, MAIN_LEFT, top, right - MAIN_LEFT, TASKS, True, f.height - 24, selected=selected)


def wide_list(f, account="connected", right=MAIN_RIGHT):
    """Draw the wide Home list screen as a background or main view."""
    sidebar(f, "Home")
    actions = [("⋯", "control")]
    page_header(
        f,
        MAIN_LEFT,
        28,
        right,
        "Home",
        "Chores and repairs around the house · Shared with 2 people · You own this list",
        actions,
        account,
    )
    width = right - MAIN_LEFT
    add_bar(f, MAIN_LEFT, 112, width, info="8 tasks · Status: all", reset=True)
    y = 112 + 60 + 30 + 40
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
    add_bar(compact, 0, compact.height - 124, compact.width, "Add a task")
    bottom_nav(compact, "Tasks")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "All tasks", lists=[])
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "All tasks")
    add_bar(wide, MAIN_LEFT, 100, MAIN_RIGHT - MAIN_LEFT, "Add a task")
    empty_state(wide, (MAIN_LEFT + MAIN_RIGHT) / 2, 240, 380)
    return "First launch", "Local mode with no data: no sign-in, straight to a usable empty state.", compact, wide


def user_menu():
    """The user button and its panel: Local User in the compact layout, a connected account in the wide one."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    user_panel(compact, compact.width - 8, 60, "Local User", "Local only")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, "connected")
    user_panel(wide, MAIN_RIGHT, 28 - 6 + 44 + 4, "Jane Doe", "Connected")
    return (
        "User menu",
        "The circular user button ends the top bar; its panel holds the name, the state, Recycle bin, and Settings.",
        compact,
        wide,
    )


def all_tasks():
    """All tasks with the default open filter."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    status_menu(compact, 12, 190, "todo")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, typed="paint", info="1 of 24 tasks · Status: open")
    return (
        "All tasks",
        "Quiet by default (compact, with a status menu); typing in the add bar filters the rows (wide).",
        compact,
        wide,
    )


def view_options():
    """The View options as a full screen and as a right panel, over All tasks grouped by list."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "View options", back=True)
    view_options_fields(compact, 16, 76, compact.width - 32, compact=True)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(
        wide, right=EDITOR_LEFT - 20, grouped=True, reset=True,
        info="24 tasks · Status: open · Grouped by List · Sorted by Created, newest",
    )
    left, width = editor_panel(wide, "View options")
    view_options_fields(wide, left, 76, width)
    return (
        "View options",
        "Opens from the More menu where the editors open; changes apply at once, and the info line reports them.",
        compact,
        wide,
    )


def list_view():
    """One list in manual order, with the More menu open."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Home", "connected", back=True)
    compact.text(16, 88, fit("Chores and repairs around the house", 300, 14), 14, "muted")
    compact.text(16, 110, "Shared with 2 people · You own this list", 13, "muted")
    top = compact.height - 64 - 88
    task_rows(compact, 0, 124, compact.width, HOME_TASKS, False, top)
    add_bar(compact, 0, top, compact.width, info="8 tasks · Status: all", reset=True)
    bottom_nav(compact, "Lists")
    more_menu(compact, compact.width - 208, 56, LIST_MENU)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide)
    more_menu(wide, MAIN_RIGHT - 200, 76, LIST_MENU)
    return (
        "List",
        "Manual order with all statuses shown; the More menu holds the list and view actions.",
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
    top_bar(compact, "Lists", "connected")
    y = 60
    for name, description, open_count, total, sharing in LIST_ROWS:
        y = list_row(compact, 0, y, compact.width, name, description, f"{open_count}/{total} open", sharing)
    bottom_nav(compact, "Lists")
    fab(compact, compact.width - 16, compact.height - 64 - 16)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Lists")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Lists", account="connected")
    y = 100
    for name, description, open_count, total, sharing in LIST_ROWS:
        counts = f"{open_count} open · {total} total"
        y = list_row(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, name, description, counts, sharing)
    fab(wide, wide.width - 24, wide.height - 24)
    return (
        "Lists",
        "Every list with its counts and sharing state; New list floats at the bottom right of the screen.",
        compact,
        wide,
    )


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
    top_bar(compact, "Task", "connected", back=True)
    editor_fields(compact, 16, 76, compact.width - 32, True)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, "connected", selected=1, right=EDITOR_LEFT - 20, more=False)
    left, width = editor_panel(wide, "Task")
    editor_fields(wide, left, 76, width, False)
    return (
        "Task editor",
        "Every field saves on change; a full screen on phones and a right panel on wide screens.",
        compact,
        wide,
    )


def list_editor_fields(f, x, y, width):
    """Draw the list editor fields, details, sharing section, and delete button; return the bottom edge."""
    y = field(f, x, y, width, "Home", "Name") + 16
    f.text(x, y + 14, "Description", 13, "muted")
    f.rect(x, y + 22, width, 88, "control")
    f.text(x + 12, y + 50, fit("Chores and repairs around the house", width - 24, 14), 14)
    f.text(x + width, y + 132, "36 / 1000", 12, "muted", "end")
    y += 148
    f.text(x, y + 14, "Created 1 Oct · Owner: you", 12, "muted")
    y = sharing_fields(f, x, y + 30, width)
    y = danger_zone(f, x, y, width, "Delete list")
    f.text(x, y + 22, "Deleting a list never deletes its tasks.", 13, "muted")
    return y + 32


def list_editor():
    """The list editor, opening where the task editor opens."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "List", "connected", back=True)
    list_editor_fields(compact, 16, 76, compact.width - 32)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide, right=EDITOR_LEFT - 20)
    left, width = editor_panel(wide, "List")
    list_editor_fields(wide, left, 76, width)
    return (
        "List editor",
        "Name, description, and sharing; opens where the task editor opens, as a full screen or a right panel.",
        compact,
        wide,
    )


def sharing_fields(f, x, y, width):
    """Draw the Sharing section of the list editor; return the bottom edge."""
    f.text(x, y + 16, "Sharing", 16, "bold")
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
    y += 8
    f.text(x, y + 14, "Invite", 13, "muted")
    y += 22
    field(f, x, y, width, "Email address", muted=True)
    y += 52
    f.rect(x, y, width - 100, 44, "control")
    f.text(x + 12, y + 27, "Task editor ▾", 14)
    button_right(f, x + width, y, "Invite", "primary")
    return y + 44


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
    top_bar(compact, "Sync log", "connected", back=True)
    y = 76
    for entry in LOG_ENTRIES:
        y = log_entry(compact, 12, y, compact.width - 24, *entry)
    compact.text(16, y + 20, "Entries stay for 30 days.", 13, "muted")
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(
        wide, MAIN_LEFT, 28, MAIN_RIGHT, "Sync log", "Values that sync overwrote or undid in the last 30 days.", account="connected"
    )
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
    top_bar(compact, "Connect", "connected", back=True)
    connect_steps(compact, 16, 84, compact.width - 32)
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Connect", account="connected")
    connect_steps(wide, MAIN_LEFT, 100, 560)
    return "Connect", "After sign-in, local data uploads into the account; same-named lists merge.", compact, wide


def import_fields(f, x, y, width, actions=True):
    """Draw the import dialog content, with its buttons unless `actions` is off; return the bottom edge."""
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
    if not actions:
        return y
    left = button(f, x, y, "Import", "primary") + 8
    button(f, left, y, "Cancel")
    return y + 44


def import_dialog():
    """The import dialog with the mode choice and counts."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Settings")
    settings_sections(compact, 12, 72, compact.width - 24)
    bottom_nav(compact, "Settings")
    top = in_view_panel(compact, "Import backup")
    import_fields(compact, 16, top, compact.width - 32, actions=False)
    bottom = compact.height - 64
    compact.line(0, bottom - 68, compact.width, bottom - 68)
    right = compact.width - 16
    left = button_right(compact, right, bottom - 56, "Import", "primary")
    button_right(compact, left - 8, bottom - 56, "Cancel")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Settings")
    settings_sections(wide, MAIN_LEFT, 96, 640)
    left, top, right = wide_dialog(wide, "Import backup", 560, 440)
    import_fields(wide, left, top, right - left)
    return (
        "Import backup",
        "The file's counts, the mode choice, and what the import will change; in the main view on phones, a dialog on wide screens.",
        compact,
        wide,
    )


SCREENS = {
    "first-launch.svg": first_launch,
    "all-tasks.svg": all_tasks,
    "user-menu.svg": user_menu,
    "list.svg": list_view,
    "view-options.svg": view_options,
    "lists.svg": lists,
    "task-editor.svg": task_editor,
    "list-editor.svg": list_editor,
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
