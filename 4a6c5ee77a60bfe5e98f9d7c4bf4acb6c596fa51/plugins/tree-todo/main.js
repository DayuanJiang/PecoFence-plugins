// Tree To-do: native lightweight multi-level to-do outline for a PecoFence fence.
// Runs in PecoFence's built-in QuickJS engine (~100 KB RAM, no WebView2) and blends natively
// into the fence's Fluent glass surface. Data is stored per fence in <fence-id>-tree-todo.json
// with full compatibility with v1 data. Zero permissions, zero network calls, zero idle timers.
"use strict";

const MAX_NODES = 500;
const MAX_DEPTH = 6;
const MAX_TEXT = 240;
const MAX_RENDER_ROWS = 292;
const PRIORITIES = ["none", "high", "med", "low"];

const T = {
  en: {
    weekdays: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    addPlaceholder: "+ Add task (prefix > to nest under last item)",
    addSubPlaceholder: "Subtask name, Enter to add…",
    renamePlaceholder: "New task name, Enter to save…",
    empty: "No tasks for this day. Click + below to add one.",
    emptyFilter: "No matching tasks.",
    filterAll: "All",
    filterOpen: "Open",
    filterDone: "Done",
    pullBtn: "To today",
    pullTip: "Move all unfinished tasks from other days to today",
    todayStat: "Today {0} · All {1}",
    todayTip: "Jump back to today",
    dayHeader: "{0} · {1}/{2} done",
    caption: "To-do {0}/{1}",
    prevWeek: "Previous week",
    nextWeek: "Next week",
    dayTipOpen: "{0} · {1} open",
    dayTipClean: "{0}",
    foldTip: "Click to fold / unfold subtasks",
    addSubTip: "Add subtask",
    deleteTip: "Delete",
    deleteConfirmTip: "Click again to confirm delete",
    uHigh: "Urgent (Red)",
    uMed: "Important (Amber)",
    uLow: "Normal (Blue)",
    menuAddSub: "Add subtask",
    menuRename: "Rename",
    menuIndent: "Nest under previous",
    menuOutdent: "Move up one level",
    menuUrgent: "Toggle urgent (Red)",
    menuDelete: "Delete",
    fenceToday: "Jump to today",
    fencePull: "Move all unfinished to today",
    fenceExpand: "Expand all",
    fenceCollapse: "Collapse all",
    fenceClearDone: "Clear completed on this day",
    moreHidden: "… {0} more task(s) not shown",
    limitReached: "At most {0} tasks per fence.",
    depthReached: "Maximum nesting depth is {0} levels.",
    corruptNotice: "Saved data was unreadable; backup kept as {0}.",
    carriedNotice: "Moved {0} unfinished task(s) to today.",
    noCarryNotice: "No unfinished tasks on other days."
  },
  "zh-CN": {
    weekdays: ["一", "二", "三", "四", "五", "六", "日"],
    addPlaceholder: "+ 添加待办（前缀 > 可直接作为上一项子任务）",
    addSubPlaceholder: "输入子任务，按 Enter 添加…",
    renamePlaceholder: "输入新名称，按 Enter 保存…",
    empty: "当天还没有待办，点击下方「+」添加。",
    emptyFilter: "没有符合当前筛选的任务。",
    filterAll: "全部",
    filterOpen: "未完成",
    filterDone: "已完成",
    pullBtn: "挪到今天",
    pullTip: "将其他日期所有未完成任务挪到今天",
    todayStat: "今 {0} · 总 {1}",
    todayTip: "一键回到今天",
    dayHeader: "{0} · 已完成 {1}/{2}",
    caption: "待办 {0}/{1}",
    prevWeek: "上一周",
    nextWeek: "下一周",
    dayTipOpen: "{0} · 未完成 {1} 项",
    dayTipClean: "{0}",
    foldTip: "点击折叠或展开子任务",
    addSubTip: "添加子任务",
    deleteTip: "删除",
    deleteConfirmTip: "再次点击确认删除",
    uHigh: "紧急（红）",
    uMed: "较急（黄）",
    uLow: "普通（蓝）",
    menuAddSub: "添加子任务",
    menuRename: "重命名",
    menuIndent: "缩进为上一项子任务",
    menuOutdent: "提升一级",
    menuUrgent: "标记/取消紧急（红）",
    menuDelete: "删除",
    fenceToday: "回到今天",
    fencePull: "未完成全部挪到今天",
    fenceExpand: "全部展开",
    fenceCollapse: "全部折叠",
    fenceClearDone: "清理当天已完成",
    moreHidden: "… 还有 {0} 项未显示",
    limitReached: "单个栅栏最多保存 {0} 条任务。",
    depthReached: "最多支持 {0} 级嵌套。",
    corruptNotice: "旧数据读取失败，已备份为 {0}。",
    carriedNotice: "已将 {0} 条未完成任务挪到今天。",
    noCarryNotice: "其他日期没有未完成的任务。"
  },
  "zh-TW": {
    weekdays: ["一", "二", "三", "四", "五", "六", "日"],
    addPlaceholder: "+ 新增待辦（前綴 > 可直接作為上一項子任務）",
    addSubPlaceholder: "輸入子任務，按 Enter 新增…",
    renamePlaceholder: "輸入新名稱，按 Enter 儲存…",
    empty: "當天還沒有待辦，點擊下方「+」新增。",
    emptyFilter: "沒有符合目前篩選的任務。",
    filterAll: "全部",
    filterOpen: "未完成",
    filterDone: "已完成",
    pullBtn: "挪到今天",
    pullTip: "將其他日期所有未完成任務挪到今天",
    todayStat: "今 {0} · 總 {1}",
    todayTip: "一鍵回到今天",
    dayHeader: "{0} · 已完成 {1}/{2}",
    caption: "待辦 {0}/{1}",
    prevWeek: "上一週",
    nextWeek: "下一週",
    dayTipOpen: "{0} · 未完成 {1} 項",
    dayTipClean: "{0}",
    foldTip: "點擊摺疊或展開子任務",
    addSubTip: "新增子任務",
    deleteTip: "刪除",
    deleteConfirmTip: "再次點擊確認刪除",
    uHigh: "緊急（紅）",
    uMed: "較急（黃）",
    uLow: "普通（藍）",
    menuAddSub: "新增子任務",
    menuRename: "重新命名",
    menuIndent: "縮排為上一項子任務",
    menuOutdent: "提升一級",
    menuUrgent: "標記/取消緊急（紅）",
    menuDelete: "刪除",
    fenceToday: "回到今天",
    fencePull: "未完成全部挪到今天",
    fenceExpand: "全部展開",
    fenceCollapse: "全部摺疊",
    fenceClearDone: "清理當天已完成",
    moreHidden: "… 還有 {0} 項未顯示",
    limitReached: "單個柵欄最多儲存 {0} 條任務。",
    depthReached: "最多支援 {0} 級巢狀。",
    corruptNotice: "舊資料讀取失敗，已備份為 {0}。",
    carriedNotice: "已將 {0} 條未完成任務挪到今天。",
    noCarryNotice: "其他日期沒有未完成的任務。"
  }
};

