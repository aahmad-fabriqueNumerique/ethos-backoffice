/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth, type User } from "firebase/auth";

export const useDeleteUser = () => {
  const toast = useToast();
  const { t } = useI18n(); // Use i18n for translations

  const loading = ref(false);
  const showDeletionToast = ref(false); // Controls visibility of the deletion toast

  const deleteUser = async (value: UserList) => {
    loading.value = true;
    if (value.role === "admin") {
      toast.add({
        severity: "warn",
        summary: t("deleteUser.toasts.adminDelete.summary"),
        detail: t("deleteUser.toasts.adminDelete.message"),
        life: 5000, // Show for 5 seconds
      });
      return;
    } else {
      try {
        const auth = getAuth();
        const user = auth.currentUser as User;
        if (!user) {
          console.error("No authenticated user found");
          return;
        }

        // Get fresh authentication token
        const token = await user.getIdToken();
        console.log("Deleting user with ID:", value.uid);

        await $fetch(`/api/users/${value.uid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        showDeletionToast.value = true; // Show deletion toast
      } catch (error: any) {
        console.log("Error deleting user:", error);

        toast.add({
          severity: "warn",
          summary: t("deleteUser.toasts.adminDelete.summary"),
          detail: t(`deleteUser.errors.${error.statusMessage}`),
          life: 5000, // Show for 5 seconds
        });
      } finally {
        loading.value = false; // Reset deleting state
        //setUidToDelete(null); // Clear the selected user ID for deletion
        //refresh(); // Refresh the user list after deletion
      }
    }
  };

  return {
    loading, // Boolean indicating if deletion is in progress
    deleteUser, // Function to delete a user
    showDeletionToast, // Controls visibility of the deletion toast
  };
};
