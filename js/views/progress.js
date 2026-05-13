import { estimatedOneRm } from '../pr.js';
import { groupByDay } from '../util.js';

let chartInstance = null;

function buildSeries(sets) {
  // Best estimated 1RM per session day. Newest day at the end.
  const grouped = groupByDay(sets); // [[dateKey, sets], ...] newest first
  const points = grouped
    .map(([dateKey, daySets]) => {
      const best = daySets.reduce(
        (m, s) => Math.max(m, estimatedOneRm(s.weight, s.reps)),
        0
      );
      return { dateKey, value: Math.round(best * 10) / 10 };
    })
    .reverse(); // oldest → newest for charting
  return points;
}

export function renderProgressTab(pane, exercise, sets) {
  const canvas = pane.querySelector('#chart');
  const empty  = pane.querySelector('#chart-empty');
  const series = buildSeries(sets);

  if (series.length < 2) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
    canvas.hidden = true;
    empty.hidden = false;
    return;
  }
  canvas.hidden = false;
  empty.hidden = true;

  if (typeof Chart === 'undefined') {
    // CDN still loading; retry shortly.
    setTimeout(() => renderProgressTab(pane, exercise, sets), 150);
    return;
  }

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: series.map((p) => p.dateKey.slice(5)), // MM-DD
      datasets: [{
        label: 'Est. 1RM (lbs)',
        data: series.map((p) => p.value),
        borderColor: '#ffb84d',
        backgroundColor: 'rgba(255,184,77,0.15)',
        pointBackgroundColor: '#ffb84d',
        pointRadius: 4,
        pointHoverRadius: 5,
        borderWidth: 2,
        tension: 0.25,
        fill: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.parsed.y} lbs (est)`,
          },
        },
      },
      scales: {
        x: { ticks: { color: '#8a93a3' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#8a93a3' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: false },
      },
    },
  });
}
