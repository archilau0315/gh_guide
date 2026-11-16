# 4.1 Looping（循环）

> GH1 里循环靠 Anemone 插件。GH2 **原生支持**，而且更强大——三种模式：自反馈、定次迭代、条件收敛。

---

## 基本概念

GH2 的循环用 `Cluster` + **自反馈连线**实现。Cluster 是一个"子流程容器"，输入进 Cluster，内部组件处理，输出再送回输入——这就是一个循环。

### 三种循环模式

| 模式 | 怎么触发 | 典型场景 | 官方示例 |
|---|---|---|---|
| **自反馈迭代** | Cluster 输出接回输入，运行一次自动迭代 | 迭代算法（场、网格细分） | `VectorSampleField.ghz` |
| **定次循环** | Cluster 编辑器里设次数 | 固定步数（比如 N 次细分） | `TreeAnalysisComponents.ghz` |
| **条件收敛** | 设停止条件（前后输出差值 < 阈值） | 自收敛问题（迭代到稳定） | `TransitionFunction*.ghz` |

---

## 自反馈迭代：最小实现

```
                    ┌─────────────┐
  初始状态 ──────→  │  Cluster    │ ──→ 输出
                    │  (处理逻辑)  │     │
                    └─────────────┘     │
                          ↑              │
                          └── 自反馈 ────┘
```

1. **建 Cluster**：把要迭代的组件（比如位移 + Smooth）拖进一个 Cluster
2. **加输入输出节点**：Cluster 编辑器左侧加"输入"节点（命名 `state_in`），右侧加"输出"节点（命名 `state_out`）
3. **连反馈线**：Cluster 的 `state_out` 端口（画布上 Cluster 的输出）拖回 Cluster 的 `state_in` 端口（画布上 Cluster 的输入）
4. **给初始值**：`state_in` 接一个初始状态（比如原始顶点）
5. **运行**：F5 → Cluster 自动跑多次，直到停止条件或最大次数

### 停止条件（很重要！）

**如果没有停止条件，循环会无限跑直到超时**。三个控制方式：

| 方式 | 怎么做 |
|---|---|
| **最大迭代次数** | Cluster 编辑器 → Loop Settings → Max Iterations（默认 100） |
| **收敛条件** | Loop Settings → Convergence Condition → 设一个布尔表达式（比如前后差值 < 0.001） |
| **手动停** | Cluster 工具栏的暂停按钮 / F6 |

### Cluster 编辑器里的 Loop Settings

```
Cluster 编辑器 → Loop 模式切换:
  ▢ 一次性运行 (Run Once)        ← 默认，没有循环
  ▢ 自反馈迭代 (Self Feedback)   ← 输出接回输入，自动循环
  ▢ 定次迭代 (Counted)          ← 固定跑 N 次
  ▢ 条件收敛 (Conditional)       ← 满足条件就停

Loop Settings:
  Max Iterations: [100]         ← 安全上限，防无限循环
  Timeout: [5.0] seconds        ← 超时自动停
  Convergence Condition: [ ]    ← 可选，Conditional 模式下启用
  History Output: [ ]            ← 开启后可以看每次迭代的中间结果
```

---

## 定次迭代：固定跑 N 次

比如你想把一个曲线细分**正好 10 次**：

```
[原始曲线] → Cluster (SubD 细分) → [最终细分结果]
              ↑                         │
              └── 输出接回输入 ──────────┘

Loop 模式: Counted
Iterations: 10
```

Cluster 自动跑 10 次，最后一次的输出就是你要的。**每次迭代的中间结果可以保存在 History Output**（勾上 Loop Settings 里的 History Output）。

---

## 条件收敛：迭代到稳定

最强大但最需要小心的模式。适用于**不知道要跑多少次，只知道"迭代直到结果不再变化"**的场景：

| 场景 | 收敛条件 |
|---|---|
| 迭代找根（牛顿法） | `abs(f(x)) < 1e-6` |
| 网格平滑 | `前后两次顶点位置最大差值 < 0.001` |
| 场计算到稳定 | `前后两次向量场最大差值 < 0.01` |
| 优化算法 | `目标函数变化率 < 0.1%` |

**怎么设收敛条件**：

