# 8.1 排错清单（Troubleshooting）

> 按「症状 → 可能原因 → 处理」组织。从高频往低频排。

---

## 组件变红色（Error）

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | "Data Structure mismatch" | 输入端口的重复策略没对齐（默认 `item` 截断了长端） | 改端口策略为 `repeat` 或 `longest` + `Cull Nulls` |
| 2 | "Value is null" | 上游组件输出 null（比如 Loft 的输入分支数不够） | 检查上游数据树结构 |
| 3 | "Insufficient Data" | 必填端口没输入也没默认值 | 给必填端口加值或连上游 |
| 4 | "Cannot intersect these geometry types" | Brep 和 Mesh 相交需转统一类型 | Mesh → Brep 用 `Mesh To Brep` |
| 5 | "Attempted to divide by zero" | 除数为 0 | 上游做 `Cull Nulls` 或加条件过滤 |
| 6 | "Curve is too short" | 偏移量 > 曲线长度 | 加条件过滤短曲线，或 Reduce 偏移量 |
| 7 | "Subdivision levels exceed maximum" | SubD Split 太多 | 控制 Split 次数（Max 约 7 级） |
| 8 | "NURBS curve degree too high" | 曲线次数 > 11 | Rebuild 曲线（降次数） |

---

## 组件变黄色（Warning）

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | "Some items were skipped" | 重复策略把长枝截断了 | 确认是否故意截断；不是的话改 `longest` + 看哪些被截断 |
| 2 | "Not all items produced output" | 条件组件（如 Cull Nulls）处理后数量变了 | 这是正常现象 |
| 3 | "This component is deprecated" | 旧组件在 GH2 被弃用 | 换新组件（Warning 信息里有替代） |
| 4 | "Metadata was lost" | 某组件没实现 Metadata 传递 | 组件前后手动 `Meta Copy` |

---

## 组件没有运行（灰色/静止）

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | 灰色静止，不运行 | 上游组件输出没变（依赖没变 = 不重算） | F5 强制刷新 |
| 2 | Cluster 里的组件不运行 | Cluster 是 `Run Once` 模式，不是 `Self Feedback` | 改 Loop 模式 |
| 3 | Loop 停在某处 | `Max Iterations` 太小或收敛条件太严 | 加 `History Output` 看每次迭代，调参数 |
| 4 | 脚本组件运行超时 | 脚本里有无限循环或外部 API 阻塞 | 加超时控制，或在 `! RunPythonScript` 里独立跑通 |

---

## 几何不显示（看起来没问题但视口里没东西）

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | Bake 到空图层 | Bake 对话框里图层名空了或层被关了 | 手动 Bake → 选对图层 → `Show` 该层 |
| 2 | Mesh 面法线朝里 | Mesh 渲染背面剔除 | `Unify Normals` / `Flip Triangles` |
| 3 | SubD 没有 Bake | SubD 组件输出不会直接在 Rhino 显示 | Bake 或转 Brep |
| 4 | 单位不匹配（厘米 vs 毫米） | 导入/导出几何时单位错了 | Rhino 命令 `Units` → 看当前单位；GH2 用 `Remap Numbers` 按 10/1000 倍率 |
| 5 | Cull Nulls 后空数据 | 所有 item 被过滤掉了 | `Param Viewer` 看 Cull 后的数据树 |

---

## 性能骤降 / 卡死

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | 组件连接过多，运行慢 | 每次 F5 所有组件重算，包括那些不需要重算的 | 右键组件 → Freeze 不需要重算的 |
| 2 | 组件数据量巨大（10万+ item） | Loft / Mesh Boolean 在大网格上慢 | 先 Simplify 网格；或把大集合拆成多个子流程 |
| 3 | 无限循环没停 | Cluster Loop 的收敛条件永远不变 | 先取消，设 `Max Iterations` 后再加收敛条件 |
| 4 | Python/C# 脚本阻塞 | 外部 API 慢或脚本没加 try/except | 超时控制 + `F6` 暂停 |
| 5 | 画布渲染慢 | 组件太多、连线太密 | 折叠不重要的组件、Focus 只看活跃区域 |

---

## 数据树层级错乱

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | 输出 item 数比预期多 | `repeat` 策略把短枝补了 | 改 `shortest` 或 `item`，或接 `Param Viewer` 看实际结构 |
| 2 | 输出 item 数比预期少 | `item` 策略把长枝截断了 | 改 `longest` + 看被截断的是不是需要保留 |
| 3 | Branch 多了一层 | `Flatten` 前多了个空层没 Simplify | 加 `Simplify` 组件 |
| 4 | 两个数据源合并不对齐 | 路径索引不一致 | 用 `Path Mapper` 重写路径后再合并 |

---

## 常见快捷键失忆

