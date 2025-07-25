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

/**
 * Standardized event format used for all returned events
 * regardless of their original source
 */
type FormattedEvent = {
  id: string;
  title: string;
  description: string | null;
  date: string;
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
  longDescription: {
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
  links?: Array<{
    link: string;
    data?: any;
  }>;
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
  const firestoreQuery = db
    .collection("events")
    .where("dateFin", ">", firestoreNow)
    .orderBy("dateFin", "asc");

  const snapshot = await firestoreQuery.get();

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
    return {
      success: true,
      events: cachedEvents,
      cached: true,
    };
  }

  // Get configuration from runtime config
  const config = useRuntimeConfig();
  const openAgendaAPIKey = config.openAgendaAPIKey;
  const agendaTradUID = config.agendaTradUID;
  const loCalenDiariUID = config.loCalenDiariUID;

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
  if (long && lat && typeof long === "string" && typeof lat === "string") {
    const longitude = parseFloat(long);
    const latitude = parseFloat(lat);

    if (!isNaN(longitude) && !isNaN(latitude)) {
      events = events.filter((event) => {
        if (event.latitude === null || event.longitude === null) {
          return false; // Exclude events without coordinates
        }

        // Check if event is within the bounding box (±1.35 degrees ≈ 150km)
        const isWithinLatitude =
          event.latitude >= latitude - 1.35 &&
          event.latitude <= latitude + 1.35;
        const isWithinLongitude =
          event.longitude >= longitude - 1.35 &&
          event.longitude <= longitude + 1.35;

        return isWithinLatitude && isWithinLongitude;
      });
    }
  }

  // Apply the maxFirestoreItems limit after filtering
  events = events.slice(0, maxFirestoreItems);

  // Construct OpenAgenda API URL with filters
  const urlParams = new URLSearchParams({
    key: openAgendaAPIKey,
    size: maxOpenAgendaItems.toString(),
  });

  // Add relative filters for current and upcoming events
  urlParams.append("relative[]", "current");
  urlParams.append("relative[]", "upcoming");

  // Add date range filter to limit events to those starting within 1 month
  const today = new Date();
  const monthsFromNow = new Date();
  if (isCalendar) {
    monthsFromNow.setMonth(today.getMonth() + 4);
  } else {
    monthsFromNow.setMonth(today.getMonth() + 1);
  }

  urlParams.append("timings[gte]", today.toISOString().split("T")[0]);
  urlParams.append("timings[lte]", monthsFromNow.toISOString().split("T")[0]);

  // Add search query if provided
  if (searchTerm) {
    if (searchValueType === "keywords") {
      // For keyword search, split by comma and add each keyword as a separate parameter
      const keywords = searchTerm
        .split(",")
        .map((k) => k.trim())
        .filter((k) => k.length > 0);
      keywords.forEach((keyword) => {
        urlParams.append("keyword[]", keyword);
      });
    } else {
      // For OpenAgenda API, we'll pass the search term directly
      // The API handles general search across multiple fields
      urlParams.append("search", searchTerm);
    }
  }

  // Specify only the fields we need from OpenAgenda API to optimize response size
  const requiredFields = [
    "uid",
    "title",
    "longDescription",
    "description",
    "firstTiming",
    "image",
    "location",
    "links",
    "keywords",
  ];

  requiredFields.forEach((field) => {
    urlParams.append("if[]", field);
  });

  // Add geographical filter if coordinates are provided
  if (long && lat && typeof long === "string" && typeof lat === "string") {
    const longitude = parseFloat(long);
    const latitude = parseFloat(lat);

    if (!isNaN(longitude) && !isNaN(latitude)) {
      console.log(longitude, latitude);
      // Use correct OpenAgenda geo filter format (±1.35 degrees ≈ 150km)
      urlParams.append("geo[northEast][lat]", (latitude + 1.35).toString());
      urlParams.append("geo[northEast][lng]", (longitude + 1.35).toString());
      urlParams.append("geo[southWest][lat]", (latitude - 1.35).toString());
      urlParams.append("geo[southWest][lng]", (longitude - 1.35).toString());
    }
  }

  const urlAgendaTrad = `https://api.openagenda.com/v2/agendas/${agendaTradUID}/events?${urlParams.toString()}`;
  const urlLoCalenDiari = `https://api.openagenda.com/v2/agendas/${loCalenDiariUID}/events?${urlParams.toString()}`;

  /**
   * Transforms an OpenAgenda event to the standardized format
   * @param {AgendaTradEvent} event - Raw event from OpenAgenda API
   * @param {string} prefix - Prefix to add to the event ID to avoid duplicates
   * @returns {FormattedEvent} Standardized event object
   */
  function transformToEventCard(event: AgendaTradEvent, prefix: string) {
    const thumbnail = event.image?.variants?.find(
      (v) => v.type === "thumbnail"
    );
    const image = thumbnail ? `${event.image.base}${thumbnail.filename}` : null;

    // Some keywords are not useful for display, so we can filter them out
    const keywordsToRemove = ["nivernais"];

    // Extract up to 2 keywords from the event
    const keywords =
      event.keywords?.fr
        ?.filter((keyword) => !keywordsToRemove.includes(keyword))
        .slice(0, 2) || [];

    return {
      id: `${prefix}${event.uid}`,
      title: event.title?.fr || "Untitled Event",
      description: event.longDescription?.fr || null,
      organizer: event.description?.fr || "",
      date: event.firstTiming?.begin || "",
      image,
      locationName: event.location?.name,
      city: event.location?.city || "",
      pays: "", // OpenAgenda API doesn't provide country field in current type definition
      latitude: event.location?.latitude ?? null,
      longitude: event.location?.longitude ?? null,
      links: processEventLinks(event.links),
      keywords,
    };
  }

  // Fetch events from OpenAgenda API with error handling
  const data: FormattedEvent[] = [];

  try {
    console.log("[API] Fetching from AgendaTrad...");
    const response = (await $fetch(urlAgendaTrad, {
      timeout: 10000, // 10 second timeout
    })) as any;

    if (response?.events) {
      for (const event of response.events) {
        data.push(transformToEventCard(event, "agendatrad_"));
      }
      console.log(
        `[API] Successfully fetched ${response.events.length} events from AgendaTrad`
      );
    }
  } catch (error) {
    console.error("[API] Failed to fetch from AgendaTrad:", error);
    // Continue execution - don't let external API failures crash the server
  }

  try {
    console.log("[API] Fetching from LoCalenDiari...");
    const responseLoCalenDiari = (await $fetch(urlLoCalenDiari, {
      timeout: 10000, // 10 second timeout
    })) as any;

    if (responseLoCalenDiari?.events) {
      for (const event of responseLoCalenDiari.events) {
        data.push(transformToEventCard(event, "localendiari_"));
      }
      console.log(
        `[API] Successfully fetched ${responseLoCalenDiari.events.length} events from LoCalenDiari`
      );
    }
  } catch (error) {
    console.error("[API] Failed to fetch from LoCalenDiari:", error);
    // Continue execution - don't let external API failures crash the server
  }

  // Filter out events without title or description from both sources
  const filteredFirestoreEvents = events.filter(
    (event) =>
      event.title &&
      event.title.trim() !== "" &&
      event.description &&
      event.description.trim() !== ""
  );

  const filteredOpenAgendaEvents = data.filter(
    (event) =>
      event.title &&
      event.title.trim() !== "" &&
      event.description &&
      event.description.trim() !== ""
  );

  // Combine and sort events from both sources
  const combined = sortArrayByDate(
    [...filteredFirestoreEvents, ...filteredOpenAgendaEvents],
    "date",
    true
  );

  // Update cache only when no filters are applied
  if (hasNoArguments) {
    cachedEvents = combined;
    lastFetchTime = new Date().getTime();
    console.log("[API] Cache updated.");
  } else {
    console.log("[API] Filters applied, cache not updated.");
  }

  return {
    events: combined,
    cached: false,
  };
});
