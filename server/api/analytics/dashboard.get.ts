/**
 * Analytics Dashboard API Endpoint
 *
 * Aggregates the three custom GA4 indicators shown on the dashboard:
 * - songs:    `song_click`            broken down by `customEvent:song_title`
 * - sponsors: `sponsor_details_click` broken down by `customEvent:sponsor_name`
 * - events:   `event_details_click`   broken down by `customEvent:event_type`
 *
 * For each indicator: total over the period, total over the previous period
 * (for the trend), a daily series (chart) and a top list (details).
 *
 * Authentication: Firebase ID token with the `admin` role.
 *
 * Query parameters:
 * - days: 7 | 30 | 90 (default 30)
 *
 * @route GET /api/analytics/dashboard
 * @security Bearer token
 */
import { requireAdmin, runReport } from "@/server/utils/analytics";

const INDICATORS = {
  songs: { eventName: "song_click", dimension: "customEvent:song_title" },
  sponsors: {
    eventName: "sponsor_details_click",
    dimension: "customEvent:sponsor_name",
  },
  events: {
    eventName: "event_details_click",
    dimension: "customEvent:event_type",
  },
} as const;

type IndicatorKey = keyof typeof INDICATORS;

const ALLOWED_DAYS = [7, 30, 90];
const NOT_SET = "(not set)";

const eventFilter = (eventName: string) => ({
  filter: {
    fieldName: "eventName",
    stringFilter: { matchType: "EXACT", value: eventName },
  },
});

/** GA4 returns dates as YYYYMMDD; convert to ISO YYYY-MM-DD. */
const toIsoDate = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/** Fills missing days with 0 so the chart has a continuous x axis. */
const fillDailySeries = (rows: Map<string, number>, days: number) => {
  const series: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    series.push({ date: iso, count: rows.get(iso) ?? 0 });
  }
  return series;
};

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const requestedDays = Number(getQuery(event).days);
  const days = ALLOWED_DAYS.includes(requestedDays) ? requestedDays : 30;

  const current = { startDate: `${days - 1}daysAgo`, endDate: "today" };
  const previous = {
    startDate: `${days * 2 - 1}daysAgo`,
    endDate: `${days}daysAgo`,
  };

  try {
    const entries = await Promise.all(
      (Object.keys(INDICATORS) as IndicatorKey[]).map(async (key) => {
        const { eventName, dimension } = INDICATORS[key];
        const dimensionFilter = eventFilter(eventName);

        const [totalRows, previousRows, dailyRows, topRows] = await Promise.all([
          runReport({
            dateRanges: [current],
            dimensions: [],
            metrics: ["eventCount"],
            dimensionFilter,
          }),
          runReport({
            dateRanges: [previous],
            dimensions: [],
            metrics: ["eventCount"],
            dimensionFilter,
          }),
          runReport({
            dateRanges: [current],
            dimensions: ["date"],
            metrics: ["eventCount"],
            dimensionFilter,
            limit: days,
          }),
          runReport({
            dateRanges: [current],
            dimensions: [dimension],
            metrics: ["eventCount", "activeUsers"],
            dimensionFilter,
            orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
            limit: 50,
          }),
        ]);

        const daily = new Map<string, number>(
          dailyRows.map((r) => [toIsoDate(r.dimensions[0] ?? ""), r.metrics[0] ?? 0])
        );

        return [
          key,
          {
            total: totalRows[0]?.metrics[0] ?? 0,
            previousTotal: previousRows[0]?.metrics[0] ?? 0,
            daily: fillDailySeries(daily, days),
            top: topRows.map((r) => ({
              label: r.dimensions[0] || NOT_SET,
              count: r.metrics[0] ?? 0,
              users: r.metrics[1] ?? 0,
            })),
          },
        ] as const;
      })
    );

    return { days, ...Object.fromEntries(entries) };
  } catch (err: unknown) {
    // Surface Google errors (createError) as is, wrap anything else
    if (typeof err === "object" && err !== null && "statusCode" in err) throw err;
    throw createError({
      statusCode: 502,
      statusMessage: "Impossible de récupérer les statistiques",
    });
  }
});
