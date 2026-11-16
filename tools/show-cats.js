const c = require('../data/components_full.json');
const cats = {};
c.forEach(x => {
  const k = x.cat1 || 'Other';
  if (!cats[k]) cats[k] = {};
  const k2 = x.cat2 || '';
  if (!cats[k][k2]) cats[k][k2] = 0;
  cats[k][k2]++;
});
Object.keys(cats).sort().forEach(k => {
  const subs = Object.keys(cats[k]).sort().map(s => {
    if (!s) return `[uncategorized](${cats[k][s]})`;
    return `${s}(${cats[k][s]})`;
  }).join(', ');
  const total = Object.values(cats[k]).reduce((a, b) => a + b, 0);
  console.log(`${k} (${total}): ${subs}`);
});
