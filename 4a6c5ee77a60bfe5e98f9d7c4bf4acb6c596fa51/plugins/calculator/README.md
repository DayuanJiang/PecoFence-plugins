# Calculator 计算器

An offline inline expression calculator that lives in a PecoFence desktop fence.

- **Safe math expressions**: supports `+`, `-`, `*`, `/` (plus Unicode `−`, `×`, `÷`), right-associative
  power `^` (`-2^2 = -4`, `2^-3 = 0.125`, `2^3^2 = 512`), postfix percent `%` (`200 + 10% = 200.1`,
  `2^50% = sqrt(2)`), parentheses, constants (`pi`, `π`, `e`, `ans`), and functions (`sqrt`, `abs`,
  `round`, `floor`, `ceil`, `ln`, `log`, `sin`, `cos`, `tan`, `pow`, `mod`, `min`, `max`). Explicit
  `*` is required for multiplication (e.g. `2*pi`, `2*(3+4)`).
- **Keyboard flow**: click the top line, type an expression, and press `Enter` (or click away) to
  evaluate; press `Esc` to cancel without changing the previous result. Reuse `ans` to continue from
  the last full-precision answer.
- **History & one-click copy**: keeps up to 16 recent calculations per fence with right-click
  actions to copy a result, reuse an expression, or delete an entry. Click the Copy button (or use
  the fence menu) to copy the canonical ASCII result (formatted up to 15 significant digits for
  ordinary floats, while preserving full exact digits for safe integers and range-boundary values so
  copied results remain finite and accurate; full binary64 precision is preserved internally for
  `ans`).
- **Per-fence settings**: choose Degrees (`DEG`, default) or Radians (`RAD`) for trigonometry, and
  optionally show the last result in the rolled-up title bar (`caption`, off by default).

## Permissions & privacy

- **`clipboard` (`write`)**: used only when you explicitly click the Copy button or choose *Copy
  result* from the menu, writing that calculation's canonical numeric text to the Windows clipboard.
  Calculator never reads the clipboard.
- **Offline & local storage**: runs zero network requests and zero timers. Each fence stores up to
  16 successful expressions, their results, angle mode, and last `ans` locally in
  `<fence id>-calc.json`. PecoFence may also cache the last visible view locally for fast startup.

---

完全离线的桌面行内算式计算器，常驻于 PecoFence 栅栏中。

- **安全数学解析**：支持 `+`、`-`、`*`、`/`（以及 `−`、`×`、`÷`）、右结合乘方 `^`（`-2^2 = -4`、`2^-3 = 0.125`、`2^3^2 = 512`）、后缀百分号 `%`（`200 + 10% = 200.1`）、括号、常量（`pi`、`π`、`e`、`ans`）与常用函数（`sqrt`、`abs`、`round`、`floor`、`ceil`、`ln`、`log`、`sin`、`cos`、`tan`、`pow`、`mod`、`min`、`max`）。乘法需显式写出 `*`（如 `2*pi`、`2*(3+4)`）。
- **快捷输入**：点击顶部输入框键入算式，按 `Enter` 或点击外部即可求值，按 `Esc` 取消。可通过 `ans` 基于上次完整精度结果继续运算。
- **历史与一键复制**：每个栅栏保存最近 16 条计算记录，右键可复制结果、重用算式或删除记录；点击复制按钮或菜单可将规范化数值文本写入剪贴板（一般浮点数按最多 15 位有效数字规范化，安全整数与极值边界保留完整有效位以确保可复制且不溢出，内部 `ans` 保留完整双精度值）。
- **独立设置**：可在「插件设置」中切换角度／弧度（默认 `DEG`），以及是否启用收起标题栏显示上次结果（默认关闭）。

## 权限与隐私

- **`clipboard`（`write`）**：仅在你主动点击复制按钮或右键选择「复制结果」时将当前计算结果的规范文本写入 Windows 剪贴板，绝不读取剪贴板内容。
- **完全离线**：不联网，不使用任何定时器。每个栅栏的最近 16 条算式与上次结果保存在本机 `<fence id>-calc.json`；PecoFence 另可能在本机缓存最近一次显示的画面以加快启动。
