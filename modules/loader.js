// ==============================================
// データ読み込み
// ==============================================
export async function loadMeta(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`meta load failed: ${res.status}`);
  return await res.json();
}

export async function loadQuestions(files) {
  const loads = files.map(async (p) => {
    const res = await fetch(p, { cache: 'no-store' });
    if (!res.ok) throw new Error(`questions load failed: ${p} ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error(`questions must be array: ${p}`);
    return data;
  });
  const chunks = await Promise.all(loads);
  const merged = chunks.flat();
  merged.forEach(q => {
    if (!Array.isArray(q.tags))       q.tags = [];
    if (!Array.isArray(q.choices))    q.choices = [];
    if (typeof q.domain !== 'string') q.domain = 'sec_general';
    if (typeof q.id !== 'string')     q.id = String(q.id);
  });
  return merged;
}

export function indexQuestions(questions) {
  const map = new Map();
  questions.forEach(q => map.set(q.id, q));
  return map;
}
