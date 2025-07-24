<script setup lang="ts">
import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";

/**
 * Add New Entry Dialog Component
 *
 * This component provides a modal dialog for adding new data entries to the system
 * (countries, regions, etc.). It integrates with the data store to persist new entries
 * and communicates with parent components through events.
 *
 * Key Features:
 * - Modal dialog with form validation using VeeValidate
 * - Dynamic content based on data type (countries, regions, etc.)
 * - Input validation with error message display
 * - Integration with useAddNewEntry composable for data management
 * - Internationalization support for all UI text
 * - Form submission handling with automatic dialog closure
 *
 * Props:
 * - visible: Boolean to control dialog visibility state
 * - type: DataKey specifying the type of data being added (countries, regions, etc.)
 *
 * Events:
 * - set-visible: Emitted to control dialog visibility, passes null to close
 *
 * Usage Example:
 * ```vue
 * <DialogAddNewEntry
 *   :visible="showDialog"
 *   type="countries"
 *   @set-visible="handleDialogVisibility"
 * />
 * ```
 *
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-24
 */

/**
 * Event emitter type definition for dialog visibility control
 *
 * @interface EmitEvents
 */
const emit = defineEmits<{
  /** Emits dialog visibility state change, null closes the dialog */
  (e: "set-visible", value: "countries" | "regions" | null): void;
}>();

// Initialize internationalization helper for translated UI text
const { t } = useI18n();

/**
 * Component props definition
 *
 * @interface Props
 */
const { visible, type } = defineProps<{
  /** Controls whether the dialog is visible or hidden */
  visible: boolean;
  /** Specifies the type of data being added (countries, regions, etc.) */
  type: DataKey;
}>();

// Initialize the add new entry composable with emit function and data type
const { addData, schema } = useAddnewEntry(emit, type);

/**
 * Form submission handler
 *
 * Processes form submission by extracting the data value and calling
 * the addData function from the composable. This will add the new entry
 * to the store and automatically close the dialog.
 *
 * @param {GenericObject} values - Form values containing the data field
 */
const onSubmit: SubmissionHandler<GenericObject> = (values: GenericObject) => {
  addData(values.data);
};
</script>

<template>
  <!-- 
    Add New Entry Dialog Container
    Provides centered layout for the modal dialog component
  -->
  <div class="card flex justify-center">
    <!-- 
      Main Dialog Component
      - Modal prevents interaction with background elements during data entry
      - Non-closable prevents accidental closing without user action
      - Fixed width ensures consistent appearance across different screen sizes
      - Header text is dynamically generated based on data type using i18n
    -->
    <Dialog
      modal
      :header="t(`newData.dialog.headers.${type}`)"
      :style="{ width: '30rem' }"
      :visible="visible"
      :closable="false"
    >
      <!-- 
        Dialog description text
        - Provides context about the purpose of adding new data
        - Uses dynamic translation key based on data type for appropriate messaging
        - Styled with muted colors for secondary information hierarchy
      -->
      <span class="text-surface-500 dark:text-surface-400 block mb-4">{{
        t(`newData.dialog.descriptions.${type}`)
      }}</span>

      <!-- 
        VeeValidate Form Component
        - Integrates with validation schema from useAddNewEntry composable
        - Handles form submission and validation state management
        - Triggers onSubmit handler when form is successfully validated
      -->
      <Form :validation-schema="schema" @submit="onSubmit">
        <!-- 
          Form Input Section
          - Contains the main data entry field with validation
          - Uses flexible column layout with consistent spacing
        -->
        <div class="flex flex-col gap-y-2">
          <!-- 
            VeeValidate Field Component
            - Provides validation integration and error handling
            - Uses slot pattern to access field props and error messages
            - Binds to 'data' field in validation schema
          -->
          <Field v-slot="{ field, errorMessage }" name="data">
            <!-- 
              Input Label
              - Dynamic label text based on data type using i18n
              - Asterisk indicates required field for accessibility
            -->
            <label for="data">{{ t(`newData.dialog.labels.${type}`) }} *</label>

            <!-- 
              Main Input Field
              - Full width (fluid) to utilize available dialog space
              - Field binding provides validation and value management
              - Dynamic placeholder text based on data type
              - Invalid state styling when validation errors are present
            -->
            <InputText
              id="data"
              fluid
              v-bind="field"
              :placeholder="t(`newData.dialog.placeholders.${type}`)"
              :invalid="!!errorMessage"
            />

            <!-- 
              Error Message Display
              - Only shown when validation errors are present
              - Uses PrimeVue Message component with error severity
              - Small text size for subtle error indication
              - Internationalized error messages for user-friendly feedback
            -->
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- 
          Action Buttons Container
          - Right-aligned button layout with consistent spacing
          - Contains both cancel and save actions for user choice
          - Top margin provides visual separation from form content
        -->
        <div class="flex justify-end gap-2 mt-4">
          <!-- 
            Cancel Button
            - Secondary styling with text variant for reduced visual prominence
            - Button type prevents form submission when clicked
            - Emits set-visible event with null value to close dialog without saving
            - Uses internationalized label for accessibility
          -->
          <Button
            size="small"
            type="button"
            :label="t('newData.dialog.buttons.cancel')"
            variant="text"
            severity="secondary"
            @click="emit('set-visible', null)"
          />

          <!-- 
            Save Button
            - Submit type triggers form validation and submission
            - Warning severity provides visual emphasis as primary action
            - Form submission automatically calls onSubmit handler
            - Uses internationalized label for consistent UI language
          -->
          <Button
            size="small"
            type="submit"
            :label="t('newData.dialog.buttons.save')"
            severity="warn"
          /></div
      ></Form>
    </Dialog>
  </div>
</template>
