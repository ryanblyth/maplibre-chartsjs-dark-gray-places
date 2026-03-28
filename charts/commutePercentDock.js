/**
 * Commute-by-percent horizontal bar for the charts dock.
 */
import { Chart } from "chart.js";
import { buildCommuteShares, ensureBarComponentsRegistered, formatPercent, tickColor, CHART_COLORS, GRID_COLOR } from "./chartUtils.js";

let chartInstance = null;

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

/**
 * @param {HTMLCanvasElement | null} canvas
 * @param {Record<string, unknown> | null | undefined} attrs
 */
export function setCommutePercentChart(canvas, attrs) {
  if (!canvas || !attrs) {
    destroyChart();
    return null;
  }

  ensureBarComponentsRegistered();
  const { labels, data } = buildCommuteShares(attrs);
  const tc = tickColor();

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.options.scales.x.ticks.color = tc;
    chartInstance.options.scales.y.ticks.color = tc;
    chartInstance.update();
    return chartInstance;
  }

  chartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Percentage",
          data,
          backgroundColor: CHART_COLORS.purple.bg,
          borderColor: CHART_COLORS.purple.border,
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `${ctx.label}: ${formatPercent(ctx.parsed.x)}`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: tc,
            callback: (value) => `${value}%`,
          },
          grid: { color: GRID_COLOR },
        },
        y: {
          ticks: {
            color: tc,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: { color: GRID_COLOR },
        },
      },
    },
  });

  return chartInstance;
}

export function destroyCommutePercentChart() {
  destroyChart();
}

export function refreshCommutePercentDockTicks() {
  if (!chartInstance) return;
  const tc = tickColor();
  chartInstance.options.scales.x.ticks.color = tc;
  chartInstance.options.scales.y.ticks.color = tc;
  chartInstance.update();
}

export function redrawCommutePercentChart() {
  chartInstance?.update();
}
