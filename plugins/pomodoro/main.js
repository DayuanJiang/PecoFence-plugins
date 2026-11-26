// Pomodoro: focus and break timer for a PecoFence desktop fence.
// Tracks elapsed time against `pf.time.now()` so the countdown never drifts, shows the live
// countdown in the rolled-up title bar via `caption` while active, saves per-fence state in
// `<fence id>-pomodoro.json`, and stops its 1-second timer completely while idle or paused.
"use strict";

const T = {
  en: {
    focus: "Focus", short: "Short break", long: "Long break",
    start: "Start", pause: "Pause", resume: "Resume", skip: "Skip", reset: "Reset",
    paused: "Paused", round: "{0}/{1}", today: "Today: {0} focus · {1} min",
    menuFocus: "Switch to Focus", menuShort: "Switch to Short break", menuLong: "Switch to Long break",
    menuResetToday: "Reset today's count",
    doneFocusTitle: "Focus session complete",
    doneFocusShort: "Time for a {0}-minute short break.",
    doneFocusLong: "Time for a {0}-minute long break.",
    doneBreakTitle: "Break finished",
    doneBreakBody: "Ready for the next {0}-minute focus session.",
  },
  "zh-CN": {
    focus: "专注", short: "短休息", long: "长休息",
    start: "开始", pause: "暂停", resume: "继续", skip: "跳过", reset: "重置",
    paused: "已暂停", round: "第 {0}/{1} 轮", today: "今日：{0} 次专注 · {1} 分钟",
    menuFocus: "切换到专注", menuShort: "切换到短休息", menuLong: "切换到长休息",
    menuResetToday: "清零今日统计",
    doneFocusTitle: "专注完成",
    doneFocusShort: "休息一下吧，短休息 {0} 分钟。",
    doneFocusLong: "辛苦了，长休息 {0} 分钟。",
    doneBreakTitle: "休息结束",
    doneBreakBody: "准备好开始下一轮 {0} 分钟专注了吗？",
  },
  "zh-TW": {
    focus: "專注", short: "短休息", long: "長休息",
    start: "開始", pause: "暫停", resume: "繼續", skip: "略過", reset: "重設",
    paused: "已暫停", round: "第 {0}/{1} 輪", today: "今日：{0} 次專注 · {1} 分鐘",
    menuFocus: "切換到專注", menuShort: "切換到短休息", menuLong: "切換到長休息",
    menuResetToday: "清零今日統計",
    doneFocusTitle: "專注完成",
    doneFocusShort: "休息一下吧，短休息 {0} 分鐘。",
    doneFocusLong: "辛苦了，長休息 {0} 分鐘。",
    doneBreakTitle: "休息結束",
    doneBreakBody: "準備好開始下一輪 {0} 分鐘專注了嗎？",
  },
  ja: {
    focus: "集中", short: "短い休憩", long: "長い休憩",
    start: "開始", pause: "一時停止", resume: "再開", skip: "スキップ", reset: "リセット",
    paused: "一時停止中", round: "{0}/{1}", today: "今日：{0} 回集中 · {1} 分",
    menuFocus: "集中に切り替え", menuShort: "短い休憩に切り替え", menuLong: "長い休憩に切り替え",
    menuResetToday: "今日の記録をリセット",
    doneFocusTitle: "集中セッション完了",
    doneFocusShort: "{0} 分間の短い休憩を取りましょう。",
    doneFocusLong: "{0} 分間の長い休憩を取りましょう。",
    doneBreakTitle: "休憩終了",
    doneBreakBody: "次の {0} 分間の集中を始めましょう。",
  },
  ko: {
    focus: "집중", short: "짧은 휴식", long: "긴 휴식",
    start: "시작", pause: "일시정지", resume: "계속", skip: "건너뛰기", reset: "재설정",
    paused: "일시정지됨", round: "{0}/{1}", today: "오늘: {0}회 집중 · {1}분",
    menuFocus: "집중으로 전환", menuShort: "짧은 휴식으로 전환", menuLong: "긴 휴식으로 전환",
    menuResetToday: "오늘 기록 초기화",
    doneFocusTitle: "집중 세션 완료",
    doneFocusShort: "{0}분 동안 짧게 쉬어 보세요.",
    doneFocusLong: "{0}분 동안 길게 쉬어 보세요.",
    doneBreakTitle: "휴식 종료",
    doneBreakBody: "다음 {0}분 집중을 시작할 준비가 되었습니다.",
  },
  de: {
    focus: "Fokus", short: "Kurze Pause", long: "Lange Pause",
    start: "Start", pause: "Pause", resume: "Weiter", skip: "Weiter", reset: "Zurücksetzen",
    paused: "Pausiert", round: "{0}/{1}", today: "Heute: {0} Fokus · {1} Min.",
    menuFocus: "Zu Fokus wechseln", menuShort: "Zu Kurzer Pause wechseln", menuLong: "Zu Langer Pause wechseln",
    menuResetToday: "Heutigen Zähler zurücksetzen",
    doneFocusTitle: "Fokusphase abgeschlossen",
    doneFocusShort: "Zeit für eine {0}-minütige kurze Pause.",
    doneFocusLong: "Zeit für eine {0}-minütige lange Pause.",
    doneBreakTitle: "Pause beendet",
    doneBreakBody: "Bereit für die nächste {0}-minütige Fokusphase.",
  },
  fr: {
    focus: "Focus", short: "Pause courte", long: "Pause longue",
    start: "Démarrer", pause: "Pause", resume: "Reprendre", skip: "Passer", reset: "Réinitialiser",
    paused: "En pause", round: "{0}/{1}", today: "Aujourd'hui : {0} focus · {1} min",
    menuFocus: "Passer en Focus", menuShort: "Passer en Pause courte", menuLong: "Passer en Pause longue",
    menuResetToday: "Réinitialiser le compteur du jour",
    doneFocusTitle: "Session de focus terminée",
    doneFocusShort: "C'est l'heure d'une pause courte de {0} min.",
    doneFocusLong: "C'est l'heure d'une pause longue de {0} min.",
    doneBreakTitle: "Pause terminée",
    doneBreakBody: "Prêt pour la prochaine session de {0} min.",
  },
  es: {
    focus: "Enfoque", short: "Descanso", long: "Descanso largo",
    start: "Iniciar", pause: "Pausa", resume: "Reanudar", skip: "Saltar", reset: "Reiniciar",
    paused: "En pausa", round: "{0}/{1}", today: "Hoy: {0} enfoque · {1} min",
    menuFocus: "Cambiar a Enfoque", menuShort: "Cambiar a Descanso corto", menuLong: "Cambiar a Descanso largo",
    menuResetToday: "Reiniciar contador de hoy",
    doneFocusTitle: "Sesión de enfoque terminada",
    doneFocusShort: "Hora de un descanso corto de {0} min.",
    doneFocusLong: "Hora de un descanso largo de {0} min.",
    doneBreakTitle: "Descanso terminado",
    doneBreakBody: "Listo para la siguiente sesión de {0} min.",
  },
  "pt-BR": {
    focus: "Foco", short: "Pausa curta", long: "Pausa longa",
    start: "Iniciar", pause: "Pausar", resume: "Continuar", skip: "Pular", reset: "Reiniciar",
    paused: "Pausado", round: "{0}/{1}", today: "Hoje: {0} foco · {1} min",
    menuFocus: "Mudar para Foco", menuShort: "Mudar para Pausa curta", menuLong: "Mudar para Pausa longa",
    menuResetToday: "Zerar contagem de hoje",
    doneFocusTitle: "Sessão de foco concluída",
    doneFocusShort: "Hora de uma pausa curta de {0} min.",
    doneFocusLong: "Hora de uma pausa longa de {0} min.",
    doneBreakTitle: "Pausa encerrada",
    doneBreakBody: "Pronto para a próxima sessão de {0} min.",
  },
  ru: {
    focus: "Фокус", short: "Перерыв", long: "Длинный перерыв",
    start: "Старт", pause: "Пауза", resume: "Продолжить", skip: "Пропустить", reset: "Сброс",
    paused: "На паузе", round: "{0}/{1}", today: "Сегодня: {0} фокус · {1} мин",
    menuFocus: "Переключить на Фокус", menuShort: "Переключить на перерыв", menuLong: "Переключить на длинный перерыв",
    menuResetToday: "Сбросить счётчик за день",
    doneFocusTitle: "Сессия фокуса завершена",
    doneFocusShort: "Пора сделать короткий перерыв на {0} мин.",
    doneFocusLong: "Пора сделать длинный перерыв на {0} мин.",
    doneBreakTitle: "Перерыв окончен",
    doneBreakBody: "Готовы к следующей сессии фокуса ({0} мин.)?",
  },
  it: {
    focus: "Focus", short: "Pausa breve", long: "Pausa lunga",
    start: "Avvia", pause: "Pausa", resume: "Riprendi", skip: "Salta", reset: "Reimposta",
    paused: "In pausa", round: "{0}/{1}", today: "Oggi: {0} focus · {1} min",
    menuFocus: "Passa a Focus", menuShort: "Passa a Pausa breve", menuLong: "Passa a Pausa lunga",
    menuResetToday: "Azzera conteggio di oggi",
    doneFocusTitle: "Sessione di focus completata",
    doneFocusShort: "Tempo per una pausa breve di {0} min.",
    doneFocusLong: "Tempo per una pausa lunga di {0} min.",
    doneBreakTitle: "Pausa terminata",
    doneBreakBody: "Pronto per la prossima sessione di {0} min.",
  },
};

