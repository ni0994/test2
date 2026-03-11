// ==============================================
// Fuse.js 検索 ＋ フィルタ統合
// ==============================================
import Fuse from 'fuse.js';

export function initFuse(questions) {
  return new Fuse(questions, {
    includeScore: true,
    threshold: 0.4,
    keys: [
      'id', 'domain', 'question',
      { name: 'choices',     getFn: q => q.choices.join(' ') },
      'explanation',
      { name: 'tags',        getFn: q => q.tags.join(' ') }
    ]
  });
}

export function applyFilters({ query, questions, fuse, answered, bookmarks, activeTag }) {
  let base = (query && fuse)
    ? fuse.search(query).map(r => r.item)
    : questions.slice();
  base = getFilteredByDomainPoolAndDifficulty(base, answered, bookmarks);
  if (activeTag) {
    base = base.filter(q => q.tags && q.tags.includes(activeTag));
  }
  return base;
}

export function getFilteredByDomainPoolAndDifficulty(src, answered, bookmarks) {
  const domainVal     = document.getElementById('domain-select')?.value     || 'all';
  const poolVal       = document.getElementById('pool-select')?.value       || 'all';
  const difficultyVal = document.getElementById('difficulty-select')?.value || 'all';

  let result = src.slice();

  if (domainVal !== 'all') {
    result = result.filter(q => q.domain === domainVal);
  }
  if (difficultyVal !== 'all') {
    result = result.filter(q => q.difficulty === difficultyVal);
  }
  if (poolVal === 'unanswered') {
    result = result.filter(q => !answered[q.id] || !answered[q.id].attempts);
  } else if (poolVal === 'wrong') {
    result = result.filter(q => {
      const r = answered[q.id];
      return r && r.attempts > 0 && !r.lastCorrect;
    });
  } else if (poolVal === 'never-correct') {
    result = result.filter(q => {
      const r = answered[q.id];
      return !r || r.correct === 0;
    });
  } else if (poolVal === 'bookmarked') {
    result = result.filter(q => !!bookmarks[q.id]);
  }
  return result;
}
