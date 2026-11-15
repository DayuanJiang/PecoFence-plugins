#!/usr/bin/env python3
"""Static check of one plugin folder against AGENTS.md sections 1, 2, 4 and 5.

Usage: python3 tools/check.py plugins/<id> [--base <git ref>] [--pr-author <login>]
Prints one line per finding and ends with "RESULT: PASS" or "RESULT: FAIL" (exit code 0 or 1).
WARN lines do not fail the check; the review reads them.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

API = 1
LANGS = {"en", "zh-CN", "zh-TW", "ja", "ko", "de", "fr", "es", "pt-BR", "ru", "it"}
TOP_KEYS = {"id", "version", "api", "layer", "name", "description", "author", "minPecoFence",
            "permissions", "settings"}
PERM_KEYS = {"network", "links", "clipboard", "background", "system", "folders", "notify"}
CLIPBOARD = ["none", "write", "read", "readwrite"]
SETTING_TYPES = {"text", "number", "switch", "choice"}
SIZES = {"plugin.json": 64 << 10, "README.md": 64 << 10, "main.js": 200 << 10, "screenshot.png": 300 << 10}
OTHER_SIZE, TOTAL_SIZE, MAX_FILES = 1 << 20, 5 << 20, 100
WEB_EXT = {".html", ".js", ".css", ".json", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".woff2"}
TEXT_EXT = {".html", ".js", ".css", ".json", ".svg", ".md"}
CODE_EXT = {".html", ".js", ".css", ".svg"}
MAGIC = {".png": b"\x89PNG\r\n\x1a\n", ".jpg": b"\xff\xd8\xff", ".jpeg": b"\xff\xd8\xff",
         ".gif": b"GIF8", ".webp": b"RIFF", ".woff2": b"wOF2"}
VERSION = re.compile(r"^\d+\.\d+\.\d+$")
LOGIN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9-]{0,38}$")
HOST = re.compile(r"^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]$")
# XML namespaces name this host without connecting to it.
NAMESPACE_HOSTS = {"www.w3.org"}

# AGENTS.md 5.1 and 5.3: what the rules forbid outright, as far as plain text can show it.
FORBIDDEN = [
    (r"\beval\s*\(", "runs code made from text (eval)"),
    (r"\bnew\s+Function\b|(?<![.\w$])Function\s*\(", "makes code from text (Function)"),
    (r"\.constructor\s*\(\s*['\"`]|\[\s*['\"`]constructor['\"`]\s*\]", "makes code from text (constructor)"),
    (r"\bset(Timeout|Interval)\s*\(\s*['\"`]", "passes a string of code to a timer"),
    (r"(?<![.\w$])import\s*\(", "loads code at run time (dynamic import)"),
    (r"\bimportScripts\b", "loads code at run time (importScripts)"),
    (r"\bWebAssembly\b", "uses WebAssembly"),
    (r"\b(webkit)?RTC(PeerConnection|DataChannel|Rtp\w+|IceTransport)\b", "uses WebRTC (RTCPeerConnection)"),
    (r"\bpf\s*\[", "reaches pf with [ ]: write pf.name so the checks and readers can follow it"),
    (r"(\\x[0-9a-fA-F]{2}){8,}", "holds text written as \\x escapes (encoded code)"),
    (r"[A-Za-z0-9+/=]{400,}", "holds a long encoded string (base64)"),
    (r"fromCharCode\s*\(\s*(\d+\s*,\s*){9,}", "builds text from character codes (encoded code)"),
]
# A web page's files: loading anything from the network.
EXTERNAL = [
    (r"<script\b[^>]*\bsrc\s*=\s*['\"]?\s*(https?:)?//", "loads a script from the network"),
    (r"<link\b[^>]*\bhref\s*=\s*['\"]?\s*(https?:)?//", "loads a style or font from the network"),
    (r"<(img|audio|video|source|track|input)\b[^>]*\bsrc\s*=\s*['\"]?\s*(https?:)?//", "loads a picture or media from the network"),
    (r"<(iframe|frame|object|embed)\b", "has a frame or embedded object"),
    (r"url\(\s*['\"]?\s*(https?:)?//", "loads a style resource from the network (url())"),
    (r"@import\s+(url\()?\s*['\"]?\s*(https?:)?//", "imports a style from the network"),
]
# pf calls and the permission each needs.
USES = [
    ("network", r"\bpf\.http\.(get|post)\b", "pf.http"),
    ("read", r"\bpf\.clipboard\.(text|files|image)\s*\(|\bpf\.on\(\s*['\"`]clipboard['\"`]", "reading the clipboard"),
    ("write", r"\bpf\.clipboard\.set(Text|Files|Image)\s*\(", "writing the clipboard"),
    ("system", r"\bpf\.run\s*\(", "pf.run"),
    ("folders", r"\bpf\.folder\.", "pf.folder"),
    ("notify", r"\bpf\.notify\s*\(", "pf.notify"),
    ("links", r"\bpf\.open\s*\(", "pf.open"),
]
URL = re.compile(r"(?i)\b(?:https?|wss?)://([^\s/\"'`<>()\\?#]+)")
BUILT_URL = re.compile(r"(?i)['\"`](?:https?|wss?)://['\"`]?\s*\+|`(?:https?|wss?)://\$\{")

failures = 0


def fail(msg):
    global failures
    failures += 1
    print(f"FAIL: {msg}")


def warn(msg):
    print(f"WARN: {msg}")


def finish():
    print("RESULT: FAIL" if failures else "RESULT: PASS")
    sys.exit(1 if failures else 0)


def version(v):
    return tuple(int(x) for x in v.split("."))


def texts_ok(value, field, max_len):
    if not isinstance(value, dict) or not str(value.get("en", "")).strip():
        fail(f"{field}.en is missing")
        return
    for lang, text in value.items():
        if lang not in LANGS:
            warn(f"{field} has the language '{lang}', which PecoFence does not show")
        if not isinstance(text, str) or len(text) > max_len:
            fail(f"{field}.{lang} is not a text of at most {max_len} characters")


def check_files(root, layer):
    """AGENTS.md section 1: the folder's files, their names, sizes and encoding."""
    files, total = {}, 0
    for path in sorted(root.rglob("*")):
        rel = path.relative_to(root).as_posix()
        if path.is_symlink():
            fail(f"{rel} is a link; a plugin folder holds plain files only")
        elif path.is_dir():
            if layer != "web":
                fail(f"{rel}/: a light plugin has no sub-folders")
        elif any(part.startswith(".") or not re.fullmatch(r"[A-Za-z0-9._-]{1,64}", part) for part in rel.split("/")):
            fail(f"{rel}: names are letters, digits, '.', '_' and '-', not starting with a dot")
        else:
            files[rel] = path.read_bytes()
            total += len(files[rel])
    light = {"plugin.json", "main.js", "README.md", "screenshot.png"}
    for rel, data in files.items():
        ext = pathlib.PurePosixPath(rel).suffix.lower()
        if layer == "light" and rel not in light:
            fail(f"{rel}: a light plugin has only plugin.json, main.js, README.md and screenshot.png")
            continue
        if layer == "web" and rel not in SIZES and ext not in WEB_EXT:
            fail(f"{rel}: a web plugin's files are {', '.join(sorted(WEB_EXT))} (AGENTS.md section 1)")
            continue
        if len(data) > SIZES.get(rel, OTHER_SIZE):
            fail(f"{rel} is {len(data)} bytes, more than {SIZES.get(rel, OTHER_SIZE)}")
        if ext in TEXT_EXT:
            try:
                text = data.decode("utf-8-sig")
                if "\0" in text:
                    fail(f"{rel} holds NUL characters: not a text file")
            except UnicodeDecodeError as e:
                fail(f"{rel} is not UTF-8 ({e.reason} at byte {e.start})")
        elif ext in MAGIC and not data.startswith(MAGIC[ext]):
            fail(f"{rel} is not a {ext[1:]} file")
    need = ["plugin.json", "README.md", "main.js" if layer == "light" else "index.html"]
    for name in need:
        if name not in files:
            fail(f"missing {name}")
    if len(files) > MAX_FILES or total > TOTAL_SIZE:
        fail(f"{len(files)} files, {total} bytes: at most {MAX_FILES} files and {TOTAL_SIZE} bytes")
    return files


