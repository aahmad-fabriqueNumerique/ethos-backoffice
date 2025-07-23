<script setup lang="ts">
/**
 * Events List Page
 *
 * This page displays a paginated table of all events in the system.
 * It allows sorting, server-side pagination, and includes a function
 * to clean up past events from the database.
 *
 * Features:
 * - Server-side pagination and sorting of events
 * - Clean view of event details in tabular format
 * - Action to delete past events from the database
 * - Date formatting for better readability
 * - Loading indicators during data fetching
 */

import type EventModel from "~/models/EventModel";
import type { Timestamp } from "firebase/firestore";

// Set page metadata for the Nuxt router and layout system
definePageMeta({
  title: "Évènements",
  layout: "home",
});

// Initialize internationalization helper for translations
const { t } = useI18n();

/**
 * Get the events cleanup functionality from the composable
 * This provides a method to delete past events from the database
 */
const {
  deleteOneEvent,
  cleanEvents,
  loading: massDeleting,
  visible,
} = useCleanEvents();

const eventToDelete = ref<EventModel | null>(null); // Event to delete

/**
 * Table column configuration
 * Defines the structure and behavior of the events table columns
 * - field: corresponds to the property name in the event objects
 * - header: display name for the column
 * - sortable: whether the column can be sorted
 */
const columns = [
  { field: "titre", header: t("events.table.headers.title"), sortable: true },
  { field: "type", header: t("events.table.headers.type"), sortable: true },
  { field: "ville", header: t("events.table.headers.city"), sortable: true },
  { field: "pays", header: t("events.table.headers.country"), sortable: true },
  {
    field: "dateDebut",
    header: t("events.table.headers.startDate"),
    sortable: true,
  },
];

/**
 * Initialize the Firestore paginator for events
 *
 * This paginator fetches data from the "events" collection with server-side
 * pagination and sorting capabilities
 *
 * @param {"events"} collection - Firestore collection name
 * @param {"titre"} defaultSortField - Default field to sort results by
 * @param {50} pageSize - Number of items to display per page
 */
const {
  result, // Array of retrieved events
  loading, // Loading state indicator
  pageEventHandler, // Handler for pagination events
  sortHandler, // Handler for column sorting events
  loadInitial, // Function to load the first page
  pagination, // Pagination state object
  pageCount, // Total number of pages
  getCacheStats, // ← Added for debug
} = useFirestorePaginator<EventModel>("events", "titre", 10);

const onDeleteEvent = (eventId: string) => {
  console.log("🗑️ Deleting event with ID:", eventId);

  eventToDelete.value =
    result.value.find((event) => event.id === eventId) ?? null;
  console.log("🔍 Found event to delete:", eventToDelete.value);

  visible.value = true;
};

console.log("📊 Initial events data:", result.value);

const onConfirm = async (eventId: string) => {
  const response = await deleteOneEvent(eventId);
  if (response.success) {
    loadInitial();
  }
};

/**
 * Handles mass cleanup of old events
 * After successful cleanup, reloads the events list to show updated data
 */
const handleCleanEvents = async () => {
  console.log("🧹 Starting mass cleanup...");
  const result = await cleanEvents();

  if (result?.success) {
    console.log(`🎉 Mass cleanup successful: ${result.deleted} events deleted`);
    // Reload the list to show the updated data
    await loadInitial();
  } else {
    console.log("❌ Mass cleanup failed or was cancelled");
  }
};

/**
 * Computed property that formats dates WITHOUT modifying original data
 * This preserves the original Timestamp objects for caching
 */
