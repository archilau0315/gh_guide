# 1.2 GH2 和 GH1 有什么不同

> 如果你从 GH1 过来，这张对照表能省你至少一周的踩坑时间。

---

## 核心差异对照表

| 维度 | GH1 (Rhino 8 及更早) | GH2 (Rhino 9) | 影响程度 |
|---|---|---|---|
| **输入重复策略** | 只有 `item · required`、`list` 两种 | `none` / `item` / `list` / `repeat` / `wrap` / `longest` / `shortest` | ⭐⭐⭐ 最高 |
| **Metadata** | 不存在 | 原生支持，可读写 | ⭐⭐⭐ |
| **Looping** | 无内置，靠 Anemone 插件 | 原生 Cluster + 自反馈 / 定次 / 条件收敛 | ⭐⭐⭐ |
| **Globals** | 无原生，靠 Hazel / 全局变量插件 | Shout / Listen 原生组件 | ⭐⭐ |
| **接线方式** | 单一连线（一进一出） | 支持多连线合并（同一输入可接多个输出） | ⭐⭐ |
| **脚本组件** | 只有 C#（含 IronPython） | **支持 Python 3 + C#**，可内嵌引用 | ⭐⭐ |
| **文件格式** | `.gh` (XML 文本) | `.ghz` (二进制压缩) | ⭐⭐ |
| **文件大小** | 大（纯文本） | 小 30-50% | ⭐ |
| **组件数量** | ~600 | 1416 | ⭐⭐ |
| **UI 框架** | WinForms | Eto Framework（跨平台，Mono/Mac 友好） | ⭐ |
| **组件图标** | 外部 PNG | 内嵌 `.ghicon` 矢量，DPI 自适应 | ⭐ |
| **调试器** | 基本断点 | 可视化步进 + 端口实时监控 + Metadata 查看 | ⭐⭐ |
| **Cluster（分组）** | 无 | 原生支持 + 输入输出节点编辑 + 可发布为独立组件 | ⭐⭐⭐ |
| **SubD 组件** | 无 | 完整 SubD 细分建模工作流 | ⭐⭐⭐ |
| **Mesh 改进** | 基础 | Quadrangulate / Smooth / Boolean 大幅增强 | ⭐⭐ |
| **参数面板** | 基本属性 | 完整参数面板 + Metadata 标签页 + 端口说明 | ⭐⭐ |
| **国际化** | 无 | 内置多语言（至少中文） | ⭐ |

---

## 差异详解：高频踩坑点

### 1. 输入重复策略（Input Repetition）

这是从 GH1 转 GH2 **第一个会撞墙**的差异。

GH1 里你几乎不用想这件事——组件自动拿数据树最小枝作为对齐基数。GH2 里每个输入端口都有**独立的重复策略**，决定了当输入端口收到的树枝数不匹配时怎么处理。

| 策略 | 含义 | 什么时候用 |
|---|---|---|
| `none` | 不重复，数量必须完全一致 | 严格对应关系 |
| `item` | 按 item 数对齐，最短枝决定长度 | 大多数几何操作默认 |
| `list` | 按 list 数对齐 | 批量处理多组数据 |
| `repeat` | 重复最短枝到最长枝长度 | 配合常量批量 |
| `wrap` | 循环回绕 | 周期性数据 |
| `longest` | 取最长枝，短的补 null | 强制对齐到最大 |
| `shortest` | 取最短枝，长的截断 | 安全优先 |

**最常见坑**：GH1 里 `List Length` 组件输出 N 个值，直接接 GH2 的 `Number Slider` 批量乘——GH2 会报错说数据树不匹配。解决：给 `Number Slider` 的输入设 `repeat` 策略。

> 更多细节见 [§3.2 输入重复策略](../03_datatree_meta/02_repetition_strategies.md)

---

### 2. Metadata（元数据）

GH1 里给几何体挂属性要么靠插件（Human、Lunchbox），要么靠自己写脚本。GH2 **原生支持**：

