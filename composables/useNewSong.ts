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
  setDoc,
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
  const useData = useDataStore();

  // References for dropdown data
  const regions = ref<Region[]>([]);
  const languages = ref<SelectType[]>([]);
  const songTypes = ref<SelectType[]>([]);
  const themes = ref<SelectType[]>([]);
  const countries = ref<SelectType[]>([]);

  // ... (Schema definitions remain unchanged) ...
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
        .default([]),
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
   */
  const checkAuth = async (): Promise<string | null> => {
    const auth = getAuth();
    const user = auth.currentUser as User;

    if (!user) {
      console.error("❌ No authenticated user found");
      return null;
    }

    return await user.getIdToken();
  };

  /**
   * Updates the Regions Metadata List for a specific Country
   *
   * Checks if the region exists in the 'regions' collection for the given country.
   * If not, adds it to the list.
   * Ensures everything is stored in lowercase.
   *
   * @param {string} regionName - The name of the region
   * @param {string} countryName - The name of the country
   */
  const updateRegionMetadata = async (
    regionName: string,
    countryName: string
  ) => {
    // Basic validation
    if (!regionName?.trim() || !countryName?.trim()) return;

    try {
      // Normalize to lowercase
      const regionLower = regionName.trim().toLowerCase();
      const countryLower = countryName.trim().toLowerCase();

      console.log(
        `🌍 Checking regions for country: ${countryLower}, region: ${regionLower}`
      );
      const db = getFirestore();

      // Reference to the specific country document in 'regions' collection
      const docRef = doc(db, "regions", countryLower);
      const docSnap = await getDoc(docRef);

      let existingRegions: string[] = [];

      // Fetch existing data if document exists
      if (docSnap.exists()) {
        const data = docSnap.data();
        existingRegions = (data.regions as string[]) || [];
      } else {
        console.log(`🆕 Creating new region document for '${countryLower}'`);
      }

      // Check if region already exists (in lowercase)
      if (!existingRegions.includes(regionLower)) {
        console.log(
          `➕ Region "${regionLower}" missing in ${countryLower}. Adding...`
        );

        // Add and sort
        existingRegions.push(regionLower);
        existingRegions.sort(); // Lexical sort works fine for lowercase

        // Set/Update the document
        // Uses setDoc with merge to create if not exists or update if exists
        await setDoc(
          docRef,
          {
            country: countryLower,
            regions: existingRegions,
          },
          { merge: true }
        );
        console.log("✅ Region metadata updated successfully.");
      } else {
        console.log(
          `👌 Region "${regionLower}" already exists in ${countryLower}.`
        );
      }
    } catch (error) {
      console.error("❌ Error updating region metadata:", error);
    }
  };

  /**
   * Prepares data for Firestore storage
   * ... (sanitizeFirestoreData remains unchanged)
   */
  const sanitizeFirestoreData = async (
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (key === "archived") {
        result[key] = value === undefined ? false : true;
      } else if (value === undefined) {
        continue;
      } else if (Array.isArray(value)) {
        const filteredArray = value.filter(
          (item) => item !== undefined && item !== ""
        );
        if (filteredArray.length > 0) {
          result[key] = filteredArray;
        }
      } else if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue !== "") {
          result[key] = trimmedValue;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  };

  /**
   * Processes and submits the new song form
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

    const token = await user.getIdToken();
    const values = await sanitizeFirestoreData(
      formValues as unknown as Record<string, unknown>
    );
    const slug = createSlugWithWords(formValues.titre);

    try {
      const db = getFirestore();
      const songRef = collection(db, "chants");

      // 1. Add the song document
      const docRef = await addDoc(songRef, { ...values, slug });

      // 2. Update region metadata if both region and country are specified
      if (
        values.region &&
        typeof values.region === "string" &&
        values.pays &&
        typeof values.pays === "string"
      ) {
        await updateRegionMetadata(values.region, values.pays);
      }

      // 3. Send notification
      const notificationResponse = await fetch("/api/notifs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: docRef.id,
          message: `${values.titre}\n${t("updateSong.updateMessage")}`,
          type: t("data.notifsTypes.song"),
        }),
      });

      const response = await notificationResponse.json();
      showToast("song", response.successCount);

      if (typeof clearAllCache === "function") {
        clearAllCache();
      }

      router.replace("/chants");
    } catch (error) {
      console.error("Error creating song:", error);
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Cancels the song creation process
   */
  const onCancel = () => {
    router.replace("/chants");
  };

  // ... (getSongDetails remains unchanged) ...
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
      const slug = createSlugWithWords(values.titre as string);

      values = { ...values, slug };

      try {
        const db = getFirestore();
        const songRef = doc(db, "chants", songId);

        const updatePayload: Record<string, any> = {};
        for (const key in values) {
          updatePayload[key] =
            values[key] === undefined || values[key] === ""
              ? deleteField()
              : values[key];
        }

        // 1. Update the song document
        await updateDoc(songRef, updatePayload);

        // 2. Update region metadata if region and country are specified
        if (
          values.region &&
          typeof values.region === "string" &&
          values.pays &&
          typeof values.pays === "string"
        ) {
          await updateRegionMetadata(values.region, values.pays);
        }

        console.log("✅ Song updated successfully");

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
   * Initializes all reference data
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
