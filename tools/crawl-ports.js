// crawl-ports.js — 爬 1416 个 GH2 官方组件详情页, 正则解析 inputs/outputs
// 每个详情页 HTML 里有 <span class="param-spot" aria-label="..."> 结构
// 限速 2 req/s, 预计 12 分钟

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const comps = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'components.json'), 'utf-8'));

const BASE = 'https://www.rhino3d.com/docs/grasshopper2/specs/';
const OUT = path.join(ROOT, 'data', 'components_full.json');

// 从 HTML 里提取端口
function extractPorts(html) {
  const inputs = [];
  const outputs = [];

  // 直接抓 param-tip 块 (内部 span 不嵌套, 可安全非贪婪)
  const tipRe = /<span class="param-tip">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = tipRe.exec(html)) !== null) {
    const t = m[1];
    const b = t.match(/<b>([^<]+)<\/b>/);
    const i = t.match(/<i>([^<]+)<\/i>/);
    if (!b || !i) continue;
    const f = t.match(/<span class="param-facts">([^<]*)/);
    const info = t.match(/<span class="param-info">([^<]*)/);

    const factsRaw = f ? f[1].trim().replace(/&#183;/g, '·').replace(/&middot;/g, '·') : '';
    const p = {
      name: b[1].trim(),
      dir: i[1].trim(), // input / output
      facts: factsRaw,
      description: info ? info[1].trim() : '',
      required: factsRaw.includes('required'),
    };

    const dir = p.dir;
    dir === 'input' ? inputs.push(p) : outputs.push(p);
  }

  return { inputs, outputs };
}

// 也提取 description
function extractDescription(html) {
  const m = html.match(/<div class="content-simple">\s*<p>([\s\S]*?)<\/p>/);
  if (!m) return '';
  // 去掉所有 HTML 标签
  return m[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
}

// 也提取组件图片 (obj=GUID.png)
function extractPreviewImg(html, guid) {
  const m = html.match(/src="\.\.\/images\/obj=([^"]+)\.png"/);
  return m ? `${BASE.replace('specs/', '')}images/obj=${m[1]}.png` : null;
}

// 也提取分类 crumb
function extractCrumb(html) {
  const m = html.match(/<div class="crumbs">[\s\S]*?<span class="crumb-sub">([^<]+)<\/span>/);
  return m ? m[1].trim() : '';
}

// HTTPS GET with redirect follow
function fetchUrl(url, retries = 2) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          attempt(n); // 跟随重定向
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error('HTTP ' + res.statusCode));
          return;
        }
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', (e) => {
        if (n > 0) attempt(n - 1);
        else reject(e);
      });
    };
    attempt(retries);
  });
}

// 限速队列
class RateLimiter {
  constructor(rps) { this.delay = 1000 / rps; this.last = 0; }
  async wait() {
    const now = Date.now();
    const wait = Math.max(0, this.last + this.delay - now);
    this.last = now + wait;
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
  }
}

async function main() {
  const rl = new RateLimiter(2); // 2 req/s
  const results = [];
  let ok = 0, fail = 0, withPorts = 0;

  console.log("总组件:", comps.length);
  console.log("速度: 2 req/s, 预计 ~" + Math.ceil(comps.length / 2 / 60) + " 分钟\n");

  // 支持断点续爬
  let startIdx = 0;
  if (fs.existsSync(OUT + '.partial')) {
    try {
      const partial = JSON.parse(fs.readFileSync(OUT + '.partial', 'utf-8'));
      results.push(...partial);
      startIdx = partial.length;
      console.log("断点续爬, 从索引", startIdx, "开始");
    } catch (e) {}
  }

  for (let i = startIdx; i < comps.length; i++) {
    const c = comps[i];
    await rl.wait();

    try {
      const html = await fetchUrl(c.url);
      const { inputs, outputs } = extractPorts(html);
      const description = extractDescription(html) || c.description;
      const crumb = extractCrumb(html);

      if (inputs.length > 0 || outputs.length > 0) withPorts++;
      ok++;

      results.push({
        ...c,
        cat1: crumb || c.cat1, // 用官方 crumb 校正一级分类
        description: description,
        inputs,
        outputs,
      });
    } catch (e) {
      fail++;
      results.push(c); // 保留原数据
    }

    if ((i + 1) % 50 === 0) {
      const pct = ((i + 1) / comps.length * 100).toFixed(1);
      console.log(`[${i + 1}/${comps.length}] ${pct}% ok=${ok} fail=${fail} withPorts=${withPorts}`);
      // 保存 partial
      fs.writeFileSync(OUT + '.partial', JSON.stringify(results));
    }
  }

  // 最终写入
  fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
  try { fs.unlinkSync(OUT + '.partial'); } catch (e) {}

  console.log("\n完成!");
  console.log("总组件:", comps.length);
  console.log("成功:", ok);
  console.log("失败:", fail);
  console.log("有端口数据:", withPorts);
  console.log("输出:", OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
