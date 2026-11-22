#!/usr/bin/env python3
"""Builds the feed PecoFence reads: index-3.json and index.json, their signatures, and the plugins' files.

index-3.json lists every plugin with its manifest and, for each file, its size and SHA-256; PecoFence
0.5.1 and later read it. index.json is the same for PecoFence 0.5.0 and earlier, which drop an entry
their own checks refuse (what plugin interface 3 brought: folders "any", IP or dotless hosts, scripts
in system, more than 4 local ports, bigger files) and then never see its take-down: such an entry is
there as a stand-in they accept, with api 3 (so they show 需要更新 PecoFence), the permissions they
can read and its "disabled". Files are fetched from the commit the index names, so only the reviewed
version installs. A plugin named in disabled.json is listed with "disabled" and its reason; PecoFence
turns it off. "serial" is the number of commits on main up to that commit: it only grows, and
PecoFence refuses an index with a lower serial than one it saw (an old signed index served again
would bring back a removed take-down).

The output folder holds both indexes, each with its .sig (Ed25519 over the exact bytes, 128 hex
digits, when INDEX_SIGNING_KEY holds the private key's 64 hex digits) and
<commit>/plugins/<id>/<files>, the layout of the project website's copy and of a local test feed.

Usage:
  python3 tools/build-index.py --out <dir> [--commit <sha>] [--serial <n>] [--require-signature]
  python3 tools/build-index.py --out C:\\pf-feed --plugin plugins/my-plugin   (a local test feed)
"""
import argparse
import hashlib
import json
import os
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# The most bytes PecoFence reads: of index.json in 0.5.0 and earlier, of index-3.json from 0.5.1
# (MAX_INDEX in PecoFence's crates/core/src/plugins.rs).
MAX_INDEX_0_5 = 1024 * 1024
MAX_INDEX = 16 * 1024 * 1024
FIELDS = ["id", "version", "api", "layer", "name", "description", "author", "minPecoFence",
          "permissions", "settings"]
# PecoFence 0.5.0's own limits (plugins.rs of v0.5.0): an entry past one of them is dropped there.
HOST_0_5 = re.compile(r"(?=.{1,253}\Z)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{0,61}[a-z0-9]")
PROGRAM_0_5 = re.compile(r"(?ia)([A-Za-z]:\\[^/:*?\"<>|\x00-\x1f]+|[A-Za-z0-9._-]+)\.exe")
SIZES_0_5 = {"plugin.json": 64 << 10, "README.md": 64 << 10, "main.js": 200 << 10, "screenshot.png": 300 << 10}
OTHER_SIZE_0_5, TOTAL_0_5, FILES_0_5 = 1 << 20, 5 << 20, 100


def refused_by_0_5(e):
    """Why PecoFence 0.5.0 would drop entry `e` (what interface 3 brought), or None."""
    p = e.get("permissions") or {}
    hosts = (p.get("network") or []) + (p.get("links") or [])
    system = p.get("system") or []
    local = p.get("local") or {}
    ports = len(local.get("loopback") or []) + len(local.get("lan") or [])
    files = e.get("files") or []
    big = [f["name"] for f in files if f["size"] > SIZES_0_5.get(f["name"], OTHER_SIZE_0_5)]
    return next((why for bad, why in [
        (p.get("folders") not in (None, False, True, "none", "read", "readwrite"), "folders any"),
        (any(not HOST_0_5.fullmatch(h) for h in hosts), "IP or dotless hosts"),
        (len(system) > 20 or any(not PROGRAM_0_5.fullmatch(s) for s in system), "scripts in system"),
        (ports > 4, "more than 4 local ports"),
        (big or len(files) > FILES_0_5 or sum(f["size"] for f in files) > TOTAL_0_5, "files over 0.5.0's sizes"),
    ] if bad), None)


def for_0_5(e):
    """Entry `e` as index.json lists it: itself, or a stand-in PecoFence 0.5.0 accepts (api 3, so
    its row says 需要更新 PecoFence; what it can read of the permissions; the three files it needs,
    never fetched there; the take-down)."""
    if refused_by_0_5(e) is None:
        return e
    s = json.loads(json.dumps(e))
    s["api"] = max(3, s.get("api", 1))
    # 0.5.0 ignores the field; a newer PecoFence that reads index.json (no index-3.json reached)
    # takes only the take-down from a stand-in and never installs or updates from it.
    s["standIn"] = True
    p = s.setdefault("permissions", {})
    if p.get("folders") == "any":
        p["folders"] = "readwrite"
    for k in ("network", "links"):
        if k in p:
            p[k] = [h for h in p[k] if HOST_0_5.fullmatch(h)]
    if "system" in p:
        p["system"] = [x for x in p["system"] if PROGRAM_0_5.fullmatch(x)][:20]
    local = p.get("local") or {}
    if local:
        # A lan port stays first: 0.5.0 wants one beside a device setting.
        loop, lan = local.get("loopback") or [], (local.get("lan") or [])[:4]
        p["local"] = {"loopback": loop[:4 - len(lan)], "lan": lan}
    need = {"plugin.json", "README.md", "main.js" if s.get("layer", "light") == "light" else "index.html"}
    s["files"] = [{**f, "size": min(f["size"], SIZES_0_5.get(f["name"], OTHER_SIZE_0_5))}
                  for f in s.get("files", []) if f["name"] in need]
    return s


