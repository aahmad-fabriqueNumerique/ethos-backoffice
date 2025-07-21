/**
 * User Authentication Store
 *
 * This Pinia store manages user authentication state and provides methods for
 * authentication, session management, and user sign-out functionality.
 * It integrates with Firebase Authentication for secure user credentials handling.
 *
 * @file user.ts
 * @module stores/user
 */

import { ref, computed } from "vue";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import type { Credentials } from "@/models/Credentials";

/**
 * User store definition using Pinia's composition API
 * Provides authentication state and methods for the entire application
 */
export const useUserStore = defineStore("user", () => {
  /**
   * Authentication state flag
   * Tracks whether a user is currently logged in
   */
  const isLoggedIn = ref(false);
  const user = ref<User | null>(null);
  const isInitialized = ref(false);

  // Router instance for navigation after authentication events
  const router = useRouter();

  /**
   * Gets the Auth instance, initializing it if necessary
   *
   * @returns {Object} The Firebase Auth instance
   */
  function getFirebaseAuth() {
    if (!isInitialized.value) {
      initAuth();
    }
    return useNuxtApp().$firebaseAuth;
  }

  /**
   * Authenticates a user with the provided credentials
   *
   * Uses Firebase Authentication to verify user credentials and updates
   * the authentication state accordingly.
   *
   * @param {Credentials} values - Object containing username (email) and password
   * @returns {Promise<void>} Promise that resolves when authentication completes
   * @throws Will throw an error if authentication fails
   */
  const authenticate = async (values: Credentials): Promise<void> => {
    try {
      // Utiliser getFirebaseAuth() au lieu de auth
      const auth = getFirebaseAuth();
      // Attempt to authenticate with Firebase using email and password
      const toto = await signInWithEmailAndPassword(
        auth,
        values.username,
        values.password
      );
      console.log("User authenticated successfully !!!", toto);
      isLoggedIn.value = true; // Update authentication state
    } catch (error) {
      // Handle authentication failure
      console.error("Authentication failed:", error);
      isLoggedIn.value = false;
      throw error; // Re-throw the error for the calling component to handle
    }
  };

  /**
   * Signs out the current user
   *
   * Terminates the user session with Firebase Authentication and redirects
   * to the login page.
   *
   * @returns {Promise<void>} Promise that resolves when sign-out is complete
   */
  const signout = async (): Promise<void> => {
    // Utiliser getFirebaseAuth() au lieu de auth
    const auth = getFirebaseAuth();
    // Sign out from Firebase Authentication
    await signOut(auth);
    // Update local authentication state
    isLoggedIn.value = false;
    // Redirect to login page
    router.replace("/");
  };

  /**
   * Initializes authentication state listener
   *
   * Sets up an observer on the Auth object to get user data on state change.
   * This is called automatically after the Firebase Auth plugin is loaded.
   */
  function initAuth() {
    const nuxtApp = useNuxtApp();

    if (import.meta.client && nuxtApp.$firebaseAuth) {
      onAuthStateChanged(nuxtApp.$firebaseAuth, (firebaseUser) => {
        user.value = firebaseUser;
        isLoggedIn.value = !!firebaseUser; // Update logged-in state
      });
      isInitialized.value = true;
    }
  }

  // Return store state and methods
  return {
    isLoggedIn, // Raw authentication state ref
    authenticate, // Login method
    isAuthenticated: computed(() => isLoggedIn.value), // Computed authentication state
    signout, // Logout method
    user, // User object containing profile information
    initAuth, // Method to initialize authentication listener
    getFirebaseAuth, // Renommé pour plus de clarté
  };
});
