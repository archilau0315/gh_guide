# 3.3 Metadata 速查

> GH2 原生支持给任何数据 item 挂元数据——键值对、JSON 值、跨组件传递。这是你从 GH1 过来**第一次需要重新认识的"新数据层"**。

---

## 它是什么

Metadata 是附加在数据 item 上的**额外标签**，不改变数据本身的类型或值，但可以在组件间流转时"搭便车"。

```
一个 Point item:
  本体: Point (X=10, Y=20, Z=0)
  Metadata:
    {
      "layer": "Facade",
      "index": 42,
      "material": { "name": "Glass", "transparency": 0.3 },
      "user:author": "Liu Ke"
    }
```

### 键的命名约定

- 系统级：不用前缀（`layer`、`material`）
- 用户自定义：**建议加 `user:` 前缀**，避免和系统键冲突（`user:myTag`）

### 值的类型

Metadata 的值可以是：

| 类型 | 示例 |
|---|---|
| 字符串 | `"Facade"` |
| 数字 | `42`, `0.3` |
| 布尔 | `true` / `false` |
| 数组 | `[1, 2, 3]` |
| 对象（嵌套 JSON） | `{"name": "Glass", "transparency": 0.3}` |
| null | `null`（显式清空） |

## 核心组件

所有 Metadata 组件在 `Data → Meta →` 分组下：

| 组件 | 作用 | 典型输入/输出 |
|---|---|---|
| `Meta Name Picker` | 可视化选择/创建键名 | 输出 key 列表 |
| `Meta From` | 读取 Metadata 值 | 输入 item + key → 输出 value |
| `Meta Set` | 写入 Metadata | 输入 item + key + value → 输出带新 Metadata 的 item |
| `Meta Copy` | 把一个 item 的 Metadata 复制到另一个 | 源 item + 目标 item → 输出带源 Metadata 的目标 item |
| `Meta Key List` | 列出一个 item 上有哪些键 | 输入 item → 输出 key 列表 |
| `Meta Remove` | 删除指定键 | 输入 item + key → 输出去掉该键的 item |
| `Meta Has Key` | 检查某个键是否存在 | 输入 item + key → 布尔 |
| `Meta Bake` | 把 Metadata 写到 Rhino Layer 的 User Text | 输入 item → Rhino 层 |
| `Meta Clear All` | 清空所有 Metadata | 输入 item → 输出空 Metadata 的 item |

---

## 基本流程

### 写入

```
[几何数据源] → Meta Set (key="user:tag", value="front") → [后续组件]
```

一个 item 可以连续 Set 多个键：

```
[item] → Meta Set ("layer", "Facade") ─┐
         Meta Set ("index", 42)         ├→ 每个输出都叠加上前一个的 Metadata
         Meta Set ("material", {...})  ─┘
```

### 读取

```
[带 Metadata 的 item] → Meta From (key="layer") → "Facade"
                      → Meta From (key="index") → 42
```

如果某个 item 上没有这个键，`Meta From` 输出 `null`（不会报错）。用之前可以接一个 `Meta Has Key` 先检查。

### 复制

```
[源 item (有 Metadata)] ─→ Meta Copy ─→ [目标 item (会带上源 Metadata)]
                                ↑
                               [目标 item 输入]
```

典型场景：放样生成的曲面想继承放样截面的 layer 标签。

---

## 典型用途

### 用途 1：给顶点挂序号

```
[网格顶点] → { 接 [0, 1, 2, ..., N-1] } → Meta Set ("user:idx") → [后续用 idx 排序或查找]
```

比手动维护一个平行的序号列表方便——序号和 item 走同一条连线，不容易错位。

### 用途 2：给面片挂材质/图层

```
[面片区] → Meta Set ("layer", "Facade")
        → Meta Set ("material", { "name": "Glass", "RGB": [200, 220, 255], "Transparency": 0.3 })
→ Meta Bake (Key="layer") → 自动写到 Rhino Layer
```

Bake 到 Rhino 时 Metadata 的 layer 会自动创建对应图层并把几何体放进去，不用手动分组。

### 用途 3：标注生成

```
[点] → Meta Set ("label", "入口")
    → Bake
→ 打开 Rhino → Label → From User Text → 选刚 Bake 的点 → 自动显示 "入口"
```

