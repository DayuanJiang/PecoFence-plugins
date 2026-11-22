#!/usr/bin/env python3
"""Interface 3 in tools/web-check.py (needs Playwright's Chromium): an inline script and style of the
page's own HTML run, a script made from text at run time is blocked, the browser's permissions
follow the manifest. Run: python3 tools/tests/test_web_api3.py"""
import json
import pathlib
import subprocess
import sys
import tempfile

TOOLS = pathlib.Path(__file__).resolve().parent.parent
failed = 0


def run(case, perms, files, expect, api=3):
    """`expect`: "PASS", or a text the FAIL output has."""
    global failed
    m = {"id": "webprobe", "version": "1.0.0", "api": api, "layer": "web", "name": {"en": "W"}, "description": {"en": "W"},
         "author": "someone", "minPecoFence": "0.6.0", "permissions": perms}
    with tempfile.TemporaryDirectory() as tmp:
        root = pathlib.Path(tmp) / "plugins" / "webprobe"
        root.mkdir(parents=True)
        (root / "plugin.json").write_text(json.dumps(m), encoding="utf-8")
        (root / "README.md").write_text("w", encoding="utf-8")
        for name, text in files.items():
            (root / name).write_text(text, encoding="utf-8")
        out = subprocess.run([sys.executable, str(TOOLS / "web-check.py"), str(root), "--seconds", "3"],
                             capture_output=True, text=True).stdout
    ok = out.rstrip().endswith("RESULT: PASS") if expect == "PASS" else ("RESULT: FAIL" in out and expect in out)
    print(f"{'ok  ' if ok else 'FAIL'} {case}")
    if not ok:
        failed += 1
        print(out)


inline = ("<!doctype html><style>p { color: red }</style><p style='margin: 0' onclick=\"window.x = 1\">x</p>"
          "<img src='data:image/png;base64,iVBORw0KGgo='>"
          "<script>document.querySelector('p').textContent = 'ran';</script>\n")
run("api 3: the page's own inline script, style and data: picture run", {}, {"index.html": inline}, "PASS")
run("api 2: the same page is blocked", {}, {"index.html": inline}, "Content Security Policy", api=2)
made = ("<!doctype html><script src='a.js'></script>\n",
        "const s = document.createElement('script'); s.textContent = 'window.y = 2'; document.documentElement.append(s);\n")
run("api 3: a script made at run time is blocked", {}, {"index.html": made[0], "a.js": made[1]}, "Content Security Policy")
screen = {"index.html": "<!doctype html><script src='a.js'></script>\n",
          "a.js": "navigator.mediaDevices.getDisplayMedia({ video: true }).catch(() => {});\n"}
run("getDisplayMedia with screen", {"screen": True}, screen, "PASS")
run("getDisplayMedia without screen", {}, screen, "permissions.screen is not true")
cam = {"index.html": "<!doctype html><script src='a.js'></script>\n",
       "a.js": "navigator.mediaDevices.getUserMedia({ video: true }).catch(() => {});\n"}
run("getUserMedia video with camera", {"camera": True}, cam, "PASS")
run("getUserMedia video without camera", {"microphone": True}, cam, "permissions.camera is not true")
point = {"index.html": "<!doctype html><script src='a.js'></script>\n",
         "a.js": "pf.pointer().catch(() => {}); pf.caret().catch(() => {});\n"}
run("pf.pointer and pf.caret declared", {"pointer": True, "focus": True}, point, "PASS")
run("pf.caret without focus", {"pointer": True}, point, "permissions.focus is not true")
print("RESULT: FAIL" if failed else "RESULT: PASS")
sys.exit(1 if failed else 0)
