#!/usr/bin/env python3
"""Builds the feed PecoFence reads: index.json, its signature, and the plugins' files.

index.json lists every plugin with its manifest and, for each file, its size and SHA-256. Files
are fetched from the commit the index names, so only the reviewed version installs. A plugin named
in disabled.json is listed with "disabled" and its reason; PecoFence turns it off. "serial" is the
number of commits on main up to that commit: it only grows, and PecoFence refuses an index with a
lower serial than one it saw (an old signed index served again would bring back a removed take-down).

The output folder holds index.json, index.json.sig (Ed25519 over the exact bytes of index.json,
128 hex digits, when INDEX_SIGNING_KEY holds the private key's 64 hex digits) and
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
FIELDS = ["id", "version", "api", "layer", "name", "description", "author", "minPecoFence",
          "permissions", "settings"]


def entry(folder, disabled):
    m = json.loads((folder / "plugin.json").read_bytes().decode("utf-8-sig"))
    files = []
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        data, name = path.read_bytes(), path.relative_to(folder).as_posix()
        # The same names tools/check.py allows: no "..", no leading "/", no backslash or drive, no
        # trailing dot and no Windows device name (PecoFence drops an entry with such a file).
        if not all(re.fullmatch(r"(?i)(?!(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$))[a-z0-9_-][a-z0-9._-]{0,63}(?<!\.)", part)
                   for part in name.split("/")):
            sys.exit(f"{folder.name}: the file name {name!r} is not allowed")
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
    plugins = [entry(f, disabled) for f in folders]
    data = (json.dumps({"format": 1, "serial": serial, "commit": commit, "plugins": plugins}, ensure_ascii=False, indent=1) + "\n").encode()

    out = pathlib.Path(args.out)
    if out.exists() and any(out.iterdir()):
        if not (out / "index.json").exists():
            sys.exit(f"{out} is not empty and holds no index.json: give a new folder")
        shutil.rmtree(out)
    for folder, e in zip(folders, plugins):
        shutil.copytree(folder, out / commit / "plugins" / e["id"])
    (out / "index.json").write_bytes(data)
    signature = sign(data)
    if signature:
        (out / "index.json.sig").write_text(signature, encoding="ascii")
    elif args.require_signature:
        sys.exit("INDEX_SIGNING_KEY is not set: no signature (make one with tools/make-key.py)")
    print(f"index.json: {len(plugins)} plugins at {commit}, serial {serial}, {'signed' if signature else 'not signed'}, in {out}")


if __name__ == "__main__":
    main()
