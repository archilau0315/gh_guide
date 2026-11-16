# 5.1 脚本组件速查

> GH2 的脚本组件有三种模式：Python、C#、SDK（编译为 .gha）。日常用前两种，要发布给别人用走第三种。

---

## 三种模式对照

| 维度 | Python | C# | SDK (.gha) |
|---|---|---|---|
| 语言 | CPython 3.9 | C# 12 | C# 12 |
| 运行方式 | 即时解释 | 即时编译缓存 | 预编译 DLL |
| 语法检查 | 弱（运行时才报） | 强（编辑时提示） | 强（编译时报） |
| 可以 pip 装包 | ✅ | ❌ | ❌ |
| 可以 async/await | ✅ | ✅ | ✅ |
| 可以反射 .NET | 用 `System.Reflection` | ✅ 直接 | ✅ |
| 性能 | 一般 | 好 | 好 |
| 发布方式 | 贴进 .ghz 里自动存 | 贴进 .ghz 里自动存 | 独立 .gha 插件文件 |
| 适合 | 快速原型、数据处理、外部 API 调用 | 稳定脚本、性能关键、需要强类型 | 发布给团队/外部用户 |

**选哪个？**
- 需要 `numpy` / 调 HTTP API / 处理文件 → **Python**
- 几何计算、RhinoCommon 深度操作 → **C#**（比 Python 快）
- 稳定工具、要发给别人 → **SDK 编译 .gha**

---

## 脚本组件的输入输出绑定

拖一个 `Python` 或 `C#` 组件进画布，有默认的 `x`（输入，通用类型）和 `A`（输出）。要加更多输入输出：

1. 选中脚本组件
2. 右侧参数面板 → Inputs / Outputs
3. 点 `+` 加端口
4. 设置**名字**（比如 `Crv`、`Factor`）和**类型**（比如 `Curve`、`Number`）
5. **端口名字 = 脚本里变量名**——不能乱改

脚本里直接用绑定的变量：

```python
# Python 组件，输入端口 Crv (Curve) 和 Factor (Number)
# 输出端口 Offset (Curve) 和 Length (Number)

Length = Crv.Length
Offset = Crv.Offset(Factor, Rhino.Geometry.Plane.WorldXY, 0.001)
```

```csharp
// C# 组件，输入端口 Crv (Curve) 和 Factor (Number)
// 输出端口 Offset (Curve) 和 Length (Number)

Length = Crv.Length;
Offset = Crv.Offset(Factor, Rhino.Geometry.Plane.WorldXY, 0.001);
```

> **规则**：输入端口名 = 脚本里可读的变量；输出端口名 = 脚本里要赋值的变量（C# 和 Python 都是这个规则）。

---

## 常用 Python 代码片段

### 片段 1：遍历数据树所有 item

```python
# 输入: data (Tree)
# 输出: flat (List), paths (List)

flat = []
paths = []
for branch in data.Branches:
    for i in range(branch.Count):
        flat.append(branch[i])
        paths.append(f"{{{';'.join(str(x) for x in branch.Path.Indices)}}}")
```

### 片段 2：过滤 Curve 长度

```python
# 输入: curves (Tree), threshold (Number)
# 输出: result (Tree)

result = Rhino.DataTree()
for branch in curves.Branches:
    new_branch = Rhino.Collections.Path()
    for i in range(branch.Count):
        crv = branch[i]
        if crv.Length > threshold:
            new_branch.Add(crv)
    if new_branch.Count > 0:
        result.Add(new_branch, branch.Path)
```

### 片段 3：Rhino 世界坐标 → 局部坐标

```python
# 输入: points (List of Point3d), plane (Plane)
# 输出: local (List of Point3d)

local = []
for pt in points:
    local.append(plane.RemapToPlaneSpace(pt)[1])
```

### 片段 4：HTTP 请求（Python 独有）

```python
# 输入: url (String)
# 输出: content (String)

import urllib.request
import json
resp = urllib.request.urlopen(url, timeout=5)
content = resp.read().decode('utf-8')
# 如果是 JSON:
# data = json.loads(content)
```

### 片段 5：文件读写

```python
# 输入: filepath (String), data (String)
# 输出: content (String)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(data)

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()
```

### 片段 6：Rhino 元数据（Metadata / User Text）

