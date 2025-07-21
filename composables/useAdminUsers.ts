/**
 * Admin Users Management Composable
 *
 * This composable provides functionality to fetch and manage users from an admin API.
 * It handles authentication, pagination, and provides reactive user data.
 *
 * Features:
 * - Firebase authentication integration
 * - User list pagination
 * - Error handling
 * - Loading states
 * - Data refresh capabilities
 */
import { getApps } from "firebase/app";
import {
  onAuthStateChanged,
  getAuth,
  type Auth,
  type User,
} from "firebase/auth";

/**
 * User data structure returned from the API
 * @property uid - Unique identifier for the user
 * @property email - User's email address
 * @property role - User's role in the system (either 'user' or 'admin')
 */
export type UserList = {
  uid: string;
  email: string;
  role: "user" | "admin";
};

/**
 * API response structure for user listing
 * @property users - Array of user data
 * @property nextPageToken - Token for pagination, null when no more pages
 */
type UsersResponse = {
  users: UserList[];
  nextPageToken: string | null;
};

/**
 * Composable for admin users management
 *
 * @returns Object with reactive properties and methods to interact with user data
 */
export const useAdminUsers = () => {
  // Reactive state variables
  const users = ref<UserList[]>([]); // List of users from API
  const nextPageToken = ref<string | null>(null); // Pagination token
  const error = ref<Error | null>(null); // Error state
  const loading = ref(false); // Loading state
  const ready = ref(false); // Authentication ready state
  const user = ref<User | null>(null); // Current authenticated user

  // Firebase Auth instance
  let auth: Auth;

  /**
   * Fetches users from the API
   *
   * @param reset - Whether to reset the current user list or append to it
   * @returns Promise<void>
   */
  const fetchUsers = async (reset = false) => {
    console.log("Fetching users, reset:", reset);

    // Verify authentication before proceeding
    if (!user.value) {
      error.value = new Error("User not authenticated");
      loading.value = false;
      return;
    }

    loading.value = true;

    try {
      // Get fresh authentication token
      const token = await user.value.getIdToken();

      // Fetch users with authorization header and pagination params if needed
      const data = await $fetch<UsersResponse>("/api/users/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          ...(reset || !nextPageToken.value
            ? {}
            : { pageToken: nextPageToken.value }),
        },
      });
      console.log("Resetting user list", data);

      // Reset or append users based on the reset parameter
      if (reset) {
        users.value = data.users || [];
      } else {
        users.value.push(...(data.users || []));
      }

      // Update pagination token
      nextPageToken.value = data.nextPageToken;
    } catch (err: unknown) {
      error.value = err as Error;
    } finally {
      loading.value = false;
    }
  };

  // Set up Firebase auth state listener when on client side
  watchEffect(() => {
    if (import.meta.client && getApps().length > 0) {
      auth = getAuth();
      onAuthStateChanged(auth, (u) => {
        user.value = u;
        ready.value = true;
      });
    }
  });

  // Fetch users when authentication is ready
  watchEffect(() => {
    if (ready.value) fetchUsers(true); // reset on init
  });

  // Return reactive properties and methods
  return {
    users: computed(() => users.value), // Current user list
    error: computed(() => error.value), // Current error state
    loading: computed(() => loading.value), // Current loading state
    hasMore: computed(() => !!nextPageToken.value), // Whether more users can be loaded
    loadMore: () => fetchUsers(false), // Method to load more users
    refresh: () => fetchUsers(true), // Method to refresh the user list
  };
};
