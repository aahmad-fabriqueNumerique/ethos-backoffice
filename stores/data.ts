/**
 * Data Store
 *
 * This store manages global application data that needs to be accessed
 * across multiple components, with a focus on caching frequently used data
 * to improve application performance and reduce database queries.
 *
 * Current capabilities:
 * - Fetching and caching multiple data types (regions, languages, themes, countries)
 * - Providing reset functionality for cache invalidation
 * - Adding new countries dynamically
 *
 * @module stores/data
 */
import type Region from "@/models/Region";
import { defineStore } from "pinia";
import { ref } from "vue";
import type SelectType from "@/models/SelectType";
import dataRegions from "@/assets/data/regions.json";
import dataLanguages from "@/assets/data/languages.json";
import dataThemes from "@/assets/data/themes.json";
import dataCountries from "@/assets/data/countries.json";
import dataSongTypes from "@/assets/data/songTypes.json";
import dataEventTypes from "@/assets/data/eventTypes.json";

type Data = Region | SelectType;

export type DataKey =
  | "regions"
  | "languages"
  | "themes"
  | "countries"
  | "eventTypes"
  | "songTypes";

/**
 * Data store for managing application-wide data
 * Uses Pinia's setup syntax for better TypeScript integration and composition API support
 */
export const useDataStore = defineStore("data", () => {
  /**
   * Cached application data with proper IDs
   * Stored in memory to avoid repeated JSON processing and improve performance
   */
  const data = ref<{
    regions: Region[] | null;
    languages: SelectType[] | null;
    themes: SelectType[] | null;
    countries: SelectType[] | null;
    eventTypes: SelectType[] | null;
    songTypes: SelectType[] | null;
  }>({
    regions: null,
    languages: null,
    themes: null,
    countries: null,
    eventTypes: null,
    songTypes: null,
  });

  /**
   * Raw JSON data imported from static files
   * Used as the base data source before processing with translations and IDs
   */
  const jsonData = ref<{
    regions: Omit<Region, "id">[] | null;
    languages: Omit<SelectType, "id">[] | null;
    themes: Omit<SelectType, "id">[] | null;
    countries: Omit<SelectType, "id">[] | null;
    eventTypes: Omit<SelectType, "id">[] | null;
    songTypes: Omit<SelectType, "id">[] | null;
  }>({
    regions: null,
    languages: null,
    themes: null,
    countries: null,
    eventTypes: null,
    songTypes: null,
  });

  // Internationalization helpers for data translation
  const { t, te } = useI18n();

  /**
   * Retrieves data of specified type, using cached data if available
   * If no cached data exists, processes the raw JSON data with translations
   * This approach minimizes processing while ensuring data availability
   *
   * @param {DataKey} key - The type of data to retrieve ('regions', 'languages', 'themes', 'countries', 'eventTypes', 'songTypes')
   * @returns {Array<Data>|null} Array of data objects with their IDs and translated names
   */
  const getData = (key: DataKey) => {
    console.log(`Fetching data for key: ${key}`);

    // Return cached data if available
    if (data.value[key]) return data.value[key];

    // Process raw JSON data if not cached
    const result = fetchData(key);
    if (key === "regions") {
      data.value[key] = result as Region[];
    } else {
      data.value[key] = result as SelectType[];
    }
    return data.value[key];
  };

  /**
   * Processes raw JSON data and applies translations
   * Converts raw data objects to properly typed objects with IDs and translated names
   *
   * @param {DataKey} key - The type of data to process
   * @returns {Data[]} Array of processed data objects with IDs and translations
   */
  const fetchData = (key: DataKey): Data[] => {
    let index = 0;

    // Special handling for regions which have additional properties
    if (key === "regions") {
      const regions: Region[] = [];
      for (const d of jsonData.value.regions!) {
        // Check if translations exist for region name and geographical region
        const evalTName = te(`data.${key}.${d.nom}`);
        const evalTRegion = te(
          `data.${key}.region_geographique_libelle.${d.region_geographique_libelle}`
        );

        regions.push({
          id: index,
          nom: evalTName ? t(`data.${key}.${d.nom}`) : d.nom,
          region_geographique_libelle: evalTRegion
            ? t(
                `data.${key}.region_geographique_libelle.${d.region_geographique_libelle}`
              )
            : d.region_geographique_libelle,
        });
        index += 1;
      }
      return regions;
    } else {
      // Standard processing for SelectType objects
      console.log("Processing data for key:", key);

      const items: SelectType[] = [];
      for (const d of jsonData.value[key]!) {
        // Check if translation exists for this item
        const evalTName = te(`data.${key}.${d.nom}`);
        items.push({
          id: index,
          nom: evalTName ? t(`data.${key}.${d.nom}`) : d.nom,
        });
        index += 1;
      }
      return items;
    }
  };

  /**
   * Resets the specified data cache
   * Use this when you need to force a fresh processing of data
   * Useful after adding new items or when translations might have changed
   *
   * @param {DataKey} key - The type of data cache to reset
   */
  const resetData = (key: DataKey) => {
    data.value[key] = null;
    console.log(`${key} cache reset`);
  };

  // Initialize raw JSON data when the store is mounted
  onMounted(() => {
    /**
     * Load static JSON data into the store
     * This happens once when the store is first initialized
     * The data is then processed on-demand when requested
     */
    jsonData.value = {
      regions: dataRegions as Omit<Region, "id">[],
      countries: dataCountries as Omit<SelectType, "id">[],
      languages: dataLanguages as Omit<SelectType, "id">[],
      themes: dataThemes as Omit<SelectType, "id">[],
      eventTypes: dataEventTypes as Omit<SelectType, "id">[],
      songTypes: dataSongTypes as Omit<SelectType, "id">[],
    };
  });

  /**
   * Adds a new country to the countries data
   * Updates both the raw JSON data and the processed cache
   *
   * @param {Omit<SelectType, "id">} country - The country object to add (without ID)
   */
  const addCountry = (country: Omit<SelectType, "id">) => {
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
  };

  // Return the public API of the store
  return {
    addCountry, // Function to add new countries
    addRegion, // Function to add new regions
    getData, // Function to retrieve data with caching
    resetData, // Function to reset data cache
  };
});
