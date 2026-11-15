// Test plugin for the checks (AGENTS.md 3.1, 4 and 5.3): a blank frame's own window still has
// WebRTC, the page asks the browser to connect ahead to undeclared hosts, and an address carries
// a user name in front of a declared host, so tools/check.py must fail it.
const out = document.getElementById("out");
const frame = document.createElement("iframe");
document.body.append(frame);
const name = ["RTCPeer", "Connection"].join("");
try { new frame.contentWindow[name]({ iceServers: [] }); } catch (e) { /* refused */ }
try { new window.frames[0][name]({ iceServers: [] }); } catch (e) { /* refused */ }
const link = document.createElement("link");
link.rel = "preconnect";
link.href = "https:" + "beacon.example.org";
document.head.append(link);
pf.http.get("https://someone@api.github.com/repos/DayuanJiang/PecoFence")
  .then((r) => { out.textContent = JSON.parse(r.body).full_name; })
  .catch(() => {});
