#!/usr/bin/env python3
"""Runs a web plugin's index.html in headless Chromium and reports what it reaches (AGENTS.md 4, 5).

The page gets its files from https://<id>.plugins.pecofence/ (PecoFence itself uses
pecofence-plugin://<id>/; a plugin must not depend on its address), each with the
Content Security Policy, type and nosniff PecoFence sends, and a stand-in `pf` that records every
call and answers with fixed values of the shapes AGENTS.md gives (a call over 1 MB is refused). Nothing reaches the network: every other request
and WebSocket is recorded, then refused. Fails on a request to a host the manifest does not
declare, a script, style, font or picture from the network, a WebSocket to an undeclared host,
WebRTC, a refused pf call, something the CSP blocks (an inline script or style, a data: picture), a
script from a file that is no .js, an error or a rejected Promise nobody catches, one of the
plugin's own files that is not there, or a page that does not load.

Usage: python3 tools/web-check.py plugins/<id> [--seconds 20] [--settings JSON] [--json result.json]
Needs: pip install playwright && playwright install chromium
"""
import argparse
import collections
import json
import pathlib
import re
import sys
import time
import urllib.parse

from playwright.sync_api import sync_playwright

DATA_TYPES = {"fetch", "xhr", "eventsource", "ping", "websocket"}
CLIPBOARD = ["none", "write", "read", "readwrite"]

