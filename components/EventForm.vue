<script setup lang="ts">
/**
 * Event Form Component
 *
 * A comprehensive form component for creating and editing events with full validation support.
 * This component integrates with VeeValidate for form validation and includes
 * advanced features like dynamic arrays for participants and social links,
 * address autocomplete integration, and proper TypeScript typing.
 *
 * Key Features:
 * - Form validation with VeeValidate and Zod schema
 * - Address autocomplete with French API integration
 * - Dynamic fields for participants and social networks
 * - File upload for event images
 * - Internationalization support with Vue I18n
 * - TypeScript support with proper type safety
 * - Responsive design with Tailwind CSS
 * - Date/time picker with locale support
 * - Loading states and error handling
 * - Data sanitization and transformation
 *
 * Props:
 * - isLoading: Boolean indicating form submission state
 * - newEventFormSchema: Zod validation schema for form validation
 * - onSubmit: Function to handle form submission
 * - eventTypes: Array of available event types for selection
 * - countries: Array of available countries for selection
 * - initialData: Optional initial data for editing existing events
 *
 * Events:
 * - cancel: Emitted when user cancels the form
 * - submit-newevent: Emitted when form is successfully submitted
 *   Payload: Omit<EventModel, "id"> - Complete event data without ID
 *
 * Dependencies:
 * - VeeValidate for form validation
 * - Vue I18n for internationalization
 * - Custom composables for event management
 * - APIAddress component for address selection
 * - PrimeVue components for UI elements
 *
 * @component EventForm
 * @example
 * <EventForm
 *   :is-loading="loading"
 *   :new-event-form-schema="validationSchema"
 *   :event-types="availableTypes"
 *   :countries="availableCountries"
 *   :initial-data="editingEvent"
 *   :on-submit="handleSubmit"
 *   @cancel="handleCancel"
 *   @submit-newevent="handleEventSubmission"
 * />
 *
 * @author GitHub Copilot
 * @version 1.0.0
 * @since 2025-01-18
 */

import type { EventUIModel } from "@/models/EventModel";
import type EventModel from "@/models/EventModel";
import {
  Field,
  Form,
  type GenericObject,
  type SubmissionHandler,
} from "vee-validate";
import type SelectType from "~/models/SelectType";

/**
 * Component Props Definition
 *
 * Defines the required properties that must be passed from parent components
 * to properly configure and control the form behavior.
 *
 * @interface ComponentProps
 */
const {
  isLoading, // Loading state for submit button and form interactions
  newEventFormSchema, // Validation schema for form fields
  onSubmit, // Submission handler function
  eventTypes, // Available event types for dropdown
  countries, // Available countries for dropdown
  initialData, // Optional data for editing existing events
} = defineProps<{
  /**
   * Loading state indicator
   *
   * Controls the loading spinner on form submission and prevents
   * multiple simultaneous form submissions.
   *
   * @type {boolean}
   * @required
   */
  isLoading: boolean;

  /**
   * Form validation schema
   *
   * Zod-based validation schema converted to VeeValidate format.
   * Provides runtime validation and TypeScript type inference.
   *
   * @type {ReturnType<typeof toTypedSchema>}
   * @required
   */
  newEventFormSchema: ReturnType<typeof toTypedSchema>;

  /**
   * Form submission handler
   *
   * Function called when form is successfully validated and submitted.
   * Receives the complete form data as parameter.
   *
   * @type {Function}
   * @param {Omit<EventModel, "id"> | EventModel} formValues - Form data
   * @required
   */
  onSubmit: (
    formValues: Omit<EventModel, "id"> | EventModel,
    image?: File | null
  ) => void;

  /**
   * Available event types
   *
   * Array of event type options for the type selection dropdown.
   * Each item should have label and value properties.
   *
   * @type {SelectType[]}
   * @required
   */
  eventTypes: SelectType[];

  /**
   * Available countries
   *
   * Array of country options for the country selection dropdown.
   * Each item should have label and value properties.
   *
   * @type {SelectType[]}
   * @required
   */
  countries: SelectType[];

  /**
   * Initial form data
   *
   * Optional event data for editing existing events. When provided,
   * the form will be pre-populated with this data.
   *
   * @type {EventUIModel | null}
   * @optional
   */
  initialData: EventUIModel | null;
}>();

// Initialize required composables and services
const { t } = useI18n(); // Internationalization for translated content
const toast = useToast(); // Toast notifications for user feedback

