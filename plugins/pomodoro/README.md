# Pomodoro 番茄钟

A focus and break timer that lives in a desktop fence. Start a focus session, pause or resume at
any time, skip to the next phase, or switch directly between Focus, Short break and Long break from
the fence's right-click menu.

- **Live rolled-up title**: while running or paused mid-session, rolling up the fence displays the
  remaining countdown in the title bar (`caption`). When idle, the title bar shows the fence name
  and the countdown stops.
- **Progress & daily count**: displays a phase progress bar and counts completed focus sessions and
  minutes for the current calendar day. A visible fence clears yesterday's totals at local
  midnight, including while idle or paused. A hidden fence catches up when shown again.
- **Per-fence settings**: customize focus length, short break, long break, sessions per long break,
  auto-start next phase, and notification sound in the fence menu under *Plugin settings*.

## Permissions & privacy

- **`notify`**: displays PecoFence's corner notification card (and optional Windows sound) when a
  focus session or break ends.
- **`background`**: allows an active timer to finish and notify on time even while the fence is
  hidden or on another virtual desktop. A paused or idle fence with daily totals schedules only
  the next midnight refresh while visible.
- **Offline**: makes no network requests and sends nothing off this computer. State is stored
  locally per fence in `<fence id>-pomodoro.json`.

---

桌面上轻巧的专注与休息计时器。可随时开始、暂停、继续、跳过或重置，也可在栅栏右键菜单中直接切换专注、短休息与长休息。

- **收起标题栏倒计时**：计时运行中或中途暂停时，收起栅栏后标题栏会显示剩余时间；空闲时恢复显示栅栏名称并停止倒计时。
- **进度条与今日统计**：显示当前阶段进度条，并统计今日已完成的专注次数与分钟数。可见的栅栏即使空闲或暂停，也会在本地午夜清除昨日统计。隐藏的栅栏会在再次显示时更新。
- **独立设置**：可在栅栏菜单的「插件设置」中调整专注时长、短休息、长休息、长休息前专注轮数、是否自动开始下一阶段及提醒提示音。

## 权限与隐私

- **`notify`**：专注或休息结束时弹出 PecoFence 角落提醒卡片（可关闭提示音）。
- **`background`**：使运行中的计时器在栅栏隐藏或切换虚拟桌面时仍能准时提醒。暂停或空闲时，只有可见且有今日统计的栅栏才安排一次午夜刷新。
- **完全离线**：不联网，不向外部发送任何数据。计时状态按栅栏分别保存在本机 `<fence id>-pomodoro.json`。
