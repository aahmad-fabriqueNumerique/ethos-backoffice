<script setup lang="ts">
/**
 * Dashboard Page
 *
 * Landing page of the back office after login. It shows:
 * 1. Three clickable KPI cards (songs, sponsors, events) fed by GA4 custom events
 * 2. A panel that shows the global daily chart by default, and replaces it with
 *    the detailed ranking of the selected card (click again to go back)
 * 3. Shortcuts to the main screens of the app
 *
 * Access: admin only (global auth middleware).
 */
import type { IndicatorKey } from "@/composables/useAnalyticsDashboard";

definePageMeta({ layout: "home", title: "Tableau de bord" });

const { t } = useI18n();
const { days, data, loading, error, refresh } = useAnalyticsDashboard();

const selected = ref<IndicatorKey | null>(null);
const toggle = (key: IndicatorKey) => {
    selected.value = selected.value === key ? null : key;
};

const cards: { key: IndicatorKey; icon: string }[] = [
    { key: "songs", icon: "pi pi-microphone" },
    { key: "sponsors", icon: "pi pi-star" },
    { key: "events", icon: "pi pi-calendar" },
];

const rangeOptions = [
    { label: t("dashboard.range.7"), value: 7 },
    { label: t("dashboard.range.30"), value: 30 },
    { label: t("dashboard.range.90"), value: 90 },
];

// Global chart: stacked daily bars, one series per indicator
const chartDates = computed(() => data.value?.songs.daily.map((p) => p.date) ?? []);
const chartSeries = computed(() => {
  if (!data.value) return [];
  const style = import.meta.client ? getComputedStyle(document.documentElement) : null;
  const color = (name: string, fallback: string) =>
    style?.getPropertyValue(name).trim() || fallback;
  const colors: Record<IndicatorKey, string> = {
    songs: color("--p-primary-500", "#10b981"),
    events: color("--p-orange-500", "#f97316"),
    sponsors: color("--p-violet-500", "#8b5cf6"),
  };
  return (["songs", "events", "sponsors"] as IndicatorKey[]).map((key) => ({
    label: t(`dashboard.cards.${key}`),
    color: colors[key],
    values: data.value![key].daily.map((p) => p.count),
  }));
});

const selectedIndicator = computed(() =>
    data.value && selected.value ? data.value[selected.value] : null,
);

/** Event types are raw values in GA4 ("regular" / "sponsor"): make them readable. */
const rowLabel = (key: IndicatorKey, label: string) => {
    if (label === "(not set)") return t("dashboard.notSet");
    if (key === "events") {
        return label === "regular"
            ? t("dashboard.eventTypeRegular")
            : t(`data.eventTypes.${label}`, label);
    }
    return label;
};

const maxCount = computed(() =>
    Math.max(...(selectedIndicator.value?.top.map((r) => r.count) ?? [1]), 1),
);

const shortcuts = [
    { label: t("navbar.songs"), icon: "pi pi-list", to: "/chants" },
    {
        label: t("dashboard.shortcuts.newSong"),
        icon: "pi pi-plus",
        to: "/new-song",
    },
    { label: t("navbar.events"), icon: "pi pi-calendar", to: "/events" },
    {
        label: t("dashboard.shortcuts.newEvent"),
        icon: "pi pi-plus",
        to: "/new-event",
    },
    { label: t("navbar.users"), icon: "pi pi-users", to: "/users" },
    {
        label: t("navbar.notifications"),
        icon: "pi pi-bell",
        to: "/notifications",
    },
];
</script>

