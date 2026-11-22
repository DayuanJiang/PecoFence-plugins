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
many = ("<!doctype html><p id=a onclick=\"window.c = 1\" onmouseover='window.d = 2' ondblclick=window.e=3>x</p>"
        "<p onclick=\"window.f = &#39;q&#39; &amp;&amp; 1\">y</p>"
        "<script>for (const k of ['click', 'mouseover', 'dblclick']) document.querySelectorAll('p').forEach(p => "
        "p.dispatchEvent(new MouseEvent(k)));</script>\n")
run("api 3: several handlers of a tag, unquoted, numeric references", {}, {"index.html": many}, "PASS")
run("api 3: a handler with &nbsp; fails with the references PecoFence decodes",
    {}, {"index.html": "<!doctype html><p onclick=\"a&nbsp;= 1\">x</p>\n"}, "PecoFence decodes only &amp;")

# The port of page_csp.rs against its own unit case (crates/core/src/page_csp.rs, inline_scripts_and_handlers_are_found).
import importlib.util
spec = importlib.util.spec_from_file_location("web_check", TOOLS / "web-check.py")
wc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(wc)
html = ("<!doctype html><html><head>\r\n<script>window.a = 1;\r\n</script>"
        "<script src=\"app.js\" defer></script><SCRIPT type=module>b()</SCRIPT>"
        "<!-- <script>commented()</script> --></head>"
        "<body><button onclick=\"go(&quot;x&quot;) &amp;&amp; y()\" ONMOUSEOVER='z()'>b</button>"
        "<img src=x onerror=boom()><p title=\"on\">t</p></body></html>")
scripts, handlers = wc.inline_code(html)
for case, ok in [("scripts as page_csp.rs finds them", scripts == ["window.a = 1;\n", "b()"]),
                 ("handlers as page_csp.rs decodes them", [wc.decode(h) for h in handlers] == ['go("x") && y()', "z()", "boom()"]),
                 ("a script without end takes the rest", wc.inline_code("<script>x = '</scr'")[0] == ["x = '</scr'"]),
                 ("only other named references are refused, as PecoFence does", wc.other_references(
                     ["a&nbsp;b", "c &amp d", "e &amp; f &#38; &#x26;", "&copy;&lt;", "&nbsp;"]) == ["&copy;", "&nbsp;"]),
                 ("connect-src: internet names and IPv4 only", wc.csp(["api.github.com", "8.8.8.8", "nas", "192.168.1.20", "[fd00::1]"], 3)
                  .count("https://") == 2 and "nas" not in wc.csp(["nas"], 3))]:
    print(f"{'ok  ' if ok else 'FAIL'} {case}")
    failed += not ok
print("RESULT: FAIL" if failed else "RESULT: PASS")
sys.exit(1 if failed else 0)
