// The greeting, in the fence's theme.
const greeting = document.getElementById("greeting");
greeting.textContent = pf.lang.startsWith("zh") ? "你好" : "Hello";

function paint(theme) {
  document.body.className = theme;
}

paint(pf.theme);
pf.on("theme", paint);
