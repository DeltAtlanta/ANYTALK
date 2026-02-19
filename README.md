# AnyTalk - Confess Safely

Plateforme sécurisée où ceux qui ont besoin de se confier rencontrent ceux qui écoutent avec empathie.

## 🚀 Fonctionnalités

- **Système de badges personnalisés** : Créez votre profil avec des badges reflétant votre parcours
- **Matching intelligent** : Trouvez la personne idéale pour parler ou écouter
- **Appels vidéo sécurisés** : Intégration avec Whereby pour des conversations confidentielles
- **Design futuriste** : Interface moderne avec tons violets et lavande

## 📁 Structure du projet

```
AnyTalk/
├── index.html          # Page d'accueil
├── register.html       # Page d'inscription
├── login.html          # Page de connexion
├── dashboard.html      # Redirection par rôle
├── appelant.html       # Espace appelant
├── ecoutant.html       # Dashboard écoutant
├── reserver.html       # Réserver un créneau
├── call.html           # Page d'appel vidéo
├── main.css            # Styles CSS principal
├── firebase-config.js  # Config Firebase (voir config-example.js)
├── particles.js        # Particules
├── register.js, login.js, dashboard.js, ecoutant.js, reserver.js, call.js
├── logo.svg
├── config-example.js, firestore.rules, ETAPES.md
└── README.md
```

## 🛠️ Installation

### 1. Configurer Firebase

1. Créez un projet Firebase sur [console.firebase.google.com](https://console.firebase.google.com)
2. Activez Authentication (Email/Password)
3. Activez Firestore Database
4. Copiez vos clés de configuration
5. Ouvrez `firebase-config.js` et remplacez les valeurs :

```javascript
const firebaseConfig = {
    apiKey: "votre-api-key",
    authDomain: "votre-auth-domain",
    projectId: "votre-project-id",
    storageBucket: "votre-storage-bucket",
    messagingSenderId: "votre-messaging-sender-id",
    appId: "votre-app-id"
};
```

### 2. Configurer Firestore

Dans la console Firebase, allez dans Firestore et créez les règles suivantes :

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

### 3. Configurer Whereby (optionnel)

Pour activer les appels vidéo :

1. Créez un compte sur [whereby.com](https://whereby.com)
2. Obtenez votre subdomain
3. Dans `call.js`, remplacez `const subdomain = 'subdomain';` par votre subdomain

### 4. Lancer le site

**Important :** n’ouvrez pas `index.html` en fichier local (Firebase ne fonctionnera pas). Utilisez un serveur local :

**Avec npm :**
```bash
npm run serve
```

**Avec Python :**
```bash
python3 -m http.server 8000
```

Puis ouvrez [http://localhost:8000](http://localhost:8000)

## 🎨 Design

Le design utilise une palette de couleurs futuriste avec des tons violets et lavande :
- **Primary Purple** : #8b5cf6
- **Lavender** : #a855f7
- **Background** : Dégradé sombre (#0f0f19 → #1a1428)

## 📝 Notes

- Les badges utilisateurs sont stockés dans Firestore avec toutes les métadonnées
- Le système de paiement pour les écoutants peut être étendu selon vos besoins
- L'intégration complète avec Whereby nécessite une configuration API Whereby
- Les fichiers utilisent les modules ES6, donc un serveur local est recommandé

## 🔐 Sécurité

- Authentification Firebase
- Données stockées de manière sécurisée dans Firestore
- Règles de sécurité Firestore incluses
- Sessions d'appel gérées avec Whereby

## 🚧 Prochaines étapes

- [ ] Intégration complète de l'API Whereby
- [ ] Système de paiement
- [ ] Notifications en temps réel
- [ ] Système de notation et avis
- [ ] Chat en direct
