/**
 * Demographics ethnicity doughnut + HTML legend for the charts dock.
 */
import { Chart } from "chart.js";
import { dockHtmlLegendPlugin } from "./htmlLegendDockPlugin.js";
import { ensureDoughnutChartComponentsRegistered } from "./doughnutDockRegistry.js";
import { buildDemographicsShares, formatPercent, CHART_COLORS, DOUGHNUT_BORDER } from "./chartUtils.js";

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
export function setDemographicDoughnutDockChart(canvas, attrs) {
  if (!canvas || !attrs) {
    destroyChart();
    return null;
  }

  ensureDoughnutChartComponentsRegistered();

  const { labels, data } = buildDemographicsShares(attrs);

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
            CHART_COLORS.cyan.bg,
            CHART_COLORS.pink.bg,
            CHART_COLORS.green.bg,
            CHART_COLORS.orange.bg,
            CHART_COLORS.purple.bg,
          ],
          borderColor: Array(5).fill(DOUGHNUT_BORDER),
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
          containerID: "dock-demographic-doughnut-legend",
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

export function destroyDemographicDoughnutDockChart() {
  destroyChart();
}

export function redrawDemographicDoughnutDockChart() {
  chartInstance?.update();
}
