# Reviews one plugin pull request with Claude (Claude in Amazon Bedrock) against AGENTS.md and posts
# the verdict as a pull request review: APPROVE or REQUEST_CHANGES.
# It runs from this repository's main branch (pull_request_target) and reads the pull request's
# files through the GitHub API as text; it never runs them. It starts once the static check of the
# same commit passed; a review that cannot finish requests changes. When the static check has not
# finished after 20 minutes (a first-time contributor's checks wait for the owner's approval), it
# posts no verdict, only a comment, and review.yml runs it again once the checks completed
# (workflow_run, with HEAD_SHA in place of PR).
# Environment: GH_TOKEN (pull requests write, checks read), REPO (owner/name), PR (number) or
# HEAD_SHA (the commit whose checks completed); AWS credentials for us-east-1.
import difflib
import hashlib
import json
import os
import pathlib
import re
import secrets
import sys
import time
import traceback
import urllib.error
import urllib.request

from anthropic import AnthropicBedrockMantle

REPO, PR, TOKEN = os.environ["REPO"], os.environ.get("PR", ""), os.environ["GH_TOKEN"]
ROOT = pathlib.Path(__file__).resolve().parent.parent
# The second model runs only when the first one declines the request.
MODELS = ["anthropic.claude-opus-5-5", "anthropic.claude-opus-4-8"]
TEXT_EXT = (".json", ".js", ".html", ".css", ".svg", ".md")
# The most bytes of text one review reads: the new version, plus for an update its diff to the old
# one (about 300,000 tokens at most), which bounds what each push can cost. A library file of
# libraries.json is named, not read, and does not count.
MAX_TEXT = 1_000_000
# Where a library of libraries.json may come from (tools/check.py, LIBRARY_URL), and its most bytes.
LIBRARY_HOSTS = ("https://cdn.jsdelivr.net/npm/", "https://unpkg.com/", "https://github.com/")
LIBRARY_MAX = 5 << 20
# How long the review waits for the static check of the same commit.
STATIC_WAIT = 20 * 60
# The first line of the comment that says the review comes after the checks of a commit.
WAITING = "<!-- automatic review waits for the checks of {} -->"

SCHEMA = {
    "type": "object",
    "properties": {
        "verdict": {"type": "string", "enum": ["approve", "request_changes"]},
        "summary": {"type": "string"},
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "rule": {"type": "string"},
                    "file": {"type": "string"},
                    "line": {"type": "integer"},
                    "problem": {"type": "string"},
                    "fix": {"type": "string"},
                },
                "required": ["rule", "file", "line", "problem", "fix"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["verdict", "summary", "findings"],
    "additionalProperties": False,
}


def gh(path, method="GET", body=None, raw=False):
    req = urllib.request.Request("https://api.github.com" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Accept", "application/vnd.github.raw" if raw else "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    return data if raw else json.loads(data or b"null")


def pages(path):
    """Every item of a GitHub list, 100 a page."""
    items, page = [], 1
    while True:
        batch = gh(f"{path}{'&' if '?' in path else '?'}per_page=100&page={page}")
        items += batch
        if len(batch) < 100:
            return items
        page += 1


def content(path, ref):
    try:
        return gh(f"/repos/{REPO}/contents/{path}?ref={ref}", raw=True)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def plugin_files(pid, ref):
    """The paths of plugin `pid`'s files at commit `ref` (sub-folders too), sorted."""
    tree = gh(f"/repos/{REPO}/git/trees/{ref}?recursive=1")
    prefix = f"plugins/{pid}/"
    return sorted(t["path"] for t in tree["tree"] if t["type"] == "blob" and t["path"].startswith(prefix))


def one_plugin(files):
    """The id of the one plugin folder the pull request's files change, or None. A moved file
    counts at its old path too (previous_filename), and a plugin.json that goes away (removed or
    moved) is no change to review."""
    paths = [f["filename"] for f in files] + [f["previous_filename"] for f in files if f.get("previous_filename")]
    ids = {m.group(1) if (m := re.fullmatch(r"plugins/([^/]+)/.+", p)) else None for p in paths}
    gone = [f.get("previous_filename") or f["filename"] for f in files
            if f["status"] == "removed" or f.get("previous_filename")]
    if len(ids) != 1 or None in ids or any(re.fullmatch(r"plugins/[^/]+/plugin\.json", p) for p in gone):
        return None
    return ids.pop()


def listed_libraries(ref="main"):
    """libraries.json at `ref` as {sha256: entry}; {} when there is none."""
    data = content("libraries.json", ref)
    try:
        listed = json.loads(data.decode("utf-8-sig")).get("libraries", []) if data else []
    except (ValueError, AttributeError):
        return {}
    return {lib["sha256"]: lib for lib in listed if isinstance(lib, dict) and isinstance(lib.get("sha256"), str)}


def review_libraries(pr):
    """A pull request that changes only libraries.json: each new entry's file is fetched from its
    official address and its SHA-256 compared. The result is a comment for the owner, who merges it
    by hand (nothing is approved); a mismatch requests changes."""
    head, base = pr["head"]["sha"], pr["base"]["sha"]
    if not static_passed(head):
        print("The static check did not pass: no automatic review.")
        return 0
    old, new = listed_libraries(base), listed_libraries(head)
    problems = []
    for sha, lib in new.items():
        if sha in old and old[sha] == lib:
            continue
        url = str(lib.get("url", ""))
        if not url.startswith(LIBRARY_HOSTS) or ("github.com/" in url and "/releases/download/" not in url):
            problems.append(f"{lib.get('name')}: {url} is not a file of jsDelivr's npm, unpkg or a GitHub release")
            continue
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "pecofence-plugins-review"}),
                                        timeout=60) as r:
                data = r.read(LIBRARY_MAX + 1)
        except (urllib.error.URLError, OSError) as e:
            problems.append(f"{lib.get('name')}: {url} could not be fetched ({type(e).__name__})")
            continue
        got = hashlib.sha256(data).hexdigest()
        if len(data) > LIBRARY_MAX or got != sha:
            problems.append(f"{lib.get('name')}: the file at {url} has the SHA-256 {got}, not {sha}")
    added = [f"{lib['name']} {lib['version']}" for sha, lib in new.items() if sha not in old]
    if problems:
        post_review(head, "REQUEST_CHANGES", "**Automatic review of libraries.json**\n\n" + "\n".join(f"- {x}" for x in problems))
    else:
        post_review(head, "COMMENT", "**Automatic check of libraries.json**\n\nEach new file matches its official "
                    f"address: {', '.join(added) or 'nothing new'}. The owner merges a change to libraries.json.")
    return 0