const texts = () => T[pf.lang] || T[pf.lang.split("-")[0]] || T.en;
let t = texts();

const fill = (text, a, b) =>
  String(text).replace("{0}", String(a)).replace("{1}", b === undefined ? "" : String(b));
const pad2 = (n) => String(n).padStart(2, "0");
const clampInt = (v, min, max, fallback) => {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

function cfg() {
  const s = pf.settings || {};
  return {
    focus: clampInt(s.focusMinutes, 1, 180, 25),
    short: clampInt(s.shortBreakMinutes, 1, 60, 5),
    long: clampInt(s.longBreakMinutes, 1, 120, 15),
    cycles: clampInt(s.cyclesBeforeLongBreak, 1, 12, 4),
    autoStart: s.autoStart === true,
    sound: s.sound !== false,
  };
}

function phaseMinutes(phase, c) {
  if (phase === "short") return c.short;
  if (phase === "long") return c.long;
  return c.focus;
}

function dayKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

// Per-fence data file (<fence-uuid>-pomodoro.json): travels with this fence and is cleaned up
// automatically by PecoFence after the fence is deleted permanently.
const stateFile = () => pf.fence.id + "-pomodoro.json";

let state = {
  phase: "focus",
  running: false,
  endAt: null,
  remainingMs: 25 * 60 * 1000,
  totalMs: 25 * 60 * 1000,
  cycle: 0,
  todayKey: dayKey(pf.time.now()),
  todayCount: 0,
  todayMinutes: 0,
};

let loaded = false;
let hidden = false;
let timer = 0;
let idleMidnight = 0;
let shown = "";
let saveQueue = Promise.resolve();

function save() {
  if (!loaded) return;
  const payload = JSON.stringify(state);
  saveQueue = saveQueue.then(() => pf.data.write(stateFile(), payload)).catch(() => {});
}

function syncToday(now) {
  const key = dayKey(now);
  if (state.todayKey !== key) {
    state.todayKey = key;
    state.todayCount = 0;
    state.todayMinutes = 0;
    return true;
  }
  return false;
}

function phaseLabel(phase) {
  if (phase === "short") return t.short;
  if (phase === "long") return t.long;
  return t.focus;
}

function phaseColor(phase) {
  if (phase === "short") return "green";
  if (phase === "long") return "blue";
  return "red";
}

function formatClock(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return h > 0 ? h + ":" + pad2(m) + ":" + pad2(s) : pad2(m) + ":" + pad2(s);
}

function currentRemaining(now) {
  if (!state.running || typeof state.endAt !== "number") return Math.max(0, state.remainingMs);
  // Guard against a backward system-clock jump producing an impossible remaining time.
  const left = state.endAt - now;
  if (left > state.totalMs + 2000) {
    state.endAt = now + state.totalMs;
    return state.totalMs;
  }
  return Math.max(0, left);
}

function syncTimer() {
  if (state.running && !timer) {
    timer = pf.every(1, tick, { align: "second" });
  } else if (!state.running && timer) {
    pf.cancel(timer);
    timer = 0;
  }
}

function cancelIdleMidnight() {
  if (!idleMidnight) return;
  pf.cancel(idleMidnight);
  idleMidnight = 0;
}

function syncIdleMidnight(now) {
  // Running sessions check the date on each tick. A visible idle fence only needs
  // one wake-up while there are daily totals to clear.
  if (hidden || state.running || (state.todayCount === 0 && state.todayMinutes === 0)) {
    cancelIdleMidnight();
    return;
  }
  if (idleMidnight) return;

  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const delay = Math.max(1, Math.ceil((midnight.getTime() - now) / 1000));
  idleMidnight = pf.after(delay, () => {
    idleMidnight = 0;
    draw(false);
  });
}

function setPhase(phase, autoRun) {
  const c = cfg();
  const mins = phaseMinutes(phase, c);
  state.phase = phase;
  state.totalMs = mins * 60 * 1000;
  state.remainingMs = state.totalMs;
  if (autoRun) {
    state.running = true;
    state.endAt = pf.time.now() + state.totalMs;
  } else {
    state.running = false;
    state.endAt = null;
  }
  syncTimer();
}

function completePhase(now, notifyUser) {
  const c = cfg();
  syncToday(now);
  const finished = state.phase;
  const overdue = typeof state.endAt === "number" ? now - state.endAt : 0;
  let nextPhase = "focus";
  let title = t.doneBreakTitle;
  let body = fill(t.doneBreakBody, c.focus);

  if (finished === "focus") {
    const mins = Math.max(1, Math.round(state.totalMs / 60000));
    state.todayCount += 1;
    state.todayMinutes += mins;
    state.cycle += 1;
    if (state.cycle >= c.cycles) {
      state.cycle = 0;
      nextPhase = "long";
      body = fill(t.doneFocusLong, c.long);
    } else {
      nextPhase = "short";
      body = fill(t.doneFocusShort, c.short);
    }
    title = t.doneFocusTitle;
  }

  // Only auto-start the next phase when finishing live (not after long sleep/suspend).
  const autoRun = c.autoStart && overdue < 10000;
  setPhase(nextPhase, autoRun);
  save();
  if (notifyUser) {
    try {
      pf.notify(title, body, { sound: c.sound }).catch(() => {});
    } catch (_) {}
  }
}

function draw(force) {
  if (!loaded) return;
  const now = pf.time.now();
  if (syncToday(now)) save();
  syncIdleMidnight(now);
  const c = cfg();
  const rem = currentRemaining(now);
  const total = Math.max(1000, state.totalMs);
  const progress = Math.min(1, Math.max(0, (total - rem) / total));
  const clockText = formatClock(rem);
  const isPartial = !state.running && rem > 0 && rem < total;
  const roundNum = Math.min(c.cycles, state.cycle + 1);
  const status = state.phase === "focus"
    ? phaseLabel(state.phase) + " · " + fill(t.round, roundNum, c.cycles)
    : phaseLabel(state.phase);
  const statusLine = isPartial ? status + " (" + t.paused + ")" : status;

  const toggleLabel = state.running ? t.pause : (isPartial ? t.resume : t.start);
  const rows = [
    { text: clockText, short: clockText, size: "fit" },
    { text: statusLine, color: phaseColor(state.phase), progress: progress, bold: state.running },
    {
      cells: [
        { id: "toggle", text: toggleLabel, bold: true, checked: state.running },
        { id: "skip", text: t.skip },
        { id: "reset", text: t.reset },
      ],
    },
    { text: fill(t.today, state.todayCount, state.todayMinutes), color: "gray", size: "small" },
  ];

  // Show the live countdown in the rolled-up title bar while running or paused mid-session;
  // leave caption empty when idle so the fence shows its own title and sleeps cleanly.
  let caption = "";
  if (state.running) {
    caption = (clockText + " · " + phaseLabel(state.phase)).slice(0, 24);
  } else if (isPartial) {
    caption = ("|| " + clockText).slice(0, 24);
  }

  const menu = [
    { id: "focus", title: t.menuFocus, checked: state.phase === "focus" },
    { id: "short", title: t.menuShort, checked: state.phase === "short" },
    { id: "long", title: t.menuLong, checked: state.phase === "long" },
    { separator: true },
    { id: "resetToday", title: t.menuResetToday, disabled: state.todayCount === 0 && state.todayMinutes === 0 },
  ];

  const view = { rows, caption, menu };
  const json = JSON.stringify(view);
  if (force || json !== shown) {
    shown = json;
    pf.show(view);
  }
}

function tick() {
  if (!loaded || !state.running) {
    syncTimer();
    return;
  }
  const now = pf.time.now();
  if (syncToday(now)) save();
  if (currentRemaining(now) <= 0) {
    completePhase(now, true);
    draw(false);
    return;
  }
  if (!hidden) draw(false);
}

async function load() {
  const now = pf.time.now();
  const c = cfg();
  state.totalMs = c.focus * 60 * 1000;
  state.remainingMs = state.totalMs;
  state.todayKey = dayKey(now);

  const raw = await pf.data.read(stateFile()).catch(() => null);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        const phase = saved.phase === "short" || saved.phase === "long" ? saved.phase : "focus";
        const defaultTotal = phaseMinutes(phase, c) * 60 * 1000;
        state.phase = phase;
        state.totalMs = Number.isFinite(saved.totalMs) && saved.totalMs >= 60000 ? saved.totalMs : defaultTotal;
        state.remainingMs = Number.isFinite(saved.remainingMs)
          ? Math.min(state.totalMs, Math.max(0, saved.remainingMs))
          : state.totalMs;
        state.cycle = clampInt(saved.cycle, 0, c.cycles - 1, 0);
        if (typeof saved.todayKey === "string" && saved.todayKey === dayKey(now)) {
          state.todayCount = clampInt(saved.todayCount, 0, 9999, 0);
          state.todayMinutes = clampInt(saved.todayMinutes, 0, 999999, 0);
        }
        if (saved.running === true && Number.isFinite(saved.endAt)) {
          state.running = true;
          state.endAt = saved.endAt;
        }
      }
    } catch (_) {}
  }

  loaded = true;
  if (state.running && currentRemaining(now) <= 0) {
    completePhase(now, false);
  } else {
    syncTimer();
  }
  draw(true);
}

