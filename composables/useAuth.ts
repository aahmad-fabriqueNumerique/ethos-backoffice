import type { Auth, Unsubscribe, User } from "firebase/auth";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { ref, onMounted } from "vue";

export const useAuth = () => {
  const nuxtApp = useNuxtApp();
  const $auth = nuxtApp.$firebaseAuth as Auth;
  const user = ref<User | null>(null);

  let unsubscribe: Unsubscribe;

  // Écouter les changements d'état d'authentification
  onMounted(() => {
    unsubscribe = onAuthStateChanged($auth, (currentUser) => {
      user.value = currentUser;
    });
  });

  // Nettoyer l'écouteur lors de la destruction du composant
  onUnmounted(() => {
    unsubscribe();
  });

  const login = async () => {
    const provider = new GoogleAuthProvider();

    // Forcer l'affichage de la fenêtre de sélection de compte Google
    provider.setCustomParameters({
      prompt: "select_account",
    });

    const result = await signInWithPopup($auth, provider);
    // Le state sera automatiquement mis à jour par l'écouteur onAuthStateChanged
    return result.user;
  };

  const logout = async () => {
    await signOut($auth);
    // Le state sera automatiquement mis à jour par l'écouteur onAuthStateChanged
  };

  return { user, login, logout };
};
