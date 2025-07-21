<script setup lang="ts">
/**
 * Mail Update Toast Component
 *
 * This component displays a customized toast notification for mail update operations.
 * It provides a message with a summary and an action button to refresh the users list.
 * The component integrates with PrimeVue Toast system and supports i18n translations.
 */

// Initialize internationalization helper for translations
const { t } = useI18n();

/**
 * Event emitters definition
 * - showToast: Controls the visibility of the toast (boolean)
 * - refreshUsers: Triggers a refresh of the users list when the action button is clicked
 */
const emit = defineEmits<{
  (e: "showToast", value: boolean): void;
  (e: "refreshUsers"): void;
}>();
</script>

<template>
  <!-- 
    Toast container that uses PrimeVue's Toast component
    - group="bc" assigns this toast to the "bc" notification group
    - @close event handler hides the toast when closed
  -->
  <Toast group="bc" @close="emit('showToast', false)">
    <!-- 
      Custom message template slot
      - Receives the message object through slotProps
      - Allows for custom styling and content within the toast
    -->
    <template #message="slotProps">
      <div class="flex flex-col items-start flex-auto gap-y-2">
        <!-- Toast message summary displayed prominently -->
        <div class="font-bold">
          {{ slotProps.message.summary }}
        </div>
        <div class="text-xs">
          {{ slotProps.message.detail }}
        </div>
        <!-- Action button container -->
        <div class="flex justify-center w-full">
          <!-- 
            Action button that triggers a refresh of the users list
            - Uses translated label from i18n
            - Has success styling (green)
            - Small size for appropriate toast fit
          -->
          <Button
            size="small"
            :label="t('mailUpdate.toasts.button')"
            severity="success"
            @click="emit('refreshUsers')"
          />
        </div>
      </div>
    </template>
  </Toast>
</template>
