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
RAIL_WIDTH = 68
NAV_TOGGLE = (12, 22)
MAIN_LEFT = SIDEBAR_WIDTH + 40
MAIN_RIGHT = 1104
EDITOR_LEFT = 1020
# Where the right-hand column of the task editor starts, past the label column and its gap.
EDITOR_COLUMN = 140
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
.icon-dashed { fill: #ffffff; stroke: #444444; stroke-width: 2; stroke-dasharray: 3 3; }
.meter { fill: #dddddd; stroke: none; }
.meter-fill { fill: #444444; stroke: none; }
.tooltip { fill: #222222; stroke: #222222; }
"""

LISTS = [("Home", 9), ("Work", 12), ("Travel", 3), ("Errands", 5), ("Reading", 2)]

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
        "count": "2/3",
    },
    {"text": "Sport", "status": "in-progress", "repeat": "Weekly", "progress": (0.85, "2 h 50 / 3 h 20 min")},
    {
        "text": "Calories",
        "status": "behind",
        "repeat": "Daily",
        "progress": (1.0, "⚠ 1,720 / max 1,600 kcal · 120 over"),
        "alert": True,
    },
    {"text": "Submit the grant report", "status": "failed", "due": "Yesterday 17:00 · Failed", "lists": ["Work"]},
    {"text": "Send the invoice to the client", "status": "todo", "lists": ["Work"]},
    {"text": "Water the plants", "status": "todo", "repeat": "Daily"},
    {"text": "Read chapter 4 of the novel", "status": "todo", "lists": ["Reading"]},
    {"text": "Fix the bike light", "status": "todo", "lists": ["Errands"]},
]

HOME_TASKS = [
    {"text": "Call the plumber about the leak", "status": "in-progress", "due": "Overdue", "notes": 2},
    {"text": "Buy paint for the hallway", "status": "todo", "due": "Today 18:00", "lists": ["Errands"]},
    {"text": "Clean the gutters", "status": "todo", "due": "Sat"},
    {"text": "Replace the smoke detector batteries", "status": "todo"},
    {"text": "Sort the winter clothes", "status": "in-progress", "count": "2/3"},
    {"text": "Fix the squeaky door", "status": "todo"},
    {"text": "Paint the garden fence", "status": "completed"},
    {"text": "Buy a new lawn mower", "status": "cancelled"},
    {"text": "Start the spring planting", "status": "upcoming", "starts": "tomorrow 07:00"},
]

LIST_MENU = ["Edit list", "Edit view options", "Share list", "Delete list"]
STATUSES = [
    ("todo", "To do"),
    ("in-progress", "In progress"),
    ("completed", "Completed"),
    ("failed", "Failed"),
    ("cancelled", "Cancelled"),
]
FINISHED = ("completed", "failed", "cancelled")


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
    """Draw a status icon; the statuses differ in shape, so the gray wireframes tell them apart.

    In progress fills the bottom half, whether on track or not (`behind`); the app tells those two apart by color.
    Completed, Failed, and Cancelled are filled circles with a light check, cross, or dash.
    Upcoming is a dashed ring.
    """
    if status in FINISHED:
        f.circle(cx, cy, r, "icon-fill")
        if status == "completed":
            f.path(f"M{cx - 4} {cy} l3 3 l5 -6", "icon-mark")
        elif status == "failed":
            f.path(f"M{cx - 4} {cy - 4} L{cx + 4} {cy + 4} M{cx + 4} {cy - 4} L{cx - 4} {cy + 4}", "icon-mark")
        else:
            f.path(f"M{cx - 5} {cy} L{cx + 5} {cy}", "icon-mark")
        return
    if status == "upcoming":
        f.circle(cx, cy, r, "icon-dashed")
        return
    f.circle(cx, cy, r, "icon")
    if status in ("in-progress", "behind"):
        f.path(f"M{cx - r} {cy} A{r} {r} 0 0 0 {cx + r} {cy} Z", "icon-fill")


def scrim(f):
    """Dim the whole frame behind a dialog."""
    f.rect(0, 0, f.width, f.height, "scrim", radius=0)


# ------------------------------------------------------------------------------------------------
# Chrome
# ------------------------------------------------------------------------------------------------


def sync_indicator(f, right, y):
    """Draw the 44 px sync indicator, a cloud glyph, with its right edge at `right`; return its left edge."""
    left = right - 44
    x, top = left + 11, y + 14
    f.path(
        f"M {x + 4:g} {top + 16:g} H {x + 18:g} A 5 5 0 0 0 {x + 18:g} {top + 6:g} "
        f"A 8 8 0 0 0 {x + 4:g} {top + 8:g} A 4 4 0 0 0 {x + 4:g} {top + 16:g} Z",
        "icon-line-open",
    )
    return left


def view_actions_button(f, x, y):
    """Draw the 44 px view actions button with three stacked dots, which sits just before the user button."""
    f.rect(x, y, 44, 44, "control")
    for offset in (-7, 0, 7):
        f.circle(x + 22, y + 22 + offset, 2, "icon-fill")


def user_button(f, right, y, account="local", extra=0):
    """Draw the circular user button, 44 px, with its right edge at `right`, and the sync indicator before it.

    `extra` leaves room between the two for the view actions button.

    A local user shows a person glyph and a connected one its initials. An expired session looks like a local one;
    the sync indicator and the banner above the views offer Sign in. Return the left edge of the indicator.
    """
    cx, cy = right - 22, y + 22
    if account == "local":
        f.circle(cx, cy, 22, "icon")
        f.circle(cx, cy - 5, 5, "icon")
        f.path(f"M {cx - 9:g} {cy + 12:g} Q {cx:g} {cy - 4:g} {cx + 9:g} {cy + 12:g}", "icon-line")
    else:
        f.circle(cx, cy, 22, "icon-fill" if account == "connected" else "icon")
        f.text(cx, cy + 5, "JD", 14, "on-primary bold" if account == "connected" else "bold", "middle")
    return sync_indicator(f, right - 44 - extra, y)


def bin_glyph(f, x, y):
    """Draw the 18 px Recycle bin icon with its top left at (x, y)."""
    f.path(
        f"M {x + 2:g} {y + 4:g} H {x + 16:g} M {x + 6:g} {y + 4:g} V {y + 1:g} H {x + 12:g} V {y + 4:g}",
        "icon-line-open",
    )
    f.path(f"M {x + 4:g} {y + 4:g} L {x + 5:g} {y + 17:g} H {x + 13:g} L {x + 14:g} {y + 4:g}", "icon-line-open")


def settings_glyph(f, x, y):
    """Draw the 18 px Settings icon, three sliders, with its top left at (x, y)."""
    for row, knob in ((4, 11), (9, 5), (14, 12)):
        f.path(f"M {x + 1:g} {y + row:g} H {x + 17:g}", "icon-line-open")
        f.circle(x + knob, y + row, 2.5, "icon")


def help_glyph(f, x, y):
    """Draw the 18 px Help icon, a circle holding a question mark, with its top left at (x, y)."""
    f.circle(x + 9, y + 9, 8, "icon")
    f.path(
        f"M {x + 6.5:g} {y + 7:g} Q {x + 6.5:g} {y + 4:g} {x + 9:g} {y + 4:g} Q {x + 11.5:g} {y + 4:g} {x + 11.5:g} {y + 6.5:g} "
        f"Q {x + 11.5:g} {y + 8.5:g} {x + 9:g} {y + 9.5:g} V {y + 11:g}",
        "icon-line-open",
    )
    f.circle(x + 9, y + 13.5, 0.8, "icon-fill")


def user_panel(f, right, y, name, status):
    """Draw the open user panel with its right edge at `right` and its top at `y`; the button sits above it.

    Recycle bin, Settings, and Help are buttons with icons, the first one marking the current route.
    """
    left = right - 200
    f.rect(left, y, 200, 236, "frame", radius=8)
    f.text(left + 16, y + 30, name, 14, "bold")
    f.text(left + 16, y + 50, status, 12, "muted")
    f.line(left + 12, y + 62, right - 12, y + 62)
    for index, (label, glyph) in enumerate(
        (("Recycle bin", bin_glyph), ("Settings", settings_glyph), ("Help", help_glyph))
    ):
        top = y + 72 + index * 52
        f.rect(left + 8, top, 184, 44, "signal" if index == 0 else "control")
        glyph(f, left + 22, top + 13)
        f.text(left + 52, top + 28, label, 14)


def fab(f, right, bottom):
    """Draw the floating action button, a 56 px circle with only a plus, with its bottom right corner at (right, bottom)."""
    f.circle(right - 28, bottom - 28, 28, "icon-fill")
    f.text(right - 28, bottom - 28 + 9, "+", 28, "on-primary bold", "middle")


def top_bar(f, title, account="local", back=False, actions=False):
    """Draw the compact top bar: an optional back button, the title, and the user button.

    A view with `actions` shows the three-dot view actions button just before the user button.
    """
    f.rect(0, 0, f.width, 60, "bar", radius=0)
    x = 16
    if back:
        icon_button(f, 8, 8, "<")
        x = 60
    right = user_button(f, f.width - 8, 8, account, 52 if actions else 0) - 8
    if actions:
        view_actions_button(f, f.width - 8 - 96, 8)
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


def nav_toggle(f):
    """Draw the 44 px nav toggle that opens the wide top row, with a plain three-line glyph.

    The real glyph shows the next step: collapse while open, hide in the rail, and menu while hidden.
    """
    x, y = NAV_TOGGLE
    f.rect(x, y, 44, 44, "control")
    for offset in (15, 22, 29):
        f.path(f"M {x + 13:g} {y + offset:g} H {x + 31:g}", "icon-line-open")


def sidebar_head(f):
    """Draw the open sidebar's ground and its top row, which holds the nav toggle."""
    f.rect(0, 0, SIDEBAR_WIDTH, f.height, "bar", radius=0)
    nav_toggle(f)


def all_tasks_glyph(f, cx, cy):
    """Draw the 18 px All tasks glyph, a check mark, centered on (cx, cy)."""
    f.path(f"M {cx - 8:g} {cy:g} L {cx - 3:g} {cy + 6:g} L {cx + 8:g} {cy - 6:g}", "icon-line-open")


def lists_glyph(f, cx, cy):
    """Draw the 18 px Lists glyph, three bulleted lines, centered on (cx, cy); unlike the toggle, it has bullets."""
    for offset in (-6, 0, 6):
        f.circle(cx - 7, cy + offset, 1.5, "icon-fill")
        f.path(f"M {cx - 2:g} {cy + offset:g} H {cx + 8:g}", "icon-line-open")


def rail(f, current, lists=LISTS):
    """Draw the sidebar as an icon rail: the toggle, the destination glyphs, and a monogram tile per list.

    The rail clips the labels and the counts. A monogram is the list name's first character, uppercased;
    the current list's tile takes the signal look. Return the top of each list's 44 px row, by name.
    """
    f.rect(0, 0, RAIL_WIDTH, f.height, "bar", radius=0)
    nav_toggle(f)
    cx = RAIL_WIDTH / 2
    y = 80
    for label, glyph in (("All tasks", all_tasks_glyph), ("Lists", lists_glyph)):
        if label == current:
            f.rect(cx - 22, y, 44, 40, "selected")
        glyph(f, cx, y + 20)
        y += 44
    rows = {}
    for name, _ in lists:
        rows[name] = y
        f.rect(cx - 16, y + 4, 32, 32, "signal" if name == current else "box")
        f.text(cx, y + 25, name[0].upper(), 14, "bold", "middle")
        y += 44
    return rows


def rail_tooltip(f, top, name):
    """Draw the hover tooltip that names the list of the rail row at `top`, just right of the rail."""
    width = text_width(name, 13) + 20
    f.rect(RAIL_WIDTH + 8, top + 6, width, 28, "tooltip", radius=4)
    f.text(RAIL_WIDTH + 18, top + 25, name, 13, "on-primary")


def nav_item(f, y, label, count, selected, indent=0):
    """Draw one 40 px sidebar item at y and return the y of the next item."""
    if selected:
        f.rect(12, y, SIDEBAR_WIDTH - 24, 40, "selected")
    f.text(28 + indent, y + 26, label, 14, "bold" if selected else "")
    if count is not None:
        f.text(SIDEBAR_WIDTH - 28, y + 26, str(count), 13, "muted", "end")
    return y + 44


def sidebar(f, current, lists=LISTS):
    """Draw the wide sidebar with the destinations and the lists; the user menu holds the rest."""
    sidebar_head(f)
    y = nav_item(f, 80, "All tasks", 24 if lists else 0, current == "All tasks")
    y = nav_item(f, y, "Lists", None, current == "Lists")
    if lists:
        for name, count in lists:
            y = nav_item(f, y, name, count, current == name, indent=16)
    else:
        f.text(44, y + 22, "No lists yet", 13, "muted")


def sidebar_many(f, current, rows, total, find=None, matches=None):
    """Draw the wide sidebar for many lists.

    All tasks, Lists, and the find field stay fixed; only the list rows below scroll, and a scrollbar
    thumb shows the position. A zero open count is left out. `rows` are (name, open count) pairs, `total` is the
    number of lists, and `matches` is the number of lists the find text leaves.
    """
    sidebar_head(f)
    y = nav_item(f, 80, "All tasks", 24, current == "All tasks")
    y = nav_item(f, y, "Lists", None, current == "Lists")
    f.rect(12, y, SIDEBAR_WIDTH - 24, 40, "control")
    f.text(24, y + 26, find or "Find a list", 14, "" if find else "muted")
    if find:
        f.text(SIDEBAR_WIDTH - 24, y + 26, f"{matches} of {total}", 12, "muted", "end")
    top, bottom = y + 52, f.height - 8
    y = top
    shown = 0
    for name, count in rows:
        if y + 40 > bottom:
            break
        y = nav_item(f, y, name, count or None, name == current, indent=16)
        shown += 1
    if shown < total and not find:
        track = bottom - top
        f.rect(SIDEBAR_WIDTH - 6, top, 4, track, "box", radius=2)
        f.rect(SIDEBAR_WIDTH - 6, top + track * 0.14, 4, track * shown / total, "selected", radius=2)


def page_header(f, x, y, right, title, subtitle=None, actions=(), account="local"):
    """Draw a wide page title with an optional subtitle, and the user button.

    A view with `actions` shows the three-dot view actions button just before the user button.
    """
    extra = 52 if actions else 0
    edge = user_button(f, right, y - 6, account, extra) - 8
    if actions:
        view_actions_button(f, right - 96, y - 6)
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


def group_header(f, x, y, width, name, count, collapsed=False):
    """Draw one group header: chevron, name, and count, such as "3 of 4"; return the y below it."""
    f.rect(x, y, width, 32, "box", radius=0)
    f.text(x + 12, y + 21, "›" if collapsed else "⌄", 13, "muted")
    f.text(x + 32, y + 21, name, 13, "bold")
    f.text(x + width - 12, y + 21, count, 13, "muted", "end")
    return y + 32


def grouped_rows(f, x, y, width, wide, bottom):
    """Draw All tasks grouped by list; a task in several lists appears under each of them.

    Home counts "3 of 4" since the Status filter hides a finished task; Work is collapsed.
    """
    groups = [
        ("Home", [TASKS[0], TASKS[1], TASKS[3]], "3 of 4", False),
        ("Work", [TASKS[4], TASKS[5]], "2", True),
        ("Travel", [TASKS[2], TASKS[3]], "2", False),
        ("No list", [TASKS[6]], "1", False),
    ]
    for name, tasks, count, collapsed in groups:
        if y + 32 + ROW_HEIGHT + 20 > bottom:
            break
        y = group_header(f, x, y, width, name, count, collapsed)
        if not collapsed:
            y = task_rows(f, x, y, width, tasks, wide, bottom)
    return y


def check_row(f, x, y, label, checked):
    """Draw one checkbox row of 32 px and return the y below it."""
    f.rect(x, y + 8, 16, 16, "control", radius=3)
    if checked:
        f.text(x + 8, y + 21, "✓", 13, "bold", "middle")
    f.text(x + 28, y + 21, label, 14)
    return y + 32


def finished_brace(f, x, top, bottom):
    """Draw a curly brace from top to bottom with its tip right of x, and the Finished today only checkbox there.

    The checkbox middle sits level with the brace tip, so the choice reads as narrowing the bracketed statuses.
    """
    mid = (top + bottom) / 2
    f.path(
        f"M {x:g} {top + 4:g} Q {x + 5:g} {top + 4:g} {x + 5:g} {top + 12:g} L {x + 5:g} {mid - 6:g} "
        f"Q {x + 5:g} {mid:g} {x + 10:g} {mid:g} Q {x + 5:g} {mid:g} {x + 5:g} {mid + 6:g} "
        f"L {x + 5:g} {bottom - 12:g} Q {x + 5:g} {bottom - 4:g} {x:g} {bottom - 4:g}",
        "icon-line-open",
    )
    check_row(f, x + 16, mid - 16, "Finished today only", False)


def view_options_fields(f, x, y, width, compact=False):
    """Draw the View options: filters as an accordion, Group by, and Sort by; return the bottom edge.

    The content of the right panel on wide layouts and of the full screen on compact layouts.
    """
    f.text(x, y + 22, "Filter", 12, "muted")
    button_right(f, x + width, y, "Reset", "control", 13, 32)
    y += 36
    for label, value in [("Lists", "All lists"), ("Status", "All"), ("Due", "Any"), ("Created", "Any")]:
        expanded = label == "Status"
        f.text(x, y + 26, label, 14, "bold" if expanded else "")
        f.text(x + width - 24, y + 26, value, 13, "muted", "end")
        f.text(x + width - 6, y + 26, "⌄" if expanded else "›", 14, "", "middle")
        y += 40
        if expanded:
            for status, name in STATUSES:
                if status not in FINISHED:
                    y = check_row(f, x + 12, y, name, True)
            top = y
            for status, name in STATUSES:
                if status in FINISHED:
                    y = check_row(f, x + 12, y, name, True)
            finished_brace(f, x + 142, top, y)
            y = check_row(f, x + 12, y, "Show upcoming", True)
            y += 4
        f.line(x, y, x + width, y)
    y += 12
    f.text(x, y + 14, "Group by", 12, "muted")
    f.rect(x, y + 22, width, 36, "control")
    f.text(x + 12, y + 45, "List", 14)
    f.text(x + width - 16, y + 45, "⌄", 14, "", "middle")
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


def row_meta(task):
    """Return the meta line parts of a task row: the start, due, or repeat text with its emphasis flag, and the lists."""
    if task.get("starts"):
        text = ("▷ Starts " + task["starts"], False)
    elif task.get("due"):
        text = ("◷ " + task["due"], task["due"] == "Overdue" or task["status"] == "failed")
    elif task.get("repeat"):
        text = ("↻ " + task["repeat"], False)
    else:
        text = None
    return text, task.get("lists", [])


def row_height(task):
    """Return the height of a task row: 48 px, or 68 px with a meta line."""
    text, names = row_meta(task)
    return ROW_HEIGHT + (20 if text or names or task.get("progress") else 0)


def task_row(f, x, y, width, task, wide, handle=False, selected=False):
    """Draw one task row, variant C: a status button with a count badge, the description, and a meta line.

    The row is 48 px high, or 68 px when the meta line has content. The drag handle sits in the gutter before the
    row. Return the y of the next row.
    """
    text, names = row_meta(task)
    height = row_height(task)
    if selected:
        f.rect(x, y + 1, width, height - 2, "selected", radius=4)
    f.line(x, y + height, x + width, y + height)
    if handle:
        f.text(x - 22, y + 30, "⋮⋮", 14, "muted")
    cx, cy = x + 22, y + 24
    status_icon(f, cx, cy, task["status"])
    if task.get("count"):
        badge = text_width(task["count"], 10) + 8
        f.rect(cx + 3, cy + 4, badge, 15, "chip", radius=7)
        f.text(cx + 3 + badge / 2, cy + 15, task["count"], 10, "bold", "middle")
    text_left = x + 48
    done = task["status"] in ("completed", "cancelled", "failed", "upcoming")
    label = fit(task["text"], x + width - 8 - text_left, 15)
    f.text(text_left, y + 29, label, 15, "muted" if done else "")
    if task["status"] == "cancelled":
        f.line(text_left, y + 24, text_left + text_width(label, 15) * 0.9, y + 24, "icon-line")
    left = text_left
    if text:
        f.text(left, y + 52, text[0], 12, "bold" if text[1] else "muted")
        left += text_width(text[0], 12) + 10
    if task.get("progress"):
        share, label = task["progress"]
        f.rect(left, y + 44, 32, 5, "meter", radius=2)
        f.rect(left, y + 44, 32 * share, 5, "meter-fill", radius=2)
        left += 38
        f.text(left, y + 52, label, 12, "bold" if task.get("alert") else "muted")
        left += text_width(label, 12) + 10
    right = x + width - 8
    if names and not wide:
        f.text(right, y + 52, fit(" · ".join(names), right - left, 12), 12, "muted", "end")
    elif names:
        if len(names) > 2:
            right = chip(f, right, y + 36, f"+{len(names) - 2}") - 6
        for name in reversed(names[:2]):
            right = chip(f, right, y + 36, name) - 6
    return y + height


def task_rows(f, x, y, width, tasks, wide, bottom, handle=False, selected=None):
    """Draw task rows until the list or the space runs out; return the y after the last row."""
    for index, task in enumerate(tasks):
        header = 32 if starts_upcoming(tasks, index) else 0
        if y + header + ROW_HEIGHT + 20 > bottom:
            break
        y = upcoming_header(f, x, y, width, tasks, index)
        y = task_row(f, x, y, width, task, wide, handle, index == selected)
    return y


def starts_upcoming(tasks, index):
    """Tell whether the task at index is the first upcoming one, which the Upcoming group header precedes."""
    return tasks[index]["status"] == "upcoming" and all(t["status"] != "upcoming" for t in tasks[:index])


def upcoming_header(f, x, y, width, tasks, index):
    """Draw the Upcoming group header before the first upcoming task; return the y of the next row."""
    if not starts_upcoming(tasks, index):
        return y
    count = sum(1 for task in tasks if task["status"] == "upcoming")
    f.text(x + 8, y + 22, f"Upcoming · {count}", 12, "bold")
    f.line(x, y + 32, x + width, y + 32)
    return y + 32


def add_bar(f, x, y, width, placeholder="Search or add a task", typed=False, info=None, reset=False):
    """Draw the add bar and return its bottom edge.

    A text field that also searches, and an Add button. The compact bar, as wide as the frame, is one line that ends
    in a square plus button. Wide layouts spell Add out and show the subtle info line below the box.
    """
    pinned = width == f.width
    height = 60
    f.rect(x, y, width, height, "bar", radius=0 if pinned else 8)
    if pinned:
        add_left = x + width - 52
        button(f, add_left, y + 8, "+", "primary", 20, 44, (44 - text_width("+", 20)) / 2)
    else:
        add_left = button_right(f, x + width - 8, y + 8, "Add", "primary")
    field(f, x + 8, y + 8, add_left - x - 16, placeholder, muted=not typed)
    if info and not pinned:
        info_line(f, x + 8, y + 82, x + width - 8, info, reset)
        height += 30
    return y + height


def compact_task_screen(
    f,
    title,
    tasks,
    account="local",
    back=False,
    nav="Tasks",
    grouped=False,
):
    """Draw a compact task list screen with rows, the pinned add bar, and bottom navigation."""
    top_bar(f, title, account, back, actions=True)
    top = f.height - 64 - 60
    if grouped:
        grouped_rows(f, 0, 68, f.width, False, top)
    else:
        task_rows(f, 0, 68, f.width, tasks, False, top)
    add_bar(f, 0, top, f.width)
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
    f,
    account="local",
    selected=None,
    right=MAIN_RIGHT,
    grouped=False,
    typed=None,
    info="24 tasks",
    reset=False,
    more=True,
    left=MAIN_LEFT,
    nav=sidebar,
):
    """Draw the wide All tasks screen as a background or main view, with the view's More button unless `more` is off.

    `nav` draws the sidebar, open or as a rail, and `left` is the main column's left edge beside it.
    Return what `nav` returns.
    """
    drawn = nav(f, "All tasks")
    page_header(f, left, 28, right, "All tasks", None, [("⋯", "control")] if more else [], account)
    add_bar(f, left, 92, right - left, typed or "Search or add a task", typed is not None, info, reset)
    top = 92 + 60 + 30 + 40
    if grouped:
        grouped_rows(f, left, top, right - left, True, f.height - 24)
    elif typed:
        matches = [task for task in TASKS if typed in task["text"].lower()]
        task_rows(f, left, top, right - left, matches, True, f.height - 24)
        f.text(
            left + 8,
            top - 24,
            f"Add creates \u201c{typed}\u201d as a new task; matching tasks stay listed above.",
            13,
            "muted",
        )
    else:
        task_rows(f, left, top, right - left, TASKS, True, f.height - 24, selected=selected)
    return drawn


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
    add_bar(f, MAIN_LEFT, 112, width, info="9 tasks")
    y = 112 + 60 + 30 + 40
    for index, task in enumerate(HOME_TASKS):
        if index == 3:
            f.line(MAIN_LEFT, y, right, y, "drop")
        y = upcoming_header(f, MAIN_LEFT, y, width, HOME_TASKS, index)
        y = task_row(f, MAIN_LEFT, y, width, task, True, handle=index == 1)
    f.text(
        MAIN_LEFT,
        y + 32,
        "Press and drag a row, or use Alt+Up, Alt+Down, Alt+Home, and Alt+End; the black line marks the drop spot.",
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
        "The circular user button ends the top bar; its panel holds the name, the state, Recycle bin, Settings, and Help.",
        compact,
        wide,
    )


def all_tasks():
    """All tasks with the default filter of every status."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, typed="paint", info="1 of 24 tasks")
    return (
        "All tasks",
        "Rows show status, count badge or goal meter, and meta line; a tap ticks or logs, a row opens the editor.",
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
        wide,
        right=EDITOR_LEFT - 20,
        grouped=True,
        reset=True,
        info="24 tasks · Grouped by List · Sorted by Created, newest",
    )
    left, width = editor_panel(wide, "View options")
    view_options_fields(wide, left, 76, width)
    return (
        "View options",
        "Opens from the More menu where the editors open; changes apply at once, and the wide info line reports them.",
        compact,
        wide,
    )


def list_view():
    """One list in manual order, with the More menu open."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Home", "connected", back=True, actions=True)
    compact.text(16, 88, fit("Chores and repairs around the house", 300, 14), 14, "muted")
    compact.text(16, 110, "Shared with 2 people · You own this list", 13, "muted")
    top = compact.height - 64 - 60
    task_rows(compact, 0, 124, compact.width, HOME_TASKS, False, top)
    add_bar(compact, 0, top, compact.width)
    bottom_nav(compact, "Lists")
    more_menu(compact, compact.width - 208, 56, LIST_MENU)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_list(wide)
    more_menu(wide, MAIN_RIGHT - 96 + 44 - 200, 70, LIST_MENU)
    return (
        "List",
        "Manual order with all statuses shown; the More menu holds the list and view actions.",
        compact,
        wide,
    )


def nav_rail():
    """All tasks with the wide sidebar collapsed to an icon rail, the pointer resting on one list's monogram."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    rows = wide_all_tasks(wide, left=RAIL_WIDTH + 40, nav=rail)
    rail_tooltip(wide, rows["Travel"], "Travel")
    return (
        "Nav rail",
        "The nav toggle collapses the wide sidebar to glyphs and list monograms, and a hover names the list; the next press hides it, and the main column takes the full width.",
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


# A window of a 124-list account in manual order: name, description, open count, total count, sharing state.
MANY_ROWS = [
    ("Garden", "Spring planting and the fence", 7, 15, None),
    ("Home", "Chores and repairs around the house", 8, 14, "Shared"),
    ("Groceries", "Weekly shopping", 9, 40, "Shared"),
    ("Work", "Projects and follow-ups", 12, 30, None),
    ("Gym", "Training plan and bookings", 3, 12, None),
    ("Taxes", "Forms and receipts for this year", 0, 6, None),
    ("Garage", "Tools, shelves, and the bike repair", 4, 11, None),
    ("Gifts", "Ideas for birthdays and holidays", 0, 6, None),
    ("Health", "Appointments and checkups", 2, 9, None),
    ("Holidays", "Trips planned for next year", 6, 21, "By Ann"),
    ("Insurance", "Policies and renewals", 1, 5, None),
    ("Kids", "School, clubs, and play dates", 5, 18, None),
    ("Legal", "Contracts and paperwork", 2, 4, None),
    ("Yoga", "Classes and routines", 0, 3, None),
]
FIND_RESULTS = ["Garage", "Garden", "Legal", "Yoga"]
MANY_TOTAL = 124


def find_bar(f, x, y, width, value="", sort="Manual order", info=None, reset=False):
    """Draw the find and sort bar of the Lists screen and return its bottom edge.

    It follows the add bar: pinned above the bottom navigation when compact, above the rows when wide.
    """
    pinned = width == f.width
    f.rect(x, y, width, 88 if pinned else 60, "bar", radius=0 if pinned else 8)
    if pinned:
        left = x + width - 52
        icon_button(f, left, y + 8, "↕")
    else:
        left = button_right(f, x + width - 8, y + 8, f"Sort: {sort}")
    field_width = left - x - 16
    field(f, x + 8, y + 8, field_width, value or "Find a list", muted=not value)
    if value:
        f.text(x + 8 + field_width - 14, y + 36, "×", 18, "", "end")
    if info:
        if pinned:
            info_line(f, x + 16, y + 74, x + width - 16, info, reset)
        else:
            info_line(f, x + 8, y + 82, x + width - 8, info, reset)
    return y + (88 if pinned else 90)


def list_rows_until(f, x, y, width, rows, wide, bottom):
    """Draw list overview rows while a whole row fits above `bottom`; return the next y."""
    for name, description, open_count, total, sharing in rows:
        if y + 64 > bottom:
            break
        counts = f"{open_count} open · {total} total" if wide else f"{open_count}/{total} open"
        y = list_row(f, x, y, width, name, description, counts, sharing)
    return y


def lists_many():
    """The Lists screen and the sidebar with 124 lists."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Lists", "connected")
    bar_top = compact.height - 64 - 88
    list_rows_until(compact, 0, 60, compact.width, MANY_ROWS, False, bar_top)
    find_bar(compact, 0, bar_top, compact.width, info=f"{MANY_TOTAL} lists")
    bottom_nav(compact, "Lists")
    fab(compact, compact.width - 16, bar_top - 16)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar_many(wide, "Garden", [(name, open_count) for name, _, open_count, _, _ in MANY_ROWS], MANY_TOTAL)
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Lists", account="connected")
    y = find_bar(wide, MAIN_LEFT, 100, MAIN_RIGHT - MAIN_LEFT, info=f"{MANY_TOTAL} lists") + 32
    list_rows_until(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, MANY_ROWS, True, wide.height)
    fab(wide, wide.width - 24, wide.height - 24)
    return (
        "Lists with many lists",
        "The sidebar keeps its header fixed and scrolls only the lists; the Lists screen finds, sorts, and renders every list.",
        compact,
        wide,
    )


def lists_find():
    """Finding a list: no match with the create offer when compact, matches in the sidebar and screen when wide."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Lists", "connected")
    bar_top = compact.height - 64 - 88
    typed = "Garden shed"
    compact.text(compact.width / 2, 200, f'No list matches "{typed}".', 16, "bold", "middle")
    button(
        compact,
        (compact.width - (text_width(f'Create list "{typed}"', 14) + 32)) / 2,
        224,
        f'Create list "{typed}"',
        "primary",
    )
    find_bar(compact, 0, bar_top, compact.width, value=typed, sort="Name", info=f"0 of {MANY_TOTAL} lists")
    bottom_nav(compact, "Lists")
    fab(compact, compact.width - 16, bar_top - 16)
    in_manual_order = [row for row in MANY_ROWS if row[0] in FIND_RESULTS]
    results = sorted(in_manual_order, key=lambda row: row[0])
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar_many(
        wide,
        "Garden",
        [(name, open_count) for name, _, open_count, _, _ in in_manual_order],
        MANY_TOTAL,
        "ga",
        len(results),
    )
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Lists", account="connected")
    info = f"{len(results)} of {MANY_TOTAL} lists · Sorted by Name"
    y = find_bar(wide, MAIN_LEFT, 100, MAIN_RIGHT - MAIN_LEFT, "ga", "Name", info, reset=True) + 32
    list_rows_until(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, results, True, wide.height)
    fab(wide, wide.width - 24, wide.height - 24)
    return (
        "Finding a list",
        "Compact: no match offers Create list. Wide: the sidebar keeps manual order; the Lists screen sorts by name.",
        compact,
        wide,
    )


TAB_NAMES = ["Status", "Notes", "Configuration", "History"]


def tab_strip(f, x, y, width, current):
    """Draw the editor tab strip, tabs as wide as their names, with an underline on the current one; return the bottom."""
    left = x
    for index, name in enumerate(TAB_NAMES):
        name_width = text_width(name, 14)
        f.text(left, y + 28, name, 14, "bold" if index == current else "muted")
        if index == current:
            f.rect(left - 4, y + 41, name_width + 8, 3, "primary", radius=0)
        left += name_width + 22
    f.line(x, y + 44, x + width, y + 44)
    return y + 60


def labeled(f, x, y, width, label, value, height=36, muted=False):
    """Draw a task editor row, its label left and its field in the right-hand column; return the bottom edge."""
    f.text(x, y + 23, label, 13, "muted")
    return field(f, x + EDITOR_COLUMN, y, width - EDITOR_COLUMN, value, height=height, muted=muted)


def choices(f, x, y, width, labels, current):
    """Draw a segmented control in the right-hand column, two choices per row; return the bottom edge."""
    left = x + EDITOR_COLUMN
    half = (width - EDITOR_COLUMN) / 2
    for start in range(0, len(labels), 2):
        row = labels[start : start + 2]
        segmented(f, left, y, half * len(row), row, current - start, 12, 30)
        y += 30
    return y


def notes_tab(f, x, y, width):
    """Draw the Notes tab: the add and search field with its button, then the note thread; return the bottom edge."""
    y = labeled(f, x, y, width, "Add note", "Add or search notes", 60, muted=True) + 8
    button_right(f, x + width, y, "Add note", height=36)
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
    return y


def status_tab(f, x, y, width):
    """Draw the Status tab for Calories, a daily goal of at most 1,600 kcal, now above its limit.

    The status reads as text, since what is logged decides it; then the progress, the Log form, and the entries.
    """
    status_icon(f, x + 10, y + 12, "behind")
    f.text(x + 28, y + 17, "In progress, not on track", 15, "bold")
    f.text(x, y + 40, "Today, Thu 27 Nov", 12, "muted")
    y += 52
    f.rect(x, y, width, 84, "box")
    f.text(x + 12, y + 28, "1,720 of max 1,600 kcal", 16, "bold")
    f.rect(x + 12, y + 40, width - 24, 5, "meter", radius=2)
    f.rect(x + 12, y + 40, width - 24, 5, "meter-fill", radius=2)
    f.text(x + 12, y + 68, "⚠ 120 kcal over the limit", 12)
    y += 100
    f.line(x, y, x + width, y)
    f.text(x, y + 28, "Log", 14, "bold")
    y += 40
    y = labeled(f, x, y, width, "Amount", "0", muted=True) + 8
    y = labeled(f, x, y, width, "Label (optional)", "Croissant", muted=True) + 8
    left = button_right(f, x + width, y, "+ Check", size=13, height=32)
    button_right(f, left - 8, y, "+ Time spent", size=13, height=32)
    y += 40
    button_right(f, x + width, y, "Log", "primary", 14, 32)
    y += 44
    f.line(x, y, x + width, y)
    f.text(x, y + 28, "Today's entries · 4", 14, "bold")
    f.text(x + width, y + 28, "Total 1,720 kcal", 13, "muted", "end")
    y += 40
    entries = [
        ("19:45", "Pizza · Ann", "660 kcal"),
        ("16:00", "Apple · You", "90 kcal"),
        ("12:30", "Pasta · You", "650 kcal"),
        ("08:10", "Croissant · You", "320 kcal"),
    ]
    for when, what, amount_text in entries:
        f.line(x, y, x + width, y)
        f.text(x, y + 25, when, 12, "muted")
        f.text(x + 48, y + 25, fit(what, width - 190, 14), 14)
        f.text(x + width - 68, y + 25, amount_text, 13, "bold", "end")
        button_right(f, x + width, y + 6, "Undo", "control", 12, 28)
        y += 40
    return y


def configuration_tab(f, x, y, width):
    """Draw the Configuration tab for Sport, a weekly goal of at least 3 h 20 min of time spent.

    Description, Lists, Goal, Recurrence, Time window, and the Danger zone, with rules between them.
    Labels and the headings of Lists, Goal, and Recurrence sit left of the right-hand column.
    """
    y = labeled(f, x, y, width, "Description", "Sport", 40) + 10
    f.line(x, y, x + width, y)
    f.text(x, y + 29, "Lists", 14, "bold")
    chip(f, x + width, y + 12, "Home  ×", size=13)
    field(f, x + EDITOR_COLUMN, y + 44, width - EDITOR_COLUMN, "Add to list", height=36, muted=True)
    y += 90
    f.line(x, y, x + width, y)
    f.text(x, y + 30, "Goal", 14, "bold")
    y = choices(f, x, y + 10, width, ["Check", "At least", "At most"], 1) + 8
    y = labeled(f, x, y, width, "Measure", "Time spent ▾") + 8
    y = labeled(f, x, y, width, "Target", "3 h 20 min") + 12
    f.line(x, y, x + width, y)
    f.text(x, y + 30, "Recurrence", 14, "bold")
    y = choices(f, x, y + 10, width, ["Never", "Day", "Week", "Month", "Year"], 2) + 8
    y = labeled(f, x, y, width, "Every", "1") + 8
    y = labeled(f, x, y, width, "Timezone", "Europe/Brussels") + 12
    f.line(x, y, x + width, y)
    f.text(x, y + 24, "Time window", 14, "bold")
    column = x + EDITOR_COLUMN
    f.text(column, y + 46, "Starts Mon 3 Nov 2026", 14)
    f.text(column, y + 66, "Each week ends the window,", 12, "muted")
    f.text(column, y + 82, "so Due hides.", 12, "muted")
    y += 92
    f.line(x, y, x + width, y)
    f.text(x, y + 24, "Danger zone", 14, "bold")
    left = button_right(f, x + width, y + 34, "Delete task", height=40)
    button_right(f, left - 12, y + 34, "Cancel task", height=40)
    return y + 84


def danger_zone(f, x, y, width, label):
    """Draw a divider with extra space, then a delete button; return the bottom edge."""
    f.line(x, y + 20, x + width, y + 20)
    button(f, x, y + 40, label, "control")
    return y + 84


def table(f, x, y, width, columns, offsets, rows):
    """Draw a history table: its column headings over a rule, then its rows under rules; return the bottom edge."""
    for offset, name in zip(offsets, columns):
        f.text(x + offset, y + 14, name, 12, "muted bold")
    y += 22
    for row in rows:
        f.line(x, y, x + width, y)
        for offset, value in zip(offsets, row):
            f.text(x + offset, y + 18, value, 12)
        y += 26
    return y


def history_tab(f, x, y, width):
    """Draw the History tab of Calories: Details, then the occurrences and the events as tables, each with Load more."""
    f.text(x, y + 14, "Details", 14, "bold")
    f.text(x, y + 38, "Created 1 Nov 10:00 \u00b7 Last updated 27 Nov 19:45", 13, "muted")
    y += 52
    f.line(x, y, x + width, y)
    f.text(x, y + 28, "History", 14, "bold")
    button_right(f, x + width, y + 8, "Refresh history", size=13, height=32)
    y += 50
    f.text(x, y + 14, "Occurrences", 13, "bold")
    occurrences = [
        ("3", "Today", "In progress", "780 / max 1,600"),
        ("2", "26 Nov", "Failed", "1,910 / max 1,600"),
        ("1", "25 Nov", "Completed", "1,500 / max 1,600"),
    ]
    y = table(f, x, y + 22, width, ["#", "Period", "Status", "Progress"], [0, 28, 98, width - 112], occurrences) + 6
    button_right(f, x + width, y, "Load more occurrences", size=13, height=32)
    y += 44
    f.text(x, y + 14, "Events", 13, "bold")
    events = [
        ("Today 13:10", "Ann logged Pizza \u00b7 660 kcal", "3"),
        ("Today 09:30", "You undid Cake \u00b7 300 kcal", "3"),
        ("26 Nov 18:00", "You logged Croissant \u00b7 320 kcal", "2"),
        ("26 Nov 00:00", "Period ended", "1"),
    ]
    y = table(f, x, y + 22, width, ["When", "Event", "#"], [0, 96, width - 12], events) + 6
    button_right(f, x + width, y, "Load more events", size=13, height=32)
    return y + 32


def editor_panel(f, title):
    """Draw the wide right editor panel with its title and close button; return the content left and width."""
    f.rect(EDITOR_LEFT, 0, WIDE_WIDTH - EDITOR_LEFT, WIDE_HEIGHT, "frame", radius=0)
    f.text(EDITOR_LEFT + 24, 46, title, 20, "bold")
    icon_button(f, WIDE_WIDTH - 60, 16, "×")
    return EDITOR_LEFT + 24, WIDE_WIDTH - EDITOR_LEFT - 48


def editor_heading(f, x, y, width, description):
    """Draw the task's description above the tabs, with a rule under it; return where the tab strip starts."""
    f.text(x, y + 14, fit(description, width, 17), 17, "bold")
    f.line(x, y + 24, x + width, y + 24)
    return y + 26


def tabbed_editor(tab, draw, caption, selected, description):
    """Draw the task editor on one tab, as a full screen and as a right panel; return the screen tuple."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Task", "connected", back=True)
    top = editor_heading(compact, 16, 68, compact.width - 32, description)
    draw(compact, 16, tab_strip(compact, 16, top, compact.width - 32, tab), compact.width - 32)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, "connected", selected=selected, right=EDITOR_LEFT - 20, more=False)
    left, width = editor_panel(wide, "Task")
    top = editor_heading(wide, left, 68, width, description)
    draw(wide, left, tab_strip(wide, left, top, width, tab), width)
    return ("Task editor · " + TAB_NAMES[tab], caption, compact, wide)


def task_editor():
    """The task editor on its Status tab, where it opens."""
    return tabbed_editor(
        0,
        status_tab,
        "Opens on Status: the status as text, the progress, the Log form, and the entries with Undo.",
        TASKS.index(next(t for t in TASKS if t["text"] == "Calories")),
        "Calories",
    )


def task_editor_notes():
    """The task editor on its Notes tab."""
    return tabbed_editor(1, notes_tab, "The note thread, newest first, with the add and search field.", 1, TASKS[1]["text"])


def task_editor_configuration():
    """The task editor on its Configuration tab."""
    return tabbed_editor(
        2,
        configuration_tab,
        "Description, Lists, Goal, Recurrence, Time window, and the Danger zone; every field saves on change.",
        TASKS.index(next(t for t in TASKS if t["text"] == "Sport")),
        "Sport",
    )


def task_editor_history():
    """The task editor on its History tab."""
    return tabbed_editor(
        3,
        history_tab,
        "Details, then each period's verdict and the entries and undos, newest first, in two tables; read-only.",
        TASKS.index(next(t for t in TASKS if t["text"] == "Calories")),
        "Calories",
    )


def quick_log_popover(f, x, y, width):
    """Draw the quick log pop-up of Sport: time spent first, the other fields behind More."""
    f.rect(x, y, width, 196, "frame", radius=10)
    f.text(x + 16, y + 30, "Log for Sport", 15, "bold")
    f.text(x + 16, y + 56, "Time spent", 13, "muted")
    field(f, x + 16, y + 64, 56, "0", height=36)
    f.text(x + 80, y + 88, "h", 13, "muted")
    field(f, x + 100, y + 64, 56, "45", height=36)
    f.text(x + 164, y + 88, "min", 13, "muted")
    f.text(x + 16, y + 130, "+ More", 13, "bold")
    left = button_right(f, x + width - 16, y + 144, "Log", "primary", 14, 36)
    button_right(f, left - 8, y + 144, "Cancel", "control", 14, 36)


def quick_log():
    """The quick log pop-up, opened from the status button of a time goal's row."""
    index = TASKS.index(next(t for t in TASKS if t["text"] == "Sport"))
    below = sum(row_height(t) for t in TASKS[: index + 1]) + 4
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    compact_task_screen(compact, "All tasks", TASKS)
    quick_log_popover(compact, 16, 68 + below, compact.width - 32)
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    wide_all_tasks(wide, "connected")
    quick_log_popover(wide, MAIN_LEFT + 20, 92 + 60 + 30 + 40 + below, 320)
    return (
        "Quick log",
        "The status button of a time, amount, or reading goal opens the quick log under its row; checks goals tick.",
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


def bin_find(f, x, y, width):
    """Draw the recycle bin find field, the All, Lists, Tasks choice, and the info line; return the bottom edge."""
    y = field(f, x, y, width, "Find in the recycle bin", muted=True) + 8
    segmented(f, x, y, width, ["All", "Lists", "Tasks"], 0, 13, 40)
    info_line(f, x, y + 40 + 20, x + width, f"{len(BIN_ROWS)} entries")
    return y + 40 + 28


def recycle_bin():
    """The recycle bin with one row asking for confirmation."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Recycle bin")
    y = bin_find(compact, 16, 68, compact.width - 32) + 12
    for index, row in enumerate(BIN_ROWS):
        y = bin_row(compact, 0, y, compact.width, *row, index == 1, True)
    compact.text(16, y + 32, "Deleted items stay here for 30 days.", 13, "muted")
    bottom_nav(compact, "Bin")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Recycle bin")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Recycle bin", "Deleted items stay here for 30 days.")
    y = bin_find(wide, MAIN_LEFT, 116, MAIN_RIGHT - MAIN_LEFT) + 12
    for index, row in enumerate(BIN_ROWS):
        y = bin_row(wide, MAIN_LEFT, y, MAIN_RIGHT - MAIN_LEFT, *row, index == 1, False)
    return (
        "Recycle bin",
        "Find by text and choose All, Lists, or Tasks; restore or permanently delete, asking in the row first.",
        compact,
        wide,
    )


def settings_sections(f, x, y, width):
    """Draw the settings sections in local mode, clipped where the scrolling page runs past the frame; return the bottom edge."""
    limit = f.height - (64 if f.width < 500 else 0)

    def section(title, height):
        nonlocal y
        if y + 40 > limit:
            y += height + 12
            return None
        f.rect(x, y, width, min(height, limit - y), "box", radius=8)
        f.text(x + 16, y + 30, title, 16, "bold")
        top = y + 44
        y += height + 12
        return top

    def shown(top, bottom):
        return top is not None and top + bottom <= limit

    top = section("Appearance", 100)
    segmented(f, x + 16, top, width - 32, ["System", "Light", "Dark"], 0, 13, 40)
    top = section("Adding tasks", 112)
    f.rect(x + 16, top + 4, 40, 24, "primary", radius=12)
    f.circle(x + 44, top + 16, 9, "icon")
    f.text(x + 68, top + 21, "Make Enter add", 14)
    f.text(x + 16, top + 52, "Shift+Enter and Alt+Enter always add.", 13, "muted")
    top = section("Reminders", 214)
    f.rect(x + 16, top + 4, 40, 24, "disabled", radius=12)
    f.circle(x + 28, top + 16, 9, "icon")
    f.text(x + 68, top + 21, "Remind me when tasks come due", 14)
    f.text(x + 16, top + 52, fit("Notifies while ToDo's is open in a browser tab.", width - 32, 13), 13, "muted")
    f.text(x + 16, top + 72, fit("A task with a date only reminds at 9:00 on that day.", width - 32, 13), 13, "muted")
    field(f, x + 16, top + 92, width - 32, "When the task comes due", "Remind me", muted=True)
    top = section("Data", 100)
    left = button(f, x + 16, top, "Export backup") + 8
    button(f, left, top, "Import backup")
    top = section("Connection", 328)
    if shown(top, 18):
        f.text(x + 16, top + 14, "Not connected. Your data stays on this device.", 13)
    if shown(top, 40):
        f.text(
            x + 16,
            top + 36,
            fit("Connecting syncs your data across devices and lets you share lists.", width - 32, 13),
            13,
        )
    if shown(top, 62):
        f.text(
            x + 16,
            top + 58,
            fit("It needs an account, so you are no longer anonymous. Access is by invitation.", width - 32, 13),
            13,
        )
    if shown(top, 88):
        f.text(x + 16, top + 84, "Server: https://todos.pellicciotta.com", 13, "muted")
    if shown(top, 144):
        button(f, x + 16, top + 100, "Sign in", "primary")
    if shown(top, 226):
        field(f, x + 16, top + 160, width - 32, "https://todos.pellicciotta.com", "Server URL")
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
    wide.text(MAIN_LEFT + 680, 188, "Signing in, not invited, errors, and an expired", 13, "muted")
    wide.text(MAIN_LEFT + 680, 208, "session also show here, in the same section.", 13, "muted")
    wide.text(MAIN_LEFT + 680, 236, "Turning Reminders on asks for notification permission;", 13, "muted")
    wide.text(MAIN_LEFT + 680, 256, "a denial or no support leaves it off and says why.", 13, "muted")
    return (
        "Settings",
        "Theme, Make Enter add, reminders, backups, connection, and server URL.",
        compact,
        wide,
    )


def help_sections(f, x, y, width):
    """Draw the Help page: search, topic chips, and the five panels, clipped where the page runs past the frame; return the bottom edge."""
    limit = f.height - (64 if f.width < 500 else 0)

    def card(title, height):
        nonlocal y
        if y + 40 > limit:
            y += height + 12
            return None
        f.rect(x, y, width, min(height, limit - y), "box", radius=8)
        f.text(x + 16, y + 30, title, 16, "bold")
        top = y + 44
        y += height + 12
        return top

    def shown(top, bottom):
        return top is not None and top + bottom <= limit

    def line(top, dy, text, css="muted"):
        if shown(top, dy + 4):
            f.text(x + 16, top + dy, fit(text, width - 32, 13), 13, css)

    y = field(f, x, y, width, "Search guides, FAQ, or release notes", "Search help", muted=True) + 12
    cx = x
    for index, label in enumerate(("All topics", "App info", "Welcome", "Tutorial", "FAQ", "Release notes")):
        if cx + text_width(label, 12) + 16 > x + width:
            cx, y = x, y + 32
        cx = chip_left(f, cx, y, label, "signal" if index == 0 else "chip") + 8
    y += 24 + 16
    top = card("Application Info & Support", 188)
    line(top, 14, "Version 1.0.0 · Built 3 Nov 2026")
    line(top, 36, "Local only: your data stays on this device")
    if shown(top, 144):
        button(f, x + 16, top + 52, "Requirements and source code")
        button(f, x + 16, top + 104, "Report a problem")
    top = card("Welcome to ToDo's", 116)
    line(top, 14, "ToDo's is a personal task manager that works offline.", "")
    line(top, 36, "Tasks · Statuses · Lists · Due times · Repeating tasks")
    top = card("Getting Started Tutorial", 116)
    line(top, 14, "1. Add your first task", "")
    line(top, 36, "2. Set a due date, time, and list by typing")
    top = card("Frequently Asked Questions", 188)
    if shown(top, 36):
        button_right(f, x + width - 16, top - 36, "Expand All", "control", 13, 32)
    for row, question in enumerate(
        (
            "Do I need an account to use ToDo's?",
            "Where are my lists and tasks stored?",
            "Which keyboard shortcuts can I use?",
        )
    ):
        if shown(top, row * 44 + 44):
            f.rect(x + 16, top + row * 44, width - 32, 36, "control")
            f.text(x + 28, top + row * 44 + 23, fit(question, width - 80, 13), 13)
            f.text(x + width - 28, top + row * 44 + 23, "⌄", 13, "", "end")
    top = card("Release notes", 116)
    line(top, 14, "v0.6.1 · in development", "bold")
    line(top, 36, "Core: Supported the year recurrence unit in local periods.")
    return y


def help_screen():
    """Help: search and topic chips over the five panels, opened from the user menu."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Help")
    help_sections(compact, 12, 72, compact.width - 24)
    bottom_nav(compact, "Help")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Help")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Help")
    help_sections(wide, MAIN_LEFT, 96, 640)
    wide.text(MAIN_LEFT + 680, 140, "Search filters every panel and opens the FAQ", 13, "muted")
    wide.text(MAIN_LEFT + 680, 160, "questions that match; a chip shows one topic.", 13, "muted")
    wide.text(MAIN_LEFT + 680, 188, "Each panel loads its file on its own; a failed", 13, "muted")
    wide.text(MAIN_LEFT + 680, 208, "one shows Retry. After one visit, Help works offline.", 13, "muted")
    return (
        "Help",
        "Application info and support links, the welcome, the tutorial, the FAQ, and the release notes, with search and topics.",
        compact,
        wide,
    )


