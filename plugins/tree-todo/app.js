// Tree To-do: Minimal Kite-style multi-level desktop to-do outline for PecoFence.
// Memory & performance architecture:
// - Delegated event listeners on #tree-list (O(1) listeners regardless of tree size)
// - Single shared hover action bar lazily attached to the hovered row (~78% fewer DOM nodes)
// - Single-pass O(N) bottom-up tree analysis + cached SVG prototypes + dirty-flag partial renders
// - Coalesced storage writes (120ms debounce, flushed immediately on hide/pagehide)
// Zero network calls, zero inline styles, strict DOM/SVG APIs only.
"use strict";

(function () {
  const MAX_NODES = 600;
  const MAX_DEPTH = 8;
  const MAX_TEXT = 300;
  const PRIORITIES = ["none", "high", "med", "low"];
  const FALLBACK_STORAGE_KEY = "pecofence-tree-todo-preview-v2";
  const SVG_NS = "http://www.w3.org/2000/svg";
  const SAVE_DEBOUNCE_MS = 120;
  const SEARCH_DEBOUNCE_MS = 50;

  const I18N = {
    en: {
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      editPlaceholder: "Type task (Enter: next, Tab: nest, Shift+Tab: outdent)...",
      searchPlaceholder: "Search...",
      filterAll: "All",
      filterOpen: "Open",
      filterDone: "Done",
      expandAll: "Expand all",
      collapseAll: "Collapse all",
      carryOver: "Move all open to today",
      pullTodayTip: "Move all unfinished tasks to today",
      clearDone: "Clear done",
      empty: "Click + below or press Enter to add a task.",
      emptyFilter: "No matching tasks.",
      addSubTip: "Add subtask",
      deleteTip: "Delete",
      deleteConfirmTip: "Click again to confirm delete",
      foldTip: "Fold / unfold subtasks",
      filterTip: "Filter & search",
      toolboxTip: "Quick actions",
      prevWeekTip: "Previous week",
      nextWeekTip: "Next week",
      todayJumpTip: "Jump to today",
      todayShort: "Today {0}",
      totalShort: "All {0}",
      uHigh: "Urgent (Red)",
      uMed: "Important (Amber)",
      uLow: "Normal (Blue)",
      limitReached: "At most {0} tasks per fence.",
      depthReached: "Maximum nesting depth is {0} levels.",
      corruptNotice: "Saved data was unreadable; backup saved as {0}.",
      carriedNotice: "Moved {0} unfinished task(s) to today.",
      noCarryNotice: "No unfinished tasks on other days."
    },
    "zh-CN": {
      weekdays: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
      editPlaceholder: "输入待办（Enter 向下加，Tab 缩进，Shift+Tab 升一级）…",
      searchPlaceholder: "搜索任务…",
      filterAll: "全部",
      filterOpen: "未完成",
      filterDone: "已完成",
      expandAll: "全部展开",
      collapseAll: "全部折叠",
      carryOver: "未完成全部挪到今天",
      pullTodayTip: "将其他日期的未完成全部挪到今天",
      clearDone: "清理已完成",
      empty: "点击下方「+」或直接按 Enter 创建待办",
      emptyFilter: "没有符合条件的任务",
      addSubTip: "添加子任务",
      deleteTip: "删除",
      deleteConfirmTip: "再次点击确认删除",
      foldTip: "点击折叠或展开子任务",
      filterTip: "筛选与搜索",
      toolboxTip: "整理工具",
      prevWeekTip: "上一周",
      nextWeekTip: "下一周",
      todayJumpTip: "回到今天",
      todayShort: "今 {0}",
      totalShort: "总 {0}",
      uHigh: "紧急（红）",
      uMed: "较急（黄）",
      uLow: "普通（蓝）",
      limitReached: "单个栅栏最多保存 {0} 条任务。",
      depthReached: "最多支持 {0} 级嵌套。",
      corruptNotice: "旧数据读取失败，已备份为 {0}。",
      carriedNotice: "已将 {0} 条未完成任务挪到今天。",
      noCarryNotice: "其他日期没有未完成的任务。"
    },
    "zh-TW": {
      weekdays: ["週一", "週二", "週三", "週四", "週五", "週六", "週日"],
      editPlaceholder: "輸入待辦（Enter 向下加，Tab 縮排，Shift+Tab 升一級）…",
      searchPlaceholder: "搜尋任務…",
      filterAll: "全部",
      filterOpen: "未完成",
      filterDone: "已完成",
      expandAll: "全部展開",
      collapseAll: "全部摺疊",
      carryOver: "未完成全部挪到今天",
      pullTodayTip: "將其他日期的未完成全部挪到今天",
      clearDone: "清理已完成",
      empty: "點擊下方「+」或直接按 Enter 建立待辦",
      emptyFilter: "沒有符合條件的任務",
      addSubTip: "新增子任務",
      deleteTip: "刪除",
      deleteConfirmTip: "再次點擊確認刪除",
      foldTip: "點擊摺疊或展開子任務",
      filterTip: "篩選與搜尋",
      toolboxTip: "整理工具",
      prevWeekTip: "上一週",
      nextWeekTip: "下一週",
      todayJumpTip: "回到今天",
      todayShort: "今 {0}",
      totalShort: "總 {0}",
      uHigh: "緊急（紅）",
      uMed: "較急（黃）",
      uLow: "普通（藍）",
      limitReached: "單個柵欄最多儲存 {0} 條任務。",
      depthReached: "最多支援 {0} 級巢狀。",
      corruptNotice: "舊資料讀取失敗，已備份為 {0}。",
      carriedNotice: "已將 {0} 條未完成任務挪到今天。",
      noCarryNotice: "其他日期沒有未完成的任務。"
    }
  };

  const hasPf = typeof window.pf !== "undefined" && window.pf !== null;

  function getLang() {
    const raw = hasPf && typeof window.pf.lang === "string"
      ? window.pf.lang
      : (navigator.language || "zh-CN");
    if (I18N[raw]) return raw;
    const low = raw.toLowerCase();
    if (low.startsWith("zh-tw") || low.startsWith("zh-hk")) return "zh-TW";
    if (low.startsWith("zh")) return "zh-CN";
    return "en";
  }

  let t = I18N[getLang()] || I18N.en;

  function fmt(template, a) {
    return String(template).replace("{0}", String(a));
  }

  function getSettings() {
    const defaults = {
      showWeekBar: true,
      hideDone: false,
      autoCompleteParent: true,
      cascadeDone: true,
      compactMode: false
    };
    if (hasPf && window.pf.settings && typeof window.pf.settings === "object") {
      return Object.assign(defaults, window.pf.settings);
    }
    return defaults;
  }

  function dataFileName() {
    const fenceId = hasPf && window.pf.fence && typeof window.pf.fence.id === "string"
      ? window.pf.fence.id
      : "preview";
    return fenceId + "-tree-todo.json";
  }

  // --- Date helpers ---

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function toDayKey(date) {
    return date.getFullYear() + "-" + pad2(date.getMonth() + 1) + "-" + pad2(date.getDate());
  }

  function parseDayKey(key) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
    if (!m) return null;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function addDays(date, delta) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + delta);
  }

  function mondayOf(date) {
    const day = date.getDay();
    return addDays(date, day === 0 ? -6 : 1 - day);
  }

  function todayKey() {
    return toDayKey(new Date());
  }

  // --- Cached SVG icon templates (cloned in O(1) instead of rebuilding attributes) ---

  function makeSvg(paths, sizeClass) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add(sizeClass || "ico");
    for (let i = 0; i < paths.length; i++) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", paths[i]);
      svg.appendChild(p);
    }
    return svg;
  }

  const SVG_CHECK_SM = makeSvg(["M5 13l4 4L19 7"], "ico-sm");
  const SVG_CHECK_MD = makeSvg(["M5 13l4 4L19 7"], "ico");
  const SVG_TRASH_MD = makeSvg([
    "M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14", "M10 11v6", "M14 11v6"
  ], "ico");
  const SVG_PLUS_MD = makeSvg(["M12 5v14", "M5 12h14"], "ico");
  const SVG_PLUS_LG = makeSvg(["M12 5v14", "M5 12h14"], "ico-lg");
  const SVG_CHEVRON_L = makeSvg(["M15 18l-6-6 6-6"], "ico");
  const SVG_CHEVRON_R = makeSvg(["M9 18l6-6-6-6"], "ico");
  const SVG_FILTER = makeSvg(["M4 6h16", "M7 12h10", "M10 18h4"], "ico-lg");
  const SVG_INBOX = makeSvg([
    "M4 13V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6",
    "M4 13h4l2 3h4l2-3h4v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
  ], "ico-lg");
  const SVG_PULL_TODAY = makeSvg(["M9 14l-4-4 4-4", "M5 10h11a4 4 0 0 1 0 8h-1"], "ico-lg");

  // --- App state ---

  let state = { version: 2, nextId: 1, days: {} };
  let selectedDay = todayKey();
  let weekOffset = 0;
  let filterMode = "all";
  let filterOpen = false;
  let toolboxOpen = false;
  let searchQuery = "";
  let editingId = null;
  let draftNodeId = null;
  let hoveredRowId = null;
  let confirmDeleteId = null;
  let confirmDeleteTimer = null;
  let noticeMsg = "";
  let noticeTimer = null;
  let saveTimer = null;
  let saveDirty = false;
  let searchTimer = null;
  let isRestructuring = false;
  let dragSourceId = null;
  let lastDropRow = null;
  let saveQueue = Promise.resolve();

  // Dirty flags & O(1) lookup caches
  let labelsDirty = true;
  let weekDirty = true;
  let statsDirty = true;
  let cachedTotalAcrossDays = 0;
  let cachedTodayCount = 0;
  let cachedHasOtherOpen = false;
  let nodeById = new Map();

  // DOM refs
  const weekBar = document.getElementById("week-bar");
  const btnPrevWeek = document.getElementById("btn-prev-week");
  const btnNextWeek = document.getElementById("btn-next-week");
  const weekDaysEl = document.getElementById("week-days");
  const noticeBar = document.getElementById("notice-bar");
  const filterBar = document.getElementById("filter-bar");
  const filterPills = document.getElementById("filter-pills");
  const searchInput = document.getElementById("search-input");
  const toolboxBar = document.getElementById("toolbox-bar");
  const btnExpandAll = document.getElementById("btn-expand-all");
  const btnCollapseAll = document.getElementById("btn-collapse-all");
  const btnCarryOver = document.getElementById("btn-carry-over");
  const btnClearDone = document.getElementById("btn-clear-done");
  const treeList = document.getElementById("tree-list");
  const btnBigAdd = document.getElementById("btn-big-add");
  const btnFilterToggle = document.getElementById("btn-filter-toggle");
  const btnToolboxToggle = document.getElementById("btn-toolbox-toggle");
  const btnPullToday = document.getElementById("btn-pull-today");
  const btnTodayStat = document.getElementById("btn-today-stat");
  const totalStat = document.getElementById("total-stat");

  // --- Single Shared Hover Action Bar (1 instance total instead of N per tree) ---

  const sharedActions = document.createElement("div");
  sharedActions.className = "node-actions";

  const urgencyGroup = document.createElement("div");
  urgencyGroup.className = "urgency-group";
  const uDotEls = {};
  const URGENCY_KEYS = [
    { key: "high", cls: "u-high" },
    { key: "med", cls: "u-med" },
    { key: "low", cls: "u-low" }
  ];
  for (let u = 0; u < URGENCY_KEYS.length; u++) {
    const spec = URGENCY_KEYS[u];
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "u-dot " + spec.cls;
    dot.setAttribute("data-act", "prio");
    dot.setAttribute("data-prio", spec.key);
    urgencyGroup.appendChild(dot);
    uDotEls[spec.key] = dot;
  }
  sharedActions.appendChild(urgencyGroup);

  const sharedAddSubBtn = document.createElement("button");
  sharedAddSubBtn.type = "button";
  sharedAddSubBtn.className = "act-plus";
  sharedAddSubBtn.setAttribute("data-act", "add-sub");
  sharedAddSubBtn.appendChild(SVG_PLUS_MD.cloneNode(true));
  sharedActions.appendChild(sharedAddSubBtn);

  const sharedDelBtn = document.createElement("button");
  sharedDelBtn.type = "button";
  sharedDelBtn.className = "act-icon danger";
  sharedDelBtn.setAttribute("data-act", "del");
  const sharedDelTrash = SVG_TRASH_MD.cloneNode(true);
  const sharedDelCheck = SVG_CHECK_MD.cloneNode(true);
  sharedDelBtn.appendChild(sharedDelTrash);
  sharedActions.appendChild(sharedDelBtn);

  function syncSharedActionsLabels() {
    uDotEls.high.title = t.uHigh;
    uDotEls.med.title = t.uMed;
    uDotEls.low.title = t.uLow;
    sharedAddSubBtn.title = t.addSubTip;
  }

  function syncSharedActionsForNode(id, depth) {
    const node = nodeById.get(id);
    if (!node) return;
    uDotEls.high.classList.toggle("active", node.priority === "high");
    uDotEls.med.classList.toggle("active", node.priority === "med");
    uDotEls.low.classList.toggle("active", node.priority === "low");
    sharedAddSubBtn.disabled = depth + 1 >= MAX_DEPTH;

    const confirming = confirmDeleteId === id;
    sharedDelBtn.classList.toggle("confirming", confirming);
    sharedDelBtn.title = confirming ? t.deleteConfirmTip : t.deleteTip;
    const desiredIcon = confirming ? sharedDelCheck : sharedDelTrash;
    if (sharedDelBtn.firstChild !== desiredIcon) {
      sharedDelBtn.replaceChildren(desiredIcon);
    }
  }

  function attachSharedActionsToRow(row) {
    if (!row) return;
    const id = Number(row.getAttribute("data-id"));
    const depth = Number(row.getAttribute("data-depth"));
    if (!Number.isInteger(id)) return;
    hoveredRowId = id;
    syncSharedActionsForNode(id, depth);
    if (sharedActions.parentNode !== row) {
      row.appendChild(sharedActions);
    }
  }

  function detachSharedActions() {
    if (sharedActions.parentNode) {
      sharedActions.parentNode.removeChild(sharedActions);
    }
  }

  // --- Data sanitization & tree helpers ---

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
    for (let i = 0; i < list.length; i++) {
      if (counters.total >= MAX_NODES) break;
      const src = list[i];
      if (!src || typeof src !== "object") continue;
      const text = cleanText(src.text);
      if (!text) continue;
      let id = Number.isInteger(src.id) && src.id > 0 && !usedIds.has(src.id) ? src.id : counters.nextId++;
      usedIds.add(id);
      if (id >= counters.nextId) counters.nextId = id + 1;
      const prio = PRIORITIES.includes(src.priority) ? src.priority : "none";
      counters.total++;
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

  function sanitizeState(rawData) {
    const usedIds = new Set();
    const counters = {
      nextId: Number.isInteger(rawData && rawData.nextId) && rawData.nextId > 0 ? rawData.nextId : 1,
      total: 0
    };
    const days = {};
    if (rawData && rawData.days && typeof rawData.days === "object") {
      const keys = Object.keys(rawData.days);
      for (let i = 0; i < keys.length; i++) {
        const k = keys[i];
        if (!parseDayKey(k)) continue;
        const cleaned = sanitizeNodes(rawData.days[k], 0, usedIds, counters);
        if (cleaned.length > 0) days[k] = cleaned;
      }
    } else if (rawData && Array.isArray(rawData.items)) {
      const migrated = sanitizeNodes(rawData.items, 0, usedIds, counters);
      if (migrated.length > 0) days[todayKey()] = migrated;
    }
    return { version: 2, nextId: counters.nextId, days: days };
  }

  function stripEmptyDrafts(list) {
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      const text = cleanText(n.text);
      const kids = stripEmptyDrafts(n.children);
      if (!text && kids.length === 0) continue;
      out.push({
        id: n.id,
        text: text,
        done: n.done === true,
        priority: PRIORITIES.includes(n.priority) ? n.priority : "none",
        collapsed: n.collapsed === true,
        children: kids
      });
    }
    return out;
  }

  function countDayStats(list) {
    let total = 0;
    let done = 0;
    for (let i = 0; i < list.length; i++) {
      const n = list[i];
      const hasKids = n.children.length > 0;
      if (!n.text && !hasKids) continue;
      total++;
      if (n.done) done++;
      if (hasKids) {
        const sub = countDayStats(n.children);
        total += sub.total;
        done += sub.done;
      }
    }
    return { total: total, done: done };
  }

  function recomputeCrossDayStats() {
    const today = todayKey();
    let totalAll = 0;
    let todayTotal = 0;
    let otherOpen = false;
    const keys = Object.keys(state.days);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const list = state.days[k];
      if (!Array.isArray(list) || !list.length) continue;
      const st = countDayStats(list);
      totalAll += st.total;
      if (k === today) {
        todayTotal = st.total;
      } else if (st.total > st.done) {
        otherOpen = true;
      }
    }
    cachedTotalAcrossDays = totalAll;
    cachedTodayCount = todayTotal;
    cachedHasOtherOpen = otherOpen;
    statsDirty = false;
  }

  function markDataChanged() {
    weekDirty = true;
    statsDirty = true;
  }

  function subtreeHeight(node) {
    if (!node.children.length) return 1;
    let maxChild = 0;
    for (let i = 0; i < node.children.length; i++) {
      const h = subtreeHeight(node.children[i]);
      if (h > maxChild) maxChild = h;
    }
    return 1 + maxChild;
  }

  function findLocator(list, id, parent, depth) {
    for (let i = 0; i < list.length; i++) {
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

  function isDescendant(ancestor, candidateId) {
    if (ancestor.id === candidateId) return true;
    for (let i = 0; i < ancestor.children.length; i++) {
      if (isDescendant(ancestor.children[i], candidateId)) return true;
    }
    return false;
  }

  function setSubtreeDone(node, done) {
    node.done = done;
    for (let i = 0; i < node.children.length; i++) {
      setSubtreeDone(node.children[i], done);
    }
  }

  function syncParentsAutoDone(list) {
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if (node.children.length > 0) {
        syncParentsAutoDone(node.children);
        let realCount = 0;
        let allDone = true;
        for (let j = 0; j < node.children.length; j++) {
          const c = node.children[j];
          if (!c.text && c.children.length === 0) continue;
          realCount++;
          if (!c.done) allDone = false;
        }
        if (realCount > 0) node.done = allDone;
      }
    }
  }

  function setAllCollapsed(list, collapsed) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].children.length > 0) {
        list[i].collapsed = collapsed;
        setAllCollapsed(list[i].children, collapsed);
      }
    }
  }

  function pruneCompleted(list) {
    const kept = [];
    for (let i = 0; i < list.length; i++) {
      const node = list[i];
      if (!node.done) {
        if (node.children.length > 0) node.children = pruneCompleted(node.children);
        kept.push(node);
      }
    }
    return kept;
  }

  // --- Single-pass O(N) tree analysis (stats + visibility + O(1) id map) ---

  function analyzeTree(list, queryLower, settings) {
    const infoMap = new Map();
    const idMap = new Map();
    let removableDone = 0;

    function visit(nodes) {
      let anyVisible = false;
      let totalHere = 0;
      let doneHere = 0;

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        idMap.set(node.id, node);
        const sub = node.children.length > 0
          ? visit(node.children)
          : { anyVisible: false, total: 0, done: 0 };

        const isReal = Boolean(node.text) || sub.total > 0;
        if (isReal) {
          totalHere += 1 + sub.total;
          doneHere += (node.done ? 1 : 0) + sub.done;
        }
        if (node.done) {
          removableDone += 1 + sub.total;
        }

        let selfMatches = true;
        if (node.id !== editingId) {
          if (settings.hideDone && node.done) selfMatches = false;
          if (filterMode === "open" && node.done) selfMatches = false;
          if (filterMode === "done" && !node.done) selfMatches = false;
          if (queryLower && node.text.toLowerCase().indexOf(queryLower) === -1) {
            selfMatches = false;
          }
        }
        const visible = selfMatches || sub.anyVisible;
        const forceExpand = sub.anyVisible && (Boolean(queryLower) || filterMode !== "all" || editingId !== null);
        infoMap.set(node.id, {
          visible: visible,
          forceExpand: forceExpand,
          subTotal: sub.total,
          subDone: sub.done
        });
        if (visible) anyVisible = true;
      }

      return { anyVisible: anyVisible, total: totalHere, done: doneHere };
    }

    visit(list);
    nodeById = idMap;
    return { infoMap: infoMap, removableDone: removableDone };
  }

  // --- Coalesced Persistence (debounced 120ms, immediate flush on hide/unload) ---

  function flushSaveNow() {
    if (saveTimer !== null) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    if (!saveDirty) return;
    saveDirty = false;

    const cleanDays = {};
    const keys = Object.keys(state.days);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const stripped = stripEmptyDrafts(state.days[k] || []);
      if (stripped.length > 0) cleanDays[k] = stripped;
    }
    const serialized = JSON.stringify({
      version: 2,
      nextId: state.nextId,
      days: cleanDays
    });

    if (hasPf) {
      saveQueue = saveQueue
        .then(function () { return window.pf.data.write(dataFileName(), serialized); })
        .catch(function () {});
    } else {
      try {
        window.localStorage.setItem(FALLBACK_STORAGE_KEY, serialized);
      } catch (err) {
        // Ignore preview quota errors.
      }
    }
  }

  function scheduleSave() {
    saveDirty = true;
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSaveNow, SAVE_DEBOUNCE_MS);
  }

  async function loadState() {
    let raw = null;
    if (hasPf) {
      try {
        raw = await window.pf.data.read(dataFileName());
      } catch (err) {
        raw = null;
      }
    } else {
      try {
        raw = window.localStorage.getItem(FALLBACK_STORAGE_KEY);
      } catch (err) {
        raw = null;
      }
    }

    if (typeof raw === "string" && raw.trim()) {
      try {
        state = sanitizeState(JSON.parse(raw));
      } catch (err) {
        const backupName = dataFileName().replace(/\.json$/, ".bad.json");
        if (hasPf) {
          await window.pf.data.write(backupName, raw).catch(function () {});
        }
        noticeMsg = fmt(t.corruptNotice, backupName);
        state = { version: 2, nextId: 1, days: {} };
      }
    }
    markDataChanged();
    render();
  }

  // --- Outliner editing & tree mutations ---

  function showNotice(msg, autoClearMs) {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    noticeMsg = msg;
    renderNotice();
    if (autoClearMs > 0) {
      noticeTimer = setTimeout(function () {
        noticeTimer = null;
        noticeMsg = "";
        renderNotice();
      }, autoClearMs);
    }
  }

  function clearNotice() {
    if (noticeTimer !== null) {
      clearTimeout(noticeTimer);
      noticeTimer = null;
    }
    if (noticeMsg) {
      noticeMsg = "";
      renderNotice();
    }
  }

  function clearDeleteConfirm(syncUi) {
    if (confirmDeleteTimer !== null) {
      clearTimeout(confirmDeleteTimer);
      confirmDeleteTimer = null;
    }
    const prev = confirmDeleteId;
    confirmDeleteId = null;
    if (syncUi && prev !== null && hoveredRowId === prev && sharedActions.parentNode) {
      const depth = Number(sharedActions.parentNode.getAttribute("data-depth")) || 0;
      syncSharedActionsForNode(prev, depth);
    }
  }

  function armDeleteConfirm(id) {
    clearDeleteConfirm(false);
    confirmDeleteId = id;
    if (sharedActions.parentNode) {
      const depth = Number(sharedActions.parentNode.getAttribute("data-depth")) || 0;
      syncSharedActionsForNode(id, depth);
    }
    confirmDeleteTimer = setTimeout(function () {
      confirmDeleteTimer = null;
      if (confirmDeleteId === id) {
        clearDeleteConfirm(true);
      }
    }, 3500);
  }

  function focusActiveEdit(caretPos) {
    const input = treeList.querySelector(".inline-edit");
    if (!input) return;
    input.focus();
    const pos = typeof caretPos === "number" ? caretPos : input.value.length;
    try {
      input.setSelectionRange(pos, pos);
    } catch (err) {
      // Ignore selection errors.
    }
  }

  function removeNodeById(id) {
    const list = currentList();
    const loc = findLocator(list, id, null, 0);
    if (!loc) return;
    loc.list.splice(loc.index, 1);
    if (editingId === id) editingId = null;
    if (draftNodeId === id) draftNodeId = null;
    if (hoveredRowId === id) hoveredRowId = null;
    if (getSettings().autoCompleteParent) {
      syncParentsAutoDone(list);
    }
  }

  function createDraftAtBottom() {
    if (statsDirty) recomputeCrossDayStats();
    if (cachedTotalAcrossDays >= MAX_NODES) {
      showNotice(fmt(t.limitReached, MAX_NODES), 3000);
      return;
    }
    const list = currentList();
    const node = {
      id: state.nextId++,
      text: "",
      done: false,
      priority: "none",
      collapsed: false,
      children: []
    };
    list.push(node);
    editingId = node.id;
    draftNodeId = node.id;
    clearNotice();
    render();
    focusActiveEdit(0);
  }

  function createDraftChild(parentId) {
    if (statsDirty) recomputeCrossDayStats();
    if (cachedTotalAcrossDays >= MAX_NODES) {
      showNotice(fmt(t.limitReached, MAX_NODES), 3000);
      return;
    }
    const list = currentList();
    const loc = findLocator(list, parentId, null, 0);
    if (!loc) return;
    if (loc.depth + 1 >= MAX_DEPTH) {
      showNotice(fmt(t.depthReached, MAX_DEPTH), 3000);
      return;
    }
    const node = {
      id: state.nextId++,
      text: "",
      done: false,
      priority: "none",
      collapsed: false,
      children: []
    };
    loc.node.collapsed = false;
    loc.node.children.push(node);
    editingId = node.id;
    draftNodeId = node.id;
    clearNotice();
    render();
    focusActiveEdit(0);
  }

  function createDraftSiblingAfter(anchorId) {
    if (statsDirty) recomputeCrossDayStats();
    if (cachedTotalAcrossDays >= MAX_NODES) {
      showNotice(fmt(t.limitReached, MAX_NODES), 3000);
      editingId = null;
      draftNodeId = null;
      render();
      return;
    }
    const list = currentList();
    const loc = findLocator(list, anchorId, null, 0);
    if (!loc) return;
    const node = {
      id: state.nextId++,
      text: "",
      done: false,
      priority: "none",
      collapsed: false,
      children: []
    };
    loc.list.splice(loc.index + 1, 0, node);
    editingId = node.id;
    draftNodeId = node.id;
    clearNotice();
    render();
    focusActiveEdit(0);
  }

  function commitEdit(id, rawText, createNextBelow) {
    const text = cleanText(rawText);
    const list = currentList();
    const loc = findLocator(list, id, null, 0);
    if (!loc) {
      editingId = null;
      draftNodeId = null;
      render();
      return;
    }

    if (!text) {
      if (loc.node.children.length === 0) {
        loc.list.splice(loc.index, 1);
      }
      editingId = null;
      draftNodeId = null;
      if (getSettings().autoCompleteParent) {
        syncParentsAutoDone(list);
      }
      markDataChanged();
      scheduleSave();
      render();
      return;
    }

    loc.node.text = text;
    if (draftNodeId === id) draftNodeId = null;
    if (getSettings().autoCompleteParent) {
      syncParentsAutoDone(list);
    }
    markDataChanged();
    scheduleSave();

    if (createNextBelow) {
      createDraftSiblingAfter(id);
    } else {
      editingId = null;
      render();
    }
  }

  function indentNodeWhileEditing(id, currentValue, caretPos) {
    const list = currentList();
    const loc = findLocator(list, id, null, 0);
    if (!loc || loc.index === 0) return;
    const prevSibling = loc.list[loc.index - 1];
    if (loc.depth + 1 + subtreeHeight(loc.node) - 1 >= MAX_DEPTH) {
      showNotice(fmt(t.depthReached, MAX_DEPTH), 3000);
      return;
    }
    loc.node.text = String(currentValue || "").slice(0, MAX_TEXT);
    loc.list.splice(loc.index, 1);
    prevSibling.collapsed = false;
    prevSibling.children.push(loc.node);
    if (getSettings().autoCompleteParent) {
      syncParentsAutoDone(list);
    }
    clearNotice();
    if (cleanText(loc.node.text)) {
      markDataChanged();
      scheduleSave();
    }
    isRestructuring = true;
    render();
    isRestructuring = false;
    focusActiveEdit(caretPos);
  }

  function outdentNodeWhileEditing(id, currentValue, caretPos) {
    const list = currentList();
    const loc = findLocator(list, id, null, 0);
    if (!loc || !loc.parent) return;
    const parentLoc = findLocator(list, loc.parent.id, null, 0);
    if (!parentLoc) return;
    loc.node.text = String(currentValue || "").slice(0, MAX_TEXT);
    loc.list.splice(loc.index, 1);
    parentLoc.list.splice(parentLoc.index + 1, 0, loc.node);
    if (getSettings().autoCompleteParent) {
      syncParentsAutoDone(list);
    }
    clearNotice();
    if (cleanText(loc.node.text)) {
      markDataChanged();
      scheduleSave();
    }
    isRestructuring = true;
    render();
    isRestructuring = false;
    focusActiveEdit(caretPos);
  }

  function toggleDone(id) {
    const list = currentList();
    const loc = findLocator(list, id, null, 0);
    if (!loc) return;
    const nextDone = !loc.node.done;
    const settings = getSettings();
    if (settings.cascadeDone && loc.node.children.length > 0) {
      setSubtreeDone(loc.node, nextDone);
    } else {
      loc.node.done = nextDone;
    }
    if (settings.autoCompleteParent) {
      syncParentsAutoDone(list);
    }
    markDataChanged();
    scheduleSave();
    render();
  }

  function toggleCollapse(id) {
    const node = nodeById.get(id);
    if (!node || !node.children.length) return;
    node.collapsed = !node.collapsed;
    scheduleSave();
    render();
  }

  function setPriority(id, prio) {
    const node = nodeById.get(id);
    if (!node) return;
    node.priority = node.priority === prio ? "none" : prio;
    scheduleSave();
    // Fast O(1) DOM update without rebuilding the whole tree
    const row = treeList.querySelector('.node-row[data-id="' + id + '"]');
    if (row) {
      const chk = row.querySelector(".chk-btn");
      if (chk) {
        chk.classList.remove("prio-high", "prio-med", "prio-low");
        if (node.priority !== "none") chk.classList.add("prio-" + node.priority);
      }
      const depth = Number(row.getAttribute("data-depth")) || 0;
      syncSharedActionsForNode(id, depth);
    }
  }

  function deleteTask(id) {
    clearDeleteConfirm(false);
    removeNodeById(id);
    clearNotice();
    markDataChanged();
    scheduleSave();
    render();
  }

  function moveNode(sourceId, targetId, position) {
    if (sourceId === targetId) return;
    const list = currentList();
    const src = findLocator(list, sourceId, null, 0);
    const dst = findLocator(list, targetId, null, 0);
    if (!src || !dst || isDescendant(src.node, targetId)) return;

    const newDepth = position === "inside" ? dst.depth + 1 : dst.depth;
    if (newDepth + subtreeHeight(src.node) - 1 >= MAX_DEPTH) {
      showNotice(fmt(t.depthReached, MAX_DEPTH), 3000);
      return;
    }

    src.list.splice(src.index, 1);
    const freshDst = findLocator(list, targetId, null, 0);
    if (!freshDst) return;

    if (position === "inside") {
      freshDst.node.collapsed = false;
      freshDst.node.children.push(src.node);
    } else if (position === "before") {
      freshDst.list.splice(freshDst.index, 0, src.node);
    } else {
      freshDst.list.splice(freshDst.index + 1, 0, src.node);
    }

    if (getSettings().autoCompleteParent) {
      syncParentsAutoDone(list);
    }
    clearNotice();
    markDataChanged();
    scheduleSave();
    render();
  }

  function carryOverUnfinishedToToday() {
    if (draftNodeId !== null) removeNodeById(draftNodeId);
    editingId = null;
    draftNodeId = null;
    clearDeleteConfirm(false);

    const today = todayKey();
    const keys = Object.keys(state.days).sort();
    let movedCount = 0;
    if (!Array.isArray(state.days[today])) {
      state.days[today] = [];
    }
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (k === today) continue;
      const list = state.days[k];
      if (!Array.isArray(list) || !list.length) continue;
      const stay = [];
      for (let j = 0; j < list.length; j++) {
        const node = list[j];
        if (!node.done) {
          state.days[today].push(node);
          movedCount += countDayStats([node]).total;
        } else {
          stay.push(node);
        }
      }
      state.days[k] = stay;
    }

    selectedDay = today;
    weekOffset = 0;
    markDataChanged();
    if (movedCount > 0) {
      scheduleSave();
      showNotice(fmt(t.carriedNotice, movedCount), 3000);
    } else {
      showNotice(t.noCarryNotice, 2500);
    }
    render();
  }

  // --- Rendering (dirty-flagged static/week + single-pass lean DOM) ---

  function initStaticIcons() {
    btnPrevWeek.replaceChildren(SVG_CHEVRON_L.cloneNode(true));
    btnNextWeek.replaceChildren(SVG_CHEVRON_R.cloneNode(true));
    btnBigAdd.replaceChildren(SVG_PLUS_LG.cloneNode(true));
    btnFilterToggle.replaceChildren(SVG_FILTER.cloneNode(true));
    btnToolboxToggle.replaceChildren(SVG_INBOX.cloneNode(true));
    btnPullToday.replaceChildren(SVG_PULL_TODAY.cloneNode(true));
  }

  function applyStaticLabels() {
    btnPrevWeek.title = t.prevWeekTip;
    btnNextWeek.title = t.nextWeekTip;
    searchInput.placeholder = t.searchPlaceholder;
    btnExpandAll.textContent = t.expandAll;
    btnCollapseAll.textContent = t.collapseAll;
    btnCarryOver.textContent = t.carryOver;
    btnClearDone.textContent = t.clearDone;
    btnFilterToggle.title = t.filterTip;
    btnToolboxToggle.title = t.toolboxTip;
    btnPullToday.title = t.pullTodayTip;
    btnTodayStat.title = t.todayJumpTip;
    syncSharedActionsLabels();

    const pills = filterPills.querySelectorAll(".filter-pill");
    for (let i = 0; i < pills.length; i++) {
      const f = pills[i].getAttribute("data-filter");
      pills[i].textContent = f === "all" ? t.filterAll : (f === "open" ? t.filterOpen : t.filterDone);
    }
    labelsDirty = false;
  }

  function syncFilterPillsActive() {
    const pills = filterPills.querySelectorAll(".filter-pill");
    for (let i = 0; i < pills.length; i++) {
      pills[i].classList.toggle("active", pills[i].getAttribute("data-filter") === filterMode);
    }
  }

  function renderWeekBar() {
    const settings = getSettings();
    weekBar.classList.toggle("hidden", !settings.showWeekBar);
    weekDirty = false;
    if (!settings.showWeekBar) return;

    const now = new Date();
    const today = toDayKey(now);
    const start = addDays(mondayOf(now), weekOffset * 7);
    const frag = document.createDocumentFragment();

    for (let i = 0; i < 7; i++) {
      const d = addDays(start, i);
      const key = toDayKey(d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day-cell";
      btn.setAttribute("data-day", key);
      if (key === selectedDay) btn.classList.add("selected");
      if (key === today) btn.classList.add("is-today");

      const wd = document.createElement("span");
      wd.className = "day-wd";
      wd.textContent = t.weekdays[i];

      const md = document.createElement("span");
      md.className = "day-md";
      md.textContent = pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());

      btn.appendChild(wd);
      btn.appendChild(md);

      const list = state.days[key];
      if (Array.isArray(list) && list.length > 0) {
        const st = countDayStats(list);
        if (st.total > st.done) {
          const dot = document.createElement("span");
          dot.className = "day-dot";
          btn.appendChild(dot);
        }
      }
      frag.appendChild(btn);
    }

    weekDaysEl.replaceChildren(frag);
  }

  function renderNotice() {
    if (noticeMsg) {
      noticeBar.textContent = noticeMsg;
      noticeBar.classList.remove("hidden");
    } else {
      noticeBar.textContent = "";
      noticeBar.classList.add("hidden");
    }
  }

  function clearDropIndicator() {
    if (lastDropRow) {
      lastDropRow.classList.remove("drop-before", "drop-inside", "drop-after");
      lastDropRow = null;
    }
  }

  function buildNodeElement(node, depth, infoMap) {
    const info = infoMap.get(node.id);
    if (!info || !info.visible) return null;

    const wrap = document.createElement("div");
    wrap.className = depth === 0 ? "node-wrap root-group" : "node-wrap";

    const row = document.createElement("div");
    row.className = "node-row depth-" + Math.min(depth, MAX_DEPTH - 1);
    row.setAttribute("role", "treeitem");
    row.setAttribute("aria-level", String(depth + 1));
    row.setAttribute("data-id", String(node.id));
    row.setAttribute("data-depth", String(depth));
    if (depth > 0) row.classList.add("is-sub");
    if (node.done) row.classList.add("is-done");
    if (editingId === node.id) row.classList.add("is-editing");

    const hasChildren = node.children.length > 0;
    const isExpanded = hasChildren && (!node.collapsed || info.forceExpand);
    if (hasChildren) {
      row.setAttribute("aria-expanded", String(isExpanded));
    }
    row.draggable = editingId !== node.id;

    // 1. Custom rounded-square checkbox (no per-row listener: handled by delegation)
    const chkBtn = document.createElement("button");
    chkBtn.type = "button";
    chkBtn.className = "chk-btn";
    chkBtn.setAttribute("role", "checkbox");
    chkBtn.setAttribute("aria-checked", String(node.done));
    chkBtn.setAttribute("data-act", "check");
    if (node.done) {
      chkBtn.classList.add("checked");
      chkBtn.appendChild(SVG_CHECK_SM.cloneNode(true));
    }
    if (node.priority !== "none") {
      chkBtn.classList.add("prio-" + node.priority);
    }
    row.appendChild(chkBtn);

    // 2. Signature Kite emerald green progress pill (precomputed O(1) stats)
    if (info.subTotal > 0) {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = isExpanded ? "progress-pill" : "progress-pill folded";
      pill.title = t.foldTip;
      pill.setAttribute("data-act", "fold");
      pill.textContent = (isExpanded ? "" : "▸ ") + info.subDone + "/" + info.subTotal;
      row.appendChild(pill);
    }

    // 3. Inline editor or task text (only the active edited row gets input listeners)
    if (editingId === node.id) {
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.className = "inline-edit";
      editInput.maxLength = MAX_TEXT;
      editInput.value = node.text;
      editInput.placeholder = t.editPlaceholder;

      let handled = false;
      editInput.addEventListener("keydown", function (ev) {
        if (ev.key === "Tab") {
          ev.preventDefault();
          ev.stopPropagation();
          const pos = editInput.selectionStart;
          if (ev.shiftKey) {
            outdentNodeWhileEditing(node.id, editInput.value, pos);
          } else {
            indentNodeWhileEditing(node.id, editInput.value, pos);
          }
        } else if (ev.key === "Enter") {
          ev.preventDefault();
          ev.stopPropagation();
          handled = true;
          commitEdit(node.id, editInput.value, true);
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          ev.stopPropagation();
          handled = true;
          commitEdit(node.id, editInput.value, false);
        }
      });

      editInput.addEventListener("blur", function () {
        if (handled || isRestructuring) return;
        handled = true;
        commitEdit(node.id, editInput.value, false);
      });

      row.appendChild(editInput);
    } else {
      const textSpan = document.createElement("span");
      textSpan.className = "node-text";
      textSpan.textContent = node.text;
      textSpan.title = node.text;
      row.appendChild(textSpan);
    }

    wrap.appendChild(row);

    if (isExpanded) {
      for (let c = 0; c < node.children.length; c++) {
        const childEl = buildNodeElement(node.children[c], depth + 1, infoMap);
        if (childEl) wrap.appendChild(childEl);
      }
    }

    return wrap;
  }

  function render() {
    const settings = getSettings();
    document.body.classList.toggle("compact", settings.compactMode === true);
    if (labelsDirty) applyStaticLabels();
    syncFilterPillsActive();
    if (weekDirty) renderWeekBar();
    if (statsDirty) recomputeCrossDayStats();
    renderNotice();

    btnFilterToggle.classList.toggle("active", filterOpen || filterMode !== "all" || Boolean(searchQuery));
    filterBar.classList.toggle("hidden", !filterOpen);
    btnToolboxToggle.classList.toggle("active", toolboxOpen);
    toolboxBar.classList.toggle("hidden", !toolboxOpen);
    btnPullToday.classList.toggle("has-badge", cachedHasOtherOpen);

    btnTodayStat.textContent = fmt(t.todayShort, cachedTodayCount);
    totalStat.textContent = fmt(t.totalShort, cachedTotalAcrossDays);

    const dayList = currentList();
    const queryLower = searchQuery.trim().toLowerCase();
    const analysis = analyzeTree(dayList, queryLower, settings);
    btnClearDone.disabled = analysis.removableDone === 0;

    // Detach shared hover bar safely before replacing tree children
    detachSharedActions();

    const frag = document.createDocumentFragment();
    let renderedCount = 0;
    for (let i = 0; i < dayList.length; i++) {
      const el = buildNodeElement(dayList[i], 0, analysis.infoMap);
      if (el) {
        frag.appendChild(el);
        renderedCount++;
      }
    }

    if (renderedCount === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = dayList.length === 0 ? t.empty : t.emptyFilter;
      frag.appendChild(empty);
    }

    treeList.replaceChildren(frag);

    // Re-attach shared hover bar if mouse is hovering a row
    if (hoveredRowId !== null) {
      const hoveredRow = treeList.querySelector('.node-row[data-id="' + hoveredRowId + '"]');
      if (hoveredRow) {
        attachSharedActionsToRow(hoveredRow);
      } else {
        hoveredRowId = null;
      }
    }
  }

  // --- Delegated Listeners on #tree-list (O(1) total listeners) ---

  treeList.addEventListener("pointerover", function (ev) {
    const row = ev.target.closest(".node-row");
    if (!row) return;
    const id = Number(row.getAttribute("data-id"));
    if (hoveredRowId === id && sharedActions.parentNode === row) return;
    if (confirmDeleteId !== null && confirmDeleteId !== id) {
      clearDeleteConfirm(false);
    }
    attachSharedActionsToRow(row);
  });

  treeList.addEventListener("pointerleave", function () {
    hoveredRowId = null;
    clearDeleteConfirm(false);
    detachSharedActions();
  });

  treeList.addEventListener("mousedown", function (ev) {
    const actBtn = ev.target.closest("[data-act]");
    if (!actBtn) return;
    const act = actBtn.getAttribute("data-act");
    if (act === "prio" || act === "add-sub" || act === "del") {
      ev.preventDefault();
    }
  });

  treeList.addEventListener("click", function (ev) {
    const actBtn = ev.target.closest("[data-act]");
    if (!actBtn) return;
    const row = actBtn.closest(".node-row");
    if (!row) return;
    const id = Number(row.getAttribute("data-id"));
    if (!Number.isInteger(id)) return;

    const act = actBtn.getAttribute("data-act");
    if (act === "check") {
      toggleDone(id);
    } else if (act === "fold") {
      toggleCollapse(id);
    } else if (act === "prio") {
      setPriority(id, actBtn.getAttribute("data-prio"));
    } else if (act === "add-sub") {
      createDraftChild(id);
    } else if (act === "del") {
      if (confirmDeleteId === id) {
        deleteTask(id);
      } else {
        armDeleteConfirm(id);
      }
    }
  });

  treeList.addEventListener("dblclick", function (ev) {
    const textEl = ev.target.closest(".node-text");
    if (!textEl) return;
    const row = textEl.closest(".node-row");
    if (!row) return;
    const id = Number(row.getAttribute("data-id"));
    if (!Number.isInteger(id)) return;
    editingId = id;
    draftNodeId = null;
    render();
    focusActiveEdit();
  });

  treeList.addEventListener("dragstart", function (ev) {
    const row = ev.target.closest(".node-row");
    if (!row || !row.draggable) return;
    dragSourceId = Number(row.getAttribute("data-id"));
    row.classList.add("dragging");
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = "move";
      ev.dataTransfer.setData("text/plain", String(dragSourceId));
    }
  });

  treeList.addEventListener("dragend", function (ev) {
    const row = ev.target.closest(".node-row");
    if (row) row.classList.remove("dragging");
    dragSourceId = null;
    clearDropIndicator();
  });

  treeList.addEventListener("dragover", function (ev) {
    if (dragSourceId === null) return;
    const row = ev.target.closest(".node-row");
    if (!row) return;
    const targetId = Number(row.getAttribute("data-id"));
    if (targetId === dragSourceId) return;
    ev.preventDefault();
    clearDropIndicator();
    const rect = row.getBoundingClientRect();
    const ratio = (ev.clientY - rect.top) / Math.max(rect.height, 1);
    if (ratio < 0.28) row.classList.add("drop-before");
    else if (ratio > 0.72) row.classList.add("drop-after");
    else row.classList.add("drop-inside");
    lastDropRow = row;
  });

  treeList.addEventListener("drop", function (ev) {
    if (dragSourceId === null) return;
    const row = ev.target.closest(".node-row");
    if (!row) return;
    ev.preventDefault();
    const srcId = dragSourceId;
    const targetId = Number(row.getAttribute("data-id"));
    let pos = "inside";
    if (row.classList.contains("drop-before")) pos = "before";
    else if (row.classList.contains("drop-after")) pos = "after";
    clearDropIndicator();
    dragSourceId = null;
    if (Number.isInteger(targetId)) moveNode(srcId, targetId, pos);
  });

  // Delegated week day selection
  weekDaysEl.addEventListener("click", function (ev) {
    const btn = ev.target.closest(".day-cell");
    if (!btn) return;
    const key = btn.getAttribute("data-day");
    if (!key || key === selectedDay) return;
    if (draftNodeId !== null) removeNodeById(draftNodeId);
    editingId = null;
    draftNodeId = null;
    hoveredRowId = null;
    clearDeleteConfirm(false);
    selectedDay = key;
    weekDirty = true;
    clearNotice();
    render();
  });

  // --- Wire UI controls ---

  btnPrevWeek.addEventListener("click", function () {
    weekOffset--;
    weekDirty = true;
    renderWeekBar();
  });

  btnNextWeek.addEventListener("click", function () {
    weekOffset++;
    weekDirty = true;
    renderWeekBar();
  });

  btnBigAdd.addEventListener("click", createDraftAtBottom);

  document.addEventListener("keydown", function (ev) {
    if (ev.key !== "Enter" || ev.ctrlKey || ev.altKey || ev.metaKey) return;
    const tag = document.activeElement ? document.activeElement.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    ev.preventDefault();
    createDraftAtBottom();
  });

  btnFilterToggle.addEventListener("click", function () {
    filterOpen = !filterOpen;
    if (filterOpen) toolboxOpen = false;
    render();
    if (filterOpen) searchInput.focus();
  });

  filterPills.addEventListener("click", function (ev) {
    const btn = ev.target.closest(".filter-pill");
    if (!btn) return;
    const next = btn.getAttribute("data-filter");
    if (next && next !== filterMode) {
      filterMode = next;
      render();
    }
  });

  searchInput.addEventListener("input", function () {
    searchQuery = searchInput.value;
    if (searchTimer !== null) clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      searchTimer = null;
      render();
    }, SEARCH_DEBOUNCE_MS);
  });

  btnToolboxToggle.addEventListener("click", function () {
    toolboxOpen = !toolboxOpen;
    if (toolboxOpen) filterOpen = false;
    render();
  });

  btnExpandAll.addEventListener("click", function () {
    setAllCollapsed(currentList(), false);
    scheduleSave();
    render();
  });

  btnCollapseAll.addEventListener("click", function () {
    setAllCollapsed(currentList(), true);
    scheduleSave();
    render();
  });

  btnCarryOver.addEventListener("click", carryOverUnfinishedToToday);
  btnPullToday.addEventListener("click", carryOverUnfinishedToToday);

  btnClearDone.addEventListener("click", function () {
    const list = currentList();
    const pruned = pruneCompleted(list);
    if (pruned.length === list.length) {
      // Check if nested items changed by comparing stats
      const before = countDayStats(list).total;
      const after = countDayStats(pruned).total;
      if (before === after) return;
    }
    state.days[selectedDay] = pruned;
    markDataChanged();
    scheduleSave();
    render();
  });

  btnTodayStat.addEventListener("click", function () {
    if (draftNodeId !== null) removeNodeById(draftNodeId);
    selectedDay = todayKey();
    weekOffset = 0;
    editingId = null;
    draftNodeId = null;
    hoveredRowId = null;
    clearDeleteConfirm(false);
    weekDirty = true;
    render();
  });

  // Flush any pending coalesced save when page hides/unloads
  window.addEventListener("pagehide", flushSaveNow);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) flushSaveNow();
  });

  // --- PecoFence runtime integration ---

  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    document.body.classList.toggle("light", next === "light");
    document.body.classList.toggle("dark", next !== "light");
  }

  initStaticIcons();

  if (hasPf) {
    applyTheme(window.pf.theme);
    window.pf.on("theme", applyTheme);
    window.pf.on("settings", function () {
      if (getSettings().autoCompleteParent) {
        syncParentsAutoDone(currentList());
      }
      weekDirty = true;
      render();
    });
    window.pf.on("lang", function () {
      t = I18N[getLang()] || I18N.en;
      labelsDirty = true;
      weekDirty = true;
      render();
    });
    window.pf.on("timechange", function () {
      weekDirty = true;
      statsDirty = true;
      render();
    });
    window.pf.on("hide", function () {
      document.body.classList.add("paused");
      if (searchTimer !== null) {
        clearTimeout(searchTimer);
        searchTimer = null;
      }
      clearDeleteConfirm(false);
      clearNotice();
      flushSaveNow();
    });
    window.pf.on("show", function () {
      document.body.classList.remove("paused");
      render();
    });
  } else {
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  loadState();
})();
