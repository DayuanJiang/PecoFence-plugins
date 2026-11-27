# Tree To-do 多层级待办

A native lightweight (`light` layer, ~100 KB memory, no WebView2) multi-level to-do outline that blends directly into a PecoFence desktop glass fence.

## Features

- **Ultra-lightweight & native Fluent glass**: runs in PecoFence's built-in QuickJS engine (~100 KB RAM), with native checkboxes, progress bar, accent buttons, scrollable list pane, and rolled-up title bar progress (`To-do 2/5`).
- **Multi-level hierarchy (up to 6 levels)**:
  - Click the bottom `+` line to add a task; prefix with `>` (or `>>`) to nest directly under the previous task.
  - Hover any row and click `+` to add a subtask right underneath it, or right-click a row to indent, outdent, or rename.
  - Parent tasks show a clickable `done/total` progress badge to fold or unfold subtasks.
- **Hover-only quick actions**: hovering a row reveals red/amber/blue urgency dots, `+` subtask button, and a two-step delete button (first click turns into a red `✓`, second click deletes).
- **Weekly date bar & move unfinished to today**: switch Monday–Sunday views with dots marking open days, and click **To today** in the footer to move all unfinished tasks from other days to today.
- **Offline & private**: stores per-fence data locally via `pf.data` (`<fence-id>-tree-todo.json`), compatible with v1 data. Zero permissions, zero network calls.

---

原生轻量级（`light` 层，约 **100 KB 内存**，不使用网页/WebView2）多层级桌面待办，直接融入 PecoFence 原生毛玻璃栅栏：

- **极致轻量与原生玻璃风格**：不再弹出“用网页显示内容、占用内存较多”提示；采用原生复选框、原生当日进度条、可滚动任务区以及收起后的标题栏进度（如 `待办 2/5`）。
- **多层级任务管理（最多 6 级）**：
  - 点击底部 `+` 行添加待办，输入前缀 `>`（或 `>>`）可直接归属为上一项的子任务；
  - 悬停任意任务点 `+` 原地添加子任务，双击或右键支持重命名、缩进（降级）、提升一级；
  - 父任务显示可点击的 `已完成/总数` 进度角标，点击折叠或展开子任务。
- **仅悬停显示右侧操作**：鼠标移到某条任务上才显示红/黄/蓝紧急颜色标签、`+` 子任务和二段确认删除（点一次变红勾 `✓`，再点一次删除）。
- **周日历条 & 未完成一键挪到今天**：顶部周一至周日切换，底部「↪ 挪到今天」一键将其他日期未完成的任务全部顺延至今天。
- **纯本地离线**：沿用原数据文件（平滑兼容 v1 数据），零权限、不联网、静置零定时消耗。
