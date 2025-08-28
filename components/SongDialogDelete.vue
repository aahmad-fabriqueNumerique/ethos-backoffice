<script setup lang="ts">
const {
  loading, // Loading state during deletion operation
  titre,
} = defineProps<{
  titre: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: "set-visible" | "delete-song"): void;
}>();

const { t } = useI18n();
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
      <h2>{{ t("songs.dialog.delete.title") }}</h2>
    </template>

    <!--
      Dialog Content Section
      
      Displays the confirmation message and event details to help
      users verify they are deleting the intended event.
    -->
    <div class="flex flex-col gap-2 text-sm mb-2">
      <!-- Primary confirmation message -->
      <p>{{ t("songs.dialog.delete.message") }}</p>

      <!--
        Event Details Preview
        
        Shows key event information to help user confirm
        they are deleting the correct event.
      -->
      <span>
        <!-- Event title in regular weight -->
        <p class="pl-4 font-bold italic">{{ titre }}</p>
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
        :label="t('songs.dialog.delete.cancel')"
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
        :label="t('songs.dialog.delete.confirm')"
        @click="emit('delete-song')"
      />
    </template>
  </Dialog>
</template>