/**
 * Reactive reference for storing geographic coordinates
 *
 * Updated when user selects an address through the address autocomplete.
 * Used to store longitude and latitude for the event location.
 *
 * @type {Ref<{long: number, lat: number} | null>}
 */
const coordinates = ref<{ long: number; lat: number } | null>(null);
const image = ref<File | null>(null);

/**
 * Dynamic Social Links Array
 *
 * Reactive array managing social network links input fields.
 * Users can dynamically add/remove social media URLs.
 *
 * @type {Ref<string[]>}
 */
const socialLinks = ref<string[]>([""]);

/**
 * Dynamic Participants Array
 *
 * Reactive array managing participant name input fields.
 * Users can dynamically add/remove participant names.
 *
 * @type {Ref<string[]>}
 */
const participants = ref<string[]>([""]);

/**
 * Initial Data Change Watcher
 *
 * Watches for changes in the initialData prop and updates the dynamic arrays
 * accordingly. This ensures that when editing an existing event, the form
 * is properly populated with existing participants and social links.
 *
 * @watcher watchEffect
 */
watchEffect(() => {
  if (initialData) {
    console.log("🔄 Updating form from initialData:", initialData);

    // Update social links array from initial data
    if (
      Array.isArray(initialData.reseauxSociaux) &&
      initialData.reseauxSociaux.length > 0
    ) {
      socialLinks.value = [...initialData.reseauxSociaux];
    } else {
      // Ensure at least one empty field for new entries
      socialLinks.value = [""];
    }

    // Update participants array from initial data
    if (
      Array.isArray(initialData.participants) &&
      initialData.participants.length > 0
    ) {
      participants.value = [...initialData.participants];
    } else {
      // Ensure at least one empty field for new entries
      participants.value = [""];
    }
  }
});

/**
 * Formatted Initial Data Computed Property
 *
 * Transforms the raw initial data into a format suitable for form consumption.
 * Particularly important for date fields that need to be converted from
 * various formats (strings, timestamps) to JavaScript Date objects.
 *
 * @computed formattedInitialData
 * @returns {Object} Formatted data ready for form initialization
 */
const formattedInitialData = computed(() => {
  // Return empty object if no initial data provided
  if (!initialData) return {};

  return {
    ...initialData,
    // Convert start date to proper Date object for DatePicker component
    dateDebut:
      initialData.dateDebut instanceof Date
        ? initialData.dateDebut
        : initialData.dateDebut
        ? new Date(initialData.dateDebut)
        : null,
    // Convert end date to proper Date object for DatePicker component
    dateFin:
      initialData.dateFin instanceof Date
        ? initialData.dateFin
        : initialData.dateFin
        ? new Date(initialData.dateFin)
        : null,
  };
});

/**
 * Form Key Computed Property
 *
 * Generates a unique key for the Form component to force re-rendering
 * when the initial data changes. This ensures proper form reset and
 * data population when switching between different events for editing.
 *
 * @computed formKey
 * @returns {string|number} Unique identifier for form instance
 */
const formKey = computed(() => {
  return initialData?.id || Date.now();
});

/**
 * Social Link Management Functions
 *
 * Functions to dynamically manage the social links array,
 * allowing users to add and remove social media URL fields.
 */

/**
 * Add Social Link Field
 *
 * Adds a new empty social link input field to the form.
 * Called when user clicks the "Add Social Network" button.
 *
 * @function addSocialLink
 * @returns {void}
 */
const addSocialLink = () => {
  socialLinks.value.push("");
  console.log("➕ Added new social link field");
};

/**
 * Remove Social Link Field
 *
 * Removes a social link input field from the form at the specified index.
 * Prevents removal of the last remaining field to ensure at least one exists.
 *
 * @function removeSocialLink
 * @param {number} index - Index of the field to remove
 * @returns {void}
 */
const removeSocialLink = (index: number) => {
  // Prevent removal if it's the only field remaining
  if (socialLinks.value.length > 1) {
    socialLinks.value.splice(index, 1);
    console.log(`➖ Removed social link field at index ${index}`);
  }
};

/**
 * Participant Management Functions
 *
 * Functions to dynamically manage the participants array,
 * allowing users to add and remove participant name fields.
 */

/**
 * Add Participant Field
 *
 * Adds a new empty participant input field to the form.
 * Called when user clicks the "Add Participant" button.
 *
 * @function addParticipant
 * @returns {void}
 */