LOG_INTRO = "Values that sync overwrote or undid in the last 30 days."
LOG_RETENTION = "Entries stay for 30 days."

# Each entry: the kind, the time, the item line, the values, and whether the item still exists, which offers Open.
LOG_ENTRIES = [
    (
        "Overwritten value",
        "Today 09:14",
        "Buy paint for the hallway · Due time",
        "Lost: Fri 10:00 · Kept: Today 18:00",
        True,
    ),
    ("Rejected change", "Today 08:02", "Buy oat milk · No access anymore", "Undone: status: completed", False),
    ("Lost access", "Today 08:02", "Groceries", "2 queued changes were undone", False),
    ("Sync error", "Yesterday 22:40", "Server unavailable", "Retried and synced at 22:45", False),
]


def log_entry(f, x, y, width, kind, time, item, detail, exists):
    """Draw one sync log entry card: the item, a chip row, and the values in a sunken box; return the next y.

    The chip row holds the time chip, then the kind chip, and ends with an Open link while the item still exists.
    """
    f.rect(x, y, width, 118, "box", radius=8)
    f.text(x + 16, y + 28, fit(item, width - 32, 15), 15)
    left = chip_left(f, x + 16, y + 40, "◷ " + time)
    chip_left(f, left + 8, y + 40, kind)
    if exists:
        f.text(x + width - 16, y + 56, "Open", 13, "bold", "end")
    f.rect(x + 12, y + 74, width - 24, 32, "bar", radius=4)
    f.text(x + 22, y + 95, fit(detail, width - 44, 13), 13, "muted")
    return y + 130


