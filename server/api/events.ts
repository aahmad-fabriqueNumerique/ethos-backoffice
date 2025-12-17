/**
 * Events API Endpoint
 *
 * This endpoint aggregates event data from two sources:
 *  1. Firebase Firestore database (internal events)
 *  2. OpenAgenda API (external events)
 *
 * Data is cached for 5 minutes to optimize performance and reduce API calls.
 * Firebase events are cached separately for 45 minutes to reduce Firestore load.
 * All events are returned in a standardized format and sorted by date.
 *
 * @route GET /api/events
 * @param {string} [lat] - Latitude for geographical filtering
 * @param {string} [long] - Longitude for geographical filtering
 * @param {string} [searchValue] - Text search query to filter events. For keywords search, use comma-separated values (e.g., "concert,festival,music")
 * @param {string} [searchValueType] - Type of search: "name" (default), "city", "country", or "keywords"
 * @param {string} [maxItemsOpenAgenda] - Maximum number of events to fetch from OpenAgenda API (default: 20, max: 100)
 * @param {string} [maxItemsFirestore] - Maximum number of events to fetch from Firestore (default: 20, max: 100)
 * @returns {Object} Response containing combined events array and cache status
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { getApps, type ServiceAccount } from "firebase-admin/app";
import admin from "firebase-admin";
import { sortArrayByDate } from "../../utils/sortArray";
import {
  processEventLinks,
  type EventLink,
  getLinkType,
} from "../utils/link-format";
import type EventModel from "../../models/EventModel";
import type { Timestamp } from "firebase-admin/firestore";
import { validateEventsQuery } from "../utils/validation-schemas/events";

// --- TYPES ---
/**
 * Standardized event format used for all returned events
 * regardless of their original source
 */
type FormattedEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  endDate: string | null;
  image: string | null;
  locationName: string;
  city: string;
  pays: string;
  latitude: number | null;
  longitude: number | null;
  organizer: string | null;
  links: EventLink[];
  keywords: string[];
};

/**
 * Raw event format from OpenAgenda API
 * Contains multiple localized fields and complex nested structures
 */
type AgendaTradEvent = {
  image: {
    filename: string;
    size: { width: number; height: number };
    variants: { type: string; filename: string; base: string }[];
    base: string;
  };
  keywords: { fr: string[] };
  description: { fr: string };
  longDescription: { fr: string };
  title: { fr: string };
  uid: number;
  lastTiming: { begin: string; end: string };
  firstTiming: { begin: string; end: string };
  location: {
    address: string;
    city: string;
    latitude: number;
    longitude: number;
    name: string;
  };
  links?: Array<{ link: string; data?: any }>;
  [key: string]: any;
};

// Module-level shared memory for caching
let cachedEvents: FormattedEvent[] | null = null;
let lastFetchTime: number = 0;
const TTL_MS = 1000 * 60 * 10; // 10 minute cache TTL

// Firebase-specific cache with 1-hour TTL
let cachedFirebaseEvents: FormattedEvent[] | null = null;
let lastFirebaseFetchTime: number = 0;
const FIREBASE_TTL_MS = 1000 * 60 * 45; // 45 minute cache TTL for Firebase events

/**
 * Fetches all Firebase events with 45-minute caching
 * @param {FirebaseFirestore.Firestore} db - Firestore database instance
 * @returns {Promise<FormattedEvent[]>} Array of formatted Firebase events
 */
async function getCachedFirebaseEvents(
  db: FirebaseFirestore.Firestore
): Promise<FormattedEvent[]> {
  const now = Date.now();

  // Return cached Firebase events if still fresh (within 45 minutes)
  if (cachedFirebaseEvents && now - lastFirebaseFetchTime < FIREBASE_TTL_MS) {
    console.log("[FIREBASE CACHE] Serving Firebase events from cache.");
    return cachedFirebaseEvents;
  }

  console.log("[FIREBASE API] Fetching fresh Firebase events...");

  // Current timestamp for filtering events that haven't ended
  const firestoreNow = admin.firestore.Timestamp.fromDate(new Date());

  // Fetch ALL upcoming events from Firestore (remove the limit to get all events)
  const snapshot = await db
    .collection("events")
    .where("dateFin", ">", firestoreNow)
    .orderBy("dateFin", "asc")
    .get();

  // Transform Firestore events to standardized format
  const allFirebaseEvents = snapshot.docs.map((doc): FormattedEvent => {
    const data = doc.data() as EventModel & {
      latitude?: number;
      longitude?: number;
    };

    return {
      id: doc.id,
      title: data.titre,
      description: data.description || null,
      locationName: data.adresse,
      city: data.ville,
      pays: data.pays || "",
      date: (data.dateDebut as Timestamp).toDate?.().toISOString() ?? null,
      endDate: (data.dateFin as Timestamp).toDate?.().toISOString() ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      image: data.image || null,
      organizer: data.email,
      links:
        data.reseauxSociaux?.map((link) => ({
          url: link,
          type: getLinkType(link),
        })) || [],
      // Extract keywords from the type property (type is a string from firestore)
      keywords: data.type ? [data.type] : [],
    };
  });

  // Update cache
  cachedFirebaseEvents = allFirebaseEvents;
  lastFirebaseFetchTime = now;

  console.log(
    `[FIREBASE CACHE] Cache updated with ${allFirebaseEvents.length} events.`
  );

  return allFirebaseEvents;
}

