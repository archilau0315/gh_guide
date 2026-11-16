# 4.2 Globals（Shout / Listen）

> 跨 Cluster、跨组件、跨文件传值的原生方式。GH1 里靠 Hazel 插件，GH2 内建。

---

## 基本概念

**Shout / Listen** 是 GH2 全局值存储：

- `Shout Name + Value` → 把一个值"广播"到全局命名空间
- `Listen Name` → 订阅一个名字，收到就输出最新值
- 同一个 Rhino 进程里，**所有 .ghz 文件、所有 Cluster、所有组件**共享这个全局空间

### 类比

| GH2 | 类比 |
|---|---|
| Shout | 往群里发消息（指定群名 + 内容） |
| Listen | 订阅群消息（只听指定群的） |
| 命名空间 | 整个 Rhino 会话（所有打开的 .ghz） |

---

## 核心组件

都在 `Data → Tree → Shout/Listen` 下：

| 组件 | 作用 | 输入 | 输出 |
|---|---|---|---|
| `Shout` | 广播一个值到全局 | Name + Value | （无，只广播） |
| `Listen` | 订阅一个全局值 | Name | Value（最新） |
| `Shout (Once)` | 只广播一次（组件首次运行时） | Name + Value | 同上 |
| `Shout (Clear)` | 清空一个命名的全局值 | Name | — |
| `Shout All` | 清空所有 Shout 值 | — | — |
| `Shout Listener` | 调试用：列出当前所有活跃的 Shout 值 | — | Name + Value 列表 |

---

## 基本用法

```
Cluster A:                         Cluster B:
[计算结果] → Shout (Name="temperature", Value=25.3)
                                   Listen (Name="temperature") → 25.3
```

Cluster B 的 Listen 组件**不需要和 Cluster A 有任何连线**——全局值自动同步。

### 同一值多次 Shout

后 Shout 的覆盖先 Shout 的（同名）。Listen 始终输出**最新**值。

```
[25] → Shout ("temp") → Listen ("temp") → 25
[30] → Shout ("temp") → Listen ("temp") → 30  ← 被覆盖
```

### 不同 .ghz 之间传值

**同一个 Rhino 会话**里，两个不同文件的 GH2 画布可以共享 Shout 值：

```
文件 A:                          文件 B:
[Slider 0-100] → Shout ("brightness")    Listen ("brightness") → 用在材质参数里
```

文件 A 动 Slider → 文件 B 的材质自动跟着变——比手动连线方便多了。

---

## 命名规范

| 规则 | 示例 | 避免 |
|---|---|---|
| **带前缀分域** | `facade.temperature`、`structure.beamCount` | `temp`（太泛） |
| **小写 + 点号分层** | `clusterA.iteration` | `ClusterAIteration` |
| **避免同义词** | 所有 Shout 共享同一套命名约定 | 有的叫 `beamCount` 有的叫 `countBeams` |
| **不要纯数字** | `layer.index.current` | `12345` |

> 推荐格式：`<项目或集群名>.<变量语义>.<子域>`
> - `projectA.grid.cols`
> - `clusterMain.iteration.n`
> - `facade.panel[2].material`

---

## 典型场景

### 场景 1：Cluster 之间共享参数

```
Cluster "GridGen":                  Cluster "FacadePanel":
  [Rows=30] → Shout ("grid.rows")     Listen ("grid.rows") → 面板网格数
  [Cols=40] → Shout ("grid.cols")     Listen ("grid.cols") → 面板网格数
```

### 场景 2：跨文件联动

```
文件 "geometry.ghz":                文件 "render.ghz":
  [Surface] → Shout ("primarySurface")  Listen ("primarySurface") → Bake + 材质
  [Window Param] → Shout ("window.w")   Listen ("window.w") → 窗宽参数
```

### 场景 3：Cluser 内部"常量广播"

```
Cluster 内部:
  某个 Slider → Shout ("myConstant")
  多个子组件都 Listen 同一个 "myConstant"
```

