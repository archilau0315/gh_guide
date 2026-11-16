#!/usr/bin/env node
/**
 * parse-index.js — 解析 GH2 官方组件索引 HTML + 本机 .spec/.term 文件
 *
 * 输入:  tools/gh2-index.html（从 rhino3d.com/docs/grasshopper2/specs/ 下载的页面）
 *        本机 Grasshopper2/Documentation/English/Specs/*.spec
 *        本机 Grasshopper2/Documentation/English/Terms/*.term
 * 输出:  data/components.json   — 1416 组件完整数据
 *        data/categories.json   — 分类树（对齐 GH2 工具栏）
 *        data/terms.json        — 术语中英对照骨架
 *        data/meta.json         — 版本元信息
 *
 * 用法:  node tools/parse-index.js
 */

const fs = require('fs');
const path = require('path');

// ─── 路径 ──────────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const INDEX_HTML = path.join(ROOT, 'tools', 'gh2-index.html');
const RHINO_SPECS = path.join(
  'C:', 'Program Files', 'Rhino 9', 'Plug-ins', 'Grasshopper2',
  'Documentation', 'English', 'Specs'
);
const RHINO_TERMS = path.join(
  'C:', 'Program Files', 'Rhino 9', 'Plug-ins', 'Grasshopper2',
  'Documentation', 'English', 'Terms'
);

// ─── 1. 解析官方索引 HTML ──────────────────────────────────────────────
function parseHtml(html) {
  const components = [];
  const categories = {};
  let currentCat1 = null;
  let currentCat2 = null;
  let order1 = 0;

  // 去掉换行方便正则
  const flat = html.replace(/\r?\n/g, '');

  // 匹配所有 h2 / h3 / a 标签
  const re = /<h2[^>]*>([^<]+)<\/h2>|<h3[^>]*>([^<]+)<\/h3>|<a[^>]+href="(?:\.\.\/)?specs\/([0-9a-f]{32})\.html"[^>]*>([^<]+)<\/a>(.*?)(?=<\/li>|<li|<\/ul>|<a|<h[23])/gi;

  let m;
  while ((m = re.exec(flat)) !== null) {
    if (m[1]) {
      // h2 一级分类
      currentCat1 = m[1].trim();
      currentCat2 = null;
      if (!categories[currentCat1]) {
        categories[currentCat1] = { name: currentCat1, order: order1++, sub: {} };
      }
    } else if (m[2]) {
      // h3 二级分类
      currentCat2 = m[2].trim();
      if (currentCat1 && !categories[currentCat1].sub[currentCat2]) {
        categories[currentCat1].sub[currentCat2] = { name: currentCat2, order: Object.keys(categories[currentCat1].sub).length };
      }
    } else if (m[3]) {
      // a 组件链接
      if (!currentCat1 || !currentCat2) continue;
      const id32 = m[3];
      const name = m[4].trim();
      const tail = m[5] || '';
      const hasDeep = tail.includes('authored-mark') || tail.includes('In-depth article') || tail.includes('●');

      components.push({
        id: toGuid(id32),
        id32,
        name,
        cat1: currentCat1,
        cat2: currentCat2,
        url: `https://www.rhino3d.com/docs/grasshopper2/specs/${id32}.html`,
        hasDeepArticle: hasDeep,
        icon: null,
        inputs: [],
        outputs: [],
        description: '',
        examples: [],
        zhName: '',
        zhDescription: '',
      });
    }
  }

  return { components, categories };
}

function toGuid(id32) {
  if (!id32 || id32.length !== 32) return null;
  return `${id32.slice(0, 8)}-${id32.slice(8, 12)}-${id32.slice(12, 16)}-${id32.slice(16, 20)}-${id32.slice(20)}`;
}

// ─── 2. 解析本机 .spec 文件 ──────────────────────────────────────────────
function parseSpecs() {
  const specMap = new Map();
  if (!fs.existsSync(RHINO_SPECS)) {
    console.warn(`[spec] 目录不存在: ${RHINO_SPECS}`);
    return specMap;
  }
  const files = fs.readdirSync(RHINO_SPECS).filter(f => f.endsWith('.spec'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(RHINO_SPECS, file), 'utf8');
    const guid = content.match(/^Id:\s*([0-9a-f-]{36})/m);
    if (guid) specMap.set(guid[1].toLowerCase(), content);
  }
  console.log(`[spec] 本机 ${files.length} 个 .spec 文件`);
  return specMap;
}

