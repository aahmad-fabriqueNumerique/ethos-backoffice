<script setup lang="ts">
import UsersList from "~/components/UsersList.vue";
import type UserItem from "~/models/UserItem";

/**
 * Users Management Page
 *
 * This page provides a comprehensive interface for managing system users with two main sections:
 * 1. Registered users - Active users with assigned roles that can be edited/deleted
 * 2. Pending users - Users awaiting validation by administrators
 *
 * Key features:
 * - Tab-based navigation between registered and pending users
 * - Pagination for efficiently browsing large user lists
 * - Role management for assigning different permission levels
 * - Bulk operations for pending users (approve/reject)
 * - Individual user management (edit/delete)
 * - Toast notifications for operation feedback
 *
 * This page serves as the central hub for all user management operations
 * and integrates several specialized components and composables.
 */

// Set page metadata for the Nuxt router and layout system
definePageMeta({
  title: "Utilisateurs",
  layout: "home",
});

// Initialize internationalization helper for translations
const { t } = useI18n();

// Extract all necessary state and functions from the users view composable
const {
  users, // Array of registered user objects to display in the table
  loading, // Boolean indicating if registered users data is being fetched
  hasMore, // Boolean indicating if more registered users can be loaded
  loadMore, // Function to load the next page of registered users
  columns, // Table column configuration for registered users
  uidToUpdate, // ID of the currently selected user for update
  showToast, // Whether the success toast is currently visible for updates
  setDialogVisible, // Function to select/deselect a user for updating
  showTemplate, // Function to display the success toast notification for updates
  refreshUsers, // Function to refresh the users list and clear notifications
  deleteUser, // Function to delete a user account
  uidToDelete, // User object currently selected for deletion
  setUidToDelete, // Function to set the user for deletion
  deleting, // Boolean indicating if deletion is in progress
  showDeletionToast, // Whether the deletion success toast is visible
} = useUsersView();

/**
 * Initialize the Firestore paginator for pending users
 *
 * This paginator fetches data from the "waitingRoom" collection where
 * new user registrations await administrator approval
 *
 * @param {"waitingRoom"} collection - Firestore collection name for pending users
 * @param {"email"} defaultSortField - Default field to sort results by
 * @param {50} pageSize - Number of items to display per page
 */
const {
  result, // Array of retrieved pending user documents
  loading: fetching, // Loading state indicator for pending users
  pageEventHandler, // Handler for pagination events (page changes)
  sortHandler, // Handler for column sorting events (sort direction/field changes)
  loadInitial, // Function to load the first page of pending users
  pagination, // Pagination state object (current page, total pages, etc.)
  pageCount, // Total number of pages available
} = useFirestorePaginator<UserItem>("waitingRoom", "email", 50);

/**
 * User validation functionality
 *
 * Handles the approval process for pending users, including:
 * - Tracking selected users for bulk operations
 * - Processing user approvals/rejections
 * - Managing loading states during validation
 */
const {
  loading: activating, // Boolean indicating if user validation is in progress
  onSubmit, // Function to handle user approval submission
  selectedUsers, // Array of currently selected pending users
} = useValidateUser();

// Track the currently selected tab (0: registered users, 1: pending users)
const tabIndex = ref("0");

/**
 * Determines whether to display the action buttons group
 * Only shown when on the pending users tab and at least one user is selected
 */
const displayIconsGroup = computed(() => {
  return +tabIndex.value > 0 && selectedUsers.value.length > 0;
});

/**
 * Load the initial pending users data when component is mounted
 * This ensures the pending users list is populated when the user
 * switches to that tab
 */
onMounted(() => {
  loadInitial();
});
</script>

<template>
  <!-- Main container with responsive width and vertical spacing -->
  <main class="w-5/6 mx-auto mt-8 flex flex-col gap-y-8">
    <!-- 
      Page header with title and optional action buttons
      Provides context about the current page and primary actions
    -->
    <ViewHeader :title="t('users.title')" />

    <!-- 
      Main card container holding the tabs system
      This provides a clean, bordered container for all user management interfaces
    -->
    <div class="card">
      <!-- 
        Tabbed interface to separate different user categories
        - Uses v-model:value to track the currently selected tab
        - Allows switching between registered and pending users
      -->
      <Tabs v-model:value="tabIndex">
        <!-- 
          Header section containing tab navigation and action buttons
          - Flexbox layout ensures proper alignment and spacing
          - Justifies tab list to start and buttons to end
        -->
        <div class="flex justify-between items-center">
          <!-- Tab navigation list (Registered Users / Pending Users) -->
          <TabList class="text-xs">
            <Tab value="0">Utilisateurs enregistrés</Tab>
            <Tab value="1">Utilisateurs en attente de validation</Tab>
          </TabList>

          <!-- 
            Context-sensitive action buttons group
            - Only visible when appropriate based on selected tab and user selection
            - Provides bulk actions for pending users tab
          -->
          <ButtonsGroup
            :tab-index="tabIndex"
            :display-icons-group="displayIconsGroup"
            :selected-users="selectedUsers"
            @refresh-users="refreshUsers"
            @load-initial="loadInitial"
            @submit-users="onSubmit($event)"
          />
        </div>

        <!-- Tab content panels - one for each tab -->
        <TabPanels>
          <!-- Registered Users Tab Panel -->
          <TabPanel value="0">
            <!-- 
              Registered users data table 
              - Displays active users with their details
              - Provides inline actions for each user
              - Emits events for user operations
            -->
            <UsersList
              :columns="columns"
              :users="users"
              :loading="loading"
              @set-dialog-visible="setDialogVisible($event)"
              @set-user-to-delete="setUidToDelete($event)"
              @refresh-users="refreshUsers"
            />

            <!-- Pagination controls for registered users -->
            <div class="flex justify-end">
              <Button
                v-if="hasMore && !loading"
                size="small"
                label="Charger plus"
                @click="loadMore"
              />
            </div>
          </TabPanel>

          <!-- Pending Users Tab Panel -->
          <TabPanel value="1">
            <!-- 
              Non-validated users list component
              - Specialized table for pending user approvals
              - Includes checkboxes for bulk selection
              - Provides sorting and pagination controls
              - Maintains its own selection state
            -->
            <NonValidateUsersList
              :result="result"
              :selected-users="selectedUsers"
              :activating="activating"
              :loading="fetching"
              :page-count="pageCount"
              :pagination="pagination"
              :sort-handler="sortHandler"
              :page-event-handler="pageEventHandler"
              @update-selected-users="selectedUsers = $event"
              @submit-users="onSubmit($event)"
            />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>

    <!-- 
      Modals and dialogs section
      These components are conditionally rendered based on user actions
    -->

    <!-- User update dialog -->
    <UpdateUserDialogComponent
      :visible="uidToUpdate"
      @set-visible="setDialogVisible"
      @user-updated="showTemplate"
    />

    <!-- User deletion confirmation dialog -->
    <DeleteUserDialogComponent
      :loading="deleting"
      :visible="!!uidToDelete"
      @set-visible="uidToDelete = null"
      @delete-user="deleteUser(uidToDelete!)"
    />

    <!-- 
      Toast notifications section
      Provides feedback for completed operations
    -->

    <!-- Update success toast -->
    <UpdateUserSuccessToast
      @close="showToast = $event"
      @refresh-users="refreshUsers"
    />

    <!-- Delete success toast -->
    <DeleteUserSuccessToast
      :show-toast="showDeletionToast"
      @close="showDeletionToast = false"
      @refresh-users="refreshUsers"
    />
  </main>
</template>
