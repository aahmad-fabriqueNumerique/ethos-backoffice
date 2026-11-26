<script setup lang="ts">
/**
 * Analytics Chart Component
 *
 * Stacked daily bar chart (PrimeVue Chart / chart.js): one series per indicator,
 * legend to toggle series, tooltip showing every series for the hovered day.
 *
 * @component AnalyticsChart
 */
const props = defineProps<{
  dates: string[];
  series: { label: string; color: string; values: number[] }[];
}>();

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });

const chartData = computed(() => ({
  labels: props.dates.map(fmt),
  datasets: props.series.map((s) => ({
    label: s.label,
    data: s.values,
    backgroundColor: s.color,
    borderRadius: 2,
  })),
}));

const chartOptions = {
  maintainAspectRatio: false,
  interaction: { mode: "index" as const, intersect: false },
  plugins: { legend: { position: "bottom" as const } },
  scales: {
    x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 10 } },
    y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } },
  },
};
</script>

<template>
  <ClientOnly>
    <Chart type="bar" :data="chartData" :options="chartOptions" class="h-72" />
    <template #fallback>
      <Skeleton height="18rem" />
    </template>
  </ClientOnly>
</template>
