# Bad: inline script

A test plugin for `tools/check.py` and `tools/web-check.py`, which both fail it. Never merged.
`App.js` has capitals in its name (the static check fails it), and `index.html` has a script
written into it, which PecoFence's Content Security Policy blocks (the web check fails it).
