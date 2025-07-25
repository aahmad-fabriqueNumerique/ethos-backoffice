<script setup lang="ts">
/**
 * SelectWithTranslation Component
 *
 * A reusable select dropdown component that integrates with:
 * - i18n for multilingual support
 * - vee-validate for form validation
 * - PrimeVue Select component for UI
 *
 * This component displays a dropdown with translated options and
 * shows validation errors using the appropriate translation keys.
 *
 * @component
 */
import { Field } from "vee-validate";
import type SelectType from "~/models/SelectType";

// Access translation utility from i18n
const { t } = useI18n();

/**
 * Component properties
 *
 * @property {SelectType[]} options - Array of selectable options (must include a 'nom' field)
 * @property {string} name - Form field name (used for validation)
 * @property {string} placeholder - Placeholder text shown when no option is selected
 * @property {string} label - Label text displayed above the select
 * @property {string} description - Description used for accessibility (aria-label)
 * @property {string} category - Translation category prefix for error messages
 */
const { options, name, placeholder, description, category } = defineProps<{
  options: SelectType[];
  name: string;
  placeholder: string;
  label: string;
  description: string;
  category: string;
}>();

onMounted(() => {
  // Ensure options are not empty
  console.log("Select options:", options);
});
</script>

<template>
  <!-- Field wrapper from vee-validate for form integration -->
  <Field
    v-slot="{ field, errorMessage, handleChange, handleBlur }"
    :name="name"
  >
    <!-- Input label -->
    <label :for="name">{{ label }}</label>

    <div class="w-full flex gap-x-2 items-center">
      <!-- PrimeVue Select component with validation integration -->
      <Select
        :id="name"
        :model-value="field.value"
        :options="options"
        option-label="nom"
        :option-value="name === 'type' ? 'slug' : 'nom'"
        class="w-full"
        :aria-label="description"
        :name="name"
        :placeholder="placeholder"
        :class="{ 'p-invalid': !!errorMessage }"
        @update:model-value="
          (val) => {
            field.value = val;
            handleChange(val);
          }
        "
        @blur="handleBlur"
      />
      <slot />
    </div>

    <!-- Error message with translation -->
    <Message v-if="errorMessage" class="text-xs text-error" severity="error">
      {{ t(`${category}.errors.${errorMessage}`) }}
    </Message>
  </Field>
</template>
