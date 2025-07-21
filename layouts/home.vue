<script setup lang="ts">
/**
 * Home Layout Component
 *
 * This layout provides a consistent structure for authenticated user pages,
 * including the navigation bar and content area.
 *
 * @component
 * @displayName HomeLayout
 * @usage
 * ```vue
 * // In page files:
 * <script setup>
 * definePageMeta({
 *   layout: 'home'
 * });
 * -
 * ```
 */
</script>

<template>
  <div class="mb-2">
    <!-- Navigation bar component shown on all pages using this layout -->
    <NavbarComponent />

    <!-- Main content slot where page content will be injected -->
    <slot />
  </div>
</template>
