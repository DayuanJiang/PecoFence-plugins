# Reviews one plugin pull request with Claude (Claude in Amazon Bedrock) against AGENTS.md and posts
# the verdict as a pull request review: APPROVE or REQUEST_CHANGES.
# It runs from this repository's main branch (pull_request_target) and reads the pull request's
# files through the GitHub API as text; it never runs them.
# Environment: GH_TOKEN, REPO (owner/name), PR (number); AWS credentials for us-east-1.
import json
import os
import pathlib
import re
import sys
import urllib.error
import urllib.request

from anthropic import AnthropicBedrockMantle

REPO, PR, TOKEN = os.environ["REPO"], os.environ["PR"], os.environ["GH_TOKEN"]
ROOT = pathlib.Path(__file__).resolve().parent.parent
# The second model runs only when the first one declines the request.
MODELS = ["anthropic.claude-opus-5-5", "anthropic.claude-opus-4-8"]
TEXT_FILES = ("plugin.json", "main.ps1", "README.md")
MAX_TEXT = 400_000

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


def content(path, ref):
    try:
        return gh(f"/repos/{REPO}/contents/{path}?ref={ref}", raw=True)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def post_review(sha, event, body):
    gh(f"/repos/{REPO}/pulls/{PR}/reviews", "POST", {"commit_id": sha, "event": event, "body": body})
    print(f"posted {event}")


def main():
    pr = gh(f"/repos/{REPO}/pulls/{PR}")
    head, base = pr["head"]["sha"], pr["base"]["sha"]
    files, page = [], 1
    while True:
        batch = gh(f"/repos/{REPO}/pulls/{PR}/files?per_page=100&page={page}")
        files += batch
        if len(batch) < 100:
            break
        page += 1
    ids = {m.group(1) if (m := re.fullmatch(r"plugins/([^/]+)/[^/]+", f["filename"])) else None for f in files}
    if len(ids) != 1 or None in ids or any(f["status"] == "removed" for f in files):
        print("Not a change to one plugin folder: no automatic review.")
        return 0
    pid = ids.pop()

    parts = [f'<pull_request number="{PR}" author="{pr["user"]["login"]}">',
             f"<title>{pr['title']}</title>", f"<body>{pr.get('body') or ''}</body>"]
    size = 0
    for name in TEXT_FILES:
        for label, ref in (("new", head), ("old", base)):
            data = content(f"plugins/{pid}/{name}", ref)
            if data is None:
                continue
            size += len(data)
            parts.append(f'<file path="plugins/{pid}/{name}" version="{label}">\n'
                         f'{data.decode("utf-8-sig", errors="replace")}\n</file>')
    if content(f"plugins/{pid}/screenshot.png", head) is not None:
        parts.append(f'<file path="plugins/{pid}/screenshot.png" version="new">(a picture, not shown)</file>')
    parts.append("</pull_request>")
    if size > MAX_TEXT:
        post_review(head, "REQUEST_CHANGES", "**Automatic review**\n\nThe plugin's text files are too large to review "
                    f"({size} bytes; AGENTS.md section 1 allows `main.ps1` at most 200 KB).")
        return 0

    rules = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
    system = (ROOT / "tools" / "review-prompt.md").read_text(encoding="utf-8")
    user = f"<rules>\n{rules}\n</rules>\n\n" + "\n".join(parts) + "\n\nReview this pull request against the rules."

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
        post_review(head, "COMMENT", "**Automatic review**\n\nThe review could not finish "
                    f"(`{resp.stop_reason}`), so this pull request is not approved. Push again to retry.")
        return 0

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


if __name__ == "__main__":
    sys.exit(main())
