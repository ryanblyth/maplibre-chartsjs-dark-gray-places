import { Chart, ArcElement, DoughnutController } from "chart.js";

let done = false;

/** Bar charts register Title, Tooltip, Legend; only doughnut-specific pieces here. */
export function ensureDoughnutChartComponentsRegistered() {
  if (done) return;
  Chart.register(ArcElement, DoughnutController);
  done = true;
}
