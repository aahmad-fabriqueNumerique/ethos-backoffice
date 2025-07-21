const config = useRuntimeConfig();

export const firebaseConfig = {
  apiKey: config.public.firebaseApiKey as string,
  authDomain: config.public.firebaseAuthDomain,
  databaseURL: config.public.firebaseDatabaseUrl,
  projectId: config.public.firebaseProjectId,
  storageBucket: config.public.firebaseStorageBucket,
  messagingSenderId: config.public.firebaseMessagingSenderId,
  appId: config.public.firebaseAppId,
};