function getTexts() {
  const lang = String(pf.lang || "en");
  if (T[lang]) return T[lang];
  if (lang.toLowerCase().startsWith("zh-tw") || lang.toLowerCase().startsWith("zh-hk")) return T["zh-TW"];
  if (lang.toLowerCase().startsWith("zh")) return T["zh-CN"];
  return T.en;
}

let t = getTexts();

function fmt(tpl, a, b, c) {
  let out = String(tpl).replace("{0}", String(a));
  if (b !== undefined) out = out.replace("{1}", String(b));
  if (c !== undefined) out = out.replace("{2}", String(c));
  return out;
}

function cfg() {
  const s = pf.settings || {};
  return {
    showWeekBar: s.showWeekBar !== false,
    showProgressBar: s.showProgressBar !== false,
    hideDone: s.hideDone === true,
    autoCompleteParent: s.autoCompleteParent !== false,
    cascadeDone: s.cascadeDone !== false
  };
}

// --- Date helpers ---

function pad2(n) {
  return n < 10 ? "0" + n : String(n);
}

function toDayKey(d) {
  return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
}

function parseDayKey(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function addDays(d, delta) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta);
}

function mondayOf(d) {
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

function todayKey() {
  return toDayKey(new Date(pf.time.now()));
}

// --- State ---

const dataFile = () => pf.fence.id + "-tree-todo.json";
let state = { version: 2, nextId: 1, days: {} };
let loaded = false;
let selectedDay = todayKey();
let weekOffset = 0;
let filterMode = "all"; // "all" | "open" | "done"
let hoveredId = null;
let confirmDelId = null;
let confirmTimer = 0;
let addingSubTo = null;
let renamingId = null;
let notice = "";
let noticeTimer = 0;
let shown = "";
let saveQueue = Promise.resolve();

// --- Helpers & sanitization ---

function cleanText(raw) {
  return String(raw || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT);
}

function currentList() {
  if (!Array.isArray(state.days[selectedDay])) {
    state.days[selectedDay] = [];
  }
  return state.days[selectedDay];
}

function sanitizeNodes(list, depth, usedIds, counters) {
  if (!Array.isArray(list) || depth >= MAX_DEPTH) return [];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    if (counters.total >= MAX_NODES) break;
    const src = list[i];
    if (!src || typeof src !== "object") continue;
    const text = cleanText(src.text);
    if (!text) continue;
    let id = Number.isInteger(src.id) && src.id > 0 && !usedIds.has(src.id) ? src.id : counters.nextId++;
    usedIds.add(id);
    if (id >= counters.nextId) counters.nextId = id + 1;
    const prio = PRIORITIES.indexOf(src.priority) >= 0 ? src.priority : "none";
    counters.total += 1;
    out.push({
      id: id,
      text: text,
      done: src.done === true,
      priority: prio,
      collapsed: src.collapsed === true,
      children: sanitizeNodes(src.children, depth + 1, usedIds, counters)
    });
  }
  return out;
}

