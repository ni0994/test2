// ==============================================
// DOM構築 — buildCard / renderQuestions
// ==============================================
export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderQuestions(questions, state, callbacks) {
  const container = document.getElementById('questions-container');
  if (!container) return;
  container.innerHTML = '';
  if (!questions || questions.length === 0) {
    container.innerHTML = '<p style="color:#888;text-align:center;padding:2rem 0;">表示できる問題がありません。</p>';
    return;
  }
  questions.forEach(q => container.appendChild(buildCard(q, state, callbacks)));
}

export function buildCard(q, state, callbacks) {
  const { answered, bookmarks, activeTag, meta } = state;
  const { onChoose, onRetry, onToggleBookmark, onSetTag, onClearTag, isShuffleEnabled } = callbacks;

  const card = document.createElement('div');
  card.className = 'question-card';
  card.dataset.questionId = q.id;

  const title = document.createElement('div');
  title.className = 'question-title';

  const bmBtn = document.createElement('button');
  bmBtn.className = 'bookmark-btn' + (bookmarks[q.id] ? ' is-bookmarked' : '');
  bmBtn.title = 'ブックマーク';
  bmBtn.textContent = bookmarks[q.id] ? '🔖' : '📌';

  bmBtn.addEventListener('click', () => {
    // ✅ 修正: onToggleBookmark を呼んだあと、現在の is-bookmarked 状態を
    //    ボタン自身のクラスで判定し、反転させる（古い state 参照を使わない）
    const wasBookmarked = bmBtn.classList.contains('is-bookmarked');
    onToggleBookmark(q.id);
    const nowBookmarked = !wasBookmarked;
    bmBtn.classList.toggle('is-bookmarked', nowBookmarked);
    bmBtn.textContent = nowBookmarked ? '🔖' : '📌';
  });

  const titleText = document.createElement('span');
  titleText.textContent = q.id;
  title.appendChild(bmBtn);
  title.appendChild(titleText);

  const metaRow = document.createElement('div');
  metaRow.className = 'question-meta';
  metaRow.innerHTML =
    `<span class="badge badge--domain">🗂 ${domainLabel(q.domain, meta)}</span>` +
    (q.difficulty ? `<span class="badge badge--diff">⚡ ${q.difficulty}</span>` : '');

  if (q.tags?.length) {
    q.tags.forEach(t => {
      const chip = document.createElement('button');
      chip.className = 'chip chip--clickable' + (activeTag === t ? ' chip--active' : '');
      chip.textContent = t;
      chip.title = `タグ「${t}」で絞り込む`;
      chip.addEventListener('click', () => {
        if (activeTag === t) onClearTag();
        else onSetTag(t);
      });
      metaRow.appendChild(chip);
    });
  }

  const text = document.createElement('p');
  text.className = 'question-text';
  text.textContent = q.question;

  const choicesWrap = document.createElement('div');
  choicesWrap.className = 'choices';
  const order = getDisplayOrder(q, state, isShuffleEnabled);
  order.forEach((origIdx, displayIdx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.dataset.displayIndex = displayIdx;
    btn.dataset.origIndex    = origIdx;
    btn.innerHTML =
      `<span class="choice-key">${String.fromCharCode(65 + displayIdx)}</span>` +
      escapeHtml(q.choices[origIdx]);
    btn.addEventListener('click', () => onChoose(q.id, displayIdx, card));
    choicesWrap.appendChild(btn);
  });

  const result   = document.createElement('div');
  result.className = 'question-result';
  const expl     = document.createElement('div');
  expl.className = 'question-explanation';
  const retryBtn = document.createElement('button');
  retryBtn.className = 'retry-btn hidden';
  retryBtn.textContent = '🔄 再挑戦';
  retryBtn.addEventListener('click', () => onRetry(q.id, card));

  card.appendChild(title);
  card.appendChild(metaRow);
  card.appendChild(text);
  card.appendChild(choicesWrap);
  card.appendChild(result);
  card.appendChild(expl);
  card.appendChild(retryBtn);

  applyAnsweredState(q, card, answered);
  return card;
}

export function applyAnsweredState(q, cardEl, answered) {
  const rec = answered[q.id];
  cardEl.classList.remove('state-unanswered', 'state-correct', 'state-wrong');
  if (!rec || !rec.attempts) {
    cardEl.classList.add('state-unanswered');
    return;
  }
  cardEl.classList.add(rec.lastCorrect ? 'state-correct' : 'state-wrong');
  cardEl.querySelectorAll('.choice-btn').forEach(btn => {
    btn.disabled = true;
    if (Number(btn.dataset.origIndex) === q.answer) btn.classList.add('is-correct');
  });
  showJudgeResult(cardEl, rec.lastCorrect);
  showExplanation(cardEl, q);
  cardEl.querySelector('.retry-btn')?.classList.remove('hidden');
}

export function showJudgeResult(cardEl, isCorrect) {
  const el = cardEl.querySelector('.question-result');
  if (!el) return;
  el.textContent = isCorrect ? '✅ 正解' : '❌ 不正解';
  el.style.color  = isCorrect ? 'var(--ok)' : 'var(--ng)';
}

export function showExplanation(cardEl, q) {
  const el = cardEl.querySelector('.question-explanation');
  if (el) el.textContent = q.explanation || '';
}

function domainLabel(domainId, meta) {
  const domains = (meta && Array.isArray(meta.domains)) ? meta.domains : [];
  const found = domains.find(d => d.id === domainId);
  return found ? (found.label || found.id) : domainId;
}

function getDisplayOrder(q, state, isShuffleEnabled) {
  if (!isShuffleEnabled()) return q.choices.map((_, i) => i);
  return state.shuffleMap[q.id] || q.choices.map((_, i) => i);
}
