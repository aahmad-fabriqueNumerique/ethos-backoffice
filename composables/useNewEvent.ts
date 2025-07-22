/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Event Management Composable
 *
 * This composable provides comprehensive functionality for managing events in the application.
 * It handles event creation, updates, retrieval, and form management with Firestore integration,
 * authentication, file uploads, and notification services.
 *
 * Key Features:
 * - Event CRUD operations (Create, Read, Update)
 * - Firebase Authentication integration
 * - Firestore database operations with data sanitization
 * - Form validation with Zod schema
 * - File upload handling for event images
 * - Push notification management
 * - Cache invalidation for data consistency
 * - Loading state management
 * - Type-safe data transformation between UI and database models
 *
 * Usage Example:
 * ```typescript
 * const {
 *   isLoading,
 *   onSubmit,
 *   onUpdate,
 *   getEventDetails,
 *   eventTypes,
 *   countries
 * } = useNewEvent();
 *
 * // Create new event
 * await onSubmit(eventData);
 *
 * // Update existing event
 * await onUpdate(eventData);
 *
 * // Get event details
 * const event = await getEventDetails('event-id');
 * ```
 *
 * @composable useNewEvent
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import { eventFormSchema } from "@/libs/formValidationSchemas";
import type EventModel from "@/models/EventModel";
import type SelectType from "@/models/SelectType";
import { useDataStore } from "@/stores/data";
import { toTypedSchema } from "@vee-validate/zod";
import { onMounted, ref, type Ref } from "vue";
import { useRouter } from "vue-router";
import { getAuth, type User } from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  type Timestamp,
  updateDoc,
} from "firebase/firestore";
import type { EventUIModel } from "@/models/EventModel";

/**
 * Return type definition for the useNewEvent composable
 *
 * Defines the public API interface that components can use to interact
 * with event management functionality.
 *
 * @interface NewEventReturn
 */
type NewEventReturn = {
  /** Reactive loading state indicator */
  isLoading: Ref<boolean>;
  /** Zod validation schema for event forms */
  newEventFormSchema: ReturnType<typeof toTypedSchema>;
  /** Function to create a new event */
  onSubmit: (formValues: Omit<EventModel, "id">, image?: File | null) => void;
  /** Reactive array of available event types */
  eventTypes: Ref<SelectType[]>;
  /** Reactive array of available countries */
  countries: Ref<SelectType[]>;
  /** Function to handle file selection for uploads */
  handleFileSelect: (event: any) => void;
  /** Reactive URL of uploaded image */
  uploadedImageUrl: Ref<string>;
  /** Reactive source URL for image preview */
  src: Ref<string | null>;
  /** Function to update an existing event */
  onUpdate: (formValues: EventModel) => void;
  /** Function to retrieve event details by ID */
  getEventDetails: (eventId: string) => Promise<EventUIModel | null>;
};

/**
 * Event Management Composable
 *
 * Main composable function that encapsulates all event-related operations
 * and provides a clean interface for components to interact with.
 *
 * @returns {NewEventReturn} Object containing reactive state and functions
 */
