<script setup lang="ts">
/**
 * View Header Component
 *
 * A flexible header component used at the top of view pages.
 * It displays a title on the left side and provides a slot for additional
 * content (typically action buttons) on the right side.
 *
 * @component ViewHeader
 */

/**
 * Component props
 *
 * @property {string} title - The heading text to display
 */
const { title } = defineProps<{
  title: string;
}>();
</script>

<template>
  <!-- Container with flex layout to position title and actions -->
  <span class="flex justify-between items-center">
    <!-- Title displayed with primary color styling -->
    <h1 class="text-2xl">
      {{ title }}
    </h1>
    <!-- Slot for action buttons or additional content -->
    <slot />
  </span>
</template>
