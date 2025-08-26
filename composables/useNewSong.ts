/**
 * New Song Creation Composable
 *
 * A utility composable that encapsulates all the logic for creating new songs in the application.
 * Provides form validation, data sanitization, Firestore integration, and navigation handling.
 *
 * @module composables/useNewSong
 */
import { regexOptionalGeneric } from "@/libs/regex";
import type Region from "@/models/Region";
import type { SongCreate } from "@/models/Song";
import { useDataStore } from "@/stores/data";
import { toTypedSchema } from "@vee-validate/zod";
import { onMounted, ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { z } from "zod";
import type SelectType from "~/models/SelectType";
import { getAuth, type User } from "firebase/auth";

/**
 * Return type for the useNewSong composable
 * Contains all necessary values and functions for the song creation form
 */
type NewSongReturn = {
  isLoading: Ref<boolean>;
  newSongFormSchema: ReturnType<typeof toTypedSchema>;
  onSubmit: (values: SongCreate) => void;
  onCancel: () => void;
  regions: Ref<Region[]>;
  languages: Ref<SelectType[]>;
  songTypes: Ref<SelectType[]>;
  themes: Ref<SelectType[]>;
  countries: Ref<SelectType[]>;
};

/**
 * Provides functionality for creating and managing new songs
 *
 * @returns {Object} Form controls, validation schema, and reference data for song creation
 */
export const useNewSong = () => {
  const router = useRouter();
  const { showToast } = useNotifsToasts();
  const isLoading = ref(false);
  const useData = useDataStore(); // Data store for region information
  const regions = ref<Region[]>([]);
  const languages = ref<SelectType[]>([]);
  const songTypes = ref<SelectType[]>([]); // Types of songs, if needed in the future
  const themes = ref<SelectType[]>([]); // Themes for songs, if needed in the future
  const countries = ref<SelectType[]>([]); // Countries for songs, if needed in the future
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
        .default([]), // Tableau vide par défaut si aucun type n'est sélectionné
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
        .string({ required_error: "no_language" })
        .regex(regexOptionalGeneric, { message: "invalid_language" }),
      album: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_album" })
        .optional(),
      theme: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_theme" })
        .optional(),
      context_historique: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_context" })
        .optional(),
      description: z
        .string()
        .regex(regexOptionalGeneric, { message: "invalid_description" })
        .optional(),
      urls: z.string().url({ message: "invalid_url" }).optional(),
      urls_musique: z.string().url({ message: "invalid_music_url" }).optional(),
      arcived: z.boolean().optional(),
    })
  );

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
   * 1. Marks form as processing (loading state)
   * 2. Sanitizes input data for database storage
   * 3. Writes the record to Firestore
   * 4. Navigates to the songs listing on success
   * 5. Handles errors and resets loading state
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
      const { getFirestore, collection, addDoc } = await import(
        "firebase/firestore"
      );
      const db = getFirestore();
      const songRef = collection(db, "chants");
      await addDoc(songRef, { ...values, slug });
      const request = await fetch("/api/notifs/song", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: values.id,
          titre: values.titre,
          slug,
          description: values.description,
        }),
      });
      const response = await request.json();
      showToast("song", response.successCount);
      router.replace("/chants"); // Redirect to the songs page after successful creation
    } catch (error) {
      console.error("Error creating song:", error);
      // Handle error appropriately, e.g., show a notification or alert
    } finally {
      isLoading.value = false; // Reset loading state when complete
    }
  };

  /**
   * Aborts the song creation process
   *
   * Discards any form data and returns to the songs listing page.
   * Used as the handler for cancel/back buttons.
   */
  const onCancel = () => {
    // Navigate back to the songs list when canceling
    router.replace("/chants");
  };

  /**
   * Initializes all reference data needed by the form
   *
   * Loads data for all dropdown/select controls:
   * - Geographical regions
   * - Language options
   * - Song type classifications
   * - Thematic categories
   * - Country information
   *
   * This function runs automatically when the component mounts.
   */
  onMounted(() => {
    regions.value = useData.getData("regions") as Region[];
    console.log("Regions loaded:", regions.value);
    languages.value = useData.getData("languages") as SelectType[];
    console.log("Languages loaded:", languages.value);
    songTypes.value = useData.getData("songTypes") as SelectType[];
    console.log("Song types loaded:", songTypes.value);
    themes.value = useData.getData("themes") as SelectType[];
    console.log("Themes loaded:", themes.value);
    countries.value = useData.getData("countries") as SelectType[];
    console.log("Countries loaded:", countries.value);
  });

  /**
   * Returns all necessary functionality for the new song form
   *
   * Provides access to form state, validation schema, handlers, and reference data
   */
  return {
    languages,
    onCancel,
    isLoading,
    newSongFormSchema,
    onSubmit,
    regions,
    songTypes,
    countries,
    themes,
  } as NewSongReturn;
};
