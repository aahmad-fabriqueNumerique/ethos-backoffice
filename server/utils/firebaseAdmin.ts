/**
 * Firebase Admin SDK Configuration Utility
 *
 * This module initializes and provides access to Firebase Admin SDK services.
 * It handles the singleton pattern for Firebase Admin initialization to prevent
 * multiple initialization errors, and provides a simplified interface to access
 * Firebase Authentication admin services.
 *
 * Required environment variables:
 * - FIREBASE_ADMIN_PROJECT_ID: The Firebase project ID
 * - FIREBASE_ADMIN_CLIENT_EMAIL: The service account client email
 * - FIREBASE_PRIVATE_KEY: The service account private key (may contain \n escape sequences)
 *
 * @module firebaseAdmin
 */

// Import Firebase Admin SDK modules
import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth as _getAuth } from "firebase-admin/auth";

/**
 * Service account configuration object created from environment variables
 * The privateKey is processed to convert escaped newlines (\n) to actual newlines
 */
const serviceAccount = {
  projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

/**
 * Firebase Admin App instance
 *
 * Implements the singleton pattern to ensure only one instance is created:
 * - If no apps exist, initializes a new app with service account credentials
 * - If an app already exists, returns the existing app instance
 */
const firebaseAdminApp =
  getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApp();

/**
 * Returns the Firebase Auth Admin instance
 *
 * This function provides a simplified way to access the Firebase Authentication
 * admin services without having to handle the app initialization logic.
 *
 * @returns The Firebase Auth Admin instance associated with our Firebase Admin app
 *
 * @example
 * // Import the getAuth function
 * import { getAuth } from '@/server/utils/firebaseAdmin';
 *
 * // Use it to access Auth Admin functionality
 * const auth = getAuth();
 * const userRecord = await auth.getUser(uid);
 */
export const getAuth = () => _getAuth(firebaseAdminApp);
export const firebaseApp = firebaseAdminApp;
