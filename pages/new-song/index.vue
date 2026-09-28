<script setup lang="ts">
/**
 * New Song View Component
 *
 * This component provides a comprehensive form interface for adding new songs to the database.
 * Features include:
 * - Validation using vee-validate and Zod
 * - Responsive grid layout for optimal display across devices
 * - Dynamic interpreter fields management
 * - Integration with Firestore database
 * - Multiple field types (text, select, textarea, checkbox)
 * - Full internationalization support
 *
 * @component NewSongView
 */

import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";
import { useI18n } from "vue-i18n";
import DialogAddNewEntry from "~/components/DialogAddNewEntry.vue";
import type { SongCreate } from "~/models/Song";

definePageMeta({
  layout: "home",
  title: "Nouveau chant",
});

// Initialize i18n for translations
const { t } = useI18n();
// Router for navigation after form actions
const router = useRouter();

/**
 * Dynamic array for managing multiple interpreter fields
 * Starts with one empty field by default
 */
const interpretesList = ref([""]);

/**
 * Adds a new empty interpreter field to the list
 * Called when user clicks the "Add interpreter" button
 */
const addInterprete = () => {
  interpretesList.value.push("");
};

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

/**
 * Removes an interpreter field at the specified index
 * Won't remove the last remaining field to ensure at least one is available
 *
 * @param {number} index - The array index of the interpreter to remove
 */
const removeInterprete = (index: number) => {
  interpretesList.value.splice(index, 1);
};

const urlsList = ref([""]);

/**
 * Adds a new empty URL field to the list
 * Called when user clicks the "Add URL" button
 */
const addUrl = () => {
  urlsList.value.push("");
};

const removeUrl = (index: number) => {
  urlsList.value.splice(index, 1);
};

const urls_musiqueList = ref([""]);

/**
 * Adds a new empty music URL field to the list
 * Called when user clicks the "Add Music URL" button
 */
const addUrlMusique = () => {
  urls_musiqueList.value.push("");
};

const removeUrlMusique = (index: number) => {
  urls_musiqueList.value.splice(index, 1);
};

/**
 * Form submission handler
 * Processes validated form data and passes it to the submission function
 *
 * @param {GenericObject} values - The validated form values
 */
const handleSubmit: SubmissionHandler<GenericObject> = (
  values: GenericObject
) => {
  console.log("Form submitted with values:", values);
  onSubmit(values as SongCreate);
};

/**
 * Form cancellation handler
 * Resets the interpreter fields and navigates back to the songs list
 */
const handleCancel = () => {
  interpretesList.value = [""]; // Reset to one empty interpreter field
  urlsList.value = [""]; // Reset to one empty URL field
  urls_musiqueList.value = [""]; // Reset to one empty Music URL field
  router.replace({ name: "chants" }); // Navigate back to songs list
};

const newDataType = ref<DataKey | null>(null); // Type of data to add in the dialog
</script>

