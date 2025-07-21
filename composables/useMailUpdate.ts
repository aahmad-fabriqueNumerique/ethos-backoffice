/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Mail Update Composable
 *
 * This composable provides functionality for updating user email addresses and roles.
 * It handles form validation, API communication, and translation of role labels.
 *
 * Features:
 * - Email validation using Zod
 * - Role selection with pre-defined options
 * - API integration for user updates
 * - Internationalization for role labels
 * - Form submission handling
 */
import { z } from "zod"; // Zod for schema validation
import { toTypedSchema } from "@vee-validate/zod"; // Utility to convert Zod schema to VeeValidate schema
import { getAuth, type User } from "firebase/auth";

type Emits = {
  (e: "setVisible", value: string | null): void; // Controls dialog visibility
  (e: "userUpdated"): void; // Notifies parent component of successful update
};

export const useMailUpdate = (emit: Emits) => {
  const { t } = useI18n(); // Use i18n for translations
  const toast = useToast(); // PrimeVue toast service for notifications
  const loading = ref(false); // Tracks if the form is currently submitting

  /**
   * Available user roles in the system
   * These roles determine user permissions and access levels
   */
  const roles = ["admin", "user", "groupe", "organisateur"];

  /**
   * Form validation schema using Zod and VeeValidate
   * Validates:
   * - username: Must be a valid email format (optional)
   * - role: Must be one of the predefined roles (optional)
   */
  const mailUpdateSchema = toTypedSchema(
    z.object({
      // Email validation - requires valid email format when provided
      username: z.string().email({ message: "invalid_email" }).optional(),

      // Role validation - must be one of the defined roles when provided
      role: z
        .enum(["admin", "user", "groupe", "organisateur"], {
          errorMap: () => ({ message: "invalid_role" }),
        })
        .optional(),
    })
  );

  /**
   * Handles form submission for user updates
   *
   * This function:
   * 1. Gets the current user's authentication token
   * 2. Sends the update request to the API
   * 3. Refreshes the page to show updated data
   * 4. Handles any errors during the process
   *
   * @param values - Object containing uid, username (email), and role to update
   * @returns Promise<void>
   * @throws Error if update fails
   */
  const onSubmit = async (values: {
    uid: string;
    username: string;
    role: string;
  }) => {
    loading.value = true; // Set loading state to true
    // Get current authenticated user
    const auth = getAuth();
    const user = auth.currentUser as User;
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    // Get fresh authentication token
    const token = await user.getIdToken();

    try {
      // Send update request to the API
      await $fetch("/api/users/update", {
        method: "PUT",
        body: {
          uid: values.uid,
          username: values.username,
          role: values.role,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      emit("userUpdated"); // Emit success event
    } catch (error: any) {
      console.error("Error updating email:", error);
      toast.add({
        severity: "error",
        summary: t("mailUpdate.toasts.error.summary"),
        detail: t(`mailUpdate.errors.${error.statusMessage}`),
        life: 5000, // Show for 5 seconds
      });
    } finally {
      loading.value = false; // Reset loading state
    }
  };

  /**
   * Provides a list of available roles with translated labels
   *
   * @returns Array of objects with label (translated role name) and value (role identifier)
   */
  const getRoles = () => {
    return roles.map((role) => ({
      label: t(`mailUpdate.roles.${role}`), // Translate role labels
      value: role, // Use role as value
    }));
  };

  // Return public API of the composable
  return {
    mailUpdateSchema, // Validation schema for the update form
    onSubmit, // Form submission handler
    getRoles, // Function to get translated roles for dropdowns
    loading,
  };
};
