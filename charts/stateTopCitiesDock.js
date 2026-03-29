/**
 * Horizontal bar chart: top N places in state by population.
 */
import { Chart } from "chart.js";
import { ensureBarComponentsRegistered, safeNumber, formatNumber, tickColor, CHART_COLORS, GRID_COLOR } from "./chartUtils.js";

let chartInstance = null;

function destroyChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function populationTickLabel(value) {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }
  return formatNumber(value);
}

/**
 * @param {string} titleText
 * @param {string} tc
 */
function getTopCitiesChartOptions(titleText, tc) {
  return {
    indexAxis: "y",
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
            return `Population: ${formatNumber(ctx.parsed.x)}`;
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          color: tc,
          callback(value) {
            return populationTickLabel(value);
          },
        },
        grid: { color: GRID_COLOR },
      },
      y: {
        ticks: {
          color: tc,
        },
        grid: { display: false },
      },
    },
  };
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

  ensureBarComponentsRegistered();
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
    Object.assign(chartInstance.options, getTopCitiesChartOptions(titleText, tc));
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
          backgroundColor: CHART_COLORS.cyan.bg,
          borderColor: CHART_COLORS.cyan.border,
          borderWidth: 1,
        },
      ],
    },
    options: getTopCitiesChartOptions(titleText, tc),
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
