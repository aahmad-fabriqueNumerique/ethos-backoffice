<script setup lang="ts">
/**
 * Home Layout Component
 *
 * This component serves as the main layout for authenticated users.
 * It includes a navigation bar with the app logo, navigation links,
 * and user actions like logout.
 *
 * The component uses PrimeVue Menubar for navigation and provides
 * a router view outlet for child routes defined in the router.
 *
 * @component HomeLayout
 */

// Initialize user store for authentication actions
const userStore = useUserStore();
const { t } = useI18n(); // Internationalization for translations

/**
 * Navigation menu items configuration
 * Each item includes label, icon, and router destination
 */
const items = ref([
  {
    label: t("navbar.songs"), // Display name
    icon: "pi pi-home", // PrimeIcons icon
    to: "/chants",
  },
  {
    label: t("navbar.events"), // Display name
    icon: "pi pi-home", // PrimeIcons icon
    to: "/events",
  },
  {
    label: t("navbar.users"), // Display name
    icon: "pi pi-home", // PrimeIcons icon
    to: "/users",
  },
  {
    label: t("navbar.notifications"), // Display name
    icon: "pi pi-home", // PrimeIcons icon
    to: "/notifications",
  },
]);
</script>

<template>
  <div class="card">
    <!--
      Navigation menu bar (PrimeVue Menubar component)
      Contains app logo, navigation links, and user actions
    -->
    <Menubar :model="items">
      <!-- Start template: Application logo -->
      <template #start>
        <img src="../assets/images/logo-noir.webp" alt="Logo" class="w-16" />
      </template>

      <!-- Custom item template for navigation links -->
      <template #item="{ item, props }">
        <!-- Router link with ripple effect for navigation items -->
        <NuxtLink
          v-ripple
          class="flex items-center"
          v-bind="props.action"
          :to="item.to"
        >
          <span>{{ item.label }}</span>
        </NuxtLink>
      </template>

      <!-- End template: User actions (logout button) -->
      <template #end>
        <div class="flex items-center gap-2">
          <Button
            label="Déconnexion"
            icon="pi pi-sign-out"
            class="p-button-outlined"
            size="small"
            aria-label="Déconnexion"
            @click="userStore.signout"
          />
        </div>
      </template>
    </Menubar>
  </div>
</template>
