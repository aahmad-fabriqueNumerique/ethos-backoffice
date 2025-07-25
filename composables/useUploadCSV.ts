import { getAuth, type User } from "firebase/auth";
import type { FileUploadSelectEvent } from "primevue";

type UseUploadDocument = {
  isLoading: Ref<boolean>;
  isValid: ComputedRef<boolean>;
  onSubmit: () => void;
  onSelect: (event: FileUploadSelectEvent) => void;
  selectedFile: Ref<File | null>;
  setRemoveCallback: (callback: (index: number) => void) => void; // Nouvelle fonction
};

const useUploadDocument = (): UseUploadDocument => {
  const { t } = useI18n();
  const toast = useToast();

  const selectedFile = ref<File | null>(null);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // Validation du formulaire
  const isValid = computed(() => selectedFile.value !== null);

  // Stocker la callback de suppression
  let removeFileCallback: ((index: number) => void) | null = null;

  const setRemoveCallback = (callback: (index: number) => void) => {
    removeFileCallback = callback;
  };

  /**
   * Gère la soumission du formulaire
   * Crée un FormData avec le type de document et le fichier sélectionné
   */
  const onSubmit = async () => {
    if (selectedFile.value) {
      try {
        const auth = getAuth();
        const user = auth.currentUser as User;

        if (!user) {
          console.error("No authenticated user found");
          return;
        }

        // Get fresh authentication token
        const token = await user.getIdToken();
        const formData = new FormData();

        formData.append("file", selectedFile.value);

        isLoading.value = true;
        error.value = null;
        const response = await $fetch("/api/upload-songs", {
          method: "POST",
          body: formData,
          headers: {
            "x-filename": selectedFile.value.name,
            Authorization: `Bearer ${token}`,
          },
        });

        await $fetch("/api/notifs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // Authentification avec le token
          },
          body: JSON.stringify({
            message: t("newSongs.updateMessage"),
            type: t("data.notifsTypes.song"), // Utilisation de la clé de traduction
          }),
        });

        console.log("Réponse du serveur :", response);

        // Succès - reset du composant
        selectedFile.value = null;
        if (removeFileCallback) {
          removeFileCallback(0); // Supprimer le fichier à l'index 0
        }
      } catch (err) {
        console.error(err);
        error.value = "upload_error";
        toast.add({
          summary: "Erreur",
          detail: t(`api.${error.value}`),
          life: 3000,
          severity: "error",
          closable: true,
        });
      } finally {
        isLoading.value = false;
      }
    }
  };

  /**
   * Gère la sélection d'un fichier
   * @param event Événement de sélection de fichier
   */
  const onSelect = (event: FileUploadSelectEvent): void => {
    const file = event.files[0];
    if (file) {
      selectedFile.value = file;
    }
  };

  watch(error, (newError) => {
    if (newError && newError?.length > 0) {
      toast.add({
        summary: "Erreur",
        detail: t(`api.${newError}`),
        severity: "error",
        life: 3000,
        closable: true,
      });
    }
  });

  return {
    isLoading,
    isValid,
    onSubmit,
    onSelect,
    selectedFile,
    setRemoveCallback, // Exposer la nouvelle fonction
  };
};

export default useUploadDocument;