function sanitizeState(raw) {
  const usedIds = new Set();
  const counters = {
    nextId: Number.isInteger(raw && raw.nextId) && raw.nextId > 0 ? raw.nextId : 1,
    total: 0
  };
  const days = {};
  if (raw && raw.days && typeof raw.days === "object") {
    const keys = Object.keys(raw.days);
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      if (!parseDayKey(k)) continue;
      const cleaned = sanitizeNodes(raw.days[k], 0, usedIds, counters);
      if (cleaned.length > 0) days[k] = cleaned;
    }
  } else if (raw && Array.isArray(raw.items)) {
    const migrated = sanitizeNodes(raw.items, 0, usedIds, counters);
    if (migrated.length > 0) days[todayKey()] = migrated;
  }
  return { version: 2, nextId: counters.nextId, days: days };
}

function countStats(list) {
  let total = 0;
  let done = 0;
  for (let i = 0; i < list.length; i += 1) {
    total += 1;
    if (list[i].done) done += 1;
    if (list[i].children.length > 0) {
      const sub = countStats(list[i].children);
      total += sub.total;
      done += sub.done;
    }
  }
  return { total: total, done: done };
}

function crossDayStats() {
  const today = todayKey();
  let totalAll = 0;
  let todayTotal = 0;
  let todayDone = 0;
  let otherOpen = 0;
  const keys = Object.keys(state.days);
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    const list = state.days[k];
    if (!Array.isArray(list) || !list.length) continue;
    const st = countStats(list);
    totalAll += st.total;
    if (k === today) {
      todayTotal = st.total;
      todayDone = st.done;
    } else if (st.total > st.done) {
      otherOpen += st.total - st.done;
    }
  }
  return { totalAll: totalAll, todayTotal: todayTotal, todayDone: todayDone, otherOpen: otherOpen };
}

function subtreeHeight(node) {
  if (!node.children.length) return 1;
  let best = 0;
  for (let i = 0; i < node.children.length; i += 1) {
    const h = subtreeHeight(node.children[i]);
    if (h > best) best = h;
  }
  return 1 + best;
}

function findLocator(list, id, parent, depth) {
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i];
    if (node.id === id) {
      return { node: node, list: list, index: i, parent: parent, depth: depth };
    }
    if (node.children.length > 0) {
      const deeper = findLocator(node.children, id, node, depth + 1);
      if (deeper) return deeper;
    }
  }
  return null;
}

function setSubtreeDone(node, done) {
  node.done = done;
  for (let i = 0; i < node.children.length; i += 1) {
    setSubtreeDone(node.children[i], done);
  }
}

function syncParentsAutoDone(list) {
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i];
    if (node.children.length > 0) {
      syncParentsAutoDone(node.children);
      let allDone = true;
      for (let j = 0; j < node.children.length; j += 1) {
        if (!node.children[j].done) {
          allDone = false;
          break;
        }
      }
      node.done = allDone;
    }
  }
}

function setAllCollapsed(list, collapsed) {
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].children.length > 0) {
      list[i].collapsed = collapsed;
      setAllCollapsed(list[i].children, collapsed);
    }
  }
}

function pruneCompleted(list) {
  const kept = [];
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i];
    if (!node.done) {
      if (node.children.length > 0) node.children = pruneCompleted(node.children);
      kept.push(node);
    }
  }
  return kept;
}

function compactEmptyDays() {
  const keys = Object.keys(state.days);
  for (let i = 0; i < keys.length; i += 1) {
    const list = state.days[keys[i]];
    if (!Array.isArray(list) || list.length === 0) {
      delete state.days[keys[i]];
    }
  }
}

function save() {
  if (!loaded) return;
  compactEmptyDays();
  const payload = JSON.stringify(state);
  saveQueue = saveQueue.then(() => pf.data.write(dataFile(), payload)).catch(() => {});
}

// --- Timers (short one-shot only; cancelled on hide & stop) ---

