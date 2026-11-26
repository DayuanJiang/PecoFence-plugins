// Calendar: an offline monthly Gregorian calendar for a PecoFence desktop fence.
// Native cells provide month navigation (< / Today / >) and the fence menu mirrors those actions;
// the weekday header and 6x7 date grid render on per-row canvases so column alignment holds across
// narrow (300 DIP) and wide fences at any PecoFence text size. Uses `pf.time.now()` and `Date`
// solely to determine today's local date and schedule a single `pf.after` refresh for local
// midnight (capped at 15 minutes to recover cleanly after system sleep). No permissions, no
// network, no stored data files.
"use strict";

// Weekday arrays are indexed 0=Sunday .. 6=Saturday; month arrays are indexed 0=Jan .. 11=Dec.
const T = {
  en: {
    prev: "Previous month",
    today: "Today",
    todayShort: "Today",
    next: "Next month",
    week: "W",
    days: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    months: ["January", "February", "March", "April", "May", "June",
             "July", "August", "September", "October", "November", "December"],
    ym: "{m} {y}",
  },
  "zh-CN": {
    prev: "上个月",
    today: "今天",
    todayShort: "今天",
    next: "下个月",
    week: "周",
    days: ["日", "一", "二", "三", "四", "五", "六"],
    months: ["1月", "2月", "3月", "4月", "5月", "6月",
             "7月", "8月", "9月", "10月", "11月", "12月"],
    ym: "{y}年{m}",
  },
  "zh-TW": {
    prev: "上個月",
    today: "今天",
    todayShort: "今天",
    next: "下個月",
    week: "週",
    days: ["日", "一", "二", "三", "四", "五", "六"],
    months: ["1月", "2月", "3月", "4月", "5月", "6月",
             "7月", "8月", "9月", "10月", "11月", "12月"],
    ym: "{y}年{m}",
  },
  ja: {
    prev: "前の月",
    today: "今日",
    todayShort: "今日",
    next: "次の月",
    week: "週",
    days: ["日", "月", "火", "水", "木", "金", "土"],
    months: ["1月", "2月", "3月", "4月", "5月", "6月",
             "7月", "8月", "9月", "10月", "11月", "12月"],
    ym: "{y}年{m}",
  },
  ko: {
    prev: "이전 달",
    today: "오늘",
    todayShort: "오늘",
    next: "다음 달",
    week: "주",
    days: ["일", "월", "화", "수", "목", "금", "토"],
    months: ["1월", "2월", "3월", "4월", "5월", "6월",
             "7월", "8월", "9월", "10월", "11월", "12월"],
    ym: "{y}년 {m}",
  },
  de: {
    prev: "Vorheriger Monat",
    today: "Heute",
    todayShort: "Heute",
    next: "Nächster Monat",
    week: "KW",
    days: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    months: ["Januar", "Februar", "März", "April", "Mai", "Juni",
             "Juli", "August", "September", "Oktober", "November", "Dezember"],
    ym: "{m} {y}",
  },
  fr: {
    prev: "Mois précédent",
    today: "Aujourd'hui",
    todayShort: "Auj.",
    next: "Mois suivant",
    week: "S",
    days: ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"],
    months: ["janvier", "février", "mars", "avril", "mai", "juin",
             "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
    ym: "{m} {y}",
  },
  es: {
    prev: "Mes anterior",
    today: "Hoy",
    todayShort: "Hoy",
    next: "Mes siguiente",
    week: "S",
    days: ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"],
    months: ["enero", "febrero", "marzo", "abril", "mayo", "junio",
             "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
    ym: "{m} {y}",
  },
  "pt-BR": {
    prev: "Mês anterior",
    today: "Hoje",
    todayShort: "Hoje",
    next: "Próximo mês",
    week: "S",
    days: ["Do", "Se", "Te", "Qu", "Qi", "Sx", "Sá"],
    months: ["janeiro", "fevereiro", "março", "abril", "maio", "junho",
             "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"],
    ym: "{m} {y}",
  },
  ru: {
    prev: "Предыдущий месяц",
    today: "Сегодня",
    todayShort: "Сег.",
    next: "Следующий месяц",
    week: "Н",
    days: ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
    months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
             "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    ym: "{m} {y}",
  },
  it: {
    prev: "Mese precedente",
    today: "Oggi",
    todayShort: "Oggi",
    next: "Mese successivo",
    week: "S",
    days: ["Do", "Lu", "Ma", "Me", "Gi", "Ve", "Sa"],
    months: ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
             "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"],
    ym: "{m} {y}",
  },
};

const MIN_YEAR = 1;
const MAX_YEAR = 9999;
const MAX_TIMER_SEC = 900; // 15 min cap so wake-from-sleep catches up without a fast interval.

const texts = () => T[pf.lang] || T[String(pf.lang || "en").split("-")[0]] || T.en;
let t = texts();

const pad2 = (n) => String(n).padStart(2, "0");
const pad4 = (n) => String(n).padStart(4, "0");

// Pure integer Gregorian civil calendar conversions (Howard Hinnant's algorithms).
// Day 0 is 1970-01-01 (Thursday).
function daysFromCivil(y, m, d) {
  const yr = y - (m <= 2 ? 1 : 0);
  const era = Math.floor(yr / 400);
  const yoe = yr - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(z) {
  const s = z + 719468;
  const era = Math.floor(s / 146097);
  const doe = s - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}

// 0=Sunday .. 6=Saturday.
function weekdayFromDays(z) {
  return (((z + 4) % 7) + 7) % 7;
}

// ISO-8601 week number (1..53) determined by the Thursday of the Monday-to-Sunday week.
function isoWeekFromDays(z) {
  const isoDow = (((z + 3) % 7) + 7) % 7; // 0=Mon .. 6=Sun
  const thuZ = z + (3 - isoDow);
  const thuYear = civilFromDays(thuZ).y;
  const jan4Z = daysFromCivil(thuYear, 1, 4);
  const jan4Dow = (((jan4Z + 3) % 7) + 7) % 7;
  const week1MonZ = jan4Z - jan4Dow;
  return Math.floor((thuZ - week1MonZ) / 7) + 1;
}

function localToday(nowMs) {
  const dt = new Date(nowMs);
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
}

function nextLocalMidnightMs(today) {
  const nxt = civilFromDays(daysFromCivil(today.y, today.m, today.d) + 1);
  const dt = new Date(0);
  dt.setFullYear(nxt.y, nxt.m - 1, nxt.d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

// Find the next local date boundary using PecoFence's Windows timezone formatter so DST transitions
// across midnight (e.g. clocks springing from 23:00 to 00:00) wake at the exact second.
function nextHostMidnightMs(nowMs, today) {
  if (pf.time && typeof pf.time.format === "function") {
    const todayLabel = pf.time.format(nowMs, "date");
    if (todayLabel) {
      let hi = nowMs + 25 * 3600 * 1000;
      if (pf.time.format(hi, "date") === todayLabel) {
        hi = nowMs + 26 * 3600 * 1000;
      }
      if (pf.time.format(hi, "date") !== todayLabel) {
        let lo = nowMs;
        while (hi - lo > 1000) {
          const mid = Math.floor((lo + hi) / 2);
          if (pf.time.format(mid, "date") === todayLabel) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        return hi;
      }
    }
  }
  return nextLocalMidnightMs(today);
}

function isoDate(c) {
  return pad4(c.y) + "-" + pad2(c.m) + "-" + pad2(c.d);
}

function compactYm(y, m) {
  return pad4(y) + "-" + pad2(m);
}

function fullYm(y, m) {
  return t.ym.replace("{y}", String(y)).replace("{m}", t.months[m - 1]);
}

function readSettings() {
  const s = pf.settings || {};
  return {
    weekStart: s.weekStart === "sunday" ? "sunday" : "monday",
    showWeekNumbers: s.showWeekNumbers === true,
    showCaption: s.showCaption !== false,
    largeGridText: s.largeGridText === true,
  };
}

function stepMonth(ym, delta) {
  const idx = (ym.y - 1) * 12 + (ym.m - 1) + delta;
  const minIdx = (MIN_YEAR - 1) * 12;
  const maxIdx = (MAX_YEAR - 1) * 12 + 11;
  if (idx < minIdx || idx > maxIdx) return null;
  return { y: Math.floor(idx / 12) + 1, m: (idx % 12) + 1 };
}

let browseMonth = null; // null = follow current local month
let shown = false;
let lastWidth = 300;
let midnightTimer = 0;
let midnightTargetMs = 0;
let lastViewKey = "";

function updateWidth(w) {
  if (typeof w === "number" && Number.isFinite(w) && w > 0) {
    lastWidth = Math.floor(w);
  }
}

function cancelMidnight() {
  if (midnightTimer) {
    pf.cancel(midnightTimer);
    midnightTimer = 0;
    midnightTargetMs = 0;
  }
}

function scheduleMidnight(nowMs, today, forceReschedule) {
  if (!shown) {
    cancelMidnight();
    return;
  }
  const target = nextHostMidnightMs(nowMs, today);
  const rawSec = Number.isFinite(target) ? Math.ceil((target - nowMs) / 1000) : MAX_TIMER_SEC;
  const delaySec = Math.max(1, Math.min(MAX_TIMER_SEC, rawSec));
  const wakeTarget = nowMs + delaySec * 1000;
  // Reuse the armed timer when it still wakes on or before local midnight within the cap.
  if (
    !forceReschedule &&
    midnightTimer &&
    midnightTargetMs > nowMs &&
    midnightTargetMs <= (Number.isFinite(target) ? target + 2000 : wakeTarget + 2000) &&
    midnightTargetMs <= nowMs + MAX_TIMER_SEC * 1000 + 2000
  ) {
    return;
  }
  cancelMidnight();
  midnightTargetMs = wakeTarget;
  midnightTimer = pf.after(delaySec, () => {
    midnightTimer = 0;
    midnightTargetMs = 0;
    sync(false, true);
  });
}

function estimateTextWidth(str, size) {
  let units = 0;
  for (const ch of str) {
    units += ch.codePointAt(0) > 0x2ff ? 1.0 : 0.58;
  }
  return units * size;
}

function buildView(today, cfg) {
  const viewYm = browseMonth || { y: today.y, m: today.m };
  const isCurrent = viewYm.y === today.y && viewYm.m === today.m;
  const todayStr = isoDate(today);
  const fullTitle = fullYm(viewYm.y, viewYm.m);
  const shortTitle = compactYm(viewYm.y, viewYm.m);
  const W = Math.max(1, lastWidth);

  const canPrev = stepMonth(viewYm, -1) !== null;
  const canNext = stepMonth(viewYm, 1) !== null;
  const menu = [
    { id: "prev", title: t.prev, disabled: !canPrev },
    { id: "today", title: t.today, checked: isCurrent },
    { id: "next", title: t.next, disabled: !canNext },
  ];
  const caption = cfg.showCaption ? todayStr : "";

  // Ultra-narrow fallback (< 196 DIP) keeps date readable; navigation stays in the fence menu.
  if (W < 196) {
    return {
      rows: [
        { text: shortTitle, bold: true, tip: fullTitle },
        { text: todayStr, color: "gray", size: "small" },
      ],
      caption,
      menu,
    };
  }

  const rows = [
    {
      cells: [
        {
          text: W < 300 ? shortTitle : fullTitle,
          fill: true,
          bold: true,
          align: "center",
          tip: fullTitle,
        },
      ],
    },
    {
      cells: [
        { id: "prev", text: "<", width: W < 240 ? 14 : 18, align: "center", tip: t.prev },
        {
          id: "today",
          text: W < 260 ? t.todayShort : t.today,
          fill: true,
          align: "center",
          checked: isCurrent,
          tip: t.today + " (" + todayStr + ")",
        },
        { id: "next", text: ">", width: W < 240 ? 14 : 18, align: "center", tip: t.next },
      ],
    },
  ];

  // Grid geometry in DIPs: cap at 420 DIP centered, keeping 16 DIP left and 24 DIP right margin.
  const B = Math.min(W, 420);
  const x0 = Math.floor((W - B) / 2) + 16;
  const A = B - 40;
  const showWk = cfg.showWeekNumbers && W >= 260;
  const wkW = showWk ? 26 : 0;
  const gridX = x0 + wkW;
  const colW = (A - wkW) / 7;

  const headerH = cfg.largeGridText ? 22 : 18;
  const rowH = cfg.largeGridText ? 28 : 24;
  const headerSize = Math.max(8, Math.min(cfg.largeGridText ? 14 : 12, Math.floor((colW - 6) / 2)));
  const daySize = Math.max(10, Math.min(cfg.largeGridText ? 20 : 16, Math.floor((colW - 8) / 1.25)));
  const adjacentSize = Math.max(9, daySize - 2);
  const wkSize = Math.max(9, Math.min(headerSize, daySize - 2));

  const firstWeekday = cfg.weekStart === "sunday" ? 0 : 1;
  const headerY = Math.max(0, Math.floor((headerH - headerSize * 1.3) / 2));

  // Row 2: weekday header canvas (starts the scrollable pane so header+nav stay pinned).
  const headerDraw = [];
  if (showWk) {
    const wLbl = t.week;
    const wx = Math.floor(x0 + Math.max(1, (wkW - 4 - estimateTextWidth(wLbl, wkSize)) / 2));
    headerDraw.push({ text: wLbl, at: [wx, headerY], size: wkSize, color: "gray" });
  }
  for (let col = 0; col < 7; col += 1) {
    const label = t.days[(firstWeekday + col) % 7];
    const cx = Math.floor(gridX + col * colW);
    const cw = Math.floor(gridX + (col + 1) * colW) - cx;
    const tx = Math.floor(cx + Math.max(2, (cw - estimateTextWidth(label, headerSize)) / 2));
    headerDraw.push({ text: label, at: [tx, headerY], size: headerSize, bold: true, color: "gray" });
  }
  headerDraw.push({ line: [x0, headerH - 1, x0 + A, headerH - 1], color: "gray", width: 1 });
  rows.push({ pane: "calendar-grid", canvas: { height: headerH, draw: headerDraw } });

  // Rows 3..8: six fixed date rows (42 days) starting from the leading week boundary.
  const firstOfMonthZ = daysFromCivil(viewYm.y, viewYm.m, 1);
  const offset = (weekdayFromDays(firstOfMonthZ) - firstWeekday + 7) % 7;
  const startZ = firstOfMonthZ - offset;
  const todayZ = daysFromCivil(today.y, today.m, today.d);

  const dayY = Math.max(1, Math.floor((rowH - daySize * 1.3) / 2));
  const adjY = Math.max(1, Math.floor((rowH - adjacentSize * 1.3) / 2));
  const wkY = Math.max(1, Math.floor((rowH - wkSize * 1.3) / 2));

  for (let r = 0; r < 6; r += 1) {
    const rowStartZ = startZ + r * 7;
    const drawSteps = [];

    if (showWk) {
      // For Sunday-first rows, use the row's Monday (rowStartZ + 1) for ISO week alignment.
      const isoRefZ = cfg.weekStart === "sunday" ? rowStartZ + 1 : rowStartZ;
      const wkText = pad2(isoWeekFromDays(isoRefZ));
      const wx = Math.floor(x0 + Math.max(1, (wkW - 4 - estimateTextWidth(wkText, wkSize)) / 2));
      drawSteps.push({ text: wkText, at: [wx, wkY], size: wkSize, color: "gray" });
    }

    for (let col = 0; col < 7; col += 1) {
      const z = rowStartZ + col;
      const cell = civilFromDays(z);
      const inMonth = cell.y === viewYm.y && cell.m === viewYm.m;
      const isToday = z === todayZ;
      const text = String(cell.d);

      const cx = Math.floor(gridX + col * colW);
      const cw = Math.floor(gridX + (col + 1) * colW) - cx;

      if (isToday) {
        drawSteps.push({
          rect: [cx + 1, 1, Math.max(8, cw - 2), rowH - 2],
          radius: 4,
          color: "blue",
          width: 1.5,
        });
        const tx = Math.floor(cx + Math.max(2, (cw - estimateTextWidth(text, daySize)) / 2));
        drawSteps.push({ text, at: [tx, dayY], size: daySize, bold: true });
      } else if (inMonth) {
        const tx = Math.floor(cx + Math.max(2, (cw - estimateTextWidth(text, daySize)) / 2));
        drawSteps.push({ text, at: [tx, dayY], size: daySize });
      } else {
        const tx = Math.floor(cx + Math.max(2, (cw - estimateTextWidth(text, adjacentSize)) / 2));
        drawSteps.push({ text, at: [tx, adjY], size: adjacentSize, color: "gray" });
      }
    }

    rows.push({ canvas: { height: rowH, draw: drawSteps } });
  }

  return { rows, caption, menu };
}

function sync(force, forceReschedule) {
  const nowMs = pf.time.now();
  const today = localToday(nowMs);
  const cfg = readSettings();
  const viewYm = browseMonth || { y: today.y, m: today.m };

  // Keep view key compact and deterministic so unchanged refreshes skip rebuilding and `pf.show`.
  const key = [
    today.y, today.m, today.d,
    viewYm.y, viewYm.m,
    browseMonth === null ? 1 : 0,
    cfg.weekStart,
    cfg.showWeekNumbers ? 1 : 0,
    cfg.showCaption ? 1 : 0,
    cfg.largeGridText ? 1 : 0,
    pf.lang,
    pf.theme,
    lastWidth,
  ].join("|");

  if (force || key !== lastViewKey) {
    lastViewKey = key;
    pf.show(buildView(today, cfg));
  }
  scheduleMidnight(nowMs, today, forceReschedule === true);
}

function handleAction(id) {
  if (id === "today") {
    if (browseMonth !== null) {
      browseMonth = null;
      sync(false);
    }
    return;
  }
  if (id !== "prev" && id !== "next") return;
  const today = localToday(pf.time.now());
  const current = browseMonth || { y: today.y, m: today.m };
  const next = stepMonth(current, id === "next" ? 1 : -1);
  if (!next) return;
  browseMonth = next;
  sync(false);
}

pf.on("start", () => {
  shown = true;
  updateWidth(pf.fence && pf.fence.width);
  t = texts();
  sync(true);
});

pf.on("show", () => {
  shown = true;
  updateWidth(pf.fence && pf.fence.width);
  sync(false);
});

pf.on("hide", () => {
  shown = false;
  cancelMidnight();
});

pf.on("resize", (size) => {
  const w = size && typeof size.width === "number" ? size.width : (pf.fence && pf.fence.width);
  updateWidth(w);
  sync(false);
});

pf.on("settings", () => {
  sync(false);
});

pf.on("lang", () => {
  t = texts();
  sync(true);
});

pf.on("theme", () => {
  sync(true);
});

pf.on("timechange", () => {
  sync(false, true);
});

pf.on("click", (e) => {
  if (e && typeof e.id === "string") handleAction(e.id);
});

pf.on("command", (c) => {
  if (c && typeof c.id === "string") handleAction(c.id);
});

pf.on("stop", () => {
  shown = false;
  cancelMidnight();
});