def check_hosts(hosts, field):
    if not isinstance(hosts, list) or not all(isinstance(h, str) for h in hosts):
        fail(f"permissions.{field} is a list of host names")
        return []
    for h in hosts:
        if not HOST.match(h) or h == "localhost" or re.fullmatch(r"[\d.]+", h):
            fail(f"permissions.{field}: '{h}' is not a host name in lower case (no IP addresses, no localhost)")
    if len(hosts) > 20 or len(set(hosts)) != len(hosts):
        fail(f"permissions.{field}: at most 20 hosts, each once")
    return hosts


def check_manifest(m, pid):
    """AGENTS.md section 2."""
    for key in sorted(set(m) - TOP_KEYS):
        fail(f"plugin.json has the unknown field '{key}'")
    if m.get("id") != pid:
        fail(f"plugin.json id '{m.get('id')}' differs from the folder name '{pid}'")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{2,39}", pid):
        fail(f"'{pid}' is not a valid id (a-z, 0-9 and -, 3 to 40 characters)")
    for key in ("version", "minPecoFence"):
        if not VERSION.match(str(m.get(key, ""))):
            fail(f"{key} '{m.get(key)}' is not x.y.z")
    if m.get("api") != API:
        fail(f"api is {m.get('api')!r}; this repository knows api {API}")
    if m.get("layer") not in ("light", "web"):
        fail(f"layer is {m.get('layer')!r}, not light or web")
    texts_ok(m.get("name"), "name", 60)
    texts_ok(m.get("description"), "description", 300)
    if not LOGIN.match(str(m.get("author", ""))):
        fail(f"author '{m.get('author')}' is not a GitHub login")
    p = m.get("permissions", {})
    if not isinstance(p, dict):
        fail("permissions is an object")
        p = {}
    for key in sorted(set(p) - PERM_KEYS):
        fail(f"permissions has the unknown field '{key}'")
    check_hosts(p.get("network", []), "network")
    check_hosts(p.get("links", []), "links")
    if p.get("clipboard", "none") not in CLIPBOARD:
        fail(f"permissions.clipboard is one of {', '.join(CLIPBOARD)}")
    for key in ("background", "folders", "notify"):
        if not isinstance(p.get(key, False), bool):
            fail(f"permissions.{key} is true or false")
    system = p.get("system", [])
    if not isinstance(system, list) or not all(
            isinstance(s, str) and (re.fullmatch(r"[A-Za-z]:\\[^/:*?\"<>|]+\.exe", s, re.I)
                                    or re.fullmatch(r"[A-Za-z0-9._-]+\.exe", s, re.I)) for s in system):
        fail("permissions.system is a list of programs: a full path (C:\\...\\x.exe) or a name in System32 (x.exe)")
    settings = m.get("settings", [])
    if not isinstance(settings, list) or len(settings) > 20:
        fail("settings is a list of at most 20")
        settings = []
    keys = set()
    for i, s in enumerate(settings):
        where = f"settings[{i}]"
        if not isinstance(s, dict):
            fail(f"{where} is an object")
            continue
        key, kind, default = s.get("key"), s.get("type"), s.get("default")
        if not isinstance(key, str) or not re.fullmatch(r"[A-Za-z0-9]{1,32}", key) or key in keys:
            fail(f"{where}.key is letters and digits, 1 to 32, each key once")
        keys.add(key)
        if kind not in SETTING_TYPES:
            fail(f"{where}.type is one of {', '.join(sorted(SETTING_TYPES))}")
        texts_ok(s.get("label"), f"{where}.label", 60)
        values = [o.get("value") for o in s.get("options", []) if isinstance(o, dict)]
        if kind == "choice":
            if not values or not all(isinstance(v, str) for v in values):
                fail(f"{where}: a choice has options [{{ value, label }}]")
            for o in s.get("options", []):
                texts_ok(o.get("label") if isinstance(o, dict) else None, f"{where}.options.label", 60)
        good = {"switch": isinstance(default, bool), "text": isinstance(default, str),
                "number": isinstance(default, (int, float)) and not isinstance(default, bool),
                "choice": default in values}
        if kind in good and not good[kind]:
            fail(f"{where}.default does not fit its type {kind}")
    return p