function cancelConfirmTimer() {
  if (confirmTimer) {
    pf.cancel(confirmTimer);
    confirmTimer = 0;
  }
  confirmDelId = null;
}

function cancelNoticeTimer() {
  if (noticeTimer) {
    pf.cancel(noticeTimer);
    noticeTimer = 0;
  }
}

function flashNotice(msg) {
  cancelNoticeTimer();
  notice = msg;
  noticeTimer = pf.after(4, () => {
    noticeTimer = 0;
    notice = "";
    draw(false);
  });
}

function armDeleteConfirm(id) {
  cancelConfirmTimer();
  confirmDelId = id;
  confirmTimer = pf.after(4, () => {
    confirmTimer = 0;
    if (confirmDelId === id) {
      confirmDelId = null;
      draw(false);
    }
  });
}

// --- Mutations ---

function prioColor(prio) {
  if (prio === "high") return "red";
  if (prio === "med") return "orange";
  if (prio === "low") return "blue";
  return undefined;
}

function prioLabel(prio) {
  if (prio === "high") return t.uHigh;
  if (prio === "med") return t.uMed;
  if (prio === "low") return t.uLow;
  return "";
}

function addRootOrPrefixed(rawText) {
  let raw = String(rawText || "").trim();
  let prefixDepth = 0;
  while (raw.startsWith(">") && prefixDepth < MAX_DEPTH - 1) {
    prefixDepth += 1;
    raw = raw.slice(1).trimStart();
  }
  const text = cleanText(raw);
  if (!text) return;

  const totals = crossDayStats();
  if (totals.totalAll >= MAX_NODES) {
    flashNotice(fmt(t.limitReached, MAX_NODES));
    draw(false);
    return;
  }

  const list = currentList();
  const node = {
    id: state.nextId++,
    text: text,
    done: false,
    priority: "none",
    collapsed: false,
    children: []
  };

  if (prefixDepth === 0 || list.length === 0) {
    list.push(node);
  } else {
    let targetList = list;
    let parent = null;
    for (let d = 0; d < prefixDepth; d += 1) {
      if (targetList.length === 0) break;
      parent = targetList[targetList.length - 1];
      parent.collapsed = false;
      targetList = parent.children;
    }
    targetList.push(node);
    if (cfg().autoCompleteParent) syncParentsAutoDone(list);
  }

  notice = "";
  save();
  draw(false);
}

function addSubtask(parentId, rawText) {
  const text = cleanText(rawText);
  addingSubTo = null;
  if (!text) {
    draw(false);
    return;
  }
  const totals = crossDayStats();
  if (totals.totalAll >= MAX_NODES) {
    flashNotice(fmt(t.limitReached, MAX_NODES));
    draw(false);
    return;
  }
  const list = currentList();
  const loc = findLocator(list, parentId, null, 0);
  if (!loc) {
    draw(false);
    return;
  }
  if (loc.depth + 1 >= MAX_DEPTH) {
    flashNotice(fmt(t.depthReached, MAX_DEPTH));
    draw(false);
    return;
  }
  loc.node.collapsed = false;
  loc.node.children.push({
    id: state.nextId++,
    text: text,
    done: false,
    priority: "none",
    collapsed: false,
    children: []
  });
  if (cfg().autoCompleteParent) syncParentsAutoDone(list);
  save();
  draw(false);
}

function renameTask(id, rawText) {
  const text = cleanText(rawText);
  renamingId = null;
  if (text) {
    const loc = findLocator(currentList(), id, null, 0);
    if (loc) {
      loc.node.text = text;
      save();
    }
  }
  draw(false);
}

function toggleDone(id, value) {
  const list = currentList();
  const loc = findLocator(list, id, null, 0);
  if (!loc) return;
  const c = cfg();
  const next = value === true;
  if (c.cascadeDone && loc.node.children.length > 0) {
    setSubtreeDone(loc.node, next);
  } else {
    loc.node.done = next;
  }
  if (c.autoCompleteParent) syncParentsAutoDone(list);
  save();
  draw(false);
}

function toggleFold(id) {
  const loc = findLocator(currentList(), id, null, 0);
  if (!loc || !loc.node.children.length) return;
  loc.node.collapsed = !loc.node.collapsed;
  save();
  draw(false);
}

function setPriority(id, prio) {
  const loc = findLocator(currentList(), id, null, 0);
  if (!loc) return;
  loc.node.priority = loc.node.priority === prio ? "none" : prio;
  save();
  draw(false);
}

