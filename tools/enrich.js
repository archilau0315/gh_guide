// enrich.js — 一站式: 图标本地化 + 示例文件 + 中文 zhName
const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data');
const SITE = path.join(ROOT, 'site');
const ICONS_DIR = path.join(SITE, 'assets', 'icons');
const EXAMPLES_DIR = path.join(SITE, 'examples');
const RHINO_DOCS = 'C:\\Program Files\\Rhino 9\\Plug-ins\\Grasshopper2\\Documentation\\English';

const comps = JSON.parse(fs.readFileSync(path.join(DATA, 'components_full.json'), 'utf-8'));

// ====== 1. 图标本地化 ======
function downloadImg(url, outPath) {
  return new Promise((resolve) => {
    if (fs.existsSync(outPath) && fs.statSync(outPath).size > 500) { resolve(true); return; }
    const dir = path.dirname(outPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    https.get(url, (res) => {
      if (res.statusCode !== 200) { resolve(false); return; }
      const f = fs.createWriteStream(outPath);
      res.pipe(f);
      f.on('finish', () => { f.close(); resolve(true); });
      f.on('error', () => resolve(false));
    }).on('error', () => resolve(false));
  });
}

async function step1_downloadIcons() {
  console.log('[1] 下载组件图标 (obj=GUID.png)...');
  const url = (guid) => `https://www.rhino3d.com/docs/grasshopper2/images/obj=${guid}.png`;
  let ok = 0, skip = 0;
  const BATCH = 8;
  for (let i = 0; i < comps.length; i += BATCH) {
    const batch = comps.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(c =>
      downloadImg(url(c.id), path.join(ICONS_DIR, `${c.id}.png`))
    ));
    results.forEach(r => { r ? ok++ : skip++; });
    if ((i / BATCH) % 25 === 0) {
      const pct = Math.round(i / comps.length * 100);
      console.log(`  ${i}/${comps.length} (${pct}%) ok=${ok} skip=${skip}`);
    }
  }
  console.log(`  完成: ok=${ok} skip=${skip}\n`);
}

// ====== 2. 示例文件 ======
function step2_copyExamples() {
  console.log('[2] 复制 .ghz 示例文件...');
  if (!fs.existsSync(EXAMPLES_DIR)) fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  let copied = 0;
  // 从 Files 目录拷所有 .ghz
  const filesDir = path.join(RHINO_DOCS, 'Example Files');
  if (fs.existsSync(filesDir)) {
    fs.readdirSync(filesDir).filter(f => f.endsWith('.ghz')).forEach(f => {
      const dst = path.join(EXAMPLES_DIR, f);
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(path.join(filesDir, f), dst);
        copied++;
      }
    });
  }
  const total = fs.existsSync(EXAMPLES_DIR) ? fs.readdirSync(EXAMPLES_DIR).length : 0;
  console.log(`  复制: ${copied}, 目录现有: ${total} 个\n`);
}

// ====== 3. 中文 zhName ======
const EXACT = {
  "Point XYZ": "坐标点",
  "Vector XYZ": "坐标向量",
  "Plane": "平面",
  "Circle": "圆",
  "Arc": "圆弧",
  "Line": "直线",
  "Polyline": "折线",
  "Polygon": "多边形",
  "Hexagon": "六边形",
  "Star": "星形",
  "Sphere": "球体",
  "Cylinder": "圆柱",
  "Box": "包围盒",
  "Vector": "向量",
  "Colour": "颜色",
  "Color": "颜色",
  "Gradient": "渐变",
  "Boolean": "布尔",
  "Bounding Box": "包围盒",
  "Bounding Rectangle": "包围矩形",
  "Flatten": "拍平",
  "Graft": "嫁接",
  "Simplify": "简化",
  "SubD": "细分",
  "SubD Buffer": "细分缓冲",
  "SubD Bevel": "细分倒角",
  "SubD Crease": "细分折痕",
  "SubD Unify": "细分统一",
  "SubD Unsmooth": "取消细分平滑",
  "Deconstruct Plane": "拆解平面",
  "Construct Plane": "构造平面",
  "Deconstruct Point": "拆解点",
  "Construct Point": "构造点",
  "Deconstruct Vector": "拆解向量",
  "Construct Vector": "构造向量",
  "Deconstruct Circle": "拆解圆",
  "Construct Circle": "构造圆",
  "Divide Curve": "分割曲线",
  "Divide Surface": "分割曲面",
  "Divide Mesh": "分割网格",
  "Cull Nulls": "剔除空值",
  "Cull Duplicates": "剔除重复",
  "Sort List": "排序列表",
  "Shift Paths": "移位路径",
  "Random": "随机",
  "Random Reduce": "随机减少",
  "Populate 2D": "二维散布",
  "Populate 3D": "三维散布",
  "Remap Numbers": "重映射数值",
  "Remap Curve": "重映射曲线",
  "Graph Mapper": "图形映射",
  "Temperature": "色温",
  "Text Tag": "文本标签",
  "Text Dot": "文字点",
  "Viewpoint": "视点",
  "Transform": "变换",
  "Mesh": "网格",
  "Brep": "边界",
  "Surface": "曲面",
  "Curve": "曲线",
  "Rectangle": "矩形",
  "Ellipse": "椭圆",
  "Offset": "偏移",
  "Offset Sides": "偏移边",
  "Loft": "放样",
  "Sweep": "扫掠",
  "Revolve": "旋转",
  "Extrude": "挤出",
  "Patch": "补面",
  "Rebuild": "重建",
  "Reparameterize": "重参数化",
  "Solid": "实体",
  "Region": "区域",
  "Region Union": "区域并集",
  "Region Intersection": "区域交集",
  "Region Difference": "区域差集",
  "Trim": "修剪",
  "Split": "分割",
  "Join": "连接",
  "Merge": "合并",
  "Boolean Union": "布尔并集",
  "Boolean Intersection": "布尔交集",
  "Boolean Difference": "布尔差集",
  "Pipe": "管道",
  "Cap Holes": "封孔",
  "Thicken": "加厚",
  "Smash": "压碎",
  "Shatter": "破碎",
  "Mesh Triangulate": "网格三角化",
  "Mesh Quadrangulate": "网格四边化",
  "Mesh Join": "网格合并",
  "Mesh Explode": "网格分解",
  "Mesh Weld": "网格焊接",
  "Mesh Unify Normals": "网格统一法向",
  "Mesh Flip Triangles": "网格翻转三角形",
};