def post_review(sha, event, body):
    gh(f"/repos/{REPO}/pulls/{PR}/reviews", "POST", {"commit_id": sha, "event": event, "body": body})
    print(f"posted {event}")


def static_passed(head):
    """Waits for the static check (checks.yml, job "static") of commit `head`: True when its newest
    run passed. The review runs only then, so a push that fails the cheap checks costs no tokens."""
    deadline = time.monotonic() + STATIC_WAIT
    while True:
        runs = gh(f"/repos/{REPO}/commits/{head}/check-runs?check_name=static&per_page=100")["check_runs"]
        runs = [r for r in runs if (r.get("app") or {}).get("slug") == "github-actions"]
        newest = max(runs, key=lambda r: r["id"], default=None)
        if newest and newest["status"] == "completed":
            print(f"static check of {head}: {newest['conclusion']}")
            return newest["conclusion"] == "success"
        if time.monotonic() > deadline:
            raise TimeoutError(f"the static check of {head} did not finish within {STATIC_WAIT // 60} minutes")
        time.sleep(15)


def review(pr):
    head, base = pr["head"]["sha"], pr["base"]["sha"]
    files = pages(f"/repos/{REPO}/pulls/{PR}/files")
    if [f["filename"] for f in files] == ["libraries.json"] and not files[0].get("previous_filename"):
        return review_libraries(pr)
    pid = one_plugin(files)
    if not pid:
        print("Not a change to one plugin folder: no automatic review.")
        return 0
    try:
        passed = static_passed(head)
    except TimeoutError as e:
        # No verdict on a commit whose checks did not run yet: the review comes after them.
        print(f"{e}: the review comes after the checks")
        gh(f"/repos/{REPO}/issues/{PR}/comments", "POST", {"body": WAITING.format(head) + "\n**Automatic review**\n\n"
           "The checks of this commit have not run yet, so the review comes after them."})
        return 0
    if not passed:
        print("The static check did not pass: no automatic review (the check says what to fix).")
        return 0

    # The material comes between two lines with a token drawn for this run, which the pull
    # request's author cannot know, so no text in it can end it early. Nothing in it is escaped.
    token = secrets.token_hex(16)
    begin, end = f"BEGIN-{token}", f"END-{token}"
    parts = [f"{begin} pull request #{PR} by {pr['user']['login']}: its title, then its body\n"
             f"{pr['title']}\n\n{pr.get('body') or ''}\n{end}"]
    size, known = 0, listed_libraries()
    new, old = plugin_files(pid, head), set(plugin_files(pid, base))
    for path in new + sorted(old - set(new)):
        if not path.lower().endswith(TEXT_EXT):
            parts.append(f"{begin} file {path}, {'new' if path in new else 'old'} version\n"
                         f"(a picture or font, not shown)\n{end}")
            continue
        if path not in new:
            parts.append(f"{begin} file {path}: removed in this pull request\n{end}")
            continue
        data = content(path, head)
        lib = known.get(hashlib.sha256(data).hexdigest())
        if lib:
            parts.append(f"{begin} file {path}, new version\n(the library {lib['name']} {lib['version']} as published "
                         f"at {lib['url']}: its SHA-256 is listed in libraries.json, not shown)\n{end}")
            continue
        text = data.decode("utf-8-sig", errors="replace")
        size += len(data)
        parts.append(f"{begin} file {path}, new version\n{text}\n{end}")
        before = content(path, base) if path in old else None
        if before is not None and before != data:
            diff = "".join(difflib.unified_diff(before.decode("utf-8-sig", errors="replace").splitlines(True),
                                                text.splitlines(True), f"old/{path}", f"new/{path}"))
            size += len(diff.encode())
            parts.append(f"{begin} file {path}, what changed since the old version (unified diff)\n{diff}\n{end}")
    if size > MAX_TEXT:
        post_review(head, "REQUEST_CHANGES", "**Automatic review**\n\nThe plugin's text files are too large to review "
                    f"({size} bytes of text, the new version and its changes; at most {MAX_TEXT}).")
        return 0

    rules = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    system = (ROOT / "tools" / "review-prompt.md").read_text(encoding="utf-8").replace("__TOKEN__", token)
    user = (f"<rules>\n{rules}\n</rules>\n\nThe pull request's material, each piece between a line that starts "
            f"with {begin} and the line {end}:\n\n" + "\n\n".join(parts) +
            "\n\nReview this pull request against the rules.")

    client = AnthropicBedrockMantle(aws_region="us-east-1")
    resp = None
    for model in MODELS:
        args = dict(model=model, max_tokens=16000, system=system,
                    messages=[{"role": "user", "content": user}],
                    output_config={"effort": "medium", "format": {"type": "json_schema", "schema": SCHEMA}})
        if model.endswith("opus-4-8"):
            args["thinking"] = {"type": "adaptive"}
        resp = client.messages.create(**args)
        print(f"{model}: stop_reason={resp.stop_reason} input={resp.usage.input_tokens} output={resp.usage.output_tokens}")
        if resp.stop_reason != "refusal":
            break
    if resp.stop_reason not in ("end_turn", "stop_sequence"):
        raise RuntimeError(f"the model's answer ended with {resp.stop_reason}")

    verdict = json.loads(next(b.text for b in resp.content if b.type == "text"))
    lines = ["**Automatic review** (Claude, following AGENTS.md)", "", verdict["summary"]]
    if verdict["findings"]:
        lines += ["", "Findings:"]
        for f in verdict["findings"]:
            where = f"`{f['file']}:{f['line']}`" if f["line"] else f"`{f['file']}`"
            lines.append(f"- **{f['rule']}** {where}: {f['problem']} Fix: {f['fix']}")
    lines += ["", "_This review is automatic and runs again on every push._"]
    event = "APPROVE" if verdict["verdict"] == "approve" else "REQUEST_CHANGES"
    post_review(head, event, "\n".join(lines))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            fh.write(f"### Automatic review: {event}\n\nmodel {resp.model}, input {resp.usage.input_tokens} tokens, "
                     f"output {resp.usage.output_tokens} tokens\n\n" + "\n".join(lines) + "\n")
    return 0