def sync_log():
    """The sync log while connected."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Sync log", "connected", back=True)
    compact.text(16, 88, "Values that sync overwrote or undid", 13, "muted")
    compact.text(16, 106, "in the last 30 days.", 13, "muted")
    y = 120
    for entry in LOG_ENTRIES:
        y = log_entry(compact, 12, y, compact.width - 24, *entry)
    compact.text(16, y + 8, LOG_RETENTION, 13, "muted")
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Sync log", LOG_INTRO, account="connected")
    y = 116
    for entry in LOG_ENTRIES:
        y = log_entry(wide, MAIN_LEFT, y, 720, *entry)
    wide.text(MAIN_LEFT, y + 8, LOG_RETENTION, 13, "muted")
    return (
        "Sync log",
        "What conflict resolution overwrote and what the service rejected, with links to the items.",
        compact,
        wide,
    )


def connect_steps(f, x, y, width):
    """Draw the Connection section of Settings during the local data upload; return the bottom edge."""
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
    """The Settings Connection section while uploading local data."""
    compact = Frame(COMPACT_WIDTH, COMPACT_HEIGHT)
    top_bar(compact, "Settings", "connected", back=True)
    compact.rect(12, 72, compact.width - 24, 520, "box", radius=8)
    compact.text(28, 102, "Connection", 16, "bold")
    connect_steps(compact, 28, 116, compact.width - 56)
    bottom_nav(compact, "Settings")
    wide = Frame(WIDE_WIDTH, WIDE_HEIGHT)
    sidebar(wide, "Settings")
    page_header(wide, MAIN_LEFT, 28, MAIN_RIGHT, "Settings", account="connected")
    wide.rect(MAIN_LEFT, 96, 640, 500, "box", radius=8)
    wide.text(MAIN_LEFT + 16, 126, "Connection", 16, "bold")
    connect_steps(wide, MAIN_LEFT + 16, 140, 560)
    return "Connect", "After sign-in, the Connection section uploads local data; same-named lists merge.", compact, wide


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
    "lists-many.svg": lists_many,
    "lists-find.svg": lists_find,
    "task-editor.svg": task_editor,
    "task-editor-notes.svg": task_editor_notes,
    "task-editor-configuration.svg": task_editor_configuration,
    "task-editor-history.svg": task_editor_history,
    "quick-log.svg": quick_log,
    "list-editor.svg": list_editor,
    "recycle-bin.svg": recycle_bin,
    "settings.svg": settings,
    "help.svg": help_screen,
    "sync-log.svg": sync_log,
    "connect.svg": connect,
    "import.svg": import_dialog,
    "nav-rail.svg": nav_rail,
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