export default defineEventHandler(async (event) => {
  // Validate and parse query parameters with defaults
  let validatedQuery;
  try {
    validatedQuery = validateEventsQuery(getQuery(event));
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid query parameters",
      data: error,
    });
  }

  const {
    long,
    lat,
    searchValue,
    searchValueType,
    maxOpenAgendaItems,
    maxFirestoreItems,
    isCalendar,
  } = validatedQuery;

  // Check if there are no query parameters (for cache usage)
  const hasNoArguments =
    !long && !lat && !searchValue && !searchValueType && !isCalendar;

  // Parse search query
  const searchTerm = searchValue ? String(searchValue).trim() : undefined;
  const cacheDate = Date.now();

  // Return cached events if still fresh and no filters applied
  if (cachedEvents && cacheDate - lastFetchTime < TTL_MS && hasNoArguments) {
    console.log("[CACHE] Serving request from cache.");
    return { success: true, events: cachedEvents, cached: true };
  }

  // Config & Init Firebase
  const config = useRuntimeConfig();

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

  // Get all Firebase events with 1-hour caching
  const allFirebaseEvents = await getCachedFirebaseEvents(db);

  // Apply filters to Firebase events based on request parameters
  let events = allFirebaseEvents.slice(); // Create a copy to avoid modifying cached data

  // Apply search filter to Firestore events if search term is provided
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    events = events.filter((event) => {
      switch (searchValueType) {
        case "city":
          return event.city?.toLowerCase().includes(searchLower);
        case "country":
          return event.pays?.toLowerCase().includes(searchLower);
        case "keywords": {
          // Split keywords by comma and check if any of the event's keywords match any of the search keywords
          const searchKeywords = searchTerm
            .split(",")
            .map((k) => k.trim().toLowerCase())
            .filter((k) => k.length > 0);
          return searchKeywords.some((searchKeyword) =>
            event.keywords.some((eventKeyword) =>
              eventKeyword.toLowerCase().includes(searchKeyword)
            )
          );
        }
        case "name":
        default:
          return (
            event.title?.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.locationName?.toLowerCase().includes(searchLower)
          );
      }
    });
  }

  // Apply geographical filter to Firestore events if coordinates are provided
  if (long && lat) {
    const lng = parseFloat(long as string);
    const lt = parseFloat(lat as string);
    if (!isNaN(lng) && !isNaN(lt)) {
      events = events.filter((ev) => {
        if (!ev.latitude || !ev.longitude) return false;
        return (
          ev.latitude >= lt - 1.35 &&
          ev.latitude <= lt + 1.35 &&
          ev.longitude >= lng - 1.35 &&
          ev.longitude <= lng + 1.35
        );
      });
    }
  }

  // Apply the maxFirestoreItems limit after filtering
  events = events.slice(0, maxFirestoreItems);

  // Construct OpenAgenda API URL with filters
  const urlParams = new URLSearchParams({
    key: config.openAgendaAPIKey,
    size: maxOpenAgendaItems.toString(),
  });

  const today = new Date();
  const futureDate = new Date();
  futureDate.setMonth(today.getMonth() + (isCalendar ? 4 : 1));

  urlParams.append("timings[gte]", today.toISOString().split("T")[0]);
  urlParams.append("timings[lte]", futureDate.toISOString().split("T")[0]);

  if (searchTerm) {
    if (searchValueType === "keywords") {
      searchTerm
        .split(",")
        .forEach((k) => urlParams.append("keyword[]", k.trim()));
    } else {
      urlParams.append("search", searchTerm);
    }
  }

  // Specify only the fields we need from OpenAgenda API to optimize response size
  if (long && lat) {
    const lng = parseFloat(long as string);
    const lt = parseFloat(lat as string);
    if (!isNaN(lng) && !isNaN(lt)) {
      urlParams.append("geo[northEast][lat]", (lt + 1.35).toString());
      urlParams.append("geo[northEast][lng]", (lng + 1.35).toString());
      urlParams.append("geo[southWest][lat]", (lt - 1.35).toString());
      urlParams.append("geo[southWest][lng]", (lng - 1.35).toString());
    }
  }

  [
    "uid",
    "title",
    "longDescription",
    "description",
    "firstTiming",
    "image",
    "location",
    "links",
    "keywords",
    "lastTiming",
  ].forEach((f) => urlParams.append("if[]", f));

  const urlAgendaTrad = `https://api.openagenda.com/v2/agendas/${
    config.agendaTradUID
  }/events?${urlParams.toString()}`;
  const urlLoCalenDiari = `https://api.openagenda.com/v2/agendas/${
    config.loCalenDiariUID
  }/events?${urlParams.toString()}`;

  function transformToEventCard(event: AgendaTradEvent, prefix: string) {
    const thumbnail = event.image?.variants?.find(
      (v) => v.type === "thumbnail"
    );
    const kws =
      event.keywords?.fr?.filter((k) => k !== "nivernais").slice(0, 2) || [];

    return {
      id: `${prefix}${event.uid}`,
      title: event.title?.fr || "Sans titre",
      description: event.longDescription?.fr || null,
      organizer: event.description?.fr || "",
      date: event.firstTiming?.begin || "",
      endDate: event.lastTiming?.end || "",
      image: thumbnail ? `${event.image.base}${thumbnail.filename}` : null,
      locationName: event.location?.name,
      city: event.location?.city || "",
      pays: "",
      latitude: event.location?.latitude ?? null,
      longitude: event.location?.longitude ?? null,
      links: processEventLinks(event.links),
      keywords: kws,
    };
  }

  // --- Retry helper ---
  // If failed, log and retry. If failed again, throw error.
  async function fetchWithRetry(url: string) {
    try {
      return await $fetch(url, { timeout: 10000 });
    } catch (err) {
      console.warn(`[API] Echec 1ere tentative ${url}. Retry immédiat...`);
      return await $fetch(url, { timeout: 10000 });
    }
  }

  // retry + cache protection
  const openAgendaEvents: FormattedEvent[] = [];
  let requestFailed = false;

  try {
    console.log("[API] Fetch AgendaTrad...");
    // Using retry helper
    const res = (await fetchWithRetry(urlAgendaTrad)) as any;
    if (res?.events) {
      res.events.forEach((e: any) =>
        openAgendaEvents.push(transformToEventCard(e, "agendatrad_"))
      );
      console.log(`[API] AgendaTrad OK: ${res.events.length} events.`);
    }
  } catch (error) {
    console.error("[API] CRITIQUE - AgendaTrad a échoué 2 fois:", error);
    requestFailed = true;
  }

  try {
    console.log("[API] Fetch LoCalenDiari...");
    // Utilisation du helper avec retry
    const res = (await fetchWithRetry(urlLoCalenDiari)) as any;
    if (res?.events) {
      res.events.forEach((e: any) =>
        openAgendaEvents.push(
          transformToEventCard(
            { ...e, description: undefined },
            "localendiari_"
          )
        )
      );
      console.log(`[API] LoCalenDiari OK: ${res.events.length} events.`);
    }
  } catch (error) {
    console.error("[API] CRITIQUE - LoCalenDiari a échoué 2 fois:", error);
    requestFailed = true;
  }

  // Nettoyage et Fusion
  const validFirestore = events.filter(
    (e) => e.title?.trim() && e.description?.trim()
  );
  const validOpenAgenda = openAgendaEvents.filter(
    (e) => e.title?.trim() && e.description?.trim()
  );

  const combined = sortArrayByDate(
    [...validFirestore, ...validOpenAgenda],
    "date",
    true
  );

  // UPDATE CACHE ?
  if (hasNoArguments) {
    if (!requestFailed) {
      // OK ? -> Update cache
      cachedEvents = combined;
      lastFetchTime = Date.now();
      console.log("[CACHE] Mis à jour avec succès.");
    } else {
      // Failed -> We keep the cache
      console.warn("[CACHE] Echec API après retry. Mise à jour annulée.");

      // Fallback
      if (cachedEvents) {
        console.log("[CACHE] Fallback sur l'ancien cache.");
        return {
          success: true,
          events: cachedEvents,
          cached: true,
          status: "stale",
        };
      }
    }
  }

  return {
    events: combined,
    cached: false,
  };
});
