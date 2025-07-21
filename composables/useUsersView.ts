/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Users View Composable
 *
 * This composable manages the users view functionality including:
 * - User data fetching and pagination
 * - Table column configuration
 * - User selection for updates and deletions
 * - Toast notifications for successful operations
 * - User refresh operations
 * - User deletion handling
 *
 * It serves as a centralized state and logic manager for the users list view.
 */

import { getAuth, type User } from "firebase/auth";

export const useUsersView = () => {
  const { t } = useI18n();

  /**
   * Stores the ID of the user currently being updated
   * null when no user is selected for update
   */
  const uidToUpdate = ref<string | null>(null);

  /**
   * Stores the user object currently selected for deletion
   * Contains the full user object with uid, email, and role
   * null when no user is selected for deletion
   */
  const uidToDelete = ref<UserList | null>(null);

  /**
   * Tracks whether a deletion operation is in progress
   * Used to show loading indicators and prevent multiple deletion requests
   */
  const deleting = ref(false);

  /**
   * Controls visibility of the deletion success toast notification
   * true when the toast should be displayed, false otherwise
   */
  const showDeletionToast = ref(false);

  /**
   * PrimeVue toast service for displaying notifications
   * Used for success, error, and warning messages
   */
  const toast = useToast();

  /**
   * Controls whether the success toast for email updates is currently visible
   * Prevents duplicate toasts from appearing simultaneously
   */
  const showToast = ref(false);

  // Fetch users data and pagination controls from the admin users composable
  const { users, loading, hasMore, loadMore, refresh } = useAdminUsers();

  /**
   * Table column configuration
   * Defines the structure and behavior of the user table columns
   * - field: corresponds to the property name in the user objects
   * - header: translated column title from i18n
   * - sortable: whether the column can be sorted
   */
  const columns = [
    { field: "email", header: t("users.headers.email"), sortable: true },
    { field: "role", header: t("users.headers.role"), sortable: true },
  ];

  /**
   * Sets the selected user ID for update operations
   * This typically opens a dialog or form for editing the user
   *
   * @param value - User ID to update, or null to close the dialog
   */
  const setDialogVisible = (value: string | null) => {
    uidToUpdate.value = value;
  };

  /**
   * Sets the selected user for deletion operations
   * This typically opens a confirmation dialog before deletion
   *
   * @param value - User object to delete, or null to cancel deletion
   */
  const setUidToDelete = (value: UserList | null) => {
    uidToDelete.value = value;
  };

  /**
   * Displays a success toast notification after updating user information
   * Also clears the currently selected user
   *
   * This function ensures the toast is only shown once until dismissed
   */
  const showTemplate = () => {
    // Clear the selected user ID
    uidToUpdate.value = null;

    // Show toast notification if not already visible
    if (!showToast.value) {
      toast.add({
        severity: "success",
        summary: t("mailUpdate.toasts.success.summary"),
        detail: t("mailUpdate.toasts.success.message"),
        group: "bc", // Bottom-center toast group
      });
      showToast.value = true;
    }
  };

  /**
   * Displays a success toast notification after deleting a user
   * Clears the selected user for deletion and updates the toast visibility state
   *
   * This function ensures the deletion toast is only shown once until dismissed
   */
  const addDeletionToast = () => {
    uidToDelete.value = null; // Clear the selected user ID for deletion

    if (!showDeletionToast.value) {
      toast.add({
        severity: "success",
        summary: t("deleteUser.toasts.success.summary"),
        detail: t("deleteUser.toasts.success.message"),
        group: "deleteUser", // Separate toast group for deletion notifications
      });
      showDeletionToast.value = true;
    }
  };

  /**
   * Deletes a user account from the system
   *
   * This function:
   * 1. Prevents deletion of admin users
   * 2. Gets the current user's authentication token
   * 3. Sends a DELETE request to the API
   * 4. Shows appropriate success or error notifications
   * 5. Updates UI state based on the operation result
   *
   * @param value - User object to delete, containing uid, email, and role
   */
  const deleteUser = async (value: UserList) => {
    // Set deleting state to show loading indicators
    deleting.value = true;

    // Prevent deletion of admin users
    if (value.role === "admin") {
      toast.add({
        severity: "warn",
        summary: t("deleteUser.toasts.adminDelete.summary"),
        detail: t("deleteUser.toasts.adminDelete.message"),
        life: 5000, // Show for 5 seconds
      });
      return;
    } else {
      try {
        // Get current authenticated user
        const auth = getAuth();
        const user = auth.currentUser as User;
        if (!user) {
          console.error("No authenticated user found");
          return;
        }

        // Get fresh authentication token
        const token = await user.getIdToken();
        console.log("Deleting user with ID:", value.uid);

        // Send delete request to the API
        await $fetch(`/api/users/${value.uid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        // Show success notification
        addDeletionToast();
      } catch (error: any) {
        console.log("Error deleting user:", error);

        // Show error notification with translated error message
        toast.add({
          severity: "warn",
          summary: t("deleteUser.toasts.adminDelete.summary"),
          detail: t(`deleteUser.errors.${error.statusMessage}`),
          life: 5000, // Show for 5 seconds
        });
      } finally {
        // Reset deletion state regardless of success or failure
        deleting.value = false;
      }
    }
  };

  /**
   * Refreshes the user list and removes all toast notifications
   *
   * This function is typically called after:
   * - The user clicks the refresh button in a toast notification
   * - The user clicks the refresh button in the page header
   * - After completing operations that modify user data
   */
  const refreshUsers = () => {
    refresh(); // Refresh users data from the API
    toast.removeGroup("bc"); // Remove all email update toasts
    toast.removeGroup("deleteUser"); // Remove all deletion toasts
    showDeletionToast.value = false; // Reset deletion toast visibility
    showToast.value = false; // Reset email update toast visibility
  };

  // Return all necessary state and functions
  return {
    users, // Array of user objects
    loading, // Boolean indicating if data is being fetched
    hasMore, // Boolean indicating if more users can be loaded
    loadMore, // Function to load more users (pagination)
    refresh, // Function to refresh all user data
    columns, // Table column configuration
    uidToUpdate, // Currently selected user ID for updating
    showToast, // Whether success toast is visible for email updates
    setDialogVisible, // Function to select a user for updating
    showTemplate, // Function to show success notification for email updates
    refreshUsers, // Function to refresh users and clear toast
    uidToDelete, // Currently selected user for deletion
    setUidToDelete, // Function to set user for deletion
    deleting, // Boolean indicating if deletion is in progress
    deleteUser, // Function to delete a user
    showDeletionToast, // Controls visibility of the deletion success toast
  };
};
