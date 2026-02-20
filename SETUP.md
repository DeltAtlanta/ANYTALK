# Guide de Configuration Rapide

## Étape 1 : Configuration Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Créez un nouveau projet
3. Activez **Authentication** → Méthode de connexion → Email/Password
4. Activez **Firestore Database** → Créer une base de données → Mode test (pour commencer)
5. Dans Paramètres du projet → Vos applications → Ajoutez une application Web
6. Copiez les clés de configuration

## Étape 2 : Mettre à jour la configuration

Ouvrez `firebase-config.js` et remplacez les valeurs :

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_SENDER_ID",
    appId: "VOTRE_APP_ID"
};
```

## Étape 3 : Configurer les règles Firestore

Dans Firebase Console → Firestore Database → Règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && request.auth.uid == userId;
    }
    match /sessions/{sessionId} {
      allow read: if request.auth != null && 
        (resource.data.appelantId == request.auth.uid || 
         resource.data.ecoutantId == request.auth.uid);
      allow create: if request.auth != null && 
        (request.resource.data.appelantId == request.auth.uid || 
         request.resource.data.ecoutantId == request.auth.uid);
      allow update: if request.auth != null && 
        (resource.data.appelantId == request.auth.uid || 
         resource.data.ecoutantId == request.auth.uid);
    }
  }
}
```

## Étape 4 : Lancer le site

### Option 1 : Serveur Python
```bash
python -m http.server 8000
```

### Option 2 : Serveur Node.js
```bash
npx http-server
```

### Option 3 : Extension VS Code
Installez l'extension "Live Server" et cliquez sur "Go Live"

Puis ouvrez : http://localhost:8000

## Étape 5 : Configuration Whereby (optionnel)

1. Créez un compte sur [whereby.com](https://whereby.com) (produit Embedded).
2. Obtenez votre subdomain (Configure / paramètres d’organisation).
3. Dans **`firebase-config.js`**, remplacez `"votre-subdomain"` dans `wherebyConfig.subdomain` par votre subdomain (ex. `"anytalk"`).
4. Voir **WHEREBY.md** pour le détail.

## ✅ Test

1. Ouvrez `index.html`
2. Cliquez sur "S'inscrire"
3. Créez un compte "Appelant"
4. Remplissez le formulaire
5. Vous devriez être redirigé vers le dashboard

## 🐛 Dépannage

**Erreur "Firebase not initialized"**
- Vérifiez que vous avez bien configuré `firebase-config.js`
- Assurez-vous que les modules ES6 sont supportés (utilisez un serveur local)

**Erreur CORS**
- Utilisez toujours un serveur local, ne pas ouvrir directement le fichier HTML

**Les données ne se sauvegardent pas**
- Vérifiez les règles Firestore
- Vérifiez que Firestore est bien activé dans Firebase Console