比手动连一条线到 10 个组件的 10 个输入端口更干净——尤其是 Cluster 内部连线已经很密的时候。

### 场景 4：运行时调试开关

```
Cluster 外面放一个 Boolean Toggle → Shout ("debug.mode")
Cluster 内部几个组件 Listen ("debug.mode") → 条件分支（true 时输出调试信息）
```

---

## 与 Hazel（GH1）的对照

| 维度 | GH1 Hazel | GH2 原生 Shout/Listen |
|---|---|---|
| 实现 | 插件组件 | 内建 |
| 跨 Cluster | ✅ | ✅ |
| 跨文件 | ❌ 不支持 | ✅ 同一 Rhino 会话 |
| 命名空间 | GH1 会话内 | GH2 会话内 |
| 值类型 | 任意 GH1 数据类型 | 任意 GH2 数据类型（含 Metadata） |
| 清值 | 手动 | `Shout (Clear)` |
| 列表/调试 | Hazel 有 Listener | `Shout Listener` 组件 |
| 速度 | 快 | 快（原生 C#） |

---

## 高频坑

### 坑 1：Shout 值不更新

**现象**：Listen 输出停在某个旧值，Shout 已经广播新值了。

**原因 1**：Cluster 没运行（或者整个画布停了）。Shout 在运行时才广播——如果 Cluster 是 `Run Once` 模式，Shout 只跑一次就停了。

**原因 2**：Listen 的 Name 拼错了。大小写敏感！`Brightness` 和 `brightness` 是两个不同的名字。

**解决**：用 `Shout Listener` 组件看当前所有活跃的 Shout 值，名字拼错一眼就发现。

### 坑 2：值被其他组件覆盖

**现象**：Shout 了 `temperature=25`，但 Listen 输出变成了 10。

**原因**：另一个 Cluster / 文件里有同名的 Shout（比如 `facade.temperature` 和 `structure.temperature` 不小心都叫 `temperature`）。后 Shout 的覆盖了先 Shout 的。

**解决**：**严格执行命名规范**（带域前缀）。`facade.temperature` 和 `structure.temperature` 是两个独立的名字。

### 坑 3：Shout (Once) 不再广播

**现象**：组件第一次运行时 Shout 了值，后来改了输入再运行，值不变。

**原因**：`Shout (Once)` 只在**组件首次被实例化**时广播一次，之后永远不跑（哪怕输入变了）。

**解决**：绝大多数场景用**普通 `Shout`**，不是 `Shout (Once)`。`Once` 只适合初始化常量。

### 坑 4：跨文件 Shout 收不到

**现象**：文件 A 里 Shout 了，文件 B 里 Listen 但没反应。

**原因**：**不同 Rhino 进程之间不共享**。必须在**同一个 Rhino 会话**里（同一个 Rhino 窗口里打开多个 .ghz）。开了第二个 Rhino 窗口 = 新进程，收不到。

### 坑 5：值在运行间残留

**现象**：上次运行的 Shout 值还在，干扰这次运行。

**解决**：画布开头放一个 `Shout (Clear)` 组件，连在运行流最前面——每次运行先清一遍。或者用 `Shout All` 全清。

---

## 本章小结

- Shout / Listen = GH2 原生全局值存储，跨 Cluster / 跨文件（同会话）
- 核心组件：`Shout`（广播）· `Listen`（订阅）· `Shout Listener`（调试）
- **命名规范**：`<项目>.<语义>.<子域>`，小写 + 点号，大小写敏感
- 常见坑：值不更新（Cluster 没跑 / 名字拼错）、被覆盖（没加域前缀）、跨进程收不到
- 调试用 `Shout Listener` 看所有活跃值，`Shout (Clear)` 清场

**M4-M6 全部完成！** 下一个里程碑 → **M7 脚本与插件篇**（Python/C# 代码片段 + .gha 开发流程）
