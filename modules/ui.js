// ==============================================
// UIイベント登録（setup* 関数群）
// ==============================================
import { fisherYates } from './shuffle.js';

export function setupSearchEvents(callbacks) {
  const input  = document.getElementById('search-input');
  const button = document.getElementById('search-button');
  if (!input || !button) return;
  const run = () => callbacks.onSearch(input.value.trim());
  button.addEventListener('click', run);
  input.addEventListener('keypress', e => { if (e.key === 'Enter') run(); });
  input.addEventListener('input',    () => { if (input.value === '') callbacks.onSearch(''); });
}

export function setupFilterEvents(callbacks) {
  const domainSel     = document.getElementById('domain-select');
  const poolSel       = document.getElementById('pool-select');
  const difficultySel = document.getElementById('difficulty-select');
  const random10      = document.getElementById('random10');
  const shuffleToggle = document.getElementById('shuffle-toggle');

  const getQuery = () => document.getElementById('search-input')?.value.trim() ?? '';

  if (domainSel)     domainSel.addEventListener('change',     () => callbacks.onFilter(getQuery()));
  if (poolSel)       poolSel.addEventListener('change',       () => callbacks.onFilter(getQuery()));
  if (difficultySel) difficultySel.addEventListener('change', () => callbacks.onFilter(getQuery()));
  if (shuffleToggle) shuffleToggle.addEventListener('change', () => callbacks.onRender());

  if (random10) {
    random10.addEventListener('click', () => {
      const pool = callbacks.getFilteredPool();
      if (pool.length === 0) { alert('対象問題がありません。'); return; }
      const shuffled = fisherYates(pool).slice(0, 10);
      callbacks.onRandom(shuffled);
    });
  }

  document.getElementById('btn-clear-tag')
    ?.addEventListener('click', () => callbacks.onClearTag());
  document.getElementById('btn-clear-bookmarks')
    ?.addEventListener('click', () => {
      if (!confirm('全てのブックマークを解除しますか？')) return;
      callbacks.onClearBookmarks();
    });
}

export function setupKeyboardAnswerEvents() {
  document.addEventListener('keydown', e => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const keyMap = { a: 0, b: 1, c: 2, d: 3 };
    const idx = keyMap[e.key.toLowerCase()];
    if (idx === undefined) return;
    const cards = [...document.querySelectorAll('.question-card.state-unanswered')];
    if (cards.length === 0) return;
    const vpMid = window.innerHeight / 2;
    let target = cards[0], minDist = Infinity;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const dist = Math.abs(rect.top + rect.height / 2 - vpMid);
      if (dist < minDist) { minDist = dist; target = card; }
    });
    const btns = target.querySelectorAll('.choice-btn');
    if (btns[idx]) btns[idx].click();
  });
}

export function setupFilterToggle() {
  const btn  = document.getElementById('filter-toggle');
  const body = document.getElementById('filter-body');
  if (!btn || !body) return;
  btn.addEventListener('click', () => {
    const isOpen = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isOpen));
    body.classList.toggle('hidden', isOpen);
    const spanEl = btn.querySelector('span');
    if (spanEl) spanEl.textContent = isOpen ? '▶ フィルタ・設定' : '🔽 フィルタ・設定';
  });
}

export function setupBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('hidden', window.scrollY <= 400);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

export function setupOfflineBanner() {
  const banner = document.getElementById('offline-banner');
  if (!banner) return;
  const update = () => banner.classList.toggle('hidden', navigator.onLine);
  window.addEventListener('online',  update);
  window.addEventListener('offline', update);
  update();
}

export function setupHiddenAdmin(callbacks) {
  const header = document.querySelector('.app-header');
  const panel  = document.getElementById('admin-panel');
  if (!header || !panel) return;

  let clickCount = 0, clickTimer = null;
  header.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 1500);
    if (clickCount >= 5) { clickCount = 0; panel.classList.toggle('hidden'); }
  });

  document.getElementById('btn-clear-cache')
    ?.addEventListener('click', async () => {
      if (!confirm('Service Worker キャッシュを削除します。よろしいですか？')) return;
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      alert('キャッシュを削除しました。ページを再読み込みします。');
      location.reload(true);
    });

  document.getElementById('btn-reset-answers')
    ?.addEventListener('click', () => {
      if (!confirm('全ての回答履歴を消去します。この操作は元に戻せません。よろしいですか？')) return;
      callbacks.onResetAll();
      panel.classList.add('hidden');
      alert('回答履歴を消去しました。');
    });

  document.getElementById('btn-reset-answers-only')
    ?.addEventListener('click', () => {
      if (!confirm('回答履歴のみを消去します。ブックマークは保持されます。この操作は元に戻せません。よろしいですか？')) return;
      callbacks.onResetAnswersOnly();
      panel.classList.add('hidden');
      alert('回答履歴を消去しました。ブックマークは保持されています。');
    });

  document.getElementById('btn-admin-close')
    ?.addEventListener('click', () => panel.classList.add('hidden'));
}

export function setupDomainStatsBlocks(meta) {
  const wrap = document.getElementById('stats-domains');
  if (!wrap || wrap.childElementCount > 0) return;
  const domains = (meta && Array.isArray(meta.domains)) ? meta.domains : [];
  domains.forEach(d => {
    const el = document.createElement('div');
    el.className = 'stats-domain';
    el.setAttribute('data-domain', d.id);

    const label = document.createElement('div');
    label.className   = 'label';
    label.textContent = d.label || d.id;

    const body = document.createElement('div');
    body.className = 'body';
    // ✅ 修正: .total .solved .rate スパンを復元
    body.innerHTML =
      `総: <span class="total">0</span> / ` +
      `回答: <span class="solved">0</span> / ` +
      `正答率: <span class="rate">0.0</span>%`;

    const bar = document.createElement('div');
    bar.className = 'stats-bar';
    bar.appendChild(document.createElement('i'));

    el.appendChild(label);
    el.appendChild(body);
    el.appendChild(bar);
    wrap.appendChild(el);
  });
}

export function buildDomainFilter(meta) {
  const sel = document.getElementById('domain-select');
  if (!sel) return;
  while (sel.options.length > 1) sel.remove(1);
  const domains = (meta && Array.isArray(meta.domains)) ? meta.domains : [];
  domains.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d.id;
    opt.textContent = d.label || d.id;
    sel.appendChild(opt);
  });
}

// ==============================================
// ダッシュボードの開閉（アコーディオン）
// ==============================================
export function setupDashboardToggle() {
  const toggleBtn = document.getElementById('toggle-stats');
  const wrapper   = document.getElementById('stats-wrapper');
  if (!toggleBtn || !wrapper) return;

  toggleBtn.addEventListener('click', () => {
    const isOpen = !wrapper.classList.contains('hidden');
    // ✅ 修正: !isOpen → isOpen（開いている時に hidden を付けて閉じる）
    wrapper.classList.toggle('hidden', isOpen);
    toggleBtn.textContent = isOpen
      ? '📊 進捗・正答率を開く'
      : '📊 進捗・正答率を閉じる';
  });
}
