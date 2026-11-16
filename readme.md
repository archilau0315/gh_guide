# Grasshopper 2 组件速查手册 · GH2 Quick Reference

> Rhino 9 上 1416 个官方组件的结构化参考 · 中英对照 · 零依赖静态检索站

---

## 项目用途 / Purpose

**中文**：这是一份面向建筑设计师、BIM 工程师和 GH2 用户的组件速查手册。核心功能是一个零依赖的静态检索站，覆盖 Rhino 9 + Grasshopper 2 官方发行包里 **全部 1416 个组件**，每个组件包含：

- 原厂图标（807 个 `.ghicon` 资源 + 1416 个官方预览图）
- 输入/输出端口表（类型·访问策略·必填·描述）
- 官方分类树（11 个一级分类 · 40+ 二级分类）
- 中英双语对照（zhName 覆盖 77%）
- 204 个可运行 `.ghz` 示例文件
- 官方文档链接

配套的 **10 篇手写 Markdown 正文**（快速上手·数据树·循环·脚本·插件·排错）提供概念性深度。

---

**English**：A structured reference for all **1416 official Grasshopper 2 components** bundled with Rhino 9, built for architects, BIM engineers and GH2 users. The zero-dependency static reference site provides:

- Factory icons (807 `.ghicon` resources + 1416 official preview images)
- Input/output port tables (type · repetition strategy · required · description)
- Official category tree (11 top-level · 40+ sub-categories)
- Bilingual display (zhName covers 77%)
- 204 runnable `.ghz` example files
- Direct links to official docs

Ten hand-written Markdown articles cover conceptual depth (quick start · data tree · looping · scripting · plugins · troubleshooting).

---

## 目录结构 / Directory

```
gh_guide/
│
├── site/                         ← 零依赖静态检索站 (Zero-dep static site)
│   ├── index.html                ← 入口 (Entry point)
│   ├── style.css                 ← 样式 + 明暗主题 (Stylesheet + theme)
│   ├── app.js                    ← 运行时逻辑 (Runtime logic)
│   ├── assets/icons/*.png        ← 1416 本地化组件图标 (Localized component icons)
│   └── examples/*.ghz            ← 204 官方示例文件 (204 official examples)
│
├── data/                         ← 结构化数据 (Structured data)
│   ├── components_full.json      ← 1416 组件 + 端口 + 描述 + zhName
│   ├── categories.json           ← 11 一级分类
│   ├── terms.json                ← 568 官方术语（自动解析 .term）
│   ├── icon_map.json             ← 807 .ghicon 资源映射
│   └── meta.json                 ← 版本元信息
│
├── assets/
│   └── icons/{24,48,96}/*.png    ← 1971 个渲染的 .ghicon 图标（3 尺寸）
│
├── doc/zh/                       ← 10 篇中文正文 (10 Chinese articles)
│   ├── 01_quickstart/            ← 快速上手（4 节）
│   ├── 03_datatree_meta/         ← 数据树 + 重复策略 + Metadata（3 节）
│   ├── 04_loop_globals/          ← Looping + Shout/Listen（2 节）
│   ├── 05_scripting/             ← Python/C# 脚本 + API（2 节）
│   ├── 06_plugin/                ← .gha 插件开发（计划中）
│   └── 08_troubleshooting/       ← 排错清单（1 节）
│
├── tools/                        ← 开发脚本 (Dev scripts)
│   ├── export_icons.py          ← Rhino 9 内 IronPython 图标导出
│   ├── crawl-ports.js           ← Node.js 官方详情页爬虫（1416 页 · 0 失败）
│   ├── enrich.js                ← 图标本地化 + 示例 + zhName（一站式）
│   ├── parse-terms.js           ← 568 .term 文件解析
│   ├── parse-index.js           ← 官方索引解析
│   └── match-icons.js           ← 组件名 → 图标资源名匹配
│
├── dev_plan.md                   ← 开发规划文档
├── debug_log.md                  ← 变更日志
└── .gitignore
```

