/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * User Deletion Composable
 *
 * This composable provides comprehensive functionality for deleting user accounts
 * from the system. It handles authentication, role-based access control, API
 * communication, and user feedback through toast notifications.
 *
 * Key Features:
 * - Safe user deletion with authentication verification
 * - Admin role protection (prevents admin deletion)
 * - Loading state management for UI feedback
 * - Internationalized error and success messages
 * - Toast notification system integration
 * - Proper error handling and logging
 * - Authentication token management
 *
 * Security Features:
 * - Requires authenticated user to perform deletions
 * - Fresh authentication token for each API request
 * - Role-based protection for admin accounts
 * - Secure API communication with Bearer token
 *
 * Usage Example:
 * ```typescript
 * const { loading, deleteUser, showDeletionToast } = useDeleteUser();
 *
 * // Delete a user
 * await deleteUser({
 *   uid: 'user-123',
 *   role: 'user',
 *   email: 'user@example.com'
 * });
 *
 * // Check loading state
 * if (loading.value) {
 *   console.log('Deletion in progress...');
 * }
 * ```
 *
 * @composable useDeleteUser
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import { getAuth, type User } from "firebase/auth";

/**
 * User object interface for deletion operations
 *
 * Defines the structure of user objects that can be deleted.
 * Should match the UserList type used throughout the application.
 *
 * @interface UserList
 */
interface UserList {
  /** Unique user identifier from Firebase Auth */
  uid: string;
  /** User role (admin, user, etc.) */
  role: string;
  /** User email address */
  email: string;
  /** Additional user properties... */
  [key: string]: any;
}

/**
 * Return type definition for the useDeleteUser composable
 *
 * @interface UseDeleteUserReturn
 */
interface UseDeleteUserReturn {
  /** Reactive loading state indicator */
  loading: Ref<boolean>;
  /** Function to delete a user account */
  deleteUser: (user: UserList) => Promise<void>;
  /** Reactive state for deletion success toast visibility */
  showDeletionToast: Ref<boolean>;
}

/**
 * User Deletion Composable
 *
 * Provides a comprehensive interface for safely deleting user accounts
 * with proper authentication, validation, and user feedback.
 *
 * @returns {UseDeleteUserReturn} Object containing deletion functions and reactive state
 */
