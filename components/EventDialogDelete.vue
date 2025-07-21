<script setup lang="ts">
/**
 * Event Delete Confirmation Dialog Component
 *
 * A reusable modal dialog component that provides a standardized interface
 * for confirming event deletion operations. Features localized content,
 * event details display, and proper loading state management.
 *
 * Key Features:
 * - Internationalized content with Vue I18n
 * - Event details preview (title and date range)
 * - Loading state management during deletion
 * - Accessible keyboard navigation
 * - Consistent styling with PrimeVue Dialog
 * - Type-safe props and emit definitions
 *
 * Usage Example:
 * ```vue
 * <EventDialogDelete
 *   v-if="showDeleteDialog"
 *   :loading="deleteLoading"
 *   :titre="selectedEvent.titre"
 *   :date-debut="selectedEvent.dateDebut"
 *   :date-fin="selectedEvent.dateFin"
 *   @set-visible="showDeleteDialog = false"
 *   @delete-event="handleEventDeletion"
 * />
 * ```
 *
 * @component EventDialogDelete
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

/**
 * Component emit events definition
 *
 * Defines the events that this component can emit to parent components.
 * Uses TypeScript for type safety and better developer experience.
 *
 * @interface EmitEvents
 */
const emit = defineEmits<{
  /**
   * Emitted events:
   * - "set-visible": when user wants to close the dialog without deletion
   * - "delete-event": when user confirms the deletion action
   *
   * @returns {void}
   */
  (e: "set-visible" | "delete-event"): void;
}>();

/**
 * Component props definition with TypeScript validation
 *
 * Defines the required data that must be passed from parent components
 * to properly display event information and manage dialog state.
 *
 * @interface ComponentProps
 */
const {
  loading, // Loading state during deletion operation
  titre, // Event title for display
  dateDebut, // Event start date/time
  dateFin, // Event end date/time
} = defineProps<{
  /**
   * Loading state indicator
   *
   * Controls the loading spinner on the confirm button and prevents
   * multiple deletion requests during an ongoing operation.
   *
   * @type {boolean}
   * @required
   */
  loading: boolean;

  /**
   * Event title/name
   *
   * The main event identifier displayed to help users confirm
   * they are deleting the correct event.
   *
   * @type {string}
   * @required
   * @example "Annual Tech Conference"
   */
  titre: string;

  /**
   * Event start date and time
   *
   * Can be either a Date object or ISO string. Will be formatted
   * using locale-specific formatting for user display.
   *
   * @type {Date | string}
   * @required
   * @example new Date('2025-01-18T09:00:00Z')
   */
  dateDebut: Date | string;

  /**
   * Event end date and time
   *
   * Can be either a Date object or ISO string. Will be formatted
   * using locale-specific formatting for user display.
   *
   * @type {Date | string}
   * @required
   * @example new Date('2025-01-18T17:00:00Z')
   */
  dateFin: Date | string;
}>();

/**
 * Vue I18n composable for internationalization
 *
 * Provides access to translation functions for displaying
 * localized text content throughout the dialog.
 *
 * @constant {Function} t - Translation function
 */
const { t } = useI18n();

/**
 * Format date for display
 *
 * Helper function to safely format dates regardless of whether
 * they come as Date objects or string values.
 *
 * @function formatDate
 * @param {Date | string} date - The date to format
 * @returns {string} Locale-formatted date string
 */
const formatDate = (date: Date | string): string => {
  try {
    // Handle Date objects
    if (date instanceof Date) {
      return date.toLocaleString();
    }

    // Handle string dates (ISO format)
    if (typeof date === "string") {
      return new Date(date).toLocaleString();
    }

    // Fallback for invalid dates
    return "Invalid Date";
  } catch (error) {
    console.warn("Error formatting date:", error);
    return "Invalid Date";
  }
};
</script>

<template>
  <!--
    Main Dialog Container
    
    Uses PrimeVue Dialog component with responsive width.
    The dialog automatically handles:
    - Modal overlay and focus management
    - ESC key handling for closing
    - Accessible ARIA attributes
    - Responsive positioning
  -->
  <Dialog class="w-[30rem]">
    <!-- 
      Dialog Header Section
      
      Contains the localized title for the deletion confirmation.
      Uses semantic h2 element for proper accessibility hierarchy.
    -->
    <template #header>
      <h2>{{ t("events.dialog.delete.title") }}</h2>
    </template>

    <!--
      Dialog Content Section
      
      Displays the confirmation message and event details to help
      users verify they are deleting the intended event.
    -->
    <div class="flex flex-col gap-2 text-sm mb-2">
      <!-- Primary confirmation message -->
      <p>{{ t("events.dialog.delete.message") }}</p>

      <!--
        Event Details Preview
        
        Shows key event information to help user confirm
        they are deleting the correct event.
      -->
      <span>
        <!-- Event title in regular weight -->
        <p>{{ titre }}</p>

        <!-- 
          Date range with reduced opacity for visual hierarchy
          Formats dates using locale-specific formatting
        -->
        <p class="opacity-50">
          {{ formatDate(dateDebut) }} - {{ formatDate(dateFin) }}
        </p>
      </span>
    </div>

    <!--
      Dialog Footer Actions
      
      Contains the action buttons for canceling or confirming
      the deletion operation.
    -->
    <template #footer>
      <!--
        Cancel Button
        
        Secondary action that closes the dialog without performing
        any deletion. Uses text variant for visual de-emphasis.
      -->
      <Button
        severity="secondary"
        size="small"
        variant="text"
        :label="t('events.dialog.delete.cancel')"
        @click="emit('set-visible')"
      />

      <!--
        Confirm Delete Button
        
        Primary destructive action that triggers the deletion.
        Features:
        - Warning severity for destructive action styling
        - Loading state with spinner during operation
        - Disabled state to prevent multiple submissions
        - Localized confirm text
      -->
      <Button
        severity="warn"
        size="small"
        :loading="loading"
        :disabled="loading"
        :label="t('events.dialog.delete.confirm')"
        @click="emit('delete-event')"
      />
    </template>
  </Dialog>
</template>

<!--
  Component Style Notes:
  
  This component relies on:
  - Tailwind CSS for utility classes
  - PrimeVue theme for component styling
  - CSS custom properties for consistent spacing
  
  No scoped styles are needed as all styling is handled
  through utility classes and component defaults.
-->