---

## 使用说明 / Usage

### 本地打开检索站

```bash
# 需要 HTTP server（file:// 会被 CORS 拦截 fetch）
cd gh_guide
python -m http.server 8765
# 浏览器打开: http://localhost:8765/site/index.html
```

**中文**：建议用 Python 内置的 `http.server`，零配置。站点是纯 HTML/CSS/JS，fetch 同目录下的 JSON。

**English**：Python's built-in `http.server` works out of the box. The site is pure HTML/CSS/JS that fetches local JSON.

### 在服务器上部署

直接把 `gh_guide/` 整个目录拷到 Web 根目录即可，不需要任何构建步骤。数据更新时重跑 `tools/crawl-ports.js`（爬虫）和 `tools/enrich.js`（本地化 + zhName），然后刷新浏览器——没有中间态，改数据换 JSON。

### 里程碑进度 / Milestone Progress

| # | 里程碑 | 内容 | 状态 |
|---|---|---|---|
| M0 | 工具链验证 | Rhino 9 内 .ghicon → PNG 导出 | ✅ |
| M1 | 资产抓取 | 1416 组件 + 分类 + 术语数据骨架 | ✅ |
| M2 | 图标库 | 1416 组件预览图本地化 | ✅ |
| M3 | 静态站点 | 检索站 HTML/CSS/JS（6/6 验证通过） | ✅ |
| M4 | 快速上手篇 | 4 节 Markdown 正文 | ✅ |
| M5 | 数据与元数据篇 | 3 节 Markdown 正文 | ✅ |
| M6 | 循环与全局篇 | 2 节 Markdown 正文 | ✅ |
| M7 | 脚本与插件篇 | 2 节 Markdown 正文 | ✅ |
| M8 | 排错清单 | 1 节 Markdown + 568 术语自动解析 | ✅ |
| M9 | 收口 | readme + 部署文档 | ✅ 当前 |

---

## 数据源 / Data Sources

| 来源 | 位置 | 内容 |
|---|---|---|
| GH2 官方组件索引 | `rhino3d.com/docs/grasshopper2/specs/` | 1416 组件分类树、ID、页面链接 |
| GH2 官方详情页 | `rhino3d.com/docs/grasshopper2/specs/{id}.html` | 输入输出端口、英文描述 |
| GH2 安装包 | `Grasshopper2.dll` 内嵌 807 `.ghicon` | 原厂电池图标（私有格式，Rhino 内渲染） |
| 本机 .spec 文件 | `.../Documentation/English/Specs/` | 58 篇组件深度详解 |
| 本机 .term 文件 | `.../Documentation/English/Terms/` | 568 条官方术语（自动解析） |
| 本机 .ghz 文件 | `.../Documentation/English/Example Files/` | 204 个可运行示例（已复制到 site/examples/） |

---

## 许可证与版权 / License & Copyright

- 组件图标、官方英文说明和术语 **版权归 Robert McNeel & Associates**
- 本手册所有中文释义、代码、Markdown 正文版权归 **Kuanform Boundless Intelligent Technology（匡形无界）**
- 图标和英文原文仅供学习与查阅使用，不得用于商业再发布或二次分发
- 中文释义部分采用 CC-BY-NC（署名-非商业性使用）协议

---

## 贡献者 / Contributors

- **Archilau（刘珂）** — 项目发起、数据源梳理、IronPython 2 调试、站点开发、文档写作
- **Kuanform Boundless Intelligent Technology（匡形无界）** — 公司出版方

---

## 项目信息 / Meta

| 字段 | 值 |
|---|---|
| 项目代号 | `gh_guide` |
| Rhino 版本 | 9.0.26300.9401 |
| GH2 组件数 | 1416 |
| 里程碑 | M9 全完成 |
| 静态站点体积 | 6.2 MB（含 1416 PNG + 204 GHZ + JSON + HTML/CSS/JS） |
| Git 仓库 | `git clone <repo>` |
| 最后更新 | 2026-11-16 |
