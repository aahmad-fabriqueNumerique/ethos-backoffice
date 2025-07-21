<script setup lang="ts">
import type { EventUIModel } from "~/models/EventModel";

definePageMeta({
  layout: "home",
  title: "Mise à jour d'un événement",
});

const { t } = useI18n();

// Get the event ID from the route parameters
const route = useRoute();
const eventId = route.params.eventId as string;

// Event management composable - provides validation schema, submission handler, and data options
const {
  isLoading,
  newEventFormSchema,
  onUpdate,
  getEventDetails,
  eventTypes,
  countries,
} = useNewEvent();

// Reactive variable to hold the initial event data
const initialData = ref<EventUIModel | null>(null);

onMounted(async () => {
  // Fetch the event details using the event ID
  const eventData = (await getEventDetails(eventId)) as EventUIModel | null;
  console.log("Fetched event data:", eventData);

  // If no data is found, redirect to the events list
  if (!eventData) {
    navigateTo("/events");
  } else {
    initialData.value = eventData;
  }
});
</script>

<template>
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <ViewHeader :title="t('updateEvent.pageTitle')">
      <Button
        v-tooltip.bottom="t('updateEvent.tooltips.backToEvents')"
        as="routerLink"
        variant="outlined"
        size="small"
        to="/events"
      >
        {{ t("updateEvent.buttons.backToEvents") }}
      </Button>
    </ViewHeader>

    <EventForm
      v-if="initialData"
      :is-loading="isLoading"
      :countries="countries"
      :event-types="eventTypes"
      :new-event-form-schema="newEventFormSchema"
      :initial-data="initialData"
      :on-submit="onUpdate"
    />
  </main>
</template>
