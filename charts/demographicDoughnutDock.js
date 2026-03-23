/**
 * Demographics ethnicity doughnut + HTML legend for the charts dock.
 */
import { Chart } from "chart.js";
import { dockHtmlLegendPlugin } from "./htmlLegendDockPlugin.js";
import { ensureDoughnutChartComponentsRegistered } from "./doughnutDockRegistry.js";
import { safeNumber, formatPercent } from "./chartUtils.js";

let chartInstance = null;

function buildDataset(attrs) {
  const pctNonhispWhite = safeNumber(attrs.pct_nonhisp_white);
  const pctHispanic = safeNumber(attrs.pct_hispanic);
  const pctNonhispBlack = safeNumber(attrs.pct_nonhisp_black);
  const pctNonhispAsian = safeNumber(attrs.pct_nonhisp_asian);
  const otherNonHispanic = Math.max(
    0,
    100 -
      (pctNonhispWhite + pctHispanic + pctNonhispBlack + pctNonhispAsian)
  );
  return {
    labels: [
      "Non-Hispanic White",
      "Hispanic",
      "Black",
      "Asian",
      "Other Non-Hispanic",
    ],
    data: [
      pctNonhispWhite,
      pctHispanic,
      pctNonhispBlack,
      pctNonhispAsian,
      otherNonHispanic,
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
export function setDemographicDoughnutDockChart(canvas, attrs) {
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
            "rgba(0, 190, 255, 0.82)",
            "rgba(255, 45, 120, 0.82)",
            "rgba(0, 235, 155, 0.82)",
            "rgba(255, 149, 0, 0.82)",
            "rgba(183, 74, 255, 0.82)",
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