# The stand-in pf: the names of the page's pf in PecoFence (AGENTS.md section 4), every call a
# Promise, each call recorded, the answers in the shapes of section 3.1. Events update pf.theme,
# pf.settings and pf.fence first, and an error in a handler is caught and counted, as there.
STUB = """
(() => {
  const P = __PERMS__, record = (name, args, refused) => window.__pfRecord(name, JSON.stringify(args).slice(0, 200), refused || "");
  const handlers = {}, data = new Map();
  const state = { lang: "en", theme: "dark", settings: __SETTINGS__, fence: { id: "check", width: 320, height: 240 } };
  const clip = ["none", "write", "read", "readwrite"].indexOf(P.clipboard || "none");
  // As PecoFence reads an address (AGENTS.md 3.1): a small-letter scheme; a control character
  // anywhere, or a user name, a backslash or a space before the path, is refused.
  const host = (u) => {
    const text = String(u), authority = /^https?:[/][/]([^/?#]*)/.exec(text);
    if (!authority || /[@\\s]/.test(authority[1]) || authority[1].includes(String.fromCharCode(92)) || [...text].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return "";
    try { return new URL(u).hostname; } catch (e) { return ""; }
  };
  // As PecoFence's bridge: every call is a message { id, call, args }, refused in the page with a
  // RangeError when it is over 1 MB as JSON in UTF-8.
  let n = Math.floor(Math.random() * 1e9);
  const call = (name, args, refuse, answer) => {
    const big = new TextEncoder().encode(JSON.stringify({ id: ++n, call: name, args })).length > 1048576;
    const why = big ? "a message to PecoFence is at most 1 MB" : refuse ? refuse() : "";
    record(name, args, why);
    return why ? Promise.reject(big ? new RangeError(`pf.${name}: ${why}`) : new Error(why)) : Promise.resolve(answer === undefined ? null : answer);
  };
  const needHost = (u, list, field) => () => !host(u) ? "an address PecoFence refuses (AGENTS.md 3.1)"
    : list.includes(host(u)) ? "" : `${host(u)} is not in permissions.${field}`;
  // Reading and writing are two rights: read is 2 (read, readwrite), write is 1 (write, readwrite).
  const needClip = (n) => () => (n === 2 ? clip >= 2 : clip === 1 || clip === 3) ? "" : "permissions.clipboard does not allow it";
  const needFlag = (f) => () => P[f] ? "" : `permissions.${f} is not true`;
  const folders = { true: 1, read: 1, readwrite: 2 }[P.folders] || 0;
  const needFolders = (n) => () => folders >= n ? "" : n > 1 ? 'permissions.folders is not "readwrite"' : "permissions.folders does not read";
  // pf.http: a network host, or a port of permissions.local: loopback on this computer by name,
  // lan only to the address typed in a device setting (none unless --settings gives one).
  const L = P.local || {}, devices = __DEVICES__;
  const offline = (u) => () => {
    const h = host(u), m = /^(https?):[/][/][^/?#]*?(?::(\d+))?(?:[/?#]|$)/.exec(String(u));
    const port = m ? +(m[2] || (m[1] === "https" ? 443 : 80)) : 0, on = (c) => (L[c] || []).some((e) => e.port === port);
    const why = !h ? "an address PecoFence refuses (AGENTS.md 3.1)"
      : /^(localhost|127[.]\d+[.]\d+[.]\d+)$/.test(h) && on("loopback") ? ""
      : on("lan") ? (devices.includes(h) ? "" : `rejected: ${h} is not the address of a device typed in this fence's settings`)
      : needHost(u, P.network || [], "network or a port of permissions.local")();
    return why || "offline (the check has no network)";
  };
  // pf.open works within 1 second after a mouse press in the fence.
  let pressed = -1e9;
  // Only a real press counts: one the page dispatches itself (isTrusted false) grants nothing.
  addEventListener("pointerdown", (e) => { if (e.isTrusted) pressed = Date.now(); }, true);
  // pf.open, pf.launch.open and pick and pf.media.control: one call per press, within 1 second.
  const pressNeeded = (name, then) => () => {
    if (Date.now() - pressed > 1000) return `pf.${name} works only right after a click in the fence`;
    pressed = -1e9;
    return then ? then() : "";
  };
  const media = ["none", "read", "control"].indexOf(P.media || "none");
  const needMedia = (n, then) => () => media >= n ? (then ? then() : "") : `permissions.media does not allow it`;
  const needApps = () => (P.apps || []).length ? "" : "permissions.apps names no program";
  // The dropped file notes.txt (file 0 of the drop), as pecofence-plugin-check answers.
  const dropped = (i, answer) => () => !(P.drop || []).includes("files") ? "permissions.drop does not take files"
    : i === 0 ? "" : "pf.drop: the drop has 1 files";
  document.addEventListener("securitypolicyviolation", (e) => window.__pfCsp(`${e.effectiveDirective || e.violatedDirective} blocked ${e.blockedURI || "inline"}${e.sourceFile ? " (" + e.sourceFile.split("/").pop() + ":" + e.lineNumber + ")" : ""}`), true);
  for (const k of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel"]) {
    Object.defineProperty(window, k, { value: function () { record("webrtc", [k], "WebRTC is not allowed"); throw new TypeError("WebRTC is not allowed"); } });
  }
  window.__pfEmit = (name, json) => {
    const d = json === undefined ? null : JSON.parse(json);
    if (name === "settings" || name === "theme") state[name] = d;
    if (name === "resize") Object.assign(state.fence, d);
    for (const fn of handlers[name] || []) try { fn(d); } catch (err) { window.__pfError(`in the ${name} handler: ${err && err.stack ? err.stack.split("\\n").slice(0, 2).join(" ") : err}`); }
  };
  const pf = {
    on: (name, fn) => { record("on", [name]); (handlers[name] = handlers[name] || []).push(fn); },
    post: (d) => call("post", [d === undefined ? null : d]),
    time: { now: () => call("time.now", [], null, Date.now()), format: (ms, kind) => call("time.format", [ms, kind], null, new Date(ms).toLocaleString()) },
    http: { get: (u, o) => call("http.get", [u, o], offline(u)), post: (u, o) => call("http.post", [u, o], offline(u)) },
    data: { read: (n) => call("data.read", [n], null, data.has(n) ? data.get(n) : null),
            write: (n, t) => { const text = typeof t === "string" ? t : JSON.stringify(t); data.set(n, text); return call("data.write", [n, t]); },
            list: () => call("data.list", [], null, [...data.keys()].sort()), remove: (n) => { data.delete(n); return call("data.remove", [n]); } },
    clipboard: { text: () => call("clipboard.text", [], needClip(2), { text: "text on the clipboard", truncated: false }),
                 files: () => call("clipboard.files", [], needClip(2), null), image: (n) => call("clipboard.image", [n], needClip(2), null),
                 setText: (t) => call("clipboard.setText", [t], needClip(1)), setFiles: (f) => call("clipboard.setFiles", [f], needClip(1)),
                 setImage: (n) => call("clipboard.setImage", [n], needClip(1)) },
    sys: { cpu: () => call("sys.cpu", [], null, 12), memory: () => call("sys.memory", [], null, 38),
           drives: () => call("sys.drives", [], null, [{ letter: "C", free: 2e11, size: 5e11 }]), ip: () => call("sys.ip", [], null, "192.168.1.20"),
           network: () => call("sys.network", [], null, [{ up: true, gateway: true, physical: true, addresses: ["192.168.1.20"] }]),
           battery: () => call("sys.battery", [], null, { percent: 80, plugged: true }) },
    open: (u) => call("open", [u], pressNeeded("open", needHost(u, [...(P.network || []), ...(P.links || [])], "network or permissions.links"))),
    openSystem: (n) => call("openSystem", [n], () => n === "taskmgr" ? "" : `${n} is not a known system window`),
    run: (p, a) => call("run", [p, a], () => (P.system || []).some((s) => s.toLowerCase() === String(p).toLowerCase()) ? "" : `${p} is not in permissions.system`, { code: 0, output: "" }),
    folder: { pick: () => call("folder.pick", [], needFolders(1), null), list: (p) => call("folder.list", [p], needFolders(1), []), read: (p) => call("folder.read", [p], needFolders(1), ""),
              write: (p, t) => call("folder.write", [p, t], needFolders(2)), mkdir: (p) => call("folder.mkdir", [p], needFolders(2)),
              trash: (p) => call("folder.trash", [p], needFolders(2)) },
    notify: (t, b, o) => call("notify", [t, b, o], needFlag("notify")),
    // The shapes of AGENTS.md 3.1: one launcher item, the user cancels the dialog, a song plays.
    launch: { list: () => call("launch.list", [], needFlag("launch"), [{ id: "1", name: "notes.txt", icon: null }]),
              open: (id) => call("launch.open", [id], pressNeeded("launch.open", needFlag("launch"))),
              pick: (k) => call("launch.pick", [k], pressNeeded("launch.pick", needFlag("launch")), null),
              remove: (id) => call("launch.remove", [id], needFlag("launch"), true) },
    media: { current: () => call("media.current", [], needMedia(1), { title: "A song", artist: "An artist", album: "", playing: true,
               position: 30, duration: 180, cover: null, app: null }),
             control: (a) => call("media.control", [a], pressNeeded("media.control", needMedia(2,
               () => ["playpause", "next", "previous"].includes(a) ? "" : `${a} is not playpause, next or previous`)), true) },
    apps: { running: () => call("apps.running", [], needApps, []), front: () => call("apps.front", [], needApps, null) },
    drop: { text: (i) => call("drop.text", [i], dropped(i), "dropped notes"), read: (i) => call("drop.read", [i], dropped(i), "ZHJvcHBlZCBub3Rlcw=="),
            save: (i, n) => { data.set(n, "dropped notes"); return call("drop.save", [i, n], dropped(i)); } },
  };
  for (const k of Object.keys(pf)) if (typeof pf[k] === "object") Object.freeze(pf[k]);
  for (const k of ["lang", "theme", "settings", "fence"]) Object.defineProperty(pf, k, { get: () => state[k], enumerable: true });
  Object.defineProperty(window, "pf", { value: Object.freeze(pf) });
})();
"""


