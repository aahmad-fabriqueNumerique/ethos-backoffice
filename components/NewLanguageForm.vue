<script setup lang="ts">
/**
 * New Region Form Component
 *
 * This component provides a form interface for creating new geographical regions.
 * It includes input fields for region name and geographical label with validation.
 * The component emits events for form submission and cancellation.
 *
 * @component NewRegionForm
 */

import type Language from "@/models/Language";
import type { toTypedSchema } from "@vee-validate/zod";
import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

/**
 * Component events
 *
 * - cancel: Emitted when the user cancels the form
 * - submit-newregion: Emitted with form values when the form is submitted
 */
const emit = defineEmits<{
  (e: "cancel"): void;
  (e: "submit-newlanguage", values: Omit<Language, "id">): void;
}>();

/**
 * Component props
 *
 * @property {boolean} isLoading - Loading state for the form submission
 * @property {ReturnType<typeof toTypedSchema>} newRegionFormSchema - Validation schema for the form
 */
const { isLoading, newLanguageFormSchema } = defineProps<{
  isLoading: boolean;
  newLanguageFormSchema: ReturnType<typeof toTypedSchema>;
}>();

/**
 * Form submission handler
 *
 * Processes the form values and emits them to the parent component.
 * This function is called when the form is submitted and validation passes.
 *
 * @param {GenericObject} values - The validated form values
 */
const handleSubmit: SubmissionHandler<GenericObject> = async (values) => {
  // Log the form values for debugging
  console.log("Form submitted with values:", values);

  // Emit the values to the parent component
  emit("submit-newlanguage", values as unknown as Omit<Language, "id">);
};
</script>

<template>
  <Form
    class="flex flex-col gap-y-8"
    :validation-schema="newLanguageFormSchema"
    :is-loading="isLoading"
    @submit="handleSubmit"
    @reset="emit('cancel')"
  >
    <!-- Form fields container with responsive layout -->
    <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Region name field with validation -->
      <span class="flex flex-col gap-y-2">
        <Field v-slot="{ field, errorMessage }" name="nom">
          <label for="nom">{{ t("languages.labels.name") }}</label>
          <InputText
            id="nom"
            fluid
            v-bind="field"
            name="nom"
            aria-label="region_name"
            :placeholder="t('languages.placeholders.name')"
            :invalid="!!errorMessage"
          />
          <!-- Error message display -->
          <Message
            v-if="errorMessage !== undefined"
            class="text-xs text-error"
            severity="error"
          >
            {{ t(`languages.errors.${errorMessage}`) }}
          </Message>
        </Field>
      </span>
    </div>

    <!-- Action buttons container -->
    <div class="flex justify-end gap-2">
      <Button type="reset" label="Cancel" variant="text" />
      <Button type="submit" label="Save" />
    </div>
  </Form>
</template>
