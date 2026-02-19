# Ce qu’il te reste à faire — AnyTalk

Tu as déjà mis tes clés Firebase dans le projet. Voici les étapes dans l’ordre.

---

## Étape 1 — Activer l’authentification (Email / Mot de passe)

1. Ouvre **[Firebase Console](https://console.firebase.google.com)** et sélectionne le projet **anytalk770**.
2. Dans le menu de gauche : **Build** → **Authentication**.
3. Clique sur **Commencer** (ou **Get started**) si c’est la première fois.
4. Onglet **Sign-in method** (Méthode de connexion).
5. Clique sur **Email/Password**.
6. Active **Activer** (Enable).
7. Clique sur **Enregistrer**.

→ Les utilisateurs pourront s’inscrire et se connecter avec email + mot de passe.

---

## Étape 2 — Créer la base Firestore

1. Dans le menu de gauche : **Build** → **Firestore Database**.
2. Clique sur **Créer une base de données**.
3. Choisis **Démarrer en mode test** (pour le développement).
4. Choisis une région (ex. **europe-west1**).
5. Clique sur **Activer**.

→ La base est prête pour stocker les profils (users) et les sessions.

---

## Étape 3 — Mettre les règles de sécurité Firestore

1. Toujours dans **Firestore Database**, va dans l’onglet **Règles** (Rules).
2. Supprime tout ce qui est écrit et colle exactement ceci :

```
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

3. Clique sur **Publier**.

→ Seuls les utilisateurs connectés peuvent lire/écrire leurs propres données.

---

## Étape 4 — Lancer le site en local

Ouvre un terminal dans le dossier du projet (`AnyTalk`), puis lance **un seul** de ces serveurs :

**Option A — Python**
```bash
python3 -m http.server 8000
```

**Option B — Node.js**
```bash
npx http-server -p 8000
```

Ouvre ton navigateur sur : **http://localhost:8000**

Important : ne pas ouvrir `index.html` directement (double-clic), sinon Firebase ne fonctionnera pas correctement.

---

## Étape 5 — Tester le site

1. Sur **http://localhost:8000**, clique sur **S’inscrire**.
2. Choisis **Appelant** ou **Écoutant**.
3. Remplis le formulaire (nom, email, mot de passe, âge, etc.) et valide.
4. Tu dois être redirigé vers le **tableau de bord**.
5. Déconnecte-toi, puis clique sur **Connexion** et reconnecte-toi avec le même email/mot de passe.

Si tout se passe bien, l’inscription et la connexion sont opérationnelles.

---

## Récap

| Étape | Où | Action |
|-------|----|--------|
| 1 | Firebase → Authentication | Activer Email/Password |
| 2 | Firebase → Firestore | Créer la base (mode test) |
| 3 | Firestore → Règles | Coller les règles et publier |
| 4 | Terminal | `python3 -m http.server 8000` ou `npx http-server -p 8000` |
| 5 | Navigateur | http://localhost:8000 → S’inscrire et tester |

---

## En cas de problème

- **« Firebase not initialized »** → Tu n’as pas lancé le site via un serveur (étape 4). Utilise bien `http://localhost:8000`.
- **Erreur à l’inscription** → Vérifie que l’authentification Email/Password est bien activée (étape 1).
- **Erreur après connexion (données)** → Vérifie que Firestore est créé et que les règles sont publiées (étapes 2 et 3).

Une fois ces étapes faites, tu peux enchaîner sur Whereby (appels vidéo) si tu veux, on pourra le détailler après.
