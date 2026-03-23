/**
 * Vertical bar chart: top N places in state by population.
 * Relies on demographicsPercentDock for global bar label plugin + bar scale registration.
 */
import { Chart } from "chart.js";
import { safeNumber, formatNumber, tickColor } from "./chartUtils.js";

let chartInstance = null;

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

/**
 * @param {HTMLCanvasElement | null} canvas
 * @param {Array<{ name: string; geoid: string; pop_total: number; stusps?: string }>} rows
 * @param {string} stateAbbr
 */
export function setStateTopCitiesDockChart(canvas, rows, stateAbbr = "") {
  if (!canvas || !rows || rows.length === 0) {
    destroyChart();
    return null;
  }

  const labels = rows.map((c) => c.name);
  const populations = rows.map((c) => safeNumber(c.pop_total));
  const state = stateAbbr || rows[0]?.stusps || "";
  const titleText = state
    ? `Top 10 ${state} Cities by Population`
    : "Top 10 Cities by Population";

  const tc = tickColor();

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = populations;
    chartInstance.options.plugins.title.text = titleText;
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
          label: "Population",
          data: populations,
          backgroundColor: "rgba(0, 190, 255, 0.82)",
          borderColor: "rgba(0, 190, 255, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: titleText,
          color: tc,
        },
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              return `Population: ${formatNumber(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: tc,
            callback(value) {
              if (value >= 1000000) {
                return `${(value / 1000000).toFixed(1)}M`;
              }
              if (value >= 1000) {
                return `${(value / 1000).toFixed(0)}K`;
              }
              return formatNumber(value);
            },
          },
          grid: { color: "rgba(255,255,255,0.06)" },
        },
        x: {
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

export function destroyStateTopCitiesDockChart() {
  destroyChart();
}

export function refreshStateTopCitiesDockTicks() {
  if (!chartInstance) return;
  const tc = tickColor();
  chartInstance.options.plugins.title.color = tc;
  chartInstance.options.scales.x.ticks.color = tc;
  chartInstance.options.scales.y.ticks.color = tc;
  chartInstance.update();
}

export function redrawStateTopCitiesChart() {
  chartInstance?.update();
}
