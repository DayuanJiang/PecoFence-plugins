#!/usr/bin/env python3
"""Runs a web plugin's index.html in headless Chromium and reports what it reaches (AGENTS.md 4, 5).

The page gets its files from https://<id>.plugins.pecofence/ as in PecoFence, and a stand-in `pf`
that records every call and answers with fixed values. Nothing reaches the network: every other
request and WebSocket is recorded, then refused. Fails on a request to a host the manifest does not
declare, a script, style, font or picture from the network, a WebSocket to an undeclared host,
WebRTC, a refused pf call, or a page that does not load.

Usage: python3 tools/web-check.py plugins/<id> [--seconds 20] [--json result.json]
Needs: pip install playwright && playwright install chromium
"""
import argparse
import collections
import json
import mimetypes
import pathlib
import sys
import time
import urllib.parse

from playwright.sync_api import sync_playwright

DATA_TYPES = {"fetch", "xhr", "eventsource", "ping", "websocket"}
CLIPBOARD = ["none", "write", "read", "readwrite"]

# The stand-in pf: the same names as AGENTS.md 3.1, every call a Promise, each call recorded.
STUB = """
(() => {
  const P = __PERMS__, record = (name, args, refused) => window.__pfRecord(name, JSON.stringify(args), refused || "");
  const handlers = {}, data = new Map();
  const clip = ["none", "write", "read", "readwrite"].indexOf(P.clipboard || "none");
  // As PecoFence reads an address (AGENTS.md 3.1): a small-letter scheme; a control character
  // anywhere, or a user name, a backslash or a space before the path, is refused.
  const host = (u) => {
    const text = String(u), authority = /^https?:[/][/]([^/?#]*)/.exec(text);
    if (!authority || /[@\\s]/.test(authority[1]) || authority[1].includes(String.fromCharCode(92)) || [...text].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return "";
    try { return new URL(u).hostname; } catch (e) { return ""; }
  };
  const call = (name, args, refuse, answer) => {
    const why = refuse ? refuse() : "";
    record(name, args, why);
    return why ? Promise.reject(new Error(why)) : Promise.resolve(answer);
  };
  const needHost = (u, list, field) => () => !host(u) ? "an address PecoFence refuses (AGENTS.md 3.1)"
    : list.includes(host(u)) ? "" : `${host(u)} is not in permissions.${field}`;
  const needClip = (n) => () => clip >= n ? "" : "permissions.clipboard does not allow it";
  const needFlag = (f) => () => P[f] ? "" : `permissions.${f} is not true`;
  const offline = (u, list) => () => needHost(u, list, "network")() || "offline (the check has no network)";
  for (const k of ["RTCPeerConnection", "webkitRTCPeerConnection", "RTCDataChannel"]) {
    Object.defineProperty(window, k, { value: function () { record("webrtc", [k], "WebRTC is not allowed"); throw new TypeError("WebRTC is not allowed"); } });
  }
  window.__pfEmit = (name, json) => { for (const fn of handlers[name] || []) fn(json === undefined ? undefined : JSON.parse(json)); };
  Object.defineProperty(window, "pf", { value: Object.freeze({
    lang: "en", theme: "dark", settings: __SETTINGS__, fence: { id: "check", width: 320, height: 240 },
    on: (name, fn) => { record("on", [name]); (handlers[name] = handlers[name] || []).push(fn); },
    time: { now: () => call("time.now", [], null, Date.now()), format: (ms, kind) => call("time.format", [ms, kind], null, new Date(ms).toLocaleString()) },
    http: { get: (u, o) => call("http.get", [u, o], offline(u, P.network || [])), post: (u, o) => call("http.post", [u, o], offline(u, P.network || [])) },
    data: { read: (n) => call("data.read", [n], null, data.has(n) ? data.get(n) : null), write: (n, t) => { data.set(n, String(t)); return call("data.write", [n, String(t).length]); },
            list: () => call("data.list", [], null, [...data.keys()]), remove: (n) => { data.delete(n); return call("data.remove", [n]); } },
    clipboard: { text: () => call("clipboard.text", [], needClip(2), "text on the clipboard"), files: () => call("clipboard.files", [], needClip(2), []),
                 image: () => call("clipboard.image", [], needClip(2), null), setText: (t) => call("clipboard.setText", [String(t).length], needClip(1)),
                 setFiles: (f) => call("clipboard.setFiles", [f], needClip(1)), setImage: (n) => call("clipboard.setImage", [n], needClip(1)) },
    sys: { cpu: () => call("sys.cpu", [], null, 12.5), memory: () => call("sys.memory", [], null, { used: 6e9, total: 16e9 }),
           drives: () => call("sys.drives", [], null, [{ name: "C:", used: 2e11, total: 5e11 }]), ip: () => call("sys.ip", [], null, "192.168.1.20"),
           network: () => call("sys.network", [], null, { up: 1000, down: 20000 }), battery: () => call("sys.battery", [], null, { percent: 80, charging: true }) },
    open: (u) => call("open", [u], needHost(u, [...(P.network || []), ...(P.links || [])], "network or permissions.links")),
    openSystem: (n) => call("openSystem", [n], () => n === "taskmgr" ? "" : `${n} is not a known system window`),
    run: (p, a) => call("run", [p, a], () => (P.system || []).some((s) => s.toLowerCase() === String(p).toLowerCase()) ? "" : `${p} is not in permissions.system`, { code: 0, output: "" }),
    folder: { pick: () => call("folder.pick", [], needFlag("folders"), null), list: (p) => call("folder.list", [p], needFlag("folders"), []), read: (p) => call("folder.read", [p], needFlag("folders"), "") },
    notify: (t, b, o) => call("notify", [t, b, o], needFlag("notify")),
  }) });
})();
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("plugin")
    ap.add_argument("--seconds", type=float, default=20)
    ap.add_argument("--json", default="")
    args = ap.parse_args()
    root = pathlib.Path(args.plugin).resolve()
    m = json.loads((root / "plugin.json").read_bytes().decode("utf-8-sig"))
    if m.get("layer") != "web":
        print(f"PASS: {m.get('id')} is a {m.get('layer', 'light')} plugin: no web page to check")
        print("RESULT: PASS")
        return 0
    perms = m.get("permissions", {})
    network = set(perms.get("network", []))
    settings = {s["key"]: s.get("default") for s in m.get("settings", [])}
    origin = f"https://{m['id']}.plugins.pecofence"
    requests, sockets, calls, refused, errors = [], [], collections.Counter(), [], []
    failures = []

    def serve(route):
        url = urllib.parse.urlsplit(route.request.url)
        if f"{url.scheme}://{url.netloc}" == origin:
            path = (root / urllib.parse.unquote(url.path).lstrip("/")).resolve()
            if path == root:
                path = root / "index.html"
            if root in path.parents and path.is_file():
                kind = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                return route.fulfill(status=200, body=path.read_bytes(), content_type=kind)
            return route.fulfill(status=404, body=b"")
        requests.append((time.monotonic(), url.hostname or url.scheme, route.request.resource_type, route.request.url))
        return route.abort("internetdisconnected")

    def record(name, args_json, why):
        calls[name] += 1
        if why and not why.startswith("offline"):
            refused.append(f"{name}{json.loads(args_json)}: {why}")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(service_workers="block", viewport={"width": 320, "height": 240})
        context.route("**/*", serve)
        if hasattr(context, "route_web_socket"):
            context.route_web_socket("**", lambda ws: (sockets.append(ws.url), ws.close()))
        page = context.new_page()
        page.expose_function("__pfRecord", record)
        stub = STUB.replace("__PERMS__", json.dumps(perms)).replace("__SETTINGS__", json.dumps(settings))
        page.add_init_script(stub)
        page.on("websocket", lambda ws: ws.url in sockets or sockets.append(ws.url))
        page.on("pageerror", lambda e: errors.append(str(e).splitlines()[0]))
        page.on("console", lambda msg: msg.type == "error" and not msg.text.startswith("Failed to load resource") and errors.append(msg.text[:200]))
        cdp = context.new_cdp_session(page)
        cdp.send("Performance.enable")
        begun = time.monotonic()
        answer = page.goto(origin + "/index.html", wait_until="load")
        if not answer or answer.status != 200:
            failures.append("index.html did not load")
        emit = lambda name, data=None: page.evaluate("([n, d]) => window.__pfEmit && window.__pfEmit(n, d)", [name, data])
        emit("start")
        steps = [(0.2, lambda: (page.set_viewport_size({"width": 480, "height": 300}),
                                emit("resize", json.dumps({"width": 480, "height": 300})))),
                 (0.3, lambda: emit("hide")), (0.45, lambda: emit("show")),
                 (0.5, lambda: emit("settings", json.dumps(settings)))]
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

    print(f"PASS: ran {m['id']} {m.get('version')} for {args.seconds:.0f} s at {origin}/")
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
    for e in errors[:5]:
        print(f"WARN: page error: {e}")
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
            "calls": calls, "refused": refused, "errors": errors, "heapMB": heap, "scriptMsPerSecond": script,
            "failures": failures}, indent=1), encoding="utf-8")
    print("RESULT: FAIL" if failures else "RESULT: PASS")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
