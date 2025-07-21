/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from "pinia";
import type { DocumentSnapshot, DocumentData } from "firebase/firestore";

/**
 * Interface defining the structure of a pagination cache entry
 *
 * Each entry represents a cached pagination configuration for a specific collection
 * with its sort order, page size, and all cached pages.
 */
interface PaginationCacheEntry {
  /**
   * Map of page numbers to their cached data and document cursors
   */
  pages: Map<
    number,
    {
      data: any[]; // Array of documents for this page
      firstDoc: DocumentSnapshot<DocumentData> | null; // First document cursor for pagination
      lastDoc: DocumentSnapshot<DocumentData> | null; // Last document cursor for pagination
    }
  >;
  totalItems: number; // Total number of items in the collection
  timestamp: number; // When this cache entry was created/updated
  ttl: number; // Time-to-live in milliseconds
  sortField: string; // Field used for sorting
  sortOrder: 1 | -1; // Sort order: 1 for ascending, -1 for descending
  pageSize: number; // Number of items per page
}

/**
 * Firestore Pagination Cache Store
 *
 * A Pinia store that manages caching for Firestore pagination operations.
 * This store provides efficient caching of paginated data with cursor-based
 * pagination support, automatic cache expiration, and intelligent invalidation.
 *
 * Features:
 * - Caches paginated data with Firestore document cursors
 * - Supports multiple collections with different pagination configurations
 * - Automatic cache expiration based on TTL
 * - Intelligent cache invalidation on data changes
 * - Memory-efficient storage with automatic cleanup
 * - Comprehensive cache statistics and monitoring
 *
 * Cache Key Structure: `{collection}_{sortField}_{sortOrder}_{pageSize}`
 *
 * @example
 * ```typescript
 * const cacheStore = useFirestorePaginationCacheStore();
 *
 * // Cache a page
 * cacheStore.setPage('songs', 0, data, firstDoc, lastDoc, 'title', 1, 10, 100);
 *
 * // Retrieve a page
 * const page = cacheStore.getPage('songs', 0, 'title', 1, 10);
 *
 * // Invalidate cache
 * cacheStore.invalidateCollection('songs');
 * ```
 */