Rhino 的 Label 组件可以直接读 Geometry 的 User Text——Metadata Bake 就是把 GH2 的 Metadata 写进 Rhino User Text。

### 用途 4：跨 Cluster 传递状态

```
Cluster 1:  计算面片面积 → Meta Set ("area", area_value) → 输出带 Metadata 的片
Cluster 2:  Meta From ("area") → 读取 → 做面积分类/过滤/排序
```

同一个数据树流经不同 Cluster，Metadata 自动跟随——不用额外连线传状态变量。

---

## 右侧面板直接编辑

选中一个组件后，右侧参数面板下方有个 **"Metadata" 标签页**（可能需要滚动一下），可以直接：

- 查看这个组件**输出 item 上已有的所有键值对**
- 手动添加新键
- 修改/删除已有键

> 这相当于"运行时调试器"——组件跑完了你直接看它输出的数据上挂了什么，比 Print 组件打印出来直观得多。

---

## 跨组件传递规则

| 场景 | Metadata 行为 |
|---|---|
| 简单传递（不修改 item 本体） | **自动保留** |
| 组件会产生新的 item（比如 Loft、Extrude） | **看组件实现**——大部分几何组件会传递 Metadata 到新 item |
| `Flatten` / `Graft` / `Simplify` | **Metadata 跟着 item 走**（拍平不丢） |
| `Copy` 组件（复制） | Metadata 一起复制 |
| 不同 item 类型之间转换（比如 Point → String） | Metadata 可能丢失（取决于组件） |
| 手动 Set 覆盖同名键 | **新值覆盖旧值** |

### 想确认某个组件是否保留 Metadata？

测试：`Meta Set ("test", 1)` → 接目标组件 → 再接一个 `Meta From ("test")`。如果能读到 1，说明 Metadata 过了。

---

## 与 Rhino User Text 的关系

| GH2 Metadata | Rhino Geometry User Text |
|---|---|
| GH2 内部机制 | Rhino 核心机制 |
| 支持嵌套 JSON | 只支持字符串 |
| 自动随连线传递 | Bake 时写入，否则不会自动带 |
| `Meta Bake` 组件 | 直接在 Rhino 里查看/编辑 |
| | Rhino 的 Label/Dim 组件可读 User Text |

`Meta Bake` 是桥接组件——把 GH2 的 Metadata（可能是复杂 JSON）**展平成字符串**写到 Rhino User Text。Rhino 里用 `User Text` 命令或 Label 组件查看。

---

## 常见坑

### 坑 1：Metadata 在组件后消失

**原因**：某些组件（特别是第三方插件组件）没有实现 Metadata 传递逻辑。

**诊断**：按上面的测试方法验证。如果确认不支持，用 `Meta Copy` 在组件前后手动传。

### 坑 2：键名冲突

**原因**：你用 `layer` 作键，但系统也用 `layer`（存储 Rhino 图层名）。

**解决**：用户自定义的键**全部加 `user:` 前缀**（`user:layer`, `user:material`）。系统级键保留原名。

### 坑 3：Bake 后 Metadata 丢了

**原因**：`Meta Bake` 只把你指定的键写到 User Text，其他键还是 GH2 内部的。Bake 到 Rhino 后只剩 User Text 里有的。

**解决**：需要哪个键保留在 Rhino，就在 `Meta Bake` 的 `Key` 输入里指定。

### 坑 4：Metadata 值太大

Metadata 本质是 JSON，理论上想塞多少塞多少。但**挂在 item 上的大对象（比如完整 BREP 的所有顶点数据）会拖慢传递速度**。

**建议**：Metadata 只存**标签、索引、小配置**，大数据还是走正常的数据端口。

---

## 本章小结

- Metadata = 数据 item 上的"便签"，GH2 原生支持自动传递
- 基本三件套：`Meta Set`（写）· `Meta From`（读）· `Meta Bake`（写进 Rhino）
- 用户键加 `user:` 前缀，系统键保留原名避免冲突
- 右侧面板直接看输出数据的 Metadata——调试利器
- 不确定组件保不保留 Metadata → 用 `Meta Set → 目标组件 → Meta From` 验证

M5 全部完成 → 接下来 **M6 循环与全局篇**（Looping + Globals）