<template>
    <main class="w-5/6 mx-auto mt-8 pb-8 flex flex-col gap-y-8">
        <ViewHeader :title="t('dashboard.title')">
            <SelectButton
                v-model="days"
                :options="rangeOptions"
                option-label="label"
                option-value="value"
                :allow-empty="false"
                :aria-label="t('dashboard.rangeLabel')"
            />
        </ViewHeader>

        <Message v-if="error" severity="error" :closable="false">
            <span class="flex items-center gap-4">
                {{ t("dashboard.error") }} ({{ error }})
                <Button
                    :label="t('dashboard.retry')"
                    size="small"
                    severity="secondary"
                    @click="refresh"
                />
            </span>
        </Message>

        <!-- KPI cards -->
        <section
            class="flex flex-wrap gap-4"
            :aria-label="t('dashboard.title')"
        >
            <AnalyticsStatCard
                v-for="c in cards"
                :key="c.key"
                :label="t(`dashboard.cards.${c.key}`)"
                :icon="c.icon"
                :total="data?.[c.key].total ?? 0"
                :previous-total="data?.[c.key].previousTotal ?? 0"
                :days="days"
                :loading="loading"
                :active="selected === c.key"
                @select="toggle(c.key)"
            />
        </section>

        <!-- Chart / details panel -->
        <section
            class="rounded-xl border border-surface-200 dark:border-surface-700 p-5 flex flex-col gap-4"
        >
            <template v-if="!selected">
                <h2 class="text-lg font-semibold">
                    {{ t("dashboard.overview") }}
                </h2>
                <Skeleton v-if="loading" height="16rem" />
                <AnalyticsChart
                    v-else-if="data"
                    :dates="chartDates"
                    :series="chartSeries"
                />
                <p class="text-sm text-surface-500">
                    {{ t("dashboard.overviewHint") }}
                </p>
            </template>

            <template v-else-if="selectedIndicator">
                <div class="flex items-center justify-between gap-4">
                    <h2 class="text-lg font-semibold">
                        {{ t(`dashboard.details.${selected}`) }}
                    </h2>
                    <Button
                        icon="pi pi-times"
                        :aria-label="t('dashboard.backToChart')"
                        size="small"
                        severity="secondary"
                        rounded
                        text
                        @click="selected = null"
                    />
                </div>

                <div v-if="loading" class="flex flex-col gap-2">
                    <Skeleton v-for="n in 6" :key="n" height="2rem" />
                </div>
                <p
                    v-else-if="!selectedIndicator.top.length"
                    class="text-surface-500 text-sm"
                >
                    {{ t("dashboard.empty") }}
                </p>
                <DataTable
                    v-else
                    :value="selectedIndicator.top"
                    size="small"
                    striped-rows
                    paginator
                    :rows="10"
                >
                    <Column header="#" style="width: 3rem">
                        <template #body="{ index }">{{ index + 1 }}</template>
                    </Column>
                    <Column
                        :header="t(`dashboard.columns.${selected}`)"
                        field="label"
                    >
                        <template #body="{ data: row }">
                            <span
                                class="block truncate max-w-md"
                                :title="row.label"
                            >
                                {{ rowLabel(selected!, row.label) }}
                            </span>
                        </template>
                    </Column>
                    <Column
                        :header="t('dashboard.columns.count')"
                        field="count"
                        sortable
                    >
                        <template #body="{ data: row }">
                            <div class="flex items-center gap-3">
                                <div
                                    class="h-2 w-32 rounded bg-surface-200 dark:bg-surface-700"
                                >
                                    <div
                                        class="h-2 rounded bg-primary"
                                        :style="{
                                            width: `${(row.count / maxCount) * 100}%`,
                                        }"
                                    />
                                </div>
                                <span>{{
                                    row.count.toLocaleString("fr-FR")
                                }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column
                        :header="t('dashboard.columns.users')"
                        field="users"
                        sortable
                    />
                </DataTable>
            </template>
        </section>

        <!-- Shortcuts -->
        <section class="flex flex-col gap-3">
            <h2 class="text-lg font-semibold">
                {{ t("dashboard.shortcuts.title") }}
            </h2>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <NuxtLink
                    v-for="s in shortcuts"
                    :key="s.to"
                    :to="s.to"
                    class="flex flex-col items-center gap-2 rounded-xl border border-surface-200 dark:border-surface-700 p-4 text-center hover:bg-surface-100 dark:hover:bg-surface-800 transition"
                >
                    <i :class="s.icon" class="text-xl text-primary" />
                    <span class="text-sm font-medium">{{ s.label }}</span>
                </NuxtLink>
            </div>
        </section>
    </main>
</template>
