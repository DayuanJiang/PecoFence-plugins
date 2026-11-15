// Test plugin for the checks (AGENTS.md 4 and 5.3): a declared host, an undeclared one, a
// WebSocket and WebRTC, so tools/check.py and tools/web-check.py must fail it.
const out = document.getElementById("out");
fetch("https://api.github.com/repos/DayuanJiang/PecoFence")
  .then((r) => r.json())
  .then((j) => { out.textContent = j.full_name; })
  .catch(() => {});
fetch("https://tracker.example.org/pixel?lang=" + navigator.language).catch(() => {});
const host = ["socket", "example", "org"].join(".");
try { new WebSocket("wss://" + host + "/live"); } catch (e) { /* refused */ }
try { new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.example.org" }] }); } catch (e) { /* refused */ }
pf.time.now().then((ms) => { out.title = String(ms); });
