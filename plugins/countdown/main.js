// Countdown: days left until the dates in this fence's setting "dates", nearest first. Dates that
// have passed show how long ago they were. Entries are separated by ";" or new lines:
// "2026-12-25 Christmas" for one day, "12-25 Christmas" for the same day every year.

const TEXTS = {
  en: { left: "in {0} days", tomorrow: "tomorrow", today: "today", ago: "{0} days ago",
        none: "No dates yet: add them in the fence menu, Plugin settings", bad: "Not understood: {0}" },
  "zh-CN": { left: "还有 {0} 天", tomorrow: "明天", today: "就是今天", ago: "已过 {0} 天",
             none: "还没有日期，请在栅栏菜单的「插件设置」里添加", bad: "这一项看不懂：{0}" },
  "zh-TW": { left: "還有 {0} 天", tomorrow: "明天", today: "就是今天", ago: "已過 {0} 天",
             none: "還沒有日期，請在柵欄選單的「外掛設定」裡新增", bad: "這一項看不懂：{0}" },
  ja: { left: "あと {0} 日", tomorrow: "明日", today: "今日", ago: "{0} 日前",
        none: "日付がありません。フェンスのメニューの「プラグインの設定」で追加してください", bad: "読めない項目：{0}" },
};
const t = TEXTS[pf.lang] || (pf.lang.startsWith("zh") ? TEXTS["zh-CN"] : TEXTS.en);
const DAY = 24 * 60 * 60 * 1000;
let shown = "";

const fill = (text, n) => text.replace("{0}", String(n));

// Days from today to year-month-day, counted on the calendar (no clock time involved).
function daysUntil(today, y, m, d) {
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / DAY);
}

// One entry of the setting: { name, days } or { bad } when it cannot be read.
function parse(entry, today) {
  const full = /^(\d{4})-(\d{2})-(\d{2})\s+(.+)$/.exec(entry);
  const yearly = /^(\d{2})-(\d{2})\s+(.+)$/.exec(entry);
  if (full) {
    const [, y, m, d, name] = full;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) return { name, days: daysUntil(today, +y, +m, +d) };
  } else if (yearly) {
    const [, m, d, name] = yearly;
    if (+m >= 1 && +m <= 12 && +d >= 1 && +d <= 31) {
      let days = daysUntil(today, today.getFullYear(), +m, +d);
      if (days < 0) days = daysUntil(today, today.getFullYear() + 1, +m, +d);
      return { name, days };
    }
  }
  return { bad: entry };
}

function rows() {
  const today = new Date(pf.time.now());
  const entries = String(pf.settings.dates || "").split(/[;\n]/).map((s) => s.trim()).filter(Boolean);
  const items = entries.map((e) => parse(e, today));
  const upcoming = items.filter((i) => i.days >= 0).sort((a, b) => a.days - b.days);
  const past = pf.settings.past ? items.filter((i) => i.days < 0).sort((a, b) => b.days - a.days) : [];
  const out = upcoming.map((i) => ({
    text: `${i.name}  ${i.days === 0 ? t.today : i.days === 1 ? t.tomorrow : fill(t.left, i.days)}`,
    color: i.days <= 1 ? "green" : undefined,
    bold: i.days === 0,
  }));
  for (const i of past) out.push({ text: `${i.name}  ${fill(t.ago, -i.days)}`, color: "gray" });
  for (const i of items.filter((i) => i.bad)) out.push({ text: fill(t.bad, i.bad), color: "orange" });
  return out.length ? out : [{ text: t.none, color: "gray" }];
}

// Shows the rows only when they changed: once a day, or when the settings change.
function draw() {
  const view = { rows: rows() };
  const json = JSON.stringify(view);
  if (json !== shown) {
    shown = json;
    pf.show(view);
  }
}

pf.on("start", draw);
pf.on("show", draw);
pf.on("settings", draw);
pf.on("timechange", draw);
pf.every(60, draw, { align: "minute" });
