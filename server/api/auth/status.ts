// Endpoint API pour vérifier le statut d'authentification de l'utilisateur
export default defineEventHandler((event) => {
  // Le middleware auth.ts a déjà vérifié le token et a mis les infos dans event.context.auth
  const auth = event.context.auth || { authenticated: false };
  
  return {
    authenticated: auth.authenticated,
    user: auth.authenticated ? {
      uid: auth.uid,
      email: auth.email,
      // Ne pas renvoyer toutes les informations sensibles, seulement celles nécessaires
      displayName: auth.user?.displayName,
      photoURL: auth.user?.photoURL,
    } : null
  };
});
