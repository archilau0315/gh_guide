# gh_guide 开发日志

> Grasshopper 2 速查手册（项目代号：gh_guide）

---

## [2026-11-16] M0 里程碑达成 · 1971 张原厂图标全量导出

**模块**：`tools/export_icons.py`、`tools/diag3.py`~`diag6.py`、`tools/diagnose.py`、`tools/diagnose2.py`、`tools/diag_batch.py`、`tools/diag_batch2.py`、`assets/icons/{24,48,96}/*.png`、`data/icon_map.json`

**变更简述**：历时 7 轮诊断脚本迭代，终于打通 GH2 `.ghicon` → PNG 的完整链路。踩坑过程极其艰辛，记录如下：

**发现的关键坑**：
1. `clr.AddReference` 必须传短名 `"Grasshopper2"`，传完整路径 IronPython 2 会抛 `FileLoadException: The given assembly name was invalid`
2. 反射 `Invoke` 参数必须用 `System.Array[object]([args])`，传 Python list 会报 `expected Array[object], got list`
3. 组件基类名变了：GH2 里没有 `GH_Component`，正确入口是 `Grasshopper2.Components.Component` 抽象基类 + `Grasshopper2.Interop.IGH_Component` 接口；但 `Activator.CreateInstance` 初始化出来的对象属性全空（Name/Category/Description 等都需要 GH2 画布上下文才填充），**正式组件列表不应该反射拿，后续从官方详情页抓**
4. `.ghicon` 是私有格式但可被 `AbstractIcon.FromStream(stream)` 解析，返回 `VectorIcon` / `SvgIcon` 等子类实例
5. `DrawToBitmap` 返回的是 **`Eto.Drawing.Bitmap`**，不是 `System.Drawing.Bitmap`
6. `Eto.Drawing.Bitmap.Save(path)` 在 IronPython 2 里**静默失败**——不报错但文件不存在；`Save(ms)` 只传 MemoryStream 也会报 `Save() takes exactly 2 arguments`
7. 正确保存方式：`eto.Save(memoryStream, Eto.Drawing.ImageFormat.Png)` → 用 `memoryStream` 构造 `System.Drawing.Bitmap` → `sd.Save(path, Png)`

**产出**：
- 1971 张 PNG（24px: 657, 48px: 658, 96px: 656），3.02 MB，部分图标在某些尺寸下渲染失败属正常现象
- `data/icon_map.json`：资源名 → 本地路径映射
- `data/gh2_types.json`：反射出来的 27 个内部测试组件（后续会被官方数据覆盖）

**新建诊断脚本（可删除）**：`diagnose.py`、`diagnose2.py`、`diag3.py`、`diag4.py`、`diag5.py`、`diag6.py`、`diag_batch.py`、`diag_batch2.py`

**备注**：M0 里程碑完成。下一步 M2 组件详情抓取（端口、分类、描述等），M3 生成静态站点。

---

## [2026-11-16] 开工 · M1 数据骨架完成 + M0 导出脚本就绪

**模块**：`tools/parse-index.js`、`tools/export_icons.py`、`data/*.json`、`tools/gh2-index.html`  
**变更简述**：项目从纯规划进入编码阶段，完成官方组件索引全量抓取与解析，生成结构化数据骨架，编写 Rhino 内图标+端口导出脚本。

新建文件：
| 文件 | 用途 |
|---|---|
| `tools/gh2-index.html` | 官方组件索引 HTML（134KB，Invoke-WebRequest 下载） |
| `tools/parse-index.js` | HTML 解析器 + 本机 .spec/.term 合并 |
| `tools/export_icons.py` | RhinoPython 脚本，在 Rhino 9 内反射组件类型 + 渲染图标 |
| `data/components.json` | 1416 组件骨架（含 58 个 .spec 匹配到的英文说明） |
| `data/categories.json` | 11 个一级分类 + 全部二级分类（对齐 GH2 工具栏） |
| `data/terms.json` | 568 条术语骨架 |
| `data/meta.json` | 版本元信息 |

实测结果：
| 指标 | 数值 |
|---|---|
| 组件总数 | **1416**（与官方完全一致） |
| 一级分类 | **11**（Curve/Data/Display/Intersect/Maths/Mesh/Params/Surface/Text/Transform/Vector） |
| 深度文章标记 | **56**（官方 57，差 1 个可能是 HTML 边缘情况） |
| 本机 .spec 匹配 | 58/1416（仅 58 个组件有官方深度 .spec 文） |
| 术语 | **568**（全部来自本机） |
| .ghicon 资源 | 待 Rhino 内枚举 |

