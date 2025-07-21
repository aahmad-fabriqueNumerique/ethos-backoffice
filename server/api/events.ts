/**
 * Events API Endpoint
 *
 * This endpoint aggregates event data from two sources:
 *  1. Firebase Firestore database (internal events)
 *  2. OpenAgenda API (external events)
 *
 * Data is cached for 5 minutes to optimize performance and reduce API calls.
 * All events are returned in a standardized format and sorted by date.
 *
 * @route GET /api/events
 * @returns {Object} Response containing combined events array and cache status
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getApps, type ServiceAccount } from "firebase-admin/app";
import admin from "firebase-admin";
import { sortArrayByDate } from "../../utils/sortArray";

/**
 * Standardized event format used for all returned events
 * regardless of their original source
 */
type FormattedEvent = {
  id: string;
  title: string;
  date: string;
  imageUrl: string | null;
  locationName: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
};

/**
 * Raw event format from OpenAgenda API
 * Contains multiple localized fields and complex nested structures
 */
type AgendaTradEvent = {
  image: {
    filename: string;
    size: {
      width: number;
      height: number;
    };
    variants: {
      filename: string;
      size: {
        width: number;
        height: number;
      };
      type: string; // "full" | "thumbnail" for strict union if needed
    }[];
    base: string;
  };
  featured: boolean;
  attendanceMode: number;
  keywords: {
    fr: string[];
  };
  dateRange: {
    ar: string;
    de: string;
    en: string;
    it: string;
    fr: string;
    es: string;
  };
  imageCredits: string | null;
  originAgenda: {
    image: string;
    uid: number;
    title: string;
  };
  description: {
    fr: string;
  };
  type: number[];
  title: {
    fr: string;
  };
  onlineAccessLink: string | null;
  uid: number;
  lastTiming: {
    begin: string; // ISO datetime
    end: string;
  };
  firstTiming: {
    begin: string;
    end: string;
  };
  location: {
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    name: string;
    extId: string | null;
  };
  slug: string;
  status: number;
  nextTiming: {
    begin: string;
    end: string;
  };
};

// Module-level shared memory for caching
let cachedEvents: FormattedEvent[] | null = null;
let lastFetchTime: number = 0;
const TTL_MS = 1000 * 60 * 5; // 5 minute cache TTL

export default defineEventHandler(async () => {
  const cacheDate = Date.now();

  // Return cached events if still fresh
  if (cachedEvents && cacheDate - lastFetchTime < TTL_MS) {
    console.log("[CACHE] Serving request from cache.");
    return {
      success: true,
      events: cachedEvents,
      cached: true,
    };
  }

  // Get configuration from runtime config
  const config = useRuntimeConfig();
  const agendaUID = config.agendaUID;
  const openAgendaAPIKey = config.openAgendaAPIKey;

  // Initialize Firebase Admin if not already initialized
  if (!getApps().length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: config.firebaseAdminProjectId,
        clientEmail: config.firebaseAdminClientEmail,
        privateKey: config.firebaseAdminPrivateKey?.replace(/\\n/g, "\n"),
      } as ServiceAccount),
    });
  }

  // Access Firestore database
  const db = admin.firestore();

  // Current timestamp for filtering events that haven't ended
  const now = admin.firestore.Timestamp.fromDate(new Date());

  // Fetch upcoming events from Firestore
  const snapshot = await db
    .collection("events")
    .where("dateFin", ">", now)
    .orderBy("dateFin", "asc")
    .get();

  // Transform Firestore events to standardized format
  const events = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.titre,
      locationName: data.ville,
      city: data.ville,
      date: data.dateDebut?.toDate?.() ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      imageUrl: data.imageUrl || null,
    };
  });

  // Construct OpenAgenda API URL
  const url = `https://api.openagenda.com/v2/agendas/${agendaUID}/events?key=${openAgendaAPIKey}`;

  /**
   * Transforms an OpenAgenda event to the standardized format
   * @param {AgendaTradEvent} event - Raw event from OpenAgenda API
   * @returns {FormattedEvent} Standardized event object
   */
  function transformToEventCard(event: AgendaTradEvent) {
    const thumbnail = event.image?.variants?.find(
      (v) => v.type === "thumbnail"
    );
    const imageUrl = thumbnail
      ? `${event.image.base}${thumbnail.filename}`
      : null;

    return {
      id: event.uid,
      title: event.title?.fr || "Untitled Event",
      date: event.firstTiming?.begin || "",
      imageUrl,
      locationName: event.location?.name || "Location not specified",
      city: event.location?.city || "",
      latitude: event.location?.latitude ?? null,
      longitude: event.location?.longitude ?? null,
    };
  }

  // Fetch events from OpenAgenda API
  const response = (await $fetch(url)) as any;
  let data: unknown = [];
  for (const event of response.events) {
    data = [...(data as FormattedEvent[]), transformToEventCard(event)];
  }

  // Combine and sort events from both sources
  const combined = sortArrayByDate(
    [...events, ...(data as FormattedEvent[])],
    "date",
    true
  );

  // Update cache
  cachedEvents = combined;
  lastFetchTime = new Date().getTime();

  console.log("[API] Cache updated.");

  return {
    events: combined,
    cached: false,
  };
});
