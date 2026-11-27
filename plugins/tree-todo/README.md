# Tree To-do 多层级待办 (Kite Style)

A minimal, Kite-inspired multi-level to-do outline for PecoFence desktop fences.

## Features

- **Minimal UI**: clean weekly date bar + bordered task card + bottom full-width `+` button.
- **Outliner keyboard flow**:
  - Click the bottom `+` button (or press `Enter`) to create a new inline task.
  - Press `Tab` while typing to nest the task under the item above; press `Shift+Tab` to move it up one level (up to 8 levels).
  - Press `Enter` to save and immediately create the next task below at the same level.
- **Hover-only actions**: hovering a task reveals urgency color tags (red / amber / blue), the blue `+` subtask button, and the delete button.
- **Subtask progress pills**: parent tasks display a green `done/total` pill right before the title; click it to fold/unfold subtasks.
- **Offline & private**: per-fence local storage (`<fence-id>-tree-todo.json`), zero network requests, zero permissions.

---

极简仿 Kite 手感的多层级桌面待办：

- **极简界面**：顶部周日历条 + 列表卡片 + 底部整行 `+` 按钮，无多余干扰。
- **丝滑键盘流**：
  - 点击底部 `+`（或直接按 `Enter`）在原地创建新待办；
  - 输入时按 **`Tab`** 自动归属为上一项的子层级，按 **`Shift+Tab`** 向上减小层级（最多 8 级）；
  - 按 **`Enter`** 保存并立刻向下创建下一条同级待办。
- **悬停浮现操作**：仅当鼠标悬停在某条任务上时，右侧才显示紧急程度颜色标签（红 / 黄 / 蓝）、蓝色 `+` 子任务按钮和删除图标。
- **子任务进度胶囊**：父任务标题前显示绿色 `0/1` 胶囊，点击即可折叠/展开子任务。
- **纯本地离线**：按栅栏独立保存，不联网、无需任何权限。
