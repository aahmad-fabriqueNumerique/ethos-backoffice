import Lara from "@primevue/themes/aura";
import PrimeUI from "tailwindcss-primeui";

export default defineNuxtConfig({
  ssr: false,
  css: ["@/assets/css/main.css", "primeicons/primeicons.css"],
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },
  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    "@primevue/nuxt-module",
    "@nuxtjs/tailwindcss",
    "@nuxtjs/i18n",
    "@vee-validate/nuxt",
    "@pinia/nuxt",
  ],
  runtimeConfig: {
    // Private keys that are exposed to the server
    firebaseAdminPrivateKey: process.env.FIREBASE_PRIVATE_KEY,
    firebaseAdminClientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    firebaseAdminProjectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    openAgendaAPIKey: process.env.OPENAGENDA_API_KEY,
    agendaUID: process.env.AGENDA_UID,

    // Public keys that are exposed to the client
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseDatabaseUrl: process.env.NUXT_PUBLIC_FIREBASE_DATABASE_URL,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId:
        process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
    },
  },
  primevue: {
    options: {
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: ".p-dark",
        },
      },
      ripple: true,
    },
    autoImport: true,
  },
  tailwindcss: {
    config: {
      plugins: [PrimeUI],
      darkMode: ["class", ".p-dark"],
    },
  },
  i18n: {
    locales: [{ code: "fr", file: "fr.json", language: "fr-FR" }],

    defaultLocale: "fr",
  },
});
