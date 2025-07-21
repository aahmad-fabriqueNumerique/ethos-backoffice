<script setup lang="ts">
/**
 * Notifications Management Page
 * 
 * This page provides an interface for administrators to send push notifications
 * to all registered users. It includes a form for composing notifications with
 * customizable title, message, and notification type.
 * 
 * Features:
 * - Send notifications to all registered devices
 * - Compose custom notification messages
 * - Select notification types for categorization
 * - Preview notification content before sending
 * 
 * Access: Restricted to admin and organizer roles only
 */

/**
 * Define page metadata for the Nuxt router
 * - layout: Uses the 'home' layout for consistent navigation and styling
 * - title: Sets the page title for browser tabs and navigation breadcrumbs
 */
definePageMeta({
  layout: "home",
  title: "Notifications",
});
</script>

<template>
  <!-- 
    Main content container
    - Responsive width (5/6 of viewport) with auto margins for horizontal centering
    - Top margin for spacing from navigation
    - Flex column layout with consistent vertical spacing between sections
  -->
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- 
      Page header component
      - Displays the page title consistently with other admin pages
      - Provides visual hierarchy and context for the current page
    -->
    <ViewHeader title="Notifications" />
    
    <!-- 
      Section heading for notification composition
      - Bold text to emphasize the primary action available on this page
      - Provides clear indication of the page's main functionality
    -->
    <p class="font-bold">Envoyer une nouvelle notification</p>
    
    <!-- 
      Notification form container
      - Constrained width (3/6 of parent) for better form readability
      - Contains the NotificationForm component which handles:
        * Message composition
        * Notification type selection
        * Form validation
        * Submission to the notification API
    -->
    <div class="w-3/6">
      <NotificationForm />
    </div>
  </main>
</template>
