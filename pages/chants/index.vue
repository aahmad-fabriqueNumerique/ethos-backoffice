<script setup lang="ts">
import type { Song, SongSummary } from "@/models/Song";
import { deleteDoc, doc, getFirestore } from "firebase/firestore";
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "home",
});
/**
 * SongsView Component
 *
 * This component displays a paginated table of songs from Firestore database.
 * It uses the useFirestorePaginator composable to handle data fetching,
 * pagination, and sorting capabilities.
 *
 * @component
 * @example
 * <SongsView />
 */

const { t } = useI18n();

/**
 * Column configuration for the DataTable
 * Each column has a field (property name in data object),
 * header (display name), and optional sortable flag
 */
const columns = [
  { field: "titre", header: t("songs.headers.title"), sortable: true },
  { field: "auteur", header: t("songs.headers.author"), sortable: true },
  { field: "pays", header: t("songs.headers.country"), sortable: true },
  { field: "langue", header: t("songs.headers.language"), sortable: true },
];

/**
 * Initialize the Firestore paginator with the collection name,
 * default sort field, and page size
 */
const {
  result, // Array of retrieved documents
  loading, // Loading state indicator
  pageEventHandler, // Handler for pagination events
  sortHandler, // Handler for column sorting events
  loadInitial, // Function to load the first page
  pagination, // Pagination state object
  pageCount, // Total number of pages
} = useFirestorePaginator<SongSummary>("chants", "titre", 10);

/**
 * Load the initial data when component is mounted
 */
onMounted(() => {
  loadInitial();
});

const songToDelete = ref<Song | null>(null);

const visible = ref(false);

const deleteOneSong = async () => {
  loading.value = true;
  // Call the Firestore delete function with the song ID
  const db = getFirestore();
  if (songToDelete.value) {
    await deleteDoc(doc(db, "chants", songToDelete.value.id));
    clearAllCache();
    // Reload the data after deletion
    loadInitial();
    visible.value = false;
    songToDelete.value = null;
  }
  loading.value = false;
};

watchEffect(() => {
  if (songToDelete.value) console.log({ songToDelete });
  else console.log("dans le cul lulu");
});
</script>

<template>
  <!-- Main container with responsive width -->

  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- Header section with title and navigation buttons -->
    <ViewHeader
      :title="t('songs.pageTitle')"
      :label="t('songs.addSong')"
      url="/home/new"
    >
      <span class="flex items-center gap-x-2">
        <Button
          v-tooltip.bottom="t('songs.tooltips.addSong')"
          as="routerLink"
          variant="outlined"
          size="small"
          to="/new-song"
        >
          {{ t("songs.addSong") }}
        </Button>
        <Button
          v-tooltip.bottom="t('songs.tooltips.addSongs')"
          as="routerLink"
          variant="outlined"
          size="small"
          to="/new-songs"
          severity="secondary"
        >
          {{ t("songs.addSongs") }}
        </Button>
      </span>
    </ViewHeader>

    <!--
        DataTable component with lazy loading support
        - Lazy loading means data is fetched on demand when pagination/sorting changes
        - Pagination is controlled via the pagination object from useFirestorePaginator
        - Custom templates are used for headers and pagination controls
      -->
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
      :rows-per-page-options="[10, 20, 50]"
      :current-page-report-template="`${
        pagination.currentPage + 1
      } / ${pageCount}`"
      class="text-xs"
      @page="pageEventHandler"
      @sort="sortHandler"
    >
      <!-- Custom start template for the paginator -->
      <template #paginatorstart>
        <span class="flex text-xs items-center gap-x-2 font-bold">
          {{ t("songs.totalSongs", pagination.totalItems) }}
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
        :header="t('events.table.headers.actions')"
        :exportable="false"
        class="text-xs text-primary-500"
      >
        <template #body="slotProps">
          <span class="flex items-center gap-x-4">
            <!-- Bouton de navigation vers les détails -->
            <Button
              v-tooltip.bottom="t('songs.tooltips.actions.update')"
              as="router-link"
              :to="`/new-song/${slotProps.data.id}`"
              icon="pi pi-pen-to-square"
              rounded
              variant="outlined"
              text
              aria-label="Détails du dossier administratif"
            />
            <!-- Bouton de suppression -->
            <Button
              v-tooltip.bottom="t('songs.tooltips.actions.delete')"
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
              @click="
                console.log(slotProps.data);
                songToDelete = slotProps.data;
                visible = true;
              "
            />
          </span>
        </template>
      </Column>
      <template #empty>
        <div class="text-center p-4">
          <i class="pi pi-info-circle text-warn text-xl mb-2" />
          <p>{{ t("songs.empty") }}</p>
        </div>
      </template>
    </DataTable>
    <SongDialogDelete
      v-if="songToDelete && visible"
      :titre="songToDelete?.titre"
      :loading="loading"
      :visible="visible"
      @set-visible="visible = false"
      @delete-song="deleteOneSong"
    />
  </main>
</template>
