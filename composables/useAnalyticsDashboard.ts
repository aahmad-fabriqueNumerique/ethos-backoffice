/**
 * Analytics Dashboard Composable
 *
 * Fetches the aggregated GA4 indicators (songs, sponsors, events) from
 * `/api/analytics/dashboard` using the current Firebase user's ID token.
 */
import { getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

export type IndicatorKey = "songs" | "sponsors" | "events";

export interface IndicatorTopRow {
  label: string;
  count: number;
  users: number;
}

export interface Indicator {
  total: number;
  previousTotal: number;
  daily: { date: string; count: number }[];
  top: IndicatorTopRow[];
}

export type DashboardData = { days: number } & Record<IndicatorKey, Indicator>;

export const useAnalyticsDashboard = () => {
  const days = ref(30);
  const data = ref<DashboardData | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const user = ref<User | null>(null);

  const fetchData = async () => {
    if (!user.value) return;
    loading.value = true;
    error.value = null;
    try {
      const token = await user.value.getIdToken();
      data.value = await $fetch<DashboardData>("/api/analytics/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: days.value },
      });
    } catch (err: unknown) {
      const e = err as { statusMessage?: string; message?: string };
      error.value = e.statusMessage || e.message || "Erreur inconnue";
    } finally {
      loading.value = false;
    }
  };

  if (import.meta.client) {
    onMounted(() => {
      if (getApps().length === 0) return;
      const unsub = onAuthStateChanged(getAuth(), (u) => {
        user.value = u;
        unsub();
        fetchData();
      });
    });
  }

  watch(days, fetchData);

  return { days, data, loading, error, refresh: fetchData };
};