def check_update(m, pid, base, pr_author):
    """Updates: a higher version, changed only by the plugin's author."""
    old = subprocess.run(["git", "show", f"{base}:plugins/{pid}/plugin.json"], capture_output=True)
    if old.returncode != 0:
        if pr_author and pr_author != m.get("author"):
            fail(f"a new plugin comes from its author: plugin.json says {m.get('author')}, the pull request is by {pr_author}")
        return
    old = json.loads(old.stdout.decode("utf-8-sig"))
    if not VERSION.match(str(m.get("version", ""))) or version(m["version"]) <= version(old["version"]):
        fail(f"version {m.get('version')} must be higher than {old['version']}")
    if m.get("author") != old["author"]:
        fail(f"author changed from {old['author']} to {m.get('author')}")
    if pr_author and pr_author != old["author"]:
        fail(f"only {old['author']} can change this plugin (this pull request is by {pr_author})")
    o, n = old.get("permissions", {}), m.get("permissions", {})
    more = [f"{k}: {sorted(set(n.get(k, [])) - set(o.get(k, [])))}" for k in ("network", "links", "system")
            if set(n.get(k, [])) - set(o.get(k, []))]
    if CLIPBOARD.index(n.get("clipboard", "none")) > CLIPBOARD.index(o.get("clipboard", "none")):
        more.append(f"clipboard {o.get('clipboard', 'none')} to {n['clipboard']}")
    more += [f"{k} turned on" for k in ("background", "folders", "notify") if n.get(k) and not o.get(k)]
    if more:
        warn(f"this update asks for more ({'; '.join(more)}): users confirm it before it installs")
    print(f"PASS: update {old['version']} to {m.get('version')}")


