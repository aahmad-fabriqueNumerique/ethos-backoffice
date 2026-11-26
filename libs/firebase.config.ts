const config = useRuntimeConfig();

export const firebaseConfig = {
  apiKey: config.public.firebaseApiKey as string,
  authDomain: config.public.firebaseAuthDomain,
  projectId: config.public.firebaseProjectId,
  storageBucket: config.public.firebaseStorageBucket,
  appId: config.public.firebaseAppId,
};
