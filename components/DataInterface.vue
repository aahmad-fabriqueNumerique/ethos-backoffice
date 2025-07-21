<script setup lang="ts" generic="T">
import type { toTypedSchema } from "@vee-validate/zod";
import type { DataTablePageEvent, DataTableSortEvent } from "primevue";
import { onMounted, watchEffect } from "vue";
import { useI18n } from "vue-i18n";

type Data = { id: string };

type Props<T> = {
  traductionKey: string;
  columns: Array<{ field: string; header: string; sortable?: boolean }>;
  schema: ReturnType<typeof toTypedSchema>;
  result: Array<Data & T>;
  loading: boolean;
  pageEventHandler: (event: DataTablePageEvent) => void;
  sortHandler: (event: DataTableSortEvent) => void;
  loadInitial: () => void;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
  };
  pageCount: number;
  showForm: boolean;
  handleFormToggle: () => void;
};

const {
  traductionKey,
  columns,
  result,
  loading,
  pageEventHandler,
  sortHandler,
  loadInitial,
  pagination,
  pageCount,
  showForm,
} = defineProps<Props<T>>();

const { t } = useI18n();

watchEffect(() => {
  // Watch for changes in the result array and log them
  console.log("Page Count:", pageCount);
});

/**
 * Load the initial data when component is mounted
 * This ensures the table has data when the component is first displayed
 */
onMounted(() => {
  loadInitial();
});
</script>

<template>
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- Page header with title and action button -->
    <ViewHeader :title="t(`${traductionKey}.list`)">
      <Button
        :label="
          !showForm
            ? t(`${traductionKey}.addData`)
            : t(`${traductionKey}.hideForm`)
        "
        variant="outlined"
        size="small"
        @click="handleFormToggle"
      />
    </ViewHeader>

    <slot />

    <!-- Data table for displaying theme records with pagination and sorting -->
    <DataTable
      :value="result"
      :loading="loading"
      data-key="id"
      :lazy="true"
      :rows="pagination.pageSize"
      :first="pagination.currentPage * pagination.pageSize"
      :paginator="true"
      :total-records="pagination.totalItems"
      :paginator-template="'PrevPageLink CurrentPageReport NextPageLink RowsPerPageDropdown'"
      :rows-per-page-options="[1, 5, 10, 20, 50]"
      :current-page-report-template="`${
        pagination.currentPage + 1
      } / ${pageCount}`"
      class="text-xs"
      @page="pageEventHandler as unknown as DataTablePageEvent"
      @sort="sortHandler"
    >
      <!-- Custom start template for the paginator - displays total count -->
      <template #paginatorstart>
        <span class="flex text-xs items-center gap-x-2 font-bold">
          {{ t(`${traductionKey}.totalItems`, pagination.totalItems) }}
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
        <template #header>
          <div class="text-xs font-bold text-primary-500">
            {{ col.header }}
          </div>
        </template>
      </Column>
    </DataTable>
  </main>
</template>