def csp(network):
    """The header PecoFence sends with each file (crates/app/src/web_plugin.rs, Plugin::csp)."""
    connect = "".join(f" https://{h} wss://{h}" for h in network)
    return f"default-src 'self'; connect-src 'self'{connect}; frame-src 'none'; form-action 'none'"


# The type PecoFence gives each file by its extension (web_plugin.rs, mime), with nosniff: a
# browser runs a script only from a .js file.
MIME = {"html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
        "json": "application/json", "svg": "image/svg+xml", "png": "image/png", "jpg": "image/jpeg",
        "jpeg": "image/jpeg", "gif": "image/gif", "webp": "image/webp", "woff2": "font/woff2"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plugin")
    ap.add_argument("--seconds", type=float, default=20)
    ap.add_argument("--json", default="")
    ap.add_argument("--settings", default="{}", help="the fence's settings as JSON (a device setting: the address typed)")
    args = ap.parse_args()
    root = pathlib.Path(args.plugin).resolve()
    m = json.loads((root / "plugin.json").read_bytes().decode("utf-8-sig"))
    if m.get("layer") != "web":
        print(f"PASS: {m.get('id')} is a {m.get('layer', 'light')} plugin: no web page to check")
        print("RESULT: PASS")
        return 0
    perms = m.get("permissions", {})
    network = list(perms.get("network", []))
    # As pecofence-plugin-check: --settings sets values; a device setting's is the address a user
    # typed there, of which PecoFence keeps the host (null until typed).
    settings = {s["key"]: s.get("default") for s in m.get("settings", [])} | json.loads(args.settings)
    for s in m.get("settings", []):
        if s.get("type") == "device" and isinstance(settings.get(s["key"]), str):
            settings[s["key"]] = re.sub(r"^https?://", "", settings[s["key"]].strip()).split("/")[0].split(":")[0].lower().rstrip(".")
    devices = [settings[s["key"]] for s in m.get("settings", []) if s.get("type") == "device" and settings.get(s["key"])]
    origin = f"https://{m['id']}.plugins.pecofence"
    headers = {"Content-Security-Policy": csp(network), "X-Content-Type-Options": "nosniff"}
    requests, sockets, calls, refused, errors, blocked, missing = [], [], collections.Counter(), [], [], [], []
    failures, notes = [], []

    def serve(route):
        url = urllib.parse.urlsplit(route.request.url)
        if f"{url.scheme}://{url.netloc}" == origin:
            # The path as PecoFence takes it: nothing decoded (a '%' finds no file), no empty
            # part, no '.' or '..', no '\' or ':'.
            path = url.path[1:] or "index.html"
            plain = all(p not in ("", ".", "..") and not any(c in p for c in "\\:%") for p in path.split("/"))
            if plain and (root / path).is_file():
                kind = MIME.get(path.rsplit(".", 1)[-1], "application/octet-stream")
                return route.fulfill(status=200, body=(root / path).read_bytes(), headers={**headers, "Content-Type": kind})
            # The browser asks for a tab icon by itself; a plugin has none.
            if url.path != "/favicon.ico":
                missing.append(url.path)
            return route.fulfill(status=404, body=b"", headers=headers)
        requests.append((time.monotonic(), url.hostname or url.scheme, route.request.resource_type, route.request.url))
        return route.abort("internetdisconnected")

    def record(name, args_json, why):
        calls[name] += 1
        if why and not why.startswith(("offline", "rejected")):
            refused.append(f"{name}({args_json[:100]}): {why}")

    def console(msg):
        # A script from a file that is no .js does not run (nosniff), in PecoFence too.
        if msg.type == "error" and msg.text.startswith("Refused to execute script"):
            failures.append(msg.text.split(" because")[0][:200] + ": a script comes from a .js file")
        elif msg.type == "error" and not msg.text.startswith("Failed to load resource") and "Content Security Policy" not in msg.text:
            notes.append(msg.text[:200])

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(service_workers="block", viewport={"width": 320, "height": 240})
        context.route("**/*", serve)
        if hasattr(context, "route_web_socket"):
            context.route_web_socket("**", lambda ws: (sockets.append(ws.url), ws.close()))
        page = context.new_page()
        page.expose_function("__pfRecord", record)
        page.expose_function("__pfCsp", lambda what: blocked.append(what))
        page.expose_function("__pfError", lambda what: errors.append(what[:200]))
        stub = STUB.replace("__PERMS__", json.dumps(perms)).replace("__SETTINGS__", json.dumps(settings))
        stub = stub.replace("__DEVICES__", json.dumps(devices))
        page.add_init_script(stub)
        page.on("websocket", lambda ws: ws.url in sockets or sockets.append(ws.url))
        # An uncaught error and a rejected Promise nobody catches both come here.
        page.on("pageerror", lambda e: errors.append(str(e).splitlines()[0][:200]))
        page.on("console", console)
        cdp = context.new_cdp_session(page)
        cdp.send("Performance.enable")
        begun = time.monotonic()
        answer = page.goto(origin + "/index.html", wait_until="load")
        if not answer or answer.status != 200:
            failures.append("index.html did not load")
        emit = lambda name, data=None: page.evaluate("([n, d]) => window.__pfEmit && window.__pfEmit(n, d)", [name, data])
        # The events a page gets (AGENTS.md section 4), as a user's day brings them.
        steps = [(0.15, lambda: (page.set_viewport_size({"width": 480, "height": 300}),
                                 emit("resize", json.dumps({"width": 480, "height": 300})))),
                 (0.2, lambda: emit("theme", json.dumps("light"))), (0.25, lambda: emit("theme", json.dumps("dark"))),
                 (0.3, lambda: emit("hide")), (0.45, lambda: emit("show")),
                 (0.5, lambda: emit("settings", json.dumps(settings))), (0.55, lambda: emit("timechange"))]
        if perms.get("clipboard") in ("read", "readwrite"):
            steps.append((0.58, lambda: emit("clipboard")))
        if perms.get("media") in ("read", "control"):
            steps.append((0.58, lambda: emit("media")))
        if perms.get("apps"):
            steps.append((0.58, lambda: emit("apps", json.dumps({"running": perms["apps"][:1], "front": None}))))
        # One drop with what the page takes of a file, a text and a link, as pecofence-plugin-check.
        takes = lambda kind: kind in (perms.get("drop") or [])
        if perms.get("drop"):
            steps.append((0.58, lambda: emit("drop", json.dumps({
                "files": [{"name": "notes.txt", "size": 120, "folder": False}] if takes("files") else [],
                "text": "a dropped text" if takes("text") else None,
                "url": "https://example.com/" if takes("links") else None, "row": None}))))
        rest = None
        for at, step in steps + [(0.6, None)]:
            page.wait_for_timeout(max(0, begun + at * args.seconds - time.monotonic()) * 1000)
            if step:
                step()
        rest = (time.monotonic(), {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]})
        page.wait_for_timeout(max(0, begun + args.seconds - time.monotonic()) * 1000)
        end = {x["name"]: x["value"] for x in cdp.send("Performance.getMetrics")["metrics"]}
        if not page.url.startswith(origin):
            failures.append(f"the page went to {page.url}")
        browser.close()

    print(f"PASS: ran {m['id']} {m.get('version')} for {args.seconds:.0f} s at {origin}/ with PecoFence's CSP")
    by_host = collections.Counter(h for _, h, _, _ in requests)
    for host, n in sorted(by_host.items()):
        kinds = sorted({k for _, h, k, _ in requests if h == host})
        declared = host in network
        print(f"INFO: {n} request(s) to {host} ({', '.join(kinds)}){'' if declared else ' NOT DECLARED'}")
        if not declared:
            failures.append(f"requests to {host}, which permissions.network does not declare")
        elif set(kinds) - DATA_TYPES:
            failures.append(f"loads {', '.join(sorted(set(kinds) - DATA_TYPES))} from {host}: a page loads only data from the network")
    for url in sockets:
        host = urllib.parse.urlsplit(url).hostname
        print(f"INFO: WebSocket to {url}")
        if host not in network:
            failures.append(f"a WebSocket to {host}, which permissions.network does not declare")
    print("INFO: pf calls: " + (", ".join(f"{k} {v}" for k, v in sorted(calls.items())) or "none"))
    failures += [f"refused: {r}" for r in refused]
    failures += [f"PecoFence's Content Security Policy blocks it (AGENTS.md section 4): {b}" for b in dict.fromkeys(blocked)]
    failures += [f"an error nobody catches: {e}" for e in dict.fromkeys(errors)]
    failures += [f"the plugin's own file {path} is not there" for path in dict.fromkeys(missing)]
    for n in notes[:5]:
        print(f"WARN: console error: {n}")
    heap = end.get("JSHeapUsedSize", 0) / 1e6
    span = time.monotonic() - rest[0] if rest else 0
    script = (end.get("ScriptDuration", 0) - rest[1].get("ScriptDuration", 0)) * 1000 / max(span, 0.001)
    per_minute = sum(1 for t, *_ in requests if t >= rest[0]) * 60 / max(span, 0.001)
    print(f"INFO: JavaScript heap {heap:.1f} MB, script time at rest {script:.1f} ms a second, "
          f"requests at rest {per_minute:.1f} a minute")
    if script > 10:
        print("WARN: more than 10 ms of script a second at rest (AGENTS.md section 6)")
    for f in failures:
        print(f"FAIL: {f}")
    if args.json:
        pathlib.Path(args.json).write_text(json.dumps({
            "requests": [{"host": h, "type": k, "url": u} for _, h, k, u in requests], "websockets": sockets,
            "calls": calls, "refused": refused, "blocked": blocked, "errors": errors, "missing": missing,
            "console": notes, "heapMB": heap, "scriptMsPerSecond": script, "failures": failures}, indent=1), encoding="utf-8")
    print("RESULT: FAIL" if failures else "RESULT: PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
