# 5.2 API 速查 + .gha 开发

> 最常用的 RhinoCommon + GH2 类型和方法。按用途分组。然后讲怎么从零写一个 .gha 插件。

---

## 最常用类型速查表

### 几何类

| 类型 | 命名空间 | 常用方法 |
|---|---|---|
| `Point3d` | `Rhino.Geometry` | `.X` `.Y` `.Z` `.DistanceTo(other)` `.IsValid` `.DistanceSquaredTo()` |
| `Vector3d` | `Rhino.Geometry` | `.X` `.Y` `.Z` `.Length` `.Unitize()` `.Dot(other)` `.Cross(other)` |
| `Plane` | `Rhino.Geometry` | `.Origin` `.XAxis` `.YAxis` `.ZAxis` `.RemapToPlaneSpace(pt)` |
| `Interval` | `Rhino.Geometry` | `.Min` `.Max` `.Length` `.Contains(t)` `.ParameterAt(t)` |
| `Curve` (抽象) | `Rhino.Geometry` | `.Length` `.Domain` `.PointAt(t)` `.PointAtStart()` `.PointAtEnd()` `.Trim()` `.Offset()` |
| `Line` | `Rhino.Geometry` | `.FromOrigin` `.FromEndPoint` `.Length` `.Direction` |
| `Polyline` | `Rhino.Geometry` | `.Add()` `.Count` `.Item[i]` `.IsClosed` `.Close()` |
| `Circle` | `Rhino.Geometry` | `.Center` `.Radius` `.Plane` `.Circumference()` |
| `Arc` | `Rhino.Geometry` | `.FromCircle` `.StartPoint` `.EndPoint` `.MidPoint` |
| `Brep` | `Rhino.Geometry` | `.Vertices` `.Edges` `.Faces` `.SolidOrientation()` `.IsValid` |
| `Mesh` | `Rhino.Geometry` | `.Vertices` `.Faces` `.Normals` `.VertexColors` `.Weld()` `.Triangulate()` `.QuadToTri()` |
| `SubD` | `Rhino.Geometry` | `.Split()` `.Elevate()` `.ToBrep()` `.VertexCount` `.FaceCount` |
| `Surface` (抽象) | `Rhino.Geometry` | `.PointAt(u, v)` `.UDomain` `.VDomain` `.Area()` |

### 构造工厂类

| 类型 | 用途 | 示例 |
|---|---|---|
| `Point3d.Add()` | 向量加法 | `Point3d.Add(a, new Point3d(0, 0, 10))` |
| `Curve.Line()` | 创建直线 | `Curve.Line(ptA, ptB)` |
| `Curve.Interpolate()` | 插值曲线 | `Curve.Interpolate(points, 3)` |
| `Curve.NURBSCurve()` | 手动建 NURBS | — |
| `Plane.FromOriginXAxis()` | 构建平面 | `Plane.FromOriginXAxis(origin, xAxis)` |
| `Interval.FromMinMax()` | 构建区间 | `Interval.FromMinMax(0, 10)` |

### 数据树类

| 类型 | 用途 |
|---|---|
| `GH_StructureProxy` | GH2 的数据树（实际类型是 Grasshopper2 内部代理） |
| `Rhino.DataTree<T>` | .NET 侧的强类型数据树 |
| `Rhino.Collections.Path` | 分支路径 `{0;2;4}` |

常用操作（C#）：
```csharp
var tree = new Rhino.DataTree<Point3d>();
tree.Add(path, pt);                    // 加一个 item
foreach (var branch in tree.Branches)  // 遍历
    foreach (var pt in branch) { ... }
tree.PathExists(path);                 // 某路径是否存在
tree.RemovePath(path);                 // 删某分支
```

### 文档类（Rhino 场景）

| 类型 | 用途 |
|---|---|
| `Rhino.RhinoDoc.ActiveDoc` | 当前文档单例 |
| `doc.Layers` | 图层集合 |
| `doc.Objects` | 场景几何体集合 |
| `doc.Objects.AddCurve()` | 加曲线到场景 |
| `doc.Objects.AddBrep()` | 加 Brep |
| `doc.Objects.AddMesh()` | 加网格 |
| `doc.Layers.Add(name)` | 新建图层 |

---

## 高频问题 API

### Q: 我想让 GH2 脚本返回多条曲线，怎么包装？

**方案 A：返回 List**
```python
# Python
result = [curve1, curve2, curve3]
```
**方案 B：返回 Tree**（如果需要保留分组）
```python
tree = Rhino.DataTree()
path = Rhino.Collections.Path()
tree.Add(curve1, path)
path = Rhino.Collections.Path()
path.Add(1)  # {1}
tree.Add(curve2, path)
result = tree
```

### Q: 怎么从 Rhino 场景里读数据？

```python
doc = Rhino.RhinoDoc.ActiveDoc
layer = doc.Layers.FindName("Facade")
if layer:
    objIds = doc.Objects.FindByLayer(layer)
    for objId in objIds:
        geo = doc.Objects.GetObjectData(objId, True).Geometry
        print(geo.GetType())
```

### Q: 怎么 Bake GH2 数据到 Rhino？

```python
# Python 脚本里直接调 doc.Objects
doc = Rhino.RhinoDoc.ActiveDoc
for crv in curves:
    doc.Objects.AddCurve(crv)
doc.Views.Redraw()
```

### Q: 怎么监听 Rhino 的事件？

```csharp
// C# 组件初始化时注册事件
Rhino.RhinoDoc.ReplaceRhinoObject += (s, e) => {
    Rhino.RhinoApp.WriteLine("对象被替换了");
};
```

---

## 从零写一个 .gha（SDK 模式）

### 为什么要写 .gha