def main():
    global PR
    if PR:
        pr = gh(f"/repos/{REPO}/pulls/{PR}")
    else:
        # The checks of commit HEAD_SHA completed: its open pull request is reviewed when the
        # review gave up waiting for them (this workflow's own comment says so).
        head = os.environ["HEAD_SHA"]
        pr = next((p for p in pages(f"/repos/{REPO}/pulls?state=open") if p["head"]["sha"] == head), None)
        waited = pr and any(c["user"]["login"] == "github-actions[bot]" and c["body"].startswith(WAITING.format(head))
                            for c in pages(f"/repos/{REPO}/issues/{pr['number']}/comments"))
        if not waited or pr["draft"]:
            print(f"No pull request of {head} waits for its review.")
            return 0
        PR = str(pr["number"])
    try:
        return review(pr)
    except Exception as e:
        # Whatever stopped the review (a refusal, a cut answer, Bedrock, GitHub, an answer that
        # does not read), this commit is not approved: changes are requested, never only a comment.
        # The public text names only the error's type (an AWS error can name the role and the
        # account); the details are in this workflow's log.
        traceback.print_exc()
        post_review(pr["head"]["sha"], "REQUEST_CHANGES", "**Automatic review**\n\nThe review could not finish "
                    f"(`{type(e).__name__}`), so this pull request is not approved. Push again to retry.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
