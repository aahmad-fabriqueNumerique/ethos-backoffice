<script setup lang="ts">
import type { DataTablePageEvent, DataTableSortEvent } from "primevue";
import type UserItem from "~/models/UserItem";

const {
  activating,
  result,
  loading,
  pagination,
  pageCount,
  sortHandler,
  pageEventHandler,
  selectedUsers,
} = defineProps<{
  selectedUsers: UserItem[];
  activating: boolean;
  result: UserItem[];
  loading: boolean;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
  pageCount: number;
  sortHandler: (event: DataTableSortEvent) => void;
  pageEventHandler: (event: DataTablePageEvent) => void;
}>();
const emit = defineEmits<{
  (e: "updateSelectedUsers" | "submitUsers", users: UserItem[]): void;
}>();

const { t } = useI18n();

const columns = [
  { field: "email", header: t("users.headers.email"), sortable: true },
  { field: "role", header: t("users.headers.role"), sortable: true },
];
</script>

<template>
  <div class="flex flex-col gap-y-4">
    <DataTable
      :selection="selectedUsers"
      :value="result"
      :loading="loading"
      data-key="id"
      :lazy="true"
      :rows="pagination.pageSize"
      :first="pagination.currentPage * pagination.pageSize"
      :paginator="pagination.totalItems > 0"
      :total-records="pagination.totalItems"
      :paginator-template="'PrevPageLink CurrentPageReport NextPageLink RowsPerPageDropdown'"
      :rows-per-page-options="[1, 5, 10, 20, 50]"
      :current-page-report-template="`${
        pagination.currentPage + 1
      } / ${pageCount}`"
      class="text-xs"
      @update:selection="emit('updateSelectedUsers', $event)"
      @page="pageEventHandler"
      @sort="sortHandler"
      ><Column selection-mode="multiple" header-style="width: 3rem" />
      <!-- Custom start template for the paginator -->
      <template #paginatorstart>
        <span class="flex text-xs items-center gap-x-2 font-bold">
          {{ t("users.waitingList.totalItems", pagination.totalItems) }}
        </span>
      </template>

      <!-- Dynamic columns based on the columns array -->
      <Column
        v-for="col in columns"
        :key="col.field"
        class="text-xs"
        :field="col.field"
        :sortable="col.sortable"
        :style="{ width: '25%' }"
      >
        <!-- Custom header template with styling -->
        <template #header>
          <div class="text-xs font-bold text-primary-500">
            {{ col.header }}
          </div>
        </template>
      </Column>

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
              :disabled="activating"
              :loading="activating"
              size="small"
              icon="pi pi-user-edit"
              label="Valider"
              rounded
              variant="outlined"
              :aria-label="t('users.actions.edit')"
              @click="emit('submitUsers', [slotProps.data])"
            />
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center p-4">
          <i class="pi pi-info-circle text-warn text-xl mb-2" />
          <p>{{ t("users.waitingList.noUser") }}</p>
        </div>
      </template>
    </DataTable>
  </div>
</template>
