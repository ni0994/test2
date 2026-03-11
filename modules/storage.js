// ==============================================
// localStorage 永続化層
// ==============================================
export const LS_ANSWERED_V2 = 'answered_v2';
export const LS_ANSWERED_V1 = 'answered';
export const LS_MIGRATED_AT = 'answered_migrated_from_v1_at';
export const LS_BOOKMARKS   = 'bookmarks_v1';
export const HISTORY_CAP    = 20;

function debounce(fn, ms) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), ms);
  };
}

export const saveAnswered = debounce((data) => {
  localStorage.setItem(LS_ANSWERED_V2, JSON.stringify(data));
}, 500);

export const saveBookmarks = debounce((data) => {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(data));
}, 500);

export function loadBookmarks() {
  try {
    const raw = localStorage.getItem(LS_BOOKMARKS);
    const obj = raw ? JSON.parse(raw) : {};
    return (obj && typeof obj === 'object') ? obj : {};
  } catch { return {}; }
}

export function loadAnsweredV2WithMigration() {
  const rawV2 = localStorage.getItem(LS_ANSWERED_V2);
  if (rawV2) {
    try {
      const obj = JSON.parse(rawV2);
      return (obj && typeof obj === 'object') ? obj : {};
    } catch { return {}; }
  }
  const rawV1 = localStorage.getItem(LS_ANSWERED_V1);
  if (!rawV1) return {};
  let v1 = null;
  try { v1 = JSON.parse(rawV1); } catch { return {}; }
  if (!v1 || typeof v1 !== 'object') return {};
  const now = new Date().toISOString();
  const v2 = {};
  Object.keys(v1).forEach((qid) => {
    const rec = v1[qid];
    const lastCorrect = !!(rec && rec.correct);
    v2[qid] = { attempts: 1, correct: lastCorrect ? 1 : 0, lastCorrect, lastAnsweredAt: null, history: [] };
  });
  localStorage.setItem(LS_ANSWERED_V2, JSON.stringify(v2));
  localStorage.setItem(LS_MIGRATED_AT, now);
  return v2;
}

export function cleanupAnsweredNotInQuestions(questions, answered) {
  const validIds = new Set(questions.map(q => q.id));
  let changed = false;
  Object.keys(answered).forEach(qid => {
    if (!validIds.has(qid)) { delete answered[qid]; changed = true; }
  });
  if (changed) localStorage.setItem(LS_ANSWERED_V2, JSON.stringify(answered));
}
