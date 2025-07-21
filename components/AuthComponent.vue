<!-- eslint-disable vue/html-self-closing -->
<script setup lang="ts">
/**
 * Login Form Component
 *
 * This component provides a styled login form with email and password inputs,
 * validation, error messages, and a submit button. It uses vee-validate for form
 * handling and validation, and PrimeVue components for UI elements.
 *
 * @component LoginForm
 * @example <LoginForm />
 */

// Form validation imports
import {
  Form,
  Field,
  type SubmissionHandler,
  type GenericObject,
} from "vee-validate";
// Internationalization for translations
import { useI18n } from "vue-i18n";
import type { Credentials } from "~/models/Credentials";
// Custom composable for login logic

// Get translation function from i18n
const { t } = useI18n();

/**
 * Login functionality from the useLogin composable
 * - isLoading: Boolean indicating if login request is in progress
 * - loginFormSchema: Validation schema for the form fields
 * - onSubmit: Function to handle form submission
 */
const { isLoading, loginFormSchema, onSubmit } = useLogin();

/**
 * Form submission handler
 * Accepts the validated form values and passes them to the onSubmit function
 *
 * @param {GenericObject} values - The validated form values
 */
const handleSubmit: SubmissionHandler<GenericObject> = (values) => {
  onSubmit(values as unknown as Credentials);
};
</script>

<template>
  <!--
    Login form container with glassmorphism effect
    Uses background image, blur effects, and transparent background
    CORRECTION: Changed min-w-screen min-h-screen to w-screen h-screen pour que l'image couvre tout l'écran
  -->
  <Form
    class="px-8 py-20 md:px-12 lg:px-20 flex items-center justify-center backdrop-blur-3xl !bg-cover !bg-center !bg-no-repeat w-screen h-screen"
    style="
      background-image: url('https://fqjltiegiezfetthbags.supabase.co/storage/v1/object/public/block.images/blocks/signin/signin-glass.jpg');
    "
    :validation-schema="loginFormSchema"
    @submit="handleSubmit"
  >
    <!-- Login card with glassmorphism effect -->
    <div
      class="px-8 md:px-12 lg:px-20 py-12 flex flex-col items-center gap-12 w-full max-w-xl backdrop-blur-2xl rounded-2xl bg-white/10 border border-white/10"
    >
      <!-- Logo and branding section -->
      <div class="flex flex-col items-center gap-4 w-full">
        <!-- Application logo -->
        <div class="flex flex-col gap-2 w-full">
          <img
            src="../assets/images/logo_ethos.webp"
            alt="Logo"
            class="w-96 h-auto object-contain mx-auto"
          />
        </div>
      </div>

      <!-- Form fields container -->
      <div class="flex flex-col items-center gap-8 w-full">
        <div class="flex flex-col gap-6 w-full">
          <!-- Username/Email field with validation -->
          <Field v-slot="{ field, errorMessage }" name="username">
            <div class="flex flex-col">
              <!-- Input with icon prefix -->
              <IconField>
                <InputIcon class="pi pi-user !text-white/70" />
                <InputText
                  id="username"
                  type="text"
                  class="!appearance-none !border !border-white/10 !w-full !outline-0 !bg-white/10 !text-white placeholder:!text-white/70 !shadow-sm"
                  fluid
                  placeholder="jean.dupont@email.fr"
                  v-bind="field"
                  aria-label="adresse email"
                  :invalid="!!errorMessage"
                />
              </IconField>
              <!-- Error message display -->
              <Message
                v-show="errorMessage"
                class="text-xs mt-2"
                severity="error"
              >
                {{ errorMessage }}
              </Message>
            </div>
          </Field>

          <!-- Password field with validation and toggle mask -->
          <Field v-slot="{ field, errorMessage }" name="password">
            <div class="flex flex-col">
              <!-- Input with icon prefix -->
              <IconField>
                <InputIcon class="pi pi-lock !text-white/70" />
                <Password
                  v-bind="field"
                  fluid
                  :feedback="false"
                  input-id="password"
                  toggle-mask
                  placeholder="Password"
                  class="p-password-custom"
                  :pt="{
                    root: { class: '!w-full' },
                    input: {
                      class:
                        '!appearance-none !border !border-white/10 !w-full !outline-0 !bg-white/10 !text-white placeholder:!text-white/70 !shadow-sm !h-full',
                    },
                    panel: { class: '!hidden' },
                    hideIcon: { class: '!text-white/70' },
                    showIcon: { class: '!text-white/70' },
                  }"
                />
              </IconField>
              <!-- Error message display -->
              <Message
                v-show="errorMessage"
                class="text-xs mt-2"
                severity="error"
              >
                {{ errorMessage }}
              </Message>
            </div>
          </Field>
        </div>

        <!-- Login button with loading state -->
        <Button
          type="submit"
          :loading="isLoading"
          :label="t('loginForm.login')"
          class="!w-full !bg-surface-950 !border !border-surface-950 !text-white hover:!bg-surface-950/80"
        />
      </div>
    </div>
  </Form>
</template>

<style scoped>
/**
 * Custom styles for password input to override PrimeVue defaults
 * These styles ensure consistent theming with our glassmorphic design
 */

/* Make the password component full width */
:deep(.p-password-custom) {
  width: 100%;
}

/* Style the password input to match the glassmorphism theme */
:deep(.p-password-custom .p-password-input) {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(255, 255, 255, 0.1) !important;
  color: white !important;
  width: 100% !important;
}

/* Hide the password strength panel which is not needed */
:deep(.p-password-custom .p-password-panel) {
  display: none !important;
}

/* Style the show/hide password icon */
:deep(.p-password-custom .p-password-icon) {
  color: rgba(255, 255, 255, 0.7) !important;
}
</style>
