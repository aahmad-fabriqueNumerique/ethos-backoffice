/**
 * Admin Authentication Middleware
 *
 * This middleware protects routes by ensuring the current user has admin privileges.
 * It checks Firebase authentication state and verifies the user's role claim.
 * Unauthorized users are redirected to the home page.
 */
import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from "#app";
import { getIdTokenResult, getAuth, onAuthStateChanged } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";

/**
 * Waits for Firebase Authentication to initialize and determine auth state
 * @param auth - Firebase Auth instance
 * @returns Promise that resolves once auth state is ready
 */
function waitForAuthReady(auth: ReturnType<typeof getAuth>): Promise<void> {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, () => {
      unsub();
      resolve();
    });
  });
}

export default defineNuxtRouteMiddleware(async (to) => {
  console.log("Checking admin access for route:", to.path);

  // Skip middleware on server-side or for home page
  if (import.meta.server || to.path === "/") return;

  // Get Firebase configuration from runtime config
  const config = useRuntimeConfig();

  // Configure Firebase with environment variables
  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey as string,
    authDomain: config.public.firebaseAuthDomain,
    databaseURL: config.public.firebaseDatabaseUrl,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  };

  // Get or initialize Firebase app
  const app =
    getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  const auth = getAuth(app);

  // Wait for Firebase Auth to complete initialization
  await waitForAuthReady(auth);

  // Get current authenticated user
  const user = auth.currentUser;

  // Redirect to home if not authenticated
  if (!user) {
    return navigateTo("/");
  }

  try {
    // Verify user has admin role from token claims
    const tokenResult = await getIdTokenResult(user, true);
    const role = tokenResult.claims.role;

    // Redirect non-admin users to home
    if (role !== "admin") {
      return navigateTo("/");
    }
  } catch (err) {
    // Log authentication error and redirect
    console.error("[adminOnly] error verifying role:", err);
    return navigateTo("/");
  }
});
