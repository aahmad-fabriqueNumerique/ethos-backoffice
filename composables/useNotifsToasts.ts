/**
 * Notifications Toast Composable
 * 
 * This composable provides a centralized way to display toast notifications
 * for notification-related operations. It handles success messages with
 * internationalization support and proper formatting.
 * 
 * Features:
 * - Internationalized toast messages
 * - Success notifications with count display
 * - Configurable toast duration
 * - Type-specific notification titles
 * 
 * Used by: Custom notification composables to show user feedback
 */
export const useNotifsToasts = () => {
  // Toast notification system from PrimeVue
  const toast = useToast();
  
  // Internationalization support for toast messages
  const { t } = useI18n();

  /**
   * Shows a success toast notification for notification operations
   * 
   * Displays a toast with:
   * - Translated title based on notification type
   * - Success message with count of notifications sent
   * - Green success styling
   * - 3-second display duration
   * 
   * @param type - The type of notification (e.g., "news", "event", "announcement")
   * @param successCount - Number of notifications successfully sent
   */
  const showToast = (type: string, successCount: number) => {
    toast.add({
      severity: "success", // Green success styling
      summary: t(`notifications.types.${type}`), // Translated notification type as title
      life: 3000, // Display duration in milliseconds (3 seconds)
      detail: t("notifications.toasts.success", successCount), // Success message with count
    });
  };

  // Return the public API of the composable
  return {
    showToast, // Function to display success toast notifications
  };
};
