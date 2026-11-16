// match-icons.js — 把 1416 组件和 1971 图标资源名对上
// 策略: display name "Bending Points" -> 尝试匹配资源名 Grasshopper.Resources.Icons.*.BendingPoints

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const comps = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'components.json'), 'utf-8'));
const iconMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'icon_map.json'), 'utf-8'));

// 图标资源名 -> 短名 (去掉前缀 Grasshopper.Resources.Icons.)
const iconShorts = Object.keys(iconMap).map(k => {
  const parts = k.split('.');
  return parts[parts.length - 1]; // 最后一段, e.g. "BendingPoints"
});
console.log("图标资源总数:", iconShorts.length, "(去重后:", new Set(iconShorts).size + ")");

// 预构建: 小写 -> 资源全名
const byLower = {};
for (const full of Object.keys(iconMap)) {
  const short = full.split('.').pop().toLowerCase();
  if (!byLower[short]) byLower[short] = [];
  byLower[short].push(full);
}

// 匹配一个组件名 -> icon key
function matchIcon(compName) {
  // 1. 空格连接的单词直接拼: "Bending Points" -> "BendingPoints"
  const camelCase = compName.replace(/\s+/g, '');
  // 2. 去掉非字母数字
  const clean = camelCase.replace(/[^a-zA-Z0-9]/g, '');
  // 3. 各种小写变体
  const variants = [
    clean,                          // BendingPoints
    clean.toLowerCase(),             // bendingpoints
    compName.replace(/\s+/g, '_'),  // Bending_Points
    compName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase(),
  ];

  for (const v of variants) {
    if (byLower[v]) return byLower[v][0];
  }

  // 4. 子串匹配: 图标名包含组件名的关键字
  const words = compName.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  for (const iconShort of Object.keys(byLower)) {
    const match = words.every(w => iconShort.includes(w));
    if (match && iconShort.length < 40) {
      return byLower[iconShort][0];
    }
  }

  return null;
}

// 执行匹配
let matched = 0, unmatched = 0;
const compsWithIcon = comps.map(c => {
  const key = matchIcon(c.name);
  if (key) matched++;
  else unmatched++;
  return { ...c, icon: key };
});

// 输出
console.log("\n=== 匹配结果 ===");
console.log("总组件:", comps.length);
console.log("匹配:", matched);
console.log("未匹配:", unmatched);
console.log("匹配率:", (matched / comps.length * 100).toFixed(1) + "%");

// 展示前 20 个匹配和前 10 个未匹配
console.log("\n=== 已匹配样本 (前 20) ===");
compsWithIcon.filter(c => c.icon).slice(0, 20).forEach(c => {
  console.log(`  ${c.name.padEnd(30)} -> ${c.icon}`);
});

console.log("\n=== 未匹配样本 (前 15) ===");
compsWithIcon.filter(c => !c.icon).slice(0, 15).forEach(c => {
  console.log(`  ${c.name}`);
});

// 写入
fs.writeFileSync(
  path.join(ROOT, 'data', 'components_with_icons.json'),
  JSON.stringify(compsWithIcon, null, 2)
);
console.log("\n已写入 data/components_with_icons.json");
