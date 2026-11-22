#!/usr/bin/env python3
"""Interface 3 in tools/check.py and tools/build-index.py: what needs api 3 and minPecoFence 0.6.0,
the rules of the new fields, and the index PecoFence 0.5.0 reads. Run: python3 tools/tests/test_api3.py"""
import json
import pathlib
import subprocess
import sys
import tempfile

TOOLS = pathlib.Path(__file__).resolve().parent.parent
BASE = {"id": "probe", "version": "1.0.0", "api": 1, "layer": "light", "name": {"en": "Probe"},
        "description": {"en": "A test."}, "author": "someone", "minPecoFence": "0.5.0", "permissions": {}}
MAIN = "pf.on('start', () => pf.show({ rows: [{ text: 'hi' }] }));\n"
failed = 0


def plugin(tmp, manifest, files=None, readme="A test plugin."):
    root = pathlib.Path(tmp) / "plugins" / "probe"
    root.mkdir(parents=True, exist_ok=True)
    (root / "plugin.json").write_text(json.dumps(manifest), encoding="utf-8")
    (root / "README.md").write_text(readme, encoding="utf-8")
    for name, text in (files or {"main.js": MAIN}).items():
        (root / name).write_text(text, encoding="utf-8")
    return root


def check(case, manifest, expect, files=None, readme="A test plugin."):
    """`expect`: "PASS", or a text the output has (and FAIL)."""
    global failed
    with tempfile.TemporaryDirectory() as tmp:
        root = plugin(tmp, manifest, files, readme)
        out = subprocess.run([sys.executable, str(TOOLS / "check.py"), str(root)], capture_output=True, text=True).stdout
    ok = out.rstrip().endswith("RESULT: PASS") if expect == "PASS" else ("RESULT: FAIL" in out and expect in out)
    print(f"{'ok  ' if ok else 'FAIL'} {case}")
    if not ok:
        failed += 1
        print(out)


def with_(api=1, minimum="0.5.0", layer="light", **perms):
    return {**BASE, "api": api, "minPecoFence": minimum, "layer": layer, "permissions": perms}


page = {"index.html": "<!doctype html><title>x</title><script>pf.on('show', () => {});</script>\n"}
check("an inline script needs api 3", with_(layer="web"), "need api 3", page)
check("api 3 needs minPecoFence 0.6.0", with_(3, layer="web"), "minPecoFence 0.6.0", page)
check("an inline script with api 3 and 0.6.0 passes", with_(3, "0.6.0", layer="web"), "PASS", page)
check("screen needs api 3", with_(2, screen=True), "need api 3")
check("screen with api 3", with_(3, "0.6.0", screen=True), "PASS")
check("a new field is true or false", with_(3, "0.6.0", pointer="yes"), "permissions.pointer is true or false")
check("an IP host needs api 3", with_(2, network=["192.168.1.20"]), "need api 3", readme="Sends to 192.168.1.20.")
check("a dotless host with api 3", with_(3, "0.6.0", network=["nas"]), "PASS", readme="Sends to nas.")
check("a script in system needs api 3", with_(2, system=["C:\\Tools\\backup.cmd"]), "need api 3",
      readme="Starts C:\\Tools\\backup.cmd.")
check("folders any needs api 3", with_(2, folders="any"), "need api 3")
check("a big main.js needs api 3", with_(1), "need api 3", {"main.js": MAIN + "// x\n" * 60000})
key = lambda k: [{"id": "show", "title": {"en": "Show"}, "key": k}]
check("Ctrl+Alt+M is AltGr", with_(3, "0.6.0", commands=key("Ctrl+Alt+M")), "Shift or Win")
check("Win+M is Windows' own", with_(3, "0.6.0", commands=key("Win+M")), "Shift or Win")
check("Ctrl+Shift+M with api 3", with_(3, "0.6.0", commands=key("Ctrl+Shift+M")), "PASS")
check("a key needs api 3", with_(2, commands=key("Ctrl+Shift+M")), "need api 3")
check("a key is a key", with_(3, "0.6.0", commands=key("Ctrl+Shift+Banana")), "joined by +")
check("five local ports need api 3",
      with_(2, local={"loopback": [{"port": p, "app": f"App{p}"} for p in range(8001, 8006)]}), "need api 3",
      readme="App8001 App8002 App8003 App8004 App8005")
check("getDisplayMedia without screen", with_(3, "0.6.0", layer="web"), "permissions.screen",
      {"index.html": "<!doctype html><script src='a.js'></script>\n", "a.js": "navigator.mediaDevices.getDisplayMedia();\n"})
check("WebRTC with webrtc", with_(3, "0.6.0", layer="web", webrtc=True), "PASS",
      {"index.html": "<!doctype html><script src='a.js'></script>\n", "a.js": "const c = new RTCPeerConnection();\n"})
check("WebRTC without it", with_(3, "0.6.0", layer="web"), "WebRTC",
      {"index.html": "<!doctype html><script src='a.js'></script>\n", "a.js": "const c = new RTCPeerConnection();\n"})

# build-index: an entry PecoFence 0.5.0 refuses gets a stand-in in index.json, the whole one in index-3.json.
import importlib.util
spec = importlib.util.spec_from_file_location("build_index", TOOLS / "build-index.py")
bi = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bi)
whole = {**with_(3, "0.6.0", folders="any", network=["nas", "api.example.com"]), "disabled": "a test take-down",
         "files": [{"name": "main.js", "size": 300000, "sha256": "a" * 64},
                   {"name": "plugin.json", "size": 300, "sha256": "b" * 64},
                   {"name": "README.md", "size": 30, "sha256": "c" * 64}]}
stand = bi.for_0_5(whole)
cases = [("0.5.0 refuses the whole entry", bi.refused_by_0_5(whole) is not None),
         ("the stand-in passes 0.5.0", bi.refused_by_0_5(stand) is None),
         ("the stand-in keeps the take-down", stand.get("disabled") == "a test take-down"),
         ("the stand-in says api 3", stand["api"] == 3),
         ("the stand-in keeps the hosts 0.5.0 reads", stand["permissions"]["network"] == ["api.example.com"]),
         ("a plain entry is itself", bi.for_0_5(with_(1) | {"files": whole["files"][1:] + [
             {"name": "main.js", "size": 100, "sha256": "a" * 64}]})["api"] == 1)]
for case, ok in cases:
    print(f"{'ok  ' if ok else 'FAIL'} {case}")
    failed += not ok
print("RESULT: FAIL" if failed else "RESULT: PASS")
sys.exit(1 if failed else 0)
