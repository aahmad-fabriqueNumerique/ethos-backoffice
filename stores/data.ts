/**
 * Data Store (Pinia)
 *
 * This Pinia store manages global application data that needs to be accessed
 * across multiple components, with a focus on caching frequently used static data
 * to improve application performance and reduce processing overhead.
 *
 * Key Features:
 * - Static data management for select options (regions, languages, themes, countries, etc.)
 * - In-memory caching with lazy loading for optimal performance
 * - Dynamic data addition capabilities for runtime entries
 * - Internationalization support with translation integration
 * - Cache invalidation and reset functionality
 * - TypeScript support with proper type definitions
 *
 * Data Sources:
 * - Static JSON files for base data (regions, languages, themes, countries, songTypes, eventTypes)
 * - Runtime additions through addData method
 * - Internationalized labels using i18n translations
 *
 * Usage Example:
 * ```typescript
 * const dataStore = useDataStore();
 *
 * // Get cached data (auto-loads if not cached)
 * const countries = dataStore.getData('countries');
 *
 * // Add new entry dynamically
 * dataStore.addData('countries', { nom: 'New Country' });
 *
 * // Reset cache to force reload
 * dataStore.resetData('countries');
 * ```
 *
 * @module stores/data
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-24
 */

import type SelectType from "@/models/SelectType";
import dataRegions from "@/assets/data/regions.json";
import dataLanguages from "@/assets/data/languages.json";
import dataThemes from "@/assets/data/themes.json";
import dataCountries from "@/assets/data/countries.json";
import dataSongTypes from "@/assets/data/songTypes.json";
import dataEventTypes from "@/assets/data/eventTypes.json";
import dataNotifsTypes from "@/assets/data/notifsTypes.json";

/**
 * Base data type definition
 *
 * Represents the common structure for all data items in the store.
 * Currently an alias for SelectType but provides future extensibility.
 *
 * @type {SelectType}
 */
type Data = SelectType;

/**
 * Union type for all supported data categories
 *
 * Defines the available data types that can be managed by this store.
 * Used for type safety and autocomplete in TypeScript.
 *
 * @type {DataKey}
 */
export type DataKey =
  | "regions"
  | "languages"
  | "themes"
  | "countries"
  | "eventTypes"
  | "songTypes"
  | "notifsTypes";

/**
 * Pinia Data Store Definition
 *
 * Uses Pinia's setup syntax for better TypeScript integration and composition API support.
 * Provides reactive state management for application-wide static data.
 *
 * @returns {Object} Store instance with reactive state and methods
 */