function indentTask(id) {
  const list = currentList();
  const loc = findLocator(list, id, null, 0);
  if (!loc || loc.index === 0) return;
  if (loc.depth + subtreeHeight(loc.node) >= MAX_DEPTH) {
    flashNotice(fmt(t.depthReached, MAX_DEPTH));
    draw(false);
    return;
  }
  const prev = loc.list[loc.index - 1];
  loc.list.splice(loc.index, 1);
  prev.collapsed = false;
  prev.children.push(loc.node);
  if (cfg().autoCompleteParent) syncParentsAutoDone(list);
  save();
  draw(false);
}

function outdentTask(id) {
  const list = currentList();
  const loc = findLocator(list, id, null, 0);
  if (!loc || !loc.parent) return;
  const parentLoc = findLocator(list, loc.parent.id, null, 0);
  if (!parentLoc) return;
  loc.list.splice(loc.index, 1);
  parentLoc.list.splice(parentLoc.index + 1, 0, loc.node);
  if (cfg().autoCompleteParent) syncParentsAutoDone(list);
  save();
  draw(false);
}

function deleteTask(id) {
  cancelConfirmTimer();
  const list = currentList();
  const loc = findLocator(list, id, null, 0);
  if (!loc) return;
  loc.list.splice(loc.index, 1);
  if (hoveredId === id) hoveredId = null;
  if (addingSubTo === id) addingSubTo = null;
  if (renamingId === id) renamingId = null;
  if (cfg().autoCompleteParent) syncParentsAutoDone(list);
  save();
  draw(false);
}

function pullAllUnfinishedToToday() {
  cancelConfirmTimer();
  addingSubTo = null;
  renamingId = null;
  const today = todayKey();
  if (!Array.isArray(state.days[today])) state.days[today] = [];
  const keys = Object.keys(state.days).sort();
  let moved = 0;

  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    if (k === today) continue;
    const list = state.days[k];
    if (!Array.isArray(list) || !list.length) continue;
    const stay = [];
    for (let j = 0; j < list.length; j += 1) {
      const node = list[j];
      if (!node.done) {
        state.days[today].push(node);
        moved += countStats([node]).total;
      } else {
        stay.push(node);
      }
    }
    state.days[k] = stay;
  }

  selectedDay = today;
  weekOffset = 0;
  if (moved > 0) {
    save();
    flashNotice(fmt(t.carriedNotice, moved));
  } else {
    flashNotice(t.noCarryNotice);
  }
  draw(false);
}

// --- Single-pass visibility & stats ---

function analyze(list, c) {
  const info = new Map();
  function visit(nodes) {
    let anyVis = false;
    let total = 0;
    let done = 0;
    for (let i = 0; i < nodes.length; i += 1) {
      const n = nodes[i];
      const sub = n.children.length > 0 ? visit(n.children) : { anyVis: false, total: 0, done: 0 };
      total += 1 + sub.total;
      done += (n.done ? 1 : 0) + sub.done;
      let selfOk = true;
      if (c.hideDone && n.done) selfOk = false;
      if (filterMode === "open" && n.done) selfOk = false;
      if (filterMode === "done" && !n.done) selfOk = false;
      const visible = selfOk || sub.anyVis;
      info.set(n.id, {
        visible: visible,
        forceExpand: sub.anyVis && filterMode !== "all",
        subTotal: sub.total,
        subDone: sub.done
      });
      if (visible) anyVis = true;
    }
    return { anyVis: anyVis, total: total, done: done };
  }
  const rootStats = visit(list);
  return { info: info, total: rootStats.total, done: rootStats.done };
}

// --- Native Fluent Glass View Builder ---

function buildWeekRow() {
  const now = new Date(pf.time.now());
  const today = toDayKey(now);
  const start = addDays(mondayOf(now), weekOffset * 7);
  const cells = [
    { id: "wk:prev", text: "‹", width: 24, align: "center", tip: t.prevWeek }
  ];

  for (let i = 0; i < 7; i += 1) {
    const d = addDays(start, i);
    const key = toDayKey(d);
    const list = state.days[key];
    const st = Array.isArray(list) && list.length ? countStats(list) : { total: 0, done: 0 };
    const open = st.total - st.done;
    const isSel = key === selectedDay;
    const isToday = key === today;
    const label = t.weekdays[i] + (open > 0 ? "•" : "");
    const cell = {
      id: "day:" + key,
      text: label,
      fill: true,
      align: "center",
      tip: open > 0 ? fmt(t.dayTipOpen, key, open) : fmt(t.dayTipClean, key)
    };
    if (isSel) {
      cell.checked = true;
      cell.bold = true;
    } else if (isToday) {
      cell.color = "green";
      cell.bold = true;
    } else if (open > 0) {
      cell.color = "orange";
    } else {
      cell.color = "gray";
    }
    cells.push(cell);
  }

  cells.push({ id: "wk:next", text: "›", width: 24, align: "center", tip: t.nextWeek });
  return { cells: cells };
}