const addParticipant = () => {
  participants.value.push("");
  console.log("➕ Added new participant field");
};

/**
 * Remove Participant Field
 *
 * Removes a participant input field from the form at the specified index.
 * Prevents removal of the last remaining field to ensure at least one exists.
 *
 * @function removeParticipant
 * @param {number} index - Index of the field to remove
 * @returns {void}
 */
const removeParticipant = (index: number) => {
  // Prevent removal if it's the only field remaining
  if (participants.value.length > 1) {
    participants.value.splice(index, 1);
    console.log(`➖ Removed participant field at index ${index}`);
  }
};

/**
 * File Upload Management Functions
 *
 * Functions to handle file selection, validation, and management
 * for the event image upload functionality.
 */

/**
 * Handle File Selection Event
 *
 * Called when user selects a file through the FileUpload component.
 * Validates the file and stores it in the reactive image reference.
 *
 * @function onFileSelect
 * @param {Object} event - FileUpload select event containing selected files
 * @returns {void}
 */
const onFileSelect = (event: { files: File[] }) => {
  const files = event.files;

  if (files && files.length > 0) {
    const selectedFile = files[0];

    // Validate file type (ensure it's an image)
    if (selectedFile.type.startsWith("image/")) {
      image.value = selectedFile;
      console.log("📸 Image file selected:", selectedFile.name);
    } else {
      // Show error toast for invalid file type
      toast.add({
        severity: "error",
        summary: t("newEvent.errors.invalidFileType"),
        detail: t("newEvent.errors.imageRequired"),
        life: 5000,
      });
      console.warn("❌ Invalid file type selected:", selectedFile.type);
    }
  }
};

/**
 * Handle File Clear Event
 *
 * Called when user clears the selected file or uploads a new one.
 * Resets the image reference to null.
 *
 * @function onFileClear
 * @returns {void}
 */
const onFileClear = () => {
  image.value = null;
  console.log("🗑️ Image file cleared");
};

/**
 * Format File Size for Display
 *
 * Converts file size in bytes to a human-readable format.
 *
 * @function formatFileSize
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size string
 */
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

/**
 * Form Submission Handler
 *
 * Handles the form submission process with data validation, sanitization,
 * and transformation. This function is called when the form passes all
 * validation rules and the user submits the form.
 *
 * Process Flow:
 * 1. Log form submission for debugging
 * 2. Sanitize and filter dynamic arrays (participants, social links)
 * 3. Transform form values into EventModel structure
 * 4. Add geographic coordinates from address selection
 * 5. Preserve event ID if editing existing event
 * 6. Delegate to parent's submission handler
 * 7. Reset dynamic arrays to initial state
 *
 * @function handleSubmit
 * @param {GenericObject} values - Raw form values from VeeValidate
 * @returns {void}
 *
 * @example
 * ```typescript
 * // This function is automatically called by VeeValidate when form is submitted
 * // The values parameter contains all form field values
 * ```
 */
const handleSubmit: SubmissionHandler<GenericObject> = (
  values: GenericObject
) => {
  console.log("🚀 Form submitted with values:", values);
  console.log("🚀 socialLinks:", socialLinks.value);
  console.log("🚀 participants:", participants.value);

  // Step 1: Sanitize participants array
  // Filter out empty or whitespace-only entries
  const safeParticipants = Array.isArray(participants.value)
    ? participants.value.filter((p) => p && p.trim() !== "")
    : [];

  // Step 2: Sanitize social links array
  // Filter out empty or whitespace-only entries
  const safeSocialLinks = Array.isArray(socialLinks.value)
    ? socialLinks.value.filter((s) => s && s.trim() !== "")
    : [];

  // Step 3: Transform form values into EventModel structure
  let eventData = {
    ...values, // Spread all form field values
    // Add sanitized dynamic arrays
    participants: safeParticipants,
    reseauxSociaux: safeSocialLinks,
    // Include geographic coordinates from address selection
    longitude: coordinates.value?.long ?? 0,
    latitude: coordinates.value?.lat ?? 0,
  } as unknown as
    | (Omit<EventModel, "id"> & { image: File | null })
    | EventModel;

  // Step 4: Preserve ID if editing existing event
  if (initialData) {
    eventData = {
      ...eventData,
      id: initialData.id, // Preserve ID for update operations
    };
  }

  console.log("🎯 Final eventData:", eventData);

  // Step 5: Delegate to parent component's submission handler
  onSubmit(eventData, image.value);

  // Step 6: Reset dynamic arrays to initial state for next use
  socialLinks.value = [""];
  participants.value = [""];

  console.log("✅ Form submission completed, arrays reset");
};
</script>

