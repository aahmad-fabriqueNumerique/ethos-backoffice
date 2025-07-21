<script setup lang="ts">
import type UserItem from "~/models/UserItem";

const { tabIndex, displayIconsGroup, selectedUsers } = defineProps<{
  tabIndex: string;
  displayIconsGroup: boolean;
  selectedUsers: UserItem[];
}>();

const emit = defineEmits<{
  (e: "refreshUsers" | "loadInitial"): void;
  (e: "submitUsers", users: UserItem[]): void;
}>();

const { t } = useI18n();
</script>

<template>
  <span
    class="flex items-center gap-x-2 border border-surface-500/30 rounded-full p-1"
  >
    <Button
      v-tooltip.bottom="t('users.tooltips.refresh')"
      size="small"
      icon="pi pi-refresh"
      variant="outlined"
      text
      rounded
      @click="emit(tabIndex === '0' ? 'refreshUsers' : 'loadInitial')"
    />
    <Button
      v-if="displayIconsGroup"
      v-tooltip.bottom="t('users.tooltips.activate')"
      size="small"
      icon="pi pi-check-circle"
      variant="outlined"
      text
      rounded
      @click="emit('submitUsers', selectedUsers)"
    />
  </span>
</template>
