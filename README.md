# Backoffice Ethos

Backoffice Nuxt 3 (PrimeVue, Tailwind, Pinia) connecté à Firebase et OpenAgenda.

## Démarrage

```bash
npm install
npm run setup   # configure et teste les variables d'environnement
npm run dev     # http://localhost:3000
```

## Configuration (`npm run setup`)

Assistant interactif dans le terminal :

- choisissez un service (Firebase client, Firebase Admin, OpenAgenda, dossier d'upload) et saisissez ses variables ;
- la connexion est testée, une coche verte ✔ apparaît dans le menu quand elle est vérifiée ;
- quand tout est vert, la dernière option **Créer le .env** écrit le fichier.

Firebase Admin accepte aussi le chemin du JSON de compte de service pour remplir les valeurs automatiquement.

Sans l'assistant, copiez `.env.example` vers `.env` et remplissez-le à la main. `.env.local` est aussi pris en compte et prioritaire sur `.env`. Redémarrez `npm run dev` après toute modification.

## Variables d'environnement

| Variable | Usage |
| --- | --- |
| `NUXT_PUBLIC_FIREBASE_*` | Config Firebase côté client (5 variables) |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Firebase Admin (serveur) |
| `OPENAGENDA_API_KEY`, `AGENDA_TRAD_UID`, `LO_CALEN_DIARI_UID` | API OpenAgenda |
| `TMP_UPLOADS_DIR` | Dossier temporaire d'upload (optionnel, `/tmp` par défaut) |

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm run setup` | Configure et teste les services |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualise le build |