// 单词词典 (key 是小写)
const WORD_DICT = {
  "point": "点", "line": "直线", "curve": "曲线", "surface": "曲面",
  "mesh": "网格", "brep": "边界", "polyline": "折线", "polygon": "多边形",
  "circle": "圆", "arc": "圆弧", "plane": "平面", "vector": "向量",
  "interval": "区间", "domain": "域", "box": "包围盒", "rectangle": "矩形",
  "sphere": "球体", "cylinder": "圆柱", "cone": "圆锥", "ellipse": "椭圆",
  "star": "星形", "hexagon": "六边形", "solid": "实体", "region": "区域",
  "bending": "弯曲", "closest": "最近", "closed": "闭合", "flip": "翻转",
  "reverse": "反向", "trim": "修剪", "split": "分割", "join": "连接",
  "merge": "合并", "move": "移动", "rotate": "旋转", "scale": "缩放",
  "transform": "变换", "orient": "定位", "mirror": "镜像", "twist": "扭转",
  "stretch": "拉伸", "deform": "变形", "morph": "变形", "offset": "偏移",
  "length": "长度", "distance": "距离", "direction": "方向", "normal": "法向",
  "tangent": "切线", "curvature": "曲率", "torsion": "挠率", "area": "面积",
  "volume": "体积", "centroid": "质心", "bound": "边界", "extreme": "极值",
  "discontinuity": "不连续", "derivative": "导数", "frame": "坐标系",
  "end": "端点", "control": "控制点", "center": "中心", "edge": "边",
  "vertex": "顶点", "face": "面", "hole": "孔", "wire": "线框",
  "create": "创建", "construct": "构造", "build": "构建", "deconstruct": "拆解",
  "from": "从", "to": "到", "by": "按", "at": "在", "through": "穿过",
  "list": "列表", "tree": "数据树", "filter": "过滤", "sort": "排序",
  "order": "排序", "set": "集合", "repeat": "重复", "wrap": "包裹",
  "cull": "剔除", "remap": "重映射", "shift": "移位", "partition": "分区",
  "random": "随机", "item": "项", "index": "索引", "path": "路径",
  "duplicate": "复制", "flatten": "拍平", "graft": "嫁接", "simplify": "简化",
  "clean": "清理", "unique": "去重", "null": "空值", "reduce": "减少",
  "number": "数值", "integer": "整数", "float": "浮点", "boolean": "布尔",
  "string": "字符串", "text": "文本", "colour": "颜色", "color": "颜色",
  "gradient": "渐变", "value": "值", "output": "输出", "input": "输入",
  "param": "参数", "parameter": "参数", "slider": "滑块", "button": "按钮",
  "toggle": "开关", "math": "数学", "sin": "正弦", "cos": "余弦", "tan": "正切",
  "log": "对数", "exp": "指数", "abs": "绝对值", "sqrt": "平方根", "pow": "幂",
  "equation": "方程", "function": "函数", "expression": "表达式", "complex": "复数",
  "display": "显示", "render": "渲染", "preview": "预览", "material": "材质",
  "scene": "场景", "camera": "相机", "view": "视图", "background": "背景",
  "analysis": "分析", "annotation": "标注", "dimension": "标注", "tag": "标签",
  "font": "字体", "glyph": "字形", "character": "字符", "encoding": "编码",
  "decode": "解码", "encode": "编码", "meta": "元", "metadata": "元数据",
  "reference": "引用", "active": "活动", "data": "数据", "variable": "变量",
  "constant": "常量", "global": "全局", "local": "局部", "temp": "临时",
  "time": "时间", "date": "日期", "clock": "时钟", "timer": "计时器",
  "animation": "动画", "motion": "运动", "python": "Python", "script": "脚本",
  "code": "代码", "plugin": "插件", "reset": "重置", "refresh": "刷新",
  "update": "更新", "apply": "应用", "execute": "执行", "start": "开始",
  "stop": "停止", "show": "显示", "hide": "隐藏", "select": "选择",
  "unlock": "解锁", "lock": "锁定", "population": "散布", "populate": "散布",
  "jitter": "抖动", "graph": "图形", "mapper": "映射", "colour": "颜色",
  "temperature": "色温", "viewport": "视图", "capture": "截图", "subd": "细分",
  "unsmooth": "取消细分平滑", "crease": "折痕", "bevel": "倒角",
  "unify": "统一", "buffer": "缓冲", "catmull-clark": "Catmull-Clark",
  "loop": "Loop", "loft": "放样", "sweep": "扫掠", "revolve": "旋转",
  "extrude": "挤出", "patch": "补面", "rebuild": "重建",
  "reparameterize": "重参数化", "solid": "实体", "region": "区域",
  "union": "并集", "intersection": "交集", "difference": "差集",
  "boolean": "布尔", "pipe": "管道", "cap": "封", "thicken": "加厚",
  "smash": "压碎", "shatter": "破碎", "triangulate": "三角化",
  "quadrangulate": "四边化", "weld": "焊接", "normals": "法向",
  "explode": "分解", "join": "合并", "orientation": "定向",
  "cross": "叉积", "dot": "点积", "product": "积",
  "matrix": "矩阵", "determinant": "行列式", "inverse": "逆",
  "decompose": "分解", "eigen": "特征", "quaternion": "四元数",
  "polar": "极坐标", "cartesian": "笛卡尔", "spherical": "球面", "cylindrical": "柱面",
};

