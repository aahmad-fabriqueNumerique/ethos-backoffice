<script setup lang="ts">
import { Field } from "vee-validate";
import type SelectType from "~/models/SelectType";

const { options, name, placeholder, description, category } = defineProps<{
  options: SelectType[];
  name: string;
  placeholder: string;
  label: string;
  description: string;
  category: string;
}>();

const { t } = useI18n();
</script>

<template>
  <Field v-slot="{ field, errorMessage, handleChange }" :name="name">
    <label :for="name">{{ label }} *</label>
    <MultiSelect
      :id="name"
      :model-value="field.value"
      :options="options"
      option-label="nom"
      option-value="nom"
      class="w-full"
      :show-toggle-all="false"
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
    />

    <Message v-if="errorMessage" class="text-xs text-error" severity="error">
      {{ t(`${category}.errors.${errorMessage}`) }}
    </Message>
  </Field>
</template>
