// Tally: named desktop counters in a PecoFence fence.
// Each counter has - and + buttons, mouse-wheel stepping, and a per-row context menu to reset,
// rename or remove it. Rolled up, the fence title bar shows the counter value or combined total
// via `caption`. State is stored locally per fence in `<fence id>-tally.json` with no timers and
// no permissions.
"use strict";

const T = {
  en: {
    defaultName: "Count",
    numberedName: "Count {0}",
    add: "New counter name, Enter to add",
    renameHint: "New name, Enter to save",
    empty: "No counters yet. Type a name below and press Enter.",
    full: "At most {0} counters. Remove one first.",
    dec: "Decrease",
    inc: "Increase",
    total: "Total {0}",
    menuAdd: "Add counter",
    menuResetAll: "Reset all to 0",
    menuSort: "Sort by name",
    menuReset: "Reset to 0",
    menuRename: "Rename",
    menuDelete: "Remove",
  },
  "zh-CN": {
    defaultName: "计数",
    numberedName: "计数 {0}",
    add: "输入新计数器名称，按 Enter 添加",
    renameHint: "输入新名称，按 Enter 保存",
    empty: "还没有计数器。在下方输入名称后按 Enter。",
    full: "最多 {0} 个计数器，请先删除一个。",
    dec: "减 1",
    inc: "加 1",
    total: "总计 {0}",
    menuAdd: "添加计数器",
    menuResetAll: "全部归零",
    menuSort: "按名称排序",
    menuReset: "归零",
    menuRename: "重命名",
    menuDelete: "删除",
  },
  "zh-TW": {
    defaultName: "計數",
    numberedName: "計數 {0}",
    add: "輸入新計數器名稱，按 Enter 新增",
    renameHint: "輸入新名稱，按 Enter 儲存",
    empty: "還沒有計數器。在下方輸入名稱後按 Enter。",
    full: "最多 {0} 個計數器，請先刪除一個。",
    dec: "減 1",
    inc: "加 1",
    total: "總計 {0}",
    menuAdd: "新增計數器",
    menuResetAll: "全部歸零",
    menuSort: "按名稱排序",
    menuReset: "歸零",
    menuRename: "重新命名",
    menuDelete: "刪除",
  },
  ja: {
    defaultName: "カウント",
    numberedName: "カウント {0}",
    add: "新しいカウンター名を入力して Enter",
    renameHint: "新しい名前を入力して Enter",
    empty: "カウンターがありません。下に名前を入力して Enter を押してください。",
    full: "最大 {0} 件です。先に 1 つ削除してください。",
    dec: "減らす",
    inc: "増やす",
    total: "合計 {0}",
    menuAdd: "カウンターを追加",
    menuResetAll: "すべて 0 にリセット",
    menuSort: "名前順に並べ替え",
    menuReset: "0 にリセット",
    menuRename: "名前を変更",
    menuDelete: "削除",
  },
  ko: {
    defaultName: "카운트",
    numberedName: "카운트 {0}",
    add: "새 카운터 이름을 입력하고 Enter",
    renameHint: "새 이름을 입력하고 Enter",
    empty: "카운터가 없습니다. 아래에 이름을 입력하고 Enter를 누르세요.",
    full: "최대 {0}개까지 가능합니다. 먼저 하나를 삭제하세요.",
    dec: "감소",
    inc: "증가",
    total: "합계 {0}",
    menuAdd: "카운터 추가",
    menuResetAll: "모두 0으로 초기화",
    menuSort: "이름순 정렬",
    menuReset: "0으로 초기화",
    menuRename: "이름 바꾸기",
    menuDelete: "삭제",
  },
  de: {
    defaultName: "Zähler",
    numberedName: "Zähler {0}",
    add: "Neuer Zählername, Eingabe zum Hinzufügen",
    renameHint: "Neuer Name, Eingabe zum Speichern",
    empty: "Noch keine Zähler. Unten Namen eingeben und Eingabe drücken.",
    full: "Höchstens {0} Zähler. Erst einen entfernen.",
    dec: "Verringern",
    inc: "Erhöhen",
    total: "Gesamt {0}",
    menuAdd: "Zähler hinzufügen",
    menuResetAll: "Alle auf 0 setzen",
    menuSort: "Nach Name sortieren",
    menuReset: "Auf 0 setzen",
    menuRename: "Umbenennen",
    menuDelete: "Entfernen",
  },
  fr: {
    defaultName: "Compteur",
    numberedName: "Compteur {0}",
    add: "Nom du compteur, Entrée pour ajouter",
    renameHint: "Nouveau nom, Entrée pour enregistrer",
    empty: "Aucun compteur. Tapez un nom ci-dessous puis appuyez sur Entrée.",
    full: "{0} compteurs maximum. Supprimez-en un d'abord.",
    dec: "Diminuer",
    inc: "Augmenter",
    total: "Total {0}",
    menuAdd: "Ajouter un compteur",
    menuResetAll: "Tout remettre à 0",
    menuSort: "Trier par nom",
    menuReset: "Remettre à 0",
    menuRename: "Renommer",
    menuDelete: "Supprimer",
  },
  es: {
    defaultName: "Contador",
    numberedName: "Contador {0}",
    add: "Nombre del contador, Intro para añadir",
    renameHint: "Nuevo nombre, Intro para guardar",
    empty: "Aún no hay contadores. Escribe un nombre abajo y pulsa Intro.",
    full: "Máximo {0} contadores. Elimina uno primero.",
    dec: "Restar",
    inc: "Sumar",
    total: "Total {0}",
    menuAdd: "Añadir contador",
    menuResetAll: "Poner todos a 0",
    menuSort: "Ordenar por nombre",
    menuReset: "Poner a 0",
    menuRename: "Renombrar",
    menuDelete: "Eliminar",
  },
  "pt-BR": {
    defaultName: "Contador",
    numberedName: "Contador {0}",
    add: "Nome do contador, Enter para adicionar",
    renameHint: "Novo nome, Enter para salvar",
    empty: "Ainda não há contadores. Digite um nome abaixo e pressione Enter.",
    full: "No máximo {0} contadores. Remova um primeiro.",
    dec: "Diminuir",
    inc: "Aumentar",
    total: "Total {0}",
    menuAdd: "Adicionar contador",
    menuResetAll: "Zerar todos",
    menuSort: "Ordenar por nome",
    menuReset: "Zerar",
    menuRename: "Renomear",
    menuDelete: "Remover",
  },
  ru: {
    defaultName: "Счётчик",
    numberedName: "Счётчик {0}",
    add: "Название счётчика, Enter — добавить",
    renameHint: "Новое название, Enter — сохранить",
    empty: "Счётчиков пока нет. Введите название ниже и нажмите Enter.",
    full: "Не более {0} счётчиков. Сначала удалите лишний.",
    dec: "Уменьшить",
    inc: "Увеличить",
    total: "Всего {0}",
    menuAdd: "Добавить счётчик",
    menuResetAll: "Сбросить все в 0",
    menuSort: "Сортировать по имени",
    menuReset: "Сбросить в 0",
    menuRename: "Переименовать",
    menuDelete: "Удалить",
  },
  it: {
    defaultName: "Contatore",
    numberedName: "Contatore {0}",
    add: "Nome del contatore, Invio per aggiungere",
    renameHint: "Nuovo nome, Invio per salvare",
    empty: "Nessun contatore. Scrivi un nome sotto e premi Invio.",
    full: "Massimo {0} contatori. Rimuovine prima uno.",
    dec: "Diminuisci",
    inc: "Aumenta",
    total: "Totale {0}",
    menuAdd: "Aggiungi contatore",
    menuResetAll: "Azzera tutti",
    menuSort: "Ordina per nome",
    menuReset: "Azzera",
    menuRename: "Rinomina",
    menuDelete: "Rimuovi",
  },
};

