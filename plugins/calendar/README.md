# Calendar 月历

An offline monthly Gregorian calendar that lives in a PecoFence desktop fence.

- **Month browsing**: use `<`, `Today`, and `>` (or the fence's right-click menu) to step through
  months and jump back to the current month.
- **Readable at any fence width**: native navigation controls stay pinned above the scrollable date
  grid when the fence has enough height (and remain reachable from the right-click menu at any
  height), while the weekday header and 6-row date grid render on aligned canvases that adapt
  cleanly to narrow (300 DIP) and wide fences.
- **Today highlight & rolled-up date**: marks today with bold text and a rounded outline, and
  optionally shows today's `YYYY-MM-DD` date in the rolled-up title bar (`caption`).
- **Customizable per fence**: choose Monday or Sunday as the first day of the week, toggle ISO-8601
  week numbers, toggle the rolled-up date caption, or enable larger calendar grid text in *Plugin
  settings*.

## Permissions & privacy

- **No permissions**: declares `permissions: {}` — no network, clipboard, system, folder,
  notification, or background permissions.
- **Offline**: makes no network requests and writes no plugin data files itself. PecoFence stores
  per-fence settings and caches the last shown view locally so the fence draws immediately on
  startup.
- **Minimal date refresh**: reads `pf.time.now()`, `pf.time.format`, and local `Date` only to
  identify today's local date, locate the next local date boundary (including DST transitions),
  render the calendar grid, and schedule a single `pf.after` refresh for local midnight (capped at
  15 minutes while visible so the date also catches up after Windows sleep). The timer is cancelled
  while the fence is hidden.

---

完全离线的桌面月历插件，常驻于 PecoFence 栅栏中。

- **自由翻月**：通过 `<`、`今天`、`>` 按钮或栅栏右键菜单快速切换月份与回到本月。
- **自适应排版**：当栅栏高度足够时，顶部原生导航栏会固定在可滚动网格上方（高度不足时仍可通过右键菜单切换月份）；星期标题与 6×7 日期网格由画布精准对齐绘制，在 300 DIP 窄栅栏与宽栅栏下都能清晰显示。
- **今日高亮与收起日期**：今日以粗体加圆角边框醒目标记，收起栅栏时可在标题栏（`caption`）显示本地今日日期 `YYYY-MM-DD`。
- **独立设置**：可在「插件设置」中切换每周第一天（星期一／星期日）、开关 ISO 周数、开关收起标题栏日期，或启用加大月历字号。

## 权限与隐私

- **零权限**：声明 `permissions: {}`，不申请网络、剪贴板、系统命令、文件夹、通知或后台运行权限。
- **完全离线**：不联网，插件自身不写入任何数据文件；PecoFence 会保存每栅栏设置并在本机缓存最近一次显示的画面供下次启动即时呈现。
- **轻量跨日刷新**：仅用 `pf.time.now()`、`pf.time.format` 与本地 `Date` 判断今日日期、定位下一个本地日界（兼容夏令时跳变），并在可见时预约单个 `pf.after` 定时器于本地午夜换日（上限 15 分钟以兼容系统睡眠唤醒）；栅栏隐藏时自动取消定时器。
