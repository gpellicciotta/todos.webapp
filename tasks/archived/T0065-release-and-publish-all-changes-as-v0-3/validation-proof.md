## Walkthrough & Validation
```text
$ python scripts/devops.py release 0.3.0 --backend-dir ../todos.server --yes
[OK] Created the GitHub release v0.3.0.
[OK] The backend already pins 0.3.0.
[OK] Released v0.3.0.

$ gh run list --limit 1
completed  success  Opened v0.3.1-pre development after releasing v0.3.0.  Pages  main  push
```