def check_code(files, p, layer):
    """AGENTS.md sections 4 and 5: what the code may do, against the manifest."""
    network, links = set(p.get("network", [])), set(p.get("links", []))
    clip = p.get("clipboard", "none")
    have = {"network": bool(network), "read": clip in ("read", "readwrite"),
            "write": clip in ("write", "readwrite"), "system": bool(p.get("system")),
            "folders": bool(p.get("folders")), "notify": bool(p.get("notify")), "links": bool(network | links)}
    used, seen = set(), set()
    for rel, data in files.items():
        ext = pathlib.PurePosixPath(rel).suffix.lower()
        if ext not in CODE_EXT and ext != ".json" or rel == "plugin.json":
            continue
        text = data.decode("utf-8-sig", errors="replace")
        lines = text.splitlines()
        if ext in CODE_EXT:
            long = [i + 1 for i, line in enumerate(lines) if len(line) > 1000]
            if long:
                fail(f"{rel}:{long[0]} has a line of {len(lines[long[0] - 1])} characters: minified or generated code is not readable")
            for pattern, what in FORBIDDEN + (EXTERNAL if layer == "web" and ext != ".js" else []):
                for mt in re.finditer(pattern, text):
                    fail(f"{rel}:{text.count(chr(10), 0, mt.start()) + 1} {what}")
                    break
            if ext == ".svg" and re.search(r"(?i)<script\b|\son\w+\s*=", text):
                fail(f"{rel} is a picture with code in it (<script> or on...=)")
            for need, pattern, what in USES:
                if re.search(pattern, text):
                    used.add(need)
                    if not have[need]:
                        perm = {"read": "clipboard read or readwrite", "write": "clipboard write or readwrite",
                                "links": "network or links"}.get(need, need)
                        fail(f"{rel} uses {what}, but plugin.json does not declare permissions.{perm}")
            if BUILT_URL.search(text):
                warn(f"{rel} builds an address at run time: the run check and the review check where it goes")
        for mt in URL.finditer(text):
            host = mt.group(1).split("@")[-1].split(":")[0].lower().rstrip(".")
            if "$" in host or "{" in host or host in NAMESPACE_HOSTS:
                continue
            seen.add(host)
            if host not in network | links:
                line = text.count("\n", 0, mt.start()) + 1
                fail(f"{rel}:{line} names the host {host}, which neither permissions.network nor permissions.links declares")
    for need, label in (("network", "network"), ("read", "clipboard read"), ("write", "clipboard write"),
                        ("system", "system"), ("folders", "folders"), ("notify", "notify")):
        if have[need] and need not in used and not (need == "write" and clip == "readwrite"):
            if not (need == "network" and layer == "web"):
                warn(f"plugin.json declares {label}, but the code never uses it: leave it out")
    for h in sorted((network | links) - seen):
        warn(f"permissions declare {h}, but no address in the code names it")
    readme = files.get("README.md", b"").decode("utf-8-sig", errors="replace")
    for h in sorted(network):
        if h not in readme:
            fail(f"README.md does not say what is sent to {h}")
    for prog in p.get("system", []):
        if prog.lower() not in readme.lower():
            fail(f"README.md does not say why the plugin starts {prog}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plugin")
    ap.add_argument("--base", default="", help="git ref of the target branch, for updates")
    ap.add_argument("--pr-author", default="", help="GitHub login of the pull request's author")
    args = ap.parse_args()
    root = pathlib.Path(args.plugin).resolve()
    pid = root.name
    try:
        m = json.loads((root / "plugin.json").read_bytes().decode("utf-8-sig"))
        if not isinstance(m, dict):
            raise ValueError("not an object")
    except (OSError, ValueError) as e:
        fail(f"plugin.json is not readable JSON: {e}")
        finish()
    layer = m.get("layer") if m.get("layer") in ("light", "web") else "light"
    files = check_files(root, layer)
    if not failures:
        print(f"PASS: files of {pid} ({len(files)}, {layer} layer)")
    before = failures
    p = check_manifest(m, pid)
    if failures == before:
        print(f"PASS: manifest of {pid} {m.get('version')}")
    if args.base:
        check_update(m, pid, args.base, args.pr_author)
    before = failures
    check_code(files, p, layer)
    if failures == before:
        print("PASS: code rules")
    finish()


if __name__ == "__main__":
    main()
