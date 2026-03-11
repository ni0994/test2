// ==============================================
// 集計 ＋ ダッシュボード更新
// ==============================================
export function computeStats(questions, answered, meta) {
  const domainList = (meta && Array.isArray(meta.domains))
    ? meta.domains.map(d => d.id)
    : ['sec_general', 'sec_mgmt', 'sec_measures', 'sec_law', 'it_basic'];

  const domainTotals  = {};
  const domainSolved  = {};
  const domainCorrect = {};
  domainList.forEach(d => { domainTotals[d] = 0; domainSolved[d] = 0; domainCorrect[d] = 0; });

  const diffList = ['basic', 'standard', 'hard'];
  const diffTotals  = { basic: 0, standard: 0, hard: 0 };
  const diffSolved  = { basic: 0, standard: 0, hard: 0 };
  const diffCorrect = { basic: 0, standard: 0, hard: 0 };

  let overallSolved = 0, overallCorrect = 0;

  questions.forEach(q => {
    if (domainTotals[q.domain] != null) domainTotals[q.domain] += 1;
    const diff = q.difficulty;
    if (diff && diffTotals[diff] != null) diffTotals[diff] += 1;

    const rec = answered[q.id];
    if (!rec || !rec.attempts) return;

    overallSolved += 1;
    if (rec.lastCorrect) overallCorrect += 1;

    if (domainSolved[q.domain] != null) {
      domainSolved[q.domain] += 1;
      if (rec.lastCorrect) domainCorrect[q.domain] += 1;
    }
    if (diff && diffSolved[diff] != null) {
      diffSolved[diff] += 1;
      if (rec.lastCorrect) diffCorrect[diff] += 1;
    }
  });

  return {
    overall: { total: questions.length, solved: overallSolved, correct: overallCorrect },
    perDomain: domainList.reduce((acc, d) => {
      acc[d] = { total: domainTotals[d], solved: domainSolved[d], correct: domainCorrect[d] };
      return acc;
    }, {}),
    perDiff: diffList.reduce((acc, d) => {
      acc[d] = { total: diffTotals[d], solved: diffSolved[d], correct: diffCorrect[d] };
      return acc;
    }, {})
  };
}

export function updateStatsDashboard(stats) {
  const o = stats.overall;
  const rateOverall = o.solved > 0 ? ((o.correct / o.solved) * 100).toFixed(1) : '0.0';

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('overall-total',   o.total);
  set('overall-solved',  o.solved);
  set('overall-correct', o.correct);
  set('overall-rate',    rateOverall);

  const progressPct = o.total > 0 ? ((o.solved / o.total) * 100).toFixed(1) : '0.0';
  const overallBar  = document.getElementById('overall-progress-bar');
  if (overallBar) overallBar.style.width = progressPct + '%';

  document.querySelectorAll('#stats-domains .stats-domain').forEach(el => {
    const domain = el.getAttribute('data-domain');
    const s = stats.perDomain[domain];
    if (!s) return;
    el.querySelector('.total').textContent  = s.total;
    el.querySelector('.solved').textContent = s.solved;
    const rate = s.solved > 0 ? ((s.correct / s.solved) * 100).toFixed(1) : '0.0';
    el.querySelector('.rate').textContent   = rate;
    const barInner = el.querySelector('.stats-bar > i');
    if (barInner && s.total > 0) barInner.style.width = ((s.solved / s.total) * 100).toFixed(1) + '%';
  });

  document.querySelectorAll('#stats-difficulty .stats-diff-row').forEach(el => {
    const diff = el.getAttribute('data-diff');
    const s = stats.perDiff[diff];
    if (!s) return;
    el.querySelector('.diff-total').textContent  = s.total;
    el.querySelector('.diff-solved').textContent = s.solved;
    const rate = s.solved > 0 ? ((s.correct / s.solved) * 100).toFixed(1) : '0.0';
    el.querySelector('.diff-rate').textContent   = rate;
    const barInner = el.querySelector('.stats-bar > i');
    if (barInner && s.total > 0) barInner.style.width = ((s.solved / s.total) * 100).toFixed(1) + '%';
  });
}
