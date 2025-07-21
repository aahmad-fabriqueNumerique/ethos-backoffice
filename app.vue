<template>
  <div>
    <Toast />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useUserStore } from "~/stores/user";

useHead({
  htmlAttrs: {
    class: "my-app-dark",
  },
});

const userStore = useUserStore();

onMounted(() => {
  try {
    // Vérifier que le plugin Firebase est chargé
    if (useNuxtApp().$firebaseApp) {
      userStore.initAuth();
      console.log("Firebase initialisé avec succès");
    } else {
      console.error("Le plugin Firebase n'est pas disponible");
    }
  } catch (error) {
    console.error("Erreur lors de l'initialisation de Firebase:", error);
  }
});
</script>
