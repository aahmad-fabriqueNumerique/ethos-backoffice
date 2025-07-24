/**
 * Add New Entry Composable
 *
 * This composable provides functionality for adding new entries to the data store
 * through a modal dialog interface. It handles form validation, data submission,
 * and dialog state management for dynamic data entry operations.
 *
 * Key Features:
 * - Form validation with Zod schema
 * - Integration with data store for persistence
 * - Dialog visibility state management
 * - Internationalization support for error messages
 * - Generic type support for different data types (countries, regions, etc.)
 *
 * Usage Example:
 * ```typescript
 * const { data, addData, schema } = useAddNewEntry(emit, 'countries');
 *
 * // Add new country
 * addData('France');
 * ```
 *
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-24
 */
import { regexGeneric } from "~/libs/regex";
import { z } from "zod";

/**
 * Event emitter type definition for dialog visibility control
 *
 * @interface Emits
 */
type Emits = {
  /** Emits dialog visibility state change */
  (e: "set-visible", value: "countries" | "regions" | null): void;
};

/**
 * Add New Entry Composable
 *
 * Provides form handling, validation, and data management for adding new entries
 * to the application's data store. Supports different data types through generic
 * type parameter and includes comprehensive form validation.
 *
 * @param {Emits} emit - Event emitter function for dialog state management
 * @param {DataKey} type - Type of data being added (countries, regions, etc.)
 * @returns {Object} Composable return object with reactive state and methods
 *
 * @example
 * ```typescript
 * // In a Vue component
 * const emit = defineEmits<Emits>();
 * const { data, addData, schema } = useAddNewEntry(emit, 'regions');
 *
 * // Handle form submission
 * const handleSubmit = () => {
 *   if (data.value.trim()) {
 *     addData(data.value);
 *   }
 * };
 * ```
 */
export const useAddnewEntry = (emit: Emits, type: DataKey) => {
  // Initialize internationalization helper for translated messages
  const { t } = useI18n();

  // Get reference to the data store for persistence operations
  const store = useDataStore();

  /**
   * Reactive reference for form input data
   *
   * Holds the current value being entered by the user in the form field.
   * This value is validated against the schema before submission.
   *
   * @type {Ref<string>}
   */
  const data = ref("");

  /**
   * Zod validation schema for form data
   *
   * Defines validation rules for the input data including:
   * - Required field validation with translated error message
   * - Generic regex pattern validation for data format
   * - Custom error messages using i18n translations
   *
   * @type {TypedSchema}
   */
  const schema = toTypedSchema(
    z.object({
      data: z
        .string({ required_error: t("newData.dialog.errors.required") })
        .regex(regexGeneric, { message: t("newData.dialog.errors.invalid") }),
    })
  );

  /**
   * Adds new data entry to the store and closes dialog
   *
   * This function processes the form submission by:
   * 1. Trimming whitespace from the input value
   * 2. Adding the new entry to the data store with proper structure
   * 3. Closing the dialog by emitting visibility change event
   *
   * The data is stored with a standardized structure where 'nom' represents
   * the display name of the entry.
   *
   * @param {string} value - The input value to be added to the store
   *
   * @example
   * ```typescript
   * // Add a new country
   * addData('Spain');
   *
   * // Add a new region
   * addData('Andalusia');
   * ```
   */
  const addData = (value: string) => {
    // Add data to store with standardized structure
    store.addData(type, { nom: value.trim() });

    // Close dialog by setting visibility to null
    emit("set-visible", null);
  };

  /**
   * Public API returned by the composable
   *
   * @returns {Object} The public interface of the composable
   */
  return {
    /**
     * Reactive string for form input data
     * Bind this to your form input field
     */
    data,

    /**
     * Function to add new data entry and close dialog
     * Call this when form is submitted with valid data
     */
    addData,

    /**
     * Event emitter function (pass-through)
     * Use this for additional dialog state management if needed
     */
    emit,

    /**
     * Zod validation schema for the form
     * Use this with VeeValidate or similar form validation library
     */
    schema,
  };
};
