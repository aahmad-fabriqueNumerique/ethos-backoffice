<script setup lang="ts">
import type { Song } from "~/models/Song";

const { t } = useI18n();

const { getSongDetails } = useNewSong();

const song = ref<Song | null>(null);

onMounted(async () => {
  const route = useRoute();
  const songId = route.params.songId as string;

  const songData = await getSongDetails(songId);
  song.value = songData;
});

/**
 * Get form management assets from the song creation composable:
 * - onSubmit: Function to handle form submission
 * - newSongFormSchema: Validation schema for the form
 * - isLoading: Loading state indicator
 * - regions: Available regions for selection
 */
const {
  onCancel,
  onSubmit,
  newSongFormSchema,
  isLoading,
  regions,
  languages,
  songTypes,
  themes,
  countries,
} = useNewSong();
</script>

<template>
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <ViewHeader :title="t('updateSong.pageTitle')">
      <Button
        v-tooltip.bottom="t('updateSong.tooltips.backToSongs')"
        as="routerLink"
        variant="outlined"
        size="small"
        to="/chants"
      >
        {{ t("updateSong.buttons.backToSongs") }}
      </Button>
    </ViewHeader>

    <SongForm
      v-if="song"
      :song-details="song"
      :new-song-form-schema="newSongFormSchema"
      :is-loading="isLoading"
      :regions="regions"
      :languages="languages"
      :song-types="songTypes"
      :themes="themes"
      :countries="countries"
      @submit="onSubmit"
      @cancel="onCancel"
    />
  </main>
</template>
