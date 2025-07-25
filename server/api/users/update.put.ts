/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * User Update API Endpoint
 *
 * This API endpoint handles user profile updates including username/email changes
 * and role modifications. It implements comprehensive security measures including
 * authentication verification, admin-only access control, and input validation.
 *
 * Features:
 * - Admin-only access control with Bearer token authentication
 * - User email/username updates via Firebase Admin SDK
 * - Role assignment and modification with validation
 * - Comprehensive error handling with specific error codes
 * - Request/response logging for audit purposes
 *
 * Security Implementation:
 * - Bearer token validation and verification
 * - Admin role requirement for all operations
 * - Input sanitization and validation
 * - Firebase Admin SDK for secure user management
 *
 * @endpoint PUT /api/users/update
 * @access Admin only
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-22
 */

import { getAuth } from "@/server/utils/firebaseAdmin";
import admin from "firebase-admin";
import { ADMIN } from "~/server/libs/roles";
import { userUpdateSchema } from "~/server/utils/validation-schemas/events";

/**
 * Main event handler for user update operations
 *
 * Processes user update requests with comprehensive security validation.
 * Supports updating user email/username and role assignments.
 *
 * Request Body Expected:
 * - uid: string (required) - Target user's Firebase UID
 * - username: string (optional) - New email/username for the user
 * - role: string (optional) - New role to assign to the user
 *
 * @param {H3Event} event - The incoming HTTP request event
 * @returns {Promise<Object>} Success response with updated user data
 * @throws {Error} Various HTTP errors for different failure scenarios
 */
export default defineEventHandler(async (event) => {
  // Step 1: Extract and validate authorization header
  const authHeader = getHeader(event, "authorization");

  // Complete header verification - ensure proper Bearer token format
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Invalid header format:", authHeader);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid authorization header format",
    });
  }

  // Clean token extraction - remove "Bearer " prefix and trim whitespace
  const token = authHeader.substring(7).trim();

  // Step 2: Initialize Firebase Admin SDK authentication
  const auth = getAuth();

  // Step 3: Verify the ID token and decode its payload
  // This validates the token signature and expiration
  const decoded = await auth.verifyIdToken(token);

  // Step 4: Admin role verification
  // Check for admin role in the token claims
  // Supports both direct role claim and nested customClaims structure
  const userRole = decoded.role || decoded.customClaims?.role;
  if (userRole !== ADMIN) {
    throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
  }

  // Step 5: Parse request body and extract update parameters
  const body = await readBody(event);
  const { role, uid, username } = body;

  try {
    // Step 6: Input validation
    // Validate role (if provided), ensure uid and username are present
    userUpdateSchema.parse({ role, uid, username });
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: "bad_request",
      data: error.errors,
    });
  }
  try {
    // Step 7: Execute user updates
    // Re-initialize auth instance for user operations
    const auth = getAuth();

    // Update user email/username if provided
    if (username) {
      await auth.updateUser(uid, {
        email: username,
      });
    }

    // Update user role via custom claims if provided
    if (role) {
      await admin.auth().setCustomUserClaims(uid, { role });
    }

    // Step 8: Return success response
    // Provide confirmation of successful update with updated data
    return {
      statusCode: 200,
      statusMessage: "User updated successfully",
      data: {
        uid,
        username,
        role,
      },
    };
  } catch (err: any) {
    // Step 9: Comprehensive error handling
    // Log the error for debugging and audit purposes
    console.error("Error during user update:", err);

    // Extract error code from various Firebase error structures
    const code = err?.errorInfo?.code || err?.code || "unknown";

    // Handle specific Firebase Authentication errors with appropriate HTTP responses

    // Email already exists in the system
    if (code === "auth/email-already-exists") {
      throw createError({
        statusCode: 409, // Conflict - resource already exists
        statusMessage: "email_already_exists",
      });
    }

    // Invalid email format provided
    if (code === "auth/invalid-email") {
      throw createError({
        statusCode: 400, // Bad Request - invalid input format
        statusMessage: "email_invalid",
      });
    }

    // Target user not found in Firebase Auth
    if (code === "auth/user-not-found") {
      throw createError({
        statusCode: 404, // Not Found - user doesn't exist
        statusMessage: "user_not_found",
      });
    }

    // Handle validation errors from our input checks
    if (err.statusCode === 400) {
      throw createError({
        statusCode: 400,
        statusMessage: "bad_request",
      });
    }

    // Log unexpected errors for debugging
    console.error("Unexpected error during user update:", err);

    // Generic server error for unhandled cases
    throw createError({
      statusCode: 500, // Internal Server Error
      statusMessage: "server_error",
    });
  }
});
