/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Event Notification API Endpoint
 *
 * This API endpoint sends push notifications to all registered devices when a new event is created.
 * It handles authentication, retrieves device tokens from Firestore, and sends notifications
 * using Firebase Cloud Messaging (FCM) with proper platform-specific configurations.
 *
 * Route: POST /api/notifs/event
 * Authentication: Bearer token required (admin or organisateur roles only)
 *
 * Request body should contain:
 * - id: Event identifier
 * - titre: Event title
 * - description: Event description (will be truncated if > 100 characters)
 *
 * @returns Object containing success status and notification delivery statistics
 */
import { broadcastToAllDevices } from "~/server/utils/pushBroadcast";
import { customNotifSchema } from "~/libs/formValidationSchemas";

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
    // Only admins and organizers can send event notifications
    const userRole = decoded.role || decoded.customClaims?.role;

    if (userRole !== "admin" && userRole !== "organisateur") {
      throw createError({
        statusCode: 403,
        statusMessage: "Access forbidden",
      });
    }

    // Extract event data from request body
    const { id, message, type } = await readBody(event);

    console.log(`📩 Sending notification for event ID: ${id}, type: ${type}`);

    try {
      customNotifSchema.parse({ id, message, type });
    } catch (error: any) {
      console.error("Validation error:", error);
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid request data",
      });
    }

    // Prepare notification message with length limitation
    // FCM has character limits, so we truncate long messages
    let updatedMessage = message;

    if (message && message.length > 100) {
      updatedMessage = message.substring(0, 100);
      updatedMessage += "..."; // Add ellipsis to indicate truncation
    }

    const result = await broadcastToAllDevices({
      title: type,
      body: updatedMessage || "Un nouvel événement est disponible",
      data: { eventId: String(id || "unknown"), type },
    });
    console.log("Broadcast result:", result);

    return {
      success: result.successCount > 0 || result.topicSent,
      ...result,
    };
  } catch (error) {
    // Handle any errors that occur during the notification process
    console.error("💥 Error sending notifications:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