pf.on("start", load);
pf.on("show", () => {
  hidden = false;
  if (!loaded) return;
  const now = pf.time.now();
  const rolled = syncToday(now);
  if (state.running && currentRemaining(now) <= 0) {
    completePhase(now, true);
  } else if (rolled) {
    save();
  }
  draw(false);
});
pf.on("hide", () => {
  hidden = true;
  cancelIdleMidnight();
});
pf.on("timechange", () => {
  if (!loaded) return;
  cancelIdleMidnight();
  const now = pf.time.now();
  const rolled = syncToday(now);
  if (state.running && currentRemaining(now) <= 0) {
    completePhase(now, true);
  } else if (rolled) {
    save();
  }
  draw(false);
});
pf.on("lang", () => {
  t = texts();
  shown = "";
  draw(true);
});
pf.on("settings", () => {
  if (!loaded) return;
  const c = cfg();
  state.cycle = Math.min(state.cycle, Math.max(0, c.cycles - 1));
  // If idle at the start of a phase, apply the updated duration immediately.
  if (!state.running && state.remainingMs >= state.totalMs) {
    const ms = phaseMinutes(state.phase, c) * 60 * 1000;
    state.totalMs = ms;
    state.remainingMs = ms;
    save();
  }
  draw(true);
});
pf.on("click", (e) => {
  if (!loaded) return;
  const now = pf.time.now();
  syncToday(now);
  if (e.id === "toggle") {
    if (state.running) {
      state.remainingMs = currentRemaining(now);
      state.running = false;
      state.endAt = null;
      syncTimer();
    } else {
      if (state.remainingMs <= 0) {
        const ms = phaseMinutes(state.phase, cfg()) * 60 * 1000;
        state.totalMs = ms;
        state.remainingMs = ms;
      }
      state.running = true;
      state.endAt = now + state.remainingMs;
      syncTimer();
    }
    save();
    draw(false);
  } else if (e.id === "skip") {
    const c = cfg();
    let next = "focus";
    if (state.phase === "focus") {
      next = state.cycle + 1 >= c.cycles ? "long" : "short";
      state.cycle = next === "long" ? 0 : state.cycle + 1;
    }
    setPhase(next, false);
    save();
    draw(false);
  } else if (e.id === "reset") {
    setPhase(state.phase, false);
    save();
    draw(false);
  }
});
pf.on("command", (c) => {
  if (!loaded) return;
  if (c.id === "focus" || c.id === "short" || c.id === "long") {
    setPhase(c.id, false);
    save();
    draw(false);
  } else if (c.id === "resetToday") {
    state.todayKey = dayKey(pf.time.now());
    state.todayCount = 0;
    state.todayMinutes = 0;
    save();
    draw(false);
  }
});
pf.on("stop", () => {
  if (!loaded) return;
  cancelIdleMidnight();
  if (state.running) {
    state.remainingMs = currentRemaining(pf.time.now());
  }
  pf.cancel(timer);
  timer = 0;
  try {
    pf.data.write(stateFile(), JSON.stringify(state)).catch(() => {});
  } catch (_) {}
});
