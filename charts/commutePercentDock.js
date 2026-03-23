/**
 * Commute-by-percent horizontal bar for the charts dock.
 * Requires demographicsPercentDock.js loaded first (Chart.register bar components + dockBarDataLabels).
 */
import { Chart } from "chart.js";
import { safeNumber, formatPercent, tickColor } from "./chartUtils.js";

let chartInstance = null;

function buildCommuteData(attrs) {
  const pctDriveAlone = safeNumber(attrs.pct_drive_alone);
  const pctCarpool = safeNumber(attrs.pct_carpool);
  const pctTransit = safeNumber(attrs.pct_transit);
  const pctWfh = safeNumber(attrs.pct_wfh);
  const otherCommuteModes = Math.max(
    0,
    100 - (pctDriveAlone + pctCarpool + pctTransit + pctWfh)
  );
  return {
    labels: [
      "Drive Alone",
      "Carpool",
      "Transit",
      "Work From Home",
      "Other commute modes",
    ],
    data: [pctDriveAlone, pctCarpool, pctTransit, pctWfh, otherCommuteModes],
  };
}

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

  const { labels, data } = buildCommuteData(attrs);
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
          backgroundColor: "rgba(183, 74, 255, 0.82)",
          borderColor: "rgba(183, 74, 255, 1)",
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
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        y: {
          ticks: {
            color: tc,
            maxRotation: 45,
            minRotation: 0,
          },
          grid: { color: "rgba(255,255,255,0.06)" },
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