<template>
  <!--
    Main Form Container
    
    Uses VeeValidate Form component with:
    - Unique key for proper re-rendering when editing different events
    - Validation schema for runtime validation
    - Initial values for editing existing events
    - Loading state management
    - Event handlers for submit/reset/invalid submission
  -->
  <Form
    :key="formKey"
    v-slot="{ setFieldValue }"
    class="flex flex-col gap-y-8"
    :validation-schema="newEventFormSchema"
    :is-loading="isLoading"
    :initial-values="formattedInitialData"
    @submit="handleSubmit"
    @invalid-submit="
      (errors) => {
        // Show toast notification when form has validation errors
        console.log(errors);

        toast.add({
          life: 3000,
          severity: 'error',
          summary: 'Des erreurs de validation ont été détectées',
          detail: 'Corrigez les données concernées et réessayez.',
        });
      }
    "
  >
    <!-- 
      Basic Information Section
      
      Contains essential event details like title, type, and description.
      Uses responsive grid layout for optimal display on different screen sizes.
    -->
    <div class="form-section">
      <h3 class="text-lg font-medium mb-4">{{ t("newEvent.basicInfo") }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Event Title Field -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="titre">
            <label for="titre">{{ t("newEvent.labels.titre") }} *</label>
            <InputText
              id="titre"
              fluid
              v-bind="field"
              :placeholder="t('newEvent.placeholders.title')"
              :invalid="!!errorMessage"
            />
            <!-- Error message display with internationalization -->
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- Event Type Selection -->
        <div class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="eventTypes"
            name="type"
            :label="t('newEvent.labels.type') + ' *'"
            :placeholder="t('newEvent.placeholders.type')"
            description="Thème du chant"
            category="newEvent"
          />
        </div>
      </div>

      <!-- Event Description Field -->
      <div class="flex flex-col gap-y-2 mt-4">
        <Field v-slot="{ field, errorMessage }" name="description">
          <label for="description"
            >{{ t("newEvent.labels.description") }} *</label
          >
          <Textarea
            id="description"
            v-bind="field"
            rows="5"
            :placeholder="t('newEvent.placeholders.description')"
            :invalid="!!errorMessage"
          />
          <Message
            v-if="errorMessage"
            class="text-xs text-error"
            severity="error"
          >
            {{ t(`newEvent.errors.${errorMessage}`) }}
          </Message>
        </Field>
      </div>
    </div>

    <!-- 
      Date and Time Section
      
      Contains start and end date/time pickers with proper locale support.
      Uses responsive grid layout for side-by-side display on larger screens.
    -->
    <div class="form-section">
      <h3 class="text-lg font-medium mb-4">{{ t("newEvent.dateTime") }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Start Date/Time Picker -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="dateDebut">
            <label for="dateDebut"
              >{{ t("newEvent.labels.startDate") }} *</label
            >

            <DatePicker
              id="dateDebut"
              :model-value="field.value"
              show-icon
              fluid
              :show-time="true"
              hour-format="24"
              date-format="dd/mm/yy"
              selection-mode="single"
              :show-button-bar="true"
              year-range="1900:2024"
              locale="fr"
              icon-display="input"
              :invalid="!!errorMessage"
              :placeholder="t('newEvent.placeholders.startDate')"
              @update:model-value="
                (value) => {
                  console.log('DatePicker dateDebut updated:', value);
                  setFieldValue('dateDebut', value);
                }
              "
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- End Date/Time Picker -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="dateFin">
            <label for="dateFin">{{ t("newEvent.labels.endDate") }} *</label>

            <DatePicker
              id="dateFin"
              :model-value="field.value"
              show-icon
              fluid
              :show-time="true"
              date-format="dd/mm/yy"
              hour-format="24"
              selection-mode="single"
              :show-button-bar="true"
              year-range="1900:2024"
              locale="fr"
              icon-display="input"
              :invalid="!!errorMessage"
              :placeholder="t('newEvent.placeholders.endDate')"
              @update:model-value="
                (value) => {
                  console.log('DatePicker dateFin updated:', value);
                  setFieldValue('dateFin', value);
                }
              "
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>
      </div>
    </div>

    <!-- 
      Location Section
      
      Contains address autocomplete functionality and related location fields.
      Integrates with French address API for accurate address completion.
    -->
    <div class="form-section">
      <h3 class="text-lg font-medium mb-4">{{ t("newEvent.location") }}</h3>

      <!-- Address Autocomplete Field -->
      <div class="flex flex-col gap-y-2">
        <Field v-slot="{ field, errorMessage }" name="adresse">
          <APIAddress
            :address="initialData?.adresse ?? ''"
            name="adresse"
            :label="t('newEvent.labels.address')"
            :placeholder="t('newEvent.placeholders.address')"
            @address-selected="
              (address) => {
                console.log('Selected address:', address);

                // Store coordinates for event location
                coordinates = {
                  long: address.coordinates[0] || 0,
                  lat: address.coordinates[1] || 0,
                };

                // Populate related form fields with address data
                setFieldValue('adresse', address.street);
                setFieldValue('ville', address.city);
                setFieldValue('codePostal', address.postalCode);
              }
            "
            @data-changed="
              (data) => {
                console.log('Address data changed:', data);
                setFieldValue('adresse', data);
              }
            "
          />

          <!-- Hidden field to store address value for form validation -->
          <InputText
            id="adresse"
            type="hidden"
            v-bind="field"
            @update:model-value="field.onChange"
          />
          <Message
            v-if="errorMessage"
            class="text-xs text-error mt-2"
            severity="error"
          >
            {{ t(`newEvent.errors.${errorMessage}`) }}
          </Message>
        </Field>
      </div>

      <!-- Location Details Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-center">
        <!-- Postal Code Field -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="codePostal">
            <label for="codePostal"
              >{{ t("newEvent.labels.postalCode") }} *</label
            >
            <InputText
              id="codePostal"
              fluid
              v-bind="field"
              :placeholder="t('newEvent.placeholders.postalCode')"
              :invalid="!!errorMessage"
              @update:model-value="field.onChange"
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- City Field -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="ville">
            <label for="ville">{{ t("newEvent.labels.city") }} *</label>
            <InputText
              id="ville"
              fluid
              v-bind="field"
              :placeholder="t('newEvent.placeholders.city')"
              :invalid="!!errorMessage"
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- Country Selection -->
        <div class="flex flex-col gap-y-2">
          <SelectWithTranslation
            :options="countries"
            name="pays"
            :label="t('newEvent.labels.country') + ' *'"
            :placeholder="t('newEvent.placeholders.country')"
            description="pays d'origine"
            category="newEvent"
          />
        </div>
      </div>
    </div>

    <!-- 
      Contact Information Section
      
      Contains contact details and social media links for the event.
      Includes dynamic social links management functionality.
    -->
    <div class="form-section">
      <h3 class="text-lg font-medium mb-4">{{ t("newEvent.contact") }}</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Phone Number Field -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="telephone">
            <label for="telephone">{{ t("newEvent.labels.phone") }} *</label>
            <InputText
              id="telephone"
              fluid
              v-bind="field"
              :placeholder="t('newEvent.placeholders.phone')"
              :invalid="!!errorMessage"
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>

        <!-- Email Address Field -->
        <div class="flex flex-col gap-y-2">
          <Field v-slot="{ field, errorMessage }" name="email">
            <label for="email">{{ t("newEvent.labels.email") }} *</label>
            <InputText
              id="email"
              fluid
              v-bind="field"
              :placeholder="t('newEvent.placeholders.email')"
              :invalid="!!errorMessage"
            />
            <Message
              v-if="errorMessage"
              class="text-xs text-error"
              severity="error"
            >
              {{ t(`newEvent.errors.${errorMessage}`) }}
            </Message>
          </Field>
        </div>
      </div>

      <!-- 
        Dynamic Social Networks Section
        
        Allows users to add multiple social media links with
        dynamic add/remove functionality.
      -->
      <div class="flex flex-col gap-y-2 mt-4">
        <label>{{ t("newEvent.labels.socialNetworks") }}</label>

        <!-- Render each social link input field -->
        <div
          v-for="(link, index) in socialLinks"
          :key="`social-${index}`"
          class="flex items-center gap-2"
        >
          <InputText
            v-model="socialLinks[index]"
            fluid
            :placeholder="t('newEvent.placeholders.socialNetwork')"
          />
          <!-- Remove button (disabled if it's the only field) -->
          <Button
            type="button"
            icon="pi pi-times"
            class="p-button-rounded p-button-danger p-button-sm"
            :disabled="socialLinks.length === 1 && index === 0"
            @click="removeSocialLink(index)"
          />
        </div>

        <!-- Add new social link button -->
        <Button
          type="button"
          class="w-fit mt-2"
          icon="pi pi-plus"
          :label="t('newEvent.buttons.addSocialNetwork')"
          @click="addSocialLink"
        />
      </div>
    </div>

    <!-- 
      Additional Information Section
      
      Contains participant management and image upload functionality.
    -->
    <div class="form-section">
      <h3 class="text-lg font-medium mb-4">{{ t("newEvent.otherInfos") }}</h3>

      <!-- Image URL placeholder (if needed for future development) -->
      <div class="flex flex-col gap-y-2" />

      <!-- 
        Dynamic Participants Section
        
        Allows users to add multiple participant names with
        dynamic add/remove functionality.
      -->
      <div class="flex flex-col gap-y-2 mt-4">
        <label>{{ t("newEvent.labels.participants") }}</label>

        <!-- Render each participant input field -->
        <div
          v-for="(participant, index) in participants"
          :key="`participant-${index}`"
          class="flex items-center gap-2"
        >
          <InputText
            v-model="participants[index]"
            fluid
            :placeholder="t('newEvent.placeholders.participants')"
          />
          <!-- Remove button (disabled if it's the only field) -->
          <Button
            type="button"
            icon="pi pi-times"
            class="p-button-rounded p-button-danger p-button-sm"
            :disabled="participants.length === 1 && index === 0"
            @click="removeParticipant(index)"
          />
        </div>

        <!-- Add new participant button -->
        <Button
          class="w-fit mt-2"
          type="button"
          icon="pi pi-plus"
          :label="t('newEvent.buttons.addParticipant')"
          @click="addParticipant"
        />
      </div>
    </div>

    <!-- 
      Image Upload Section
      
      Provides file upload functionality for event images.
      Captures the selected file and stores it in the reactive image reference.
    -->
    <div class="flex flex-col gap-y-2 items-start mt-4">
      <label>{{ t("newEvent.labels.image") }}</label>
      <FileUpload
        ref="fileUploadRef"
        mode="basic"
        custom-upload
        auto
        choose-icon="pi pi-image"
        severity="secondary"
        class="p-button-primary"
        :choose-label="
          t(
            `${
              initialData && initialData.image
                ? 'newEvent.buttons.changeImage'
                : 'newEvent.buttons.uploadImage'
            }`
          )
        "
        accept="image/*"
        :max-file-size="5000000"
        @select="onFileSelect"
        @clear="onFileClear"
      />

      <!-- Display selected file information -->
      <div v-if="image" class="text-sm text-gray-600 mt-2">
        <p>{{ t("newEvent.labels.selectedFile") }}: {{ image.name }}</p>
        <p>
          {{ t("newEvent.labels.fileSize") }}: {{ formatFileSize(image.size) }}
        </p>
      </div>

      <NuxtLink
        v-if="initialData && initialData.image"
        class="text-sm text-gray-600 mt-2 underline"
        :to="`${initialData.image}`"
        target="_blank"
      >
        {{ t("newEvent.labels.viewFile") }}
      </NuxtLink>

      <!-- 
      Form Action Buttons
      
      Contains cancel and submit buttons with proper styling and behavior.
      Submit button shows loading state during form submission.
    -->
      <div class="w-full flex justify-end gap-4">
        <!-- Submit button - submits the form with validation -->
        <Button
          type="submit"
          :label="t(`newEvent.buttons.${initialData ? 'update' : 'create'}`)"
          :loading="isLoading"
          :disabled="isLoading"
        />
      </div></div
  ></Form>
</template>

<!--
  Component Style Notes:
  
  This component relies on:
  - Tailwind CSS for utility classes and responsive design
  - PrimeVue theme for component styling and consistency
  - CSS custom properties for consistent spacing and colors
  
  No scoped styles are needed as all styling is handled
  through utility classes and component defaults.
  
  The responsive design uses:
  - Mobile-first approach with `grid-cols-1`
  - Desktop breakpoints with `md:grid-cols-2` and `md:grid-cols-3`
  - Flexible gap spacing with `gap-4` and `gap-y-2`
  - Consistent form section spacing with `gap-y-8`
-->