const formattedEvents = computed(() => {
  return result.value.map((event) => ({
    ...event,
    dateDebut: (event.dateDebut as Timestamp)
      .toDate()
      .toLocaleDateString("fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
  }));
});

// Debug logs
watchEffect(() => {
  console.log("🔍 Raw result:", result.value);
  console.log("🎨 Formatted events:", formattedEvents.value);
  console.log("📊 Cache stats:", getCacheStats());
});

/**
 * Load the initial events data when component is mounted
 */
onMounted(async () => {
  console.log("🚀 Loading initial events...");
  await loadInitial();
});
</script>

<template>
  <!-- Main container with responsive width and vertical spacing -->
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- 
      Header section with title and action button
      - Shows page title from translations
      - Contains a button to add new events 
    -->
    <ViewHeader :title="t('events.list')">
      <Button as="routerLink" size="small" variant="outlined" to="/new-event">
        {{ t("events.addData") }}
      </Button>
    </ViewHeader>

    <!-- 
      Events data table
      - Displays event data with the defined columns
      - Supports server-side sorting and pagination
      - Shows loading state during data fetching
    -->
    <DataTable
      :value="formattedEvents"
      :loading="loading"
      data-key="id"
      :lazy="true"
      :rows="pagination.pageSize"
      :first="pagination.currentPage * pagination.pageSize"
      :paginator="pagination.totalItems > 0"
      :total-records="pagination.totalItems"
      :paginator-template="'PrevPageLink CurrentPageReport NextPageLink RowsPerPageDropdown'"
      :rows-per-page-options="[10, 20, 50]"
      :current-page-report-template="`${
        pagination.currentPage + 1
      } / ${pageCount}`"
      class="text-xs"
      @page="pageEventHandler"
      @sort="sortHandler"
    >
      <!-- Custom start template for the paginator showing total event count -->
      <template #paginatorstart>
        <span class="flex text-xs items-center gap-x-2 font-bold">
          {{ t("events.totalItems", pagination.totalItems) }}
        </span>
      </template>

      <!-- Dynamic columns based on the columns array configuration -->
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
        :header="t('events.table.headers.actions')"
        :exportable="false"
        class="text-xs text-primary-500"
      >
        <template #body="slotProps">
          <span class="flex items-center gap-x-4">
            <!-- Bouton de navigation vers les détails -->
            <Button
              v-tooltip.bottom="t('events.tooltips.update')"
              as="router-link"
              :to="`/events/${slotProps.data.id}`"
              icon="pi pi-pen-to-square"
              rounded
              variant="outlined"
              text
              aria-label="Détails du dossier administratif"
            />
            <!-- Bouton de suppression -->
            <Button
              v-tooltip.bottom="t('events.tooltips.delete')"
              :disabled="loading"
              :icon="
                loading
                  ? 'pi pi-spinner animate-spin text-primary-500'
                  : 'pi pi-trash'
              "
              severity="danger"
              rounded
              variant="outlined"
              text
              aria-label="Supprimer"
              @click="onDeleteEvent(slotProps.data.id)"
            />
          </span>
        </template>
      </Column>

      <template #empty>
        <div class="text-center p-4">
          <i class="pi pi-info-circle text-warn text-xl mb-2" />
          <p>{{ t("events.empty") }}</p>
        </div>
      </template>
    </DataTable>

    <!-- 
      Clean events action section
      - Contains a warning-styled button to delete past events
      - Triggers the cleanEvents function from the useCleanEvents composable
    -->
    <div class="flex justify-start">
      <Button
        label="Supprimer les évènements passés"
        size="small"
        :loading="massDeleting"
        :disabled="massDeleting"
        variant="outlined"
        severity="warn"
        icon="pi pi-trash"
        @click="handleCleanEvents"
      />
    </div>
    <EventDialogDelete
      v-if="eventToDelete && visible"
      :visible="visible"
      :loading="massDeleting"
      :titre="eventToDelete?.titre"
      :date-debut="eventToDelete?.dateDebut instanceof Date ? eventToDelete.dateDebut : (eventToDelete?.dateDebut as Timestamp)?.toDate()"
      :date-fin="eventToDelete?.dateFin instanceof Date ? eventToDelete.dateFin : (eventToDelete?.dateFin as Timestamp)?.toDate()"
      @set-visible="visible = false"
      @delete-event="onConfirm(eventToDelete.id)"
    />
  </main>
</template>
