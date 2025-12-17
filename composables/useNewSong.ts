/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * New Song Creation Composable
 *
 * Utility composable that encapsulates all logic for creating new songs in the application.
 * Provides form validation, data sanitization, Firestore integration, and navigation handling.
 *
 * @module composables/useNewSong
 */
import { regexOptionalGeneric } from "@/libs/regex";
import type Region from "@/models/Region";
import type { Song, SongCreate } from "@/models/Song";
import { useDataStore } from "@/stores/data";
import { toTypedSchema } from "@vee-validate/zod";
import { onMounted, ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { z } from "zod";
import type SelectType from "~/models/SelectType";
import { getAuth, type User } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteField,
  doc,
  getDoc,
  getFirestore,
  updateDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { createSlugWithWords } from "~/utils/createSlug";

/**
 * Return type for the useNewSong composable
 * Contains all necessary values and functions for the song creation form
 */
export type NewSongReturn = {
  isLoading: Ref<boolean>;
  newSongFormSchema: ReturnType<typeof toTypedSchema>;
  onSubmit: (values: SongCreate) => void;
  onCancel: () => void;
  regions: Ref<Region[]>;
  languages: Ref<SelectType[]>;
  songTypes: Ref<SelectType[]>;
  themes: Ref<SelectType[]>;
  countries: Ref<SelectType[]>;
  getSongDetails: (songId: string) => Promise<Song | null>;
  onUpdate: (formValues: unknown) => void;
};

/**
 * Provides functionality for creating and managing new songs
 *
 * @returns {Object} Form controls, validation schema, and reference data for song creation
 */
export const useNewSong = (songId?: string) => {
  const { t } = useI18n();
  const router = useRouter();
  const { showToast } = useNotifsToasts();
  const isLoading = ref(false);
  const useData = useDataStore(); // Data store for region information

  // References for dropdown data
  const regions = ref<Region[]>([]);
  const languages = ref<SelectType[]>([]);
  const songTypes = ref<SelectType[]>([]);
  const themes = ref<SelectType[]>([]);
  const countries = ref<SelectType[]>([]);

  /**
   * Zod validation schema for the new song form
   * Ensures data integrity and provides error messages for form validation
   */
  const newSongFormSchema = toTypedSchema(
    z.object({
      titre: z
        .string({ required_error: "no_title" })
        .regex(regexOptionalGeneric, { message: "invalid_title" }),
      auteur: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_author" })
        .optional(),
      compositeur: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_composer" })
        .optional(),
      paroles: z
        .string({ required_error: "no_lyrics" })
        .regex(regexOptionalGeneric, { message: "invalid_lyrics" }),
      type_de_chanson: z
        .array(
          z
            .string()
            .regex(regexOptionalGeneric, { message: "invalid_song_type" })
        )
        .optional()
        .default([]), // Default to empty array if no type selected
      region: z
        .string({ required_error: "no_region" })
        .regex(regexOptionalGeneric, { message: "invalid_region" }),
      interpretes: z
        .array(
          z
            .string()
            .regex(regexOptionalGeneric, { message: "invalid_interpreter" })
        )
        .optional()
        .default([""]),
      pays: z
        .string({ required_error: "no_country" })
        .regex(regexOptionalGeneric, { message: "invalid_country" }),
      langue: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_language" })
        .optional(),
      album: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_album" })
        .optional(),
      theme: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_theme" })
        .optional(),
      contexte_historique: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_context" })
        .optional(),
      description: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_description" })
        .optional(),
      urls: z
        .array(
          z
            .string()
            .transform((val) => (val.trim() === "" ? undefined : val))
            .optional()
            .refine((val) => !val || z.string().url().safeParse(val).success, {
              message: "invalid_url",
            })
        )
        .optional()
        .default([]),
      urls_musique: z
        .array(
          z
            .string()
            .transform((val) => (val.trim() === "" ? undefined : val))
            .optional()
            .refine((val) => !val || z.string().url().safeParse(val).success, {
              message: "invalid_music_url",
            })
        )
        .optional()
        .default([]),
      archived: z.boolean().optional(),
    })
  );

  /**
   * Authentication Check Helper
   *
   * Verifies that a user is currently authenticated and retrieves a fresh
   * authentication token for API requests.
   */
  const checkAuth = async (): Promise<string | null> => {
    // Get Firebase Auth instance
    const auth = getAuth();
    const user = auth.currentUser as User;

    // Check if user is authenticated
    if (!user) {
      console.error("❌ No authenticated user found");
      return null;
    }

    // Get fresh authentication token for API requests
    return await user.getIdToken();
  };

  /**
   * Updates the Regions Metadata List
   *
   * Checks if the region used in the song exists in the global metadata.
   * If not, it adds it to the list to ensure the filter lists remain up to date.
   *
   * Flow: Fetch -> Verify -> Add -> Sort -> Update
   *
   * @param {string} regionName - The name of the region to check/add
   */
  const updateRegionMetadata = async (regionName: string) => {
    // Basic validation
    if (!regionName || regionName.trim() === "") return;

    try {
      console.log(`🌍 Checking metadata for region: ${regionName}`);
      const db = getFirestore();
      const metadataCollection = collection(db, "metadata");

      // 1. FETCH: Search for the specific 'regions-list' document
      const q = query(metadataCollection, where("type", "==", "regions-list"));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        // Case 1: The document does not exist, create it
        console.log("🆕 Metadata document not found. Creating new one.");
        await addDoc(metadataCollection, {
          type: "regions-list",
          data: [regionName.trim()],
        });
      } else {
        // Case 2: The document exists, check content
        const docSnapshot = querySnapshot.docs[0];
        const docRef = docSnapshot.ref;
        const currentData = docSnapshot.data();

        // Securely retrieve the array
        const existingRegions: string[] = Array.isArray(currentData.data)
          ? [...currentData.data]
          : [];

        // 2. VERIFY: Does the region already exist?
        // Case-insensitive check to avoid duplicates like "Paris" vs "paris"
        const regionExists = existingRegions.some(
          (r) => r.trim().toLowerCase() === regionName.trim().toLowerCase()
        );

        if (!regionExists) {
          console.log(`➕ Region "${regionName}" missing. Adding to list...`);

          // 3. ADD: Push the new region
          existingRegions.push(regionName.trim());

          // 4. SORT: Alphabetical sort to keep the UI clean
          existingRegions.sort((a, b) => a.localeCompare(b));

          // 5. UPDATE: Update the document
          await updateDoc(docRef, {
            data: existingRegions,
          });
          console.log("✅ Metadata updated successfully.");
        } else {
          console.log(`👌 Region "${regionName}" already exists in metadata.`);
        }
      }
    } catch (error) {
      console.error("❌ Error updating region metadata:", error);
    }
  };

  /**
   * Prepares data for Firestore storage
   *
   * Transforms form data into a format compatible with Firestore:
   * - Removes null/undefined values
   * - Handles special data types
   * - Ensures proper structure for database storage
   *
   * @param {Record<string, unknown>} data - The form data to sanitize
   * @returns {Promise<Record<string, unknown>>} Cleaned data ready for storage
   */
  const sanitizeFirestoreData = async (
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const result: Record<string, unknown> = {};

    // 1. First, process all properties
    for (const [key, value] of Object.entries(data)) {
      if (key === "archived") {
        result[key] = value === undefined ? false : true;
      }
      // Skip undefined values completely
      if (value === undefined) {
        continue;
      }
      // For arrays, filter out empty elements
      else if (Array.isArray(value)) {
        const filteredArray = value.filter(
          (item) => item !== undefined && item !== ""
        );
        // Only add non-empty arrays
        if (filteredArray.length > 0) {
          result[key] = filteredArray;
        }
      }
      // For strings, only add if not empty after trimming
      else if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue !== "") {
          result[key] = trimmedValue;
        }
      }
      // Keep other values as is (numbers, booleans, etc)
      else {
        result[key] = value;
      }
    }

    return result;
  };

  /**
   * Processes and submits the new song form
   *
   * Workflow:
   * 1. Sets loading state
   * 2. Sanitizes input data for database storage
   * 3. Writes the record to Firestore
   * 4. Updates Metadata (Regions) if necessary
   * 5. Navigates to the songs listing on success
   *
   * @param {SongCreate} formValues - The validated form data
   * @returns {Promise<void>}
   */
  const onSubmit = async (formValues: SongCreate): Promise<void> => {
    console.log("Form submitted with values:", formValues);

    isLoading.value = true;

    const auth = getAuth();
    const user = auth.currentUser as User;

    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    // Get fresh authentication token
    const token = await user.getIdToken();
    const values = await sanitizeFirestoreData(
      formValues as unknown as Record<string, unknown>
    );
    // Create progressive slug with all character variations for precise search
    const slug = createSlugWithWords(formValues.titre);

    try {
      const db = getFirestore();
      const songRef = collection(db, "chants");

      // 1. Add the song document
      const docRef = await addDoc(songRef, { ...values, slug });

      // 2. Update region metadata if a region is specified
      if (values.region && typeof values.region === "string") {
        await updateRegionMetadata(values.region);
      }

      // 3. Send notification
      const notificationResponse = await fetch("/api/notifs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: docRef.id, // Use the new document ID
          message: `${values.titre}\n${t("updateSong.updateMessage")}`,
          type: t("data.notifsTypes.song"),
        }),
      });

      const response = await notificationResponse.json();
      showToast("song", response.successCount);

      // Force cache clear to ensure new regions appear in the store
      // NOTE: Ensure 'clearAllCache' is available in your scope or imported
      if (typeof clearAllCache === "function") {
        clearAllCache();
      }

      router.replace("/chants"); // Redirect to the songs page
    } catch (error) {
      console.error("Error creating song:", error);
    } finally {
      isLoading.value = false; // Reset loading state when complete
    }
  };

  /**
   * Cancels the song creation process
   */
  const onCancel = () => {
    router.replace("/chants");
  };

  // Returns a song identified by its id from Firestore
  const getSongDetails = async (songId: string): Promise<Song | null> => {
    isLoading.value = true;
    try {
      await checkAuth();

      console.log("🔍 Fetching song details for ID:", songId);
      const db = getFirestore();
      const songRef = doc(db, "chants", songId);
      const songSnapshot = await getDoc(songRef);

      if (!songSnapshot.exists()) {
        console.error("❌ Song not found with ID:", songId);
        return null;
      }

      const rawData = songSnapshot.data();
      const songUIData: Song = {
        id: songSnapshot.id,
        ...rawData,
      } as Song;

      return songUIData;
    } catch (error) {
      console.error("❌ Error fetching song details:", error);
      return null;
    }
  };

  // Function that updates a song in the Firestore database
  const onUpdate = async (formValues: Record<string, unknown>) => {
    isLoading.value = true;
    try {
      await checkAuth();

      console.log("🔄 Updating song with ID:", songId);

      if (!songId || typeof songId !== "string") {
        console.error("❌ songId is undefined or invalid:", songId);
        return;
      }
      let values = await sanitizeFirestoreData(
        formValues as unknown as Record<string, unknown>
      );
      // Create progressive slug
      const slug = createSlugWithWords(values.titre as string);

      values = { ...values, slug };

      try {
        const db = getFirestore();
        const songRef = doc(db, "chants", songId);

        // Prepare the object to update
        const updatePayload: Record<string, any> = {};
        for (const key in values) {
          updatePayload[key] =
            values[key] === undefined || values[key] === ""
              ? deleteField()
              : values[key];
        }

        // 1. Update the song document
        await updateDoc(songRef, updatePayload);

        // 2. Update region metadata if a region is specified
        if (values.region && typeof values.region === "string") {
          await updateRegionMetadata(values.region);
        }

        console.log("✅ Song updated successfully");

        // Force cache clear to ensure new regions appear in the store
        if (typeof clearAllCache === "function") {
          clearAllCache();
        }

        router.replace("/chants");
      } catch (error) {
        console.error("❌ Error updating song:", error);
      }
    } catch (error) {
      console.error("❌ Error updating song:", error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Initializes all reference data needed by the form
   * Loads data for all dropdown/select controls
   */
  onMounted(() => {
    regions.value = useData.getData("regions") as Region[];
    languages.value = useData.getData("languages") as SelectType[];
    songTypes.value = useData.getData("songTypes") as SelectType[];
    themes.value = useData.getData("themes") as SelectType[];
    countries.value = useData.getData("countries") as SelectType[];
  });

  return {
    getSongDetails,
    languages,
    onCancel,
    isLoading,
    newSongFormSchema,
    onSubmit,
    regions,
    songTypes,
    countries,
    themes,
    onUpdate,
  } as NewSongReturn;
};
