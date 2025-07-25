<script setup lang="ts">
/**
 * @file DocumentUploadDialog.vue
 * @description Composant de dialogue pour téléverser des documents administratifs
 * @author [@CyrilPonsan](https://github.com/CyrilPonsan)
 */

const { t } = useI18n();

// Récupération des fonctions du composable
const { isLoading, isValid, onSubmit, onSelect, selectedFile } = useUploadCSV();

const handleSubmit = () => {
  onSubmit();
};
</script>

<template>
  <!-- Formulaire de téléversement -->
  <form class="flex flex-col gap-y-4" @submit.prevent="handleSubmit">
    <!-- Zone de téléversement de fichier -->
    <FileUpload
      name="file"
      :custom-upload="true"
      :multiple="false"
      accept="text/csv"
      :max-file-size="10000000"
      :preview-width="0"
      :choose-label="t('newSongs.buttons.selectFile')"
      :show-upload-button="false"
      :show-cancel-button="false"
      :invalid-file-size-message="t('newSongs.fileErrors.size')"
      :invalid-file-type-message="t('newSongs.fileErrors.type')"
      @select="onSelect"
    >
      <!-- Affichage du fichier sélectionné -->
      <template #content="{ files, removeFileCallback }">
        <div v-if="files.length > 0" class="flex items-center gap-x-2">
          <span class="truncate flex-1">{{ files[0].name }}</span>
          <Button
            icon="pi pi-times"
            text
            rounded
            severity="danger"
            aria-label="Supprimer le fichier"
            @click="
              () => {
                selectedFile = null;
                removeFileCallback(0);
              }
            "
          />
        </div>
      </template>

      <!-- Message par défaut -->
      <template #empty>
        <div class="flex items-center justify-center flex-col">
          <i
            class="pi pi-cloud-upload !border-2 !rounded-full !p-8 !text-4xl !text-muted-color"
          />
          <p class="mt-6 mb-0">{{ t("newSongs.instructions") }}</p>
        </div>
      </template>
    </FileUpload>

    <!-- Boutons d'action -->
    <span class="w-full flex items-center gap-x-4">
      <Button
        class="w-full"
        :label="t('newSongs.buttons.upload')"
        type="submit"
        :disabled="!isValid"
        :loading="isLoading"
      />
    </span>
  </form>
</template>