- 每个数据 item 可以附加 Metadata（键值对，string → 任意 JSON 值）
- `Meta From / Meta Set / Meta Name Picker` 系列组件读写
- 可视化界面：选中 item 后右侧参数面板有"Metadata"标签页直接编辑
- 跨组件传递时 Metadata 自动跟随几何体

**典型用途**：给顶点挂序号、给面片挂材质/图层/颜色、给放样截面挂层厚、挂用户自定义的分类标签。

---

### 3. Looping（循环）

GH1 里循环必须靠 Anemone 插件（Cluster + 自反馈连线 + Set/Move State）。GH2 **原生支持**：

- **自反馈模式**：Cluster 的输出直接接回输入，迭代直到数据稳定或达到上限
- **定次循环**：指定迭代次数，输出每次的迭代结果
- **条件收敛**：给一个收敛条件（比如前后两次输出差值 < 阈值），自动停止
- **编辑器**：Cluster 编辑器内置循环调试工具，可以看每次迭代的数据

> 官方示例路径：`VectorSampleField.ghz`（矢量场采样，典型迭代收敛场景）

---

### 4. Shout / Listen（全局变量）

GH1 里跨 Cluster 传值要靠 Hazel 插件或手动连线。GH2 用 `Shout` / `Listen`：

- `Shout Name+Value`：往全局命名空间广播一个值
- `Listen Name`：订阅一个名字，收到就输出
- 典型场景：多个 Cluster 共享参数、多文件共享值（同一 Rhino 会话）
- **注意**：只在当前 Rhino 进程有效，不持久化；命名规范建议 `clusterName.variableName`

---

### 5. Python 3 脚本组件

GH1 的 Python 是 **IronPython 2**（Python 2.7 兼容），很多现代库不能用。GH2 用 **CPython 3**：

| | GH1 IronPython | GH2 CPython |
|---|---|---|
| Python 版本 | 2.7 | 3.9 |
| numpy / scipy | ❌ | ✅ |
| pip 包 | ❌ | ✅ 可装 |
| async / await | ❌ | ✅ |
| f-string | ❌ | ✅ |
| System.Reflection | ✅ | ❌（换 ctypes） |
| RhinoCommon | 通过 IronPython 桥 | 通过 Rhino.Runtime 桥 |

> 写 Python 脚本组件时建议先跑 `! RunPythonScript "your_script.py"` 验证独立运行正常，再贴进组件里。

---

### 6. Cluster 升级为"组件工厂"

GH1 的 Cluster 就是分组。GH2 的 Cluster 更接近 Node-RED 的子流程：

- 编辑 Cluster 时可以添加"输入节点"和"输出节点"——这些变成 Cluster 的端口
- Cluster 可以保存为独立的 `.ghz`，也可以发布到工具栏（工具栏出现一个自定义组件）
- 发布后 Cluster 内的算法被封装，用户只看到输入输出端口

---

## 迁移清单（GH1 → GH2）

| 清单 | 说明 |
|---|---|
| ☐ 改文件格式 | `.gh` → 重拖进 GH2 画布 → 存为 `.ghz` |
| ☐ 检查重复策略 | 每个组件端口默认策略可能不匹配，逐个调 |
| ☐ 删 Anemone | 用原生 Looping 替换 |
| ☐ 删 Hazel | 用 Shout/Listen 替换 |
| ☐ 删 Human / Lunchbox 的 Metadata 部分 | 用原生 Metadata 替换 |
| ☐ Python 脚本升级 | IronPython 2 → CPython 3（f-string、async 可用） |
| ☐ 新增 SubD 组件 | 如果原来用 T-Splines，GH2 原生 SubD 可以替换大部分 |
| ☐ 检查第三方 GHA | 很多 GH1 插件还没适配 GH2，要等更新 |

---

## 本章小结

GH2 是 **重写而非迭代**。最核心的变化：
1. **输入重复策略** → 多策略对齐（最高优先级改）
2. **Metadata / Looping / Shout-Listen** → 三个原来靠插件的能力原生了
3. **Python 3 + SubD + 更丰富的组件库** → 正面增量
4. **`.ghz` 二进制格式** → 不能直接打开 `.gh`，要迁移

下一节 → [1.3 五个必会操作](03_five_operations.md)
