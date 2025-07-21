// assignAdminRole.js

const admin = require("firebase-admin");

// 🔐 Remplacer par le chemin vers ta clé de service
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function assignAdmin(uidOrEmail) {
  try {
    let user;

    if (uidOrEmail.includes("@")) {
      // Recherche par email
      user = await admin.auth().getUserByEmail(uidOrEmail);
    } else {
      // Recherche par UID
      user = await admin.auth().getUser(uidOrEmail);
    }

    await admin.auth().setCustomUserClaims(user.uid, { role: "admin" });
    console.log(`✅ Rôle "admin" attribué à ${user.email || user.uid}`);
  } catch (error) {
    console.error("❌ Erreur :", error.message);
  }
}

// 📥 Utilisation : node assignAdminRole.js <uid|email>
const input = process.argv[2];
if (!input) {
  console.error("❗️ Utilisation : node assignAdminRole.js <uid|email>");
  process.exit(1);
}

assignAdmin(input);