```python
# 输入: geo (GeometryBase), key (String), value (String)
# 输出: result (GeometryBase)

result = geo.Duplicate()
result.SetUserText(key, value)
# 读取: geo.GetUserText(key)
# 所有键: geo.GetUserTextKeys()
```

---

## 常用 C# 代码片段

### 片段 1：Brep 相交 + 提取交线

```csharp
// 输入: brep1 (Brep), brep2 (Brep)
// 输出: intersectionCurves (List of Curve)

Rhino.Geometry.Intersect.Intersection.BrepBrep(
    brep1, brep2, 0.001,
    out Curve[] curves, out Point3d[] points
);
intersectionCurves = new List<Curve>(curves);
```

### 片段 2：SubD 细分 + Bake Brep

```csharp
// 输入: subd (SubD), level (Integer)
// 输出: result (Brep)

var clone = subd.Duplicate();
for (int i = 0; i < level; i++) clone.Split();
result = clone.ToBrep(0.001);
```

### 片段 3：Rhino 文档对象模型

```csharp
// 输入: (无需, 访问当前 Rhino 文档)
// 输出: info (String)

var doc = Rhino.RhinoDoc.ActiveDoc;
var layers = doc.Layers;
var objects = doc.Objects;

info = $"图层数: {layers.Count}, 对象数: {objects.Count}";
```

### 片段 4：异步 + await（C# 独有）

```csharp
// 输入: url (String)
// 输出: content (String)

using System.Net.Http;
using System.Threading.Tasks;

// 注意: GH2 C# 组件的 Run 方法不能直接用 async
// 但可以用 .GetAwaiter().GetResult() 同步等待
using var client = new HttpClient();
content = client.GetStringAsync(url).GetAwaiter().GetResult();
```

### 片段 5：计算 Closest Point + Distance

```csharp
// 输入: point (Point3d), geometry (GeometryBase)
// 输出: closest (Point3d), distance (Number)

var result = geometry.ClosestPoint(point);
closest = result.Point;
distance = point.DistanceTo(result.Point);
```

---

## 脚本调试技巧

### 技巧 1：Print 变量

Python：
```python
print(f"当前值: {myVar}, 类型: {type(myVar)}")
```

C#：
```csharp
Rhino.RhinoApp.WriteLine($"当前值: {myVar}, 类型: {myVar?.GetType()}");
```

Output Bar（底部）会显示。

### 技巧 2：组件属性 → Output Text 模式

C# 组件可以设置 Output 模式为 **Text**（默认是 **Generic** 几何输出）。这样脚本里 `result = "some text"` 会直接显示在 Output Bar 里。

### 技巧 3：try/except 找错

```python
try:
    result = DoSomething(data)
except Exception as e:
    print(f"出错了: {e}")
    result = None  # 或者输出空值
```

C#：
```csharp
try {
    result = DoSomething(data);
} catch (Exception e) {
    Rhino.RhinoApp.WriteLine($"出错了: {e.Message}");
    result = null;
}
```

### 技巧 4：独立运行验证

**先用 `! RunPythonScript` 命令独立跑你的 Python 脚本**，确保它在 Rhino Python 环境里可以正常运行，再贴进脚本组件。

独立脚本和组件内脚本的环境一致（都是 Rhino 内嵌的 CPython 3.9），独立跑通了组件里就不会有环境差异。

---

## 脚本 vs SDK：什么时候选哪个

| 需求 | 选 |
|---|---|
| 快速试验（几小时内） | 脚本 |
| 一次性工具（自己用） | 脚本 |
| 需要 pip 装第三方包 | Python 脚本 |
| 需要 C# 强类型 / async | C# 脚本 |
| 团队分享 / 长期维护 | SDK 编译 .gha |
| 打包发布 | SDK .gha |
| 依赖少、轻量 | 脚本（贴进 .ghz 自动存） |

---

## 本章小结

- GH2 脚本组件三种模式：**Python 3.9** / **C# 12** / **SDK .gha**
- 输入输出端口名 = 脚本里的变量名
- Python 适合外部 API / 文件 / numpy；C# 适合几何计算 / 性能
- 调试靠 Print → Output Bar；复杂逻辑用 try/except 包起来
- 独立脚本先 `! RunPythonScript` 验证，再贴进组件里

下一节 → [5.2 API 速查 + .gha 开发](02_api_and_gha.md)