function extractField(content, fieldName) {
  const re = new RegExp(`^${fieldName}:\\s*(.*?)(?=^[A-Z][a-zA-Z]+:|$)`, 'ms');
  const m = content.match(re);
  return m ? m[1].trim() : '';
}

// ─── 3. 解析本机 .term 文件 ──────────────────────────────────────────────
function parseTerms() {
  const terms = [];
  if (!fs.existsSync(RHINO_TERMS)) {
    console.warn(`[term] 目录不存在: ${RHINO_TERMS}`);
    return terms;
  }
  const files = fs.readdirSync(RHINO_TERMS).filter(f => f.endsWith('.term'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(RHINO_TERMS, file), 'utf8');
    terms.push({
      english: file.replace(/\.term$/, ''),
      definition: extractField(content, 'Definition'),
      ipa: extractField(content, 'IPA'),
      partOfSpeech: extractField(content, 'Part of Speech'),
      zh: '',
    });
  }
  console.log(`[term] 本机 ${terms.length} 条术语`);
  return terms;
}

// ─── 4. 组装并写入 ───────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(INDEX_HTML)) {
    console.error(`找不到索引文件: ${INDEX_HTML}`);
    console.error('请运行: Invoke-WebRequest -Uri "https://www.rhino3d.com/docs/grasshopper2/specs/" -OutFile tools/gh2-index.html');
    process.exit(1);
  }
  console.log(`[index] 读取 ${INDEX_HTML}`);
  const html = fs.readFileSync(INDEX_HTML, 'utf8');

  const { components, categories } = parseHtml(html);
  console.log(`[index] 解析到 ${components.length} 个组件, ${Object.keys(categories).length} 个一级分类`);

  const specMap = parseSpecs();
  let specHit = 0;
  for (const comp of components) {
    const spec = comp.id ? specMap.get(comp.id.toLowerCase()) : null;
    if (spec) {
      specHit++;
      comp.description = extractField(spec, 'Simple');
      const examples = extractField(spec, 'Examples');
      if (examples) comp.examples = examples.split('|').map(s => s.trim()).filter(Boolean);
    }
  }
  console.log(`[spec] 匹配 ${specHit}/${components.length} 个组件`);

  const terms = parseTerms();

  // 分类树排序
  const catList = Object.entries(categories)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([name, v]) => ({
      name,
      order: v.order,
      sub: Object.entries(v.sub)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([n, sv]) => ({ name: n, order: sv.order })),
    }));

  fs.mkdirSync(DATA_DIR, { recursive: true });

  const componentsPath = path.join(DATA_DIR, 'components.json');
  fs.writeFileSync(componentsPath, JSON.stringify(components, null, 2), 'utf8');
  console.log(`[write] components.json (${components.length})`);

  const catPath = path.join(DATA_DIR, 'categories.json');
  fs.writeFileSync(catPath, JSON.stringify(catList, null, 2), 'utf8');
  console.log(`[write] categories.json (${catList.length})`);

  const termPath = path.join(DATA_DIR, 'terms.json');
  fs.writeFileSync(termPath, JSON.stringify(terms, null, 2), 'utf8');
  console.log(`[write] terms.json (${terms.length})`);

  const meta = {
    gh2Version: 'Rhino 9.0.26300.09401',
    generatedAt: new Date().toISOString(),
    totalComponents: components.length,
    totalCategories: catList.length,
    totalTerms: terms.length,
    specCoverage: specHit,
    specTotal: specMap.size,
    componentsWithDeepArticle: components.filter(c => c.hasDeepArticle).length,
    sources: {
      onlineIndex: 'https://www.rhino3d.com/docs/grasshopper2/specs/',
      localSpecsDir: RHINO_SPECS,
      localTermsDir: RHINO_TERMS,
    },
  };
  fs.writeFileSync(path.join(DATA_DIR, 'meta.json'), JSON.stringify(meta, null, 2), 'utf8');
  console.log(`[write] meta.json`);

  if (components.length !== 1416) {
    console.warn(`\n⚠ 官方索引说 1416，实际解析 ${components.length}`);
  } else {
    console.log(`\n✅ 组件数量一致 (1416)`);
  }
  console.log(`✅ 深度文章 ${meta.componentsWithDeepArticle} 个 (官方 57)`);
}

main();
