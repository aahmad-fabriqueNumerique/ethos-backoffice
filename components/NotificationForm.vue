<script setup lang="ts">
/**
 * NotificationForm Component
 * 
 * This component provides a form interface for composing and sending push notifications
 * to all registered users. It integrates with VeeValidate for form validation and
 * uses a custom composable for notification logic.
 * 
 * Features:
 * - Form validation with VeeValidate
 * - Internationalization support
 * - Loading states during submission
 * - Error handling and display
 * - Responsive design
 * 
 * The form includes:
 * - Title field (required) - notification headline
 * - Message field (required) - notification body text
 * - Send/Cancel buttons
 */
import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";

// Initialize internationalization for form labels and messages
const { t } = useI18n();

// Get notification functionality from custom composable
// This provides validation schema, loading state, and submission handler
const { schema, loading, onSubmit } = useCustomNotif();

/**
 * Form submission handler
 * 
 * Processes the validated form values and delegates to the composable's
 * submission handler. Type-casts the generic form values to the expected
 * notification format.
 * 
 * @param values - The validated form values from VeeValidate
 */
const handleSubmit: SubmissionHandler<GenericObject> = (
  values: GenericObject
) => {
  // Delegate to composable's submission handler with proper typing
  onSubmit(values as { title: string; message: string });
};
</script>

<template>
  <!-- 
    Main form container
    - Uses VeeValidate Form component for validation
    - Vertical layout with consistent spacing
    - Applies validation schema from composable
    - Shows loading state during submission
  -->
  <Form
    class="flex flex-col gap-y-8"
    :validation-schema="schema"
    :loading="loading"
    @submit="handleSubmit"
  >
    <!-- 
      Title field section
      - Required field for notification headline
      - Includes validation and error display
    -->
    <div class="flex flex-col gap-y-2">
      <Field v-slot="{ field, errorMessage }" name="title">
        <!-- Field label with required indicator -->
        <label for="title">{{ t("newNotif.labels.title") }} *</label>
        
        <!-- 
          Text input for notification title
          - Fluid width for responsive design
          - Bound to VeeValidate field for validation
          - Shows error state with red border when invalid
        -->
        <InputText
          id="title"
          fluid
          v-bind="field"
          :placeholder="t('newNotif.placeholders.title')"
          :invalid="!!errorMessage"
        />
        
        <!-- 
          Error message display
          - Only shown when validation fails
          - Styled with error colors and small text
          - Uses internationalized error messages
        -->
        <Message
          v-if="errorMessage"
          class="text-xs text-error"
          severity="error"
        >
          {{ t(`newNotif.errors.${errorMessage}`) }}
        </Message>
      </Field>
    </div>
    
    <!-- 
      Message field section
      - Required field for notification body text
      - Uses textarea for multi-line input
      - Includes validation and error display
    -->
    <div class="flex flex-col gap-y-2 mt-4">
      <Field v-slot="{ field, errorMessage }" name="message">
        <!-- Field label with required indicator -->
        <label for="description">{{ t("newNotif.labels.message") }} *</label>
        
        <!-- 
          Textarea for notification message
          - Multi-line input with 5 rows
          - Bound to VeeValidate field for validation
          - Shows error state with red border when invalid
        -->
        <Textarea
          id="message"
          v-bind="field"
          rows="5"
          :placeholder="t('newNotif.placeholders.message')"
          :invalid="!!errorMessage"
        />
        
        <!-- 
          Error message display
          - Only shown when validation fails
          - Styled with error colors and small text
          - Uses internationalized error messages
        -->
        <Message
          v-if="errorMessage"
          class="text-xs text-error"
          severity="error"
        >
          {{ t(`newNotif.errors.${errorMessage}`) }}
        </Message>
      </Field>
    </div>
    
    <!-- 
      Form action buttons
      - Right-aligned with spacing between buttons
      - Cancel button (text style) resets the form
      - Send button (primary style) submits the form
    -->
    <div class="flex justify-end gap-4 mt-4">
      <!-- 
        Cancel button
        - Resets form to initial state
        - Text variant for secondary action styling
      -->
      <Button
        type="reset"
        :label="t('newNotif.buttons.cancel')"
        variant="text"
      />
      
      <!-- 
        Send button
        - Submits the form for notification sending
        - Primary styling to indicate main action
        - Will show loading state during submission
      -->
      <Button 
        type="submit" 
        :label="t('newNotif.buttons.send')" 
        :loading="loading"
      />
    </div>
  </Form>
</template>
