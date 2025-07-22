/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth } from "@/server/utils/firebaseAdmin";
import admin from "firebase-admin";
import { ADMIN, isValidRole } from "~/server/libs/roles";

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
  if (userRole !== ADMIN) {
    throw createError({ statusCode: 403, statusMessage: "Access forbidden" });
  }

  const body = await readBody(event);
  const { role, uid, username } = body;

  console.log(
    "Received update request for user:",
    uid,
    "with new username:",
    username,
    "as ",
    role
  );

  try {
    if (!isValidRole(role) || username === undefined || uid === undefined) {
      console.log("Invalid role or username not provided:", body);

      throw createError({
        statusCode: 400,
        statusMessage: "bad_request",
      });
    }
    const auth = getAuth();
    if (username) {
      await auth.updateUser(uid, {
        email: username,
      });
    }
    if (role) {
      await admin.auth().setCustomUserClaims(uid, { role });
    }

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
    console.error("Erreur update-email :", err);
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
});
