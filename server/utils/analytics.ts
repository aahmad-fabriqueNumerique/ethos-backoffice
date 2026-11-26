/**
 * Google Analytics Data API (GA4) helpers — server-side only.
 *
 * Authenticates with the same service account as Firebase Admin and exposes:
 * - requireAdmin: verifies the Firebase ID token and the `admin` role
 * - runReport: thin wrapper over `properties/{id}:runReport`
 *
 * Required environment variables:
 * - ANALYTICS_PROPERTY_ID: GA4 property id (numeric)
 * - FIREBASE_ADMIN_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY: service account
 *   (must have at least "Viewer" access on the GA4 property)
 */
import { JWT } from "google-auth-library";
import type { H3Event } from "h3";
import { getAuth } from "@/server/utils/firebaseAdmin";

const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

let jwtClient: JWT | null = null;

const getJwtClient = () => {
  jwtClient ??= new JWT({
    email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: [SCOPE],
  });
  return jwtClient;
};

/** Rejects the request unless it carries a valid Firebase token with role=admin. */
export const requireAdmin = async (event: H3Event) => {
  const token = getHeader(event, "authorization")?.split("Bearer ")[1];
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: "Token missing" });
  }
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(token);
  } catch {
    throw createError({ statusCode: 401, statusMessage: "Invalid token" });
  }
  const role = decoded.role || decoded.customClaims?.role;
  if (role !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
  }
};

export interface ReportRequest {
  dateRanges: { startDate: string; endDate: string }[];
  dimensions: string[];
  metrics: string[];
  dimensionFilter?: Record<string, unknown>;
  orderBys?: Record<string, unknown>[];
  limit?: number;
}

export interface ReportRow {
  dimensions: string[];
  metrics: number[];
}

/** Runs a GA4 report and returns rows as `{ dimensions: string[], metrics: number[] }`. */
export const runReport = async (req: ReportRequest): Promise<ReportRow[]> => {
  const propertyId = process.env.ANALYTICS_PROPERTY_ID;
  if (!propertyId) {
    throw createError({
      statusCode: 500,
      statusMessage: "ANALYTICS_PROPERTY_ID est manquante",
    });
  }

  const { token } = await getJwtClient().getAccessToken();
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dateRanges: req.dateRanges,
        dimensions: req.dimensions.map((name) => ({ name })),
        metrics: req.metrics.map((name) => ({ name })),
        dimensionFilter: req.dimensionFilter,
        orderBys: req.orderBys,
        limit: req.limit ?? 100,
      }),
    }
  );

  const text = await response.text();
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Erreur Google Analytics (${response.status})`,
      data: text.slice(0, 500),
    });
  }

  const data = JSON.parse(text);
  return (data.rows ?? []).map(
    (row: {
      dimensionValues?: { value: string }[];
      metricValues?: { value: string }[];
    }) => ({
      dimensions: (row.dimensionValues ?? []).map((v) => v.value),
      metrics: (row.metricValues ?? []).map((v) => Number(v.value)),
    })
  );
};
