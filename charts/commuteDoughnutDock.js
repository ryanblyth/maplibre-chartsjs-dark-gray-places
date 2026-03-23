/**
 * Commute doughnut + HTML legend for the charts dock.
 */
import { Chart } from "chart.js";
import { dockHtmlLegendPlugin } from "./htmlLegendDockPlugin.js";
import { ensureDoughnutChartComponentsRegistered } from "./doughnutDockRegistry.js";

let chartInstance = null;

function safeNumber(value) {
  if (value == null || value === undefined || Number.isNaN(Number(value))) {
    return 0;
  }
  return Number(value);
}

function formatPercent(num) {
  if (num == null || num === undefined) return "N/A";
  return `${Number(num).toFixed(1)}%`;
}

function buildDataset(attrs) {
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
    data: [
      pctDriveAlone,
      pctCarpool,
      pctTransit,
      pctWfh,
      otherCommuteModes,
    ],
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
export function setCommuteDoughnutDockChart(canvas, attrs) {
  if (!canvas || !attrs) {
    destroyChart();
    return null;
  }

  ensureDoughnutChartComponentsRegistered();

  const { labels, data } = buildDataset(attrs);

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.update();
    return chartInstance;
  }

  chartInstance = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          label: "Percentage",
          data,
          backgroundColor: [
            "rgba(183, 74, 255, 0.82)",
            "rgba(0, 190, 255, 0.82)",
            "rgba(255, 45, 120, 0.82)",
            "rgba(0, 235, 155, 0.82)",
            "rgba(255, 149, 0, 0.82)",
          ],
          borderColor: [
            "rgba(43, 57, 66, 1.00)",
            "rgba(43, 57, 66, 1.00)",
            "rgba(43, 57, 66, 1.00)",
            "rgba(43, 57, 66, 1.00)",
            "rgba(43, 57, 66, 1.00)",
          ],
          borderWidth: 1,
        },
      ],
    },
    plugins: [dockHtmlLegendPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        dockHtmlLegend: {
          containerID: "dock-commute-doughnut-legend",
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const label = ctx.label || "";
              const value = ctx.parsed || 0;
              return `${label}: ${formatPercent(value)}`;
            },
          },
        },
      },
    },
  });

  return chartInstance;
}

export function destroyCommuteDoughnutDockChart() {
  destroyChart();
}

export function redrawCommuteDoughnutDockChart() {
  chartInstance?.update();
}
