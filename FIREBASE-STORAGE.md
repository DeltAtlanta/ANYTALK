# Pièces jointes (Storage) — checklist Firebase

Si la jonction des fichiers (carte d’identité, CV) ne fonctionne pas, vérifier dans l’ordre :

## 1. Activer Storage
- Ouvrir [Firebase Console](https://console.firebase.google.com) → projet **anytalk770**
- **Build** → **Storage** → si proposé, cliquer sur **Get started** pour créer le bucket

## 2. Nom du bucket
Le code utilise par défaut `anytalk770.firebasestorage.app` (projets récents).

Si ton projet utilise l’ancien format, dans `firebase-config.js` remplace :
```js
storageBucket: "anytalk770.firebasestorage.app",
```
par :
```js
storageBucket: "anytalk770.appspot.com",
```

Pour voir le bon nom : Console Firebase → **Storage** → onglet **Files** ; l’URL indique le bucket (ex. `gs://anytalk770.firebasestorage.app` → nom = `anytalk770.firebasestorage.app`).

## 3. Déployer les règles Storage
Dans le terminal, à la racine du projet :
```bash
firebase deploy --only storage
```
Le fichier `storage.rules` doit autoriser l’écriture dans `users/{userId}/**` pour l’utilisateur connecté (déjà le cas dans le projet).

## 4. Tester et lire l’erreur
- Joindre un fichier (PNG, JPG ou PDF) sur la page profil écoutant
- Si ça échoue, le message **Erreur : …** sous le champ affiche le détail (ex. permission refusée, bucket introuvable)
- Ouvrir la **console du navigateur** (F12 → Console) pour voir l’erreur complète

## 5. CORS (sites personnalisés)
Si le site est hébergé sur un domaine autre que localhost / Firebase Hosting, il peut falloir configurer CORS sur le bucket. Pour un hébergement Firebase standard, ce n’est en général pas nécessaire.