function draw(force) {
  if (!loaded) return;
  const c = cfg();
  const rows = [];

  if (c.showWeekBar) {
    rows.push(buildWeekRow());
  }

  const dayList = currentList();
  const analysis = analyze(dayList, c);
  const totals = crossDayStats();

  if (c.showProgressBar && analysis.total > 0) {
    const shortDate = selectedDay.slice(5);
    rows.push({
      text: fmt(t.dayHeader, shortDate, analysis.done, analysis.total),
      size: "small",
      color: analysis.done === analysis.total ? "green" : "gray",
      progress: analysis.done / analysis.total
    });
  }

  if (notice) {
    rows.push({ text: notice, color: "orange", size: "small" });
  }

  let paneMarked = false;
  let visibleTaskRows = 0;
  let omittedRows = 0;

  function markPane(rowObj) {
    if (!paneMarked) {
      rowObj.pane = "list";
      paneMarked = true;
    }
    return rowObj;
  }

  function pushNodes(nodes, depth) {
    for (let i = 0; i < nodes.length; i += 1) {
      const node = nodes[i];
      const meta = analysis.info.get(node.id);
      if (!meta || !meta.visible) continue;

      if (rows.length >= MAX_RENDER_ROWS) {
        omittedRows += 1;
        continue;
      }

      if (depth === 0 && visibleTaskRows > 0) {
        if (rows.length + 2 > MAX_RENDER_ROWS) {
          omittedRows += 1;
          continue;
        }
        rows.push(markPane({ separator: true }));
      }

      const hasKids = node.children.length > 0;
      const expanded = hasKids && (!node.collapsed || meta.forceExpand);

      if (renamingId === node.id) {
        rows.push(markPane({
          input: {
            type: "line",
            id: "ren:" + node.id,
            value: node.text,
            placeholder: t.renamePlaceholder
          }
        }));
      } else {
        const isHover = hoveredId === node.id || confirmDelId === node.id;
        const cells = [];

        if (depth > 0) {
          cells.push({
            text: "└",
            color: "gray",
            width: depth * 16 + 4,
            align: "right"
          });
        }

        const chkCell = {
          id: "chk:" + node.id,
          check: node.done,
          text: "",
          width: 22
        };
        cells.push(chkCell);

        if (meta.subTotal > 0) {
          cells.push({
            id: "fold:" + node.id,
            text: (expanded ? "" : "▸") + meta.subDone + "/" + meta.subTotal,
            color: meta.subDone === meta.subTotal ? "green" : "blue",
            bold: true,
            width: 40,
            align: "center",
            tip: t.foldTip
          });
        }

        if (!isHover && node.priority !== "none") {
          cells.push({
            text: "●",
            color: prioColor(node.priority),
            width: 14,
            align: "center",
            tip: prioLabel(node.priority)
          });
        }

        const textCell = {
          text: node.text,
          fill: true,
          tip: node.text
        };
        if (node.done) {
          textCell.color = "gray";
        } else if (depth === 0) {
          textCell.bold = true;
        }
        cells.push(textCell);

        if (isHover) {
          cells.push({
            id: "p:high:" + node.id,
            text: "●",
            color: "red",
            checked: node.priority === "high",
            width: 20,
            align: "center",
            tip: t.uHigh
          });
          cells.push({
            id: "p:med:" + node.id,
            text: "●",
            color: "orange",
            checked: node.priority === "med",
            width: 20,
            align: "center",
            tip: t.uMed
          });
          cells.push({
            id: "p:low:" + node.id,
            text: "●",
            color: "blue",
            checked: node.priority === "low",
            width: 20,
            align: "center",
            tip: t.uLow
          });
          if (depth + 1 < MAX_DEPTH) {
            cells.push({
              id: "sub:" + node.id,
              text: "+",
              color: "blue",
              bold: true,
              width: 22,
              align: "center",
              tip: t.addSubTip
            });
          }
          const confirming = confirmDelId === node.id;
          const delCell = {
            id: "del:" + node.id,
            text: confirming ? "✓" : "✕",
            color: "red",
            width: 22,
            align: "center",
            tip: confirming ? t.deleteConfirmTip : t.deleteTip
          };
          if (confirming) {
            delCell.checked = true;
            delCell.bold = true;
          }
          cells.push(delCell);
        }

        const rowMenu = [
          { id: "m:sub", title: t.menuAddSub, disabled: depth + 1 >= MAX_DEPTH },
          { id: "m:ren", title: t.menuRename },
          { id: "m:in", title: t.menuIndent, disabled: i === 0 || depth + subtreeHeight(node) >= MAX_DEPTH },
          { id: "m:out", title: t.menuOutdent, disabled: depth === 0 },
          { separator: true },
          { id: "m:urg", title: t.menuUrgent, checked: node.priority === "high" },
          { id: "m:del", title: t.menuDelete }
        ];

        rows.push(markPane({
          id: "r:" + node.id,
          hover: "event",
          cells: cells,
          menu: rowMenu
        }));
      }

      visibleTaskRows += 1;

      if (addingSubTo === node.id) {
        rows.push(markPane({
          input: {
            type: "line",
            id: "addsub:" + node.id,
            value: "",
            placeholder: t.addSubPlaceholder
          }
        }));
      }

      if (expanded) {
        pushNodes(node.children, depth + 1);
      }
    }
  }

  pushNodes(dayList, 0);

  if (visibleTaskRows === 0) {
    rows.push(markPane({
      text: dayList.length === 0 ? t.empty : t.emptyFilter,
      color: "gray",
      size: "small"
    }));
  } else if (omittedRows > 0) {
    rows.push({ text: fmt(t.moreHidden, omittedRows), color: "gray", size: "small" });
  }

  // Bottom native "+" input row
  rows.push({
    input: {
      type: "line",
      id: "add",
      value: "",
      placeholder: t.addPlaceholder
    }
  });

  // Compact footer row: Filter | Pull unfinished to today | Today & Total counts
  const fltLabel = filterMode === "all" ? t.filterAll : (filterMode === "open" ? t.filterOpen : t.filterDone);
  const fltCell = { id: "flt", text: fltLabel, width: 54, align: "center" };
  if (filterMode !== "all") fltCell.checked = true;

  const pullCell = {
    id: "pull",
    text: (totals.otherOpen > 0 ? "↪ " + t.pullBtn + " (" + totals.otherOpen + ")" : "↪ " + t.pullBtn),
    color: totals.otherOpen > 0 ? "orange" : "gray",
    bold: totals.otherOpen > 0,
    tip: t.pullTip
  };

  const statCell = {
    id: "today",
    text: fmt(t.todayStat, totals.todayTotal, totals.totalAll),
    fill: true,
    align: "right",
    color: "gray",
    tip: t.todayTip
  };

  rows.push({ cells: [fltCell, pullCell, statCell] });

  const caption = totals.todayTotal > 0
    ? fmt(t.caption, totals.todayDone, totals.todayTotal).slice(0, 24)
    : "";

  const fenceMenu = [
    { id: "f:today", title: t.fenceToday },
    { id: "f:pull", title: t.fencePull, disabled: totals.otherOpen === 0 },
    { separator: true },
    { id: "f:exp", title: t.fenceExpand, disabled: dayList.length === 0 },
    { id: "f:col", title: t.fenceCollapse, disabled: dayList.length === 0 },
    { id: "f:clear", title: t.fenceClearDone, disabled: analysis.done === 0 }
  ];

  const view = { rows: rows, caption: caption, menu: fenceMenu };
  const json = JSON.stringify(view);
  if (force || json !== shown) {
    shown = json;
    pf.show(view);
  }
}

