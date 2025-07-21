import { useFirestorePaginationCacheStore } from "@/stores/useFirestorePaginationCache";

/**
 * Global Cache Manager Utility
 *
 * Provides global functions to manage Firestore pagination cache
 * from anywhere in the application, including outside of composables.
 */

/**
 * Invalidates all cache entries for a specific collection
 *
 * Use this function when you know data has changed in a collection
 * and want to ensure fresh data is loaded on next access.
 *
 * @param {string} collectionName - Name of the Firestore collection to invalidate
 *
 * @example
 * ```typescript
 * // After deleting an event
 * await deleteEvent(eventId);
 * invalidateCollectionCache('evenements');
 *
 * // After updating multiple songs
 * await updateMultipleSongs(songIds, updates);
 * invalidateCollectionCache('chants');
 * ```
 */
export const invalidateCollectionCache = (collectionName: string) => {
  const cacheStore = useFirestorePaginationCacheStore();

  console.log(
    `🗑️ [Global] Invalidating cache for collection: ${collectionName}`
  );
  cacheStore.invalidateCollection(collectionName);
};

/**
 * Invalidates cache for a specific pagination configuration
 *
 * More targeted invalidation when you know the specific sort/page configuration
 * that needs to be cleared.
 *
 * @param {string} collectionName - Name of the Firestore collection
 * @param {string} sortField - Field used for sorting documents
 * @param {1 | -1} sortOrder - Sort direction (1 = ascending, -1 = descending)
 * @param {number} pageSize - Number of documents per page
 *
 * @example
 * ```typescript
 * // Invalidate only songs sorted by title ascending with 10 items per page
 * invalidateSpecificCache('chants', 'title', 1, 10);
 * ```
 */
export const invalidateSpecificCache = (
  collectionName: string,
  sortField: string,
  sortOrder: 1 | -1,
  pageSize: number
) => {
  const cacheStore = useFirestorePaginationCacheStore();

  console.log(
    `🗑️ [Global] Invalidating specific cache: ${collectionName}_${sortField}_${sortOrder}_${pageSize}`
  );
  cacheStore.invalidateCache(collectionName, sortField, sortOrder, pageSize);
};

/**
 * Clears all cache entries across all collections
 *
 * Nuclear option - use with caution. Useful during logout or major data changes.
 *
 * @example
 * ```typescript
 * // Clear all cache during user logout
 * await signOut();
 * clearAllCache();
 * ```
 */
export const clearAllCache = () => {
  const cacheStore = useFirestorePaginationCacheStore();

  console.log("🧹 [Global] Clearing all cache");
  cacheStore.clearAll();
};

/**
 * Gets current cache statistics
 *
 * Returns detailed information about cache usage for monitoring and debugging.
 *
 * @returns {Object} Cache statistics including collections and page counts
 *
 * @example
 * ```typescript
 * const stats = getCacheStatistics();
 * console.log(`Total cached pages: ${stats.totalPages}`);
 * console.log(`Events collection: ${stats.collections.evenements?.pages} pages`);
 * ```
 */
export const getCacheStatistics = () => {
  const cacheStore = useFirestorePaginationCacheStore();

  return cacheStore.getCacheStats();
};

/**
 * Checks if cache exists for a specific collection
 *
 * Useful for determining if data might be stale or if a refresh is needed.
 *
 * @param {string} collectionName - Name of the collection to check
 * @returns {boolean} True if cache exists for this collection
 *
 * @example
 * ```typescript
 * if (hasCollectionCache('chants')) {
 *   console.log('Songs cache exists');
 * } else {
 *   console.log('No songs cache found');
 * }
 * ```
 */
export const hasCollectionCache = (collectionName: string): boolean => {
  const stats = getCacheStatistics();
  return Object.keys(stats.collections).includes(collectionName);
};

/**
 * Batch invalidation for multiple collections
 *
 * Efficiently invalidates cache for multiple collections at once.
 *
 * @param {string[]} collectionNames - Array of collection names to invalidate
 *
 * @example
 * ```typescript
 * // After a bulk operation affecting multiple collections
 * batchInvalidateCollections(['chants', 'evenements', 'notifications']);
 * ```
 */
export const batchInvalidateCollections = (collectionNames: string[]) => {
  const cacheStore = useFirestorePaginationCacheStore();

  console.log(`🗑️ [Global] Batch invalidating collections:`, collectionNames);

  collectionNames.forEach((collectionName) => {
    cacheStore.invalidateCollection(collectionName);
  });
};
