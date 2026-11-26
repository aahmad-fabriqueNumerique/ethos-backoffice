import Lara from "@primevue/themes/aura";
import PrimeUI from "tailwindcss-primeui";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Nuxt charge `.env` ; en local on y superpose `.env.local` (prioritaire).
// Sans effet sur Vercel/CI (variables fournies par la plateforme) et jamais bloquant.
if (!process.env.VERCEL && !process.env.CI) {
  try {
    const file = resolve(process.cwd(), ".env.local");
    if (existsSync(file)) {
      for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*(?:export\s+)?([A-Za-z0-9_.-]+)\s*=\s*(.*?)\s*$/);
        if (!m || m[1] === undefined) continue;
        let value = m[2] ?? "";
        if (/^(".*"|'.*')$/.test(value)) value = value.slice(1, -1);
        process.env[m[1]] = value;
      }
    }
  } catch {
    // .env.local illisible : on ignore
  }
}

export default defineNuxtConfig({
  // ssr: false,
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
    openAgendaAPIKey: process.env.OPENAGENDA_API_KEY,
    agendaTradUID: process.env.AGENDA_TRAD_UID,
    loCalenDiariUID: process.env.LO_CALEN_DIARI_UID,
    tmpUploadsDir: process.env.TMP_UPLOADS_DIR,

    // Public keys that are exposed to the client
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
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