**下一步（需用户配合）**：打开 Rhino 9，运行 `tools/export_icons.py`（!_RunPythonScript 或 EditPythonScript 后 F5）。该脚本会：
1. 反射 Grasshopper2.dll 枚举所有组件类型和端口 → `data/gh2_types.json`
2. 用官方 API 渲染 5 个样本 .ghicon → `assets/icons/{24,48,96}/*.png`

**备注**：目录结构已建立（data/、tools/、assets/icons/{24,48,96}/、site/）。parse-index.js 可重跑更新数据（比如 .spec 新增后）。

---

## [2026-11-16] dev_plan.md · v2.0 改为 GH2 速查手册

**模块**：`dev_plan.md`（整体重写）
**变更简述**：项目重新定位为 **Rhino 9 + Grasshopper 2 速查手册**，组件条目使用**原厂电池图标**。v1.0 的「Rhino 8 + GH1 全功能操作手册」方案作废。

关键变化：
| 维度 | v1.0 | v2.0 |
|---|---|---|
| 定位 | 全功能操作手册（教程式） | 速查手册（查阅式） |
| 平台 | Rhino 8 + GH1 | **Rhino 9 + GH2** |
| 组件规模 | 未定 | **1416 个**（官方口径） |
| 组织结构 | 8 篇 38 章线性 | 分类索引 + 组件条目 + 概念/术语/排错速查 |
| 图标 | 无要求 | **原厂 `.ghicon` 导出为 PNG** |
| 交付形态 | Markdown 优先 | 静态检索站优先 + 结构化数据 |

本次实测确认的事实（写入文档第 2 节）：
- 本机 Rhino 9 版本 `9.0.26300.09401`，GH2 安装于 `C:\Program Files\Rhino 9\Plug-ins\Grasshopper2`
- 官方离线文档：58 个 `.spec`、568 个 `.term`、9 个 `.topic`、204 个 `.ghz`、66 张截图
- `Grasshopper2.dll` 内嵌 **807 个 `.ghicon`** 图标资源，按前缀分布 Interface 322 / Constants 107 / Modifiers 70 / Functions 58 / Keys 47 / Types 39 / 其余 164
- 官方在线文档 `rhino3d.com/docs/grasshopper2/specs/` 收录 **1416 个组件**，其中 57 个有深度文章
- GH2 提供官方渲染 API `AbstractIcon.FromStream` + `DrawToBitmap`，但**必须在 Rhino 进程内调用**（Rhino 外部反射调用返回空），故图标导出列为 M0 首要验证项

**备注**：本轮只改文档，未写任何代码、未生成任何图标文件。M0 的 5 个样本导出验证需用户确认后执行。

---

## [2026-11-12] dev_plan.md · 技术栈回归 Rhino 8 + GH1 核心

**模块**：`dev_plan.md`  
**变更简述**：用户明确要求 Rhino 8 + Grasshopper 1 为唯一核心技术栈，全部章节从 Rhino 9/GH2 双轨回拉到 Rhino 8/GH1 单轨。

具体改动：
| 位置 | 旧值 | 新值 |
|---|---|---|
| §1.3 覆盖版本 | GH1 + GH2 双轨、Rhino 9 主力 | **Rhino 8 + GH1 唯一核心** |
| §1.4 新增 | — | 技术原则 4 条（优先原生 API、GH1 环境验证、遵循 RhinoCommon 规范、第三方插件仅分类介绍） |
| §2 第 1 章 | Rhino 9 环境搭建 + GH2 一句话提 | **Rhino 8 环境搭建**（纯 GH1） |
| §2 第 20 章 | GH2 Looping 前瞻 | **仅 GH1 方案**（Anemone / Lunchbox） |
| §2 第 25-26 章 | GH2 原生 Math / 并行计算 前瞻 | **纯 GH1 方案** |
| §2 第 27-30 章 | GH1 主力 + GH2 前瞻 | **纯 GH1**（.csproj 改回 Rhino 8 DLL 引用） |
| §2 第 34 章 | 插件生态 | 加"仅分类介绍，不依赖任何第三方插件" |
| §2 第 35 章 | GH2 全面解析 | **Rhino 8 GH 原生扩展**（Layers/Materials/Hatches/Dimensions 等） |
| §2 第 36 章 | Rhino 9 GH 扩展 | **GH1 常见反模式清单**（10 条） |
| §2 第 38 章 | 反模式（与 36 重复） | **插件发布与版本管理**（.gha 打包 / Food4Rhino 提交） |
| §4 模板 version | Rhino 9 \| GH1+GH2 | Rhino 8 \| Grasshopper 1.0 |
| §6 来源清单 | 含 Rhino 9 / GH2 来源 | 删除 GH2 专题 / GH2 Documentation 两条，统一回 GH1 语境 |

