/**
 * Demographics-by-percent horizontal bar chart for the map preview charts dock.
 * Data logic matches chartjs-places createDemographicsPercentChart / updateDemographicsPercentChart.
 */
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { safeNumber, formatPercent, tickColor } from "./chartUtils.js";

const BAR_LABEL_COLOR = "rgba(232, 234, 237, 0.55)";

let chartInstance = null;

function buildMetrics(attrs) {
  const pctNonhispWhite = safeNumber(attrs.pct_nonhisp_white);
  const pctHispanic = safeNumber(attrs.pct_hispanic);
  const pctNonhispBlack = safeNumber(attrs.pct_nonhisp_black);
  const pctNonhispAsian = safeNumber(attrs.pct_nonhisp_asian);
  const otherNonHispanic = Math.max(
    0,
    100 - (pctNonhispWhite + pctHispanic + pctNonhispBlack + pctNonhispAsian)
  );

  const first5Metrics = [
    { label: "Non-Hispanic White", value: pctNonhispWhite },
    { label: "Hispanic", value: pctHispanic },
    { label: "Black", value: pctNonhispBlack },
    { label: "Asian", value: pctNonhispAsian },
    { label: "Other Non-Hispanic", value: otherNonHispanic },
  ];

  const remainingMetrics = [
    { label: "Under 18", value: safeNumber(attrs.pct_under18) },
    { label: "Over 65", value: safeNumber(attrs.pct_over65) },
    { label: "High School Graduate", value: safeNumber(attrs.pct_hs_grad) },
    { label: "Bachelor's or Higher", value: safeNumber(attrs.pct_bach_plus) },
    { label: "Owner Occupied", value: safeNumber(attrs.pct_owner_occ) },
    { label: "Vacant", value: safeNumber(attrs.pct_vacant) },
    { label: "In Labor Force", value: safeNumber(attrs.pct_in_labor_force) },
    { label: "Poverty", value: safeNumber(attrs.pct_poverty) },
  ];

  const sortedFirst5 = [...first5Metrics].sort((a, b) => b.value - a.value);
  return [...sortedFirst5, ...remainingMetrics];
}

const dockBarDataLabelsPlugin = {
  id: "dockBarDataLabels",
  afterDatasetsDraw(chart) {
    if (chart.config.type !== "bar") return;
    const dock = document.getElementById("charts-dock");
    if (dock?.classList.contains("charts-dock-values-hidden")) return;

    const ctx = chart.ctx;
    const meta = chart.getDatasetMeta(0);
    const isHorizontal = chart.options.indexAxis === "y";

    meta.data.forEach((bar, index) => {
      const value = chart.data.datasets[0].data[index];
      if (value == null || value === 0) return;

      const labelText =
        isHorizontal && value <= 100 ? formatPercent(value) : String(value);

      let labelX;
      let labelY;
      if (isHorizontal) {
        labelX = bar.x + 5;
        labelY = bar.y;
      } else {
        labelX = bar.x;
        labelY = bar.y - 12;
      }

      ctx.save();
      ctx.fillStyle = BAR_LABEL_COLOR;
      ctx.font =
        '10px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = isHorizontal ? "left" : "center";
      ctx.textBaseline = "middle";
      ctx.fillText(labelText, labelX, labelY);
      ctx.restore();
    });
  },
};

Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  dockBarDataLabelsPlugin
);

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
export function setDemographicsPercentChart(canvas, attrs) {
  if (!canvas) {
    destroyChart();
    return null;
  }

  if (!attrs) {
    destroyChart();
    return null;
  }

  const allMetrics = buildMetrics(attrs);
  const labels = allMetrics.map((m) => m.label);
  const data = allMetrics.map((m) => m.value);

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
          backgroundColor: "rgba(0, 190, 255, 0.82)",
          borderColor: "rgba(0, 190, 255, 1)",
          borderWidth: 1,
        },
      ],
    },
    plugins: [dockBarDataLabelsPlugin],
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

export function destroyDemographicsPercentChart() {
  destroyChart();
}

export function refreshDemographicsDockTicks() {
  if (!chartInstance) return;
  const tc = tickColor();
  chartInstance.options.scales.x.ticks.color = tc;
  chartInstance.options.scales.y.ticks.color = tc;
  chartInstance.update();
}

export function redrawDemographicsPercentChart() {
  chartInstance?.update();
}