def entry(folder, disabled):
    """The index entry of one plugin folder; ValueError (or OSError) when it cannot be one."""
    m = json.loads((folder / "plugin.json").read_bytes().decode("utf-8-sig"))
    if not isinstance(m, dict) or m.get("id") != folder.name:
        raise ValueError("plugin.json is no object whose id is the folder's name")
    files = []
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        data, name = path.read_bytes(), path.relative_to(folder).as_posix()
        # The same names tools/check.py allows: no "..", no leading "/", no backslash or drive, no
        # trailing dot, no Windows device name, at most 200 characters, and no two that differ
        # only in case (PecoFence drops an entry with such a file).
        if len(name) > 200 or not all(
                re.fullmatch(r"(?ia)(?!(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$))[a-z0-9_-][a-z0-9._-]{0,63}(?<!\.)", part)
                for part in name.split("/")):
            raise ValueError(f"the file name {name!r} is not allowed")
        if any(f["name"].lower() == name.lower() for f in files):
            raise ValueError(f"the file names of {name!r} differ only in case")
        files.append({"name": name, "size": len(data),
                      "sha256": hashlib.sha256(data).hexdigest()})
    e = {k: m[k] for k in FIELDS if k in m}
    e["files"] = files
    if m["id"] in disabled:
        e["disabled"] = disabled[m["id"]]
    return e


def sign(data):
    """The Ed25519 signature of `data` as hex, or None without a key."""
    key = os.environ.get("INDEX_SIGNING_KEY", "").strip()
    if not key:
        return None
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    return Ed25519PrivateKey.from_private_bytes(bytes.fromhex(key)).sign(data).hex()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", required=True, help="the folder to write")
    ap.add_argument("--commit", help="the reviewed commit (default: git HEAD)")
    ap.add_argument("--plugin", action="append", default=[], help="only this plugin folder (repeatable)")
    ap.add_argument("--serial", type=int, help="the serial (default: the count of commits up to --commit)")
    ap.add_argument("--require-signature", action="store_true", help="fail without INDEX_SIGNING_KEY")
    args = ap.parse_args()
    git = lambda *a: subprocess.run(["git", "-C", str(ROOT), *a], capture_output=True, text=True,
                                    check=True).stdout.strip()
    commit = args.commit or git("rev-parse", "HEAD")
    serial = args.serial
    if serial is None:
        # A shallow clone counts only the commits it has, which would put the serial back.
        if git("rev-parse", "--is-shallow-repository") == "true":
            sys.exit("a shallow clone: the serial needs the whole history (fetch-depth: 0) or --serial")
        serial = int(git("rev-list", "--count", commit))
    disabled = json.loads((ROOT / "disabled.json").read_text(encoding="utf-8")) if (ROOT / "disabled.json").exists() else {}
    folders = [pathlib.Path(p).resolve() for p in args.plugin] or sorted(p for p in (ROOT / "plugins").iterdir() if p.is_dir())
    # A folder that cannot be an entry is left out with a warning; the others are published. A
    # plugin taken down in disabled.json is never left out: its entry carries the take-down.
    good, plugins = [], []
    for f in folders:
        try:
            plugins.append(entry(f, disabled))
            good.append(f)
        except (OSError, ValueError, KeyError) as e:
            if f.name in disabled:
                sys.exit(f"::error::{f.name} is taken down in disabled.json, but its folder cannot be listed ({e}): "
                         "the index would lose the take-down, so nothing is published. Repair the folder.")
            print(f"::warning::{f.name} left out of index.json: {e}", file=sys.stderr)
    folders = good
    lost = [] if args.plugin else sorted(set(disabled) - {e["id"] for e in plugins})
    if lost:
        sys.exit(f"::error::disabled.json takes down {', '.join(lost)}, which has no plugin folder: the index would "
                 "lose the take-down, so nothing is published.")
    dump = lambda entries: (json.dumps({"format": 1, "serial": serial, "commit": commit, "plugins": entries},
                                       ensure_ascii=False, indent=1) + "\n").encode()
    indexes = {"index-3.json": (dump(plugins), MAX_INDEX), "index.json": (dump([for_0_5(e) for e in plugins]), MAX_INDEX_0_5)}
    for name, (data, most) in indexes.items():
        if len(data) > most:
            sys.exit(f"::error::{name} would be {len(data)} bytes, more than the {most} PecoFence reads (MAX_INDEX "
                     "in PecoFence's crates/core/src/plugins.rs; 1 MB for index.json in 0.5.0), so nothing is published: "
                     "PecoFence would refuse it. Raise MAX_INDEX in PecoFence first, or make the entries shorter.")
    stand_ins = [e["id"] for e in plugins if refused_by_0_5(e)]
    if stand_ins:
        print(f"index.json lists stand-ins for PecoFence 0.5.0: {', '.join(stand_ins)}")

    out = pathlib.Path(args.out)
    if out.exists() and any(out.iterdir()):
        if not (out / "index.json").exists():
            sys.exit(f"{out} is not empty and holds no index.json: give a new folder")
        shutil.rmtree(out)
    out.mkdir(parents=True, exist_ok=True)
    for folder, e in zip(folders, plugins):
        shutil.copytree(folder, out / commit / "plugins" / e["id"])
    for name, (data, _) in indexes.items():
        (out / name).write_bytes(data)
        signature = sign(data)
        if signature:
            (out / f"{name}.sig").write_text(signature, encoding="ascii")
        elif args.require_signature:
            sys.exit("INDEX_SIGNING_KEY is not set: no signature (make one with tools/make-key.py)")
        print(f"{name}: {len(plugins)} plugins at {commit}, serial {serial}, {'signed' if signature else 'not signed'}, in {out}")


if __name__ == "__main__":
    main()