**备注**：回拉原因：用户工作环境为 Rhino 8 + GH1，所有开发、调试、测试必须在该环境验证。手册不以"技术潮流"为导向，而以"读者实际工作环境"为导向。GH2 新特性虽先进，但在当前用户群中尚未普及。

---

## [2026-11-12] dev_plan.md · 版本策略升级（中间态，已回拉）

**模块**：`dev_plan.md`  
**变更简述**：从 Rhino 8 前瞻策略升级为 **Rhino 9 正式版 + GH1/GH2 双轨并存** 主力策略。

具体改动：
| 位置 | 旧值 | 新值 |
|---|---|---|
| §1.3 覆盖版本表 | Rhino 8.x 主力 + 9 WIP 前瞻 | **Rhino 9.0 正式版主力** + 8.x 兼容参考 |
| §1.3 覆盖版本表 | Grasshopper 1.0 主力 + 2.0 前瞻 | **GH1 + GH2 双轨并存** |
| §1.3 覆盖版本表 | C# .NET 6（Rhino 8） | .NET 8（Rhino 9） |
| §2 第 1 章 | Rhino 8 环境搭建 | Rhino 9 环境搭建（GH1 + GH2 双版本面板） |
| §2 第 20 章 | Anemone 为主 | **GH2 原生 Looping 为主力**，Anemone 退 GH1 备用 |
| §2 第 25 章 | Expression 重构 | GH1 动态反射陷阱 + **GH2 原生 Math 组件** |
| §2 第 26 章 | 并行化可能性 | **GH2 原生并行计算（多核自动分配 + 可取消）** |
| §2 第 27-30 章 | GH1 为主 | 新增 **GH2 Script（Script/SDK 双模式 + Metadata）** |
| §2 第 30 章 | Rhino 8 DLL 引用 | **Rhino 9 DLL 引用** |
| §2 第 35 章 | Grasshopper 2 新特性（前瞻，简要） | **Grasshopper 2 全面解析（正式版）** 大幅扩充：Metadata 实战 / Globals / 原生 Looping / 并行计算 / 数学类型 |
| §2 第 36 章 | Rhino 8 数据类型扩展 | **Rhino 9 GH 原生扩展**：材质/贴图/Hatch/Clip & Section/ShapeMap/Viewport Widgets |
| §4 模板 version | Rhino 8 | Rhino 9 \| Grasshopper 1.0 + 2.0 双轨 |
| §6 来源清单 | Rhino 8 New Features | **Rhino 9 New Features**（升最高优先级） |
| §6 来源清单 | Grasshopper 2 专题（中优先级） | **升最高优先级**，新增 GH2 Documentation 官方入口 |

**备注**：Rhino 9 于 2025 年正式发布，同时搭载 GH1 + GH2 Side by side。GH2 是 David Rutten 花 10 年重写的全新版本，核心新特性为 Metadata、Looping、Globals、并行计算、数学类型扩展。GH1 插件生态成熟仍在维护；GH2 原生能力更强但插件少。手册按"功能在哪里就讲哪里"策略：GH2 原生能力优先在 GH2 语境下讲解，GH1 插件生态在 GH1 语境下讲解。

---

## [2026-11-11] dev_plan.md · 初始创建

**模块**：`dev_plan.md`  
**变更简述**：Grasshopper 全功能操作手册开发文档 v1.0 初始创建。替代旧三个子项目（GH_CSharp_Plugin_Template / GH_GhPython_Scripts / GH_Guide），方案 X 执行（全删重来）。项目代号 GH_Manual → gh_guide。

**备注**：Rhino 8 + Grasshopper 1.0 时代的前瞻规划，后续因 Rhino 9 正式发布而升级。
