# 1.4 快捷键与操作速查表

> 一页纸搞定日常操作。可以打印贴在显示器边。

---

## 画布导航

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 平移画布 | 中键拖动 / Alt + 左键 | — |
| 缩放画布 | 鼠标滚轮 | — |
| 缩放到选中 | 选中组件后滚轮快速缩放 | 或右键 → Zoom to Objects |
| 缩放到全部 | 双击空白处 / 滚轮快速缩放到最大 | — |
| 框选 | 左键框拖 | 相交即选中（不用完全包含） |
| 框选（完全包含） | Ctrl + 左键框拖 | 完全框住才选中 |
| 取消选择 | Esc / 点击空白 | — |

## 组件操作

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 移动组件 | 左键拖动 | — |
| 复制组件 | Ctrl + C / Ctrl + V / 拖动时按住 Alt | 拖动复制比剪贴板快 |
| 删除组件 | Delete / Backspace | 连出的线一起删 |
| 复制为引用（实例） | 拖动时按住 Shift | 改一个全变——用的时候小心 |
| 批量排列 | 右键组件 → Duplicate Array | 适合规则网格 |
| 折叠/展开 | 点击组件左上角 ▼ 小三角 | 折叠后只显示标题，省空间 |
| 折叠全部 | Ctrl + Shift + F | Focus 模式：所有组件只显示标题 |
| 解锁 | 右键组件 → Lock / Unlock | 锁定后不能移动，防误操作 |
| 重命名 Nickname | 右键组件 → Nickname | 显示在组件头上，比默认名短 |

## 连线操作

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 连一根 | 输出端口 → 输入端口 | 按住拖 |
| 连一组 | 选中多个输出 → 拖到目标输入 | 多合一看似玄学，实则高效 |
| 断开一根 | 双击连线 / 选中后 Delete | — |
| 断开某端口全部 | Ctrl + 点击端口 | — |
| 全断 | Ctrl + Shift + 点击端口 | 全断开 |

## 运行与调试

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 运行 | F5 | 最常用 |
| 暂停 | F6 | 临时停，当前结果保留 |
| 停止 | F7 | 清当前结果 |
| 单步运行 | F8 | 调试器开启时逐组件跑 |
| 开启/关闭调试 | Debug 面板开关 | 或顶部工具栏 🐞 |
| 看端口实时值 | 鼠标悬停端口 | 弹出数据树预览 + 当前值 |
| 调试模式下值常驻 | Debug 面板 → Pin Values | 值固定在端口旁，不随运行清 |

## 文件与画布管理

| 操作 | 快捷键 | 备注 |
|---|---|---|
| 新建 .ghz | Ctrl + N | 会提示保存当前 |
| 打开 .ghz | Ctrl + O | — |
| 保存 .ghz | Ctrl + S | — |
| 另存为 | Ctrl + Shift + S | — |
| 快速清空画布 | Ctrl + Shift + N | 开新画布的空版（不保存旧的） |
| 导入 .gh | — | GH1 文件，打开会触发迁移提示 |

## 数据树速查（高频组件）

| 组件 | 分类 | 用途 |
|---|---|---|
| `Flatten` | Data → Sets → Flatten | 拍平分支，所有 item 进同一枝 |
| `Graft` | Data → Sets → Graft | 嵌套加一层分支 |
| `Simplify` | Data → Sets → Simplify | 去多余空层 |
| `Shift Paths` | Data → Tree → Shift Paths | 索引整体 ± 1 |
| `Path Mapper` | Data → Tree → Path Mapper | 按规则重写路径（`{A;i}` → `{i;A}`） |
| `List Length` | Data → List → List Length | 每枝的 item 数量 |
| `Tree Branch Count` | Data → Tree → Branch Count | 总分支数 |
| `Param Viewer` | Params → Util → Param Viewer | 可视化数据树（截图利器） |
| `Data Path` | Data → Tree → Data Path | 按路径取特定枝 |
| `Sort Tree` | Data → Tree → Sort Tree | 路径排序 |
| `Cull Paths` | Data → Tree → Cull Paths | 按条件剔除分支 |
| `Wrap Paths` | Data → Tree → Wrap Paths | 多数据树包装成嵌套 |
| `Unwrap Paths` | Data → Tree → Unwrap Paths | 拆包装（Wrap 的反向） |

## 快捷键（按类别汇总）

### 画布导航
- 平移：中键 / Alt+拖
- 缩放：滚轮
- 框选：左键拖
- 框选（全包含）：Ctrl+左键拖

### 组件
- 复制：Alt+拖 / Ctrl+C+V
- 删除：Delete
- 折叠/展开：点左上三角
- 重命名：右键→Nickname

### 连线
- 拖线：端口到端口
- 断线：双击 / Delete
- 全断：Ctrl+点击端口

### 运行
- 运行：**F5**
- 暂停：F6
- 停止：F7
- 单步：F8

### 文件
- 新建：Ctrl+N
- 打开：Ctrl+O
- 保存：Ctrl+S

---

## 效率小贴士

| # | 技巧 | 适用场景 |
|---|---|---|
| 1 | **组件库搜索是模糊匹配** | 输入 `ptxyz` 也能搜到 `Point XYZ` |
| 2 | **拖动组件时按 E 展开/折叠** | 快速在折叠和展开之间切换 |
| 3 | **Output Bar 里的红色警告** → 点击会自动高亮出错组件 | 省得一个个找 |
| 4 | **右键组件 → Find Similar** | 找同分组/同分类的组件 |
| 5 | **右键组件 → Focus → Hide Others** | 只看选中的，清屏聚焦 |
| 6 | **Ctrl + Shift + 左键拖动组件** | 复制一整个连线网络一起拖（GH2 独有） |
| 7 | **参数面板 → 右键端口 → Set Multiple Values** | 一次喂多个值进同一个参数 |
| 8 | **右键画布 → Canvas Settings** | 改网格大小、背景色、端口大小 |
| 9 | **右键画布 → Notes** | 加便签写注释，保存进文件里 |
| 10 | **右键画布 → File Preview** | 快速预览 `.ghz` 里有哪些组件（不打开） |
| 11 | **`Cluster` 编辑器 → 右键发布** | 自己写好的子流程发布成工具栏组件 |
| 12 | **Shout / Listen 组件** | 跨 Cluster、跨文件传值，比连线快 |

---

## 本章小结

速查表可以打印出来贴显示器旁。最常用的三个快捷键：
- **F5 运行**（每天按几百次）
- **Delete 删除**（整理画布）
- **Ctrl+C / Alt+拖 复制**（快速搭网络）

M4 全部四节完成 → 接下来是 **M5 数据与元数据篇**（数据树对照图 + 重复策略表 + Metadata 用法）
