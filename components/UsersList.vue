<script setup lang="ts">
/**
 * Users List Component
 *
 * This component displays a data table of users with their information and action buttons.
 * It allows viewing user details and provides actions such as editing and deleting users.
 *
 * The component is designed to work with the useUsersView composable and
 * integrates with PrimeVue DataTable for displaying user information.
 */

/**
 * Component props
 * @property {UserList[]} users - Array of user objects to display in the table
 * @property {boolean} loading - Whether the data is currently being loaded
 * @property {object[]} columns - Configuration for table columns (field and header properties)
 */
const { users, loading, columns } = defineProps<{
  users: UserList[];
  loading: boolean;
  columns: { field: string; header: string }[];
}>();

/**
 * Event emitters
 * - setDialogVisible: Emitted when a user clicks the edit button, passes the user ID
 *   This typically triggers the display of an edit dialog in the parent component
 */
const emit = defineEmits<{
  (e: "setDialogVisible", uid: string): void;
  (e: "setUserToDelete", user: UserList): void;
  (e: "refreshUsers"): void;
}>();

// Initialize internationalization helper for translations
const { t } = useI18n();
</script>

<template>
  <!-- 
    User data table component
    - Displays user information in a structured format
    - Shows loading state when fetching data
    - Configures columns based on the columns array prop
  -->
  <DataTable :value="users" :columns="columns" :loading="loading">
    <!-- Dynamic columns generated from the columns configuration -->
    <Column
      v-for="col in columns"
      :key="col.field"
      class="text-xs"
      :field="col.field"
      :style="{ width: '25%' }"
    >
      <!-- Custom header template for styling column headers -->
      <template #header>
        <div class="text-xs font-bold text-primary-500">
          {{ col.header }}
        </div>
      </template>
    </Column>

    <!-- 
      Actions column with user management buttons
      - Not included in export functionality
      - Contains edit and delete user actions
    -->
    <Column
      :header="t('users.headers.actions')"
      :exportable="false"
      class="text-xs font-bold text-primary-500"
    >
      <template #body="slotProps">
        <span class="flex items-center gap-x-4">
          <!-- 
            Edit user button
            - Displays a tooltip when hovered
            - When clicked, emits setDialogVisible event with the user ID
            - Uses an outlined, rounded button with edit icon
          -->
          <Button
            v-tooltip.bottom="t('users.actions.edit')"
            icon="pi pi-user-edit"
            rounded
            variant="outlined"
            text
            :aria-label="t('users.actions.edit')"
            @click="emit('setDialogVisible', slotProps.data.uid)"
          />

          <!-- 
            Delete user button
            - Displays a tooltip when hovered
            - Currently only logs to console (implementation pending)
            - Disables the button during loading states
            - Shows a spinner icon when loading
            - Uses a danger-styled, outlined, rounded button with delete icon
          -->
          <Button
            v-tooltip.bottom="t('users.actions.delete')"
            :disabled="loading"
            :icon="loading ? 'pi pi-spinner animate-spin' : 'pi pi-trash'"
            severity="danger"
            rounded
            variant="outlined"
            text
            :aria-label="t('users.actions.delete')"
            @click="emit('setUserToDelete', slotProps.data)"
          />
        </span>
      </template>
    </Column>
  </DataTable>
</template>
