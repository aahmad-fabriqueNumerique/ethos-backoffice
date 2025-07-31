/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Event Cleanup API Endpoint
 *
 * This API automatically cleans up old events from the Firestore database
 * to prevent excessive database growth and improve performance.
 *
 * It deletes events older than 60 days using batched operations to
 * ensure efficient processing of large datasets.
 *
 * Route: GET /api/events/clean
 * No authentication required (consider adding it for production)
 *
 * @returns Object containing operation status and count of deleted documents
 */
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { firebaseApp, getStorage, getAuth } from "~/server/utils/firebaseAdmin";

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
    // Get Firestore instance
    const db = getFirestore(firebaseApp);

    // Calculate cutoff date (60 days ago)
    const cutoff = Timestamp.fromDate(
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    );

    // Batch size for efficient Firestore operations
    const batchSize = 500;
    let totalDeleted = 0;

    // Process documents in batches until no more matches are found
    while (true) {
      // Query for old events
      const snapshot = await db
        .collection("events")
        .where("dateFin", "<", cutoff)
        .limit(batchSize)
        .get();

      // Exit loop when no more documents to process
      if (snapshot.empty) break;
      console.log(`Found ${snapshot.size} documents to delete...`);

      // First, collect all event IDs that will be deleted
      const eventIds = snapshot.docs.map((doc) => doc.id);

      // Delete images associated with the events from Firebase Storage BEFORE deleting documents
      const storage = getStorage();
      const bucket = storage.bucket();
      const possibleExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

      for (const eventId of eventIds) {
        console.log(`🔍 Checking images for event ${eventId}...`);

        for (const ext of possibleExtensions) {
          try {
            const filePath = `images/events/${eventId}.${ext}`;
            const file = bucket.file(filePath);

            // Check if file exists before attempting deletion
            const [exists] = await file.exists();

            if (exists) {
              await file.delete();
              console.log(`✅ Successfully deleted image: ${filePath}`);
            } else {
              console.log(`📋 No image found at path: ${filePath}`);
            }
          } catch (error: any) {
            console.error(`❌ Error processing ${eventId}.${ext}:`, {
              message: error.message,
              code: error.code,
              statusCode: error.statusCode,
              filePath: `images/events/${eventId}.${ext}`,
            });
          }
        }
      }

      // Now delete the Firestore documents after images have been cleaned up
      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      // Track total count of deleted documents
      totalDeleted += snapshot.size;
    }

    // Return operation results
    return {
      status: "success",
      deleted: totalDeleted,
    };
  } catch (error: any) {
    console.error("Error during event cleanup:", error);
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || "Internal Server Error",
    });
  }
});
