/**
 * match-examples.js
 * 把 site/examples 下的 .ghz 按文件名反查组件，补进 data/components_full.json 的 examples 字段。
 * 只补充原本为空的组件，不改动已由官方 .spec 建立的关联。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'data', 'components_full.json');
const EX_DIR = path.join(ROOT, 'site', 'examples');

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const files = fs.readdirSync(EX_DIR).filter((f) => f.toLowerCase().endsWith('.ghz'));

const byKey = new Map();
for (const f of files) {
  const key = norm(path.basename(f, path.extname(f)));
  if (!byKey.has(key)) byKey.set(key, []);
  byKey.get(key).push(f);
}

let filled = 0;
for (const c of data) {
  if (c.examples && c.examples.length) continue;
  const key = norm(c.name);
  let hit = byKey.get(key);
  // 退化匹配：组件名 + 常见后缀变体
  if (!hit) {
    for (const suffix of ['2', '3', 'a', 'b']) {
      if (byKey.has(key + suffix)) { hit = byKey.get(key + suffix); break; }
    }
  }
  if (hit) {
    c.examples = hit.slice();
    filled++;
  }
}

fs.writeFileSync(DATA, JSON.stringify(data, null, 2), 'utf8');

const withEx = data.filter((c) => c.examples && c.examples.length).length;
const used = new Set(data.flatMap((c) => c.examples || []));
console.log(`示例文件总数: ${files.length}`);
console.log(`本次按名补充组件: ${filled}`);
console.log(`含示例组件合计: ${withEx} / ${data.length}`);
console.log(`被引用示例文件: ${used.size}`);
