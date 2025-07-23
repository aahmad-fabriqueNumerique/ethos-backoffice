/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Events Cleanup Composable
 *
 * This composable provides comprehensive functionality to manage event cleanup operations
 * in the Firestore database. It handles both bulk cleanup of old events and individual
 * event deletion with proper authentication, caching, and user feedback.
 *
 * Key Features:
 * - Bulk cleanup of expired/old events via API endpoint
 * - Individual event deletion with Firestore direct operations
 * - Firebase Authentication integration with token validation
 * - Loading state management for UI feedback
 * - Cache invalidation after operations
 * - Internationalized success/error notifications
 * - Dialog visibility state management
 * - Comprehensive error handling and logging
 *
 * Usage Example:
 * ```typescript
 * const { loading, cleanEvents, deleteOneEvent, visible } = useCleanEvents();
 *
 * // Bulk cleanup old events
 * await cleanEvents();
 *
 * // Delete specific event
 * await deleteOneEvent('event-id-123');
 * ```
 *
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */
import { getAuth, type User } from "firebase/auth";
import { deleteDoc, doc, getFirestore } from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";

/**
 * Events cleanup composable return type definition
 *
 * @interface UseCleanEventsReturn
 */
interface UseCleanEventsReturn {
  /** Reactive loading state indicator */
  loading: Ref<boolean>;
  /** Function to perform bulk cleanup of old events */
  cleanEvents: () => Promise<{ success: boolean; deleted: number } | null>;
  /** Function to delete a single event by ID */
  deleteOneEvent: (eventId: string) => Promise<{ success: boolean }>;
  /** Reactive visibility state for confirmation dialogs */
  visible: Ref<boolean>;
}

/**
 * Events Cleanup Composable
 *
 * Provides methods and state management for cleaning up events from the Firestore database.
 * Supports both bulk operations via API and individual deletions via direct Firestore calls.
 *
 * @returns {UseCleanEventsReturn} Object containing cleanup functions and reactive state
 */
