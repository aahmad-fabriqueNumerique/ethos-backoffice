<script setup lang="ts">
/**
 * Analytics Stat Card (CTA)
 *
 * Clickable KPI card: icon, label, total and trend vs the previous period.
 * Highlighted when `active`; emits `select` on click.
 *
 * @component AnalyticsStatCard
 */
const props = defineProps<{
  label: string;
  icon: string;
  total: number;
  previousTotal: number;
  days: number;
  active: boolean;
  loading?: boolean;
}>();

defineEmits<{ select: [] }>();

const trend = computed(() => {
  if (props.previousTotal === 0) return props.total > 0 ? null : 0;
  return Math.round(((props.total - props.previousTotal) / props.previousTotal) * 100);
});
</script>

<template>
  <button
    type="button"
    class="group relative flex-1 min-w-56 text-left rounded-xl border p-5 flex flex-col gap-3 transition cursor-pointer bg-surface-0 dark:bg-surface-900 hover:ring-2 hover:ring-primary/30"
    :class="
      active
        ? 'border-primary ring-2 ring-primary/30'
        : 'border-surface-200 dark:border-surface-700'
    "
    :aria-pressed="active"
    @click="$emit('select')"
  >
    <i
      class="pi pi-arrow-up-right absolute top-4 right-4 text-surface-400 opacity-0 group-hover:opacity-100 transition-opacity"
      aria-hidden="true"
    />
    <span class="flex items-center gap-2 text-surface-600 dark:text-surface-300">
      <i :class="icon" />
      <span class="font-medium">{{ label }}</span>
    </span>
    <Skeleton v-if="loading" width="6rem" height="2rem" />
    <span v-else class="text-3xl font-bold">
      {{ total.toLocaleString("fr-FR") }}
    </span>
    <span
      v-if="!loading && days > 0 && trend !== null"
      class="mt-auto text-xs flex items-center gap-1"
      :title="`Par rapport aux ${days} jours précédents`"
      :class="
        trend > 0
          ? 'text-green-600'
          : trend < 0
            ? 'text-red-600'
            : 'text-surface-500'
      "
    >
      <i
        :class="
          trend > 0
            ? 'pi pi-arrow-up-right'
            : trend < 0
              ? 'pi pi-arrow-down-right'
              : 'pi pi-minus'
        "
      />
      <template v-if="trend > 0">En hausse de {{ trend }}%</template>
      <template v-else-if="trend < 0">En baisse de {{ Math.abs(trend) }}%</template>
      <template v-else>Stable</template>
      sur les {{ days }} derniers jours
    </span>
  </button>
</template>