export const useNewEvent = (): NewEventReturn => {
  // Initialize required composables and services
  const { showToast } = useNotifsToasts(); // Toast notifications for user feedback
  const router = useRouter(); // Vue Router for navigation
  const useData = useDataStore(); // Data store for static data (types, countries)

  const { uploadImage } = useUploadImage(); // Image upload composable

  /**
   * Reactive loading state indicator
   *
   * Tracks whether any async operation is in progress.
   * Used for UI feedback like loading spinners and button states.
   *
   * @type {Ref<boolean>}
   */
  const isLoading = ref(false);

  /**
   * Typed validation schema for event forms
   *
   * Generated from Zod schema for type-safe form validation.
   * Provides runtime validation and TypeScript type inference.
   *
   * @type {ReturnType<typeof toTypedSchema>}
   */
  const newEventFormSchema = toTypedSchema(eventFormSchema);

  /**
   * Reactive arrays for form select options
   *
   * Populated on component mount from the data store.
   * Used to populate dropdown menus in event forms.
   */
  const eventTypes = ref<SelectType[]>([]);
  const countries = ref<SelectType[]>([]);

  /**
   * File upload related reactive references
   *
   * Manages the state of uploaded images and preview URLs.
   */
  const uploadedImageUrl = ref("");
  const src = ref<string | null>(null);

  /**
   * File Selection Handler
   *
   * Processes file selection events from file input components.
   * Reads the selected file and generates a preview URL for immediate display.
   *
   * Process Flow:
   * 1. Extract file from event object
   * 2. Create FileReader instance
   * 3. Set up onload callback to capture data URL
   * 4. Read file as data URL for preview
   *
   * @function handleFileSelect
   * @param {any} event - File selection event from input component
   * @returns {void}
   *
   * @example
   * ```vue
   * <FileUpload @select="handleFileSelect" />
   * ```
   */
  const handleFileSelect = (event: any) => {
    // Extract the first selected file
    const file = event.files[0];

    // Create FileReader for reading file content
    const reader = new FileReader();

    // Set up callback for when file is read
    reader.onload = async (e) => {
      // Store the data URL for preview display
      src.value = e.target!.result as string;
    };

    // Start reading the file as data URL
    reader.readAsDataURL(file);
  };

  /**
   * Data Sanitization for Firestore
   *
   * Cleans and validates data before storing in Firestore database.
   * Removes undefined values, empty strings, and empty arrays to prevent
   * storage of unnecessary data and maintain data quality.
   *
   * Process Flow:
   * 1. Iterate through all object properties
   * 2. Skip undefined values completely
   * 3. Filter arrays to remove empty elements
   * 4. Trim strings and skip if empty
   * 5. Keep other values (numbers, booleans) as-is
   *
   * @async
   * @function sanitizeFirestoreData
   * @param {Record<string, unknown>} data - Raw form data to sanitize
   * @returns {Promise<Record<string, unknown>>} Cleaned data ready for Firestore
   *
   * @example
   * ```typescript
   * const cleanData = await sanitizeFirestoreData({
   *   title: "Event Title",
   *   description: "",  // Will be removed
   *   participants: ["John", "", "Jane"],  // Empty string will be filtered
   *   tags: []  // Will be removed
   * });
   * // Result: { title: "Event Title", participants: ["John", "Jane"] }
   * ```
   */
  const sanitizeFirestoreData = async (
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> => {
    const result: Record<string, unknown> = {};

    // Process each property in the data object
    for (const [key, value] of Object.entries(data)) {
      // Skip undefined values completely - don't store them
      if (value === undefined) {
        continue;
      }
      // Handle arrays: filter out empty/undefined elements
      else if (Array.isArray(value)) {
        const filteredArray = value.filter(
          (item) => item !== undefined && item !== ""
        );
        // Only add arrays that have content after filtering
        if (filteredArray.length > 0) {
          result[key] = filteredArray;
        }
      }
      // Handle strings: trim whitespace and skip if empty
      else if (typeof value === "string") {
        const trimmedValue = value.trim();
        if (trimmedValue !== "") {
          result[key] = trimmedValue;
        }
      }
      // Keep other primitive values as-is (numbers, booleans, dates, etc.)
      else {
        result[key] = value;
      }
    }

    return result;
  };

  /**
   * Event Creation Handler
   *
   * Creates a new event in the Firestore database and sends push notifications
   * to relevant users. Handles authentication, data sanitization, and error states.
   *
   * Process Flow:
   * 1. Set loading state for UI feedback
   * 2. Sanitize form data for Firestore storage
   * 3. Verify user authentication
   * 4. Store event in Firestore database
   * 5. Send push notifications via API
   * 6. Show success feedback and navigate
   * 7. Handle errors and reset loading state
   *
   * @async
   * @function onSubmit
   * @param {Omit<EventModel, "id">} formValues - Event data without ID
   * @returns {Promise<void>} Resolves when creation is complete
   *
   * @example
   * ```typescript
   * const eventData = {
   *   titre: "Tech Conference",
   *   description: "Annual technology conference",
   *   dateDebut: new Date(),
   *   dateFin: new Date(),
   *   // ... other event properties
   * };
   * await onSubmit(eventData);
   * ```
   */
  const onSubmit = async (
    formValues: Omit<EventModel, "id">,
    image?: File | null
  ) => {
    // Set loading state for UI feedback
    isLoading.value = true;

    const eventId = crypto.randomUUID();

    console.log("Form submitted with values:", formValues);

    // Sanitize form data before storing
    const values = await sanitizeFirestoreData(
      formValues as unknown as Record<string, unknown>
    );

    try {
      // Step 1: Verify user authentication
      const token = await checkAuth();
      if (!token) {
        console.error("❌ User is not authenticated - creation aborted");
        return;
      }

      console.log("🎯 Creating new event with sanitized data:", values);

      let downloadUrl = "";

      if (image) {
        downloadUrl = await uploadImage(image, eventId);
        console.log("📸 Image uploaded successfully for event:", eventId);
      }

      // Step 2: Store event in Firestore database
      const db = getFirestore();
      const eventData = { ...values, id: eventId, image: downloadUrl };
      await setDoc(doc(db, "events", eventId), eventData);

      // Step 3: Send push notifications to relevant users
      try {
        const notificationResponse = await fetch("/api/notifs/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: eventId, // Use the generated document ID
            titre: values.titre,
            description: values.description,
          }),
        });

        const response = await notificationResponse.json();
        console.log("📨 Notifications sent:", response);

        // Show success toast with notification count
        showToast("event", response.successCount);
      } catch (notifError) {
        console.warn("⚠️ Event created but notifications failed:", notifError);
        // Still show success for event creation
        showToast("event", 0);
      }

      // Step 4: Clean up cache and navigate to events list
      clearAllCache();
      router.replace("/events");
    } catch (error) {
      console.error("❌ Error creating event:", error);
      // TODO: Add user-friendly error notification
      // showToast("error", 0);
    } finally {
      // Always reset loading state
      isLoading.value = false;
    }
  };

  /**
   * Event Update Handler
   *
   * Updates an existing event in the Firestore database. Similar to creation
   * but uses updateDoc instead of addDoc and requires an event ID.
   *
   * Process Flow:
   * 1. Set loading state for UI feedback
   * 2. Sanitize form data for Firestore storage
   * 3. Verify user authentication
   * 4. Update event document in Firestore
   * 5. Send updated event notifications
   * 6. Show success feedback and navigate
   * 7. Handle errors and reset loading state
   *
   * @async
   * @function onUpdate
   * @param {EventModel} formValues - Complete event data including ID
   * @returns {Promise<void>} Resolves when update is complete
   *
   * @example
   * ```typescript
   * const eventData = {
   *   id: "existing-event-id",
   *   titre: "Updated Tech Conference",
   *   description: "Updated description",
   *   // ... other event properties
   * };
   * await onUpdate(eventData);
   * ```
   */
  const onUpdate = async (formValues: Omit<EventModel, "id"> | EventModel) => {
    // Set loading state for UI feedback
    isLoading.value = true;
    console.log("hgello toto");

    // Sanitize form data before storing
    const values = await sanitizeFirestoreData(
      formValues as unknown as Record<string, unknown>
    );

    try {
      // Step 1: Verify user authentication
      const token = await checkAuth();
      if (!token) {
        console.error("❌ User is not authenticated - update aborted");
        return;
      }

      // Step 2: Validate that event ID exists
      if (!values.id) {
        console.error("❌ Event ID is required for update operation");
        return;
      }

      console.log("🔄 Updating event with ID:", values.id);
      console.log("📝 Update data:", values);

      // Step 3: Update event document in Firestore
      const db = getFirestore();
      const eventRef = doc(db, "events", values.id as string);

      // Remove ID from update data (Firestore doesn't allow updating document ID)
      const { id, ...updateData } = values;
      await updateDoc(eventRef, updateData as { [x: string]: any });

      console.log("✅ Event updated successfully");

      // Step 4: Send updated event notifications
      try {
        const notificationResponse = await fetch("/api/notifs/event", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            id: values.id,
            titre: values.titre,
            description: values.description,
          }),
        });

        const response = await notificationResponse.json();
        console.log("📨 Update notifications sent:", response);

        // Show success toast with notification count
        showToast("event", response.successCount);
      } catch (notifError) {
        console.warn("⚠️ Event updated but notifications failed:", notifError);
        // Still show success for event update
        showToast("event", 0);
      }

      // Step 5: Clean up cache and navigate to events list
      clearAllCache();
      router.replace("/events");
    } catch (error) {
      console.error("❌ Error updating event:", error);
      // TODO: Add user-friendly error notification
      // showToast("error", 0);
    } finally {
      // Always reset loading state
      isLoading.value = false;
    }
  };

  /**
   * Component Lifecycle: Mount Hook
   *
   * Loads static data (event types and countries) from the data store
   * when the composable is first used. This data is used to populate
   * form select options.
   *
   * @lifecycle onMounted
   */
  onMounted(async () => {
    // Load event types for form dropdown
    eventTypes.value = useData.getData("eventTypes") as SelectType[];
    console.log("🏷️ Event types loaded:", eventTypes.value);

    // Load countries for form dropdown
    countries.value = useData.getData("countries") as SelectType[];
    console.log("🌍 Countries loaded:", countries.value);
  });

  /**
   * Authentication Check Helper
   *
   * Verifies that a user is currently authenticated and retrieves a fresh
   * authentication token for API requests. This ensures security and prevents
   * unauthorized operations.
   *
   * @async
   * @function checkAuth
   * @returns {Promise<string | null>} Fresh auth token or null if not authenticated
   *
   * @example
   * ```typescript
   * const token = await checkAuth();
   * if (token) {
   *   // Proceed with authenticated operation
   * } else {
   *   // Handle unauthenticated user
   * }
   * ```
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

    console.log("🔐 User authenticated, getting fresh token");

    // Get fresh authentication token for API requests
    return await user.getIdToken();
  };

  /**
   * Event Details Retrieval
   *
   * Fetches detailed information about a specific event from Firestore.
   * Converts the raw Firestore data into a UI-friendly format with proper
   * date formatting and type safety.
   *
   * Process Flow:
   * 1. Verify user authentication
   * 2. Create Firestore document reference
   * 3. Fetch document data
   * 4. Transform Firestore data to UI model
   * 5. Convert Timestamp objects to Date objects
   * 6. Return typed event data
   *
   * @async
   * @function getEventDetails
   * @param {string} eventId - Unique identifier of the event to retrieve
   * @returns {Promise<EventUIModel | null>} Event data or null if not found
   *
   * @example
   * ```typescript
   * const event = await getEventDetails("event-123");
   * if (event) {
   *   console.log("Event title:", event.titre);
   *   console.log("Start date:", event.dateDebut);
   * }
   * ```
   */
  const getEventDetails = async (
    eventId: string
  ): Promise<EventUIModel | null> => {
    try {
      // Step 1: Verify user authentication
      await checkAuth();

      console.log("🔍 Fetching event details for ID:", eventId);

      // Step 2: Create Firestore references and fetch data
      const db = getFirestore();
      const eventRef = doc(db, "events", eventId);
      const eventSnapshot = await getDoc(eventRef);

      // Step 3: Check if event exists
      if (!eventSnapshot.exists()) {
        console.error("❌ Event not found with ID:", eventId);
        return null;
      }

      const rawData = eventSnapshot.data();
      console.log("📄 Raw event data fetched:", rawData);

      // Step 4: Transform Firestore data to UI model format
      const eventUIData: EventUIModel = {
        id: eventSnapshot.id,
        ...rawData,
        // Convert Firestore Timestamps to Date objects for UI components
        dateDebut: getFormattedDate(rawData?.dateDebut),
        dateFin: getFormattedDate(rawData?.dateFin),
      } as EventUIModel;

      console.log("✅ Event details transformed for UI:", eventUIData);
      return eventUIData;
    } catch (error) {
      console.error("❌ Error fetching event details:", error);
      return null;
    }
  };

  /**
   * Date Formatting Helper
   *
   * Safely converts Firestore Timestamp objects to JavaScript Date objects.
   * Provides error handling for invalid or missing timestamps.
   *
   * @function getFormattedDate
   * @param {Timestamp | undefined} timestamp - Firestore timestamp to convert
   * @returns {Date | null} JavaScript Date object or null if invalid
   *
   * @example
   * ```typescript
   * const firestoreTimestamp = new Timestamp(seconds, nanoseconds);
   * const jsDate = getFormattedDate(firestoreTimestamp);
   * ```
   */
  const getFormattedDate = (timestamp: Timestamp | undefined): Date | null => {
    try {
      if (!timestamp) {
        return null;
      }

      // Convert Firestore Timestamp to JavaScript Date
      if (timestamp && typeof timestamp.toDate === "function") {
        return timestamp.toDate();
      }

      console.warn("⚠️ Invalid timestamp format:", timestamp);
      return null;
    } catch (error) {
      console.error("❌ Error converting timestamp:", error);
      return null;
    }
  };

  /**
   * Public API Interface
   *
   * Returns the public interface of the composable that components
   * can use to interact with event management functionality.
   *
   * @returns {NewEventReturn} Object containing reactive state and functions
   */
  return {
    /** Reactive loading state indicator */
    isLoading,

    /** Typed validation schema for forms */
    newEventFormSchema,

    /** Event creation function */
    onSubmit,

    /** Available event types for forms */
    eventTypes,

    /** Available countries for forms */
    countries,

    /** File selection handler */
    handleFileSelect,

    /** Uploaded image URL */
    uploadedImageUrl,

    /** Image preview source */
    src,

    /** Event update function */
    onUpdate,

    /** Event details retrieval function */
    getEventDetails,
  };
};
