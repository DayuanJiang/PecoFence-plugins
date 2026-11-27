# Tally 计数器

Named desktop counters for a PecoFence fence — track cups of water, workouts, calls, bugs triaged,
or anything else directly on your desktop.

- **Quick stepping**: click `−` or `+`, or scroll the mouse wheel over any counter row, to adjust
  its count (clamped to `±999999`).
- **Multiple counters**: type a name in the bottom input and press `Enter` (or use *Add counter*
  from the fence menu) to keep up to 20 independent counters per fence.
- **Per-counter & fence menus**: right-click a counter row to reset it to 0, rename it inline, or
  remove it. Right-click the fence to add a counter, reset all to 0, or sort by name.
- **Rolled-up title bar**: while rolled up, the fence title bar shows the counter's live value
  (when there is one counter) or the combined total across all counters via `caption`.

## Permissions & privacy

- **No permissions**: requests no network, clipboard, system, folder, notification, or background
  permissions.
- **No timers**: runs zero background or interval timers; renders only in response to user actions.
- **Offline**: makes no network requests and sends nothing off this computer. Counter data is saved
  locally per fence in `<fence id>-tally.json`.

---

桌面上的多组命名计数器，适合随手记录喝水杯数、锻炼组数、电话次数或待处理事项。

- **快捷增减**：点击每行的 `−` / `+` 按钮，或在计数行上滚动鼠标滚轮即可增减数值（范围 `±999999`）。
- **多组计数**：在底部输入框输入名称并按 `Enter`（或在栅栏右键菜单中点「添加计数器」），每个栅栏最多可保存 20 个独立计数器。
- **右键管理**：右键单行计数器可归零、内联重命名或删除；右键栅栏可添加计数器、全部归零或按名称排序。
- **收起标题栏实时显示**：收起栅栏后，标题栏会自动显示当前单个计数器的值或全部计数器的总计。

## 权限与隐私

- **零权限**：不申请网络、剪贴板、系统命令、文件夹、通知或后台运行等任何权限。
- **无定时器**：不使用任何后台或周期定时器，仅在用户交互时更新画面。
- **完全离线**：不联网，不向外部发送任何数据。计数状态按栅栏分别保存在本机 `<fence id>-tally.json`。
