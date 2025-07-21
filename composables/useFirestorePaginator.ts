import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  endBefore,
  limitToLast,
  getDocs,
  type DocumentData,
  type DocumentSnapshot,
  getCountFromServer,
} from "firebase/firestore";
import type { DataTablePageEvent, DataTableSortEvent } from "primevue";

/**
 * Type definition for pagination events received from PrimeVue DataTable
 * Used specifically for page size changes
 */
type PageEvent = {
  first: number;
  rows: number;
  page: number;
  pageCount: number;
  sortField: string;
};

/**
 * Type extending generic T to include Firestore document ID
 * All Firestore documents will have an 'id' field in addition to their data
 */
type FireStoreDocument<T> = T & {
  id: string;
};

/**
 * Firestore Paginator Composable with Pinia Cache Integration
 *
 * This composable provides advanced pagination capabilities for Firestore collections
 * using cursor-based pagination with intelligent caching via Pinia store.
 *
 * Features:
 * - Cursor-based pagination for efficient large dataset handling
 * - Intelligent caching with configurable TTL
 * - Automatic cache invalidation on sort/page size changes
 * - Bidirectional navigation (next/previous pages)
 * - Sorting support with cache awareness
 * - Loading states and error handling
 * - PrimeVue DataTable integration
 *
 * @template T - Type of documents to be retrieved from Firestore
 * @param {string} collectionName - Name of the Firestore collection to query
 * @param {keyof T} orderByField - Document field to order results by
 * @param {number} pageSize - Number of documents per page (default: 1)
 * @param {number} cacheTTL - Cache time-to-live in milliseconds (default: 5 minutes)
 *
 * @returns {Object} Pagination state and control functions
 *
 * @example
 * ```typescript
 * const { result, loading, loadInitial, pageEventHandler } =
 *   useFirestorePaginator<Song>("songs", "title", 10);
 *
 * onMounted(() => {
 *   loadInitial();
 * });
 * ```
 */
