// app.js — GH2 组件速查手册
(function () {
  'use strict';

  // ====== 状态 ======
  let allComponents = [];
  let cats = {};          // 分类树 { cat1: { cat2: [comp, ...] } }
  let filtered = [];      // 当前展示的组件列表
  let viewMode = 'all';   // all | cat1 | cat2
  let currentCat1 = null;
  let currentCat2 = null;
  let searchTerm = '';

  // ====== 常量 ======
  const DATA_URL = '../data/components_full.json';
  const OFFICIAL_IMG = (guid) =>
    `https://www.rhino3d.com/docs/grasshopper2/images/obj=${guid}.png`;

  // ====== 初始化 ======
  async function init() {
    try {
      const resp = await fetch(DATA_URL);
      allComponents = await resp.json();
      buildCategories();
      bindEvents();
      renderSidebar();
      filterAndRender();
      loadTheme();
      document.getElementById('loading').hidden = true;
    } catch (e) {
      document.getElementById('loading').innerHTML =
        `<div style="color:#ff6b6b;padding:20px;">加载失败: ${e.message}<br>请用本地 HTTP 服务器打开 (python -m http.server)</div>`;
      console.error(e);
    }
  }

  function buildCategories() {
    cats = {};
    allComponents.forEach(c => {
      const k1 = c.cat1 || 'Other';
      const k2 = c.cat2 || '';
      if (!cats[k1]) cats[k1] = {};
      if (!cats[k1][k2]) cats[k1][k2] = [];
      cats[k1][k2].push(c);
    });
  }

  // ====== 事件绑定 ======
  function bindEvents() {
    document.getElementById('search').addEventListener('input', (e) => {
      searchTerm = e.target.value.trim().toLowerCase();
      filterAndRender();
    });

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // 弹窗关闭
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ====== 侧边栏 ======
  function renderSidebar() {
    const nav = document.getElementById('category-nav');
    const total = allComponents.length;
    document.getElementById('sidebar-count').textContent = `${total} 组件`;

    // 生成分类树 HTML
    let html = `
      <div class="cat-group" data-all="1">
        <div class="cat-main ${viewMode === 'all' ? 'active' : ''}" onclick="window._gh.selectAll()">
          <span class="cat-chevron">▶</span>
          全部组件
          <span class="cat-count">${total}</span>
        </div>
      </div>
    `;

    Object.keys(cats).sort().forEach(k1 => {
      const subs = cats[k1];
      const subs_keys = Object.keys(subs).sort();
      const total_k1 = Object.values(subs).reduce((a, b) => a + b.length, 0);

      html += `
        <div class="cat-group ${currentCat1 === k1 ? 'open' : ''}" data-cat1="${k1}">
          <div class="cat-main ${currentCat1 === k1 && !currentCat2 ? 'active' : ''}"
               onclick="window._gh.toggleCat('${k1}')">
            <span class="cat-chevron">▶</span>
            ${k1}
            <span class="cat-count">${total_k1}</span>
          </div>
          <div class="cat-subs">
      `;
      subs_keys.forEach(k2 => {
        const label = k2 || '[未分类]';
        html += `
          <div class="cat-sub ${currentCat1 === k1 && currentCat2 === k2 ? 'active' : ''}"
               onclick="event.stopPropagation(); window._gh.selectSub('${k1}','${k2}')">
            ${label}
            <span class="cat-count" style="margin-left:auto">${subs[k2].length}</span>
          </div>
        `;
      });
      html += `
          </div>
        </div>
      `;
    });

    nav.innerHTML = html;
  }

  // ====== 分类选择 ======
  function toggleCat(k1) {
    // 切换展开
    const el = document.querySelector(`[data-cat1="${k1}"]`);
    el.classList.toggle('open');
    // 同时选中一级分类 (清空二级)
    currentCat1 = k1;
    currentCat2 = null;
    viewMode = 'cat1';
    renderSidebar();
    filterAndRender();
  }

  function selectSub(k1, k2) {
    currentCat1 = k1;
    currentCat2 = k2;
    viewMode = 'cat2';
    renderSidebar();
    filterAndRender();
  }

  function selectAll() {
    currentCat1 = null;
    currentCat2 = null;
    viewMode = 'all';
    renderSidebar();
    filterAndRender();
  }

  window._gh = { toggleCat, selectSub, selectAll };

  // ====== 过滤 + 渲染 ======
  function filterAndRender() {
    // 先按分类
    let pool = allComponents;
    if (viewMode === 'cat1' && currentCat1) {
      pool = Object.values(cats[currentCat1] || {}).flat();
    } else if (viewMode === 'cat2' && currentCat1 && currentCat2 !== null) {
      pool = (cats[currentCat1] && cats[currentCat1][currentCat2]) || [];
    }

    // 再按搜索
    if (searchTerm) {
      filtered = pool.filter(c => {
        const hay = [
          c.name, c.cat1, c.cat2, c.description,
          ...(c.inputs || []).map(p => p.name + ' ' + p.facts),
          ...(c.outputs || []).map(p => p.name + ' ' + p.facts),
        ].join(' ').toLowerCase();
        return hay.includes(searchTerm);
      });
    } else {
      filtered = pool;
    }

    // 更新标题
    const titleEl = document.getElementById('content-title');
    const countEl = document.getElementById('content-count');
    const searchCountEl = document.getElementById('search-count');

    if (viewMode === 'all') {
      titleEl.textContent = '全部组件';
    } else if (viewMode === 'cat1') {
      titleEl.textContent = currentCat1;
    } else if (viewMode === 'cat2') {
      titleEl.textContent = currentCat1 + ' › ' + (currentCat2 || '[未分类]');
    }

    countEl.textContent = `共 ${filtered.length} 个`;
    searchCountEl.textContent = searchTerm ? `${filtered.length}` : '';

    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    const empty = document.getElementById('empty');

    if (filtered.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    // 限制首屏渲染数量, 滚动加载更多
    const BATCH = 60;
    grid.innerHTML = filtered.slice(0, BATCH).map(renderCard).join('');

    if (filtered.length > BATCH) {
      // 用 IntersectionObserver 懒加载
      const sentinel = document.createElement('div');
      sentinel.id = 'sentinel';
      sentinel.style.height = '1px';
      grid.appendChild(sentinel);

      let rendered = BATCH;
      const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const next = filtered.slice(rendered, rendered + BATCH);
            if (next.length === 0) { io.disconnect(); sentinel.remove(); return; }
            rendered += BATCH;
            next.forEach(c => grid.insertAdjacentHTML('beforeend', renderCard(c)));
          }
        });
      });
      io.observe(sentinel);
    }
  }

  function renderCard(c) {
    const img = OFFICIAL_IMG(c.id32);
    const shortCat = c.cat2 ? `${c.cat1} · ${c.cat2}` : c.cat1;
    const inputCount = (c.inputs || []).length;
    const outputCount = (c.outputs || []).length;
    return `
      <div class="card" onclick="window._gh.openDetail('${c.id}')">
        <div class="card-icon">
          <img src="${img}" alt="${c.name}" loading="lazy"
               onerror="this.style.display='none';this.parentNode.innerHTML='${shortCat.slice(0, 16)}'">
        </div>
        <div class="card-name">${c.name}</div>
        <div class="card-cat">${shortCat}${inputCount ? ` · ${inputCount}→${outputCount}` : ''}</div>
      </div>
    `;
  }

  // ====== 详情弹窗 ======
  function openDetail(id) {
    const c = allComponents.find(x => x.id === id);
    if (!c) return;

    const modal = document.getElementById('modal');
    const body = document.getElementById('modal-body');
    const img = OFFICIAL_IMG(c.id32);
    const hasInputs = (c.inputs || []).length > 0;
    const hasOutputs = (c.outputs || []).length > 0;

    body.innerHTML = `
      <div class="modal-header">
        <div class="modal-icon">
          <img src="${img}" alt="${c.name}"
               onerror="this.style.display='none'">
        </div>
        <div class="modal-title-block">
          <h2>${c.name}</h2>
          <div class="modal-breadcrumb">${c.cat1}${c.cat2 ? ' › ' + c.cat2 : ''} · ${c.id32.slice(0, 8)}</div>
          <div class="modal-links">
            <a href="${c.url}" target="_blank">官方文档 ↗</a>
            ${c.examples && c.examples.length ? `<a href="${c.url.replace('.html', '')}.ghz" target="_blank">示例文件 ↗</a>` : ''}
          </div>
        </div>
      </div>

      ${c.description ? `
      <div class="modal-section">
        <h3>描述 Description</h3>
        <div class="desc">${escapeHtml(c.description)}</div>
      </div>
      ` : ''}

      ${hasInputs || hasOutputs ? `
      <div class="modal-section">
        <h3>端口 Ports</h3>
        <div class="ports-grid">
          ${hasInputs ? `
          <div class="ports-col">
            <h4>输入 Inputs (${c.inputs.length})</h4>
            ${c.inputs.map(renderPort).join('')}
          </div>` : ''}
          ${hasOutputs ? `
          <div class="ports-col">
            <h4>输出 Outputs (${c.outputs.length})</h4>
            ${c.outputs.map(renderPort).join('')}
          </div>` : ''}
        </div>
      </div>
      ` : ''}
    `;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modal').hidden = true;
    document.body.style.overflow = '';
  }

  function renderPort(p) {
    const isInput = p.dir === 'input';
    const requiredBadge = p.required ? '<span class="port-required">必填</span>' : '';
    return `
      <div class="port-row ${isInput ? 'input' : 'output'}">
        ${requiredBadge}
        <div class="port-main">
          <div class="port-name">${escapeHtml(p.name)}</div>
          ${p.facts ? `<div class="port-facts">${escapeHtml(p.facts)}</div>` : ''}
          ${p.description ? `<div class="port-info">${escapeHtml(p.description)}</div>` : ''}
        </div>
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  }

  window._gh.openDetail = openDetail;

  // ====== 主题 ======
  function loadTheme() {
    const saved = localStorage.getItem('gh2-theme');
    if (saved) document.documentElement.dataset.theme = saved;
  }

  function toggleTheme() {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'dark' ? '' : 'dark';
    if (next) document.documentElement.dataset.theme = next;
    else delete document.documentElement.dataset.theme;
    localStorage.setItem('gh2-theme', next);
  }

  // ====== 启动 ======
  init();
})();
