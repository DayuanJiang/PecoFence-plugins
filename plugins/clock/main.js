// Clock: the time and the date as PecoFence's own clock shows them, in the user's Windows
// region format, with seconds if the fence's setting says so. PecoFence scales the `fit` row
// with the fence and takes the short forms when it is narrow.
let timer = 0;

function draw() {
  const now = pf.time.now();
  const f = (kind) => pf.time.format(now, kind);
  pf.show({ rows: [
    { text: f(pf.settings.seconds ? "seconds" : "time"), short: f("time"), size: "fit" },
    { text: f("date"), short: f("short") },
  ] });
}

// Every second or every minute, just after the clock's turn, so the shown time is never late.
function start() {
  pf.cancel(timer);
  const seconds = pf.settings.seconds;
  timer = pf.every(seconds ? 1 : 60, draw, { align: seconds ? "second" : "minute" });
  draw();
}

pf.on("start", start);
pf.on("settings", start);
pf.on("show", draw);
pf.on("timechange", draw);