function translateZhName(name) {
  if (EXACT[name]) return EXACT[name];

  // 按词切分 + 词典替换
  const words = name.toLowerCase().split(/[\s\-–—]+/);
  const translated = words.map(w => {
    // 先找完全匹配
    if (WORD_DICT[w]) return WORD_DICT[w];
    // 试着去掉复数 s
    if (w.endsWith('s') && WORD_DICT[w.slice(0, -1)]) return WORD_DICT[w.slice(0, -1)];
    // 没匹配上返回原词 (保留英文)
    return null;
  });

  // 至少要有 1 个匹配上才算成功
  const matchCount = translated.filter(t => t !== null).length;
  if (matchCount === 0) return '';

  // 组装: 匹配上的用中文, 没匹配的保留原英文 (不显示, 或拼起来)
  // 简化: 只保留匹配上的中文词
  const zhParts = translated.filter(t => t !== null);
  // 如果是混合 (有些是中文有些是英文), 显示中文 + 原英文做括注
  const hasEn = translated.some(t => t === null);
  const zhName = zhParts.join('');
  if (hasEn && zhName.length < name.length) {
    // 混合: 中文词 + 未匹配的英文词拼一起
    const all = [];
    for (let i = 0; i < words.length; i++) {
      all.push(translated[i] !== null ? translated[i] : words[i]);
    }
    return all.join(' ');
  }
  return zhName;
}

function step3_translateZh() {
  console.log('[3] 生成中文 zhName...');
  let matched = 0;
  comps.forEach(c => {
    const zh = translateZhName(c.name);
    c.zhName = zh;
    if (zh) matched++;
  });
  const out = path.join(DATA, 'components_full.json');
  fs.writeFileSync(out, JSON.stringify(comps, null, 2));
  console.log(`  匹配: ${matched}/${comps.length} (${Math.round(matched / comps.length * 100)}%)\n`);

  // 显示样本
  const samples = comps.slice(0, 10).map(c => `  ${c.name.padEnd(28)} → ${c.zhName || '(未匹配)'}`).join('\n');
  console.log('样本:\n' + samples + '\n');
}

// ====== 主流程 ======
(async () => {
  console.log('='.repeat(60));
  console.log('enrich.js — 图标本地化 + 示例 + 中文 zhName');
  console.log('='.repeat(60) + '\n');
  await step1_downloadIcons();
  step2_copyExamples();
  step3_translateZh();
  console.log('完成!');
})();