const MAX_ITEMS = 20;
const MAX_NAME = 32;
const MAX_CAPTION = 24;
const MIN_VAL = -999999;
const MAX_VAL = 999999;
const KEY_RE = /^c([1-9]\d{0,8})$/;

const texts = () => T[pf.lang] || T[String(pf.lang || "en").split("-")[0]] || T.en;
let t = texts();

const fill = (text, v) => String(text).replace("{0}", String(v));
const clip = (s, max) => Array.from(String(s)).slice(0, max).join("");
const cleanName = (raw) => clip(String(raw || "").replace(/\s+/g, " ").trim(), MAX_NAME);
const clampCount = (n) => {
  const v = Math.trunc(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(MAX_VAL, Math.max(MIN_VAL, v));
};

// Per-fence data file (<fence-uuid>-tally.json): 36 + 11 = 47 chars (<= 64).
const dataFile = () => pf.fence.id + "-tally.json";

function defaultState() {
  return {
    v: 1,
    seq: 2,
    items: [{ k: "c1", name: t.defaultName, n: 0 }],
  };
}

function sanitize(raw) {
  let data = raw;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (_) {
      return defaultState();
    }
  }
  if (!data || typeof data !== "object" || Array.isArray(data) || !Array.isArray(data.items)) {
    return defaultState();
  }

  let savedSeq = Number.isInteger(data.seq) && data.seq >= 1 && data.seq <= 999999999 ? data.seq : 1;
  let maxKey = 0;
  const used = Object.create(null);
  const valid = [];

  for (let i = 0; i < data.items.length && valid.length < MAX_ITEMS; i += 1) {
    const entry = data.items[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    if (typeof entry.name !== "string") continue;
    const name = cleanName(entry.name);
    if (!name) continue;
    if (typeof entry.n !== "number" || !Number.isFinite(entry.n)) continue;

    let key = null;
    if (typeof entry.k === "string") {
      const m = KEY_RE.exec(entry.k);
      if (m && !used[entry.k]) {
        key = entry.k;
        const num = Number(m[1]);
        if (num > maxKey) maxKey = num;
      }
    }
    if (key) used[key] = true;
    valid.push({ k: key, name, n: clampCount(entry.n) });
  }

  // If the file contained items but every single one was malformed, recover cleanly to default.
  if (data.items.length > 0 && valid.length === 0) {
    return defaultState();
  }

  let nextSeq = Math.max(savedSeq, maxKey + 1);
  for (let i = 0; i < valid.length; i += 1) {
    if (!valid[i].k) {
      while (used["c" + nextSeq]) nextSeq += 1;
      valid[i].k = "c" + nextSeq;
      used[valid[i].k] = true;
      nextSeq += 1;
    }
  }

  return { v: 1, seq: nextSeq, items: valid };
}

let state = defaultState();
let loaded = false;
let dirty = false;
let renaming = null;
let shown = "";
let saveQueue = Promise.resolve();

function save() {
  if (!loaded) return;
  dirty = true;
  const payload = JSON.stringify(state);
  saveQueue = saveQueue
    .then(() => pf.data.write(dataFile(), payload))
    .catch(() => {});
}

function findItem(k) {
  for (let i = 0; i < state.items.length; i += 1) {
    if (state.items[i].k === k) return state.items[i];
  }
  return null;
}

function buildCaption() {
  if (state.items.length === 0) return "";
  if (state.items.length === 1) {
    const it = state.items[0];
    const suffix = " " + String(it.n);
    const maxName = MAX_CAPTION - Array.from(suffix).length;
    if (maxName <= 1) return clip(String(it.n), MAX_CAPTION);
    const chars = Array.from(it.name);
    const head = chars.length > maxName ? chars.slice(0, maxName - 1).join("") + "\u2026" : it.name;
    return head + suffix;
  }
  let sum = 0;
  for (let i = 0; i < state.items.length; i += 1) {
    sum += state.items[i].n;
  }
  return clip(fill(t.total, sum), MAX_CAPTION);
}

function draw(force) {
  if (!loaded) return;
  const rows = [];

  if (state.items.length === 0) {
    rows.push({ text: t.empty, color: "gray", size: "small" });
  } else {
    for (let i = 0; i < state.items.length; i += 1) {
      const it = state.items[i];
      if (renaming === it.k) {
        rows.push({
          input: {
            type: "line",
            id: it.k + ":rename",
            value: it.name,
            placeholder: t.renameHint,
          },
        });
      } else {
        rows.push({
          id: it.k,
          wheel: true,
          cells: [
            { text: it.name, fill: true, tip: it.name },
            { id: it.k + ":dec", text: "\u2212", width: 28, align: "center", tip: t.dec, wheel: true },
            { text: String(it.n), bold: true, width: 64, align: "right", tip: it.name + ": " + String(it.n) },
            { id: it.k + ":inc", text: "+", width: 28, align: "center", tip: t.inc, wheel: true },
          ],
          menu: [
            { id: "reset", title: t.menuReset, disabled: it.n === 0 },
            { id: "rename", title: t.menuRename },
            { id: "delete", title: t.menuDelete },
          ],
        });
      }
    }
  }

  rows.push({ separator: true });
  if (state.items.length < MAX_ITEMS) {
    rows.push({ input: { type: "line", id: "add", value: "", placeholder: t.add } });
  } else {
    rows.push({ text: fill(t.full, MAX_ITEMS), color: "gray", size: "small" });
  }

  let hasNonZero = false;
  for (let i = 0; i < state.items.length; i += 1) {
    if (state.items[i].n !== 0) {
      hasNonZero = true;
      break;
    }
  }

  const menu = [
    { id: "add", title: t.menuAdd, disabled: state.items.length >= MAX_ITEMS },
    { id: "resetAll", title: t.menuResetAll, disabled: !hasNonZero },
    { id: "sort", title: t.menuSort, disabled: state.items.length < 2 },
  ];

  const view = { rows, caption: buildCaption(), menu };
  const json = JSON.stringify(view);
  if (force || json !== shown) {
    shown = json;
    pf.show(view);
  }
}

function addCounter(rawName) {
  if (state.items.length >= MAX_ITEMS) return false;
  const name = cleanName(rawName) || cleanName(fill(t.numberedName, state.seq));
  const key = "c" + state.seq;
  state.seq += 1;
  state.items.push({ k: key, name, n: 0 });
  return true;
}

function stepCounter(k, delta) {
  const it = findItem(k);
  if (!it) return false;
  const next = clampCount(it.n + delta);
  if (next === it.n) return false;
  it.n = next;
  return true;
}

async function load() {
  let raw = null;
  try {
    raw = await pf.data.read(dataFile());
  } catch (_) {
    raw = null;
  }
  state = raw === null || raw === undefined ? defaultState() : sanitize(raw);
  loaded = true;
  renaming = null;
  draw(true);
}

pf.on("start", load);
pf.on("show", () => { draw(false); });
pf.on("lang", () => {
  t = texts();
  shown = "";
  draw(true);
});

pf.on("click", (e) => {
  if (!loaded || !e || typeof e.id !== "string") return;
  const sep = e.id.indexOf(":");
  if (sep < 0) {
    if (renaming !== null) {
      renaming = null;
      draw(false);
    }
    return;
  }
  const k = e.id.slice(0, sep);
  const act = e.id.slice(sep + 1);
  let changed = false;
  if (renaming !== null) {
    renaming = null;
    changed = true;
  }
  if (act === "inc") {
    if (stepCounter(k, 1)) {
      save();
      changed = true;
    }
  } else if (act === "dec") {
    if (stepCounter(k, -1)) {
      save();
      changed = true;
    }
  }
  if (changed) draw(false);
});

pf.on("wheel", (e) => {
  if (!loaded || !e || typeof e.id !== "string") return;
  const steps = Math.trunc(Number(e.steps));
  if (!Number.isFinite(steps) || steps === 0) return;
  const wasRenaming = renaming !== null;
  renaming = null;
  // Over a button the host sends the cell ID instead of the counter row ID.
  const changed = stepCounter(e.id.split(":", 1)[0], steps);
  if (changed) save();
  if (changed || wasRenaming) draw(false);
});

pf.on("text", (e) => {
  if (!loaded || !e || typeof e.id !== "string") return;
  if (e.id === "add") {
    renaming = null;
    const name = cleanName(e.text);
    if (!name) {
      // The host puts the submitted text in the row before sending this event.
      draw(e.text !== "");
      return;
    }
    if (addCounter(name)) {
      save();
    }
    draw(false);
    return;
  }
  const suffix = ":rename";
  if (e.id.endsWith(suffix)) {
    const k = e.id.slice(0, -suffix.length);
    const it = findItem(k);
    renaming = null;
    const name = cleanName(e.text);
    if (it && name && name !== it.name) {
      it.name = name;
      save();
    }
    draw(false);
  }
});

pf.on("command", (c) => {
  if (!loaded || !c || typeof c.id !== "string") return;
  const rowKey = typeof c.row === "string" ? c.row : "";

  if (c.id === "rename") {
    const it = findItem(rowKey);
    if (!it) return;
    renaming = it.k;
    draw(false);
    return;
  }

  let changed = false;
  if (renaming !== null) {
    renaming = null;
    changed = true;
  }

  if (c.id === "reset") {
    const it = findItem(rowKey);
    if (it && it.n !== 0) {
      it.n = 0;
      save();
      changed = true;
    }
  } else if (c.id === "delete") {
    const before = state.items.length;
    state.items = state.items.filter((it) => it.k !== rowKey);
    if (state.items.length !== before) {
      save();
      changed = true;
    }
  } else if (c.id === "add") {
    if (addCounter("")) {
      save();
      changed = true;
    }
  } else if (c.id === "resetAll") {
    let any = false;
    for (let i = 0; i < state.items.length; i += 1) {
      if (state.items[i].n !== 0) {
        state.items[i].n = 0;
        any = true;
      }
    }
    if (any) {
      save();
      changed = true;
    }
  } else if (c.id === "sort") {
    if (state.items.length >= 2) {
      const prev = state.items.map((it) => it.k).join(",");
      state.items.sort((a, b) => {
        const al = a.name.toLowerCase();
        const bl = b.name.toLowerCase();
        if (al < bl) return -1;
        if (al > bl) return 1;
        if (a.k < b.k) return -1;
        if (a.k > b.k) return 1;
        return 0;
      });
      const next = state.items.map((it) => it.k).join(",");
      if (next !== prev) {
        save();
        changed = true;
      }
    }
  }

  if (changed) draw(false);
});

pf.on("stop", () => {
  if (!loaded || !dirty) return;
  try {
    pf.data.write(dataFile(), JSON.stringify(state)).catch(() => {});
  } catch (_) {}
});