export const useDeleteUser = (): UseDeleteUserReturn => {
  // Initialize required Nuxt composables
  console.log("🚀 DEBUG: Initializing useDeleteUser composable");

  let toast: any;
  let t: any;

  try {
    toast = useToast(); // Toast notification system for user feedback
    console.log("✅ DEBUG: useToast initialized successfully");
  } catch (toastError) {
    console.error("❌ DEBUG: Error initializing useToast:", toastError);
  }

  try {
    const i18n = useI18n(); // Internationalization for translated messages
    t = i18n.t;
    console.log("✅ DEBUG: useI18n initialized successfully");
  } catch (i18nError) {
    console.error("❌ DEBUG: Error initializing useI18n:", i18nError);
  }

  /**
   * Reactive loading state indicator
   *
   * Tracks whether a deletion operation is currently in progress.
   * Used for:
   * - Showing loading spinners in UI components
   * - Disabling action buttons during operations
   * - Preventing multiple simultaneous deletion requests
   *
   * @type {Ref<boolean>}
   */
  const loading = ref<boolean>(false);

  /**
   * Reactive deletion success toast visibility state
   *
   * Controls the visibility of success notifications after
   * successful user deletion operations.
   *
   * @type {Ref<boolean>}
   */
  const showDeletionToast = ref<boolean>(false);

  /**
   * Delete User Function
   *
   * Performs the complete user deletion workflow including validation,
   * authentication, API communication, and user feedback.
   *
   * Process Flow:
   * 1. Set loading state for UI feedback
   * 2. Validate user role (prevent admin deletion)
   * 3. Verify current user authentication
   * 4. Obtain fresh authentication token
   * 5. Make authenticated API request to delete user
   * 6. Handle success/error responses with appropriate notifications
   * 7. Reset loading state and update UI
   *
   * Security Measures:
   * - Admin role protection prevents accidental admin account deletion
   * - Fresh authentication token ensures request validity
   * - Bearer token authentication for secure API communication
   * - Proper error handling prevents information disclosure
   *
   * @async
   * @function deleteUser
   * @param {UserList} value - User object containing deletion target information
   * @returns {Promise<void>} Resolves when deletion operation completes
   *
   * @example
   * ```typescript
   * const userToDelete = {
   *   uid: 'abc123',
   *   role: 'user',
   *   email: 'user@example.com'
   * };
   *
   * try {
   *   await deleteUser(userToDelete);
   *   console.log('User deleted successfully');
   * } catch (error) {
   *   console.error('Deletion failed:', error);
   * }
   * ```
   */
  const deleteUser = async (value: UserList): Promise<void> => {
    // Step 1: Initialize loading state for UI feedback
    loading.value = true;

    // Step 2: Admin Role Protection
    /**
     * Prevent deletion of admin accounts
     *
     * This is a critical security measure to prevent:
     * - Accidental admin account removal
     * - System lockout scenarios
     * - Unauthorized privilege escalation attempts
     */
    if (value.role === "admin") {
      console.log("🔍 DEBUG: value.role =", value.role);
      console.warn("🚫 Admin deletion attempt blocked for user:", value.uid);

      try {
        // Display warning notification to user
        console.log("🎯 DEBUG: About to call toast.add");
        toast.add({
          severity: "warn",
          summary: t("deleteUser.toasts.adminDelete.summary"),
          detail: t("deleteUser.toasts.adminDelete.message"),
          life: 5000, // Display for 5 seconds
        });
        console.log("✅ DEBUG: Toast added successfully");
      } catch (toastError) {
        console.error("❌ DEBUG: Error adding toast:", toastError);
        // Fallback toast without translation
        try {
          toast.add({
            severity: "warn",
            summary: "Action interdite",
            detail:
              "La suppression d'un compte administrateur n'est pas autorisée",
            life: 5000,
          });
          console.log("✅ DEBUG: Fallback toast added");
        } catch (fallbackError) {
          console.error("❌ DEBUG: Even fallback toast failed:", fallbackError);
        }
      }

      console.log("🔄 DEBUG: About to reset loading state");
      // Reset loading state and exit early
      loading.value = false;
      console.log("✅ DEBUG: Loading state reset to:", loading.value);
      return;
    }

    try {
      // Step 3: Verify Current User Authentication
      const auth = getAuth();
      const user = auth.currentUser as User;

      // Guard clause: Ensure user is authenticated
      if (!user) {
        console.error("❌ No authenticated user found - deletion aborted");
        throw new Error("Authentication required for user deletion");
      }

      console.log("🔐 User authenticated, proceeding with deletion");

      // Step 4: Obtain Fresh Authentication Token
      /**
       * Get a fresh ID token for secure API communication
       * Fresh tokens ensure:
       * - Current authentication status
       * - Valid permissions and claims
       * - Protection against token replay attacks
       */
      const token = await user.getIdToken();
      console.log("🎫 Fresh authentication token obtained");

      console.log("🗑️ Initiating deletion for user ID:", value.uid);

      // Step 5: Execute Deletion via API
      /**
       * Make authenticated DELETE request to user deletion endpoint
       *
       * API Endpoint: DELETE /api/users/{uid}
       * Headers: Authorization: Bearer {token}
       *
       * The API endpoint handles:
       * - Server-side authentication verification
       * - Database record removal
       * - Related data cleanup
       * - Audit logging
       */
      await $fetch(`/api/users/${value.uid}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("✅ User deletion completed successfully");

      // Step 6: Show Success Notification
      showDeletionToast.value = true;

      // Note: Additional success handling could be added here:
      // - Cache invalidation
      // - User list refresh
      // - Navigation updates
      // - Analytics tracking
    } catch (error: any) {
      // Step 7: Error Handling and User Feedback
      console.error("❌ Error during user deletion:", error);

      /**
       * Display user-friendly error notification
       *
       * Error handling strategy:
       * - Log technical details for debugging
       * - Show translated, user-friendly messages
       * - Provide actionable guidance when possible
       * - Avoid exposing sensitive system information
       */
      toast.add({
        severity: "warn",
        summary: t("deleteUser.toasts.error.summary"),
        detail:
          t(`deleteUser.errors.${error.statusMessage}`) ||
          t("deleteUser.errors.generic"),
        life: 5000, // Display for 5 seconds
      });

      // Re-throw error for potential upstream handling
      throw error;
    } finally {
      // Step 8: Cleanup Operations
      /**
       * Always reset loading state regardless of operation outcome
       * This ensures UI remains responsive even if errors occur
       */
      loading.value = false;
      console.log("🏁 User deletion operation completed, loading state reset");

      /**
       * Future Enhancement Opportunities:
       *
       * The following operations could be added here:
       * - setUidToDelete(null); // Clear selected user for deletion
       * - refresh(); // Refresh user list to reflect changes
       * - clearCache(); // Invalidate related cache entries
       * - logAuditEvent(); // Record deletion in audit logs
       * - updateUIState(); // Update any dependent UI components
       */
    }
  };

  /**
   * Public API Interface
   *
   * Returns the public interface of the composable that components
   * can use to interact with user deletion functionality.
   *
   * @returns {UseDeleteUserReturn} The composable's public interface
   */
  return {
    /**
     * Reactive boolean indicating if any deletion operation is in progress
     * Use this to show loading indicators, disable buttons, etc.
     */
    loading,

    /**
     * Function to delete a user account with full validation and feedback
     * Handles authentication, role checking, and error management
     */
    deleteUser,

    /**
     * Reactive boolean for managing deletion success notification visibility
     * Set to true when deletion succeeds to trigger success notifications
     */
    showDeletionToast,
  };
};

/**
 * Usage Notes and Best Practices:
 *
 * 1. Component Integration:
 * ```vue
 * <script setup>
 * const { loading, deleteUser, showDeletionToast } = useDeleteUser();
 *
 * const handleDeleteUser = async (user) => {
 *   if (confirm('Are you sure you want to delete this user?')) {
 *     await deleteUser(user);
 *   }
 * };
 * </script>
 *
 * <template>
 *   <Button
 *     @click="handleDeleteUser(user)"
 *     :loading="loading"
 *     :disabled="loading"
 *     severity="danger"
 *   >
 *     Delete User
 *   </Button>
 * </template>
 * ```
 *
 * 2. Error Handling:
 * - Always wrap deleteUser calls in try-catch blocks
 * - Provide user confirmation before deletion
 * - Consider implementing undo functionality for critical operations
 *
 * 3. Performance Considerations:
 * - Use loading state to prevent multiple simultaneous deletions
 * - Consider implementing optimistic updates for better UX
 * - Cache invalidation strategies for data consistency
 *
 * 4. Security Considerations:
 * - Admin role protection is implemented but should also be enforced server-side
 * - Fresh authentication tokens prevent stale session attacks
 * - Consider implementing deletion confirmation via email for critical accounts
 *
 * 5. Accessibility:
 * - Ensure loading states are announced to screen readers
 * - Provide clear confirmation dialogs with keyboard navigation
 * - Use semantic HTML and ARIA attributes for deletion buttons
 */