export const useFirestorePaginator = <T>(
  collectionName: string,
  orderByField: keyof T,
  pageSize = 1,
  cacheTTL: number = 5 * 60 * 1000 // Default: 5 minutes
) => {
  /**
   * Initialize Firestore database reference and cache store
   */
  const { $firebaseDb } = useNuxtApp();
  const db = $firebaseDb;
  const cacheStore = useFirestorePaginationCacheStore();

  // Reactive state references
  const result: Ref<T[]> = ref([]);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Document cursors for efficient pagination
  const firstDoc: Ref<DocumentSnapshot<DocumentData> | null> = ref(null);
  const lastDoc: Ref<DocumentSnapshot<DocumentData> | null> = ref(null);

  // Pagination state object containing current page info and sorting
  const pagination = ref({
    currentPage: 0,
    pageSize: pageSize,
    totalItems: 0,
    sortField: orderByField as string,
    sortOrder: 1 as 1 | -1, // 1 for ascending, -1 for descending
  });

  /**
   * Computed property that calculates total number of pages
   * Based on total items and current page size
   */
  const pageCount = computed(() => {
    return Math.ceil(pagination.value.totalItems / pagination.value.pageSize);
  });

  /**
   * Attempts to load a page from cache
   *
   * @param {number} pageNumber - Page number to load from cache
   * @returns {boolean} True if page was found in cache and loaded, false otherwise
   */
  const loadFromCache = (pageNumber: number): boolean => {
    const cachedPage = cacheStore.getPage(
      collectionName,
      pageNumber,
      pagination.value.sortField,
      pagination.value.sortOrder,
      pagination.value.pageSize
    );

    if (cachedPage) {
      // Load cached data into reactive state
      result.value = cachedPage.data;
      firstDoc.value = cachedPage.firstDoc;
      lastDoc.value = cachedPage.lastDoc;
      pagination.value.totalItems = cachedPage.totalItems;
      pagination.value.currentPage = pageNumber;
      return true;
    }

    return false;
  };

  /**
   * Saves a page to cache with all necessary pagination metadata
   *
   * @param {number} pageNumber - Page number being cached
   * @param {T[]} data - Array of documents for this page
   * @param {DocumentSnapshot<DocumentData> | null} firstDocSnapshot - First document cursor
   * @param {DocumentSnapshot<DocumentData> | null} lastDocSnapshot - Last document cursor
   */
  const saveToCache = (
    pageNumber: number,
    data: T[],
    firstDocSnapshot: DocumentSnapshot<DocumentData> | null,
    lastDocSnapshot: DocumentSnapshot<DocumentData> | null
  ) => {
    cacheStore.setPage(
      collectionName,
      pageNumber,
      data,
      firstDocSnapshot,
      lastDocSnapshot,
      pagination.value.sortField,
      pagination.value.sortOrder,
      pagination.value.pageSize,
      pagination.value.totalItems,
      cacheTTL
    );
  };

  /**
   * Loads the initial page of data with cache support
   *
   * This function handles the first page load, including getting the total count
   * of documents in the collection. It checks cache first unless force refresh
   * is requested.
   *
   * @param {boolean} forceRefresh - If true, bypass cache and load from Firestore
   */
  const loadInitial = async (forceRefresh: boolean = false) => {
    pagination.value.currentPage = 0;
    console.log("🔄 Loading initial page...");

    // Check cache first unless force refresh is requested
    if (!forceRefresh && loadFromCache(0)) {
      console.log("📦 Initial page loaded from cache");
      return;
    }

    // Create Firestore query for the initial page
    const q = query(
      collection(db, collectionName),
      orderBy(
        pagination.value.sortField as string,
        pagination.value.sortOrder === 1 ? "asc" : "desc"
      ),
      limit(pagination.value.pageSize)
    );

    try {
      loading.value = true;
      const snap = await getDocs(q);

      if (snap.empty) {
        console.warn("⚠️ No results found for initial page");
        pagination.value.totalItems = 0;
        result.value = [];
        firstDoc.value = null;
        lastDoc.value = null;
        return;
      }

      // Map Firestore documents to typed objects with ID
      const mappedResults = snap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as unknown as T)
      );

      // Update reactive state with new data
      result.value = mappedResults;
      firstDoc.value = snap.docs[0] || null;
      lastDoc.value = snap.docs[snap.docs.length - 1] || null;

      // Get total document count for pagination calculations
      const countSnap = await getCountFromServer(
        collection(db, collectionName)
      );
      pagination.value.totalItems = countSnap.data().count;

      // Cache the loaded page for future use
      saveToCache(0, mappedResults, firstDoc.value, lastDoc.value);

      console.log("📄 Initial page loaded from Firestore:", result.value);
    } catch (err) {
      error.value = err as Error;
      console.error("❌ Error loading initial page:", error.value);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Loads the next page of data with cache support
   *
   * Uses cursor-based pagination with startAfter for efficient querying.
   * Checks cache first unless force refresh is requested.
   *
   * @param {boolean} forceRefresh - If true, bypass cache and load from Firestore
   */
  const loadNext = async (forceRefresh: boolean = false) => {
    console.log("➡️ Loading next page...");

    // Validate that we have a cursor for the next page
    if (!lastDoc.value) {
      console.warn("⚠️ No reference document for next page");
      return;
    }

    // Check if we're already on the last page
    const totalPages = Math.ceil(
      pagination.value.totalItems / pagination.value.pageSize
    );
    if (pagination.value.currentPage >= totalPages - 1) {
      console.log("⚠️ Already on the last page");
      return;
    }

    const nextPage = pagination.value.currentPage + 1;

    // Check cache first unless force refresh is requested
    if (!forceRefresh && loadFromCache(nextPage)) {
      console.log("📦 Next page loaded from cache");
      return;
    }

    // Create Firestore query for the next page using cursor
    const q = query(
      collection(db, collectionName),
      orderBy(
        pagination.value.sortField as string,
        pagination.value.sortOrder === 1 ? "asc" : "desc"
      ),
      startAfter(lastDoc.value),
      limit(pagination.value.pageSize)
    );

    try {
      loading.value = true;
      const snap = await getDocs(q);

      if (snap.empty) {
        console.warn("⚠️ No results found for next page");
        return;
      }

      // Map Firestore documents to typed objects with ID
      const mappedResults = snap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as unknown as T)
      );

      // Update reactive state with new data
      result.value = mappedResults;
      firstDoc.value = snap.docs[0] || null;
      lastDoc.value = snap.docs[snap.docs.length - 1] || null;

      // Update current page only if we successfully retrieved data
      if (snap.docs.length > 0) {
        pagination.value.currentPage = nextPage;
        // Cache the loaded page for future use
        saveToCache(nextPage, mappedResults, firstDoc.value, lastDoc.value);
      }

      console.log(
        "📄 Next page loaded from Firestore:",
        result.value.map((item) => (item as FireStoreDocument<T>).id)
      );
    } catch (error) {
      console.error("❌ Error loading next page:", error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Loads the previous page of data with cache support
   *
   * Uses cursor-based pagination with endBefore and limitToLast for efficient querying.
   * Checks cache first unless force refresh is requested.
   *
   * @param {boolean} forceRefresh - If true, bypass cache and load from Firestore
   */
  const loadPrev = async (forceRefresh: boolean = false) => {
    console.log("⬅️ Loading previous page...");

    // Check if we're already on the first page
    if (pagination.value.currentPage <= 0) {
      console.log("⚠️ Already on the first page");
      return;
    }

    // Validate that we have a cursor for the previous page
    if (!firstDoc.value) {
      console.warn("⚠️ No reference document for previous page");
      return;
    }

    const prevPage = pagination.value.currentPage - 1;

    // Check cache first unless force refresh is requested
    if (!forceRefresh && loadFromCache(prevPage)) {
      console.log("📦 Previous page loaded from cache");
      return;
    }

    // Create Firestore query for the previous page using cursor
    const q = query(
      collection(db, collectionName),
      orderBy(
        pagination.value.sortField as string,
        pagination.value.sortOrder === 1 ? "asc" : "desc"
      ),
      endBefore(firstDoc.value),
      limitToLast(pagination.value.pageSize)
    );

    try {
      loading.value = true;
      const snap = await getDocs(q);

      if (snap.empty) {
        console.warn("⚠️ No results found for previous page");
        return;
      }

      // Map Firestore documents to typed objects with ID
      const mappedResults = snap.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          } as unknown as T)
      );

      // Update reactive state with new data
      result.value = mappedResults;
      firstDoc.value = snap.docs[0] || null;
      lastDoc.value = snap.docs[snap.docs.length - 1] || null;
      pagination.value.currentPage = prevPage;

      // Cache the loaded page for future use
      saveToCache(prevPage, mappedResults, firstDoc.value, lastDoc.value);

      console.log(
        "📄 Previous page loaded from Firestore:",
        result.value.map((item) => (item as FireStoreDocument<T>).id)
      );
    } catch (error) {
      console.error("❌ Error loading previous page:", error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Handles sorting events from PrimeVue DataTable
   *
   * Invalidates cache when sort order changes since cached data is no longer valid.
   * Toggles sort order if the same field is clicked, or sets new field to ascending.
   *
   * @param {DataTableSortEvent} event - Sort event from PrimeVue DataTable
   */
  const sortHandler = (event: DataTableSortEvent) => {
    console.log("🔄 Sort event received:", event);

    // Invalidate cache since sort order is changing
    cacheStore.invalidateCache(
      collectionName,
      pagination.value.sortField,
      pagination.value.sortOrder,
      pagination.value.pageSize
    );

    if (event.sortField === pagination.value.sortField) {
      console.log("🔄 Toggling sort order");
      // Toggle sort order if the same field is clicked again
      pagination.value.sortOrder = pagination.value.sortOrder === 1 ? -1 : 1;
    } else {
      console.log("🆕 Changing sort field to:", event.sortField);
      // Change the sort field and default to ascending order
      pagination.value.sortField = event.sortField as string;
      pagination.value.sortOrder = 1;
    }

    // Reload initial page with new sort configuration
    loadInitial(true);
  };

  /**
   * Handles page size change events from PrimeVue DataTable
   *
   * Invalidates cache when page size changes since cached pages are no longer valid.
   * Resets to first page and reloads data with new page size.
   *
   * @param {PageEvent} event - Page size change event from PrimeVue DataTable
   */
  const limitHandler = (event: PageEvent) => {
    console.log("📏 Page size changed to", event.rows);

    // Invalidate cache since page size is changing
    cacheStore.invalidateCache(
      collectionName,
      pagination.value.sortField,
      pagination.value.sortOrder,
      pagination.value.pageSize
    );

    // Update pagination state with new page size
    pagination.value = {
      ...pagination.value,
      currentPage: 0, // Reset to first page
      pageSize: event.rows,
    };

    // Reload data with new page size
    loadInitial(true);
  };

  /**
   * Handles page navigation events from PrimeVue DataTable
   *
   * Determines whether to load next or previous page based on target page number.
   * Uses efficient cursor-based navigation.
   *
   * @param {DataTablePageEvent} event - Page navigation event from PrimeVue DataTable
   */
  const pageHandler = (event: DataTablePageEvent) => {
    const targetPage = event.page;
    const currentPage = pagination.value.currentPage;

    console.log(`📖 Navigation: page ${currentPage} -> ${targetPage}`);

    if (targetPage === currentPage) {
      console.log("⚠️ Already on target page");
      return;
    } else if (targetPage > currentPage) {
      console.log("➡️ Loading next page");
      loadNext();
    } else {
      console.log("⬅️ Loading previous page");
      loadPrev();
    }
  };

  /**
   * General event handler for all pagination and sorting events from PrimeVue DataTable
   *
   * Routes events to appropriate handlers based on event type.
   * Handles both page size changes and page navigation events.
   *
   * @param {DataTablePageEvent} event - Pagination event from PrimeVue DataTable
   */
  const pageEventHandler = (event: DataTablePageEvent) => {
    console.log("📊 Pagination event received:", event);

    // Check if the page size has changed
    if (event.rows !== pagination.value.pageSize) {
      console.log(
        `📏 Page size changed: ${pagination.value.pageSize} -> ${event.rows}`
      );
      limitHandler(event as PageEvent);
    }
    // Handle normal page navigation
    else {
      pageHandler(event as DataTablePageEvent);
    }
  };

  /**
   * Forces a complete refresh of data by invalidating cache and reloading
   *
   * Useful when you know the data has changed externally and want to ensure
   * fresh data is loaded from Firestore regardless of cache state.
   */
  const forceRefresh = async () => {
    console.log("🔄 Force refresh - invalidating cache");

    // Invalidate all cache entries for this collection
    cacheStore.invalidateCollection(collectionName);

    // Reset pagination cursors to ensure clean state
    firstDoc.value = null;
    lastDoc.value = null;
    pagination.value.currentPage = 0;

    // Reload data from Firestore
    await loadInitial(true);
  };

  /**
   * Invalidates cache for the current collection
   *
   * Useful when you want to clear cached data without immediately reloading.
   * Next data access will fetch fresh data from Firestore.
   */
  const invalidateCache = () => {
    console.log("🗑️ Invalidating cache for collection:", collectionName);
    cacheStore.invalidateCollection(collectionName);
  };

  /**
   * Returns current cache statistics for debugging and monitoring
   *
   * @returns {Object} Cache statistics including total collections, pages, etc.
   */
  const getCacheStats = () => {
    return cacheStore.getCacheStats();
  };

  // Return all public methods and reactive state
  return {
    // Reactive state
    result, // Current page data
    loading, // Loading state indicator
    error, // Error state
    pagination, // Pagination configuration and state
    pageCount, // Total number of pages (computed)

    // Document cursors (for advanced use cases)
    firstDoc, // First document cursor of current page
    lastDoc, // Last document cursor of current page

    // Navigation methods
    loadInitial, // Load first page
    loadNext, // Load next page
    loadPrev, // Load previous page

    // Event handlers (for PrimeVue DataTable integration)
    pageHandler, // Handle page navigation events
    limitHandler, // Handle page size change events
    sortHandler, // Handle column sorting events
    pageEventHandler, // General pagination event handler

    // Cache management
    forceRefresh, // Force refresh data bypassing cache
    invalidateCache, // Invalidate cache for this collection
    getCacheStats, // Get cache statistics
  };
};
