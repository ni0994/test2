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
  domainList.forEach(d => {
    domainTotals[d]  = 0;
    domainSolved[d]  = 0;
    domainCorrect[d] = 0;
  });

  const diffList    = ['basic', 'standard', 'hard'];
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
  const rateOverall = o.solved > 0
    ? ((o.correct / o.solved) * 100).toFixed(1)
    : '0.0';

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  set('overall-total',   o.total);
  set('overall-solved',  o.solved);
  set('overall-correct', o.correct);
  set('overall-rate',    rateOverall);

  const progressPct = o.total > 0
    ? ((o.solved / o.total) * 100).toFixed(1)
    : '0.0';
  const overallBar = document.getElementById('overall-progress-bar');
  if (overallBar) overallBar.style.width = progressPct + '%';

  document.querySelectorAll('#stats-domains .stats-domain').forEach(el => {
    const domain = el.getAttribute('data-domain');
    const s = stats.perDomain[domain];
    if (!s) return;
    const totalEl  = el.querySelector('.total');
    const solvedEl = el.querySelector('.solved');
    const rateEl   = el.querySelector('.rate');
    if (totalEl)  totalEl.textContent  = s.total;
    if (solvedEl) solvedEl.textContent = s.solved;
    const rate = s.solved > 0
      ? ((s.correct / s.solved) * 100).toFixed(1)
      : '0.0';
    if (rateEl) rateEl.textContent = rate;
    const barInner = el.querySelector('.stats-bar > i');
    if (barInner && s.total > 0) {
      // ✅ 修正: solved → s.solved
      barInner.style.width = ((s.solved / s.total) * 100).toFixed(1) + '%';
    }
  });

  document.querySelectorAll('#stats-difficulty .stats-diff-row').forEach(el => {
    const diff = el.getAttribute('data-diff');
    const s = stats.perDiff[diff];
    if (!s) return;
    const totalEl  = el.querySelector('.diff-total');
    const solvedEl = el.querySelector('.diff-solved');
    const rateEl   = el.querySelector('.diff-rate');
    if (totalEl)  totalEl.textContent  = s.total;
    if (solvedEl) solvedEl.textContent = s.solved;
    const rate = s.solved > 0
      ? ((s.correct / s.solved) * 100).toFixed(1)
      : '0.0';
    if (rateEl) rateEl.textContent = rate;
    const barInner = el.querySelector('.stats-bar > i');
    if (barInner && s.total > 0) {
      // ✅ 修正: solved → s.solved
      barInner.style.width = ((s.solved / s.total) * 100).toFixed(1) + '%';
    }
  });

  drawOverallPieChart(stats.overall);
}

// ==============================================
// 全体進捗円グラフ（Chart.js による）
// ==============================================
export function drawOverallPieChart(overall) {
  const canvasEl = document.getElementById('overall-progress-pie');
  if (!canvasEl) return;
  // Chart.js が読み込まれていない場合はスキップ
  if (typeof Chart === 'undefined') return;

  const ctx      = canvasEl.getContext('2d');
  const total    = overall.total;
  const solved   = overall.solved;
  const remained = total - solved;

  const data = {
    labels: ['解答済み', '未回答'],
    datasets: [{
      data: [solved, remained],
      backgroundColor: ['#2E7D32', '#E57373'],
      borderWidth: 1,
      borderColor: '#ddd'
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 15 }
      },
      tooltip: {
        callbacks: {
          label(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const rate  = ((value / total) * 100).toFixed(1);
            return `${label}: ${value}問 (${rate}%)`;
          }
        }
      }
    }
  };

  const existing = Chart.getChart(ctx);
  if (existing) existing.destroy();
  new Chart(ctx, { type: 'doughnut', data, options });
}
