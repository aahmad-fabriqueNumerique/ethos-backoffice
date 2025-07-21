/**
 * Admin Users Listing API Endpoint
 *
 * This endpoint provides a paginated list of users from Firebase Authentication.
 * It requires authentication with a valid Firebase ID token and admin privileges.
 *
 * Authentication:
 * - Requires a valid Firebase ID token in the Authorization header
 * - User must have the 'admin' role in their custom claims
 *
 * Query Parameters:
 * - pageToken: Optional token for fetching the next page of results
 *
 * Response:
 * - users: Array of user objects with uid, email, and role
 * - nextPageToken: Token for fetching the next page, null if no more pages
 *
 * @route GET /api/users
 * @security Bearer token
 */
import { getAuth } from "@/server/utils/firebaseAdmin";
import { getQuery } from "h3";

export default defineEventHandler(async (event) => {
  // Extract the Bearer token from the Authorization header
  const token = getHeader(event, "authorization")?.split("Bearer ")[1];
  if (!token)
    throw createError({ statusCode: 401, statusMessage: "Token missing" });

  // Initialize Firebase Admin Auth
  const auth = getAuth();

  // Verify the ID token and decode its payload
  const decoded = await auth.verifyIdToken(token);

  // Check for admin role in the token claims
  // Supports both direct role claim and nested customClaims structure
  const role = decoded.role || decoded.customClaims?.role;
  if (role !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
  }

  // Extract pagination token from query parameters if provided
  const { pageToken } = getQuery(event);

  // Fetch users from Firebase Auth with pagination
  // Batch size of 1000 is the Firebase Auth default maximum
  const result = await auth.listUsers(50, pageToken as string | undefined);

  // Transform the Firebase user objects to a simplified format
  // Only including the necessary fields (uid, email, role)
  const users = result.users.map((user) => ({
    uid: user.uid,
    email: user.email ?? "",
    role: user.customClaims?.role || "user", // Default to "user" if role is not specified
  }));

  // Return the users array and pagination token
  return {
    users,
    nextPageToken: result.pageToken ?? null,
    date: new Date().toLocaleTimeString(), // Convert undefined to null for JSON compatibility
  };
});