export const useCleanEvents = (): UseCleanEventsReturn => {
  /**
   * Reactive loading state indicator
   *
   * Tracks whether any cleanup operation is currently in progress.
   * Used for:
   * - Showing loading spinners in UI components
   * - Disabling action buttons during operations
   * - Preventing multiple simultaneous requests
   *
   * @type {Ref<boolean>}
   */
  const loading = ref<boolean>(false);

  /**
   * Reactive dialog visibility state
   *
   * Controls the visibility of confirmation dialogs or modals
   * associated with deletion operations.
   *
   * @type {Ref<boolean>}
   */
  const visible = ref<boolean>(false);

  // Initialize required Nuxt composables
  const { t } = useI18n(); // Internationalization for translated messages
  const toast = useToast(); // Toast notifications for user feedback

  /**
   * Performs bulk cleanup of old/expired events
   *
   * This function initiates a server-side cleanup operation that removes
   * events based on predefined criteria (e.g., events older than a certain date).
   * The actual cleanup logic is handled by the '/api/events/clean' endpoint.
   *
   * Process Flow:
   * 1. Validates user authentication
   * 2. Obtains fresh authentication token
   * 3. Makes secure API request to cleanup endpoint
   * 4. Handles response and provides user feedback
   * 5. Manages loading states throughout the process
   *
   * Error Handling:
   * - Displays translated error messages via toast notifications
   * - Logs errors to console for debugging
   * - Throws standardized errors for upstream handling
   *
   * @async
   * @function cleanEvents
   * @returns {Promise<{ success: boolean; deleted: number } | void>} Cleanup result or void on error
   * @throws {Error} When authentication fails or server encounters errors
   *
   * @example
   * ```typescript
   * const { cleanEvents, loading } = useCleanEvents();
   *
   * // Button click handler
   * const handleCleanup = async () => {
   *   try {
   *     const result = await cleanEvents();
   *     if (result?.success) {
   *       console.log(`Cleanup completed successfully: ${result.deleted} events deleted`);
   *     }
   *   } catch (error) {
   *     console.error('Cleanup failed:', error);
   *   }
   * };
   * ```
   */
  const cleanEvents = async (): Promise<{
    success: boolean;
    deleted: number;
  } | null> => {
    // Initialize loading state for UI feedback
    loading.value = true;

    try {
      // Step 1: Verify user authentication
      const auth = getAuth();
      const user = auth.currentUser as User;

      // Guard clause: Ensure user is authenticated
      if (!user) {
        console.error("❌ No authenticated user found - cleanup aborted");
        return null;
      }

      console.log("🔐 User authenticated, proceeding with cleanup");

      // Step 2: Obtain fresh authentication token for secure API access
      const token = await user.getIdToken();
      console.log("🎫 Fresh authentication token obtained");

      // Step 3: Make authenticated API request to cleanup endpoint
      console.log("🧹 Initiating bulk events cleanup via API...");
      const response = await $fetch("/api/events/clean", {
        headers: { Authorization: `Bearer ${token}` },
      });

      clearAllCache();
      console.log("✅ Cleanup response received:", response);

      // Step 4: Display success notification with cleanup results
      toast.add({
        severity: "success",
        summary: t("cleanEvents.toasts.success.summary"),
        detail: t("cleanEvents.toasts.success.message", response.deleted),
        life: 5000, // Display for 5 seconds
      });

      console.log(`🎉 Successfully cleaned up ${response.deleted} events`);

      // Return success result for caller to handle
      return { success: true, deleted: response.deleted };
    } catch (error: any) {
      // Step 5: Handle and log errors appropriately
      console.error("❌ Error during events cleanup:", error);

      // Display user-friendly error notification
      toast.add({
        severity: "error",
        summary: t("cleanEvents.toasts.error.summary"),
        detail: t(`cleanEvents.errors.${error.statusMessage}`),
        life: 5000, // Display for 5 seconds
      });

      // Return null to indicate failure
      return null;
    } finally {
      // Step 6: Always reset loading state, regardless of operation outcome
      loading.value = false;
      console.log("🏁 Cleanup operation completed, loading state reset");
    }
  };

  /**
   * Deletes a single event by its ID
   *
   * This function performs a direct deletion operation on a specific event
   * document in the Firestore database. It bypasses the API layer for
   * immediate deletion and provides faster response times.
   *
   * Process Flow:
   * 1. Sets loading state for UI feedback
   * 2. Creates Firestore document reference
   * 3. Performs deletion operation
   * 4. Invalidates related cache entries
   * 5. Closes any open confirmation dialogs
   * 6. Returns success status
   *
   * Cache Management:
   * - Calls clearAllCache() to ensure data consistency
   * - Prevents stale data from appearing in UI after deletion
   *
   * UI State Management:
   * - Sets visible.value to false to close confirmation dialogs
   * - Manages loading state throughout the operation
   *
   * @async
   * @function deleteOneEvent
   * @param {string} eventId - The unique identifier of the event to delete
   * @returns {Promise<{ success: boolean } | void>} Success status object or void on error
   *
   * @example
   * ```typescript
   * const { deleteOneEvent, loading } = useCleanEvents();
   *
   * // Delete event with confirmation
   * const handleDelete = async (eventId: string) => {
   *   if (confirm('Are you sure you want to delete this event?')) {
   *     const result = await deleteOneEvent(eventId);
   *     if (result?.success) {
   *       console.log('Event deleted successfully');
   *     }
   *   }
   * };
   * ```
   */
  const deleteOneEvent = async (
    eventId: string
  ): Promise<{ success: boolean }> => {
    // Initialize loading state
    loading.value = true;

    try {
      // Step 1: Initialize Firestore database connection
      const db = getFirestore();

      // Step 2: Create document reference for the target event
      const eventRef = doc(db, "events", eventId);

      // Step 3: Delete the image file associated with the event in Firebase Storage
      const { $firebaseStorage } = useNuxtApp();
      const possibleExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

      for (const ext of possibleExtensions) {
        try {
          const filePath = `images/events/${eventId}.${ext}`;
          const fileRef = storageRef($firebaseStorage, filePath);

          // Try to delete the file (Firebase Storage doesn't have an "exists" check on client side)
          await deleteObject(fileRef);
          console.log(`✅ Successfully deleted image: ${filePath}`);
        } catch (error: any) {
          // If the file doesn't exist, Firebase throws an error with code 'storage/object-not-found'
          if (error.code === "storage/object-not-found") {
            console.log(
              `📋 No image found at path: images/events/${eventId}.${ext}`
            );
          } else {
            console.error(`❌ Error deleting image ${eventId}.${ext}:`, {
              message: error.message,
              code: error.code,
              filePath: `images/events/${eventId}.${ext}`,
            });
          }
        }
      }

      console.log(`🗑️ Initiating deletion for event ID: ${eventId}`);

      // Step 4: Perform the deletion operation
      await deleteDoc(eventRef);

      console.log(`✅ Successfully deleted event: ${eventId}`);

      // Step 5: Invalidate cache to ensure data consistency
      // This prevents deleted events from appearing in cached lists
      clearAllCache();
      console.log("🔄 Cache cleared after event deletion");

      // Step 6: Close any open confirmation dialogs
      visible.value = false;

      // Step 6: Return success indicator
      return { success: true };
    } catch (error) {
      // Handle deletion errors
      console.error(`❌ Error deleting event ${eventId}:`, error);

      // Note: Could add toast notification here for user feedback
      // toast.add({
      //   severity: "error",
      //   summary: "Deletion Failed",
      //   detail: "Unable to delete the event. Please try again.",
      //   life: 5000
      // });

      // Return null on error (could also return { success: false, error })
      return { success: false };
    } finally {
      // Step 7: Always reset loading state
      loading.value = false;
      console.log("🏁 Delete operation completed, loading state reset");
    }
  };

  /**
   * Public API returned by the composable
   *
   * This object exposes the reactive state and functions that components
   * can use to interact with the events cleanup functionality.
   *
   * @returns {UseCleanEventsReturn} The public interface of the composable
   */
  return {
    /**
     * Reactive boolean indicating if any cleanup operation is in progress
     * Use this to show loading indicators, disable buttons, etc.
     */
    loading,

    /**
     * Function to perform bulk cleanup of old events via API
     * Handles authentication, error handling, and user notifications
     */
    cleanEvents,

    /**
     * Function to delete a single event by ID via direct Firestore operation
     * Provides immediate deletion with cache invalidation
     */
    deleteOneEvent,

    /**
     * Reactive boolean for managing confirmation dialog visibility
     * Set to true to show dialogs, false to hide them
     */
    visible,
  };
};