export const useFirestorePaginationCacheStore = defineStore(
  "firestorePaginationCache",
  () => {
    /**
     * Main cache storage mapping cache keys to pagination entries
     *
     * Key format: `{collectionName}_{sortField}_{sortOrder}_{pageSize}`
     * Each key represents a unique pagination configuration
     */
    const cache = ref<Map<string, PaginationCacheEntry>>(new Map());

    /**
     * Generates a unique cache key for a specific pagination configuration
     *
     * The cache key uniquely identifies a pagination setup, ensuring that
     * different sort orders or page sizes don't interfere with each other.
     *
     * @param {string} collectionName - Name of the Firestore collection
     * @param {string} sortField - Field used for sorting documents
     * @param {1 | -1} sortOrder - Sort direction (1 = ascending, -1 = descending)
     * @param {number} pageSize - Number of documents per page
     * @returns {string} Unique cache key for this configuration
     *
     * @example
     * ```typescript
     * const key = generateCacheKey('songs', 'title', 1, 10);
     * // Returns: 'songs_title_1_10'
     * ```
     */
    const generateCacheKey = (
      collectionName: string,
      sortField: string,
      sortOrder: 1 | -1,
      pageSize: number
    ): string => {
      return `${collectionName}_${sortField}_${sortOrder}_${pageSize}`;
    };

    /**
     * Checks if a cache entry is still valid based on its TTL
     *
     * @param {PaginationCacheEntry} entry - Cache entry to validate
     * @returns {boolean} True if the entry is still valid, false if expired
     */
    const isCacheValid = (entry: PaginationCacheEntry): boolean => {
      return Date.now() - entry.timestamp < entry.ttl;
    };

    /**
     * Retrieves cache metadata for a specific cache key
     *
     * Returns basic information about a cached pagination configuration
     * without returning the actual page data.
     *
     * @param {string} cacheKey - The cache key to get metadata for
     * @returns {Object|null} Cache metadata or null if not found/expired
     */
    const getCacheMetadata = (cacheKey: string) => {
      const entry = cache.value.get(cacheKey);
      if (entry && isCacheValid(entry)) {
        return {
          totalItems: entry.totalItems,
          sortField: entry.sortField,
          sortOrder: entry.sortOrder,
          pageSize: entry.pageSize,
          timestamp: entry.timestamp,
        };
      }
      return null;
    };

    /**
     * Retrieves a specific page from the cache
     *
     * Attempts to find and return a cached page for the given pagination configuration.
     * Automatically removes expired entries and logs cache hits/misses.
     *
     * @param {string} collectionName - Name of the Firestore collection
     * @param {number} pageNumber - Page number to retrieve (0-based)
     * @param {string} sortField - Field used for sorting documents
     * @param {1 | -1} sortOrder - Sort direction (1 = ascending, -1 = descending)
     * @param {number} pageSize - Number of documents per page
     * @returns {Object|null} Cached page data with cursors, or null if not found
     *
     * @example
     * ```typescript
     * const page = getPage('songs', 0, 'title', 1, 10);
     * if (page) {
     *   console.log('Found cached page:', page.data);
     *   console.log('First document cursor:', page.firstDoc);
     * }
     * ```
     */
    const getPage = (
      collectionName: string,
      pageNumber: number,
      sortField: string,
      sortOrder: 1 | -1,
      pageSize: number
    ) => {
      const cacheKey = generateCacheKey(
        collectionName,
        sortField,
        sortOrder,
        pageSize
      );
      const entry = cache.value.get(cacheKey);

      if (entry && isCacheValid(entry)) {
        const pageData = entry.pages.get(pageNumber);
        if (pageData) {
          console.log(`🎯 Cache hit for page ${pageNumber} of ${cacheKey}`);
          return {
            data: pageData.data,
            firstDoc: pageData.firstDoc,
            lastDoc: pageData.lastDoc,
            totalItems: entry.totalItems,
          };
        }
      }

      // Clean up expired entries
      if (entry && !isCacheValid(entry)) {
        console.log(`⏰ Cache expired for ${cacheKey}`);
        cache.value.delete(cacheKey);
      }

      console.log(`❌ Cache miss for page ${pageNumber} of ${cacheKey}`);
      return null;
    };

    /**
     * Saves a page to the cache with all necessary metadata
     *
     * Stores a page of data along with its Firestore document cursors for
     * efficient pagination. Creates or updates the cache entry as needed.
     *
     * @param {string} collectionName - Name of the Firestore collection
     * @param {number} pageNumber - Page number being cached (0-based)
     * @param {any[]} data - Array of documents for this page
     * @param {DocumentSnapshot<DocumentData> | null} firstDoc - First document cursor
     * @param {DocumentSnapshot<DocumentData> | null} lastDoc - Last document cursor
     * @param {string} sortField - Field used for sorting documents
     * @param {1 | -1} sortOrder - Sort direction (1 = ascending, -1 = descending)
     * @param {number} pageSize - Number of documents per page
     * @param {number} totalItems - Total number of items in the collection
     * @param {number} ttl - Time-to-live in milliseconds (default: 5 minutes)
     *
     * @example
     * ```typescript
     * setPage('songs', 0, songData, firstDoc, lastDoc, 'title', 1, 10, 100, 300000);
     * ```
     */
    const setPage = (
      collectionName: string,
      pageNumber: number,
      data: any[],
      firstDoc: DocumentSnapshot<DocumentData> | null,
      lastDoc: DocumentSnapshot<DocumentData> | null,
      sortField: string,
      sortOrder: 1 | -1,
      pageSize: number,
      totalItems: number,
      ttl: number = 5 * 60 * 1000 // Default: 5 minutes
    ) => {
      const cacheKey = generateCacheKey(
        collectionName,
        sortField,
        sortOrder,
        pageSize
      );
      let entry = cache.value.get(cacheKey);

      // Create new entry if it doesn't exist or is expired
      if (!entry || !isCacheValid(entry)) {
        entry = {
          pages: new Map(),
          totalItems,
          timestamp: Date.now(),
          ttl,
          sortField,
          sortOrder,
          pageSize,
        };
        cache.value.set(cacheKey, entry);
      }

      // Update metadata with fresh information
      entry.totalItems = totalItems;
      entry.timestamp = Date.now();

      // Store the page data with its cursors
      entry.pages.set(pageNumber, {
        data,
        firstDoc,
        lastDoc,
      });

      console.log(`💾 Page ${pageNumber} cached for ${cacheKey}`);
    };

    /**
     * Invalidates all cache entries for a specific collection
     *
     * Removes all cached data for a collection regardless of sort order or page size.
     * Useful when you know the collection data has changed and want to ensure
     * fresh data is loaded on next access.
     *
     * @param {string} collectionName - Name of the collection to invalidate
     *
     * @example
     * ```typescript
     * // After adding/updating/deleting documents in 'songs' collection
     * invalidateCollection('songs');
     * ```
     */
    const invalidateCollection = (collectionName: string) => {
      const keysToDelete: string[] = [];

      // Find all cache keys that start with the collection name
      cache.value.forEach((_, key) => {
        if (key.startsWith(collectionName)) {
          keysToDelete.push(key);
        }
      });

      // Delete all matching cache entries
      keysToDelete.forEach((key) => {
        cache.value.delete(key);
      });

      console.log(`🗑️ Cache invalidated for collection ${collectionName}`);
    };

    /**
     * Invalidates cache for a specific pagination configuration
     *
     * Removes cached data for a specific combination of collection, sort field,
     * sort order, and page size. More targeted than invalidateCollection.
     *
     * @param {string} collectionName - Name of the Firestore collection
     * @param {string} sortField - Field used for sorting documents
     * @param {1 | -1} sortOrder - Sort direction (1 = ascending, -1 = descending)
     * @param {number} pageSize - Number of documents per page
     *
     * @example
     * ```typescript
     * // Invalidate only the cache for songs sorted by title ascending with 10 items per page
     * invalidateCache('songs', 'title', 1, 10);
     * ```
     */
    const invalidateCache = (
      collectionName: string,
      sortField: string,
      sortOrder: 1 | -1,
      pageSize: number
    ) => {
      const cacheKey = generateCacheKey(
        collectionName,
        sortField,
        sortOrder,
        pageSize
      );
      cache.value.delete(cacheKey);
      console.log(`🗑️ Cache invalidated for ${cacheKey}`);
    };

    /**
     * Clears all cache entries
     *
     * Removes all cached data for all collections and configurations.
     * Use with caution as this will force all subsequent requests to fetch
     * fresh data from Firestore.
     *
     * @example
     * ```typescript
     * // Clear all cache during app logout or major data changes
     * clearAll();
     * ```
     */
    const clearAll = () => {
      cache.value.clear();
      console.log("🧹 All cache cleared");
    };

    /**
     * Returns comprehensive cache statistics
     *
     * Provides detailed information about cache usage including total collections,
     * cached pages, and per-collection statistics. Useful for monitoring and
     * debugging cache performance.
     *
     * @returns {Object} Cache statistics object
     *
     * @example
     * ```typescript
     * const stats = getCacheStats();
     * console.log(`Total cached pages: ${stats.totalPages}`);
     * console.log(`Songs collection has ${stats.collections.songs?.pages} cached pages`);
     * ```
     */
    const getCacheStats = () => {
      const stats = {
        totalCollections: cache.value.size,
        totalPages: 0,
        collections: {} as Record<
          string,
          { pages: number; totalItems: number }
        >,
      };

      cache.value.forEach((entry, key) => {
        const collectionName = key.split("_")[0];
        stats.totalPages += entry.pages.size;

        if (!stats.collections[collectionName]) {
          stats.collections[collectionName] = { pages: 0, totalItems: 0 };
        }

        stats.collections[collectionName].pages += entry.pages.size;
        stats.collections[collectionName].totalItems = entry.totalItems;
      });

      return stats;
    };

    /**
     * Automatic cleanup of expired cache entries
     *
     * Removes cache entries that have exceeded their TTL to prevent memory leaks.
     * This function is called automatically every 5 minutes, but can also be
     * called manually when needed.
     *
     * @example
     * ```typescript
     * // Manually trigger cleanup
     * cleanup();
     * ```
     */
    const cleanup = () => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      // Find all expired cache entries
      cache.value.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      });

      // Remove expired entries
      keysToDelete.forEach((key) => {
        cache.value.delete(key);
      });

      if (keysToDelete.length > 0) {
        console.log(
          `🧹 Cleaned up ${keysToDelete.length} expired cache entries`
        );
      }
    };

    /**
     * Automatic cleanup interval setup
     *
     * Sets up a periodic cleanup process that runs every 5 minutes
     * to remove expired cache entries automatically.
     * Only runs on the client side to avoid SSR issues.
     */
    if (import.meta.client) {
      setInterval(cleanup, 5 * 60 * 1000); // Cleanup every 5 minutes
    }

    // Return all public methods for use in components and composables
    return {
      // Core cache operations
      getPage, // Retrieve a cached page
      setPage, // Store a page in cache
      getCacheMetadata, // Get cache metadata without data

      // Cache invalidation methods
      invalidateCollection, // Invalidate all cache for a collection
      invalidateCache, // Invalidate cache for specific configuration
      clearAll, // Clear all cache entries

      // Utility methods
      getCacheStats, // Get comprehensive cache statistics
      cleanup, // Manually trigger cleanup of expired entries
    };
  }
);
