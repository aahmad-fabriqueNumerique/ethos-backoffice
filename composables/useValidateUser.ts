/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAuth, type User } from "firebase/auth";
import type UserItem from "~/models/UserItem";

export const useValidateUser = () => {
  const { t } = useI18n(); // Use i18n for translations
  const toast = useToast(); // PrimeVue toast service for notifications
  const loading = ref(false); // Tracks if validation is in progress
  const selectedUsers = ref<UserItem[]>([]); // Array to hold selected users for validation

  const onSubmit = async (values: UserItem[]) => {
    console.log("Submitting validation for user:", values);

    loading.value = true; // Set loading state to true
    const data = values.map((user) => {
      return user.userId;
    });
    console.log("Data to validate:", data);

    const auth = getAuth();
    const user = auth.currentUser as User;
    if (!user) {
      console.error("No authenticated user found");
      return;
    }

    // Get fresh authentication token
    const token = await user.getIdToken();

    try {
      await $fetch("/api/users/validate", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: { uids: data, role: values[0].role },
      });
      toast.add({
        severity: "success",
        summary: t("users.waitingList.toasts.success.summary"),
        detail: t("users.waitingList.toasts.success.message"),
        life: 5000, // Show for 5 seconds
      });
    } catch (error: any) {
      console.error("Error validating user:", error);
      toast.add({
        severity: "error",
        summary: t("users.waitingList.toasts.error.summary"),
        detail: t(`users.waitingList.errors.${error.statusMessage}`),
        life: 5000, // Show for 5 seconds
      });
    } finally {
      loading.value = false; // Reset loading state
      selectedUsers.value = []; // Clear selected users after submission
    }
  };

  return { loading, onSubmit, selectedUsers };
};