| 我想做... | 快捷键 | 在哪找 |
|---|---|---|
| 运行 | **F5** | 顶部工具栏 ▶ |
| 暂停 | F6 | 顶部 ⏸ |
| 停止 | F7 | 顶部 ⏹ |
| 组件库搜索 | 组件库顶部搜索框 | 组件库面板 |
| 快速清空 | Ctrl + Shift + N | 新建画布 |
| 折叠全部 | Ctrl + Shift + F | 画布焦点 |
| 取消选择 | Esc | 画布 |
| Bake 选中 | 右键组件 → Bake | 组件右键 |
| 定位组件 | 搜索框搜 | F3（画布聚焦时） |
| 重命名 | 右键 → Nickname | 组件右键 |
| Focus 隐藏其他 | 右键 → Focus → Hide Others | 组件右键 |
| 看输出数据 | 悬停输出端口 | 鼠标悬停 |
| 调试端口值常驻 | Debug → Pin Values | 参数面板 |

---

## 脚本组件报错

| # | 症状 | 可能原因 | 处理 |
|---|---|---|---|
| 1 | IronPython 2 语法（GH1 遗留） | f-string、async/await 在 CPython 3.9 下可用，但 GH1 脚本组件里是 IronPython 2 | 从 GH1 复制过来的脚本要改语法 |
| 2 | `clr.AddReference` 传完整路径 | IronPython 2 不认完整路径 | 用短名 `clr.AddReference("RhinoCommon")` |
| 3 | `expected Array[object], got list` | 反射 Invoke 传了 Python list | 用 `System.Array[object]([args])` |
| 4 | `expected ImageFormat, got ImageFormat` | `System.Drawing.Imaging.ImageFormat.Png` 在 IronPython 里类型不匹配 | 用 `Eto.Drawing.ImageFormat.Png` 或 MemoryStream 桥接 |
| 5 | 脚本能独立跑但组件里报错 | 组件环境缺少上下文 | 先 `! RunPythonScript "file.py"` 验证独立能跑，再贴进组件 |

---

## 迁移 GH1 → GH2 常见问题

| # | 问题 | 原因 | 处理 |
|---|---|---|---|
| 1 | `.gh` 文件打不开 | GH2 不支持直接打开 `.gh` | 用 GH1Interop 组件（GH2 内建，自动迁移简单组件） |
| 2 | Anemone 循环不跑 | GH2 有原生 Looping，Anemone 不被自动迁移 | 用 Cluster + Loop 模式重写 |
| 3 | Hazel 全局值收不到 | Hazel 是 GH1 插件 | 用 `Shout/Listen` 组件替换 |
| 4 | Metadata 丢失 | GH1 靠 Human/Lunchbox 插件 | 用 GH2 原生 Metadata 组件 |
| 5 | 重复策略行为变了 | GH2 默认 `item` 会截断 | 逐个端口检查策略，改成和 GH1 行为一致（通常是 `repeat`） |

---

## 终极诊断法：五个步骤

1. **缩小范围**：把组件从 1416 个里缩到**最小可复现集合**（2-3 个组件）
2. **看数据树**：`Param Viewer` + `Tree Topology` 确认每一步的数据结构是不是对的
3. **看参数面板**：每个端口的 Input Repetition 设置是不是你以为的值
4. **看输出**：组件输出端口悬停看数据——如果前面就错了，后面肯定错
5. **独立验证**：脚本先用 `! RunPythonScript` 独立跑；几何先手动 Loft 一个看结果

> **原则**：越往前找问题越容易修。80% 的组件报错是因为**上游数据树结构不对**。

---

## 本章小结

- 排错按优先级：**Error > Warning > 没运行 > 不显示 > 性能**
- 最常见的 5 个原因：数据树不对（item 策略截断）、null 穿透、循环没设 Max、单位不匹配、重复策略行为变化
- **终极五步法**：缩小范围 → 看数据树 → 看参数面板 → 看输出 → 独立验证
- **80% 的问题在**：数据树结构 + 重复策略 + 上游组件没跑通

---

## 里程碑进度

| 里程碑 | 内容 | 状态 |
|---|---|---|
| **M0** | 工具链验证（图标导出） | ✅ |
| **M1** | 资产抓取（数据骨架） | ✅ |
| **M2** | 图标库（全量导出） | ✅ |
| **M3** | 组件速查页（静态站点） | ✅ |
| **M4** | 快速上手篇（4 节正文） | ✅ |
| **M5** | 数据与元数据篇（3 节正文） | ✅ |
| **M6** | 循环与全局篇（2 节正文） | ✅ |
| **M7** | 脚本与插件篇（2 节正文） | ✅ |
| **M8** | 术语表 + 排错清单 | ✅ 本节 + 自动生成 |
| **M9** | 检索站收口（双语 + readme） | → 下一个 |

dev_plan 全部里程碑 ✅ 即将达成。