// --- Load & event wiring ---

async function load() {
  selectedDay = todayKey();
  const raw = await pf.data.read(dataFile()).catch(() => null);
  if (raw) {
    try {
      state = sanitizeState(JSON.parse(raw));
    } catch (_) {
      const kept = pf.fence.id + "-tree-todo.bad.json";
      await pf.data.write(kept, raw).catch(() => {});
      flashNotice(fmt(t.corruptNotice, kept));
      state = { version: 2, nextId: 1, days: {} };
    }
  }
  loaded = true;
  draw(true);
}

function parseRowNum(rowId) {
  if (typeof rowId !== "string" || !rowId.startsWith("r:")) return null;
  const n = Number(rowId.slice(2));
  return Number.isInteger(n) ? n : null;
}

pf.on("start", load);
pf.on("show", () => { draw(false); });
pf.on("hide", () => {
  cancelConfirmTimer();
  cancelNoticeTimer();
  hoveredId = null;
});
pf.on("stop", () => {
  cancelConfirmTimer();
  cancelNoticeTimer();
});
pf.on("settings", () => {
  if (cfg().autoCompleteParent) syncParentsAutoDone(currentList());
  draw(true);
});
pf.on("lang", () => {
  t = getTexts();
  draw(true);
});
pf.on("theme", () => { draw(true); });
pf.on("timechange", () => { draw(true); });

pf.on("enter", (e) => {
  const n = parseRowNum(e && e.row);
  if (n === null || hoveredId === n) return;
  if (confirmDelId !== null && confirmDelId !== n) cancelConfirmTimer();
  hoveredId = n;
  draw(false);
});

