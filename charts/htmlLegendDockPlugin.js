/**
 * HTML legend for doughnut charts in the dock (click to toggle slices).
 * Pass in chart plugins[] (do not Chart.register globally — avoids double afterUpdate).
 * Options: plugins.dockHtmlLegend.containerID
 */

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

export const dockHtmlLegendPlugin = {
  id: "dockHtmlLegend",
  afterInit(chart, args, options) {
    this.afterUpdate(chart, args, options);
  },
  afterUpdate(chart, args, options) {
    const pluginOptions =
      chart.options?.plugins?.dockHtmlLegend ||
      chart.config?.options?.plugins?.dockHtmlLegend ||
      {};
    const containerID = pluginOptions.containerID;

    if (!containerID) {
      return;
    }

    const container = document.getElementById(containerID);
    if (!container) {
      setTimeout(() => {
        if (document.getElementById(containerID)) {
          this.afterUpdate(chart, args, options);
        }
      }, 100);
      return;
    }

    if (
      !chart.data ||
      !chart.data.labels ||
      !chart.data.datasets ||
      chart.data.datasets.length === 0
    ) {
      return;
    }

    let ul = container.querySelector("ul");
    if (!ul) {
      ul = document.createElement("ul");
      container.appendChild(ul);
    }

    ul.innerHTML = "";

    const meta = chart.getDatasetMeta(0);
    const dataset = chart.data.datasets[0];
    const isDoughnutChart = chart.config.type === "doughnut";

    const items = chart.data.labels.map((label, i) => {
      const backgroundColor = Array.isArray(dataset.backgroundColor)
        ? dataset.backgroundColor[i]
        : dataset.backgroundColor;
      const borderColor = Array.isArray(dataset.borderColor)
        ? dataset.borderColor[i]
        : dataset.borderColor;
      const dataPoint = meta.data[i];
      const isHidden = dataPoint && dataPoint.hidden === true;
      const dataValue =
        isDoughnutChart && dataset.data && dataset.data[i] != null
          ? safeNumber(dataset.data[i])
          : null;
      const formattedValue =
        isDoughnutChart && dataValue != null ? formatPercent(dataValue) : null;

      return {
        text: label,
        value: formattedValue,
        fillStyle: backgroundColor,
        strokeStyle: borderColor,
        hidden: isHidden,
        index: i,
      };
    });

    items.forEach((item) => {
      const li = document.createElement("li");

      li.onclick = () => {
        chart.toggleDataVisibility(item.index);
        chart.update();
      };

      if (isDoughnutChart && item.value != null) {
        const valueSpan = document.createElement("span");
        valueSpan.className = "legend-value";
        valueSpan.textContent = item.value;
        li.appendChild(valueSpan);
      }

      const box = document.createElement("span");
      box.className = "box";
      box.style.background = item.fillStyle;
      box.style.borderColor = item.strokeStyle;

      const text = document.createElement("span");
      text.textContent = item.text;
      text.className = "legend-text";

      const isVisible = chart.getDataVisibility(item.index);
      if (!isVisible) {
        li.classList.add("legend-item-hidden");
      } else {
        li.classList.remove("legend-item-hidden");
      }

      li.appendChild(box);
      li.appendChild(text);
      ul.appendChild(li);
    });
  },
};