<template>
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- Header section with title and action button -->
    <ViewHeader :title="t('newSong.addSong')" url="/home/new" />

    <Form
      class="flex flex-col gap-y-8"
      :validation-schema="newSongFormSchema"
      :is-loading="isLoading"
      @submit="handleSubmit"
      @reset="handleCancel"
      @invalid-submit="(errors) => console.log('Validation failed:', errors)"
    >
      <!-- Basic Information -->
      <div class="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Title field -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="titre">
            <label for="titre">{{ t("newSong.labels.title") }} *</label>
            <InputText
              id="titre"
              fluid
              v-bind="field"
              name="titre"
              aria-label="titre"
              :placeholder="t('newSong.placeholders.title')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Author field -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="auteur">
            <label for="auteur">{{ t("newSong.labels.author") }}</label>
            <InputText
              id="auteur"
              fluid
              v-bind="field"
              name="auteur"
              aria-label="auteur"
              :placeholder="t('newSong.placeholders.author')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Composer field -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="compositeur">
            <label for="compositeur">{{ t("newSong.labels.composer") }}</label>
            <InputText
              id="compositeur"
              fluid
              v-bind="field"
              name="compositeur"
              aria-label="compositeur"
              :placeholder="t('newSong.placeholders.composer')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Country field -->
        <span class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="countries"
            name="pays"
            :label="t('newSong.labels.country') + ' *'"
            :placeholder="t('newSong.placeholders.country')"
            description="Pays d'origine"
            category="songs"
          >
            <Button
              v-tooltip.bottom="t('newData.dialog.tooltips.countries')"
              type="button"
              icon="pi pi-plus"
              @click="newDataType = 'countries'"
            />
          </SelectWithTranslation>
        </span>

        <!-- Region field -->
        <span class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="regions"
            name="region"
            :label="t('newSong.labels.region') + ' *'"
            :placeholder="t('newSong.placeholders.region')"
            description="Région d'origine"
            category="songs"
          >
            <Button
              v-tooltip.bottom="t('newData.dialog.tooltips.regions')"
              type="button"
              icon="pi pi-plus"
              @click="newDataType = 'regions'"
          /></SelectWithTranslation>
        </span>

        <!-- Language field -->
        <span class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="languages"
            name="langue"
            :label="t('newSong.labels.language') + ' *'"
            :placeholder="t('newSong.placeholders.language')"
            description="langue du chant"
            category="songs"
          />
        </span>

        <!-- Song type field (optional) -->
        <span class="flex flex-col gap-y-2">
          <MultiSelectWithTranslation
            id="type_de_chanson"
            :options="songTypes"
            name="type_de_chanson"
            description="type de chanson"
            :label="t('newSong.labels.songType')"
            :placeholder="t('newSong.placeholders.songType')"
            category="songs"
          />
        </span>

        <!-- Album field (optional) -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="album">
            <label for="album">{{ t("newSong.labels.album") }}</label>
            <InputText
              id="album"
              fluid
              v-bind="field"
              name="album"
              aria-label="album"
              :placeholder="t('newSong.placeholders.album')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Theme field -->
        <span class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="themes"
            name="theme"
            :label="t('newSong.labels.theme')"
            :placeholder="t('newSong.placeholders.theme')"
            description="Thème du chant"
            category="songs"
          />
        </span>
      </div>

      <!-- Interpreters section (array) -->
      <div class="w-full">
        <h2 class="text-lg mb-2">{{ t("newSong.labels.interpreters") }}</h2>
        <div
          v-for="(_, index) in interpretesList"
          :key="index"
          class="flex items-end gap-2 mb-2"
        >
          <Field
            v-slot="{ field, errorMessage }"
            :name="`interpretes[${index}]`"
            class="flex-1"
          >
            <span class="flex flex-col gap-y-2 w-full">
              <label :for="`interprete-${index}`"
                >{{ t("newSong.labels.interpreter") }} {{ index + 1 }}</label
              >
              <InputText
                :id="`interprete-${index}`"
                fluid
                v-bind="field"
                :invalid="!!errorMessage"
                :placeholder="t('newSong.placeholders.author')"
              />
              <!-- Error message display -->
              <Message
                v-if="
                  errorMessage !== undefined &&
                  field.value &&
                  field.value.trim() !== ''
                "
                class="text-xs text-error"
                severity="error"
              >
                {{ t(`songs.errors.${errorMessage}`) }}
              </Message>
            </span>
          </Field>
          <Button
            v-if="interpretesList.length > 1"
            type="button"
            icon="pi pi-times"
            class="p-button-rounded p-button-danger p-button-sm"
            @click="removeInterprete(index)"
          />
        </div>
        <Button
          type="button"
          icon="pi pi-plus"
          :label="t('newSong.addInterpreter')"
          class="mt-2"
          @click="addInterprete"
        />
      </div>

      <!-- Longer text fields -->
      <div class="w-full grid grid-cols-1 gap-4">
        <!-- Lyrics field -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="paroles">
            <label for="paroles">{{ t("newSong.labels.lyrics") }} *</label>
            <Textarea
              id="paroles"
              fluid
              v-bind="field"
              rows="6"
              name="paroles"
              aria-label="paroles"
              :placeholder="t('newSong.placeholders.lyrics')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Historical context field (optional) -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="contexte_historique">
            <label for="contexte_historique">{{
              t("newSong.labels.context")
            }}</label>
            <Textarea
              id="contexte_historique"
              fluid
              v-bind="field"
              rows="4"
              name="contexte_historique"
              aria-label="contexte historique"
              :placeholder="t('newSong.placeholders.context')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>

        <!-- Description field (optional) -->
        <span class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="description">
            <label for="description">{{
              t("newSong.labels.description")
            }}</label>
            <Textarea
              id="description"
              fluid
              v-bind="field"
              rows="4"
              name="description"
              aria-label="description"
              :placeholder="t('newSong.placeholders.description')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display -->
            <Message
              v-if="errorMessage !== undefined"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`songs.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </span>
      </div>

      <!-- URL fields -->
      <div class="w-full">
        <h2 class="text-lg mb-2">{{ t("newSong.labels.url") }}</h2>
        <div
          v-for="(_, index) in urlsList"
          :key="index"
          class="flex items-end gap-2 mb-2"
        >
          <Field
            v-slot="{ field, errorMessage }"
            :name="`urls[${index}]`"
            class="flex-1"
          >
            <span class="flex flex-col gap-y-2 w-full">
              <label :for="`urls-${index}`"
                >{{ t("newSong.labels.url") }} {{ index + 1 }}</label
              >
              <InputText
                :id="`urls-${index}`"
                fluid
                v-bind="field"
                :invalid="!!errorMessage"
                :placeholder="t('newSong.placeholders.url')"
              />
              <!-- Error message display -->
              <Message
                v-if="
                  errorMessage !== undefined &&
                  field.value &&
                  field.value.trim() !== ''
                "
                class="text-xs text-error"
                severity="error"
              >
                {{ t(`songs.errors.${errorMessage}`) }}
              </Message>
            </span>
          </Field>
          <Button
            v-if="urlsList.length > 1"
            type="button"
            icon="pi pi-times"
            class="p-button-rounded p-button-danger p-button-sm"
            @click="removeUrl(index)"
          />
        </div>
        <Button type="button" icon="pi pi-plus" class="my-2" @click="addUrl" />
      </div>

      <!-- Music URLs field (optionnel) -->
      <div class="w-full">
        <h2 class="text-lg mb-2">{{ t("newSong.labels.musicUrl") }}</h2>
        <div
          v-for="(_, index) in urls_musiqueList"
          :key="index"
          class="flex items-end gap-2 mb-2"
        >
          <Field
            v-slot="{ field, errorMessage }"
            :name="`urls_musique[${index}]`"
            class="flex-1"
          >
            <span class="flex flex-col gap-y-2 w-full">
              <label :for="`urls_musique-${index}`"
                >{{ t("newSong.labels.url") }} {{ index + 1 }}</label
              >
              <InputText
                :id="`urls_musique-${index}`"
                fluid
                v-bind="field"
                :invalid="!!errorMessage"
                :placeholder="t('newSong.placeholders.musicUrl')"
              />
              <!-- Error message display -->
              <Message
                v-if="
                  errorMessage !== undefined &&
                  field.value &&
                  field.value.trim() !== ''
                "
                class="text-xs text-error"
                severity="error"
              >
                {{ t(`songs.errors.${errorMessage}`) }}
              </Message>
            </span>
          </Field>
          <Button
            v-if="urlsList.length > 1"
            type="button"
            icon="pi pi-times"
            class="p-button-rounded p-button-danger p-button-sm"
            @click="removeUrlMusique(index)"
          />
        </div>
        <Button
          type="button"
          icon="pi pi-plus"
          class="my-2"
          @click="addUrlMusique"
        />
      </div>

      <!-- Archived status -->
      <div class="w-full">
        <Field v-slot="{ field }" name="archived">
          <div class="flex items-center gap-2">
            <Checkbox v-bind="field" :binary="true" :input-id="'archived'" />
            <label for="archived">{{ t("newSong.labels.archived") }}</label>
          </div>
        </Field>
      </div>

      <!-- Form submission buttons -->
      <div class="flex justify-end gap-2">
        <Button
          type="button"
          :label="t('newSong.cancel')"
          variant="text"
          @click="onCancel"
        />
        <Button
          type="submit"
          :label="t('newSong.save')"
          :loading="isLoading"
          :disabled="isLoading"
        />
      </div>
    </Form>
    <DialogAddNewEntry
      v-if="!!newDataType"
      :type="newDataType!"
      :visible="!!newDataType"
      @set-visible="newDataType = null"
    />
  </main>
</template>
