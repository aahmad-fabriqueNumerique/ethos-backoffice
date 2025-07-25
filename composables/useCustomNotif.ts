/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Custom Notification Composable
 *
 * This composable provides functionality for sending custom push notifications
 * to all registered users. It handles form validation, authentication, and
 * communication with the notification API endpoint.
 *
 * Features:
 * - Form validation schema integration with VeeValidate
 * - Authentication with Firebase Auth
 * - Loading state management
 * - Error handling and user feedback
 * - Toast notifications for success/error states
 *
 * Used by: NotificationForm component for admin notification sending
 */
import { customNotifSchema } from "~/libs/formValidationSchemas";
import { toTypedSchema } from "@vee-validate/zod";
import { getAuth, type User } from "firebase/auth";
import type SelectType from "~/models/SelectType";

export const useCustomNotif = () => {
  // Convert Zod schema to VeeValidate compatible schema
  const schema = toTypedSchema(customNotifSchema);

  // Loading state for form submission
  const loading = ref(false);

  // Toast notification functionality
  const { showToast } = useNotifsToasts();
  const dataStore = useDataStore();
  const notifsTypes = ref<SelectType[]>([]);

  /**
   * Handles the submission of custom notifications
   *
   * This function:
   * 1. Validates user authentication
   * 2. Gets a fresh authentication token
   * 3. Sends notification data to the API
   * 4. Shows success/error feedback to the user
   *
   * @param values - Form values containing title and message
   * @param values.title - The notification title/headline
   * @param values.message - The notification body text
   */
  const onSubmit = async (values: { message: string; type: string }) => {
    // Set loading state for UI feedback
    loading.value = true;

    try {
      // Get current authenticated user
      const auth = getAuth();
      const user = auth.currentUser as User;

      // Ensure user is authenticated before proceeding
      if (!user) {
        console.error("No authenticated user found");
        return;
      }

      // Get fresh authentication token for secure API access
      const token = await user.getIdToken();

      // Send notification request to the API endpoint
      const request = await fetch("/api/notifs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: values.message,
          type: values.type,
        }),
      });

      console.log("Notification request sent:", request);

      // Parse the response from the API
      const response = await request.json();

      // Show success toast with the number of notifications sent
      showToast("news", response.successCount);
    } catch (error: any) {
      // Log error for debugging
      console.error("Error sending notification:", error);

      // TODO: Show error toast notification to inform user of failure
      // showToast("error", "Failed to send notification");
    } finally {
      // Always reset loading state, regardless of success or failure
      loading.value = false;
    }
  };

  onMounted(async () => {
    // Load notification types from static data})
    notifsTypes.value = dataStore.getData("notifsTypes") || [];
    console.log("Notification types loaded:", notifsTypes.value);
  });

  // Return the public API of the composable
  return {
    schema, // VeeValidate schema for form validation
    onSubmit, // Function to handle form submission
    loading, // Loading state for UI feedback
    notifsTypes,
  };
};
