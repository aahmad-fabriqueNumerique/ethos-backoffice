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
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { translateNotificationType } from "~/server/utils/translateNotifications";

export default defineEventHandler(async (event) => {
  const types = ["event", "song"];

  try {
    const type = getRouterParam(event, "type");

    if (type && !types.includes(type)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Invalid notification type: ${type}. Allowed types are: ${types.join(
          ", "
        )}`,
      });
    }

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

    // Retrieve all registered device tokens from Firestore
    // These tokens represent devices that can receive push notifications
    const tokensSnap = await getFirestore().collection("deviceTokens").get();
    const tokens = tokensSnap.docs.map((doc) => doc.id);

    console.log(`📱 Found ${tokens.length} device tokens:`, tokens);

    // Extract event data from request body
    const { id, titre, description } = await readBody(event);

    // Prepare notification description with length limitation
    // FCM has character limits, so we truncate long descriptions
    let updatedDescription = description || "Aucun description fournie";

    if (description && description.length > 100) {
      updatedDescription = description.substring(0, 100);
      updatedDescription += "..."; // Add ellipsis to indicate truncation
    }

    // Send notifications if we have registered devices
    if (tokens.length > 0) {
      let labelType = await translateNotificationType(
        decoded.lang || "fr", // Use user's language or default to French
        type!
      );
      labelType += `\n${titre}`; // Append event title to the notification label

      // Send multicast notification to all registered devices
      // Uses Firebase Cloud Messaging with platform-specific configurations
      const response = await getMessaging().sendEachForMulticast({
        tokens, // Array of device tokens to send to

        // Basic notification content displayed to users
        notification: {
          title: labelType,
          body: updatedDescription || "Un nouvel événement est disponible",
        },

        // Custom data payload (all values must be strings for FCM compatibility)
        // This data can be accessed by the app when notification is received
        data: {
          eventId: String(id || "unknown"), // Convert to string for FCM
          type: labelType,
          timestamp: Date.now().toString(),
        },

        // Android-specific notification configuration
        // Ensures high priority delivery and proper sound/vibration
        android: {
          priority: "high", // High priority for immediate delivery
          notification: {
            priority: "high",
            defaultSound: true, // Use system default notification sound
            defaultVibrateTimings: true, // Use system default vibration pattern
          },
        },

        // iOS (Apple Push Notification Service) configuration
        // Configures how notifications appear on iOS devices
        apns: {
          payload: {
            aps: {
              alert: {
                title: `${labelType} : ${titre}`,
                body: description || "Un nouvel événement est disponible",
              },
              sound: "default", // Use default iOS notification sound
              badge: 1, // Set app badge count to 1
            },
          },
        },
      });

      // Log detailed results of the notification sending operation
      console.log("✅ Notification sending results:");
      console.log(`Success count: ${response.successCount}`);
      console.log(`Failure count: ${response.failureCount}`);

      // Log specific errors for failed deliveries
      // This helps with debugging delivery issues
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(
              `❌ Failed to send to token ${tokens[idx]}:`,
              resp.error
            );
          }
        });
      }

      // Return success response with delivery statistics
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } else {
      // No registered devices found
      console.log("⚠️  No device tokens found");
      return {
        success: false,
        message: "No device tokens found",
      };
    }
  } catch (error) {
    // Handle any errors that occur during the notification process
    console.error("💥 Error sending notifications:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Internal Server Error",
    });
  }
});
