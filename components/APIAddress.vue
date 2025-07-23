<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<!--
  APIAddress Component

  A Vue 3 component that provides French address autocompletion using the official
  French government address API (api-adresse.data.gouv.fr). Built with PrimeVue's
  AutoComplete component and includes debounced search functionality.

  Features:
  - Real-time address search with debounce (300ms)
  - Loading states and error handling
  - Structured address data emission
  - TypeScript support
  - Responsive design

  Props:
  - name: Field identifier (required)
  - placeholder: Input placeholder text (required)
  - label: Field label for display (required)

  Events:
  - address-selected: Emitted when user selects an address
    Payload: { label, street, city, postalCode, coordinates }

  Example usage:
  <APIAddress
    name="userAddress"
    placeholder="Start typing an address..."
    label="Address"
    @address-selected="handleAddressSelection"
  />
-->
<script setup lang="ts">
import { ref, onBeforeUnmount, watch } from "vue";

/**
 * Address feature structure returned by the French government API
 * @see https://adresse.data.gouv.fr/api-doc/adresse
 */
type AddressFeature = {
  properties: {
    label: string; // Full formatted address
    name: string; // Street name/number
    city: string; // City name
    postcode: string; // Postal code
  };
  geometry: {
    coordinates: number[]; // [longitude, latitude]
  };
};

/**
 * Component props definition
 */
const {
  name: _name, // Field identifier (prefixed with _ to avoid unused variable warning)
  placeholder, // Input placeholder text
  label, // Field label
  address = "", // Optional initial address value with default
} = withDefaults(
  defineProps<{
    name: string;
    address?: string; // Optional initial address value
    placeholder: string;
    label: string;
  }>(),
  {
    address: "",
  }
);

/**
 * Component events definition
 * Emits structured address data when user makes a selection
 */
const emit = defineEmits<{
  (
    e: "address-selected",
    address: {
      label: string; // Full formatted address
      street: string; // Street name and number (same as label for French API)
      city: string; // City name
      postalCode: string; // Postal code
      coordinates: number[]; // [longitude, latitude]
    }
  ): void;
  (e: "data-changed", data: string): void;
}>();

const { t } = useI18n(); // Internationalization helper for translations

// Component reactive state
const selectedAddress = ref<string>(address || ""); // Initialize with props address value
const filteredAddresses = ref<AddressFeature[]>([]); // Search results from API
const loading = ref(false); // Loading state indicator

// Request management references
let debounceTimeout: NodeJS.Timeout | null = null; // Debounce timeout reference to prevent excessive API calls
let abortController: AbortController | null = null; // AbortController to cancel ongoing API requests

/**
 * Watch for changes in the address prop and update selectedAddress accordingly
 * This ensures the component stays in sync when parent component changes the address value
 */
watch(
  () => address,
  (newAddress) => {
    selectedAddress.value = newAddress || "";
  }
);

/**
 * Fetches addresses from the French government API
 * @param query - Search query string
 * @returns Promise<AddressFeature[]> - Array of address features
 */
const searchAddresses = async (query: string): Promise<AddressFeature[]> => {
  loading.value = true;

  // Cancel the previous request if it's still in progress
  if (abortController) {
    abortController.abort();
  }

  abortController = new AbortController();

  try {
    // Call the official French address API with abort signal for cancellation
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        query.trim()
      )}&limit=5`,
      { signal: abortController.signal }
    );
    const data = await res.json();

    // Handle empty results
    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features;
  } catch (error: any) {
    // Handle different error types appropriately
    if (error.name === "AbortError") {
      console.log("Fetch aborted for:", query);
    } else {
      console.error("Error fetching address:", error);
    }
    return [];
  } finally {
    // Always reset loading state
    loading.value = false;
  }
};

/**
 * Handles search input with debounce functionality
 * Prevents excessive API calls by waiting 300ms after user stops typing
 * @param event - AutoComplete event containing the search query
 */
const searchHandler = async (event: any) => {
  // Cancel any existing timeout to prevent multiple simultaneous requests
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  // Immediately clear results if query is too short
  if (event.query.length < 3) {
    filteredAddresses.value = [];
    return;
  }

  // Set up debounced search - execute after 300ms of inactivity
  debounceTimeout = setTimeout(async () => {
    console.log("Executing debounced search for:", event.query);
    filteredAddresses.value = await searchAddresses(event.query);
    debounceTimeout = null; // Reset timeout reference after execution
  }, 300); // 300ms debounce delay
};

/**
 * Handles address selection from the dropdown
 * Transforms API data structure to component's expected format and emits event
 * @param event - AutoComplete selection event
 */
const selectHandler = (event: any) => {
  const address = event.value as AddressFeature;

  if (address) {
    // Transform API response to structured address data
    const selectedAddressData = {
      label: address.properties.label, // Full formatted address
      street: address.properties.label || "", // Full address as street (using label)
      city: address.properties.city || "", // City name
      postalCode: address.properties.postcode || "", // Postal code
      coordinates: address.geometry.coordinates || [], // [longitude, latitude]
    };

    // Emit the structured address data to parent component
    emit("address-selected", selectedAddressData);
  }
};

/**
 * Cleanup function to prevent memory leaks
 * Clears any pending debounce timeout and aborts ongoing requests when component is unmounted
 */
onBeforeUnmount(() => {
  // Clear pending debounce timeout
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  // Abort any ongoing API request
  if (abortController) {
    abortController.abort();
  }
});
</script>

<template>
  <div class="relative">
    <div class="card flex w-full">
      <!-- 
        PrimeVue AutoComplete component configured for address search
        - v-model: Binds to selectedAddress reactive ref
        - :suggestions: Array of filtered addresses from API
        - @complete: Triggers debounced search
        - @option-select: Handles address selection
      -->
      <span class="flex flex-col gap-y-2 w-full">
        <label for="adresse">{{ t("newEvent.labels.address") }} *</label>
        <AutoComplete
          v-model="selectedAddress"
          name="adresse"
          :placeholder="placeholder"
          class="w-full"
          :loading="loading"
          fluid
          option-label="properties.label"
          :suggestions="filteredAddresses"
          @complete="searchHandler"
          @option-select="selectHandler"
          @change="(e) => emit('data-changed', e.value)"
        >
          <!-- Custom option template for better UX -->
          <template #option="slotProps">
            <div class="flex flex-col p-2">
              <!-- Main address label -->
              <div class="font-medium">
                {{ slotProps.option.properties.label || address }}
              </div>
              <!-- Secondary info: city and postal code -->
              <div class="text-sm text-surface-500">
                {{ slotProps.option.properties.city }} -
                {{ slotProps.option.properties.postcode }}
              </div>
            </div>
          </template>

          <!-- Header for the dropdown -->
          <template #header>
            <div class="font-medium px-3 py-2">
              {{ label || "Addresses" }}
            </div>
          </template>
        </AutoComplete></span
      >
    </div>
  </div>
</template>
