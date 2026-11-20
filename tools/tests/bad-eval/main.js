// Test plugin for the checks (AGENTS.md 5.1): it runs code made from text, so both the static
// check and the run check must fail it.
const code = "pf.show({ rows: [{ text: 'made from text' }] })";
pf.on("start", () => eval(code));
