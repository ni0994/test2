// ==============================================
// Fisher-Yates シャッフル
// ==============================================
export function fisherYates(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildShuffleMap(questions) {
  const map = {};
  questions.forEach(q => {
    map[q.id] = fisherYates(q.choices.map((_, i) => i));
  });
  return map;
}

export function getDisplayOrder(questionId, shuffleMap, questionById, shuffleEnabled) {
  if (!shuffleEnabled) {
    const q = questionById.get(questionId);
    return q ? q.choices.map((_, i) => i) : [];
  }
  return shuffleMap[questionId] || [];
}

export function displayIndexToOriginal(questionId, displayIdx, shuffleMap, questionById, shuffleEnabled) {
  const order = getDisplayOrder(questionId, shuffleMap, questionById, shuffleEnabled);
  return order[displayIdx];
}
