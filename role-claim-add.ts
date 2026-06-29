import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Configuration du service account depuis les variables d'environnement
const serviceAccount = {
  projectId: "ethos-test-bc44d",
  clientEmail:
    "firebase-adminsdk-fbsvc@ethos-test-bc44d.iam.gserviceaccount.com",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDSbr6xIQNLHBom\nCY0iPq9RGKu0kzmnkKp20Gy68gZLOEFj/jI0locSre/3c+0YpKxcsH3YFE0mq2HM\nNknRsKkg0ycwhELEiemsYYjvh2bw5gxAQRYd785fhvn8EHhM2Wd8aACHlobMCSvS\nNx0FUWJvVBljr/BmmbFEp+t0P4CTsnv/3vY7aK3Z38WZeoKNhbhCzP1DskKUtLgZ\nw9Nx1qeU5XzyTTzxq70f5H4JQXiTXzILq6t2/efRxZAsLU+rn3bsFnbcTDuXu6eY\nzks2448NVtihufP+cd1CdqXpW15SFSsJLJfSipbEjKKpgdMTOQwRq0ESutjCFYuA\nowl9ovNdAgMBAAECggEAD0ruj0tVpK/8Y37Gs7IoBgX7toILitar2LohaL2dgPpr\n4CMxTVqSIuSin5JcbPHMt+i4oIsrJzAFybQ5TaSfyeumebNm8ccPBRDKhZPKwp+J\nTOMeAxtyHUWfJbchsv4KtAMP5Mqm7a2N8ndAY+pL88jCFplK6H3rYNCuPxK9Wp5Y\neC4BR8x4MeBIZ/kG3nIiotvctc/eYb37xeuikKPDIleTjWTRI0HI+dyu2p5Jj/d3\nWgHEFSUb2W1we+sSX+0EVchFMZHJY9Px/r9/ejZbhaltY5vcFw7k+gY1M44LS+U+\nwUQ2jeNB7IlSkoDS3U0J42HtJsSBZKWDbuco+qRksQKBgQDzW/ka6G+H3L3q2HAU\nlem5YVgpk7cmyu8TssbI4dNeRvMRDhHObrqISBSM/CH8jg3vREkzspLCG9pGNFnt\nu4eBJRjnBCKJostVnu5qr2q7OciUwkdLTDtnfPzCDYBxCI3AAbYxie1uPyrwnzsd\npADJHxLtrzPaUcD4gaoLw2e5MQKBgQDdXO9pu6pq8gwjOQrQd2ad9JrkVzihBCOL\nHizJL+4DaOsah0Oq0MbrTfJ91ZrHPovz41eNO18YFTrieq2e3Tg1sohjHoKFG/vf\nZYYMRVBk/e1fs0BrISCtAR2kZGwB4+zIinevjbTwhiy0gjL2aXyz2s6Vwpp7taIX\nbZzo1ERR7QKBgQCXCfdChw5psUxCDJELhbuo7czNCTv8HKljfWq41Mfd1IUZibTt\nfXXSDYKLuhTR7cyiOqyAJI3HYYgIWIeT7/b65W5eOwfAisROYLSyjCrfBs8B3M5o\n4mhgI4ewXLbh8KAhki5k8qjk6tmYvArxq489REb4M+wnzOPKmJdUc7PVkQKBgHzu\nJWRb+KsQ3g7G87aBnJWK5hv2qcwd5N1v80C8XyznesBnFKaD27ATNscT1Z2bTCsh\n5Fid6GZUHP6S1Afzu/R6RQUDxA/Rok4LIyMrv1qwANbg+Hs9oA5jsdIEpvxOIWVw\n2GlopXSVlQdu78on8Kwk0jCtOriU4t0sDMFOgxxlAoGAT5VjJlJDWkPkBTSMXN1k\n7QbTbGbYU1FjNT4Ufl+3PlAXnpYSJnxsiWyEF4hHFjHzesdjwnFp/30EMI+fIhkl\ngrvW1l9wSdjMkjErmzO2hjCfZ8T1FlLo62PBieakR0z1UcfWd/R3jTpKEFxr2fd2\nt64/dVXwFglgf4zwG+8U3ds=\n-----END PRIVATE KEY-----\n",
};

// Initialiser Firebase Admin (avec pattern singleton pour éviter les erreurs de réinitialisation)
const firebaseAdminApp =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
        storageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      })
    : getApp();

async function addAdminClaims() {
  console.log("ajout des claims");

  const auth = getAuth(firebaseAdminApp);

  try {
    await auth.setCustomUserClaims("OnYGftM80RO7N7Y8goBBCWyPh7X2", {
      role: "admin",
    });

    console.log(
      "Claims admin ajoutés avec succès pour l'utilisateur qwbsTHrtacQ8vmCkwPwnLit5fgX2",
    );
  } catch (error) {
    console.error("Erreur lors de l'ajout des claims:", error);
  }
}

addAdminClaims();
