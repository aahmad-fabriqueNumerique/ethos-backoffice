<script setup lang="ts">
/**
 * User Deletion Dialog Component
 *
 * This component displays a confirmation dialog before deleting a user account.
 * It provides a clear warning about the action and requires explicit confirmation.
 *
 * Features:
 * - Modal dialog with clear title and description
 * - Cancel option to abort the deletion
 * - Confirm button with loading state
 * - Internationalization support
 */

/**
 * Event emitters
 * - set-visible: Emitted when dialog visibility should change
 * - delete-user: Emitted when user confirms the deletion
 */
const emit = defineEmits<{
  (e: "set-visible", visible: boolean): void;
  (e: "delete-user"): void;
}>();

// Initialize internationalization helper for translations
const { t } = useI18n();

/**
 * Component props
 * @property {boolean} loading - Whether deletion operation is in progress
 * @property {boolean} visible - Controls the visibility of the dialog
 */
const { loading, visible } = defineProps<{
  loading: boolean;
  visible: boolean;
}>();
</script>

<template>
  <!-- 
    Delete User Dialog Container
    Wraps the dialog component for proper positioning and display
  -->
  <div class="card flex justify-center">
    <!-- 
      Dialog component for user deletion confirmation
      - Modal prevents interaction with elements behind it
      - Non-closable prevents closing by clicking outside or pressing escape
      - Fixed width ensures consistent appearance across devices
    -->
    <Dialog
      modal
      :header="t('deleteUser.modal.title')"
      :style="{ width: '30rem' }"
      :visible="visible"
      :closable="false"
    >
      <!-- 
        Dialog description text
        - Explains the consequences of user deletion
        - Uses translation for internationalization
      -->
      <span class="text-surface-500 dark:text-surface-400 block mb-8">{{
        t("deleteUser.modal.description")
      }}</span>

      <!-- 
        Action buttons container
        - Aligned to the right with spacing between buttons
        - Contains cancel and confirm buttons
      -->
      <div class="flex justify-end gap-2">
        <!-- 
          Cancel button
          - Secondary style to be less prominent than confirm
          - Text variant for lighter visual weight
          - Emits set-visible event to close the dialog
        -->
        <Button
          size="small"
          type="button"
          :label="t('deleteUser.modal.cancel')"
          variant="text"
          severity="secondary"
          @click="emit('set-visible', false)"
        />

        <!-- 
          Confirm deletion button
          - Warning severity to indicate destructive action
          - Shows loading spinner during deletion process
          - Disabled when loading to prevent multiple submissions
          - Emits delete-user event when clicked
        -->
        <Button
          size="small"
          type="button"
          :label="t('deleteUser.modal.confirm')"
          :loading="loading"
          severity="warn"
          :disabled="loading"
          @click="emit('delete-user')"
        />
      </div>
    </Dialog>
  </div>
</template>