export const useDataStore = defineStore("data", () => {
  /**
   * Processed and cached application data with generated IDs
   *
   * Contains the final processed data ready for use in components.
   * Each data type is cached separately to avoid unnecessary reprocessing.
   * Data includes translated labels and generated unique IDs.
   *
   * @type {Ref<Object>}
   */
  const data = ref<{
    regions: SelectType[] | null;
    languages: SelectType[] | null;
    themes: SelectType[] | null;
    countries: SelectType[] | null;
    eventTypes: SelectType[] | null;
    songTypes: SelectType[] | null;
    notifsTypes: SelectType[] | null;
  }>({
    regions: null,
    languages: null,
    themes: null,
    countries: null,
    eventTypes: null,
    songTypes: null,
    notifsTypes: null,
  });

  /**
   * Raw JSON data imported from static files
   *
   * Contains the unprocessed data from JSON files without IDs.
   * Used as the base data source before processing with translations and ID generation.
   * This separation allows for dynamic additions while preserving original static data.
   *
   * @type {Ref<Object>}
   */
  const jsonData = ref<{
    regions: Omit<SelectType, "id">[] | null;
    languages: Omit<SelectType, "id">[] | null;
    themes: Omit<SelectType, "id">[] | null;
    countries: Omit<SelectType, "id">[] | null;
    eventTypes: Omit<SelectType, "id">[] | null;
    songTypes: Omit<SelectType, "id">[] | null;
    notifsTypes: Omit<SelectType, "id">[] | null;
  }>({
    regions: null,
    languages: null,
    themes: null,
    countries: null,
    eventTypes: null,
    songTypes: null,
    notifsTypes: null,
  });

  // Initialize internationalization helpers for data translation and validation
  const { t, te } = useI18n();

  /**
   * Retrieves data of specified type with intelligent caching
   *
   * Implements a lazy loading strategy where data is processed only when first requested.
   * Subsequent requests return cached data for optimal performance. If cached data exists,
   * it's returned immediately. Otherwise, raw JSON data is processed with translations
   * and ID generation before being cached.
   *
   * Processing includes:
   * - ID generation for each item
   * - Translation lookup and application
   * - Fallback to original names if translations don't exist
   *
   * @param {DataKey} key - The type of data to retrieve (regions, languages, themes, countries, eventTypes, songTypes)
   * @returns {SelectType[] | null} Array of processed data objects with IDs and translated names, or null if not available
   *
   * @example
   * ```typescript
   * // Get countries data (processes and caches on first call)
   * const countries = getData('countries');
   *
   * // Subsequent calls return cached data
   * const countriesAgain = getData('countries'); // Fast cached retrieval
   * ```
   */
  const getData = (key: DataKey) => {
    console.log(`🔍 Fetching data for key: ${key}`);

    // Return cached data if available for immediate response
    if (data.value[key]) {
      console.log(`📦 Returning cached data for: ${key}`);
      return data.value[key];
    }

    // Process raw JSON data if not cached
    console.log(`⚙️ Processing raw data for: ${key}`);
    const result = fetchData(key);

    // Cache the processed result for future requests
    data.value[key] = result as SelectType[];

    return data.value[key];
  };

  /**
   * Processes raw JSON data and applies internationalization
   *
   * Transforms raw data objects into properly typed SelectType objects with:
   * - Sequential ID generation starting from 0
   * - Translation lookup using i18n with fallback to original names
   * - Proper TypeScript typing for type safety
   *
   * Translation Process:
   * 1. Checks if translation exists using te() (translation exists)
   * 2. If translation exists, uses t() to get translated value
   * 3. If no translation, falls back to original nom value
   *
   * @param {DataKey} key - The type of data to process
   * @returns {Data[]} Array of processed SelectType objects with IDs and translations
   *
   * @example
   * ```typescript
   * // Internal processing example:
   * // Raw: { nom: "France" }
   * // Processed: { id: 0, nom: "France" } or { id: 0, nom: "Translated France" }
   * ```
   */
  const fetchData = (key: DataKey): Data[] => {
    let index = 0;

    console.log(`⚙️ Processing raw data for key: ${key}`);

    const items: SelectType[] = [];

    // Process each raw data item with translation and ID assignment
    for (const d of jsonData.value[key]!) {
      // Check if translation exists for this specific item
      const translationExists = te(`data.${key}.${d.nom}`);

      // Create processed item with ID and translated name
      items.push({
        id: index,
        nom: translationExists ? t(`data.${key}.${d.nom}`) : d.nom,
        slug:
          key === "notifsTypes" ? jsonData.value[key]![index].nom : undefined,
      });

      index += 1;
    }

    console.log(`✅ Processed ${items.length} items for: ${key}`);
    return items;
  };

  /**
   * Resets the cache for specified data type
   *
   * Forces cache invalidation by setting the cached data to null. The next call to
   * getData() for this key will trigger fresh processing from the raw JSON data.
   * This is useful when:
   * - New items have been added dynamically
   * - Translations have been updated
   * - You need to force data refresh for any reason
   *
   * @param {DataKey} key - The type of data cache to reset
   *
   * @example
   * ```typescript
   * // Add new country and reset cache to include it in next getData call
   * addData('countries', { nom: 'New Country' });
   * resetData('countries'); // Next getData('countries') will include new country
   * ```
   */
  const resetData = (key: DataKey) => {
    data.value[key] = null;
    console.log(`🗑️ Cache reset for: ${key}`);
  };

  /**
   * Store initialization hook
   *
   * Loads static JSON data into the store when first mounted. This happens once
   * during the application lifecycle and populates the raw data that will be
   * processed on-demand when requested through getData().
   */
  onMounted(() => {
    console.log("🚀 Initializing data store with static JSON files");

    /**
     * Load static JSON data into the jsonData reactive reference
     *
     * This creates the base dataset that will be processed with translations
     * and IDs when requested. The data is cast to the appropriate type since
     * JSON imports don't include the 'id' field by design.
     */
    jsonData.value = {
      regions: dataRegions as Omit<SelectType, "id">[],
      countries: dataCountries as Omit<SelectType, "id">[],
      languages: dataLanguages as Omit<SelectType, "id">[],
      themes: dataThemes as Omit<SelectType, "id">[],
      eventTypes: dataEventTypes as Omit<SelectType, "id">[],
      songTypes: dataSongTypes as Omit<SelectType, "id">[],
      notifsTypes: dataNotifsTypes as Omit<SelectType, "id">[],
    };

    console.log("✅ Static data loaded successfully");
  });

  /**
   * Adds new data entry to the specified data type
   *
   * Dynamically adds a new item to both the raw JSON data and the processed cache
   * (if it exists). The new item receives an auto-generated ID based on the current
   * array length, ensuring unique identification.
   *
   * Process:
   * 1. Validates that the specified data type exists
   * 2. Generates a unique ID for the new item
   * 3. Adds to raw JSON data for persistence
   * 4. Updates processed cache if it exists for immediate availability
   *
   * @param {DataKey} key - The type of data to add to (regions, countries, etc.)
   * @param {Omit<SelectType, "id">} item - The item to add (without ID, will be auto-generated)
   *
   * @example
   * ```typescript
   * // Add a new country
   * addData('countries', { nom: 'Spain' });
   *
   * // Add a new region
   * addData('regions', { nom: 'Andalusia' });
   *
   * // The ID will be automatically generated based on array length
   * ```
   */
  const addData = (key: DataKey, item: Omit<SelectType, "id">) => {
    // Validate that the specified data type exists in the store
    if (!jsonData.value[key]) {
      console.error(`❌ Error: Key '${key}' does not exist in JSON data`);
      return;
    }

    console.log(`➕ Adding new item to ${key}:`, item);

    // Create a new item with auto-generated ID based on current array length
    const newItem: SelectType = {
      id: jsonData.value[key]!.length,
      nom: item.nom,
    };

    // Add to raw JSON data for persistence
    jsonData.value[key]!.push(newItem);

    // Update processed cache if it exists for immediate availability
    if (data.value[key]) {
      data.value[key]!.push(newItem);
    }

    console.log(
      `✅ Successfully added new ${key.slice(0, -1)}: "${item.nom}" with ID: ${
        newItem.id
      }`
    );
  };

  /**
   * Legacy commented code for specific data type methods
   *
   * These methods were replaced by the generic addData method for better maintainability.
   * Keeping for reference and potential future specific implementations.
   * The addData method now handles all data types uniformly.
   */
  /*const addCountry = (country: Omit<SelectType, "id">) => {
    const newCountry: SelectType = {
      id: jsonData.value.countries!.length,
      nom: country.nom,
    };

    // Add to raw JSON data
    jsonData.value.countries!.push(newCountry);

    // Add to processed cache if it exists
    if (data.value.countries) {
      data.value.countries.push(newCountry);
    }

    console.log(`Added new country: ${country.nom}`);
  };

  const addRegion = (region: Omit<Region, "id">) => {
    const newRegion: Region = {
      id: jsonData.value.regions!.length,
      nom: region.nom,
      region_geographique_libelle: region.region_geographique_libelle,
    };

    // Add to raw JSON data
    jsonData.value.regions!.push(newRegion);

    // Add to processed cache if it exists
    if (data.value.regions) {
      data.value.regions.push(newRegion);
    }

    console.log(`Added new region: ${region.nom}`);
  };*/

  /**
   * Store Public API
   *
   * Returns the reactive state and methods that can be used by components
   * throughout the application. This follows Pinia's composition API pattern.
   *
   * @returns {Object} Store instance with reactive state and methods
   */
  return {
    /**
     * Add new data entry to any data type
     * @function addData
     */
    addData,

    /**
     * Retrieve data with intelligent caching and lazy loading
     * @function getData
     */
    getData,

    /**
     * Reset cache for specified data type to force refresh
     * @function resetData
     */
    resetData,
  };
});
