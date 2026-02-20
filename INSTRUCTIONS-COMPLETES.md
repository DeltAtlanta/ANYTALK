# Instructions complètes — AnyTalk (site hébergé)

Guide pas à pas pour configurer AnyTalk lorsque **le site est déjà hébergé** (ex. https://votresite.com). À suivre dans l’ordre.

---

## Prérequis

- Le site AnyTalk est en ligne et accessible en **HTTPS** (ex. https://anytalk.example.com).
- Un navigateur à jour.
- Comptes à créer ou à utiliser : **Firebase**, **Whereby**, (optionnel) **Stripe**, (optionnel) **Formspree** ou équivalent.

**Note :** Toute modification dans `firebase-config.js` (ou autre fichier) doit être **déployée** sur votre hébergeur pour être prise en compte sur le site en ligne.

---

## 1. Firebase — Projet et configuration

### 1.1 Créer ou utiliser le projet

1. Allez sur [Firebase Console](https://console.firebase.google.com).
2. **Ajouter un projet** ou ouvrez le projet existant lié au site.
3. Notez l’**ID du projet** (ex. `anytalk770`).

### 1.2 Activer Authentication

1. **Build** → **Authentication** → **Commencer**.
2. Onglet **Sign-in method** : activez **E-mail/Mot de passe** (Email/Password) et enregistrez.

### 1.3 Autoriser le domaine hébergé

1. Toujours dans **Authentication** → onglet **Settings** (Paramètres).
2. Section **Authorized domains** (Domaines autorisés).
3. Ajoutez le domaine de votre site hébergé (ex. `votresite.com` ou `anytalk.example.com`) **s’il n’y figure pas déjà**.  
   Firebase ajoute par défaut `localhost` ; pour la prod, le domaine public est indispensable.

### 1.4 Activer Firestore

1. **Build** → **Firestore Database**.
2. Si besoin : **Créer une base** → choisir un emplacement (ex. `europe-west1`).
3. En production, vous pouvez démarrer en **mode verrouillé** puis définir les règles ci‑dessous.

### 1.5 Récupérer les clés

1. **Paramètres du projet** (icône engrenage) → **Vos applications**.
2. Si aucune app web : **Ajouter une application** → **Web** (</>).
3. Indiquez le **nom** (ex. "AnyTalk Web"). Pour **Firebase Hosting**, vous pouvez cocher si vous hébergez avec Firebase.
4. Copiez l’objet `firebaseConfig` (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId, measurementId si présent).

### 1.6 Renseigner la config dans le projet

1. Ouvrez **`firebase-config.js`** à la racine du projet (dans votre éditeur / repo).
2. Remplacez **tout** l’objet `firebaseConfig` par les valeurs de la console :

```javascript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.firebasestorage.app",  // ou .appspot.com selon le projet
  messagingSenderId: "VOTRE_SENDER_ID",
  appId: "VOTRE_APP_ID",
  measurementId: "G-XXXXXXX"  // optionnel
};
```

3. Enregistrez, puis **déployez** les fichiers sur votre hébergeur (git push, FTP, panel d’hébergement, etc.) pour que le site en ligne utilise cette config.

### 1.7 Règles Firestore

1. Dans Firebase Console : **Firestore** → **Règles**.
2. Collez les règles du fichier **`firestore.rules`** du projet (ou celles ci‑dessous), puis **Publier** :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null &&
        (request.auth.uid == userId || request.auth.uid == 'FWrrl4ZGDhRLEjYkIw1H3AFIgtf2');
      match /badge/{badgeId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
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

*(Remplacez l’UID admin `FWrrl4ZGDhRLEjYkIw1H3AFIgtf2` par le vôtre si vous utilisez une page admin.)*

---

## 2. Whereby — Appels vidéo (site hébergé)

Sans Whereby, les réservations et le calendrier fonctionnent, mais pas les appels vidéo.

### 2.1 Compte et subdomain

1. Allez sur [whereby.com](https://whereby.com) → **Sign up**.
2. Choisissez **Whereby Embedded**.
3. Tableau de bord → **Configure** (ou paramètres d’organisation).
4. Repérez le **subdomain** (partie avant `.whereby.com`, ex. `monentreprise`).

### 2.2 Config dans AnyTalk

1. Ouvrez **`firebase-config.js`**.
2. Dans **`wherebyConfig`**, remplacez **`"votre-subdomain"`** par votre subdomain :

```javascript
export const wherebyConfig = {
  subdomain: "monentreprise",
  apiKey: "votre-api-key-whereby"
};
```

3. Enregistrez et **déployez** le fichier sur l’hébergement.

### 2.3 Autoriser le domaine hébergé (obligatoire)

Pour que l’embed Whereby fonctionne sur votre site en ligne :

1. Whereby → **Configure** → **Allowed domains** (ou équivalent).
2. Ajoutez **exactement** l’origine de votre site, par exemple :
   - `https://votresite.com`
   - ou `https://www.votresite.com`
   - ou `https://anytalk.example.com`  
   (sans chemin, sans slash final ; **HTTPS** si votre site est en HTTPS).
3. Sauvegardez.

Sans cette étape, la salle vidéo peut rester bloquée ou en erreur sur le site hébergé. Détails : **WHEREBY.md**.

---

## 3. Formspree — Emails (inscription écoutant / profil)

Les données sensibles (carte d’identité, diplôme, etc.) sont envoyées par email via Formspree.

### 3.1 Avec Formspree

1. Compte sur [formspree.io](https://formspree.io).
2. Créez un formulaire et récupérez l’**ID** (ex. `mqeddqpe`).
3. Dans **`firebase-config.js`**, définissez :

```javascript
export const FORMSPREE_FORM_ID = 'mqeddqpe';  // votre ID
```

4. Dans Formspree, configurez l’**email de réception** des soumissions.
5. Déployez le fichier modifié.

### 3.2 Autre service (Web3Forms, Getform, etc.)

Adaptez **`register.js`** et **`ecoutant.js`** pour appeler votre endpoint et, si besoin, une clé stockée dans la config. Puis déployez.

---

## 4. Stripe — Paiement des réservations (optionnel)

Sans Stripe, une réservation peut être enregistrée en **confirmé** sans paiement. Pour accepter les paiements sur le site hébergé :

### 4.1 Compte Stripe

1. [stripe.com](https://stripe.com) → créer un compte.
2. **Dashboard** → **Développeurs** → **Clés API**.
3. En production, utilisez la **clé secrète live** (`sk_live_...`) ; en test, `sk_test_...`.

### 4.2 URLs de succès et d’annulation

Les Cloud Functions utilisent les URLs passées par le front. Le front construit déjà :

- **successUrl** : origine du site + `reserver-success.html` (ex. `https://votresite.com/reserver-success.html`).
- **cancelUrl** : page de réservation (ex. `https://votresite.com/reserver.html?id=...`).

Vérifiez que votre site est bien servi en **HTTPS** pour que Stripe redirige correctement.

### 4.3 Firebase Functions (backend)

1. À la racine du projet : `firebase login` puis `firebase use VOTRE_PROJECT_ID`.
2. Configurer la clé Stripe :
   ```bash
   firebase functions:config:set stripe.secret_key="sk_live_VOTRE_CLE"
   ```
3. Dans le dossier **`functions`** : `npm install`, puis à la racine :
   ```bash
   firebase deploy --only functions
   ```

Les functions (createCheckoutSession, confirmPaymentAndSession) tournent sur Firebase ; le site hébergé peut être sur Netlify, Vercel, OVH, etc. Détails : **STRIPE.md**.

---

## 5. Vérification sur le site hébergé

Testez directement sur l’URL publique du site (ex. https://votresite.com).

### 5.1 Parcours appelant

1. Ouvrez **votre URL** (ex. https://votresite.com) → **S’inscrire**.
2. Créez un compte **Appelant** (email + mot de passe).
3. Vous devez arriver sur le **Tableau de bord appelant** et voir la liste des écoutants (vide si aucun validé).
4. Si un écoutant existe : **Réserver un créneau** → choisir un créneau → paiement (Stripe) ou confirmation directe.
5. Après succès : **Réservation confirmée** → **Démarrer l’appel vidéo** → page d’appel → **Rejoindre l’appel** → la salle Whereby doit s’ouvrir (autoriser micro/caméra si demandé).

### 5.2 Parcours écoutant

1. **S’inscrire** → **Écoutant** → remplir pseudo, email, mot de passe, **carte d’identité** et **diplôme/CV**.
2. Après inscription → **Dashboard écoutant** → **Mon calendrier — Rendez-vous à venir**.
3. Remplir **Mon planning** et **Mon profil** → **Enregistrer** (les données sensibles partent par Formspree ou équivalent).
4. Quand un appelant a réservé (et payé si Stripe est activé), le rendez-vous apparaît dans **Mon calendrier** avec **Rejoindre l’appel**.
5. **Rejoindre l’appel** → même salle Whereby que l’appelant.

### 5.3 À contrôler

- Aucune erreur dans la console (F12) sur le site hébergé.
- Firebase : **Authorized domains** contient bien le domaine du site.
- Whereby : **Allowed domains** contient l’origine exacte du site (https://votredomaine.com).
- Firestore : documents **users** et **sessions** créés comme prévu.
- Emails : réception des soumissions Formspree (ou équivalent).

---

## 6. Récapitulatif (site hébergé)

| Étape | Où | Action |
|-------|-----|--------|
| Firebase | Console + `firebase-config.js` | Projet, Auth, Firestore, **Authorized domains** = domaine du site, clés dans `firebase-config.js` → déployer. |
| Règles | Firebase Console → Firestore → Règles | Coller `firestore.rules` → Publier. |
| Whereby | Whereby + `firebase-config.js` | Subdomain dans `wherebyConfig.subdomain` ; **Allowed domains** = `https://votresite.com` → déployer. |
| Formspree | Formspree + `firebase-config.js` | ID dans `FORMSPREE_FORM_ID`, email de réception → déployer. |
| Stripe | Stripe + Firebase Functions | Clé dans `functions` config, URLs de succès/annulation en HTTPS (gérées par le front) → `firebase deploy --only functions`. |

---

## 7. Dépannage (site hébergé)

- **« Firebase not initialized » / la page ne charge pas**  
  Vérifiez `firebase-config.js` déployé et que le **domaine du site** est dans Firebase → Authentication → **Authorized domains**.

- **Connexion / inscription impossibles**  
  Vérifiez que le domaine hébergé (ex. `https://votresite.com`) est bien listé dans **Authorized domains** (sans slash final).

- **« Whereby non configuré »**  
  Dans `firebase-config.js` déployé, `wherebyConfig.subdomain` doit être votre vrai subdomain (pas `"votre-subdomain"`).

- **Salle Whereby ne s’affiche pas / erreur embed sur le site en ligne**  
  Whereby → **Configure** → **Allowed domains** : ajoutez **exactement** l’origine du site (ex. `https://votresite.com`), en HTTPS.

- **Pas de son / pas de vidéo**  
  L’utilisateur doit autoriser micro et caméra pour votre domaine (icône cadenas ou « i » dans la barre d’adresse).

- **Les données ne se sauvegardent pas**  
  Vérifiez les règles Firestore (Console) et que Firestore et Authentication sont activés.

- **Paiement Stripe : la réservation ne se confirme pas**  
  Vérifiez que les Cloud Functions sont déployées, que la clé Stripe est configurée, et que le site est bien en HTTPS (successUrl / cancelUrl).

---

## 8. Développement en local (optionnel)

Si vous travaillez sur le code en local avant de déployer :

- Lancez un serveur HTTP (pas `file://`) : `npm run serve` ou `python3 -m http.server 8000`.
- Pour tester Firebase Auth en local, le domaine `localhost` est en général déjà autorisé dans **Authorized domains**.
- Pour tester Whereby en local, ajoutez `http://localhost:8000` (ou le port utilisé) dans **Allowed domains** Whereby.
- Après modification de `firebase-config.js` ou d’autres fichiers, **redéployez** sur l’hébergement pour que le site en ligne reflète les changements.

---

Vous avez maintenant toutes les instructions pour configurer AnyTalk **avec un site déjà hébergé**. Pour le détail par sujet : **SETUP.md**, **WHEREBY.md**, **STRIPE.md**.
