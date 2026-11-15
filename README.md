# PecoFence plugins

Community plugins for [PecoFence](https://github.com/DayuanJiang/PecoFence): small tools that live
in a fence on the Windows desktop. Users install them from PecoFence's settings.

**Writing a plugin?** Point your coding agent at [AGENTS.md](AGENTS.md). It explains how a plugin
works, the review rules, and the self-checks to run before you open a pull request. Pull
requests are checked and merged automatically when they pass.

**Found a plugin that misbehaves?** Use the *Report a plugin* issue form.

Plugins are JavaScript that PecoFence runs in a fence: a small engine inside PecoFence, or a web
page. A plugin can do only what its manifest lists, and PecoFence shows that list before you
install it. Every version is checked and reviewed automatically before it reaches the list.

## For the maintainer

What the automation needs from the repository's owner, outside the files here:

- `.github/workflows/checks.yml`, `PECOFENCE_COMMIT`: a commit pushed to `DayuanJiang/PecoFence`
  that has the plugin host PecoFence ships and `crates/plugin-check`. Set it after pushing
  PecoFence, and raise it whenever the plugin host changes; a commit that is not pushed makes
  every run check fail.
- The Actions secret `INDEX_SIGNING_KEY` (from `tools/make-key.py`), whose public key is in
  PecoFence's `crates/core/src/plugins.rs`.
- The AWS role `pecofence-plugins-review`, which only `review.yml` on `main` can assume.
- Settings › Actions › General, approval for fork pull request workflows: *Require approval for
  first-time contributors who are new to GitHub*, the least strict choice. The checks run with a
  read-only token and no secrets, so they need no approval to be safe; the review comes only
  after them, so a stricter choice would hold every new author's pull request until you approve
  its checks. A pull request from an account new to GitHub still waits for you: its review says
  it comes after the checks, and runs once you approved them and they completed.