pf.on("leave", (e) => {
  const n = parseRowNum(e && e.row);
  if (n !== null && hoveredId === n) {
    hoveredId = null;
    if (confirmDelId === n) cancelConfirmTimer();
    draw(false);
  }
});

pf.on("change", (e) => {
  if (!e || typeof e.id !== "string") return;
  if (e.id.startsWith("chk:")) {
    const id = Number(e.id.slice(4));
    if (Number.isInteger(id)) toggleDone(id, e.value === true);
  }
});

pf.on("dblclick", (e) => {
  const n = parseRowNum(e && e.id);
  if (n !== null) {
    renamingId = n;
    addingSubTo = null;
    draw(false);
  }
});

pf.on("click", (e) => {
  if (!e || typeof e.id !== "string") return;
  const id = e.id;

  if (id === "wk:prev") {
    weekOffset -= 1;
    draw(false);
  } else if (id === "wk:next") {
    weekOffset += 1;
    draw(false);
  } else if (id.startsWith("day:")) {
    const key = id.slice(4);
    if (parseDayKey(key) && key !== selectedDay) {
      selectedDay = key;
      hoveredId = null;
      addingSubTo = null;
      renamingId = null;
      cancelConfirmTimer();
      draw(false);
    }
  } else if (id === "flt") {
    filterMode = filterMode === "all" ? "open" : (filterMode === "open" ? "done" : "all");
    draw(false);
  } else if (id === "pull") {
    pullAllUnfinishedToToday();
  } else if (id === "today") {
    selectedDay = todayKey();
    weekOffset = 0;
    hoveredId = null;
    addingSubTo = null;
    renamingId = null;
    cancelConfirmTimer();
    draw(false);
  } else if (id.startsWith("fold:")) {
    const n = Number(id.slice(5));
    if (Number.isInteger(n)) toggleFold(n);
  } else if (id.startsWith("sub:")) {
    const n = Number(id.slice(4));
    if (Number.isInteger(n)) {
      addingSubTo = addingSubTo === n ? null : n;
      renamingId = null;
      const loc = findLocator(currentList(), n, null, 0);
      if (loc) loc.node.collapsed = false;
      draw(false);
    }
  } else if (id.startsWith("p:")) {
    const parts = id.split(":");
    const prio = parts[1];
    const n = Number(parts[2]);
    if (PRIORITIES.indexOf(prio) > 0 && Number.isInteger(n)) setPriority(n, prio);
  } else if (id.startsWith("del:")) {
    const n = Number(id.slice(4));
    if (!Number.isInteger(n)) return;
    if (confirmDelId === n) {
      deleteTask(n);
    } else {
      armDeleteConfirm(n);
      draw(false);
    }
  }
});

pf.on("text", (e) => {
  if (!e || typeof e.id !== "string") return;
  if (e.id === "add") {
    addRootOrPrefixed(e.text);
  } else if (e.id.startsWith("addsub:")) {
    const n = Number(e.id.slice(7));
    if (Number.isInteger(n)) addSubtask(n, e.text);
  } else if (e.id.startsWith("ren:")) {
    const n = Number(e.id.slice(4));
    if (Number.isInteger(n)) renameTask(n, e.text);
  }
});

pf.on("command", (c) => {
  if (!c || typeof c.id !== "string") return;
  const cmd = c.id;

  if (cmd === "f:today") {
    selectedDay = todayKey();
    weekOffset = 0;
    draw(false);
    return;
  }
  if (cmd === "f:pull") {
    pullAllUnfinishedToToday();
    return;
  }
  if (cmd === "f:exp") {
    setAllCollapsed(currentList(), false);
    save();
    draw(false);
    return;
  }
  if (cmd === "f:col") {
    setAllCollapsed(currentList(), true);
    save();
    draw(false);
    return;
  }
  if (cmd === "f:clear") {
    state.days[selectedDay] = pruneCompleted(currentList());
    save();
    draw(false);
    return;
  }

  const rowNum = parseRowNum(c.row);
  if (rowNum === null) return;
  if (cmd === "m:sub") {
    addingSubTo = rowNum;
    renamingId = null;
    const loc = findLocator(currentList(), rowNum, null, 0);
    if (loc) loc.node.collapsed = false;
    draw(false);
  } else if (cmd === "m:ren") {
    renamingId = rowNum;
    addingSubTo = null;
    draw(false);
  } else if (cmd === "m:in") {
    indentTask(rowNum);
  } else if (cmd === "m:out") {
    outdentTask(rowNum);
  } else if (cmd === "m:urg") {
    setPriority(rowNum, "high");
  } else if (cmd === "m:del") {
    deleteTask(rowNum);
  }
});
