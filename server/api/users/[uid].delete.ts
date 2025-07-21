/**
 * User Deletion API Endpoint
 *
 * This API endpoint allows administrators to delete user accounts from Firebase Authentication.
 * It implements several security measures:
 * - Verifies the authentication token
 * - Validates admin privileges
 * - Prevents deletion of other admin users
 * - Validates the user ID format
 * - Confirms the user exists before attempting deletion
 *
 * Route: DELETE /api/users/:uid
 * Authentication: Required (Bearer token)
 * Authorization: Admin role required
 *
 * @returns Confirmation message upon successful deletion
 * @throws Various errors with appropriate status codes for different failure scenarios
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth } from "@/server/utils/firebaseAdmin";
import admin from "firebase-admin";
import { isValidFirebaseUid } from "~/utils/isValidFirebaseUid";

export default defineEventHandler(async (event) => {
  try {
    // Extract and validate the authorization header
    const authHeader = getHeader(event, "authorization");

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid authorization header format",
      });
    }

    // Extract the token from the authorization header
    const token = authHeader.substring(7).trim();

    // Initialize Firebase Admin Auth
    const auth = getAuth();

    // Verify the ID token and extract user claims
    const decoded = await auth.verifyIdToken(token);
    const userRole = decoded.role || decoded.customClaims?.role;

    // Ensure the requester has admin privileges
    if (userRole !== "admin") {
      throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
    }

    // Extract and validate the target user ID from route parameters
    const uid = getRouterParam(event, "uid");

    if (!uid || !isValidFirebaseUid(uid)) {
      throw createError({
        statusCode: 400,
        statusMessage: "User ID (uid) is required",
      });
    }

    let userRecord;

    try {
      userRecord = await admin.auth().getUser(uid);
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw createError({
          statusCode: 404,
          statusMessage: "not_found",
        });
      }

      console.error("Erreur Firebase getUser:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Erreur serveur lors de getUser",
      });
    }

    // Check if the target user is an admin (admins cannot delete other admins)
    const role = userRecord.customClaims?.role ?? "user";

    if (role === "admin") {
      throw {
        statusCode: 403,
        statusMessage: "admin_user",
      };
    }

    // Perform the user deletion
    await admin.auth().deleteUser(uid);

    // Return success message
    return {
      message: `User with UID ${uid} has been successfully deleted.`,
    };
  } catch (error: any) {
    // Error handling with appropriate status codes
    console.error(error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || "default_error",
    });
  }
});