当脚本组件不能满足需求时：

| 原因 | 说明 |
|---|---|
| **需要自定义 UI** | 脚本组件只有参数面板；.gha 可以有自己的 Dock Panel |
| **需要菜单/工具栏** | 脚本组件做不到 |
| **需要高性能** | 预编译 DLL 比解释执行快 |
| **需要依赖外部库** | .gha 可以引用 NuGet 包 |
| **需要分发** | 给别人只发一个文件 |

### 步骤概览

```
1. 新建项目: Class Library (.NET 8)
2. 引用: RhinoCommon.dll + Grasshopper2.dll (从 Rhino 安装目录)
3. 写组件类: 继承 GH_Component
4. 注册组件: 继承 GH_AssemblyInfo
5. 编译 → 输出 .gha (重命名 .dll)
6. 放到 Rhino 插件目录: %APPDATA%\Grasshopper\Libraries
7. Rhino → 命令行: GrasshopperDeveloperSettings → 解压 .gha
8. 重新打开 Grasshopper，组件出现在工具栏
```

### 项目文件模板

**.csproj**：
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0-windows</TargetFramework>
    <AssemblyName>MyGH2Plugin</AssemblyName>
  </PropertyGroup>
  <ItemGroup>
    <Reference Include="RhinoCommon">
      <HintPath>C:\Program Files\Rhino 9\Plug-ins\RhinoCommon.dll</HintPath>
      <Private>false</Private>
    </Reference>
    <Reference Include="Grasshopper2">
      <HintPath>C:\Program Files\Rhino 9\Plug-ins\Grasshopper2.dll</HintPath>
      <Private>false</Private>
    </Reference>
  </ItemGroup>
</Project>
```

**组件类**：
```csharp
using Grasshopper2;
using Grasshopper2.Kernel;
using Grasshopper2.Kernel.GH_Component;
using Rhino.Geometry;

namespace MyGH2Plugin
{
  public class HelloWorld : GH_Component
  {
    public HelloWorld()
      : base("HelloWorld", "HW",
             "一个最简单的 GH2 组件",
             "MyPlugin", "Demo")
    { }

    protected override void RegisterInputParams(GH_PComponent input)
    {
      input.AddNumber("X 值", "X", "第一个数字", 0.0);
      input.AddNumber("Y 值", "Y", "第二个数字", 0.0);
    }

    protected override void RegisterOutputParams(GH_PComponent output)
    {
      output.AddNumber("求和", "Sum", "X + Y");
      output.AddNumber("乘积", "Mul", "X * Y");
    }

    protected override void SolveInstance(IGH_DataAccess DA)
    {
      double x = 0, y = 0;
      if (!DA.GetData(0, ref x)) return;
      if (!DA.GetData(1, ref y)) return;

      DA.SetData(0, x + y);
      DA.SetData(1, x * y);
    }

    protected override System.Drawing.Bitmap Icon => null; // 可以用 .ghicon 渲染
    public override Guid ComponentGuid => new Guid("11111111-2222-3333-4444-555555555555");
  }

  public class PluginInfo : GH_AssemblyInfo
  {
    public override string Name => "MyGH2Plugin";
    public override string Description => "我的第一个 GH2 插件";
    public override string Version => "1.0.0";
    public override Guid Id => new Guid("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");
  }
}
```

### 关键规则

| 规则 | 说明 |
|---|---|
| **唯一 GUID** | 每个组件一个。用 Visual Studio 的 Guid 工具生成，一旦发布不能改 |
| **`GH_Component` 基类** | 必须继承。GH2 没有 GH1 的 `GH_Goo` 层——数据直接用 .NET 类型 |
| **输入参数默认值** | `AddNumber(name, nick, desc, default)` —— 组件拖进画布时自动带默认值 |
| **SolveInstance 返回值** | `void`。通过 `DA.GetData()` 取输入，`DA.SetData()` 写输出 |
| **错误处理** | `AddRuntimeMessage(GH_RuntimeMessageLevel.Error, "出错原因")` → 组件变红色显示错误信息 |
| **警告** | `AddRuntimeMessage(GH_RuntimeMessageLevel.Warning, "注意")` → 组件变黄色 |
| **图标** | 可以返回 `System.Drawing.Bitmap` 或 null（显示默认齿轮） |

### 调试 .gha

1. 用 Visual Studio 打开 Rhino 项目（Attach to Process）
2. 启动 Rhino 9
3. 命令行输入 `GrasshopperDeveloperSettings` → 勾上"Enable Load Unassembled Plugins"
4. 编译 .gha → 自动重新加载 → 可以在 VS 里下断点

### 发布 .gha

1. Release 编译 → 得到 .dll
2. 把 .dll 改名成 .gha
3. 可选：用 `GH_Icons.rhp` 打包图标
4. 放到 `%APPDATA%\Grasshopper\Libraries` 或用户可以通过 Grasshopper → File → Special Folders → Components 打开的目录
5. 用户重新打开 Grasshopper → 组件自动出现在工具栏

---

## 本章小结

- 最常用 API 类型：**Point3d / Vector3d / Plane / Curve / Brep / Mesh** 这六个
- 数据树操作：`Rhino.DataTree<T>` + `Rhino.Collections.Path`
- 文档交互：`Rhino.RhinoDoc.ActiveDoc`
- .gha 三件套：`GH_Component`（组件逻辑）· `GH_AssemblyInfo`（插件元信息）· 唯一 GUID
- 开发循环：新建 Class Library → 引用 RhinoCommon + Grasshopper2 → 写组件类 → 编译 → 放 Libraries 目录 → Rhino 重启加载

**M7 完成！** 下一个 → **M8 术语表 + 排错清单**
