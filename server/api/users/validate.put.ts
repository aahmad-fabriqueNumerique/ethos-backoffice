/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth } from "@/server/utils/firebaseAdmin";
import admin from "firebase-admin";
import { ARTISTE, ORGANISATEUR } from "~/server/libs/roles";
import { validateUserSchema } from "~/server/utils/validation-schemas/events";

export default defineEventHandler(async (event) => {
  const authHeader = getHeader(event, "authorization");

  // Vérification complète de l'en-tête
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Invalid header format:", authHeader);
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid authorization header format",
    });
  }

  // Extraire le token proprement
  const token = authHeader.substring(7).trim();

  // Initialize Firebase Admin Auth
  const auth = getAuth();

  // Verify the ID token and decode its payload
  const decoded = await auth.verifyIdToken(token);

  // Check for admin role in the token claims
  // Supports both direct role claim and nested customClaims structure
  const userRole = decoded.role || decoded.customClaims?.role;
  if (userRole !== "admin") {
    throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
  }

  const { uids, role } = (await readBody(event)) as {
    uids: string[];
    role: string;
  };

  try {
    validateUserSchema.parse({ uids, role });
  } catch (error: any) {
    throw createError({
      statusCode: 400,
      statusMessage: "bad_request",
      data: error.errors,
    });
  }

  try {
    if (![ORGANISATEUR, ARTISTE].includes(role))
      throw createError({
        statusCode: 400,
        statusMessage: "Invalid role",
      });

    for (const uid of uids) {
      await admin.auth().setCustomUserClaims(uid, { role });
      // Delete the corresponding document from waitingRoom collection
      await admin
        .firestore()
        .collection("waitingRoom")
        .where("userId", "==", uid)
        .get()
        .then((snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              doc.ref.delete();
            });
          }
        });

      await admin
        .firestore()
        .collection("publicProfiles")
        .where("userId", "==", uid)
        .get()
        .then((snapshot) => {
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              doc.ref.update({ isAuthorized: true });
            });
          }
        });
    }
  } catch (err: any) {
    const code = err?.errorInfo?.code || err?.code || "unknown";

    if (code === "auth/email-already-exists") {
      throw createError({
        statusCode: 409, // Conflit
        statusMessage: "email_already_exists",
      });
    }

    if (code === "auth/invalid-email") {
      throw createError({
        statusCode: 400,
        statusMessage: "email_invalid",
      });
    }

    if (code === "auth/user-not-found") {
      throw createError({
        statusCode: 404,
        statusMessage: "user_not_found",
      });
    }

    if (err.statusCode === 400) {
      throw createError({
        statusCode: 400,
        statusMessage: "bad_request",
      });
    }
    console.error("Erreur lors de la mise à jour de l'utilisateur :", err);
    throw createError({
      statusCode: 500,
      statusMessage: "server_error",
    });
  }

  return { message: "Activation request received" };
});
