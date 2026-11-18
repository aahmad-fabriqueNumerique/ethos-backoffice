/**
 * Information Notification API Endpoint
 *
 * This API endpoint sends custom push notifications to all registered devices.
 * It allows administrators to broadcast information messages to all users
 * with customizable title and content.
 *
 * Route: POST /api/notifs/info
 * Authentication: Bearer token required (admin role only)
 *
 * Request body should contain:
 * - title: Notification title/headline
 * - message: Notification body content
 *
 * @returns Object containing success status and notification delivery statistics
 */
import { broadcastToAllDevices } from "~/server/utils/pushBroadcast";
import { translateNotificationType } from "~/server/utils/translateNotifications";

export default defineEventHandler(async (event) => {
  try {
    // Authentication verification
    // Ensures only authorized users can trigger notifications
    const authHeader = getHeader(event, "authorization");
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      throw createError({
        statusCode: 401,
        statusMessage: "Invalid authorization header format",
      });
    }

    // Extract and verify the JWT token
    const token = authHeader.substring(7).trim();
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);

    // Check user role permissions
    // Only administrators can send custom information notifications
    const userRole = decoded.role || decoded.customClaims?.role;

    if (userRole !== "admin") {
      throw createError({
        statusCode: 403,
        statusMessage: "Access forbidden",
      });
    }

    // Extract notification content from request body
    const { title, message } = await readBody(event);

    // Get translated notification type based on user's language preference
    // Falls back to French if no language is specified
    const type = await translateNotificationType(
      decoded.lang || "fr", // Use user's language or default to French
      "news"
    );

    // Prepare notification message with title and truncated content
    // Combines title and message for better readability in notification body
    const updatedMessage = `${title}\n${message.substring(0, 100)}...`;

    const result = await broadcastToAllDevices({
      title: type,
      body: updatedMessage || "Une nouvelle information a été publiée",
      data: { eventId: title, type },
    });
    console.log("Broadcast result:", result);

    return {
      success: result.successCount > 0 || result.topicSent,
      ...result,
    };
  } catch (error) {
    // Handle any errors that occur during the notification process
    console.error("Error in /api/notifs/info:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
