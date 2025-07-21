<script setup lang="ts">
/**
 * New Event Creation Page
 *
 * This page provides a form interface for creating new events in the system.
 * It uses the EventForm component to handle data input and submission.
 *
 * The page is set up with appropriate metadata for the Nuxt router
 * and uses the 'home' layout for consistent site navigation and styling.
 */

/**
 * Define page metadata for the Nuxt router
 * - title: Sets the page title for browser tabs and navigation
 * - layout: Specifies which layout template to use for this page
 */
definePageMeta({
  title: "Nouvel évènement",
  layout: "home",
});

// Event management composable - provides validation schema, submission handler, and data options
const { isLoading, newEventFormSchema, onSubmit, eventTypes, countries } =
  useNewEvent();
</script>

<template>
  <!-- 
    Main content container
    - Responsive width (5/6 of viewport) with auto margins for centering
    - Vertical spacing between elements (mt-8 for top margin, gap-y-8 for child elements)
    - Uses flex column layout for vertical stacking
  -->
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- 
      Page header component
      - Displays the translated page title from i18n resources
      - Provides consistent heading styling and structure
    -->
    <ViewHeader :title="$t('newEvent.title')" />

    <!-- 
      Event creation form component
      - Handles all form inputs, validation, and submission logic
      - Manages file uploads and data formatting
      - Processes form submission and redirects on success
    -->
    <EventForm
      :is-loading="isLoading"
      :countries="countries"
      :event-types="eventTypes"
      :new-event-form-schema="newEventFormSchema"
      :on-submit="onSubmit"
      :initial-data="null"
    />
  </main>
</template>
