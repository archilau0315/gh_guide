// parse-terms.js — 从 Rhino 安装目录的 .term 文件解析术语 → data/terms.json
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TERM_DIR = 'C:\\Program Files\\Rhino 9\\Plug-ins\\Grasshopper2\\Documentation\\English\\Terms';
const OUT = path.join(ROOT, 'data', 'terms.json');

// 读已有的 terms.json 做对比
let existing = {};
if (fs.existsSync(OUT)) {
  try { existing = JSON.parse(fs.readFileSync(OUT, 'utf-8')); } catch(e) {}
}

const files = fs.readdirSync(TERM_DIR).filter(f => f.endsWith('.term'));
console.log(`找到 ${files.length} 个 .term 文件`);

// 解析单个 .term 文件内容
function parseTermFile(content, filename) {
  const term = {
    id: filename.replace('.term', ''),
    zh: '',
    en: '',
    definition: '',
    seeAlso: [],
  };

  // .term 格式: JSON 或简单文本
  // 尝试 JSON 解析
  try {
    const json = JSON.parse(content);
    if (json.term) term.en = json.term;
    if (json.definition) term.definition = json.definition;
    if (json.seeAlso) term.seeAlso = Array.isArray(json.seeAlso) ? json.seeAlso : [];
  } catch (e) {
    // 不是 JSON, 尝试简易格式: 第一行是术语, 后面是定义
    const lines = content.split(/\r?\n/).filter(l => l.trim());
    term.en = lines[0] || filename.replace('.term', '');
    term.definition = lines.slice(1).join(' ').trim();
  }

  // 用已有 zh
  const existingEntry = existing[term.id];
  if (existingEntry && existingEntry.zh) term.zh = existingEntry.zh;

  return term;
}

const result = [];
files.forEach(f => {
  const fullPath = path.join(TERM_DIR, f);
  const content = fs.readFileSync(fullPath, 'utf-8');
  result.push(parseTermFile(content, f));
});

// 按英文术语排序
result.sort((a, b) => (a.en || a.id).localeCompare(b.en || b.id));

fs.writeFileSync(OUT, JSON.stringify(result, null, 2));

// 统计
const withDef = result.filter(t => t.definition).length;
const withZh = result.filter(t => t.zh).length;
console.log(`解析完成: ${result.length} 条术语`);
console.log(`有定义: ${withDef}`);
console.log(`有中文: ${withZh}`);
console.log(`输出: ${OUT}`);
