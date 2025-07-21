<script setup lang="ts">
/**
 * Email Update Dialog Component
 *
 * This component provides a modal dialog for updating user email addresses and roles.
 * It integrates with VeeValidate for form validation and PrimeVue for UI components.
 *
 * Features:
 * - Form for updating user email and role
 * - Validation using the mailUpdateSchema
 * - Role selection from predefined options
 * - Internationalization support
 * - Cancel and save actions
 */
import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";

type Emits = {
  (e: "setVisible", value: string | null): void; // Controls dialog visibility
  (e: "userUpdated"): void; // Notifies parent component of successful update
};

// Initialize internationalization helper for translations
const { t } = useI18n();

/**
 * Available roles for the dropdown selection
 * Each role has a value (identifier) and label (display name)
 * Initialized as null and populated on component mount
 */
const roles = ref<
  | {
      value: string;
      label: string;
    }[]
  | null
>(null);

/**
 * Event emitters
 * - setVisible: Emitted when dialog visibility should change, passes null to close
 * - userUpdated: Emitted when a user is successfully updated
 */
const emit = defineEmits<Emits>();

/**
 * Component props
 * @property {string|null} visible - User ID to update, determines dialog visibility
 *                                   When null, the dialog is hidden
 */
const { visible } = defineProps<{
  visible: string | null;
}>();

// Get form validation schema, role options, and submit handler from the composable
const { mailUpdateSchema, getRoles, onSubmit, loading } = useMailUpdate(emit);

/**
 * Populate roles dropdown on component mount
 * Retrieves translated role options from the composable
 */
onMounted(() => {
  roles.value = getRoles();
});

/**
 * Form submission handler
 *
 * This function:
 * 1. Adds the user ID to the form values
 * 2. Logs the submission data for debugging
 * 3. Calls the onSubmit function from the composable
 * 4. Emits userUpdated event to notify parent component
 *
 * @param values - Form field values from VeeValidate
 */
const handleSubmit: SubmissionHandler<GenericObject> = async (values) => {
  const data = {
    ...values,
    uid: visible || "", // Ensure uid is included
  };
  console.log("Submitting form with values:", data);
  onSubmit(data as { uid: string; username: string; role: string });
};
</script>

<template>
  <!-- 
    Modal dialog component
    - Visibility controlled by the visible prop
    - Modal prevents interaction with elements behind it
    - Non-closable requires explicit action (save or cancel)
    - Fixed width for consistent appearance
  -->
  <Dialog
    :visible="!!visible"
    :modal="true"
    :closable="false"
    :header="t('mailUpdate.header')"
    :style="{ width: '30rem' }"
  >
    <!-- Dialog description text -->
    <span class="text-surface-500 dark:text-surface-400 block mb-8">
      {{ t("mailUpdate.description") }}
    </span>

    <!-- 
      Validation form
      - Uses the schema from mailUpdateSchema
      - Submits via handleSubmit function
    -->
    <Form :validation-schema="mailUpdateSchema" @submit="handleSubmit">
      <!-- Email field section -->
      <div class="mb-4">
        <Field v-slot="{ field, errorMessage }" name="username">
          <div class="flex items-center gap-4 mb-2">
            <!-- Email field label -->
            <label class="whitespace-nowrap" for="username">{{
              t("mailUpdate.labels.email")
            }}</label>

            <!-- 
              Email input field
              - Binds VeeValidate field properties for validation
              - Displays invalid state when error exists
              - Uses placeholder text from translations
            -->
            <InputText
              id="username"
              fluid
              v-bind="field"
              :placeholder="t('mailUpdate.placeholders.email')"
              :invalid="!!errorMessage"
            />
          </div>

          <!-- Error message for email field -->
          <Message
            v-if="errorMessage"
            class="text-xs text-error"
            severity="error"
          >
            {{ t(`mailUpdate.errors.${errorMessage}`) }}
          </Message>
        </Field>
      </div>

      <!-- Role selection section -->
      <div class="flex items-center gap-4 mb-8">
        <Field
          v-slot="{ field, errorMessage, handleChange, handleBlur }"
          name="role"
        >
          <!-- Role field label -->
          <label for="role">{{ t("mailUpdate.labels.role") }}</label>

          <!-- 
            Role selection dropdown
            - Only rendered when roles are available
            - Integrates with VeeValidate for validation
            - Displays available roles with translated labels
            - Shows invalid state when error exists
          -->
          <Select
            v-if="roles"
            id="role"
            :model-value="field.value"
            :options="roles!"
            option-label="label"
            option-value="value"
            class="w-full"
            aria-label="select role"
            name="role"
            :placeholder="t('mailUpdate.placeholders.role')"
            :class="{
              'p-invalid': !!errorMessage,
            }"
            @update:model-value="
              (val) => {
                field.value = val;
                handleChange(val);
              }
            "
            @blur="handleBlur"
          />

          <!-- Error message for role field -->
          <Message
            v-if="errorMessage"
            class="text-xs text-error"
            severity="error"
          >
            {{ t("mailUpdate.errors.${errorMessage}") }}
          </Message>
        </Field>
      </div>

      <!-- 
        Dialog action buttons
        - Cancel button closes the dialog without saving
        - Save button submits the form for validation and processing
      -->
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('mailUpdate.buttons.cancel')"
          severity="secondary"
          @click="emit('setVisible', null)"
        />
        <Button
          type="submit"
          :loading="loading"
          :disabled="loading"
          :label="t('mailUpdate.buttons.save')"
        />
      </div>
    </Form>
  </Dialog>
</template>
