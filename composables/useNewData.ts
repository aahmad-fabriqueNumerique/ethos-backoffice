/**
 * Generic Data Creation Composable
 *
 * This composable provides a reusable pattern for creating new data items
 * of various types in Firestore. It handles:
 * - Form visibility state management
 * - Loading state management
 * - Schema validation using Zod
 * - Data submission to Firestore
 * - Store cache invalidation
 *
 * @module composables/useNewData
 */
import { useDataStore, type DataKey } from "@/stores/data";
import { toTypedSchema } from "@vee-validate/zod";
import { ref, type Ref } from "vue";
import type { z } from "zod";

/**
 * Base data type that all entities must implement
 * Contains the minimum required fields for Firestore documents
 */
type Data = { id: string };

/**
 * Return type for the useNewData composable
 * Contains all necessary values and functions for data creation forms
 *
 * @template T - The specific data type being created
 */
type NewDataReturn<T> = {
  showForm: Ref<boolean>; // Controls form visibility
  isLoading: Ref<boolean>; // Loading state during form submission
  validationSchema: ReturnType<typeof toTypedSchema>; // Validation schema
  onSubmit: (formValues: Omit<Data & T, "id">) => Promise<void>; // Submit handler
};

/**
 * Generic data creation composable
 * Provides reusable logic for adding new items of any type to Firestore
 *
 * @template T - The specific data type being created
 * @param {z.ZodType<Omit<Data & T, 'id'>>} validationSchema - Zod schema for data validation
 * @param {string} collectionName - Firestore collection name where data will be stored
 * @returns {NewDataReturn<T>} Object containing form state, validation and submission handling
 */
export const useNewData = <T>(
  validationSchema: z.ZodType<Omit<Data & T, "id">>,
  collectionName: string
): NewDataReturn<T> => {
  // Form visibility toggle - controls whether the form is displayed
  const showForm = ref(false);

  // Access the data store for cache management
  const useData = useDataStore();

  // Convert Zod schema to vee-validate compatible schema
  const newDataSchema = toTypedSchema(validationSchema);

  // Loading state for form submission - used to disable UI during operations
  const isLoading = ref(false);

  /**
   * Handles form submission to create a new data item
   *
   * 1. Sets loading state
   * 2. Submits the data to Firestore
   * 3. Resets UI state and invalidates cache after completion
   *
   * @param {Omit<Data & T, 'id'>} formValues - The validated form values
   */
  const onSubmit = async (formValues: Omit<Data & T, "id">) => {
    isLoading.value = true;
    try {
      // Dynamically import Firebase modules to reduce initial bundle size
      const { getFirestore, collection, addDoc } = await import(
        "firebase/firestore"
      );
      const db = getFirestore();
      const dataRef = collection(db, collectionName);

      // Add the new data to Firestore
      await addDoc(dataRef, formValues);
    } catch (error) {
      console.error("Error adding document:", error);
    } finally {
      // Reset states regardless of success or failure
      isLoading.value = false;
      showForm.value = false; // Hide the form after submission
      useData.resetData(collectionName as DataKey); // Refresh the data store cache
    }
  };

  // Return all necessary values and functions
  return {
    showForm,
    isLoading,
    validationSchema: newDataSchema,
    onSubmit,
  };
};