Cluster 内部加一个组件计算收敛信号（比如 `Length` + `Epsilon` 比较，产出一个 `bool`）。这个 bool 作为 Cluster 的**额外输出端口**（命名 `done`），然后在 Loop Settings → Convergence Condition 里选这个 `done` 端口——为 `true` 时迭代停止。

---

## 调试 Cluster 循环

### 1. History Output（每次迭代的中间结果）

Cluster 勾选 History Output 后，每次迭代的输出都被保留。`Item[0]` 是第一次的结果，`Item[9]` 是第十次的。

```
Cluster 输出 → Params Viewer → 看到每个分支是一次迭代
```

### 2. Debugger 单步

Cluster 编辑器里点 **Debug 模式**（顶部 🐞 图标），F8 单步跑。每一步 Cluster 只跑一次迭代，你可以看到这次的输入和输出。

### 3. Print / Panel 中间值

在 Cluster 内部放 Print 组件 → Cluster 运行时 Output Bar 会打印每次迭代的中间状态。调试利器。

### 4. State Preview

Cluster 编辑器里勾选 **"Show Intermediate State"** —— 画布上每次迭代结束都会显示当前状态，像 slow-motion 播放。

---

## 与 GH1 Anemone 的对照

| 维度 | GH1 Anemone | GH2 原生 Looping |
|---|---|---|
| 基础 | 插件组件（黑色小方块） | 原生 Cluster + 反馈连线 |
| 自反馈 | 两个 Anemone State 组件 + 连线 | Cluster 输出端口接回输入端口 |
| 条件收敛 | `Anemone Loop / Anemone State` 配对 | Cluster 内部 Convergence Condition |
| 调试 | 基本（只能看面板） | 强（History + Debugger + 单步） |
| 中间结果 | 靠 Anemone 的 State History | Cluster History Output 内建 |
| 定次循环 | 用 Count Loop 组件 | Loop Settings 里选 Counted + N |
| 速度 | 一般 | 更快（原生 C#） |
| 限制 | 只能一个循环 | Cluster 可以嵌套多个循环 |

**迁移技巧**：GH1 里 Anemone State 的 `S`（状态）和 `G`（Go）端子，在 GH2 里变成 Cluster 的**输入输出节点**——把原来 State 组件里的逻辑拖进 Cluster，输出接回输入就是了。

---

## 高频坑

### 坑 1：忘记加停止条件

**现象**：循环跑了 N 秒还不停，超时才强制停，或者直接卡死 Rhino。

**解决**：**一定要设 Max Iterations**（默认 100 不是无限，但也别设太大）。如果用 Conditional 模式，Convergence Condition 里**必须有一条会变成 true 的路径**——永远不变就是无限循环。

### 坑 2：收敛条件永远不满足

**现象**：循环跑完 Max Iterations 才停，输出还是不对。

**原因**：收敛条件设得太严（比如 `abs(x) < 1e-10` 但永远到不了那么小），或者条件写反了（应该 `>` 写成了 `<`）。

**调试**：在 Cluster 里 Print 一下用来做收敛判断的值，看它到底在怎么变。

### 坑 3：Cluster 输出接回输入不生效

**现象**：画了反馈线但 Cluster 只跑一次就停了。

**原因**：Cluster 编辑器里 Loop 模式还是 `Run Once`（默认）。改成 `Self Feedback` 或 `Counted`。

### 坑 4：History Output 没东西

**现象**：勾了 History Output 但 Cluster 输出只有一个值。

**原因**：Loop 模式是 `Run Once`，或者 Cluster 只跑了一次就收敛了。

**解决**：改成 Counted 模式跑个 10 次，History 就有 10 个值了。

---

## 本章小结

- GH2 Looping = **Cluster + 自反馈连线 + Loop 模式设置**
- 三种模式：**Self Feedback（最灵活）/ Counted（固定 N 次）/ Conditional（迭代到稳定）**
- 一定要设 Max Iterations 防无限循环
- History Output 保留每次迭代结果，调试时打开
- 从 Anemone 迁移：Anemone State 拆成 Cluster + 输入输出节点 + 反馈连线

下一节 → [4.2 Globals（Shout / Listen）](02_globals.md)
