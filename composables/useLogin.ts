/**
 * Login Authentication Composable
 *
 * This composable provides authentication functionality for the login form,
 * including form validation schema, loading state management, and login submission.
 * It leverages Zod for validation and integrates with the user store for authentication.
 *
 * @module composables/useLogin
 */

// Validation utilities
import { regexPassword } from "@/libs/regex"; // Password validation regex pattern
import { toTypedSchema } from "@vee-validate/zod"; // Utility to convert Zod schema to VeeValidate schema
import { z } from "zod"; // Validation library

// Vue core functionality
import { ref, type Ref } from "vue";
import { useRouter } from "vue-router";

// Application state management
import { useUserStore } from "@/stores/user"; // Pinia store for user management

// Internationalization
import { useI18n } from "vue-i18n"; // Hook for translations

// Types
import type { Credentials } from "@/models/Credentials"; // User credentials type definition

/**
 * Return type for the useLogin composable
 * Contains all the functionality and state needed by the login form
 *
 * @typedef LoginReturn
 * @property {Ref<boolean>} isLoading - Loading state indicator during authentication
 * @property {object} loginFormSchema - Form validation schema for username and password
 * @property {function} onSubmit - Handler function for form submission
 */
type LoginReturn = {
  isLoading: Ref<boolean>; // Loading state indicator
  loginFormSchema: ReturnType<typeof toTypedSchema>; // Form validation schema
  onSubmit: (values: Credentials) => void; // Form submission handler
};

/**
 * Authentication composable that provides login functionality
 *
 * @returns {LoginReturn} Authentication state and functions
 */
const useLogin = (): LoginReturn => {
  // Initialize stores and utilities
  const userStore = useUserStore(); // User authentication store
  const { t } = useI18n(); // Translation function
  const isLoading = ref(false); // Track loading state during authentication
  const router = useRouter(); // Router for navigation after login

  /**
   * Form validation schema using Zod
   * Validates email format and password complexity
   */
  const loginFormSchema = toTypedSchema(
    z.object({
      // Email validation - requires valid email format
      username: z
        .string({ required_error: t("error.no_email") })
        .email({ message: t("error.not_valid_email") }),

      // Password validation - uses regex pattern for complexity requirements
      password: z
        .string({ required_error: t("error.no_password") })
        .regex(regexPassword, { message: t("error.not_valid_password") }),
    })
  );

  /**
   * Form submission handler
   * Authenticates the user and navigates to the home page on success
   *
   * @param {Credentials} values - The form values containing username and password
   */
  const onSubmit = async (values: Credentials) => {
    isLoading.value = true; // Set loading state to true while authenticating

    try {
      await userStore.authenticate(values); // Attempt authentication through the user store
      router.replace("/chants"); // Redirect to the songs page after successful auth
    } catch (error) {
      // Error handling could be added here
      console.error("Authentication error:", error);
    } finally {
      isLoading.value = false; // Reset loading state when complete
    }
  };

  // Return the authentication functionality
  return {
    isLoading,
    onSubmit,
    loginFormSchema,
  };
};

export default useLogin;
