<script setup lang="ts">
import { regexGeneric } from "~/libs/regex";

/**
 * Add Country Dialog Component
 *
 * This component provides a modal dialog for adding new countries to the system.
 * It integrates with the data store to persist the new country and emits events
 * to communicate with parent components.
 *
 * Features:
 * - Modal dialog with form input for country name
 * - Input validation to prevent empty submissions
 * - Integration with data store for persistence
 * - Internationalization support for all text
 * - Automatic input clearing after successful addition
 *
 * Events:
 * - set-visible: Emitted to close the dialog
 *
 * Props:
 * - visible: Controls dialog visibility state
 */

const emit = defineEmits<{
  (e: "set-visible", value: "country" | "region" | null): void;
}>();

// Initialize internationalization helper for translations
const { t } = useI18n();
const store = useDataStore();

const { visible, type } = defineProps<{
  visible: boolean;
  type: "country" | "region";
}>();

const data = ref("");
const error = ref<string | null>(null); // Reactive error state

const addData = () => {
  if (data.value.trim() === "" || !regexGeneric.test(data.value)) {
    error.value = t("newData.dialog.error"); // Set error message if input is invalid
    // Prevent adding empty or invalid country names) {
    return;
  }
  if (type === "country") {
    store.addCountry({ nom: data.value.trim() });
  } else {
    store.addRegion({
      nom: data.value.trim(),
      region_geographique_libelle: data.value.trim(),
    });
  }
  data.value = ""; // Reset input after adding
  emit("set-visible", null); // Close dialog
};
</script>

<template>
  <!-- 
    Add Country Dialog Container
    Centers the dialog component for proper positioning and display
  -->
  <div class="card flex justify-center">
    <!-- 
      Dialog component for adding new countries
      - Modal prevents interaction with background elements
      - Non-closable prevents accidental closing
      - Fixed width ensures consistent appearance across devices
    -->
    <Dialog
      modal
      :header="t('newSong.dialog.header')"
      :style="{ width: '30rem' }"
      :visible="visible"
      :closable="false"
    >
      <!-- 
        Dialog description text
        - Explains the purpose of adding a new country
        - Uses translation for internationalization support
      -->
      <span class="text-surface-500 dark:text-surface-400 block mb-4">{{
        t("newSong.dialog.description")
      }}</span>

      <div class="mb-2">
        <!-- 
          Country name input field
          - Two-way binding with v-model for reactive updates
          - Fluid width to fill available space
          - Accessibility label for screen readers
          - Placeholder text from translations
        -->
        <InputText
          id="data"
          v-model="data"
          :aria-label="t('newSong.dialog.placeholder')"
          fluid
          :placeholder="t('newSong.dialog.placeholder')"
        />
        <!-- 
          Error message display
          - Conditionally rendered based on error state
          - Uses translation for error message
          - Styled to match design system
        -->
        <span v-if="error" class="text-red-500 text-xs mt-1">{{ error }}</span>
        <!-- 
          Clear error message when input changes
          - Resets error state to null
          - Ensures user feedback is immediate
        -->
        <InputText
          v-model="data"
          class="hidden"
          aria-hidden="true"
          @input="error = null"
        />
      </div>

      <!-- 
        Action buttons container
        - Right-aligned with consistent spacing between buttons
        - Contains cancel and save functionality
      -->
      <div class="flex justify-end gap-2 mt-4">
        <!-- 
          Cancel button
          - Secondary styling to be less prominent than save button
          - Text variant for lighter visual weight
          - Emits set-visible event to close dialog without saving
        -->
        <Button
          size="small"
          type="button"
          :label="t('newSong.dialog.cancel')"
          variant="text"
          severity="secondary"
          @click="emit('set-visible', null)"
        />

        <!-- 
          Save country button
          - Warning severity to indicate this is a primary action
          - Executes addCountry function when clicked
          - Adds the new country to the data store and closes dialog
        -->
        <Button
          size="small"
          type="button"
          :label="t('newSong.dialog.save')"
          severity="warn"
          @click="addData"
        />
      </div>
    </Dialog>
  </div>
</template>
