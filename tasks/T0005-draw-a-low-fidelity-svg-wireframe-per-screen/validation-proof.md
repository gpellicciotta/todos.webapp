## Walkthrough & Validation

### Red Phase
Before the script existed, every test failed because the script run exited with status 2.

Command: `python -m pytest tests -q` (exit code 1)

```text
E               subprocess.CalledProcessError: Command '['C:\\Program Files\\Python312\\python.exe', 'C:\\Dev-Projects\\todos.webapp\\scripts\\draw-wireframes.py', 'C:\\Users\\giova\\AppData\\Local\\Temp\\pytest-of-giova\\pytest-6912\\ui0']' returned non-zero exit status 2.
[... 3346 lines omitted ...]
ERROR tests/test_draw_wireframes.py::test_uses_only_gray_colors[task-editor.svg]
ERROR tests/test_draw_wireframes.py::test_output_is_reproducible - subprocess...
38 errors in 3.83s
```

### Green Phase

Command: `python scripts/draw-wireframes.py docs/img/ui` (exit code 0)

```text
Wrote 12 wireframes to docs\img\ui
```

Command: `python -m pytest tests -q` (exit code 0)

```text
......................................                                   [100%]
38 passed in 1.59s
```

Command: `ruff check scripts tests` (exit code 0)

```text
All checks passed!
```

Command: `ruff format --check scripts tests` (exit code 0)

```text
2 files already formatted
```

Command: `python ../dev-guidelines/scripts/lint-markdown.py check docs` (exit code 0)

```text
Starting lint-markdown v1.12.9-pre+5f5408e with configuration:
- Command: check
- Log file: none
- Log level: INFO
- Verbose: false
- Working directory: C:\Dev-Projects\todos.webapp
All 5 markdown files passed linting.
Finished lint-markdown check in 0.3s with status: succeeded
```

### Visual Check
Chromium rendered every SVG from a file URL with no console errors; renders are in [renders](renders/).
Each render was inspected for overlaps, clipping, and truncation at both widths.
