# Étapes Whereby — Appels vidéo AnyTalk

Guide pour activer les appels vidéo avec Whereby dans AnyTalk.

---

## 1. Créer un compte Whereby

1. Allez sur **[whereby.com](https://whereby.com)**.
2. Cliquez sur **Sign up** / **S’inscrire**.
3. Créez un compte (email ou Google).
4. Choisissez le produit **Whereby Embedded** (intégration dans un site).

---

## 2. Récupérer votre subdomain

1. Une fois connecté, ouvrez le **tableau de bord** Whereby.
2. Allez dans **Configure** (ou **Organization settings** / **Account** selon l’interface).
3. Repérez votre **subdomain** :
   - C’est la partie avant `.whereby.com` dans l’URL de vos salles.
   - Exemple : si vos salles sont en `https://monentreprise.whereby.com/...`, le subdomain est **`monentreprise`**.
4. Notez ce subdomain (souvent en minuscules, sans espaces).

---

## 3. Configurer AnyTalk

1. Ouvrez **`firebase-config.js`** à la racine du projet.
2. Trouvez l’objet **`wherebyConfig`** :

   ```javascript
   export const wherebyConfig = {
     subdomain: "votre-subdomain",
     apiKey: "votre-api-key-whereby"
   };
   ```

3. Remplacez **`"votre-subdomain"`** par votre vrai subdomain Whereby (sans `https://` ni `.whereby.com`).

   Exemple :

   ```javascript
   export const wherebyConfig = {
     subdomain: "anytalk",
     apiKey: "votre-api-key-whereby"
   };
   ```

4. Enregistrez le fichier.

---

## 4. (Optionnel) API Key Whereby

L’app utilise pour l’instant uniquement le **subdomain** pour générer les URLs de salles. L’**apiKey** sert si vous voulez plus tard créer des salles via l’API (durée, enregistrement, etc.) depuis un backend (ex. Cloud Functions).

- Pour seulement activer les appels : **pas besoin de remplir l’apiKey**.
- Pour utiliser l’API plus tard :
  1. Dans le dashboard Whereby → **Configure**.
  2. Section **API** → **Generate API key**.
  3. Copiez la clé et remplacez **`"votre-api-key-whereby"`** dans `firebase-config.js`.

---

## 5. Tester les appels

1. Lancez le site en local (ex. `npm run serve` ou `python3 -m http.server 8000`).
2. Connectez-vous en tant qu’**appelant**.
3. Choisissez un écoutant → **Réserver un créneau** → payez (ou simulez) jusqu’à la page **Réservation confirmée**.
4. Cliquez sur **« Démarrer l’appel vidéo »**.
5. Sur la page d’appel, cliquez sur **« Démarrer l’appel »**.
6. La salle Whereby doit s’ouvrir dans la page (iframe). Vérifiez caméra / micro dans les réglages du navigateur si besoin.

---

## 6. Vérifier le domaine (si en production)

- Whereby peut restreindre les domaines autorisés pour l’embed.
- Dans le dashboard Whereby → **Configure** → **Allowed domains** (ou équivalent), ajoutez :
  - `http://localhost:8000` (ou le port utilisé) pour les tests.
  - Votre domaine de production (ex. `https://votresite.com`).

---

## Récapitulatif

| Étape | Action |
|-------|--------|
| 1 | Compte sur [whereby.com](https://whereby.com) (Embedded) |
| 2 | Récupérer le **subdomain** (Configure / paramètres d’organisation) |
| 3 | Dans `firebase-config.js` : `wherebyConfig.subdomain = "votre-subdomain"` |
| 4 | (Optionnel) Renseigner `apiKey` si vous utiliserez l’API plus tard |
| 5 | Tester : réservation → « Démarrer l’appel vidéo » → « Démarrer l’appel » |
| 6 | En prod : ajouter le domaine dans les paramètres Whereby si nécessaire |

---

## Dépannage

- **Bouton « Whereby non configuré »**  
  → Le subdomain dans `firebase-config.js` est encore `"votre-subdomain"` ou vide. Mettez votre vrai subdomain.

- **Salle ne s’affiche pas / erreur dans l’iframe**  
  → Vérifiez que le domaine (localhost ou prod) est autorisé dans Whereby (Configure → Allowed domains).

- **Pas de son / pas de vidéo**  
  → Autorisez micro et caméra dans le navigateur pour le site (icône cadenas ou « i » dans la barre d’adresse).
